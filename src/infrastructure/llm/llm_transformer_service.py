"""
LLM Mesaj Dönüştürücü Servisi (LLM Transformer Service)
=========================================================
Groq (kurum dışı) veya kurumsal OpenAI-uyumlu LLM ile
çekirdek yazım düzeltmesi + mecra bazlı dönüşümler.
"""

import os
import re
import json
import time
import asyncio
from typing import Dict, List, Optional, Tuple

from openai import AsyncOpenAI
import httpx

from src.domain.entities.channel import ChannelType, CHANNEL_NAMES
from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.services.llm_service_interface import LLMServiceInterface
from src.infrastructure.llm.prompts import CHANNEL_PROMPTS, CORE_PROOFREAD_PROMPT


# Tek istekte 8 mecra — kota ve "hepsi aynı core" sorununu keser
BATCH_TRANSFORM_SYSTEM = """Sen T.C. İletişim Başkanlığı bünyesinde çalışan üst düzey bir kurumsal iletişim uzmanısın.

KURAL 1: Ham metni KESİNLİKLE birebir kopyalama / yapıştırma.
KURAL 2: Laubali ifadeleri ('bizim çocuklar', 'şak diye', 'dün akşamüstü') SİL; resmi bürokratik dil yaz.
KURAL 3: Her mecrayı aşağıdaki FORMAT İSKELETİNE birebir uyarak BAŞTAN YAZ.
KURAL 4: Resmi yazıda rastgele Vali/Müdür uydurma; imza satırında yalnızca [Ad Soyad] ve [Unvan].
KURAL 5: %100 Türkçe. Markdown, kod bloğu, meta yorum YASAK.
KURAL 6: Sayı, tarih, kurum/kişi adlarını olgu olarak koru.

FORMAT İSKELETLERİ (zorunlu başlıklar):
- press_release: T.C. İLETİŞİM BAŞKANLIĞI / BASIN AÇIKLAMASI / BAŞLIK / 3 paragraf / Kamuoyuna saygıyla duyurulur.
- agency_news: FLAŞ / BAŞLIK / spot / ANKARA - giriş / gelişme / sonuç
- tabloid: BAŞLIK / SPOT / giriş / gövde / kapanış
- x_twitter: 🚨 kanca / 📌 ÖZET: / 📋 DETAYLAR: (3 madde) / 📢 kapanış / 3 hashtag
- linkedin: stratejik açılış / değer paragrafı / Öne Çıkan Başlıklar: (3 madde) / kapanış / 3 hashtag
- vertical_video: VİDEO BAŞLIĞI: / SAHNE 1..4 (her birinde GÖRSEL/YAZI/SES)
- messaging_chain: ⚠️ ÖNEMLİ BİLGİLENDİRME / Merhaba, / 📌 Konu: / 📍 Bilmeniz Gerekenler: / ℹ️ Hatırlatma: / 📲 paylaşım cümlesi
- official_letter: T.C. / İLETİŞİM BAŞKANLIĞI / Sayı / Tarih / Konu / DAĞITIM YERLERİNE / 3 paragraf / Bilgilerinizi ve gereğini arz/rica ederim. / [Ad Soyad] / [Unvan]

Çıktın SADECE geçerli JSON olsun. Anahtarlar tam:
press_release, agency_news, tabloid, x_twitter, linkedin, vertical_video, messaging_chain, official_letter"""


FACT_EXTRACT_SYSTEM = """Sen Türkçe kurumsal iletişim metinlerinde olgu çıkaran kıdemli bir analistsin.

Görevin: ASIL mesajdaki TÜM önemli bilgileri (kişi/kurum/yer/zaman/kavram/olay) BÜTÜNCÜL ifadelerle çıkar.
Az çıkarmak HATA sayılır. Tipik bir kriz/kamu mesajında 6–14 olgu beklenir.

Etiketler (yalnızca bunlar):
- PER   = gerçek kişi adı-soyadı (sıfat/belirteç ASLA kişi değildir)
- ORG   = kurum / birim / teşkilat (Valilik, AFAD, İletişim Başkanlığı, CİMER…)
- LOC   = yer / şehir / ülke / bölge
- DATE  = zaman (geçen salı, bugün, bugün itibarıyla, geçen hafta, 2024…)
- MISC  = sistem/kavram/proje/hat/panel (deprem bilgilendirme hattı, yönlendirme paneli…)
- EVENT = olay / operasyon adı (varsa)

ZORUNLU:
1) Parçalama YASAK: "Geçen"≠PER → DATE "geçen salı" / "geçen hafta".
2) "İletişim" tek başına ORG değil → "İletişim Başkanlığı".
3) "Yeni" tek başına ekleme → MISC "yeni kurduğumuz yönlendirme paneli" veya "yönlendirme paneli".
4) Kurum + kavram + zaman AYRI olgular olsun (hepsini çıkar).
5) Tek kelimelik sıfat (yeni, geçen, ilgili, resmi…) ASLA.
6) En az önemli olanları at; hedef 6–14, en fazla 18 olgu.
7) SADECE JSON: {"entities":[{"label":"ORG","value":"Valilik"}]}
Markdown/yorum YASAK.

ÖRNEK (benzer metin):
Girdi: "geçen salı Valilik ile ortak başlattığımız deprem bilgilendirme hattını bugün itibariyle tam oturttuk… yeni kurduğumuz yönlendirme paneli…"
Beklenen entities (özet):
DATE "geçen salı", ORG "Valilik", MISC "deprem bilgilendirme hattı", DATE "bugün", MISC "yönlendirme paneli"
(+ varsa AFAD, asılsız paylaşım, kamuoyu bilgilendirmesi gibi ek kavramlar)"""


FACT_JUDGE_SYSTEM = """Sen iki Türkçe metni okuyan bilgi denetçisisin.
Sana ASIL mesajdan çıkarılmış olgular ve PLATFORM metni verilir.
Her olgu için platformda aynı bilgi (aynı anlam / eşdeğer ifade) DURUYOR mu net karar ver.

Kurallar:
- Kelimesi kelimesine olmak zorunda değil; anlam korunuyorsa present=true.
- "Valilik" ↔ "il valiliği" / "valilik ile" → true.
- "deprem bilgilendirme hattı" ↔ "bilgilendirme hattı" (deprem bağlamında) → true.
- "yönlendirme paneli" ↔ "yönlendirme paneli sistemi" → true.
- "bugün" yalnızca bugün/bugünden/bugün itibarıyla → true; dün/yarın → false.
- "geçen salı" yalnızca salı/geçen salı eşdeğeri → true.
- Kararsız kalma; her olgu için zorunlu true/false.
- SADECE JSON: {"decisions":[{"value":"Valilik","present":true,"note":"geçiyor"}]}
Markdown/yorum YASAK."""


