"""
Anlamsal Benzerlik ve Bilgi Kaybı Analizörü (Infrastructure Katmanı)
=====================================================================
NLP, NLI ve SentenceTransformers modelleri ile bilgi kaybı ve anlamsal benzerlik ölçümü.
"""

import asyncio
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

    def __init__(self):
        self._nli_tokenizer = None
        self._nli_model = None
        self._embed_model = None
        self._nlp_ner = None
        self._cta_analyzer = CTAAnalyzer()
        self._sentiment_analyzer = SentimentAnalyzer()
        self._ambiguity_analyzer = AmbiguityAnalyzer()
        self._degradation_analyzer = DegradationChainAnalyzer()
        self._models_loaded = False

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

    def _extract_named_entities(self, text: str) -> List[Tuple[str, str]]:
        if self._nlp_ner is None:
            return []
        doc = self._nlp_ner(text)
        return [(ent.label_, ent.text.strip()) for ent in doc.ents
                if ent.label_ in ("ORG", "PER", "PERSON", "LOC", "MISC")]

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

    def _dynamic_fact_consistency(self, core_text: str, target_text: str) -> Tuple[Optional[float], int, List[dict]]:
        nt_facts = self._extract_numeric_temporal_facts(core_text)
        ents = self._extract_named_entities(core_text)
        target_nt_facts = self._extract_numeric_temporal_facts(target_text)
        target_lower = target_text.lower()

        target_norm_by_label: Dict[str, list] = {}
        for label, val in target_nt_facts:
            norm = self._normalize_fact(label, val)
            target_norm_by_label.setdefault(label, []).append(norm)

        total, matched = 0, 0
        details = []

        # 1. Sayısal/Zamansal Olgu Kontrolü
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

        # 2. NER Kontrolü
        for label, val in ents:
            total += 1
            tokens = [t.lower() for t in re.findall(r"\w+", val) if len(t) > 2]
            if not tokens:
                found = val.lower() in target_lower
            else:
                found = any(re.search(r"\b" + re.escape(tok) + r"\b", target_lower) for tok in tokens)
            matched += int(found)
            details.append(self._fact_detail_row(label, val, bool(found)))

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
    ) -> CombinedAnalysisResult:
        """Tek platform analizi — eşikler ve karar mantığı aynı."""
        core_text = core.content
        target_text = transformed.transformed_content

        fact_score, fact_total, fact_details = self._dynamic_fact_consistency(core_text, target_text)
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

    def _sync_analyze_pair(self, core: CoreMessage, transformed: TransformedMessage) -> CombinedAnalysisResult:
        self._load_models()
        cos_sim = self._get_cosine_sim(core.content, transformed.transformed_content)
        return self._build_pair_result(core, transformed, cos_sim)

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
        self, core: CoreMessage, transformed_list: List[TransformedMessage]
    ) -> Tuple[List[CombinedAnalysisResult], DegradationChainResult]:
        """Tek iş parçacığında batch embedding + sıralı analiz (CPU'da daha hızlı)."""
        self.prewarm()
        target_texts = [t.transformed_content for t in transformed_list]
        sims = self._batch_cosine_sims(core.content, target_texts)
        results = [
            self._build_pair_result(core, transformed, sims[i])
            for i, transformed in enumerate(transformed_list)
        ]
        degradation_result = self._degradation_analyzer.analyze_chain(core, transformed_list, analysis_results=results)
        return results, degradation_result

    async def analyze_pair(self, core: CoreMessage, transformed: TransformedMessage) -> CombinedAnalysisResult:
        """Çekirdek mesaj ile tek bir mecradan gelen mesajı kıyaslar (Non-blocking)."""
        return await asyncio.to_thread(self._sync_analyze_pair, core, transformed)

    async def analyze_all(
        self, core: CoreMessage, transformed_list: List[TransformedMessage]
    ) -> Tuple[List[CombinedAnalysisResult], DegradationChainResult]:
        """Tüm mecraları tek batch'te analiz eder (embedding paylaşımı + model thrash yok)."""
        return await asyncio.to_thread(self._sync_analyze_all, core, transformed_list)
