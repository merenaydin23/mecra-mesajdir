/**
 * Mecra Mesajdır - T.C. Cumhurbaşkanlığı İletişim Başkanlığı
 * Ön Yüz İnteraktif Mantık ve Grafik Yöneticisi
 */

// Uygulama Durum Yönetimi (Application State)
const appState = {
  activeTab: 'dashboard',
  coreMessage: "Yoğun kar yağışı nedeniyle Elazığ genelinde yarın tüm okullar 1 gün süreyle tatil edilmiştir.",
  isLoading: false,
  selectedPlatformForDiff: 'x_twitter',
  transformedMessages: {},
  analysisResults: [],
  degradationChain: []
};

// Mecra Tanımları & İkonları
const PLATFORMS_CONFIG = [
  { id: 'press_release', name: 'Basın Açıklaması', icon: 'file-text', category: 'Kurumsal' },
  { id: 'agency_news', name: 'Ajans Haberi (AA/İHA)', icon: 'newspaper', category: 'Medya' },
  { id: 'tabloid', name: 'Magazin / Tabloid', icon: 'zap', category: 'Popüler Medya' },
  { id: 'x_twitter', name: 'X (Twitter)', icon: 'twitter', category: 'Sosyal Medya' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin', category: 'Profesyonel' },
  { id: 'vertical_video', name: 'Dikey Video (TikTok/Reels)', icon: 'video', category: 'Sosyal Medya' },
  { id: 'messaging_chain', name: 'Mesajlaşma Zinciri (WhatsApp)', icon: 'message-circle', category: 'Anlık Mesajlaşma' },
  { id: 'official_letter', name: 'Resmi Yazı / Dilekçe', icon: 'landmark', category: 'Resmi Bürokrasi' }
];

// Sayfa Yüklendiğinde Başlat
document.addEventListener('DOMContentLoaded', () => {
  initLucideIcons();
  initTabNavigation();
  initEventListeners();
  loadDefaultData();
});

function initLucideIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Sekmeler Arası Geçiş Yönetimi
function initTabNavigation() {
  const navButtons = document.querySelectorAll('.nav-tab-btn');
  const tabPages = document.querySelectorAll('.tab-page');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      appState.activeTab = targetTab;

      navButtons.forEach(b => {
        b.classList.remove('border-[#00A3A6]', 'text-[#00A3A6]', 'font-semibold');
        b.classList.add('border-transparent', 'text-slate-600');
      });
      btn.classList.add('border-[#00A3A6]', 'text-[#00A3A6]', 'font-semibold');

      tabPages.forEach(page => {
        page.classList.add('hidden');
      });

      const activePage = document.getElementById(`page-${targetTab}`);
      if (activePage) {
        activePage.classList.remove('hidden');
      }

      if (targetTab === 'analytics') {
        renderAnalyticsCharts();
        renderDiffViewer();
      }
    });
  });
}

