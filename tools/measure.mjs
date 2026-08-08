/* =========================================================
   見た目をブラウザで測る

     ./tools/x measure                 代表ページだけ（速い・反復用）
     ./tools/x measure --all           全89ページ
     ./tools/x measure --widths=390    幅を絞る
     ./tools/x measure --only=wrap     項目を絞る

   測る項目
     size      画面に出ている font-size の**実測値の種類**（5段階のはず）
     right     本文列の右端が揃っているか
     overflow  横溢れ・横スクロールが要る図・図中の実効文字サイズ
     wrap      .goal / .lead / .point の**行ごとの折り返し位置**
     pager     前後の送りの高さ・タップ領域
     nav       上部ナビと目次のタップ領域
     contrast  両テーマの色コントラスト（WCAG AA）

   「崩れていない」＝「読める」ではない。数える・測るための道具（CLAUDE.md §3）。
   ========================================================= */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'node:module';

/* playwright は tools/.cache/node_modules に入れている（./tools/x measure が用意する）。
   ESM の import は NODE_PATH を見ないので、その場所を基点にした require で読む。 */
const PW = createRequire(new URL('./.cache/', import.meta.url))('playwright');

const REPO = path.resolve(new URL('..', import.meta.url).pathname);
const DOCS = path.join(REPO, 'docs');

/* ---------- 引数 ---------- */
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const m = argv.find(a => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};
const ALL = argv.includes('--all');
const WIDTHS = arg('widths', '390,640,860,1024,1440').split(',').map(Number);
const THEMES = arg('themes', 'dark,light').split(',');
const ONLY = arg('only', '').split(',').filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
/* iPhone で見えているのは Safari。折り返しの検証は **webkit** で測ること。
   Chromium と WebKit は日本語の行分割と text-wrap の実装が違う。 */
const ENGINE = arg('engine', 'chromium');
/* A/B 比較用。--css='.goal{text-wrap:wrap}' のように、直したい CSS を当てて測り直せる */
const EXTRA_CSS = arg('css', '');

/* ---------- ページ一覧 ---------- */
const sections = fs.readdirSync(DOCS)
  .filter(d => /^\d\d-/.test(d) && fs.statSync(path.join(DOCS, d)).isDirectory())
  .sort()
  .flatMap(d => fs.readdirSync(path.join(DOCS, d)).filter(f => f.endsWith('.html')).sort()
    .map(f => `${d}/${f}`));
const PAGES = ALL
  ? ['index.html', ...sections]
  // 代表：トップ＋各ドメインの図が重い節＋理解度チェック
  : ['index.html', '00-basics/01-flow.html', '00-basics/03-window.html',
     '01-agentic/05-seq.html', '01-agentic/07-broken.html', '02-tools/03-grain.html',
     '03-claude-code/05-cmdskill.html', '04-prompt/05-thinkapi.html',
     '05-context/02-compact.html', '06-summary/02-weight.html', '00-basics/06-q.html'];

const url = p => 'file://' + path.join(DOCS, p);

/* =========================================================
   ブラウザの中で走る測定関数
   ========================================================= */

/* 色を 0〜255 に正規化する。
   getComputedStyle は color-mix() / color(srgb …) を **0〜1 の小数**で返すことがあるので、
   文字列を自分で解釈しない。canvas に実際に塗って getImageData で読むのが確実。 */
