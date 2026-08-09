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
import { GUIDE, EXAM, DOMAINS as BP_DOM, SCENARIOS, PREPARE, EXERCISES, TRAPS, SAMPLES, TASKS, domainItems, scenarioCount } from './blueprint.mjs';

/* 成果物（HTML と assets）は docs/ の下 ─ GitHub Pages がそのまま公開できる名前。tools/ と CLAUDE.md はリポジトリ直下 */
const ROOT = path.join(path.resolve(new URL('..', import.meta.url).pathname), 'docs');

/* ---------- ドメインの定義 ─ 順序もここで決まる ----------
   **比率と問数はここに書かない。** blueprint.mjs の DOMAINS[key].weight が出所で、
   問数は domainItems() が EXAM.items から計算する ── 手で持つと、比率を変えたときに
   帯の長さだけ動いて問数ラベルが古いまま残る（§7 #60 で実際に起きた）。 */
const DOMAINS = [
  { dir: '00-basics',      key: 'basics',  num: '前提',     h1: '会話の実体',                            nav: '会話の実体',       sub: '全ドメイン共通の土台' },
  { dir: '01-agentic',     key: 'agentic', num: 'Domain 1', h1: 'エージェント設計とオーケストレーション', nav: 'エージェント設計', sub: 'エージェントの組み立て' },
  { dir: '02-tools',       key: 'tools',   num: 'Domain 2', h1: 'ツール設計と MCP 連携',                 nav: 'ツールと MCP',     sub: '道具そのものの設計' },
  { dir: '03-claude-code', key: 'code',    num: 'Domain 3', h1: 'Claude Code の設定とワークフロー',       nav: 'Claude Code',      sub: 'Claude Code の運用' },
  { dir: '04-prompt',      key: 'prompt',  num: 'Domain 4', h1: 'プロンプト設計と構造化出力',             nav: 'プロンプト設計',   sub: '指示と出力の設計' },
  { dir: '05-context',     key: 'context', num: 'Domain 5', h1: 'コンテキスト管理と信頼性',               nav: 'コンテキスト管理', sub: '長く動かすための備え' },
  { dir: '06-summary',     key: 'summary', num: 'まとめ',   h1: '全体をもう一度',                        nav: '全体をもう一度',   sub: '総合チェック・模擬試験' },
];
/** 比率のあるドメイン（＝ブループリントの5つ）だけを、定義順で返す */
const scored = () => DOMAINS.filter(d => BP_DOM[d.key]);/* ---------- 出題タスクの名前 ----------
   **出所は blueprint.mjs の TASKS[番号].name**（公式 Exam Guide の Task Statement 原文）。
   本文には \`<p class="task" data-t="1.1"></p>\` と番号だけ書き、中身はここから差し込む。
   2つ持つ節は \`data-t="5.2 5.5"\` のように空白で並べる。 */


const OPEN = '<!-- ▼ 本文 ─ ここだけを編集する。この前後は node tools/reindex.mjs が書き出す -->';
const CLOSE = '<!-- ▲ 本文 -->';

/* ---------- 複数ページで共通の塊 ----------
   同じ図や表が2か所以上に要るとき、本文に <!--#名前--><!--/#名前--> と書いておけば
   reindex が中身を差し込む。手で2か所コピーすると必ず片方だけ古くなる。
   実体（BLOCKS）は部品を定義したあとに置くので、差し込みは読み込みの後に1回まとめて行う。 */
const fillBlocks = (html) => Object.entries(BLOCKS).reduce(
  (s, [name, make]) => s.replace(
    new RegExp(`<!--#${name}-->[\\s\\S]*?<!--/#${name}-->`, 'g'),
    () => `<!--#${name}-->${make()}<!--/#${name}-->`),
  html);

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

/** 項へのリンク1本。目次（節ページの左）と全項目一覧（トップ）で同じ形を使う。
 *  番号と題名を別の列に出す ── ひとつなぎにすると ◇ が番号の左に出てしまい、
 *  題名の頭も揃わない。◇ は「理解度チェックである」印なので題名側に付く。 */
const itemLink = (p, { href, cls = '', on = false }) =>
  `<a class="itm ${cls}${on ? ' on' : ''}${p.quiz ? ' itm-quiz' : ''}" href="${href}">`
  + `<span class="itm-n">${esc(p.num || '─')}</span><span class="itm-t">${esc(p.title)}</span></a>`;

/** 配点の図。トップと「6-2 どこに時間を使うか」の2か所に同じものが要るので、ここで1回だけ作る。
 *  帯の全長＝60問。以前は帯の枠と Domain 1 のバーが同じ長さで、27% が満杯に見えていた。 */
