import { define } from "../../utils.ts";

export const handler = define.handlers({
  GET() {
    const clientId = Deno.env.get("GITHUB_CLIENT_ID");
    if (!clientId) {
      return new Response("GITHUB_CLIENT_ID が設定されていません", {
        status: 500,
      });
    }

    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: clientId,
      scope: "read:user",
      state,
    });

    const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
    const cookieFlags = isProduction
      ? "HttpOnly; Secure; SameSite=Lax"
      : "HttpOnly; SameSite=Lax";

    const headers = new Headers({
      Location: `https://github.com/login/oauth/authorize?${params}`,
    });
    headers.append(
      "Set-Cookie",
      `oauth_state=${state}; ${cookieFlags}; Max-Age=600; Path=/`,
    );

    return new Response(null, { status: 302, headers });
  },
});
