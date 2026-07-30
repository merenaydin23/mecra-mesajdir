"""
Mecra Mesajdır - Test ve Başlatıcı Script
===========================================
Clean Architecture yapısında 8 mecra LLM dönüştürme test çalıştırması.
"""

import os
import asyncio
from dotenv import load_dotenv

# Env yükle
load_dotenv()

from src.domain.entities.channel import CHANNEL_NAMES
from src.infrastructure.llm.llm_transformer_service import LLMMessageTransformerService
from src.application.use_cases.transform_message_use_case import TransformMessageUseCase


async def main():
    print("==================================================")
    print("📡 Mecra Mesajdır - LLM Çoklu Mecra Çevirici")
    print("==================================================\n")

    # API Key kontrolü
    if not os.getenv("LLM_API_KEY"):
        api_key = input("🔑 Lütfen LLM_API_KEY girin: ").strip()
        os.environ["LLM_API_KEY"] = api_key

    # Örnek Çekirdek Mesaj
    GIRILEN_MESAJ = "Yoğun kar yağışı nedeniyle Elazığ genelinde yarın tüm okullar 1 gün süreyle tatil edilmiştir."

    print(f"🚀 Girdi (Çekirdek Mesaj): {GIRILEN_MESAJ}\n")
    print("⏳ LLM 8 farklı mecraya dönüştürüyor, lütfen bekleyin...\n")

    # Dependency Injection (Bağımlılık Enjeksiyonu)
    llm_service = LLMMessageTransformerService()
    use_case = TransformMessageUseCase(llm_service=llm_service)

    results = await use_case.execute_all(content=GIRILEN_MESAJ, author="Mecra Kullanıcısı")

    for i, res in enumerate(results, 1):
        platform_title = CHANNEL_NAMES.get(res.channel, res.channel.value.upper())
        print("==================================================")
        print(f"📌 [{i}/{len(results)}] MECRA: {platform_title}")
        print("--------------------------------------------------")
        print(res.transformed_content)
        print("==================================================\n")


if __name__ == "__main__":
    asyncio.run(main())
