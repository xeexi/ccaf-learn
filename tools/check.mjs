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
   色は必ず var(--fig-*) で書く。直接書くとテーマ切替で色が変わらない。

   以前は走査が `<svg>` の中だけだった。図を HTML で組み直して
   本文から SVG が全廃されたので、**その形では何も見ていない**状態に
   なっていた（§7 #37）。いまは本文の inline style と SVG 属性の
   両方から色リテラルを探す。`var(--…)` と `color-mix(…)` は先に伏せる。 */
console.log('\n■ 図の色（CSS変数になっているか）');
const COLOR_LIT = /#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(|\b(?:red|blue|green|orange|yellow|purple|pink|gray|grey|black|white|cyan|magenta|brown|navy|teal|olive|lime|maroon|silver|gold)\b/i;
const hideVars = v => v.replace(/var\(\s*--[\w-]+\s*(?:,[^()]*)?\)/g, 'VAR');
let colNg = 0, colN = 0;
FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const body = (h.match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1];
  if (!body) return;
  // inline style の値と、SVG の fill / stroke 属性の値
  const vals = [
    ...[...body.matchAll(/\sstyle="([^"]*)"/g)].map(m => ['style', m[1]]),
    ...[...body.matchAll(/\s(fill|stroke)="([^"]*)"/g)].map(m => [m[1], m[2]]),
  ];
  vals.forEach(([where, v]) => {
    colN++;
    const stripped = hideVars(v);
    const m = stripped.match(COLOR_LIT);
    if (m) { bad(`${f}: ${where} に固定色「${m[0]}」（var(--fig-*) を使う） → ${v.slice(0, 60)}`); colNg++; }
  });
});
if (!colNg) console.log(`  ✓ 本文の inline style / SVG 属性 ${colN} 箇所すべて、色は var() 参照`);

/* --- 3. 統合で意味を失った位置参照が残っていないか ----------------
   本文が位置（前ページ・次ページ）に依存すると、節を並べ替えたときに壊れる。
   ページ送り UI そのものは1項ずつ表示として復活したので、"ページ送り" 等は検出対象から外した。 */
console.log('\n■ 消えた概念への参照');
let refNg = 0;
const REF_FILES = [...FILES, 'index.html'];
REF_FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  (h.match(/前ページ|次ページ|前の章|次の章|1ページ＝|☰/g) || []).forEach(w => {
    bad(`${f}: 「${w}」が残っている`); refNg++;
  });
});
if (!refNg) console.log(`  ✓ ${REF_FILES.length} ファイルに残っていない`);

/* --- 4. 注記が、図やコードの文言をそのまま繰り返していないか --------
   同じことを2度読ませるだけになる（§7 #3）。
   用語（`input_schema` 等）の重複は正常で、日本語の文まるごとが問題。

   以前は SVG の `<text>` と突き合わせていた。図を HTML で組み直して
   本文から SVG が消えたので**対象が0件になり、何も見ていなかった**（§7 #37）。
   いまは同じ `.figbox` の中の**注記以外の文**（ラベル・注記・タイトル・結び）と
   突き合わせる。コードそのものは除く ── 注記がコードの識別子を引くのは正常。 */
console.log('\n■ 注記と図の重複');
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
let dupNg = 0, dupN = 0; const gray = [];
FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const body = (h.match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1];
  if (!body) return;
  body.split(/(?=<div class="figbox")/).forEach(box => {
    const notes = [...box.matchAll(/<li><span class="n">(\d+)<\/span><span>([\s\S]*?)<\/span><\/li>/g)];
    if (!notes.length) return;
    // 突き合わせる相手＝箱の中の「注記以外の文」。
    // コードの識別子は除くが、**コード内のコメント（.c）は日本語の文なので含める**
    // ── ここを除いていたせいで、コメントの丸写しを見逃していた。
    const code = box.match(/<pre class="code">[\s\S]*?<\/pre>/g) || [];
    const comments = code.flatMap(c => [...c.matchAll(/<span class="c">([\s\S]*?)<\/span>/g)].map(m => strip(m[1])));
    const others = box
      .replace(/<ol class="ann">[\s\S]*?<\/ol>/g, '')
      .replace(/<pre class="code">[\s\S]*?<\/pre>/g, '');
    const otherTxt = [
      ...[...others.matchAll(/<(?:b|span|p)\s+class="(?:fig-h|fig-note|fig-t|fig-f|fig-lbl|codelabel|sq-lbl|sq-note|fig-do)"[^>]*>([\s\S]*?)<\/(?:b|span|p)>/g)].map(m => strip(m[1])),
      ...comments,
    ].join('｜');
    if (!otherTxt) return;
    notes.forEach(m => {
      dupN++;
      const s2 = lcs(strip(m[2]), otherTxt);
      if (!/[ぁ-んァ-ヶ一-龠]{6,}/.test(s2)) return;
      if (s2.length >= 18) { bad(`${f}: 番号${m[1]}「${s2}」が図と丸かぶり`); dupNg++; }
      else if (s2.length >= 14) gray.push(`${f}: 番号${m[1]}「${s2}」`);
    });
  });
});
if (!dupNg) console.log(`  ✓ 注記 ${dupN} 件に丸写しなし`);
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
    .forEach(sec => order.push({ f, quiz: (sec.match(/data-quiz="([^"]*)"/) || [])[1],
      quizOnly: /^<section class="sec sec-quiz/.test(sec), body: sec }));
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

/* --- 5a2. 設問の見出しの規約 --------------------------------------
   同じ ◇ に「理解度チェック」「総合チェック」「解いてみる」の3通りの名前が
   混在し、一覧で区別できなくなったことがある。名前は1つに固定する。
   同じドメインに2つ以上あるときは、副題で中身を書き分ける。 */
console.log('\n■ 設問の見出し');
let qhNg = 0;
const qHeads = order.filter(s => s.quizOnly).map(s => ({
  f: s.f,
  dom: s.f.slice(0, 2),
  h2: ((s.body.match(/<h2>([\s\S]*?)<\/h2>/) || ['', ''])[1]).replace(/<[^>]*>/g, '').trim(),
}));
qHeads.forEach(q => {
  if (!/^\S+\s*理解度チェック/.test(q.h2)) {
    bad(`${q.f}: 設問の見出しが「理解度チェック」で始まっていない → ${q.h2}`); qhNg++;
  } else if (!q.h2.includes('─')) {
    // 以前は「その区分に1つだけなら副題は不要」としていたが、25件中2件だけが
    // 副題なしになり、一覧で文が途切れて見えた（§7 #36）。数に関係なく必ず付ける。
    bad(`${q.f}: 副題がない → ${q.h2}`); qhNg++;
  }
});
if (!qhNg) console.log(`  ✓ ${qHeads.length} 件すべて規約どおり`);

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
  if (s.quizOnly) return;
  if (/class="goal"/.test(s.body)) return;
  bad(`${s.f} #${(s.body.match(/id="([^"]+)"/) || [])[1]}: ゴール（.goal）がない`);
  goalNg++;
});
if (!goalNg) console.log(`  ✓ 本文 ${order.filter(s => !s.quiz).length} 節すべてにあり`);

/* --- 5e. 出題タスクの表示（.task）が正しく出ているか ------------------
   対応するタスクがある節には BLUEPRINT ラベルを出す。
   対応がない節（土台・導入・まとめ・模擬）には**何も出さない** ──
   「ブループリント対応なし」と書くのは、読み手にとって情報がないため。
   ここでは「ラベルがあるなら BLUEPRINT を名乗っていること」だけを見る。
   対応があるのに表示が抜けている件は、下の 5f（網羅）が id 単位で拾う。 */
console.log('\n■ 出題タスクの表示');
let tlNg = 0;
order.forEach(s => {
  const m = s.body.match(/<p class="task">([\s\S]*?)<\/p>/);
  if (!m) return;
  if (!/<span class="tn">BLUEPRINT \d\.\d<\/span>/.test(m[1])) {
    bad(`${s.f} #${(s.body.match(/id="([^"]+)"/) || [])[1]}: .task が BLUEPRINT ラベルの形になっていない`);
    tlNg++;
  }
});
[...FILES, 'index.html'].forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (h.includes('ブループリント対応なし')) { bad(`${f}: 「ブループリント対応なし」が残っている`); tlNg++; }
});
if (!tlNg) console.log(`  ✓ ラベルのある ${order.filter(s => /class="task"/.test(s.body)).length} 節はすべて BLUEPRINT 表記`);

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
// 対応タスクのある節から BLUEPRINT ラベルが落ちていないか（5e の裏返し）
const taskIds = new Set(Object.values(TASKS).flat());
order.forEach(s => {
  const id = (s.body.match(/id="([^"]+)"/) || [])[1];
  if (s.quiz || !taskIds.has(id)) return;
  if (!/class="task"/.test(s.body)) { bad(`${s.f} #${id}: 対応タスクがあるのに BLUEPRINT ラベルがない`); covNg++; }
});
if (!covNg) console.log(`  ✓ ${Object.keys(TASKS).length} タスクすべてに対応する節あり（ラベルも欠落なし）`);

