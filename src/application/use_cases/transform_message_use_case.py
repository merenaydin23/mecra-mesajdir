"""
Mesaj Dönüştürme Use Case (Application Katmanı)
================================================
Çekirdek mesajın farklı mecralara dönüştürülmesini orkestre eden use case.
"""

from typing import List, Optional, Tuple

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
        corrected = content
        if hasattr(self._llm_service, "proofread_core_message"):
            corrected = await self._llm_service.proofread_core_message(content)
        core_message = CoreMessage(content=corrected, author=author)
        return await self._llm_service.transform_to_channel(core_message, channel)

    async def execute_all(
        self, content: str, author: Optional[str] = None
    ) -> Tuple[str, List[TransformedMessage]]:
        """
        Yazım düzeltmesi + tüm mecralara dönüşüm.
        Returns: (düzeltilmiş_çekirdek, dönüştürülmüş_mesajlar)
        """
        corrected = content.strip()
        if hasattr(self._llm_service, "proofread_core_message"):
            corrected = await self._llm_service.proofread_core_message(content)

        core_message = CoreMessage(content=corrected, author=author)
        # transform_to_all_channels içinde ikinci kez proofread olmasın diye
        # doğrudan kanal dönüşümlerini çağır
        if hasattr(self._llm_service, "transform_channels_only"):
            results = await self._llm_service.transform_channels_only(core_message)
        else:
            # Geriye uyumluluk: servis proofread'i tekrar yapabilir
            results = await self._llm_service.transform_to_all_channels(core_message)
        return corrected, list(results)
