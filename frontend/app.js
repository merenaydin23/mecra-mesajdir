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
  selectedOfficialChannel: 'press_release',
  transformedMessages: {},
  analysisResults: [],
  degradationChain: [],
  degradationMeta: null,
  lastBenchmark: null
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
  initEventListeners();
  renderQuickHistoryChips();
  loadDefaultData();
  initTabNavigation();
});

function initLucideIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Sekmeler Arası Geçiş Yönetimi
function initTabNavigation() {
  const navButtons = document.querySelectorAll('.nav-tab-btn');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (history.pushState) {
        history.pushState({ tab: targetTab }, '', `#${targetTab}`);
      }
      switchToTab(targetTab);
    });
  });

  window.addEventListener('popstate', () => {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    switchToTab(hash);
  });

  const initialHash = window.location.hash.replace('#', '') || 'dashboard';
  switchToTab(initialHash);
}

function switchToTab(targetTab) {
  if (!targetTab) targetTab = 'dashboard';

  const navButtons = document.querySelectorAll('.nav-tab-btn');
  const tabPages = document.querySelectorAll('.tab-page');
  appState.activeTab = targetTab;

  const activeClasses = ['bg-white', 'text-[#00A3A6]', 'font-bold', 'shadow-xs', 'border-slate-200/80'];
  const inactiveClasses = ['text-slate-600', 'font-semibold', 'border-transparent'];

  navButtons.forEach(b => {
    b.classList.remove(...activeClasses);
    b.classList.add(...inactiveClasses);
    if (b.getAttribute('data-tab') === targetTab) {
      b.classList.add(...activeClasses);
      b.classList.remove(...inactiveClasses);
    }
  });

  tabPages.forEach(page => page.classList.add('hidden'));
  const activePage = document.getElementById(`page-${targetTab}`);
  if (activePage) activePage.classList.remove('hidden');

  if (targetTab === 'dashboard') {
    renderPlatformCards();
  } else if (targetTab === 'analytics') {
    renderAnalyticsKPIs();
    renderSideBySideTexts();
    renderAnalyticsCharts();
    renderDiffViewer();
    renderDegradationChain();
    renderSummaryTable();
  } else if (targetTab === 'history') {
    loadHistoryPage();
    renderHistoryPageLocalChips();
  } else if (targetTab === 'lab') {
    loadServerHistory();
    if (appState.lastBenchmark) renderBenchmarkReport(appState.lastBenchmark);
  } else if (targetTab === 'official-doc') {
    updatePressReleaseDraft();
  }

  initLucideIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Diff Viewer / analytics platform seçici
  const diffSelect = document.getElementById('diff-platform-select');
  if (diffSelect) {
    diffSelect.addEventListener('change', (e) => {
      appState.selectedPlatformForDiff = e.target.value;
      renderDiffViewer();
      renderSideBySideTexts();
      renderAnalyticsDetail();
    });
  }
}

// Varsayılan Verileri Yükle
function loadDefaultData() {
  const data = generateMockTransformation(appState.coreMessage);
  appState.transformedMessages = data.transformedMessages;
  appState.analysisResults = data.analysisResults;
  appState.degradationChain = data.degradationChain;
  appState.degradationMeta = data.degradationMeta || null;
  appState.isLoading = false;
  renderPlatformCards();
  renderSummaryTable();
  renderAnalyticsKPIs();
  renderSideBySideTexts();
  renderDegradationChain();
  renderAnalyticsDetail();
}

function refreshAnalyticsViews() {
  renderPlatformCards();
  renderSummaryTable();
  renderAnalyticsKPIs();
  renderSideBySideTexts();
  renderAnalyticsCharts();
  renderDiffViewer();
  renderDegradationChain();
  renderAnalyticsDetail();
}

function mapPlatformAnalysis(p) {
  const ctaScore = p.cta_strength || '0/0';
  const hasCta = p.has_cta === true || (ctaScore !== '0/0' && !String(ctaScore).startsWith('0/'));
  return {
    channel: p.id,
    sim: Math.round((p.semantic_similarity || 0) * 10) / 10,
    loss: p.info_loss ? 'Evet' : 'Hayır',
    cta: hasCta ? 'Evet' : 'Hayır',
    ctaStrength: ctaScore,
    sentiment: p.sentiment || 'POS',
    ambiguity: p.ambiguity || 'Düşük',
    details: {
      infoLossRate: p.info_loss_rate,
      checkedFacts: p.checked_facts_count || 0,
      factDetails: p.fact_details || [],
      hasCta,
      ctaWords: p.cta_words || [],
      ctaSentences: p.cta_sentences || [],
      ctaPerson: p.cta_person || 'Yok',
      ctaScore: p.cta_score,
      sentimentPos: p.sentiment_pos,
      sentimentNeg: p.sentiment_neg,
      sentimentIntensity: p.sentiment_intensity,
      emojiCount: p.emoji_count || 0,
      punctCount: p.punct_count || 0,
      ambiguityScore: p.ambiguity_score,
      clarityScore: p.clarity_score,
      mostAmbiguousSentence: p.most_ambiguous_sentence || '',
      ambiguitySentences: p.ambiguity_sentences || []
    }
  };
}

function plainFactLabel(label) {
  const map = {
    'YÜZDE': 'Yüzde',
    'DÖNEM': 'Dönem',
    'YIL': 'Yıl',
    'YIL_ARALIĞI': 'Yıl aralığı',
    'SAYI_FINANS': 'Sayı / tutar',
    'PER': 'Kişi',
    'PERSON': 'Kişi',
    'LOC': 'Yer',
    'GPE': 'Yer / ülke',
    'ORG': 'Kurum',
    'DATE': 'Tarih',
    'TIME': 'Zaman',
    'MONEY': 'Para',
    'PERCENT': 'Yüzde',
    'EVENT': 'Olay'
  };
  return map[String(label || '').toUpperCase()] || String(label || 'Bilgi');
}

function plainCtaPerson(person) {
  const p = String(person || '');
  if (!p || p === 'Yok') return 'Hitap yok';
  return p
    .replace(/2\.\s*Tekil\s*\(Sen\)/gi, 'Sana söylüyor (sen dili)')
    .replace(/2\.\s*Çoğul\s*\(Siz\)/gi, 'Size söylüyor (siz dili)')
    .replace(/Tavsiye\s*\/\s*Dolaylı/gi, 'Tavsiye ediyor');
}

function pctOrDash(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const pct = n <= 1 ? n * 100 : n;
  return `%${pct.toFixed(0)}`;
}

