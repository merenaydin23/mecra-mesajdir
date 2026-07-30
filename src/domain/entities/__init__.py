from src.domain.entities.channel import ChannelType, CHANNEL_NAMES
from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.entities.analysis_result import (
    InfoLossResult,
    SemanticSimilarityResult,
    CombinedAnalysisResult,
)

__all__ = [
    "ChannelType",
    "CHANNEL_NAMES",
    "CoreMessage",
    "TransformedMessage",
    "InfoLossResult",
    "SemanticSimilarityResult",
    "CombinedAnalysisResult",
]