const weightFig = () => {
  const ds = scored();
  const items = ds.map(d => domainItems(d.key));
  const max = ds[items.indexOf(Math.max(...items))], min = ds[items.indexOf(Math.min(...items))];
  // 5本を別々の帯にすると、どれも短くて差が読めなかった。
  // 1本を5つに割って隣り合わせにすると、差がそのまま長さの差として見える。
  const segs = ds.map((d, i) =>
    `<span class="seg" data-domain="${d.key}" style="width:${(BP_DOM[d.key].weight * 100).toFixed(0)}%">${items[i]}問</span>`).join('');
  const legend = ds.map((d, i) =>
    `    <span class="lg s${i + 1}" data-domain="${d.key}"><span class="sw"></span><b>${esc(d.num)}</b><span class="n">${(BP_DOM[d.key].weight * 100).toFixed(0)}%　${esc(d.sub)}</span></span>`).join('\n');
  return `<div class="figbox"><figure class="fig run">
  <p class="fig-t">本試験 ${EXAM.items} 問の内訳 ─ 帯の全長が ${EXAM.items} 問</p>
  <div class="fig-seg s1">${segs}</div>
  <div class="fig-legend">
${legend}
  </div>
  <p class="fig-f">いちばん多い ${esc(max.num)} でも ${Math.max(...items)} 問、いちばん少ない ${esc(min.num)} でも ${Math.min(...items)} 問。<b>その差は ${Math.max(...items) - Math.min(...items)} 問</b>で、1問の重みはどこも同じ。捨てられる範囲はない。</p>
</figure></div>`;
};


/** 本文に <!--#名前--> で差し込める共通の塊。fillBlocks が使う。
 *  nsec は「全何項か」。**手で書くと必ず古くなる** ── 実際にトップの
 *  「全 88 項」が2か所とも実数とズレていた（設問数と同じ事故・§7 #45）。 */
/** 出題形式 ─ 60問・120分・720点。**3か所に手書きされていた**（§7 #60） */
const examFmt = () => `本試験は <b>${EXAM.items}問・${EXAM.minutes}分</b>、合格は ${EXAM.scaleMax.toLocaleString('en-US')}点満点中 <b>${EXAM.pass}点</b>`;

/** シナリオの表と帯 ─ 6-2。
 *  **本数も帯の幅も、どこを強調するかも計算で出す。**
 *  手で書くと、比が狂ったり（§7 #52）、比率を変えたときに古い数字が残る（§7 #60）。 */
const scenarioFig = () => {
  const ds = scored();
  const pct = (x) => String(+(x * 100).toFixed(1)).replace(/\.0$/, '');
  const cnt = Object.fromEntries(ds.map(d => [d.key, scenarioCount(d.key)]));
  const wt = Object.fromEntries(ds.map(d => [d.key, BP_DOM[d.key].weight]));
  const maxC = Math.max(...Object.values(cnt)), minC = Math.min(...Object.values(cnt));
  const maxW = Math.max(...Object.values(wt)), minW = Math.min(...Object.values(wt));
  // 表では、シナリオの数が最多／最少のドメインだけ太字にする（読み手の目印）
  const mark = (k) => cnt[k] === maxC || cnt[k] === minC;
  const rows = SCENARIOS.map(s => {
    const ns = s.domains.slice().sort((a, b) => BP_DOM[a].n - BP_DOM[b].n)
      .map(k => mark(k) ? `<b>${BP_DOM[k].n}</b>` : String(BP_DOM[k].n));
    return `    <tr><td data-l="シナリオ">${'①②③④⑤⑥⑦⑧'[s.n - 1]} ${esc(s.ja)}<br><span class="n">${s.detail}</span></td><td data-l="ドメイン">${ns.join('・')}</td></tr>`;
  }).join('\n');
  const bars = ds.slice().sort((a, b) => cnt[b.key] - cnt[a.key] || BP_DOM[a.key].n - BP_DOM[b.key].n);
  const barHtml = bars.map(d => {
    const c = cnt[d.key], w = wt[d.key];
    // 配点を添えるのは、シナリオ数か配点のどちらかで端にいるドメインだけ
    const note = (w === maxW) ? `　配点は最大 ${pct(w)}%`
               : (w === minW) ? `　配点は最小 ${pct(w)}%`
               : (c === maxC || c === minC) ? `　配点は ${pct(w)}%` : '';
    const val = (c === maxC || c === minC) ? `<b>${c}本</b>` : `${c}本`;
    return `    <div class="fig-bar" data-domain="${d.key}"><span class="b-name">${esc(d.num)}</span>
      <span class="b-track"><span class="b-fill" style="width:${pct(c / EXAM.scenariosTotal)}%"></span></span>
      <span class="b-val">${val}${note}</span></div>`;
  }).join('\n');
  const most = bars[0], least = bars[bars.length - 1];
  return `<table class="tbl">
  <thead><tr><th>本番のシナリオ（${EXAM.scenariosTotal}本のうち${EXAM.scenariosShown}本が出る）</th><th>主に問うドメイン</th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>

<div class="figbox"><figure class="fig run">
  <p class="fig-t">${EXAM.scenariosTotal}本のうち、いくつのシナリオに顔を出すか ─ <b>多い順</b>。帯の全長が ${EXAM.scenariosTotal} 本</p>
  <div class="fig-bars s1">
${barHtml}
  </div>
  <p class="fig-f"><b>配点と、出るシナリオの広さは一致しない。</b>${esc(most.d ? most.d.num : most.num)}（配点 ${pct(wt[most.key])}%）は<b>${EXAM.scenariosTotal}本中${cnt[most.key]}本</b>に顔を出し、${esc(least.num)}（配点 ${pct(wt[least.key])}%）は<b>${cnt[least.key]}本に集中</b>している</p>
</figure></div>`;
};

