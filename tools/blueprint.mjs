/* =========================================================
   ブループリント ─ 公式 Exam Guide 由来の事実は、すべてここが出所。

   **このファイル以外に、公式由来の数字や語を書かない。**
   問数・帯の幅・シナリオ別の本数は、ここの値から計算して出す
   （手で書くと、比率を変えたときに図の中で数字が矛盾する ── §7 #60）。

   改訂されたら：
     1. GUIDE.url から PDF を取り直す（WebFetch → Read の pages=）
     2. 「6. Detailed Objectives by Domain」と TASKS を突き合わせて直す
     3. ./tools/x check が落ちたところだけ、本文を追う
   ========================================================= */

/** 版そのもの。改訂に気づくための記録 */
export const GUIDE = {
  version:   "1.0",
  effective: "July 2026",
  code:      "CCAR-F",
  url:       "https://everpath-course-content.s3-accelerate.amazonaws.com/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1783542750/Claude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf",
};

/** 3. Exam Details at a Glance */
export const EXAM = {
  items:           60,
  minutes:         120,
  pass:            720,
  scaleMin:        100,
  scaleMax:        1000,
  scenariosTotal:  6,
  scenariosShown:  4,
  fee:             125,          // USD
  validityMonths:  12,           // 認定の有効期間。期限内なら無料の更新試験
  retakeWaitDays:  [14, 30, 90], // 不合格のたびに待機が伸びる
  attemptsPerYear: 4,            // 12か月で同じ試験を受けられる回数
  cancelHours:     24,           // これを切ると受験料は戻らない
  sampleQuestions: 12,           // §9 に解説つきで載っている
  multiResponse:   true,   // 1つ選ぶ設問と、複数選ぶ設問が混じる
};

/** 4. Exam Content Outline ─ 比率だけを持つ。問数は EXAM.items から導出する */
export const DOMAINS = {
  agentic: { n: 1, en: "Agentic Architecture & Orchestration",  weight: 0.27 },
  tools:   { n: 2, en: "Tool Design & MCP Integration",         weight: 0.18 },
  code:    { n: 3, en: "Claude Code Configuration & Workflows", weight: 0.20 },
  prompt:  { n: 4, en: "Prompt Engineering & Structured Output",weight: 0.20 },
  context: { n: 5, en: "Context Management & Reliability",      weight: 0.15 },
};

/** 5. Exam Scenarios ─ 6本のうち EXAM.scenariosShown 本が出る */
export const SCENARIOS = [
  { n: 1, en: "Customer Support Resolution Agent",     ja: "問い合わせ対応エージェント",   detail: "返品・請求・アカウントの曖昧な依頼を扱う。自社システムへは MCP の道具4本（<code>get_customer</code> / <code>lookup_order</code> / <code>process_refund</code> / <code>escalate_to_human</code>）で繋ぐ。<b>初回解決 80% 以上</b>を狙いつつ、いつ人に渡すかを見極める", domains: ["agentic", "tools", "context"] },
  { n: 2, en: "Code Generation with Claude Code",      ja: "Claude Code でコードを書く",   detail: "生成・リファクタリング・デバッグ・文書化に使う。カスタムのスラッシュコマンドと <code>CLAUDE.md</code> で開発の流れに組み込み、<b>plan mode と直接実行の使い分け</b>を判断する", domains: ["code", "context"] },
  { n: 3, en: "Multi-Agent Research System",           ja: "複数エージェントの調査システム", detail: "コーディネータが専門の子に委任する ── Web 検索・文書分析・統合・報告書生成。<b>出典つきの網羅的な報告</b>を作る", domains: ["agentic", "tools", "context"] },
  { n: 4, en: "Developer Productivity with Claude",    ja: "開発者向けの道具づくり",       detail: "未知のコードベースの探索、レガシーの理解、定型コードの生成、繰り返し作業の自動化。<b>組み込みツール（Read, Write, Bash, Grep, Glob）</b>と MCP サーバを使う", domains: ["tools", "code", "agentic"] },
  { n: 5, en: "Claude Code for Continuous Integration",ja: "CI に組み込む",                detail: "CI/CD の中で自動レビュー・テスト生成・PR へのフィードバックを回す。<b>実行できる指摘を出し、誤検知を減らす</b>プロンプトを設計する", domains: ["code", "prompt"] },
  { n: 6, en: "Structured Data Extraction",            ja: "書類から構造化して抜き出す",   detail: "非定型の文書から情報を抜き、<b>JSON スキーマで検証</b>して高い精度を保つ。例外をうまく扱い、下流の仕組みに繋ぐ", domains: ["prompt", "context"] },
];

/** 7. How to Prepare ─ 公式が勧める準備。sections はこの教材の対応節 */
export const PREPARE = [
  { ja: "Agent SDK でエージェントを1つ作る",
    detail: "ツール呼び出し・エラー処理・セッション管理まで通したループ。子を起こして文脈を渡すところまでやる",
    sections: ["loop", "stop", "seq", "real", "spawn", "session"] },
  { ja: "実際のプロジェクトで Claude Code を設定する",
    detail: "CLAUDE.md の階層、<code>.claude/rules/</code> のパス固有ルール、frontmatter つきのスキル（<code>context: fork</code>・<code>allowed-tools</code>）、MCP サーバを1つ以上つなぐ",
    sections: ["claudemd", "import", "rules", "cmdskill", "mcp"] },
  { ja: "MCP ツールを設計して、試す",
    detail: "似た道具を書き分ける説明文、種別と再試行可否つきのエラー応答。<b>曖昧な依頼を投げて、狙った道具が選ばれるか確かめる</b>",
    sections: ["anatomy", "grain", "error"] },
  { ja: "構造化抽出の仕組みを1本通す",
    detail: "<code>tool_use</code> ＋ JSON スキーマ、検証と再試行の輪、任意（null 可）の項目、Message Batches API でのバッチ処理",
    sections: ["struct", "verify", "batch"] },
  { ja: "プロンプトの手を練習する",
    detail: "曖昧な場面の few-shot、誤検知を減らす明示的な基準、大きなレビューを多段に割る形",
    sections: ["criteria", "fewshot", "multi"] },
  { ja: "文脈管理の型を身につける",
    detail: "長い返り値から事実を抜く、長丁場の作業メモ、窓を保つための子への委任",
    sections: ["compact", "sub", "shape"] },
  { ja: "人に渡す判断を見直す",
    detail: "規約の穴・利用者の要求・進まないこと ⇄ 自分で解決。確信度で振り分ける人のレビュー導線を設計する",
    sections: ["confidence", "propagate"] },
];

