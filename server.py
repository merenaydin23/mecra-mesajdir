"""
Mecra Mesajdır — Web API Sunucusu (FastAPI)
===========================================
Frontend arayüzünden gelen istekleri alır, LLM ile 8 mecraya dönüştürür
ve 6 analiz modülünü çalıştırarak sonuçları döndürür.
"""

import os
import asyncio
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

app = FastAPI(title="Mecra Mesajdır API", version="1.0.0")

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

@app.get("/api/health")
def health_check():
    return {"status": "ok", "llm_key_set": bool(os.getenv("LLM_API_KEY"))}

@app.post("/api/transform")
async def transform_and_analyze(req: TransformRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Çekirdek mesaj boş olamaz.")

    try:
        core_message = CoreMessage(content=req.content.strip(), author=req.author)
        
        # 1. LLM Transform
        llm_service = LLMMessageTransformerService()
        transform_use_case = TransformMessageUseCase(llm_service=llm_service)
        transformed_messages = await transform_use_case.execute_all(content=req.content.strip())
        
        # 2. Analyze
        analyzer_service = SemanticAndInfoLossAnalyzer()
        analyze_use_case = AnalyzeMessagesUseCase(analyzer_service=analyzer_service)
        analysis_results, degradation_chain = await analyze_use_case.execute(core_message, transformed_messages)
        
        # Format response for frontend
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

        # Mark breaking point in platform_data
        if degradation_chain.has_breaking_point:
            for item in platform_data:
                if item["id"] == degradation_chain.breaking_point_channel:
                    item["is_breaking_point"] = True

        return {
            "core_message": req.content.strip(),
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
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
