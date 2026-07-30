"""
Mesaj Nesneleri
===============
Çekirdek (Core) ve Dönüştürülmüş (Transformed) Mesaj Domain Entity'leri.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from src.domain.entities.channel import ChannelType


class CoreMessage(BaseModel):
    """Kullanıcının sisteme girdiği ham çekirdek mesaj."""

    content: str = Field(..., description="Kullanıcının girdiği ham çekirdek mesaj içeriği")
    author: Optional[str] = Field(None, description="Mesajın sahibi veya gönderen kullanıcı")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def word_count(self) -> int:
        return len(self.content.split())

    @property
    def char_count(self) -> int:
        return len(self.content)


class TransformedMessage(BaseModel):
    """LLM tarafından belirli bir mecraya dönüştürülmüş mesaj."""

    channel: ChannelType
    original_content: str
    transformed_content: str
    tone_analysis: Optional[str] = Field(None, description="Mecranın üslup/ton açıklaması")
    transformed_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def word_count(self) -> int:
        return len(self.transformed_content.split())

    @property
    def char_count(self) -> int:
        return len(self.transformed_content)
