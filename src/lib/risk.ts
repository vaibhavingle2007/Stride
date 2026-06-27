import { Task } from "./gemini";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export function calculateRiskLevel(task: Task, tasksOnSameDate: Task[] = []): RiskLevel {
  if (task.completed) return "Low";

  let score = 0;

  // Priority
  if (task.priority === "high") score += 3;
  else if (task.priority === "medium") score += 1;

  // Deadline proximity
  if (task.deadline) {
    const parts = task.deadline.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const deadlineDate = new Date(year, month, day);
      
      const now = new Date();
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const diffTime = deadlineDate.getTime() - todayDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) score += 5; // Overdue
      else if (diffDays === 0) score += 3; // Today
      else if (diffDays <= 2) score += 1; // Soon
    }
  }

  // Deadline changes
  const changes = task.deadline_changes || 0;
  if (changes >= 2) score += 3;
  else if (changes === 1) score += 1;

  // Overload
  const highTasksCount = tasksOnSameDate.filter(t => String(t.priority).toLowerCase() === "high" && !t.completed).length;
  if (highTasksCount >= 3) {
    score += 2;
  }

  if (score >= 8) return "Critical";
  if (score >= 5) return "High";
  if (score >= 2) return "Medium";
  return "Low";
}
