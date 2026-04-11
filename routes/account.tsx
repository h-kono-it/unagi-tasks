import { page } from "fresh";
import { define } from "../utils.ts";
import { deleteAllUserData } from "../utils/db.ts";
import { deleteSession } from "../utils/session.ts";

export const handler = define.handlers({
  GET(ctx) {
    return page({ session: ctx.state.session! });
  },

  async POST(ctx) {
    const { githubId } = ctx.state.session!;
    const form = await ctx.req.formData();
    const action = form.get("action")?.toString();

    if (action === "delete_account") {
      await deleteAllUserData(githubId);

      const cookie = ctx.req.headers.get("cookie") ?? "";
      const match = cookie.match(/(?:^|; )session_id=([^;]*)/);
      const sessionId = match ? decodeURIComponent(match[1]) : null;
      if (sessionId) await deleteSession(sessionId);

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
    }

    return new Response(null, {
      status: 302,
      headers: { Location: "/account" },
    });
  },
});

export default define.page<typeof handler>(function Account({ data }) {
  const { session } = data;

  return (
    <main class="min-h-screen max-w-lg mx-auto px-4 py-10">
      <div class="flex items-center gap-3 mb-8">
        <a href="/" class="text-gray-500 hover:text-white text-sm">← 戻る</a>
        <h1 class="text-sm font-medium text-gray-300">アカウント設定</h1>
      </div>

      <section class="mb-10">
        <h2 class="text-xs text-gray-500 tracking-widest uppercase mb-4">
          アカウント情報
        </h2>
        <div class="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 text-sm">
          <p class="text-gray-400">
            GitHub アカウント：
            <span class="text-white font-medium">@{session.githubLogin}</span>
          </p>
        </div>
      </section>

      <section>
        <h2 class="text-xs text-gray-500 tracking-widest uppercase mb-4">
          退会
        </h2>
        <div class="bg-gray-900 border border-red-900 rounded-xl px-5 py-5">
          <p class="text-sm text-gray-400 mb-5">
            退会すると、すべてのタスク・インボックスデータが削除されます。この操作は取り消せません。
          </p>
          <form method="POST">
            <input type="hidden" name="action" value="delete_account" />
            <button
              type="submit"
              class="w-full py-2.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 rounded-lg text-sm font-medium transition-colors"
            >
              退会してデータを削除する
            </button>
          </form>
        </div>
        <p class="mt-4 text-xs text-gray-600">
          GitHub との連携を解除したい場合は
          <a
            href="https://github.com/settings/applications"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-gray-400"
          >
            GitHub の認可済みアプリ設定
          </a>
          から行ってください。
        </p>
      </section>
    </main>
  );
});
