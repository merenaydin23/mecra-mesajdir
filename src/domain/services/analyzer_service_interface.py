"""
Analiz Servisi Arayüzü (Analyzer Service Interface)
====================================================
Anlamsal Benzerlik, Bilgi Kaybı, CTA, Duygu ve Bozulma Zinciri Analiz Servisi Arayüzü.
"""

from abc import ABC, abstractmethod
from typing import List, Tuple

from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.entities.analysis_result import CombinedAnalysisResult, DegradationChainResult


class AnalyzerServiceInterface(ABC):
    """Analiz Servis Portu."""

    @abstractmethod
    async def analyze_pair(
        self, core: CoreMessage, transformed: TransformedMessage
    ) -> CombinedAnalysisResult:
        """Çekirdek mesaj ile tek bir dönüştürülmüş mesaj arasındaki analizi yapar."""
        pass

    @abstractmethod
    async def analyze_all(
        self, core: CoreMessage, transformed_list: List[TransformedMessage]
    ) -> Tuple[List[CombinedAnalysisResult], DegradationChainResult]:
        """Çekirdek mesaj ile tüm dönüştürülmüş mecralar için analizleri ve Bozulma Zinciri analizini yapar."""
        pass
