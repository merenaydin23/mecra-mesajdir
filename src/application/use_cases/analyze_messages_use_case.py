"""
Mesaj Analiz Use Case (Application Katmanı)
===========================================
Dönüştürülmüş mecraların Anlamsal Benzerlik ve Bilgi Kaybı analizini yürütür.
"""

from typing import List

from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.entities.analysis_result import CombinedAnalysisResult
from src.domain.services.analyzer_service_interface import AnalyzerServiceInterface


class AnalyzeMessagesUseCase:
    """Anlamsal Benzerlik ve Bilgi Kaybı Analiz Kullanım Senaryosu."""

    def __init__(self, analyzer_service: AnalyzerServiceInterface):
        self._analyzer_service = analyzer_service

    async def execute(
        self, core_message: CoreMessage, transformed_messages: List[TransformedMessage]
    ) -> List[CombinedAnalysisResult]:
        """
        LLM tarafında üretilen tüm mecra mesajlarını alır ve
        anlamsal benzerlik ile bilgi kaybı analizlerini gerçekleştirir.
        """
        return await self._analyzer_service.analyze_all(core_message, transformed_messages)
