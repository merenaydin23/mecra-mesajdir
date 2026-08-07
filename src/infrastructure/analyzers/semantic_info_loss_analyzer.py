"""
Anlamsal Benzerlik ve Bilgi Kaybı Analizörü (Infrastructure Katmanı)
=====================================================================
NLP, NLI ve SentenceTransformers modelleri ile bilgi kaybı ve anlamsal benzerlik ölçümü.
"""

import asyncio
import os
import re
import torch
from typing import List, Tuple, Optional, Dict
from sentence_transformers import SentenceTransformer, util
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from src.domain.entities.channel import CHANNEL_NAMES
from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.entities.analysis_result import (
    InfoLossResult,
    SemanticSimilarityResult,
    CTAResult,
    SentimentResult,
    AmbiguityResult,
    DegradationChainResult,
    CombinedAnalysisResult,
    InfoLossReason,
)
from src.domain.services.analyzer_service_interface import AnalyzerServiceInterface
from src.infrastructure.analyzers.cta_analyzer import CTAAnalyzer
from src.infrastructure.analyzers.sentiment_analyzer import SentimentAnalyzer
from src.infrastructure.analyzers.ambiguity_analyzer import AmbiguityAnalyzer
from src.infrastructure.analyzers.degradation_chain_analyzer import DegradationChainAnalyzer

_GLOBAL_SPACY_NER = None
_SPACY_INITIALIZED = False

def _get_spacy_ner():
    global _GLOBAL_SPACY_NER, _SPACY_INITIALIZED
    if _SPACY_INITIALIZED:
        return _GLOBAL_SPACY_NER

    _SPACY_INITIALIZED = True
    try:
        import spacy
    except ImportError as e:
        print(f"⚠️ [ANALİZ UYARI] spacy kütüphanesi yüklü değil: {e}")
        return None

    try:
        print("🔄 [ANALİZ] spaCy xx_ent_wiki_sm modeli yükleniyor (Singleton)...")
        _GLOBAL_SPACY_NER = spacy.load("xx_ent_wiki_sm")
    except OSError:
        print("⚠️ [ANALİZ UYARI] xx_ent_wiki_sm bulunamadı, otomatik indirme deneniyor...")
        try:
            from spacy.cli import download
            download("xx_ent_wiki_sm")
            print("✅ [ANALİZ] xx_ent_wiki_sm başarıyla indirildi, yükleniyor...")
            _GLOBAL_SPACY_NER = spacy.load("xx_ent_wiki_sm")
        except BaseException as e:
            print(f"⚠️ [ANALİZ UYARI] Model indirilemedi veya yüklenemedi. NER devre dışı. Hata: {e}")
            _GLOBAL_SPACY_NER = None
    except BaseException as e:
        print(f"⚠️ [ANALİZ UYARI] NER modeli yüklenirken beklenmeyen hata: {e}")
        _GLOBAL_SPACY_NER = None

    return _GLOBAL_SPACY_NER


# ==========================================
# EŞİK DEĞERLERİ VE SABİTLER
# ==========================================
NOTABLE_THRESHOLD = 0.30       # NLI çelişki skoru %30'u geçerse belirgin çelişki sayılır
FACT_HIDE_THRESHOLD = 50.0     # Olgu tutarlılığı %50'nin altına inerse bilgi kaybı var kabul edilir
TOPIC_RELATION_THRESHOLD = 50.0  # Cosine benzerlik %50 üzerindeyse konu korunmuş kabul edilir

# REGEX PATTERNS
YUZDE_PATTERN = (
    r"(?:%|yüzde\s*)\s*\d+(?:[.,]\d+)?(?:\s*(?:ila|ile|-|/)\s*(?:%|yüzde\s*)?\s*\d+(?:[.,]\d+)?)?"
)

DONEM_PATTERN = (
    r"(?:birinci|ikinci|üçüncü|dördüncü|ilk|son|geçen|gecen)\s*çeyre[kğ]\w*"
    r"|\b[1-4]\s*(?:\.|\'üncü|\'inci|\'ıncı|\'üncü)?\s*çeyre[kğ]\w*"
    r"|\b(?:ilk|ikinci)\s*(?:yarı\w*|(?:6|altı)\s*ay\w*)"
    r"|\b(?:20\d{2}[/-]?)?q[1-4](?:[/-]?20\d{2})?\b"
)

YIL_PATTERN = (
    r"\b(18|19|20)\d{2}\s*[/_-]\s*(18|19|20)\d{2}\b"
    r"|\b(18|19|20)\d{2}(?:\'?[a-zA-ZçğıöşüÇĞİÖŞÜ]+)?\b"
    r"|\b\'\d{2}\s*(?:yılı\w*|dönemi\w*)?\b"
)

ON_EKLER = r"(?:yaklaşık|tahminen|yaklasik|ortalama|en az|en fazla|üzerinde|uzerinde|altında|altinda)"
CARPANLAR = r"(?:bin|milyon|milyar|trilyon|mn|mln|mlr|bn|b|m|k)"
PARA_BIRIMLERI = r"(?:TL|TRY|usd|eur|dolar|dollar|euro|sterlin|ruble|yuan|₺|\$|€|£|¥)"
YAZIYLA_SAYI = (
    r"(?:\b(?:bir|iki|üç|uc|dört|dort|beş|bes|altı|alti|yedi|sekiz|dokuz|"
    r"on|yirmi|otuz|kırk|kirk|elli|altmış|altmis|yetmiş|yetmis|seksen|doksan|"
    r"yüz|yuz|bin|milyon|milyar|trilyon)\b\s*)+"
)

ULTRA_SAYI_PATTERN = (
    rf"\b(?:{ON_EKLER}\s*)?\d+(?:[.,]\d{{3}})*(?:[.,]\d+)?(?:\s*{CARPANLAR})?(?:\s*{PARA_BIRIMLERI})?\b"
    rf"|\b\d+(?:[.,]\d+)?\s*(?:-|ile|ila)\s*\d+(?:[.,]\d+)?(?:\s*{CARPANLAR})?(?:\s*{PARA_BIRIMLERI})?\b"
    rf"|\b{YAZIYLA_SAYI}(?:\s*{CARPANLAR})?(?:\s*{PARA_BIRIMLERI})?\b"
)

