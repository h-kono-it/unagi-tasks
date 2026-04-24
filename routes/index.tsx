import { page } from "fresh";
import { define } from "../utils.ts";
import {
  addToInbox,
  completeTask,
  deleteTask,
  listActiveTasks,
  listInbox,
} from "../utils/db.ts";
import { sortTasksByScore } from "../utils/logic.ts";
import type { Task } from "../utils/db.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const { githubId } = ctx.state.session!;

    const [allTasks, inboxItems] = await Promise.all([
      listActiveTasks(githubId),
      listInbox(githubId),
    ]);

    return page({
      tasks: sortTasksByScore(allTasks),
      inboxCount: inboxItems.length,
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

export default define.page<typeof handler>(function Home({ data, state }) {
  const session = state.session!;
  const { tasks, inboxCount } = data;

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
          <div class="flex items-center gap-3">
            <a
              href="/account"
              class="text-xs text-gray-600 hover:text-gray-400"
            >
              {session.githubLogin}
            </a>
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
        {/* 2行目: 集中度セレクター */}
        <div id="energy-form" class="flex items-center gap-2">
          <span class="text-xs text-gray-600 shrink-0">集中度</span>
          <div class="flex flex-1 gap-2">
            {([1, 2, 3] as const).map((e) => (
              <button
                key={e}
                type="button"
                data-energy={String(e)}
                class={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  e === 2
                    ? "bg-white text-black"
                    : "bg-gray-900 text-gray-500 hover:text-white"
                }`}
              >
                {ENERGY_LABELS[e]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* タスクデータ（クライアントサイドスコア計算用） */}
      <div
        id="tasks-json"
        data-tasks={JSON.stringify(tasks)}
        style="display:none"
      />

      {/* フォーカスエリア: 全タスクをSSRして hidden で制御、スキップはclient.tsで処理 */}
      <div
        id="focus-area"
        class="flex-1 flex flex-col items-center justify-center text-center"
      >
        {tasks.length > 0
          ? (
            <>
              {tasks.map((task, i) => (
                <TaskCard key={task.id} task={task} first={i === 0} />
              ))}
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
                インボックスを整理する（<span id="triage-count">
                  {inboxCount}
                </span>件）
              </a>
            </div>
          )
          : <p class="text-gray-500">タスクなし。お疲れさまでした！</p>}
      </div>

      {/* ポモドーロタイマー */}
      <div id="pomodoro" class="mt-auto pt-8 pb-2">
        <div class="p-4 bg-gray-900 border border-gray-800 rounded-xl">
          {/* フェーズ + 時計 */}
          <div class="flex items-center justify-between mb-3">
            <span
              id="pomo-phase"
              class="text-sm font-semibold px-3 py-1 rounded-full bg-blue-900 text-blue-300"
            >
              集中
            </span>
            <span
              id="pomo-display"
              class="text-3xl font-mono font-bold tabular-nums"
            >
              25:00
            </span>
            <div class="flex gap-2">
              <button
                id="pomo-start"
                type="button"
                class="px-4 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-sm font-medium"
              >
                スタート
              </button>
              <button
                id="pomo-stop"
                type="button"
                class="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium hidden"
              >
                ストップ
              </button>
            </div>
          </div>
          {/* プログレスバー */}
          <div class="w-full bg-gray-800 rounded-full h-1 mb-3">
            <div
              id="pomo-bar"
              class="bg-blue-500 h-1 rounded-full"
              style="width:100%"
            />
          </div>
          {/* 設定 */}
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
            <label class="flex items-center gap-1">
              集中
              <select
                id="pomo-focus-min"
                class="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-white"
              >
                {[1, 5, 10, 15, 20, 25, 30, 45, 60].map((m) => (
                  <option key={m} value={String(m)} selected={m === 25}>
                    {m}
                  </option>
                ))}
              </select>
              分
            </label>
            <label class="flex items-center gap-1">
              休憩
              <select
                id="pomo-break-min"
                class="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-white"
              >
                {[1, 3, 5, 10, 15].map((m) => (
                  <option key={m} value={String(m)} selected={m === 5}>
                    {m}
                  </option>
                ))}
              </select>
              分
            </label>
            <label class="flex items-center gap-1">
              音量
              <input
                id="pomo-volume"
                type="range"
                min="0"
                max="100"
                value="50"
                class="w-20 accent-blue-500"
              />
            </label>
            <button
              id="pomo-sound-test"
              type="button"
              class="hover:text-white"
            >
              サウンド確認
            </button>
          </div>
        </div>
      </div>

      {/* クイック入力 */}
      <form method="POST" class="mt-4">
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
