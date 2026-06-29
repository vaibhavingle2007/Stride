import React, { useState, useEffect } from "react";
import { Task } from "../lib/gemini";
import { RiskLevel } from "../lib/risk";

import { getLocalDateString } from "../lib/productivity";

interface FocusModeModalProps {
  task: Task;
  riskLevel: RiskLevel;
  onClose: () => void;
  onMarkDone: (taskId: string) => Promise<void>;
  onDelay: (taskId: string, newDate: string) => Promise<void>;
}

export default function FocusModeModal({ task, riskLevel, onClose, onMarkDone, onDelay }: FocusModeModalProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [riskExplanation, setRiskExplanation] = useState<string>("");

  useEffect(() => {
    let timer: any;
    if (timerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [timerRunning, timeLeft]);

  useEffect(() => {
    async function fetchInsights() {
      setLoadingSteps(true);
      try {
        const payload = {
          task: {
            name: task.name,
            description: task.description,
            deadline: task.deadline,
            priority: task.priority,
            deadline_changes: task.deadline_changes || 0
          },
          riskLevel
        };
        
        const [stepsRes, riskRes] = await Promise.all([
          fetch("/api/focus-steps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }),
          fetch("/api/risk-explanation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })
        ]);

        if (stepsRes.ok) {
          const stepsData = await stepsRes.json();
          setSteps(stepsData.steps || []);
        }
        if (riskRes.ok) {
          const riskData = await riskRes.json();
          setRiskExplanation(riskData.explanation || "");
        }
      } catch (e) {
        console.error("Failed to load focus insights", e);
      } finally {
        setLoadingSteps(false);
      }
    }
    fetchInsights();
  }, [task, riskLevel]);

  const toggleTimer = () => setTimerRunning(!timerRunning);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleMarkDone = async () => {
    if (task.id) {
      await onMarkDone(task.id);
    }
    onClose();
  };

  const handleDelay = async () => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    const dateStr = getLocalDateString(nextDay);
    if (task.id) {
      await onDelay(task.id, dateStr);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-[480px] p-6 flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
              Focus Mode
            </div>
            <h2 className="text-[20px] font-medium text-zinc-900 leading-tight">
              {task.name}
            </h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Risk Explanation */}
        {riskExplanation && (
          <div className="bg-red-50 text-red-800 text-[13px] p-3 rounded-[6px] mb-6 leading-relaxed">
            <span className="font-semibold">{riskLevel} Risk:</span> {riskExplanation}
          </div>
        )}

        {/* Timer */}
        <div className="flex flex-col items-center justify-center bg-zinc-50 border border-zinc-200 rounded-[8px] py-8 mb-6">
          <div className="text-[48px] font-mono font-light tracking-tighter text-zinc-900 mb-4">
            {formatTime(timeLeft)}
          </div>
          <button 
            onClick={toggleTimer}
            className="bg-zinc-900 text-white hover:bg-zinc-800 text-[13px] font-medium px-6 py-2 rounded-[6px] transition-colors"
          >
            {timerRunning ? "Pause" : "Start Focus"}
          </button>
        </div>

        {/* AI Steps */}
        <div className="mb-6">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
            How to start
          </div>
          {loadingSteps ? (
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-900 animate-spin rounded-full"></div>
            </div>
          ) : (
            <ul className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-zinc-700 leading-snug bg-zinc-50 border border-zinc-100 p-2.5 rounded-[6px]">
                  <span className="text-zinc-400 font-mono mt-0.5">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-zinc-100">
          <button 
            onClick={handleMarkDone}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-[13px] font-medium py-2.5 rounded-[6px] transition-colors"
          >
            Mark Task Done
          </button>
          <button 
            onClick={handleDelay}
            className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-[13px] font-medium py-2.5 rounded-[6px] transition-colors"
          >
            Delay to Tomorrow
          </button>
        </div>

      </div>
    </div>
  );
}
