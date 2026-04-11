import { define } from "../utils.ts";

export default define.page(function Terms() {
  return (
    <main class="min-h-screen max-w-2xl mx-auto px-4 py-12 text-white">
      <a
        href="/auth/signin"
        class="text-gray-500 hover:text-white text-sm mb-8 inline-block"
      >
        ← 戻る
      </a>
      <h1 class="text-2xl font-bold mb-8">利用規約</h1>

      <div class="space-y-8 text-sm text-gray-300 leading-relaxed">
        <section>
          <h2 class="text-base font-semibold text-white mb-3">サービス概要</h2>
          <p>
            Unagi
            Tasks（以下「本サービス」）は、判断コストの最小化に特化したタスク管理アプリです。
            GitHub
            アカウントでサインインすることで、どなたでも無料でご利用いただけます。
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-white mb-3">利用条件</h2>
          <ul class="list-disc list-inside space-y-1 text-gray-400">
            <li>本サービスの利用には GitHub アカウントが必要です</li>
            <li>本規約に同意した上でご利用ください</li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-semibold text-white mb-3">禁止事項</h2>
          <ul class="list-disc list-inside space-y-1 text-gray-400">
            <li>本サービスへの不正アクセスや過度な負荷をかける行為</li>
            <li>他のユーザーのデータへのアクセスを試みる行為</li>
            <li>法令または公序良俗に反する行為</li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-semibold text-white mb-3">免責事項</h2>
          <p>
            本サービスは現状有姿で提供されます。データの損失、サービスの停止・不具合等について、
            運営者は責任を負いません。重要なデータは必ずご自身でバックアップを取ってください。
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-white mb-3">
            サービスの変更・終了
          </h2>
          <p>
            運営者は予告なく本サービスの内容を変更、または提供を終了する場合があります。
            終了時にはデータのエクスポート期間を設ける努力をしますが、保証はできません。
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-white mb-3">規約の変更</h2>
          <p>
            本規約は必要に応じて変更される場合があります。変更後もサービスを継続してご利用の場合、
            変更後の規約に同意したものとみなします。
          </p>
        </section>
      </div>
    </main>
  );
});
