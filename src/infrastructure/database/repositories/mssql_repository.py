"""
MSSQL Veritabanı Repository İmplementasyonu (Infrastructure Katmanı)
====================================================================
Çekirdek mesajları, platform çıktılarını ve Bozulma Skolarını MSSQL veritabanına kaydeder.
"""

from typing import List, Optional
from src.domain.entities.message import CoreMessage, TransformedMessage
from src.domain.entities.analysis_result import DegradationChainResult, CombinedAnalysisResult
from src.domain.entities.channel import CHANNEL_NAMES
from src.infrastructure.database.connection import db_manager


class MSSQLRepository:
    """MSSQL Veri Kayıt Repository'si."""

    def __init__(self):
        self.db_manager = db_manager

    def save_analysis_session(
        self,
        core_message: CoreMessage,
        transformed_messages: List[TransformedMessage],
        degradation_result: Optional[DegradationChainResult] = None,
        analysis_results: Optional[List[CombinedAnalysisResult]] = None,
        campaign_title: str = "Mecra Mesajdır Analiz Kampanyası",
    ) -> int:
        """
        Bir analiz oturumunu MSSQL veritabanına kaydeder:
        1. dbo.Campaigns tablosuna yeni kampanya ekler.
        2. dbo.Platforms tablosunda mecraları sorgular/ekler.
        3. dbo.Messages tablosuna Core Message ve Transformed Message'ları hiyerarşik ekler.
        4. dbo.DegradationScores tablosuna bozulma skorlarını ekler.

        Returns:
            Oluşturulan CampaignID.
        """
        conn = self.db_manager.get_connection(autocommit=False)
        cursor = conn.cursor()

        try:
            # 1. Kampanya Oluştur
            cursor.execute(
                "INSERT INTO dbo.Campaigns (Title, Description) VALUES (?, ?);",
                (campaign_title, f"Girdi: {core_message.content[:100]}..."),
            )
            cursor.execute("SELECT SCOPE_IDENTITY();")
            campaign_id = int(cursor.fetchone()[0])

            # 2. Platform Haritasını Hazırla (PlatformName -> PlatformID)
            platform_map = {}
            cursor.execute("SELECT PlatformName, PlatformID FROM dbo.Platforms;")
            for row in cursor.fetchall():
                platform_map[row[0].lower()] = row[1]

            # Eksik platformları ekle
            for msg in transformed_messages:
                p_name = CHANNEL_NAMES.get(msg.channel, msg.channel.value)
                if p_name.lower() not in platform_map:
                    cursor.execute(
                        "INSERT INTO dbo.Platforms (PlatformName, MaxCharacterLimit) VALUES (?, ?);",
                        (p_name, msg.channel.max_length if hasattr(msg.channel, 'max_length') else None),
                    )
                    cursor.execute("SELECT SCOPE_IDENTITY();")
                    platform_map[p_name.lower()] = int(cursor.fetchone()[0])

            # Core platform ekle (yoksa)
            if "core" not in platform_map:
                cursor.execute("INSERT INTO dbo.Platforms (PlatformName) VALUES ('Core');")
                cursor.execute("SELECT SCOPE_IDENTITY();")
                platform_map["core"] = int(cursor.fetchone()[0])

            # 3. Core Mesajı Kaydet (ParentMessageID = NULL, StepOrder = 0)
            cursor.execute(
                """
                INSERT INTO dbo.Messages (CampaignID, PlatformID, ParentMessageID, StepOrder, MessageText)
                VALUES (?, ?, NULL, 0, ?);
                """,
                (campaign_id, platform_map["core"], core_message.content),
            )
            cursor.execute("SELECT SCOPE_IDENTITY();")
            core_msg_id = int(cursor.fetchone()[0])

            # Core mesaj skor kaydı
            cursor.execute(
                """
                INSERT INTO dbo.DegradationScores (MessageID, SequentialSimilarity, CumulativeSimilarity, IsBreakingPoint, InfoLossOccurred, InfoLossRate, HasCTA, SentimentLabel, AmbiguityLevel)
                VALUES (?, 1.0000, 1.0000, 0, 0, 0.0000, 0, NULL, NULL);
                """,
                (core_msg_id,),
            )

            # 4. Mecra Mesajlarını ve Bozulma Skorlarını Kaydet
            parent_id = core_msg_id
            deg_map = {}
            if degradation_result and degradation_result.steps:
                deg_map = {step.channel: step for step in degradation_result.steps}

            for idx, msg in enumerate(transformed_messages, start=1):
                p_name = CHANNEL_NAMES.get(msg.channel, msg.channel.value)
                p_id = platform_map[p_name.lower()]

                cursor.execute(
                    """
                    INSERT INTO dbo.Messages (CampaignID, PlatformID, ParentMessageID, StepOrder, MessageText)
                    VALUES (?, ?, ?, ?, ?);
                    """,
                    (campaign_id, p_id, parent_id, idx, msg.transformed_content),
                )
                cursor.execute("SELECT SCOPE_IDENTITY();")
                msg_db_id = int(cursor.fetchone()[0])
                parent_id = msg_db_id  # Zincirleme hiyerarşi için parent güncelle

                # Bozulma Skorunu Kaydet
                deg_step = deg_map.get(msg.channel)
                seq_sim = deg_step.consecutive_similarity if deg_step else 1.0
                cum_sim = deg_step.cumulative_similarity if deg_step else 1.0
                is_bp = 1 if (deg_step and deg_step.is_breaking_point) else 0

                res_step = None
                if analysis_results:
                    for res in analysis_results:
                        if res.channel == msg.channel:
                            res_step = res
                            break

                info_loss_occ = 1 if (res_step and res_step.info_loss.info_loss_occurred) else 0
                info_loss_rate = res_step.info_loss.info_loss_rate if res_step else 0.0
                has_cta = 1 if (res_step and res_step.cta.has_cta) else 0
                sentiment_label = res_step.sentiment.label if res_step else None
                ambiguity_level = res_step.ambiguity.level if res_step else None

                cursor.execute(
                    """
                    INSERT INTO dbo.DegradationScores (MessageID, SequentialSimilarity, CumulativeSimilarity, IsBreakingPoint, InfoLossOccurred, InfoLossRate, HasCTA, SentimentLabel, AmbiguityLevel)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (msg_db_id, seq_sim, cum_sim, is_bp, info_loss_occ, info_loss_rate, has_cta, sentiment_label, ambiguity_level),
                )

            conn.commit()
            print(f"💾 [MSSQL DB] Analiz sonuçları başarıyla kaydedildi! (CampaignID={campaign_id})")
            return campaign_id

        except Exception as e:
            conn.rollback()
            print(f"⚠️ [MSSQL DB UYARI] Veritabanına kaydederken hata oluştu: {e}")
            return -1
        finally:
            cursor.close()
            conn.close()
