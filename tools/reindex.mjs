/* =========================================================
   節ファイルの周りを書き出す ＋ 検索インデックスの再生成 ＋ キャッシュ対策

     node tools/reindex.mjs

   本文を編集したあとに必ず実行する。することは4つ。

   1. 各節ファイルの「本文」（▼ 本文 〜 ▲ 本文 のあいだ）を読み取る
   2. その前後 ─ head・上部ナビ・矢印defs・目次・パンくず・前後の送り・検索窓 ─ を
      このファイルのテンプレートから書き出す（**唯一の出所はここ**。HTML を手で直しても
      次の reindex で上書きされる）
   3. assets/search-index.js を本文から作り直す
   4. assets/*.css|js の参照に ?v=<中身の SHA1 先頭8桁> を打ち直す
      （これがないと、ブラウザが古い search-index.js や style.css を使い続けて
        本文と検索結果がズレる）

   依存パッケージなし（Node 18+）。
   ========================================================= */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/* 成果物（HTML と assets）は docs/ の下 ─ GitHub Pages がそのまま公開できる名前。tools/ と CLAUDE.md はリポジトリ直下 */
const ROOT = path.join(path.resolve(new URL('..', import.meta.url).pathname), 'docs');

/* ---------- ドメインの定義 ─ 順序もここで決まる ---------- */
const DOMAINS = [
  { dir: '00-basics',      key: 'basics',  num: '前提',     h1: '会話の実体',                            nav: '会話の実体',       w: '', sub: '全ドメイン共通の土台' },
  { dir: '01-agentic',     key: 'agentic', num: 'Domain 1', h1: 'エージェント設計とオーケストレーション', nav: 'エージェント設計', w: '27%', sub: 'エージェントの組み立て' },
  { dir: '02-tools',       key: 'tools',   num: 'Domain 2', h1: 'ツール設計と MCP 連携',                 nav: 'ツールと MCP',     w: '18%', sub: '道具そのものの設計' },
  { dir: '03-claude-code', key: 'code',    num: 'Domain 3', h1: 'Claude Code の設定とワークフロー',       nav: 'Claude Code',      w: '20%', sub: 'Claude Code の運用' },
  { dir: '04-prompt',      key: 'prompt',  num: 'Domain 4', h1: 'プロンプト設計と構造化出力',             nav: 'プロンプト設計',   w: '20%', sub: '指示と出力の設計' },
  { dir: '05-context',     key: 'context', num: 'Domain 5', h1: 'コンテキスト管理と信頼性',               nav: 'コンテキスト管理', w: '15%', sub: '長く動かすための備え' },
  { dir: '06-summary',     key: 'summary', num: 'まとめ',   h1: '全体をもう一度',                        nav: '全体をもう一度',   w: '', sub: '総合チェック・模擬試験' },
];

const OPEN = '<!-- ▼ 本文 ─ ここだけを編集する。この前後は node tools/reindex.mjs が書き出す -->';
const CLOSE = '<!-- ▲ 本文 -->';

