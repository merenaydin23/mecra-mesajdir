"""
Uygulama Konfigürasyonu
========================
Ortam değişkenlerini ve LLM ayarlarını yönetir.
"""

import os
from dataclasses import dataclass


@dataclass
class Settings:
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://llmstat.iletisim.gov.tr/v1")
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "qwen-397b")


settings = Settings()
