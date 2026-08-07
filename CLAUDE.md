# CCAR-F 学習ノート — 作業ガイド

このリポジトリを触る Claude 向けの引き継ぎ。**編集を始める前にこのファイルを最後まで読むこと。**
過去に実際に起きた失敗と、その再発防止策が「これまでに直した問題」に列挙してある。

---

## 1. これは何か

**CCAR-F（Claude Certified Architect – Foundations）合格**のための学習サイト。
利用者は日本語話者ひとり。**表記はすべて日本語**（コード・API のフィールド名を除く）。

出題ブループリント（5ドメイン・30タスク）をそのまま目次にしている。
「読み物として面白いか」より **「試験に出る内容を正しく理解できるか」を優先**する。
これは利用者が明示した方針。

| ドメイン | 比率 | ファイル |
|---|---|---|
| 前提（全ドメイン共通の土台） | ─ | `00-basics.html` |
| Domain 1 エージェント設計とオーケストレーション | 27% | `01-agentic.html` |
| Domain 2 ツール設計と MCP 連携 | 18% | `02-tools.html` |
| Domain 3 Claude Code の設定とワークフロー | 20% | `03-claude-code.html` |
| Domain 4 プロンプト設計と構造化出力 | 20% | `04-prompt.html` |
| Domain 5 コンテキスト管理と信頼性 | 15% | `05-context.html` |
| まとめ・総合チェック | ─ | `06-summary.html` |

採点思想は **「効く一番単純な手」**。設問で凝った選択肢はたいてい誤答。教材全体がこの基準で書かれている。

---

## 2. ファイル構成

```
index.html            トップ（ドメイン一覧＋全体図）
00〜06-*.html          ドメイン別ページ（全56セクション）
assets/
  style.css           全スタイル。ダーク（既定）／ライトの2テーマ
  app.js              テーマ切替・目次追従・クイズ描画・操作できる図・全文検索
  quiz-data.js        全設問データ（window.QUIZ）
  search-index.js     全文検索インデックス（自動生成物・手で編集しない）
tools/
  reindex.mjs         検索インデックスの再生成
  check.mjs           静的チェック（過去の不具合の再発検出）
archive/
  ccar-f-single.html  分割前の単一HTML（91ページ版）。保険としてのみ保持
```

外部依存は **Google Fonts のみ**（Inter / Noto Sans JP / JetBrains Mono）。
オフラインでもシステムフォントにフォールバックして読める。ビルドもサーバも不要で、`index.html` を開けば動く。

---

## 3. 編集の原則

**正典は各 HTML ファイルそのもの。** `archive/` から再生成する運用はしない。

編集したら **必ずこの順で**：

```bash
node tools/reindex.mjs   # 検索インデックスを作り直す
node tools/check.mjs     # 静的チェック（exit 1 なら要修正）
```

`reindex` を忘れると検索が本文とズレる。`check` は過去に実際に埋め込んだバグを検出する。

見た目の確認はブラウザで。**Claude が確認する場合は headless Chromium を使うこと**（Playwright）。
今日見つけた不具合の大半は、目視ではなく**測定**で見つかっている。

---

## 4. マークアップの規約

セクションはこの形。順序も守る。

```html
<section class="sec" id="一意なID">
  <header class="sec-head">
    <span class="sec-kicker">セクション</span>
    <h2>セクション見出し</h2>
  </header>
  <h3 class="sub">小見出し</h3>        <!-- 複数トピックを含むときだけ -->
  <p class="lead">導入の1〜2文</p>
  <div class="figbox"><div class="diagram run"><svg viewBox="0 0 760 260">…</svg></div></div>
  <div class="detail">
    <h3>図の読み方</h3>
    <ol class="ann">
      <li><span class="n">1</span><span>…</span></li>
    </ol>
    <div class="ex"><span class="exl">見出し</span>本文</div>
    <div class="myth">
      <span class="t">誤解</span><span>…</span>
      <span class="t o">実際は</span><span>…</span>
    </div>
  </div>
  <p class="point"><b>ポイント</b>この節の結論を1〜2文</p>
  <p class="note">※ 補足・例外</p>
</section>
```

| クラス | 用途 |
|---|---|
| `.lead` | 節の導入。ここで「何の話か」を言い切る |
| `.figbox` > `.diagram.run` > `svg` | 図。`.run` は画面に入ったときの段階表示 |
| `.ann` | 図の番号説明。`.figbox` の中に置くと「番号の説明」見出しが自動で付く |
| `.ex` / `.exl` | 具体例・対比 |
| `.myth` | 誤解 ⇄ 実際は。**試験で狙われる誤解**を書く場所 |
| `.point` | 節の結論。1〜2文に収める |
| `.note` | 補足・例外・細かい仕様 |
| `pre.code` + `.k .s .v .c .hl .rng` | JSON。`.k`=キー `.s`=文字列 `.v`=数値 `.c`=コメント `.hl`=強調 `.rng`=範囲 |