/* ---------- 1. 節ファイルを読む ---------- */
const pages = [];
for (const d of DOMAINS) {
  const dirFull = path.join(ROOT, d.dir);
  if (!fs.existsSync(dirFull)) { console.warn('⚠ ディレクトリがない:', d.dir); continue; }
  const files = fs.readdirSync(dirFull).filter(f => f.endsWith('.html')).sort();
  files.forEach(file => {
    const full = path.join(dirFull, file);
    const raw = fs.readFileSync(full, 'utf8');
    const a = raw.indexOf(OPEN), b = raw.indexOf(CLOSE);
    if (a < 0 || b < 0) { console.warn('⚠ 本文の目印がない:', d.dir + '/' + file); return; }
    const body = raw.slice(a + OPEN.length, b).trim();
    const id = (body.match(/<section class="sec[^"]*"\s+id="([^"]*)"/) || [])[1];
    const h2 = (body.match(/<h2>([\s\S]*?)<\/h2>/) || ['', ''])[1].replace(/<[^>]*>/g, '').trim();
    const m = h2.match(/^(\d+-\d+)　?(.*)$/);
    const subs = [...body.matchAll(/<h3 class="sub" id="([^"]*)">([\s\S]*?)<\/h3>/g)]
      .map(x => ({ id: x[1], t: x[2].replace(/<[^>]*>/g, '').trim() }));
    if (!id) { console.warn('⚠ id がない:', d.dir + '/' + file); return; }
    pages.push({
      dom: d, file, rel: d.dir + '/' + file, full, body, id,
      num: m ? m[1] : '', title: m ? m[2] : h2, h2,
      quiz: /<section class="sec sec-quiz/.test(body), subs,
    });
  });
}

/* ---------- 2. 部品 ---------- */
const HEADFONT = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

const THEMEBOOT = `<script>(function(){var t=localStorage.getItem('ccarf-theme');if(t)document.documentElement.dataset.theme=t;})();</script>`;

const MARKERS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="var(--fig-muted)"/></marker>
  <marker id="ara" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="var(--fig-amber)"/></marker>
  <marker id="arb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="var(--fig-blue)"/></marker>
  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="var(--fig-red)"/></marker>
  <marker id="arg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="var(--fig-green)"/></marker>
</defs></svg>`;

const MODAL = `<div class="modal" id="searchModal" hidden>
  <div class="modal-box">
    <input id="searchInput" type="search" placeholder="用語・見出し・本文を検索（例: input_schema、キャッシュ）" autocomplete="off">
    <div id="searchResults" class="results"></div>
    <div class="modal-foot"><kbd>Esc</kbd> で閉じる</div>
  </div>
</div>`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 各ドメインの入口（最初の節） */
const entry = {};
DOMAINS.forEach(d => {
  const first = pages.find(p => p.dom.dir === d.dir);
  entry[d.dir] = first ? first.rel : 'index.html';
});

/** 上部ナビ。base は ''（ルート）か '../'（節ファイル） */
const domnav = (base, curKey) => `<nav class="domnav">
  <a class="brand" href="${base}index.html"><span class="brand-mark">CCAR-F</span><span class="brand-sub">学習ノート</span></a>
  <div class="nav-list">${DOMAINS.map(d => `<a class="nav-item${d.key === curKey ? ' on' : ''}" data-domain="${d.key}" href="${base}${entry[d.dir]}" title="${esc(d.h1)}">
       <span class="nav-num">${esc(d.num)}</span><span class="nav-title">${esc(d.nav)}</span></a>`).join('\n')}</div>
  <div class="search-wrap">
  <button class="search-btn" id="openSearch" aria-label="検索"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>検索</span><kbd>/</kbd></button>
</div>
</nav>`;

/** 目次。表示中のドメインの節だけを並べ、小見出しは表示中の節の下にだけ出す */
const toc = (cur) => {
  const list = pages.filter(p => p.dom.dir === cur.dom.dir);
  const items = list.map(p => {
    const on = p.rel === cur.rel;
    const label = (p.num ? p.num + '　' : '') + p.title;
    let s = `<a class="toc-link${on ? ' on' : ''}${p.quiz ? ' toc-quiz' : ''}" href="../${p.rel}">${esc(label)}</a>`;
    if (on && p.subs.length) {
      s += '\n' + p.subs.map(x => `<a class="toc-link toc-sub" href="#${x.id}">${esc(x.t)}</a>`).join('\n');
    }
    return s;
  });
  return `<aside class="toc">
  <div class="toc-head">${esc(cur.dom.num)}</div>
  <nav class="toc-list">${items.join('\n')}</nav>
</aside>`;
};

/** パンくず（ドメインの見出しを1行に畳んだもの） */
const crumb = (cur) => `<p class="crumb" data-domain="${cur.dom.key}"><b>${esc(cur.dom.num)}</b><span>${esc(cur.dom.h1)}</span>${cur.dom.w ? `<span class="w">出題比率 ${cur.dom.w}</span>` : ''}</p>`;

/** 前後の送り。ドメインの境目も越えて、本全体で1本につながる */
const pager = (i) => {
  const cur = pages[i], prev = pages[i - 1], next = pages[i + 1];
  const lab = p => (p.num ? p.num + '　' : '') + p.title;
  const inDom = pages.filter(p => p.dom.dir === cur.dom.dir);
  const pos = inDom.findIndex(p => p.rel === cur.rel) + 1;
  const pv = prev
    ? `<a class="pgv prev" href="../${prev.rel}"><span class="pgv-l">前へ</span>${esc(lab(prev))}</a>`
    : `<a class="pgv prev" href="../index.html"><span class="pgv-l">前へ</span>目次</a>`;
  const nx = next
    ? `<a class="pgv next" href="../${next.rel}"><span class="pgv-l">次へ</span>${esc(lab(next))}</a>`
    : `<span class="pgv next end"><span class="pgv-l">ここで終わり</span>おつかれさまでした</span>`;
  return `<nav class="secpager">
${pv}
<span class="pgv-n">${cur.dom.num} ${pos} / ${inDom.length}</span>
${nx}
</nav>`;
};

/* ---------- 3. 節ファイルを書き出す ---------- */
let wrote = 0;
pages.forEach((p, i) => {
  const html = `<!doctype html>
<html lang="ja" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.h2)} ─ ${esc(p.dom.num)} ─ CCAR-F 学習ノート</title>
${HEADFONT}
<link rel="stylesheet" href="../assets/style.css">
</head>
<body data-page="${p.id}">
${THEMEBOOT}
${domnav('../', p.dom.key)}
${MARKERS}
<div class="shell">
${toc(p)}
<main class="doc">
${crumb(p)}
${OPEN}
${p.body}
${CLOSE}
${pager(i)}
</main>
</div>
${MODAL}
<script src="../assets/quiz-data.js"></script>
<script src="../assets/search-index.js"></script>
<script src="../assets/app.js"></script>
</body></html>
`;
  const before = fs.existsSync(p.full) ? fs.readFileSync(p.full, 'utf8') : '';
  // ?v= は最後にまとめて打つので、比較のためにこの時点では外した形で持つ
  if (before.replace(/\?v=[0-9a-f]+/g, '') !== html) { fs.writeFileSync(p.full, html); wrote++; }
});
console.log(`節ファイルを書き出し: ${pages.length} 件（変更 ${wrote} 件）`);

/* ---------- 4. index.html の上部ナビ・カード・分量を書き出す ----------
   カードの項目名や項数は本文からズレやすいので、手で書かず生成する。 */
const idxPath = path.join(ROOT, 'index.html');
if (fs.existsSync(idxPath)) {
  let idx = fs.readFileSync(idxPath, 'utf8');

  // 上部ナビ
  const a = idx.indexOf('<nav class="domnav">');
  const navEnd = idx.indexOf('</nav>', idx.indexOf('<div class="search-wrap">'));
  if (a >= 0 && navEnd > a) idx = idx.slice(0, a) + domnav('', null) + idx.slice(navEnd + 6);

  // ドメインごとのカード
  const cards = DOMAINS.map(d => {
    const list = pages.filter(p => p.dom.dir === d.dir);
    const body = list.filter(p => !p.quiz), qz = list.filter(p => p.quiz);
    const shown = list.slice(0, 5).map(p => `<li>${esc((p.num ? p.num + '　' : '') + p.title)}</li>`).join('');
    const more = list.length > 5 ? `<li>ほか ${list.length - 5} 項</li>` : '';
    return `<a class="card" href="${entry[d.dir]}" data-domain="${d.key}">
  <span class="c-num">${esc(d.num)}</span>
  <h2>${esc(d.h1)}</h2>
  <p class="c-sub">${d.w ? '出題比率 ' + d.w + ' ・ ' + d.sub : d.sub}</p>
  <ul class="c-list">${shown}${more}</ul>
  <div class="c-meta">${list.length} 項（本文 ${body.length} ・ 理解度チェック ${qz.length}）</div>
