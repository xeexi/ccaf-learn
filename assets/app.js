/* =========================================================
   CCAR-F 学習ノート — 挙動
   ========================================================= */
(function () {
  'use strict';

  /* ---------- テーマ切替 ---------- */
  const root = document.documentElement;
  const themeBtn = document.createElement('button');
  themeBtn.id = 'themeBtn';
  themeBtn.title = 'ライト / ダーク切替';
  const paint = () => {
    themeBtn.innerHTML = root.dataset.theme === 'light'
      ? '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
  };
  themeBtn.onclick = () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('ccarf-theme', root.dataset.theme);
    paint();
  };
  paint();
  const sw = document.querySelector('.search-wrap');
  if (sw) sw.insertBefore(themeBtn, sw.firstChild);

  /* ---------- 番号の説明 見出し ---------- */
  document.querySelectorAll('.figbox > .ann').forEach(ol => {
    const h = document.createElement('p');
    h.className = 'annhead'; h.textContent = '番号の説明';
    ol.parentNode.insertBefore(h, ol);
  });

  /* ---------- 目次のスクロール追従 ---------- */
  const links = [...document.querySelectorAll('.toc-link')];
  const secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (secs.length) {
    const spy = () => {
      const y = window.scrollY + 130;
      let cur = 0;
      secs.forEach((s, i) => { if (s.offsetTop <= y) cur = i; });
      links.forEach((a, i) => a.classList.toggle('on', i === cur));
    };
    document.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  /* ---------- 図：画面に入ったら再生 ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        const d = e.target;
        d.classList.remove('run'); void d.offsetWidth; d.classList.add('run');
        io.unobserve(d);
      });
    }, { threshold: 0.16 });
    document.querySelectorAll('.diagram').forEach(d => io.observe(d));
  }

  /* ---------- 理解度チェック ---------- */
  const QUIZ = window.QUIZ || {};
  document.querySelectorAll('.sec-quiz[data-quiz]').forEach(sec => {
    const data = QUIZ[sec.dataset.quiz];
    const wrap = sec.querySelector('.qwrap');
    if (!data || !wrap) return;
    wrap.innerHTML = '';
    const lead = sec.querySelector('.lead');
    if (lead) lead.textContent = data.length + '問。選択肢をクリックすると、その場で正誤と解説が出ます。';
    data.forEach((item, qi) => {
      const box = document.createElement('div');
      box.className = 'q' + (qi > 0 ? ' hide' : '');
      box.innerHTML = '<div class="qn">Q' + (qi + 1) + '</div><p class="qt"></p>';
      box.querySelector('.qt').textContent = item.q;
      item.o.forEach((t, oi) => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.innerHTML = '<span class="ol"></span><span></span>';
        b.querySelector('.ol').textContent = String.fromCharCode(65 + oi);
        b.querySelectorAll('span')[1].textContent = t;
        b.onclick = () => {
          if (box.dataset.done) return;
          box.dataset.done = '1';
          const opts = [...box.querySelectorAll('.opt')];
          opts.forEach(x => x.classList.add('done'));
          opts[item.a].classList.add('ok');
          if (oi !== item.a) b.classList.add('ng');
          const e = box.querySelector('.exp');
          e.classList.add('show');
          if (oi !== item.a) e.classList.add('wrong');
          e.querySelector('span').textContent = item.e;
          e.querySelector('b').textContent =
            (oi === item.a ? '正解' : '不正解 — 正解は ' + String.fromCharCode(65 + item.a)) + '　';
        };
        box.appendChild(b);
      });
      const e = document.createElement('div');
      e.className = 'exp'; e.innerHTML = '<b></b><span></span>';
      box.appendChild(e);
      wrap.appendChild(box);
    });
    const nav = document.createElement('div');
    nav.className = 'qnav';
    const nb = document.createElement('button'); nb.textContent = '次の問題 →';
    const pr = document.createElement('span'); pr.className = 'prog';
    nav.appendChild(nb); nav.appendChild(pr); wrap.after(nav);
    let cur = 0;
    const sync = () => {
      [...wrap.children].forEach((b, i) => b.classList.toggle('hide', i !== cur));
      pr.textContent = (cur + 1) + ' / ' + data.length + ' 問';
      nb.style.display = cur < data.length - 1 ? '' : 'none';
    };
    nb.onclick = () => { if (cur < data.length - 1) { cur++; sync(); wrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } };
    sync();
  });

  /* ---------- 操作できる図 ---------- */
  const IX = {
    'p-cache': '並べ方のボタンを押して比べる',
    'p-token': '候補をクリックして文を伸ばす',
    'p-loop': 'ボタンで1手ずつ進める',
    'p-stop': '値を選んで結果を見る',
  };
  Object.keys(IX).forEach(id => {
    const sec = document.querySelector('[data-widget="' + id + '"]');
    if (!sec) return;
    const c = document.createElement('span');
    c.className = 'chip i';
    c.textContent = '▶ 操作できる図 ─ ' + IX[id];
    const head = sec.querySelector('.sec-head');
    if (head) head.after(c);
  });

  // ① プロンプトキャッシュ
  const CACHE = {
    good: {
      b1: [['system', 8], ['ツール定義', 10], ['長い資料', 48], ['会話履歴', 20], ['今回の質問', 14]],
      b2: [['ここまで前回と同じ → キャッシュヒット', 84, 'hit'], ['追加分だけ再計算', 16, 'tail']],
      t: '<b>安い・速い</b>　2回目は大部分が再利用される。読ませる資料が長いほど、差は大きくなる。'
    },
    bad: {
      b1: [['今日の日付', 8], ['system', 8], ['ツール定義', 10], ['長い資料', 44], ['会話履歴', 16], ['質問', 14]],
      b2: [['先頭が変わった → ここから全部やり直し', 100, 'miss']],
      t: '<b class="ng">高い・遅い</b>　冒頭が1文字変わるだけで、後ろ全部が作り直しになる。変わるものは末尾へ。'
    }
  };
  function drawCache(mode) {
    const d = CACHE[mode] || CACHE.good;
    const fill = (el, rows, def) => { if (el) el.innerHTML = rows.map(r => `<span class="${r[2] || def}" style="flex:${r[1]}">${r[0]}</span>`).join(''); };
    fill(document.getElementById('cb1'), d.b1, 'miss');
    fill(document.getElementById('cb2'), d.b2, 'hit');
    const a = document.getElementById('cans'); if (a) a.innerHTML = d.t;
    document.querySelectorAll('[data-cache]').forEach(b => b.classList.toggle('go', b.dataset.cache === mode));
  }
  document.querySelectorAll('[data-cache]').forEach(b => b.onclick = () => drawCache(b.dataset.cache));
  if (document.getElementById('cb1')) drawCache('good');

  // ② 次トークン予測
  const TK = {
    start: '今日の天気は', steps: [
      [['晴れ', .52], ['曇り', .28], ['雨', .14], ['分かりません', .06]],
      [['です', .61], ['でしょう', .24], ['だと思います', .11], ['、', .04]],
      [['。', .72], ['ね', .13], ['が', .09], ['か', .06]]]
  };
  let tkI = 0, tkT = TK.start;
  function tkDraw() {
    const sent = document.getElementById('tk-sent'), cand = document.getElementById('tk-cand'), ans = document.getElementById('tk-ans');
    if (!sent) return;
    sent.textContent = tkT; cand.innerHTML = '';
    if (tkI >= TK.steps.length) {
      ans.classList.add('show');
      ans.innerHTML = '<b>これで1文</b>　文全体を先に決めたのではなく、3回の選択の結果としてこうなった。候補と確率は、直前までの文章によって毎回変わる。';
      return;
    }
    ans.classList.remove('show');
    TK.steps[tkI].forEach(([t, p]) => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="knob">▶</span><span>${t}</span><span class="barwrap"><i style="width:${Math.round(p * 100)}%"></i></span><span class="p">${p.toFixed(2)}</span>`;
      b.onclick = () => { tkT += t; tkI++; tkDraw(); };
      cand.appendChild(b);
    });
  }
  const tkr = document.getElementById('tk-reset');
  if (tkr) tkr.onclick = () => { tkI = 0; tkT = TK.start; tkDraw(); };
  tkDraw();

  // ③ エージェントループのステップ実行
  const LP = [
    { n: 'n1', c: 'm1', r: 'Claude（考える）', t: '注文 A-12 の状況を調べる必要がある' },
    { n: 'n2', c: 'm2', r: 'assistant　stop_reason = tool_use', t: 'search_orders(order_id:"A-12") を使いたい' },
    { n: 'n3', c: 'm3', r: 'アプリ（コード）', t: '実際に注文DBを検索した → 「配送中」' },
    { n: 'n4', c: 'm4', r: 'user（tool_result）', t: '{"order_id":"A-12","status":"配送中"}' },
    { n: 'n1', c: 'm1', r: 'assistant　stop_reason = end_turn', t: 'A-12 は現在配送中です → ループ終了' }];
  let lpI = 0;
  function lpDraw() {
    const log = document.getElementById('lp-log'); if (!log) return;
    const dia = document.querySelector('[data-widget="p-loop"] .diagram');
    if (dia) dia.classList.toggle('stepping', lpI > 0);
    document.querySelectorAll('[data-widget="p-loop"] .nd').forEach(g => g.classList.remove('on'));
    log.innerHTML = '';
    LP.slice(0, lpI).forEach(s => {
      const d = document.createElement('div'); d.className = s.c;
      d.innerHTML = `<div class="role">${s.r}</div>${s.t}`; log.appendChild(d);
    });
    if (lpI > 0) { const g = document.getElementById(LP[lpI - 1].n); if (g) g.classList.add('on'); }
    const nb = document.getElementById('lp-next');
    nb.disabled = lpI >= LP.length;
    nb.textContent = lpI >= LP.length ? '1周おわり' : '1手進める →';
  }
  const lpn = document.getElementById('lp-next');
  if (lpn) {
    lpn.onclick = () => { if (lpI < LP.length) { lpI++; lpDraw(); } };
    document.getElementById('lp-reset').onclick = () => { lpI = 0; lpDraw(); };
    lpDraw();
  }

  // ④ stop_reason の分岐
  const SR = {
    'b-end': '<b>ループを抜ける</b>　言い切ったので、そのままユーザーに答えを見せる。',
    'b-tool': '<b>ループを続ける</b>　要求されたツールを実行し、結果を tool_result として会話に足して、もう一度リクエストする。',
    'b-max': '<b>完了ではない</b>　出力が途中で切れている。そのまま表示してはいけない。続きを促すか、出力上限を見直す。',
    'b-ref': '<b>別の経路へ</b>　通常の完了として扱わず、案内やエスカレーションなど別の処理に回す。'
  };
  document.querySelectorAll('#sr-ctrl [data-sr]').forEach(b => b.onclick = () => {
    const svg = document.getElementById('sr-svg');
    svg.classList.add('pick');
    svg.querySelectorAll('g[id^="b-"]').forEach(g => g.classList.toggle('sel', g.id === b.dataset.sr));
    document.querySelectorAll('#sr-ctrl button').forEach(x => x.classList.toggle('go', x === b));
    const a = document.getElementById('sr-ans'); a.classList.add('show'); a.innerHTML = SR[b.dataset.sr];
  });

  /* ---------- 全文検索 ---------- */
  const IDX = window.SEARCH_INDEX || [];
  const modal = document.getElementById('searchModal');
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  const openBtn = document.getElementById('openSearch');
  if (modal && input && results) {
    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const open = () => { modal.hidden = false; input.value = ''; results.innerHTML = ''; input.focus(); render(''); };
    const close = () => { modal.hidden = true; };
    if (openBtn) openBtn.onclick = open;
    modal.onclick = e => { if (e.target === modal) close(); };
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      else if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && modal.hidden) {
        const tag = (document.activeElement || {}).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault(); open();
      }
    });
    function render(q) {
      q = q.trim();
      if (!q) {
        results.innerHTML = '<div class="empty">用語・見出し・本文から探せます。<br>例: <code>input_schema</code> / <code>キャッシュ</code> / <code>stop_reason</code></div>';
        return;
      }
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = [];
      IDX.forEach(item => {
        const T = item.t.toLowerCase(), X = item.x.toLowerCase();
        let score = 0, pos = -1;
        terms.forEach(t => {
          if (T.includes(t)) score += 12;
          const i = X.indexOf(t);
          if (i >= 0) { score += 4; if (pos < 0) pos = i; }
        });
        if (score > 0) hits.push({ item, score, pos });
      });
      hits.sort((a, b) => b.score - a.score);
      if (!hits.length) { results.innerHTML = '<div class="empty">見つかりませんでした</div>'; return; }
      results.innerHTML = hits.slice(0, 30).map(({ item, pos }) => {
        const p = Math.max(0, (pos < 0 ? 0 : pos) - 46);
        let snip = esc(item.x.slice(p, p + 190));
        terms.forEach(t => {
          snip = snip.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
        });
        return `<a href="${item.f}#${item.id}">
          <div class="r-top"><span class="r-dom">${esc(item.d)}</span><span class="r-title">${esc(item.t)}</span></div>
          <div class="r-snip">…${snip}…</div></a>`;
      }).join('');
    }
    let tm;
    input.oninput = () => { clearTimeout(tm); tm = setTimeout(() => render(input.value), 90); };
  }
})();
