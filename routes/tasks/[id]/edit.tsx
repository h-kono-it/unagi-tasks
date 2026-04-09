import { page } from "fresh";
import { HttpError } from "fresh";
import { define } from "../../../utils.ts";
import { getTask, updateTask, type Task } from "../../../utils/db.ts";

export const handlers = define.handlers({
  async GET(ctx) {
    const { githubId } = ctx.state.session!;
    const task = await getTask(githubId, ctx.params.id);
    if (!task) throw new HttpError(404);
    return page({ task });
  },

  async POST(ctx) {
    const { githubId } = ctx.state.session!;
    const form = await ctx.req.formData();
    const title = form.get("title")?.toString().trim() ?? "";
    const origin = form.get("origin")?.toString() as Task["origin"];
    const priority = Number(form.get("priority")) as Task["priority"];
    const energy = Number(form.get("energy")) as Task["energy"];
    const dueDate = form.get("dueAt")?.toString();
    const dueAt = dueDate ? new Date(dueDate).getTime() : undefined;

    await updateTask(githubId, ctx.params.id, { title, origin, priority, energy, dueAt });
    return new Response(null, { status: 302, headers: { Location: "/tasks" } });
  },
});

const ORIGIN_OPTIONS = [
  { value: "internal", label: "自分から" },
  { value: "external", label: "人から" },
] as const;

function toDateInput(ms?: number): string {
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

export default define.page<typeof handlers>(function EditTask({ data }) {
  const { task } = data;

  return (
    <main class="min-h-screen max-w-lg mx-auto px-4 py-10">
      <div class="flex items-center gap-3 mb-8">
        <a href="/tasks" class="text-gray-500 hover:text-white text-sm">← 戻る</a>
        <h1 class="text-sm font-medium text-gray-300">タスクを編集</h1>
      </div>

      <form method="POST" class="space-y-6">
        {/* タイトル */}
        <div>
          <label class="text-xs text-gray-500 tracking-widest uppercase block mb-2">
            タイトル
          </label>
          <input
            type="text"
            name="title"
            value={task.title}
            required
            class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-gray-500"
          />
        </div>

        {/* 発生源 */}
        <fieldset>
          <legend class="text-xs text-gray-500 tracking-widest uppercase mb-3">
            発生源
          </legend>
          <div class="flex gap-3">
            {ORIGIN_OPTIONS.map((o) => (
              <label key={o.value} class="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="origin"
                  value={o.value}
                  checked={task.origin === o.value}
                  required
                  class="sr-only peer"
                />
                <div class="text-center py-3 border border-gray-700 rounded-lg text-sm peer-checked:border-blue-500 peer-checked:bg-blue-950 peer-checked:text-blue-200 hover:border-gray-500 transition-colors">
                  {o.label}
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 重要度 */}
        <fieldset>
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
                  checked={task.priority === v}
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
        <fieldset>
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
                  checked={task.energy === v}
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

        {/* 期日 */}
        <div>
          <label class="text-xs text-gray-500 tracking-widest uppercase block mb-2">
            期日（任意）
          </label>
          <input
            type="date"
            name="dueAt"
            value={toDateInput(task.dueAt)}
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-gray-500"
          />
        </div>

        <button
          type="submit"
          class="w-full py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100"
        >
          保存
        </button>
      </form>
    </main>
  );
});
