"""
Mecra Mesajdır — Web API Sunucusu (FastAPI)
===========================================
Frontend arayüzünden gelen istekleri alır, LLM ile 8 mecraya dönüştürür
ve 6 analiz modülünü çalıştırarak sonuçları döndürür.
"""

import sys
import os
import asyncio

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from src.domain.entities.message import CoreMessage
from src.infrastructure.llm.llm_transformer_service import LLMMessageTransformerService
from src.infrastructure.analyzers.semantic_info_loss_analyzer import SemanticAndInfoLossAnalyzer
from src.infrastructure.database.repositories.history_repository import HistoryRepository
from src.infrastructure.benchmark.evaluator import BenchmarkEvaluator
from src.application.use_cases.transform_message_use_case import TransformMessageUseCase
from src.application.use_cases.analyze_messages_use_case import AnalyzeMessagesUseCase

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 [SUNUCU] Tüm analiz modelleri arka planda ön-yükleniyor...")
    try:
        asyncio.create_task(asyncio.to_thread(analyzer_service.prewarm))
    except Exception as e:
        print(f"⚠️ [SUNUCU] Pre-warm atlandı: {e}")
    yield

app = FastAPI(title="Mecra Mesajdır API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TransformRequest(BaseModel):
    content: str
    author: str = "Kamu Görevlisi"

class PlatformItem(BaseModel):
    id: str
    transformed_content: str

class AnalyzeRequest(BaseModel):
    core_message: str
    platforms: list[PlatformItem]
    author: str = "Kamu Görevlisi"

# Global Singleton Servisler
llm_service = LLMMessageTransformerService()
analyzer_service = SemanticAndInfoLossAnalyzer()
history_repo = HistoryRepository()
benchmark_evaluator = BenchmarkEvaluator(analyzer=analyzer_service)

@app.get("/api/health")
def health_check():
    nli_status = "loaded" if getattr(analyzer_service, "_nli_model", None) else "error_loading" if getattr(analyzer_service, "_models_loaded", False) else "not_loaded"
    embed_status = "loaded" if getattr(analyzer_service, "_embed_model", None) else "error_loading" if getattr(analyzer_service, "_models_loaded", False) else "not_loaded"
    ner_status = "loaded" if getattr(analyzer_service, "_nlp_ner", None) else "error_loading" if getattr(analyzer_service, "_models_loaded", False) else "not_loaded"
    
    return {
        "status": "ok",
        "llm_key_set": bool(os.getenv("LLM_API_KEY")),
        "models_loaded": bool(getattr(analyzer_service, "_models_loaded", False)),
        "nlp_models": {
            "nli_model": nli_status,
            "embed_model": embed_status,
            "ner_model": ner_status
        }
    }

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    from fastapi.responses import Response
    return Response(status_code=204)

# 🚀 AŞAMA 1: IŞIK HIZINDA DÖNÜŞTÜRÜCÜ (Sadece LLM - 2-3 saniye)
@app.post("/api/transform")
async def fast_transform(req: TransformRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Çekirdek mesaj boş olamaz.")

    try:
        core_message = CoreMessage(content=req.content.strip(), author=req.author)
        transform_use_case = TransformMessageUseCase(llm_service=llm_service)
        transformed_messages = await transform_use_case.execute_all(content=req.content.strip())
        
        from src.domain.entities.channel import CHANNEL_NAMES
        platform_data = []
        for msg in transformed_messages:
            platform_data.append({
                "id": msg.channel.value,
                "name": CHANNEL_NAMES.get(msg.channel, msg.channel.value),
                "transformed_content": msg.transformed_content,
            })

        return {
            "core_message": req.content.strip(),
            "platforms": platform_data
        }
    except Exception as e:
        import traceback
        print("\n[FAST TRANSFORM ERROR]:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# 📊 AŞAMA 2: ARKA PLAN NLP VE METRİK ANALİZİ
@app.post("/api/analyze")
async def fast_analyze(req: AnalyzeRequest):
    if not req.core_message.strip() or not req.platforms:
        raise HTTPException(status_code=400, detail="Geçersiz analiz verisi.")

    try:
        from src.domain.entities.channel import ChannelType
        from src.domain.entities.message import TransformedMessage

        core_message = CoreMessage(content=req.core_message.strip(), author=req.author)
        
        transformed_messages = []
        for item in req.platforms:
            try:
                ch_enum = ChannelType(item.id)
                transformed_messages.append(TransformedMessage(
                    channel=ch_enum,
                    original_content=req.core_message.strip(),
                    transformed_content=item.transformed_content
                ))
            except Exception:
                continue

        analyze_use_case = AnalyzeMessagesUseCase(analyzer_service=analyzer_service)
        analysis_results, degradation_chain = await analyze_use_case.execute(core_message, transformed_messages)

        platform_data = []
        for msg, res in zip(transformed_messages, analysis_results):
            platform_data.append({
                "id": msg.channel.value,
                "name": res.channel_name,
                "transformed_content": msg.transformed_content,
                "semantic_similarity": res.semantic_similarity.semantic_similarity_percentage,
                "info_loss": res.info_loss.info_loss_occurred,
                "info_loss_rate": res.info_loss.info_loss_rate,
                "checked_facts_count": res.info_loss.checked_facts_count,
                "fact_details": res.info_loss.fact_details,
                "has_cta": res.cta.has_cta,
                "cta_strength": res.cta.strength_text,
                "cta_words": res.cta.cta_words,
                "cta_sentences": res.cta.cta_sentences,
                "cta_person": res.cta.person_type,
                "cta_score": res.cta.strength_score,
                "sentiment": res.sentiment.label,
                "sentiment_pos": res.sentiment.pos_prob,
                "sentiment_neg": res.sentiment.neg_prob,
                "sentiment_intensity": res.sentiment.intensity_score,
                "emoji_count": res.sentiment.emoji_count,
                "punct_count": res.sentiment.punct_count,
                "ambiguity": res.ambiguity.level,
                "ambiguity_score": res.ambiguity.ambiguity_score,
                "clarity_score": res.ambiguity.clarity_score,
                "most_ambiguous_sentence": res.ambiguity.most_ambiguous_sentence,
                "ambiguity_sentences": res.ambiguity.sentence_details,
                "is_breaking_point": False,
                "degraded_mode": res.info_loss.model_unavailable
            })

        if degradation_chain.has_breaking_point:
            for item in platform_data:
                if item["name"] == degradation_chain.breaking_point_channel:
                    item["is_breaking_point"] = True

        any_degraded = any(res.info_loss.model_unavailable for res in analysis_results)
        result = {
            "core_message": req.core_message.strip(),
            "degraded_mode": any_degraded,
            "platforms": platform_data,
            "degradation_chain": {
                "has_breaking_point": degradation_chain.has_breaking_point,
                "breaking_point_channel": degradation_chain.breaking_point_channel,
                "max_consecutive_deviation": degradation_chain.max_consecutive_deviation,
                "steps": [
                    {
                        "step_index": s.step_index,
                        "channel_name": s.channel_name,
                        "consecutive_similarity": s.consecutive_similarity,
                        "consecutive_deviation": s.consecutive_deviation,
                        "cumulative_similarity": s.cumulative_similarity,
                        "is_breaking_point": s.is_breaking_point
                    }
                    for s in degradation_chain.steps
                ]
            }
        }

        try:
            history_repo.save_analysis(result)
        except Exception as hist_err:
            print(f"⚠️ [HISTORY] Kayıt uyarısı: {hist_err}")

        return result
    except Exception as e:
        import traceback
        print("\n[FAST ANALYZE ERROR]:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# 🧪 AŞAMA 3: ALTIN STANDART DOĞRULUK LABORATUVARI
@app.post("/api/benchmark")
async def run_benchmark():
    """5 Colab altın senaryoyu çalıştırır, doğruluk yüzdesini hesaplar ve geçmişe kaydeder."""
    try:
        report = await benchmark_evaluator.run()
        saved = history_repo.save_benchmark(report)
        report["history_id"] = saved["id"]
        return report
    except Exception as e:
        import traceback
        print("\n[BENCHMARK ERROR]:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
def list_history(limit: int = 30):
    return {"items": history_repo.list_all(limit=limit)}


@app.get("/api/history/{item_id}")
def get_history_item(item_id: str):
    item = history_repo.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
    return item


@app.delete("/api/history")
def clear_history():
    history_repo.clear()
    return {"status": "cleared"}


# 3. Static Files (Frontend Kurumsal Web Arayüzü)
frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_path):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
