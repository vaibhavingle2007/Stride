import { Task } from "./gemini";

/**
 * Gets the current local date formatted as YYYY-MM-DD.
 * Prevents timezone boundary drift relative to UTC calculations.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Pure helper to calculate consecutive streak days.
 * Standardizes streak calculations across AIChat, Analytics, and Widgets.
 */
export function calculateStreak(
  streakMap: Record<string, boolean> | null | undefined,
  todayStr: string
): number {
  if (!streakMap || Object.keys(streakMap).length === 0) {
    return 0;
  }

  const parts = todayStr.split("-");
  if (parts.length !== 3) return 0;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  let checkDate = new Date(Date.UTC(year, month, day));
  let count = 0;

  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (streakMap[dateStr]) {
      count++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else {
      if (count === 0) {
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        const yesterdayStr = checkDate.toISOString().split("T")[0];
        if (streakMap[yesterdayStr]) {
          count = 1;
          checkDate.setUTCDate(checkDate.getUTCDate() - 1);
          while (true) {
            const prevStr = checkDate.toISOString().split("T")[0];
            if (streakMap[prevStr]) {
              count++;
              checkDate.setUTCDate(checkDate.getUTCDate() - 1);
            } else {
              break;
            }
          }
        }
      }
      break;
    }
  }
  return count;
}

/**
 * Pure helper to calculate productivity score with specific caps.
 * completedPoints: completed points cap 45 (15 points per task)
 * highPoints: high-priority cap 40 (20 points per high-priority completed task on/before deadline)
 * streakBonus: streak bonus cap 15 (1 point per streak day)
 * total cap: 100
 */
export function calculateScore(
  tasks: Task[],
  streakDays: number,
  todayStr: string
): number {
  // Filter for completed tasks
  const completedTasks = tasks.filter((t) => t.completed);
  const completedTasksCount = completedTasks.length;
  const completedPoints = Math.min(completedTasksCount * 15, 45);

  // high priority completed tasks before or on deadline
  const highCompletedBeforeDeadline = completedTasks.filter(
    (t) => t.priority === "high" && t.deadline && t.deadline >= todayStr
  ).length;
  const highPoints = Math.min(highCompletedBeforeDeadline * 20, 40);

  // Streak bonus cap 15
  const streakBonus = Math.min(streakDays, 15);

  // Total score cap 100
  return Math.min(completedPoints + highPoints + streakBonus, 100);
}

/**
 * Checks if a completed task was completed on or before its deadline.
 * Fallback to true if no deadline, or if legacy completed task with missing completedAt.
 */
export function isOnTime(task: Task): boolean {
  if (!task.completed) return false;
  if (!task.deadline) return true;
  if (!task.completedAt) return true;
  return task.completedAt <= task.deadline;
}

/**
 * Calculates a consecutive streak of days with on-time completed tasks.
 */
export function calculateOnTimeStreak(tasks: Task[], todayStr: string): number {
  const onTimeMap: Record<string, boolean> = {};
  tasks.forEach((t) => {
    if (isOnTime(t)) {
      const dateKey = t.completedAt || t.deadline || todayStr;
      onTimeMap[dateKey] = true;
    }
  });
  return calculateStreak(onTimeMap, todayStr);
}