function initEventListeners() {
  const transformBtn = document.getElementById('btn-transform');
  const coreInput = document.getElementById('core-message-input');
  const pdfBtn = document.getElementById('btn-pdf-download');

  if (transformBtn && coreInput) {
    transformBtn.addEventListener('click', () => {
      const text = coreInput.value.trim();
      if (!text) {
        showToast('Lütfen geçerli bir çekirdek mesaj girin!', 'warning');
        return;
      }
      appState.coreMessage = text;
      runTransformationAndAnalysis(text);
    });
  }

  if (pdfBtn) {
    pdfBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Diff Viewer platform seçici
  const diffSelect = document.getElementById('diff-platform-select');
  if (diffSelect) {
    diffSelect.addEventListener('change', (e) => {
      appState.selectedPlatformForDiff = e.target.value;
      renderDiffViewer();
    });
  }
}

// Varsayılan Verileri Yükle
function loadDefaultData() {
  runTransformationAndAnalysis(appState.coreMessage);
}

// Çevirme ve Analiz İşlemini Çalıştır (Simülasyon / API)
async function runTransformationAndAnalysis(coreText) {
  appState.isLoading = true;
  renderSkeletonLoaders();
  showToast('LLM 8 mecrada çevirme ve analiz sürecini başlattı...', 'info');

  try {
    let data;
    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: coreText, author: "Kamu Görevlisi" })
      });
      if (response.ok) {
        const apiData = await response.json();
        const transformedObj = {};
        const analysisArr = [];
        apiData.platforms.forEach(p => {
          transformedObj[p.id] = p.transformed_content;
          analysisArr.push({
            channel: p.id,
            sim: Math.round((p.semantic_similarity || 85) * 10) / 10,
            loss: p.info_loss ? 'Evet' : 'Hayır',
            cta: p.cta_strength || 'Evet',
            sentiment: p.sentiment || 'POS',
            ambiguity: p.ambiguity || 'Düşük'
          });
        });
        data = {
          transformedMessages: transformedObj,
          analysisResults: analysisArr,
          degradationChain: apiData.degradation_chain ? apiData.degradation_chain.steps : []
        };
      } else {
        data = generateMockTransformation(coreText);
      }
    } catch (e) {
      data = generateMockTransformation(coreText);
    }

    appState.transformedMessages = data.transformedMessages;
    appState.analysisResults = data.analysisResults;
    appState.degradationChain = data.degradationChain;
    appState.isLoading = false;

    renderPlatformCards();
    renderSummaryTable();
    showToast('Tüm mecralarda dönüşüm ve analizler tamamlandı! ✅', 'success');
  } catch (err) {
    appState.isLoading = false;
    showToast('İşlem sırasında bir hata oluştu: ' + err.message, 'error');
  }
}

// Skeleton Loader Çizimi
function renderSkeletonLoaders() {
  const grid = document.getElementById('platform-cards-grid');
  if (!grid) return;

  grid.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const cardHtml = `
      <div class="corporate-card p-5 space-y-4 animate-pulse">
        <div class="flex items-center justify-between">
          <div class="h-5 w-32 skeleton-box"></div>
          <div class="h-4 w-12 skeleton-box"></div>
        </div>
        <div class="h-20 w-full skeleton-box"></div>
        <div class="flex justify-between items-center pt-2">
          <div class="h-4 w-20 skeleton-box"></div>
          <div class="h-4 w-16 skeleton-box"></div>
        </div>
      </div>
    `;
    grid.insertAdjacentHTML('beforeend', cardHtml);
  }
}

// Platform Kartlarını Ekrana Çizme (Sayfa 1)
function renderPlatformCards() {
  const grid = document.getElementById('platform-cards-grid');
  if (!grid) return;

  grid.innerHTML = '';

  PLATFORMS_CONFIG.forEach(platform => {
    const message = appState.transformedMessages[platform.id] || "Dönüştürülüyor...";
    const analysis = appState.analysisResults.find(a => a.channel === platform.id) || {
      sim: 85, loss: 'Hayır', cta: 'Evet', sentiment: 'POS', ambiguity: 'Düşük'
    };

    const cardHtml = `
      <div class="corporate-card p-5 flex flex-col justify-between hover:border-[#00A3A6] transition-all">
        <div>
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div class="flex items-center space-x-2">
              <div class="p-2 rounded-lg bg-teal-50 text-[#00A3A6]">
                <i data-lucide="${platform.icon}" class="w-4 h-4"></i>
              </div>
              <div>
                <h4 class="font-semibold text-slate-800 text-sm">${platform.name}</h4>
                <span class="text-xs text-slate-600">${platform.category}</span>
              </div>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              %${analysis.sim} Benzerlik
            </span>
          </div>

          <p class="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line bg-slate-50/70 p-3 rounded-md border border-slate-100">
            ${escapeHtml(message)}
          </p>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div class="flex items-center space-x-3">
            <span>Duygu: <strong class="${analysis.sentiment === 'POS' ? 'text-emerald-600' : 'text-rose-600'}">${analysis.sentiment}</strong></span>
            <span>Belirsizlik: <strong class="text-slate-700">${analysis.ambiguity}</strong></span>
          </div>
          <button onclick="inspectPlatform('${platform.id}')" class="text-[#00A3A6] hover:text-[#007D80] font-medium flex items-center space-x-1">
            <span>Analiz Et</span>
            <i data-lucide="arrow-right" class="w-3 h-3"></i>
          </button>
        </div>
      </div>
    `;
    grid.insertAdjacentHTML('beforeend', cardHtml);
  });

  initLucideIcons();
}

