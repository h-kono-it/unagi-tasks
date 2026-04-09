import { page } from "fresh";
import { define } from "../utils.ts";
import {
  addToInbox,
  completeTask,
  deleteTask,
  getUserEnergy,
  listActiveTasks,
  listInbox,
  setUserEnergy,
} from "../utils/db.ts";
import { sortTasksByScore } from "../utils/logic.ts";

export const handlers = define.handlers({
  async GET(ctx) {
    const { githubId } = ctx.state.session!;
    const skippedIds = new URL(ctx.req.url).searchParams.getAll("skip");

    const [allTasks, inboxItems, userEnergy] = await Promise.all([
      listActiveTasks(githubId),
      listInbox(githubId),
      getUserEnergy(githubId),
    ]);

    const sorted = sortTasksByScore(allTasks, userEnergy).filter(
      (t) => !skippedIds.includes(t.id),
    );

    return page({
      currentTask: sorted[0] ?? null,
      inboxCount: inboxItems.length,
      userEnergy,
    });
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
    } else if (action === "add") {
      const title = form.get("title")?.toString().trim();
      if (title) await addToInbox(githubId, title);
    } else if (action === "set_energy") {
      const e = Number(form.get("energy")) as 1 | 2 | 3;
      if (e >= 1 && e <= 3) await setUserEnergy(githubId, e);
    }

    return new Response(null, { status: 302, headers: { Location: "/" } });
  },
});

const ENERGY_LABELS: Record<1 | 2 | 3, string> = { 1: "低", 2: "中", 3: "高" };

export default define.page<typeof handlers>(function Home({ data, state, url }) {
  const session = state.session!;
  const { currentTask, inboxCount, userEnergy } = data;

  const skipUrl = currentTask ? (() => {
    const u = new URL(url);
    u.searchParams.append("skip", currentTask.id);
    return u.toString();
  })() : "/";

  return (
    <main class="min-h-screen max-w-2xl mx-auto px-4 py-10 flex flex-col">
      {/* ヘッダー */}
      <div class="flex items-center justify-between mb-10">
        <div class="flex items-center gap-4">
          <a
            href="/triage"
            class="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            インボックス
            {inboxCount > 0 && (
              <span class="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {inboxCount}
              </span>
            )}
          </a>
          <a href="/tasks" class="text-sm text-gray-400 hover:text-white">
            タスク一覧
          </a>
        </div>
        <form method="POST" class="flex items-center gap-1">
          <input type="hidden" name="action" value="set_energy" />
          <span class="text-xs text-gray-600 mr-1">集中度</span>
          {([1, 2, 3] as const).map((e) => (
            <button
              key={e}
              type="submit"
              name="energy"
              value={String(e)}
              class={`px-2 py-0.5 rounded text-xs ${
                userEnergy === e
                  ? "bg-white text-black"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              {ENERGY_LABELS[e]}
            </button>
          ))}
        </form>
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-600">{session.githubLogin}</span>
          <form method="POST" action="/auth/signout">
            <button
              type="submit"
              class="text-xs text-gray-600 hover:text-gray-400"
            >
              サインアウト
            </button>
          </form>
        </div>
      </div>

      {/* フォーカスエリア */}
      <div class="flex-1 flex flex-col items-center justify-center text-center">
        {currentTask
          ? (
            <>
              <p class="text-xs text-gray-500 tracking-widest uppercase mb-6">
                今やること
              </p>
              <h2 class="text-4xl font-bold leading-snug mb-4">
                {currentTask.title}
              </h2>
              {currentTask.dueAt && (() => {
                const DAY_MS = 1000 * 60 * 60 * 24;
                const d = Math.floor(currentTask.dueAt / DAY_MS) - Math.floor(Date.now() / DAY_MS);
                const label = d < 0 ? `${Math.abs(d)}日超過` : d === 0 ? "今日が期日" : `期日まで${d}日`;
                const color = d < 0 ? "text-red-400" : d === 0 ? "text-orange-400" : "text-yellow-400";
                return <p class={`text-sm mb-10 ${color}`}>{label}</p>;
              })()}
              {!currentTask.dueAt && <div class="mb-12" />}
              <div class="flex gap-3">
                <form method="POST">
                  <input type="hidden" name="action" value="complete" />
                  <input type="hidden" name="id" value={currentTask.id} />
                  <button
                    type="submit"
                    class="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium"
                  >
                    完了
                  </button>
                </form>
                <a
                  href={skipUrl}
                  class="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium"
                >
                  スキップ
                </a>
                <form method="POST">
                  <input type="hidden" name="action" value="delete" />
                  <input type="hidden" name="id" value={currentTask.id} />
                  <button
                    type="submit"
                    class="px-8 py-3 bg-gray-900 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded-lg font-medium"
                  >
                    削除
                  </button>
                </form>
              </div>
            </>
          )
          : inboxCount > 0
          ? (
            <div>
              <p class="text-gray-400 mb-6">整理待ちのタスクがあります</p>
              <a
                href="/triage"
                class="px-6 py-3 bg-blue-700 hover:bg-blue-600 rounded-lg font-medium"
              >
                インボックスを整理する（{inboxCount}件）
              </a>
            </div>
          )
          : (
            <p class="text-gray-500">タスクなし。お疲れさまでした！</p>
          )}
      </div>

      {/* クイック入力 */}
      <form method="POST" class="mt-10">
        <input type="hidden" name="action" value="add" />
        <div class="flex gap-2">
          <input
            id="quick-input"
            type="text"
            name="title"
            placeholder="気になったことを投げ込む...  [i]"
            autofocus
            class="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-gray-600 text-sm"
          />
          <button
            type="submit"
            class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
          >
            追加
          </button>
        </div>
      </form>
    </main>
  );
});
