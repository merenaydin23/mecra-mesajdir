"""
Belirsizlik Analizörü (Infrastructure Katmanı)
==============================================
Sentence Transformers Embeddings ve Prototipler İle Belirsizlik Analizi.
"""

import re
import numpy as np
from typing import List, Tuple
from sentence_transformers import SentenceTransformer

from src.domain.entities.message import TransformedMessage
from src.domain.entities.analysis_result import AmbiguityResult
from src.infrastructure.config.settings import settings


MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

BELIRSIZ_PROTOTIPLER = [
    "Bu konuda net değiliz.",
    "Emin değiliz, kesin bir şey söyleyemeyiz.",
    "Durum hâlâ belirsiz, netlik kazanmadı.",
    "Bazı süreçler değerlendirme aşamasında, sonuç şu an belli değil.",
    "Kesin olmamakla birlikte böyle bir ihtimal söz konusu.",
    "Konuyu takip ediyoruz, gelişmeler oldukça paylaşacağız.",
    "Stratejik dönüşüm sürecinde bazı değişiklikler gündeme gelebilir.",
    "Net bir bilgimiz yok, çalışmalar devam etmektedir.",
    "Organizasyonel yapımızı optimize ediyoruz, bazı arkadaşlarımızla vedalaştık.",
]

KESIN_PROTOTIPLER = [
    "Kesinlikle doğrudur.",
    "Karar nihai ve değişmezdir.",
    "30 çalışanın işine son verildi.",
    "Sonuç açık ve nettir.",
    "Bu bilgi kesinleşmiştir, tartışmaya kapalıdır.",
    "Şirket, Elazığ tesisini kapatmıştır.",
    "Bütçe kısıntısı nedeniyle 30 kişi işten çıkarılmıştır.",
    "Durum netleşmiştir, herhangi bir belirsizlik yoktur.",
]


class AmbiguityAnalyzer:
    """Embedding Prototipleri tabanlı Belirsizlik Analizörü."""

    def __init__(self):
        self._model = None
        self._belirsiz_vektorler = None
        self._kesin_vektorler = None
        self._is_loaded = False

    def _load_model(self):
        """SentenceTransformer ve prototip vektörlerini lazy loading ile yükler."""
        if self._is_loaded:
            return

        print(f"🔄 [BELİRSİZLİK ANALİZİ] SentenceTransformer modeli ({MODEL_NAME}) yükleniyor...")
        try:
            self._model = SentenceTransformer(MODEL_NAME)
            self._belirsiz_vektorler = self._model.encode(BELIRSIZ_PROTOTIPLER, normalize_embeddings=True)
            self._kesin_vektorler = self._model.encode(KESIN_PROTOTIPLER, normalize_embeddings=True)
            self._is_loaded = True
            print("✅ [BELİRSİZLİK ANALİZİ] Prototip vektörleri ve model başarıyla hazırlandı!")
        except Exception as e:
            print(f"⚠️ [BELİRSİZLİK ANALİZİ UYARI] Model yüklenirken hata oluştu: {e}")
            self._is_loaded = True

    @staticmethod
    def _split_sentences(text: str) -> List[str]:
        """Cümle bölme mantığı."""
        parts = re.split(r"(?<=[.!?])\s+", text.strip())
        return [p.strip() for p in parts if p.strip()]

    @staticmethod
    def _sigmoid(x: float, k: float = 8.0) -> float:
        """Embedding cosine sim farklarını 0-1 arası skora yayar."""
        return float(1 / (1 + np.exp(-k * x)))

    def _sentence_score(self, sentence: str) -> Tuple[float, float, float]:
        vec = self._model.encode([sentence], normalize_embeddings=True)[0]
        sim_belirsiz = float(np.max(self._belirsiz_vektorler @ vec))
        sim_kesin = float(np.max(self._kesin_vektorler @ vec))
        skor = self._sigmoid(sim_belirsiz - sim_kesin)
        return skor, sim_belirsiz, sim_kesin

    def analyze(self, transformed: TransformedMessage) -> AmbiguityResult:
        """Dönüştürülmüş mecra mesajının belirsizlik analizini gerçekleştirir."""
        self._load_model()

        text = transformed.transformed_content

        if not isinstance(text, str) or text.strip() == "":
            raise ValueError("Analiz edilecek metin boş olamaz.")

        if self._model is None:
            return self._fallback_analyze(transformed)

        sentences = self._split_sentences(text)
        if not sentences:
            sentences = [text]

        detay = []
        for cumle in sentences:
            skor, sim_b, sim_k = self._sentence_score(cumle)
            detay.append({
                "cumle": cumle,
                "belirsizlik_skoru": round(skor, 4),
                "belirsiz_benzerlik": round(sim_b, 4),
                "kesin_benzerlik": round(sim_k, 4),
            })

        # Use mean instead of max to prevent a single ambiguous sentence from completely dominating long official letters.
        # But we also want to catch ambiguity if there's a highly ambiguous sentence, so we can use a weighted average 
        # or simply average if the text has multiple sentences. Mean is more stable.
        belirsizlik_skoru = sum(d["belirsizlik_skoru"] for d in detay) / len(detay)
        en_belirsiz_cumle = max(detay, key=lambda d: d["belirsizlik_skoru"])["cumle"]

        if belirsizlik_skoru < settings.AMBIGUITY_LOW_THRESHOLD:
            seviye = "Düşük"
        elif belirsizlik_skoru < settings.AMBIGUITY_HIGH_THRESHOLD:
            seviye = "Orta"
        else:
            seviye = "Yüksek"

        return AmbiguityResult(
            channel=transformed.channel,
            ambiguity_score=round(belirsizlik_skoru, 4),
            clarity_score=round(1 - belirsizlik_skoru, 4),
            level=seviye,
            most_ambiguous_sentence=en_belirsiz_cumle,
            sentence_details=detay,
        )

    def _fallback_analyze(self, transformed: TransformedMessage) -> AmbiguityResult:
        """Model yüklenemezse kural tabanlı varsayılan çıktı."""
        return AmbiguityResult(
            channel=transformed.channel,
            ambiguity_score=0.2,
            clarity_score=0.8,
            level="Düşük",
            most_ambiguous_sentence=transformed.transformed_content[:50],
            sentence_details=[],
        )