function selectAnalyticsPlatform(platformId) {
  appState.selectedPlatformForDiff = platformId;
  const select = document.getElementById('diff-platform-select');
  if (select) select.value = platformId;
  renderDiffViewer();
  renderSideBySideTexts();
  renderSummaryTable();
  renderAnalyticsDetail();
  const card = document.getElementById('analytics-detail-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAnalyticsDetail() {
  const panel = document.getElementById('analytics-detail-panel');
  const titleEl = document.getElementById('detail-platform-title');
  const badgeEl = document.getElementById('detail-platform-badge');
  if (!panel) return;

  const platformId = appState.selectedPlatformForDiff || 'x_twitter';
  const name = getPlatformDisplayName(platformId);
  const item = (appState.analysisResults || []).find(r => r.channel === platformId);
  if (titleEl) titleEl.textContent = name;
  if (badgeEl) badgeEl.textContent = item ? `Benzerlik %${item.sim}` : 'Henüz analiz yok';

  if (!item || !item.details) {
    panel.innerHTML = `<div class="text-sm text-slate-400 text-center py-8">Bu platform için henüz ayrıntılı sonuç yok. Mesajı dönüştürüp analiz bitince burada görünür.</div>`;
    return;
  }

  const d = item.details;
  const facts = d.factDetails || [];
  const lostFacts = facts.filter(f => !f.found);
  const keptFacts = facts.filter(f => f.found);
  const keptPct = facts.length ? Math.round((keptFacts.length / facts.length) * 100) : (item.loss === 'Hayır' ? 100 : 0);
  const ambSentences = (d.ambiguitySentences || [])
    .slice()
    .sort((a, b) => (b.belirsizlik_skoru || 0) - (a.belirsizlik_skoru || 0))
    .slice(0, 3);

  const factRows = facts.length ? facts.map((f, i) => {
    const ok = !!f.found;
    const explain = f.explain || (
      ok
        ? `Asıl mesajda «${f.value}» var → bu platformda duruyor ✓`
        : `Asıl mesajda «${f.value}» var → bu platformda YOK ✗`
    );
    return `
      <div class="fact-row ${ok ? 'fact-ok' : 'fact-missing'}" style="animation-delay:${i * 60}ms">
        <div class="fact-kind">${escapeHtml(plainFactLabel(f.label))}</div>
        <div class="fact-value">«${escapeHtml(String(f.value || ''))}»</div>
        <div class="fact-core"><span class="fact-pill pill-core">ASILDA VAR</span></div>
        <div class="fact-arrow">→</div>
        <div class="fact-target">
          <span class="fact-pill ${ok ? 'pill-ok' : 'pill-miss'}">${ok ? 'BURADA DURUYOR' : 'BURADA YOK'}</span>
        </div>
        <div class="fact-explain">${escapeHtml(explain)}</div>
      </div>`;
  }).join('') : `
    <div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
      Bu mesajda sayı / tarih / yer gibi net bir “ölçülebilir bilgi” yakalanmadı. Anlam benzerliğine bak.
    </div>`;

  const ctaBlock = d.hasCta ? `
    <p class="text-sm text-slate-700 leading-relaxed">
      <strong class="text-amber-800">Evet, çağrı var.</strong>
      Okuyucuya “şunu yap” diyen cümle var. (Buna çağrı / CTA denir.)
    </p>
    ${d.ctaWords.length ? `<p class="text-xs text-slate-600 mt-2">Kelimeler: <strong>${d.ctaWords.map(w => escapeHtml(w)).join(', ')}</strong></p>` : ''}
    <p class="text-xs text-slate-500 mt-1">Hitap: ${escapeHtml(plainCtaPerson(d.ctaPerson))}</p>
    ${d.ctaSentences.length ? `
      <div class="mt-3 space-y-2">${d.ctaSentences.map(s => `
        <div class="evidence-quote evidence-amber">“${escapeHtml(s)}”</div>
      `).join('')}</div>` : ''}
  ` : `
    <p class="text-sm text-slate-700 leading-relaxed">
      <strong>Hayır.</strong> Bu metin daha çok bilgi veriyor; “takip edin / paylaşın” gibi net bir eylem çağrısı yok.
    </p>`;

  const sentLabel = plainSentiment(item.sentiment);
  const amb = plainAmbiguity(item.ambiguity);
  const sim = Number(item.sim) || 0;
  const simTone = sim >= 80 ? 'iyi' : sim >= 60 ? 'orta' : 'düşük';

  panel.innerHTML = `
    <div class="verdict-strip">
      <div class="verdict-item">
        <span class="verdict-label">Anlam</span>
        <span class="verdict-value text-[#008385]">%${sim}</span>
        <span class="verdict-hint">${simTone === 'iyi' ? 'Aynı şey' : simTone === 'orta' ? 'Biraz sapmış' : 'Çok değişmiş'}</span>
      </div>
      <div class="verdict-item">
        <span class="verdict-label">Bilgi</span>
        <span class="verdict-value ${lostFacts.length ? 'text-rose-600' : 'text-emerald-600'}">${keptPct}%</span>
        <span class="verdict-hint">${lostFacts.length ? `${lostFacts.length} eksik` : 'Hepsi duruyor'}</span>
      </div>
      <div class="verdict-item">
        <span class="verdict-label">Çağrı</span>
        <span class="verdict-value ${d.hasCta ? 'text-amber-600' : 'text-slate-500'}">${d.hasCta ? 'VAR' : 'YOK'}</span>
        <span class="verdict-hint">${d.hasCta ? 'Yap deniyor' : 'Sadece bilgi'}</span>
      </div>
      <div class="verdict-item">
        <span class="verdict-label">Duygu</span>
        <span class="verdict-value ${sentLabel === 'Olumlu' ? 'text-emerald-600' : 'text-rose-600'}">${sentLabel}</span>
        <span class="verdict-hint">${pctOrDash(d.sentimentPos)} / ${pctOrDash(d.sentimentNeg)}</span>
      </div>
      <div class="verdict-item">
        <span class="verdict-label">Netlik</span>
        <span class="verdict-value ${amb.ok ? 'text-emerald-600' : 'text-violet-600'}">${amb.text}</span>
        <span class="verdict-hint">${d.clarityScore != null ? 'Netlik ' + pctOrDash(d.clarityScore) : '—'}</span>
      </div>
    </div>

    <section class="fact-board">
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
        <div>
          <h4 class="font-black text-slate-900 text-base tracking-tight">Bilgi karşılaştırması</h4>
          <p class="text-sm text-slate-500 mt-0.5">Asıl mesajdaki önemli bilgiler → bu platformda var mı?</p>
        </div>
        <div class="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          ${keptFacts.length}/${facts.length || 0} bilgi duruyor
          ${d.infoLossRate != null ? ` · kayıp oranı %${Number(d.infoLossRate).toFixed(0)}` : ''}
        </div>
      </div>
      <div class="fact-legend">
        <span><i class="dot ok"></i> Asılda var → burada duruyor</span>
        <span><i class="dot miss"></i> Asılda var → burada yok</span>
      </div>
      <div class="fact-list">${factRows}</div>
      ${lostFacts.length ? `
        <div class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p class="text-sm font-bold text-rose-800">Eksik kalanlar (somut)</p>
          <p class="text-sm text-rose-700 mt-1 leading-relaxed">
            ${lostFacts.map(f => `<strong>${escapeHtml(plainFactLabel(f.label))}</strong>: «${escapeHtml(String(f.value))}»`).join(' · ')}
          </p>
        </div>` : `
        <div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-semibold">
          Kontrol edilen önemli bilgiler bu platformda duruyor.
        </div>`}
    </section>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="detail-card detail-amber">
        <h4 class="font-bold text-amber-900 text-sm mb-1">Çağrı var mı?</h4>
        <p class="text-[11px] text-amber-800/80 mb-2">Okuyucuya “yap” deniyor mu?</p>
        ${ctaBlock}
      </div>
      <div class="detail-card detail-emerald">
        <h4 class="font-bold text-emerald-900 text-sm mb-1">Duygu nasıl?</h4>
        <p class="text-[11px] text-emerald-800/80 mb-2">Genel hava olumlu mu, olumsuz mu?</p>
        <p class="text-sm text-slate-700">Sonuç: <strong class="${sentLabel === 'Olumlu' ? 'text-emerald-700' : 'text-rose-700'}">${sentLabel}</strong></p>
        <div class="grid grid-cols-3 gap-2 mt-3 text-center">
          <div class="bg-white/80 rounded-lg border border-emerald-100 p-2">
            <div class="text-[10px] text-slate-500">Olumlu</div>
            <div class="font-bold text-emerald-700">${pctOrDash(d.sentimentPos)}</div>
          </div>
          <div class="bg-white/80 rounded-lg border border-rose-100 p-2">
            <div class="text-[10px] text-slate-500">Olumsuz</div>
            <div class="font-bold text-rose-700">${pctOrDash(d.sentimentNeg)}</div>
          </div>
          <div class="bg-white/80 rounded-lg border border-slate-100 p-2">
            <div class="text-[10px] text-slate-500">Yoğunluk</div>
            <div class="font-bold text-slate-700">${pctOrDash(d.sentimentIntensity)}</div>
          </div>
        </div>
      </div>
      <div class="detail-card detail-violet">
        <h4 class="font-bold text-violet-900 text-sm mb-1">Anlatım net mi?</h4>
        <p class="text-[11px] text-violet-800/80 mb-2">Kaçamak / belirsiz cümle var mı?</p>
        <p class="text-sm text-slate-700">Sonuç: <strong class="${amb.ok ? 'text-emerald-700' : 'text-rose-700'}">${amb.text}</strong></p>
        ${d.mostAmbiguousSentence ? `<div class="evidence-quote evidence-violet mt-3">“${escapeHtml(d.mostAmbiguousSentence)}”</div>` : ''}
        ${ambSentences.length > 1 ? `
          <ul class="mt-2 space-y-1">${ambSentences.slice(1).map(s => `
            <li class="text-xs text-slate-600"><span class="font-bold text-violet-700">${pctOrDash(s.belirsizlik_skoru)}</span> — ${escapeHtml(s.cumle || '')}</li>
          `).join('')}</ul>` : ''}
      </div>
    </div>
  `;
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
          appState.analysisResults = (analyzeData.platforms || []).map(mapPlatformAnalysis);
          const deg = analyzeData.degradation_chain || null;
          appState.degradationChain = deg && deg.steps ? deg.steps : [];
          appState.degradationMeta = deg ? {
            has_breaking_point: deg.has_breaking_point,
            breaking_point_channel: deg.breaking_point_channel,
            max_consecutive_deviation: deg.max_consecutive_deviation
          } : null;

          refreshAnalyticsViews();
          showToast('Analiz hazır: Analiz sekmesinde VAR / YOK bilgi karşılaştırmasına bak.', 'success');
          if (appState.activeTab === 'analytics') {
            const card = document.getElementById('analytics-detail-card');
            if (card) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
          }
        }
      } catch (err) {
        console.warn('Aşama 2 Analiz Uyarısı:', err);
      }

    } else {
      const mockData = generateMockTransformation(coreText);
      appState.transformedMessages = mockData.transformedMessages;
      appState.analysisResults = mockData.analysisResults;
      appState.degradationChain = mockData.degradationChain;
      appState.degradationMeta = mockData.degradationMeta || null;
      appState.isLoading = false;
      refreshAnalyticsViews();
    }
  } catch (err) {
    const mockData = generateMockTransformation(coreText);
    appState.transformedMessages = mockData.transformedMessages;
    appState.analysisResults = mockData.analysisResults;
    appState.degradationChain = mockData.degradationChain;
    appState.degradationMeta = mockData.degradationMeta || null;
    appState.isLoading = false;
    refreshAnalyticsViews();
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
      logoHtml = `<img src="${platform.logoUrl}" alt="${platform.name}">`;
    } else if (platform.svgIcon) {
      logoHtml = platform.svgIcon;
    } else {
      logoHtml = `<i data-lucide="${platform.icon}" class="w-4 h-4 text-[#00A3A6]"></i>`;
    }

    const cardHtml = `
      <div onclick="openExpandedCardModal('${platform.id}')" class="corporate-card p-5 flex flex-col justify-between hover:-translate-y-1 cursor-pointer transition-all duration-300 group">
        <div>
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div class="flex items-center space-x-2.5 min-w-0">
              <div class="platform-logo-badge shrink-0 group-hover:border-[#00A3A6]/50 transition-colors">
                ${logoHtml}
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-slate-800 text-sm group-hover:text-[#00A3A6] transition-colors truncate">${platform.name}</h4>
                <span class="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">${platform.category}</span>
              </div>
            </div>
            <span class="text-[11px] px-2 py-1 rounded-md font-bold bg-[#0B1F33] text-white shrink-0">
              %${analysis.sim}
            </span>
          </div>

          <div class="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/70 max-h-44 overflow-y-auto platform-message-scroll">
            ${escapeHtml(message)}
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div class="flex items-center gap-2 font-semibold">
            <img src="${CIB_LOGO_URL}" alt="" class="w-4 h-4 object-contain opacity-70">
            <span>Duygu: <strong class="${String(analysis.sentiment || '').toUpperCase().includes('POS') ? 'text-emerald-600' : 'text-rose-600'}">${plainSentiment(analysis.sentiment)}</strong></span>
            <span>·</span>
            <span>${plainAmbiguity(analysis.ambiguity).text}</span>
          </div>
          <div class="flex items-center space-x-1.5">
            <button onclick="copyPlatformMessage('${platform.id}', event)" title="Kopyala" class="px-2.5 py-1.5 rounded-md bg-teal-50 hover:bg-[#00A3A6] text-[#00A3A6] hover:text-white font-bold transition-all border border-teal-200/80 flex items-center gap-1">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
            <div class="text-[#005F61] font-bold flex items-center gap-1 bg-slate-100 px-2 py-1.5 rounded-md">
              <span>Detay</span>
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
  const lossEl = document.getElementById('modal-loss');
  if (lossEl) {
    const hasLoss = analysis.loss === 'Evet' || analysis.loss === true;
    lossEl.textContent = hasLoss ? 'Evet, bilgi eksik' : 'Hayır, bilgi duruyor';
    lossEl.className = `text-sm font-bold ${hasLoss ? 'text-rose-600' : 'text-emerald-600'}`;
  }
  document.getElementById('modal-sentiment').textContent = plainSentiment(analysis.sentiment);
  document.getElementById('modal-ambiguity').textContent = plainAmbiguity(analysis.ambiguity).text;

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

  const officialBtn = document.getElementById('modal-official-doc-btn');
  if (officialBtn) {
    officialBtn.onclick = () => {
      closeExpandedCardModal();
      switchToOfficialDocTab(platformId);
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
  switchToTab('analytics');
  renderAnalyticsDetail();
}

function renderSideBySideTexts() {
  const coreEl = document.getElementById('analytics-core-text');
  const targetEl = document.getElementById('analytics-target-text');
  const labelEl = document.getElementById('analytics-target-label');
  const platformId = appState.selectedPlatformForDiff || 'x_twitter';
  if (coreEl) coreEl.textContent = appState.coreMessage || '—';
  if (targetEl) targetEl.textContent = appState.transformedMessages[platformId] || 'Henüz dönüşüm yok.';
  if (labelEl) labelEl.textContent = getPlatformDisplayName(platformId);
}

function plainSentiment(label) {
  if (!label) return 'Belirsiz';
  const l = String(label).toUpperCase();
  if (l.includes('POS')) return 'Olumlu';
  if (l.includes('NEG')) return 'Olumsuz';
  return String(label);
}

function plainAmbiguity(level) {
  const a = String(level || '').toLowerCase();
  if (a.includes('yüksek') || a.includes('high')) return { text: 'Karışık / belirsiz', ok: false };
  if (a.includes('orta') || a.includes('medium')) return { text: 'Orta düzeyde net', ok: true };
  return { text: 'Net ve açık', ok: true };
}

function renderAnalyticsKPIs() {
  const results = appState.analysisResults || [];
  const avgEl = document.getElementById('kpi-avg-sim');
  const lossEl = document.getElementById('kpi-info-loss');
  const ctaEl = document.getElementById('kpi-cta-count');
  const ambEl = document.getElementById('kpi-high-ambiguity');
  const avgHint = document.getElementById('kpi-avg-sim-hint');
  const lossHint = document.getElementById('kpi-info-loss-hint');
  const ctaHint = document.getElementById('kpi-cta-hint');
  const ambHint = document.getElementById('kpi-amb-hint');

  if (!results.length) {
    if (avgEl) avgEl.textContent = '—';
    if (lossEl) lossEl.textContent = '—';
    if (ctaEl) ctaEl.textContent = '—';
    if (ambEl) ambEl.textContent = '—';
    return;
  }

  const sims = results.map(r => Number(r.sim) || 0);
  const avg = sims.reduce((a, b) => a + b, 0) / sims.length;
  const lossCount = results.filter(r => r.loss === 'Evet' || r.loss === true).length;
  const ctaCount = results.filter(r => r.cta === 'Evet' || r.cta === true).length;
  const highAmb = results.filter(r => {
    const a = String(r.ambiguity || '').toLowerCase();
    return a.includes('yüksek') || a.includes('high');
  }).length;
  const total = results.length;

  if (avgEl) avgEl.textContent = `%${avg.toFixed(0)}`;
  if (lossEl) lossEl.textContent = `${lossCount} / ${total}`;
  if (ctaEl) ctaEl.textContent = `${ctaCount} / ${total}`;
  if (ambEl) ambEl.textContent = `${highAmb} / ${total}`;

  if (avgHint) {
    avgHint.textContent = avg >= 80
      ? 'İyi: Mesajlar genel olarak aynı anlamı taşıyor.'
      : avg >= 60
        ? 'Orta: Bazı platformlarda anlam kayması var.'
        : 'Dikkat: Anlam birçok yerde değişmiş.';
  }
  if (lossHint) {
    lossHint.textContent = lossCount === 0
      ? 'Güzel: Kritik bilgiler korunmuş görünüyor.'
      : `${lossCount} platformda tarih/sayı/yer gibi bilgiler eksik kalmış.`;
  }
  if (ctaHint) {
    ctaHint.textContent = ctaCount === 0
      ? 'Çoğu metin sadece bilgilendiriyor; net “yapın” çağrısı az.'
      : `${ctaCount} metinde okuyucuya net bir eylem çağrısı var.`;
  }
  if (ambHint) {
    ambHint.textContent = highAmb === 0
      ? 'Anlatım genel olarak net.'
      : `${highAmb} metin kaçamak veya belirsiz görünüyor.`;
  }
}

function renderDegradationChain() {
  const tbody = document.getElementById('degradation-chain-body');
  const listEl = document.getElementById('degradation-chain-list');
  const badge = document.getElementById('degradation-summary-badge');
  const steps = Array.isArray(appState.degradationChain) ? appState.degradationChain : [];
  const meta = appState.degradationMeta || {};

  if (badge) {
    if (!steps.length) {
      badge.textContent = 'Henüz analiz yok';
      badge.className = 'text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 self-start';
    } else if (meta.has_breaking_point) {
      badge.textContent = `En çok burada bozuldu: ${meta.breaking_point_channel || 'bir platform'}`;
      badge.className = 'text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 self-start';
    } else {
      badge.textContent = 'Zincirde büyük kırılma yok';
      badge.className = 'text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 self-start';
    }
  }

  if (tbody) {
    if (!steps.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-sm text-slate-400">Önce bir mesaj dönüştürüp analiz edin.</td></tr>';
    } else {
      tbody.innerHTML = steps.map((s) => {
        const idx = s.step_index ?? s.step ?? '—';
        const name = s.channel_name || getPlatformDisplayName(s.channel) || s.channel || '—';
        const consSim = s.consecutive_similarity ?? s.sim ?? 0;
        const consDev = s.consecutive_deviation ?? s.dev ?? 0;
        const cumSim = s.cumulative_similarity ?? s.cum ?? 0;
        const isBp = s.is_breaking_point ?? s.is_bp ?? false;
        const pct = (v) => (Number(v) <= 1 ? (Number(v) * 100).toFixed(0) : Number(v).toFixed(0));
        return `
          <tr class="border-b border-slate-100 text-sm ${isBp ? 'bg-rose-50/70' : 'hover:bg-slate-50'}">
            <td class="py-3 px-3 font-bold text-slate-700">${idx}</td>
            <td class="py-3 px-3 font-semibold text-slate-800">${escapeHtml(String(name))}</td>
            <td class="py-3 px-3 text-emerald-600 font-bold">%${pct(consSim)}</td>
            <td class="py-3 px-3 text-amber-700 font-bold">%${pct(consDev)} saptı</td>
            <td class="py-3 px-3 text-slate-700 font-semibold">%${pct(cumSim)}</td>
            <td class="py-3 px-3">${isBp ? '<span class="px-2 py-1 rounded text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">Burada bozuldu</span>' : '<span class="text-emerald-600 text-xs font-semibold">Normal</span>'}</td>
          </tr>`;
      }).join('');
    }
  }

  if (listEl) {
    if (!steps.length) {
      listEl.innerHTML = '';
      return;
    }
    listEl.innerHTML = steps.map((s, i) => {
      const name = s.channel_name || getPlatformDisplayName(s.channel) || s.channel || `Adım ${i + 1}`;
      const consDev = s.consecutive_deviation ?? s.dev ?? 0;
      const devPct = Number(consDev) <= 1 ? Number(consDev) * 100 : Number(consDev);
      const isBp = s.is_breaking_point ?? s.is_bp ?? false;
      const width = Math.min(100, Math.max(4, Math.round(devPct)));
      return `
        <div class="flex items-center gap-3 p-3 rounded-xl border ${isBp ? 'border-rose-200 bg-rose-50/50' : 'border-slate-100 bg-slate-50/50'}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${isBp ? 'bg-rose-600 text-white' : 'bg-teal-600 text-white'}">${s.step_index ?? i + 1}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-bold text-slate-800 truncate">${escapeHtml(String(name))}</span>
              <span class="text-xs font-bold ${isBp ? 'text-rose-600' : 'text-slate-500'}">${isBp ? 'En çok burada bozuldu' : `%${devPct.toFixed(0)} saptı`}</span>
            </div>
            <div class="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div class="h-full rounded-full ${isBp ? 'bg-rose-500' : 'bg-[#00A3A6]'}" style="width:${width}%"></div>
            </div>
          </div>
        </div>`;
    }).join('');
  }
}

// GitHub Stili Diff Viewer (Kelime Karşılaştırma)
function renderDiffViewer() {
  const container = document.getElementById('diff-viewer-content');
  if (!container) return;

  const coreWords = appState.coreMessage.split(/\s+/);
  const targetText = appState.transformedMessages[appState.selectedPlatformForDiff] || "";
  const targetWords = targetText.split(/\s+/);

  const diffResult = computeWordDiff(coreWords, targetWords);

  if (!appState.coreMessage && !targetText) {
    container.innerHTML = '<p class="text-sm text-slate-400 text-center py-10">Önce bir mesaj yazıp dönüştürün. Farklar burada görünecek.</p>';
    return;
  }

  let html = `<div class="text-sm leading-relaxed space-y-1">`;
  html += `<div class="p-3 bg-slate-800 text-slate-100 rounded-lg mb-3 text-xs font-semibold">`;
  html += `<span>Asıl mesaj ↔ ${escapeHtml(getPlatformDisplayName(appState.selectedPlatformForDiff))}</span>`;
  html += `</div>`;

  html += `<div class="p-4 bg-white border border-slate-200 rounded-lg">`;
  if (!diffResult.length) {
    html += `<span class="text-slate-400">Karşılaştırılacak metin yok.</span>`;
  } else {
    diffResult.forEach(item => {
      if (item.type === 'removed') {
        html += `<span class="diff-deleted">${escapeHtml(item.word)}</span> `;
      } else if (item.type === 'added') {
        html += `<span class="diff-inserted">${escapeHtml(item.word)}</span> `;
      } else {
        html += `<span class="text-slate-700">${escapeHtml(item.word)}</span> `;
      }
    });
  }
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

function getAlignedSimScores() {
  return PLATFORMS_CONFIG.map(p => {
    const a = appState.analysisResults.find(r => r.channel === p.id);
    return a ? Number(a.sim) || 0 : 0;
  });
}

function renderRadarChart() {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;

  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  const platforms = PLATFORMS_CONFIG.map(p => p.name.split(' ')[0]);
  const simScores = getAlignedSimScores();

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: platforms,
      datasets: [{
        label: 'Anlam aynı mı? (%)',
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
  const scores = getAlignedSimScores();

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: platforms,
      datasets: [{
        label: 'Anlam korunma (%)',
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

  if (!appState.analysisResults.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-sm text-slate-400">Önce bir mesaj dönüştürüp analiz edin.</td></tr>';
    return;
  }

  const selected = appState.selectedPlatformForDiff;
  appState.analysisResults.forEach(item => {
    const pName = getPlatformDisplayName(item.channel);
    const sim = Number(item.sim) || 0;
    const simClass = sim >= 80 ? 'text-emerald-600' : sim >= 60 ? 'text-amber-600' : 'text-rose-600';
    const hasLoss = item.loss === 'Evet' || item.loss === true;
    const hasCta = item.cta === 'Evet' || item.cta === true;
    const amb = plainAmbiguity(item.ambiguity);
    const isSelected = item.channel === selected;
    const tr = document.createElement('tr');
    tr.className = `transition-colors border-b border-slate-100 text-sm cursor-pointer ${isSelected ? 'bg-teal-50/80' : 'hover:bg-slate-50'}`;
    tr.title = 'Ayrıntı için tıklayın';
    tr.onclick = () => selectAnalyticsPlatform(item.channel);
    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-800">${pName}${isSelected ? ' <span class="text-[10px] text-teal-700 font-bold">← seçili</span>' : ''}</td>
      <td class="py-3 px-4 ${simClass} font-bold">%${sim} ${sim >= 80 ? '(iyi)' : sim >= 60 ? '(orta)' : '(düşük)'}</td>
      <td class="py-3 px-4">${hasLoss ? '<span class="text-rose-600 font-semibold">Evet, eksik var</span>' : '<span class="text-emerald-600 font-semibold">Hayır, duruyor</span>'}</td>
      <td class="py-3 px-4">${hasCta ? '<span class="text-emerald-600 font-semibold">Evet, çağrı var</span>' : '<span class="text-slate-500">Hayır</span>'}</td>
      <td class="py-3 px-4 font-medium">${plainSentiment(item.sentiment)}</td>
      <td class="py-3 px-4"><span class="px-2 py-1 rounded text-xs font-semibold ${amb.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}">${amb.text}</span></td>
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
    <img src="${CIB_LOGO_URL}" alt="" class="toast-logo">
    <i data-lucide="${iconMap[type] || 'info'}" class="w-4 h-4 text-[#00A3A6] shrink-0"></i>
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
      {
        channel: 'press_release', sim: 94.2, loss: 'Hayır', cta: 'Hayır', sentiment: 'POS', ambiguity: 'Düşük',
        details: {
          factDetails: [{ label: 'LOC', value: 'Elazığ', found: true }, { label: 'SAYI_FINANS', value: '1 gün', found: true }],
          checkedFacts: 2, infoLossRate: 100, hasCta: false, ctaWords: [], ctaSentences: [], ctaPerson: 'Yok',
          sentimentPos: 0.91, sentimentNeg: 0.09, sentimentIntensity: 0.35, emojiCount: 0, punctCount: 0,
          clarityScore: 0.88, mostAmbiguousSentence: 'Kamuoyuna saygıyla duyurulur.',
          ambiguitySentences: [{ cumle: 'Kamuoyuna saygıyla duyurulur.', belirsizlik_skoru: 0.18 }]
        }
      },
      {
        channel: 'agency_news', sim: 91.5, loss: 'Hayır', cta: 'Hayır', sentiment: 'POS', ambiguity: 'Düşük',
        details: {
          factDetails: [{ label: 'LOC', value: 'Elazığ', found: true }],
          checkedFacts: 1, infoLossRate: 100, hasCta: false, ctaWords: [], ctaSentences: [], ctaPerson: 'Yok',
          sentimentPos: 0.84, sentimentNeg: 0.16, sentimentIntensity: 0.4, emojiCount: 0, punctCount: 0,
          clarityScore: 0.8, mostAmbiguousSentence: '', ambiguitySentences: []
        }
      },
      {
        channel: 'tabloid', sim: 72.8, loss: 'Evet', cta: 'Hayır', sentiment: 'POS', ambiguity: 'Yüksek',
        details: {
          factDetails: [{ label: 'LOC', value: 'Elazığ', found: false }, { label: 'SAYI_FINANS', value: '1 gün', found: false }],
          checkedFacts: 2, infoLossRate: 0, hasCta: false, ctaWords: [], ctaSentences: [], ctaPerson: 'Yok',
          sentimentPos: 0.7, sentimentNeg: 0.3, sentimentIntensity: 0.85, emojiCount: 2, punctCount: 4,
          clarityScore: 0.28, mostAmbiguousSentence: 'Gelişme gündeme adeta bomba gibi düştü!',
          ambiguitySentences: [{ cumle: 'Gelişme gündeme adeta bomba gibi düştü!', belirsizlik_skoru: 0.72 }]
        }
      },
      {
        channel: 'x_twitter', sim: 86.4, loss: 'Hayır', cta: 'Evet', sentiment: 'POS', ambiguity: 'Düşük',
        details: {
          factDetails: [{ label: 'LOC', value: 'Elazığ', found: true }],
          checkedFacts: 1, infoLossRate: 100, hasCta: true, ctaWords: ['takip'],
          ctaSentences: ['Resmi açıklamaları ve gelişmeleri anlık olarak hesabımızdan takip edebilirsiniz.'],
          ctaPerson: '2. Çoğul (Siz)',
          sentimentPos: 0.78, sentimentNeg: 0.22, sentimentIntensity: 0.55, emojiCount: 3, punctCount: 1,
          clarityScore: 0.82, mostAmbiguousSentence: '', ambiguitySentences: []
        }
      },
      {
        channel: 'linkedin', sim: 82.1, loss: 'Hayır', cta: 'Hayır', sentiment: 'POS', ambiguity: 'Orta',
        details: {
          factDetails: [{ label: 'LOC', value: 'Elazığ', found: true }],
          checkedFacts: 1, infoLossRate: 100, hasCta: false, ctaWords: [], ctaSentences: [], ctaPerson: 'Yok',
          sentimentPos: 0.88, sentimentNeg: 0.12, sentimentIntensity: 0.3, emojiCount: 0, punctCount: 0,
          clarityScore: 0.55, mostAmbiguousSentence: 'Kurumsal süreçlerimiz ve paydaş koordinasyonumuz kararlılıkla sürdürülmektedir.',
          ambiguitySentences: []
        }
      },
      {
        channel: 'vertical_video', sim: 68.3, loss: 'Evet', cta: 'Evet', sentiment: 'POS', ambiguity: 'Orta',
        details: {
          factDetails: [{ label: 'LOC', value: 'Elazığ', found: true }, { label: 'SAYI_FINANS', value: '1 gün', found: false }],
          checkedFacts: 2, infoLossRate: 50, hasCta: true, ctaWords: ['unutmayın'],
          ctaSentences: ['Resmi duyuruları takip etmeyi unutmayın!'],
          ctaPerson: '2. Çoğul (Siz)',
          sentimentPos: 0.75, sentimentNeg: 0.25, sentimentIntensity: 0.6, emojiCount: 0, punctCount: 2,
          clarityScore: 0.5, mostAmbiguousSentence: '', ambiguitySentences: []
        }
      },
      {
        channel: 'messaging_chain', sim: 88.0, loss: 'Hayır', cta: 'Evet', sentiment: 'POS', ambiguity: 'Düşük',
        details: {
          factDetails: [{ label: 'LOC', value: 'Elazığ', found: true }],
          checkedFacts: 1, infoLossRate: 100, hasCta: true, ctaWords: ['iletelim'],
          ctaSentences: ['Haberi olmayan arkadaşlara ve WhatsApp gruplarına iletelim lütfen.'],
          ctaPerson: 'Tavsiye / Dolaylı',
          sentimentPos: 0.8, sentimentNeg: 0.2, sentimentIntensity: 0.45, emojiCount: 2, punctCount: 0,
          clarityScore: 0.85, mostAmbiguousSentence: '', ambiguitySentences: []
        }
      },
      {
        channel: 'official_letter', sim: 95.6, loss: 'Hayır', cta: 'Hayır', sentiment: 'POS', ambiguity: 'Düşük',
        details: {
          factDetails: [{ label: 'LOC', value: 'Elazığ', found: true }, { label: 'SAYI_FINANS', value: '1 gün', found: true }],
          checkedFacts: 2, infoLossRate: 100, hasCta: false, ctaWords: [], ctaSentences: [], ctaPerson: 'Yok',
          sentimentPos: 0.7, sentimentNeg: 0.3, sentimentIntensity: 0.25, emojiCount: 0, punctCount: 0,
          clarityScore: 0.9, mostAmbiguousSentence: '', ambiguitySentences: []
        }
      }
    ],
    degradationChain: [
      { step_index: 1, channel_name: 'Resmi Yazı / Dilekçe', consecutive_similarity: 0.956, consecutive_deviation: 0.044, cumulative_similarity: 0.956, is_breaking_point: false },
      { step_index: 2, channel_name: 'Basın Açıklaması', consecutive_similarity: 0.942, consecutive_deviation: 0.058, cumulative_similarity: 0.942, is_breaking_point: false },
      { step_index: 3, channel_name: 'Ajans Haberi (AA/İHA)', consecutive_similarity: 0.915, consecutive_deviation: 0.085, cumulative_similarity: 0.915, is_breaking_point: false },
      { step_index: 4, channel_name: 'X (Twitter)', consecutive_similarity: 0.864, consecutive_deviation: 0.136, cumulative_similarity: 0.864, is_breaking_point: false },
      { step_index: 5, channel_name: 'Magazin / Tabloid', consecutive_similarity: 0.728, consecutive_deviation: 0.272, cumulative_similarity: 0.728, is_breaking_point: true }
    ],
    degradationMeta: {
      has_breaking_point: true,
      breaking_point_channel: 'tabloid',
      max_consecutive_deviation: 0.272
    }
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
    container.innerHTML = '<span class="text-xs text-teal-100/70 italic">Henüz arama geçmişi yok.</span>';
    return;
  }

  container.innerHTML = history.map(item => `
    <button
      onclick="loadFromHistory('${escapeHtml(item.text).replace(/'/g, "\\'")}')"
      class="px-3 py-1 rounded-md text-xs font-semibold bg-white/15 border border-white/25 text-white hover:bg-white/25 transition-colors truncate max-w-xs backdrop-blur-sm"
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

