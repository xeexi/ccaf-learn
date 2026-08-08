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

  /* ---------- 上部ナビ：狭い画面では「いま居るドメイン」に畳む ----------
     390px では 7ドメインが 518px 必要なのに可視幅が 116px しかなく、
     淡い12pxの番号だけが横スクロールする状態だった（実測）。
     畳んで、いま居る場所を名前で見せる。役割は「ドメイン間の移動」。
     ドメイン内の移動は下の目次が受け持つ。
     JS が動かなければ畳まれないだけで、ナビは今までどおり使える。 */
  const navEl = document.querySelector('.domnav');
  const navList = navEl && navEl.querySelector('.nav-list');
  if (navEl && navList) {
    const on = navList.querySelector('.nav-item.on');
    const mqn = window.matchMedia('(max-width:1080px)');
    const cur = document.createElement('button');
    cur.className = 'nav-cur';
    cur.setAttribute('aria-expanded', 'false');
    cur.innerHTML = '<span class="nav-cur-num"></span><span class="nav-cur-t"></span>';
    cur.querySelector('.nav-cur-num').textContent =
      on ? on.querySelector('.nav-num').textContent : '目次';
    cur.querySelector('.nav-cur-t').textContent =
      on ? on.querySelector('.nav-title').textContent : 'トップ';
    cur.onclick = () => {
      const open = navEl.classList.toggle('nav-open');
      cur.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    const applyNav = () => {
      if (mqn.matches) {
        if (!cur.isConnected) navList.parentNode.insertBefore(cur, navList);
        navEl.classList.add('navfold');
      } else {
        navEl.classList.remove('navfold', 'nav-open');
        if (cur.isConnected) cur.remove();
      }
    };
    applyNav();
    mqn.addEventListener('change', applyNav);
    document.addEventListener('click', e => {
      if (navEl.classList.contains('nav-open') && !navEl.contains(e.target)) {
        navEl.classList.remove('nav-open');
        cur.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 目次：いま読んでいる小見出しを光らせる ----------
     節そのものの選択状態は reindex.mjs が静的に書き出している（.toc-link.on）。
     ここでやるのは、その節の中の小見出しの追従だけ。 */
  const subs = [...document.querySelectorAll('.toc-link.toc-sub')]
    .map(a => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) }))
    .filter(x => x.el);
  if (subs.length) {
    const spy = () => {
      const y = window.scrollY + 130;
      let cur = -1;
      subs.forEach((x, i) => { if (x.el.getBoundingClientRect().top + window.scrollY <= y) cur = i; });
      subs.forEach((x, i) => x.a.classList.toggle('on', i === cur));
    };
    document.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('resize', spy);
    spy();
  }

  /* ---------- 目次の開閉（狭い画面だけ） ----------
     広い画面では横に出しっぱなし。狭い画面では畳んで、必要なときだけ開く。
     JS が動かなくても目次は表示されたままなので、機能が消えることはない。 */
  const tocEl = document.querySelector('.toc');
  if (tocEl) {
    const headEl = tocEl.querySelector('.toc-head');
    const listEl = tocEl.querySelector('.toc-list');
    const mq = window.matchMedia('(max-width:1080px)');
    const btn = document.createElement('button');
    btn.className = 'toc-toggle';
    btn.setAttribute('aria-expanded', 'false');
    const cur = document.querySelector('.toc-link.on');
    const label = () => {
      const n = tocEl.querySelectorAll('.toc-link:not(.toc-sub)').length;
      btn.innerHTML = '<span>目次</span><b>' + (cur ? cur.textContent.trim() : '') + '</b><i>' + n + ' 項</i>';
    };
    label();
    btn.onclick = () => {
      const open = tocEl.classList.toggle('toc-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    const apply = () => {
      if (mq.matches) {
        if (!btn.isConnected) tocEl.insertBefore(btn, listEl);
        tocEl.classList.add('toc-fold');
        if (headEl) headEl.hidden = true;
      } else {
        tocEl.classList.remove('toc-fold', 'toc-open');
        if (btn.isConnected) btn.remove();
        if (headEl) headEl.hidden = false;
      }
    };
    apply();
    mq.addEventListener('change', apply);
  }

  /* ---------- 図：横スクロールが要るときだけ、そう書く ---------- */
  const noteSwipe = () => {
    document.querySelectorAll('.figbox').forEach(box => {
      const need = box.scrollWidth > box.clientWidth + 2;
      let tip = box.nextElementSibling;
      const isTip = tip && tip.classList && tip.classList.contains('swipe');
      if (need && !isTip) {
        const s = document.createElement('span');
        s.className = 'swipe';
        s.textContent = '← 図は横にスワイプできます →';
        box.parentNode.insertBefore(s, box.nextSibling);
      } else if (!need && isTip) tip.remove();
    });
  };
  noteSwipe();
  window.addEventListener('resize', noteSwipe);

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
    document.querySelectorAll('.diagram, .fig').forEach(d => io.observe(d));
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
      box.className = 'q';
      box.innerHTML = '<div class="qn">Q' + (qi + 1) + '</div><p class="qt"></p>';
      box.querySelector('.qt').textContent = item.q;
      /* 選択肢は描画のたびに混ぜる。設問データ側の並びに正解が偏っていても
         読み手には届かないし、解き直しで位置を覚えることもない（§7 #29）。
         混ぜるのは組み立て時の1回だけなので、答えたあとに並びは動かない。
         解説や選択肢に「上記」「前者」のような順序に依存する文言がないことは、
         quiz-data.js を走査して確認済み。書き足すときも入れないこと。 */
      const ord = item.o.map((_, i) => i);
      for (let i = ord.length - 1; i > 0; i--) {             // Fisher–Yates
        const j = Math.floor(Math.random() * (i + 1));
        [ord[i], ord[j]] = [ord[j], ord[i]];
      }
      const ans = ord.indexOf(item.a);                        // 混ぜたあとの正解の位置
      ord.forEach((src, oi) => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.innerHTML = '<span class="ol"></span><span></span>';
        b.querySelector('.ol').textContent = String.fromCharCode(65 + oi);
        b.querySelectorAll('span')[1].textContent = item.o[src];
        b.onclick = () => {
          if (box.dataset.done) return;
          box.dataset.done = '1';
          const opts = [...box.querySelectorAll('.opt')];
          opts.forEach(x => x.classList.add('done'));
          opts[ans].classList.add('ok');
          if (oi !== ans) b.classList.add('ng');
          const e = box.querySelector('.exp');
          e.classList.add('show');
          if (oi !== ans) e.classList.add('wrong');
          e.querySelector('span').textContent = item.e;
          e.querySelector('b').textContent =
            (oi === ans ? '正解' : '不正解 — 正解は ' + String.fromCharCode(65 + ans)) + '　';
        };
        box.appendChild(b);
      });
      const e = document.createElement('div');
      e.className = 'exp'; e.innerHTML = '<b></b><span></span>';
      box.appendChild(e);
      wrap.appendChild(box);
    });
  });

  /* ---------- 操作できる図 ---------- */
  const IX = {
    'p-cache': '並べ方のボタンを押して比べる',
    'p-token': '候補をクリックして文を伸ばす',
    'p-loop': 'ボタンで1つずつ進める',
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
    { n: 'n1', c: 'm1', r: 'アプリ → API（system ＋ tools ＋ messages）', t: 'ユーザー：「注文 A-12 の状況は？」＋ 使えるツールの一覧' },
    { n: 'n2', c: 'm2', r: 'assistant　stop_reason = tool_use', t: 'search_orders(order_id:"A-12") を使いたい' },
    { n: 'n3', c: 'm3', r: 'アプリ（コード）', t: '実際に注文DBを検索した → 「配送中」' },
    { n: 'n4', c: 'm4', r: 'user（tool_result）', t: '{"order_id":"A-12","status":"配送中"}' },
    { n: 'n2', c: 'm2', r: 'assistant　stop_reason = end_turn', t: 'A-12 は現在配送中です → ループ終了' }];
  let lpI = 0;
  function lpDraw() {
    const log = document.getElementById('lp-log'); if (!log) return;
    const dia = document.querySelector('[data-widget="p-loop"] .fig, [data-widget="p-loop"] .diagram');
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
    nb.textContent = lpI >= LP.length ? '1周おわり' : '1つ進める →';
  }
  const lpn = document.getElementById('lp-next');
  if (lpn) {
    lpn.onclick = () => { if (lpI < LP.length) { lpI++; lpDraw(); } };
    document.getElementById('lp-reset').onclick = () => { lpI = 0; lpDraw(); };
    lpDraw();
  }

  // ④ stop_reason の分岐
  const SR = {
    'b-tool': '<b>ループを続ける</b>　要求されたツールを実行し、結果を tool_result として会話に足して、もう一度リクエストする。',
    'b-pause': '<b>ループを続ける</b>　Anthropic 側で実行されるツール（web検索など）が既定10周に達しただけ。実行するものはないので、応答をそのまま会話に足して、もう一度投げる。',
    'b-end': '<b>ループを抜ける</b>　言い切ったので、そのままユーザーに答えを見せる。',
    'b-seq': '<b>ループを抜ける</b>　こちらが指定した stop_sequences のどれかに当たった。どれで止まったかは応答の stop_sequence に入っている。',
    'b-max': '<b>完了ではない</b>　こちらが決めた max_tokens に達して切れている。そのまま表示してはいけない。続きを促すか、上限を見直す。',
    'b-ctx': '<b>完了ではない</b>　max_tokens より先にモデルの窓が尽きて切れている。扱いは max_tokens と同じだが、直すのは上限ではなく履歴の量。',
    'b-ref': '<b>別の経路へ</b>　安全上の理由で応じなかった。通常の完了として扱わず、案内やエスカレーションなど別の処理に回す。'
  };
  document.querySelectorAll('#sr-ctrl [data-sr]').forEach(b => b.onclick = () => {
    const svg = document.getElementById('sr-fig');
    svg.classList.add('pick');
    svg.querySelectorAll('[id^="b-"]').forEach(g => g.classList.toggle('sel', g.id === b.dataset.sr));
    document.querySelectorAll('#sr-ctrl button').forEach(x => x.classList.toggle('go', x === b));
    const a = document.getElementById('sr-ans'); a.classList.add('show'); a.innerHTML = SR[b.dataset.sr];
  });

  /* ---------- 全文検索 ---------- */
  const IDX = window.SEARCH_INDEX || [];
  // 節ファイルは1階層下にあるので、索引のパスに ../ を足す
  const BASE = document.body.dataset.page ? '../' : '';
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
        return `<a href="${BASE}${item.f}">
          <div class="r-top"><span class="r-dom">${esc(item.d)}</span><span class="r-title">${esc(item.t)}</span></div>
          <div class="r-snip">…${snip}…</div></a>`;
      }).join('');
    }
    let tm;
    input.oninput = () => { clearTimeout(tm); tm = setTimeout(() => render(input.value), 90); };
  }
})();
