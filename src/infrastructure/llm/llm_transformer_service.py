"""
LLM Mesaj Dönüştürücü Servisi (LLM Transformer Service)
=========================================================
Groq (kurum dışı) veya kurumsal OpenAI-uyumlu LLM ile
çekirdek yazım düzeltmesi + mecra bazlı dönüşümler.
"""

import os
import re
import asyncio
from typing import List, Tuple

from openai import AsyncOpenAI
import httpx

from src.domain.entities.channel import ChannelType
from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.services.llm_service_interface import LLMServiceInterface
from src.infrastructure.llm.prompts import CHANNEL_PROMPTS, CORE_PROOFREAD_PROMPT


def resolve_active_llm() -> Tuple[str, str, str, str, str]:
    """
    Returns: (mode, provider, api_key, base_url, model_name)
    mode: external | internal
    """
    mode = (os.getenv("LLM_MODE") or "external").strip().lower()
    if mode not in ("external", "internal"):
        mode = "external"

    if mode == "internal":
        api_key = os.getenv("INTERNAL_LLM_API_KEY") or os.getenv("LLM_API_KEY", "")
        base_url = os.getenv("INTERNAL_LLM_BASE_URL", "https://llmstat.iletisim.gov.tr/v1")
        model = os.getenv("INTERNAL_LLM_MODEL_NAME", "qwen-397b")
        provider = "kurumsal"
    else:
        api_key = os.getenv("GROQ_API_KEY") or os.getenv("LLM_API_KEY", "")
        base_url = os.getenv("EXTERNAL_LLM_BASE_URL", "https://api.groq.com/openai/v1")
        model = os.getenv("EXTERNAL_LLM_MODEL_NAME", "llama-3.3-70b-versatile")
        provider = "groq"

    return mode, provider, api_key, base_url, model