// ============================================================
// DOĞRULUK LABORATUVARI (Benchmark Lab)
// ============================================================

async function runBenchmarkLab() {
  const btn = document.getElementById('btn-run-benchmark');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="animate-pulse">Analiz motoru çalışıyor...</span>';
  }
  showToast('🧪 5 altın senaryo Colab algoritmasıyla test ediliyor...', 'info');

  const container = document.getElementById('lab-scenario-results');
  if (container) {
    container.innerHTML = `
      <div class="corporate-card p-8 text-center space-y-3">
        <div class="w-10 h-10 mx-auto rounded-full border-4 border-[#00A3A6] border-t-transparent animate-spin"></div>
        <p class="text-sm text-slate-600 font-medium">Analiz modelleri yükleniyor, lütfen bekleyin...</p>
        <p class="text-xs text-slate-400">İlk çalıştırmada 30-60 sn sürebilir</p>
      </div>`;
  }

  try {
    const res = await fetch('/api/benchmark', { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());
    const report = await res.json();
    appState.lastBenchmark = report;
    renderBenchmarkReport(report);
    loadServerHistory();
    showToast(`🎯 Doğruluk: %${report.overall_accuracy} — ${report.grade}`, 'success');
  } catch (err) {
    console.error(err);
    if (container) {
      container.innerHTML = `<div class="corporate-card p-6 text-rose-600 text-sm">Benchmark hatası: ${escapeHtml(String(err.message || err))}</div>`;
    }
    showToast('Benchmark çalıştırılamadı.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i><span>5 Senaryoyu Çalıştır</span>';
      initLucideIcons();
    }
  }
}

