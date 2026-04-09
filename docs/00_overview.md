Deno KV や Cloudflare D1 を活用し、**「判断コストの最小化」**に特化したフルスタックアプリの設計案をまとめました。

---

## 1. 開発の目的
既存のTODOアプリにありがちな**「選択肢が多すぎて、次になにをやるか迷う時間」**を排除する。

* **意思決定の自動化:** 独自のアルゴリズムで、差し込みタスクと既存タスクの優先順位を即座に判定する。
* **脳内メモリの即時解放:** 「やり忘れ」「思いつき」を0.5秒で外出しし、現在の集中状態（フロー）を維持する。
* **心理的負荷の軽減:** 「終わらなかったタスク」による罪悪感を、システム的な再配置によって解消する。

---

## 2. 全体仕様
### コア機能
1.  **Velocity Input (爆速インボックス):**
    * ショートカット一発で入力欄を起動。属性入力なしでテキストのみを保存。
2.  **Internal/External Splitter:**
    * 「自分で思いついたこと（内発的）」と「人からの依頼（外発的）」を区別。
3.  **Dynamic Focus View:**
    * 常に「今やるべき1件」＋「次の候補2件」の**計3件しか表示しない**。
4.  **Auto-Sorting Logic:**
    * 重要度・緊急度・見積り時間に加え、「自分の現在のエネルギー残量」を考慮して並び替え。

### 独自の「差し込み管理」ルール
* **2-Minute Rule Bypass:** 入力時に「2分で終わる」フラグを立てると、リストに入らず即タイマーが起動。
* **Batch Sorting:** 差し込みタスクは即座にメインリストに混ざらず、1時間に一度の「整理フェーズ」まで待機（設定で変更可）。

---

## 3. システム設計（アーキテクチャ）

### 技術スタック案
* **Frontend:** React (Next.js or Hono/Client-side) + Tailwind CSS
* **Backend:** Hono (Running on Cloudflare Workers / Deno)
* **Database:**
    * **Cloudflare D1:** 構造化されたタスクデータ、履歴の保存（SQL）。
    * **Cloudflare KV / Deno KV:** 低レイテンシが必要な「現在の実行中タスク」やユーザー設定の保持。
* **Runtime:** Cloudflare Workers or Deno

### データモデル（ER図イメージ）
```typescript
interface Task {
  id: string;
  title: string;
  origin: 'internal' | 'external'; // 発生源
  priority_score: number;          // 自動計算されたスコア
  estimated_minutes: number;       // 見積り
  energy_required: 1 | 2 | 3;      // 必要な集中度 (1:低 ~ 3:高)
  status: 'inbox' | 'todo' | 'doing' | 'done' | 'archived';
  created_at: number;
  due_at?: number;
}
```

---

## 4. 優先度算出アルゴリズム（ドラフト）
「何からやるか」を計算するためのスコア関数を定義します。

$$Score = \frac{(Importance \times Weight_{imp}) + (Urgency \times Weight_{urg})}{EnergyCost}$$

* **重要度 (Importance):** そのタスクが長期的な価値を生むか。
* **緊急度 (Urgency):** 期限までの残り時間。
* **EnergyCost:** 自分の現在の疲労度が高いときは、この値が小さい（＝楽な）タスクのスコアが相対的に上がるように調整。

---

## 5. UI/UX コンセプト
* **Dashboard:** * 中央にデカデカと「今のタスク」を表示。
    * 右端に「差し込みインボックス」がスタックされ、未整理の数がバッジで表示される。
* **Keyboard First:**
    * `i`: インボックス入力
    * `space`: タスク完了（＆次へ）
    * `s`: スキップ（優先度再計算）

---

### 次のステップ：MVP（実証最小限製品）の開発
まずは以下の3点から実装を始めるのがスムーズです。
1.  **D1 / Deno KV への書き込み API 作成**
2.  **テキスト入力だけの極シンプルなフロントエンド**
3.  **入力されたものを「重要度順」に並べて1件ずつ出すロジック**
