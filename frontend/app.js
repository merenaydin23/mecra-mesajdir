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

// Mecra Tanımları, İkonları ve Kurumsal Logoları
const CIB_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/%C4%B0leti%C5%9Fim_Ba%C5%9Fkanl%C4%B1%C4%9F%C4%B1_logo.svg/1280px-%C4%B0leti%C5%9Fim_Ba%C5%9Fkanl%C4%B1%C4%9F%C4%B1_logo.svg.png';

const PLATFORMS_CONFIG = [
  { 
    id: 'press_release', 
    name: 'Basın Açıklaması', 
    category: 'Kurumsal Devlet', 
    logoUrl: CIB_LOGO_URL,
    icon: 'file-text'
  },
  { 
    id: 'official_letter', 
    name: 'Resmi Yazı / Dilekçe', 
    category: 'Resmi Bürokrasi', 
    logoUrl: CIB_LOGO_URL,
    icon: 'landmark'
  },
  { 
    id: 'agency_news', 
    name: 'Ajans Haberi (AA/İHA)', 
    category: 'Medya & Basın', 
    svgIcon: '<svg class="w-5 h-5 text-blue-700 fill-current" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    icon: 'newspaper'
  },
  { 
    id: 'x_twitter', 
    name: 'X (Twitter)', 
    category: 'Sosyal Medya', 
    svgIcon: '<svg class="w-4 h-4 fill-slate-900" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    icon: 'twitter'
  },
  { 
    id: 'linkedin', 
    name: 'LinkedIn', 
    category: 'Profesyonel Ağ', 
    svgIcon: '<svg class="w-4 h-4 fill-[#0A66C2]" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.78a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z"/></svg>',
    icon: 'linkedin'
  },
  { 
    id: 'vertical_video', 
    name: 'Dikey Video (TikTok/Reels)', 
    category: 'Sosyal Medya', 
    svgIcon: '<svg class="w-4 h-4 fill-[#FE2C55]" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.58.07-5.38V.02z"/></svg>',
    icon: 'video'
  },
  { 
    id: 'messaging_chain', 
    name: 'Mesajlaşma Zinciri (WhatsApp)', 
    category: 'Anlık Mesajlaşma', 
    svgIcon: '<svg class="w-4 h-4 fill-[#25D366]" viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 16.59c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.32a8.188 8.188 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.188 8.188 0 0 1 2.41 5.83c.02 4.54-3.68 8.24-8.22 8.24z"/></svg>',
    icon: 'message-circle'
  },
  { 
    id: 'tabloid', 
    name: 'Magazin / Tabloid', 
    category: 'Popüler Medya', 
    svgIcon: '<svg class="w-4 h-4 fill-[#E30A17]" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>',
    icon: 'zap'
  }
];

// Sayfa Yüklendiğinde Başlat
document.addEventListener('DOMContentLoaded', () => {
  initLucideIcons();
  initTabNavigation();
  initEventListeners();
  renderQuickHistoryChips();
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
        b.classList.remove('bg-white', 'text-[#00A3A6]', 'font-bold', 'shadow-xs', 'border-slate-200/80');
        b.classList.add('text-slate-600', 'font-semibold', 'border-transparent');
      });
      btn.classList.add('bg-white', 'text-[#00A3A6]', 'font-bold', 'shadow-xs', 'border-slate-200/80');
      btn.classList.remove('border-transparent', 'text-slate-600', 'font-semibold');

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
      saveToHistory(text);
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
  const data = generateMockTransformation(appState.coreMessage);
  appState.transformedMessages = data.transformedMessages;
  appState.analysisResults = data.analysisResults;
  appState.degradationChain = data.degradationChain;
  appState.isLoading = false;
  renderPlatformCards();
  renderSummaryTable();
}

