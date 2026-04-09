import type { Task } from "./db.ts";

export function calculateScore(task: Task, userEnergy = 2): number {
  const ageInHours = (Date.now() - task.createdAt) / (1000 * 60 * 60);
  const energyMatch = Math.abs(userEnergy - task.energy) * 5;

  let urgencyBonus = 0;
  if (task.dueAt) {
    const DAY_MS = 1000 * 60 * 60 * 24;
    const todayIndex = Math.floor(Date.now() / DAY_MS);
    const dueIndex = Math.floor(task.dueAt / DAY_MS);
    const daysUntilDue = dueIndex - todayIndex; // 整数比較でタイムゾーン問題を回避

    if (daysUntilDue < 0) {
      // 期限切れ: 当日ボーナス + 経過日数 × 15
      urgencyBonus = 60 + Math.abs(daysUntilDue) * 15;
    } else if (daysUntilDue === 0) {
      // 当日: ドンと跳ね上げ
      urgencyBonus = 60;
    } else if (daysUntilDue <= 7) {
      // 1〜7日前: ゆるやかに上昇
      urgencyBonus = (7 - daysUntilDue) / 6 * 30;
    }
  }

  return task.priority * (10 + urgencyBonus) + ageInHours - energyMatch;
}

export function sortTasksByScore(tasks: Task[], userEnergy = 2): Task[] {
  return [...tasks].sort(
    (a, b) => calculateScore(b, userEnergy) - calculateScore(a, userEnergy),
  );
}
