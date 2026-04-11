# 事前設定タスク

## 1. GitHub OAuth App の登録

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth
   App**
2. 以下を入力:
   | 項目                       | 値                                    |
   | -------------------------- | ------------------------------------- |
   | Application name           | my-todo（任意）                       |
   | Homepage URL               | `http://localhost:8000`               |
   | Authorization callback URL | `http://localhost:8000/auth/callback` |
3. 登録後、**Client ID** と **Client Secret** を控える

> Deno Deploy にデプロイした後、同じ OAuth App の Settings から URL を
> `https://your-app.deno.dev` に書き換えればOK。

---

## 2. Deno Deploy の環境変数設定

Deno Deploy のプロジェクト設定画面で以下を登録する:

| 変数名                 | 値                         |
| ---------------------- | -------------------------- |
| `GITHUB_CLIENT_ID`     | OAuth App の Client ID     |
| `GITHUB_CLIENT_SECRET` | OAuth App の Client Secret |

---

## 3. ローカル開発用 `.env` ファイルの作成

プロジェクトルートに `.env` を作成（`.gitignore` に追加済みであること）:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```
