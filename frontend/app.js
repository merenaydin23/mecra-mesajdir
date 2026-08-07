/**
 * Mecra Mesajdır — Ön Yüz İnteraktif Mantık ve Grafik Yöneticisi
 */

// Uygulama Durum Yönetimi (Application State)
const appState = {
  activeTab: 'dashboard',
  coreMessage: '',
  isLoading: false,
  analysisReady: false,
  selectedPlatformForDiff: 'x_twitter',
  selectedOfficialChannel: 'press_release',
  transformedMessages: {},
  analysisResults: [],
  degradationChain: [],
  degradationMeta: null,
  lastBenchmark: null
};

// Mecra Tanımları ve İkonları
const VIDEO_CHANNEL_ID = 'vertical_video';

const PLATFORMS_CONFIG = [
  { 
    id: 'press_release', 
    name: 'Basın Açıklaması', 
    category: 'Resmi Duyuru', 
    icon: 'file-text'
  },
  { 
    id: 'official_letter', 
    name: 'Resmi Yazı / Dilekçe', 
    category: 'Resmi Bürokrasi', 
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
  clearStaleLocalHistoryOnce();
  initLucideIcons();
  initEventListeners();
  renderQuickHistoryChips();
  loadDefaultData();
  initTabNavigation();
  // Sunucu geçmişini de temiz başlangıç için senkronize et (bir kerelik bayrak)
  clearServerHistoryOnce();
});

function initLucideIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