const COLOR_HELPERS = `
window.toRGBA = function(str){
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const x = c.getContext('2d', { willReadFrequently:true });
  x.clearRect(0,0,1,1); x.fillStyle = '#000';
  x.fillStyle = str;
  x.fillRect(0,0,1,1);
  const d = x.getImageData(0,0,1,1).data;
  return [d[0], d[1], d[2], d[3]/255];
}
/* 地色は**祖先をたどって合成する**。1つ見つけて止めると値が狂う。 */
window.bgOf = function(el){
  const stack = [];
  for (let n = el; n; n = n.parentElement){
    const c = toRGBA(getComputedStyle(n).backgroundColor);
    if (c[3] > 0) stack.push(c);
    if (c[3] >= 1) break;
  }
  let out = [255,255,255,1];
  for (let i = stack.length - 1; i >= 0; i--){
    const c = stack[i], a = c[3];
    out = [c[0]*a + out[0]*(1-a), c[1]*a + out[1]*(1-a), c[2]*a + out[2]*(1-a), 1];
  }
  return out;
}
window.lum = function(c){
  const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]);
}
window.ratio = function(a, b){
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
}
window.ownText = function(el){
  return [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
}
`;

/* --- font-size の実測値を集計する --- */
const mSize = () => {
  const out = {};
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('#searchModal')) return;
    const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (!t) return;
    const fs = getComputedStyle(el).fontSize;
    const inFig = !!el.closest('.figbox');
    const key = fs + (inFig ? ' (図の中)' : '');
    (out[key] = out[key] || { n: 0, ex: [] }).n++;
    if (out[key].ex.length < 2) out[key].ex.push(el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0]);
  });
  return out;
};

/* --- 本文列の右端が揃っているか --- */
const mRight = () => {
  const main = document.querySelector('main.doc') || document.querySelector('.hero');
  if (!main) return [];
  const out = [];
  main.querySelectorAll(':scope > *, :scope > * > .figbox, :scope > .cmp').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 4) return;
    out.push({ sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''), right: Math.round(r.right) });
  });
  return out;
};

/* --- 横溢れ・横スクロールが要る図・図中の実効文字サイズ --- */
const mOverflow = () => {
  const W = document.documentElement.clientWidth;
  const over = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('#searchModal')) return;
    // 意図的な横スクロール容器（.figbox / pre.code / .nav-list）の中は、容器そのもので判定する。
    // 中の要素は容器にクリップされるので、はみ出しても画面は壊れない。
    let scroller = null;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === 'auto' || ox === 'scroll' || a.classList.contains('figbox')) { scroller = a; break; }
    }
    if (scroller) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2) return;
    if (r.right > W + 1 || r.left < -1) {
      over.push({ sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''), right: Math.round(r.right), left: Math.round(r.left) });
    }
  });
  const scrollFigs = [];
  document.querySelectorAll('.figbox').forEach((box, i) => {
    if (box.scrollWidth > box.clientWidth + 2) {
      scrollFigs.push({ i, need: box.scrollWidth, have: box.clientWidth });
    }
  });
  // 図中の実効文字サイズ（SVG は viewBox に対する縮尺がかかる）
  let minEff = null;
  document.querySelectorAll('.figbox svg').forEach(svg => {
    const vb = svg.getAttribute('viewBox');
    if (!vb) return;
    const vw = Number(vb.split(/\s+/)[2]);
    const rw = svg.getBoundingClientRect().width;
    if (!vw || !rw) return;
    const k = rw / vw;
    svg.querySelectorAll('text').forEach(t => {
      if (!t.textContent.trim()) return;
      const eff = parseFloat(getComputedStyle(t).fontSize) * k;
      if (minEff === null || eff < minEff) minEff = eff;
    });
  });
  document.querySelectorAll('.figbox .fig, .figbox [class*="fig-"]').forEach(el => {
    const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (!t) return;
    const eff = parseFloat(getComputedStyle(el).fontSize);
    if (minEff === null || eff < minEff) minEff = eff;
  });
  return { over: over.slice(0, 12), overN: over.length, scrollFigs, minEff: minEff === null ? null : Math.round(minEff * 10) / 10 };
};

