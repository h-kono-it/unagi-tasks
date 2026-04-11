import { page } from "fresh";
import { define } from "../utils.ts";
import { completeTask, deleteTask, listActiveTasks } from "../utils/db.ts";
import { sortTasksByScore } from "../utils/logic.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const { githubId } = ctx.state.session!;
    const tasks = await listActiveTasks(githubId);
    return page({ tasks: sortTasksByScore(tasks) });
  },

  async POST(ctx) {
    const { githubId } = ctx.state.session!;
    const form = await ctx.req.formData();
    const action = form.get("action")?.toString();
    const id = form.get("id")?.toString();

    if (action === "complete" && id) {
      await completeTask(githubId, id);
    } else if (action === "delete" && id) {
      await deleteTask(githubId, id);
    }

    return new Response(null, { status: 302, headers: { Location: "/tasks" } });
  },
});

const ORIGIN_LABEL = { internal: "自分", external: "依頼" };
const LEVEL_LABEL = { 1: "低", 2: "中", 3: "高" };

function daysUntil(dueAt: number): number {
  const DAY_MS = 1000 * 60 * 60 * 24;
  return Math.floor(dueAt / DAY_MS) - Math.floor(Date.now() / DAY_MS);
}

function dueLabel(dueAt?: number): string | null {
  if (!dueAt) return null;
  const d = daysUntil(dueAt);
  if (d < 0) return `${Math.abs(d)}日超過`;
  if (d === 0) return "今日";
  return `${d}日後`;
}

function dueColor(dueAt?: number): string {
  if (!dueAt) return "";
  const d = daysUntil(dueAt);
  if (d < 0) return "text-red-400";
  if (d === 0) return "text-orange-400";
  if (d <= 3) return "text-yellow-400";
  return "text-gray-500";
}

export default define.page<typeof handler>(function Tasks({ data }) {
  const { tasks } = data;

  return (
    <main class="min-h-screen max-w-2xl mx-auto px-4 py-10">
      <div class="flex items-center gap-4 mb-8">
        <a href="/" class="text-gray-500 hover:text-white text-sm">← 戻る</a>
        <h1 class="text-sm font-medium text-gray-300">タスク一覧</h1>
        <span class="text-sm text-gray-600">{tasks.length}件</span>
      </div>

      {tasks.length === 0
        ? <p class="text-center text-gray-600 py-20">未完了タスクなし</p>
        : (
          <ul class="space-y-2">
            {tasks.map((task, i) => (
              <li
                key={task.id}
                class="px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg"
              >
                {/* 1行目: 番号 + タイトル */}
                <div class="flex items-start gap-2 mb-2">
                  <span class="text-xs text-gray-600 w-4 shrink-0 pt-0.5">
                    {i + 1}
                  </span>
                  <span class="flex-1 text-sm leading-snug">{task.title}</span>
                </div>
                {/* 2行目: 属性 + アクション */}
                <div class="flex items-center justify-between pl-6">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs text-gray-600">
                      {ORIGIN_LABEL[task.origin]}{" "}
                      ／ 重{LEVEL_LABEL[task.priority]}{" "}
                      ／ 集{LEVEL_LABEL[task.energy]}
                    </span>
                    {dueLabel(task.dueAt) && (
                      <span class={`text-xs ${dueColor(task.dueAt)}`}>
                        {dueLabel(task.dueAt)}
                      </span>
                    )}
                  </div>
                  <div class="flex items-center gap-3 shrink-0 ml-2">
                    <a
                      href={`/tasks/${task.id}/edit`}
                      class="text-xs text-gray-600 hover:text-white"
                    >
                      編集
                    </a>
                    <form method="POST" class="flex gap-2">
                      <input type="hidden" name="id" value={task.id} />
                      <button
                        type="submit"
                        name="action"
                        value="complete"
                        class="text-xs text-gray-600 hover:text-green-400"
                      >
                        完了
                      </button>
                      <button
                        type="submit"
                        name="action"
                        value="delete"
                        class="text-xs text-gray-600 hover:text-red-400"
                      >
                        削除
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
    </main>
  );
});