/* --- 5k. 図の中に、文が入り込んでいないか ----------------------------
   ラベルであるべき場所に文章が入ると、図の速さ（一目で分かる）が失われる
   （§7 #11）。ただし §5 の目安（箱ラベル10字・注記16字）を
   そのまま閾値にすると落ちすぎる ── 実測は `.fig-h` 中央7字・`.fig-note`
   中央17字で、注記のほうは目安が現実と合っていなかった（§7 #38）。
   ここで見るのは「明確に文が入った」ものだけ。閾値は実測の分布から決めた
   （`.fig-h` は90%が16字以内、`.fig-note` は90%が37字以内）。

   API の値のように短くできない識別子は除く ── ラベルが `<code>` だけで
   できている場合は対象外（`model_context_window_exceeded` など）。 */
console.log('\n■ 図の中の文の長さ');
const LEN_MAX = { 'fig-h': 24, 'fig-note': 48, 'fig-do': 48, 'sq-note': 60 };
let lenNg = 0, lenN = 0;
FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const body = (h.match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1];
  if (!body) return;
  Object.entries(LEN_MAX).forEach(([cls, max]) => {
    const re = new RegExp('<(?:b|span)\\s+class="' + cls + '"[^>]*>([\\s\\S]*?)</(?:b|span)>', 'g');
    [...body.matchAll(re)].forEach(m => {
      lenN++;
      // <code> だけでできているなら、短くできない識別子なので対象外
      const outsideCode = m[1].replace(/<code>[\s\S]*?<\/code>/g, '').replace(/<[^>]*>/g, '').replace(/[\s　]+/g, '');
      if (!outsideCode) return;
      const n = [...m[1].replace(/<[^>]*>/g, '').replace(/[\s　]+/g, '')].length;
      if (n > max) {
        bad(`${f}: .${cls} が ${n}字（上限 ${max}字）── 文になっている → 「${m[1].replace(/<[^>]*>/g, '').slice(0, 30)}…」`);
        lenNg++;
      }
    });
  });
});
if (!lenNg) console.log(`  ✓ 図の中の ${lenN} 箇所すべて上限内（.fig-h ${LEN_MAX['fig-h']}字 / .fig-note ${LEN_MAX['fig-note']}字 / .sq-note ${LEN_MAX['sq-note']}字）`);

/* --- 5j. 丸番号が、指す先を持っているか ------------------------------
   `pre.code` に打った <span class="n">N</span> は、直後の <ol class="ann"> の
   同じ番号と対応していなければ、読み手はどこを見ればよいか分からない。
   実際 3-3 で、図を比較表に差し替えたときに**番号だけが残った**（§7 #31）。
   逆に、印の無い番号を注記側に足すのも同じ事故（1-6 の ⑥、4-5 の ④）。

   .ann はコードの注記としてだけ残す方針（§4）なので、
   ここでは「コードの印」と「その注記」の集合が一致するかだけを見る。
   旧 SVG の図に付いた .ann は、印を持たないので対象外（Domain 4〜5 の変換で消える）。 */
console.log('\n■ 丸番号の対応（コードの印 ⇄ 注記）');
let numNg = 0, numOk = 0;
FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const body = (h.match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1];
  if (!body) return;
  // figbox 単位で見る ─ 1つの箱に複数の pre.code が入ることがある（1-6・4-5）
  (body.match(/<div class="figbox"[\s\S]*?<\/div>\s*(?=<|$)/g) || []).forEach(box => {
    if (!/<pre class="code"/.test(box)) return;
    const ol = (box.match(/<ol class="ann">[\s\S]*?<\/ol>/) || [''])[0];
    const marks = [...box.replace(ol, '').matchAll(/<span class="n">(\d+)<\/span>/g)].map(m => +m[1]).sort((a, b) => a - b);
    const notes = [...ol.matchAll(/<span class="n">(\d+)<\/span>/g)].map(m => +m[1]).sort((a, b) => a - b);
    if (marks.join() === notes.join()) { if (marks.length) numOk++; return; }
    const id = (box.match(/codelabel">([^<]*)/) || [, '?'])[1];
    bad(`${f}「${id}」: コードの印 [${marks.join(',') || 'なし'}] と注記 [${notes.join(',') || 'なし'}] が対応していない`);
    numNg++;
  });
});
if (!numNg) console.log(`  ✓ 印のある ${numOk} か所すべてで、コードの番号と注記が一致`);

