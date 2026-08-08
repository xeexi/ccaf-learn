/* =========================================================
   静的チェック — 過去に実際に起きた不具合の再発を検出する
     node tools/check.mjs
   依存パッケージなし（Node 18+）。ブラウザは使わない。
   ========================================================= */
import fs from 'fs';
import path from 'path';

/* 成果物（HTML と assets）は docs/ の下 ─ GitHub Pages がそのまま公開できる名前。tools/ と CLAUDE.md はリポジトリ直下 */
const ROOT = path.join(path.resolve(new URL('..', import.meta.url).pathname), 'docs');
/* 節ファイルの一覧。ドメインごとのディレクトリの下に 1節1ファイルで入っている */
const FILES = fs.readdirSync(ROOT)
  .filter(d => /^\d\d-/.test(d) && fs.statSync(path.join(ROOT, d)).isDirectory())
  .sort()
  .flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.html')).sort()
    .map(f => d + '/' + f));
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
   本文が位置（前ページ・次ページ）に依存すると、節を並べ替えたときに壊れる。
   ページ送り UI そのものは1項ずつ表示として復活したので、"ページ送り" 等は検出対象から外した。 */
console.log('\n■ 消えた概念への参照');
let refNg = 0;
[...FILES, 'index.html'].forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  (h.match(/前ページ|次ページ|前の章|次の章|1ページ＝|☰/g) || []).forEach(w => {
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

/* --- 5b. HTML から参照されていない設問キーが残っていないか ---------
   セクションを作り直したときに、古い設問データが浮くことがある。
   死んだデータは気づかないまま腐るので、ここで落とす。 */
console.log('\n■ 設問データの参照');
const usedKeys = new Set(order.map(s => s.quiz).filter(Boolean));
const orphan = Object.keys(QUIZ).filter(k => !usedKeys.has(k));
const missing = [...usedKeys].filter(k => !QUIZ[k]);
orphan.forEach(k => bad(`設問キー ${k}（${QUIZ[k].length}問）が、どの HTML からも参照されていない`));
missing.forEach(k => bad(`data-quiz="${k}" に対応する設問データがない`));
if (!orphan.length && !missing.length) console.log(`  ✓ ${usedKeys.size} キーすべて対応（設問 ${Object.values(QUIZ).reduce((a, b) => a + b.length, 0)} 問）`);

/* --- 5c. 本文セクションにゴール（.goal）があるか ---------------------
   「この節を終えたら何が言えるか」がないと、読み手は止めどころが分からない。 */
console.log('\n■ ゴール');
let goalNg = 0;
order.forEach(s => {
  if (s.quiz) return;
  if (/class="goal"/.test(s.body)) return;
  bad(`${s.f} #${(s.body.match(/id="([^"]+)"/) || [])[1]}: ゴール（.goal）がない`);
  goalNg++;
});
if (!goalNg) console.log(`  ✓ 本文 ${order.filter(s => !s.quiz).length} 節すべてにあり`);

/* --- 5e. 本文セクションに出題タスクの表示（.task）があるか ------------
   どの節がブループリントのどこに対応するかを、節ごとに明示しておく。 */
console.log('\n■ 出題タスクの表示');
let tlNg = 0;
order.forEach(s => {
  if (s.quiz || /class="task"/.test(s.body)) return;
  bad(`${s.f} #${(s.body.match(/id="([^"]+)"/) || [])[1]}: 出題タスクの表示（.task）がない`);
  tlNg++;
});
if (!tlNg) console.log('  ✓ 本文すべてに対応タスク（または土台・導入の明示）あり');

/* --- 5d. 出題ブループリントのタスクに、対応する節があるか -------------
   「網羅しているか」を主観で答えないための機械判定（§7 #9）。
   タスク名は公式 Exam Guide（60問 / 合格 720 / 120分）の 5ドメイン30タスクに対応。
   節が1つも無いタスクは、教材の穴として落とす。 */
console.log(String.fromCharCode(10) + "■ 出題タスクの網羅（公式ブループリント 30タスク）");
const TASKS = {
  // Domain 1 — Agentic Architecture & Orchestration (27%)
  "1.1 エージェントループの実装":            ["loop", "stop", "seq", "real", "broken"],
  "1.2 コーディネータ／サブエージェント構成": ["split", "parent"],
  "1.3 子の起動・文脈の受け渡し":            ["spawn"],
  "1.4 多段の強制とハンドオフ":              ["gate"],
  "1.5 hooks によるツール呼び出しの介入":     ["intercept", "hooks"],
  "1.6 タスク分解の設計":                    ["chain"],
  "1.7 セッションの状態・再開・分岐":         ["session"],
  // Domain 2 — Tool Design & MCP Integration (18%)
  "2.1 ツール定義と境界の設計":              ["anatomy", "grain"],
  "2.2 構造化されたエラー応答":              ["error"],
  "2.3 ツールの配り方と tool_choice":        ["distribute"],
  "2.4 MCP サーバの統合":                    ["mcp"],
  "2.5 組み込みツールの使い分け":            ["builtin"],
  // Domain 3 — Claude Code Configuration & Workflows (20%)
  "3.1 CLAUDE.md の階層・スコープ・分割":     ["claudemd", "import"],
  "3.2 スラッシュコマンドとスキル":          ["cmdskill"],
  "3.3 パス固有ルール":                      ["rules"],
  "3.4 plan mode と直接実行":                ["plan"],
  "3.5 反復的な改善":                        ["iterate"],
  "3.6 CI/CD への組み込み":                  ["ci", "settings"],
  // Domain 4 — Prompt Engineering & Structured Output (20%)
  "4.1 明示的な基準による精度向上":          ["criteria"],
  "4.2 few-shot":                            ["fewshot"],
  "4.3 構造化出力の強制":                    ["struct"],
  "4.4 検証・再試行・フィードバック":         ["verify"],
  "4.5 バッチ処理":                          ["batch"],
  "4.6 多重・多段レビュー構成":              ["multi"],
  // Domain 5 — Context Management & Reliability (15%)
  "5.1 長い対話での文脈の維持":              ["compact"],
  "5.2 エスカレーションと曖昧さの解消":       ["confidence"],
  "5.3 複数エージェント間のエラー伝播":       ["propagate"],
  "5.4 大規模コードベース探索での文脈管理":   ["sub", "shape"],
  "5.5 人のレビュー導線と確信度の校正":       ["confidence"],
  "5.6 出典の保持と不確実性の扱い":          ["observe"],
};
const allIds = new Set(order.filter(s => !s.quiz).map(s => (s.body.match(/id="([^"]+)"/) || [])[1]));
let covNg = 0;
Object.entries(TASKS).forEach(([t, ids]) => {
  if (!ids.some(i => allIds.has(i))) { bad(`タスク「${t}」に対応する節がない（想定 id: ${ids.join(" / ")}）`); covNg++; }
});
if (!covNg) console.log(`  ✓ ${Object.keys(TASKS).length} タスクすべてに対応する節あり`);

/* --- 5f. 文字サイズが段階（--fs-*）で書かれているか -------------------
   px を直接書くと段階が増えていき、「ばらつきが大きい」状態に戻る。
   SVG の中だけは別系統（図の座標に合わせてあるため）。 */
console.log('\n■ 文字サイズの段階');
const cssTxt = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8');
let fsNg = 0;
cssTxt.split('\n').forEach((l, i) => {
  if (!/font-size:\s*[\d.]+px/.test(l)) return;
  if (/\bsvg\b/.test(l) || /--fs-/.test(l)) return;   // SVG 用と、段階そのものの定義は対象外
  bad(`style.css:${i + 1} 段階を使わず px 直書き → ${l.trim().slice(0, 60)}`);
  fsNg++;
});
if (!fsNg) console.log('  ✓ SVG 以外はすべて --fs-* の7段階');

/* --- 6. 検索インデックスが本文と同期しているか -------------------- */
console.log('\n■ 検索インデックスの同期');
const idxJs = fs.readFileSync(path.join(ROOT, 'assets/search-index.js'), 'utf8');
const IDX = JSON.parse(idxJs.replace(/^window\.SEARCH_INDEX\s*=\s*/, '').replace(/;\s*$/, ''));
const secCount = order.length;
if (IDX.length !== secCount) bad(`セクション ${secCount} 件に対しインデックス ${IDX.length} 件 → node tools/reindex.mjs を実行`);
else console.log(`  ✓ ${IDX.length} セクションぶん同期`);

console.log('\n' + (ng ? `要修正 ${ng} 件` : 'すべて問題なし'));
process.exit(ng ? 1 : 0);