/* --- 行ごとの折り返し位置を出す（Range で1行ずつの矩形を取る） --- */
const mWrap = (selectors) => {
  const out = [];
  document.querySelectorAll(selectors).forEach(el => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lines = [];
    let n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      // 「ゴール」「ポイント」の見出しは display:block の別ブロック。本文の折り返しとは無関係
      let blocky = false;
      for (let a = n.parentElement; a && a !== el; a = a.parentElement) {
        if (getComputedStyle(a).display !== 'inline') { blocky = true; break; }
      }
      if (blocky) continue;
      for (let i = 0; i < n.textContent.length; i++) {
        const r = document.createRange();
        r.setStart(n, i); r.setEnd(n, i + 1);
        const b = r.getBoundingClientRect();
        if (!b.width && !b.height) continue;
        const top = Math.round(b.top);
        const last = lines[lines.length - 1];
        if (last && Math.abs(last.top - top) < 4) { last.text += n.textContent[i]; last.right = b.right; }
        else lines.push({ top, text: n.textContent[i], left: b.left, right: b.right });
      }
    }
    if (lines.length < 2) return;   // 1行なら折り返していない
    const box = el.getBoundingClientRect();
    // 余りは**内容領域の右端**から測る。箱の右端から測るとパディングぶん過大になる
    const cs = getComputedStyle(el);
    const contentRight = box.right - parseFloat(cs.paddingRight || 0) - parseFloat(cs.borderRightWidth || 0);
    out.push({
      sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
      boxRight: Math.round(contentRight),
      lines: lines.map(l => ({ text: l.text, right: Math.round(l.right), fill: Math.round(l.right - l.left) })),
    });
  });
  return out;
};

/* --- 前後の送り --- */
const mPager = () => {
  const p = document.querySelector('.secpager');
  if (!p) return null;
  const r = p.getBoundingClientRect();
  return {
    height: Math.round(r.height),
    items: [...p.children].map(c => {
      const b = c.getBoundingClientRect();
      return { sel: String(c.className).split(' ').slice(0, 2).join('.'), w: Math.round(b.width), h: Math.round(b.height), text: c.textContent.trim().replace(/\s+/g, ' ').slice(0, 26) };
    }),
  };
};

/* --- メニュー --- */
const mNav = () => {
  const nav = document.querySelector('.domnav');
  const list = document.querySelector('.nav-list');
  const toc = document.querySelector('.toc');
  const tg = document.querySelector('.toc-toggle');
  const items = [...document.querySelectorAll('.nav-item')].map(a => {
    const b = a.getBoundingClientRect();
    return { on: a.classList.contains('on'), w: Math.round(b.width), h: Math.round(b.height), text: a.textContent.trim().replace(/\s+/g, ' ') };
  });
  return {
    navH: nav ? Math.round(nav.getBoundingClientRect().height) : null,
    listScroll: list ? { need: list.scrollWidth, have: list.clientWidth } : null,
    items,
    tocMode: toc ? (toc.classList.contains('toc-fold') ? (toc.classList.contains('toc-open') ? '開' : '畳') : '常時') : null,
    toggleH: tg ? Math.round(tg.getBoundingClientRect().height) : null,
    tocLinks: [...document.querySelectorAll('.toc-link')].slice(0, 3).map(a => {
      const b = a.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    }),
  };
};

/* --- コントラスト --- */
const mContrast = () => {
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('#searchModal')) return;
    const t = ownText(el);
    if (!t) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const fg = toRGBA(cs.color);
    const bg = bgOf(el);   // 自分の background も地色に含める
    const c = ratio([fg[0]*fg[3] + bg[0]*(1-fg[3]), fg[1]*fg[3] + bg[1]*(1-fg[3]), fg[2]*fg[3] + bg[2]*(1-fg[3])], bg);
    if (c < need) {
      out.push({ sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
                 ratio: Math.round(c * 100) / 100, need, size, text: t.slice(0, 22) });
    }
  });
  return out;
};

