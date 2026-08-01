# -*- coding: utf-8 -*-
"""
Altın Standart Test Senaryoları (Colab Notebook Kaynaklı)
=========================================================
Colab'daki analiz senaryolarından türetilmiş 5 çekirdek mesaj + mecra metni.
Beklenen etiketler Colab algoritma mantığına göre elle etiketlenmiştir.
"""

from src.domain.entities.channel import ChannelType

GOLD_SCENARIOS = [
    {
        "id": "T1_okul_tatili",
        "name": "Okul Tatili — Düşük Risk (Olgu Korunmuş)",
        "core": "Yoğun kar yağışı nedeniyle Elazığ genelinde yarın tüm okullar 1 gün süreyle tatil edilmiştir.",
        "platforms": {
            ChannelType.PRESS_RELEASE: (
                "T.C. İLETİŞİM BAŞKANLIĞI\nBASIN AÇIKLAMASI\n\n"
                "Yoğun kar yağışı nedeniyle Elazığ genelinde yarın tüm okullar 1 gün süreyle tatil edilmiştir. "
                "Vatandaşlarımızın yalnızca resmi kanallardan yapılan duyurulara itibar etmeleri önemle rica olunur. "
                "Kamuoyuna saygıyla duyurulur."
            ),
            ChannelType.X_TWITTER: (
                "🚨 SON DAKİKA\n📌 ÖZET: Yoğun kar yağışı nedeniyle Elazığ genelinde yarın tüm okullar 1 gün tatil.\n"
                "📢 Resmi açıklamaları takip edin.\n#SonDakika #Elazığ"
            ),
        },
        "expected": {
            ChannelType.PRESS_RELEASE: {
                "info_loss": False,
                "topic_preserved": True,
                "sim_min": 75.0,
                # Resmi üslupta emir kipi zorunlu değil — CTA kontrolü yok
                "ambiguity_max": "Orta",
            },
            ChannelType.X_TWITTER: {
                "info_loss": False,
                "topic_preserved": True,
                "sim_min": 70.0,
                "has_cta": True,  # "takip edin" → Mood=Imp
                "ambiguity_max": "Orta",
            },
        },
    },
    {
        "id": "T2_kuculme_korunmus",
        "name": "Küçülme Kararı — Korunmuş Resmi Metin",
        "core": "Şirketimiz 2026 yılı üçüncü çeyreğinde yüzde 15 küçülmeye gitme kararı almıştır.",
        "platforms": {
            ChannelType.PRESS_RELEASE: (
                "Kamuoyuna duyuru: Şirketimiz 2026 yılı üçüncü çeyrek stratejik planlaması kapsamında "
                "yüzde 15 küçülme kararı almıştır."
            ),
            ChannelType.AGENCY_NEWS: (
                "SON DAKİKA - Şirket yönetimi 2026'nın 3. çeyreğinde %15 küçülmeye gideceğini "
                "resmi açıklamayla bildirdi."
            ),
        },
        "expected": {
            ChannelType.PRESS_RELEASE: {
                "info_loss": False,
                "topic_preserved": True,
                "sim_min": 85.0,
                "has_cta": False,
                "ambiguity_max": "Orta",
            },
            ChannelType.AGENCY_NEWS: {
                "info_loss": False,
                "topic_preserved": True,
                "sim_min": 80.0,
                "has_cta": False,
                "ambiguity_max": "Orta",
            },
        },
    },
    {
        "id": "T3_kuculme_kayip",
        "name": "Küçülme Kararı — Bilgi Kaybı / Belirsizlik Tuzağı",
        "core": "Şirketimiz 2026 yılı üçüncü çeyreğinde yüzde 15 küçülmeye gitme kararı almıştır.",
        "platforms": {
            ChannelType.LINKEDIN: (
                "Değişen pazar dinamiklerine uyum sağlamak adına stratejik bir hizalanma "
                "süreci değerlendirilmektedir. Detaylar netleşince paylaşacağız."
            ),
            ChannelType.TABLOID: (
                "ŞİRKET ÇÖKÜŞTE! Dev firmada panik büyüyor, yüzlerce çalışan bir günde kapı dışı ediliyor!"
            ),
        },
        "expected": {
            ChannelType.LINKEDIN: {
                "info_loss": True,   # %15 ve 2026 Q3 yok
                "topic_preserved": False,  # veya düşük benzerlik
                "sim_max": 55.0,
                "has_cta": False,
                "ambiguity_min": "Orta",  # belirsiz dil
            },
            ChannelType.TABLOID: {
                "info_loss": True,   # sayı yok, abartı var
                "topic_preserved": False,
                "sim_max": 65.0,
                "has_cta": False,
                "ambiguity_max": "Yüksek",
            },
        },
    },
    {
        "id": "T4_siber_korunmus",
        "name": "Siber Saldırı — Olgu Korunmuş",
        "core": (
            "ABC Teknoloji A.Ş. 2026 yılı Haziran ayında yaşanan siber saldırı sonucunda "
            "50000 kullanıcının kişisel verilerinin sızdığını açıkladı."
        ),
        "platforms": {
            ChannelType.PRESS_RELEASE: (
                "Kamuoyuna duyuru: ABC Teknoloji A.Ş., 2026 Haziran ayında meydana gelen siber saldırı "
                "sonucunda 50000 kullanıcının verilerinin sızdığını kamuoyuyla paylaşmıştır."
            ),
            ChannelType.X_TWITTER: (
                "🚨 ABC Teknoloji A.Ş. 2026 yılı Haziran ayında siber saldırı açıkladı. "
                "50000 kullanıcının kişisel verileri sızdı. #SiberGüvenlik #VeriSızıntısı"
            ),
        },
        "expected": {
            ChannelType.PRESS_RELEASE: {
                "info_loss": False,
                "topic_preserved": True,
                "sim_min": 85.0,
                "has_cta": False,
                "ambiguity_max": "Orta",
            },
            ChannelType.X_TWITTER: {
                "info_loss": False,
                "topic_preserved": True,
                "sim_min": 70.0,
                "has_cta": False,
                "ambiguity_max": "Orta",
            },
        },
    },
    {
        "id": "T5_siber_gizleme",
        "name": "Siber Saldırı — Gizleme / Abartı (Yüksek Risk)",
        "core": (
            "ABC Teknoloji A.Ş. 2026 yılı Haziran ayında yaşanan siber saldırı sonucunda "
            "50000 kullanıcının kişisel verilerinin sızdığını açıkladı."
        ),
        "platforms": {
            ChannelType.LINKEDIN: (
                "2026 Haziran ayında altyapımızda gerçekleştirdiğimiz planlı optimizasyon çalışmaları "
                "kapsamında bazı sistem güncellemeleri yapılmıştır. Kullanıcı deneyimini iyileştirmeye devam ediyoruz."
            ),
            ChannelType.TABLOID: (
                "BÜYÜK SKANDAL! Milyonlarca kullanıcının bilgisi karaborsaya düştü, şirket çöküşün eşiğinde!"
            ),
            ChannelType.MESSAGING_CHAIN: (
                "⚠️ ÖNEMLİ BİLGİLENDİRME\n"
                "ABC Teknoloji A.Ş. 2026 yılı Haziran ayında yaşanan siber saldırı sonucunda "
                "50000 kullanıcının kişisel verilerinin sızdığını açıkladı. "
                "Lütfen bu resmi bilgilendirme mesajını çevrenizle paylaşınız."
            ),
        },
        "expected": {
            ChannelType.LINKEDIN: {
                "info_loss": True,
                "topic_preserved": False,
                "sim_max": 45.0,
                "has_cta": False,
                "ambiguity_min": "Orta",
            },
            ChannelType.TABLOID: {
                "info_loss": True,
                "topic_preserved": False,
                "sim_max": 60.0,
                "has_cta": False,
                "ambiguity_max": "Yüksek",
            },
            ChannelType.MESSAGING_CHAIN: {
                "info_loss": False,
                "topic_preserved": True,
                "sim_min": 75.0,
                "has_cta": True,  # paylaşınız → Mood=Imp
                # Belirsizlik prototip skoru cümle bazlı max aldığı için
                # resmi bilgilendirme metinlerinde Orta-Yüksek salınım yapabilir
                "ambiguity_max": "Yüksek",
            },
        },
    },
    {
        "id": "T6_8_mecra_testi",
        "name": "Kapsamlı Test — 8 Mecra ve Bozulma Zinciri (Sentiment & Info Loss)",
        "core": (
            "Bakanlığımızca yürütülen Gençlik Destek Projesi kapsamında "
            "2026 yılı sonuna kadar 100000 gencimize aylık 2000 TL eğitim bursu sağlanacaktır."
        ),
        "platforms": {
            ChannelType.OFFICIAL_LETTER: (
                "İlgi: Gençlik Destek Projesi Hakkında.\n"
                "Bakanlığımızca yürütülen Gençlik Destek Projesi kapsamında 2026 yılı sonuna kadar "
                "100000 gencimize aylık 2000 TL eğitim bursu sağlanması kararlaştırılmıştır. "
                "Gereğini bilgilerinize arz ederim."
            ),
            ChannelType.PRESS_RELEASE: (
                "KAMUOYUNA DUYURU: Bakanlığımızca yürütülen Gençlik Destek Projesi kapsamında "
                "2026 yılı sonuna kadar 100000 gencimize aylık 2000 TL eğitim bursu sağlanacaktır."
            ),
            ChannelType.AGENCY_NEWS: (
                "Bakanlıktan gençlere müjde! Gençlik Destek Projesi ile 2026 sonuna kadar "
                "100000 gence aylık 2000 TL eğitim bursu verileceği açıklandı."
            ),
            ChannelType.LINKEDIN: (
                "Gençlerimizin eğitimine destek olmaktan gurur duyuyoruz! "
                "Gençlik Destek Projesi ile 100000 gence aylık 2000 TL burs sağlıyoruz. Gelecek onlarla aydınlık!"
            ),
            ChannelType.X_TWITTER: (
                "Bakanlıktan harika haber! 🥳 100 bin gence aylık 2000 TL burs verilecek! "
                "Siz de hemen başvurun! #Burs #Gençlik"
            ),
            ChannelType.MESSAGING_CHAIN: (
                "Kanka duydun mu devlet 2000 lira para dağıtıyormuş gençlere, koş başvuralım :D"
            ),
            ChannelType.VERTICAL_VIDEO: (
                "Devletten bedava 2000 lira alma taktiği! Yok artık!! 😱 Hemen videoyu kaydet ve başvur!!"
            ),
            ChannelType.TABLOID: (
                "ŞOK İDDİA! Seçim yatırımı mı? Milyonlarca lira gençlere dağıtılıyor! "
                "Burs adı altında kimlere para verilecek?"
            ),
        },
        "expected": {
            ChannelType.OFFICIAL_LETTER: {
                "info_loss": False,
                "topic_preserved": True,
                "sentiment": "NEUTRAL",
                "ambiguity_max": "Düşük",
            },
            ChannelType.PRESS_RELEASE: {
                "info_loss": False,
                "topic_preserved": True,
                "sentiment": "NEUTRAL",
                "ambiguity_max": "Düşük",
            },
            ChannelType.AGENCY_NEWS: {
                "info_loss": False,
                "topic_preserved": True,
                "sentiment": "POS",
                "ambiguity_max": "Orta",
            },
            ChannelType.LINKEDIN: {
                "info_loss": True, # '2026' missing
                "topic_preserved": True,
                "sentiment": "POS",
                "intensity_min": 0.5,
                "ambiguity_max": "Orta",
            },
            ChannelType.X_TWITTER: {
                "info_loss": True, # '2026' missing
                "topic_preserved": True,
                "sentiment": "POS",
                "has_cta": True,
                "intensity_min": 0.6,
            },
            ChannelType.MESSAGING_CHAIN: {
                "info_loss": True,
                "topic_preserved": False,
                "sentiment": "POS",
                "ambiguity_min": "Orta",
            },
            ChannelType.VERTICAL_VIDEO: {
                "info_loss": True,
                "topic_preserved": False,
                "has_cta": True,
                "sentiment": "POS",
                "intensity_min": 0.5,
                "ambiguity_min": "Orta",
            },
            ChannelType.TABLOID: {
                "info_loss": True,
                "topic_preserved": False,
                "sentiment": "NEG",
                "intensity_min": 0.5,
                "ambiguity_min": "Yüksek",
            },
        },
    },
]

AMBIGUITY_RANK = {"Düşük": 0, "Orta": 1, "Yüksek": 2}
