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

// --- 集中度切り替え（クライアントサイド、サーバー通信なし） ---

interface TaskJson {
  id: string;
  priority: 1 | 2 | 3;
  energy: 1 | 2 | 3;
  createdAt: number;
  dueAt?: number;
}

function calcScore(task: TaskJson, userEnergy: number): number {
  const ageInHours = (Date.now() - task.createdAt) / (1000 * 60 * 60);
  const energyMatch = Math.abs(userEnergy - task.energy) * 5;
  let urgencyBonus = 0;
  if (task.dueAt) {
    const DAY_MS = 1000 * 60 * 60 * 24;
    const daysUntilDue = Math.floor(task.dueAt / DAY_MS) -
      Math.floor(Date.now() / DAY_MS);
    if (daysUntilDue < 0) urgencyBonus = 60 + Math.abs(daysUntilDue) * 15;
    else if (daysUntilDue === 0) urgencyBonus = 60;
    else if (daysUntilDue <= 7) urgencyBonus = ((7 - daysUntilDue) / 6) * 30;
  }
  return task.priority * (10 + urgencyBonus) + ageInHours - energyMatch;
}

function reorderByEnergy(energy: number) {
  const jsonEl = document.getElementById("tasks-json");
  if (!jsonEl || !focusArea) return;
  const tasks: TaskJson[] = JSON.parse((jsonEl as HTMLElement).dataset.tasks!);
  const sorted = [...tasks].sort(
    (a, b) => calcScore(b, energy) - calcScore(a, energy),
  );
  for (const task of sorted) {
    const card = focusArea.querySelector<HTMLElement>(
      `.task-card[data-task-id="${task.id}"]`,
    );
    if (card) focusArea.appendChild(card);
  }
  const allSkipped = document.getElementById("all-skipped");
  if (allSkipped) focusArea.appendChild(allSkipped);
  skippedIds.length = 0;
  syncView();
}

const energyForm = document.getElementById("energy-form");
if (energyForm) {
  energyForm.addEventListener("click", (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>(
      "button[data-energy]",
    );
    if (!btn) return;
    const energy = parseInt(btn.dataset.energy!);
    if (isNaN(energy)) return;

    energyForm.querySelectorAll<HTMLButtonElement>("button[data-energy]")
      .forEach((b) => {
        const selected = parseInt(b.dataset.energy!) === energy;
        b.className =
          `flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selected
              ? "bg-white text-black"
              : "bg-gray-900 text-gray-500 hover:text-white"
          }`;
      });

    reorderByEnergy(energy);
  });
}

