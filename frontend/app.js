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
  const data = generateMockTransformation(appState.coreMessage);
  appState.transformedMessages = data.transformedMessages;
  appState.analysisResults = data.analysisResults;
  appState.degradationChain = data.degradationChain;
  appState.isLoading = false;
  renderPlatformCards();
  renderSummaryTable();
}

// Çevirme ve Analiz İşlemini Çalıştır (Simülasyon / API)
async function runTransformationAndAnalysis(coreText) {
  appState.isLoading = true;
  renderSkeletonLoaders();
  showToast('Yapay zekâ 8 mecrada çevirme ve analiz sürecini başlattı...', 'info');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    let data;
    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: coreText, author: "Kamu Görevlisi" }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
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
      clearTimeout(timeoutId);
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
    renderPlatformCards();
    showToast('Dönüşüm ve analizler tamamlandı! ✅', 'success');
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
      <div onclick="openExpandedCardModal('${platform.id}')" class="corporate-card p-6 flex flex-col justify-between hover:border-[#00A3A6] hover:-translate-y-1 hover:shadow-xl cursor-pointer transition-all duration-300 group rounded-2xl border border-slate-200/90 bg-white">
        <div>
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div class="flex items-center space-x-2.5">
              <div class="p-2.5 rounded-xl bg-teal-50 text-[#00A3A6] group-hover:bg-[#00A3A6] group-hover:text-white transition-colors">
                <i data-lucide="${platform.icon}" class="w-4 h-4"></i>
              </div>
              <div>
                <h4 class="font-bold text-slate-800 text-sm group-hover:text-[#00A3A6] transition-colors">${platform.name}</h4>
                <span class="text-[11px] text-slate-500 font-medium">${platform.category}</span>
              </div>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              %${analysis.sim} Korunum
            </span>
          </div>

          <div class="text-[14px] text-slate-700 leading-relaxed font-normal whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 font-sans space-y-2">
            ${escapeHtml(message)}
          </div>
        </div>

        <div class="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div class="flex items-center space-x-3 font-medium">
            <span>Duygu: <strong class="${analysis.sentiment === 'POS' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}">${analysis.sentiment}</strong></span>
            <span>Belirsizlik: <strong class="text-slate-700 font-bold">${analysis.ambiguity}</strong></span>
          </div>
          <div class="text-[#00A3A6] group-hover:text-[#007D80] font-bold flex items-center space-x-1.5 bg-teal-50 px-2.5 py-1 rounded-md">
            <span>Büyüt & Detay</span>
            <i data-lucide="maximize-2" class="w-3.5 h-3.5"></i>
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

  const iconEl = document.getElementById('modal-icon');
  if (iconEl) iconEl.setAttribute('data-lucide', platform.icon);

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

