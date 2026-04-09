# Unagi Tasks

判断コストの最小化に特化したTODOアプリ。

## 技術スタック

| 項目 | 内容 |
|---|---|
| Runtime | Deno 2.x |
| Framework | Fresh 2 (jsr:@fresh/core@^2.2.2) |
| Bundler | Vite (npm:vite@^7.1.3) + @fresh/plugin-vite |
| UI | Preact 10 + Tailwind CSS 4 |
| Database | Deno KV |
| Hosting | Deno Deploy |

## 開発コマンド

```bash
deno task dev      # ローカル開発サーバー起動（port 8000）
deno task build    # 本番ビルド
deno task start    # 本番サーバー起動
deno task check    # フォーマット・lint・型チェック
```

## 環境変数

| 変数名 | 用途 |
|---|---|
| `GITHUB_CLIENT_ID` | GitHub OAuth App の Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App の Client Secret |
| `ALLOWED_GITHUB_ID` | 許可する GitHub 数値ID |

## ドキュメント

`docs/` に格納
- 完成済み機能: @docs/00_complete.md
- 全体概要: @docs/00_overview.md
- 全体設計: @docs/01_design.md
- ユーザー実施作業: @docs/99_todo.md
