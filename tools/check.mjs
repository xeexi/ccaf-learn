/* =========================================================
   静的チェック — 過去に実際に起きた不具合の再発を検出する
     node tools/check.mjs
   依存パッケージなし（Node 18+）。ブラウザは使わない。
   ========================================================= */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const FILES = fs.readdirSync(ROOT).filter(f => /^\d\d-.*\.html$/.test(f)).sort();
let ng = 0;
const bad = (msg) => { console.log('  ✗ ' + msg); ng++; };

/* --- 1. 図の色が固定値のまま残っていないか -----------------------
   SVG の fill/stroke は必ず var(--fig-*) を使うこと。
   16進を直接書くとテーマ切替で色が変わらない。 */
console.log('\n■ 図の色（CSS変数になっているか）');
FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const svgs = h.match(/<svg[\s\S]*?<\/svg>/g) || [];
  const hex = svgs.join('').match(/(fill|stroke)(=|:)"?#[0-9A-Fa-f]{3,8}/g) || [];
  if (hex.length) bad(`${f}: 固定色が ${hex.length} 箇所（${[...new Set(hex)].slice(0, 3).join(', ')}…）`);
});
if (!ng) console.log('  ✓ すべて var() 参照');

/* --- 2. 図のテキストが枠からはみ出していないか（座標の静的判定） ---
   厳密な判定にはブラウザが要るが、text の x 座標が
   viewBox の右端を超えているものだけは静的に拾える。 */
console.log('\n■ 図のテキスト位置');
let posNg = 0;
FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  (h.match(/<svg[\s\S]*?<\/svg>/g) || []).forEach(svg => {
    const vb = (svg.match(/viewBox="0 0 (\d+) (\d+)"/) || []);
    if (!vb[1]) return;
    const W = +vb[1], H = +vb[2];
    [...svg.matchAll(/<text[^>]*\sx="(-?\d+(?:\.\d+)?)"[^>]*\sy="(-?\d+(?:\.\d+)?)"[^>]*>([\s\S]*?)<\/text>/g)]
      .forEach(m => {
        const x = +m[1], y = +m[2];
        if (x > W || y > H || x < 0 || y < 0) {
          bad(`${f}: 「${m[3].replace(/<[^>]*>/g, '').slice(0, 20)}」が枠外 (x=${x}, y=${y} / ${W}x${H})`);
          posNg++;
        }
      });
  });
});
if (!posNg) console.log('  ✓ アンカー座標はすべて枠内（実際の描画幅はブラウザで要確認）');

/* --- 3. 統合で意味を失った位置参照が残っていないか ----------------
   「前ページ」「次ページ」はページ送り時代の遺物。 */
console.log('\n■ 消えた概念への参照');
let refNg = 0;
[...FILES, 'index.html'].forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  (h.match(/前ページ|次ページ|前の章|次の章/g) || []).forEach(w => {
    bad(`${f}: 「${w}」が残っている`); refNg++;
  });
});
if (!refNg) console.log('  ✓ なし');

/* --- 4. 番号説明が、図の文言をそのまま繰り返していないか ----------
   用語（input_schema 等）の重複は正常。日本語の文まるごとが問題。 */
console.log('\n■ 番号説明と図の重複');
const strip = s => s.replace(/<[^>]*>/g, '').replace(/[\s　]+/g, '');
const lcs = (a, b) => {
  let best = '';
  for (let i = 0; i < a.length; i++) {
    for (let j = i + 14; j <= a.length; j++) {
      const s = a.slice(i, j);
      if (b.includes(s)) { if (s.length > best.length) best = s; } else break;
    }
  }
  return best;
};
// 18字以上の一致＝丸写し（失格）／14〜17字＝引用で指しているだけの可能性（要確認）
let dupNg = 0; const gray = [];
FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  h.split(/(?=<div class="figbox")/).forEach(block => {
    const svg = (block.match(/<svg[\s\S]*?<\/svg>/) || [''])[0];
    if (!svg) return;
    const svgTxt = [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map(m => strip(m[1])).join('｜');
    [...block.matchAll(/<li><span class="n">(\d+)<\/span><span>([\s\S]*?)<\/span><\/li>/g)].forEach(m => {
      const s = lcs(strip(m[2]), svgTxt);
      if (!/[ぁ-んァ-ヶ一-龠]{6,}/.test(s)) return;
      if (s.length >= 18) { bad(`${f}: 番号${m[1]}「${s}」が図と丸かぶり`); dupNg++; }
      else if (s.length >= 14) gray.push(`${f}: 番号${m[1]}「${s}」`);
    });
  });
});
if (!dupNg) console.log('  ✓ 丸写しなし');
if (gray.length) {
  console.log(`  △ 要確認 ${gray.length} 件（図の語句を引用して指しているだけなら問題なし）`);
  gray.forEach(g => console.log('     ' + g));
}

/* --- 5. 設問が、そのセクションより後の内容を問うていないか ---------
   出題範囲の先取りは学習の妨げになる。 */
console.log('\n■ 設問の出題範囲');
const quizJs = fs.readFileSync(path.join(ROOT, 'assets/quiz-data.js'), 'utf8');
const QUIZ = new Function(quizJs.replace(/^window\.QUIZ\s*=\s*/, 'return ') + ';')();
const TERMS = ['tool_use', 'tool_result', 'stop_reason', 'input_schema', 'tool_choice',
  'cache_control', 'is_error', '.mcp.json', 'permissions', 'CLAUDE.md', 'thinking',
  'custom_id', 'context: fork', '@import', 'settings.json'];
// 用語の初出位置（ファイル順 × セクション順）
const order = [];
FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  h.split(/(?=<section class="sec)/).filter(s => /^<section class="sec/.test(s))
    .forEach(sec => order.push({ f, quiz: (sec.match(/data-quiz="([^"]*)"/) || [])[1], body: sec }));
});
const firstAt = {};
TERMS.forEach(t => {
  const i = order.findIndex(s => !s.quiz && s.body.includes(t));
  if (i >= 0) firstAt[t] = i;
});
let scopeNg = 0;
order.forEach((s, i) => {
  if (!s.quiz || !QUIZ[s.quiz]) return;
  QUIZ[s.quiz].forEach((item, qi) => {
    const core = item.q + ' ||| ' + item.o[item.a] + ' ||| ' + item.e;   // 誤答の選択肢は対象外
    TERMS.forEach(t => {
      if (!core.includes(t)) return;
      if (firstAt[t] === undefined || firstAt[t] > i) {
        bad(`${s.f} ${s.quiz} Q${qi + 1}: 「${t}」の説明はこの設問より後（または本文になし）`);
        scopeNg++;
      }
    });
  });
});
if (!scopeNg) console.log('  ✓ すべて既習範囲内');

/* --- 6. 検索インデックスが本文と同期しているか -------------------- */
console.log('\n■ 検索インデックスの同期');
const idxJs = fs.readFileSync(path.join(ROOT, 'assets/search-index.js'), 'utf8');
const IDX = JSON.parse(idxJs.replace(/^window\.SEARCH_INDEX\s*=\s*/, '').replace(/;\s*$/, ''));
const secCount = order.length;
if (IDX.length !== secCount) bad(`セクション ${secCount} 件に対しインデックス ${IDX.length} 件 → node tools/reindex.mjs を実行`);
else console.log(`  ✓ ${IDX.length} セクションぶん同期`);

console.log('\n' + (ng ? `要修正 ${ng} 件` : 'すべて問題なし'));
process.exit(ng ? 1 : 0);
