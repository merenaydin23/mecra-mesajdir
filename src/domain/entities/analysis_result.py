"""
Analiz Sonuç Entity'leri
=========================
Bilgi Kaybı, Anlamsal Benzerlik, Eylem Çağrısı (CTA), Duygu Yoğunluğu ve Belirsizlik Analiz Sonuç Domain Nesneleri.
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


class CTAResult(BaseModel):
    """2.4 Eylem Çağrısı (CTA) Analiz Sonucu."""

    channel: ChannelType
    has_cta: bool = Field(..., description="Eylem çağrısı var mı?")
    verb_count: int = Field(0, description="Toplam fiil sayısı")
    all_verbs: List[str] = Field(default_factory=list, description="Yakalanan tüm fiiller")
    cta_words: List[str] = Field(default_factory=list, description="Ayrıştırılan CTA fiilleri")
    strength_score: float = Field(0.0, description="Normalized CTA şiddet skoru (0.0 - 1.0)")
    strength_text: str = Field("0/0", description="Şiddet puan metni (Örn: 10/15)")
    person_type: str = Field("Yok", description="Hitap türü (Sen / Siz / Tavsiye / Yok)")


class SentimentResult(BaseModel):
    """2.2 Duygu Yoğunluğu Analiz Sonucu."""

    channel: ChannelType
    label: str = Field(..., description="Duygu etiketi (POS / NEG)")
    pos_prob: float = Field(..., description="Pozitif olma olasılığı (0.0 - 1.0)")
    neg_prob: float = Field(..., description="Negatif olma olasılığı (0.0 - 1.0)")
    emoji_count: int = Field(0, description="Metindeki emoji sayısı")
    punct_count: int = Field(0, description="Vurgulu noktalama (!, ?) sayısı")
    intensity_score: float = Field(..., description="Duygu yoğunluğu skoru (0.0 - 1.0)")


class AmbiguityResult(BaseModel):
    """2.3 Belirsizlik Analiz Sonucu."""

    channel: ChannelType
    ambiguity_score: float = Field(..., description="Belirsizlik skoru (0.0 - 1.0)")
    clarity_score: float = Field(..., description="Netlik skoru (0.0 - 1.0)")
    level: str = Field(..., description="Belirsizlik seviyesi (Düşük / Orta / Yüksek)")
    most_ambiguous_sentence: str = Field("", description="En belirsiz bulunan cümle")
    sentence_details: List[dict] = Field(default_factory=list, description="Cümle bazlı detaylar")


class CombinedAnalysisResult(BaseModel):
    """Mecra bazlı birleştirilmiş analiz sonucu."""

    channel: ChannelType
    channel_name: str
    original_content: str
    transformed_content: str
    info_loss: InfoLossResult
    semantic_similarity: SemanticSimilarityResult
    cta: CTAResult
    sentiment: SentimentResult
    ambiguity: AmbiguityResult