**セクション見出しを追加したら `.toc-list` にもリンクを足す**（`<a class="toc-link" href="#ID">`）。
理解度チェックのセクションは `class="sec sec-quiz"` ＋ `data-quiz="キー"`、中に `<div class="qwrap"></div>` を置く。

---

## 5. 図の規約 — ここが一番事故る

### 色は必ず CSS 変数で書く

```html
<!-- ✗ テーマ切替で色が変わらない -->
<rect fill="#1B2740" stroke="#33456A"/>
<!-- ○ -->
<rect fill="var(--fig-fill-neutral)" stroke="var(--fig-line)"/>
```

使える変数（`assets/style.css` の `:root` と `[data-theme="light"]` に両テーマぶん定義済み）：

| 変数 | 意味 |
|---|---|
| `--fig-surface` | 図の中のカード地色 |
| `--fig-fill-neutral` / `--fig-line` | 中立のパネル・枠線 |
| `--fig-blue` / `--fig-fill-blue` / `--fig-line-blue` | **アプリ側**（送る側） |
| `--fig-amber` / `--fig-fill-amber` / `--fig-line-amber` | **モデル側**（返す側） |
| `--fig-green` / `--fig-fill-green` / `--fig-line-green` | **正しい・OK** |
| `--fig-red` / `--fig-fill-red` / `--fig-line-red` | **誤り・NG** |
| `--fig-muted` / `--fig-dash` / `--fig-bar` | 補助文字・破線・活性バー |
| `--fig-code-bg` | 図中のコード地色 |

色は**意味と結びついている**。青＝アプリが送る、橙＝モデルが返す、緑＝OK、赤＝NG。この対応を崩さない。

矢印は `marker-end="url(#ar|arb|ara|arr|arg)"`（灰・青・橙・赤・緑）。定義は各 HTML の先頭にある。

### 番号説明（`.ann`）の書き方

1. **位置ではなく、図に書いてある名前で指す。**
   ✗「左は…」「右上が…」 ○「**「例を1つ見せる」**（右・緑）── …」
   図にパネル名があるのに位置で指すと、読み手はどれを見ればいいか分からない。
2. **図に書いてあることを繰り返さない。** 番号説明には**図にない情報**を書く。
   「なぜそうなるか」「これがないと何が起きるか」「試験でどう問われるか」。
3. **図にない番号を振らない。** 番号は図の要素か、パネルの並び順に対応させる。

### 高さの制約はない

1ページ1トピックのページ送り方式は廃止済み。**関連する内容は同じセクションにまとめる**。
「前ページの続き」で分けない。読み手が行き来しなくて済むことを優先する。

---

## 6. 理解度チェック

設問は `assets/quiz-data.js` の `window.QUIZ` に、キーごとの配列で入っている。

```js
q4:[
 {q:"設問文",
  o:["選択肢A","正解の選択肢","選択肢C","選択肢D"], a:1,
  e:"なぜそれが正解か。誤答がなぜ誤りかも一言添える"},
]
```

- `a` は**0始まり**の正解インデックス
- HTML 側は `<section class="sec sec-quiz" data-quiz="q4">` ＋ `<div class="qwrap"></div>` だけ置けばよい。描画は `app.js` がやる

**設問はそのセクションまでに説明した範囲だけで解けること。**
先取りは学習の妨げになる。`node tools/check.mjs` が自動判定する。
誤答の選択肢に未説明の用語（`temperature` など）が出るのは問題ない — 正解を選ぶのに知識が要らないため。

---

## 7. これまでに直した問題 — 再発防止リスト

**すべて実際に起きた。同じことをしないこと。**

