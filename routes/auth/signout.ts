import { define } from "../../utils.ts";
import { deleteSession } from "../../utils/session.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const cookie = ctx.req.headers.get("cookie") ?? "";
    const match = cookie.match(/(?:^|; )session_id=([^;]*)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;

    if (sessionId) {
      await deleteSession(sessionId);
    }

    const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
    const cookieFlags = isProduction
      ? "HttpOnly; Secure; SameSite=Lax"
      : "HttpOnly; SameSite=Lax";

    const headers = new Headers({ Location: "/auth/signin" });
    headers.append(
      "Set-Cookie",
      `session_id=; ${cookieFlags}; Max-Age=0; Path=/`,
    );

    return new Response(null, { status: 302, headers });
  },
});