/** 受験の実務 ─ §3 / §11〜§15。**行動が変わる数字だけ**を出す（支払い方法や苦情の窓口は公式へ） */
const examAdmin = () => `<div class="ex"><span class="exl">受験の実務 ─ 計画に効くものだけ</span>
  <b>受け方</b>　オンライン監督つき、またはテストセンター（Pearson VUE）。受験料 <b>${EXAM.fee} USD</b>。予約の変更・取消は<b>${EXAM.cancelHours}時間前まで</b>（過ぎると受験料は戻りません）。<br>
  <b>落ちたとき</b>　待機は<b>${EXAM.retakeWaitDays.join('日 → ')}日</b>と伸びます。12か月で受けられるのは<b>${EXAM.attemptsPerYear}回</b>まで。<b>1回目で通す前提で組むほうが安上がり</b>です。<br>
  <b>受かったあと</b>　有効期間は<b>${EXAM.validityMonths}か月</b>。期限内なら<b>無料の更新試験</b>で更新でき、切らすと本試験を受け直しになります。<br>
  <b>当日</b>　写真つきの本人確認書類が要ります。机の上に資料・端末は置けません。試験内容は<b>口外しない</b>という同意（NDA）に応じてから始まります。</div>`;

/** §7 How to Prepare ＋ §8 Preparation Exercises ─ 手を動かす準備 */
const prepareFig = () => {
  const sec = (ids) => ids.map(id => {
    const p = pages.find(x => x.id === id);
    return p ? `<a href="../${p.rel}">${esc(p.num)}</a>` : null;
  }).filter(Boolean).join(' ');
  const rows = PREPARE.map(p =>
    `    <tr><td data-l="やること"><b>${p.ja}</b></td>
        <td data-l="中身">${p.detail}</td>
        <td data-l="対応する項"><span class="n">${sec(p.sections)}</span></td></tr>`).join('\n');
  const ex = EXERCISES.map(e => {
    const doms = e.domains.map(k => `Domain ${BP_DOM[k].n}`).join('・');
    const steps = e.steps.map(s => `      <li>${s}</li>`).join('\n');
    return `  <div class="ex"><span class="exl">演習 ${'①②③④⑤⑥'[e.n - 1]}　${esc(e.ja)}</span>
  <b>ねらい</b>　${esc(e.objective)}　<span class="n">（${doms}）</span>
  <ol class="exsteps">
${steps}
  </ol></div>`;
  }).join('\n');
  return `<table class="tbl">
  <thead><tr><th>公式が勧める準備（7つ）</th><th>中身</th><th>対応する項</th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>

<p class="point"><b>ポイント</b>読んで分かることと、作って分かることは別。<b>公式が挙げている7つは、どれもこの教材の節に対応している</b>ので、読んだあとに同じ順で手を動かせる。</p>

<div class="detail">
${ex}
</div>`;
};

/** §9 Sample Questions ─ 公式の例題12問。**設問文・選択肢・解説は載せない**（訳して再配布しない）。
 *  出すのは「36個の誤答をどう分類できるか」と「間違えたらどの節に戻るか」だけ。
 *  件数はすべて SAMPLES から数える ── 手で持つと、分類を直したときに古い数が残る（§7 #66）。 */