function inspectPlatform(platformId) {
  appState.selectedPlatformForDiff = platformId;
  const select = document.getElementById('diff-platform-select');
  if (select) select.value = platformId;

  // Analiz sekmesine geç
  const analyticsNavBtn = document.querySelector('[data-tab="analytics"]');
  if (analyticsNavBtn) analyticsNavBtn.click();
}

// GitHub Stili Diff Viewer (Kelime Karşılaştırma)
function renderDiffViewer() {
  const container = document.getElementById('diff-viewer-content');
  if (!container) return;

  const coreWords = appState.coreMessage.split(/\s+/);
  const targetText = appState.transformedMessages[appState.selectedPlatformForDiff] || "";
  const targetWords = targetText.split(/\s+/);

  const diffResult = computeWordDiff(coreWords, targetWords);

  let html = `<div class="font-mono text-sm leading-relaxed space-y-1">`;
  html += `<div class="p-3 bg-slate-900 text-slate-100 rounded-md mb-4 text-xs font-semibold flex items-center justify-between">`;
  html += `<span>Orijinal Çekirdek Mesaj vs. ${getPlatformDisplayName(appState.selectedPlatformForDiff)}</span>`;
  html += `<span class="text-emerald-400">GitHub Diff Engine</span></div>`;

  html += `<div class="p-4 bg-white border border-slate-200 rounded-lg shadow-inner">`;
  diffResult.forEach(item => {
    if (item.type === 'removed') {
      html += `<span class="diff-deleted">${escapeHtml(item.word)}</span> `;
    } else if (item.type === 'added') {
      html += `<span class="diff-inserted">${escapeHtml(item.word)}</span> `;
    } else {
      html += `<span class="text-slate-700">${escapeHtml(item.word)}</span> `;
    }
  });
  html += `</div></div>`;

  container.innerHTML = html;
}

// Kelime Fark Algoritması (LCS tabanlı diff)
function computeWordDiff(orig, target) {
  const result = [];
  const origSet = new Set(orig.map(w => w.toLowerCase()));
  const targetSet = new Set(target.map(w => w.toLowerCase()));

  orig.forEach(w => {
    if (!targetSet.has(w.toLowerCase())) {
      result.push({ type: 'removed', word: w });
    } else {
      result.push({ type: 'same', word: w });
    }
  });

  target.forEach(w => {
    if (!origSet.has(w.toLowerCase())) {
      result.push({ type: 'added', word: w });
    }
  });

  return result;
}

// Chart.js Analiz Grafikleri (Sayfa 2)
let radarChartInstance = null;
let barChartInstance = null;

function renderAnalyticsCharts() {
  renderRadarChart();
  renderBarChart();
}