/** 8. Preparation Exercises ─ 手を動かす演習。domains は公式が「補強される」としたドメイン */
export const EXERCISES = [
  { n: 1, ja: "人に渡す判断つきの、複数ツール・エージェントを作る",
    objective: "ループにツールを組み込み、失敗を構造で返し、人へ渡す形まで通す",
    steps: [
      "説明文を書き分けた MCP ツールを3〜4本定義する。<b>うち2本は似た機能</b>にして、取り違えないか試す",
      "<code>stop_reason</code> を見てループを回す。<code>tool_use</code> と <code>end_turn</code> の両方を正しく扱う",
      "<code>errorCategory</code>（一時的／検証／権限）と <code>isRetryable</code>、読める説明を返す。種別ごとに扱いが変わるか確かめる",
      "業務規則（一定額を超える返金など）を止めるフックを入れ、人へ回す道に差し替える",
      "用件が複数ある依頼を投げ、<b>分けて調べ、1つにまとめて返す</b>か確かめる",
    ],
    domains: ["agentic", "tools", "context"] },
  { n: 2, ja: "チーム開発向けに Claude Code を設定する",
    objective: "CLAUDE.md の階層・コマンド・パス固有ルール・MCP を、複数人の前提で組む",
    steps: [
      "プロジェクトの <code>CLAUDE.md</code> に共通の規約を書き、全員に効くことを確かめる",
      "<code>.claude/rules/</code> に <code>paths</code> つきのルールを作り、該当ファイルを開いたときだけ載ることを確かめる",
      "<code>.claude/skills/</code> に <code>context: fork</code> と <code>allowed-tools</code> つきのスキルを作り、本体の会話が汚れないことを確かめる",
      "<code>.mcp.json</code> に環境変数の展開つきでサーバを設定し、個人用を <code>~/.claude.json</code> に足して、両方見えることを確かめる",
      "難しさの違う3つの作業で plan mode と直接実行を比べ、<b>どこから plan mode が効くか</b>を見る",
    ],
    domains: ["code", "tools"] },
  { n: 3, ja: "構造化抽出の仕組みを作る",
    objective: "スキーマ設計・検証と再試行・バッチ・人のレビュー導線を、ひと続きで組む",
    steps: [
      "必須と任意、<code>enum</code>（「その他」＋詳細）、null 可の項目を持つスキーマを定義し、<b>無い項目を作らずに null で返す</b>か確かめる",
      "検証に落ちたら、元の文書・失敗した出力・具体的な指摘を添えて投げ直す。<b>直る失敗と直らない失敗</b>を数える",
      "書式の違う文書の few-shot を足して、扱いが安定するか見る",
      "100件をバッチで投げ、<code>custom_id</code> で失敗を拾い、直して投げ直す。<b>締め切りから間隔を逆算する</b>",
      "項目ごとの確信度を出させ、低いものを人へ回す。<b>書類種別・項目ごとに精度を見る</b>",
    ],
    domains: ["prompt", "context"] },
  { n: 4, ja: "複数エージェントの調査を組んで、壊れ方を見る",
    objective: "委任・文脈の受け渡し・失敗の伝播・出典を保った統合を、実際に壊しながら確かめる",
    steps: [
      "親から子を2体以上起こす。<b>親に子を起こす道具を渡し</b>、子には結果を指示の中で直接渡す",
      "1つの応答に複数の呼び出しを入れて並列に起こし、<b>順に起こした場合と待ち時間を比べる</b>",
      "子の返す形を「主張・根拠の引用・出典・日付」に分け、統合の子が<b>出典を保つ</b>か確かめる",
      "子を1体わざとタイムアウトさせ、親に<b>失敗の種類・試したこと・途中まで得たもの</b>が届くか、そのまま先へ進めるか確かめる",
      "食い違う数字を持つ資料を2つ与え、<b>片方を選ばずに両方を出典つきで残す</b>か確かめる",
    ],
    domains: ["agentic", "tools", "context"] },
];

/** 17. Appendix ─ 出題範囲。**出るものと、出ないものの公式リスト。**
 *  out は「試験に出ない」と明記されたもの。**厚く教えると、読む時間を無駄に使う。**
 *  allow は「触れてよい節の数」── 0 なら一切書かない、1 なら1節で「あることを知る」まで。 */
export const SCOPE = {
  in: [
    "Agentic loop implementation: control flow based on stop_reason, tool result handling, loop termination conditions",
    "Multi-agent orchestration: coordinator-subagent patterns, task decomposition, parallel subagent execution, iterative refinement loops",
    "Subagent context management: explicit context passing, structured state persistence, crash recovery using manifests",
    "Tool interface design: writing effective tool descriptions, splitting vs consolidating tools, tool naming to reduce ambiguity",
    "MCP tool and resource design: resources for content catalogs, tools for actions, description quality for adoption",
    "MCP server configuration: project vs user scope, environment variable expansion, multi-server simultaneous access",
    "Error handling and propagation: structured error responses, transient vs business vs permission errors, local recovery before escalation",
    "Escalation decision-making: explicit criteria, honoring customer preferences, policy gap identification",
    "CLAUDE.md configuration: hierarchy (user/project/directory), @import patterns, .claude/rules/ with glob patterns",
    "Custom commands and skills: project vs user scope, context: fork, allowed-tools, argument-hint frontmatter",
    "Plan mode vs direct execution: complexity assessment, architectural decisions, single-file changes",
    "Iterative refinement: input/output examples, test-driven iteration, interview pattern, sequential vs parallel issue resolution",
    "Structured output via tool_use: schema design, tool_choice configuration, nullable fields to prevent hallucination",
    "Few-shot prompting: ambiguous scenario targeting, format consistency, false positive reduction",
    "Batch processing: Message Batches API appropriateness, latency tolerance assessment, failure handling by custom_id",
    "Context window optimization: trimming verbose tool outputs, structured fact extraction, position-aware input ordering",
    "Human review workflows: confidence calibration, stratified sampling, accuracy segmentation by document type and field",
    "Information provenance: claim-source mappings, temporal data handling, conflict annotation, coverage gap reporting",
  ],
  out: [
    { en: "Streaming API implementation or server-sent events", re: "stream: true|server-sent|message_delta|thinking_delta", allow: 2 },
    { en: "Prompt caching implementation details (beyond knowing it exists)", re: "cache_control|cache_read_input_tokens|cache_creation", allow: 1 },
    { en: "Token counting algorithms or tokenization specifics", re: "トークナイザ", allow: 1 },
    { en: "Computer use (browser automation, desktop interaction)", re: "computer use|ブラウザ操作|デスクトップ操作", allow: 0 },
    { en: "Vision/image analysis capabilities", re: "画像の解析|vision", allow: 0 },
    { en: "Fine-tuning Claude models or training custom models", re: "ファインチューニング|fine-tun|再学習", allow: 0 },
    { en: "Claude API authentication, billing, or account management", re: "APIキーの発行|課金プラン|請求先", allow: 0 },
    { en: "Rate limiting, quotas, or API pricing calculations", re: "レート制限|クォータ|単価を計算", allow: 0 },
    { en: "Embedding models or vector database implementation details", re: "埋め込みモデル|ベクトル(検索|DB|データベース)", allow: 0 },
    { en: "Constitutional AI, RLHF, or safety training methodologies", re: "RLHF|Constitutional", allow: 0 },
    { en: "Deploying or hosting MCP servers", re: "MCP サーバを(立て|デプロイ|ホスティング)", allow: 0 },
  ],
};

/** 9. Sample Questions ─ 公式が公開している解説つきの例題12問。
 *  **設問文・選択肢・解説の訳は持たない。** 公式の練習問題そのものなので、訳して載せない
 *  （§9 は "drawn from the practice test" と明記している）。ここに持つのは
 *  「何を問うているか」「誤答がどの型か」「どの節に戻ればよいか」だけ。
 *
 *  TRAPS は、12問36個の誤答を**公式の解説の言葉で**分類したもの。36個すべてがこの6つに入る。
 *  **本番60問の誤答も同じ作られ方をしている**ので、12問だけの話ではない。
 *  件数は SAMPLES から導出する（ここに書かない ── §7 #66）。 */
export const TRAPS = {
  fact: { ja: "事実で消える",
          sign: "存在しない機能・置き場所の誤り・仕様の誤解",
          why: "知っていれば読んだ瞬間に消える。<b>考える前に、まずこれを外す</b>",
          en: "describes a configuration mechanism that doesn't exist" },
  big:  { ja: "手が大きすぎる",
          sign: "分類器・学習・ルーティング層・上位モデル・道具の統合",
          why: "<b>まだ試していない小さい手が残っている</b>",
          en: "over-engineered, requiring labeled data and ML infrastructure when prompt optimization hasn't been tried" },
  ask:  { ja: "頼んで守らせる",
          sign: "<code>system</code> に「必ず〜」と書く／例を足す／推論に任せる",
          why: "外せない条件は、<b>頼むのではなく機械で止める</b>",
          en: "rely on probabilistic LLM compliance, which is insufficient when errors have financial consequences" },
  bet:  { ja: "運任せに賭ける",
          sign: "「進めれば見えてくる」「たいてい速い」「あとで切り替える」",
          why: "保証のないものを、<b>保証が要るところに使っている</b>",
          en: "ignores that the complexity is already stated in the requirements" },
  far:  { ja: "原因が遠い",
          sign: "受け取った側を直す／症状の出た場所を直す／別の問題を解く",
          why: "壊れているのは<b>渡す前</b>。下流は指示どおり動いている",
          en: "incorrectly blame downstream agents that are working correctly within their assigned scope" },
  duck: { ja: "逃がす",
          sign: "握りつぶす／全体を止める／人の運用でしのぐ",
          why: "その場は収まるが、<b>仕組みは何も良くなっていない</b>",
          en: "shifts burden to developers without improving the system" },
};

