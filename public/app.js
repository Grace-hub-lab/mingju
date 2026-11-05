// 名著金句：今日一句 / 书库 / 搜索 / 收藏（纯前端，收藏存在 localStorage）
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const FAV_KEY = 'mingju-favs';

  // ---------- 数据整理 ----------
  const BOOKS = window.BOOKS || [];
  const QUOTES = [];
  const byId = new Map();
  for (const book of BOOKS) {
    book.quotes.forEach((q, i) => {
      const item = {
        id: `${book.id}-${i + 1}`,
        text: typeof q === 'string' ? q : q.t,
        note: typeof q === 'string' ? '' : q.n || '',
        book,
      };
      QUOTES.push(item);
      byId.set(item.id, item);
    });
  }

  // ---------- 收藏 ----------
  let favs = loadFavs();
  function loadFavs() {
    try {
      const arr = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(arr) ? arr.filter((id) => byId.has(id)) : [];
    } catch { return []; }
  }
  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch { /* 隐私模式下忽略 */ }
  }
  function toggleFav(id) {
    const i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1); else favs.unshift(id);
    saveFavs();
    return i < 0;
  }

  // ---------- 工具 ----------
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function highlight(text, kw) {
    const safe = escapeHtml(text);
    if (!kw) return safe;
    return safe.replace(new RegExp(escapeReg(escapeHtml(kw)), 'gi'), (m) => `<mark>${m}</mark>`);
  }
  const shareText = (q) => `${q.text}\n——${q.book.author}《${q.book.title}》`;

  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 1600);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 非 https 或旧浏览器的兜底
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('已复制');
  }

  // ---------- 句子卡片 ----------
  // opts: { hero, kw, hideBook }
  function quoteCard(q, opts = {}) {
    const el = document.createElement('article');
    el.className = 'quote' + (opts.hero ? ' hero fade' : '');
    el.dataset.id = q.id;
    const isFav = favs.includes(q.id);
    const bookLabel = `${escapeHtml(q.book.author)}《${highlight(q.book.title, opts.kw)}》`;
    const translator = q.book.translator ? ` · ${escapeHtml(q.book.translator)} 译` : '';
    el.innerHTML = `
      <p class="quote-text">${highlight(q.text, opts.kw)}</p>
      <p class="quote-src">
        ${opts.hideBook ? '' : `——<button type="button" class="book-link" data-book="${q.book.id}" aria-label="查看《${escapeHtml(q.book.title)}》的全部句子">${bookLabel}</button>${translator}`}
        ${q.note ? `<span class="quote-note">${escapeHtml(q.note)}</span>` : ''}
      </p>
      <div class="quote-actions">
        <button type="button" class="icon-btn" data-act="fav" aria-pressed="${isFav}" aria-label="${isFav ? '取消收藏' : '收藏'}">${isFav ? '♥ 已收藏' : '♡ 收藏'}</button>
        <button type="button" class="icon-btn" data-act="copy" aria-label="复制这句">📋 复制</button>
        ${navigator.share ? '<button type="button" class="icon-btn" data-act="share" aria-label="分享这句">↗ 分享</button>' : ''}
      </div>`;
    return el;
  }

  // 所有卡片的按钮统一用事件委托处理
  document.addEventListener('click', (e) => {
    const bookBtn = e.target.closest('.book-link');
    if (bookBtn) { openBook(bookBtn.dataset.book); return; }

    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    const card = btn.closest('.quote');
    const q = card && byId.get(card.dataset.id);
    if (!q) return;
    const act = btn.dataset.act;
    if (act === 'fav') {
      const added = toggleFav(q.id);
      // 同一句可能同时出现在多个面板，全部同步
      document.querySelectorAll(`.quote[data-id="${q.id}"] [data-act="fav"]`).forEach((b) => {
        b.setAttribute('aria-pressed', String(added));
        b.setAttribute('aria-label', added ? '取消收藏' : '收藏');
        b.textContent = added ? '♥ 已收藏' : '♡ 收藏';
      });
      toast(added ? '已收藏' : '已取消收藏');
      if (currentTab === 'favs') renderFavs();
    } else if (act === 'copy') {
      copy(shareText(q));
    } else if (act === 'share') {
      navigator.share({ text: shareText(q) }).catch(() => { /* 用户取消 */ });
    }
  });

  // ---------- 今日一句 ----------
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  function dailyIndex() {
    // 按日期做简单哈希，同一天所有人看到同一句
    let h = 0;
    for (const c of dateKey) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % QUOTES.length;
  }
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  $('today-date').textContent = `${today.getMonth() + 1}月${today.getDate()}日 · 星期${WEEK[today.getDay()]} · 今日一句`;
  $('subtitle').textContent = `收录 ${BOOKS.length} 部作品 · ${QUOTES.length} 句`;

  let lastRandom = -1;
  function showToday(idx, isDaily) {
    const box = $('today-card');
    box.innerHTML = '';
    box.appendChild(quoteCard(QUOTES[idx], { hero: true }));
    $('back-today-btn').hidden = isDaily;
    $('today-date').textContent = isDaily
      ? `${today.getMonth() + 1}月${today.getDate()}日 · 星期${WEEK[today.getDay()]} · 今日一句`
      : '随机一句';
  }
  $('random-btn').addEventListener('click', () => {
    let i;
    do { i = Math.floor(Math.random() * QUOTES.length); } while (QUOTES.length > 1 && (i === lastRandom || i === dailyIndex()));
    lastRandom = i;
    showToday(i, false);
  });
  $('back-today-btn').addEventListener('click', () => showToday(dailyIndex(), true));

  // ---------- 书库 ----------
  let region = 'all';
  function renderLibrary() {
    const grid = $('book-grid');
    grid.innerHTML = '';
    BOOKS.filter((b) => region === 'all' || b.region === region).forEach((b) => {
      const li = document.createElement('li');
      li.innerHTML = `<button type="button" class="book-card" data-open="${b.id}">
        <span class="t">${escapeHtml(b.title)}</span>
        <span class="a">${escapeHtml(b.era)} · ${escapeHtml(b.author)}</span>
        <span class="c">${b.quotes.length} 句</span>
      </button>`;
      grid.appendChild(li);
    });
  }
  $('region-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    region = chip.dataset.region;
    $('region-chips').querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderLibrary();
  });
  $('book-grid').addEventListener('click', (e) => {
    const card = e.target.closest('[data-open]');
    if (card) openBook(card.dataset.open);
  });

  function openBook(bookId) {
    const book = BOOKS.find((b) => b.id === bookId);
    if (!book) return;
    switchTab('library');
    $('library-home').hidden = true;
    $('book-detail').hidden = false;
    $('book-title').textContent = `《${book.title}》`;
    $('book-meta').textContent = [book.era, book.author, book.translator && `${book.translator} 译`, `${book.quotes.length} 句`]
      .filter(Boolean).join(' · ');
    const list = $('book-quotes');
    list.innerHTML = '';
    QUOTES.filter((q) => q.book === book).forEach((q) => list.appendChild(quoteCard(q, { hideBook: true })));
    window.scrollTo(0, 0);
    $('book-back').focus();
  }
  function closeBook() {
    $('book-detail').hidden = true;
    $('library-home').hidden = false;
  }
  $('book-back').addEventListener('click', closeBook);

  // ---------- 搜索 ----------
  const SUGGEST = ['人生', '希望', '孤独', '时间', '爱', '玫瑰', '生命', '世界'];
  $('suggest-chips').innerHTML = SUGGEST.map((w) => `<button type="button" class="chip" data-kw="${w}">${w}</button>`).join('');
  $('suggest-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-kw]');
    if (!chip) return;
    $('search-input').value = chip.dataset.kw;
    runSearch();
  });

  function runSearch() {
    const kw = $('search-input').value.trim();
    const box = $('search-results');
    box.innerHTML = '';
    $('suggest-chips').hidden = !!kw;
    if (!kw) { $('search-count').textContent = ''; return; }
    const low = kw.toLowerCase();
    const hits = QUOTES.filter((q) =>
      q.text.toLowerCase().includes(low) ||
      q.book.title.toLowerCase().includes(low) ||
      q.book.author.toLowerCase().includes(low) ||
      q.note.toLowerCase().includes(low));
    $('search-count').textContent = hits.length ? `找到 ${hits.length} 句` : `没有找到包含“${kw}”的句子，换个词试试`;
    hits.forEach((q) => box.appendChild(quoteCard(q, { kw })));
  }
  let searchTimer;
  $('search-input').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 150);
  });

  // ---------- 收藏 ----------
  function renderFavs() {
    const box = $('favs-list');
    box.innerHTML = '';
    favs.forEach((id) => box.appendChild(quoteCard(byId.get(id))));
    $('favs-empty').hidden = favs.length > 0;
    $('favs-count').textContent = favs.length ? `共 ${favs.length} 句` : '';
  }

  // ---------- 底部导航 ----------
  let currentTab = 'today';
  const tabs = document.querySelectorAll('.nav-item');
  function switchTab(name) {
    currentTab = name;
    tabs.forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== `panel-${name}`; });
    if (name === 'favs') renderFavs();
    if (name === 'search') setTimeout(() => $('search-input').focus(), 0);
    window.scrollTo(0, 0);
  }
  tabs.forEach((t) => t.addEventListener('click', () => {
    // 在书库详情页再点一次「书库」= 返回书库首页
    if (t.dataset.tab === 'library' && currentTab === 'library') closeBook();
    switchTab(t.dataset.tab);
  }));

  // ---------- 启动 ----------
  showToday(dailyIndex(), true);
  renderLibrary();

  // ---------- Service Worker：自动更新 ----------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    let reloaded = false;
    const hadController = !!navigator.serviceWorker.controller; // 第一次安装不需要刷新
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || !hadController) return;
      reloaded = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js').then((reg) => reg.update()).catch(() => {});
  }
})();
