# 📡 Mecra Mesajdır (The Medium is the Message)

> **Yapay Zekâ Destekli Çoklu Mecra Mesaj Dönüşüm ve Kurumsal İletişim Analiz Platformu**

---

## 🏛️ Kurumsal Bağlam

Bu proje, **T.C. Cumhurbaşkanlığı İletişim Başkanlığı Bilgi İşlem Dairesi Başkanlığı** bünyesinde gerçekleştirilen **2026 Yaz Stajı** kapsamında geliştirilmiştir.

* **Geliştiriciler:** Muhammed Eren Aydın & Anıl Mert Külük
* **Kurum:** T.C. Cumhurbaşkanlığı İletişim Başkanlığı
* **Birim:** Bilgi İşlem Dairesi Başkanlığı

---

## 📖 Proje Hakkında ve Teorik Temel

**Mecra Mesajdır**, ünlü iletişim kuramcısı **Marshall McLuhan**'ın *"Mecra Mesajdır (The Medium is the Message)"* ilkesini yapay zekâ ve doğal dil işleme (NLP) teknolojileriyle harmanlayan kurumsal bir analiz platformudur.

Platform, tek bir çekirdek kurumsal mesajı farklı iletişim mecralarına (Sosyal Medya, Basın Bülteni, SMS/Duyuru, Resmi Yazışma vb.) uygun biçimde yeniden dönüştürür. Dönüştürülen bu içerikleri; **anlamsal sapma**, **bilgi kaybı**, **duygu değişimi**, **belirsizlik** ve **eylem çağrısı (CTA) etkinliği** yönünden çok boyutlu olarak analiz eder.

```
[ Çekirdek Mesaj ] ──► [ LLM Transformer Engine ] ──► [ Hedef Mecra Mesajları ]
                                                              │
                                                              ▼
[ Kurumsal Dashboard ] ◄── [ 5 Boyutlu NLP Analiz Motoru ] ◄──┘
```

---

## 🚀 Temel Özellikler

* **Çoklu Mecra Dönüşümü:** Çekirdek mesajı mecra üslup ve sınırlamalarına uygun olarak üretme (Qwen / LLM entegrasyonu).
* **Anlamsal Benzerlik & Bilgi Kaybı Analizi:** Cosine similarity ve SentenceTransformers ile mesajlar arası anlam korunumunu ölçme.
* **Türkçe Morfolojik CTA Analizi:** Stanza NLP kütüphanesi ile Türkçe eylem çağrılarını ve fiil kiplerini (Emir, İstek, Gereklilik) tespit etme.
* **Duygu & Yoğunluk Analizi:** Türkçe BERT modelleri, emoji ağırlıkları ve noktalama işaretleri ile duygu tonunu skorlama.
* **Belirsizlik (Ambiguity) Analizi:** Muğlak ifadeleri ve net olmayan anlatımları tespit etme.
* **Mesaj Bozulma Zinciri (Message Degradation Chain - MMD):** Mesajın mecralar arası ardışık aktarımındaki kırılma noktalarını (Breaking Points) simüle etme.
* **Kurumsal Dashboard (Frontend UI):** T.C. İletişim Başkanlığı görsel kimliğine uygun dark-mode SaaS arayüzü, Metin Karşılaştırma (Diff Viewer), Radar/Çubuk grafikleri ve PDF raporlama yeteneği.
* **MSSQL Veritabanı Entegrasyonu:** Analiz sonuçlarının, mesaj geçmişinin ve mecra metriklerinin kurumsal veritabanında saklanması.

---

## 🛠️ Teknoloji Yığını

| Katman | Teknolojiler |
| :--- | :--- |
| **Mimari** | Clean Architecture, SOLID, Async/Await |
| **Backend API** | Python 3.10+, FastAPI, Uvicorn, Pydantic |
| **AI / NLP** | Hugging Face Transformers, SentenceTransformers, Stanza NLP, PyTorch |
| **LLM Entegrasyonu** | Qwen-397B / OpenAI Uyumlu REST API |
| **Frontend** | HTML5, Modern Vanilla CSS3, JavaScript (ES6+), Chart.js, Lucide Icons |
| **Veritabanı** | Microsoft SQL Server (MSSQL), PyODBC / aioodbc |

---

## 🏗️ Proje Mimarisi (Clean Architecture)

Proje, bağımlılıkların içeriye doğru aktığı **Clean Architecture** prensiplerine göre yapılandırılmıştır:

```
src/
├── domain/                      # İş Kuralları ve Varlıklar (Core Entities & Interfaces)
│   ├── entities/               # Message, Channel, AnalysisResult
│   └── services/               # LLM & Analyzer Servis Arayüzleri
├── application/                 # Kullanım Senaryoları (Use Cases)
│   └── use_cases/              # TransformMessageUseCase, AnalyzeMessagesUseCase
├── infrastructure/              # Dış Servisler ve Veri Katmanı
│   ├── analyzers/              # Semantic, CTA, Sentiment, Ambiguity, Degradation Analyzer'lar
│   ├── llm/                    # LLM Transformer Servisi & Prompt Şablonları
│   ├── database/               # MSSQL Bağlantı, Şema DDL ve Repository
│   └── config/                 # Settings & Ortam Değişkenleri
└── server.py / run.py           # FastAPI Web Sunucusu ve CLI Giriş Noktası
```

---

## 💻 Kurulum ve Çalıştırma

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/merenaydin23/mecra-mesajdir.git
cd mecra-mesajdir
```

### 2. Sanal Ortam Oluşturun ve Bağımlılıkları Yükleyin
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Ortam Değişkenlerini Ayarlayın
`.env.example` dosyasını `.env` olarak kopyalayın ve gerekli API anahtarlarını tanımlayın:
```bash
cp .env.example .env
```
`.env` içeriği:
```ini
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://llmstat.iletisim.gov.tr/v1
LLM_MODEL_NAME=qwen-397b
```

### 4. Backend Sunucusunu Çalıştırın
```bash
python run.py
# veya
uvicorn server:app --reload --port 8000
```
API Dokümantasyonu: `http://localhost:8000/docs`

### 5. Frontend Arayüzünü Açın
`frontend/index.html` dosyasını tarayıcınızda açabilir veya bir yerel web sunucusu (Live Server vb.) ile başlatabilirsiniz.

---

## 📊 Ekran Görüntüleri ve Arayüz

Kurumsal Frontend Arayüzü;
* **Genel Bakış Dashboard'u:** Toplam analizler, ortalama skorlar ve mecra dağılımları.
* **Dönüştürücü & Metin Karşılaştırma (Diff Viewer):** Çekirdek mesaj ile üretilen mecra metni arasındaki farkların kelime bazlı vurgulanması.
* **Metrik & Radar Grafikleri:** Anlamsal korunum, duygu tonu ve CTA etkinliğinin görselleştirilmesi.
* **PDF Raporlama:** Analiz çıktılarının kurumsal formatta indirilmesi.

---

## 📜 Lisans ve Telif

Bu proje, **T.C. Cumhurbaşkanlığı İletişim Başkanlığı Bilgi İşlem Dairesi Başkanlığı** bünyesinde geliştirilmiştir. Tüm hakları saklıdır.
