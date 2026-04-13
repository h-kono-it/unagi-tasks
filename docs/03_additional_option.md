# 追加オプション機能

一般公開後や機能拡張フェーズで検討する機能。

## 集中度切り替えの応答速度改善

現状、集中度を変更するとサーバーへのPOST＋ページリロードが発生するため、Deno
Deploy の応答速度に依存して若干のもたつきがある。

### 検討案: スコアリングをクライアントで実行

**実施済み**

全タスクを JSON
としてページに埋め込み、集中度切り替え時にクライアント側でスコアを再計算してタスクカードの表示順を入れ替える。サーバーへは
`fetch` でバックグラウンドPOST するだけで済み、リロードが不要になる。

```typescript
// 全タスクを script タグに埋め込む（SSR側）
<script id="tasks-json" type="application/json">
  {JSON.stringify(tasks)}
</script>;

// client.ts 側でスコア再計算 → DOM並び替え
function reorderByEnergy(energy: number) {
  const tasks = JSON.parse(document.getElementById("tasks-json")!.textContent!);
  const sorted = tasks.sort((a, b) =>
    calculateScore(b, energy) - calculateScore(a, energy)
  );
  // task-card の順序を並び替え
}
```

実装量は少ない（スコアリング式のコピーとDOM並び替えで30行程度）。今は優先度が低いため保留するが、気になったタイミングで対応する。

また、集中度切り替えのたびにサーバーリクエストが発生しなくなるため、Deno Deploy
無料枠のリクエスト数・CPU 時間の節約にもなる。

---

## 管理者向け統計機能

登録ユーザー数・タスク数・アクティブユーザー数などを確認できる管理画面。

### cron を使った通知機能

Deno Deploy の cron 機能を使い、定期的にユーザーへ通知を送る。

- 未整理インボックスが N 件以上溜まっているユーザーへのリマインド
- 期限切れタスクがあるユーザーへのアラート
- 週次の完了タスクサマリー

実装イメージ：

```typescript
// cron.ts
Deno.cron("daily reminder", "0 9 * * *", async () => {
  // 全ユーザーを走査してインボックス件数チェック
  // 通知先は GitHub メール or webhook など
});
```

---

## 統計機能

タスクの完了履歴をもとにしたパーソナル統計。

- 1日・1週間・1ヶ月の完了タスク数
- 平均完了時間（タスク作成〜完了までの経過時間）
- 発生源（internal / external）別の割合
- 重要度・集中度別の傾向

現状は完了時にタスクを KV から削除しているため、履歴を残す設計変更が必要。

```typescript
// 完了タスクを削除ではなく status: "done" + doneAt で保存
await kv.set(["tasks", githubId, id], {
  ...task,
  status: "done",
  doneAt: Date.now(),
});
```

### ゲーミフィケーション機能

統計をもとにした達成感の演出。

- 連続完了ストリーク（今日も N 件完了！）
- 累計完了数のマイルストーン表示
- 重要度「高」タスクを完了したときのフィードバック

---

## 無操作ユーザーのタスク削除機能（Deno KV の容量対策）

一般公開後、退会しないまま利用をやめたユーザーのデータが蓄積し続ける問題への対策。

- 最終操作日を `["last_active", githubId]` に記録
- cron で定期的に走査し、N ヶ月以上操作がないユーザーのデータを削除
- 削除前にメール通知（猶予期間を設ける）

```typescript
Deno.cron("cleanup inactive users", "0 3 * * 0", async () => {
  const threshold = Date.now() - 180 * 24 * 60 * 60 * 1000; // 180日
  // last_active が threshold より古いユーザーのデータを削除
});
```

> Deno KV の無料枠は 1GB。ユーザー数が増えてきたタイミングで実装を検討する。
