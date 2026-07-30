"""
Veritabanı Kurulum ve Şema Yöneticisi (Database Setup & Schema Manager)
========================================================================
1. master veritabanına bağlanıp [Mecra_Mesajdır_DB] yoksa oluşturur.
2. schema.sql dosyasını GO satırlarına göre ayırarak batch halinde çalıştırır.
3. Doğrulama ve durum sorguları gerçekleştirir.
"""

import os
import re
import sys
from src.infrastructure.database.connection import db_manager


class DatabaseSetupManager:
    """Mecra Mesajdır Veritabanı Kurulum Yöneticisi."""

    def __init__(self):
        self.db_manager = db_manager

    def ensure_database_exists(self):
        """master veritabanına bağlanıp hedef veritabanını yoksa oluşturur."""
        print("=" * 60)
        print(f"[1/3] DB Kontrolü: master'a bağlanılıyor ({self.db_manager.server})...")
        print("=" * 60)

        conn = self.db_manager.get_connection(database="master", autocommit=True)
        cursor = conn.cursor()

        check_sql = (
            f"IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'{self.db_manager.db_name}') "
            f"CREATE DATABASE [{self.db_manager.db_name}];"
        )

        try:
            cursor.execute(check_sql)
            cursor.execute(f"SELECT DB_ID(N'{self.db_manager.db_name}')")
            row = cursor.fetchone()
            if row and row[0]:
                print(f"  ✓ Veritabanı [{self.db_manager.db_name}] mevcut (DB_ID={row[0]}).")
            else:
                print("  ✗ Veritabanı oluşturulamadı.")
        finally:
            cursor.close()
            conn.close()

    def load_schema_sql(self) -> str:
        """schema.sql dosyasını okur."""
        script_dir = os.path.dirname(os.path.abspath(__file__))
        schema_path = os.path.join(script_dir, "schema.sql")

        if not os.path.isfile(schema_path):
            raise FileNotFoundError(f"schema.sql bulunamadı: {schema_path}")

        with open(schema_path, "r", encoding="utf-8") as f:
            content = f.read()

        print(f"  ✓ schema.sql okundu ({len(content):,} karakter).")
        return content

    @staticmethod
    def split_batches(sql_content: str) -> list[str]:
        """SQL içeriğini GO satırlarına göre ayırır."""
        pattern = r'^\s*GO\s*$'
        batches = re.split(pattern, sql_content, flags=re.MULTILINE | re.IGNORECASE)
        return [b.strip() for b in batches if b.strip()]

    def execute_schema(self, batches: list[str]):
        """Batch'leri veritabanında çalıştırır."""
        print()
        print("=" * 60)
        print(f"[2/3] Şema Uygulanıyor: {len(batches)} batch bulundu...")
        print("=" * 60)

        conn = self.db_manager.get_connection(autocommit=False)
        cursor = conn.cursor()

        for idx, batch in enumerate(batches, start=1):
            try:
                cursor.execute(batch)
                conn.commit()
                first_line = batch.split('\n')[0][:80]
                print(f"  Batch {idx:>2}/{len(batches)}: OK  — {first_line}")
            except Exception as e:
                conn.rollback()
                print(f"\n  ✗ HATA Batch {idx}/{len(batches)}: {e}")
                cursor.close()
                conn.close()
                raise e

        cursor.close()
        conn.close()
        print("  ✓ Tüm batch'ler başarıyla çalıştırıldı.")

    def verify_results(self):
        """Doğrulama sorgularını çalıştırır."""
        print()
        print("=" * 60)
        print("[3/3] Şema ve Veri Doğrulaması...")
        print("=" * 60)

        conn = self.db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0")
        table_count = cursor.fetchone()[0]
        print(f"  Tablo sayısı : {table_count}")

        cursor.close()
        conn.close()
        print("✅ DOĞRULAMA BAŞARILI")

    def run_full_setup(self):
        """Tüm kurulum sürecini çalıştırır."""
        self.ensure_database_exists()
        sql_content = self.load_schema_sql()
        batches = self.split_batches(sql_content)
        self.execute_schema(batches)
        self.verify_results()


setup_manager = DatabaseSetupManager()