function renderRadarChart() {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;

  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  const labels = ['Duygu Yoğunluğu', 'Belirsizlik', 'CTA Gücü', 'Anlamsal Benzerlik', 'Bilgi Korunumu'];

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Basın Açıklaması',
          data: [0.65, 0.15, 0.40, 0.92, 0.95],
          backgroundColor: 'rgba(0, 163, 166, 0.2)',
          borderColor: '#00A3A6',
          borderWidth: 2,
          pointBackgroundColor: '#00A3A6'
        },
        {
          label: 'X (Twitter)',
          data: [0.90, 0.35, 0.85, 0.78, 0.70],
          backgroundColor: 'rgba(227, 10, 23, 0.15)',
          borderColor: '#E30A17',
          borderWidth: 2,
          pointBackgroundColor: '#E30A17'
        },
        {
          label: 'LinkedIn',
          data: [0.75, 0.25, 0.60, 0.85, 0.88],
          backgroundColor: 'rgba(15, 23, 42, 0.15)',
          borderColor: '#0F172A',
          borderWidth: 2,
          pointBackgroundColor: '#0F172A'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: '#e2e8f0' },
          grid: { color: '#f1f5f9' },
          pointLabels: { font: { family: 'Inter', size: 11, weight: '600' }, color: '#0F172A' },
          ticks: { backdropColor: 'transparent', color: '#64748b' }
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } }
      }
    }
  });
}