/* --- SVG の中の文字色も測る（fill は color と別経路） --- */
const mContrastSvg = () => {
  const out = [];
  document.querySelectorAll('.figbox svg text, .figbox svg tspan').forEach(el => {
    const t = el.textContent.trim();
    if (!t) return;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const svg = el.closest('svg');
    const vb = svg.getAttribute('viewBox');
    const k = vb ? svg.getBoundingClientRect().width / Number(vb.split(/\s+/)[2]) : 1;
    const size = parseFloat(cs.fontSize) * k;
    const weight = Number(cs.fontWeight) || 400;
    const need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5;
    const fg = toRGBA(cs.fill && cs.fill !== 'none' ? cs.fill : cs.color);
    // 文字の真下にある図形を拾う。.figbox の地で近似すると、色つきの箱に乗った
    // 文字がすべて誤判定になる（実測で 1:1 が並んだ）。
    let bg = null;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (const under of document.elementsFromPoint(cx, cy)) {
      if (under === el || el.contains(under)) continue;
      const ucs = getComputedStyle(under);
      const paint = (under.ownerSVGElement || under.tagName.toLowerCase() === 'svg')
        ? (ucs.fill && ucs.fill !== 'none' ? ucs.fill : null)
        : ucs.backgroundColor;
      if (!paint) continue;
      const c = toRGBA(paint);
      if (c[3] > 0.5) { bg = [c[0], c[1], c[2], 1]; break; }
    }
    if (!bg) bg = bgOf(el.closest('.figbox') || el.parentElement);
    const c = ratio([fg[0]*fg[3] + bg[0]*(1-fg[3]), fg[1]*fg[3] + bg[1]*(1-fg[3]), fg[2]*fg[3] + bg[2]*(1-fg[3])], bg);
    if (c < need) out.push({ ratio: Math.round(c*100)/100, need, size: Math.round(size*10)/10, text: t.slice(0, 22) });
  });
  return out;
};

/* =========================================================
   実行
   ========================================================= */
const browser = await PW[ENGINE].launch();
const log = [];
const say = s => { console.log(s); log.push(s); };

/* transition が効いていると**遷移中の中間色**を拾う。切り替える前に必ず殺す。 */
const KILL_MOTION = `*,*::before,*::after{transition:none !important;animation:none !important}`;

/* 補助関数は addInitScript で入れる。page.evaluate は文字列を**式**として読むので、
   function 宣言をそのまま渡すと SyntaxError になる。 */
async function newPage(ctx) {
  const page = await ctx.newPage();
  await page.addInitScript({ content: COLOR_HELPERS });
  return page;
}

async function open(page, p, theme) {
  await page.goto(url(p), { waitUntil: 'load' });
  await page.addStyleTag({ content: KILL_MOTION });
  if (EXTRA_CSS) await page.addStyleTag({ content: EXTRA_CSS });
  await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
  await page.waitForTimeout(30);
}

say(`■ ${ENGINE} ／ 対象 ${PAGES.length} ページ ／ 幅 ${WIDTHS.join(', ')} ／ テーマ ${THEMES.join(', ')}`
  + (EXTRA_CSS ? `\n  追加CSS: ${EXTRA_CSS}` : ''));

/* --- 1. font-size の種類（幅ごと） --- */
if (want('size')) {
  say('\n■ 画面に出ている font-size の種類');
  for (const w of [Math.min(...WIDTHS), Math.max(...WIDTHS)]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    const page = await newPage(ctx);
    const agg = {};
    for (const p of PAGES) {
      await open(page, p, 'dark');
      const r = await page.evaluate(mSize);
      Object.entries(r).forEach(([k, v]) => {
        (agg[k] = agg[k] || { n: 0, ex: [] }).n += v.n;
        v.ex.forEach(e => { if (agg[k].ex.length < 3 && !agg[k].ex.includes(e)) agg[k].ex.push(e); });
      });
    }
    await ctx.close();
    const keys = Object.keys(agg).sort((a, b) => parseFloat(a) - parseFloat(b));
    const plain = keys.filter(k => !k.includes('図'));
    say(`  ${w}px — 本文 ${plain.length} 種類 ${plain.length === 5 ? '✓' : '✗（5段階のはず）'}`);
    keys.forEach(k => say(`     ${k.padEnd(18)} ${String(agg[k].n).padStart(5)} 箇所   ${agg[k].ex.join(' ')}`));
  }
}