/* --- 5i. 選択肢の順序に依存する文言がないか --------------------------
   選択肢は app.js が**描画のたびに混ぜる**（§7 #29）。
   だから「上記のすべて」「前者」「選択肢 B」のような順序に依存する書き方が
   1つでも混ざると、その設問は解けなくなる。
   以前ここは「正解の位置が偏っていないか」を数えていたが、
   混ぜるようになった時点で**データ側の並びは読み手に届かなくなった**ので、
   本当の前提条件であるこちらに置き換えた。 */
console.log('\n■ 選択肢の順序への依存');
const ORDER_WORDS = /(上記|下記|以上のすべて|すべて正しい|上の選択肢|[1-4]番目|前者|後者|選択肢\s*[ABCD]|[（(][ABCD][）)])/;
let ordNg = 0, ordN = 0;
Object.entries(QUIZ).forEach(([k, v]) => v.forEach((x, i) => {
  ordN++;
  const t = x.q + ' ' + x.o.join(' ') + ' ' + x.e;
  const m = t.match(ORDER_WORDS);
  if (m) { bad(`設問キー ${k} Q${i + 1}: 「${m[0]}」は選択肢の並びに依存する（混ぜると壊れる）`); ordNg++; }
  if (new Set(x.o).size !== x.o.length) { bad(`設問キー ${k} Q${i + 1}: 選択肢に重複がある`); ordNg++; }
  if (x.o.length !== 4) { bad(`設問キー ${k} Q${i + 1}: 選択肢が ${x.o.length} 個（4個にそろえる）`); ordNg++; }
  if (!(x.a >= 0 && x.a < x.o.length)) { bad(`設問キー ${k} Q${i + 1}: a=${x.a} が選択肢の範囲外`); ordNg++; }
}));
if (!ordNg) console.log(`  ✓ ${ordN}問すべて、並びに依存する文言なし（4択・重複なし・a も範囲内）`);

/* --- 5h. 本文のタグが釣り合っているか --------------------------------
   `</div>` が1つ多いと、ブラウザは**その節を早じまいして**
   後ろの内容を .shell の外に出す。見た目には「なんとなく余白が変」
   程度にしか出ないので目視では気づけない ── 実際 1-5 の後半が
   ずっと容器の外にあり、ブラウザで測って初めて分かった（§7 #28）。
   本文は生成物ではなく手書きなので、ここだけを見れば足りる。 */
console.log('\n■ 本文のタグの釣り合い');
let balNg = 0;
FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const body = (h.match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1];
  if (!body) return;
  // 入れ子になる要素だけを見る（<p> や <li> は終了タグの省略が許されている）
  ['div', 'section', 'figure', 'table', 'ul', 'ol'].forEach(t => {
    const open = (body.match(new RegExp(`<${t}[\\s>]`, 'g')) || []).length;
    const close = (body.match(new RegExp(`</${t}>`, 'g')) || []).length;
    if (open !== close) {
      bad(`${f}: <${t}> が ${open} 個に対し </${t}> が ${close} 個（${close > open ? '閉じ過ぎ ─ 節が早じまいする' : '閉じ忘れ'}）`);
      balNg++;
    }
  });
});
if (!balNg) console.log(`  ✓ 本文 ${FILES.length} ファイルで div / section / figure / table / ul / ol が釣り合い`);

/* --- 5g. 必須語彙の網羅 ---------------------------------------------
   5d は「タスクに対応する節があるか」しか見ない。節があっても、
   そのタスクの中心にある語が本文に1度も出ていないことがある ──
   実際 matcher は出現0回で、指摘されるまで気づけなかった（§7 #27）。
   ここは「節の有無」ではなく「語が本文に存在するか」を数える。

   入れてよいのは、公式ドキュメントで裏取りした語だけ。
   一般的な日本語（「要約」「検証」など）は偶然一致するので入れない。
   判定は本文（▼本文〜▲本文）のタグを外した文字列に対して行う ──
   <code>pause_turn</code> のようにタグで割れていても拾えるようにするため。

   **この一覧は公式 Exam Guide の「6. Detailed Objectives by Domain」の
   Knowledge of / Skills in から写す。** 以前ここは私の要約から作られていて、
   74件すべて通るのに穴が11件あった（§7 #47）── 原文に無いものを数えても、
   原文にあるものは見つからない。語を足すときも原文を開くこと。 */