/** 12問。sc は SCENARIOS の n、sections は戻り先の節 id、traps は誤答3つの型。
 *  §9 が扱うのは6シナリオ中4本（開発者向けの道具・構造化抽出には例題がない）。 */
export const SAMPLES = [
  { n:  1, sc: 1, ja: "返金の前に、本人確認を必ず通させる",        sections: ["hooks"],             traps: ["ask", "ask", "big"] },
  { n:  2, sc: 1, ja: "似た2つの道具の取り違えを減らす最初の一手",  sections: ["anatomy", "grain"],  traps: ["far", "big", "big"] },
  { n:  3, sc: 1, ja: "簡単な案件を人に回してしまう",              sections: ["confidence"],        traps: ["ask", "big", "far"] },
  { n:  4, sc: 2, ja: "全員に配るコマンドの置き場所",              sections: ["cmdskill"],          traps: ["fact", "fact", "fact"] },
  { n:  5, sc: 2, ja: "数十ファイルの構造変更をどう始めるか",      sections: ["plan"],              traps: ["bet", "bet", "bet"] },
  { n:  6, sc: 2, ja: "領域ごとに違う規約を自動で当てる",          sections: ["rules"],             traps: ["ask", "ask", "fact"] },
  { n:  7, sc: 3, ja: "子は全部成功なのに、報告が偏っている",      sections: ["parent"],            traps: ["far", "far", "far"] },
  { n:  8, sc: 3, ja: "子のタイムアウトを親へどう返すか",          sections: ["propagate", "error"],traps: ["duck", "duck", "duck"] },
  { n:  9, sc: 3, ja: "裏取りの往復で遅延が増えている",            sections: ["distribute"],        traps: ["bet", "big", "bet"] },
  { n: 10, sc: 5, ja: "CI で入力待ちのまま止まる",                 sections: ["ci"],                traps: ["fact", "fact", "fact"] },
  { n: 11, sc: 5, ja: "2つの処理をバッチに寄せるべきか",           sections: ["batch"],             traps: ["bet", "fact", "big"] },
  { n: 12, sc: 5, ja: "14ファイルの PR で指摘がばらつく",          sections: ["multi", "chain"],    traps: ["duck", "big", "bet"] },
];

/** 17. Appendix ─ Technologies and Concepts。**公式の英語をそのまま写す**（訳さない）。
 *  設問はこの語彙で書かれるので、日本語で覚えた中身を英語へ戻すときの出所になる。 */
export const TECH = [
  { en: "Claude Agent SDK", detail: "agent definitions, agentic loops, stop_reason handling, hooks (PostToolUse, tool call interception), subagent spawning via Task tool, allowedTools configuration" },
  { en: "Model Context Protocol (MCP)", detail: "MCP servers, MCP tools, MCP resources, isError flag, tool descriptions, tool distribution, .mcp.json configuration, environment variable expansion" },
  { en: "Claude Code", detail: "CLAUDE.md configuration hierarchy (user/project/directory), .claude/rules/ with YAML frontmatter path-scoping, .claude/commands/ for slash commands, .claude/skills/ with SKILL.md frontmatter (context: fork, allowed-tools, argument-hint), plan mode, direct execution, /memory command, /compact, --resume, fork_session, Explore subagent" },
  { en: "Claude Code CLI", detail: "-p / --print flag for non-interactive mode, --output-format json, --json-schema for structured CI output" },
  { en: "Claude API", detail: "tool_use with JSON schemas, tool_choice options (\"auto\", \"any\", forced tool selection), stop_reason values (\"tool_use\", \"end_turn\"), max_tokens, system prompts" },
  { en: "Message Batches API", detail: "50% cost savings, up to 24-hour processing window, custom_id for request/response correlation, polling for completion, no multi-turn tool calling support" },
  { en: "JSON Schema", detail: "required vs optional fields, enum types, nullable fields, \"other\" + detail string patterns, strict mode for syntax error elimination" },
  { en: "Pydantic", detail: "schema validation, semantic validation errors, validation-retry loops" },
  { en: "Built-in tools", detail: "Read, Write, Edit, Bash, Grep, Glob — their purposes and selection criteria" },
  { en: "Few-shot prompting", detail: "targeted examples for ambiguous scenarios, format demonstration, generalization to novel patterns" },
  { en: "Prompt chaining", detail: "sequential task decomposition into focused passes" },
  { en: "Context window management", detail: "token budgets, progressive summarization, lost-in-the-middle effects, context extraction, scratchpad files" },
  { en: "Session management", detail: "session resumption, fork_session, named sessions, session context isolation" },
  { en: "Confidence scoring", detail: "field-level confidence, calibration with labeled validation sets, stratified sampling for error rate measurement" },
];

/** 9. Sample Questions の設問文から抜いた、**正解を決める限定語**。
 *  訳ではなく「何を要求しているか」を書く ── ここを取り違えると、
 *  妥当な選択肢でも誤答になる（Q2 の D がそれ）。 */
export const QUALIFIERS = [
  { en: "most effective <b>first step</b>", ja: "まず打つ一手", note: "<b>大きい手は first step ではない</b>。妥当な設計でも、最初の一手としては重すぎると誤答になる" },
  { en: "<b>most maintainable</b> way", ja: "いちばん保ちやすいやり方", note: "軸は保守しやすさ。速さでも安さでも、動くかどうかでもない" },
  { en: "most likely <b>root cause</b>", ja: "いちばんありそうな根本原因", note: "症状が出た場所ではなく、<b>壊れている場所</b>を答える" },
  { en: "How should you <b>evaluate this proposal</b>", ja: "この提案をどう評価するか", note: "採否そのものではなく、<b>評価の仕方</b>を問うている" },
  { en: "<b>best enables</b> intelligent recovery", ja: "立て直しをいちばん可能にするのは", note: "手段ではなく<b>その後に何ができるようになるか</b>で選ぶ" },
  { en: "What change would <b>most effectively address</b>", ja: "いちばん効く変更は", note: "効くかどうか。<b>正しいかどうかではない</b> ── 正しいが効かない選択肢が混ざる" },
];

/** この教材の日本語 ⇄ 公式の英語。
 *  **英語は必ず原文（TASKS の name ／ TECH ／ SCOPE）から取る。** 私が英語を作らない。
 *  check.mjs 5u が、ここの英語が原文のどこにも無ければ落とす。
 *  d は所属ドメイン（'basics' | 'agentic' | 'tools' | 'code' | 'prompt' | 'context'）。 */
