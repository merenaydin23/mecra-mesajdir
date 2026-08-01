"""
Duygu Yoğunluğu Analizörü (Infrastructure Katmanı)
===================================================
BERT Tabanlı Türkçe Duygu Analizi Modeli (savasy/bert-base-turkish-sentiment-cased),
Emoji ve Noktalama Yoğunluk Faktörleri ile Hesaplama.
"""

import re
import torch
import emoji
from src.domain.entities.message import TransformedMessage
from src.domain.entities.analysis_result import SentimentResult
from src.infrastructure.config.settings import settings
from src.infrastructure.analyzers.model_manager import model_manager


MODEL_NAME = "savasy/bert-base-turkish-sentiment-cased"
PUNCT_PATTERN = re.compile(r"[!?]")


class SentimentAnalyzer:
    """BERT tabanlı Türkçe Duygu Yoğunluğu Analizörü."""

    def __init__(self):
        self._tokenizer = None
        self._model = None
        self._device = None

    def _load_model(self):
        """BERT duygu modelini manager üzerinden yükler."""
        if self._model is not None:
            return

        tokenizer, model, device = model_manager.get_sentiment_model()
        if model is not None:
            self._tokenizer = tokenizer
            self._model = model
            self._device = device

    def analyze(self, transformed: TransformedMessage) -> SentimentResult:
        """Dönüştürülmüş mecra mesajının duygu ve yoğunluk analizini gerçekleştirir."""
        self._load_model()

        text = transformed.transformed_content

        if not isinstance(text, str) or text.strip() == "":
            raise ValueError("Analiz edilecek metin boş olamaz.")

        # Fallback if model loading failed
        if self._model is None:
            return self._fallback_analyze(transformed)

        # 1. Base Sentiment from BERT
        inputs = self._tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512,
        ).to(self._device)
        
        is_truncated = False
        if inputs.input_ids.shape[1] == 512:
            print("⚠️ [DUYGU ANALİZİ UYARI] Metin çok uzun olduğu için 512 tokenda kesildi.")
            is_truncated = True

        with torch.no_grad():
            outputs = self._model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1).squeeze(0)

        id2label = self._model.config.id2label
        probs_dict = {id2label[i].lower(): float(probs[i].item()) for i in range(len(probs))}

        pos_prob = 0.0
        neg_prob = 0.0

        for label_name, prob in probs_dict.items():
            if "pos" in label_name:
                pos_prob = max(pos_prob, prob)
            elif "neg" in label_name:
                neg_prob = max(neg_prob, prob)

        total = pos_prob + neg_prob
        if total > 0:
            pos_prob /= total
            neg_prob /= total

        label = "POS" if pos_prob > neg_prob else "NEG"

        # 2. Emoji & Noktalama Sayımı
        emoji_count = emoji.emoji_count(text)
        punct_count = len(PUNCT_PATTERN.findall(text))

        # 3. Yoğunluk Skoru Hesaplama
        base_score = pos_prob if label == "POS" else neg_prob
        raw_score = base_score + (emoji_count * settings.EMOJI_WEIGHT) + (punct_count * settings.PUNCT_WEIGHT)
        intensity_score = max(0.0, min(1.0, raw_score))

        return SentimentResult(
            channel=transformed.channel,
            label=label,
            pos_prob=round(pos_prob, 4),
            neg_prob=round(neg_prob, 4),
            emoji_count=emoji_count,
            punct_count=punct_count,
            intensity_score=round(intensity_score, 4),
            model_unavailable=False,
            is_truncated=is_truncated
        )

    def _fallback_analyze(self, transformed: TransformedMessage) -> SentimentResult:
        """BERT modeli hazır değilse temel kural tabanlı fallback."""
        text = transformed.transformed_content
        emoji_count = emoji.emoji_count(text)
        punct_count = len(PUNCT_PATTERN.findall(text))
        return SentimentResult(
            channel=transformed.channel,
            label="POS",
            pos_prob=0.5,
            neg_prob=0.5,
            emoji_count=emoji_count,
            punct_count=punct_count,
            intensity_score=0.5,
            model_unavailable=True,
            is_truncated=False
        )
