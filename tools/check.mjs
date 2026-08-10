/* =========================================================
   静的チェック — 過去に実際に起きた不具合の再発を検出する
     node tools/check.mjs
   依存パッケージなし（Node 18+）。ブラウザは使わない。
   ========================================================= */
import fs from 'fs';
import path from 'path';
import { GUIDE, EXAM, DOMAINS as BP_DOM, SCENARIOS, TECH, GLOSSARY, TRAPS, SAMPLES, SCOPE, TASKS as BP, domainItems, scenarioCount } from './blueprint.mjs';

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

/* --- 3. 位置で指していないか ----------------------------------------
   本文が位置（前ページ・前節・最初の図）に依存すると、**節を並べ替えたときに黙って壊れる。**
   ページ送り UI そのものは1項ずつ表示として復活したので、"ページ送り" 等は検出対象から外した。

   §7 #48 で「位置で指すのを禁じるだけでは足りない、検査に変える」と決めたが、
   **入れた検査は `.figbox` の中しか見ていなかった。** 本文には「前節の関門は…」が
   11件残っていて、節を挿すたびに指す先がずれていた（実際 Domain 1・2・5 を
   振り直した回に全部ずれた）。いまは**本文全体**を見る。
   指したいときは**節の名前でリンクする** ── ファイル名が変われば 5l が捕まえる。 */
console.log('\n■ 位置参照と、実装の話');
let refNg = 0;
const REF_FILES = [...FILES, 'index.html'];
// 位置で指す語（節を並べ替えると壊れる） ＋ 道具の話（読み手に意味がない・§7 #14 #84）
const NG_WORDS = /前ページ|次ページ|前の章|次の章|1ページ＝|☰|前節|次節|前の節|次の節|直前の節|上の節|下の節|最初の図|前の図|reindex|blueprint|check\.mjs|照合します/g;
REF_FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  // **本文だけを見る**（ファイル冒頭の編集マーカーには tools/reindex.mjs と書いてある）
  const body = (h.match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1]
    || h.replace(/<!--[\s\S]*?-->/g, ' ');
  (body.match(NG_WORDS) || []).forEach(w => {
    bad(`${f}: 「${w}」が本文に残っている`); refNg++;
  });
});
if (!refNg) console.log(`  ✓ ${REF_FILES.length} ファイルの本文に、位置参照も道具の話もない`);

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

/* --- 5c. ゴール（.goal）が、あるか・見出しの直下にあるか ---------------
   「この節を終えたら何が言えるか」がないと、読み手は止めどころが分からない。
   **置き場所は見出しのすぐ下**（§4）── 導入や BLUEPRINT ラベルの後ろに回ると、
   読み手は「何が身につくか」を知る前に本文へ入ることになる。 */
