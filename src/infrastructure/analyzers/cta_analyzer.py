"""
Eylem Çağrısı (CTA - Call To Action) Analizörü (Infrastructure Katmanı)
========================================================================
Stanza ve Türkçe Morfolojik Dilbilgisi Çözümlemesi ile Eylem Çağrısı Analizi.
"""

import torch
from typing import List

from src.domain.entities.channel import ChannelType
from src.domain.entities.message import TransformedMessage
from src.domain.entities.analysis_result import CTAResult


# PyTorch 2.x patching for Stanza model loading
original_load = torch.load
def patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return original_load(*args, **kwargs)
torch.load = patched_load


class CTAAnalyzer:
    """Stanza Türkçe Morfoloji Motoru ile CTA Analizi."""

    def __init__(self):
        self._nlp = None
        self._is_loaded = False

    def _load_nlp(self):
        """Stanza Türkçe NLP boru hattını lazy loading ile yükler."""
        if self._is_loaded:
            return

        print("🔄 [CTA ANALİZ] Stanza Türkçe Morfoloji modeli yükleniyor...")
        try:
            import stanza
            import spacy_stanza
            
            # Stanza Türkçe boru hattını yükle
            try:
                self._nlp = spacy_stanza.load_pipeline("tr")
            except Exception:
                stanza.download("tr")
                self._nlp = spacy_stanza.load_pipeline("tr")

            self._is_loaded = True
            print("✅ [CTA ANALİZ] Stanza Türkçe NLP modeli başarıyla yüklendi!")
        except Exception as e:
            print(f"⚠️ [CTA ANALİZ UYARI] Stanza modeli yüklenirken hata oluştu: {e}")
            self._nlp = None
            self._is_loaded = True

    def analyze(self, transformed: TransformedMessage) -> CTAResult:
        """Dönüştürülmüş mecra mesajının CTA analizini gerçekleştirir."""
        self._load_nlp()

        metin = transformed.transformed_content

        # Fallback if stanza model is unavailable
        if self._nlp is None:
            return self._fallback_analyze(transformed)

        doc = self._nlp(metin)

        toplam_fiil = 0
        toplam_siddet = 0
        tum_fiiller = []
        cta_kelimeleri = []
        hitap_turleri = []

        for word in doc:
            morph_str = str(word.morph)

            # KURAL 1: Karşımıza çıkan HER fiili sayıyoruz ve listeye alıyoruz
            if word.pos_ == "VERB" and morph_str:
                toplam_fiil += 1
                tum_fiiller.append(word.text)

                # KURAL 2: Fiil Emir Kipi mi? (Mood=Imp)
                if "Mood=Imp" in morph_str:
                    cta_kelimeleri.append(word.text)
                    toplam_siddet += 5

                    if "Number=Sing" in morph_str:
                        hitap_turleri.append("2. Tekil (Sen)")
                    elif "Number=Plur" in morph_str:
                        hitap_turleri.append("2. Çoğul (Siz)")

                # KURAL 3: Fiil Gereklilik Kipi mi? (Mood=Nec)
                elif "Mood=Nec" in morph_str:
                    cta_kelimeleri.append(word.text)
                    toplam_siddet += 3
                    hitap_turleri.append("Tavsiye / Dolaylı")

        # HESAPLAMALAR
        cta_var_mi = len(cta_kelimeleri) > 0
        maksimum_siddet = toplam_fiil * 5

        essiz_hitaplar = list(set(hitap_turleri))
        hitap_metni = ", ".join(essiz_hitaplar) if essiz_hitaplar else "Yok"
        skor_metni = f"{toplam_siddet}/{maksimum_siddet}" if toplam_fiil > 0 else "0/0"
        normalized_score = round(toplam_siddet / maksimum_siddet, 2) if maksimum_siddet > 0 else 0.0

        return CTAResult(
            channel=transformed.channel,
            has_cta=cta_var_mi,
            verb_count=toplam_fiil,
            all_verbs=tum_fiiller,
            cta_words=cta_kelimeleri,
            strength_score=normalized_score,
            strength_text=skor_metni,
            person_type=hitap_metni,
        )

    def _fallback_analyze(self, transformed: TransformedMessage) -> CTAResult:
        """Stanza kütüphanesi hazır değilse temel regex/keyword fallback'i."""
        metin = transformed.transformed_content.lower()
        cta_keywords = ["takip edin", "tıklayın", "katılın", "okuyun", "raporlayın", "abone olun", "izleyin", "paylaşın"]
        found = [kw for kw in cta_keywords if kw in metin]
        return CTAResult(
            channel=transformed.channel,
            has_cta=len(found) > 0,
            verb_count=len(found),
            all_verbs=found,
            cta_words=found,
            strength_score=0.5 if len(found) > 0 else 0.0,
            strength_text=f"{len(found)*5}/{len(found)*5}" if len(found) > 0 else "0/0",
            person_type="2. Çoğul (Siz)" if len(found) > 0 else "Yok",
        )
