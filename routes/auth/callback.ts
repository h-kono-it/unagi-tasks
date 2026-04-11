import { define } from "../../utils.ts";
import { createSession } from "../../utils/session.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return new Response("認証コードがありません", { status: 400 });
    }

    // state 検証（OAuth CSRF対策）
    const cookie = ctx.req.headers.get("cookie") ?? "";
    const storedState = cookie.match(/(?:^|; )oauth_state=([^;]*)/)?.[1];
    if (!state || state !== storedState) {
      return new Response("不正なリクエストです", { status: 403 });
    }

    const clientId = Deno.env.get("GITHUB_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GITHUB_CLIENT_SECRET")!;

    // アクセストークンの取得
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      },
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return new Response("アクセストークンの取得に失敗しました", {
        status: 401,
      });
    }

    // GitHubユーザー情報の取得
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });
    const user = await userRes.json();

    // セッション発行
    const sessionId = await createSession({
      githubId: user.id,
      githubLogin: user.login,
    });

    const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
    const cookieFlags = isProduction
      ? "HttpOnly; Secure; SameSite=Lax"
      : "HttpOnly; SameSite=Lax";

    const headers = new Headers({ Location: "/" });
    headers.append(
      "Set-Cookie",
      `session_id=${sessionId}; ${cookieFlags}; Max-Age=${
        30 * 24 * 60 * 60
      }; Path=/`,
    );

    return new Response(null, { status: 302, headers });
  },
});
