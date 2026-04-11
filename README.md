# Unagi Tasks

**判断コストの最小化**に特化した TODO アプリ。

うなぎが川をするすると泳ぐように、迷いなく次のタスクへ進み続けることを目指して。

「次に何をやるか迷う時間」をなくすことを目的に、タスクを自動スコアリングして今やるべき1件だけを表示する。

## コンセプト

- **爆速インボックス** — タイトルだけ入力して即キャプチャ、思考の流れを止めない
- **整理フェーズ** —
  溜まったインボックスを1件ずつ捌き、重要度・集中度・発生源を付与
- **Focus View** —
  スコア順のトップ1件だけを大きく表示。完了・スキップ・削除の3択
- **エネルギーマッチング** — 今の自分の集中度に合うタスクが自動的に浮き上がる

## スコアリング

```
score = priority × (10 + urgencyBonus) + ageInHours - |userEnergy - taskEnergy| × 5

urgencyBonus:
  期限切れ      → 60 + 経過日数 × 15
  当日          → 60
  7日以内       → (7 - 残り日数) / 6 × 30
  それ以外      → 0
```

## 技術スタック

| 項目      | 内容                           |
| --------- | ------------------------------ |
| Runtime   | Deno 2.x                       |
| Framework | Fresh 2 (`@fresh/core@^2.2.2`) |
| Bundler   | Vite + `@fresh/plugin-vite`    |
| UI        | Preact 10 + Tailwind CSS 4     |
| Database  | Deno KV                        |
| Hosting   | Deno Deploy                    |

## 開発

```bash
# 環境変数を設定
cp .env.example .env
# .env を編集して GitHub OAuth の認証情報を入力

# 開発サーバー起動（port 8000）
deno task dev
```

## 環境変数

| 変数名                 | 用途                              |
| ---------------------- | --------------------------------- |
| `GITHUB_CLIENT_ID`     | GitHub OAuth App の Client ID     |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App の Client Secret |

## デプロイ

Deno Deploy の GitHub integration で **Fresh
プリセット**を選択するとビルド・デプロイが自動で行われる。

環境変数は Deno Deploy の Settings > Environment Variables に設定する。

デプロイ後、GitHub OAuth App の callback URL を
`https://{project}.deno.dev/auth/callback` に更新する。

## 画面構成

| パス               | 内容                                         |
| ------------------ | -------------------------------------------- |
| `/auth/signin`     | ランディング・サインイン                     |
| `/`                | Focus View（トップタスク表示・クイック入力） |
| `/triage`          | インボックス整理（属性付与して tasks へ）    |
| `/tasks`           | タスク一覧（スコア順）                       |
| `/tasks/{id}/edit` | タスク編集                                   |
| `/account`         | アカウント設定・退会                         |
| `/privacy`         | プライバシーポリシー                         |
| `/terms`           | 利用規約                                     |