// Çevirme ve Analiz İşlemini Çalıştır (Simülasyon / API)
// ⚡ 2 AŞAMALI ANLIK DÖNÜŞTÜRÜCÜ & ANALİZ (SÜPER HIZLI)
async function runTransformationAndAnalysis(coreText) {
  appState.isLoading = true;
  renderSkeletonLoaders();
  showToast('⚡ Yapay zekâ 8 mecraya dönüştürme işlemini başlattı...', 'info');

  try {
    // 🚀 AŞAMA 1: Sadece Dönüştürme (2 saniyede ekran dolar)
    const transformRes = await fetch('/api/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: coreText, author: "Kamu Görevlisi" })
    });

    if (transformRes.ok) {
      const transformData = await transformRes.json();
      const transformedObj = {};
      const initialAnalysisArr = [];
      const platformPayload = [];

      transformData.platforms.forEach(p => {
        transformedObj[p.id] = p.transformed_content;
        platformPayload.push({ id: p.id, transformed_content: p.transformed_content });
        initialAnalysisArr.push({
          channel: p.id,
          sim: 90.0,
          loss: 'Analiz Ediliyor...',
          cta: 'Analiz Ediliyor...',
          sentiment: 'POS',
          ambiguity: 'Düşük'
        });
      });

      appState.transformedMessages = transformedObj;
      appState.analysisResults = initialAnalysisArr;
      appState.isLoading = false;

      // 💥 ANINDA EKRANA BASTIR! Kullanıcı metinleri 2 saniyede görür!
      renderPlatformCards();
      showToast('✅ 8 mecra dönüşümü tamamlandı! NLP Metrikleri analiz ediliyor...', 'success');

      // 📊 AŞAMA 2: Arka Planda NLP Analizi (Metrikler ve Grafikler)
      try {
        const analyzeRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ core_message: coreText, platforms: platformPayload, author: "Kamu Görevlisi" })
        });

        if (analyzeRes.ok) {
          const analyzeData = await analyzeRes.json();
          const finalAnalysisArr = [];
          analyzeData.platforms.forEach(p => {
            const ctaScore = p.cta_strength || '0/0';
            const hasCta = ctaScore !== '0/0' && !ctaScore.startsWith('0/');
            finalAnalysisArr.push({
              channel: p.id,
              sim: Math.round((p.semantic_similarity || 85) * 10) / 10,
              loss: p.info_loss ? 'Evet' : 'Hayır',
              cta: hasCta ? 'Evet' : 'Hayır',
              ctaStrength: ctaScore,
              sentiment: p.sentiment || 'POS',
              ambiguity: p.ambiguity || 'Düşük'
            });
          });

          appState.analysisResults = finalAnalysisArr;
          appState.degradationChain = analyzeData.degradation_chain ? analyzeData.degradation_chain.steps : [];

          // Kartları ve tabloları kesin NLP verileriyle güncelle
          renderPlatformCards();
          renderSummaryTable();
          showToast('🎯 Tüm NLP Analizleri ve Deformasyon Zinciri tamamlandı!', 'success');
        }
      } catch (err) {
        console.warn('Aşama 2 Analiz Uyarısı:', err);
      }

    } else {
      const mockData = generateMockTransformation(coreText);
      appState.transformedMessages = mockData.transformedMessages;
      appState.analysisResults = mockData.analysisResults;
      appState.degradationChain = mockData.degradationChain;
      appState.isLoading = false;
      renderPlatformCards();
      renderSummaryTable();
    }
  } catch (err) {
    const mockData = generateMockTransformation(coreText);
    appState.transformedMessages = mockData.transformedMessages;
    appState.analysisResults = mockData.analysisResults;
    appState.degradationChain = mockData.degradationChain;
    appState.isLoading = false;
    renderPlatformCards();
    renderSummaryTable();
    showToast('Varsayılan simülasyon moduna geçildi. ✅', 'info');
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

function copyPlatformMessage(platformId, event) {
  if (event) event.stopPropagation();
  const text = appState.transformedMessages[platformId] || "";
  if (!text) {
    showToast('Kopyalanacak metin bulunamadı.', 'warning');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    showToast('Mecra mesajı panoya kopyalandı! 📋', 'success');
  }).catch(err => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Mecra mesajı panoya kopyalandı! 📋', 'success');
  });
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

    let logoHtml = '';
    if (platform.logoUrl) {
      logoHtml = `<img src="${platform.logoUrl}" alt="${platform.name}" class="w-6 h-6 object-contain">`;
    } else if (platform.svgIcon) {
      logoHtml = platform.svgIcon;
    } else {
      logoHtml = `<i data-lucide="${platform.icon}" class="w-4 h-4 text-[#00A3A6]"></i>`;
    }

    const cardHtml = `
      <div onclick="openExpandedCardModal('${platform.id}')" class="corporate-card p-6 flex flex-col justify-between hover:border-[#00A3A6] hover:-translate-y-1 hover:shadow-xl cursor-pointer transition-all duration-300 group rounded-2xl border border-slate-200/90 bg-white">
        <div>
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div class="flex items-center space-x-2.5">
              <div class="p-2 rounded-xl bg-slate-100/90 border border-slate-200/70 flex items-center justify-center group-hover:bg-teal-50 transition-colors shrink-0">
                ${logoHtml}
              </div>
              <div>
                <h4 class="font-bold text-slate-800 text-sm group-hover:text-[#00A3A6] transition-colors">${platform.name}</h4>
                <span class="text-[11px] text-slate-500 font-medium">${platform.category}</span>
              </div>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
              %${analysis.sim} Korunum
            </span>
          </div>

          <div class="text-[14px] text-slate-700 leading-relaxed font-normal whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 font-sans space-y-2 max-h-48 overflow-y-auto platform-message-scroll">
            ${escapeHtml(message)}
          </div>
        </div>

        <div class="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div class="flex items-center space-x-3 font-medium">
            <span>Duygu: <strong class="${analysis.sentiment === 'POS' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}">${analysis.sentiment}</strong></span>
            <span>Belirsizlik: <strong class="text-slate-700 font-bold">${analysis.ambiguity}</strong></span>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="copyPlatformMessage('${platform.id}', event)" title="Doğrudan Kopyala" class="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-[#00A3A6] text-[#00A3A6] hover:text-white font-bold transition-all duration-200 flex items-center space-x-1.5 border border-teal-200/80 shadow-2xs">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span>Kopyala</span>
            </button>
            <div class="text-slate-600 group-hover:text-[#00A3A6] font-bold flex items-center space-x-1 bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors">
              <span>Büyüt</span>
              <i data-lucide="maximize-2" class="w-3.5 h-3.5"></i>
            </div>
          </div>
        </div>
      </div>
    `;
    grid.insertAdjacentHTML('beforeend', cardHtml);
  });

  initLucideIcons();
}