console.log('\n■ ゴール');
let goalNg = 0, goalN = 0, subN = 0;
order.forEach(s => {
  if (s.quizOnly) return;
  if (!/class="goal"/.test(s.body)) {
    bad(`${s.f} #${(s.body.match(/id="([^"]+)"/) || [])[1]}: ゴール（.goal）がない`);
    goalNg++; return;
  }
  // 見出し（</header> または </h3>）と .goal のあいだに、他の段落が挟まっていないか
  const seq = [...s.body.matchAll(/<\/header>|<h3 class="sub"[^>]*>|<p class="(lead|task|goal)"/g)];
  for (let i = 0; i < seq.length; i++) {
    if (seq[i][1] !== 'goal') continue;
    goalN++;
    const prev = seq[i - 1];
    if (prev && prev[1]) {
      bad(`${s.f}: ゴールの前に .${prev[1]} がある（見出しの直下に置く）`);
      goalNg++;
    }
  }
});
// 小見出し（h3.sub）にもゴールを置く ── **新しい知識を教える場所は全部**。
// ゴールは「その説明がいちばん短い手か」を判断する基準になるので、無い区画は
// 価値を測れないまま増える（利用者の指示・§7 #77）。
// 除くのは ① 設問の項（模擬シナリオの「では、どう手を打つか」）
//         ② 生成ブロックの中（reindex が書き出すので本文側で足せない）
order.forEach(s => {
  if (s.quizOnly || s.quiz) return;
  const clean = s.body.replace(/<!--#[\s\S]*?<!--\/#[a-z]+-->/g, ' ');
  const parts = clean.split(/(?=<h3 class="sub")/);
  parts.slice(1).forEach(part => {
    const own = part.split(/(?=<h3 class="sub")/)[0];
    if (/class="goal"/.test(own)) { subN++; return; }
    const h = ((own.match(/<h3 class="sub"[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || '').replace(/<[^>]+>/g, '');
    bad(`${s.f}: 小見出し「${h}」にゴールがない`);
    goalNg++;
  });
});
if (!goalNg) console.log(`  ✓ 本文 ${order.filter(s => !s.quiz).length} 節すべてにあり、ゴール ${goalN} 件（うち小見出し ${subN} 件）すべて見出しの直下`);

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
/* blueprint.mjs から組み立てる。**ここに表を持たない** ── 3か所（TASKS / VOCAB /
   CONCEPT）に分かれていると、タスクが増減したときにズレる（§7 #60） */
const TASKS = Object.fromEntries(Object.entries(BP).map(([n, t]) => [`${n} ${t.ja}`, t.sections]));

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

/* --- 5o. 範囲外を厚く教えていないか --------------------------------
   公式 §17 Appendix は「出るもの」と**「出ないもの」**を明記している。
   穴（出るのに教えていない）ばかり見ていたが、**範囲外を厚く教えるのも
   同じくらい悪い** ── 最上位の方針は「短時間で理解できること」で、
   出ない内容に割いた行数はそのまま損になる（§7 #62）。
   実際、ストリーミングのイベント列を図2本で、キャッシュの実装詳細を
   1節まるごと教えていた。どちらも公式が明示的に out としている。

   allow は「触れてよい節の数」。0 なら一切書かない、1 なら1節で
   「あることを知る」まで。**増やすときは、なぜ要るかを添えること。** */
console.log(String.fromCharCode(10) + "■ 範囲外の扱い（公式 §17 Out-of-Scope）");
let outNg = 0;
SCOPE.out.forEach(o => {
  const re = new RegExp(o.re);
  const where = order.filter(s => !s.quiz)
    .map(s => ({ id: (s.body.match(/id="([^"]+)"/) || [])[1], t: s.body.replace(/<[^>]+>/g, ' ') }))
    .filter(s => re.test(s.t)).map(s => s.id);
  if (where.length > o.allow) {
    bad(`範囲外「${o.en.slice(0, 52)}」が ${where.length} 節（許容 ${o.allow}）→ ${where.join(' / ')}`);
    outNg++;
  }
});
if (!outNg) console.log(`  ✓ 範囲外 ${SCOPE.out.length} 項目、いずれも許容の範囲内`);

/* --- 5m. ブループリントの内部整合 ---------------------------------
   blueprint.mjs は手で直すファイルなので、**直したときに辻褄が合うか**を見る。
   比率を 27% → 35% に変えたのに問数ラベルが 16 問のまま、という事故が
   実際に起きうる（§7 #60 で実験して確かめた）。数字は導出にしてあるので、
   ここで見るのは「導出のもとが壊れていないか」。 */
console.log(String.fromCharCode(10) + "■ ブループリントの内部整合");
let bpNg = 0;
{
  const keys = Object.keys(BP_DOM);
  const wsum = keys.reduce((a, k) => a + BP_DOM[k].weight, 0);
  if (Math.abs(wsum - 1) > 1e-9) { bad(`比率の合計が ${(wsum * 100).toFixed(1)}%（100% でない）`); bpNg++; }
  const isum = keys.reduce((a, k) => a + domainItems(k), 0);
  if (isum !== EXAM.items) { bad(`按分した問数の合計が ${isum}（EXAM.items = ${EXAM.items} と合わない）`); bpNg++; }
  const ns = keys.map(k => BP_DOM[k].n).sort((a, b) => a - b);
  if (ns.join() !== ns.map((_, i) => i + 1).join()) { bad(`ドメイン番号が 1..${keys.length} の連番でない → ${ns.join()}`); bpNg++; }
  if (SCENARIOS.length !== EXAM.scenariosTotal) { bad(`SCENARIOS が ${SCENARIOS.length} 本（EXAM.scenariosTotal = ${EXAM.scenariosTotal}）`); bpNg++; }
  if (EXAM.scenariosShown > EXAM.scenariosTotal) { bad(`出るシナリオ数が総数を超えている`); bpNg++; }
  SCENARIOS.forEach(s => s.domains.forEach(k => {
    if (!BP_DOM[k]) { bad(`シナリオ ${s.n} が知らないドメイン「${k}」を指している`); bpNg++; }
  }));
  const cs = keys.reduce((a, k) => a + scenarioCount(k), 0);
  const ds = SCENARIOS.reduce((a, s) => a + s.domains.length, 0);
  if (cs !== ds) { bad(`ドメイン別のシナリオ本数の合計 ${cs} が、シナリオ側の延べ数 ${ds} と合わない`); bpNg++; }
  // §9 の例題 ─ 設問文は持たないので、持っている「分類」だけが壊れていないかを見る
  if (SAMPLES.length !== EXAM.sampleQuestions) { bad(`SAMPLES が ${SAMPLES.length} 問（EXAM.sampleQuestions = ${EXAM.sampleQuestions}）`); bpNg++; }
  const trapUse = {};
  SAMPLES.forEach(s => {
    if (s.traps.length !== 3) { bad(`例題 Q${s.n} の誤答の型が ${s.traps.length} 個（4択なので誤答は3個）`); bpNg++; }
    s.traps.forEach(k => {
      if (!TRAPS[k]) { bad(`例題 Q${s.n} が知らない誤答の型「${k}」を指している`); bpNg++; }
      else trapUse[k] = (trapUse[k] || 0) + 1;
    });
    if (!SCENARIOS.some(x => x.n === s.sc)) { bad(`例題 Q${s.n} が知らないシナリオ ${s.sc} を指している`); bpNg++; }
    s.sections.forEach(id => {
      if (!allIds.has(id)) { bad(`例題 Q${s.n} の戻り先「${id}」が存在しない`); bpNg++; }
    });
  });
  // 使われていない型が残ると、表に0個の行が出る（分類を直したときに起きる）
  Object.keys(TRAPS).forEach(k => {
    if (!trapUse[k]) { bad(`誤答の型「${TRAPS[k].ja}」がどの例題からも指されていない`); bpNg++; }
  });
  // 本文に手で書いた「例題12問」が、SAMPLES の実数と合っているか（§7 #66 と同じ趣旨）
  FILES.concat(['index.html']).forEach(f => {
    const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const body = (h.match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1] || (f === 'index.html' ? h : '');
    for (const m of body.matchAll(/例題(?:が)?\s*(\d+)\s*問/g)) {
      if (+m[1] !== SAMPLES.length) { bad(`${f} の「${m[0]}」が SAMPLES の ${SAMPLES.length} 問と合わない`); bpNg++; }
    }
  });
  // 各タスクが指す節 id が実在するか（5f は「1つも無い」だけを見ている）
  Object.entries(BP).forEach(([n, tk]) => tk.sections.forEach(id => {
    if (!allIds.has(id)) { bad(`タスク ${n} が指す節 id「${id}」が存在しない`); bpNg++; }
  }));
}
if (!bpNg) console.log(`  ✓ 比率 ${Object.keys(BP_DOM).length} 件・シナリオ ${SCENARIOS.length} 本・例題 ${SAMPLES.length} 問（誤答 ${SAMPLES.length * 3} 個を ${Object.keys(TRAPS).length} 型に分類）・タスク ${Object.keys(BP).length} 件すべて辻褄が合う（${GUIDE.code} v${GUIDE.version}）`);

/* --- 5n. タスク番号が、本文から参照されているか -----------------------
   逆向き（本文にあってブループリントに無い番号）は reindex が throw する。
   こちら向き ── **ブループリントに増えたのに本文が追いついていない** ──
   は、実際に試したら何も落ちずに通った（§7 #60 の実験C）。 */
console.log(String.fromCharCode(10) + "■ タスク番号の参照");
let refT = 0;
{
  const used = new Set();
  FILES.forEach(f => {
    const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const body = (h.match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1];
    if (!body) return;
    [...body.matchAll(/data-t="([^"]+)"/g)].forEach(m => m[1].trim().split(/\s+/).forEach(x => used.add(x)));
  });
  Object.keys(BP).forEach(n => {
    if (!used.has(n)) { bad(`タスク ${n}「${BP[n].name.slice(0, 46)}…」を指す節がない（data-t に出てこない）`); refT++; }
  });
  if (!refT) console.log(`  ✓ ${Object.keys(BP).length} タスクすべて、本文の data-t から参照されている`);
}

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
const VOCAB = Object.fromEntries(Object.entries(BP)
  .filter(([, t]) => t.vocab.length).map(([n, t]) => [`${n} ${t.ja}`, t.vocab]));

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
const CONCEPT = {};
for (const [n, tk] of Object.entries(BP))
  // 値が配列の項目は、**全部を満たすこと**。原文の1つの箇条書きが
  // 複数のことを言っている場合（1.1 S3 の「誤り3つ」など）に使う
  for (const [k, re] of Object.entries(tk.concepts))
    CONCEPT[`${n} ${k}`] = (Array.isArray(re) ? re : [re]).map(x => new RegExp(x));

/* 当たった節も出す。**「あるが置き場所が違う」を見逃さないため** ──
   実際「テストを先に書く」は 1-14（タスク 1.4）にあって、
   本来の 3-9（タスク 3.5）には無かった。存在だけを見ると通ってしまう。 */
const perSec = order.filter(s => !s.quiz).map(s => ({
  id: (s.body.match(/id="([^"]+)"/) || [])[1],
  t: s.body.replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
}));
let cptNg = 0;
Object.entries(CONCEPT).forEach(([k, res]) => {
  // 条件ごとに「当たった節」を出す。1つでも当たらなければ落とす
  const wheres = res.map(r => perSec.filter(s => r.test(s.t)).map(s => s.id));
  const ng = wheres.findIndex(w => !w.length);
  if (ng >= 0) { bad(`${k}：本文のどこにもない${res.length > 1 ? `（条件 ${ng + 1}/${res.length}）` : ''}`); cptNg++; }
  else console.log(`     ${k} → ${[...new Set(wheres.flat())].join(' / ')}`);
});
if (!cptNg) console.log(`  ✓ ${Object.keys(CONCEPT).length} 項目すべて本文にあり（公式 §6 の箇条書きと1対1）`);

/* --- 5t. キー操作が1か所にまとまっているか ----------------------------
   `document` への `keydown` を機能ごとに足すと、「入力中か」「検索が開いているか」の
   判定が同じ数だけ増える。矢印キーを足したとき実際に2つになり、判定が二重になった。
   足すときは既にある1つの中に足す（app.js の「キー操作 ─ ここに集約する」）。 */
console.log(String.fromCharCode(10) + "■ キー操作の集約");
{
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const n = (js.match(/document\.addEventListener\(\s*['"]keydown['"]/g) || []).length;
  if (n === 1) console.log('  ✓ document への keydown は 1 か所');
  else bad(`app.js の document への keydown が ${n} か所（1 か所にまとめる）`);
}

/* --- 5u. 対訳表の英語が、公式の原文から来ているか ----------------------
   6-14 の「この教材の言い方 ⇄ 公式の英語」は、**私が英語を作ってはいけない**。
   それらしい訳語を置くと、本番で出ない語を覚えることになる。
   照合先は原文だけ ── タスク名（§6）・技術一覧（§17）・In/Out of Scope（§17）・
   シナリオ名（§5）。どれにも無い英語があれば落とす。 */
console.log(String.fromCharCode(10) + "■ 対訳表（英語の出どころ・品詞）");
let gloNg = 0;
{
  const corpus = [
    ...Object.values(BP).map(x => x.name),
    ...TECH.map(x => x.en + ' ' + x.detail),
    ...SCOPE.in.map(x => typeof x === 'string' ? x : x.en),
    ...SCOPE.out.map(x => typeof x === 'string' ? x : x.en),
    ...SCENARIOS.map(x => x.en),
  ].join(' ').toLowerCase();
  GLOSSARY.forEach(g => {
    if (!corpus.includes(g.en.toLowerCase())) {
      bad(`対訳「${g.ja}」の英語 "${g.en}" が公式の原文にない（原文から取る）`);
      gloNg++;
    }
  });
  // 英語が名詞句なので、日本語も名詞句にそろえる（動詞で終わらせない）
  const VERB_END = /[うくぐすずつぬふぶむる]$/;
  GLOSSARY.forEach(g => {
    if (VERB_END.test(g.ja.replace(/（[^）]*）$/, ''))) {
      bad(`対訳「${g.ja}」が動詞で終わっている ── 英語 "${g.en}" は名詞句なので、日本語も名詞句にする`);
      gloNg++;
    }
  });
  const doms = new Set(['basics', ...Object.keys(BP_DOM)]);
  GLOSSARY.forEach(g => {
    if (!doms.has(g.d)) { bad(`対訳「${g.ja}」が知らないドメイン「${g.d}」を指している`); gloNg++; }
  });
}
if (!gloNg) console.log(`  ✓ 対訳 ${GLOSSARY.length} 組すべて、英語は公式の原文にあり、日本語も名詞句`);

/* --- 5v. 「使わない」と決めた書き方が復活していないか --------------------
   §7 で理由つきでやめたものを、まとめて見張る。どれも**入れても表示は壊れない**ので、
   目視でも `measure` でも気づけない ── だから検査でしか止められない。

     ① <details>       学習に有用な情報を折りたたまない（#7）
     ② 個別の max-width 読み幅は容器側で1回だけ決める（#16）
     ③ text-wrap       pretty は iPhone で行末が空き、balance は行が短くなる（#19 #50）
     ④ columns         段組みは読む順が縦→横に折れて追えない（#25）
     ⑤ 2列の表の data-l 左が語・右が説明なら、ラベルは繰り返すだけ（#74 #83）
     ⑥ 設問数の手書き   数は data から。`.lead` には <span class="qcount"></span> を置く（#45） */
console.log(String.fromCharCode(10) + "■ やめた書き方の復活");
let banNg = 0;
{
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const cssRaw = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8');
  const cssNoComment = cssRaw.replace(/\/\*[\s\S]*?\*\//g, ' ');   // 「使わない」と書いた注釈は対象外
  const bodies = FILES.map(f => [f, (fs.readFileSync(path.join(ROOT, f), 'utf8')
    .match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1] || '']);
  const all = [...bodies, ['index.html', idx]];
  const hit = (label, list) => list.forEach(f => { bad(`${f}: ${label}`); banNg++; });

  hit('<details> で折りたたんでいる（学習に有用な情報は折りたたまない・§7 #7）',
    all.filter(([, b]) => /<details[\s>]/.test(b)).map(([f]) => f));
  hit('本文の要素に max-width がある（読み幅は容器側で1回だけ・§7 #16）',
    bodies.filter(([, b]) => /style="[^"]*max-width/.test(b)).map(([f]) => f));
  if (/text-wrap:\s*(pretty|balance)/.test(cssNoComment)) {
    bad('style.css に text-wrap: pretty / balance がある（§7 #19 #50）'); banNg++;
  }
  if (/[^-\w]columns\s*:/.test(cssNoComment)) {
    bad('style.css に CSS の段組み columns がある（読む順が縦→横に折れる・§7 #25）'); banNg++;
  }
  hit('2列の表（.tbl.pair）に data-l がある（左が語・右が説明ならラベルは要らない・§7 #74 #83）',
    all.filter(([, b]) => [...b.matchAll(/<table class="tbl pair">[\s\S]*?<\/table>/g)]
      .some(m => /data-l=/.test(m[0]))).map(([f]) => f));
  // 設問の項の .lead に「N問」を手書きしていないか（本番の問数を語る本文は対象外）
  hit('設問の項の .lead に問数を手書きしている（<span class="qcount"></span> を使う・§7 #45）',
    bodies.filter(([, b]) => /data-quiz=/.test(b)
      && /<p class="lead">(?:(?!<\/p>)[\s\S])*?\d+\s*問/.test(b)).map(([f]) => f));
}
if (!banNg) console.log('  ✓ やめた6つの書き方は、どれも復活していない');

/* --- 5s. 丸の中の数字が、行送りで下にずれていないか --------------------
   丸番号は `border-radius:50%` ＋ `place-items:center` で組んでいる。
   ここに `line-height` を書かないと**親の行送りをそのまま継ぐ**ので、
   `pre.code`（1.85）の中では数字が円の中心から **2.63px 下**へずれる（実測）。
   さらに数字はベースラインに乗るぶん、下の空きで 0.5px ほど下に見えるので
   `padding-bottom:1px` で上へ寄せる（`box-sizing:border-box` 前提）。 */
console.log(String.fromCharCode(10) + "■ 丸番号の中央そろえ");
let cirNg = 0, cirN = 0;
{
  const css = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8');
  for (const m of css.matchAll(/([.#][\w-][^{]*)\{([^}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' '), body = m[2];
    if (!/border-radius:\s*50%/.test(body)) continue;
    if (!/place-items:\s*center/.test(body)) continue;
    cirN++;
    if (!/line-height:\s*1\b/.test(body)) { bad(`style.css の ${sel} に line-height:1 がない（親の行送りを継いで数字が下にずれる）`); cirNg++; }
    else if (!/padding-bottom:\s*1px/.test(body)) { bad(`style.css の ${sel} に padding-bottom:1px がない（ベースラインぶん下に見える）`); cirNg++; }
  }
}
if (!cirNg) console.log(`  ✓ 丸番号の規則 ${cirN} 件すべて、行送りと下寄せを指定している`);

/* --- 5r. ラベルの中で色を変えて強調していないか -----------------------
   `.exl`（例のラベル）は色そのものが役割を持つ（アクセント＝ここが区画の頭）。
   その中で `<b>` を使うと**白に変わり、ラベルの中に2色が並ぶ** ── 強調のつもりが
   「別の種類のラベル」に見える。強めたいときは色ではなく「」で囲う（§4）。
   `.point` / `.goal` の先頭ラベルも同じ理由で中に `<b>` を入れない。 */
console.log(String.fromCharCode(10) + "■ ラベルの中の強調");
let lblNg = 0, lblN = 0;
FILES.forEach(f => {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const body = (h.match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1] || '';
  for (const m of body.matchAll(/<span class="exl">([\s\S]*?)<\/span>/g)) {
    lblN++;
    if (/<b>/.test(m[1])) {
      bad(`${f}: ラベルの中に <b> がある ── 色ではなく「」で囲う → 「${m[1].replace(/<[^>]+>/g, '').slice(0, 30)}」`);
      lblNg++;
    }
  }
});
if (!lblNg) console.log(`  ✓ ラベル ${lblN} 件すべて、中で色を変えていない`);

/* --- 5q. CLAUDE.md が書いた節番号が、その節を指しているか ---------------
   節を1つ挿すとドメイン内の番号が全部ずれる。CLAUDE.md には §5 の判定表・
   §7 の記録・§10 の一覧に**節番号で書いた参照が数十件**あり、番号がずれても
   何も落ちなかった（実際に Domain 1・2・5 を振り直したとき23件が古くなった）。

   見るのは「番号 ＋ そのすぐ後ろの語」だけ。後ろの語が**どこかの節の題の
   先頭と5字以上一致するのに、書かれた番号の節ではない**とき落とす。
   散文（「1-11 に…を置いた」）は題と一致しないので対象外になる。 */
console.log(String.fromCharCode(10) + "■ CLAUDE.md の節参照");
let mdRefNg = 0, mdRefN = 0;
{
  const md = fs.readFileSync(path.join(ROOT, '..', 'CLAUDE.md'), 'utf8').split(String.fromCharCode(10));
  // 節番号 → 題（order は番号を持っていないので、ここで本文から作る）
  const titles = {};
  FILES.forEach(f => {
    const b2 = (fs.readFileSync(path.join(ROOT, f), 'utf8')
      .match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1] || '';
    for (const h of b2.matchAll(/<h2>([^<]*)<\/h2>/g)) {
      const parts = h[1].split(String.fromCharCode(0x3000));
      if (parts.length > 1) titles[parts[0]] = parts.slice(1).join(String.fromCharCode(0x3000));
    }
  });
  md.forEach((line, li) => {
    for (const m of line.matchAll(/(?<![\d.\-\/])([0-6])-(\d{1,2})(?![\d\-])/g)) {
      const key = m[1] + '-' + m[2];
      const after = line.slice(m.index + m[0].length).replace(/^[ 　]+/, '').replace(/^\*+/, '');
      let best = 0, owners = [];
      for (const [num, title] of Object.entries(titles)) {
        for (let k = Math.min(title.length, after.length); k >= 5; k--) {
          if (!after.startsWith(title.slice(0, k))) continue;
          if (k > best) { best = k; owners = [num]; } else if (k === best) owners.push(num);
          break;
        }
      }
      if (best < 5) continue;                       // 題を伴わない参照は見ない
      mdRefN++;
      if (!owners.includes(key)) {
        bad(`CLAUDE.md L${li + 1} の「${key} ${after.slice(0, best)}」── その題は ${owners.join(' / ')}`);
        mdRefNg++;
      }
    }
  });
}
if (!mdRefNg) console.log(`  ✓ 題つきの節参照 ${mdRefN} 件すべて、その節を指している`);

/* --- 5p. CLAUDE.md に書いた数が、実物と合っているか --------------------
   CLAUDE.md は毎セッション読み込まれる。**そこに古い数字があると、
   それを前提に作業が進む。** 監査したら7件ズレていた（項数・図の数・
   コードの数・設問数・検査の項目数）── どれも「直したときに直し忘れた」もの。
   §7 の教訓どおり、**決め事は検査に変換しないと守られない**ので、ここで見る。

   直し方は2つ ── 数を直すか、数を書くのをやめるか（後者が理想）。 */
console.log(String.fromCharCode(10) + "■ CLAUDE.md の数字");
let mdNg = 0, mdN = 0;
{
  const md = fs.readFileSync(path.join(ROOT, '..', 'CLAUDE.md'), 'utf8');
  // §7 の番号 ─ 追記のたびに末尾へ足すので、**飛んでも乱れても気づけない**。
  // 実際に #84 が丸ごと落ち（書き出す前にファイルを読み直していた）、
  // #60 が #61 の後ろに入っていた。番号は「あとで参照する住所」なので連番で昇順にする。
  {
    const s7 = md.slice(md.indexOf('## 7.'), md.indexOf('## 8.'));
    const ns = [...s7.matchAll(/^\| (\d+) \|/gm)].map(x => +x[1]);
    const want = ns.map((_, i) => i + 1).join();
    if (ns.join() !== want) {
      const miss = [];
      for (let i = 1; i <= Math.max(...ns); i++) if (!ns.includes(i)) miss.push(i);
      const desc = ns.filter((n, i) => i > 0 && n < ns[i - 1]);
      bad('CLAUDE.md §7 の番号が 1..' + ns.length + ' の連番・昇順でない'
        + (miss.length ? `（欠番 ${miss.join(',')}）` : '')
        + (desc.length ? `（${desc.join(',')} が前より小さい）` : ''));
      mdNg++;
    } else mdN++;
  }
  const body = order.filter(s => !s.quizOnly).length;
  const figs = FILES.reduce((a, f) => {
    const b = (fs.readFileSync(path.join(ROOT, f), 'utf8')
      .match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1] || '';
    return {
      fig: a.fig + (b.match(/<figure class="fig/g) || []).length,
      tbl: a.tbl + (b.match(/<table class="tbl"/g) || []).length,
      code: a.code + (b.match(/<pre class="code"/g) || []).length,
      ann: a.ann + (b.match(/<ol class="ann">/g) || []).length,
    };
  }, { fig: 0, tbl: 0, code: 0, ann: 0 });
  const qTotal = Object.values(QUIZ).reduce((a, b) => a + b.length, 0);
  const checks = (fs.readFileSync(new URL(import.meta.url).pathname, 'utf8')
    .match(/^console\.log\((?:'\\n■|String\.fromCharCode\(10\) \+ "■)/gm) || []).length;
  const want = [
    ['項数',            /全(\d+)項（本文/,                      order.length],
    ['本文の項数',      /本文(\d+)・理解度チェックだけの項/,     body],
    ['設問だけの項',    /理解度チェックだけの項(\d+)/,           order.length - body],
    ['設問の総数',      /\*\*全(\d+)問\*\*/,                    qTotal],
    ['HTML の図',       /\*\*(\d+)点\*\*（ほかに比較表/,         figs.fig],
    ['比較表',          /比較表 (\d+)・コード/,                  figs.tbl],
    ['コード',          /コード (\d+)）/,                        figs.code],
    ['.ann',            /\| \*\*(\d+)\*\*（すべて `pre\.code`/,  figs.ann],
    ['本文の節数',      /本文(\d+)節のうち/,                     body],
    ['検査の項目数',    /全(\d+)項目が「対象が何件あったか」/,   checks],
  ];
  want.forEach(([label, re, real]) => {
    const m = md.match(re);
    if (!m) { bad(`CLAUDE.md に「${label}」の記載が見つからない（書き方を変えたなら 5p も直す）`); mdNg++; return; }
    mdN++;
    if (+m[1] !== real) { bad(`CLAUDE.md の「${label}」が ${m[1]}、実際は ${real}`); mdNg++; }
  });
  // §11 の按分表 ─ ドメインごとの設問数
  const dirOf = { agentic: '01-agentic', tools: '02-tools', code: '03-claude-code', prompt: '04-prompt', context: '05-context' };
  const jaOf = { agentic: 'エージェント設計', tools: 'ツールと MCP', code: 'Claude Code', prompt: 'プロンプト設計', context: 'コンテキスト管理' };
  Object.entries(dirOf).forEach(([key, dir]) => {
    const n = FILES.filter(f => f.startsWith(dir + '/')).reduce((a, f) => {
      const k = (fs.readFileSync(path.join(ROOT, f), 'utf8').match(/data-quiz="([^"]+)"/) || [])[1];
      return a + (k && QUIZ[k] ? QUIZ[k].length : 0);
    }, 0);
    const m = md.match(new RegExp('\\| \\d+ ' + jaOf[key] + ' \\| \\d+% \\| (\\d+) \\|'));
    if (!m) { bad(`CLAUDE.md の按分表に「${jaOf[key]}」の行がない`); mdNg++; return; }
    mdN++;
    if (+m[1] !== n) { bad(`CLAUDE.md の按分表「${jaOf[key]}」が ${m[1]}問、実際は ${n}問`); mdNg++; }
    const expect = domainItems(key) * (EXAM.items === 60 ? 100 / EXAM.items : 1);
    if (n !== Math.round(BP_DOM[key].weight * 100)) {
      bad(`設問の按分が崩れている ── ${jaOf[key]} は ${n}問、比率どおりなら ${Math.round(BP_DOM[key].weight * 100)}問（§7 #40）`); mdNg++;
    }
  });
}
if (!mdNg) console.log(`  ✓ CLAUDE.md の数字 ${mdN} 件すべて実物と一致（項数・図・コード・設問・按分）`);

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
