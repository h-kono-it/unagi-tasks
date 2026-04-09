import "./assets/styles.css";

// 'i' キーで #quick-input にフォーカス
document.addEventListener("keydown", (e) => {
  if (e.key !== "i") return;
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) return;
  const input = document.getElementById("quick-input") as HTMLInputElement | null;
  if (!input) return;
  e.preventDefault();
  input.focus();
});
