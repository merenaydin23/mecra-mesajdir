"""
LLM Dönüştürücü Servis Arayüzü (Interface)
===========================================
Clean Architecture prensiplerine uygun soyut arayüz.
"""

from abc import ABC, abstractmethod
from typing import List

from src.domain.entities.channel import ChannelType
from src.domain.entities.message import CoreMessage, TransformedMessage


class LLMServiceInterface(ABC):
    """LLM Dönüştürme Servis Portu."""

    @abstractmethod
    async def transform_to_channel(
        self, message: CoreMessage, channel: ChannelType
    ) -> TransformedMessage:
        """Çekirdek mesajı tek bir mecraya dönüştürür."""
        pass

    @abstractmethod
    async def transform_to_all_channels(
        self, message: CoreMessage
    ) -> List[TransformedMessage]:
        """Çekirdek mesajı 8 mecranın tümüne dönüştürür."""
        pass