def resolve_active_llm() -> Tuple[str, str, str, str, str]:
    """
    Returns: (mode, provider, api_key, base_url, model_name)
    LLM_API_KEY öncelikli; base_url'e göre provider otomatik belirlenir.
    """
    api_key = (
        os.getenv("LLM_API_KEY")
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("GOOGLE_GENAI_API_KEY")
        or os.getenv("GEMINI_KEY")
        or os.getenv("API_KEY")
        or os.getenv("GROQ_API_KEY")
        or ""
    ).strip().strip('"').strip("'")
    base_url = (os.getenv("EXTERNAL_LLM_BASE_URL") or "https://generativelanguage.googleapis.com/v1beta/openai/").strip().strip('"').strip("'")
    model = (os.getenv("EXTERNAL_LLM_MODEL_NAME") or "gemini-1.5-flash").strip().strip('"').strip("'")
    # Provider otomatik tespit
    if "googleapis.com" in base_url:
        provider = "gemini"
    elif "groq.com" in base_url:
        provider = "groq"
    elif "iletisim.gov.tr" in base_url:
        provider = "iletisim-kurumsal"
    else:
        provider = "openai-compatible"
    return "external", provider, api_key, base_url, model


class LLMMessageTransformerService(LLMServiceInterface):
    """Clean Architecture Infrastructure Katmanı LLM Servis İmplementasyonu."""

    def __init__(self, api_key: str = None, base_url: str = None, model_name: str = None):
        mode, provider, env_key, env_base, env_model = resolve_active_llm()
        self.mode = mode
        self.provider = provider
        self.api_key = api_key or env_key
        self.base_url = base_url or env_base
        self.model_name = model_name or env_model

        http_client = httpx.AsyncClient(verify=True, timeout=120.0)
        self.client = AsyncOpenAI(
            api_key=self.api_key or "missing-key",
            base_url=self.base_url,
            http_client=http_client,
        )
        self._cooldown_until = 0.0  # TPD/kota dolunca API'yi zorlamayı bırak
        print(
            f"[LLM] mode={self.mode} provider={self.provider} "
            f"model={self.model_name} key={'var' if bool(self.api_key) else 'YOK'}"
        )

    def _in_cooldown(self) -> bool:
        return time.time() < self._cooldown_until

    def _trip_cooldown(self, err_str: str) -> bool:
        """Her 429'da True: UI kilitlenmesin diye hemen yerel şablona geç."""
        wait_s = self._parse_retry_seconds(err_str)
        # En az 60 sn API'yi zorlama; UI anında sonuç görsün
        self._cooldown_until = time.time() + max(60.0, min(wait_s, 180.0))
        print(f"[LLM] 429 — fallback moda geçildi (cooldown {self._cooldown_until - time.time():.0f}s).")
        return True

    @staticmethod
    def _parse_retry_seconds(err_str: str) -> float:
        """Groq 429 mesajından bekleme süresini çeker."""
        m = re.search(r"try again in ([\d.]+)m([\d.]+)s", err_str, re.I)
        if m:
            return float(m.group(1)) * 60 + float(m.group(2))
        m = re.search(r"try again in ([\d.]+)s", err_str, re.I)
        if m:
            return float(m.group(1))
        return 8.0

    async def _chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1200) -> str:
        response = await self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model=self.model_name,
            temperature=0.1,
            top_p=0.9,
            max_tokens=max_tokens,
        )
        raw = (response.choices[0].message.content or "").strip()
        # Reasoning modelleri (qwen vb.) <think>...</think> blokları döndürebilir — temizle
        raw = re.sub(r"(?s)<think>.*?</think>", "", raw).strip()
        return raw

    def _normalize_fact_label(self, label: str) -> str:
        label = str(label or "").strip().upper()
        return {
            "PERSON": "PER",
            "GPE": "LOC",
            "TIME": "DATE",
            "CONCEPT": "MISC",
            "ORGANIZATION": "ORG",
        }.get(label, label)

    def _parse_entity_items(self, items, limit: int = 18) -> List[Tuple[str, str]]:
        allowed = {"PER", "ORG", "LOC", "DATE", "MISC", "EVENT"}
        false_singles = {
            "yeni", "eski", "geçen", "gecen", "önümüzdeki", "ilgili", "resmi",
            "bu", "şu", "o", "genel", "özel", "iletişim", "iletisim", "ekip", "birim",
        }
        out: List[Tuple[str, str]] = []
        seen = set()
        for item in (items or [])[:limit]:
            if not isinstance(item, dict):
                continue
            label = self._normalize_fact_label(item.get("label"))
            value = re.sub(r"\s+", " ", str(item.get("value") or "").strip())
            if label not in allowed or not value or len(value) < 2:
                continue
            low = value.lower()
            if low in false_singles and len(value.split()) == 1:
                continue
            if label == "PER" and len(value.split()) == 1:
                continue
            key = (label, low)
            if key in seen:
                continue
            seen.add(key)
            out.append((label, value))
        return out

    async def extract_core_facts(self, content: str) -> List[Tuple[str, str]]:
        """
        Asıl mesajdan bütüncül olgular çıkarır (PER/ORG/LOC/DATE/MISC/EVENT).
        Kota/hata durumunda [] döner → analiz kural tabanlı NER'e düşer.
        """
        raw = (content or "").strip()
        if not raw or not self.api_key or self._in_cooldown():
            return []

        try:
            text = await asyncio.wait_for(
                self._chat(
                    FACT_EXTRACT_SYSTEM,
                    (
                        "Aşağıdaki ASIL mesajdaki tüm önemli kurum/kişi/yer/zaman/kavram/olay olgularını çıkar.\n"
                        "Eksik bırakma; 6–14 arası hedefle.\n\n"
                        f"ASIL MESAJ:\n{raw[:3000]}\n\nJSON üret."
                    ),
                    max_tokens=1000,
                ),
                timeout=60.0,
            )
            data = self._extract_json_object(text) or {}
            items = data.get("entities") if isinstance(data, dict) else None
            if not isinstance(items, list):
                return []
            out = self._parse_entity_items(items, limit=18)
            if out:
                print(f"[LLM] fact-extract: {len(out)} olgu ({self.provider})")
            return out
        except Exception as e:
            err = str(e).lower()
            if "429" in err or "rate" in err or "401" in err or "invalid_api_key" in err:
                self._trip_cooldown(str(e))
            print(f"[LLM] fact-extract atlandı: {e}")
            return []

    async def judge_facts_presence(
        self,
        facts: List[Tuple[str, str]],
        platform_text: str,
    ) -> Optional[Dict[str, bool]]:
        """
        Asıl olgular × platform metni → her olgu için present true/false.
        Hata/kota → None (kural eşleşmesine düşülür).
        """
        if not facts or not (platform_text or "").strip():
            return None
        if not self.api_key or self._in_cooldown():
            return None

        fact_lines = [
            {"label": lab, "value": val}
            for lab, val in facts[:18]
        ]
        try:
            text = await asyncio.wait_for(
                self._chat(
                    FACT_JUDGE_SYSTEM,
                    (
                        "OLGULAR (asıl mesajdan):\n"
                        f"{json.dumps(fact_lines, ensure_ascii=False)}\n\n"
                        "PLATFORM METNİ:\n"
                        f"{(platform_text or '')[:3500]}\n\n"
                        "Her olgu için present kararı ver; JSON üret."
                    ),
                    max_tokens=900,
                ),
                timeout=60.0,
            )
            data = self._extract_json_object(text) or {}
            decisions = data.get("decisions") if isinstance(data, dict) else None
            if not isinstance(decisions, list):
                return None
            out: Dict[str, bool] = {}
            for d in decisions:
                if not isinstance(d, dict):
                    continue
                val = re.sub(r"\s+", " ", str(d.get("value") or "").strip()).lower()
                if not val:
                    continue
                present = d.get("present")
                if isinstance(present, bool):
                    out[val] = present
                elif str(present).strip().lower() in ("true", "1", "evet", "yes"):
                    out[val] = True
                elif str(present).strip().lower() in ("false", "0", "hayır", "hayir", "no"):
                    out[val] = False
            # Eksik kalan olguları anahtar olarak eşle (küçük farklar)
            if not out:
                return None
            # Canonical: gelen value ile facts value eşleştir
            mapped: Dict[str, bool] = {}
            for _, fval in facts:
                key = fval.lower().strip()
                if key in out:
                    mapped[key] = out[key]
                    continue
                # kısmi eşleşme
                hit = next((v for k, v in out.items() if k in key or key in k), None)
                if hit is not None:
                    mapped[key] = hit
            print(f"[LLM] fact-judge: {len(mapped)}/{len(facts)} karar ({self.provider})")
            return mapped or None
        except Exception as e:
            err = str(e).lower()
            if "429" in err or "rate" in err or "401" in err or "invalid_api_key" in err:
                self._trip_cooldown(str(e))
            print(f"[LLM] fact-judge atlandı: {e}")
            return None

    async def judge_facts_batch(
        self,
        facts: List[Tuple[str, str]],
        platforms: List[Tuple[str, str]],
    ) -> Dict[str, Dict[str, bool]]:
        """
        Birden fazla platform için AI var/yok kararı.
        Önce tek toplu çağrı; olmazsa platform başına (max 3 paralel).
        """
        if not facts or not platforms:
            return {}
        if not self.api_key or self._in_cooldown():
            return {}

        fact_lines = [{"label": lab, "value": val} for lab, val in facts[:18]]
        plat_payload = {
            pid: (txt or "")[:1800]
            for pid, txt in platforms
            if (txt or "").strip()
        }
        if not plat_payload:
            return {}

        # 1) Tek istekte tüm platformlar
        try:
            text = await asyncio.wait_for(
                self._chat(
                    FACT_JUDGE_SYSTEM
                    + "\n\nBirden fazla platform verildiğinde çıktı formatı:\n"
                    '{"platforms":{"x_twitter":[{"value":"...","present":true}],"press_release":[...]}}',
                    (
                        "OLGULAR:\n"
                        f"{json.dumps(fact_lines, ensure_ascii=False)}\n\n"
                        "PLATFORMLAR (id → metin):\n"
                        f"{json.dumps(plat_payload, ensure_ascii=False)}\n\n"
                        "Her platform × her olgu için present kararı ver."
                    ),
                    max_tokens=2200,
                ),
                timeout=90.0,
            )
            data = self._extract_json_object(text) or {}
            plats = data.get("platforms") if isinstance(data, dict) else None
            if isinstance(plats, dict) and plats:
                out: Dict[str, Dict[str, bool]] = {}
                for pid, decisions in plats.items():
                    if not isinstance(decisions, list):
                        continue
                    mapped: Dict[str, bool] = {}
                    raw: Dict[str, bool] = {}
                    for d in decisions:
                        if not isinstance(d, dict):
                            continue
                        val = re.sub(r"\s+", " ", str(d.get("value") or "").strip()).lower()
                        present = d.get("present")
                        if not val:
                            continue
                        if isinstance(present, bool):
                            raw[val] = present
                        elif str(present).strip().lower() in ("true", "1", "evet", "yes"):
                            raw[val] = True
                        elif str(present).strip().lower() in ("false", "0", "hayır", "hayir", "no"):
                            raw[val] = False
                    for _, fval in facts:
                        key = fval.lower().strip()
                        if key in raw:
                            mapped[key] = raw[key]
                        else:
                            hit = next((v for k, v in raw.items() if k in key or key in k), None)
                            if hit is not None:
                                mapped[key] = hit
                    if mapped:
                        out[str(pid)] = mapped
                if out:
                    print(f"[LLM] fact-judge-batch: {len(out)} platform ({self.provider})")
                    return out
        except Exception as e:
            err = str(e).lower()
            if "429" in err or "rate" in err or "401" in err or "invalid_api_key" in err:
                self._trip_cooldown(str(e))
                return {}
            print(f"[LLM] fact-judge-batch tek çağrı başarısız, tekil deneniyor: {e}")

        # 2) Yedek: platform başına (en fazla 3 paralel)
        sem = asyncio.Semaphore(3)

        async def _one(pid: str, txt: str):
            async with sem:
                decided = await self.judge_facts_presence(facts, txt)
                return pid, decided

        tasks = [_one(pid, txt) for pid, txt in plat_payload.items()]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        out2: Dict[str, Dict[str, bool]] = {}
        for r in results:
            if isinstance(r, Exception):
                continue
            pid, decided = r
            if decided:
                out2[pid] = decided
        return out2

    async def proofread_core_message(self, content: str) -> str:
        """Çekirdek mesajın yazım/noktalama hatalarını düzeltir; anlamı değiştirmez."""
        raw = (content or "").strip()
        if not raw:
            return raw

        try:
            max_tokens = min(1200, max(400, len(raw) + 200))
            corrected = await self._chat(
                CORE_PROOFREAD_PROMPT,
                (
                    "Aşağıdaki çekirdek mesajın TÜM cümlelerini koruyarak yalnızca yazım/noktalama düzelt.\n"
                    "Cümle silme, özetleme, kısaltma YASAK.\n"
                    "Çıktına 'Düzenlenmiş metin:' / 'Düzeltilmiş metin:' gibi etiket YAZMA; sadece düzeltilmiş metni ver.\n\n"
                    f"ÇEKİRDEK MESAJ:\n{raw}"
                ),
                max_tokens=max_tokens,
            )
            corrected = self._clean_proofread_output(corrected)
            if not self._is_safe_proofread(raw, corrected):
                print("[LLM] Proofread reddedildi (kisaltma/bozulma). Orijinal korunuyor.")
                return raw
            return corrected
        except Exception as e:
            err = str(e)
            if "429" in err:
                wait_s = self._parse_retry_seconds(err)
                print(f"[LLM] Proofread 429, {wait_s:.0f}s bekleniyor...")
                await asyncio.sleep(wait_s)
                try:
                    corrected = await self._chat(
                        CORE_PROOFREAD_PROMPT,
                        f"ÇEKİRDEK MESAJ:\n{raw}",
                        max_tokens=min(1200, max(400, len(raw) + 200)),
                    )
                    corrected = self._clean_proofread_output(corrected)
                    if self._is_safe_proofread(raw, corrected):
                        return corrected
                except Exception:
                    pass
            print(f"[LLM UYARI] Core yazim duzeltme hatasi: {e}. Orijinal metin kullanilacak.")
            return raw

    def _clean_proofread_output(self, text: str) -> str:
        if not text:
            return ""
        text = re.sub(r"(?is)<think>.*?</think>", "", text)
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text.strip())
        text = re.sub(r"\n?```$", "", text.strip())

        # LLM'in eklediği etiketleri soy — core kutusuna yalnızca düz metin gitsin
        # (satır başı veya metin içi; "Sistem" kelimesini bölen "İşte" kullanılmaz)
        label_re = re.compile(
            r"(?im)^\s*(?:[*_`]*)?(?:"
            r"d[uü]zenlenmi[sş]\s+metin|"
            r"d[uü]zeltilmi[sş]\s+metin|"
            r"d[uü]zeltilmi[sş]\s+h[aâ]li|"
            r"d[uü]zenlenmi[sş]\s+h[aâ]li|"
            r"corrected\s+text|"
            r"proofread(?:ed)?\s+text|"
            r"sonu[cç]"
            r")\s*[:：\-–]?\s*",
        )
        text = label_re.sub("", text, count=1)

        # Hâlâ "etiket: içerik" tek satırsa içeriği al
        m = re.match(
            r"(?is)^\s*(?:d[uü]zenlenmi[sş]|d[uü]zeltilmi[sş])\s+(?:metin|h[aâ]li)\s*[:：]\s*(.+)$",
            text.strip(),
        )
        if m:
            text = m.group(1)

        return text.strip().strip('"').strip("'").strip("`").strip()

    def _is_safe_proofread(self, original: str, corrected: str) -> bool:
        if not corrected or len(corrected) < 3:
            return False
        o_len, c_len = len(original.strip()), len(corrected.strip())
        if o_len == 0:
            return True
        # Aşırı kısalma = bozulma
        if c_len < o_len * 0.55:
            return False
        o_words = len(original.split())
        c_words = len(corrected.split())
        if o_words >= 8 and c_words < o_words * 0.55:
            return False
        return True

    _COLLOQUIAL_MARKERS = (
        "bizim çocuk", "bizim cocuk", "şak diye", "sak diye",
        "dün akşamüstü", "dun aksam", "geçen gün bizim",
        "hallettiler", "arizayi", "bitirdik", "başlattığımız",
        "baslattigimiz", "kurduğumuz", "kurdugumuz", "hafifletiyoruz",
        "beklemeyecek", "direkt ", " düşürüyor", "dusuruyor",
        "işini bugün", "isini bugun", "bayağı", "bayagi",
        "artık vatandaş", "artik vatandas", "okuyup direkt",
    )

    def _has_colloquial_residue(self, text: str) -> bool:
        low = (text or "").lower()
        return any(m in low for m in self._COLLOQUIAL_MARKERS)

    def _is_lazy_copy(self, core: str, output: str) -> bool:
        """Ham core yapıştırması / laubali kalıntı / yüksek cümle örtüşmesi."""
        core_norm = re.sub(r"\s+", " ", (core or "").strip().lower())
        out_norm = re.sub(r"\s+", " ", (output or "").strip().lower())
        if not out_norm or not core_norm:
            return True
        if out_norm == core_norm:
            return True
        if out_norm.startswith(core_norm) and len(out_norm) <= len(core_norm) + 15:
            return True
        if self._has_colloquial_residue(out_norm):
            return True
        # Core cümlelerinden yeterince uzun olanlar çıktıda geçiyorsa → kopya
        for sent in re.split(r"[.!?]+", core_norm):
            s = sent.strip()
            if len(s) >= 35 and s in out_norm:
                return True
        # 8-gram örtüşme
        c_tokens = [t for t in re.findall(r"[a-zçğıöşü0-9]+", core_norm) if len(t) > 2]
        if len(c_tokens) >= 10:
            hits = 0
            total = 0
            for i in range(0, len(c_tokens) - 7):
                gram = " ".join(c_tokens[i : i + 8])
                total += 1
                if gram in out_norm:
                    hits += 1
            if total and hits / total >= 0.25:
                return True
        return False

    def _compose_institutional_rewrite(self, content: str) -> Dict[str, str]:
        """
        Ham notu ASLA yapıştırmadan; olgulardan resmi bürokratik metin üretir.
        Fallback ve lazy-copy kurtarma yolu buradan beslenir.
        """
        raw = (content or "").strip()
        # Türkçe İ/I: önce büyük İ→i, sonra lower (aksi halde 'İ'.lower() = 'i̇' olur)
        low = (
            raw.replace("İ", "i")
            .replace("I", "i")
            .replace("ı", "i")
            .replace("Ş", "s")
            .replace("ş", "s")
            .replace("Ğ", "g")
            .replace("ğ", "g")
            .replace("Ü", "u")
            .replace("ü", "u")
            .replace("Ö", "o")
            .replace("ö", "o")
            .replace("Ç", "c")
            .replace("ç", "c")
            .lower()
        )

        has_cimer = re.search(r"c[iıİ]mer", raw, re.I) is not None
        has_ai = any(x in low for x in ("yapay zeka", "algoritma", "entegrasyon"))
        has_complaint = any(x in low for x in ("sikayet", "dilekce", "basvuru"))
        has_done = any(x in low for x in ("bitirdik", "tamamla", "bugun itibar", "bugun itibariyle"))
        has_speed = any(x in low for x in ("saniye", "gunlerce", "beklemeyecek", "direkt", "dusur", "dakika"))
        has_fault = "ariza" in low
        has_school = any(x in low for x in ("okul", "tatil", "ogrenci"))
        has_iletisim = "iletisim baskanlig" in low
        has_kriz = any(
            x in low
            for x in (
                "kriz masasi",
                "dijital kriz",
                "asilisiz haber",
                "asilsiz haber",
                "asilsiz paylasim",
                "asilisiz paylasim",
                "takip paneli",
                "yonlendirme paneli",
            )
        )
        has_valilik = "valilik" in low
        has_afad = "afad" in low
        has_deprem = "deprem" in low or "bilgilendirme hatti" in low or "bilgilendirme hatt" in low
        has_last_week = "gecen hafta" in low or "gecmis hafta" in low
        has_last_tue = "gecen sali" in low or "gecmis sali" in low

        if has_deprem or has_afad or (has_valilik and (has_kriz or has_speed)):
            title = "Deprem Bilgilendirme Hattı ve Yönlendirme Panelinin Devreye Alınması Hk."
            when = (
                "Geçtiğimiz salı"
                if has_last_tue
                else ("Geçtiğimiz hafta" if has_last_week else "Yakın dönemde")
            )
            s1 = (
                f"{when} Valilik koordinasyonunda başlatılan deprem bilgilendirme hattı çalışmaları "
                "bugün itibarıyla tamamlanmış ve uygulamaya alınmıştır."
            )
            s2 = (
                "Devreye alınan yönlendirme paneli sayesinde asılsız paylaşımlar dakikalar içinde "
                "tespit edilerek ilgili birimlerin ekranına yönlendirilmektedir."
            )
            if has_afad:
                s3 = (
                    "Böylelikle kamuoyu bilgilendirmesi hızlandırılmış; yarın AFAD ve yerel basınla "
                    "ortak basın notu çalışmalarının koordinasyonu sürdürülecektir. "
                    "Süreç İletişim Başkanlığı tarafından yakından takip edilmektedir."
                    if has_iletisim
                    else (
                        "Böylelikle kamuoyu bilgilendirmesi hızlandırılmış; yarın AFAD ve yerel basınla "
                        "ortak basın notu çalışmalarının koordinasyonu sürdürülecektir."
                    )
                )
            else:
                s3 = (
                    "Böylelikle kamuoyu bilgilendirmesi hızlandırılmış; "
                    "valiliklerle ortak bilgilendirme koordinasyonu güçlendirilmiştir."
                )
            bullet1 = "Deprem bilgilendirme hattı uygulamaya alınmıştır"
            bullet2 = "Yönlendirme paneli asılsız paylaşımları dakikalar içinde yakalamaktadır"
            bullet3 = (
                "AFAD ve yerel basınla ortak basın notu koordinasyonu sürdürülmektedir"
                if has_afad
                else "Resmi kanallar üzerinden kamuoyu bilgilendirilmektedir"
            )
        elif has_kriz or (has_iletisim and (has_speed or has_done)):
            title = "Dijital Kriz Masası ve Takip Panelinin Devreye Alınması Hk."
            when = "Geçtiğimiz hafta" if has_last_week else "Yakın dönemde"
            s1 = (
                f"{when} İletişim Başkanlığı bünyesinde başlatılan dijital kriz masası çalışmaları "
                "bugün itibarıyla tamamlanmış ve uygulamaya alınmıştır."
            )
            s2 = (
                "Devreye alınan takip paneli sayesinde sahadan gelen asılsız haber ve şüpheli paylaşımlar "
                "dakikalar içinde tespit edilerek ilgili birimlerin ekranına yönlendirilmektedir."
            )
            if has_valilik:
                s3 = (
                    "Böylelikle kamuoyu bilgilendirmesi hızlandırılmış; "
                    "yarın valiliklerle ortak basın notu çalışmalarının koordinasyonu sürdürülecektir."
                )
            else:
                s3 = (
                    "Böylelikle kamuoyu bilgilendirmesi hızlandırılmış; "
                    "kurumsal kapasite ve resmi iletişim süreçleri güçlendirilmiştir."
                )
            bullet1 = "İletişim Başkanlığı dijital kriz masası uygulamaya alınmıştır"
            bullet2 = "Takip paneli şüpheli paylaşımları dakikalar içinde yakalamaktadır"
            bullet3 = (
                "Valiliklerle ortak basın notu koordinasyonu sürdürülmektedir"
                if has_valilik
                else "Resmi bilgilendirme kanalları üzerinden kamuoyu bilgilendirilmektedir"
            )
        elif has_cimer and (has_ai or has_complaint or has_speed):
            title = "CİMER Yapay Zekâ Entegrasyonunun Tamamlanması Hk."
            s1 = (
                "Geçtiğimiz ay başlatılan CİMER yapay zekâ entegrasyonu çalışmaları "
                "bugün itibarıyla tamamlanmıştır."
            )
            s2 = (
                "Devreye alınan sistem sayesinde vatandaşlarca iletilen şikâyet ve dilekçeler "
                "saniyeler içinde analiz edilerek ilgili bakanlık birimlerinin ekranına yönlendirilmektedir."
            )
            s3 = (
                "Böylelikle başvuruların uzun süre bekletilmesinin önüne geçilmiş; "
                "kurumsal iş yükünün azaltılması ve kamu hizmetinin daha etkin sunulması sağlanmıştır."
            )
            bullet1 = "CİMER başvurularında yapay zekâ destekli yönlendirme devreye alınmıştır"
            bullet2 = "Başvuru iletim süresi günlerden saniyelere indirilmiştir"
            bullet3 = "İlgili bakanlık birimleriyle anlık veri aktarımı sağlanmıştır"
        elif has_fault:
            title = "Teknik Arızanın Giderilmesine İlişkin Bilgilendirme"
            s1 = "İlgili birimlerimizce tespit edilen teknik arıza hızlı ve etkin biçimde giderilmiştir."
            s2 = "Süreç boyunca gerekli idari ve teknik tedbirler alınmış; hizmet sürekliliği esasıyla hareket edilmiştir."
            s3 = "Gelişmeler ilgili birimlerce takip edilmekte olup kamuoyu bilgilendirmesi sürdürülecektir."
            bullet1, bullet2, bullet3 = s1, s2, "Resmi kanallardan bilgilendirme yapılacaktır"
        elif has_school:
            title = "Eğitim-Öğretim Sürecine İlişkin Bilgilendirme"
            s1 = "Eğitim-öğretim sürecine ilişkin alınan karar kamuoyuna duyurulmaktadır."
            s2 = "Uygulama, ilgili kurumların koordinasyonunda planlı biçimde yürütülecektir."
            s3 = "Vatandaşlarımızın yalnızca resmi kaynaklardan yapılan açıklamaları dikkate alması önem arz etmektedir."
            bullet1, bullet2, bullet3 = s1, s2, s3
        else:
            # Genel ama YİNE rewrite: 1. şahıs / laubali kalıpları pasif bürokrasiye çevir
            title = "Kamuoyunu İlgilendiren Resmi Bilgilendirme"
            if has_done and has_ai:
                s1 = "Yürütülen dijital dönüşüm ve sistem entegrasyonu çalışmaları bugün itibarıyla tamamlanmıştır."
            elif has_done:
                s1 = "İlgili birimlerimizce yürütülen çalışmalar bugün itibarıyla tamamlanmış ve uygulamaya alınmıştır."
            else:
                s1 = "İlgili birimlerimizce yürütülen çalışmalar kapsamında önemli bir gelişme kaydedilmiştir."
            if has_complaint or has_speed:
                s2 = (
                    "Vatandaş başvurularının ilgili birimlere süratle iletilmesi amacıyla "
                    "yeni sistem altyapısı devreye alınmıştır."
                )
            else:
                s2 = "Süreç, ilgili kurumların koordinasyonunda planlı ve şeffaf biçimde yönetilmektedir."
            s3 = (
                "Bu çerçevede kurumsal kapasitenin güçlendirilmesi hedeflenmiş; "
                "kamuoyu bilgilendirmesi resmi kanallar üzerinden sürdürülecektir."
            )
            bullet1 = "Süreç ilgili birimler koordinasyonunda yürütülmektedir"
            bullet2 = "Uygulama takvimi planlı biçimde ilerletilmektedir"
            bullet3 = "Resmi bilgilendirme kanalları açık tutulmaktadır"

        body = f"{s1} {s2} {s3}"
        return {
            "title": title,
            "lead": s1,
            "rest": f"{s2} {s3}",
            "body": body,
            "hook": s1,
            "bullet1": bullet1,
            "bullet2": bullet2,
            "bullet3": bullet3,
            "s1": s1,
            "s2": s2,
            "s3": s3,
        }

    def _rewrite_parts(self, content: str) -> Dict[str, str]:
        """Ham notu resmi parçalara çevirir; core cümleleri ASLA taşınmaz."""
        return self._compose_institutional_rewrite(content)

    def _has_template_leak(self, text: str) -> bool:
        """Modelin prompt iskeletini olduğu gibi yapıştırmasını yakalar."""
        low = (text or "").lower()
        leaks = (
            "kanca cümlesi",
            "tek cümlelik vurucu",
            "(kısa, resmi",
            "(haber diliyle",
            "görsel: (...)",
            "yazı: (...)",
            "ses: (...)",
            "#hashtag1",
            "hashtag1",
            "en önemli 1. detay",
            "stratejik madde 1",
            "dağıtım yerlerine\n\n(olayın",
            "valı a.",
            "vali a.",
        )
        return any(x in low for x in leaks)

    def _matches_channel_format(self, channel: ChannelType, text: str) -> bool:
        """Prompt iskeletindeki zorunlu işaretlerin varlığını kontrol eder."""
        t = text or ""
        if self._has_template_leak(t):
            return False
        checks = {
            ChannelType.PRESS_RELEASE: (
                "T.C. İLETİŞİM BAŞKANLIĞI" in t
                and "BASIN AÇIKLAMASI" in t
                and "BAŞLIK" in t
                and "Kamuoyuna saygıyla duyurulur" in t
            ),
            ChannelType.AGENCY_NEWS: (
                "FLAŞ" in t and "BAŞLIK" in t and re.search(r"ANKARA\s*-", t) is not None
            ),
            ChannelType.TABLOID: ("BAŞLIK" in t and "SPOT" in t),
            ChannelType.X_TWITTER: (
                "🚨" in t and "📌" in t and "📋" in t and "#" in t
            ),
            ChannelType.LINKEDIN: (
                "Öne Çıkan Başlıklar" in t and "#" in t
            ),
            ChannelType.VERTICAL_VIDEO: (
                "VİDEO BAŞLIĞI" in t
                and "SAHNE 1" in t
                and "SAHNE 2" in t
                and "SAHNE 3" in t
                and "SAHNE 4" in t
                and "GÖRSEL:" in t
                and "SES:" in t
            ),
            ChannelType.MESSAGING_CHAIN: (
                "ÖNEMLİ BİLGİLENDİRME" in t
                and "Merhaba" in t
                and "📌 Konu:" in t
                and "Bilmeniz Gerekenler" in t
            ),
            ChannelType.OFFICIAL_LETTER: (
                "T.C." in t
                and "DAĞITIM YERLERİNE" in t
                and re.search(r"Sayı\s*:", t) is not None
                and re.search(r"Konu\s*:", t) is not None
                and "arz/rica" in t.lower()
            ),
        }
        return checks.get(channel, True)

    async def transform_to_channel(self, message: CoreMessage, channel: ChannelType) -> TransformedMessage:
        """Çekirdek mesajı tek bir mecraya dönüştürür."""
        hedef = CHANNEL_NAMES.get(channel, channel.value)
        channel_format = CHANNEL_PROMPTS.get(channel, "")

        system_prompt = f"""Sen T.C. İletişim Başkanlığı bünyesinde çalışan üst düzey bir kurumsal iletişim uzmanısın.
KURAL 1: Kullanıcı ham metnini KESİNLİKLE birebir kopyalama.
KURAL 2: Laubali/amiyane ifadeleri sil; resmi bürokratik dil kullan.
KURAL 3: Aşağıdaki mecra format iskeletine BİREBİR uy; metni BAŞTAN YAZ (rewrite).
KURAL 4: Rastgele Vali/Müdür/imza uydurma.
KURAL 5: %100 Türkçe. Yanıtına `[FINAL_RESULT_START]` ile başla; başka meta yazma.

# HEDEF MECRA FORMATI (BİREBİR UYGULA)
{channel_format}
"""
        user_prompt = (
            f"Hedef Mecra: {hedef}\n\n"
            f"Aşağıdaki ham bilgi notunu İNCELE. Asla birebir kopyalama.\n"
            f"T.C. devlet kurumu ciddiyetiyle ve yukarıdaki format iskeletine birebir uyarak BAŞTAN YAZ:\n\n"
            f"{message.content}"
        )

        if self._in_cooldown():
            transformed_text = self._generate_fallback_content(message.content, channel)
        else:
            try:
                transformed_text = await self._chat(system_prompt, user_prompt, max_tokens=1100)
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "invalid_api_key" in err_str.lower() or "401" in err_str:
                    self._trip_cooldown(err_str)
                print(f"[LLM UYARI] {channel.value} → yerel şablon: {err_str[:140]}")
                transformed_text = self._generate_fallback_content(message.content, channel)

        transformed_text = self._clean_llm_output(transformed_text, channel)

        if channel == ChannelType.OFFICIAL_LETTER:
            transformed_text = self._clean_official_letter_placeholders(transformed_text, message.content)

        if (
            not transformed_text
            or transformed_text.startswith("LLM Hatası:")
            or len(transformed_text) < 10
            or self._is_lazy_copy(message.content, transformed_text)
            or self._has_template_leak(transformed_text)
            or not self._matches_channel_format(channel, transformed_text)
        ):
            reason = "format/kopya/sablon-sizinti"
            print(f"[LLM] {channel.value}: {reason} → yerel prompt-uyumlu şablon")
            transformed_text = self._generate_fallback_content(message.content, channel)

        return TransformedMessage(
            channel=channel,
            original_content=message.content,
            transformed_content=transformed_text,
        )

    def _extract_json_object(self, text: str) -> Optional[dict]:
        if not text:
            return None
        # Reasoning modelleri (qwen vb.) <think>...</think> blokları döndürebilir — temizle
        text = re.sub(r"(?s)<think>.*?</think>", "", text).strip()
        text = re.sub(r"(?is)```(?:json)?\s*", "", text).replace("```", "").strip()
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            try:
                data = json.loads(text[start : end + 1])
                if isinstance(data, dict):
                    return data
            except json.JSONDecodeError:
                return None
        return None

    async def _transform_all_batched(self, message: CoreMessage) -> Optional[Dict[ChannelType, str]]:
        """Tek LLM çağrısıyla 8 mecrayı üretir (kota dostu)."""
        user_prompt = (
            "Aşağıdaki ham bilgi notunu 8 farklı mecraya BAŞTAN YAZ. "
            "Hiçbir mecrada ham metni yapıştırma.\n\n"
            f"HAM BİLGİ NOTU:\n{message.content}\n\n"
            "Beklenen JSON anahtarları: "
            "press_release, agency_news, tabloid, x_twitter, linkedin, "
            "vertical_video, messaging_chain, official_letter"
        )
        if self._in_cooldown():
            return None

        try:
            raw = await asyncio.wait_for(
                self._chat(BATCH_TRANSFORM_SYSTEM, user_prompt, max_tokens=6000),
                timeout=120.0,
            )
        except asyncio.TimeoutError:
            print("[LLM UYARI] Batch zaman aşımı → yerel şablonlar")
            return None
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "invalid_api_key" in err_str.lower() or "401" in err_str:
                self._trip_cooldown(err_str)
            print(f"[LLM UYARI] Batch hata → yerel şablonlar: {err_str[:160]}")
            return None

        data = self._extract_json_object(raw)
        if not data:
            print("[LLM UYARI] Batch JSON parse edilemedi.")
            return None

        result: Dict[ChannelType, str] = {}
        for ch in ChannelType:
            val = data.get(ch.value)
            if isinstance(val, str) and len(val.strip()) >= 10:
                cleaned = self._clean_llm_output(val.strip(), ch)
                if ch == ChannelType.OFFICIAL_LETTER:
                    cleaned = self._clean_official_letter_placeholders(cleaned, message.content)
                if self._is_lazy_copy(message.content, cleaned):
                    continue
                if not self._matches_channel_format(ch, cleaned):
                    continue
                result[ch] = cleaned
        return result if len(result) >= 4 else None

    def _clean_llm_output(self, text: str, channel: ChannelType) -> str:
        if not text:
            return ""

        text = re.sub(r"(?is)<think>.*?</think>", "", text)
        text = re.sub(r"(?is)<thought>.*?</thought>", "", text)

        split_pattern = r"(?i)\*?\*?\[?\s*FINAL_RESULT_START\s*\]?\*?\*?"
        if re.search(split_pattern, text):
            text = re.split(split_pattern, text)[-1]
        elif "---BAŞLANGIÇ---" in text:
            text = text.split("---BAŞLANGIÇ---")[-1]

        text = re.sub(r"^['\",\s]+", "", text)

        channel_start_markers = {
            ChannelType.PRESS_RELEASE: ["T.C. İLETİŞİM BAŞKANLIĞI", "BASIN AÇIKLAMASI", "BAŞLIK"],
            ChannelType.OFFICIAL_LETTER: ["T.C.", "DAĞITIM YERLERİNE", "Sayı :", "Konu :", "Sayı  :"],
            ChannelType.AGENCY_NEWS: ["FLAŞ", "ANKARA -", "HABER:"],
            ChannelType.X_TWITTER: ["🚨", "📌", "📌 ÖZET"],
            ChannelType.LINKEDIN: ["Öne Çıkan Başlıklar", "Kurumsal bilgilendirme"],
            ChannelType.VERTICAL_VIDEO: ["VİDEO BAŞLIĞI", "SAHNE 1", "🎬"],
            ChannelType.MESSAGING_CHAIN: ["⚠️ ÖNEMLİ BİLGİLENDİRME", "ÖNEMLİ BİLGİLENDİRME", "Merhaba,"],
            ChannelType.TABLOID: ["BAŞLIK", "SPOT"],
            ChannelType.X_TWITTER: ["🚨", "📌 ÖZET", "📋 DETAYLAR"],
        }

        for marker in channel_start_markers.get(channel, []):
            idx = text.find(marker)
            if idx != -1:
                text = text[idx:]
                break

        english_reasoning_keywords = [
            "critical constraint", "analyze the core", "drafting the content",
            "word count check", "fact check", "let me think", "here is the",
            "first, i need", "step 1:", "step 2:", "word count", "selection:",
        ]
        clean_lines = []
        for line in text.split("\n"):
            line_lower = line.strip().lower()
            if any(kw in line_lower for kw in english_reasoning_keywords):
                continue
            clean_lines.append(line)

        text = "\n".join(clean_lines)
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text.strip())
        text = re.sub(r"\n?```$", "", text.strip())
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Proofread etiketinin mecra metnine sızmasını engelle
        text = re.sub(
            r"(?i)(?:düzenlenmiş|duzenlenmis|düzeltilmiş|duzeltilmis)\s+(?:metin|hali|hâli)\s*[:：\-–]\s*",
            "",
            text,
        )
        return text.strip()

    @staticmethod
    def _mid_sentence(text: str) -> str:
        """Cümle ortasına gömülürken ilk harfi küçült (CİMER/T.C. korunur)."""
        t = (text or "").strip().rstrip(".")
        if not t:
            return t
        if t.startswith(("CİMER", "T.C.", "AA ", "İHA")):
            return t
        lower_map = {"İ": "i", "I": "ı", "Ş": "ş", "Ğ": "ğ", "Ü": "ü", "Ö": "ö", "Ç": "ç"}
        first = lower_map.get(t[0], t[0].lower() if t[0].isupper() else t[0])
        return first + t[1:]

    def _generate_fallback_content(self, content: str, channel: ChannelType) -> str:
        """Prompt iskeletine birebir uyan; core cümlelerini ASLA yapıştırmayan üretim."""
        p = self._rewrite_parts(content)
        title = p["title"]
        b1, b2, b3 = p["bullet1"], p["bullet2"], p["bullet3"]
        s1, s2, s3 = p["s1"], p["s2"], p["s3"]
        title_clean = title.replace(" Hk.", "").strip()
        s1_mid = self._mid_sentence(s1)
        # X özeti: kancadan farklı, daha kısa
        x_summary = b1.rstrip(".") + "."

        if channel == ChannelType.PRESS_RELEASE:
            return (
                "T.C. İLETİŞİM BAŞKANLIĞI\n"
                "BASIN AÇIKLAMASI\n\n"
                "BAŞLIK\n"
                f"{title_clean}\n\n"
                f"{s1} Söz konusu gelişme, kamuoyunun doğru bilgilendirilmesi amacıyla resmi kanallar "
                "üzerinden duyurulmaktadır. Süreç ilgili kurumların koordinasyonunda planlı biçimde yönetilmektedir.\n\n"
                f"{s2} {s3} Uygulamanın kapsamı ilgili birimlerce takip edilmekte; vatandaşları ilgilendiren "
                "hususlar şeffaflık ilkesi doğrultusunda paylaşılmaktadır.\n\n"
                "Kamuoyunun güvenini esas alan yaklaşımımız çerçevesinde gelişmeler izlenecek; "
                "yeni bilgilendirmeler resmi hesaplarımızdan yapılacaktır. "
                "Vatandaşlarımızın yalnızca resmi kaynaklardan yapılan açıklamaları dikkate alması önem arz etmektedir.\n\n"
                "Kamuoyuna saygıyla duyurulur."
            )
        if channel == ChannelType.AGENCY_NEWS:
            return (
                "FLAŞ\n\n"
                "BAŞLIK\n"
                f"{title_clean}\n\n"
                f"{s1}\n\n"
                f"ANKARA - Yetkililerden yapılan açıklamaya göre, {s1_mid}. "
                f"Bildirime göre {self._mid_sentence(s2)}. "
                f"{s3}\n\n"
                "Yetkililer, uygulamanın kamuoyunu ilgilendiren yönlerinin planlı biçimde yönetildiğini ifade etti. "
                "Konuya ilişkin güncel bilgilendirmelerin resmi kanallar üzerinden yapılacağı kaydedildi."
            )
        if channel == ChannelType.TABLOID:
            return (
                "BAŞLIK\n"
                f"Gündeme damga vuran adım: {title_clean}\n\n"
                "SPOT\n"
                f"{s1} Vatandaşlar süreci yakından izliyor.\n\n"
                f"Kamuoyunda geniş yankı uyandıran gelişmenin ardından resmi kaynaklar, "
                "sürecin kontrollü biçimde yönetildiğini vurguladı.\n\n"
                f"{s2} {s3}\n\n"
                "Bundan sonra yapılacak açıklamaların resmi kanallardan paylaşılacağı belirtilirken, "
                "vatandaşların spekülatif bilgilere itibar etmemesi isteniyor."
            )
        if channel == ChannelType.X_TWITTER:
            return (
                f"🚨 {s1}\n\n"
                f"📌 ÖZET: {x_summary}\n\n"
                "📋 DETAYLAR:\n"
                f"- {b2}\n"
                f"- {b3}\n"
                f"- {b1}\n\n"
                "📢 Lütfen yalnızca resmi duyuruları dikkate alınız.\n\n"
                "#Duyuru #Kamuoyu #ResmiBilgilendirme"
            )
        if channel == ChannelType.LINKEDIN:
            return (
                "Kurumsal iletişimin güven tesis eden gücü, doğru bilginin zamanında paylaşılmasıyla anlam kazanır.\n\n"
                f"{s1}\n\n"
                f"{s2} {s3} Paydaşlarımızın doğru ve güncel bilgiye erişimi önceliğimizdir.\n\n"
                "Öne Çıkan Başlıklar:\n"
                f"- {b1}\n"
                f"- {b2}\n"
                f"- {b3}\n\n"
                "Kurumsal sorumluluk bilinciyle süreci yakından takip ediyor; güvenilir iletişimi esas alıyoruz.\n\n"
                "#Kurumsalİletişim #Kamu #Şeffaflık"
            )
        if channel == ChannelType.VERTICAL_VIDEO:
            # Tam başlık; ekran yazısı kısa tutulur
            ekran_yazi = "CİMER yapay zekâ duyurusu" if "cimer" in title_clean.lower() or "CİMER" in title_clean else title_clean
            if len(ekran_yazi) > 36:
                ekran_yazi = "Önemli resmi duyuru"
            return (
                f"VİDEO BAŞLIĞI: {title_clean}\n\n"
                "SAHNE 1 (0-3 sn)\n"
                "GÖRSEL: Resmi duyuru ekranı, kurumsal arka plan\n"
                f"YAZI: {ekran_yazi}\n"
                "SES: Dikkat, önemli bir resmi bilgilendirme var.\n\n"
                "SAHNE 2 (3-10 sn)\n"
                "GÖRSEL: Süreç ve birim görselleri\n"
                "YAZI: Ne değişti?\n"
                f"SES: {s1}\n\n"
                "SAHNE 3 (10-25 sn)\n"
                "GÖRSEL: Özet bilgi paneli\n"
                "YAZI: Nasıl çalışıyor?\n"
                f"SES: {s2}\n\n"
                "SAHNE 4 (25-40 sn)\n"
                "GÖRSEL: Takip çağrısı ekranı\n"
                "YAZI: Resmi kanalları takip edin\n"
                f"SES: {s3} Güncellemeler için yalnızca resmi hesapları takip edin."
            )
        if channel == ChannelType.MESSAGING_CHAIN:
            return (
                "⚠️ ÖNEMLİ BİLGİLENDİRME\n\n"
                "Merhaba,\n"
                f"{s1}\n\n"
                f"📌 Konu: {title.replace(' Hk.', '')}\n\n"
                "📍 Bilmeniz Gerekenler:\n"
                f"- {b1}\n"
                f"- {b2}\n"
                f"- {b3}\n\n"
                "ℹ️ Hatırlatma: Spekülatif paylaşımlara itibar etmeyiniz; güncel bilgiyi resmi kaynaklardan doğrulayınız.\n\n"
                "📲 Lütfen yalnızca doğru bilgiye ulaşılması amacıyla bu resmi bilgilendirme mesajını çevrenizle paylaşınız."
            )
        if channel == ChannelType.OFFICIAL_LETTER:
            konu = title if title.endswith("Hk.") else f"{title.replace(' Hk.', '')} Hk."
            return (
                "T.C.\n"
                "İLETİŞİM BAŞKANLIĞI\n\n"
                "Sayı  : 75249013-010.06-E.2026/4108\n"
                "Tarih : 02.08.2026\n"
                f"Konu  : {konu}\n\n"
                "DAĞITIM YERLERİNE\n\n"
                f"{s1} Söz konusu husus ilgili birimlerimizce değerlendirilmiş olup gerekli çalışmalar tamamlanmıştır.\n\n"
                f"{s2} {s3} Uygulamanın takibi ve koordinasyonu ilgili birimler tarafından yürütülecek; "
                "gelişmeler düzenli olarak paylaşılacaktır.\n\n"
                "Bilgilerinizi ve gereğini arz/rica ederim.\n\n"
                "[Ad Soyad]\n"
                "[Unvan]"
            )
        return p["body"]

    def _clean_official_letter_placeholders(self, text: str, original_message: str) -> str:
        # Uydurma isim/unvan basma — placeholder bırak
        new_lines = []
        for line in text.split("\n"):
            stripped = line.strip()
            if re.fullmatch(r"(?i)\[?\s*(Ad\s+Soyad|İmza|İmza\s+Yetkilisi)\s*\]?", stripped):
                new_lines.append("[Ad Soyad]")
            elif re.fullmatch(r"(?i)\[?\s*(Unvan|Birim\s+Amiri)\s*\]?", stripped):
                new_lines.append("[Unvan]")
            elif re.search(r"(?i)\b(vali\s*a\.?|genel\s*sekreter|şube\s*müdürü|okul\s*müdürü)\b", stripped):
                new_lines.append("[Unvan]")
            elif re.fullmatch(r"[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)+", stripped) and len(stripped.split()) <= 3:
                # Muhtemel uydurma ad soyad satırı
                if any(x in text for x in ("arz/rica", "DAĞITIM")):
                    new_lines.append("[Ad Soyad]")
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)
        return "\n".join(new_lines)

    async def transform_channels_only(self, message: CoreMessage) -> List[TransformedMessage]:
        """Hazır çekirdek mesajı 8 mecraya dönüştürür (proofread yok)."""
        results: Dict[ChannelType, TransformedMessage] = {}

        # Kota doluysa hiç API çağırma — anında farklı mecra şablonları
        if self._in_cooldown():
            print("[LLM] Cooldown aktif → 8 mecra yerel şablonla üretiliyor")
            for ch in ChannelType:
                results[ch] = TransformedMessage(
                    channel=ch,
                    original_content=message.content,
                    transformed_content=self._generate_fallback_content(message.content, ch),
                )
            return [results[ch] for ch in ChannelType]

        # 1) Tek çağrı (kota dostu)
        batch = await self._transform_all_batched(message)
        if batch:
            print(f"[LLM] Batch dönüşüm OK ({len(batch)}/8 mecra)")
            for ch, text in batch.items():
                results[ch] = TransformedMessage(
                    channel=ch,
                    original_content=message.content,
                    transformed_content=text,
                )

        # 2) Eksikler: yerel şablon (tek tek LLM çağrısı AbortError üretiyordu)
        missing = [ch for ch in ChannelType if ch not in results]
        if missing:
            print(f"[LLM] {len(missing)} mecra yerel şablonla tamamlanıyor (hızlı yol)")
            for ch in missing:
                results[ch] = TransformedMessage(
                    channel=ch,
                    original_content=message.content,
                    transformed_content=self._generate_fallback_content(message.content, ch),
                )

        return [results[ch] for ch in ChannelType]

    async def transform_to_all_channels(self, message: CoreMessage) -> List[TransformedMessage]:
        """Yazım düzeltmesi + 8 mecraya dönüşüm."""
        corrected = await self.proofread_core_message(message.content)
        core = CoreMessage(content=corrected, author=message.author)
        return await self.transform_channels_only(core)
