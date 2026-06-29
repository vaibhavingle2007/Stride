import React, { useState, useEffect } from "react";
import { Task } from "../lib/gemini";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Loader2, CalendarCheck, CalendarX, Target } from "lucide-react";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { calculateRiskLevel, RiskLevel } from "../lib/risk";
import FocusModeModal from "./FocusModeModal";
import { getLocalDateString } from "../lib/productivity";

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (taskId: string, currentCompleted: boolean) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onUpdateDeadline: (taskId: string, newDeadline: string) => Promise<void>;
  onAskRebalance: (date: string, tasksOnDate: Task[]) => Promise<void>;
  rebalanceSuggestion: {
    date: string;
    move_task: string;
    move_to: string;
    reason: string;
  } | null;
  onAcceptRebalance: () => Promise<void>;
  onDismissRebalance: () => void;
  rebalanceLoading: boolean;
}

export interface CountdownInfo {
  label: string;
  className: string;
}

export function getCountdown(deadline: string): CountdownInfo | null {
  if (!deadline) {
    return null;
  }

  const todayStr = getLocalDateString();
  
  const parseDate = (dStr: string) => {
    const [y, m, d] = dStr.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  };

  const todayTime = parseDate(todayStr);
  const deadlineTime = parseDate(deadline);
  
  const diffDays = Math.round((deadlineTime - todayTime) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "⚠ Overdue", className: "bg-red-50 text-red-600 border-red-200" };
  } else if (diffDays === 0) {
    return { label: "🔴 Due today", className: "bg-amber-50 text-amber-700 border-amber-200" };
  } else if (diffDays >= 1 && diffDays <= 3) {
    return { label: `⏰ ${diffDays}d left`, className: "bg-orange-50 text-orange-600 border-orange-200" };
  } else {
    return { label: `${diffDays}d left`, className: "bg-zinc-50 text-zinc-400 border-zinc-200" };
  }
}

