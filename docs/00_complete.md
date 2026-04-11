# 完成済み機能

## 認証（GitHub OAuth）

- GitHub OAuth App を使ったサインイン／サインアウト
- 自分の GitHub ID のみ許可するホワイトリスト方式
- Deno KV によるセッション管理（有効期限 30 日）
- 本番／ローカルで Cookie フラグ（Secure）を自動切り替え

### 関連ファイル

| ファイル                  | 役割                                     |
| ------------------------- | ---------------------------------------- |
| `routes/auth/signin.tsx`  | ランディングページ（サインインボタン）   |
| `routes/auth/github.ts`   | GitHub 認証画面へリダイレクト            |
| `routes/auth/callback.ts` | コールバック処理・セッション発行         |
| `routes/auth/signout.ts`  | セッション削除・Cookie クリア            |
| `routes/_middleware.ts`   | 全ルートの認証チェック（公開パスは除外） |
| `utils/session.ts`        | Deno KV へのセッション読み書き           |

## プロジェクト基盤

- Fresh 2 + Vite によるフルスタック構成
- Tailwind CSS 4 によるスタイリング
- Deno KV をデータストアとして利用
- ローカル開発は `deno task dev`、本番は `deno task build` → `deno task start`