# Colab: Türkçe yazıyla sayı ve çarpan normalizasyonu
TR_BIRLER = {
    "bir": 1, "iki": 2, "üç": 3, "uc": 3, "dört": 4, "dort": 4, "beş": 5, "bes": 5,
    "altı": 6, "alti": 6, "yedi": 7, "sekiz": 8, "dokuz": 9,
}
TR_ONLAR = {
    "on": 10, "yirmi": 20, "otuz": 30, "kırk": 40, "kirk": 40, "elli": 50,
    "altmış": 60, "altmis": 60, "yetmiş": 70, "yetmis": 70, "seksen": 80, "doksan": 90,
}
TR_SCALE = {"yüz": 100, "yuz": 100, "bin": 1000, "milyon": 10**6, "milyar": 10**9, "trilyon": 10**12}
CARPAN_CARPANLARI = {
    "trilyon": 10**12, "milyar": 10**9, "milyon": 10**6, "bin": 1000,
    "mln": 10**6, "mlr": 10**9, "mn": 10**6, "bn": 1000, "b": 1000, "m": 10**6, "k": 1000,
}


class SemanticAndInfoLossAnalyzer(AnalyzerServiceInterface):
    """Anlamsal Benzerlik, Bilgi Kaybı, CTA, Duygu, Belirsizlik ve Bozulma Zinciri Servisi."""

    def __init__(self, llm_service=None):
        self._nli_tokenizer = None
        self._nli_model = None
        self._embed_model = None
        self._nlp_ner = None
        self._cta_analyzer = CTAAnalyzer()
        self._sentiment_analyzer = SentimentAnalyzer()
        self._ambiguity_analyzer = AmbiguityAnalyzer()
        self._degradation_analyzer = DegradationChainAnalyzer()
        self._models_loaded = False
        self._llm_service = llm_service  # Gemini hibrit olgu çıkarma
        self._last_fact_source = "rule"  # rule | ai | hybrid

    def _load_models(self):
        """NLP ve AI modellerini lazy-loading şeklinde yükler."""
        if self._models_loaded:
            return

        print("🔄 [ANALİZ] NLP ve AI modelleri yükleniyor (DeBERTa NLI + MPNet Embedding)...")

        # 1. NLI Modeli (Colab mantığı aynı — yükleme hatası sunucuyu düşürmez)
        try:
            nli_model_name = "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"
            self._nli_tokenizer = AutoTokenizer.from_pretrained(nli_model_name)
            self._nli_model = AutoModelForSequenceClassification.from_pretrained(nli_model_name)
        except Exception as e:
            print(f"⚠️ [ANALİZ UYARI] NLI modeli yüklenemedi: {e}")
            self._nli_tokenizer = None
            self._nli_model = None

        # 2. Embedding Modeli
        try:
            self._embed_model = SentenceTransformer(
                "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
            )
        except Exception as e:
            print(f"⚠️ [ANALİZ UYARI] Embedding modeli yüklenemedi: {e}")
            self._embed_model = None

        # 3. spaCy NER (Singleton ve Fallback)
        self._nlp_ner = _get_spacy_ner()

        self._models_loaded = True
        print("✅ [ANALİZ] Tüm analiz modelleri hazır!")

    # --- AYIKLAMA & NORMALİZASYON YARDIMCILARI ---
    @staticmethod
    def _is_overlapping(span: Tuple[int, int], occupied_spans: List[Tuple[int, int]]) -> bool:
        start, end = span
        return any(o_start < end and start < o_end for o_start, o_end in occupied_spans)

    def _extract_percentages(self, text: str, occupied_spans: List[Tuple[int, int]]) -> List[Tuple[str, str, Tuple[int, int]]]:
        results = []
        for m in re.finditer(YUZDE_PATTERN, text, re.IGNORECASE):
            if not self._is_overlapping(m.span(), occupied_spans):
                val = re.sub(r"\s+", " ", m.group().strip())
                results.append(("YÜZDE", val, m.span()))
        return results

    def _extract_periods(self, text: str, occupied_spans: List[Tuple[int, int]]) -> List[Tuple[str, str, Tuple[int, int]]]:
        results = []
        for m in re.finditer(DONEM_PATTERN, text, re.IGNORECASE):
            if not self._is_overlapping(m.span(), occupied_spans):
                val = re.sub(r"\s+", " ", m.group().strip().lower())
                results.append(("DÖNEM", val, m.span()))
        return results

    def _extract_years(self, text: str, occupied_spans: List[Tuple[int, int]]) -> List[Tuple[str, str, Tuple[int, int]]]:
        results = []
        for m in re.finditer(YIL_PATTERN, text, re.IGNORECASE):
            if not self._is_overlapping(m.span(), occupied_spans):
                raw_match = m.group().strip()
                if "/" in raw_match or "-" in raw_match or "_" in raw_match:
                    tag, val = "YIL_ARALIĞI", re.sub(r"\s+", "", raw_match)
                elif raw_match.startswith("'"):
                    tag, val = "YIL", "20" + raw_match.replace("'", "")[:2]
                else:
                    tag, val = "YIL", re.search(r"\d{4}", raw_match).group()
                results.append((tag, val, m.span()))
        return results

    def _extract_financial_numbers(self, text: str, occupied_spans: List[Tuple[int, int]]) -> List[Tuple[str, str, Tuple[int, int]]]:
        results = []
        valid_words = [
            "bir", "iki", "üç", "uc", "dört", "dort", "beş", "bes", "altı", "alti",
            "yedi", "sekiz", "dokuz", "on", "yirmi", "otuz", "kırk", "kirk", "elli",
            "altmış", "altmis", "yetmiş", "yetmis", "seksen", "doksan",
            "yüz", "yuz", "bin", "milyon", "milyar", "trilyon",
        ]
        for m in re.finditer(ULTRA_SAYI_PATTERN, text, re.IGNORECASE):
            if not self._is_overlapping(m.span(), occupied_spans):
                val = re.sub(r"\s+", " ", m.group().strip())
                has_digit = any(ch.isdigit() for ch in val)
                has_word = any(re.search(rf"\b{re.escape(w)}\b", val.lower()) for w in valid_words)
                if val.lower().strip() == "bir":
                    continue
                if has_digit or has_word:
                    results.append(("SAYI_FINANS", val, m.span()))
        return results

    def _extract_claims(self, text: str, occupied_spans: List[Tuple[int, int]]) -> List[Tuple[str, str, Tuple[int, int]]]:
        results = []
        for m in re.finditer(r"\b(iddia\s+edildi|öne\s+sürüldü|söylenti|belirtiliyor|kaydediliyor)\b", text, re.IGNORECASE):
            if not self._is_overlapping(m.span(), occupied_spans):
                results.append(("CLAIM", m.group().strip(), m.span()))
        return results

    def _extract_attributions(self, text: str, occupied_spans: List[Tuple[int, int]]) -> List[Tuple[str, str, Tuple[int, int]]]:
        results = []
        for m in re.finditer(r"\b(açıkladı|belirtti|vurguladı|duyurdu|ifade\s+etti|söyledi)\b", text, re.IGNORECASE):
            if not self._is_overlapping(m.span(), occupied_spans):
                results.append(("ATTRIBUTION", m.group().strip(), m.span()))
        return results

    def _extract_statistics(self, text: str, occupied_spans: List[Tuple[int, int]]) -> List[Tuple[str, str, Tuple[int, int]]]:
        results = []
        for m in re.finditer(r"\b\d+\s+(kişi|adet|hasta|öğrenci|kullanıcı|vatandaş)\b", text, re.IGNORECASE):
            if not self._is_overlapping(m.span(), occupied_spans):
                results.append(("STATISTIC", m.group().strip(), m.span()))
        return results

    def _extract_numeric_temporal_facts(self, text: str) -> List[Tuple[str, str]]:
        facts = []
        occupied_spans = []
        pipeline_steps = [
            self._extract_percentages,
            self._extract_periods,
            self._extract_years,
            self._extract_financial_numbers,
            self._extract_claims,
            self._extract_attributions,
            self._extract_statistics,
        ]
        for step_func in pipeline_steps:
            step_results = step_func(text, occupied_spans)
            for tag, val, span in step_results:
                facts.append((tag, val))
                occupied_spans.append(span)
        return facts

    # spaCy'nin kişi sandığı Türkçe sıfat / belirteç / kurum parçaları
    _FALSE_PERSON_TOKENS = frozenset({
        "yeni", "eski", "büyük", "küçük", "kucuk", "önemli", "onemli", "son", "ilk",
        "genel", "özel", "ozel", "resmi", "kamu", "yerel", "ulusal", "teknik",
        "güncel", "guncel", "mevcut", "ilgili", "söz", "soz", "böyle", "boyle",
        "geçen", "gecen", "önümüzdeki", "onumuzdeki", "bu", "şu", "o",
        "iletişim", "iletisim", "başkanlık", "baskanlik", "bakanlık", "bakanlik",
        "valilik", "müdürlük", "mudurluk", "ekip", "birim", "kurum", "panel",
        "masa", "haber", "duyuru", "çalışma", "calisma",
    })
    _TEMPORAL_TAIL = frozenset({
        "hafta", "haftası", "haftasi", "ay", "ayı", "ayi", "gün", "gun",
        "yıl", "yil", "yılı", "yili", "dönem", "donem", "sezon", "çeyrek", "ceyrek",
    })
    _ORG_TAIL = frozenset({
        "başkanlığı", "baskanligi", "bakanlığı", "bakanligi", "valiliği", "valiligi",
        "müdürlüğü", "mudurlugu", "daire", "başkanlık", "baskanlik", "kurumu", "ajansı", "ajansi",
    })
    _CONCEPT_TAIL = frozenset({
        "algoritma", "algoritması", "algoritmasi", "sistem", "sistemi",
        "entegrasyon", "entegrasyonu", "model", "modeli", "yazılım", "yazilim",
        "uygulama", "uygulaması", "uygulamasi", "platform", "platformu",
        "panel", "paneli", "masa", "masası", "masasi",
    })
    _CONCEPT_SYNONYMS = {
        "algoritma": ("algoritma", "sistem", "yapay zeka", "yapay zekâ", "entegrasyon", "model"),
        "sistem": ("sistem", "algoritma", "entegrasyon", "platform", "panel"),
        "entegrasyon": ("entegrasyon", "algoritma", "sistem", "yapay zeka", "yapay zekâ"),
        "panel": ("panel", "sistem", "platform", "masa"),
        "masa": ("masa", "panel", "sistem", "birim"),
    }
    # Bilinen kurum tam adları (sözlük)
    _KNOWN_ORGS = (
        r"T\.?\s*C\.?\s*Cumhurbaşkanlığı\s+İletişim\s+Başkanlığı",
        r"Cumhurbaşkanlığı\s+İletişim\s+Başkanlığı",
        r"İletişim\s+Başkanlığı",
        r"Iletisim\s+Baskanligi",
        r"CİMER",
        r"CIMER",
        r"AFAD(?:\s+Başkanlığı)?",
        r"(?:İl\s+)?Valilik(?:leri|i)?",
        r"Valilik",
    )

    def _extract_temporal_phrases(self, text: str) -> List[Tuple[str, str]]:
        """'geçen hafta / geçen ay / geçen salı' → DATE (tek başına 'Geçen' kişi olmaz)."""
        patterns = [
            r"(?i)\b(?:geçen|gecen|önümüzdeki|onumuzdeki|bu|şu)\s+(?:hafta|ay|gün|gun|yıl|yil|dönem|donem|çeyrek|ceyrek)\w*",
            r"(?i)\b(?:geçen|gecen|önümüzdeki|onumuzdeki|bu)\s+(?:pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar)\b",
            r"(?i)\bbugün\s+itibari(?:y|yle)?le\b",
            r"(?i)\b(?:dün|bugün|bugun|yarın|yarin|geçen\s+gün)\b",
        ]
        out: List[Tuple[str, str]] = []
        seen = set()
        for pat in patterns:
            for m in re.finditer(pat, text):
                val = re.sub(r"\s+", " ", m.group().strip())
                key = val.lower()
                if key not in seen:
                    seen.add(key)
                    out.append(("DATE", val))
        return out

    def _extract_known_orgs(self, text: str) -> List[Tuple[str, str]]:
        """Kurum adlarını tam haliyle çıkarır (İletişim Başkanlığı vb.)."""
        out: List[Tuple[str, str]] = []
        seen = set()
        for pat in self._KNOWN_ORGS:
            for m in re.finditer(pat, text, flags=re.IGNORECASE):
                val = re.sub(r"\s+", " ", m.group().strip())
                # Canonical yazım
                low = val.lower().replace("ı", "i").replace("İ", "i")
                if "iletisim" in low and "baskanlig" in low:
                    val = "İletişim Başkanlığı"
                elif "cimer" in low.replace("İ", "i"):
                    val = "CİMER"
                elif low.startswith("afad"):
                    val = "AFAD"
                elif "valilik" in low:
                    val = "Valilik"
                key = val.lower()
                if key not in seen:
                    seen.add(key)
                    out.append(("ORG", val))
        return out

    def _extract_concept_phrases(self, text: str) -> List[Tuple[str, str]]:
        """Kesilmiş PER yerine tam kavramı çıkarır."""
        patterns = [
            r"(?i)\byeni\s+(?:\S+\s+){0,3}(?:algoritma|sistem|entegrasyon|model|yazılım|uygulama|platform|panel|masa|hat)\w*",
            r"(?i)\bdijital\s+kriz\s+masa\w*",
            r"(?i)\btakip\s+panel\w*",
            r"(?i)\byönlendirme\s+panel\w*",
            r"(?i)\bdeprem\s+bilgilendirme\s+hatt\w*",
            r"(?i)\bkamuoyu\s+bilgilendirme\w*",
            r"(?i)\basılsız\s+paylaşım\w*",
            r"(?i)\byapay\s+zek[aâ]\s+entegrasyon\w*",
            r"(?i)\b(?:algoritma|takip\s+paneli|kriz\s+masası|yönlendirme\s+paneli)\w*\b",
        ]
        found: List[Tuple[str, str]] = []
        seen = set()
        for pat in patterns:
            for m in re.finditer(pat, text):
                val = re.sub(r"\s+", " ", m.group().strip())
                if val.lower() in {"sistem", "sistemi", "model", "modeli", "panel", "masa"}:
                    continue
                key = val.lower()
                if key not in seen and len(val) >= 8:
                    seen.add(key)
                    found.append(("MISC", val))
        return found

    def _expand_from_doc(self, doc, ent, tails: frozenset, max_extra: int = 4):
        """Entity sonrası tail kelimesine kadar span genişlet."""
        for i in range(ent.end, min(ent.end + max_extra, len(doc))):
            w = doc[i].text.lower().strip(".,;:'\"")
            if w in tails:
                return doc[ent.start : i + 1].text.strip()
        return None

    def _extract_named_entities(self, text: str) -> List[Tuple[str, str]]:
        results: List[Tuple[str, str]] = []
        seen = set()

        def _add(label: str, val: str):
            val = re.sub(r"\s+", " ", (val or "").strip())
            if not val:
                return
            key = (label, val.lower())
            if key in seen:
                return
            # Tek token false-person / kurum parçası ekleme
            if label in ("PER", "PERSON") and val.lower() in self._FALSE_PERSON_TOKENS:
                return
            if label in ("PER", "PERSON") and len(val.split()) == 1 and val.lower() in self._FALSE_PERSON_TOKENS:
                return
            seen.add(key)
            results.append((label, val))

        # 1) Sözlük: kurum + zaman (spaCy'den önce — doğru tam adlar)
        for label, val in self._extract_known_orgs(text):
            _add(label, val)
        for label, val in self._extract_temporal_phrases(text):
            _add(label, val)
        for label, val in self._extract_concept_phrases(text):
            _add(label, val)

        # 2) spaCy NER + akıllı genişletme
        if self._nlp_ner is not None:
            doc = self._nlp_ner(text)
            for ent in doc.ents:
                if ent.label_ not in ("ORG", "PER", "PERSON", "LOC", "MISC"):
                    continue
                val = ent.text.strip()
                if not val:
                    continue
                label = ent.label_
                tok = val.lower().strip()

                if label in ("PER", "PERSON"):
                    # Geçen + hafta/ay → DATE
                    if tok in {"geçen", "gecen", "önümüzdeki", "onumuzdeki", "bu", "şu"}:
                        expanded = self._expand_from_doc(doc, ent, self._TEMPORAL_TAIL, 2)
                        if expanded:
                            _add("DATE", expanded)
                        continue
                    # İletişim + Başkanlığı → ORG
                    if tok in {"iletişim", "iletisim", "cumhurbaşkanlığı", "cumhurbaskanligi"}:
                        expanded = self._expand_from_doc(doc, ent, self._ORG_TAIL, 3)
                        if expanded:
                            _add("ORG", expanded)
                        continue
                    # Yeni + algoritma/panel → MISC
                    if tok in self._FALSE_PERSON_TOKENS:
                        expanded = self._expand_from_doc(doc, ent, self._CONCEPT_TAIL, 5)
                        if expanded and len(expanded.split()) >= 2:
                            _add("MISC", expanded)
                        continue
                    if len(val.split()) == 1 and tok in self._FALSE_PERSON_TOKENS:
                        continue

                if label == "ORG":
                    # Yarım kalmış "İletişim" → Başkanlığı ile birleştir
                    if tok in {"iletişim", "iletisim"}:
                        expanded = self._expand_from_doc(doc, ent, self._ORG_TAIL, 3)
                        if expanded:
                            _add("ORG", expanded)
                            continue

                _add(label, val)

        # 3) Temizlik + yeniden etiketleme
        cleaned: List[Tuple[str, str]] = []
        for l, v in results:
            v2 = re.sub(r"\s+", " ", v.strip())
            # İyelik/hal eklerini kırp: Başkanlığı'nda → Başkanlığı
            v2 = re.sub(r"(['’](?:nda|nde|nt[ae]|n[ıi]n|n[ae]|yla|yle))\b", "", v2, flags=re.I).strip()
            # Kavramları kanonik forma çek
            if re.search(r"deprem\s+bilgilendirme\s+hatt", v2, flags=re.I):
                v2 = "deprem bilgilendirme hattı"
            elif re.search(r"\byönlendirme\s+panel", v2, flags=re.I):
                v2 = (
                    "yeni kurduğumuz yönlendirme paneli"
                    if v2.lower().startswith("yeni")
                    else "yönlendirme paneli"
                )
            elif re.search(r"kamuoyu\s+bilgilendirme", v2, flags=re.I):
                v2 = "kamuoyu bilgilendirmesi"
            elif re.search(r"asılsız\s+paylaşım", v2, flags=re.I):
                v2 = "asılsız paylaşım"
            low = v2.lower()
            # Bilinen kurumlar: spaCy LOC/PER → ORG (false-person filtresinden ÖNCE)
            ascii_low = (
                low.replace("İ", "i").replace("I", "i").replace("ı", "i")
                .replace("ğ", "g").replace("ş", "s").replace("ü", "u").replace("ö", "o").replace("ç", "c")
            )
            if "iletisim" in ascii_low and "baskanlig" in ascii_low:
                v2, l, low = "İletişim Başkanlığı", "ORG", "iletişim başkanlığı"
            elif ascii_low == "afad" or ascii_low.startswith("afad "):
                v2, l, low = "AFAD", "ORG", "afad"
            elif ascii_low in {"cimer"} or ascii_low.startswith("cimer"):
                v2, l, low = "CİMER", "ORG", "cimer"
            elif "valilik" in ascii_low:
                v2, l, low = "Valilik", "ORG", "valilik"
            # Tek kelimelik sıfat tuzakları yalnız KİŞİ için (Valilik/AFAD ORG kalsın)
            if l in ("PER", "PERSON") and low in self._FALSE_PERSON_TOKENS and len(v2.split()) == 1:
                continue
            # Kurum parçası / tam kurum asla KİŞİ olmasın
            if l in ("PER", "PERSON"):
                if re.search(r"başkanlığ|bakanlığ|valili[ğg]|müdürlüğ|iletişim|afad", low):
                    cleaned.append(("ORG", v2))
                    continue
                if len(v2.split()) == 1:
                    continue
            cleaned.append((l if l != "PERSON" else "PER", v2))

        # Alt-span temizliği + aynı span için etiket önceliği (ORG > LOC > DATE > MISC > PER)
        rank = {"ORG": 5, "LOC": 4, "DATE": 3, "EVENT": 3, "MISC": 2, "PER": 1}
        by_span: Dict[str, Tuple[str, str]] = {}
        for l, v in cleaned:
            if any(self._is_subspan(v, ov) for _, ov in cleaned):
                continue
            sk = self._entity_span_key(v)
            prev = by_span.get(sk)
            if prev is None or rank.get(l, 0) > rank.get(prev[0], 0):
                by_span[sk] = (l, v)
        return list(by_span.values())

    def _entity_span_key(self, value: str) -> str:
        return re.sub(r"\s+", " ", (value or "").lower().strip())

    def _is_subspan(self, a: str, b: str) -> bool:
        """a, b'nin alt parçası mı? (iletişim ⊂ iletişim başkanlığı)"""
        aa, bb = self._entity_span_key(a), self._entity_span_key(b)
        if not aa or not bb or aa == bb:
            return False
        return aa in bb and len(aa) < len(bb)

    def _merge_hybrid_entities(
        self,
        ai_ents: List[Tuple[str, str]],
        rule_ents: List[Tuple[str, str]],
    ) -> List[Tuple[str, str]]:
        """
        AI baskın hibrit: AI listesi omurga; kural yalnızca ORG/LOC/DATE/EVENT boşluk doldurur.
        Kısa/yanlış parçalar uzun ifadeler lehine elenir.
        """
        merged: List[Tuple[str, str]] = []
        seen_vals: List[str] = []

        def _add(label: str, val: str, prefer_label: bool = False):
            val = re.sub(r"\s+", " ", (val or "").strip())
            if not val:
                return
            key = self._entity_span_key(val)
            # Daha uzun span varken kısa olanı ekleme
            for existing in seen_vals:
                if key in existing and key != existing:
                    return
            # Yeni uzun span geldiyse kısa olanları çıkar
            drop_idx = [
                i for i, (l, v) in enumerate(merged)
                if self._is_subspan(v, val)
            ]
            for i in reversed(drop_idx):
                seen_vals.pop(i)
                merged.pop(i)
            # Aynı değer, etiket çatışması: AI etiketi kalsın
            for i, (l, v) in enumerate(merged):
                if self._entity_span_key(v) == key:
                    if prefer_label and l != label:
                        merged[i] = (label, val)
                    return
            seen_vals.append(key)
            merged.append((label, val))

        for label, val in ai_ents or []:
            _add(label, val, prefer_label=True)

        # AI baskın: kuraldan yalnızca kurum/yer/zaman/olay tamamlayıcı
        rule_fill_labels = {"ORG", "LOC", "DATE", "EVENT"}
        for label, val in rule_ents or []:
            if not ai_ents:
                _add(label, val, prefer_label=False)
            elif label in rule_fill_labels:
                _add(label, val, prefer_label=False)

        if ai_ents and rule_ents:
            self._last_fact_source = "hybrid"
        elif ai_ents:
            self._last_fact_source = "ai"
        else:
            self._last_fact_source = "rule"
        return merged

    def _resolve_core_entities(
        self,
        core_text: str,
        ai_ents: Optional[List[Tuple[str, str]]] = None,
    ) -> List[Tuple[str, str]]:
        rule_ents = self._extract_named_entities(core_text)
        if ai_ents:
            return self._merge_hybrid_entities(ai_ents, rule_ents)
        self._last_fact_source = "rule"
        return rule_ents

    @staticmethod
    def _digits_to_float(raw: str) -> Optional[float]:
        """'50000' / '50.000' / '50,5' gibi ham rakam dizisini float'a çevirir."""
        s = raw.strip()
        if not s:
            return None
        parts = re.split(r"[.,]", s)
        if len(parts) == 1:
            try:
                return float(parts[0])
            except ValueError:
                return None
        last = parts[-1]
        if len(last) == 3 and all(len(p) <= 3 for p in parts[:-1]):
            try:
                return float("".join(parts))
            except ValueError:
                return None
        if len(last) in (1, 2):
            try:
                return float(f"{''.join(parts[:-1])}.{last}")
            except ValueError:
                return None
        try:
            return float("".join(parts))
        except ValueError:
            return None

    @staticmethod
    def _words_to_number(text: str) -> Optional[float]:
        """'elli bin', 'yüz milyon' gibi yazıyla yazılmış sayıları rakama çevirir."""
        tokens = re.findall(r"[a-zA-ZçğıöşüÇĞİÖŞÜ]+", text.lower())
        total = 0.0
        current = 0.0
        found_any = False
        for tok in tokens:
            if tok in TR_BIRLER:
                current += TR_BIRLER[tok]
                found_any = True
            elif tok in TR_ONLAR:
                current += TR_ONLAR[tok]
                found_any = True
            elif tok in TR_SCALE:
                found_any = True
                scale_val = TR_SCALE[tok]
                current = (current if current != 0 else 1) * scale_val
                if scale_val >= 1000:
                    total += current
                    current = 0
        total += current
        return total if found_any else None

    @classmethod
    def _normalize_number_value(cls, val: str) -> Optional[float]:
        v = val.lower().strip()
        v = re.sub(rf"\b{PARA_BIRIMLERI}\b", "", v, flags=re.IGNORECASE)
        v = re.sub(r"[₺$€£¥]", "", v).strip()

        multiplier = 1.0
        for word, mult in sorted(CARPAN_CARPANLARI.items(), key=lambda x: -len(x[0])):
            pat = rf"\b{re.escape(word)}\b\s*$"
            if re.search(pat, v):
                multiplier = mult
                v = re.sub(pat, "", v).strip()
                break

        digit_match = re.search(r"[\d.,]+", v)
        if digit_match and any(ch.isdigit() for ch in digit_match.group()):
            base = cls._digits_to_float(digit_match.group())
            if base is not None:
                return base * multiplier

        word_val = cls._words_to_number(v)
        if word_val is not None:
            return word_val * multiplier
        return None

    @staticmethod
    def _normalize_percentage_value(val: str):
        nums = re.findall(r"\d+(?:[.,]\d+)?", val)
        nums = tuple(sorted(float(n.replace(",", ".")) for n in nums))
        return nums if nums else None

    @staticmethod
    def _normalize_period_value(val: str) -> str:
        v = val.lower()
        m = re.search(r"[1-4]", v)
        if m:
            return f"Ç{m.group()}"
        ordmap = {
            "birinci": 1, "ilk": 1, "ikinci": 2,
            "üçüncü": 3, "ucuncu": 3, "dördüncü": 4, "dorduncu": 4,
        }
        for w, num in ordmap.items():
            if w in v:
                return f"Ç{num}"
        if "yarı" in v or "yari" in v or "ay" in v:
            if "ilk" in v or "birinci" in v:
                return "H1"
            if "ikinci" in v:
                return "H2"
        if "son" in v:
            return "SON_ÇEYREK"
        return v.strip()

    @staticmethod
    def _normalize_year_value(val: str) -> str:
        digits = re.findall(r"\d{4}", val)
        return digits[0] if digits else val.strip()

    @classmethod
    def _normalize_fact(cls, label: str, val: str):
        if label == "YÜZDE":
            return cls._normalize_percentage_value(val)
        if label == "DÖNEM":
            return cls._normalize_period_value(val)
        if label in ("YIL", "YIL_ARALIĞI"):
            return cls._normalize_year_value(val)
        if label == "SAYI_FINANS":
            n = cls._normalize_number_value(val)
            return round(n, 2) if n is not None else None
        return val.lower().strip()

    def _rule_entity_found(self, label: str, val: str, target_lower: str) -> bool:
        """Kural tabanlı varlık var mı? (AI yokken / AI eksik bırakınca yedek)."""
        val_lower = val.lower()
        tokens = [t.lower() for t in re.findall(r"\w+", val, flags=re.UNICODE) if len(t) > 2]
        content_tokens = [t for t in tokens if t not in self._FALSE_PERSON_TOKENS]
        if not tokens:
            found = val_lower in target_lower
        else:
            check = content_tokens or tokens
            hits = sum(
                1 for tok in check
                if re.search(r"\b" + re.escape(tok) + r"\b", target_lower)
            )
            need = 2 if len(check) >= 2 else 1
            found = hits >= need or val_lower in target_lower
            if not found:
                for tok in tokens:
                    roots = {tok, tok.rstrip("sıiuü")}
                    if tok.endswith(("i", "ı", "u", "ü")) and len(tok) > 4:
                        roots.add(tok[:-1])
                    for root in roots:
                        syns = self._CONCEPT_SYNONYMS.get(root)
                        if syns and any(s in target_lower for s in syns):
                            if root in {"yeni", "eski", "ilgili", "genel"}:
                                continue
                            found = True
                            break
                    if found:
                        break
            if not found and label == "MISC":
                pairs = (
                    ("takip", "panel"),
                    ("kriz", "masa"),
                    ("dijital", "kriz"),
                    ("yönlendirme", "panel"),
                    ("bilgilendirme", "hat"),
                    ("deprem", "hat"),
                )
                for a, b in pairs:
                    if a in val_lower and b in val_lower and a in target_lower and b in target_lower:
                        found = True
                        break
        if not found and label == "DATE":
            if "hafta" in val_lower and re.search(
                r"(?:geçen|gecen|geçtiğimiz|gectigimiz|bu)\s+hafta", target_lower
            ):
                found = True
            elif re.search(r"\bay\b", val_lower) and re.search(
                r"(?:geçen|gecen|geçtiğimiz|gectigimiz|bu)\s+ay\b", target_lower
            ):
                found = True
            elif re.search(
                r"(?:geçen|gecen|bu)\s+(?:pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar)",
                val_lower,
            ):
                day = re.search(
                    r"(pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar)",
                    val_lower,
                )
                found = bool(day and day.group(1) in target_lower)
            else:
                for word, alts in (
                    ("dün", ("dün", "dun")),
                    ("bugün", ("bugün", "bugun", "bugün itibariyle", "bugun itibariyle")),
                    ("yarın", ("yarın", "yarin")),
                ):
                    if word in val_lower or any(a in val_lower for a in alts):
                        found = any(a in target_lower for a in alts)
                        break
        if not found and label == "ORG":
            if "iletişim" in val_lower or "iletisim" in val_lower:
                found = bool(re.search(r"iletişim\s+başkanlığ|iletisim\s+baskanlig", target_lower))
            elif "valilik" in val_lower:
                found = "valilik" in target_lower
            elif "afad" in val_lower:
                found = "afad" in target_lower
        return bool(found)

    def _dynamic_fact_consistency(
        self,
        core_text: str,
        target_text: str,
        core_entities: Optional[List[Tuple[str, str]]] = None,
        ai_presence: Optional[Dict[str, bool]] = None,
    ) -> Tuple[Optional[float], int, List[dict]]:
        nt_facts = self._extract_numeric_temporal_facts(core_text)
        ents = core_entities if core_entities is not None else self._extract_named_entities(core_text)
        target_nt_facts = self._extract_numeric_temporal_facts(target_text)
        target_lower = target_text.lower()

        target_norm_by_label: Dict[str, list] = {}
        for label, val in target_nt_facts:
            norm = self._normalize_fact(label, val)
            target_norm_by_label.setdefault(label, []).append(norm)

        total, matched = 0, 0
        details = []
        used_ai_judge = False

        # 1. Sayısal/Zamansal Olgu Kontrolü (kural — sayısal kesin)
        for label, val in nt_facts:
            total += 1
            norm_val = self._normalize_fact(label, val)
            found = norm_val is not None and norm_val in target_norm_by_label.get(label, [])
            if not found:
                val_clean = val.lower().strip()
                escaped_val = re.escape(val_clean)
                found = bool(re.search(r"\b" + escaped_val + r"\b", target_lower)) or (val_clean in target_lower)
            matched += int(found)
            details.append(self._fact_detail_row(label, val, bool(found)))

        # 2. NER / kavram / zaman — AI kararı baskın, yoksa kural
        for label, val in ents:
            total += 1
            val_lower = val.lower().strip()
            if ai_presence is not None and val_lower in ai_presence:
                found = bool(ai_presence[val_lower])
                used_ai_judge = True
            else:
                found = self._rule_entity_found(label, val, target_lower)
            matched += int(found)
            row = self._fact_detail_row(label, val, bool(found))
            if ai_presence is not None and val_lower in ai_presence:
                row["decide"] = "ai"
            else:
                row["decide"] = "rule"
            details.append(row)

        if used_ai_judge:
            # Kaynak: AI karar verdiyse hybrid-ai / ai
            if self._last_fact_source == "rule":
                self._last_fact_source = "ai"
            elif self._last_fact_source == "hybrid":
                self._last_fact_source = "hybrid"

        if total == 0:
            return None, 0, details

        return round((matched / total) * 100, 1), total, details

    # --- NLI & COSINE BENZERLİK ---
    def _get_nli_probs(self, premise: str, hypothesis: str) -> Dict[str, float]:
        if self._nli_model is None or self._nli_tokenizer is None:
            return {"entailment": 0.5, "neutral": 0.5, "contradiction": 0.0}
        inputs = self._nli_tokenizer(premise, hypothesis, return_tensors="pt", truncation=True)
        with torch.no_grad():
            outputs = self._nli_model(**inputs)
        probs = torch.softmax(outputs.logits[0], dim=-1)
        id2label = self._nli_model.config.id2label
        return {id2label[i].lower(): p.item() for i, p in enumerate(probs)}

    def _get_cosine_sim(self, text_a: str, text_b: str) -> float:
        if self._embed_model is None:
            # Minimal karakter örtüşmesi — model yokken çökme koruması
            a, b = set(text_a.lower().split()), set(text_b.lower().split())
            if not a or not b:
                return 0.0
            return round(100.0 * len(a & b) / len(a | b), 2)
        emb1 = self._embed_model.encode(text_a, convert_to_tensor=True)
        emb2 = self._embed_model.encode(text_b, convert_to_tensor=True)
        return round(util.cos_sim(emb1, emb2).item() * 100, 2)

    @staticmethod
    def _fact_detail_row(label: str, val: str, found: bool) -> dict:
        """Somut, okunabilir olgu satırı (algoritma kararını değiştirmez)."""
        return {
            "label": label,
            "value": val,
            "found": found,
            "status": "DURUYOR" if found else "YOK",
            "in_core": True,
            "in_target": found,
            "explain": (
                f"Asıl mesajda «{val}» var → bu platformda "
                + ("duruyor ✓" if found else "YOK ✗")
            ),
        }

    def prewarm(self) -> None:
        """Tüm alt modelleri önceden yükler (ilk analiz gecikmesini kırar)."""
        self._load_models()
        try:
            self._cta_analyzer._load_nlp()
        except Exception:
            pass
        try:
            self._sentiment_analyzer._load_model()
        except Exception:
            pass
        try:
            self._ambiguity_analyzer._load_model()
        except Exception:
            pass
        try:
            self._degradation_analyzer._load_model()
        except Exception:
            pass

    # --- ANA ANALİZ METHODLARI ---
    def _build_pair_result(
        self,
        core: CoreMessage,
        transformed: TransformedMessage,
        cos_sim: float,
        core_entities: Optional[List[Tuple[str, str]]] = None,
        ai_presence: Optional[Dict[str, bool]] = None,
    ) -> CombinedAnalysisResult:
        """Tek platform analizi — eşikler ve karar mantığı aynı."""
        core_text = core.content
        target_text = transformed.transformed_content

        fact_score, fact_total, fact_details = self._dynamic_fact_consistency(
            core_text,
            target_text,
            core_entities=core_entities,
            ai_presence=ai_presence,
        )
        # Kaynak bilgisini UI'ya taşı (ilk satıra meta değil; her satıra source)
        src = getattr(self, "_last_fact_source", "rule")
        for row in fact_details:
            row.setdefault("source", src)
        # NLI 8× CPU'da analiz timeout'a düşürüyor — varsayılan kapalı
        fwd_contra = 0.0
        if os.getenv("ANALYZE_USE_NLI", "").strip().lower() in ("1", "true", "yes"):
            fwd_nli = self._get_nli_probs(core_text, target_text)
            fwd_contra = fwd_nli.get("contradiction", 0.0)

        model_unavailable = (self._nli_model is None) and (self._embed_model is None)
        loss_reason = InfoLossReason.NONE

        if fact_score is not None:
            info_loss_rate = round(100.0 - fact_score, 1)
            
            if fwd_contra >= NOTABLE_THRESHOLD:
                info_loss_occurred = True
                loss_reason = InfoLossReason.CONTRADICTION
            elif fact_score <= FACT_HIDE_THRESHOLD:
                info_loss_occurred = True
                loss_reason = InfoLossReason.MISSING_FACT
            else:
                info_loss_occurred = False
        else:
            info_loss_rate = None
            if fwd_contra >= NOTABLE_THRESHOLD:
                info_loss_occurred = True
                loss_reason = InfoLossReason.CONTRADICTION
            else:
                info_loss_occurred = False

        topic_preserved = cos_sim >= TOPIC_RELATION_THRESHOLD

        if not info_loss_occurred and not topic_preserved and not model_unavailable:
            loss_reason = InfoLossReason.SOFTENING

        return CombinedAnalysisResult(
            channel=transformed.channel,
            channel_name=CHANNEL_NAMES.get(transformed.channel, transformed.channel.value),
            original_content=core_text,
            transformed_content=target_text,
            info_loss=InfoLossResult(
                channel=transformed.channel,
                info_loss_occurred=info_loss_occurred,
                info_loss_rate=info_loss_rate,
                checked_facts_count=fact_total,
                fact_details=fact_details,
                loss_reason=loss_reason,
                model_unavailable=model_unavailable,
            ),
            semantic_similarity=SemanticSimilarityResult(
                channel=transformed.channel,
                semantic_similarity_percentage=cos_sim,
                topic_preserved=topic_preserved,
            ),
            cta=self._cta_analyzer.analyze(transformed),
            sentiment=self._sentiment_analyzer.analyze(transformed),
            ambiguity=self._ambiguity_analyzer.analyze(transformed),
        )

    def _sync_analyze_pair(
        self,
        core: CoreMessage,
        transformed: TransformedMessage,
        core_entities: Optional[List[Tuple[str, str]]] = None,
        ai_presence: Optional[Dict[str, bool]] = None,
    ) -> CombinedAnalysisResult:
        self._load_models()
        ents = self._resolve_core_entities(core.content, core_entities)
        cos_sim = self._get_cosine_sim(core.content, transformed.transformed_content)
        return self._build_pair_result(
            core, transformed, cos_sim, core_entities=ents, ai_presence=ai_presence
        )

    def _batch_cosine_sims(self, core_text: str, target_texts: List[str]) -> List[float]:
        """Tek encode çağrısıyla tüm platform benzerliklerini hesaplar (hız)."""
        if not target_texts:
            return []
        if self._embed_model is None:
            return [self._get_cosine_sim(core_text, t) for t in target_texts]
        embs = self._embed_model.encode([core_text] + target_texts, convert_to_tensor=True)
        core_emb = embs[0]
        sims = []
        for i in range(1, len(embs)):
            sims.append(round(util.cos_sim(core_emb, embs[i]).item() * 100, 2))
        return sims

    def _sync_analyze_all(
        self,
        core: CoreMessage,
        transformed_list: List[TransformedMessage],
        core_entities: Optional[List[Tuple[str, str]]] = None,
        presence_by_channel: Optional[Dict[str, Dict[str, bool]]] = None,
    ) -> Tuple[List[CombinedAnalysisResult], DegradationChainResult]:
        """Tek iş parçacığında batch embedding + sıralı analiz (CPU'da daha hızlı)."""
        self.prewarm()
        ents = self._resolve_core_entities(core.content, core_entities)
        target_texts = [t.transformed_content for t in transformed_list]
        sims = self._batch_cosine_sims(core.content, target_texts)
        presence_by_channel = presence_by_channel or {}
        results = []
        for i, transformed in enumerate(transformed_list):
            ch_key = getattr(transformed.channel, "value", str(transformed.channel))
            ai_pres = presence_by_channel.get(ch_key)
            results.append(
                self._build_pair_result(
                    core,
                    transformed,
                    sims[i],
                    core_entities=ents,
                    ai_presence=ai_pres,
                )
            )
        degradation_result = self._degradation_analyzer.analyze_chain(core, transformed_list, analysis_results=results)
        return results, degradation_result

    async def _fetch_ai_entities(self, core_text: str) -> List[Tuple[str, str]]:
        """Gemini ile bir kez olgu çıkar; yoksa/hata → []."""
        llm = self._llm_service
        if llm is None or not hasattr(llm, "extract_core_facts"):
            return []
        try:
            return await llm.extract_core_facts(core_text) or []
        except Exception as e:
            print(f"⚠️ [ANALİZ] AI olgu çıkarma atlandı: {e}")
            return []

    async def _fetch_ai_presence(
        self,
        facts: List[Tuple[str, str]],
        transformed_list: List[TransformedMessage],
    ) -> Dict[str, Dict[str, bool]]:
        """Her platform için AI var/yok kararı (AI baskın)."""
        llm = self._llm_service
        if not facts or llm is None:
            return {}
        platforms = [
            (getattr(t.channel, "value", str(t.channel)), t.transformed_content)
            for t in transformed_list
        ]
        try:
            if hasattr(llm, "judge_facts_batch"):
                return await llm.judge_facts_batch(facts, platforms) or {}
            if hasattr(llm, "judge_facts_presence"):
                out: Dict[str, Dict[str, bool]] = {}
                for pid, text in platforms:
                    decided = await llm.judge_facts_presence(facts, text)
                    if decided:
                        out[pid] = decided
                return out
        except Exception as e:
            print(f"⚠️ [ANALİZ] AI olgu karşılaştırma atlandı: {e}")
        return {}

    async def analyze_pair(self, core: CoreMessage, transformed: TransformedMessage) -> CombinedAnalysisResult:
        """Çekirdek mesaj ile tek bir mecradan gelen mesajı kıyaslar (Non-blocking)."""
        ai_ents = await self._fetch_ai_entities(core.content)
        ents = await asyncio.to_thread(self._resolve_core_entities, core.content, ai_ents)
        presence = None
        if ents and self._llm_service is not None and hasattr(self._llm_service, "judge_facts_presence"):
            try:
                presence = await self._llm_service.judge_facts_presence(
                    ents, transformed.transformed_content
                )
            except Exception as e:
                print(f"⚠️ [ANALİZ] AI pair-judge atlandı: {e}")
                presence = None
        return await asyncio.to_thread(self._sync_analyze_pair, core, transformed, ai_ents, presence)

    async def analyze_all(
        self, core: CoreMessage, transformed_list: List[TransformedMessage]
    ) -> Tuple[List[CombinedAnalysisResult], DegradationChainResult]:
        """Hızlı analiz: 1× AI olgu (opsiyonel) + kural var/yok; 8× LLM judge/NLI yok."""
        ai_ents = await self._fetch_ai_entities(core.content)
        print(f"[ANALİZ] olgu={len(ai_ents or [])} AI + kural eşleşme (hızlı mod)")
        return await asyncio.to_thread(
            self._sync_analyze_all, core, transformed_list, ai_ents, {}
        )
