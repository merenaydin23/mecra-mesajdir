"""
Analiz Servisi Arayüzü (Analyzer Service Interface)
====================================================
Anlamsal Benzerlik ve Bilgi Kaybı Analiz Servisi Arayüzü.
"""

from abc import ABC, abstractmethod
from typing import List

from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.entities.analysis_result import CombinedAnalysisResult


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
    ) -> List[CombinedAnalysisResult]:
        """Çekirdek mesaj ile dönüştürülmüş tüm mesajlar için analizi yapar."""
        pass
