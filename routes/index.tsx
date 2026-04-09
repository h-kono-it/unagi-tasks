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
import type { Task } from "../utils/db.ts";

export const handlers = define.handlers({
  async GET(ctx) {
    const { githubId } = ctx.state.session!;

    const [allTasks, inboxItems, userEnergy] = await Promise.all([
      listActiveTasks(githubId),
      listInbox(githubId),
      getUserEnergy(githubId),
    ]);

    return page({
      tasks: sortTasksByScore(allTasks, userEnergy),
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
const DAY_MS = 1000 * 60 * 60 * 24;

function DueLabel({ dueAt }: { dueAt: number }) {
  const d = Math.floor(dueAt / DAY_MS) - Math.floor(Date.now() / DAY_MS);
  const label = d < 0
    ? `${Math.abs(d)}日超過`
    : d === 0
    ? "今日が期日"
    : `期日まで${d}日`;
  const color = d < 0
    ? "text-red-400"
    : d === 0
    ? "text-orange-400"
    : "text-yellow-400";
  return <p class={`text-sm mb-10 ${color}`}>{label}</p>;
}

function TaskCard({ task, first }: { task: Task; first: boolean }) {
  return (
    <div
      class={`task-card w-full${first ? "" : " hidden"}`}
      data-task-id={task.id}
    >
      <p class="text-xs text-gray-500 tracking-widest uppercase mb-6">
        今やること
      </p>
      <h2 class="text-4xl font-bold leading-snug mb-4">{task.title}</h2>
      {task.dueAt ? <DueLabel dueAt={task.dueAt} /> : <div class="mb-12" />}
      <div class="flex gap-3 justify-center">
        <form method="POST">
          <input type="hidden" name="action" value="complete" />
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            class="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium"
          >
            完了
          </button>
        </form>
        <button
          type="button"
          data-skip
          class="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium"
        >
          スキップ
        </button>
        <form method="POST">
          <input type="hidden" name="action" value="delete" />
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            class="px-8 py-3 bg-gray-900 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded-lg font-medium"
          >
            削除
          </button>
        </form>
      </div>
    </div>
  );
}

export default define.page<typeof handlers>(function Home({ data, state }) {
  const session = state.session!;
  const { tasks, inboxCount, userEnergy } = data;

  return (
    <main class="min-h-screen max-w-2xl mx-auto px-4 py-10 flex flex-col">
      {/* ヘッダー */}
      <div class="mb-8 space-y-3">
        {/* 1行目: ナビ + サインアウト */}
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a
              href="/triage"
              class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
            >
              インボックス
              <span
                id="inbox-badge"
                class={`px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full leading-none${
                  inboxCount === 0 ? " hidden" : ""
                }`}
              >
                {inboxCount || 0}
              </span>
            </a>
            <a href="/tasks" class="text-sm text-gray-400 hover:text-white">
              タスク一覧
            </a>
          </div>
          <form method="POST" action="/auth/signout">
            <button
              type="submit"
              class="text-xs text-gray-600 hover:text-gray-400"
            >
              {session.githubLogin} · サインアウト
            </button>
          </form>
        </div>
        {/* 2行目: 集中度セレクター */}
        <form method="POST" class="flex items-center gap-2">
          <input type="hidden" name="action" value="set_energy" />
          <span class="text-xs text-gray-600 shrink-0">集中度</span>
          <div class="flex flex-1 gap-2">
            {([1, 2, 3] as const).map((e) => (
              <button
                key={e}
                type="submit"
                name="energy"
                value={String(e)}
                class={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  userEnergy === e
                    ? "bg-white text-black"
                    : "bg-gray-900 text-gray-500 hover:text-white"
                }`}
              >
                {ENERGY_LABELS[e]}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* フォーカスエリア: 全タスクをSSRして hidden で制御、スキップはclient.tsで処理 */}
      <div
        id="focus-area"
        class="flex-1 flex flex-col items-center justify-center text-center"
      >
        {tasks.length > 0
          ? (
            <>
              {tasks.map((task, i) => <TaskCard task={task} first={i === 0} />)}
              <div id="all-skipped" class="hidden">
                <p class="text-gray-400 mb-6">スキップしたタスクがあります</p>
                <button
                  id="reset-skip"
                  type="button"
                  class="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium"
                >
                  最初からやり直す
                </button>
              </div>
            </>
          )
          : inboxCount > 0
          ? (
            <div class="text-center">
              <p class="text-gray-400 mb-6">整理待ちのタスクがあります</p>
              <a
                href="/triage"
                class="px-6 py-3 bg-blue-700 hover:bg-blue-600 rounded-lg font-medium"
              >
                インボックスを整理する（<span id="triage-count">{inboxCount}</span>件）
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