export default function TaskList({
  tasks,
  onToggleTask,
  onDeleteTask,
  onUpdateDeadline,
  onAskRebalance,
  rebalanceSuggestion,
  onAcceptRebalance,
  onDismissRebalance,
  rebalanceLoading
}: TaskListProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [focusTask, setFocusTask] = useState<{ task: Task; riskLevel: RiskLevel } | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // Separate active and completed tasks
  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // Group active tasks by deadline
  const activeGroups: { [date: string]: Task[] } = {};
  activeTasks.forEach((task) => {
    const dateKey = task.deadline || "No Deadline";
    if (!activeGroups[dateKey]) {
      activeGroups[dateKey] = [];
    }
    activeGroups[dateKey].push(task);
  });

  // Sort dates chronologically, pushing "No Deadline" to the end
  const activeDates = Object.keys(activeGroups).sort((a, b) => {
    if (a === "No Deadline") return 1;
    if (b === "No Deadline") return -1;
    return a.localeCompare(b);
  });

  const renderTaskRow = (task: Task, tasksOnSameDate: Task[] = []) => {
    // Priority Tag Styling Colors:
    // High: bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]
    // Medium: bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]
    // Low: bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]
    let priorityClass = "";
    const isHigh = String(task.priority).toLowerCase() === "high";
    const isMedium = String(task.priority).toLowerCase() === "medium";

    if (isHigh) {
      priorityClass = "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]";
    } else if (isMedium) {
      priorityClass = "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]";
    } else {
      priorityClass = "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
    }

    const hasProcrastinated = (task.deadline_changes || 0) >= 2;
    const isEffectivelyCompleted = !!task.completed || completingTaskId === task.id;
    
    const riskLevel = calculateRiskLevel(task, tasksOnSameDate);
    const showFocusButton = !task.completed && (riskLevel === "High" || riskLevel === "Critical");

    const handleCheckboxChange = async () => {
      const nextCompleted = !task.completed;
      if (nextCompleted) {
        setCompletingTaskId(task.id || null);
        await onToggleTask(task.id!, task.completed);
        setTimeout(() => {
          setCompletingTaskId(null);
        }, 450);
      } else {
        await onToggleTask(task.id!, task.completed);
      }
    };

    const handleStartFocus = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFocusTask({ task, riskLevel });
    };

    return (
      <motion.div
        key={task.id}
        layout={!reducedMotion ? "position" : false}
        initial={!reducedMotion ? { opacity: 0, height: "auto" } : false}
        animate={!reducedMotion ? {
          opacity: 1,
          height: "auto",
          scale: isEffectivelyCompleted ? [1, 1.015, 1] : 1
        } : false}
        exit={!reducedMotion ? {
          opacity: 0,
          height: 0,
          paddingTop: 0,
          paddingBottom: 0,
          borderBottomWidth: 0,
          overflow: "hidden",
          transition: { duration: 0.3, ease: "easeOut" }
        } : false}
        style={{ overflow: "hidden" }}
        transition={{
          scale: { duration: 0.35, ease: "easeInOut" },
          default: { duration: 0.25, ease: "easeOut" }
        }}
        className="group flex items-center justify-between py-3.5 border-b border-zinc-50 hover:bg-zinc-100 px-3 -mx-3 transition-colors duration-120"
      >
        {/* Col 1: Custom Checkbox with micro-animation */}
        <div className="w-[24px] flex items-center">
          <button
            type="button"
            role="checkbox"
            aria-checked={isEffectivelyCompleted}
            aria-label="Toggle completed state"
            onClick={handleCheckboxChange}
            className="w-4 h-4 rounded-[3px] border border-zinc-200 bg-white flex items-center justify-center cursor-pointer focus:outline-none relative overflow-hidden transition-colors duration-200"
          >
            <motion.div
              initial={false}
              animate={{
                scale: isEffectivelyCompleted ? 1 : 0,
                opacity: isEffectivelyCompleted ? 1 : 0,
              }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute inset-0 bg-zinc-900 flex items-center justify-center"
            >
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          </button>
        </div>

        {/* Col 2: Task Name with Strike-Through Micro-Animation */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="relative inline-block max-w-full">
            <span
              className={`text-[14px] font-normal leading-[1.4] block truncate transition-colors duration-200 ${
                isEffectivelyCompleted
                  ? "text-zinc-300 font-light"
                  : "text-zinc-900"
              }`}
            >
              {task.name}
            </span>
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: isEffectivelyCompleted ? "100%" : "0%" }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="absolute left-0 top-[55%] h-[1px] bg-zinc-300 pointer-events-none"
            />
          </div>
          {task.description && !isEffectivelyCompleted && (
            <span className="text-[12px] text-zinc-450 block truncate mt-0.5 font-light leading-snug">
              {task.description}
            </span>
          )}
        </div>

        {/* Col 3: Tags row (Priority + Countdown + Procrastination Flag + Risk Chip) */}
        <div className="flex-shrink-0 flex items-center gap-2 mr-4">
          {/* Risk Chip */}
          {!task.completed && riskLevel !== "Low" && (
            <span className={`text-[11px] font-semibold border rounded-[4px] px-2 py-0.5 uppercase tracking-wide select-none ${
              riskLevel === "Critical" ? "bg-red-600 text-white border-red-700" :
              riskLevel === "High" ? "bg-orange-500 text-white border-orange-600" :
              "bg-yellow-100 text-yellow-800 border-yellow-200"
            }`}>
              {riskLevel} Risk
            </span>
          )}

          {/* Priority tag */}
          <span className={`text-[11px] font-medium border rounded-[4px] px-2 py-0.5 uppercase tracking-wide select-none ${priorityClass}`}>
            {task.priority || "medium"}
          </span>

          {/* Countdown chip (active tasks only, with deadline) */}
          {!task.completed && task.deadline && (
            (() => {
              const countdown = getCountdown(task.deadline);
              if (!countdown) return null;

              return (
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium border rounded-[4px] px-2 py-0.5 uppercase tracking-wide select-none ${countdown.className}`}>
                  {countdown.label}
                </span>
              );
            })()
          )}

          {/* Procrastination tag */}
          {hasProcrastinated && (
            <div className="relative group/tooltip">
              <span className="text-[11px] font-semibold text-[#C2410C] bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] px-2 py-0.5 select-none uppercase tracking-wide cursor-help">
                Delayed {task.deadline_changes}&times;
              </span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-zinc-900 text-white text-[12px] rounded-[4px] py-1.5 px-3 whitespace-nowrap z-50 pointer-events-none shadow-md">
                Originally due {task.original_deadline || task.deadline}. Delayed {task.deadline_changes} times.
              </div>
            </div>
          )}
        </div>

        {/* Col 4: Sync Indicator + Date / Delete / Focus Mode */}
        <div className="w-[140px] flex items-center justify-end gap-2 text-right">
          {showFocusButton && (
            <button
              onClick={handleStartFocus}
              className="hidden group-hover:flex items-center gap-1 bg-zinc-900 text-white text-[11px] font-medium px-2 py-1 rounded-[4px] mr-1"
            >
              <Target className="w-3 h-3" /> Focus
            </button>
          )}

          {/* Sync Indicator removed to rely entirely on server-side flow */}

          <div className="group-hover:hidden">
            {task.completed ? (
              <span className="text-[12px] font-mono text-zinc-300">
                {task.deadline || "no date"}
              </span>
            ) : (
              <input
                type="date"
                value={task.deadline || ""}
                onChange={(e) => onUpdateDeadline(task.id!, e.target.value)}
                className="bg-transparent border-none text-[12px] font-mono text-zinc-400 text-right w-[110px] p-0 focus:ring-0 focus:outline-none cursor-pointer"
              />
            )}
          </div>
          <button
            onClick={() => onDeleteTask(task.id!)}
            className="hidden group-hover:inline-block text-[12px] text-zinc-400 hover:text-red-600 font-normal transition-colors duration-100 cursor-pointer w-[110px]"
          >
            Delete
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full text-left mt-6">
      {/* Label Row */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-2">
        <span className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase">
          ACTIVITIES
        </span>
        <span className="text-[13px] font-mono text-zinc-450 font-normal">
          {activeTasks.length} active
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center text-[14px] text-zinc-400 py-8 select-none">
          No tasks yet
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Active tasks grouped by date */}
          {activeDates.map((dateKey) => {
            const groupTasks = activeGroups[dateKey];
            const highTasksCount = groupTasks.filter(
              (t) => String(t.priority).toLowerCase() === "high"
            ).length;

            const isOverloaded = highTasksCount >= 3 && dateKey !== "No Deadline";

            return (
              <div key={dateKey} className="mb-6">
                {/* Date Group Title */}
                <div className="text-[11px] font-semibold text-zinc-400 mt-4 mb-1.5 tracking-[0.04em] uppercase">
                  {dateKey}
                </div>

                {/* Overload Warning Box */}
                {isOverloaded && (
                  <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-[6px] p-3 my-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-colors duration-150">
                    <div className="text-[13px] text-[#C2410C] font-normal">
                      ⚠ {dateKey} looks overloaded &mdash; {highTasksCount} high priority tasks
                    </div>
                    <button
                      type="button"
                      onClick={() => onAskRebalance(dateKey, groupTasks)}
                      disabled={rebalanceLoading}
                      className="text-[13px] text-[#C2410C] underline hover:text-orange-850 cursor-pointer border-none bg-transparent font-medium"
                    >
                      {rebalanceLoading ? "Analyzing..." : "Ask AI to rebalance"}
                    </button>
                  </div>
                )}

                {/* Overload suggestion card nested below warning */}
                {rebalanceSuggestion && rebalanceSuggestion.date === dateKey && (
                  <div className="bg-white border border-zinc-200 rounded-[6px] p-4 my-2 text-left space-y-3 shadow-sm">
                    <p className="text-[13px] text-zinc-900 leading-relaxed">
                      Move <span className="font-semibold">&lsquo;{rebalanceSuggestion.move_task}&rsquo;</span> to <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-[12px]">{rebalanceSuggestion.move_to}</span> &mdash; {rebalanceSuggestion.reason}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={onAcceptRebalance}
                        className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-[12px] h-[30px] px-3.5 rounded-[4px] cursor-pointer transition-all duration-120"
                      >
                        Accept
                      </button>
                      <button
                        onClick={onDismissRebalance}
                        className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium text-[12px] h-[30px] px-3.5 rounded-[4px] cursor-pointer transition-all duration-120"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* Task items inside the group */}
                <div className="flex flex-col">
                  <AnimatePresence initial={false}>
                    {groupTasks.map((task) => renderTaskRow(task, groupTasks))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}

          {/* Archived / Completed tasks group */}
          {completedTasks.length > 0 && (
            <div className="mt-8 border-t border-zinc-100 pt-6">
              <div className="text-[11px] font-semibold text-zinc-400 mb-2 tracking-[0.04em] uppercase">
                ARCHIVED
              </div>
              <div className="flex flex-col">
                <AnimatePresence initial={false}>
                  {completedTasks.map((task) => renderTaskRow(task))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      {focusTask && (
        <FocusModeModal
          task={focusTask.task}
          riskLevel={focusTask.riskLevel}
          onClose={() => setFocusTask(null)}
          onMarkDone={async (id) => {
            await onToggleTask(id, false);
            setFocusTask(null);
          }}
          onDelay={async (id, date) => {
            await onUpdateDeadline(id, date);
            setFocusTask(null);
          }}
        />
      )}
    </div>
  );
}