function renderBenchmarkReport(report) {
  const overallEl = document.getElementById('lab-overall');
  const gradeEl = document.getElementById('lab-grade');
  const passedEl = document.getElementById('lab-passed');
  const mmdEl = document.getElementById('lab-mmd');
  const summaryEl = document.getElementById('lab-summary');
  const container = document.getElementById('lab-scenario-results');

  if (overallEl) overallEl.textContent = `%${report.overall_accuracy}`;
  if (gradeEl) gradeEl.textContent = report.grade || '—';
  if (passedEl) passedEl.textContent = `${report.total_passed}/${report.total_checks}`;
  if (mmdEl) mmdEl.textContent = report.degradation_smoke?.ok ? 'OK ✅' : 'HATA ❌';
  if (summaryEl) summaryEl.textContent = report.summary || '';

  if (!container || !report.scenarios) return;

  container.innerHTML = report.scenarios.map((sc) => {
    const accColor = sc.accuracy >= 80 ? 'text-emerald-600' : sc.accuracy >= 60 ? 'text-amber-600' : 'text-rose-600';
    const rows = (sc.platforms || []).map((p) => {
      const a = p.actual || {};
      const checksHtml = (p.score?.checks || []).map((c) => `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${c.pass ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}">
          ${c.pass ? '✓' : '✗'} ${escapeHtml(c.metric)}
        </span>`).join('');
      return `
        <div class="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="font-bold text-sm text-slate-800">${escapeHtml(p.channel_name || p.channel)}</div>
            <div class="text-xs font-black ${p.score?.accuracy >= 80 ? 'text-emerald-600' : 'text-rose-600'}">Mecra doğruluk: %${p.score?.accuracy ?? 0}</div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
            <div><span class="text-slate-500">Anlam aynı mı?</span><br><strong>%${a.sim ?? '-'}</strong></div>
            <div><span class="text-slate-500">Bilgi kayıp mı?</span><br><strong>${a.info_loss ? 'Evet, eksik' : 'Hayır'}</strong></div>
            <div><span class="text-slate-500">Çağrı var mı?</span><br><strong>${a.has_cta ? 'Evet' : 'Hayır'}</strong></div>
            <div><span class="text-slate-500">Duygu</span><br><strong>${escapeHtml(plainSentiment(a.sentiment))}</strong></div>
            <div><span class="text-slate-500">Anlatım net mi?</span><br><strong>${escapeHtml(plainAmbiguity(a.ambiguity).text)}</strong></div>
          </div>
          <div class="flex flex-wrap gap-1.5">${checksHtml}</div>
          <details class="text-xs text-slate-500">
            <summary class="cursor-pointer font-semibold text-slate-600">Mecra metni</summary>
            <pre class="mt-2 whitespace-pre-wrap bg-white border border-slate-200 rounded-lg p-3 text-slate-700">${escapeHtml(p.transformed_content || '')}</pre>
          </details>
        </div>`;
    }).join('');

    return `
      <div class="corporate-card p-5 space-y-3">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-[#00A3A6]">${escapeHtml(sc.id)}</div>
            <h4 class="font-bold text-slate-900">${escapeHtml(sc.name)}</h4>
            <p class="text-xs text-slate-500 mt-1 max-w-2xl">${escapeHtml(sc.core)}</p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-black ${accColor}">%${sc.accuracy}</div>
            <div class="text-[11px] text-slate-500">${sc.passed}/${sc.total} kontrol</div>
          </div>
        </div>
        <div class="space-y-3">${rows}</div>
      </div>`;
  }).join('');

  initLucideIcons();
}