function openExpandedCardModal(platformId) {
  const platform = PLATFORMS_CONFIG.find(p => p.id === platformId);
  if (!platform) return;

  const message = appState.transformedMessages[platformId] || "İçerik yükleniyor...";
  const analysis = appState.analysisResults.find(a => a.channel === platformId) || {
    sim: 85, loss: 'Hayır', cta: 'Evet', sentiment: 'POS', ambiguity: 'Düşük'
  };

  const modal = document.getElementById('card-detail-modal');
  const container = document.getElementById('modal-container');
  if (!modal || !container) return;

  document.getElementById('modal-title').textContent = platform.name;
  document.getElementById('modal-category').textContent = platform.category;
  document.getElementById('modal-content').textContent = message;
  document.getElementById('modal-sim').textContent = `%${analysis.sim}`;
  document.getElementById('modal-loss').textContent = analysis.loss;
  document.getElementById('modal-sentiment').textContent = analysis.sentiment === 'POS' ? 'Olumlu (POS)' : 'Olumsuz / Nötr';
  document.getElementById('modal-ambiguity').textContent = analysis.ambiguity;

  const modalIconBox = document.getElementById('modal-icon-box');
  if (modalIconBox) {
    if (platform.logoUrl) {
      modalIconBox.innerHTML = `<img src="${platform.logoUrl}" alt="${platform.name}" class="w-7 h-7 object-contain">`;
    } else if (platform.svgIcon) {
      modalIconBox.innerHTML = platform.svgIcon;
    } else {
      modalIconBox.innerHTML = `<i data-lucide="${platform.icon}" class="w-6 h-6 text-[#00A3A6]"></i>`;
    }
  }

  const copyBtn = document.getElementById('modal-copy-btn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(message);
      showToast('İçerik panoya kopyalandı! 📋', 'success');
    };
  }

  const diffBtn = document.getElementById('modal-diff-btn');
  if (diffBtn) {
    diffBtn.onclick = () => {
      closeExpandedCardModal();
      inspectPlatform(platformId);
    };
  }

  modal.classList.remove('hidden');
  setTimeout(() => {
    container.classList.remove('scale-95', 'opacity-0');
    container.classList.add('scale-100', 'opacity-100');
  }, 10);

  initLucideIcons();
}

function closeExpandedCardModal() {
  const modal = document.getElementById('card-detail-modal');
  const container = document.getElementById('modal-container');
  if (!modal || !container) return;

  container.classList.remove('scale-100', 'opacity-100');
  container.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeExpandedCardModal();
});

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
function computeWordDiff(arr1, arr2) {
  const diff = [];
  let i = 0, j = 0;
  while (i < arr1.length || j < arr2.length) {
    if (i < arr1.length && j < arr2.length && arr1[i] === arr2[j]) {
      diff.push({ type: 'same', word: arr1[i] });
      i++; j++;
    } else if (j < arr2.length && (!arr1.includes(arr2[j], i) || arr2.indexOf(arr1[i], j) > j)) {
      diff.push({ type: 'added', word: arr2[j] });
      j++;
    } else if (i < arr1.length) {
      diff.push({ type: 'removed', word: arr1[i] });
      i++;
    }
  }
  return diff;
}