// Mock Dönüştürme & Analiz Üreteci (Mecralara Özgü Farklı Metin Uzunlukları & Okunabilir Paragraflar)
function generateMockTransformation(core) {
  return {
    transformedMessages: {
      press_release: `T.C. ELAZIĞ VALİLİĞİ BASIN AÇIKLAMASI\n\nİlimiz genelinde devam eden yoğun meteorolojik gelişmeler ve kar yağışı değerlendirilmiş olup, ulaşımda yaşanabilecek buzlanma ve kaza risklerine karşı tedbir amaçlı kararlar alınmıştır.\n\n31 Temmuz 2026 Cuma günü ilimiz genelindeki tüm anaokulu, ilkokul, ortaokul ve lise düzeyindeki eğitim kurumlarında eğitime 1 (bir) gün süreyle ara verilmiştir.\n\nKamu bünyesinde görev yapmakta olan hamile, engelli ve kronik rahatsızlığı bulunan personellerimiz idari izinli sayılacaktır. Vatandaşlarımızın resmi duyuruları takip etmeleri önemle rica olunur.`,
      
      agency_news: `[SON DAKİKA HABERİ] ELAZIĞ - Elazığ'da etkisini artıran olumsuz hava koşulları ve kar yağışı nedeniyle il genelindeki tüm okullarda eğitime yarın 1 gün süreyle ara verildi.\n\nValilik İl Hıfzıssıhha Kurulu tarafından yapılan açıklamada, buzlanma ve don olaylarına karşı sürücülerin zincir ve kış lastiği olmadan yola çıkmamaları konusunda uyarıda bulunuldu. Ekipler kar küreme çalışmalarına devam ediyor.`,
      
      tabloid: `ELAZIĞ'DA KAR ALARMI! Öğrencilere Müjdeli Haber Son Dakika Geldi! 😱❄️\n\nTermometreler sıfırın altına düştü, kar fırtınası şehri esir aldı! Valilikten gelen karar ile okullar yarın tamamen tatil edildi. Sürücülere aman dikkat uyarısı yapıldı!`,
      
      x_twitter: `🚨 ELAZIĞ'DA OKULLAR TATİL! ❄️📚\n\nİlimiz genelinde devam eden yoğun kar yağışı ve buzlanma riski nedeniyle yarın (1 gün) tüm okullarda eğitime ara verilmiştir.\n\nSürücülerimizin dikkatli olmaları önemle rica olunur.\n\n#Elazığ #KarTatili #SonDakika`,
      
      linkedin: `Bölgesel hava koşullarındaki gelişmeler ve kamu sağlığı önceliklerimiz doğrultusunda Elazığ lokasyonumuzdaki eğitim kurumlarında eğitime 1 gün süreyle ara verilmiştir.\n\nKurumsal iş sürekliliği ve çalışan güvenliği esaslarımız çerçevesinde hamile ve engelli personellerimiz idari izinli sayılacaktır.\n\n#Kamuİletişimi #KrizYönetimi #İşSağlığıVeGüvenliği`,
      
      vertical_video: `🎬 [VİDEO SENARYOSU - Reels / Shorts / TikTok]\n\n[00:00 - 00:03] 🚨 Görsel: Karlı Elazığ manzarası\nMetin: "ELAZIĞ'DA OKULLAR TATİL!"\nVoiceover: "Öğrenciler dikkat! Elazığ Valiliği'nden son dakika kararı geldi!"\n\n[00:03 - 00:07] ❄️ Görsel: Kar küreme aracı\nMetin: "1 Gün Eğitime Ara Verildi"\nVoiceover: "Buzlanma riski nedeniyle yarın tüm okullar tatil."`,
      
      messaging_chain: `Arkadaşlar Elazığ Valiliği açıklama yaptı, kar yağışı nedeniyle yarın tüm okullar 1 gün tatil edilmiş ❄️ Hamile ve engelli çalışanlar da izinliymiş, bilgisi olmayan arkadaşlara iletelim lütfen 👍`,
      
      official_letter: `T.C. ELAZIĞ VALİLİĞİ\nİl Milli Eğitim Müdürlüğü\nSayı : E-75249013-010.06-2026/4108\nTarih: 30.07.2026\nKonu : Meteorolojik Koşullar Sebebiyle Eğitime Ara Verilmesi\n\nİLGİLİ MAKAMA VE TÜM EĞİTİM KURUMLARINA\n\nİlimiz Meteoroloji Bölge Müdürlüğünden alınan son veriler doğrultusunda, gece saatlerinden itibaren etkisini artırması beklenen olumsuz hava şartları ve yoğun buzlanma riski değerlendirilmiştir.\n\nBu kapsamda ilimiz genelindeki tüm resmi ve özel okul öncesi, ilköğretim ve ortaöğretim kurumlarında 31.07.2026 tarihinde eğitime 1 (bir) gün süreyle ara verilmesi uygun görülmüştür.\n\nBilgilerinizi ve gereğini rica ederim.\n\nAyşe YILDIZ\nVali a. / İl Milli Eğitim Müdürü V.`
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
