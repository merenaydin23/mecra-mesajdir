"""
Mecra (Kanal) Tipleri ve Tanımları
===================================
Platform türlerini ve kullanıcı dostu isimlerini barındırır.
"""

from enum import Enum


class ChannelType(str, Enum):
    """Desteklenen 8 İletişim Mecrası."""

    PRESS_RELEASE = "press_release"      # Basın Açıklaması
    AGENCY_NEWS = "agency_news"          # Ajans Haberi
    TABLOID = "tabloid"                  # Magazin / Tabloid
    X_TWITTER = "x_twitter"              # X (Twitter)
    LINKEDIN = "linkedin"                # LinkedIn
    VERTICAL_VIDEO = "vertical_video"    # Dikey Video (TikTok / Reels)
    MESSAGING_CHAIN = "messaging_chain"  # Mesajlaşma Zinciri (WhatsApp)
    OFFICIAL_LETTER = "official_letter"  # Resmi Yazı / Kurumsal Dilekçe


CHANNEL_NAMES = {
    ChannelType.PRESS_RELEASE: "Basın Açıklaması (Press Release)",
    ChannelType.AGENCY_NEWS: "Ajans Haberi (Agency News)",
    ChannelType.TABLOID: "Magazin / Tabloid Haberi",
    ChannelType.X_TWITTER: "X (Twitter) Gönderisi",
    ChannelType.LINKEDIN: "LinkedIn Gönderisi",
    ChannelType.VERTICAL_VIDEO: "Dikey Video Senaryosu (TikTok / Reels)",
    ChannelType.MESSAGING_CHAIN: "Mesajlaşma Zinciri (WhatsApp)",
    ChannelType.OFFICIAL_LETTER: "Resmi Yazı / Kurumsal Dilekçe",
}