const sampleFig = () => {
  const sec = (ids) => ids.map(id => {
    const p = pages.find(x => x.id === id);
    return p ? `<a href="../${p.rel}">${esc(p.num)}</a>` : null;
  }).filter(Boolean).join(' ');
  const cnt = {};
  for (const s of SAMPLES) for (const t of s.traps) cnt[t] = (cnt[t] || 0) + 1;
  const total = Object.values(cnt).reduce((a, b) => a + b, 0);
  const keys = Object.keys(TRAPS);
  const mark = Object.fromEntries(keys.map((k, i) => [k, '①②③④⑤⑥⑦⑧'[i]]));
  const trapRows = keys.map(k => {
    const t = TRAPS[k];
    return `    <tr><td data-l="誤答の型"><b>${mark[k]} ${esc(t.ja)}</b><br><span class="n">${total}個中 ${cnt[k]}個</span></td>
        <td data-l="こう見える">${t.sign}</td>
        <td data-l="なぜ誤りか">${t.why}<br><span class="n">公式の解説より ─ &ldquo;${esc(t.en)}&rdquo;</span></td></tr>`;
  }).join('\n');
  const qRows = SAMPLES.map(s => {
    const scn = SCENARIOS.find(x => x.n === s.sc);
    const c = {};
    for (const t of s.traps) c[t] = (c[t] || 0) + 1;
    // 同じ型が重なったらまとめる（「頼んで守らせる ×2」）。3つ揃うと「3つとも」
    const traps = Object.entries(c).map(([k, v]) =>
      `${mark[k]} ${esc(TRAPS[k].ja)}${v > 1 ? `<b> ×${v}</b>` : ''}`).join('<br>');
    // シナリオ名は広い列へ ── 狭い「問」列に入れると 1440px で3行に割れる（実測）
    return `    <tr><td data-l="問"><b>Q${s.n}</b></td>
        <td data-l="問われていること">${esc(s.ja)}<br><span class="n">${esc(scn.ja)}</span></td>
        <td data-l="誤答3つの型">${traps}</td>
        <td data-l="間違えたら戻る先"><span class="n">${sec(s.sections)}</span></td></tr>`;
  }).join('\n');
  const used = [...new Set(SAMPLES.map(s => s.sc))].length;
  const top = keys.slice().sort((a, b) => cnt[b] - cnt[a])[0];
  return `<table class="tbl">
  <thead><tr><th>誤答の型（${total}個ぶんを分類）</th><th>こう見える</th><th>なぜ誤りか</th></tr></thead>
  <tbody>
${trapRows}
  </tbody>
</table>

<p class="point"><b>ポイント</b>${SAMPLES.length}問の誤答${total}個は、この<b>${keys.length}つで全部説明がつく</b>。最も多いのは<b>${mark[top]} ${esc(TRAPS[top].ja)}（${cnt[top]}個）</b>で、<b>知識だけで消える</b>。残りは「対処の大きさ」と「原因の位置」を見れば絞れる。</p>

<h3 class="sub">間違えたら、どこへ戻るか</h3>
<p>公式の${SAMPLES.length}問は、この教材が扱っている範囲に全部収まっている。答えが食い違ったら<b>原文が正</b>で、戻る先はここ。</p>

<table class="tbl">
  <thead><tr><th>問</th><th>問われていること</th><th>誤答3つの型</th><th>間違えたら戻る先</th></tr></thead>
  <tbody>
${qRows}
  </tbody>
</table>
<p class="note">※ 「問われていること」は要旨です。<b>設問文・選択肢・解説は載せていません</b> ── 公式の練習問題そのもので、訳すと限定語（<i>first step</i> / <i>most maintainable</i> / <i>root cause</i>）が落ちて正解が変わるためです。原文を英語のまま解いてください。<br>
※ ${SAMPLES.length}問が扱うのは本番${EXAM.scenariosTotal}シナリオのうち<b>${used}本</b>で、残り${EXAM.scenariosTotal - used}本（${SCENARIOS.filter(s => ![...new Set(SAMPLES.map(x => x.sc))].includes(s.n)).map(s => esc(s.ja)).join('・')}）には例題がありません。そちらはこの教材の模擬で補ってください。</p>`;
};

const BLOCKS = { weightfig: weightFig, examfmt: examFmt, scenariofig: scenarioFig,
  examadmin: examAdmin, preparefig: prepareFig, samplefig: sampleFig, nsec: () => String(pages.length) };

/** `<p class="task" data-t="1.1"></p>` に、公式の原文を差し込む。
 *  中身は毎回まるごと作り直すので、何度実行しても同じ結果になる。 */
