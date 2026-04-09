import "./assets/styles.css";

// 'i' キーで #quick-input にフォーカス
document.addEventListener("keydown", (e) => {
  if (e.key !== "i") return;
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) return;
  const input = document.getElementById(
    "quick-input",
  ) as HTMLInputElement | null;
  if (!input) return;
  e.preventDefault();
  input.focus();
});

// --- スキップ（楽観的UI） ---
const focusArea = document.getElementById("focus-area");
const skippedIds: string[] = [];

function syncView() {
  if (!focusArea) return;
  const cards = Array.from(
    focusArea.querySelectorAll<HTMLElement>(".task-card"),
  );
  const allSkipped = document.getElementById("all-skipped");

  cards.forEach((c) => c.classList.add("hidden"));
  const next = cards.find((c) => !skippedIds.includes(c.dataset.taskId!));
  if (next) {
    next.classList.remove("hidden");
    allSkipped?.classList.add("hidden");
  } else if (cards.length > 0) {
    allSkipped?.classList.remove("hidden");
  }
}

focusArea?.addEventListener("click", (e) => {
  const target = e.target as Element;

  if (target.closest("[data-skip]")) {
    const card = target.closest<HTMLElement>(".task-card");
    if (card?.dataset.taskId) {
      skippedIds.push(card.dataset.taskId);
      syncView();
    }
    return;
  }

  if (target.closest("#reset-skip")) {
    skippedIds.length = 0;
    syncView();
  }
});

// --- 完了・削除（楽観的UI） + 二重送信防止 ---
document.addEventListener("submit", (e) => {
  const form = e.target as HTMLFormElement;
  const action = form.querySelector<HTMLInputElement>(
    'input[name="action"]',
  )?.value;

  // action="add" は capture ハンドラで処理済み
  if (action === "add") return;

  // 完了・削除はメインページのみ楽観的に処理（focusArea が存在する場合）
  if ((action === "complete" || action === "delete") && focusArea) {
    const taskId = form.querySelector<HTMLInputElement>(
      'input[name="id"]',
    )?.value;
    if (taskId) {
      const isLast =
        focusArea.querySelectorAll(".task-card").length <= 1;

      if (!isLast) {
        // 複数タスクあり: 楽観的にカード削除 → バックグラウンドPOST
        e.preventDefault();
        focusArea
          .querySelector<HTMLElement>(`.task-card[data-task-id="${taskId}"]`)
          ?.remove();
        syncView();
        fetch(form.getAttribute("action") || location.pathname, { method: "POST", body: new FormData(form) });
        return;
      }
      // 最後の1件: 通常のフォーム送信（リロードでタスクなし表示）
    }
  }

  // その他フォームの二重送信防止
  const btn =
    form.querySelector<HTMLButtonElement>("button[type=submit]") ??
    form.querySelector<HTMLButtonElement>("button:not([type=button])");
  if (btn) btn.disabled = true;
});

// --- インボックス追加（楽観的UI: 入力欄即クリア＋バッジ+1） ---
document.addEventListener("submit", (e) => {
  const form = e.target as HTMLFormElement;
  const action = form.querySelector<HTMLInputElement>(
    'input[name="action"]',
  )?.value;
  if (action !== "add") return;

  const input = form.querySelector<HTMLInputElement>('input[name="title"]');
  if (!input?.value.trim()) return;

  e.preventDefault();
  fetch(form.getAttribute("action") || location.pathname, {
    method: "POST",
    body: new FormData(form),
  });

  input.value = "";
  input.focus();

  // バッジとリンク内カウントを同期して更新
  const badge = document.getElementById("inbox-badge");
  const triageCount = document.getElementById("triage-count");
  const next = parseInt(badge?.textContent || "0") + 1;
  if (badge) {
    badge.textContent = String(next);
    badge.classList.remove("hidden");
  }
  if (triageCount) triageCount.textContent = String(next);
}, true); // capture: 二重送信防止ハンドラより前に処理


// --- インボックス整理（楽観的UI） ---
const triageArea = document.getElementById("triage-area");
if (triageArea) {
  const remainingEl = document.getElementById("triage-remaining");

  triageArea.addEventListener("submit", (e) => {
    const form = e.target as HTMLFormElement;
    const action = form.querySelector<HTMLInputElement>(
      'input[name="action"]',
    )?.value;
    if (action !== "promote" && action !== "delete") return;

    const visibleSlides = Array.from(
      triageArea.querySelectorAll<HTMLElement>(".triage-slide:not(.hidden)"),
    );
    const isLast = visibleSlides.length <= 1;
    if (isLast) {
      // 最後の1件: 通常のフォーム送信（サーバーが / にリダイレクト）
      const btn =
        form.querySelector<HTMLButtonElement>("button[type=submit]") ??
        form.querySelector<HTMLButtonElement>("button:not([type=button])");
      if (btn) btn.disabled = true;
      return;
    }

    e.preventDefault();
    fetch(form.getAttribute("action") || location.pathname, {
      method: "POST",
      body: new FormData(form),
    });

    // 現在のスライドを非表示にして次を表示
    const currentSlide = form.closest<HTMLElement>(".triage-slide");
    currentSlide?.classList.add("hidden");

    const next = triageArea.querySelector<HTMLElement>(
      ".triage-slide:not(.hidden)",
    );
    if (!next) {
      document.getElementById("triage-done")?.classList.remove("hidden");
    }

    // 残り件数を更新
    const remaining = triageArea.querySelectorAll(".triage-slide:not(.hidden)").length;
    if (remainingEl) remainingEl.textContent = String(remaining);
  });
}

// --- 集中度切り替え（楽観的UI） ---
document.querySelectorAll<HTMLButtonElement>('button[name="energy"]').forEach(
  (btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const energy = btn.value;

      // ハイライト即時更新
      document
        .querySelectorAll<HTMLButtonElement>('button[name="energy"]')
        .forEach((b) => {
          const active = b.value === energy;
          b.classList.toggle("bg-white", active);
          b.classList.toggle("text-black", active);
          b.classList.toggle("bg-gray-900", !active);
          b.classList.toggle("text-gray-500", !active);
        });

      // バックグラウンドでPOST
      const form = btn.closest("form")!;
      const formData = new FormData(form);
      formData.set("energy", energy);
      fetch(form.getAttribute("action") || location.pathname, { method: "POST", body: formData });
    });
  },
);
