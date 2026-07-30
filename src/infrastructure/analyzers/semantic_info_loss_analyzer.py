"""
Anlamsal Benzerlik ve Bilgi Kaybı Analizörü (Infrastructure Katmanı)
=====================================================================
NLP, NLI ve SentenceTransformers modelleri ile bilgi kaybı ve anlamsal benzerlik ölçümü.
"""

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
    CombinedAnalysisResult,
)
from src.domain.services.analyzer_service_interface import AnalyzerServiceInterface
from src.infrastructure.analyzers.cta_analyzer import CTAAnalyzer
from src.infrastructure.analyzers.sentiment_analyzer import SentimentAnalyzer


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


class SemanticAndInfoLossAnalyzer(AnalyzerServiceInterface):
    """Anlamsal Benzerlik, Bilgi Kaybı, CTA ve Duygu Analiz Servisi."""

    def __init__(self):
        self._nli_tokenizer = None
        self._nli_model = None
        self._embed_model = None
        self._nlp_ner = None
        self._cta_analyzer = CTAAnalyzer()
        self._sentiment_analyzer = SentimentAnalyzer()
        self._models_loaded = False

    def _load_models(self):
        """NLP ve AI modellerini lazy-loading şeklinde yükler."""
        if self._models_loaded:
            return

        print("🔄 [ANALİZ] NLP ve AI modelleri yükleniyor (DeBERTa NLI + MPNet Embedding)...")

        # 1. NLI Modeli
        nli_model_name = "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"
        self._nli_tokenizer = AutoTokenizer.from_pretrained(nli_model_name)
        self._nli_model = AutoModelForSequenceClassification.from_pretrained(nli_model_name)

        # 2. Embedding Modeli
        self._embed_model = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
        )

        # 3. spaCy NER (İsteğe bağlı/fallback'li)
        try:
            import spacy
            try:
                self._nlp_ner = spacy.load("xx_ent_wiki_sm")
            except OSError:
                from spacy.cli import download as spacy_download
                spacy_download("xx_ent_wiki_sm")
                self._nlp_ner = spacy.load("xx_ent_wiki_sm")
        except Exception:
            self._nlp_ner = None

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

    def _extract_numeric_temporal_facts(self, text: str) -> List[Tuple[str, str]]:
        facts = []
        occupied_spans = []
        pipeline_steps = [
            self._extract_percentages,
            self._extract_periods,
            self._extract_years,
            self._extract_financial_numbers,
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
    def _normalize_fact(label: str, val: str):
        v = val.lower().strip()
        if label == "YÜZDE":
            nums = re.findall(r"\d+(?:[.,]\d+)?", val)
            return tuple(sorted(float(n.replace(",", ".")) for n in nums)) if nums else None
        if label == "DÖNEM":
            m = re.search(r"[1-4]", v)
            if m:
                return f"Ç{m.group()}"
            return v
        if label in ("YIL", "YIL_ARALIĞI"):
            digits = re.findall(r"\d{4}", val)
            return digits[0] if digits else v
        return v

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
            details.append({"label": label, "value": val, "found": bool(found)})

        # 2. NER Kontrolü
        for label, val in ents:
            total += 1
            tokens = [t.lower() for t in re.findall(r"\w+", val) if len(t) > 2]
            if not tokens:
                found = val.lower() in target_lower
            else:
                found = any(re.search(r"\b" + re.escape(tok) + r"\b", target_lower) for tok in tokens)
            matched += int(found)
            details.append({"label": label, "value": val, "found": bool(found)})

        if total == 0:
            return None, 0, details

        return round((matched / total) * 100, 1), total, details

    # --- NLI & COSINE BENZERLİK ---
    def _get_nli_probs(self, premise: str, hypothesis: str) -> Dict[str, float]:
        inputs = self._nli_tokenizer(premise, hypothesis, return_tensors="pt", truncation=True)
        with torch.no_grad():
            outputs = self._nli_model(**inputs)
        probs = torch.softmax(outputs.logits[0], dim=-1)
        id2label = self._nli_model.config.id2label
        return {id2label[i].lower(): p.item() for i, p in enumerate(probs)}

    def _get_cosine_sim(self, text_a: str, text_b: str) -> float:
        emb1 = self._embed_model.encode(text_a, convert_to_tensor=True)
        emb2 = self._embed_model.encode(text_b, convert_to_tensor=True)
        return round(util.cos_sim(emb1, emb2).item() * 100, 2)

    # --- ANA ANALİZ METHODLARI ---
    async def analyze_pair(self, core: CoreMessage, transformed: TransformedMessage) -> CombinedAnalysisResult:
        """Çekirdek mesaj ile tek bir mecradan gelen mesajı kıyaslar."""
        self._load_models()

        core_text = core.content
        target_text = transformed.transformed_content

        # 1. Cosine Benzerlik
        cos_sim = self._get_cosine_sim(core_text, target_text)

        # 2. Olgu Tutarlılığı & Bilgi Kaybı
        fact_score, fact_total, fact_details = self._dynamic_fact_consistency(core_text, target_text)

        # 3. NLI Çelişki Skoru
        fwd_nli = self._get_nli_probs(core_text, target_text)
        fwd_contra = fwd_nli.get("contradiction", 0.0)

        # 4. Sapma & Kayıp Kararı
        if fact_score is not None:
            info_loss_rate = round(100.0 - fact_score, 1)
            info_loss_occurred = (fact_score <= FACT_HIDE_THRESHOLD) or (fwd_contra >= NOTABLE_THRESHOLD)
        else:
            info_loss_rate = None
            info_loss_occurred = fwd_contra >= NOTABLE_THRESHOLD

        topic_preserved = cos_sim >= TOPIC_RELATION_THRESHOLD

        info_loss_res = InfoLossResult(
            channel=transformed.channel,
            info_loss_occurred=info_loss_occurred,
            info_loss_rate=info_loss_rate,
            checked_facts_count=fact_total,
            fact_details=fact_details,
        )

        semantic_res = SemanticSimilarityResult(
            channel=transformed.channel,
            semantic_similarity_percentage=cos_sim,
            topic_preserved=topic_preserved,
        )

        # 5. CTA Analizi
        cta_res = self._cta_analyzer.analyze(transformed)

        # 6. Duygu Yoğunluğu Analizi
        sentiment_res = self._sentiment_analyzer.analyze(transformed)

        return CombinedAnalysisResult(
            channel=transformed.channel,
            channel_name=CHANNEL_NAMES.get(transformed.channel, transformed.channel.value),
            original_content=core_text,
            transformed_content=target_text,
            info_loss=info_loss_res,
            semantic_similarity=semantic_res,
            cta=cta_res,
            sentiment=sentiment_res,
        )

    async def analyze_all(
        self, core: CoreMessage, transformed_list: List[TransformedMessage]
    ) -> List[CombinedAnalysisResult]:
        """Tüm dönüştürülmüş mecralar için sırayla analiz yapar."""
        results = []
        for transformed in transformed_list:
            res = await self.analyze_pair(core, transformed)
            results.append(res)
        return results