| # | 起きたこと | 教訓 |
|---|---|---|
| 1 | 「新人にマニュアルを渡す」「電話越しの専門家」というたとえが、**教えている仕組みと矛盾**していた（電話の相手は直前の話を覚えている＝「毎回まるごと送り直す」と正反対） | **たとえは図と1対1で対応するときだけ使う。**対応しないなら入れない。日常的な含意が仕組みと矛盾していないか、必ず確かめる |
| 2 | 番号説明が「左は…」「右は…」と位置で指していたが、図には**3つの名前つきパネル**があり、しかも②の説明は右ではなく**下のパネル**の内容だった | 位置ではなく**パネル名で指す**。`check.mjs` では拾えないので目視で確認 |
| 3 | 番号説明が図の文言を**そのまま繰り返して**いた | 番号説明には図にない情報を書く。`check.mjs` が18字以上の一致を検出 |
| 4 | CSS の `svg text{fill:…}` が SVG の `fill` 属性を上書きしていて、**全91ページで図の色分けが一度も効いていなかった**。SVG のプレゼンテーション属性は CSS より優先度が低い | 色は CSS 変数で書く（§5）。`check.mjs` が固定色の残留を検出 |
| 5 | 「プロンプトの基本」のテストに、**6ページ先の Task 4.3 の内容**を問う設問が入っていた。しかも後半のテストと重複 | 設問は既習範囲だけ。`check.mjs` が自動判定 |
| 6 | 図のテキストが枠から溢れていた（3か所） | ブラウザで `getBBox()` を測って確認する。座標だけの静的チェックでは足りない |
| 7 | 「もっと詳しく」を `<details>` で折りたたんでいた | **学習に有用な情報は折りたたまない。**情報量が多いならセクションを分ける |
| 8 | ページ統合後も「前ページ」「次ページ」という参照が14か所残っていた | 構造を変えたら位置参照を全文検索する。`check.mjs` が検出 |
| 9 | 教材が試験範囲を網羅していると思い込んでいたが、`tool_choice` `plan mode` `custom_id` `is_error` `.mcp.json` などが**0回も登場していなかった** | 「網羅しているか」は主観で答えず、**用語を grep して数える** |

---

## 8. 事実確認の原則

**API の仕様は必ず公式ドキュメントで裏取りする。** 記憶で書かない。

今日この方針で、思い込みを2回訂正している。

- 「`messages` に `role:"system"` は入れられない」→ **入れられる**（新しめのモデルでは、先頭以外に限り、会話途中の system 指示として）
- 「コンテキストウィンドウはプランで決まる」→ **モデルで決まる**（プランは使用量の話）

参照先：

- https://platform.claude.com/docs/en/build-with-claude/working-with-messages
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- https://platform.claude.com/docs/en/build-with-claude/streaming
- https://code.claude.com/docs/en/mcp
- https://support.claude.com/en/articles/8606394-how-large-is-the-context-window-on-paid-claude-plans

モデル世代で変わる具体的な数値（200K / 1M など）は**本文に書かない**。
問われるのは「窓は共有資源で、入力と出力が同じ枠を食い合う」という構造のほう。

---

## 9. git の現状

**このフォルダの `.git` は壊れかけている。** Cowork のクラウドセッションからマウント越しに
`git init` した際、lock ファイルを作成・削除できず（`Operation not permitted`）、
`git branch -M main` が失敗した。コミット `5228bdc`（ブランチ `master`）と remote 設定は残っている。

**Windows 側で作り直すのが確実：**

```
cd C:\Users\guard\Documents\Claude作業用\ccaf-learn
rmdir /s /q .git
git init
git add -A
git commit -m "CCAR-F 学習ノート"
git branch -M main
git remote add origin https://github.com/xeexi/ccaf-learn.git
git push -u origin main
```

**クラウドの Cowork セッションから push はできない。** git proxy が
「このセッションの許可リポジトリに入っていない」として認証を通さない。
自動 push まで任せたい場合は、次のどちらか：

- Cowork の設定で、セッションのソースに `xeexi/ccaf-learn` を追加する
- タスクを**「自分のコンピュータ」で実行**する（デスクトップアプリの新規タスク開始時、右上の実行場所ピッカー。設定 → Cowork で既定も変えられる）

---

## 10. 未着手・今後

- **模擬試験がない。** 公式ガイドにはシナリオ形式の設問が6つあり、うち4つが出題される。
  現状の理解度チェックは知識確認どまりで、シナリオ形式の演習を用意できていない
- **Domain 5 が薄い**（4セクション、出題比率15%）。他ドメインに比べて掘り下げが足りない
- 図のうち **24点は矢印のない「パネル並べ」**。流れを表す図に描き直す余地がある
- ライトテーマは実機での確認が浅い。ダークで作ってから変数で対応させたため

---

## 11. 利用者について（作業の進め方）

- **黙って進めない。**着手前に「やること」を本文の箇条書きで示し、長い作業では区切りごとに報告する
- **タスクリストのウィジェットは相手の画面に表示されていない。**進捗は必ず本文テキストで書く
- **判断が分かれた作業では**、迷った点・選ばなかった案とその理由を短く添える（毎回の実況は不要）
- **頼まれていない副産物を作らない。**メモや md を勝手に増やさない
- 指摘は的確。「この図はどれのこと？」「この設問は範囲外では？」といった問いは、**たいてい当たっている。**
  反射的に弁明せず、まず測って確かめること
