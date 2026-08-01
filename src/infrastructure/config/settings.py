"""
Uygulama Konfigürasyonu
========================
Ortam değişkenlerini, LLM ve MSSQL Veritabanı ayarlarını yönetir.
"""

import os
from dataclasses import dataclass


@dataclass
class Settings:
    # LLM Konfigürasyonu
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://llmstat.iletisim.gov.tr/v1")
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "qwen-397b")

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
