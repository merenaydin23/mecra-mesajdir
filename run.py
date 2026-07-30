"""
Mecra Mesajdır - Test ve Çalıştırma Script'i
==============================================
1. LLM ile Çekirdek Mesajı 8 Farklı Mecraya Dönüştürür.
2. Üretilen Mecra Mesajlarının Anlamsal Benzerlik, Bilgi Kaybı, CTA, Duygu Yoğunluğu ve Belirsizlik Analizini Yapar.
"""

import os
import asyncio
from dotenv import load_dotenv

# Env değişkenlerini yükle
load_dotenv()

from src.domain.entities.message import CoreMessage
from src.infrastructure.llm.llm_transformer_service import LLMMessageTransformerService
from src.infrastructure.analyzers.semantic_info_loss_analyzer import SemanticAndInfoLossAnalyzer
from src.application.use_cases.transform_message_use_case import TransformMessageUseCase
from src.application.use_cases.analyze_messages_use_case import AnalyzeMessagesUseCase


async def main():
    print("=========================================================================================================================")
    print("📡 MECRA MESAJDIR — LLM ÇOKLU MECRA DÖNÜŞTÜRÜCÜ & ANALİZ PLATFORMU")
    print("=========================================================================================================================\n")

    # API Key kontrolü
    if not os.getenv("LLM_API_KEY"):
        api_key = input("🔑 Lütfen LLM_API_KEY girin: ").strip()
        os.environ["LLM_API_KEY"] = api_key

    # 1. TEST ÇEKİRDEK MESAJI
    GIRILEN_MESAJ = "Yoğun kar yağışı nedeniyle Elazığ genelinde yarın tüm okullar 1 gün süreyle tatil edilmiştir."
    core_message = CoreMessage(content=GIRILEN_MESAJ, author="Mecra Kullanıcısı")

    print(f"🚀 [GİRDİ] Çekirdek Mesaj: \"{GIRILEN_MESAJ}\"\n")

    # 2. ADIM 1: LLM ÇEVİRME
    print("⏳ ADIM 1: LLM ile 8 mecraya dönüştürülüyor...\n")
    llm_service = LLMMessageTransformerService()
    transform_use_case = TransformMessageUseCase(llm_service=llm_service)

    transformed_messages = await transform_use_case.execute_all(content=GIRILEN_MESAJ)

    for i, msg in enumerate(transformed_messages, 1):
        print(f"--------------------------------------------------")
        print(f"📌 [{i}/8] MECRA: {msg.channel.value.upper()}")
        print(f"--------------------------------------------------")
        print(f"{msg.transformed_content}\n")

    # 3. ADIM 2: ANALİZ SÜRECİ (Benzerlik, Bilgi Kaybı, CTA, Duygu Yoğunluğu & Belirsizlik)
    print("=========================================================================================================================")
    print("⏳ ADIM 2: LLM çıktıları üzerinde Anlamsal Benzerlik, Bilgi Kaybı, CTA, Duygu Yoğunluğu ve Belirsizlik Analizi yapılıyor...\n")

    analyzer_service = SemanticAndInfoLossAnalyzer()
    analyze_use_case = AnalyzeMessagesUseCase(analyzer_service=analyzer_service)

    analysis_results = await analyze_use_case.execute(core_message, transformed_messages)

    # 4. SONUÇ RAPORU TABLOSU
    print("\n" + "=" * 165)
    print(f"{'MECRA ADI':<26} | {'BENZERLİK (%)':<14} | {'KAYIP?':<8} | {'CTA?':<8} | {'CTA ŞİDDETİ':<12} | {'DUYGU':<8} | {'BELİRSİZLİK':<14} | {'BELİRSİZLİK SEVİYESİ':<20}")
    print("=" * 165)

    for res in analysis_results:
        sim_str = f"%{res.semantic_similarity.semantic_similarity_percentage:.1f}"
        loss_str = "Evet" if res.info_loss.info_loss_occurred else "Hayır"
        cta_str = "Evet ✅" if res.cta.has_cta else "Hayır ❌"
        cta_score = res.cta.strength_text
        senti_label = res.sentiment.label
        amb_score = f"{res.ambiguity.ambiguity_score:.4f}"
        amb_level = res.ambiguity.level
        print(f"{res.channel_name:<26} | {sim_str:<14} | {loss_str:<8} | {cta_str:<8} | {cta_score:<12} | {senti_label:<8} | {amb_score:<14} | {amb_level:<20}")

    print("=" * 165 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
