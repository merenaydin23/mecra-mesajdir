"""
Mesaj Analiz Use Case (Application Katmanı)
===========================================
Dönüştürülmüş mecraların tüm analizlerini ve Bozulma Zinciri analizini yürütür.
"""

from typing import List, Tuple

from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.entities.analysis_result import CombinedAnalysisResult, DegradationChainResult
from src.domain.services.analyzer_service_interface import AnalyzerServiceInterface


class AnalyzeMessagesUseCase:
    """Mesaj Analiz Kullanım Senaryosu."""

    def __init__(self, analyzer_service: AnalyzerServiceInterface):
        self._analyzer_service = analyzer_service

    async def execute(
        self, core_message: CoreMessage, transformed_messages: List[TransformedMessage]
    ) -> Tuple[List[CombinedAnalysisResult], DegradationChainResult]:
        """
        LLM tarafında üretilen tüm mecra mesajlarını alır,
        anlamsal benzerlik, bilgi kaybı, CTA, duygu, belirsizlik ve
        Bozulma Zinciri (MMD) analizlerini gerçekleştirir.
        """
        return await self._analyzer_service.analyze_all(core_message, transformed_messages)