const fillTasks = (html) => html.replace(
  /<p class="task" data-t="([^"]+)">[\s\S]*?<\/p>/g,
  (_, ids) => {
    const label = ids.trim().split(/\s+/).map(id => {
      if (!TASKS[id]) throw new Error('未知のタスク番号: ' + id + '（blueprint.mjs の TASKS にない）');
      return `<span class="tn">BLUEPRINT ${id}</span><b>${esc(TASKS[id].name)}</b>`;
    }).join('　／　');
    return `<p class="task" data-t="${ids}">${label}</p>`;
  });

/* 共通の塊と出題タスクを本文へ差し込む（部品の定義がそろったここで1回まとめて） */
pages.forEach(p => { p.body = fillTasks(fillBlocks(p.body)); });

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
    let s = itemLink(p, { href: `../${p.rel}`, cls: 'toc-link', on });
    if (on && p.subs.length) {
      s += '\n' + p.subs.map(x => `<a class="toc-link toc-sub" href="#${x.id}">${esc(x.t)}</a>`).join('\n');
    }
    return s;
  });
  // 目次はいま居るドメインの中だけを並べる。
  // 全項目一覧への導線はここに置かない ── ブランド（左上）がすでに index.html を指しており、
  // 同じページへのリンクが1ページに2本並んでいた（§7 #32）。
  return `<aside class="toc">
  <div class="toc-head">${esc(cur.dom.num)}</div>
  <nav class="toc-list">${items.join('\n')}</nav>
</aside>`;
};

/** パンくず（ドメインの見出しを1行に畳んだもの） */
/* 出題比率は節ページには出さない。読む順番を決めるときに1回使う数字で、
   節を読んでいる最中には要らない ── 66ページに同じ数字が出ていた（§7 #30）。
   配点はトップページと 6-2 の図（<!--#weightfig-->）が唯一の出所。 */
const crumb = (cur) => `<p class="crumb" data-domain="${cur.dom.key}"><b>${esc(cur.dom.num)}</b><span>${esc(cur.dom.h1)}</span></p>`;

/** 前後の送り。ドメインの境目も越えて、本全体で1本につながる */
/** 前後の送り。本文の上と下、2か所に同じものを出す。
 *  節名と「4 / 18」の位置表示は出さない ── どちらも左の目次が同じことを
 *  （しかも現在地を太字で）示していて、1ページに同じ情報が3つあった（§7 #33）。 */
const pager = (i, where) => {
  const prev = pages[i - 1], next = pages[i + 1];
  // 見えるのは矢印だけ。文字は clip-path で視覚的に隠すが、読み上げには残す
  const pv = prev
    ? `<a class="pgv prev" href="../${prev.rel}"><span class="vh">前へ</span></a>`
    : `<a class="pgv prev" href="../index.html"><span class="vh">トップへ</span></a>`;
  const nx = next
    ? `<a class="pgv next" href="../${next.rel}"><span class="vh">次へ</span></a>`
    : `<span class="pgv next end"><span class="vh">ここで終わり</span></span>`;
  return `<nav class="secpager ${where}">${pv}${nx}</nav>`;
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
${pager(i, 'top')}
${OPEN}
${p.body}
${CLOSE}
${pager(i, 'btm')}
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

  // 全項目一覧 ─ 88項をひとつに並べる。
  // カードは各ドメインの入口（5項＋「ほか N 項」）なので、全体を見渡せる場所がここにしかない。
  const allList = DOMAINS.map(d => {
    const list = pages.filter(p => p.dom.dir === d.dir);
    const items = list.map(p =>
      `<li>${itemLink(p, { href: p.rel, cls: 'al-link' })}</li>`).join('');
    return `<section class="al-dom" data-domain="${d.key}">
  <!-- 項数は出さない。すぐ下に項目が並んでいて数えられるし、同じページの
       配点の図が「Domain 1 … 16問」と出しているので、「18項」と並ぶと
       2つの数字を混同する（§7 #39）。 -->
  <h3><span class="al-num">${esc(d.num)}</span><a href="${entry[d.dir]}">${esc(d.h1)}</a></h3>
  <ul class="al-list">${items}</ul>
</section>`;
  }).join('\n');
  idx = idx.replace(/<!--#alllist-->[\s\S]*?<!--\/#alllist-->/,
                    `<!--#alllist--><div class="alllist">${allList}</div><!--/#alllist-->`);

  idx = fillBlocks(idx);        // 節ファイルと共通の塊（配点の図など）

  fs.writeFileSync(idxPath, idx);
  console.log('index.html の上部ナビ・全項目一覧・共通の図を書き出し');
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