// Radar Chart Yönetimi
let radarChartInstance = null;
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

  const platforms = PLATFORMS_CONFIG.map(p => p.name.split(' ')[0]);
  const simScores = appState.analysisResults.map(a => a.sim);

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: platforms,
      datasets: [{
        label: 'Anlamsal Korunum (%)',
        data: simScores,
        backgroundColor: 'rgba(0, 163, 166, 0.2)',
        borderColor: '#00A3A6',
        pointBackgroundColor: '#00A3A6',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#00A3A6'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(0,0,0,0.05)' },
          suggestedMin: 50,
          suggestedMax: 100
        }
      }
    }
  });
}

// Bar Chart Yönetimi
let barChartInstance = null;
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
      <td class="py-3 px-4">${item.cta === 'Evet' ? `<span class="text-emerald-600 font-semibold">Evet ✅</span> <span class="text-slate-400 text-xs">(${item.ctaStrength || '-'})</span>` : 'Hayır'}</td>
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

// Mock Dönüştürme & Analiz Üreteci (Dinamik Kullanıcı Metni Uyumlu)
function generateMockTransformation(core) {
  const cleanCore = core && core.trim().length > 0 ? core.trim() : "Yoğun kar yağışı nedeniyle Elazığ genelinde yarın tüm okullar 1 gün süreyle tatil edilmiştir.";
  const shortCore = cleanCore.length > 60 ? cleanCore.substring(0, 60) + '...' : cleanCore;

  return {
    transformedMessages: {
      press_release: `T.C. CUMHURBAŞKANLIĞI İLETİŞİM BAŞKANLIĞI\nBASIN AÇIKLAMASI\n\n${cleanCore}\n\nKonuya ilişkin idari süreçler, saha koordinasyonu ve kamuoyunu bilgilendirme faaliyetleri 7/24 esasına göre yürütülmektedir.\n\nVatandaşlarımızın yalnızca resmi kanallardan yapılan duyurulara itibar etmeleri önemle rica olunur. Kamuoyuna saygıyla duyurulur.`,
      
      agency_news: `[SON DAKİKA HABERİ] ANKARA (AA) - Gelen son dakika bildirimine göre;\n\n"${cleanCore}"\n\nYetkililerden alınan bilgiye göre konuya ilişkin gerekli tüm tedbirler alınmış olup gelişmeler ajansımız tarafından yakından takip edilmektedir.`,
      
      tabloid: `FLAŞ FLAŞ FLAŞ! ÖNEMLİ GELİŞME KANATLANDI! 😱🔥\n\n"${cleanCore.toUpperCase()}"\n\nGelişme gündeme adeta bomba gibi düştü! Tüm gözler yetkililerden gelecek yeni açıklamalara çevrildi!`,
      
      x_twitter: `🚨 SON DAKİKA DUYURUSU 📌\n\n${cleanCore}\n\nResmi açıklamaları ve gelişmeleri anlık olarak hesabımızdan takip edebilirsiniz. 📢\n\n#SonDakika #ResmiDuyuru #Kamuİletişimi #Gündem`,
      
      linkedin: `Stratejik kamu iletişimi ve kurumsal yönetişim prensiplerimiz çerçevesinde önemli bilgilendirme:\n\n• ${cleanCore}\n\nKurumsal süreçlerimiz ve paydaş koordinasyonumuz kararlılıkla sürdürülmektedir.\n\n#Stratejikİletişim #KamuYönetimi #KurumsalYönetim #Liderlik`,
      
      vertical_video: `🎬 DİKEY VİDEO SENARYOSU (TikTok / Reels / Shorts)\n\n📌 [00:00 - 00:03] KANCA\nGörsel: Dikkat çekici resmi duyuru görseli\nEkran Metni: "ÖNEMLİ DUYURU!"\nDış Ses: "Arkadaşlar dikkat! ${shortCore}"\n\n📌 [00:03 - 00:08] GELİŞME\nEkran Metni: "${cleanCore}"\nDış Ses: "Resmi duyuruları takip etmeyi unutmayın!"`,
      
      messaging_chain: `Arkadaşlar bilginiz olsun resmi duyuru paylaşıldı: ${cleanCore} 📲 Haberi olmayan arkadaşlara ve WhatsApp gruplarına iletelim lütfen 👍`,
      
      official_letter: `T.C. CUMHURBAŞKANLIĞI İLETİŞİM BAŞKANLIĞI\n\nSayı  : E-75249013-010.06-2026/4108\nTarih : 30.07.2026\nKonu  : Kamuoyu Bilgilendirmesi ve İdari Kararlar Hk.\n\nİLGİLİ MAKAMA VE KURUM MÜDÜRLÜKLERİNE\n\n${cleanCore}\n\nGereğini ve bilgilerinizi önemle rica ederim.\n\nAyşe YILDIZ\nVali a. / Genel Sekreter V.`
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
      { step: 1, channel: 'official_letter', sim: 0.956, dev: 0.044, cum: 0.956, is_bp: false },
      { step: 2, channel: 'press_release', sim: 0.942, dev: 0.058, cum: 0.942, is_bp: false },
      { step: 3, channel: 'agency_news', sim: 0.915, dev: 0.085, cum: 0.915, is_bp: false },
      { step: 4, channel: 'x_twitter', sim: 0.864, dev: 0.136, cum: 0.864, is_bp: false },
      { step: 5, channel: 'tabloid', sim: 0.728, dev: 0.272, cum: 0.728, is_bp: true }
    ]
  };
}

