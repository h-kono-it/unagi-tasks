import { define } from "../utils.ts";
import { getSession } from "../utils/session.ts";

const PUBLIC_PATHS = [
  "/auth/signin",
  "/auth/callback",
  "/auth/github",
  "/privacy",
  "/terms",
];

export default define.middleware(async (ctx) => {
  const url = new URL(ctx.req.url);

  if (PUBLIC_PATHS.some((p) => url.pathname.startsWith(p))) {
    return ctx.next();
  }

  const cookie = ctx.req.headers.get("cookie") ?? "";
  const sessionId = parseCookie(cookie, "session_id");

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      ctx.state.session = session;
      return ctx.next();
    }
  }

  return Response.redirect(new URL("/auth/signin", ctx.req.url));
});

function parseCookie(cookie: string, name: string): string | null {
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
