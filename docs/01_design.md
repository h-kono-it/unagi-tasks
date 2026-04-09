## 0. 認証設計

### 方式: GitHub OAuth

個人利用のWebアプリのため、GitHub OAuthで認証し、自分のGitHub IDのみアクセスを許可するホワイトリスト方式を採用する。

#### フロー
```
ユーザー → /auth/signin → GitHub認証画面 → /auth/callback
→ GitHubユーザー情報取得 → ALLOWED_GITHUB_IDと照合
→ 一致: Deno KVにセッション保存 → トップページへ
→ 不一致: 403
```

#### ファイル構成
```
routes/
  auth/
    signin.ts     # GitHubへリダイレクト
    callback.ts   # コールバック処理 + セッション発行
    signout.ts    # セッション削除
  _middleware.ts  # 全ルートの認証チェック（/auth/* は除外）
utils/
  session.ts      # Deno KVでのセッション管理
```

#### 環境変数
| 変数名 | 用途 |
|---|---|
| `GITHUB_CLIENT_ID` | OAuth App の Client ID |
| `GITHUB_CLIENT_SECRET` | OAuth App の Client Secret |
| `ALLOWED_GITHUB_ID` | 許可するGitHub数値ID（自分のID） |
| `SESSION_SECRET` | セッショントークン署名用の秘密鍵 |

#### セッション管理
- セッションIDをCookieに保存（HttpOnly, Secure, SameSite=Lax）
- セッションデータはDeno KVに保存: `["sessions", sessionId]`
- 有効期限: 30日

---

Denoの**Freshフレームワーク**ですね。Preactベースのアイランドアーキテクチャによる高速な描画と、**Deno KV**のシームレスな統合は、今回の「爆速で判断・入力する」という目的に非常にマッチしています。

「判断コストをゼロにする」ための具体的なシステム設計図と実装ロードマップをまとめました。

---

## 1. プロジェクト構成案 (Fresh)
Freshの標準的な構造に、ロジック層を分離した構成です。

```text
my-todo-app/
├── routes/
│   ├── index.tsx          # メイン：Focus View（今の1件を表示）
│   ├── api/
│   │   └── tasks.ts       # Deno KV 操作用のAPIエンドポイント
│   └── inbox.tsx          # 差し込みタスクのクイック入力画面
├── islands/
│   ├── TaskController.tsx # タスク完了/スキップの制御
│   └── QuickInput.tsx     # 爆速入力用コンポーネント
├── utils/
│   ├── kv.ts              # Deno KV の初期化とラッパー
│   └── logic.ts           # 優先度算出スコアリングロジック
└── dev.ts / main.ts
```

---

## 2. データベース設計 (Deno KV)
Deno KVはキー・バリュー型ですが、階層構造を持たせることで柔軟に検索できます。

* **Key設計:**
    * `["tasks", user_id, task_id]` : 全タスクのマスターデータ
    * `["inbox", user_id, task_id]` : 未整理の「差し込み」タスク（一時保存）
    * `["stats", user_id, "current_focus"]` : 現在取り組んでいるタスクのID

---

## 3. 「判断を自動化する」ロジック実装（イメージ）
`utils/logic.ts` に、迷いを断ち切るためのスコアリング関数を実装します。

```typescript
// utils/logic.ts
export interface Task {
  id: string;
  title: string;
  origin: 'internal' | 'external';
  energy: 1 | 2 | 3; // 1: 低, 3: 高
  priority: 1 | 2 | 3; // 1: 低, 3: 高
  createdAt: number;
}

export function calculateScore(task: Task, userEnergy: number): number {
  // 基本スコア：重要度と経過時間を加味
  const ageInHours = (Date.now() - task.createdAt) / (1000 * 60 * 60);
  let score = task.priority * 10 + ageInHours;

  // ユーザーの現在のエネルギー状態に合わせてブースト
  // 疲れている時は、Energyコストが低いタスクのスコアを上げる
  if (userEnergy < 2 && task.energy === 1) {
    score += 20;
  }
  
  return score;
}
```

---

## 4. 画面設計の仕様

### A. Focus View (メイン画面)
* **1 Task Only:** 画面中央に、スコアが最も高いタスクを1つだけ巨大に表示。
* **Next Buttons:** 「完了（Done）」「今は無理（Skip）」「削除（Delete）」の3ボタンのみ。
* **Hotkeys:** `Enter`で完了、`S`でスキップなど。

### B. Quick Inbox (割り込み用)
* PCの端に常に置いておく、または特定のショートカットでフォーカスが当たる入力欄。
* **No Selection:** カテゴリや期限は選ばせない。「入力してEnter」だけで `["inbox", ...]` に保存し、即座に元の作業に戻れるようにします。

---

## 5. 実装ロードマップ (MVP)

1.  **Phase 1: 骨組み作成**
    * Freshプロジェクトのセットアップ。
    * `utils/kv.ts` で Deno KV の接続確認。
2.  **Phase 2: インボックス実装**
    * テキストを入力して Deno KV に `inbox` として保存するAPIとIsland。
3.  **Phase 3: スコアリング＆表示**
    * `inbox` 内のアイテムを `calculateScore` でソートし、トップ1件をメイン画面に出す。
4.  **Phase 4: 割り込み整理フェーズ**
    * 一定時間ごとに「整理モード」に切り替わり、溜まった `inbox` に属性（Energy, Priority）を付与して `tasks` に移動させるUI。

---

### 最初の実装ポイント
まずは **「Deno KV にタスクを投げ込み、それをリストで出す」** という一番シンプルな部分からコードに落としていきましょうか。