async function loadServerHistory() {
  const listEl = document.getElementById('lab-server-history');
  if (!listEl) return;
  try {
    const res = await fetch('/api/history?limit=20');
    if (!res.ok) throw new Error('history fetch failed');
    const data = await res.json();
    const items = data.items || [];
    if (!items.length) {
      listEl.innerHTML = '<p class="text-xs text-slate-400 italic">Sunucu geçmişi boş. Benchmark veya analiz çalıştır.</p>';
      return;
    }
    listEl.innerHTML = items.map((item) => {
      const isBench = item.type === 'benchmark';
      const title = isBench
        ? `Benchmark — %${item.overall_accuracy} (${escapeHtml(item.grade || '')})`
        : `Analiz — ${escapeHtml((item.core_message || '').substring(0, 70))}`;
      return `
        <button onclick="openHistoryDetail('${item.id}')" class="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-[#00A3A6] hover:bg-teal-50/40 transition-colors flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs font-bold text-slate-800 truncate">${title}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(item.created_at || '')} · ${isBench ? '🧪 Lab' : '📊 Analiz'}</div>
          </div>
          <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 shrink-0"></i>
        </button>`;
    }).join('');
    initLucideIcons();
  } catch (e) {
    listEl.innerHTML = '<p class="text-xs text-rose-500">Geçmiş yüklenemedi (sunucu kapalı olabilir).</p>';
  }
}