class LLMMessageTransformerService(LLMServiceInterface):
    """Clean Architecture Infrastructure Katmanı LLM Servis İmplementasyonu."""

    def __init__(self, api_key: str = None, base_url: str = None, model_name: str = None):
        mode, provider, env_key, env_base, env_model = resolve_active_llm()
        self.mode = mode
        self.provider = provider
        self.api_key = api_key or env_key
        self.base_url = base_url or env_base
        self.model_name = model_name or env_model

        verify_ssl = self.provider != "kurumsal"
        http_client = httpx.AsyncClient(verify=verify_ssl, timeout=120.0)
        self.client = AsyncOpenAI(
            api_key=self.api_key or "missing-key",
            base_url=self.base_url,
            http_client=http_client,
        )
        print(
            f"[LLM] mode={self.mode} provider={self.provider} "
            f"model={self.model_name} key={'var' if bool(self.api_key) else 'YOK'}"
        )

    async def _chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1200) -> str:
        response = await self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model=self.model_name,
            temperature=0.2,
            max_tokens=max_tokens,
        )
        return (response.choices[0].message.content or "").strip()

    async def proofread_core_message(self, content: str) -> str:
        """
        Çekirdek mesajın yazım/noktalama/büyük-küçük harf hatalarını düzeltir.
        Anlam ve akışa dokunmaz.
        """
        raw = (content or "").strip()
        if not raw:
            return raw

        try:
            corrected = await self._chat(
                CORE_PROOFREAD_PROMPT,
                f"Düzeltilecek çekirdek mesaj:\n{raw}",
                max_tokens=500,
            )
            corrected = self._clean_proofread_output(corrected)
            if not corrected or len(corrected) < 3:
                return raw
            return corrected
        except Exception as e:
            print(f"[LLM UYARI] Core yazim duzeltme hatasi: {e}. Orijinal metin kullanilacak.")
            return raw

    def _clean_proofread_output(self, text: str) -> str:
        if not text:
            return ""
        text = re.sub(r"(?is)<think>.*?</think>", "", text)
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text.strip())
        text = re.sub(r"\n?```$", "", text.strip())
        # Meta aciklamalari kes
        for marker in ("Düzeltilmiş metin:", "Duzeltilmis metin:", "İşte", "Iste"):
            if marker.lower() in text.lower():
                parts = re.split(re.escape(marker), text, flags=re.I)
                if len(parts) > 1:
                    text = parts[-1].strip(" :\n\"'")
        return text.strip().strip('"').strip("'")

    async def transform_to_channel(self, message: CoreMessage, channel: ChannelType) -> TransformedMessage:
        """Çekirdek mesajı tek bir mecraya dönüştürür."""
        system_prompt = CHANNEL_PROMPTS.get(channel, "Sen yardımcı bir asistansın.")
        system_prompt += (
            "\n\n========================\n"
            "ÇIKTI FORMAT KURALI (HAYATİ ÖNEMDE):\n"
            "1. Yanıtına KESİNLİKLE İLK SATIRDA `[FINAL_RESULT_START]` yazarak başla.\n"
            "2. İngilizce düşünme / analiz metinlerini ÇIKTIYA YAZMA.\n"
            "3. Sadece istenen Türkçe mecra metnini üret; çekirdek mesajı aynen kopyalama.\n"
            "4. Mecraya özgü yapı ve üslubu uygula.\n"
            "5. Sayıları, tarihleri, kişi/kurum adlarını AYNEN koru.\n"
            "========================\n"
        )

        user_prompt = (
            f"Aşağıdaki çekirdek kurumsal mesajı hedef mecra formatına dönüştür.\n"
            f"Hedef mecra: {channel.value}\n\n"
            f"ÇEKİRDEK MESAJ:\n{message.content}"
        )

        transformed_text = ""
        max_retries = 2
        for attempt in range(max_retries):
            try:
                transformed_text = await self._chat(system_prompt, user_prompt, max_tokens=1200)
                break
            except Exception as e:
                err_str = str(e)
                if "429" in err_str and attempt < max_retries - 1:
                    await asyncio.sleep(1.2)
                    continue
                print(f"[LLM UYARI] {channel.value} için LLM hatası: {err_str}. Yerel mecra şablonu kullanılıyor.")
                transformed_text = self._generate_fallback_content(message.content, channel)
                break

        transformed_text = self._clean_llm_output(transformed_text, channel)

        if channel == ChannelType.OFFICIAL_LETTER:
            transformed_text = self._clean_official_letter_placeholders(transformed_text, message.content)

        core_norm = re.sub(r"\s+", " ", message.content.strip().lower())
        out_norm = re.sub(r"\s+", " ", (transformed_text or "").strip().lower())
        looks_like_core = out_norm == core_norm or (core_norm in out_norm and len(out_norm) < len(core_norm) + 40)

        if (
            not transformed_text
            or transformed_text.startswith("LLM Hatası:")
            or len(transformed_text) < 10
            or looks_like_core
        ):
            print(f"[LLM] {channel.value}: cikti yetersiz/core kopyasi -> mecra sablonu")
            transformed_text = self._generate_fallback_content(message.content, channel)

        return TransformedMessage(
            channel=channel,
            original_content=message.content,
            transformed_content=transformed_text,
        )

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
            ChannelType.LINKEDIN: ["Kurumsal bilgilendirme", "Kurumsal Bilgilendirme"],
            ChannelType.VERTICAL_VIDEO: ["VİDEO BAŞLIĞI", "SAHNE 1", "🎬"],
            ChannelType.MESSAGING_CHAIN: ["⚠️", "Merhaba,"],
            ChannelType.TABLOID: ["BAŞLIK", "SPOT", "ŞOK"],
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
        return text.strip()

    def _generate_fallback_content(self, content: str, channel: ChannelType) -> str:
        if channel == ChannelType.PRESS_RELEASE:
            return (
                "T.C. İLETİŞİM BAŞKANLIĞI\nBASIN AÇIKLAMASI\n\nBAŞLIK\n"
                "Kamuoyunu İlgilendiren Resmi Bilgilendirme\n\n"
                f"{content}\n\n"
                "İlgili kurumlar süreci yakından takip etmektedir.\n\n"
                "Kamuoyuna saygıyla duyurulur."
            )
        if channel == ChannelType.AGENCY_NEWS:
            return (
                "FLAŞ\n\nBAŞLIK\nResmi makamlardan yeni bilgilendirme\n\n"
                f"ANKARA - {content} Yetkililer kamuoyunu bilgilendirdi."
            )
        if channel == ChannelType.TABLOID:
            return (
                "BAŞLIK\nGündeme bomba gibi düşen karar!\n\nSPOT\n"
                f"{content}\n\nVatandaşlar gelişmeyi yakından takip ediyor."
            )
        if channel == ChannelType.X_TWITTER:
            return (
                f"🚨 Önemli bilgilendirme\n\n📌 ÖZET: {content}\n\n"
                "📋 DETAYLAR:\n- Resmi duyuru paylaşıldı\n"
                "- İlgili birimler süreci takip ediyor\n"
                "- Güncellemeler için takipte kalın\n\n#Duyuru #SonDakika"
            )
        if channel == ChannelType.LINKEDIN:
            return (
                "Kurumsal bilgilendirme notu:\n\n"
                f"{content}\n\n"
                "Öne Çıkan Başlıklar:\n- Kararın kapsamı netleştirildi\n"
                "- Uygulama süreci ilgili birimlerce yürütülecek\n"
                "- Paydaş bilgilendirmesi sürdürülecek\n\n"
                "#Kurumsalİletişim #Kamu"
            )
        if channel == ChannelType.VERTICAL_VIDEO:
            return (
                "VİDEO BAŞLIĞI: Önemli Duyuru\n\n"
                "SAHNE 1 (0-3 sn)\nGÖRSEL: Duyuru ekranı\nYAZI: Önemli bilgilendirme\n"
                "SES: Dikkat, önemli bir duyuru var.\n\n"
                f"SAHNE 2 (3-10 sn)\nGÖRSEL: Konu görselleri\nYAZI: Ana mesaj\nSES: {content}\n\n"
                "SAHNE 3 (10-25 sn)\nGÖRSEL: Özet\nYAZI: Detaylar\nSES: Ayrıntıları takip edin.\n\n"
                "SAHNE 4 (25-40 sn)\nGÖRSEL: CTA\nYAZI: Takipte kalın\nSES: Güncellemeler için takip edin."
            )
        if channel == ChannelType.MESSAGING_CHAIN:
            return (
                "⚠️ ÖNEMLİ BİLGİLENDİRME\n\nMerhaba,\n"
                f"{content}\n\n📌 Konu: Resmi bilgilendirme\n\n"
                "📍 Bilmeniz Gerekenler:\n- Duyuru resmi kaynaklıdır\n"
                "- Takvim ve kapsam duyuruda belirtilmiştir\n"
                "- Güncel bilgiyi resmi kanallardan takip ediniz\n\n"
                "📲 Lütfen yalnızca doğru bilgiye ulaşılması amacıyla paylaşınız."
            )
        if channel == ChannelType.OFFICIAL_LETTER:
            return (
                "T.C.\nİLETİŞİM BAŞKANLIĞI\n\n"
                "Sayı  : 75249013-010.06-E.2026/4108\n"
                "Tarih : 02.08.2026\n"
                "Konu  : Resmi Bilgilendirme Hk.\n\n"
                "DAĞITIM YERLERİNE\n\n"
                f"{content}\n\n"
                "Bilgilerinizi ve gereğini arz/rica ederim.\n\n"
                "Ahmet Yılmaz\nŞube Müdürü"
            )
        return content

    def _clean_official_letter_placeholders(self, text: str, original_message: str) -> str:
        msg_lower = original_message.lower()
        if any(word in msg_lower for word in ["okul", "öğrenci", "eğitim", "ders", "sınav", "kar", "tatil"]):
            default_name, default_title = "Ayşe Yıldız", "Okul Müdürü"
        elif any(word in msg_lower for word in ["yemek", "ücret", "personel", "idari"]):
            default_name, default_title = "Mehmet Kaya", "İdari İşler Müdürü"
        else:
            default_name, default_title = "Ahmet Yılmaz", "Şube Müdürü"

        new_lines = []
        for line in text.split("\n"):
            stripped = line.strip()
            if re.fullmatch(r"(?i)\[?\s*(Ad\s+Soyad|İmza|İmza\s+Yetkilisi)\s*\]?", stripped):
                new_lines.append(default_name)
            elif re.fullmatch(r"(?i)\[?\s*(Unvan|Birim\s+Amiri)\s*\]?", stripped):
                new_lines.append(default_title)
            else:
                new_lines.append(line)
        return "\n".join(new_lines)

    async def transform_channels_only(self, message: CoreMessage) -> List[TransformedMessage]:
        """Hazır çekirdek mesajı 8 mecraya dönüştürür (proofread yok)."""
        channels = list(ChannelType)
        sem = asyncio.Semaphore(4)

        async def _run(ch: ChannelType) -> TransformedMessage:
            async with sem:
                return await self.transform_to_channel(message, ch)

        results = await asyncio.gather(*[_run(ch) for ch in channels])
        return list(results)

    async def transform_to_all_channels(self, message: CoreMessage) -> List[TransformedMessage]:
        """Yazım düzeltmesi + 8 mecraya dönüşüm."""
        corrected = await self.proofread_core_message(message.content)
        core = CoreMessage(content=corrected, author=message.author)
        return await self.transform_channels_only(core)
