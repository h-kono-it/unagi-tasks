import { define } from "../utils.ts";

export default define.page(function Privacy() {
  return (
    <main class="min-h-screen max-w-2xl mx-auto px-4 py-12 text-white">
      <a
        href="/auth/signin"
        class="text-gray-500 hover:text-white text-sm mb-8 inline-block"
      >
        ← 戻る
      </a>
      <h1 class="text-2xl font-bold mb-8">プライバシーポリシー</h1>

      <div class="space-y-8 text-sm text-gray-300 leading-relaxed">
        <section>
          <h2 class="text-base font-semibold text-white mb-3">取得する情報</h2>
          <p>
            本サービスは、GitHub OAuth 認証を通じて以下の情報を取得します。
          </p>
          <ul class="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>GitHub のユーザーID（数値）</li>
            <li>GitHub のユーザー名（ログイン名）</li>
          </ul>
          <p class="mt-2">
            メールアドレス・パスワード・その他の個人情報は取得しません。
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-white mb-3">利用目的</h2>
          <ul class="list-disc list-inside space-y-1 text-gray-400">
            <li>ログイン認証（本人確認）</li>
            <li>タスク・インボックスデータとアカウントの紐付け</li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-semibold text-white mb-3">保存場所</h2>
          <p>
            取得した情報およびタスクデータは Deno KV（Deno Deploy
            のインフラ）に保存されます。
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-white mb-3">
            第三者への提供
          </h2>
          <p>取得した情報を第三者に提供することはありません。</p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-white mb-3">保存期間</h2>
          <ul class="list-disc list-inside space-y-1 text-gray-400">
            <li>セッション情報：最終ログインから30日</li>
            <li>タスク・ユーザーデータ：退会（アカウント削除）まで</li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-semibold text-white mb-3">データの削除</h2>
          <p>
            アカウント設定ページから退会することで、すべてのデータを削除できます。
            GitHub との OAuth 連携の解除は、
            <a
              href="https://github.com/settings/applications"
              target="_blank"
              rel="noopener noreferrer"
              class="underline hover:text-white"
            >
              GitHub の認可済みアプリ設定
            </a>
            から行ってください。
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-white mb-3">お問い合わせ</h2>
          <p>
            本ポリシーに関するご質問は、GitHub の
            <a
              href="https://github.com/h-kono-it"
              target="_blank"
              rel="noopener noreferrer"
              class="underline hover:text-white"
            >
              @h-kono-it
            </a>
            までお問い合わせください。
          </p>
        </section>
      </div>
    </main>
  );
});