// ============================================================
// GEÇMİŞ YÖNETİMİ (History Management)
// ============================================================

const HISTORY_KEY = 'mecra_search_history';

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveToHistory(text) {
  if (!text || text.trim().length < 5) return;
  const history = getHistory().filter(h => h.text !== text.trim());
  history.unshift({ text: text.trim(), date: new Date().toLocaleDateString('tr-TR') });
  if (history.length > 20) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderQuickHistoryChips();
}

function renderQuickHistoryChips() {
  const container = document.getElementById('quick-history-chips');
  if (!container) return;

  const history = getHistory().slice(0, 5);
  if (history.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400 italic">Henüz arama geçmişi yok.</span>';
    return;
  }

  container.innerHTML = history.map(item => `
    <button
      onclick="loadFromHistory('${escapeHtml(item.text).replace(/'/g, "\\'")}')"
      class="px-3 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:border-[#00A3A6] hover:text-[#00A3A6] transition-colors shadow-sm truncate max-w-xs"
      title="${escapeHtml(item.text)}"
    >
      ${escapeHtml(item.text.length > 40 ? item.text.substring(0, 40) + '...' : item.text)}
    </button>
  `).join('');
}

function loadFromHistory(text) {
  const input = document.getElementById('core-message-input');
  if (input) {
    input.value = text;
    appState.coreMessage = text;
  }
  closeHistoryModal();
}

function openHistoryModal() {
  const modal = document.getElementById('search-history-modal');
  const container = document.getElementById('history-modal-container');
  if (!modal || !container) return;

  // Listeyi doldur
  const listEl = document.getElementById('history-modal-list');
  if (listEl) {
    const history = getHistory();
    if (history.length === 0) {
      listEl.innerHTML = '<p class="text-slate-400 text-sm text-center py-6">Geçmiş bulunamadı.</p>';
    } else {
      listEl.innerHTML = history.map((item, i) => `
        <div class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors group">
          <div class="flex-1 min-w-0 cursor-pointer" onclick="loadFromHistory('${escapeHtml(item.text).replace(/'/g, "\\'")}')">
            <p class="text-sm font-medium text-slate-800 truncate">${escapeHtml(item.text)}</p>
            <p class="text-xs text-slate-400 mt-0.5">${item.date}</p>
          </div>
          <button onclick="deleteHistoryItem(${i})" class="ml-3 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `).join('');
      initLucideIcons();
    }
  }

  modal.classList.remove('hidden');
  setTimeout(() => {
    container.classList.remove('scale-95', 'opacity-0');
    container.classList.add('scale-100', 'opacity-100');
  }, 10);
}

function closeHistoryModal() {
  const modal = document.getElementById('search-history-modal');
  const container = document.getElementById('history-modal-container');
  if (!modal || !container) return;

  container.classList.remove('scale-100', 'opacity-100');
  container.classList.add('scale-95', 'opacity-0');
  setTimeout(() => modal.classList.add('hidden'), 200);
}

function deleteHistoryItem(index) {
  const history = getHistory();
  history.splice(index, 1);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  openHistoryModal();
  renderQuickHistoryChips();
}

function clearAllHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderQuickHistoryChips();
  closeHistoryModal();
  showToast('Tüm arama geçmişi temizlendi.', 'info');
}