</a>`;
  }).join('\n');
  idx = idx.replace(/<!--#cards-->[\s\S]*?<!--\/#cards-->/,
                    `<!--#cards--><div class="cards">${cards}</div><!--/#cards-->`);

  // ドメインごとの分量と、区切り（理解度チェック）の間隔
  const vol = DOMAINS.map(d => {
    const list = pages.filter(p => p.dom.dir === d.dir);
    return `${d.num} ${list.length}項／区切り ${list.filter(p => p.quiz).length}`;
  }).join('　・　');
  let worst = { n: 0, dom: '' };
  DOMAINS.forEach(d => {
    let run = 0;
    pages.filter(p => p.dom.dir === d.dir).forEach(p => {
      if (p.quiz) { if (run > worst.n) worst = { n: run, dom: d.num }; run = 0; } else run++;
    });
    if (run > worst.n) worst = { n: run, dom: d.num };
  });
  const volHtml = `${vol}　── 全 ${pages.length} 項<br>
  区切りは各ドメインの ◇ 理解度チェックです。1項＝1画面なので、区切りまでの項数がそのまま「一度に読む量」になります。<b>いちばん長い区切りは ${worst.dom} の ${worst.n} 項</b>で、そこだけは途中で切る前提で見てください。`;
  idx = idx.replace(/<!--#volume-->[\s\S]*?<!--\/#volume-->/, `<!--#volume-->${volHtml}<!--/#volume-->`);

  fs.writeFileSync(idxPath, idx);
  console.log('index.html の上部ナビ・カード・分量を書き出し');
}

