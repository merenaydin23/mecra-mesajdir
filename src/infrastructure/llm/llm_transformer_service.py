"""
LLM Mesaj Dönüştürücü Servisi (LLM Transformer Service)
=========================================================
AsyncOpenAI istemcisi ile LLM entegrasyonu, mecra bazlı dönüşümler ve temizlik işlemleri.
"""

import os
import re
import asyncio
from typing import List

from openai import AsyncOpenAI
import httpx

from src.domain.entities.channel import ChannelType
from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.services.llm_service_interface import LLMServiceInterface
from src.infrastructure.config.settings import settings
from src.infrastructure.llm.prompts import CHANNEL_PROMPTS


class LLMMessageTransformerService(LLMServiceInterface):
    """Clean Architecture Infrastructure Katmanı LLM Servis İmplementasyonu."""

    def __init__(self, api_key: str = None, base_url: str = None, model_name: str = None):
        self.api_key = api_key or os.getenv("LLM_API_KEY") or settings.LLM_API_KEY
        self.base_url = base_url or os.getenv("LLM_BASE_URL") or settings.LLM_BASE_URL
        self.model_name = model_name or os.getenv("LLM_MODEL_NAME") or settings.LLM_MODEL_NAME

        http_client = httpx.AsyncClient(verify=False, timeout=120.0)
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            http_client=http_client
        )

    async def transform_to_channel(self, message: CoreMessage, channel: ChannelType) -> TransformedMessage:
        """Çekirdek mesajı tek bir mecraya dönüştürür."""
        system_prompt = CHANNEL_PROMPTS.get(channel, "Sen yardımcı bir asistansın.")
        system_prompt += (
            "\n\n========================\n"
            "ÇIKTI FORMAT KURALI (HAYATİ ÖNEMDE):\n"
            "1. Yanıtına KESİNLİKLE İLK SATIRDA `[FINAL_RESULT_START]` yazarak başla.\n"
            "2. İngilizce düşünme, analiz, drafting, word count, fact check, critical constraint metinlerini ÇIKTIYA KESİNLİKLE YAZMA.\n"
            "3. Sadece ve sadece istenen Türkçe mecra metnini üret.\n"
            "4. Çekirdek mesajdaki TÜM sayıları, yüzdeleri, tarihleri, kişi/kurum adlarını AYNEN koru.\n"
            "5. Belirsiz veya kaçamak ifadeler kullanma; olguları net ve kesin aktar.\n"
            "========================\n"
        )

        transformed_text = ""
        max_retries = 2
        for attempt in range(max_retries):
            try:
                response = await self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message.content}
                    ],
                    model=self.model_name,
                    temperature=0.1,
                    max_tokens=800
                )

                transformed_text = response.choices[0].message.content or ""
                break
            except Exception as e:
                err_str = str(e)
                if "429" in err_str and attempt < max_retries - 1:
                    await asyncio.sleep(1.0)
                    continue
                print(f"[LLM UYARI] {channel.value} için LLM hatası: {err_str}. Yerel mecra şablonu kullanılıyor.")
                transformed_text = self._generate_fallback_content(message.content, channel)
                break

        # Gelişmiş İçerik Temizleme (İngilizce Akıl Yürütme ve Meta-Metin Temizliği)
        transformed_text = self._clean_llm_output(transformed_text, channel)

        if channel == ChannelType.OFFICIAL_LETTER:
            transformed_text = self._clean_official_letter_placeholders(transformed_text, message.content)

        if transformed_text.startswith("LLM Hatası:") or len(transformed_text) < 10:
            transformed_text = self._generate_fallback_content(message.content, channel)

        return TransformedMessage(
            channel=channel,
            original_content=message.content,
            transformed_content=transformed_text
        )

    def _clean_llm_output(self, text: str, channel: ChannelType) -> str:
        """LLM çıktısındaki İngilizce düşünce sızıntılarını ve meta etiketleri kesin olarak temizler."""
        if not text:
            return ""

        # 1. XML tarzı düşünce etiketlerini temizle
        text = re.sub(r"(?is)<think>.*?</think>", "", text)
        text = re.sub(r"(?is)<thought>.*?</thought>", "", text)

        # 2. [FINAL_RESULT_START] veya ---BAŞLANGIÇ--- veya Selection: belirteci varsa sonrasını al
        split_pattern = r"(?i)\*?\*?\[?\s*FINAL_RESULT_START\s*\]?\*?\*?"
        if re.search(split_pattern, text):
            text = re.split(split_pattern, text)[-1]
        elif "---BAŞLANGIÇ---" in text:
            text = text.split("---BAŞLANGIÇ---")[-1]
        elif "Selection:" in text:
            text = text.split("Selection:")[-1]

        # Baştaki tırnak / virgül sızıntılarını temizle
        text = re.sub(r"^['\",\s]+", "", text)

        # 3. Mecra bazlı Türkçe başlangıç işaretçilerini tespit et (Önündeki İngilizce yazıları kes)
        channel_start_markers = {
            ChannelType.PRESS_RELEASE: ["T.C. İLETİŞİM BAŞKANLIĞI", "BASIN AÇIKLAMASI", "BAŞLIK"],
            ChannelType.OFFICIAL_LETTER: ["T.C.", "DAĞITIM YERLERİNE", "RESMİ YAZI", "Sayı :", "Konu :"],
            ChannelType.AGENCY_NEWS: ["FLAŞ", "[FLAŞ", "ANKARA -", "HABER:"],
            ChannelType.X_TWITTER: ["🚨", "📌", "🚨 KANCA", "📌 ÖZET", "#"],
            ChannelType.LINKEDIN: ["AÇILIŞ", "STRATEJİK DEĞERLENDİRME", "ÖNE ÇIKAN NOKTALAR"],
            ChannelType.VERTICAL_VIDEO: ["🎬", "🎬 VİDEO", "🎥 SAHNE", "📌 [0-3"],
            ChannelType.MESSAGING_CHAIN: ["⚠️", "⚠️ ÖNEMLİ DUYURU", "Merhaba,"],
            ChannelType.TABLOID: ["BAŞLIK", "SPOT:", "FLAŞ"]
        }

        markers = channel_start_markers.get(channel, [])
        for marker in markers:
            idx = text.find(marker)
            if idx != -1:
                text = text[idx:]
                break

        # 4. İngilizce düşünce sızıntısı barındıran veya prompt şablonunu tekrar eden satırları temizle
        english_reasoning_keywords = [
            "critical constraint", "analyze the core", "drafting the content",
            "word count check", "fact check", "i will follow", "the core message",
            "let me think", "here is the", "sure, here", "first, i need", "mental:",
            "drafting:", "closing:", "constraint:", "step 1:", "step 2:", "paragraph 1 (",
            "format:", "topic:", "tone:", "scene 1", "scene 2", "scene 3", "refining for",
            "word count", "checking for", "adhering to", "event:", "action:", "location:",
            "time:", "needs to be", "this is tricky", "i need to expand", "must elaborate",
            "short summary", "brief summary", "placeholders for", "language:", "formal turkish",
            "no emojis", "emoji yağmuru", "on the first line", "thinking text", "correspondence",
            "greeting:", "intro:", "reason:", "consequence:", "selection:", "draft:",
            "example:", "3 sentences", "4 sentences", "5 sentences", "words)"
        ]

        clean_lines = []
        for line in text.split("\n"):
            line_strip = line.strip()
            line_lower = line_strip.lower()

            # İngilizce düşünme veya şablon tekrarı anahtar kelimesi içeriyorsa atla
            if any(kw in line_lower for kw in english_reasoning_keywords):
                continue
            # "* **Word Count Check:**" veya "* **Spot:**" gibi bullet-point başlıklarını atla
            if re.match(r"^\*?\s*\**[a-z\s]+(check|constraint|drafting|analysis|count|format|step|spot|summary|greeting|intro|reason|note)\**:", line_lower):
                continue
            clean_lines.append(line)

        text = "\n".join(clean_lines)

        # 5. Markdown kod bloklarını ve fazla boşlukları temizle
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text.strip())
        text = re.sub(r"\n?```$", "", text.strip())
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()

    def _generate_fallback_content(self, content: str, channel: ChannelType) -> str:
        """LLM servisine ulaşılamadığında kullanılan mecra simülasyon fallback'i."""
        if channel == ChannelType.PRESS_RELEASE:
            return f"BASIN AÇIKLAMASI\n\nTarih: 2026\n\n{content}\n\nKamuoyuna saygıyla duyurulur."
        elif channel == ChannelType.AGENCY_NEWS:
            return f"SON DAKİKA GELİŞMESİ -- {content} Yetkililer konuya ilişkin resmi bilgilendirmeyi yaptı."
        elif channel == ChannelType.TABLOID:
            return f"ŞOK GELİŞME! 🚨 {content} Herkes bu kararı konuşuyor!"
        elif channel == ChannelType.X_TWITTER:
            return f"📢 {content}\n\n#Duyuru #SonDakika #Gündem"
        elif channel == ChannelType.LINKEDIN:
            return f"Kurumsal Bilgilendirme:\n\n{content}\n\nDetaylı bilgi ve güncellemeler için takipte kalın."
        elif channel == ChannelType.VERTICAL_VIDEO:
            return f"[GÖRSEL: Kar manzarası ve okul]\n[SESİ DİNLE: {content}]\nDetaylar için kanalı takip etmeyi unutmayın!"
        elif channel == ChannelType.MESSAGING_CHAIN:
            return f"🚨 ACİL DUYURU:\n{content}\nLütfen tüm gruplara iletin!"
        elif channel == ChannelType.OFFICIAL_LETTER:
            return f"T.C. İLETİŞİM BAŞKANLIĞI\n\nKonu: Okul Tatil Bilgilendirmesi\n\n{content}\n\nGereğini bilgilerinize arz/rica ederim.\n\nAhmet Yılmaz\nŞube Müdürü"
        return content


    def _clean_official_letter_placeholders(self, text: str, original_message: str) -> str:
        """Resmi yazılardaki yer tutucu metinleri gerçekçi Türkçe isim ve unvanlarla değiştirir."""
        msg_lower = original_message.lower()
        if any(word in msg_lower for word in ["okul", "öğrenci", "eğitim", "ders", "sınav", "kar", "tatil"]):
            default_name = "Ayşe Yıldız"
            default_title = "Okul Müdürü"
        elif any(word in msg_lower for word in ["yemek", "yemekhane", "ücret", "personel", "idari", "fiyat", "servis"]):
            default_name = "Mehmet Kaya"
            default_title = "İdari İşler Müdürü"
        else:
            default_name = "Ahmet Yılmaz"
            default_title = "Şube Müdürü"

        lines = text.split("\n")
        new_lines = []
        for line in lines:
            stripped = line.strip()
            if re.fullmatch(r"(?i)\[?\s*(Ad\s+Soyad|İmza|İmza\s+Yetkilisi)\s*\]?", stripped):
                new_lines.append(default_name)
            elif re.fullmatch(r"(?i)\[?\s*(Unvan|Birim\s+Amiri)\s*\]?", stripped):
                new_lines.append(default_title)
            else:
                new_lines.append(line)
        return "\n".join(new_lines)

    async def transform_to_all_channels(self, message: CoreMessage) -> List[TransformedMessage]:
        """Çekirdek mesajı 8 mecranın tümüne tam eşzamanlı olarak dönüştürür."""
        channels = list(ChannelType)
        tasks = [self.transform_to_channel(message, ch) for ch in channels]
        results = await asyncio.gather(*tasks)
        return list(results)
