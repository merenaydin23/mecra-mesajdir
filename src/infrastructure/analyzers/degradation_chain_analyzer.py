"""
Bozulma Zinciri Analizörü (Message Degradation Chain Analyzer - Infrastructure Katmanı)
======================================================================================
Mecralar arası ardışık ve kümülatif anlam kayıplarını (deformasyon) ve Kırılma Noktası (Breaking Point - BP) tespiti.
"""

import numpy as np
from typing import List
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

from src.domain.entities.channel import CHANNEL_NAMES
from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.entities.analysis_result import DegradationStep, DegradationChainResult, CombinedAnalysisResult


MODEL_ADI = "paraphrase-multilingual-MiniLM-L12-v2"
BP_ESIK = 0.15           # Kırılma Noktası (Breaking Point) sapma eşiği (%15)
TIE_YUZDE_ESIK = 0.05    # Yakın rakip eşiği (%5)


class DegradationChainAnalyzer:
    """Mesaj Deformasyon Zinciri (MMD) Analizörü."""

    def __init__(self):
        self._model = None
        self._is_loaded = False

    def _load_model(self):
        """SentenceTransformer modelini lazy loading ile yükler."""
        if self._is_loaded:
            return

        print(f"🔄 [BOZULMA ZİNCİRİ] SentenceTransformer modeli ({MODEL_ADI}) yükleniyor...")
        try:
            self._model = SentenceTransformer(MODEL_ADI)
            self._is_loaded = True
            print("✅ [BOZULMA ZİNCİRİ] Deformasyon analiz modeli hazır!")
        except Exception as e:
            print(f"⚠️ [BOZULMA ZİNCİRİ UYARI] Model yüklenirken hata oluştu: {e}")
            self._is_loaded = True

    def analyze_chain(
        self, 
        core: CoreMessage, 
        transformed_list: List[TransformedMessage],
        analysis_results: List[CombinedAnalysisResult] = None
    ) -> DegradationChainResult:
        """
        Çekirdek mesaj (M0) ve dönüştürülmüş mecralar (M1..Mn) arasındaki
        ardışık sapmaları, kümülatif benzerlikleri ve Kırılma Noktası'nı (BP) hesaplar.
        """
        self._load_model()

        if not transformed_list:
            return DegradationChainResult()

        if self._model is None:
            return self._fallback_analyze(core, transformed_list)

        # Tüm metinler zinciri: M0 (Core), M1..Mn (Mecralar)
        all_texts = [core.content] + [t.transformed_content for t in transformed_list]
        embeddings = self._model.encode(all_texts)

        emb_M0 = embeddings[0].reshape(1, -1)

        ardisik_benzerlik = []
        ardisik_sapma = []
        kumulatif_benzerlik = []

        for i in range(1, len(embeddings)):
            emb_onceki = embeddings[i - 1].reshape(1, -1)
            emb_mevcut = embeddings[i].reshape(1, -1)

            # Ardışık Benzerlik: Mn ile Mn-1
            skor_ard = float(cosine_similarity(emb_mevcut, emb_onceki)[0][0])
            sapma_ard = round(1 - skor_ard, 4)

            # Ek ceza (Penalty) mekanizması
            if analysis_results and len(analysis_results) == len(transformed_list):
                res = analysis_results[i - 1]
                if res.info_loss.info_loss_occurred:
                    sapma_ard += 0.10
                if res.ambiguity.level == "Yüksek":
                    sapma_ard += 0.05

            # Kümülatif Benzerlik: Mn ile M0
            skor_kum = float(cosine_similarity(emb_mevcut, emb_M0)[0][0])

            ardisik_benzerlik.append(round(skor_ard, 4))
            ardisik_sapma.append(sapma_ard)
            kumulatif_benzerlik.append(round(skor_kum, 4))

        # Kırılma Noktası (Breaking Point - BP) Tespiti
        bp_idx = int(np.argmax(ardisik_sapma))
        max_sapma = ardisik_sapma[bp_idx]
        bp_gecerli = max_sapma >= BP_ESIK

        bp_channel_name = None
        if bp_gecerli:
            bp_channel = transformed_list[bp_idx].channel
            bp_channel_name = CHANNEL_NAMES.get(bp_channel, bp_channel.value)

        # Yakın Rakip Kontrolü (< %5 fark)
        close_contenders = []
        if bp_gecerli and max_sapma > 0:
            for idx, sapma_val in enumerate(ardisik_sapma):
                if idx == bp_idx:
                    continue
                if abs(sapma_val - max_sapma) / max_sapma < TIE_YUZDE_ESIK:
                    ch_name = CHANNEL_NAMES.get(transformed_list[idx].channel, transformed_list[idx].channel.value)
                    close_contenders.append(ch_name)

        # Zincir Adımlarını Oluşturma
        steps: List[DegradationStep] = []
        for i, transformed in enumerate(transformed_list):
            is_bp = bp_gecerli and (i == bp_idx)
            is_contender = bp_gecerli and (i != bp_idx) and (
                max_sapma > 0 and abs(ardisik_sapma[i] - max_sapma) / max_sapma < TIE_YUZDE_ESIK
            )

            step = DegradationStep(
                step_index=i + 1,
                channel=transformed.channel,
                channel_name=CHANNEL_NAMES.get(transformed.channel, transformed.channel.value),
                consecutive_similarity=ardisik_benzerlik[i],
                consecutive_deviation=ardisik_sapma[i],
                cumulative_similarity=kumulatif_benzerlik[i],
                is_breaking_point=is_bp,
                is_close_contender=is_contender,
            )
            steps.append(step)

        return DegradationChainResult(
            steps=steps,
            has_breaking_point=bp_gecerli,
            breaking_point_channel=bp_channel_name,
            max_consecutive_deviation=round(max_sapma, 4),
            close_contenders=close_contenders,
        )

    def _fallback_analyze(
        self, core: CoreMessage, transformed_list: List[TransformedMessage]
    ) -> DegradationChainResult:
        """Model yüklenemezse varsayılan çıktı."""
        steps = []
        for i, t in enumerate(transformed_list):
            steps.append(DegradationStep(
                step_index=i + 1,
                channel=t.channel,
                channel_name=CHANNEL_NAMES.get(t.channel, t.channel.value),
                consecutive_similarity=0.8,
                consecutive_deviation=0.2,
                cumulative_similarity=0.8,
                is_breaking_point=False,
                is_close_contender=False,
            ))
        return DegradationChainResult(steps=steps)
