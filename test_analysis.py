# -*- coding: utf-8 -*-
"""Colab uyumlu analiz motoru test betiği — farklı çekirdek mesaj senaryoları."""

import asyncio
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.entities.channel import ChannelType, CHANNEL_NAMES
from src.infrastructure.analyzers.semantic_info_loss_analyzer import SemanticAndInfoLossAnalyzer


SCENARIOS = [
    {
        "name": "Okul Tatili (Düşük Risk)",
        "core": "Yoğun kar yağışı nedeniyle Elazığ genelinde yarın tüm okullar 1 gün süreyle tatil edilmiştir.",
        "platforms": {
            ChannelType.PRESS_RELEASE: (
                "T.C. İLETİŞİM BAŞKANLIĞI BASIN AÇIKLAMASI\n\n"
                "Yoğun kar yağışı nedeniyle Elazığ genelinde yarın tüm okullar 1 gün süreyle tatil edilmiştir. "
                "Vatandaşlarımızın güvenliği için alınan karar kamuoyuna saygıyla duyurulur."
            ),
            ChannelType.TABLOID: (
                "FLAŞ! Elazığ'da kar fırtınası! Yarın tüm okullar 1 gün tatil edildi. "
                "Veliler dikkat, eğitim 1 gün askıya alındı!"
            ),
        },
    },
    {
        "name": "Küçülme Kararı (Orta Risk)",
        "core": "Şirketimiz 2026 yılı üçüncü çeyreğinde yüzde 15 küçülmeye gitme kararı almıştır.",
        "platforms": {
            ChannelType.PRESS_RELEASE: (
                "Şirketimiz 2026 yılı 3. çeyreğinde %15 küçülmeye gidilmesi kararlaştırılmıştır."
            ),
            ChannelType.LINKEDIN: (
                "Değişen pazar dinamiklerine uyum sağlamak adına stratejik bir hizalanma "
                "süreci değerlendirilmektedir. Detaylar netleşince paylaşacağız."
            ),
        },
    },
    {
        "name": "Siber Saldırı (Yüksek Risk — Bilgi Kaybı)",
        "core": (
            "ABC Teknoloji A.Ş. 2026 yılı Haziran ayında yaşanan siber saldırı sonucunda "
            "50000 kullanıcının kişisel verilerinin sızdığını açıkladı."
        ),
        "platforms": {
            ChannelType.PRESS_RELEASE: (
                "ABC Teknoloji A.Ş., 2026 Haziran ayında meydana gelen siber saldırı sonucunda "
                "50000 kullanıcının verilerinin sızdığını kamuoyuyla paylaşmıştır."
            ),
            ChannelType.LINKEDIN: (
                "2026 Haziran ayında altyapımızda planlı optimizasyon çalışmaları yapılmıştır. "
                "Kullanıcı deneyimini iyileştirmeye devam ediyoruz."
            ),
            ChannelType.TABLOID: (
                "BÜYÜK SKANDAL! Milyonlarca kullanıcının bilgisi karaborsaya düştü, şirket çöküşün eşiğinde!"
            ),
        },
    },
]


def score_platform(res) -> float:
    """0-100 arası genel kalite puanı."""
    sim = res.semantic_similarity.semantic_similarity_percentage
    loss_penalty = 25 if res.info_loss.info_loss_occurred else 0
    amb_penalty = {"Düşük": 0, "Orta": 8, "Yüksek": 18}.get(res.ambiguity.level, 5)
    cta_bonus = 3 if res.cta.has_cta else 0
    return round(max(0, min(100, sim - loss_penalty - amb_penalty + cta_bonus)), 1)


async def run_tests():
    analyzer = SemanticAndInfoLossAnalyzer()
    print("=" * 90)
    print("MECRA MESAJDIR — ANALİZ MOTORU TEST RAPORU")
    print("=" * 90)

    for scenario in SCENARIOS:
        core = CoreMessage(content=scenario["core"], author="Test")
        transformed = [
            TransformedMessage(channel=ch, original_content=scenario["core"], transformed_content=text)
            for ch, text in scenario["platforms"].items()
        ]

        print(f"\n📌 SENARYO: {scenario['name']}")
        print(f"   Çekirdek: {scenario['core'][:80]}...")
        print("-" * 90)

        results = []
        for t in transformed:
            res = await analyzer.analyze_pair(core, t)
            puan = score_platform(res)
            results.append((res, puan))
            print(
                f"  {res.channel_name[:28]:<28} | Benzerlik: %{res.semantic_similarity.semantic_similarity_percentage:5.1f} | "
                f"Kayıp: {'EVET' if res.info_loss.info_loss_occurred else 'Hayır':<5} | "
                f"CTA: {res.cta.strength_text:<8} | Duygu: {res.sentiment.label:<4} | "
                f"Belirsizlik: {res.ambiguity.level:<6} | PUAN: {puan}"
            )

        avg = round(sum(p for _, p in results) / len(results), 1)
        print(f"  >>> Senaryo Ortalama Puan: {avg}/100")

    # Bozulma zinciri testi
    print("\n" + "=" * 90)
    print("BOZULMA ZİNCİRİ (MMD) TESTİ")
    print("=" * 90)
    core = CoreMessage(content=SCENARIOS[0]["core"], author="Test")
    all_transformed = [
        TransformedMessage(
            channel=ch,
            original_content=SCENARIOS[0]["core"],
            transformed_content=(
                f"Mecra mesajı ({CHANNEL_NAMES.get(ch, ch.value)}): {SCENARIOS[0]['core']}"
            ),
        )
        for ch in ChannelType
    ]
    _, chain = await analyzer.analyze_all(core, all_transformed)
    print(f"Kırılma Noktası: {chain.breaking_point_channel or 'Yok'}")
    print(f"Maks Sapma Δ: {chain.max_consecutive_deviation}")
    print("=" * 90)


if __name__ == "__main__":
    asyncio.run(run_tests())
