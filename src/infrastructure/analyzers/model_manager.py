"""
Model Yöneticisi (Model Manager)
================================
Ağır NLP modellerinin (SentenceTransformer, BERT) singleton (tekil) olarak
bellekte bir kez yüklenip diğer analizörler tarafından paylaşılmasını sağlar.
Bu sayede RAM/VRAM tasarrufu sağlanır ve model yükleme süreleri ortadan kalkar.
"""

import threading
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from sentence_transformers import SentenceTransformer

SENTENCE_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
SENTIMENT_MODEL_NAME = "savasy/bert-base-turkish-sentiment-cased"

class ModelManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ModelManager, cls).__new__(cls)
                cls._instance._init_state()
            return cls._instance

    def _init_state(self):
        self._sentence_model = None
        self._sentiment_tokenizer = None
        self._sentiment_model = None
        self._sentiment_device = None
        self._sentence_lock = threading.Lock()
        self._sentiment_lock = threading.Lock()

    def get_sentence_model(self):
        """SentenceTransformer modelini lazy loading ile döndürür."""
        if self._sentence_model is None:
            with self._sentence_lock:
                if self._sentence_model is None:
                    print(f"🔄 [MODEL MANAGER] SentenceTransformer modeli ({SENTENCE_MODEL_NAME}) yükleniyor...")
                    try:
                        self._sentence_model = SentenceTransformer(SENTENCE_MODEL_NAME)
                        print("✅ [MODEL MANAGER] SentenceTransformer modeli hazır!")
                    except Exception as e:
                        print(f"⚠️ [MODEL MANAGER UYARI] SentenceTransformer modeli yüklenemedi: {e}")
                        self._sentence_model = "FAILED"
        return None if self._sentence_model == "FAILED" else self._sentence_model

    def get_sentiment_model(self):
        """BERT Duygu modelini ve tokenizer'ını lazy loading ile döndürür. (tokenizer, model, device)"""
        if self._sentiment_model is None:
            with self._sentiment_lock:
                if self._sentiment_model is None:
                    print(f"🔄 [MODEL MANAGER] BERT Duygu Modeli ({SENTIMENT_MODEL_NAME}) yükleniyor...")
                    try:
                        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                        tokenizer = AutoTokenizer.from_pretrained(SENTIMENT_MODEL_NAME)
                        model = AutoModelForSequenceClassification.from_pretrained(SENTIMENT_MODEL_NAME)
                        model.to(device)
                        model.eval()
                        
                        self._sentiment_tokenizer = tokenizer
                        self._sentiment_model = model
                        self._sentiment_device = device
                        print(f"✅ [MODEL MANAGER] BERT Duygu Modeli {device.type.upper()} üzerinde başarıyla yüklendi!")
                    except Exception as e:
                        print(f"⚠️ [MODEL MANAGER UYARI] BERT Duygu modeli yüklenemedi: {e}")
                        self._sentiment_model = "FAILED"
        
        if self._sentiment_model == "FAILED":
            return None, None, None
            
        return self._sentiment_tokenizer, self._sentiment_model, self._sentiment_device

# Global singleton referansı
model_manager = ModelManager()
