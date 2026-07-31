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
from src.application.use_cases.transform_message_use_case import TransformMessageUseCase
from src.application.use_cases.analyze_messages_use_case import AnalyzeMessagesUseCase

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 [SUNUCU] Modeller arka planda ön-yükleniyor (Pre-warming)...")
    asyncio.create_task(asyncio.to_thread(analyzer_service._load_models))
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

@app.get("/api/health")
def health_check():
    return {"status": "ok", "llm_key_set": bool(os.getenv("LLM_API_KEY"))}

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
                "cta_strength": res.cta.strength_text,
                "sentiment": res.sentiment.label,
                "ambiguity": res.ambiguity.level,
                "ambiguity_score": res.ambiguity.ambiguity_score,
                "is_breaking_point": False
            })

        if degradation_chain.has_breaking_point:
            for item in platform_data:
                if item["id"] == degradation_chain.breaking_point_channel:
                    item["is_breaking_point"] = True

        return {
            "core_message": req.core_message.strip(),
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
    except Exception as e:
        import traceback
        print("\n[FAST ANALYZE ERROR]:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# 3. Static Files (Frontend Kurumsal Web Arayüzü)
frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_path):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
