# 一般公開時の対応事項

個人利用から一般公開に切り替える際に必要な対応をまとめる。

## 認証・アクセス制御

### ホワイトリスト解除
`routes/auth/callback.ts` の `ALLOWED_GITHUB_ID` チェックを削除する。

```typescript
// 削除する箇所
const allowedGithubId = Number(Deno.env.get("ALLOWED_GITHUB_ID"));
if (user.id !== allowedGithubId) {
  return new Response("アクセスが許可されていません", { status: 403 });
}
```

### 退会機能
ユーザーが自分のデータをすべて削除できる機能が必要。

- KV から該当 `githubId` のすべてのキーを削除
  - `["inbox", githubId, *]`
  - `["tasks", githubId, *]`
  - `["user_energy", githubId]`
- セッションを削除してサインアウト
- GitHub OAuth アプリの認可を revoke する案内（GitHub 側の操作が必要）

実装イメージ：

```typescript
// utils/db.ts に追加
export async function deleteAllUserData(githubId: number): Promise<void> {
  const kv = await getKv();
  for await (const entry of kv.list({ prefix: ["inbox", githubId] })) {
    await kv.delete(entry.key);
  }
  for await (const entry of kv.list({ prefix: ["tasks", githubId] })) {
    await kv.delete(entry.key);
  }
  await kv.delete(["user_energy", githubId]);
}
```

---

## 法的ドキュメント

### プライバシーポリシー
最低限記載すべき項目：

- 取得する情報：GitHub のユーザーID・ユーザー名
- 利用目的：ログイン認証・データの紐付け
- 保存場所：Deno KV（Deno Deploy のインフラ上）
- 第三者提供：なし
- 保存期間：退会まで／セッションは30日
- 問い合わせ先

### 利用規約
最低限記載すべき項目：

- サービス概要
- 利用条件（GitHub アカウントが必要）
- 禁止事項
- 免責事項
- サービスの変更・終了

---

## セキュリティ追加対応

### OAuth state パラメータ
✅ 実装済み

### 入力バリデーション強化
現状は `priority` / `energy` / `origin` の値チェックが緩い。
不正な値が KV に入らないようにサーバー側でバリデーションを追加する。

```typescript
function validatePriority(v: unknown): 1 | 2 | 3 {
  if (v === 1 || v === 2 || v === 3) return v;
  throw new HttpError(400);
}
```

### レートリミット
大量リクエストへの対策。Deno Deploy 側の機能か、ミドルウェアで実装。

---

## その他

### GitHub OAuth App の設定更新
- Homepage URL・callback URL を本番ドメインに変更
- `localhost` 用と本番用で OAuth App を分けることを推奨

### サインアウトの挙動
GitHub の認可が残るため、サインアウト後も即座に再ログインできる。
UX 上の問題になる場合は設定画面に「GitHub の認可を revoke する」リンクを追加することを検討。

```
https://github.com/settings/connections/applications/{CLIENT_ID}
```
