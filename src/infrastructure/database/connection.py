"""
MSSQL Veritabanı Bağlantı Yöneticisi (Connection Manager)
=========================================================
pyodbc + Windows Authentication. DB yoksa sistem JSON geçmiş ile devam eder.
"""

import os
from typing import Optional

from src.infrastructure.config.settings import settings

try:
    import pyodbc
except ImportError:
    pyodbc = None


class DatabaseConnectionManager:
    """MSSQL pyodbc bağlantı yöneticisi (opsiyonel)."""

    def __init__(self):
        self.driver = os.getenv("MSSQL_DRIVER") or settings.MSSQL_DRIVER
        self.server = os.getenv("MSSQL_SERVER") or settings.MSSQL_SERVER
        self.db_name = os.getenv("MSSQL_DATABASE") or settings.MSSQL_DATABASE
        self.trusted = os.getenv("MSSQL_TRUSTED_CONNECTION") or settings.MSSQL_TRUSTED_CONNECTION
        self.enabled_mode = (os.getenv("MSSQL_ENABLED") or "auto").strip().lower()
        self._available: Optional[bool] = None
        self._last_error: str = ""

    def is_enabled(self) -> bool:
        if self.enabled_mode in ("0", "false", "no", "off"):
            return False
        if self.enabled_mode in ("1", "true", "yes", "on"):
            return True
        # auto
        return self.check_available()

    def check_available(self, force: bool = False) -> bool:
        """Kısa timeout ile bağlantı dener; sonucu cache'ler."""
        if self._available is not None and not force:
            return self._available
        if pyodbc is None:
            self._available = False
            self._last_error = "pyodbc kurulu değil"
            return False
        try:
            conn = self.get_connection(database="master", autocommit=True, timeout=3)
            conn.close()
            self._available = True
            self._last_error = ""
            return True
        except Exception as e:
            self._available = False
            self._last_error = str(e)[:240]
            return False

    def status(self) -> dict:
        available = self.check_available()
        return {
            "mode": self.enabled_mode,
            "enabled": self.is_enabled(),
            "available": available,
            "server": self.server,
            "database": self.db_name,
            "error": self._last_error if not available else "",
        }

    def get_connection(self, database: str = None, autocommit: bool = False, timeout: int = 15):
        if pyodbc is None:
            raise ImportError("pyodbc kütüphanesi kurulu değil. Lütfen 'pip install pyodbc' çalıştırın.")

        target_db = database or self.db_name
        conn_str = (
            f"DRIVER={self.driver};"
            f"SERVER={self.server};"
            f"DATABASE={target_db};"
            f"Trusted_Connection={self.trusted};"
        )
        return pyodbc.connect(conn_str, autocommit=autocommit, timeout=timeout)


db_manager = DatabaseConnectionManager()
