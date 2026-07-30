"""
Mesaj Dönüştürme Use Case (Application Katmanı)
================================================
Çekirdek mesajın farklı mecralara dönüştürülmesini orkestre eden use case.
"""

from typing import List, Optional

from src.domain.entities.channel import ChannelType
from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.services.llm_service_interface import LLMServiceInterface


class TransformMessageUseCase:
    """Mesaj Dönüştürme Kullanım Senaryosu (Use Case)."""

    def __init__(self, llm_service: LLMServiceInterface):
        self._llm_service = llm_service

    async def execute_single(
        self, content: str, channel: ChannelType, author: Optional[str] = None
    ) -> TransformedMessage:
        """Tek bir mecraya dönüştürme çalıştırır."""
        core_message = CoreMessage(content=content, author=author)
        return await self._llm_service.transform_to_channel(core_message, channel)

    async def execute_all(
        self, content: str, author: Optional[str] = None
    ) -> List[TransformedMessage]:
        """Tüm mecralara dönüştürme çalıştırır."""
        core_message = CoreMessage(content=content, author=author)
        return await self._llm_service.transform_to_all_channels(core_message)
