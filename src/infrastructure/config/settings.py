"""
Uygulama Konfigürasyonu
========================
Ortam değişkenlerini, LLM ve MSSQL Veritabanı ayarlarını yönetir.
"""

import os
from dataclasses import dataclass


def _resolve_llm_config():
    """LLM_MODE'a göre aktif API key / base URL / model seçer."""
    mode = (os.getenv("LLM_MODE") or "external").strip().lower()
    if mode not in ("external", "internal"):
        mode = "external"

    if mode == "internal":
        api_key = os.getenv("INTERNAL_LLM_API_KEY") or os.getenv("LLM_API_KEY", "")
        base_url = os.getenv("INTERNAL_LLM_BASE_URL", "https://llmstat.iletisim.gov.tr/v1")
        model = os.getenv("INTERNAL_LLM_MODEL_NAME", "qwen-397b")
        provider = "kurumsal"
    else:
        api_key = (
            os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
            or os.getenv("LLM_API_KEY", "")
        )
        base_url = os.getenv(
            "EXTERNAL_LLM_BASE_URL",
            "https://generativelanguage.googleapis.com/v1beta/openai/",
        )
        model = os.getenv("EXTERNAL_LLM_MODEL_NAME", "gemini-2.5-flash")
        provider = "gemini"

    return mode, provider, api_key, base_url, model


_mode, _provider, _api_key, _base_url, _model = _resolve_llm_config()


@dataclass
class Settings:
    # LLM Konfigürasyonu
    LLM_MODE: str = _mode
    LLM_PROVIDER: str = _provider
    LLM_API_KEY: str = _api_key
    LLM_BASE_URL: str = _base_url
    LLM_MODEL_NAME: str = _model

    # Microsoft SQL Server (MSSQL) Konfigürasyonu
    MSSQL_DRIVER: str = os.getenv("MSSQL_DRIVER", "{ODBC Driver 17 for SQL Server}")
    MSSQL_SERVER: str = os.getenv("MSSQL_SERVER", "MERTPC\\SQLEXPRESS")
    MSSQL_DATABASE: str = os.getenv("MSSQL_DATABASE", "Mecra_Mesajdır_DB")
    MSSQL_TRUSTED_CONNECTION: str = os.getenv("MSSQL_TRUSTED_CONNECTION", "yes")

    # MMD (Breaking Point) Konfigürasyonu
    BP_ESIK: float = float(os.getenv("BP_ESIK", "0.15"))
    TIE_YUZDE_ESIK: float = float(os.getenv("TIE_YUZDE_ESIK", "0.05"))

    # Duygu Analizi Konfigürasyonu
    EMOJI_WEIGHT: float = float(os.getenv("EMOJI_WEIGHT", "0.08"))
    PUNCT_WEIGHT: float = float(os.getenv("PUNCT_WEIGHT", "0.05"))

    # Belirsizlik Analizi Konfigürasyonu
    AMBIGUITY_LOW_THRESHOLD: float = float(os.getenv("AMBIGUITY_LOW_THRESHOLD", "0.35"))
    AMBIGUITY_HIGH_THRESHOLD: float = float(os.getenv("AMBIGUITY_HIGH_THRESHOLD", "0.65"))


settings = Settings()