async function openHistoryDetail(id) {
  const detail = document.getElementById('lab-history-detail');
  if (!detail) return;
  detail.classList.remove('hidden');
  detail.innerHTML = '<p class="text-xs text-slate-400">Yükleniyor...</p>';
  try {
    const item = await fetchHistoryItem(id);
    if (item.type === 'benchmark' && item.report) {
      renderBenchmarkReport(item.report);
      detail.innerHTML = `<p class="text-sm text-emerald-700 font-semibold">Bu benchmark raporu yukarıdaki lab paneline yüklendi. (ID: ${escapeHtml(id)})</p>`;
      return;
    }
    detail.innerHTML = renderHistoryAnalysisHtml(item, id);
  } catch (e) {
    detail.innerHTML = '<p class="text-xs text-rose-500">Detay açılamadı.</p>';
  }
}

async function fetchHistoryItem(id) {
  const res = await fetch(`/api/history/${id}`);
  if (!res.ok) throw new Error('not found');
  return res.json();
}

function renderHistoryAnalysisHtml(item, id) {
  const platforms = item.platforms || [];
  const deg = item.degradation_chain;
  const degSteps = deg && deg.steps ? deg.steps : [];
  return `
    <h4 class="font-bold text-sm text-slate-800">Analiz Detayı</h4>
    <p class="text-xs text-slate-600 mb-2">${escapeHtml(item.core_message || '')}</p>
    <div class="overflow-x-auto mb-3">
      <table class="w-full text-xs text-left">
        <thead><tr class="bg-slate-50 text-slate-500 uppercase tracking-wider">
          <th class="py-2 px-2">Platform</th><th class="py-2 px-2">Anlam aynı mı?</th><th class="py-2 px-2">Bilgi kayıp mı?</th><th class="py-2 px-2">Çağrı var mı?</th><th class="py-2 px-2">Duygu</th><th class="py-2 px-2">Anlatım net mi?</th>
        </tr></thead>
        <tbody>
          ${platforms.map(p => `
            <tr class="border-b border-slate-100">
              <td class="py-2 px-2 font-semibold">${escapeHtml(p.name || p.id)}</td>
              <td class="py-2 px-2 text-emerald-600 font-bold">%${p.semantic_similarity ?? '-'}</td>
              <td class="py-2 px-2">${p.info_loss ? 'Evet, eksik' : 'Hayır'}</td>
              <td class="py-2 px-2">${p.has_cta ? 'Evet' : (p.cta_strength && p.cta_strength !== '-' ? 'Evet' : 'Hayır')}</td>
              <td class="py-2 px-2">${escapeHtml(plainSentiment(p.sentiment))}</td>
              <td class="py-2 px-2">${escapeHtml(plainAmbiguity(p.ambiguity).text)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${degSteps.length ? `<p class="text-[11px] text-slate-500 mb-2">Zincir: ${deg.has_breaking_point ? 'En çok bir adımda bozuldu' : 'Büyük kırılma yok'}</p>` : ''}
    <div class="flex flex-wrap gap-2">
      <button onclick="loadHistoryAnalysisIntoApp('${escapeHtml(id)}')" class="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00A3A6] hover:bg-[#007D80]">Analize Yükle</button>
      <button onclick="switchToTab('analytics')" class="px-3 py-1.5 rounded-lg text-xs font-bold text-[#00A3A6] bg-teal-50 border border-teal-200">Analiz Sekmesi</button>
    </div>`;
}

async function loadHistoryPage() {
  const listEl = document.getElementById('history-page-list');
  if (!listEl) return;
  listEl.innerHTML = '<p class="text-xs text-slate-400 italic py-4 text-center">Yükleniyor...</p>';
  try {
    const res = await fetch('/api/history?limit=50');
    if (!res.ok) throw new Error('history fetch failed');
    const data = await res.json();
    const items = data.items || [];
    if (!items.length) {
      listEl.innerHTML = '<p class="text-xs text-slate-400 italic py-4 text-center">Sunucu geçmişi boş. Analiz veya benchmark çalıştırın.</p>';
      return;
    }
    listEl.innerHTML = items.map((item) => {
      const isBench = item.type === 'benchmark';
      const title = isBench
        ? `Benchmark — %${item.overall_accuracy} (${escapeHtml(item.grade || '')})`
        : `Analiz — ${escapeHtml((item.core_message || '').substring(0, 80))}`;
      return `
        <button onclick="openHistoryPageDetail('${item.id}')" class="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-[#00A3A6] hover:bg-teal-50/40 transition-colors flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs font-bold text-slate-800 truncate">${title}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(item.created_at || '')} · ${isBench ? 'Lab' : 'Analiz'}</div>
          </div>
          <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 shrink-0"></i>
        </button>`;
    }).join('');
    initLucideIcons();
  } catch (e) {
    listEl.innerHTML = '<p class="text-xs text-rose-500 py-4 text-center">Geçmiş yüklenemedi (sunucu kapalı olabilir).</p>';
  }
}

async function openHistoryPageDetail(id) {
  const detail = document.getElementById('history-page-detail');
  if (!detail) return;
  detail.innerHTML = '<p class="text-xs text-slate-400">Yükleniyor...</p>';
  try {
    const item = await fetchHistoryItem(id);
    if (item.type === 'benchmark' && item.report) {
      detail.innerHTML = `
        <div class="space-y-3">
          <h4 class="font-bold text-sm text-slate-800">Benchmark Kaydı</h4>
          <p class="text-sm text-slate-600">Doğruluk: <strong>%${item.report.overall_accuracy}</strong> — ${escapeHtml(item.report.grade || '')}</p>
          <p class="text-xs text-slate-500">${escapeHtml(item.report.summary || '')}</p>
          <div class="flex flex-wrap gap-2">
            <button onclick="loadHistoryBenchmarkIntoLab('${escapeHtml(id)}')" class="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00A3A6] hover:bg-[#007D80]">Lab'a Yükle</button>
            <button onclick="switchToTab('lab')" class="px-3 py-1.5 rounded-lg text-xs font-bold text-[#00A3A6] bg-teal-50 border border-teal-200">Lab Sekmesi</button>
          </div>
        </div>`;
      return;
    }
    detail.innerHTML = renderHistoryAnalysisHtml(item, id);
  } catch (e) {
    detail.innerHTML = '<p class="text-xs text-rose-500">Detay açılamadı.</p>';
  }
}

async function loadHistoryBenchmarkIntoLab(id) {
  try {
    const item = await fetchHistoryItem(id);
    if (item.type === 'benchmark' && item.report) {
      appState.lastBenchmark = item.report;
      switchToTab('lab');
      renderBenchmarkReport(item.report);
      showToast('Benchmark raporu lab paneline yüklendi.', 'success');
    }
  } catch (e) {
    showToast('Benchmark yüklenemedi.', 'error');
  }
}

async function loadHistoryAnalysisIntoApp(id) {
  try {
    const item = await fetchHistoryItem(id);
    const platforms = item.platforms || [];
    appState.coreMessage = item.core_message || appState.coreMessage;
    const input = document.getElementById('core-message-input');
    if (input) input.value = appState.coreMessage;

    const transformedObj = {};
    platforms.forEach(p => {
      transformedObj[p.id] = p.transformed_content || '';
    });

    appState.transformedMessages = transformedObj;
    appState.analysisResults = platforms.map(mapPlatformAnalysis);
    const deg = item.degradation_chain || null;
    appState.degradationChain = deg && deg.steps ? deg.steps : [];
    appState.degradationMeta = deg ? {
      has_breaking_point: deg.has_breaking_point,
      breaking_point_channel: deg.breaking_point_channel,
      max_consecutive_deviation: deg.max_consecutive_deviation
    } : null;

    refreshAnalyticsViews();
    switchToTab('analytics');
    showToast('Geçmiş analiz analitik paneline yüklendi.', 'success');
  } catch (e) {
    showToast('Analiz yüklenemedi.', 'error');
  }
}

function renderHistoryPageLocalChips() {
  const container = document.getElementById('history-page-local-chips');
  if (!container) return;
  const history = getHistory();
  if (!history.length) {
    container.innerHTML = '<span class="text-xs text-slate-400 italic">Yerel geçmiş boş.</span>';
    return;
  }
  container.innerHTML = history.slice(0, 12).map(item => `
    <button
      onclick="loadFromHistory('${escapeHtml(item.text).replace(/'/g, "\\'")}'); switchToTab('dashboard');"
      class="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:border-[#00A3A6] hover:text-[#00A3A6] transition-colors shadow-sm truncate max-w-xs"
      title="${escapeHtml(item.text)}"
    >${escapeHtml(item.text.length > 45 ? item.text.substring(0, 45) + '...' : item.text)}</button>
  `).join('');
}

// ============================================================
// KURUMSAL EVRAK (Official Document)
// ============================================================

function switchOfficialDocChannel(channelId) {
  appState.selectedOfficialChannel = channelId;
  renderOfficialDocument(channelId);
}

function updatePressReleaseDraft() {
  const select = document.getElementById('official-doc-channel-select');
  const channelId = select ? select.value : (appState.selectedOfficialChannel || 'press_release');
  renderOfficialDocument(channelId);
}

function getTodayFormattedDate() {
  const today = new Date();
  return String(today.getDate()).padStart(2, '0') + '.' + String(today.getMonth() + 1).padStart(2, '0') + '.' + today.getFullYear();
}

function getChannelTitleUpper(channelId) {
  const titleMap = {
    press_release: 'BASIN AÇIKLAMASI',
    official_letter: 'RESMİ YAZI VE İDARİ TALİMAT BELGESİ',
    agency_news: 'AJANS HABERİ VE BASIN BÜLTENİ',
    linkedin: 'STRATEJİK DİJİTAL YÖNETİŞİM BİLDİRİMİ',
    messaging_chain: 'VATANDAŞ BİLGİLENDİRME VE ANLIK DUYURU FORMU',
    vertical_video: 'DİKEY VİDEO PRODÜKSİYON SENARYO BELGESİ',
    x_twitter: 'DİJİTAL İLETİŞİM DUYURU KARTI',
    tabloid: 'MEDYA TAKİP VE BASIN BÜLTENİ'
  };
  return titleMap[channelId] || 'RESMİ KAMU DUYURUSU';
}

function formatTextToParagraphs(text) {
  if (!text) return '<p>İçerik yükleniyor...</p>';
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  if (!paragraphs.length) {
    return `<p>${escapeHtml(text)}</p>`;
  }
  return paragraphs.map(p => {
    const cleanP = p.trim();
    if (cleanP.includes('Kamuoyuna saygıyla duyurulur')) {
      return `<p class="font-bold text-slate-900 text-right mt-6 font-sans">${escapeHtml(cleanP)}</p>`;
    }
    return `<p>${escapeHtml(cleanP).replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

function renderOfficialDocument(channelId = 'press_release') {
  const paper = document.getElementById('press-release-paper');
  const badge = document.getElementById('official-doc-seriousness-badge');
  if (!paper) return;

  const rawMsg = appState.transformedMessages[channelId] || appState.coreMessage || 'Henüz dönüşüm yapılmadı.';
  const todayStr = getTodayFormattedDate();
  const logoUrl = CIB_LOGO_URL;

  const seriousnessConfig = {
    official_letter: { level: 'Resmiyet Seviyesi: %100 (Kamu Bürokrasisi)', badgeClass: 'bg-red-100 text-red-800 border-red-200' },
    press_release: { level: 'Resmiyet Seviyesi: %95 (Basın Müşavirliği)', badgeClass: 'bg-red-100 text-red-800 border-red-200' },
    agency_news: { level: 'Resmiyet Seviyesi: %90 (AA/İHA Ajans)', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
    linkedin: { level: 'Resmiyet Seviyesi: %85 (Kurumsal Dijital)', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200' },
    messaging_chain: { level: 'Resmiyet Seviyesi: %75 (Vatandaş Bilgilendirme)', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    vertical_video: { level: 'Resmiyet Seviyesi: %80 (Prodüksiyon Belgesi)', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
    x_twitter: { level: 'Resmiyet Seviyesi: %80 (Sosyal Medya Duyurusu)', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200' },
    tabloid: { level: 'Resmiyet Seviyesi: %65 (Medya Takip)', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' }
  };

  if (badge && seriousnessConfig[channelId]) {
    badge.textContent = seriousnessConfig[channelId].level;
    badge.className = `px-3 py-1 rounded-full text-xs font-black border ${seriousnessConfig[channelId].badgeClass}`;
  }

  if (channelId === 'official_letter') {
    paper.innerHTML = `
      <div class="text-center pb-5 mb-6" style="border-bottom: 3px double #0F172A;">
        <div class="flex items-center justify-center mb-3">
          <img src="${logoUrl}" alt="Logo" class="h-16 w-auto object-contain">
        </div>
        <div class="text-sm font-bold tracking-wider text-slate-800 uppercase font-sans">T.C. CUMHURBAŞKANLIĞI İLETİŞİM BAŞKANLIĞI</div>
        <div class="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-1 font-sans">Basın ve Yayın Dairesi Başkanlığı</div>
        <div class="text-lg font-extrabold uppercase mt-4 tracking-widest text-[#0F172A] font-sans">RESMİ YAZI VE İDARİ TALİMAT BELGESİ</div>
      </div>
      <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-6 pb-2 border-b border-slate-200 font-sans">
        <div>Sayı : <span contenteditable="true" class="editable-field">E-75249013-010.06-2026/4108</span></div>
        <div>Tarih : <span contenteditable="true" class="editable-field">${todayStr}</span></div>
      </div>
      <div class="text-sm font-bold text-slate-900 mb-6 font-sans text-center tracking-wide">İLGİLİ KURUM VE KURULUŞ MÜDÜRLÜKLERİNE</div>
      <div id="draft-content-editable" contenteditable="true" class="text-sm md:text-base leading-relaxed text-justify space-y-4 min-h-[350px] outline-none editable-content text-slate-900 font-serif">
        ${formatTextToParagraphs(rawMsg)}
      </div>
      <div class="mt-12 text-center font-sans">
        <div class="font-bold text-slate-900 text-sm">Ayşe YILDIZ</div>
        <div class="text-xs text-slate-600">Başkan a. / Genel Sekreter</div>
      </div>
      <div class="mt-10 pt-4 border-t border-slate-300 text-center text-[11px] text-slate-500 font-sans">
        <div class="font-bold text-slate-700">T.C. CUMHURBAŞKANLIĞI İLETİŞİM BAŞKANLIĞI</div>
        <div>Ziyagökalp Caddesi No: 43 Çankaya / ANKARA • Tel: 0312 590 20 00</div>
      </div>`;
  } else {
    paper.innerHTML = `
      <div class="text-center pb-5 mb-6" style="border-bottom: 3px double #b30000;">
        <div class="flex items-center justify-center mb-3">
          <img src="${logoUrl}" alt="Logo" class="h-16 w-auto object-contain">
        </div>
        <div class="text-sm font-bold tracking-wider text-slate-800 uppercase font-sans">T.C. CUMHURBAŞKANLIĞI İLETİŞİM BAŞKANLIĞI</div>
        <div class="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-1 font-sans">Basın ve Yayın Dairesi Başkanlığı</div>
        <div class="text-xl font-extrabold uppercase mt-4 tracking-widest text-[#b30000] font-sans">${getChannelTitleUpper(channelId)}</div>
      </div>
      <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-6 pb-2 border-b border-slate-200 font-sans">
        <div>Tarih: <span id="draft-date" contenteditable="true" class="editable-field">${todayStr}</span></div>
        <div>Evrak Kodu: <span id="draft-number" contenteditable="true" class="editable-field">B.02.1.İMB.0.10/2026-${channelId.toUpperCase()}</span></div>
      </div>
      <div id="draft-content-editable" contenteditable="true" class="text-sm md:text-base leading-relaxed text-justify space-y-4 min-h-[380px] outline-none editable-content text-slate-900 font-serif">
        ${formatTextToParagraphs(rawMsg)}
      </div>
      <div class="mt-14 pt-4 border-t border-slate-300 text-center text-[11px] text-slate-500 font-sans space-y-1">
        <div class="font-bold text-slate-700">T.C. CUMHURBAŞKANLIĞI İLETİŞİM BAŞKANLIĞI</div>
        <div>Ziyagökalp Caddesi No: 43 Çankaya / ANKARA • basin@iletisim.gov.tr • Tel: 0312 590 20 00</div>
      </div>`;
  }
}

function switchToOfficialDocTab(targetChannelId) {
  if (targetChannelId) {
    appState.selectedOfficialChannel = targetChannelId;
    const select = document.getElementById('official-doc-channel-select');
    if (select) select.value = targetChannelId;
  }
  switchToTab('official-doc');
  showToast(`Kurumsal Evrak — ${getPlatformDisplayName(appState.selectedOfficialChannel || 'press_release')}`, 'info');
}

function copyPressReleaseDraft() {
  const draftContent = document.getElementById('draft-content-editable');
  if (!draftContent) {
    showToast('Kopyalanacak evrak metni bulunamadı.', 'warning');
    return;
  }
  const textToCopy = draftContent.innerText || draftContent.textContent;
  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast('Evrak metni panoya kopyalandı!', 'success');
  }).catch(() => {
    showToast('Kopyalama başarısız.', 'error');
  });
}

function printPressReleaseDraft() {
  showToast('Yazdırma / PDF kaydetme ekranı açılıyor...', 'info');
  setTimeout(() => window.print(), 300);
}