export const GLOSSARY = [
  { d: "basics", en: "context window",                 ja: "窓（会話に入る量の上限）" },
  { d: "basics", en: "token budgets",                  ja: "窓の割り当て" },
  { d: "basics", en: "lost-in-the-middle effects",     ja: "中ほどの読み落とし" },
  { d: "basics", en: "progressive summarization",      ja: "段階的な要約" },
  { d: "basics", en: "scratchpad files",               ja: "作業メモのファイル" },

  { d: "agentic", en: "agentic loop",                  ja: "エージェントのループ" },
  { d: "agentic", en: "stop_reason handling",          ja: "止まった理由の扱い" },
  { d: "agentic", en: "loop termination conditions",   ja: "打ち切りの条件" },
  { d: "agentic", en: "coordinator-subagent patterns", ja: "親子の形" },
  { d: "agentic", en: "task decomposition",            ja: "仕事の分け方" },
  { d: "agentic", en: "parallel subagent execution",   ja: "子の並列実行" },
  { d: "agentic", en: "iterative refinement loops",    ja: "繰り返して寄せる輪" },
  { d: "agentic", en: "subagent spawning",             ja: "子の起動" },
  { d: "agentic", en: "explicit context passing",      ja: "前提の明示的な受け渡し" },
  { d: "agentic", en: "structured state persistence",  ja: "状態の構造化された保存" },
  { d: "agentic", en: "crash recovery using manifests",ja: "落ちたあとの復帰" },
  { d: "agentic", en: "tool call interception",        ja: "ツール呼び出しへの割り込み" },

  { d: "tools", en: "tool descriptions",               ja: "ツールの説明文" },
  { d: "tools", en: "splitting vs consolidating tools",ja: "分割と統合" },
  { d: "tools", en: "tool naming to reduce ambiguity", ja: "取り違えを減らす命名" },
  { d: "tools", en: "tool distribution",               ja: "ツールの配り方" },
  { d: "tools", en: "resources for content catalogs",  ja: "読み物としての資料" },
  { d: "tools", en: "structured error responses",      ja: "構造化した失敗の応答" },
  { d: "tools", en: "transient vs business vs permission errors", ja: "一時的／業務／権限の別" },
  { d: "tools", en: "local recovery before escalation",ja: "渡す前の自力復帰" },
  { d: "tools", en: "environment variable expansion",  ja: "環境変数の展開" },

  { d: "code", en: "configuration hierarchy",          ja: "設定の階層" },
  { d: "code", en: "path-scoping",                     ja: "パスによる範囲の絞り込み" },
  { d: "code", en: "@import patterns",                 ja: "取り込みの書き方" },
  { d: "code", en: "context: fork",                    ja: "別の文脈での実行" },
  { d: "code", en: "plan mode vs direct execution",    ja: "計画してからと直接実行" },
  { d: "code", en: "non-interactive mode",             ja: "非対話の実行" },
  { d: "code", en: "input/output examples",            ja: "入出力の例" },
  { d: "code", en: "test-driven iteration",            ja: "テストを先に書く回し方" },
  { d: "code", en: "interview pattern",                ja: "聞き取り方式" },

  { d: "prompt", en: "structured output via tool_use", ja: "型での受け取り" },
  { d: "prompt", en: "nullable fields to prevent hallucination", ja: "無いものを作らせない欄" },
  { d: "prompt", en: "few-shot prompting",             ja: "例を見せる書き方" },
  { d: "prompt", en: "false positive reduction",       ja: "誤検知の削減" },
  { d: "prompt", en: "sequential task decomposition into focused passes", ja: "多段への割り方" },
  { d: "prompt", en: "validation-retry loops",         ja: "検証と差し戻しの輪" },
  { d: "prompt", en: "latency tolerance assessment",   ja: "待てる時間の見積もり" },
  { d: "prompt", en: "custom_id for request/response correlation", ja: "取り違えない対応づけ" },

  { d: "context", en: "trimming verbose tool outputs", ja: "長い返り値の切り詰め" },
  { d: "context", en: "structured fact extraction",    ja: "事実だけの抜き出し" },
  { d: "context", en: "position-aware input ordering", ja: "位置を意識した並べ方" },
  { d: "context", en: "escalation decision-making",    ja: "人へ渡す判断" },
  { d: "context", en: "policy gap identification",     ja: "規約の穴の見つけ方" },
  { d: "context", en: "confidence calibration",        ja: "確信度の較正" },
  { d: "context", en: "stratified sampling",           ja: "層化抽出（種別ごとの抜き取り）" },
  { d: "context", en: "information provenance",        ja: "出典（どこから来たか）" },
  { d: "context", en: "conflict annotation",           ja: "食い違いへの注記" },
  { d: "context", en: "coverage gap reporting",        ja: "欠けの報告" },
  { d: "context", en: "error propagation",             ja: "失敗の伝わり方" },
];

/** §6 Detailed Objectives の箇条書きのうち、TERMS の出どころになったもの（原文のまま）。
 *  §6 の箇条書きは concepts が「日本語の見出し＋日本語の正規表現」で持っているため、
 *  **英語の原文がリポジトリのどこにも無い**。TERMS の照合先として、必要な行だけ写す。 */
export const BULLETS6 = [
  // 1.6 Skills in（1つめ）
  "Selecting task decomposition patterns appropriate to the workflow: prompt chaining for predictable multi-aspect reviews, dynamic decomposition for open-ended investigation tasks",
];

/** 教材が日本語で作った「名前」と、公式の英語。
 *  本文には `<span data-en="動的分解"></span>` の目印だけを置き、
 *  reindex が「動的分解（dynamic decomposition）」に展開する。**HTML に手で書かない。**
 *
 *  対象は「教材が短い名前を作って繰り返し使い、その英語が設問に名詞として出る」語だけ。
 *  `coverage gap reporting` のような**説明の句**は覚える対象ではないので入れない ── 6-15 の対訳表で足りる。
 *  英語は原文からしか取らない（check.mjs 5x が実在と、札が1語1回だけであることを見る）。 */
export const TERMS = {
  "窓":         "context window",
  "親":         "coordinator",
  "子":         "subagent",
  "固定チェーン": "prompt chaining",
  "動的分解":    "dynamic decomposition",
  "事実ブロック": "structured fact extraction",
  "確信度":      "confidence calibration",
  "出典":       "information provenance",
};

/** 6. Detailed Objectives by Domain ─ 30タスク。
 *  name      … Task Statement の原文（訳さない。設問は英語で書かれる）
 *  sections  … この教材で対応する節の id
 *  vocab     … 本文に必ず出ていること（識別子など）
 *  concepts  … **原文の Knowledge of / Skills in の箇条書きと1対1**（全240項目）。
 *               キーの K1 / S2 は、原文での並び順。値は正規表現、配列なら全部満たすこと
 */
