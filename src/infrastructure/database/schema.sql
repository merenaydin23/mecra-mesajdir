-- =============================================================
-- Mecra Mesajdır (MERT) — Veritabanı Şeması
-- Hedef: MSSQL Server (SQL Server Express)
-- Database: [Mecra_Mesajdır_DB]
-- Idempotent: Bu script birden fazla kez çalıştırılabilir.
-- =============================================================

-- =============================================================
-- ADIM 1: TABLOLARI OLUŞTUR (bağımlılık sırasına göre DROP)
-- =============================================================

IF OBJECT_ID(N'dbo.DegradationScores', N'U') IS NOT NULL
    DROP TABLE dbo.DegradationScores;
GO

IF OBJECT_ID(N'dbo.Messages', N'U') IS NOT NULL
    DROP TABLE dbo.Messages;
GO

IF OBJECT_ID(N'dbo.Platforms', N'U') IS NOT NULL
    DROP TABLE dbo.Platforms;
GO

IF OBJECT_ID(N'dbo.Campaigns', N'U') IS NOT NULL
    DROP TABLE dbo.Campaigns;
GO

-- ---------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------
CREATE TABLE dbo.Campaigns
(
    CampaignID   INT            IDENTITY(1,1) NOT NULL,
    Title        NVARCHAR(200)  NOT NULL,
    Description  NVARCHAR(1000) NULL,
    CreatedAt    DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Campaigns PRIMARY KEY CLUSTERED (CampaignID)
);
GO

-- ---------------------------------------------------------
-- Platforms
-- ---------------------------------------------------------
CREATE TABLE dbo.Platforms
(
    PlatformID        INT           IDENTITY(1,1) NOT NULL,
    PlatformName      NVARCHAR(100) NOT NULL,
    MaxCharacterLimit INT           NULL,

    CONSTRAINT PK_Platforms PRIMARY KEY CLUSTERED (PlatformID)
);
GO

-- ---------------------------------------------------------
-- Messages
-- ---------------------------------------------------------
CREATE TABLE dbo.Messages
(
    MessageID       INT            IDENTITY(1,1) NOT NULL,
    CampaignID      INT            NOT NULL,
    PlatformID      INT            NOT NULL,
    ParentMessageID INT            NULL,
    StepOrder       INT            NOT NULL,
    MessageText     NVARCHAR(MAX)  NOT NULL,
    CreatedAt       DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Messages PRIMARY KEY CLUSTERED (MessageID),

    CONSTRAINT FK_Messages_Campaigns
        FOREIGN KEY (CampaignID) REFERENCES dbo.Campaigns (CampaignID)
        ON DELETE NO ACTION ON UPDATE NO ACTION,

    CONSTRAINT FK_Messages_Platforms
        FOREIGN KEY (PlatformID) REFERENCES dbo.Platforms (PlatformID)
        ON DELETE NO ACTION ON UPDATE NO ACTION,

    CONSTRAINT FK_Messages_ParentMessage
        FOREIGN KEY (ParentMessageID) REFERENCES dbo.Messages (MessageID)
        ON DELETE NO ACTION ON UPDATE NO ACTION,

    CONSTRAINT CK_Messages_StepOrder CHECK (StepOrder >= 0)
);
GO

-- ---------------------------------------------------------
-- DegradationScores
-- ---------------------------------------------------------
CREATE TABLE dbo.DegradationScores
(
    ScoreID              INT          IDENTITY(1,1) NOT NULL,
    MessageID            INT          NOT NULL,
    SequentialSimilarity DECIMAL(5,4) NOT NULL,
    CumulativeSimilarity DECIMAL(5,4) NOT NULL,
    IsBreakingPoint      BIT          NOT NULL DEFAULT 0,
    InfoLossOccurred     BIT          NOT NULL DEFAULT 0,
    InfoLossRate         DECIMAL(5,4) NOT NULL DEFAULT 0,
    HasCTA               BIT          NOT NULL DEFAULT 0,
    SentimentLabel       NVARCHAR(50) NULL,
    AmbiguityLevel       NVARCHAR(50) NULL,

    CONSTRAINT PK_DegradationScores PRIMARY KEY CLUSTERED (ScoreID),

    CONSTRAINT FK_DegradationScores_Messages
        FOREIGN KEY (MessageID) REFERENCES dbo.Messages (MessageID)
        ON DELETE NO ACTION ON UPDATE NO ACTION,

    CONSTRAINT CK_DegradationScores_SeqSim
        CHECK (SequentialSimilarity >= 0 AND SequentialSimilarity <= 1),

    CONSTRAINT CK_DegradationScores_CumSim
        CHECK (CumulativeSimilarity >= 0 AND CumulativeSimilarity <= 1),

    CONSTRAINT CK_DegradationScores_InfoLossRate
        CHECK (InfoLossRate >= 0 AND InfoLossRate <= 1)
);
GO

-- =============================================================
-- PERFORMANS İNDEKSLERİ (FK kolonları)
-- =============================================================

CREATE NONCLUSTERED INDEX IX_Messages_CampaignID
    ON dbo.Messages (CampaignID);
GO

CREATE NONCLUSTERED INDEX IX_Messages_PlatformID
    ON dbo.Messages (PlatformID);
GO

CREATE NONCLUSTERED INDEX IX_Messages_ParentMessageID
    ON dbo.Messages (ParentMessageID);
GO

CREATE NONCLUSTERED INDEX IX_DegradationScores_MessageID
    ON dbo.DegradationScores (MessageID);
GO

-- =============================================================
-- ADIM 2: RECURSIVE VIEW — vw_MessageChain
-- =============================================================

CREATE OR ALTER VIEW dbo.vw_MessageChain
AS
WITH MessageCTE AS
(
    -- Anchor: Kök mesajlar (ParentMessageID IS NULL)
    SELECT
        m.CampaignID,
        m.MessageID,
        m.ParentMessageID,
        p.PlatformName,
        m.StepOrder,
        m.MessageText,
        0 AS ChainDepth
    FROM dbo.Messages AS m
    INNER JOIN dbo.Platforms AS p ON p.PlatformID = m.PlatformID
    WHERE m.ParentMessageID IS NULL

    UNION ALL

    -- Recursive: Çocuk mesajlar
    SELECT
        child.CampaignID,
        child.MessageID,
        child.ParentMessageID,
        pc.PlatformName,
        child.StepOrder,
        child.MessageText,
        parent.ChainDepth + 1
    FROM dbo.Messages AS child
    INNER JOIN MessageCTE AS parent ON parent.MessageID = child.ParentMessageID
    INNER JOIN dbo.Platforms AS pc ON pc.PlatformID = child.PlatformID
)
SELECT
    CampaignID,
    MessageID,
    ParentMessageID,
    PlatformName,
    StepOrder,
    MessageText,
    ChainDepth
FROM MessageCTE;
GO
