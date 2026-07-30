from src.domain.entities.channel import ChannelType, CHANNEL_NAMES
from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.entities.analysis_result import (
    InfoLossResult,
    SemanticSimilarityResult,
    CTAResult,
    CombinedAnalysisResult,
)

__all__ = [
    "ChannelType",
    "CHANNEL_NAMES",
    "CoreMessage",
    "TransformedMessage",
    "InfoLossResult",
    "SemanticSimilarityResult",
    "CTAResult",
    "CombinedAnalysisResult",
]
