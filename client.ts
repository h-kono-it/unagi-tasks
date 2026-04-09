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

// 楽観的スキップ: Island を使わず vanilla JS で制御
const focusArea = document.getElementById("focus-area");
if (focusArea) {
  const skippedIds: string[] = [];

  function syncView() {
    const cards = Array.from(
      focusArea!.querySelectorAll<HTMLElement>(".task-card"),
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

  focusArea.addEventListener("click", (e) => {
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
}