export const TASKS = {
  "1.1": {
    ja: "エージェントループの実装",
    name: "Design and implement agentic loops for autonomous task execution",
    sections: ["loop", "stop", "seq", "real", "broken"],
    vocab: ["stop_reason", "tool_use", "end_turn", "max_tokens", "pause_turn", "stop_sequence", "model_context_window_exceeded", "tool_result"],
    concepts: {
      ["K1 ループの一生（送る→要求→実行→返す）"]: "アプリが送る[^。]{0,60}実行[^。]{0,40}返",
      ["K2 結果を履歴に足すから次を考えられる"]: "(履歴|会話)[^。]{0,40}(末尾に足|足して|追記)",
      ["K3 モデルが決める⇄あらかじめ決めた順番"]: "誰が順番を決める",
      ["S1 tool_use なら続け、end_turn で抜ける"]: "end_turn[^。]{0,50}(抜け|終わ)",
      ["S2 往復のあいだに結果を足す"]: "tool_result[^。]{0,50}(返し|足し|返す)",
      ["S3 誤り3つ（文章で判定・上限を主停止に・本文で完了判定）"]: ["文章(で|を)[^。]{0,24}判断しません", "上限[^。]{0,60}(保険|停止条件ではな)"],
    },
  },
  "1.2": {
    ja: "コーディネータ／サブエージェント構成",
    name: "Orchestrate multi-agent systems with coordinator-subagent patterns",
    sections: ["split", "parent"],
    vocab: ["コーディネータ"],
    concepts: {
      ["K1 ハブ ─ 親が全部の通信を握る"]: "子(どうし|同士)[^。]{0,24}直接",
      ["K2 子は親の履歴を自動では引き継がない"]: "(子|サブエージェント)[^。]{0,60}(履歴|やり取り)[^。]{0,40}(引き継が|見て)",
      ["K3 親の役割 ─ 分解・委任・集約・呼ぶ子の選択"]: "親[^。]{0,60}(段取り|まとめ|集約)|全体を知っている",
      ["K4 分け方が狭すぎると取りこぼす"]: "割り当てられた範囲しか見ません|親の分け方",
      ["S1 毎回全部通さず、必要な子だけ呼ぶ"]: "(毎回|すべて)[^。]{0,60}(通す必要|通さ)",
      ["S2 重複しないよう範囲を割る"]: "(重複|かぶ|二重)[^。]{0,80}(割|分け|なら)",
      ["S3 抜けがあれば的を絞って再委任"]: "(抜け|空欄)[^。]{0,80}(投げ直|もう一度)",
      ["S4 通信を親経由にして追えるようにする"]: "親を経由|親[^。]{0,60}(経由|段取り)[^。]{0,60}(見つか|追え)",
    },
  },
  "1.3": {
    ja: "子の起動・文脈の受け渡し",
    name: "Configure subagent invocation, context passing, and spawning",
    sections: ["spawn"],
    vocab: ["disable_parallel_tool_use", "並列ツール使用", "allowedTools", "AgentDefinition", "fork_session"],
    concepts: {
      ["K1 Task ツールと allowedTools"]: "allowedTools",
      ["K2 前提は指示に明示する"]: "(前提|文脈)[^。]{0,60}(明示|指示の中|書いて渡)",
      ["K3 AgentDefinition（説明・指示・道具の制限）"]: "AgentDefinition",
      ["K4 分岐で同じ地点から別案を試す"]: "fork_session|--fork-session",
      ["S1 前の子の結果を丸ごと渡す"]: "(調べた結果|成果|前の子)[^。]{0,50}(渡す|渡し|渡さ)",
      ["S2 内容とメタデータを分けて出典を保つ"]: "(出典|出どころ|文書名|ページ番号)[^。]{0,60}(欄|分け|別に)",
      ["S3 1つの応答に複数入れて並列に起こす"]: "1つの応答[^。]{0,50}(複数|3つ|tool_use)",
      ["S4 手順ではなく目的と成果物の形を渡す"]: "成果物の形",
    },
  },
  "1.4": {
    ja: "多段の強制とハンドオフ",
    name: "Implement multi-step workflows with enforcement and handoff patterns",
    sections: ["gate"],
    vocab: ["PreToolUse", "PostToolUse"],
    concepts: {
      ["K1 仕組みで止める⇄お願いで頼む"]: "お願いではなく|(仕組み|コード)[^。]{0,60}(通れ|止め)",
      ["K2 お願いは確率なので必ず漏れる"]: "(お願い|プロンプト|指示)[^。]{0,80}(確率|漏れ|守られ)",
      ["K3 引き継ぎ票に何を書くか"]: "引き継ぎ[^。]{0,80}(欄|項目|原因|次に)",
      ["S1 前提が済むまで後続を止める"]: "関門",
      ["S2 用件を分けて並行に調べ、1通にまとめる"]: "用件[^。]{0,80}(分け|並行)",
      ["S3 会話を見られない人に渡す要約"]: "(受け取った人|渡す)[^。]{0,80}(最初から|調べ直)",
    },
  },
  "1.5": {
    ja: "hooks によるツール呼び出しの介入",
    name: "Apply Agent SDK hooks for tool call interception and data normalization",
    sections: ["intercept", "hooks"],
    vocab: ["matcher", "permissionDecision", "updatedInput", "SessionStart", "SubagentStop", "PreCompact", "exit 2", "ISO 8601"],
    concepts: {
      ["K1 PostToolUse で結果を整える"]: "PostToolUse",
      ["K2 出ていく呼び出しを止めて規則を守らせる"]: "PreToolUse[^。]{0,80}(止め|実行させ)",
      ["K3 仕組み＝決定的／お願い＝確率的"]: "(決定的|確実)[^。]{0,80}(確率|お願い)",
      ["S1 形式の正規化（Unix秒・ISO 8601・数値コード）"]: "ISO 8601",
      ["S2 規則違反を止めて別の道へ回す"]: "(超え|上限|違反)[^。]{0,60}(止め|人|別)",
      ["S3 確実さが要るならお願いでなくフック"]: "(必ず|確実)[^。]{0,80}(フック|仕組み)",
    },
  },
  "1.6": {
    ja: "タスク分解の設計",
    name: "Design task decomposition strategies for complex workflows",
    sections: ["chain"],
    vocab: ["固定チェーン", "動的分解"],
    concepts: {
      ["K1 固定チェーン⇄動的分解"]: "固定チェーン[^。]{0,60}動的分解|動的分解[^。]{0,60}固定チェーン",
      ["K2 ファイルごと→横断の2段に割る"]: "ファイル(ごと|単位)[^。]{0,60}横断|横断[^。]{0,60}ファイル(ごと|単位)",
      ["K3 分かったことに応じて次を決める"]: "(分かった|見つかった|依存)[^。]{0,60}(次|その場|書き換え)",
      ["S1 仕事に合った分け方を選ぶ"]: "毎回やることが決まっている|向く仕事",
      ["S2 注意が散るのを避ける"]: "注意が散",
      ["S3 構造把握→高影響→優先順位（適応する計画）"]: "構造を把握[^。]{0,120}優先",
    },
  },
  "1.7": {
    ja: "セッションの状態・再開・分岐",
    name: "Manage session state, resumption, and forking",
    sections: ["session"],
    vocab: ["--resume", "--continue", "--fork-session"],
    concepts: {
      ["K1 --resume で名前つき再開"]: "--resume",
      ["K2 fork_session で枝を作る"]: "fork_session|--fork-session",
      ["K3 再開時に変わったファイルを伝える"]: "再開[^。]{0,80}(変わった|変えた場所)",
      ["K4 古い結果より新規＋要約が確実"]: "(古い|軒並み)[^。]{0,80}(新規|要約)",
      ["S1 名前で再開して続きをやる"]: "続きをやる|--resume[^。]{0,60}(続き|名前)",
      ["S2 枝を切って複数案を比べる"]: "(枝|分岐)[^。]{0,80}(複数|案|比べ)",
      ["S3 再開か新規かを選ぶ基準"]: "いま読み返しても正しい|前の文脈が",
      ["S4 変わった所だけ再調査させる"]: "変えた場所だけ",
    },
  },
  "2.1": {
    ja: "ツール定義と境界の設計",
    name: "Design effective tool interfaces with clear descriptions and boundaries",
    sections: ["anatomy", "grain"],
    vocab: ["input_schema", "description"],
    concepts: {
      ["K1 説明文が選択の主な材料"]: "description[^。]{0,60}(判断|選ぶ|材料)",
      ["K2 入力形式・例・境界を書く"]: "境界|いつ呼ばない|対象外",
      ["K3 説明が重なると取り違える"]: "似(通|た)[^。]{0,40}(取り違|選べ|区別)",
      ["K4 system の語がツール選択に効く"]: "system[^。]{0,60}(ツールの選択|選ばれ方|引きずら)",
      ["S1 目的・入出力・使い分けを書き分ける"]: "いつ呼ぶか[^。]{0,60}いつ呼ばないか|何をするか[^。]{0,80}いつ呼ぶ",
      ["S2 名前と説明を直して重なりを消す"]: "✗ 何をするかだけ|(名前|呼び名)[^。]{0,60}(重な|似)",
      ["S3 汎用を用途別に割る"]: "(太すぎ|何でもできる|汎用)[^。]{0,80}(割|分け)",
      ["S4 system に紛れ込んだ語を見直す"]: "system[^。]{0,80}(疑う|見ます|入っていないか|連想)",
    },
  },
  "2.2": {
    ja: "構造化されたエラー応答",
    name: "Implement structured error responses for MCP tools",
    sections: ["error"],
    vocab: ["is_error", "errorCategory", "isRetryable"],
    concepts: {
      ["K1 isError で失敗を伝える"]: "is_error",
      ["K2 一時的・検証・業務・権限の4分類"]: "一時的[^。]{0,60}(検証|業務|権限)",
      ["K3 一律の文言だと回復できない"]: "(エラーが発生|一律|同じ文言)[^。]{0,80}(直せ|分から|何も)",
      ["K4 再試行できる／できないを返す"]: "再試行(して|する)意味|やり直して直る|isRetryable",
      ["S1 errorCategory と isRetryable を欄で返す"]: "errorCategory",
      ["S2 業務違反は説明できる文で返す"]: "(業務|規約)[^。]{0,90}(説明|利用者)",
      ["S3 子の中で回復し、無理なものだけ上げる"]: "一時的[^。]{0,80}(再試行|回復)",
      ["S4 アクセス失敗と0件を区別する"]: "(0件|ゼロ件)[^。]{0,50}(失敗|エラー|区別)",
    },
  },
  "2.3": {
    ja: "ツールの配り方と tool_choice",
    name: "Distribute tools appropriately across agents and configure tool choice",
    sections: ["distribute"],
    vocab: ["tool_choice"],
    concepts: {
      ["K1 多すぎると選択がぶれる（18 vs 4〜5）"]: "18個[^。]{0,60}(引く|選|難し)",
      ["K2 専門外の道具は誤用される"]: "専門外",
      ["K3 役割ごとに絞る／高頻度だけ横断で配る"]: "(役割|担当)[^。]{0,60}(だけ|絞|限)",
      ["K4 tool_choice の auto / any / 指定"]: "tool_choice[^。]{0,140}(auto|any)",
      ["S1 子ごとに配る範囲を絞る"]: "配る範囲",
      ["S2 汎用を制約つきに置き換える"]: "制約つき|広すぎる道具",
      ["S3 よく使う1本だけ例外的に配る"]: "1本だけ|例外的",
      ["S4 指定で特定の道具を先に呼ばせる"]: "tool_choice[^。]{0,120}(指定|先に|強制|tool)",
      ["S5 any で必ず道具を呼ばせる"]: "any[^。]{0,80}(必ず|どれか|呼ばせ)",
    },
  },
  "2.4": {
    ja: "MCP サーバの統合",
    name: "Integrate MCP servers into Claude Code and agent workflows",
    sections: ["mcp"],
    vocab: [".mcp.json", "~/.claude.json", "stdio", "resources", "prompts"],
    concepts: {
      ["K1 .mcp.json（共有）と ~/.claude.json（個人）"]: "~/\\.claude\\.json",
      ["K2 環境変数の展開で鍵を書かない"]: "環境変数",
      ["K3 繋いだ全サーバの道具が同時に見える"]: "繋いだ[^。]{0,80}(全部|すべて|同時)",
      ["K4 resources で目録を出す"]: "resources",
      ["S1 プロジェクト用は .mcp.json に置いて共有"]: "チームで共有",
      ["S2 個人用は user 側に置く"]: "(個人|自分だけ|試している)[^。]{0,80}(~/|ユーザ)",
      ["S3 説明を厚くしないと組み込みが優先される"]: "説明[^。]{0,80}(組み込み|Grep)[^。]{0,40}(負け|選ばれ)",
      ["S4 既存の公開サーバを使う"]: "(既存|公開|世の中|出来合い)[^。]{0,60}サーバ",
      ["S5 目録を出して探索の呼び出しを減らす"]: "resources[^。]{0,60}(目録|読める資料)",
    },
  },
  "2.5": {
    ja: "組み込みツールの使い分け",
    name: "Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    sections: ["builtin"],
    vocab: ["Grep", "Glob", "Read", "Write", "Edit", "Bash", "クライアントツール", "サーバツール", "web_search", "code_execution"],
    concepts: {
      ["K1 Grep は中身を探す"]: "Grep[^。]{0,60}(中身|内容|文字列)",
      ["K2 Glob は名前で探す"]: "Glob[^。]{0,60}(名前|拡張子|パターン)",
      ["K3 Read/Write は全体、Edit は一部"]: "Edit[^。]{0,60}(一部|一意)",
      ["K4 Edit が当たらないときは Read＋Write"]: "(一意|見つから)[^。]{0,80}(Read|Write)",
      ["S1 横断の検索は Grep"]: "Grep[^。]{0,90}(呼び出し|全ファイル|横断|エラーメッセージ)",
      ["S2 名前で探すのは Glob"]: "Glob[^。]{0,90}(test|拡張子|名前)",
      ["S3 Edit が使えないときの Read＋Write"]: "Read[^。]{0,40}Write",
      ["S4 全部読まず入口から追う"]: "(全部|すべて)[^。]{0,40}読ま",
      ["S5 名前を洗い出してから横断で探す"]: "(export|名前)[^。]{0,80}(洗い出|一覧|列挙)",
    },
  },
  "3.1": {
    ja: "CLAUDE.md の階層・スコープ・分割",
    name: "Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    sections: ["claudemd", "import"],
    vocab: ["CLAUDE.md", "CLAUDE.local.md", "/memory"],
    concepts: {
      ["K1 CLAUDE.md の3階層"]: "~/\\.claude/CLAUDE\\.md",
      ["K2 ユーザ階層はチームに共有されない"]: "共有されない[^。]{0,60}(チーム|書かない)",
      ["K3 @import で外部ファイルを取り込む"]: "@import",
      ["K4 .claude/rules/ という別の置き方"]: "\\.claude/rules",
      ["S1 階層の取り違えを診断する"]: "共有されない[^。]{0,60}(チーム|書かない)|(効かな|届かな)[^。]{0,60}(階層|置き場所)",
      ["S2 @import でパッケージごとに必要な分だけ"]: "@import[^。]{0,90}(パッケージ|必要|分割)",
      ["S3 大きい CLAUDE.md を rules に割る"]: "\\.claude/rules[^。]{0,90}(割|分け|topic|テーマ)|CLAUDE\\.md[^。]{0,60}\\.claude/rules",
      ["S4 /memory で読み込みを確認する"]: "/memory",
    },
  },
  "3.2": {
    ja: "スラッシュコマンドとスキル",
    name: "Create and configure custom slash commands and skills",
    sections: ["cmdskill"],
    vocab: ["SKILL.md", "allowed-tools", "argument-hint", "$ARGUMENTS", "context: fork", "YAML frontmatter"],
    concepts: {
      ["K1 コマンドの置き場所（共有⇄個人）"]: "\\.claude/commands",
      ["K2 SKILL.md と frontmatter"]: "SKILL\\.md",
      ["K3 context: fork で本体を汚さない"]: "context: fork",
      ["K4 個人用の変種を別名で作る"]: "~/\\.claude/skills",
      ["S1 プロジェクト用コマンドをチームで共有"]: "\\.claude/commands[^。]{0,120}(個人|~/)",
      ["S2 出力が長いものは context: fork で隔離"]: "context: fork[^。]{0,90}(長|汚|隔離|分け)",
      ["S3 allowed-tools で道具を絞る"]: "allowed-tools",
      ["S4 argument-hint で引数を促す"]: "argument-hint",
      ["S5 スキル⇄CLAUDE.md の選び分け"]: "(スキル|コマンド)[^。]{0,120}CLAUDE\\.md|CLAUDE\\.md[^。]{0,80}(常に|毎回|always)",
    },
  },
  "3.3": {
    ja: "パス固有ルール",
    name: "Apply path-specific rules for conditional convention loading",
    sections: ["rules"],
    vocab: [".claude/rules", "paths"],
    concepts: {
      ["K1 paths の glob で条件つき読み込み"]: "paths",
      ["K2 該当ファイルを触るときだけ読まれる"]: "(開いた|編集|触)[^。]{0,40}(そのときだけ|ときだけ)",
      ["K3 散らばったファイルには glob が向く"]: "散らばって[^。]{0,120}(glob|paths|名前)",
      ["S1 YAML frontmatter で対象パスを指定"]: "YAML frontmatter",
      ["S2 型で決まる規約を glob で当てる"]: "\\*\\*/\\*\\.test|拡張子|名前で決まる規約",
      ["S3 サブディレクトリの CLAUDE.md より glob"]: "散らばって[^。]{0,120}(glob|paths|名前)",
    },
  },
  "3.4": {
    ja: "plan mode と直接実行",
    name: "Determine when to use plan mode vs direct execution",
    sections: ["plan"],
    vocab: ["plan mode", "--permission-mode", "Explore"],
    concepts: {
      ["K1 plan mode が向く場面"]: "plan mode[^。]{0,140}(影響|未知|後戻り|大きい|方針)",
      ["K2 直接実行が向く場面"]: "直接実行[^。]{0,140}(小さ|決まって|すぐ戻せ)",
      ["K3 変更前に安全に調べられる"]: "(調べ|読む)[^。]{0,60}変更(は|が)?(でき|しない)",
      ["K4 Explore で探索を隔離する"]: "Explore",
      ["S1 影響の大きい変更は plan mode"]: "plan mode[^。]{0,140}(影響|未知|後戻り)",
      ["S2 範囲の明確な修正は直接実行"]: "直接実行[^。]{0,140}(小さ|決まって)",
      ["S3 探索の残骸を持ち込ませない"]: "Explore[^。]{0,140}(要約|残|窓)",
      ["S4 plan mode と直接実行を組み合わせる"]: "plan mode[^。]{0,90}直接実行[^。]{0,80}(組み合わ|そのあと|実装)",
    },
  },
  "3.5": {
    ja: "反復的な改善",
    name: "Apply iterative refinement techniques for progressive improvement",
    sections: ["iterate"],
    vocab: [],
    concepts: {
      ["K1 入出力の例が最も効く"]: "入出力の例",
      ["K2 テスト駆動で回す"]: "テストを先に|先にテスト|テスト駆動",
      ["K3 インタビュー方式で先に質問させる"]: "先に質問|質問させ",
      ["K4 まとめて1通か、順番か"]: "まとめて1通|1通にまとめ|順番に(直|出)",
      ["S1 例を2〜3件添える"]: "2〜3件|2〜3件",
      ["S2 先にテストを書いて失敗を渡す"]: "落ちたテストを渡|テストにしてから",
      ["S3 不慣れな領域は先に質問させる"]: "不慣れな領域",
      ["S4 境界の例を具体的なテストで示す"]: "(境界|エッジ)[^。]{0,80}(テスト|例)",
      ["S5 絡む指摘は1通、独立は順番に"]: "絡み合う[^。]{0,90}(1通|順番)",
    },
  },
  "3.6": {
    ja: "CI/CD への組み込み",
    name: "Integrate Claude Code into CI/CD pipelines",
    sections: ["ci", "settings"],
    vocab: ["--print", "--output-format", "--json-schema", "--allowedTools", "bypassPermissions", "settings.json", "permissions", "GitHub Actions"],
    concepts: {
      ["K1 -p / --print で非対話実行"]: "--print",
      ["K2 --output-format json と --json-schema"]: "--json-schema",
      ["K3 CI では CLAUDE.md が文脈を渡す"]: "CLAUDE\\.md[^。]{0,90}(CI|自動|渡)",
      ["K4 同じセッションのレビューは弱い"]: "同じセッション[^。]{0,140}(疑|見直)",
      ["S1 -p で対話待ちを止める"]: "-p[^。]{0,90}(対話|承認)",
      ["S2 json で機械的に扱える結果を出す"]: "--output-format",
      ["S3 前回の指摘を渡して重複を避ける"]: "前回の指摘",
      ["S4 既存のテストを渡して重複生成を防ぐ"]: "既存のテスト",
      ["S5 基準や資材を CLAUDE.md に書いておく"]: "CLAUDE\\.md[^。]{0,120}(規約|基準|書い)",
    },
  },
  "4.1": {
    ja: "明示的な基準による精度向上",
    name: "Design prompts with explicit criteria to improve precision and reduce false positives",
    sections: ["criteria"],
    vocab: [],
    concepts: {
      ["K1 曖昧な指示より明示的な基準"]: "(曖昧|見つけて)[^。]{0,80}基準",
      ["K2 「保守的に」では精度が上がらない"]: "保守的[^。]{0,80}(基準ではありません|効かな)",
      ["K3 誤検知が多いと信用されなくなる"]: "信用|信頼|使われなくな",
      ["S1 該当／対象外を書いて絞る"]: "該当[^。]{0,80}対象外",
      ["S2 誤検知の多い分類は一度外す"]: "一時的に(止め|外|切)|いったん外",
      ["S3 重大度の基準を具体例で決める"]: "重大度[^。]{0,30}同じ|高・中・低",
    },
  },
  "4.2": {
    ja: "few-shot",
    name: "Apply few-shot prompting to improve output consistency and quality",
    sections: ["fewshot"],
    vocab: ["few-shot"],
    concepts: {
      ["K1 few-shot は形をそろえるのに最も効く"]: "few-shot",
      ["K2 曖昧な場合の扱いを例で示す"]: "曖昧[^。]{0,60}(実物|例)",
      ["K3 例から未知のパターンへ一般化する"]: "(例に無い|初めて見る)[^。]{0,80}(当てはめ|適用)",
      ["K4 抽出での作り話を減らす"]: "無理に|でっち上げ|作り",
      ["S1 迷う場面の例を2〜4件、理由つきで"]: "(選んだ理由|なぜ)[^。]{0,80}例|例[^。]{0,80}理由",
      ["S2 出したい形を例で固定する"]: "(形式|形)[^。]{0,60}例|入力と出力を対で",
      ["S3 良い例と紛らわしい例を並べる"]: "✗|○",
      ["S4 文書の形が違っても同じ読み方をさせる"]: "(書式|構造|形)[^。]{0,90}(違|ばらつ)",
      ["S5 空欄になる項目に例を足す"]: "(空|該当なし)[^。]{0,80}(例|明示)",
    },
  },
  "4.3": {
    ja: "構造化出力の強制",
    name: "Enforce structured output using tool use and JSON schemas",
    sections: ["struct"],
    vocab: ["required", "enum", "strict"],
    concepts: {
      ["K1 tool_use ＋ JSON スキーマが最も確実"]: "input_schema|tool_use[^。]{0,80}(スキーマ|schema)",
      ["K2 tool_choice の auto / any / 指定"]: "tool_choice[^。]{0,140}(auto|any)",
      ["K3 構文は防げるが意味の誤りは防げない"]: "(構文|形)[^。]{0,90}(意味|中身|合計)",
      ["K4 required と任意（null 可）と enum"]: "required[^。]{0,140}(null|任意|省略|enum)",
      ["S1 抽出用ツールをスキーマで定義する"]: "input_schema",
      ["S2 any で必ず構造化させる"]: "any[^。]{0,90}(必ず|構造|呼ばせ)",
      ["S3 指定で特定の抽出を先に走らせる"]: "tool_choice[^。]{0,140}(指定|先に|強制|tool)",
      ["S4 任意項目にして捏造を防ぐ"]: "(任意|null)[^。]{0,90}(許す|埋め|無い)",
      ["S5 enum に「不明」「その他」を用意"]: "enum[^。]{0,140}(不明|その他|other)|(不明|その他)[^。]{0,80}enum",
      ["S6 書式のばらつきを指示で正規化する"]: "そろえ方の指示|プロンプト側に「どう直すか」",
    },
  },
  "4.4": {
    ja: "検証・再試行・フィードバック",
    name: "Implement validation, retry, and feedback loops for extraction quality",
    sections: ["verify"],
    vocab: ["detected_pattern", "Pydantic"],
    concepts: {
      ["K1 落ちた理由を付けて投げ直す"]: "(理由|指摘)[^。]{0,60}(足し|添え|付け)[^。]{0,50}(再|もう一度)",
      ["K2 情報が無いなら再試行しても無駄"]: "通らない入力",
      ["K3 detected_pattern で誤検知の傾向を見る"]: "detected_pattern",
      ["K4 意味の誤り⇄構文の誤り"]: "(構文|形)[^。]{0,90}(意味|中身)",
      ["S1 元資料・失敗した出力・指摘を渡す"]: "(差し戻し|指摘)[^。]{0,90}(添え|足し)",
      ["S2 効く再試行と効かない再試行を見分ける"]: "通らない入力|(同じ理由で落ちる)",
      ["S3 却下された指摘から傾向を出す"]: "detected_pattern",
      ["S4 合計と明細を突き合わせる"]: "(合計|総額)[^。]{0,60}(一致|突き合わ|検算)",
    },
  },
  "4.5": {
    ja: "バッチ処理",
    name: "Design efficient batch processing strategies",
    sections: ["batch"],
    vocab: ["custom_id", "Message Batches", "ポーリング"],
    concepts: {
      ["K1 Message Batches API"]: "Message Batches",
      ["K2 50%・24時間・SLA なし"]: "50\\s*%|半額|半分",
      ["K3 急がない仕事に向き、待てない仕事に向かない"]: "(急がない|待て)[^。]{0,90}(向|バッチ)",
      ["K4 custom_id で対応づける"]: "custom_id",
      ["S1 同期とバッチを用途で使い分ける"]: "同期[^。]{0,90}(バッチ|Batches)",
      ["S2 期限から投げる間隔を決める"]: "逆算",
      ["S3 失敗した分だけ投げ直す"]: "(失敗|落ちた|通らな)[^。]{0,80}(だけ|分)[^。]{0,50}(投げ|やり直|再)",
      ["S4 少量で試してから本番に流す"]: "(20〜50件|少量|先に)[^。]{0,80}流",
    },
  },
  "4.6": {
    ja: "多重・多段レビュー構成",
    name: "Design multi-instance and multi-pass review architectures",
    sections: ["multi"],
    vocab: ["multi-instance", "multi-pass"],
    concepts: {
      ["K1 自分の書いたものは自分で疑いにくい"]: "同じセッション[^。]{0,140}(疑|見直)",
      ["K2 独立した別インスタンスのほうが見つかる"]: "multi-instance|別の[^。]{0,60}(体|インスタンス)",
      ["K3 多段（ファイルごと＋横断）"]: "multi-pass",
      ["S1 生成と別の体でレビューさせる"]: "(別|もう1体)[^。]{0,90}(レビュー|見)",
      ["S2 ファイルごとの段と横断の段に割る"]: "ファイル(ごと|単位)[^。]{0,90}横断",
      ["S3 確信度を添えて回す先を決める"]: "確信度[^。]{0,120}(優先|順|回す)",
    },
  },
  "5.1": {
    ja: "長い対話での文脈の維持",
    name: "Manage conversation context to preserve critical information across long interactions",
    sections: ["compact"],
    vocab: ["事実ブロック", "lost in the middle"],
    concepts: {
      ["K1 要約で数値・日付・約束が消える"]: "(数字|数値)[^。]{0,60}(壊れ|消え)",
      ["K2 lost in the middle"]: "lost in the middle",
      ["K3 ツール結果は関連度に対して大きすぎる"]: "(ツールの結果|返り値|ログ)[^。]{0,90}(大き|長|太り|全部)",
      ["K4 履歴は毎回まるごと送る"]: "(毎回|全部)[^。]{0,40}(送り直|まるごと)",
      ["S1 事実ブロックを毎回そのまま入れる"]: "事実ブロック",
      ["S2 案件ごとの構造化した事実を別に持つ"]: "(識別子|注文番号|金額)[^。]{0,90}(欄|そのまま|残)",
      ["S3 必要な項目だけに削ってから載せる"]: "(必要な|要る)[^。]{0,40}(行|項目|だけ)[^。]{0,50}(返|削|絞)",
      ["S4 要点を先頭に置き、見出しで区切る"]: "(先頭|前|冒頭)[^。]{0,60}(置|入れ)",
      ["S5 子にメタデータ込みで返させる"]: "(出典|日付|どこ)[^。]{0,90}(欄|添え|含め)",
      ["S6 下流の窓が狭いなら構造化して返す"]: "(要約|構造)[^。]{0,90}(だけ|返)",
    },
  },
  "5.2": {
    ja: "エスカレーションと曖昧さの解消",
    name: "Design effective escalation and ambiguity resolution patterns",
    sections: ["confidence"],
    vocab: ["エスカレーション"],
    concepts: {
      ["K1 人に渡す3つの引き金"]: "エスカレーション|人に(渡|回)",
      ["K2 すぐ渡す⇄まず解決を試みる"]: "(すぐ|即)[^。]{0,90}(渡|回)",
      ["K3 感情や自信の数値は引き金にしない"]: "(感情|語気|怒)[^。]{0,90}引き金|自信の数値",
      ["K4 候補が複数なら聞き返す"]: "(複数|何件も|絞れな)[^。]{0,90}(聞き返|確認|尋ね)",
      ["S1 引き金を例つきで system に書く"]: "(引き金|エスカレーション)[^。]{0,120}(明示|書|条件)",
      ["S2 人を求められたらすぐ渡す"]: "人と話したい",
      ["S3 解ける範囲なら解いてから判断する"]: "(丁寧に答えれば|解決|自分で)[^。]{0,90}(済む|答え)",
      ["S4 規約に定めがないときは渡す"]: "定めがない|規約や手順",
      ["S5 候補が複数なら識別子を聞く"]: "(複数|何件も|絞れな)[^。]{0,90}(聞き返|確認|尋ね)",
    },
  },
  "5.3": {
    ja: "複数エージェント間のエラー伝播",
    name: "Implement error propagation strategies across multi-agent systems",
    sections: ["propagate"],
    vocab: [],
    concepts: {
      ["K1 失敗の種類・試したこと・部分結果"]: "部分|途中まで",
      ["K2 アクセス失敗と0件の区別"]: "(0件|ゼロ件)[^。]{0,50}(失敗|エラー|区別)",
      ["K3 一律の失敗表示は文脈を隠す"]: "(一律|同じ|generic|エラーが発生)[^。]{0,90}(隠|分から)",
      ["K4 握りつぶす／全体を止めるは両方誤り"]: "握りつぶ|全体を止め",
      ["S1 構造化したエラー文脈を返す"]: "(できなかったこと|失敗)[^。]{0,90}(欄|理由)",
      ["S2 アクセス失敗と0件を分けて報告する"]: "(0件|ゼロ件)[^。]{0,50}(失敗|エラー|区別)",
      ["S3 子は一時的な失敗だけ自分で直す"]: "一時的[^。]{0,80}(再試行|回復)",
      ["S4 どこが手薄かを注記する"]: "欠けて|足りな|手薄|確かさ",
    },
  },
  "5.4": {
    ja: "大規模コードベース探索での文脈管理",
    name: "Manage context effectively in large codebase exploration",
    sections: ["sub", "shape"],
    vocab: ["サブエージェント", "/compact", "manifest"],
    concepts: {
      ["K1 長く続けると答えがぼやける"]: "(長く|長時間|続けている)[^。]{0,50}(ぼやけ|曖昧|一般的な話)",
      ["K2 作業メモで窓の外に残す"]: "作業メモ|メモをファイル|scratchpad",
      ["K3 子に出して要約だけ持ち帰る"]: "要約[^。]{0,40}(だけ|のみ)[^。]{0,40}(持ち帰|返)",
      ["K4 落ちても再開できる形（状態の書き出し）"]: "(落ちても|中断しても|途中で止まっても)[^。]{0,40}(再開|やり直)",
      ["S1 具体的な問いを子に投げる"]: "何を調べてほしい",
      ["S2 作業メモを見返させて劣化に抗う"]: "メモを見て",
      ["S3 段ごとに要約して次の子へ渡す"]: "(段|フェーズ|次)[^。]{0,80}要約[^。]{0,80}(渡|入れ|次)",
      ["S4 状態を書き出して再開時に読み直す"]: "(状態を書き出|決まった場所)[^。]{0,90}(再開|読み)",
      ["S5 /compact で溜まった履歴を圧縮する"]: "/compact",
    },
  },
  "5.5": {
    ja: "人のレビュー導線と確信度の校正",
    name: "Design human review workflows and confidence calibration",
    sections: ["confidence"],
    vocab: ["確信度"],
    concepts: {
      ["K1 全体の正解率は不出来を隠す"]: "(全体|平均)[^。]{0,60}(正解率|精度)[^。]{0,60}隠",
      ["K2 層化抽出で誤りの率を測る"]: "(層化|種別ごと|項目ごと)[^。]{0,60}抜き取",
      ["K3 検証セットでしきい値を校正"]: "検証セット",
      ["K4 種別・項目ごとに確かめてから減らす"]: "種別ごと[^。]{0,60}項目ごと",
      ["S1 高確信のものも抜き取って測り続ける"]: "抜き取",
      ["S2 種別ごと・項目ごとに精度を見る"]: "種別ごと[^。]{0,60}項目ごと",
      ["S3 確信度を出させ、しきい値を校正する"]: "検証セット[^。]{0,90}(校正|しきい値)",
      ["S4 低いものから人に回す"]: "(低い|確信度)[^。]{0,90}(順|優先|先に)",
    },
  },
  "5.6": {
    ja: "出典の保持と不確実性の扱い",
    name: "Preserve information provenance and handle uncertainty in multi-source synthesis",
    sections: ["observe"],
    vocab: ["出典"],
    concepts: {
      ["K1 要約で出典が失われる"]: "(要約|まとめ)[^。]{0,90}(出典|どこから|溶け)",
      ["K2 主張と出典の対応を保って統合する"]: "(出典|出どころ)[^。]{0,60}(対応|欄|保)",
      ["K3 食い違う値は選ばず注記する"]: "(割れ|食い違)[^。]{0,90}両方",
      ["K4 日付を持たせて時点の違いを誤解しない"]: "(公表日|取得日)|日付[^。]{0,90}(矛盾|時点)",
      ["S1 子に出典つきで返させる"]: "(出典|出どころ)[^。]{0,60}(欄|分け|別に)",
      ["S2 確かなものと割れているものを分けて書く"]: "(割れ|食い違)[^。]{0,90}(両方|注記)",
      ["S3 矛盾は残したまま上へ渡す"]: "どちらを採るか",
      ["S4 日付を欄で持たせる"]: "(公表日|取得日)",
      ["S5 内容の型に合った出し方をする"]: "数字は表|表、経緯|箇条書き",
    },
  },
};

/** 導出 ─ ここから先は計算。手で書かない */
export const domainItems = (key) => Math.round(EXAM.items * DOMAINS[key].weight);
export const scenarioCount = (key) => SCENARIOS.filter(s => s.domains.includes(key)).length;
