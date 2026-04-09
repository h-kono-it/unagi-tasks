# 事前設定タスク

## 1. GitHub OAuth App の登録

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. 以下を入力:
   | 項目 | 値 |
   |---|---|
   | Application name | my-todo（任意） |
   | Homepage URL | `http://localhost:8000` |
   | Authorization callback URL | `http://localhost:8000/auth/callback` |
3. 登録後、**Client ID** と **Client Secret** を控える

> Deno Deploy にデプロイした後、同じ OAuth App の Settings から URL を `https://your-app.deno.dev` に書き換えればOK。

---

## 2. 自分の GitHub ユーザーID（数値）を確認する

GitHub のユーザー名ではなく**数値ID**を使う（なりすまし防止）。

```bash
curl https://api.github.com/users/あなたのGitHubユーザー名 | grep '"id"'
```

表示された数値を `ALLOWED_GITHUB_ID` に設定する。

---

## 3. Deno Deploy の環境変数設定

Deno Deploy のプロジェクト設定画面で以下を登録する:

| 変数名 | 値 |
|---|---|
| `GITHUB_CLIENT_ID` | OAuth App の Client ID |
| `GITHUB_CLIENT_SECRET` | OAuth App の Client Secret |
| `ALLOWED_GITHUB_ID` | 自分の GitHub 数値ID |
| `SESSION_SECRET` | ランダムな長い文字列（32文字以上推奨） |

`SESSION_SECRET` の生成例:
```bash
openssl rand -hex 32
```

---

## 4. ローカル開発用 `.env` ファイルの作成

プロジェクトルートに `.env` を作成（`.gitignore` に追加済みであること）:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
ALLOWED_GITHUB_ID=your_github_numeric_id
SESSION_SECRET=your_random_secret
```