console.log('\n■ 必須語彙の網羅（ブループリントが名指ししている語）');
const VOCAB = {
  // Domain 1 — stop_reason は7値すべて。pause_turn を落とすと
  // 「ループに戻るのは tool_use だけ」という誤った断言になる
  '1.1 ループと stop_reason': ['stop_reason', 'tool_use', 'end_turn', 'max_tokens',
    'pause_turn', 'stop_sequence', 'model_context_window_exceeded', 'tool_result'],
  '1.2 コーディネータ':      ['コーディネータ'],
  // 1.3 は「Task ツールで起こす」「allowedTools に Task が要る」「AgentDefinition で
  // 定義する」「fork_session で分岐する」まで原文が名指ししている
  '1.3 子の起動と並列':      ['disable_parallel_tool_use', '並列ツール使用',
    'allowedTools', 'AgentDefinition', 'fork_session'],
  '1.4 関門とハンドオフ':    ['PreToolUse', 'PostToolUse'],
  // 1.5 のタスク名は「tool call interception **and data normalization**」。
  // 後半を落とすと、タスクの半分が無い状態になる
  '1.5 hooks':               ['matcher', 'permissionDecision', 'updatedInput',
    'SessionStart', 'SubagentStop', 'PreCompact', 'exit 2', 'ISO 8601'],
  '1.6 タスク分解':          ['固定チェーン', '動的分解'],
  '1.7 セッション':          ['--resume', '--continue', '--fork-session'],
  // Domain 2 — 2.5 は「誰が実行するか」が骨格。client / server の別が要る
  '2.1 ツール定義':          ['input_schema', 'description'],
  // 2.2 は「読める文章で返す」だけでなく、**種別と再試行可否を構造で返す**まで
  '2.2 エラー応答':          ['is_error', 'errorCategory', 'isRetryable'],
  '2.3 配分と tool_choice':  ['tool_choice'],
  '2.4 MCP':                 ['.mcp.json', '~/.claude.json', 'stdio', 'resources', 'prompts'],
  // 公式のタスク文が道具を名指ししている ──
  // 「Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively」。
  // 以前ここに web_fetch / text_editor / memory を入れていたが、
  // それは**タスク 2.5 を API 側の話だと読み違えた**ときの名残（§7 #42）。
  '2.5 組み込みツール':      ['Grep', 'Glob', 'Read', 'Write', 'Edit', 'Bash',
    'クライアントツール', 'サーバツール', 'web_search', 'code_execution'],
  // Domain 3
  '3.1 CLAUDE.md':           ['CLAUDE.md', 'CLAUDE.local.md', '/memory'],
  '3.2 コマンドとスキル':    ['SKILL.md', 'allowed-tools', 'argument-hint', '$ARGUMENTS', 'context: fork',
    'YAML frontmatter'],   // ← JSON と見分けがつかないと「キーにハイフン？」になる（§7 #34）
  '3.3 パス固有ルール':      ['.claude/rules', 'paths'],
  // 3.4 は plan mode だけでなく **Explore** も原文が名指ししている
  '3.4 plan mode':           ['plan mode', '--permission-mode', 'Explore'],
  '3.6 CI/CD':               ['--print', '--output-format', '--json-schema', '--allowedTools',
    'bypassPermissions', 'settings.json', 'permissions', 'GitHub Actions'],
  // Domain 4
  '4.2 few-shot':            ['few-shot'],
  '4.3 構造化出力':          ['required', 'enum', 'strict'],
  '4.4 検証と再試行':        ['detected_pattern'],
  '4.5 バッチ':              ['custom_id', 'Message Batches'],
  '4.6 多重レビュー':        ['multi-instance', 'multi-pass'],
  // Domain 5 — 5.1 は「何を残すか」だけでなく「要約に通してはいけないもの」と
  // 「どこに置くか」まで。どちらもブループリントが名指ししている
  '5.1 文脈管理':            ['事実ブロック', 'lost in the middle'],
  '5.2 エスカレーション':    ['エスカレーション'],
  // 5.4 は「子に出す」だけではない。scratchpad・/compact・落ちたときの復帰まで
  '5.4 大規模探索':          ['サブエージェント', '/compact'],
  '5.5 確信度':              ['確信度'],
  '5.6 出典':                ['出典'],
};
// 本文だけを対象にする（設問の誤答の選択肢で埋め合わせられては意味がない）
const plain = order.filter(s => !s.quiz)
  .map(s => (s.body.match(/▼ 本文([\s\S]*)/) || [null, s.body])[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
  .join('\n');
let vocNg = 0, vocN = 0;
Object.entries(VOCAB).forEach(([task, words]) => {
  words.forEach(w => {
    vocN++;
    if (!plain.includes(w)) { bad(`${task}：「${w}」が本文に1度も出てこない`); vocNg++; }
  });
});
if (!vocNg) console.log(`  ✓ ${Object.keys(VOCAB).length} タスクの必須語 ${vocN} 件すべて本文にあり`);

/* --- 5l. 本文の中のリンクが、実在する先を指しているか ------------------
   本文にはふつうリンクを書かない（移動は目次と前後の送りが受け持つ）。
   例外として 6-4 が7つのシナリオへ直接リンクしている ── 「このあとの7項です」
   と言うなら、そこから飛べるほうがよい。ただし**ファイル名を変えると黙って
   切れる**（実際この回で 06-summary を7ファイルぶんリネームしている）。
   ページ内アンカー（#…）も、その id が本文にあるかを見る。 */
console.log('\n■ 本文のリンク');
let lnkNg = 0, lnkN = 0;
FILES.concat('index.html').forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const body = f === 'index.html' ? h
    : (h.match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1];
  if (!body) return;
  [...body.matchAll(/href="([^"]+)"/g)].map(m => m[1]).forEach(href => {
    if (/^(https?:|mailto:)/.test(href)) return;      // 外部は対象外
    lnkN++;
    if (href.startsWith('#')) {
      if (!body.includes(`id="${href.slice(1)}"`)) { bad(`${f}: リンク先 ${href} の id が本文にない`); lnkNg++; }
      return;
    }
    // ?v=… は reindex が打つキャッシュ対策。パスの一部ではないので落とす
    const target = path.resolve(path.dirname(path.join(ROOT, f)), href.split(/[?#]/)[0]);
    if (!fs.existsSync(target)) { bad(`${f}: リンク先 ${href} が存在しない`); lnkNg++; }
  });
});
if (!lnkNg) console.log(`  ✓ 本文のリンク ${lnkN} 本すべて実在する先を指している`);

/* --- 5g2. 必須概念の網羅 ---------------------------------------------
   5g は「語があるか」しか見ない。だが公式 Knowledge / Skills の多くは
   識別子ではなく**日本語で書く内容**で、語では捕まえられない ──
   実際「テスト駆動」「インタビュー方式」「作業メモ」「エラーの種別分け」は
   語彙検査を全部通ったまま、まるごと欠けていた（§7 #47）。

   ここは1項目＝1つの正規表現で、本文のどこかに1回でも出ていればよい。
   表現をひとつに縛らないため、言い換えを `|` で並べてある。
   **項目は公式 Exam Guide の Knowledge of / Skills in から起こす。** */
console.log('\n■ 必須概念の網羅（語では捕まえられないもの）');
const CONCEPT = {
  ["1.1 ループの一生（送る→stop_reason→実行→返す）"]: new RegExp("stop_reason[^。]{0,80}(分岐|見て|判断)|tool_use[^。]{0,60}返し"),
  ["1.1 結果を履歴に足すから次を考えられる"]: new RegExp("(履歴|会話)[^。]{0,40}(足し|追記|末尾)"),
  ["1.1 モデルが決める⇄あらかじめ決めた手順"]: new RegExp("(固定チェーン|決まった順|コードで並べ)[^。]{0,80}(モデル|その場)"),
  ["1.1 tool_use で続き end_turn で抜ける"]: new RegExp("end_turn[^。]{0,50}(抜け|終わ)"),
  ["1.1 誤り：文章で終わりを判定"]: new RegExp("文章(で|を)[^。]{0,24}判断しません|自然文[^。]{0,20}判定"),
  ["1.1 誤り：回数上限を主な停止手段にする"]: new RegExp("上限[^。]{0,60}(保険|停止条件ではな|主な止め方)"),
  ["1.2 ハブ＝親が全部の通信を握る"]: new RegExp("子(どうし|同士)[^。]{0,24}直接"),
  ["1.2 子は親の履歴を引き継がない"]: new RegExp("(子|サブエージェント)[^。]{0,50}(履歴|やり取り)[^。]{0,30}(引き継が|見て)"),
  ["1.2 親の役割＝分解・委任・集約・呼ぶ子の選択"]: new RegExp("(親|コーディネータ)[^。]{0,60}(まとめ|集約|割り振|選ぶ|決める)"),
  ["1.2 分け方が細かすぎると取りこぼす"]: new RegExp("(細かく|狭く)[^。]{0,60}(抜け|取りこぼ|漏れ)"),
  ["1.2 毎回全部通さず、必要な子だけ呼ぶ"]: new RegExp("(毎回|すべて)[^。]{0,60}(通す必要|通さ)"),
  ["1.2 重複しないように範囲を割る"]: new RegExp("(重複|かぶら)[^。]{0,60}(割り|分け)"),
  ["1.2 足りなければ親がやり直させる"]: new RegExp("(抜け|空欄)[^。]{0,80}(投げ直|もう一度)"),
  ["1.3 Task ツールと allowedTools"]: new RegExp("allowedTools"),
  ["1.3 前提は指示に明示"]: new RegExp("(前提|文脈)[^。]{0,50}(明示|指示の中|書いて渡)"),
  ["1.3 子の定義（説明・指示・道具の制限）"]: new RegExp("AgentDefinition|定義ファイル[^。]{0,60}(説明|指示|ツール)"),
  ["1.3 分岐（fork）"]: new RegExp("fork_session|--fork-session"),
  ["1.3 前の子の結果を丸ごと渡す"]: new RegExp("(調べた結果|前の子|成果)[^。]{0,60}渡"),
  ["1.3 内容とメタデータを分ける"]: new RegExp("(出典|出どころ|文書名|ページ番号)[^。]{0,60}(欄|分け|別に)"),
  ["1.3 1応答に複数の呼び出しで並列"]: new RegExp("1つの応答[^。]{0,40}(複数|3つ|tool_use)"),
  ["1.3 手順ではなく目的と基準を渡す"]: new RegExp("(目的|ゴール|基準)[^。]{0,60}(手順|やり方|step)|成果物の形"),
  ["1.4 仕組みで止める⇄お願いで頼む"]: new RegExp("(仕組み|コード|関門)[^。]{0,60}(お願い|プロンプト|頼む)"),
  ["1.4 お願いは確率なので必ず漏れる"]: new RegExp("(お願い|プロンプト|指示)[^。]{0,60}(確率|漏れ|守られ)"),
  ["1.4 引き継ぎ票に何を書くか"]: new RegExp("引き継ぎ[^。]{0,80}(欄|項目|何が|原因|次に)"),
  ["1.4 前提が済むまで後続を止める"]: new RegExp("関門|前提[^。]{0,60}(通れ|止め)"),
  ["1.4 複数の要求を分けて並行に調べる"]: new RegExp("用件[^。]{0,80}(分け|並行)"),
  ["1.5 PostToolUse で結果を整える"]: new RegExp("PostToolUse"),
  ["1.5 PreToolUse で規則違反を止める"]: new RegExp("PreToolUse[^。]{0,80}(止め|ブロック|実行させ)"),
  ["1.5 仕組み＝決定的／お願い＝確率的"]: new RegExp("(決定的|確実)[^。]{0,60}(確率|お願い)"),
  ["1.5 形式の正規化（ISO 8601 など）"]: new RegExp("ISO 8601"),
  ["1.5 閾値を超えたら別の道へ回す"]: new RegExp("(超え|上限)[^。]{0,60}(人|別|止め)"),
  ["1.6 固定チェーン⇄動的分解"]: new RegExp("固定チェーン[^。]{0,60}動的分解|動的分解[^。]{0,60}固定チェーン"),
  ["1.6 段に割る（ファイルごと→横断）"]: new RegExp("ファイル(ごと|単位)[^。]{0,60}横断|横断[^。]{0,60}ファイル(ごと|単位)"),
  ["1.6 分かったことに応じて次を決める"]: new RegExp("(分かった|見つかった|結果)[^。]{0,60}(次|その場|決め)"),
  ["1.6 注意が散るのを避ける"]: new RegExp("(注意|見るところ)[^。]{0,40}(散|多すぎ|薄く)"),
  ["1.6 まず構造を把握してから優先順位"]: new RegExp("構造を把握[^。]{0,120}優先"),
  ["1.7 --resume で名前つき再開"]: new RegExp("--resume"),
  ["1.7 fork で枝を分ける"]: new RegExp("fork_session|--fork-session"),
  ["1.7 再開時にファイルの変更を伝える"]: new RegExp("再開[^。]{0,80}(変わった|変えた場所)"),
  ["1.7 古い結果で再開するより新規＋要約"]: new RegExp("(古い|軒並み)[^。]{0,80}(新規|要約)"),
  ["2.1 説明文が選択の主な材料"]: new RegExp("description[^。]{0,60}(判断|選ぶ|材料)"),
  ["2.1 入力形式・例・境界を書く"]: new RegExp("(境界|いつ呼ばない|対象外)"),
  ["2.1 説明が重なると取り違える"]: new RegExp("似(通|た)[^。]{0,40}(取り違|選べ|区別)"),
  ["2.1 system の語がツール選択に効く"]: new RegExp("system[^。]{0,60}(ツールの選択|選ばれ方|引きずら|寄せて)"),
  ["2.1 汎用の道具を用途別に割る"]: new RegExp("(太すぎ|何でもできる|汎用)[^。]{0,80}(割|分け)"),
  ["2.2 isError フラグ"]: new RegExp("is_error|isError"),
  ["2.2 一時的・検証・業務・権限"]: new RegExp("一時的[^。]{0,60}(検証|業務|権限)"),
  ["2.2 一律のエラー文だと回復できない"]: new RegExp("(エラーが発生|一律|同じ文言)[^。]{0,60}(直せ|分から|回復)"),
  ["2.2 再試行できる／できない"]: new RegExp("再試行(して|する)意味|やり直して直る|isRetryable"),
  ["2.2 子の中で回復し、無理なものだけ上げる"]: new RegExp("一時的[^。]{0,80}(再試行|回復)"),
  ["2.2 アクセス失敗と0件は別"]: new RegExp("(0件|ゼロ件)[^。]{0,50}(失敗|エラー|区別)|失敗[^。]{0,50}(0件|ゼロ件)"),
  ["2.3 道具が多すぎると選べない（18 vs 4-5）"]: new RegExp("18個[^。]{0,60}(引く|選|難し)"),
  ["2.3 専門外の道具は誤用される"]: new RegExp("専門外[^。]{0,80}(使われ|呼ばれ)|(まとめ役|調査班)[^。]{0,60}自分で調べ"),
  ["2.3 役割ごとに配る範囲を絞る"]: new RegExp("(役割|担当)[^。]{0,60}(だけ|絞|限)"),
  ["2.3 tool_choice の auto / any / 指定"]: new RegExp("tool_choice[^。]{0,120}(auto|any)"),
  ["2.3 汎用の道具を制約つきに置き換える"]: new RegExp("制約つき|(広すぎ|決めた置き場)"),
  ["2.4 .mcp.json とユーザ側の設定"]: new RegExp("\\.mcp\\.json"),
  ["2.4 環境変数の展開"]: new RegExp("環境変数"),
  ["2.4 繋いだ全サーバの道具が同時に見える"]: new RegExp("繋いだ[^。]{0,80}(全部|すべて|同時)"),
  ["2.4 resources で目録を出す"]: new RegExp("resources"),
  ["2.4 説明を厚くしないと組み込みが優先される"]: new RegExp("説明[^。]{0,80}(組み込み|Grep)[^。]{0,40}(負け|選ばれ)"),
  ["2.4 既存の公開サーバを使う"]: new RegExp("(既存|公開|コミュニティ|世の中)[^。]{0,60}(サーバ|使)"),
  ["2.5 Grep は中身、Glob は名前"]: new RegExp("Grep[^。]{0,80}Glob|Glob[^。]{0,80}Grep"),
  ["2.5 Read/Write と Edit の使い分け"]: new RegExp("Edit[^。]{0,80}(Read|Write)"),
  ["2.5 Edit が一意に当たらないとき"]: new RegExp("(一意|複数|同じ文字列)[^。]{0,60}Edit|Edit[^。]{0,60}(一意|見つから)"),
  ["2.5 Grep で入口→Read で追う"]: new RegExp("Grep[^。]{0,80}(入口|たど|追)|入口[^。]{0,60}Read"),
  ["2.5 全部読まず、少しずつ広げる"]: new RegExp("(全部|すべて)[^。]{0,40}読ま"),
  ["2.5 名前を洗い出してから横断で探す"]: new RegExp("(名前|export)[^。]{0,80}(洗い出|一覧|列挙)"),
  ["3.1 CLAUDE.md の3階層"]: new RegExp("~/.claude/CLAUDE.md|ユーザ[^。]{0,40}プロジェクト[^。]{0,40}ディレクトリ"),
  ["3.1 ユーザ階層は共有されない"]: new RegExp("(自分だけ|ユーザー)[^。]{0,80}(共有|チーム|他の人|入らない)"),
  ["3.1 @import で分割"]: new RegExp("@import"),
  ["3.1 .claude/rules/ という別の置き方"]: new RegExp("\\.claude/rules"),
  ["3.1 階層の取り違えを診断できる"]: new RegExp("共有されない[^。]{0,60}(チーム|書かない)|(効かな|届かな)[^。]{0,60}(階層|置き場所)"),
  ["3.1 /memory で読み込みを確認"]: new RegExp("/memory"),
  ["3.2 コマンドの置き場所（共有⇄個人）"]: new RegExp("\\.claude/commands[^。]{0,120}~/\\.claude/commands|~/\\.claude/commands[^。]{0,120}\\.claude/commands"),
  ["3.2 SKILL.md と frontmatter"]: new RegExp("SKILL\\.md"),
  ["3.2 context: fork で汚さない"]: new RegExp("context: fork"),
  ["3.2 allowed-tools で道具を絞る"]: new RegExp("allowed-tools"),
  ["3.2 argument-hint で引数を促す"]: new RegExp("argument-hint"),
  ["3.2 個人用の変種を別名で作る"]: new RegExp("(個人|自分)[^。]{0,80}(別名|変え|~/)"),
  ["3.2 スキル⇄CLAUDE.md の選び分け"]: new RegExp("(スキル|コマンド)[^。]{0,100}CLAUDE\\.md[^。]{0,60}(常に|毎回|always)|CLAUDE\\.md[^。]{0,60}(常に|毎回)"),
  ["3.3 paths の glob で条件つき読み込み"]: new RegExp("paths"),
  ["3.3 該当ファイルを触るときだけ読まれる"]: new RegExp("(開いた|編集|触)[^。]{0,40}(そのときだけ|ときだけ)"),
  ["3.3 ディレクトリ別 CLAUDE.md より glob が向く場面"]: new RegExp("散らばって[^。]{0,120}(glob|paths|名前)"),
  ["3.4 plan mode が向く場面"]: new RegExp("plan mode[^。]{0,120}(影響|未知|後戻り|大きい)"),
  ["3.4 直接実行が向く場面"]: new RegExp("直接実行[^。]{0,120}(小さ|決まって|すぐ戻せ)"),
  ["3.4 変更前に安全に調べられる"]: new RegExp("(調べ|読む)[^。]{0,60}変更(は|が)?(でき|しない)"),
  ["3.4 Explore で探索を隔離"]: new RegExp("Explore"),
  ["3.4 plan mode と直接実行を組み合わせる"]: new RegExp("(plan mode)[^。]{0,80}直接実行[^。]{0,60}(組み合わ|そのあと|実装)"),
  ["3.5 入出力の例で示す"]: new RegExp("入出力の例|入力と出力の例|例を2〜3"),
  ["3.5 テストを先に書いて回す"]: new RegExp("テストを先に|先にテスト|テスト駆動"),
  ["3.5 実装前に質問させる"]: new RegExp("先に質問|質問させ|聞き返させ"),
  ["3.5 まとめて1通か、順番か"]: new RegExp("まとめて1通|1通にまとめ|順番に(直|出)"),
  ["3.5 エッジケースは具体的なテストで示す"]: new RegExp("(境界|エッジ|端)[^。]{0,80}(テスト|例)"),
  ["3.6 -p / --print"]: new RegExp("--print"),
  ["3.6 --output-format json"]: new RegExp("--output-format"),
  ["3.6 --json-schema"]: new RegExp("--json-schema"),
  ["3.6 CI では CLAUDE.md が文脈を渡す"]: new RegExp("CLAUDE\\.md[^。]{0,80}(CI|自動|渡)"),
  ["3.6 生成したセッション自身のレビューは弱い"]: new RegExp("同じセッション[^。]{0,120}(疑|見直)"),
  ["3.6 前回の指摘を渡して重複を避ける"]: new RegExp("前回の指摘"),
  ["3.6 既存のテストを渡して重複生成を防ぐ"]: new RegExp("既存のテスト"),
  ["4.1 曖昧な指示より明示的な基準"]: new RegExp("(曖昧|見つけて)[^。]{0,80}基準"),
  ["4.1 「保守的に」では精度が上がらない"]: new RegExp("保守的[^。]{0,80}(基準ではありません|効かな)"),
  ["4.1 誤検知が多いと信用されなくなる"]: new RegExp("(信用|信頼|使われなくな)"),
  ["4.1 該当／対象外／境界を書く"]: new RegExp("該当[^。]{0,80}対象外"),
  ["4.1 誤検知の多い分類は一度外す"]: new RegExp("一時的に(止め|外|切)|いったん外"),
  ["4.1 重大度の基準を具体例で決める"]: new RegExp("重大度[^。]{0,20}同じ|高・中・低"),
  ["4.2 few-shot が最も効く場面"]: new RegExp("few-shot"),
  ["4.2 曖昧な場合の扱いを例で示す"]: new RegExp("曖昧[^。]{0,60}(実物|例)"),
  ["4.2 例から未知のパターンへ一般化する"]: new RegExp("(例に無い|初めて見る)[^。]{0,80}(当てはめ|適用)"),
  ["4.2 抽出での作り話を減らす"]: new RegExp("(無理に|でっち上げ|作り)"),
  ["4.2 出力の形を例で固定する"]: new RegExp("(形|書式|フォーマット)[^。]{0,60}例"),
  ["4.3 tool_use ＋ JSON スキーマが最も確実"]: new RegExp("input_schema|tool_use[^。]{0,80}(スキーマ|schema)"),
  ["4.3 tool_choice の auto / any / 指定"]: new RegExp("tool_choice[^。]{0,140}(auto|any)"),
  ["4.3 スキーマは構文エラーを消すが意味の誤りは消せない"]: new RegExp("(構文|形)[^。]{0,80}(意味|中身|合計)"),
  ["4.3 required と任意（null 可）"]: new RegExp("required[^。]{0,120}(null|任意|省略)|null[^。]{0,80}(許す|任意)"),
  ["4.3 enum に「不明」や「その他」を用意"]: new RegExp("enum[^。]{0,120}(不明|その他|other)|(不明|その他)[^。]{0,60}enum"),
  ["4.4 落ちた理由を付けて投げ直す"]: new RegExp("(理由|指摘)[^。]{0,60}(足し|添え|付け)[^。]{0,40}(再|もう一度)"),
  ["4.4 情報が無い場合は再試行しても無駄"]: new RegExp("通らない入力"),
  ["4.4 誤検知の傾向を記録する"]: new RegExp("detected_pattern"),
  ["4.4 合計と明細の突き合わせ"]: new RegExp("(合計|総額)[^。]{0,60}(一致|突き合わ|検算)"),
  ["4.5 Message Batches API"]: new RegExp("Message Batches"),
  ["4.5 50% 安い / 24時間 / SLA なし"]: new RegExp("50\\s*%|半額|半分"),
  ["4.5 バッチ中はツールを実行できない"]: new RegExp("バッチ[^。]{0,140}(ツール|道具)"),
  ["4.5 custom_id で対応づける"]: new RegExp("custom_id"),
  ["4.5 失敗した分だけ投げ直す"]: new RegExp("(失敗|落ちた)[^。]{0,60}(だけ|分)[^。]{0,40}(投げ|やり直|再)"),
  ["4.5 少量で試してから本番に流す"]: new RegExp("(20〜50件|少量|先に)[^。]{0,80}流"),
  ["4.6 自分の書いたものは自分で疑いにくい"]: new RegExp("同じセッション[^。]{0,120}(疑|見直)"),
  ["4.6 独立した別インスタンスのほうが見つかる"]: new RegExp("multi-instance|別の[^。]{0,40}(体|インスタンス)"),
  ["4.6 多段（ファイルごと＋横断）"]: new RegExp("multi-pass"),
  ["4.6 確信度を添えて回す先を決める"]: new RegExp("確信度[^。]{0,100}(優先|順|回す)"),
  ["5.1 要約で数値・日付・約束が消える"]: new RegExp("(数字|数値)[^。]{0,60}(壊れ|消え)"),
  ["5.1 lost in the middle"]: new RegExp("lost in the middle"),
  ["5.1 ツール結果は関連度に対して大きすぎる"]: new RegExp("(ツールの結果|返り値|ログ)[^。]{0,80}(大き|長|太り|全部)"),
  ["5.1 履歴は毎回まるごと送る"]: new RegExp("(毎回|全部)[^。]{0,40}(送り直|まるごと)"),
  ["5.1 事実ブロックを毎回そのまま入れる"]: new RegExp("事実ブロック"),
  ["5.1 必要な項目だけに削ってから載せる"]: new RegExp("(必要な|要る)[^。]{0,40}(行|項目|だけ)[^。]{0,40}(返|削|絞)"),
  ["5.1 要点を先頭に置き、見出しで区切る"]: new RegExp("(先頭|前|冒頭)[^。]{0,60}(置|入れ)"),
  ["5.2 人に渡す3つの引き金"]: new RegExp("エスカレーション|人に(渡|回)"),
  ["5.2 すぐ渡す⇄まず解決を試みる"]: new RegExp("(すぐ|即)[^。]{0,80}(渡|回)"),
  ["5.2 感情や自信の数値は引き金にしない"]: new RegExp("(感情|語気|怒)[^。]{0,80}引き金|自信の数値"),
  ["5.2 候補が複数なら聞き返す"]: new RegExp("(複数|何件も|絞れな)[^。]{0,80}(聞き返|確認|尋ね)"),
  ["5.3 失敗の種類・試したこと・部分結果"]: new RegExp("部分|途中まで"),
  ["5.3 アクセス失敗と0件の区別"]: new RegExp("(0件|ゼロ件)[^。]{0,50}(失敗|エラー|区別)"),
  ["5.3 一律の失敗表示は文脈を隠す"]: new RegExp("(一律|同じ|generic)[^。]{0,80}(隠|分から)"),
  ["5.3 握りつぶす／全体を止めるは両方誤り"]: new RegExp("握りつぶ|全体を止め"),
  ["5.3 どこが手薄かを注記する"]: new RegExp("(欠けて|足りな|手薄|確かさ)"),
  ["5.4 長く続けると答えがぼやける"]: new RegExp("(長く|長時間|続けている)[^。]{0,50}(ぼやけ|曖昧|一般的な話)"),
  ["5.4 作業メモを窓の外に置く"]: new RegExp("作業メモ|メモをファイル|scratchpad"),
  ["5.4 子に出して要約だけ持ち帰る"]: new RegExp("要約[^。]{0,40}(だけ|のみ)[^。]{0,30}(持ち帰|返)"),
  ["5.4 落ちても再開できる形"]: new RegExp("(落ちても|中断しても|途中で止まっても)[^。]{0,40}(再開|やり直)"),
  ["5.4 /compact"]: new RegExp("/compact"),
  ["5.4 段階ごとに要約して次へ渡す"]: new RegExp("(段|フェーズ|次)[^。]{0,60}要約[^。]{0,60}(渡|入れ|次)"),
  ["5.5 全体の正解率は不出来を隠す"]: new RegExp("(全体|平均)[^。]{0,60}(正解率|精度)[^。]{0,60}隠"),
  ["5.5 種別ごとに抜き取って測る"]: new RegExp("(層化|種別ごと|項目ごと)[^。]{0,60}抜き取"),
  ["5.5 検証セットでしきい値を校正"]: new RegExp("検証セット"),
  ["5.5 種別・項目ごとに確かめてから減らす"]: new RegExp("種別ごと[^。]{0,60}項目ごと"),
  ["5.5 低いものから人に回す"]: new RegExp("(低い|確信度)[^。]{0,80}(順|優先|先に)"),
  ["5.6 要約で出典が失われる"]: new RegExp("(要約|まとめ)[^。]{0,80}(出典|どこから|溶け)"),
  ["5.6 主張と出典の対応を保つ"]: new RegExp("(出典|出どころ)[^。]{0,60}(対応|欄|保)"),
  ["5.6 食い違う値は両方残して注記"]: new RegExp("(割れ|食い違)[^。]{0,80}両方"),
  ["5.6 日付を持たせて時点の違いを誤解しない"]: new RegExp("(公表日|取得日)|日付[^。]{0,80}(矛盾|時点)"),
  ["5.6 内容の型に合った出し方をする"]: new RegExp("(数字は表|表、経緯|箇条書き)"),
};
/* 当たった節も出す。**「あるが置き場所が違う」を見逃さないため** ──
   実際「テストを先に書く」は 1-14（タスク 1.4）にあって、
   本来の 3-9（タスク 3.5）には無かった。存在だけを見ると通ってしまう。 */
const perSec = order.filter(s => !s.quiz).map(s => ({
  id: (s.body.match(/id="([^"]+)"/) || [])[1],
  t: s.body.replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
}));
let cptNg = 0;
Object.entries(CONCEPT).forEach(([k, re]) => {
  const where = perSec.filter(s => re.test(s.t)).map(s => s.id);
  if (!where.length) { bad(`${k}：本文のどこにもない`); cptNg++; }
  else console.log(`     ${k} → ${where.join(' / ')}`);
});
if (!cptNg) console.log(`  ✓ ${Object.keys(CONCEPT).length} 項目すべて本文にあり`);

/* --- 5f. 文字サイズが段階（--fs-*）で書かれているか -------------------
   px を直接書くと段階が増えていき、「ばらつきが大きい」状態に戻る。
   段階そのものが増えるのも同じことなので、名前の集合ごと固定する。
   clamp() も中間の任意サイズを作るため禁止。
   SVG の中だけは別系統（図の座標に合わせてあるため）。 */
console.log('\n■ 文字サイズの段階');
const FS_STEPS = ['xs', 'sm', 'base', 'lg', 'xl'];   // これ以外を増やさない
const cssTxt = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8');
let fsNg = 0;

cssTxt.split('\n').forEach((l, i) => {
  if (/font-size:\s*[\d.]+px/.test(l) && !/\bsvg\b/.test(l) && !/--fs-/.test(l)) {
    bad(`style.css:${i + 1} 段階を使わず px 直書き → ${l.trim().slice(0, 60)}`);
    fsNg++;
  }
  if (/font-size:\s*clamp\(/.test(l)) {
    bad(`style.css:${i + 1} clamp() は段階外の中間サイズを作る → ${l.trim().slice(0, 60)}`);
    fsNg++;
  }
  // em / rem / % は親のサイズぶんだけ段階外の値を生む。code{font-size:.86em} が
  // 12.04px と 13.76px を作っていて、--fs-* を数えるだけでは見つからなかった。
  if (/font-size:\s*[\d.]+(em|rem|%)/.test(l)) {
    bad(`style.css:${i + 1} 相対指定は段階外のサイズを生む → ${l.trim().slice(0, 60)}`);
    fsNg++;
  }
});

// 定義されている段階名と、参照されている段階名の両方を集合として突き合わせる
const defined = [...new Set([...cssTxt.matchAll(/--fs-([\w-]+)\s*:/g)].map(m => m[1]))];
const used    = [...new Set([...cssTxt.matchAll(/var\(--fs-([\w-]+)\)/g)].map(m => m[1]))];
defined.filter(s => !FS_STEPS.includes(s)).forEach(s => {
  bad(`--fs-${s} は許可された段階にない（許可：${FS_STEPS.join(' / ')}）`); fsNg++;
});
used.filter(s => !defined.includes(s)).forEach(s => {
  bad(`var(--fs-${s}) を使っているが定義がない`); fsNg++;
});

if (!fsNg) console.log(`  ✓ SVG 以外はすべて --fs-* の${FS_STEPS.length}段階（${FS_STEPS.join(' / ')}）`);

/* --- 6. 検索インデックスが本文と同期しているか -------------------- */
console.log('\n■ 検索インデックスの同期');
const idxJs = fs.readFileSync(path.join(ROOT, 'assets/search-index.js'), 'utf8');
const IDX = JSON.parse(idxJs.replace(/^window\.SEARCH_INDEX\s*=\s*/, '').replace(/;\s*$/, ''));
const secCount = order.length;
if (IDX.length !== secCount) bad(`セクション ${secCount} 件に対しインデックス ${IDX.length} 件 → node tools/reindex.mjs を実行`);
else console.log(`  ✓ ${IDX.length} セクションぶん同期`);

console.log('\n' + (ng ? `要修正 ${ng} 件` : 'すべて問題なし'));
process.exit(ng ? 1 : 0);
