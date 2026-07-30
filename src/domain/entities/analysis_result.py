"""
Analiz Sonuç Entity'leri
=========================
Bilgi Kaybı ve Anlamsal Benzerlik Analiz Sonuç Domain Nesneleri.
"""

from typing import Optional, List, Dict
from pydantic import BaseModel, Field

from src.domain.entities.channel import ChannelType


class InfoLossResult(BaseModel):
    """2.1 Bilgi Kaybı Analiz Sonucu."""

    channel: ChannelType
    info_loss_occurred: bool = Field(..., description="Bilgi kaybı var mı?")
    info_loss_rate: Optional[float] = Field(None, description="Bilgi kaybı oranı (%)")
    checked_facts_count: int = Field(0, description="Kontrol edilen olgu sayısı")
    fact_details: List[dict] = Field(default_factory=list, description="Detaylı olgu eşleşmeleri")


class SemanticSimilarityResult(BaseModel):
    """2.5 Anlamsal Benzerlik Analiz Sonucu."""

    channel: ChannelType
    semantic_similarity_percentage: float = Field(..., description="Anlamsal benzerlik skoru (%)")
    topic_preserved: bool = Field(..., description="Konu korunmuş mu?")


class CombinedAnalysisResult(BaseModel):
    """Mecra bazlı birleştirilmiş analiz sonucu."""

    channel: ChannelType
    channel_name: str
    original_content: str
    transformed_content: str
    info_loss: InfoLossResult
    semantic_similarity: SemanticSimilarityResult