/* --- 2. 右端 --- */
if (want('right')) {
  say('\n■ 本文列の右端');
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await newPage(ctx);
    const bad = [];
    for (const p of PAGES) {
      await open(page, p, 'dark');
      const rows = await page.evaluate(mRight);
      const rights = rows.map(r => r.right);
      if (!rights.length) continue;
      const mode = rights.sort((a, b) => rights.filter(x => x === a).length - rights.filter(x => x === b).length).pop();
      rows.filter(r => Math.abs(r.right - mode) > 2).forEach(r => bad.push(`${p} ${r.sel} right=${r.right}（多数派 ${mode}）`));
    }
    await ctx.close();
    say(`  ${w}px — ずれ ${bad.length} 件 ${bad.length ? '✗' : '✓'}`);
    bad.slice(0, 8).forEach(b => say('     ' + b));
  }
}

/* --- 3. 横溢れ・図の横スクロール --- */
if (want('overflow')) {
  say('\n■ 横溢れ・図の横スクロール・図中の実効文字サイズ');
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await newPage(ctx);
    let overN = 0, scrollN = 0, minEff = null;
    const samples = [];
    for (const p of PAGES) {
      await open(page, p, 'dark');
      const r = await page.evaluate(mOverflow);
      overN += r.overN;
      scrollN += r.scrollFigs.length;
      if (r.minEff !== null && (minEff === null || r.minEff < minEff)) minEff = r.minEff;
      if (r.overN && samples.length < 6) samples.push(`${p} ${r.over.map(o => o.sel + '@' + o.right).slice(0, 3).join(' ')}`);
      if (r.scrollFigs.length && samples.length < 6) samples.push(`${p} 図が横スクロール ${r.scrollFigs.map(f => f.need + '>' + f.have).join(' ')}`);
    }
    await ctx.close();
    say(`  ${w}px — 横溢れ ${overN} 件 ／ 横スクロールする図 ${scrollN} 点 ／ 図中の最小実効 ${minEff}px`);
    samples.forEach(s => say('     ' + s));
  }
}

/* --- 4. 折り返し位置 --- */
if (want('wrap')) {
  say('\n■ 折り返し位置（.goal / .lead / .point）');
  for (const w of WIDTHS.filter(x => x <= 640)) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await newPage(ctx);
    say(`  ── ${w}px ──`);
    let shown = 0;
    for (const p of PAGES) {
      await open(page, p, 'dark');
      const rows = await page.evaluate(mWrap, '.goal, .lead, .point');
      rows.forEach(r => {
        const last = r.lines[r.lines.length - 1];
        // (A) 途中の行が1文字ぶん以上余らせて折り返している
        const early = r.lines.slice(0, -1).filter(l => r.boxRight - l.right > 20);
        // (B) 最終行が極端に短い（ぶら下がりの1〜3文字）
        const stub = last.text.trim().length <= 3;
        if ((!early.length && !stub) || shown >= 12) return;
        shown++;
        say(`     ${p} ${r.sel}（箱の右端 ${r.boxRight}）${stub ? '  ★最終行が' + last.text.trim().length + '文字' : ''}`);
        r.lines.forEach((l, i) => {
          const gap = r.boxRight - l.right;
          const mark = (i < r.lines.length - 1 && gap > 20) ? '  ← 余り ' + gap + 'px' : '';
          say(`        ${String(i + 1).padStart(2)}| ${l.text}${mark}`);
        });
      });
    }
    await ctx.close();
    if (!shown) say('     ✓ 不自然に早い折り返しなし');
  }
}

