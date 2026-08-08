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

/* --- 5a2. 設問の見出しの規約 --------------------------------------
   同じ ◇ に「理解度チェック」「総合チェック」「解いてみる」の3通りの名前が
   混在し、一覧で区別できなくなったことがある。名前は1つに固定する。
   同じドメインに2つ以上あるときは、副題で中身を書き分ける。 */
console.log('\n■ 設問の見出し');
let qhNg = 0;
const qHeads = order.filter(s => s.quiz).map(s => ({
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
  if (s.quiz) return;
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
   <code>pause_turn</code> のようにタグで割れていても拾えるようにするため。 */
console.log('\n■ 必須語彙の網羅（ブループリントが名指ししている語）');
const VOCAB = {
  // Domain 1 — stop_reason は7値すべて。pause_turn を落とすと
  // 「ループに戻るのは tool_use だけ」という誤った断言になる
  '1.1 ループと stop_reason': ['stop_reason', 'tool_use', 'end_turn', 'max_tokens',
    'pause_turn', 'stop_sequence', 'model_context_window_exceeded', 'tool_result'],
  '1.2 コーディネータ':      ['コーディネータ'],
  '1.3 子の起動と並列':      ['disable_parallel_tool_use', '並列ツール使用'],
  '1.4 関門とハンドオフ':    ['PreToolUse', 'PostToolUse'],
  '1.5 hooks':               ['matcher', 'permissionDecision', 'updatedInput',
    'SessionStart', 'SubagentStop', 'PreCompact', 'exit 2'],
  '1.6 タスク分解':          ['固定チェーン', '動的分解'],
  '1.7 セッション':          ['--resume', '--continue', '--fork-session'],
  // Domain 2 — 2.5 は「誰が実行するか」が骨格。client / server の別が要る
  '2.1 ツール定義':          ['input_schema', 'description'],
  '2.2 エラー応答':          ['is_error'],
  '2.3 配分と tool_choice':  ['tool_choice'],
  '2.4 MCP':                 ['.mcp.json', 'stdio', 'resources', 'prompts'],
  '2.5 組み込みツール':      ['クライアントツール', 'サーバツール', 'web_search',
    'web_fetch', 'code_execution', 'text_editor', 'memory'],
  // Domain 3
  '3.1 CLAUDE.md':           ['CLAUDE.md', 'CLAUDE.local.md'],
  '3.2 コマンドとスキル':    ['SKILL.md', 'allowed-tools', 'argument-hint', '$ARGUMENTS', 'context: fork',
    'YAML frontmatter'],   // ← JSON と見分けがつかないと「キーにハイフン？」になる（§7 #34）
  '3.3 パス固有ルール':      ['.claude/rules', 'paths'],
  '3.4 plan mode':           ['plan mode', '--permission-mode'],
  '3.6 CI/CD':               ['--output-format', '--allowedTools', 'bypassPermissions',
    'settings.json', 'permissions', 'GitHub Actions'],
  // Domain 4
  '4.2 few-shot':            ['few-shot'],
  '4.3 構造化出力':          ['required', 'enum', 'strict'],
  '4.5 バッチ':              ['custom_id'],
  '4.6 多重レビュー':        ['multi-instance', 'multi-pass'],
  // Domain 5 — 5.1 は「何を残すか」だけでなく「要約に通してはいけないもの」と
  // 「どこに置くか」まで。どちらもブループリントが名指ししている
  '5.1 文脈管理':            ['事実ブロック', 'lost in the middle'],
  '5.2 エスカレーション':    ['エスカレーション'],
  '5.4 大規模探索':          ['サブエージェント'],
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
