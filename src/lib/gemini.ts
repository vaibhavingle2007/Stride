export interface Task {
  id?: string;
  name: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  completed?: boolean;
  createdAt?: any;
  completedAt?: string;
  deadline_changes?: number;
  original_deadline?: string;
  googleEventId?: string;
}

export interface AIPrioritizedTask {
  name: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface AIScheduleBlock {
  time: string;
  task_name: string;
  activity_type: string;
}

export interface AIDoNow {
  task_name: string;
  reason: string;
}

export interface AIAnalysisResult {
  prioritized_tasks: AIPrioritizedTask[];
  schedule: AIScheduleBlock[];
  do_now: AIDoNow;
}

/**
 * Analyzes tasks using Gemini by calling our secure server-side API proxy.
 * Keeps API keys hidden from the client side.
 */
export async function analyzeTasks(tasks: Task[]): Promise<AIAnalysisResult> {
  const sanitizeTasks = tasks.map(t => ({
    name: t.name,
    deadline: t.deadline,
    priority: t.priority,
    description: t.description || ""
  }));

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tasks: sanitizeTasks }),
  });

  if (!response.ok) {
    let errorMessage = "AI Analysis failed";
    try {
      const errText = await response.text();
      errorMessage = errText || errorMessage;
    } catch (_) {}
    throw new Error(errorMessage);
  }

  return response.json();
}