/* --- 5. 前後の送り --- */
if (want('pager')) {
  say('\n■ 前後の送り');
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await newPage(ctx);
    let max = null;
    for (const p of PAGES) {
      if (p === 'index.html') continue;
      await open(page, p, 'dark');
      const r = await page.evaluate(mPager);
      if (r && (!max || r.height > max.height)) max = { ...r, p };
    }
    await ctx.close();
    if (max) {
      say(`  ${w}px — 最大 ${max.height}px（${max.p}）`);
      max.items.forEach(i => say(`     ${i.sel.padEnd(14)} ${String(i.w).padStart(4)}×${String(i.h).padStart(3)}  ${i.text}`));
    }
  }
}

/* --- 6. メニュー --- */
if (want('nav')) {
  say('\n■ メニュー');
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await newPage(ctx);
    await open(page, PAGES.find(p => p !== 'index.html'), 'dark');
    const r = await page.evaluate(mNav);
    say(`  ${w}px — ナビ高 ${r.navH}px ／ 横スクロール ${r.listScroll.need > r.listScroll.have ? `あり(${r.listScroll.need}>${r.listScroll.have})` : 'なし'} ／ 目次 ${r.tocMode}${r.toggleH ? `(${r.toggleH}px)` : ''}`);
    // 畳まれているときは**開いてから**タップ領域を測る（畳んだまま測ると 0×0 になる）
    const folded = await page.evaluate(() => !!document.querySelector('.domnav.navfold .nav-cur'));
    if (folded) {
      const cur = await page.evaluate(() => {
        const b = document.querySelector('.nav-cur').getBoundingClientRect();
        return { w: Math.round(b.width), h: Math.round(b.height), t: document.querySelector('.nav-cur').textContent.trim() };
      });
      say(`     畳んだボタン「${cur.t}」 ${cur.w}×${cur.h}${cur.h < 44 ? '  ✗44px未満' : '  ✓'}`);
      await page.click('.nav-cur');
      await page.waitForTimeout(30);
    }
    const r2 = await page.evaluate(mNav);
    await ctx.close();
    const small = r2.items.filter(i => i.h < 44).length;
    say(`     項目 ${r2.items.length}個・44px未満 ${small}個${small ? ' ✗' : ' ✓'} — ${r2.items.slice(0, 3).map(i => `${i.text}:${i.w}×${i.h}`).join('  ')}`);
    if (r2.tocLinks.length) say(`     目次リンク ${r2.tocLinks.map(l => l.w + '×' + l.h).join(' ')}`);
  }
}

/* --- 7. コントラスト --- */
if (want('contrast')) {
  say('\n■ コントラスト（WCAG AA）');
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newPage(ctx);
    const agg = new Map();
    for (const p of PAGES) {
      await open(page, p, theme);
      const a = await page.evaluate(mContrast);
      const b = await page.evaluate(mContrastSvg);
      [...a, ...b.map(x => ({ ...x, sel: 'svg text' }))].forEach(x => {
        const k = x.sel + '|' + x.ratio;
        if (!agg.has(k)) agg.set(k, { ...x, n: 0, page: p });
        agg.get(k).n++;
      });
    }
    await ctx.close();
    const rows = [...agg.values()].sort((a, b) => a.ratio - b.ratio);
    const total = rows.reduce((s, r) => s + r.n, 0);
    say(`  ${theme} — 未達 ${total} 箇所（${rows.length} 種類）${total ? '✗' : '✓'}`);
    rows.slice(0, 12).forEach(r => say(`     ${String(r.ratio).padStart(5)}:1（要 ${r.need}） ${r.sel.padEnd(20)} ${r.size}px ×${r.n}  「${r.text}」`));
  }
}

await browser.close();

const outPath = path.join(REPO, 'tools/.cache/measure.txt');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, log.join('\n') + '\n');
say(`\n（結果は tools/.cache/measure.txt にも保存）`);
