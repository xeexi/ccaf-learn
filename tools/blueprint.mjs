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
  { n: 1, en: "Customer Support Resolution Agent",     ja: "問い合わせ対応エージェント",   domains: ["agentic", "tools", "context"] },
  { n: 2, en: "Code Generation with Claude Code",      ja: "Claude Code でコードを書く",   domains: ["code", "context"] },
  { n: 3, en: "Multi-Agent Research System",           ja: "複数エージェントの調査システム", domains: ["agentic", "tools", "context"] },
  { n: 4, en: "Developer Productivity with Claude",    ja: "開発者向けの道具づくり",       domains: ["tools", "code", "agentic"] },
  { n: 5, en: "Claude Code for Continuous Integration",ja: "CI に組み込む",                domains: ["code", "prompt"] },
  { n: 6, en: "Structured Data Extraction",            ja: "書類から構造化して抜き出す",   domains: ["prompt", "context"] },
];

/** 6. Detailed Objectives by Domain ─ 30タスク。
 *  name      … Task Statement の原文（訳さない。設問は英語で書かれる）
 *  sections  … この教材で対応する節の id
 *  vocab     … 本文に必ず出ていること（識別子など）
 *  concepts  … 語では捕まえられない項目。原文の箇条書きと1対1
 */
export const TASKS = {
  "1.1": {
    ja: "エージェントループの実装",
    name: "Design and implement agentic loops for autonomous task execution",
    sections: ["loop", "stop", "seq", "real", "broken"],
    vocab: ["stop_reason", "tool_use", "end_turn", "max_tokens", "pause_turn", "stop_sequence", "model_context_window_exceeded", "tool_result"],
    concepts: {
      ["ループの一生（送る→stop_reason→実行→返す）"]: "stop_reason[^。]{0,80}(分岐|見て|判断)|tool_use[^。]{0,60}返し",
      ["結果を履歴に足すから次を考えられる"]: "(履歴|会話)[^。]{0,40}(足し|追記|末尾)",
      ["モデルが決める⇄あらかじめ決めた手順"]: "(固定チェーン|決まった順|コードで並べ)[^。]{0,80}(モデル|その場)",
      ["tool_use で続き end_turn で抜ける"]: "end_turn[^。]{0,50}(抜け|終わ)",
      ["誤り：文章で終わりを判定"]: "文章(で|を)[^。]{0,24}判断しません|自然文[^。]{0,20}判定",
      ["誤り：回数上限を主な停止手段にする"]: "上限[^。]{0,60}(保険|停止条件ではな|主な止め方)",
    },
  },
  "1.2": {
    ja: "コーディネータ／サブエージェント構成",
    name: "Orchestrate multi-agent systems with coordinator-subagent patterns",
    sections: ["split", "parent"],
    vocab: ["コーディネータ"],
    concepts: {
      ["ハブ＝親が全部の通信を握る"]: "子(どうし|同士)[^。]{0,24}直接",
      ["子は親の履歴を引き継がない"]: "(子|サブエージェント)[^。]{0,50}(履歴|やり取り)[^。]{0,30}(引き継が|見て)",
      ["親の役割＝分解・委任・集約・呼ぶ子の選択"]: "(親|コーディネータ)[^。]{0,60}(まとめ|集約|割り振|選ぶ|決める)",
      ["分け方が細かすぎると取りこぼす"]: "(細かく|狭く)[^。]{0,60}(抜け|取りこぼ|漏れ)",
      ["毎回全部通さず、必要な子だけ呼ぶ"]: "(毎回|すべて)[^。]{0,60}(通す必要|通さ)",
      ["重複しないように範囲を割る"]: "(重複|かぶら)[^。]{0,60}(割り|分け)",
      ["足りなければ親がやり直させる"]: "(抜け|空欄)[^。]{0,80}(投げ直|もう一度)",
    },
  },
  "1.3": {
    ja: "子の起動・文脈の受け渡し",
    name: "Configure subagent invocation, context passing, and spawning",
    sections: ["spawn"],
    vocab: ["disable_parallel_tool_use", "並列ツール使用", "allowedTools", "AgentDefinition", "fork_session"],
    concepts: {
      ["Task ツールと allowedTools"]: "allowedTools",
      ["前提は指示に明示"]: "(前提|文脈)[^。]{0,50}(明示|指示の中|書いて渡)",
      ["子の定義（説明・指示・道具の制限）"]: "AgentDefinition|定義ファイル[^。]{0,60}(説明|指示|ツール)",
      ["分岐（fork）"]: "fork_session|--fork-session",
      ["前の子の結果を丸ごと渡す"]: "(調べた結果|前の子|成果)[^。]{0,60}渡",
      ["内容とメタデータを分ける"]: "(出典|出どころ|文書名|ページ番号)[^。]{0,60}(欄|分け|別に)",
      ["1応答に複数の呼び出しで並列"]: "1つの応答[^。]{0,40}(複数|3つ|tool_use)",
      ["手順ではなく目的と基準を渡す"]: "(目的|ゴール|基準)[^。]{0,60}(手順|やり方|step)|成果物の形",
    },
  },
  "1.4": {
    ja: "多段の強制とハンドオフ",
    name: "Implement multi-step workflows with enforcement and handoff patterns",
    sections: ["gate"],
    vocab: ["PreToolUse", "PostToolUse"],
    concepts: {
      ["仕組みで止める⇄お願いで頼む"]: "(仕組み|コード|関門)[^。]{0,60}(お願い|プロンプト|頼む)",
      ["お願いは確率なので必ず漏れる"]: "(お願い|プロンプト|指示)[^。]{0,60}(確率|漏れ|守られ)",
      ["引き継ぎ票に何を書くか"]: "引き継ぎ[^。]{0,80}(欄|項目|何が|原因|次に)",
      ["前提が済むまで後続を止める"]: "関門|前提[^。]{0,60}(通れ|止め)",
      ["複数の要求を分けて並行に調べる"]: "用件[^。]{0,80}(分け|並行)",
    },
  },
  "1.5": {
    ja: "hooks によるツール呼び出しの介入",
    name: "Apply Agent SDK hooks for tool call interception and data normalization",
    sections: ["intercept", "hooks"],
    vocab: ["matcher", "permissionDecision", "updatedInput", "SessionStart", "SubagentStop", "PreCompact", "exit 2", "ISO 8601"],
    concepts: {
      ["PostToolUse で結果を整える"]: "PostToolUse",
      ["PreToolUse で規則違反を止める"]: "PreToolUse[^。]{0,80}(止め|ブロック|実行させ)",
      ["仕組み＝決定的／お願い＝確率的"]: "(決定的|確実)[^。]{0,60}(確率|お願い)",
      ["形式の正規化（ISO 8601 など）"]: "ISO 8601",
      ["閾値を超えたら別の道へ回す"]: "(超え|上限)[^。]{0,60}(人|別|止め)",
    },
  },
  "1.6": {
    ja: "タスク分解の設計",
    name: "Design task decomposition strategies for complex workflows",
    sections: ["chain"],
    vocab: ["固定チェーン", "動的分解"],
    concepts: {
      ["固定チェーン⇄動的分解"]: "固定チェーン[^。]{0,60}動的分解|動的分解[^。]{0,60}固定チェーン",
      ["段に割る（ファイルごと→横断）"]: "ファイル(ごと|単位)[^。]{0,60}横断|横断[^。]{0,60}ファイル(ごと|単位)",
      ["分かったことに応じて次を決める"]: "(分かった|見つかった|結果)[^。]{0,60}(次|その場|決め)",
      ["注意が散るのを避ける"]: "(注意|見るところ)[^。]{0,40}(散|多すぎ|薄く)",
      ["まず構造を把握してから優先順位"]: "構造を把握[^。]{0,120}優先",
    },
  },
  "1.7": {
    ja: "セッションの状態・再開・分岐",
    name: "Manage session state, resumption, and forking",
    sections: ["session"],
    vocab: ["--resume", "--continue", "--fork-session"],
    concepts: {
      ["--resume で名前つき再開"]: "--resume",
      ["fork で枝を分ける"]: "fork_session|--fork-session",
      ["再開時にファイルの変更を伝える"]: "再開[^。]{0,80}(変わった|変えた場所)",
      ["古い結果で再開するより新規＋要約"]: "(古い|軒並み)[^。]{0,80}(新規|要約)",
    },
  },
  "2.1": {
    ja: "ツール定義と境界の設計",
    name: "Design effective tool interfaces with clear descriptions and boundaries",
    sections: ["anatomy", "grain"],
    vocab: ["input_schema", "description"],
    concepts: {
      ["説明文が選択の主な材料"]: "description[^。]{0,60}(判断|選ぶ|材料)",
      ["入力形式・例・境界を書く"]: "(境界|いつ呼ばない|対象外)",
      ["説明が重なると取り違える"]: "似(通|た)[^。]{0,40}(取り違|選べ|区別)",
      ["system の語がツール選択に効く"]: "system[^。]{0,60}(ツールの選択|選ばれ方|引きずら|寄せて)",
      ["汎用の道具を用途別に割る"]: "(太すぎ|何でもできる|汎用)[^。]{0,80}(割|分け)",
    },
  },
  "2.2": {
    ja: "構造化されたエラー応答",
    name: "Implement structured error responses for MCP tools",
    sections: ["error"],
    vocab: ["is_error", "errorCategory", "isRetryable"],
    concepts: {
      ["isError フラグ"]: "is_error|isError",
      ["一時的・検証・業務・権限"]: "一時的[^。]{0,60}(検証|業務|権限)",
      ["一律のエラー文だと回復できない"]: "(エラーが発生|一律|同じ文言)[^。]{0,60}(直せ|分から|回復)",
      ["再試行できる／できない"]: "再試行(して|する)意味|やり直して直る|isRetryable",
      ["子の中で回復し、無理なものだけ上げる"]: "一時的[^。]{0,80}(再試行|回復)",
      ["アクセス失敗と0件は別"]: "(0件|ゼロ件)[^。]{0,50}(失敗|エラー|区別)|失敗[^。]{0,50}(0件|ゼロ件)",
    },
  },
  "2.3": {
    ja: "ツールの配り方と tool_choice",
    name: "Distribute tools appropriately across agents and configure tool choice",
    sections: ["distribute"],
    vocab: ["tool_choice"],
    concepts: {
      ["道具が多すぎると選べない（18 vs 4-5）"]: "18個[^。]{0,60}(引く|選|難し)",
      ["専門外の道具は誤用される"]: "専門外[^。]{0,80}(使われ|呼ばれ)|(まとめ役|調査班)[^。]{0,60}自分で調べ",
      ["役割ごとに配る範囲を絞る"]: "(役割|担当)[^。]{0,60}(だけ|絞|限)",
      ["tool_choice の auto / any / 指定"]: "tool_choice[^。]{0,120}(auto|any)",
      ["汎用の道具を制約つきに置き換える"]: "制約つき|(広すぎ|決めた置き場)",
    },
  },
  "2.4": {
    ja: "MCP サーバの統合",
    name: "Integrate MCP servers into Claude Code and agent workflows",
    sections: ["mcp"],
    vocab: [".mcp.json", "~/.claude.json", "stdio", "resources", "prompts"],
    concepts: {
      [".mcp.json とユーザ側の設定"]: "\\.mcp\\.json",
      ["環境変数の展開"]: "環境変数",
      ["繋いだ全サーバの道具が同時に見える"]: "繋いだ[^。]{0,80}(全部|すべて|同時)",
      ["resources で目録を出す"]: "resources",
      ["説明を厚くしないと組み込みが優先される"]: "説明[^。]{0,80}(組み込み|Grep)[^。]{0,40}(負け|選ばれ)",
      ["既存の公開サーバを使う"]: "(既存|公開|コミュニティ|世の中)[^。]{0,60}(サーバ|使)",
    },
  },
  "2.5": {
    ja: "組み込みツールの使い分け",
    name: "Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    sections: ["builtin"],
    vocab: ["Grep", "Glob", "Read", "Write", "Edit", "Bash", "クライアントツール", "サーバツール", "web_search", "code_execution"],
    concepts: {
      ["Grep は中身、Glob は名前"]: "Grep[^。]{0,80}Glob|Glob[^。]{0,80}Grep",
      ["Read/Write と Edit の使い分け"]: "Edit[^。]{0,80}(Read|Write)",
      ["Edit が一意に当たらないとき"]: "(一意|複数|同じ文字列)[^。]{0,60}Edit|Edit[^。]{0,60}(一意|見つから)",
      ["Grep で入口→Read で追う"]: "Grep[^。]{0,80}(入口|たど|追)|入口[^。]{0,60}Read",
      ["全部読まず、少しずつ広げる"]: "(全部|すべて)[^。]{0,40}読ま",
      ["名前を洗い出してから横断で探す"]: "(名前|export)[^。]{0,80}(洗い出|一覧|列挙)",
    },
  },
  "3.1": {
    ja: "CLAUDE.md の階層・スコープ・分割",
    name: "Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    sections: ["claudemd", "import"],
    vocab: ["CLAUDE.md", "CLAUDE.local.md", "/memory"],
    concepts: {
      ["CLAUDE.md の3階層"]: "~/.claude/CLAUDE.md|ユーザ[^。]{0,40}プロジェクト[^。]{0,40}ディレクトリ",
      ["ユーザ階層は共有されない"]: "(自分だけ|ユーザー)[^。]{0,80}(共有|チーム|他の人|入らない)",
      ["@import で分割"]: "@import",
      [".claude/rules/ という別の置き方"]: "\\.claude/rules",
      ["階層の取り違えを診断できる"]: "共有されない[^。]{0,60}(チーム|書かない)|(効かな|届かな)[^。]{0,60}(階層|置き場所)",
      ["/memory で読み込みを確認"]: "/memory",
    },
  },
  "3.2": {
    ja: "スラッシュコマンドとスキル",
    name: "Create and configure custom slash commands and skills",
    sections: ["cmdskill"],
    vocab: ["SKILL.md", "allowed-tools", "argument-hint", "$ARGUMENTS", "context: fork", "YAML frontmatter"],
    concepts: {
      ["コマンドの置き場所（共有⇄個人）"]: "\\.claude/commands[^。]{0,120}~/\\.claude/commands|~/\\.claude/commands[^。]{0,120}\\.claude/commands",
      ["SKILL.md と frontmatter"]: "SKILL\\.md",
      ["context: fork で汚さない"]: "context: fork",
      ["allowed-tools で道具を絞る"]: "allowed-tools",
      ["argument-hint で引数を促す"]: "argument-hint",
      ["個人用の変種を別名で作る"]: "(個人|自分)[^。]{0,80}(別名|変え|~/)",
      ["スキル⇄CLAUDE.md の選び分け"]: "(スキル|コマンド)[^。]{0,100}CLAUDE\\.md[^。]{0,60}(常に|毎回|always)|CLAUDE\\.md[^。]{0,60}(常に|毎回)",
    },
  },
  "3.3": {
    ja: "パス固有ルール",
    name: "Apply path-specific rules for conditional convention loading",
    sections: ["rules"],
    vocab: [".claude/rules", "paths"],
    concepts: {
      ["paths の glob で条件つき読み込み"]: "paths",
      ["該当ファイルを触るときだけ読まれる"]: "(開いた|編集|触)[^。]{0,40}(そのときだけ|ときだけ)",
      ["ディレクトリ別 CLAUDE.md より glob が向く場面"]: "散らばって[^。]{0,120}(glob|paths|名前)",
    },
  },
  "3.4": {
    ja: "plan mode と直接実行",
    name: "Determine when to use plan mode vs direct execution",
    sections: ["plan"],
    vocab: ["plan mode", "--permission-mode", "Explore"],
    concepts: {
      ["plan mode が向く場面"]: "plan mode[^。]{0,120}(影響|未知|後戻り|大きい)",
      ["直接実行が向く場面"]: "直接実行[^。]{0,120}(小さ|決まって|すぐ戻せ)",
      ["変更前に安全に調べられる"]: "(調べ|読む)[^。]{0,60}変更(は|が)?(でき|しない)",
      ["Explore で探索を隔離"]: "Explore",
      ["plan mode と直接実行を組み合わせる"]: "(plan mode)[^。]{0,80}直接実行[^。]{0,60}(組み合わ|そのあと|実装)",
    },
  },
  "3.5": {
    ja: "反復的な改善",
    name: "Apply iterative refinement techniques for progressive improvement",
    sections: ["iterate"],
    vocab: [],
    concepts: {
      ["入出力の例で示す"]: "入出力の例|入力と出力の例|例を2〜3",
      ["テストを先に書いて回す"]: "テストを先に|先にテスト|テスト駆動",
      ["実装前に質問させる"]: "先に質問|質問させ|聞き返させ",
      ["まとめて1通か、順番か"]: "まとめて1通|1通にまとめ|順番に(直|出)",
      ["エッジケースは具体的なテストで示す"]: "(境界|エッジ|端)[^。]{0,80}(テスト|例)",
    },
  },
  "3.6": {
    ja: "CI/CD への組み込み",
    name: "Integrate Claude Code into CI/CD pipelines",
    sections: ["ci", "settings"],
    vocab: ["--print", "--output-format", "--json-schema", "--allowedTools", "bypassPermissions", "settings.json", "permissions", "GitHub Actions"],
    concepts: {
      ["-p / --print"]: "--print",
      ["--output-format json"]: "--output-format",
      ["--json-schema"]: "--json-schema",
      ["CI では CLAUDE.md が文脈を渡す"]: "CLAUDE\\.md[^。]{0,80}(CI|自動|渡)",
      ["生成したセッション自身のレビューは弱い"]: "同じセッション[^。]{0,120}(疑|見直)",
      ["前回の指摘を渡して重複を避ける"]: "前回の指摘",
      ["既存のテストを渡して重複生成を防ぐ"]: "既存のテスト",
    },
  },
  "4.1": {
    ja: "明示的な基準による精度向上",
    name: "Design prompts with explicit criteria to improve precision and reduce false positives",
    sections: ["criteria"],
    vocab: [],
    concepts: {
      ["曖昧な指示より明示的な基準"]: "(曖昧|見つけて)[^。]{0,80}基準",
      ["「保守的に」では精度が上がらない"]: "保守的[^。]{0,80}(基準ではありません|効かな)",
      ["誤検知が多いと信用されなくなる"]: "(信用|信頼|使われなくな)",
      ["該当／対象外／境界を書く"]: "該当[^。]{0,80}対象外",
      ["誤検知の多い分類は一度外す"]: "一時的に(止め|外|切)|いったん外",
      ["重大度の基準を具体例で決める"]: "重大度[^。]{0,20}同じ|高・中・低",
    },
  },
  "4.2": {
    ja: "few-shot",
    name: "Apply few-shot prompting to improve output consistency and quality",
    sections: ["fewshot"],
    vocab: ["few-shot"],
    concepts: {
      ["few-shot が最も効く場面"]: "few-shot",
      ["曖昧な場合の扱いを例で示す"]: "曖昧[^。]{0,60}(実物|例)",
      ["例から未知のパターンへ一般化する"]: "(例に無い|初めて見る)[^。]{0,80}(当てはめ|適用)",
      ["抽出での作り話を減らす"]: "(無理に|でっち上げ|作り)",
      ["出力の形を例で固定する"]: "(形|書式|フォーマット)[^。]{0,60}例",
    },
  },
  "4.3": {
    ja: "構造化出力の強制",
    name: "Enforce structured output using tool use and JSON schemas",
    sections: ["struct"],
    vocab: ["required", "enum", "strict"],
    concepts: {
      ["tool_use ＋ JSON スキーマが最も確実"]: "input_schema|tool_use[^。]{0,80}(スキーマ|schema)",
      ["tool_choice の auto / any / 指定"]: "tool_choice[^。]{0,140}(auto|any)",
      ["スキーマは構文エラーを消すが意味の誤りは消せない"]: "(構文|形)[^。]{0,80}(意味|中身|合計)",
      ["required と任意（null 可）"]: "required[^。]{0,120}(null|任意|省略)|null[^。]{0,80}(許す|任意)",
      ["enum に「不明」や「その他」を用意"]: "enum[^。]{0,120}(不明|その他|other)|(不明|その他)[^。]{0,60}enum",
    },
  },
  "4.4": {
    ja: "検証・再試行・フィードバック",
    name: "Implement validation, retry, and feedback loops for extraction quality",
    sections: ["verify"],
    vocab: ["detected_pattern"],
    concepts: {
      ["落ちた理由を付けて投げ直す"]: "(理由|指摘)[^。]{0,60}(足し|添え|付け)[^。]{0,40}(再|もう一度)",
      ["情報が無い場合は再試行しても無駄"]: "通らない入力",
      ["誤検知の傾向を記録する"]: "detected_pattern",
      ["合計と明細の突き合わせ"]: "(合計|総額)[^。]{0,60}(一致|突き合わ|検算)",
    },
  },
  "4.5": {
    ja: "バッチ処理",
    name: "Design efficient batch processing strategies",
    sections: ["batch"],
    vocab: ["custom_id", "Message Batches"],
    concepts: {
      ["Message Batches API"]: "Message Batches",
      ["50% 安い / 24時間 / SLA なし"]: "50\\s*%|半額|半分",
      ["バッチ中はツールを実行できない"]: "バッチ[^。]{0,140}(ツール|道具)",
      ["custom_id で対応づける"]: "custom_id",
      ["失敗した分だけ投げ直す"]: "(失敗|落ちた)[^。]{0,60}(だけ|分)[^。]{0,40}(投げ|やり直|再)",
      ["少量で試してから本番に流す"]: "(20〜50件|少量|先に)[^。]{0,80}流",
    },
  },
  "4.6": {
    ja: "多重・多段レビュー構成",
    name: "Design multi-instance and multi-pass review architectures",
    sections: ["multi"],
    vocab: ["multi-instance", "multi-pass"],
    concepts: {
      ["自分の書いたものは自分で疑いにくい"]: "同じセッション[^。]{0,120}(疑|見直)",
      ["独立した別インスタンスのほうが見つかる"]: "multi-instance|別の[^。]{0,40}(体|インスタンス)",
      ["多段（ファイルごと＋横断）"]: "multi-pass",
      ["確信度を添えて回す先を決める"]: "確信度[^。]{0,100}(優先|順|回す)",
    },
  },
  "5.1": {
    ja: "長い対話での文脈の維持",
    name: "Manage conversation context to preserve critical information across long interactions",
    sections: ["compact"],
    vocab: ["事実ブロック", "lost in the middle"],
    concepts: {
      ["要約で数値・日付・約束が消える"]: "(数字|数値)[^。]{0,60}(壊れ|消え)",
      ["lost in the middle"]: "lost in the middle",
      ["ツール結果は関連度に対して大きすぎる"]: "(ツールの結果|返り値|ログ)[^。]{0,80}(大き|長|太り|全部)",
      ["履歴は毎回まるごと送る"]: "(毎回|全部)[^。]{0,40}(送り直|まるごと)",
      ["事実ブロックを毎回そのまま入れる"]: "事実ブロック",
      ["必要な項目だけに削ってから載せる"]: "(必要な|要る)[^。]{0,40}(行|項目|だけ)[^。]{0,40}(返|削|絞)",
      ["要点を先頭に置き、見出しで区切る"]: "(先頭|前|冒頭)[^。]{0,60}(置|入れ)",
    },
  },
  "5.2": {
    ja: "エスカレーションと曖昧さの解消",
    name: "Design effective escalation and ambiguity resolution patterns",
    sections: ["confidence"],
    vocab: ["エスカレーション"],
    concepts: {
      ["人に渡す3つの引き金"]: "エスカレーション|人に(渡|回)",
      ["すぐ渡す⇄まず解決を試みる"]: "(すぐ|即)[^。]{0,80}(渡|回)",
      ["感情や自信の数値は引き金にしない"]: "(感情|語気|怒)[^。]{0,80}引き金|自信の数値",
      ["候補が複数なら聞き返す"]: "(複数|何件も|絞れな)[^。]{0,80}(聞き返|確認|尋ね)",
    },
  },
  "5.3": {
    ja: "複数エージェント間のエラー伝播",
    name: "Implement error propagation strategies across multi-agent systems",
    sections: ["propagate"],
    vocab: [],
    concepts: {
      ["失敗の種類・試したこと・部分結果"]: "部分|途中まで",
      ["アクセス失敗と0件の区別"]: "(0件|ゼロ件)[^。]{0,50}(失敗|エラー|区別)",
      ["一律の失敗表示は文脈を隠す"]: "(一律|同じ|generic)[^。]{0,80}(隠|分から)",
      ["握りつぶす／全体を止めるは両方誤り"]: "握りつぶ|全体を止め",
      ["どこが手薄かを注記する"]: "(欠けて|足りな|手薄|確かさ)",
    },
  },
  "5.4": {
    ja: "大規模コードベース探索での文脈管理",
    name: "Manage context effectively in large codebase exploration",
    sections: ["sub", "shape"],
    vocab: ["サブエージェント", "/compact"],
    concepts: {
      ["長く続けると答えがぼやける"]: "(長く|長時間|続けている)[^。]{0,50}(ぼやけ|曖昧|一般的な話)",
      ["作業メモを窓の外に置く"]: "作業メモ|メモをファイル|scratchpad",
      ["子に出して要約だけ持ち帰る"]: "要約[^。]{0,40}(だけ|のみ)[^。]{0,30}(持ち帰|返)",
      ["落ちても再開できる形"]: "(落ちても|中断しても|途中で止まっても)[^。]{0,40}(再開|やり直)",
      ["/compact"]: "/compact",
      ["段階ごとに要約して次へ渡す"]: "(段|フェーズ|次)[^。]{0,60}要約[^。]{0,60}(渡|入れ|次)",
    },
  },
  "5.5": {
    ja: "人のレビュー導線と確信度の校正",
    name: "Design human review workflows and confidence calibration",
    sections: ["confidence"],
    vocab: ["確信度"],
    concepts: {
      ["全体の正解率は不出来を隠す"]: "(全体|平均)[^。]{0,60}(正解率|精度)[^。]{0,60}隠",
      ["種別ごとに抜き取って測る"]: "(層化|種別ごと|項目ごと)[^。]{0,60}抜き取",
      ["検証セットでしきい値を校正"]: "検証セット",
      ["種別・項目ごとに確かめてから減らす"]: "種別ごと[^。]{0,60}項目ごと",
      ["低いものから人に回す"]: "(低い|確信度)[^。]{0,80}(順|優先|先に)",
    },
  },
  "5.6": {
    ja: "出典の保持と不確実性の扱い",
    name: "Preserve information provenance and handle uncertainty in multi-source synthesis",
    sections: ["observe"],
    vocab: ["出典"],
    concepts: {
      ["要約で出典が失われる"]: "(要約|まとめ)[^。]{0,80}(出典|どこから|溶け)",
      ["主張と出典の対応を保つ"]: "(出典|出どころ)[^。]{0,60}(対応|欄|保)",
      ["食い違う値は両方残して注記"]: "(割れ|食い違)[^。]{0,80}両方",
      ["日付を持たせて時点の違いを誤解しない"]: "(公表日|取得日)|日付[^。]{0,80}(矛盾|時点)",
      ["内容の型に合った出し方をする"]: "(数字は表|表、経緯|箇条書き)",
    },
  },
};

/** 導出 ─ ここから先は計算。手で書かない */
export const domainItems = (key) => Math.round(EXAM.items * DOMAINS[key].weight);
export const scenarioCount = (key) => SCENARIOS.filter(s => s.domains.includes(key)).length;
