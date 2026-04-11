let _kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!_kv) {
    _kv = await Deno.openKv();
  }
  return _kv;
}

const SESSION_EXPIRE_MS = 30 * 24 * 60 * 60 * 1000; // 30日

export interface Session {
  githubId: number;
  githubLogin: string;
  createdAt: number;
}

export async function createSession(
  data: Omit<Session, "createdAt">,
): Promise<string> {
  const kv = await getKv();
  const sessionId = crypto.randomUUID();
  const session: Session = { ...data, createdAt: Date.now() };
  await kv.set(["sessions", sessionId], session, {
    expireIn: SESSION_EXPIRE_MS,
  });
  return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const kv = await getKv();
  const result = await kv.get<Session>(["sessions", sessionId]);
  return result.value;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const kv = await getKv();
  await kv.delete(["sessions", sessionId]);
}
