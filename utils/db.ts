let _kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!_kv) _kv = await Deno.openKv();
  return _kv;
}

// クイック入力で貯まる未整理アイテム
export interface InboxItem {
  id: string;
  title: string;
  createdAt: number;
}

// 整理済みタスク（属性あり）
export interface Task {
  id: string;
  title: string;
  origin: "internal" | "external";
  energy: 1 | 2 | 3;
  priority: 1 | 2 | 3;
  createdAt: number;
  status: "todo" | "done";
  dueAt?: number; // Unix ms
  doneAt?: number; // Unix ms（完了時に記録）
}

// --- Inbox ---

export async function addToInbox(
  githubId: number,
  title: string,
): Promise<InboxItem> {
  const kv = await getKv();
  const item: InboxItem = {
    id: crypto.randomUUID(),
    title,
    createdAt: Date.now(),
  };
  await kv.set(["inbox", githubId, item.id], item);
  return item;
}

export async function listInbox(githubId: number): Promise<InboxItem[]> {
  const kv = await getKv();
  const items: InboxItem[] = [];
  for await (
    const entry of kv.list<InboxItem>({ prefix: ["inbox", githubId] })
  ) {
    items.push(entry.value);
  }
  return items.sort((a, b) => a.createdAt - b.createdAt); // 古い順（整理しやすい）
}

export async function deleteFromInbox(
  githubId: number,
  id: string,
): Promise<void> {
  const kv = await getKv();
  await kv.delete(["inbox", githubId, id]);
}

// --- Tasks ---

export async function promoteToTask(
  githubId: number,
  inboxId: string,
  attrs: Pick<Task, "title" | "origin" | "energy" | "priority" | "dueAt">,
): Promise<Task> {
  const kv = await getKv();
  const task: Task = {
    id: crypto.randomUUID(),
    ...attrs,
    createdAt: Date.now(),
    status: "todo",
  };
  await kv.atomic()
    .delete(["inbox", githubId, inboxId])
    .set(["tasks", githubId, task.id], task)
    .commit();
  return task;
}

export async function listActiveTasks(githubId: number): Promise<Task[]> {
  const kv = await getKv();
  const tasks: Task[] = [];
  for await (const entry of kv.list<Task>({ prefix: ["tasks", githubId] })) {
    if (entry.value.status === "todo") tasks.push(entry.value);
  }
  return tasks;
}

export async function completeTask(
  githubId: number,
  id: string,
): Promise<void> {
  const kv = await getKv();
  const result = await kv.get<Task>(["tasks", githubId, id]);
  if (!result.value) return;
  await kv.set(["tasks", githubId, id], {
    ...result.value,
    status: "done",
    doneAt: Date.now(),
  });
}

export async function deleteTask(githubId: number, id: string): Promise<void> {
  const kv = await getKv();
  await kv.delete(["tasks", githubId, id]);
}

export async function getTask(
  githubId: number,
  id: string,
): Promise<Task | null> {
  const kv = await getKv();
  const result = await kv.get<Task>(["tasks", githubId, id]);
  return result.value;
}

export async function updateTask(
  githubId: number,
  id: string,
  attrs: Pick<Task, "title" | "origin" | "energy" | "priority" | "dueAt">,
): Promise<void> {
  const kv = await getKv();
  const result = await kv.get<Task>(["tasks", githubId, id]);
  if (!result.value) return;
  await kv.set(["tasks", githubId, id], { ...result.value, ...attrs });
}

// --- User Energy ---

export async function getUserEnergy(githubId: number): Promise<1 | 2 | 3> {
  const kv = await getKv();
  const result = await kv.get<1 | 2 | 3>(["user_energy", githubId]);
  return result.value ?? 2;
}

export async function setUserEnergy(
  githubId: number,
  energy: 1 | 2 | 3,
): Promise<void> {
  const kv = await getKv();
  await kv.set(["user_energy", githubId], energy);
}

// --- Account ---

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