/** Proofread LLM'inin eklediği "Düzenlenmiş metin:" etiketini temizler. */
function stripProofreadLabel(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  t = t.replace(
    /(?:^|\n)\s*(?:\*{0,2}|_{0,2}|`{0,2})?(?:düzenlenmiş|duzenlenmis|düzeltilmiş|duzeltilmis)\s+(?:metin|hali|hâli)\s*[:：\-–]\s*/gi,
    (m, offset) => (offset === 0 || m.startsWith('\n') ? (m.startsWith('\n') ? '\n' : '') : '')
  );
  // Metin ortasında kalan etiket
  t = t.replace(
    /(?:düzenlenmiş|duzenlenmis|düzeltilmiş|duzeltilmis)\s+(?:metin|hali|hâli)\s*[:：\-–]\s*/gi,
    ''
  );
  t = t.replace(
    /(?:corrected|proofread(?:ed)?)\s+text\s*[:：\-–]\s*/gi,
    ''
  );
  return t.replace(/^["'`]+|["'`]+$/g, '').trim();
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
  // Kaldırılan sekmeler
  if (targetTab === 'lab' || targetTab === 'tarihce') targetTab = targetTab === 'tarihce' ? 'theory' : 'history';

  const navButtons = document.querySelectorAll('.nav-tab-btn');
  const tabPages = document.querySelectorAll('.tab-page');
  appState.activeTab = targetTab;

  const activeClasses = ['bg-white', 'text-[#00A3A6]', 'font-bold', 'shadow-xs', 'border-slate-200/80', 'active'];
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
      // Geçmişe burada yazma — önce imla düzeltmesi, sonra düzeltilmiş metin kaydedilir
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
function clearStaleLocalHistoryOnce() {
  try {
    if (localStorage.getItem('mecra_history_wiped_v1') === '1') return;
    localStorage.removeItem('mecra_search_history');
    localStorage.setItem('mecra_history_wiped_v1', '1');
  } catch (_) { /* ignore */ }
}

async function clearServerHistoryOnce() {
  try {
    if (localStorage.getItem('mecra_server_history_wiped_v1') === '1') return;
    await fetch('/api/history', { method: 'DELETE' });
    localStorage.setItem('mecra_server_history_wiped_v1', '1');
  } catch (_) { /* ignore */ }
}

function loadDefaultData() {
  // Temiz başlangıç: mock / muq veri yükleme
  appState.transformedMessages = {};
  appState.analysisResults = [];
  appState.degradationChain = [];
  appState.degradationMeta = null;
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
    'GPE': 'Yer',
    'ORG': 'Kurum',
    'MISC': 'Kavram',
    'CONCEPT': 'Kavram',
    'DATE': 'Zaman',
    'TIME': 'Zaman',
    'MONEY': 'Para',
    'PERCENT': 'Yüzde',
    'EVENT': 'Olay',
    'CLAIM': 'İddia',
    'ATTRIBUTION': 'Atıf',
    'STATISTIC': 'İstatistik'
  };
  return map[String(label || '').toUpperCase()] || String(label || 'Bilgi');
}

function factSourceBadge(facts) {
  const src = (facts || []).map(f => f.source).find(Boolean) || '';
  if (src === 'hybrid') return '<span class="fact-ai-badge" title="Gemini baskın + kural yedek">AI baskın</span>';
  if (src === 'ai') return '<span class="fact-ai-badge" title="Gemini olgu + karşılaştırma">AI</span>';
  return '<span class="fact-ai-badge fact-ai-badge--rule" title="Kural tabanlı NER">Kural</span>';
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
    const earlyVideo = platformId === VIDEO_CHANNEL_ID
      ? videoScenarioToolsHtml({ mountId: 'analytics-video-module-mount' })
      : '';
    panel.innerHTML = `${earlyVideo}<div class="text-sm text-slate-400 text-center py-8">Bu platform için henüz ayrıntılı sonuç yok. Mesajı dönüştürüp analiz bitince burada görünür.</div>`;
    if (earlyVideo) initLucideIcons();
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

  const videoToolsBlock = platformId === VIDEO_CHANNEL_ID
    ? videoScenarioToolsHtml({ mountId: 'analytics-video-module-mount' })
    : '';

  panel.innerHTML = `
    ${videoToolsBlock}
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
          <h4 class="font-black text-slate-900 text-base tracking-tight">Bilgi karşılaştırması ${factSourceBadge(facts)}</h4>
          <p class="text-sm text-slate-500 mt-0.5">Asıl mesajdaki önemli bilgiler (kişi / kurum / yer / zaman / kavram) → bu platformda var mı?</p>
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
  if (platformId === VIDEO_CHANNEL_ID) initLucideIcons();
}

// Çevirme ve Analiz İşlemini Çalıştır (Simülasyon / API)
// ⚡ 2 AŞAMALI ANLIK DÖNÜŞTÜRÜCÜ & ANALİZ (SÜPER HIZLI)
async function runTransformationAndAnalysis(coreText) {
  appState.isLoading = true;
  renderSkeletonLoaders();

  const withTimeout = (ms) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return { signal: ctrl.signal, clear: () => clearTimeout(t) };
  };

  try {
    // Proofread ayrı istek AbortError üretiyordu; transform zaten skip_proofread kullanıyor
    let workingCore = (coreText || '').trim();
    appState.coreMessage = workingCore;
    saveToHistory(workingCore);

    const transformTO = withTimeout(150000);
    const transformRes = await fetch('/api/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: workingCore, author: 'Kamu Görevlisi', skip_proofread: true }),
      signal: transformTO.signal
    });
    transformTO.clear();

    if (transformRes.ok) {
      const transformData = await transformRes.json();
      const transformedObj = {};
      const platformPayload = [];
      const correctedCore = (transformData.core_message || workingCore).trim();

      appState.coreMessage = correctedCore;
      const coreInputEl = document.getElementById('core-message-input');
      if (coreInputEl && coreInputEl.value.trim() !== correctedCore) {
        coreInputEl.value = correctedCore;
      }

      (transformData.platforms || []).forEach(p => {
        const cleaned = stripProofreadLabel(p.transformed_content || '');
        transformedObj[p.id] = cleaned;
        platformPayload.push({ id: p.id, transformed_content: cleaned });
      });

      appState.transformedMessages = transformedObj;
      appState.analysisResults = [];
      appState.analysisReady = false;
      renderPlatformCards();
      showToast('Dönüşüm tamamlandı — analiz sürüyor.', 'success');

      try {
        const analyzeTO = withTimeout(240000);
        const analyzeRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ core_message: correctedCore, platforms: platformPayload, author: "Kamu Görevlisi" }),
          signal: analyzeTO.signal
        });
        analyzeTO.clear();

        if (analyzeRes.ok) {
          const analyzeData = await analyzeRes.json();
          appState.analysisResults = (analyzeData.platforms || []).map(mapPlatformAnalysis);
          appState.analysisReady = true;
          const deg = analyzeData.degradation_chain || null;
          appState.degradationChain = deg && deg.steps ? deg.steps : [];
          appState.degradationMeta = deg ? {
            has_breaking_point: deg.has_breaking_point,
            breaking_point_channel: deg.breaking_point_channel,
            max_consecutive_deviation: deg.max_consecutive_deviation
          } : null;

          renderPlatformCards();
          refreshAnalyticsViews();
          showToast('Analiz sonuçları hazır.', 'success');
          if (appState.activeTab === 'analytics') {
            const card = document.getElementById('analytics-detail-card');
            if (card) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
          }
        }
      } catch (err) {
        console.warn('Aşama 2 Analiz Uyarısı:', err);
      }

    } else {
      const mockData = generateMockTransformation(workingCore || coreText);
      appState.transformedMessages = mockData.transformedMessages;
      appState.analysisResults = mockData.analysisResults;
      appState.analysisReady = true;
      appState.degradationChain = mockData.degradationChain;
      appState.degradationMeta = mockData.degradationMeta || null;
      renderPlatformCards();
      showToast('Dönüşüm tamamlandı (yedek şablon).', 'info');
    }
  } catch (err) {
    console.error('Dönüşüm hatası:', err);
    const mockData = generateMockTransformation(coreText);
    appState.transformedMessages = mockData.transformedMessages;
    appState.analysisResults = mockData.analysisResults;
    appState.analysisReady = true;
    appState.degradationChain = mockData.degradationChain;
    appState.degradationMeta = mockData.degradationMeta || null;
    renderPlatformCards();
    showToast('Bağlantı/kota sorunu — yedek çıktılar gösterildi.', 'warning');
  } finally {
    appState.isLoading = false;
    // Skeleton takılı kalmasın
    if (!Object.keys(appState.transformedMessages || {}).length) {
      renderPlatformCards();
    }
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
    const rawMessage = (appState.transformedMessages[platform.id] || '').trim();
    const message = stripProofreadLabel(rawMessage);
    if (message !== rawMessage && rawMessage) {
      appState.transformedMessages[platform.id] = message;
    }
    const hasContent = message.length > 0;
    const analysisReady = !!appState.analysisReady;
    const analysis = analysisReady
      ? (appState.analysisResults.find(a => a.channel === platform.id) || null)
      : null;
    const simLabel = analysis && analysis.sim != null ? `%${analysis.sim}` : '';
    const sentimentLabel = analysis ? plainSentiment(analysis.sentiment) : '';
    const ambiguityLabel = analysis ? plainAmbiguity(analysis.ambiguity).text : '';
    const sentimentTone = !analysis
      ? 'neutral'
      : (String(analysis.sentiment || '').toUpperCase().includes('POS') ? 'pos' : 'neg');

    let logoHtml = '';
    if (platform.logoUrl) {
      logoHtml = `<img src="${platform.logoUrl}" alt="${platform.name}">`;
    } else if (platform.svgIcon) {
      logoHtml = platform.svgIcon;
    } else {
      logoHtml = `<i data-lucide="${platform.icon}" class="w-4 h-4 text-[#00A3A6]"></i>`;
    }

    const bodyHtml = hasContent
      ? `<div class="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/70 max-h-44 overflow-y-auto platform-message-scroll">${escapeHtml(message)}</div>`
      : `<div class="platform-empty-slot">
           <span class="platform-empty-title">İçerik henüz üretilmedi</span>
           <span class="platform-empty-hint">Çekirdek mesajı girip «Analiz Et ve Dönüştür» ile başlatın.</span>
         </div>`;

    const simBadgeHtml = analysisReady && simLabel
      ? `<span class="text-[11px] px-2 py-1 rounded-md font-bold shrink-0 bg-[#0B1F33] text-white">${simLabel}</span>`
      : (hasContent && !analysisReady
        ? `<span class="text-[10px] px-2 py-1 rounded-md font-semibold shrink-0 bg-slate-100 text-slate-500 border border-slate-200">Analiz…</span>`
        : '');

    const metaHtml = analysisReady
      ? `<div class="platform-meta-row">
            <span class="platform-meta-chip platform-meta-chip--${sentimentTone}" title="Duygu analizi">
              <span class="platform-meta-key">Duygu</span>
              <span class="platform-meta-val">${escapeHtml(sentimentLabel)}</span>
            </span>
            <span class="platform-meta-chip" title="Belirsizlik düzeyi">
              <span class="platform-meta-key">Belirsizlik</span>
              <span class="platform-meta-val">${escapeHtml(ambiguityLabel)}</span>
            </span>
          </div>`
      : '';

    const cardHtml = `
      <div onclick="openExpandedCardModal('${platform.id}')" class="corporate-card platform-card p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 group">
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
            ${simBadgeHtml}
          </div>
          ${bodyHtml}
        </div>

        <div class="platform-card-footer">
          ${metaHtml}
          ${platform.id === VIDEO_CHANNEL_ID && hasContent ? `
          <div class="platform-video-actions" onclick="event.stopPropagation()">
            <button type="button" class="platform-action-btn platform-action-btn--video" onclick="openVideoFromCard()" title="Video üret">
              <svg class="platform-action-ico" viewBox="0 0 24 24" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg>
              <span>Video Üret</span>
            </button>
          </div>` : ''}
          <div class="platform-action-row">
            <button type="button" onclick="copyPlatformMessage('${platform.id}', event)" class="platform-action-btn ${hasContent ? '' : 'is-disabled'}" ${hasContent ? '' : 'disabled tabindex="-1"'} title="Metni kopyala">
              <svg class="platform-action-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2"/></svg>
              <span>Kopyala</span>
            </button>
            <span class="platform-action-btn platform-action-btn--primary">
              <span>Detay</span>
              <svg class="platform-action-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
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

  const message = (appState.transformedMessages[platformId] || '').trim() || 'Bu mecra için henüz dönüşüm yapılmadı.';
  const analysis = appState.analysisReady
    ? (appState.analysisResults.find(a => a.channel === platformId) || null)
    : null;

  const modal = document.getElementById('card-detail-modal');
  const container = document.getElementById('modal-container');
  if (!modal || !container) return;

  document.getElementById('modal-title').textContent = platform.name;
  document.getElementById('modal-category').textContent = platform.category;
  document.getElementById('modal-content').textContent = message;
  document.getElementById('modal-sim').textContent = analysis && analysis.sim != null ? `%${analysis.sim}` : 'Analiz bekleniyor';
  const lossEl = document.getElementById('modal-loss');
  if (lossEl) {
    if (!analysis) {
      lossEl.textContent = 'Analiz bekleniyor';
      lossEl.className = 'text-sm font-bold text-slate-500';
    } else {
      const hasLoss = analysis.loss === 'Evet' || analysis.loss === true;
      lossEl.textContent = hasLoss ? 'Evet, bilgi eksik' : 'Hayır, bilgi duruyor';
      lossEl.className = `text-sm font-bold ${hasLoss ? 'text-rose-600' : 'text-emerald-600'}`;
    }
  }
  document.getElementById('modal-sentiment').textContent = analysis ? plainSentiment(analysis.sentiment) : 'Analiz bekleniyor';
  document.getElementById('modal-ambiguity').textContent = analysis ? plainAmbiguity(analysis.ambiguity).text : 'Analiz bekleniyor';

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

  const videoToolsHost = document.getElementById('modal-video-tools');
  if (videoToolsHost) {
    if (platformId === VIDEO_CHANNEL_ID) {
      videoToolsHost.classList.remove('hidden');
      videoToolsHost.innerHTML = videoScenarioToolsHtml({ mountId: 'modal-video-module-mount' });
    } else {
      videoToolsHost.classList.add('hidden');
      videoToolsHost.innerHTML = '';
    }
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

// ============================================================
// DİKEY VİDEO (TikTok/Reels) — PDF senaryo + video modül yuvası
// ============================================================

function getVideoScenarioText() {
  return stripProofreadLabel((appState.transformedMessages[VIDEO_CHANNEL_ID] || '').trim());
}

function videoScenarioToolsHtml(opts = {}) {
  const compact = !!opts.compact;
  const mountId = opts.mountId || 'video-module-mount';
  const hasScript = !!getVideoScenarioText();
  return `
    <div class="video-scenario-tools ${compact ? 'video-scenario-tools--compact' : ''}" data-video-tools>
      <div class="video-scenario-tools__head">
        <div>
          <p class="video-scenario-tools__kicker">Dikey video</p>
          <h4 class="video-scenario-tools__title">Senaryo çıktıları</h4>
          <p class="video-scenario-tools__desc">PDF indirin veya dikey video önizlemesini oynatın.</p>
        </div>
        <div class="video-scenario-tools__actions">
          <button type="button" class="video-tool-btn video-tool-btn--pdf" onclick="event.stopPropagation(); downloadVideoScenarioPdf()" ${hasScript ? '' : 'disabled'}>
            <i data-lucide="file-down" class="w-4 h-4"></i>
            <span>PDF Senaryo</span>
          </button>
          <button type="button" class="video-tool-btn video-tool-btn--create" onclick="event.stopPropagation(); openVideoCreateModule('${mountId}')" ${hasScript ? '' : 'disabled'}>
            <i data-lucide="clapperboard" class="w-4 h-4"></i>
            <span>Video Üret</span>
          </button>
        </div>
      </div>
      <div id="${mountId}" class="video-module-mount" hidden data-open="0" aria-live="polite"></div>
    </div>`;
}

function openVideoFromCard() {
  openExpandedCardModal(VIDEO_CHANNEL_ID);
  setTimeout(() => openVideoCreateModule('modal-video-module-mount'), 300);
}

function buildVideoPlayerHtml(parsed) {
  const scenes = parsed.scenes.length
    ? parsed.scenes
    : [{ head: 'Sahne 1', gorsel: 'Dikey duyuru çerçevesi', yazi: parsed.title || 'Duyuru', ses: parsed.raw.slice(0, 180) || 'Senaryo metni' }];
  const sceneCards = scenes.map((s, i) => `
    <button type="button" class="video-scene-chip ${i === 0 ? 'is-active' : ''}" data-scene-idx="${i}" onclick="jumpVideoScene(${i})">
      ${escapeHtml(s.head || ('Sahne ' + (i + 1)))}
    </button>`).join('');
  return `
    <div class="video-player" data-scene-count="${scenes.length}">
      <div class="video-player__phone">
        <div class="video-player__screen" id="video-player-screen">
          <div class="video-player__overlay">
            <p class="video-player__badge">Dikey Video Önizleme</p>
            <p class="video-player__scene-label" id="video-player-scene-label">${escapeHtml(scenes[0].head || 'Sahne 1')}</p>
            <p class="video-player__ontext" id="video-player-ontext">${escapeHtml(scenes[0].yazi || '—')}</p>
            <p class="video-player__visual" id="video-player-visual">${escapeHtml(scenes[0].gorsel || '—')}</p>
          </div>
          <div class="video-player__progress"><span id="video-player-progress"></span></div>
        </div>
      </div>
      <div class="video-player__side">
        <h5 class="video-player__title">${escapeHtml(parsed.title || 'Dikey Video Senaryosu')}</h5>
        <p class="video-player__voice" id="video-player-voice"><strong>Ses:</strong> ${escapeHtml(scenes[0].ses || '—')}</p>
        <div class="video-player__chips">${sceneCards}</div>
        <div class="video-player__controls">
          <button type="button" class="video-tool-btn video-tool-btn--create" id="video-play-btn" onclick="toggleVideoPreview()">
            <i data-lucide="play" class="w-4 h-4"></i>
            <span>Oynat</span>
          </button>
          <button type="button" class="video-tool-btn video-tool-btn--pdf" onclick="downloadVideoScenarioPdf()">
            <i data-lucide="file-down" class="w-4 h-4"></i>
            <span>PDF</span>
          </button>
        </div>
        <p class="video-player__hint">Sahne sahne dikey önizleme — senaryoyu PDF olarak da indirebilirsiniz.</p>
      </div>
    </div>`;
}

let _videoPreviewTimer = null;
let _videoPreviewIdx = 0;
let _videoPreviewScenes = [];

function renderVideoScene(idx) {
  if (!_videoPreviewScenes.length) return;
  const i = ((idx % _videoPreviewScenes.length) + _videoPreviewScenes.length) % _videoPreviewScenes.length;
  _videoPreviewIdx = i;
  const s = _videoPreviewScenes[i];
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('video-player-scene-label', s.head || `Sahne ${i + 1}`);
  set('video-player-ontext', s.yazi || '—');
  set('video-player-visual', s.gorsel || '—');
  const voice = document.getElementById('video-player-voice');
  if (voice) voice.innerHTML = `<strong>Ses:</strong> ${escapeHtml(s.ses || '—')}`;
  document.querySelectorAll('.video-scene-chip').forEach((chip, ci) => {
    chip.classList.toggle('is-active', ci === i);
  });
  const bar = document.getElementById('video-player-progress');
  if (bar) bar.style.width = `${((i + 1) / _videoPreviewScenes.length) * 100}%`;
}

function jumpVideoScene(idx) {
  stopVideoPreview(false);
  renderVideoScene(idx);
}

function stopVideoPreview(resetBtn = true) {
  if (_videoPreviewTimer) {
    clearInterval(_videoPreviewTimer);
    _videoPreviewTimer = null;
  }
  if (resetBtn) {
    const btn = document.getElementById('video-play-btn');
    if (btn) btn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i><span>Oynat</span>`;
    initLucideIcons();
  }
}

function toggleVideoPreview() {
  const btn = document.getElementById('video-play-btn');
  if (_videoPreviewTimer) {
    stopVideoPreview(true);
    return;
  }
  if (!_videoPreviewScenes.length) return;
  if (btn) btn.innerHTML = `<i data-lucide="pause" class="w-4 h-4"></i><span>Durdur</span>`;
  initLucideIcons();
  _videoPreviewTimer = setInterval(() => {
    const next = _videoPreviewIdx + 1;
    if (next >= _videoPreviewScenes.length) {
      stopVideoPreview(true);
      renderVideoScene(0);
      showToast('Önizleme tamamlandı.', 'success');
      return;
    }
    renderVideoScene(next);
  }, 2200);
}

function parseVideoScenes(raw) {
  const text = (raw || '').trim();
  if (!text) return { title: '', scenes: [], raw: '' };
  const titleMatch = text.match(/V[İI]DEO\s*BA[ŞS]LI[ĞG]I\s*:\s*(.+)/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Dikey Video Senaryosu';
  const parts = text.split(/(?=SAHNE\s*\d+)/i).map(p => p.trim()).filter(Boolean);
  const scenes = [];
  parts.forEach(block => {
    if (!/^SAHNE/i.test(block)) return;
    const head = (block.match(/^SAHNE[^\n]*/i) || [''])[0].trim();
    const gorsel = (block.match(/G[ÖO]RSEL\s*:\s*(.+)/i) || [, ''])[1].trim();
    const yazi = (block.match(/YAZI\s*:\s*(.+)/i) || [, ''])[1].trim();
    const ses = (block.match(/SES\s*:\s*(.+)/i) || [, ''])[1].trim();
    scenes.push({ head, gorsel, yazi, ses });
  });
  return { title, scenes, raw: text };
}

function downloadVideoScenarioPdf() {
  const scenario = getVideoScenarioText();
  if (!scenario) {
    showToast('Önce dikey video senaryosu üretilmeli.', 'warning');
    return;
  }
  const parsed = parseVideoScenes(scenario);
  const today = getTodayFormattedDate();
  const sceneHtml = parsed.scenes.length
    ? parsed.scenes.map((s, i) => `
        <section class="scene">
          <h2>${escapeHtml(s.head || ('Sahne ' + (i + 1)))}</h2>
          <table>
            <tr><th>Görsel</th><td>${escapeHtml(s.gorsel || '—')}</td></tr>
            <tr><th>Yazı</th><td>${escapeHtml(s.yazi || '—')}</td></tr>
            <tr><th>Ses</th><td>${escapeHtml(s.ses || '—')}</td></tr>
          </table>
        </section>`).join('')
    : `<pre class="raw">${escapeHtml(parsed.raw)}</pre>`;

  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
    <title>Dikey Video Senaryosu — ${escapeHtml(parsed.title)}</title>
    <style>
      @page { margin: 18mm; }
      body { font-family: Georgia, 'Times New Roman', serif; color: #0f172a; margin: 0; padding: 24px; }
      .brand { font-family: Arial, sans-serif; text-align: center; border-bottom: 3px double #b30000; padding-bottom: 14px; margin-bottom: 18px; }
      .brand .org { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .brand h1 { font-size: 18px; color: #b30000; margin: 10px 0 0; letter-spacing: .06em; }
      .meta { font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 18px; }
      .scene { margin: 0 0 16px; page-break-inside: avoid; }
      .scene h2 { font-family: Arial, sans-serif; font-size: 13px; margin: 0 0 8px; color: #0b1f33; background: #f1f5f9; padding: 6px 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
      th { width: 72px; text-align: left; vertical-align: top; padding: 6px 8px; color: #64748b; font-family: Arial, sans-serif; font-size: 11px; }
      td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; line-height: 1.45; }
      .raw { white-space: pre-wrap; font-size: 12px; background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; }
      .foot { margin-top: 28px; font-family: Arial, sans-serif; font-size: 10px; color: #64748b; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 10px; }
      @media print { .noprint { display: none !important; } }
    </style></head><body>
      <div class="brand">
        <div class="org">Mecra Mesajdır</div>
        <div class="org" style="font-weight:600;margin-top:2px">Dikey Video Senaryo Çıktısı</div>
        <h1>DİKEY VİDEO PRODÜKSİYON SENARYO BELGESİ</h1>
      </div>
      <div class="meta"><span>Tarih: ${today}</span><span>Belge: TikTok / Reels Senaryosu</span></div>
      <p style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;margin:0 0 14px">Video başlığı: ${escapeHtml(parsed.title)}</p>
      ${sceneHtml}
      <div class="foot">Mecra Mesajdır · Senaryo çıktısı · Yazdır penceresinden «PDF olarak kaydet» seçebilirsiniz.</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script>
    </body></html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=720');
  if (!w) {
    showToast('Açılır pencere engellendi. Tarayıcıda pop-up izni verin.', 'error');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  showToast('Senaryo PDF yazdırma ekranı açıldı.', 'success');
}

function openVideoCreateModule(mountId = 'video-module-mount') {
  const scenario = getVideoScenarioText();
  if (!scenario) {
    showToast('Önce dikey video senaryosu üretilmeli.', 'warning');
    return;
  }
  const mount = document.getElementById(mountId);
  if (!mount) {
    showToast('Video alanı bulunamadı. Detay modalını açıp tekrar deneyin.', 'error');
    return;
  }
  const opening = mount.getAttribute('data-open') !== '1';
  if (!opening) {
    stopVideoPreview(true);
    mount.hidden = true;
    mount.setAttribute('data-open', '0');
    mount.innerHTML = '';
    return;
  }

  const parsed = parseVideoScenes(scenario);
  _videoPreviewScenes = parsed.scenes.length
    ? parsed.scenes
    : [{ head: 'Sahne 1', gorsel: 'Dikey duyuru çerçevesi', yazi: parsed.title || 'Duyuru', ses: parsed.raw.slice(0, 180) || 'Senaryo metni' }];
  _videoPreviewIdx = 0;
  stopVideoPreview(false);
  mount.hidden = false;
  mount.setAttribute('data-open', '1');
  mount.innerHTML = buildVideoPlayerHtml(parsed);
  renderVideoScene(0);
  mount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  initLucideIcons();

  const detail = { scenario, channel: VIDEO_CHANNEL_ID, mountId, mount, scenes: _videoPreviewScenes };
  window.dispatchEvent(new CustomEvent('mecra:open-video-module', { detail }));
  if (typeof window.MecraVideoModule?.onOpen === 'function') {
    try { window.MecraVideoModule.onOpen(detail); } catch (e) { console.warn(e); }
  }
  showToast('Video önizleme açıldı — Oynat ile sahne sahne izleyin.', 'success');
}

window.MecraVideoModule = {
  channelId: VIDEO_CHANNEL_ID,
  getScenario: getVideoScenarioText,
  downloadPdf: downloadVideoScenarioPdf,
  open: openVideoCreateModule,
  fromCard: openVideoFromCard,
  mount(node, mountId = 'video-module-mount') {
    const el = document.getElementById(mountId);
    if (!el || !node) return false;
    el.innerHTML = '';
    el.appendChild(node);
    el.hidden = false;
    el.setAttribute('data-open', '1');
    return true;
  },
  onOpen: null
};

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

  const ambSub = document.getElementById('kpi-amb-sub');

  if (!results.length) {
    if (avgEl) avgEl.textContent = '—';
    if (lossEl) lossEl.textContent = '—';
    if (ctaEl) ctaEl.textContent = '—';
    if (ambEl) {
      ambEl.textContent = '—';
      ambEl.className = 'text-3xl font-black text-[#008385]';
    }
    if (ambSub) ambSub.textContent = 'Netlik sağlanan mecra';
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
  const clearCount = total - highAmb;

  if (avgEl) avgEl.textContent = `%${avg.toFixed(0)}`;
  if (lossEl) lossEl.textContent = `${lossCount} / ${total}`;
  if (ctaEl) ctaEl.textContent = `${ctaCount} / ${total}`;
  // Kurumsal okuma: netlik sağlanan mecra / toplam (0 belirsiz = 8/8)
  if (ambEl) {
    ambEl.textContent = `${clearCount} / ${total}`;
    ambEl.className = highAmb === 0
      ? 'text-3xl font-black text-[#008385]'
      : highAmb <= Math.ceil(total / 4)
        ? 'text-3xl font-black text-amber-600'
        : 'text-3xl font-black text-rose-600';
  }
  if (ambSub) ambSub.textContent = 'Netlik sağlanan mecra';

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
      ? 'Tüm mecralarda anlatım net ve açıktır. Yüksek belirsizlik tespit edilmemiştir.'
      : `${clearCount} mecrada anlatım net; ${highAmb} mecrada belirsizlik düzeyi yüksektir.`;
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
        label: 'Anlamsal benzerlik (%)',
        data: simScores,
        backgroundColor: 'rgba(0, 131, 133, 0.14)',
        borderColor: '#008385',
        borderWidth: 2,
        pointBackgroundColor: '#008385',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#008385',
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 50,
          max: 100,
          ticks: {
            stepSize: 10,
            backdropColor: 'transparent',
            color: '#94a3b8',
            font: { size: 10, weight: '600' },
            callback: (v) => v + '%'
          },
          pointLabels: {
            color: '#334155',
            font: { size: 11, weight: '600' }
          },
          grid: { color: 'rgba(15, 23, 42, 0.08)' },
          angleLines: { color: 'rgba(15, 23, 42, 0.06)' }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            color: '#475569',
            font: { size: 11, weight: '600' },
            padding: 12
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Anlamsal benzerlik: %${Number(ctx.raw || 0).toFixed(1)}`
          }
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

  const shortLabels = PLATFORMS_CONFIG.map(p => p.name.split(' ')[0]);
  const fullNames = PLATFORMS_CONFIG.map(p => p.name);
  const scores = getAlignedSimScores();

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: shortLabels,
      datasets: [{
        label: 'Anlamsal benzerlik (%)',
        data: scores,
        backgroundColor: scores.map(s =>
          s >= 80 ? 'rgba(0, 131, 133, 0.9)' : s >= 60 ? 'rgba(0, 131, 133, 0.55)' : 'rgba(190, 18, 60, 0.75)'
        ),
        borderRadius: 4,
        maxBarThickness: 32,
        hoverBackgroundColor: '#006f71'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(15, 23, 42, 0.06)' },
          border: { display: false },
          ticks: {
            stepSize: 20,
            color: '#94a3b8',
            font: { size: 10, weight: '600' },
            callback: v => '%' + v
          },
          title: {
            display: true,
            text: 'Anlamsal benzerlik (%)',
            color: '#64748b',
            font: { size: 10, weight: '600' }
          }
        },
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: '#334155',
            font: { size: 10, weight: '600' },
            maxRotation: 0,
            minRotation: 0
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const i = items[0]?.dataIndex ?? 0;
              return fullNames[i] || shortLabels[i] || '';
            },
            label: (ctx) => ` Anlamsal benzerlik: %${Number(ctx.raw || 0).toFixed(1)}`
          }
        }
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

/** API düşerse bile core yapıştırmayan yerel resmi rewrite (backend ile uyumlu). */
function normalizeTrAscii(s) {
  return String(s || '')
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toLowerCase();
}

function composeInstitutionalRewrite(core) {
  const raw = String(core || '').trim();
  const low = normalizeTrAscii(raw);
  const hasCimer = /c[iı]mer/i.test(raw);
  const hasAi = /yapay zeka|algoritma|entegrasyon/.test(low);
  const hasComplaint = /sikayet|dilekce|basvuru/.test(low);
  const hasSpeed = /saniye|dakika|gunlerce|beklemeyecek|direkt|dusur/.test(low);
  const hasIletisim = low.includes('iletisim baskanlig');
  const hasKriz = /kriz masasi|dijital kriz|asilsiz haber|asilisiz haber|asilsiz paylasim|takip paneli|yonlendirme paneli/.test(low);
  const hasValilik = low.includes('valilik');
  const hasAfad = low.includes('afad');
  const hasDeprem = /deprem|bilgilendirme hatt/.test(low);
  const hasLastWeek = /gecen hafta|gecmis hafta/.test(low);
  const hasLastTue = /gecen sali|gecmis sali/.test(low);

  let title, s1, s2, s3, b1, b2, b3;
  if (hasDeprem || hasAfad || (hasValilik && (hasKriz || hasSpeed))) {
    title = 'Deprem Bilgilendirme Hattı ve Yönlendirme Panelinin Devreye Alınması';
    const when = hasLastTue ? 'Geçtiğimiz salı' : (hasLastWeek ? 'Geçtiğimiz hafta' : 'Yakın dönemde');
    s1 = `${when} Valilik koordinasyonunda başlatılan deprem bilgilendirme hattı çalışmaları bugün itibarıyla tamamlanmış ve uygulamaya alınmıştır.`;
    s2 = 'Devreye alınan yönlendirme paneli sayesinde asılsız paylaşımlar dakikalar içinde tespit edilerek ilgili birimlerin ekranına yönlendirilmektedir.';
    s3 = hasAfad
      ? (hasIletisim
        ? 'Böylelikle kamuoyu bilgilendirmesi hızlandırılmış; yarın AFAD ve yerel basınla ortak basın notu çalışmalarının koordinasyonu sürdürülecektir. Süreç İletişim Başkanlığı tarafından yakından takip edilmektedir.'
        : 'Böylelikle kamuoyu bilgilendirmesi hızlandırılmış; yarın AFAD ve yerel basınla ortak basın notu çalışmalarının koordinasyonu sürdürülecektir.')
      : 'Böylelikle kamuoyu bilgilendirmesi hızlandırılmış; valiliklerle ortak bilgilendirme koordinasyonu güçlendirilmiştir.';
    b1 = 'Deprem bilgilendirme hattı uygulamaya alınmıştır';
    b2 = 'Yönlendirme paneli asılsız paylaşımları dakikalar içinde yakalamaktadır';
    b3 = hasAfad
      ? 'AFAD ve yerel basınla ortak basın notu koordinasyonu sürdürülmektedir'
      : 'Resmi kanallar üzerinden kamuoyu bilgilendirilmektedir';
  } else if (hasKriz || (hasIletisim && hasSpeed)) {
    title = 'Dijital Kriz Masası ve Takip Panelinin Devreye Alınması';
    const when = hasLastWeek ? 'Geçtiğimiz hafta' : 'Yakın dönemde';
    s1 = `${when} İletişim Başkanlığı bünyesinde başlatılan dijital kriz masası çalışmaları bugün itibarıyla tamamlanmış ve uygulamaya alınmıştır.`;
    s2 = 'Devreye alınan takip paneli sayesinde sahadan gelen asılsız haber ve şüpheli paylaşımlar dakikalar içinde tespit edilerek ilgili birimlerin ekranına yönlendirilmektedir.';
    s3 = hasValilik
      ? 'Böylelikle kamuoyu bilgilendirmesi hızlandırılmış; yarın valiliklerle ortak basın notu çalışmalarının koordinasyonu sürdürülecektir.'
      : 'Böylelikle kamuoyu bilgilendirmesi hızlandırılmış; kurumsal kapasite ve resmi iletişim süreçleri güçlendirilmiştir.';
    b1 = 'İletişim Başkanlığı dijital kriz masası uygulamaya alınmıştır';
    b2 = 'Takip paneli şüpheli paylaşımları dakikalar içinde yakalamaktadır';
    b3 = hasValilik
      ? 'Valiliklerle ortak basın notu koordinasyonu sürdürülmektedir'
      : 'Resmi bilgilendirme kanalları üzerinden kamuoyu bilgilendirilmektedir';
  } else if (hasCimer && (hasAi || hasComplaint || hasSpeed)) {
    title = 'CİMER Yapay Zekâ Entegrasyonunun Tamamlanması';
    s1 = 'Geçtiğimiz ay başlatılan CİMER yapay zekâ entegrasyonu çalışmaları bugün itibarıyla tamamlanmıştır.';
    s2 = 'Devreye alınan sistem sayesinde vatandaşlarca iletilen şikâyet ve dilekçeler saniyeler içinde analiz edilerek ilgili bakanlık birimlerinin ekranına yönlendirilmektedir.';
    s3 = 'Böylelikle başvuruların uzun süre bekletilmesinin önüne geçilmiş; kurumsal iş yükünün azaltılması ve kamu hizmetinin daha etkin sunulması sağlanmıştır.';
    b1 = 'CİMER başvurularında yapay zekâ destekli yönlendirme devreye alınmıştır';
    b2 = 'Başvuru iletim süresi günlerden saniyelere indirilmiştir';
    b3 = 'İlgili bakanlık birimleriyle anlık veri aktarımı sağlanmıştır';
  } else {
    title = 'Kamuoyunu İlgilendiren Resmi Bilgilendirme';
    s1 = 'İlgili birimlerimizce yürütülen çalışmalar bugün itibarıyla tamamlanmış ve uygulamaya alınmıştır.';
    s2 = 'Süreç, ilgili kurumların koordinasyonunda planlı ve şeffaf biçimde yönetilmektedir.';
    s3 = 'Bu çerçevede kurumsal kapasitenin güçlendirilmesi hedeflenmiş; kamuoyu bilgilendirmesi resmi kanallar üzerinden sürdürülecektir.';
    b1 = 'Süreç ilgili birimler koordinasyonunda yürütülmektedir';
    b2 = 'Uygulama takvimi planlı biçimde ilerletilmektedir';
    b3 = 'Resmi bilgilendirme kanalları açık tutulmaktadır';
  }
  return { title, s1, s2, s3, b1, b2, b3 };
}

function buildChannelTextsFromRewrite(p) {
  const { title, s1, s2, s3, b1, b2, b3 } = p;
  return {
    press_release: `T.C. İLETİŞİM BAŞKANLIĞI\nBASIN AÇIKLAMASI\n\nBAŞLIK\n${title}\n\n${s1} Söz konusu gelişme, kamuoyunun doğru bilgilendirilmesi amacıyla resmi kanallar üzerinden duyurulmaktadır. Süreç ilgili kurumların koordinasyonunda planlı biçimde yönetilmektedir.\n\n${s2} ${s3} Uygulamanın kapsamı ilgili birimlerce takip edilmekte; vatandaşları ilgilendiren hususlar şeffaflık ilkesi doğrultusunda paylaşılmaktadır.\n\nKamuoyunun güvenini esas alan yaklaşımımız çerçevesinde gelişmeler izlenecek; yeni bilgilendirmeler resmi hesaplarımızdan yapılacaktır. Vatandaşlarımızın yalnızca resmi kaynaklardan yapılan açıklamaları dikkate alması önem arz etmektedir.\n\nKamuoyuna saygıyla duyurulur.`,
    agency_news: `FLAŞ\n\nBAŞLIK\n${title}\n\n${s1}\n\nANKARA - Yetkililerden yapılan açıklamaya göre, ${s1.replace(/^./, (c) => c.toLocaleLowerCase('tr-TR')).replace(/\.$/, '')}. Bildirime göre ${s2.replace(/^./, (c) => c.toLocaleLowerCase('tr-TR')).replace(/\.$/, '')}. ${s3}\n\nYetkililer, uygulamanın kamuoyunu ilgilendiren yönlerinin planlı biçimde yönetildiğini ifade etti. Konuya ilişkin güncel bilgilendirmelerin resmi kanallar üzerinden yapılacağı kaydedildi.`,
    tabloid: `BAŞLIK\nGündeme damga vuran adım: ${title}\n\nSPOT\n${s1} Vatandaşlar süreci yakından izliyor.\n\nKamuoyunda geniş yankı uyandıran gelişmenin ardından resmi kaynaklar, sürecin kontrollü biçimde yönetildiğini vurguladı.\n\n${s2} ${s3}\n\nBundan sonra yapılacak açıklamaların resmi kanallardan paylaşılacağı belirtilirken, vatandaşların spekülatif bilgilere itibar etmemesi isteniyor.`,
    x_twitter: `🚨 ${s1}\n\n📌 ÖZET: ${b1}.\n\n📋 DETAYLAR:\n- ${b2}\n- ${b3}\n- ${b1}\n\n📢 Lütfen yalnızca resmi duyuruları dikkate alınız.\n\n#Duyuru #Kamuoyu #ResmiBilgilendirme`,
    linkedin: `Kurumsal iletişimin güven tesis eden gücü, doğru bilginin zamanında paylaşılmasıyla anlam kazanır.\n\n${s1}\n\n${s2} ${s3} Paydaşlarımızın doğru ve güncel bilgiye erişimi önceliğimizdir.\n\nÖne Çıkan Başlıklar:\n- ${b1}\n- ${b2}\n- ${b3}\n\nKurumsal sorumluluk bilinciyle süreci yakından takip ediyor; güvenilir iletişimi esas alıyoruz.\n\n#Kurumsalİletişim #Kamu #Şeffaflık`,
    vertical_video: `VİDEO BAŞLIĞI: ${title}\n\nSAHNE 1 (0-3 sn)\nGÖRSEL: Resmi duyuru ekranı, kurumsal arka plan\nYAZI: ${/cimer/i.test(title) ? 'CİMER yapay zekâ duyurusu' : 'Önemli resmi duyuru'}\nSES: Dikkat, önemli bir resmi bilgilendirme var.\n\nSAHNE 2 (3-10 sn)\nGÖRSEL: Süreç ve birim görselleri\nYAZI: Ne değişti?\nSES: ${s1}\n\nSAHNE 3 (10-25 sn)\nGÖRSEL: Özet bilgi paneli\nYAZI: Nasıl çalışıyor?\nSES: ${s2}\n\nSAHNE 4 (25-40 sn)\nGÖRSEL: Takip çağrısı ekranı\nYAZI: Resmi kanalları takip edin\nSES: ${s3} Güncellemeler için yalnızca resmi hesapları takip edin.`,
    messaging_chain: `⚠️ ÖNEMLİ BİLGİLENDİRME\n\nMerhaba,\n${s1}\n\n📌 Konu: ${title}\n\n📍 Bilmeniz Gerekenler:\n- ${b1}\n- ${b2}\n- ${b3}\n\nℹ️ Hatırlatma: Spekülatif paylaşımlara itibar etmeyiniz; güncel bilgiyi resmi kaynaklardan doğrulayınız.\n\n📲 Lütfen yalnızca doğru bilgiye ulaşılması amacıyla bu resmi bilgilendirme mesajını çevrenizle paylaşınız.`,
    official_letter: `T.C.\nİLETİŞİM BAŞKANLIĞI\n\nSayı  : 75249013-010.06-E.2026/4108\nTarih : 02.08.2026\nKonu  : ${title} Hk.\n\nDAĞITIM YERLERİNE\n\n${s1} Söz konusu husus ilgili birimlerimizce değerlendirilmiş olup gerekli çalışmalar tamamlanmıştır.\n\n${s2} ${s3} Uygulamanın takibi ve koordinasyonu ilgili birimler tarafından yürütülecek; gelişmeler düzenli olarak paylaşılacaktır.\n\nBilgilerinizi ve gereğini arz/rica ederim.\n\n[Ad Soyad]\n[Unvan]`
  };
}

// Mock Dönüştürme & Analiz Üreteci — core ASLA yapıştırılmaz
function generateMockTransformation(core) {
  const cleanCore = core && core.trim().length > 0 ? core.trim() : 'Resmi bilgilendirme yapılacaktır.';
  const texts = buildChannelTextsFromRewrite(composeInstitutionalRewrite(cleanCore));

  return {
    transformedMessages: texts,
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

  const seriousnessConfig = {
    official_letter: { level: 'Resmiyet Seviyesi: %100 (Kamu Bürokrasisi)', tone: 'red' },
    press_release: { level: 'Resmiyet Seviyesi: %95 (Basın Müşavirliği)', tone: 'red' },
    agency_news: { level: 'Resmiyet Seviyesi: %90 (AA/İHA Ajans)', tone: 'blue' },
    linkedin: { level: 'Resmiyet Seviyesi: %85 (Kurumsal Dijital)', tone: 'slate' },
    messaging_chain: { level: 'Resmiyet Seviyesi: %75 (Vatandaş Bilgilendirme)', tone: 'green' },
    vertical_video: { level: 'Resmiyet Seviyesi: %80 (Prodüksiyon Belgesi)', tone: 'purple' },
    x_twitter: { level: 'Resmiyet Seviyesi: %80 (Sosyal Medya Duyurusu)', tone: 'teal' },
    tabloid: { level: 'Resmiyet Seviyesi: %65 (Medya Takip)', tone: 'amber' }
  };

  if (badge && seriousnessConfig[channelId]) {
    badge.textContent = seriousnessConfig[channelId].level;
    badge.className = `evrak-badge evrak-badge-${seriousnessConfig[channelId].tone}`;
  }

  const videoPanel = document.getElementById('official-video-tools');
  if (videoPanel) {
    if (channelId === VIDEO_CHANNEL_ID) {
      videoPanel.classList.remove('hidden');
      videoPanel.innerHTML = videoScenarioToolsHtml({ mountId: 'official-video-module-mount' });
      initLucideIcons();
    } else {
      videoPanel.classList.add('hidden');
      videoPanel.innerHTML = '';
    }
  }

  if (channelId === 'official_letter') {
    paper.innerHTML = `
      <div class="text-center pb-5 mb-6 relative z-10" style="border-bottom: 3px double #0F172A;">
        <div class="flex items-center justify-center mb-3">
          <div class="brand-seal brand-seal--doc" aria-hidden="true"><img src="assets/brand-seal.svg" alt=""></div>
        </div>
        <div class="text-sm font-bold tracking-wider text-slate-800 uppercase font-sans">Mecra Mesajdır</div>
        <div class="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-1 font-sans">Çoklu Mecra Mesaj Platformu</div>
        <div class="text-lg font-extrabold uppercase mt-4 tracking-widest text-[#0F172A] font-sans">RESMİ YAZI VE İDARİ TALİMAT BELGESİ</div>
      </div>
      <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-6 pb-2 border-b border-slate-200 font-sans relative z-10">
        <div>Sayı : <span contenteditable="true" class="editable-field">E-MM-2026/4108</span></div>
        <div>Tarih : <span contenteditable="true" class="editable-field">${todayStr}</span></div>
      </div>
      <div class="text-sm font-bold text-slate-900 mb-6 font-sans text-center tracking-wide relative z-10">İLGİLİ BİRİM VE MÜDÜRLÜKLERE</div>
      <div id="draft-content-editable" contenteditable="true" class="text-sm md:text-base leading-relaxed text-justify space-y-4 min-h-[350px] outline-none editable-content text-slate-900 font-serif relative z-10">
        ${formatTextToParagraphs(rawMsg)}
      </div>
      <div class="mt-12 text-center font-sans relative z-10">
        <div class="font-bold text-slate-900 text-sm">Ayşe YILDIZ</div>
        <div class="text-xs text-slate-600">Genel Sekreter</div>
      </div>
      <div class="mt-10 pt-4 border-t border-slate-300 text-center text-[11px] text-slate-500 font-sans relative z-10">
        <div class="font-bold text-slate-700">Mecra Mesajdır</div>
        <div>Çoklu mecra mesaj dönüşüm ve analiz çıktısı</div>
      </div>`;
  } else {
    paper.innerHTML = `
      <div class="text-center pb-5 mb-6 relative z-10" style="border-bottom: 3px double #0F172A;">
        <div class="flex items-center justify-center mb-3">
          <div class="brand-seal brand-seal--doc" aria-hidden="true"><img src="assets/brand-seal.svg" alt=""></div>
        </div>
        <div class="text-sm font-bold tracking-wider text-slate-800 uppercase font-sans">Mecra Mesajdır</div>
        <div class="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-1 font-sans">Çoklu Mecra Mesaj Platformu</div>
        <div class="text-xl font-extrabold uppercase mt-4 tracking-widest text-[#0F172A] font-sans">${getChannelTitleUpper(channelId)}</div>
      </div>
      <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-6 pb-2 border-b border-slate-200 font-sans relative z-10">
        <div>Tarih: <span id="draft-date" contenteditable="true" class="editable-field">${todayStr}</span></div>
        <div>Evrak Kodu: <span id="draft-number" contenteditable="true" class="editable-field">MM-2026-${String(channelId).toUpperCase()}</span></div>
      </div>
      <div id="draft-content-editable" contenteditable="true" class="text-sm md:text-base leading-relaxed text-justify space-y-4 min-h-[380px] outline-none editable-content text-slate-900 font-serif relative z-10">
        ${formatTextToParagraphs(rawMsg)}
      </div>
      <div class="mt-14 pt-4 border-t border-slate-300 text-center text-[11px] text-slate-500 font-sans space-y-1 relative z-10">
        <div class="font-bold text-slate-700">Mecra Mesajdır</div>
        <div>Çoklu mecra mesaj dönüşüm ve analiz çıktısı</div>
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