/* ---------- 5. 検索インデックス ---------- */
const index = pages.map(p => ({
  f: p.rel,
  d: p.dom.num,
  id: p.id,
  t: p.h2,
  x: p.body
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')     // 図の中の文字は検索対象外
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim().slice(0, 1800),
}));
const out = path.join(ROOT, 'assets/search-index.js');
fs.writeFileSync(out, 'window.SEARCH_INDEX = ' + JSON.stringify(index) + ';\n');
console.log(`検索インデックスを更新: ${index.length} セクション / ${Math.round(fs.statSync(out).size / 1024)}KB`);

/* ---------- 6. ?v=<ハッシュ> を打つ ---------- */
const ASSETS = ['style.css', 'app.js', 'quiz-data.js', 'search-index.js'];
const ver = {};
ASSETS.forEach(a => {
  const pth = path.join(ROOT, 'assets', a);
  if (!fs.existsSync(pth)) { console.warn('⚠ 見つかりません: assets/' + a); return; }
  ver[a] = crypto.createHash('sha1').update(fs.readFileSync(pth)).digest('hex').slice(0, 8);
});
let touched = 0;
[...pages.map(p => p.full), idxPath].forEach(full => {
  if (!fs.existsSync(full)) return;
  const before = fs.readFileSync(full, 'utf8');
  let after = before;
  Object.entries(ver).forEach(([a, v]) => {
    after = after.replace(
      new RegExp('assets/' + a.replace('.', '\\.') + '(\\?v=[0-9a-f]+)?', 'g'),
      'assets/' + a + '?v=' + v);
  });
  if (after !== before) { fs.writeFileSync(full, after); touched++; }
});
console.log(`資産のバージョンを更新: ${Object.entries(ver).map(([a, v]) => a + '@' + v).join(' ')}`);
console.log(`  → 打ち直した HTML: ${touched} 件`);
