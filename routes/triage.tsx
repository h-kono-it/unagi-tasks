import { page } from "fresh";
import { define } from "../utils.ts";
import {
  deleteFromInbox,
  listInbox,
  type InboxItem,
  promoteToTask,
  type Task,
} from "../utils/db.ts";

export const handlers = define.handlers({
  async GET(ctx) {
    const { githubId } = ctx.state.session!;
    const items = await listInbox(githubId);
    if (items.length === 0) {
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }
    return page({ items });
  },

  async POST(ctx) {
    const { githubId } = ctx.state.session!;
    const form = await ctx.req.formData();
    const action = form.get("action")?.toString();
    const inboxId = form.get("inboxId")?.toString() ?? "";

    if (action === "promote") {
      const title = form.get("title")?.toString() ?? "";
      const origin = form.get("origin")?.toString() as Task["origin"];
      const energy = Number(form.get("energy")) as Task["energy"];
      const priority = Number(form.get("priority")) as Task["priority"];
      const dueDate = form.get("dueAt")?.toString();
      const dueAt = dueDate ? new Date(dueDate).getTime() : undefined;
      await promoteToTask(githubId, inboxId, { title, origin, energy, priority, dueAt });
    } else if (action === "delete") {
      await deleteFromInbox(githubId, inboxId);
    }

    return new Response(null, { status: 302, headers: { Location: "/triage" } });
  },
});

function TriageSlide({ item, first }: { item: InboxItem; first: boolean }) {
  return (
    <div class={`triage-slide${first ? "" : " hidden"}`}>
      {/* タイトル */}
      <div class="bg-gray-900 border border-gray-800 rounded-xl px-6 py-5 mb-8">
        <p class="text-xl font-medium leading-snug">{item.title}</p>
      </div>

      {/* 属性フォーム */}
      <form method="POST">
        <input type="hidden" name="action" value="promote" />
        <input type="hidden" name="inboxId" value={item.id} />
        <input type="hidden" name="title" value={item.title} />

        {/* 発生源 */}
        <fieldset class="mb-6">
          <legend class="text-xs text-gray-500 tracking-widest uppercase mb-3">
            発生源
          </legend>
          <div class="flex gap-3">
            {(["internal", "external"] as const).map((o) => (
              <label key={o} class="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="origin"
                  value={o}
                  required
                  class="sr-only peer"
                />
                <div class="text-center py-3 border border-gray-700 rounded-lg text-sm peer-checked:border-blue-500 peer-checked:bg-blue-950 peer-checked:text-blue-200 hover:border-gray-500 transition-colors">
                  {o === "internal" ? "自分から" : "人から"}
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 重要度 */}
        <fieldset class="mb-6">
          <legend class="text-xs text-gray-500 tracking-widest uppercase mb-3">
            重要度
          </legend>
          <div class="flex gap-3">
            {([1, 2, 3] as const).map((v) => (
              <label key={v} class="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  value={String(v)}
                  required
                  class="sr-only peer"
                />
                <div class="text-center py-3 border border-gray-700 rounded-lg text-sm peer-checked:border-yellow-500 peer-checked:bg-yellow-950 peer-checked:text-yellow-200 hover:border-gray-500 transition-colors">
                  {v === 1 ? "低" : v === 2 ? "中" : "高"}
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 集中度 */}
        <fieldset class="mb-8">
          <legend class="text-xs text-gray-500 tracking-widest uppercase mb-3">
            必要な集中度
          </legend>
          <div class="flex gap-3">
            {([1, 2, 3] as const).map((v) => (
              <label key={v} class="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="energy"
                  value={String(v)}
                  required
                  class="sr-only peer"
                />
                <div class="text-center py-3 border border-gray-700 rounded-lg text-sm peer-checked:border-purple-500 peer-checked:bg-purple-950 peer-checked:text-purple-200 hover:border-gray-500 transition-colors">
                  {v === 1 ? "低" : v === 2 ? "中" : "高"}
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 期日（任意） */}
        <div class="mb-8">
          <label class="text-xs text-gray-500 tracking-widest uppercase block mb-3">
            期日（任意）
          </label>
          <input
            type="date"
            name="dueAt"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-gray-500"
          />
        </div>

        <button
          type="submit"
          class="w-full py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 mb-3"
        >
          タスクに追加
        </button>
      </form>

      <form method="POST">
        <input type="hidden" name="action" value="delete" />
        <input type="hidden" name="inboxId" value={item.id} />
        <button
          type="submit"
          class="w-full py-3 bg-transparent text-gray-600 hover:text-red-400 rounded-lg text-sm"
        >
          削除（不要だった）
        </button>
      </form>
    </div>
  );
}

export default define.page<typeof handlers>(function Triage({ data }) {
  const { items } = data;

  return (
    <main class="min-h-screen max-w-lg mx-auto px-4 py-10">
      {/* ヘッダー */}
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
          <a href="/" class="text-gray-500 hover:text-white text-sm">← 戻る</a>
          <h1 class="text-sm font-medium text-gray-300">インボックス整理</h1>
        </div>
        <span class="text-sm text-gray-500">
          <span id="triage-remaining">{items.length}</span>件残り
        </span>
      </div>

      <div id="triage-area">
        {items.map((item, i) => (
          <TriageSlide key={item.id} item={item} first={i === 0} />
        ))}

        {/* 全件処理完了（最後の1件はサーバー側リダイレクトで処理） */}
        <div id="triage-done" class="hidden text-center py-20">
          <p class="text-gray-400 mb-6">インボックスは空です</p>
          <a
            href="/"
            class="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium"
          >
            ホームへ戻る
          </a>
        </div>
      </div>
    </main>
  );
});
