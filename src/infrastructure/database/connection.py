"""
MSSQL Veritabanı Bağlantı Yöneticisi (Connection Manager)
=========================================================
pyodbc ve Windows Authentication ile Microsoft SQL Server bağlantısı.
"""

from src.infrastructure.config.settings import settings

try:
    import pyodbc
except ImportError:
    pyodbc = None


class DatabaseConnectionManager:
    """MSSQL pyodbc bağlantı yöneticisi."""

    def __init__(self):
        self.driver = settings.MSSQL_DRIVER
        self.server = settings.MSSQL_SERVER
        self.db_name = settings.MSSQL_DATABASE
        self.trusted = settings.MSSQL_TRUSTED_CONNECTION

    def get_connection(self, database: str = None, autocommit: bool = False):
        """
        Belirtilen veritabanına pyodbc bağlantısı döndürür.
        database verilmezse varsayılan Mecra_Mesajdır_DB kullanılır.
        """
        if pyodbc is None:
            raise ImportError("pyodbc kütüphanesi kurulu değil. Lütfen 'pip install pyodbc' çalıştırın.")

        target_db = database or self.db_name
        conn_str = (
            f"DRIVER={self.driver};"
            f"SERVER={self.server};"
            f"DATABASE={target_db};"
            f"Trusted_Connection={self.trusted};"
        )
        return pyodbc.connect(conn_str, autocommit=autocommit)


db_manager = DatabaseConnectionManager()