// --- 完了・削除（楽観的UI） + 二重送信防止 ---
document.addEventListener("submit", (e) => {
  const form = e.target as HTMLFormElement;
  const submitter = (e as SubmitEvent).submitter;

  // action は hidden input または submit ボタンの name/value どちらからも取得
  const action =
    form.querySelector<HTMLInputElement>('input[name="action"]')?.value ??
      (submitter instanceof HTMLButtonElement && submitter.name === "action"
        ? submitter.value
        : undefined);

  // capture ハンドラ処理済みはスキップ
  if (action === "add") return;

  if (action === "complete" || action === "delete") {
    if (focusArea) {
      // メインページ: 楽観的UI
      const taskId = form.querySelector<HTMLInputElement>(
        'input[name="id"]',
      )?.value;
      if (taskId) {
        const isLast = focusArea.querySelectorAll(".task-card").length <= 1;
        if (!isLast) {
          // 複数タスクあり: 楽観的にカード削除 → バックグラウンドPOST
          e.preventDefault();
          focusArea
            .querySelector<HTMLElement>(`.task-card[data-task-id="${taskId}"]`)
            ?.remove();
          syncView();
          fetch(form.getAttribute("action") || location.pathname, {
            method: "POST",
            body: new FormData(form),
          });
          if (action === "complete") {
            document.dispatchEvent(new CustomEvent("pomo-task-complete"));
          }
          return;
        }
      }
    }
    // タスク一覧ページ or 最後の1件: 通常のフォーム送信（JS不介入）
    return;
  }

  // その他フォームの二重送信防止（押したボタンだけ disabled）
  const btn = submitter as HTMLButtonElement | null ??
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

// --- ポモドーロタイマー ---
(function setupPomodoro() {
  const display = document.getElementById("pomo-display");
  const bar = document.getElementById("pomo-bar") as HTMLDivElement | null;
  const phaseEl = document.getElementById("pomo-phase");
  const startBtn = document.getElementById(
    "pomo-start",
  ) as HTMLButtonElement | null;
  const stopBtn = document.getElementById(
    "pomo-stop",
  ) as HTMLButtonElement | null;
  const focusSelect = document.getElementById(
    "pomo-focus-min",
  ) as HTMLSelectElement | null;
  const breakSelect = document.getElementById(
    "pomo-break-min",
  ) as HTMLSelectElement | null;
  const volumeSlider = document.getElementById(
    "pomo-volume",
  ) as HTMLInputElement | null;
  const soundTest = document.getElementById("pomo-sound-test");
  const completeBreak = document.getElementById(
    "pomo-complete-break",
  ) as HTMLInputElement | null;

  if (!display || !startBtn) return;

  let timerId: ReturnType<typeof setInterval> | null = null;
  let remaining = 25 * 60;
  let total = 25 * 60;
  let phase: "focus" | "break" = "focus";

  function getFocusMin() {
    return parseInt(focusSelect?.value ?? "25");
  }
  function getBreakMin() {
    return parseInt(breakSelect?.value ?? "5");
  }
  function getVolume() {
    return parseInt(volumeSlider?.value ?? "50") / 100;
  }

  function fmt(sec: number) {
    return `${Math.floor(sec / 60).toString().padStart(2, "0")}:${
      (sec % 60)
        .toString()
        .padStart(2, "0")
    }`;
  }

  function updateDisplay() {
    display!.textContent = fmt(remaining);
    if (bar) bar.style.width = `${Math.round((remaining / total) * 100)}%`;
  }

  function playBeep(vol: number) {
    const ctx = new AudioContext();
    [[880, 0, 0.4], [660, 0.6, 0.4]].forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    });
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    startBtn!.classList.remove("hidden");
    stopBtn?.classList.add("hidden");
  }

  function setPhaseStyle(p: "focus" | "break") {
    if (bar) {
      bar.className = `h-1 rounded-full ${
        p === "focus" ? "bg-blue-500" : "bg-green-500"
      }`;
    }
    if (phaseEl) {
      phaseEl.className = p === "focus"
        ? "text-sm font-semibold px-3 py-1 rounded-full bg-blue-900 text-blue-300"
        : "text-sm font-semibold px-3 py-1 rounded-full bg-green-900 text-green-300";
    }
  }

  function startTick() {
    startBtn!.classList.add("hidden");
    stopBtn?.classList.remove("hidden");
    timerId = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      updateDisplay();
      if (remaining === 0) switchPhase();
    }, 1000);
  }

  function switchPhase() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    playBeep(getVolume());
    phase = phase === "focus" ? "break" : "focus";
    total = (phase === "focus" ? getFocusMin() : getBreakMin()) * 60;
    remaining = total;
    if (phaseEl) phaseEl.textContent = phase === "focus" ? "集中" : "休憩";
    setPhaseStyle(phase);
    updateDisplay();
    startTick(); // 次のフェーズを自動スタート
  }

  function resetTimer() {
    stopTimer();
    phase = "focus";
    total = getFocusMin() * 60;
    remaining = total;
    if (phaseEl) phaseEl.textContent = "集中";
    setPhaseStyle("focus");
    updateDisplay();
  }

  startBtn.addEventListener("click", () => {
    if (timerId !== null) return;
    startTick();
  });

  document.addEventListener("pomo-task-complete", () => {
    if (timerId === null) return;
    if (completeBreak?.checked) switchPhase();
  });

  stopBtn?.addEventListener("click", stopTimer);
  focusSelect?.addEventListener("change", resetTimer);
  breakSelect?.addEventListener("change", resetTimer);
  soundTest?.addEventListener("click", () => playBeep(getVolume()));

  updateDisplay();
})();

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
    const remaining =
      triageArea.querySelectorAll(".triage-slide:not(.hidden)").length;
    if (remainingEl) remainingEl.textContent = String(remaining);
  });
}