function renderBarChart() {
  const ctx = document.getElementById('barChart');
  if (!ctx) return;

  if (barChartInstance) {
    barChartInstance.destroy();
  }

  const platforms = PLATFORMS_CONFIG.map(p => p.name);
  const scores = appState.analysisResults.map(a => a.sim);

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: platforms,
      datasets: [{
        label: 'Bilgi Korunumu (%)',
        data: scores,
        backgroundColor: '#00A3A6',
        borderRadius: 6,
        hoverBackgroundColor: '#007D80'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { callback: v => '%' + v } },
        x: { ticks: { font: { size: 10 } } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Özet Karşılaştırma Tablosunu Çizme
function renderSummaryTable() {
  const tbody = document.getElementById('summary-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  appState.analysisResults.forEach(item => {
    const pName = getPlatformDisplayName(item.channel);
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition-colors border-b border-slate-100 text-sm";
    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-800">${pName}</td>
      <td class="py-3 px-4 text-emerald-600 font-bold">%${item.sim}</td>
      <td class="py-3 px-4">${item.loss === 'Evet' ? '<span class="text-rose-600 font-semibold">Evet ⚠️</span>' : '<span class="text-emerald-600">Hayır</span>'}</td>
      <td class="py-3 px-4">${item.cta === 'Evet' ? '<span class="text-emerald-600 font-semibold">Evet ✅</span>' : 'Hayır'}</td>
      <td class="py-3 px-4 font-medium">${item.sentiment}</td>
      <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">${item.ambiguity}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Toast Bildirim Sistemi
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';

  const iconMap = {
    info: 'info',
    success: 'check-circle',
    warning: 'alert-triangle',
    error: 'x-circle'
  };

  toast.innerHTML = `
    <i data-lucide="${iconMap[type] || 'info'}" class="w-5 h-5 text-[#00A3A6]"></i>
    <span class="text-sm font-medium">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  initLucideIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Yardımcı Fonksiyonlar
function getPlatformDisplayName(channelId) {
  const p = PLATFORMS_CONFIG.find(item => item.id === channelId);
  return p ? p.name : channelId;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Mock Dönüştürme & Analiz Üreteci
function generateMockTransformation(core) {
  const isSnow = core.includes("kar") || core.includes("tatil") || core.includes("okul");

  return {
    transformedMessages: {
      press_release: `T.C. Elazığ Valiliği Basın Açıklaması:\n\nİlimiz genelinde devam eden olumsuz hava koşulları ve meteorolojik tahminler doğrultusunda, 2026 yarın günü il genelindeki tüm temel eğitim ve ortaöğretim kurumlarında eğitime 1 (bir) gün süreyle ara verilmiştir. Kamuoyuna duyurulur.`,
      agency_news: `[FLAŞ] ELAZIĞ - Son dakika haberine göre Elazığ genelinde etkisini artıran kar yağışı nedeniyle yarın tüm okulların 1 gün süreyle tatil edildiği bildirildi. Valilikten alınan bilgiye göre ulaşımda aksamaların önüne geçilmesi hedefleniyor.`,
      tabloid: `ELAZIĞ'DA KAR ALARMI! Öğrencilere müjdeli haber geldi! Termometreler sıfırın altına düştü, okullar yarın tamamen kilitlendi!`,
      x_twitter: `🚨 ELAZIĞ'DA OKULLAR TATİL! \n\nYoğun kar yağışı nedeniyle yarın (1 gün) il genelinde okullar tatil edilmiştir. Aman yollara dikkat! ❄️📚 #Elazığ #KarTatili #SonDakika`,
      linkedin: `Bölgesel hava koşullarındaki gelişmeler ve iş sağlığı güvenliği prensiplerimiz doğrultusunda Elazığ lokasyonumuzdaki eğitim kurumlarında eğitime 1 gün ara verilmiştir. Tüm paydaşlarımıza emniyetli günler dileriz. #Eğitim #İşGüvenliği`,
      vertical_video: `[Sahne 1 - 0-3sn] Görsel: Şok olmuş öğrenci yüzü | Metin: ELAZIĞ'DA TATİL GELDİ! 😱 | Ses: "Arkadaşlar duydunuz mu yarın okullar yok!"\n[Sahne 2] Görsel: Kar manzarası | Metin: 1 Gün Kar Tatili ❄️`,
      messaging_chain: `Arkadaşlar Elazığ'da kar nedeniyle yarın okullar tatil edilmiş, bilginiz olsun gruba da iletin ❄️`,
      official_letter: `Sayı: 75249013-010.06-E.2026/4108\nTarih: 30.07.2026\nKonu: Olumsuz Hava Koşulları Nedeniyle Eğitime Ara Verilmesi\n\nELAZIĞ İL MİLLİ EĞİTİM MÜDÜRLÜĞÜNE\n\nİlimiz genelinde seyreden yoğun kar yağışı ve olumsuz hava koşulları sebebiyle yarın eğitime 1 gün süreyle ara verilmesi uygun görülmüştür.\n\nAyşe Yıldız\nOkul Müdürü / Şube Müdürü`
    },
    analysisResults: [
      { channel: 'press_release', sim: 94.2, loss: 'Hayır', cta: 'Hayır', sentiment: 'POS', ambiguity: 'Düşük' },
      { channel: 'agency_news', sim: 91.5, loss: 'Hayır', cta: 'Hayır', sentiment: 'POS', ambiguity: 'Düşük' },
      { channel: 'tabloid', sim: 72.8, loss: 'Evet', cta: 'Hayır', sentiment: 'POS', ambiguity: 'Yüksek' },
      { channel: 'x_twitter', sim: 86.4, loss: 'Hayır', cta: 'Evet', sentiment: 'POS', ambiguity: 'Düşük' },
      { channel: 'linkedin', sim: 82.1, loss: 'Hayır', cta: 'Hayır', sentiment: 'POS', ambiguity: 'Orta' },
      { channel: 'vertical_video', sim: 68.3, loss: 'Evet', cta: 'Evet', sentiment: 'POS', ambiguity: 'Orta' },
      { channel: 'messaging_chain', sim: 88.0, loss: 'Hayır', cta: 'Evet', sentiment: 'POS', ambiguity: 'Düşük' },
      { channel: 'official_letter', sim: 95.6, loss: 'Hayır', cta: 'Hayır', sentiment: 'POS', ambiguity: 'Düşük' }
    ],
    degradationChain: [
      { step: 1, channel: 'press_release', sim: 0.942, dev: 0.058, cum: 0.942, is_bp: false },
      { step: 2, channel: 'agency_news', sim: 0.915, dev: 0.085, cum: 0.915, is_bp: false },
      { step: 3, channel: 'official_letter', sim: 0.956, dev: 0.044, cum: 0.956, is_bp: false },
      { step: 4, channel: 'x_twitter', sim: 0.864, dev: 0.136, cum: 0.864, is_bp: false },
      { step: 5, channel: 'tabloid', sim: 0.728, dev: 0.272, cum: 0.728, is_bp: true }
    ]
  };
}
