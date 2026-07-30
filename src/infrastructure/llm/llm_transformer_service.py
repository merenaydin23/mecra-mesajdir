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

        http_client = httpx.AsyncClient(verify=False)
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            http_client=http_client
        )

    async def transform_to_channel(self, message: CoreMessage, channel: ChannelType) -> TransformedMessage:
        """Çekirdek mesajı tek bir mecraya dönüştürür."""
        system_prompt = CHANNEL_PROMPTS.get(channel, "Sen yardımcı bir asistansın.")
        system_prompt += (
            "\n\nÖNEMLİ UYARI: Düşünme sürecini (Thinking/Reasoning) mümkün olduğunca kısa tut veya doğrudan cevaba geç. "
            "Hiçbir analiz, açıklama veya meta-metin yazma. Sadece ve sadece dönüştürülmüş nihai metni üret. "
            "Metninin hemen başına '[FINAL_RESULT_START]' ekle ve ardından dönüştürülmüş metni ver."
        )

        try:
            response = await self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message.content}
                ],
                model=self.model_name,
                temperature=0.1,
                max_tokens=8192
            )

            transformed_text = response.choices[0].message.content or ""

            # Düşünme ve meta metin temizliği
            transformed_text = re.sub(r"<think>.*?</think>", "", transformed_text, flags=re.DOTALL)
            transformed_text = re.sub(r"<thought>.*?</thought>", "", transformed_text, flags=re.DOTALL)

            split_pattern = r"(?i)\*?\*?\[?\s*FINAL_RESULT_START\s*\]?\*?\*?"
            if re.search(split_pattern, transformed_text):
                transformed_text = re.split(split_pattern, transformed_text)[-1]
            elif "---BAŞLANGIÇ---" in transformed_text:
                transformed_text = transformed_text.split("---BAŞLANGIÇ---")[-1]

            for marker in ["Thinking Process:", "Düşünme Süreci:", "Reasoning:"]:
                if marker in transformed_text:
                    transformed_text = transformed_text.split(marker)[-1]

            transformed_text = transformed_text.strip()

            if channel == ChannelType.OFFICIAL_LETTER:
                transformed_text = self._clean_official_letter_placeholders(transformed_text, message.content)

        except Exception as e:
            transformed_text = f"LLM Hatası: {str(e)}"

        return TransformedMessage(
            channel=channel,
            original_content=message.content,
            transformed_content=transformed_text
        )

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
        """Çekirdek mesajı 8 mecranın tümüne dönüştürür (kademeli eşzamanlı)."""
        async def _staggered_transform(channel: ChannelType, delay: float) -> TransformedMessage:
            if delay > 0:
                await asyncio.sleep(delay)
            return await self.transform_to_channel(message, channel)

        channels = list(ChannelType)
        tasks = [_staggered_transform(ch, idx * 0.18) for idx, ch in enumerate(channels)]
        results = await asyncio.gather(*tasks)
        return list(results)
