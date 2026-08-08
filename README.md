# CCAR-F 学習ノート

Claude Certified Architect – Foundations (CCAR-F) の出題ブループリントを目次にした学習用サイト。
全88項（本文64・理解度チェック24）。ビルドもサーバも不要で、`docs/index.html` を開けば動く。

## 構成

| 場所 | 内容 |
|---|---|
| `docs/index.html` | トップ（公式ブループリントとの対応・読む順番・配点・ドメイン一覧） |
| `docs/00-basics/` | 前提 — 会話の実体 |
| `docs/01-agentic/` | Domain 1 — エージェント設計とオーケストレーション (27%) |
| `docs/02-tools/` | Domain 2 — ツール設計と MCP 連携 (18%) |
| `docs/03-claude-code/` | Domain 3 — Claude Code の設定とワークフロー (20%) |
| `docs/04-prompt/` | Domain 4 — プロンプト設計と構造化出力 (20%) |
| `docs/05-context/` | Domain 5 — コンテキスト管理と信頼性 (15%) |
| `docs/06-summary/` | まとめ・模擬試験 |
| `docs/assets/` | スタイル・スクリプト・検索インデックス・設問データ |
| `tools/` | 生成と静的チェック |

**1ファイル＝1項＝1画面。** ドメインごとのディレクトリに `NN-<id>.html` の形で並ぶ（`NN` は読む順）。

## 使い方

`docs/index.html` をブラウザで開くだけ。

- `/` キーまたはヘッダーのボタンで全文検索
- ヘッダーのアイコンでライト / ダーク切替
- 各ページ下部の「前へ / 次へ」で読み進める。左の目次からも移動できる（狭い画面では開閉式）

## 編集したら

```bash
node tools/reindex.mjs   # 共通部の書き出し・検索インデックス・?v= の打ち直し
node tools/check.mjs     # 静的チェック（exit 1 なら要修正）
```

編集していいのは各節ファイルの `▼ 本文` 〜 `▲ 本文` のあいだだけ。
その外側（head・ヘッダー・目次・パンくず・送り）は `tools/reindex.mjs` が書き出す生成物。

詳しい規約と過去の失敗は `CLAUDE.md` にある。**触る前に必ず読むこと。**

## 公開

`docs/` をそのまま GitHub Pages に出せる（Settings → Pages → Deploy from a branch → `/docs`）。
