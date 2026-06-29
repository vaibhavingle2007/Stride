import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Task } from "../lib/gemini";

interface OverwhelmModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onUpdateDeadline: (taskId: string, newDate: string) => Promise<void>;
}

export default function OverwhelmModal({
  isOpen,
  onClose,
  tasks,
  onUpdateDeadline,
}: OverwhelmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      handleAnalyze();
    }
  }, [isOpen]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeTasks = tasks.filter((t) => !t.completed);
      const res = await fetch("/api/overwhelmed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: activeTasks }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to analyze tasks");
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDefer = async (taskId: string, newDate: string) => {
    try {
      await onUpdateDeadline(taskId, newDate);
      // Remove it from the suggested list so it doesn't stay there
      setResult((prev: any) => ({
        ...prev,
        safe_to_defer: prev.safe_to_defer.filter((d: any) => d.id !== taskId),
      }));
    } catch (e: any) {
      console.error("Failed to defer:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-[500px] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-[14px] font-medium text-zinc-900 flex items-center gap-2">
            🚨 Triage Workload
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              <p className="text-[13px] text-zinc-500 font-medium">
                Analyzing your workload...
              </p>
            </div>
          )}

          {error && (
            <div className="mt-2 mb-4 text-[13px] text-red-650 border-l-2 border-red-500 bg-red-50 p-3 font-medium">
              {error}
            </div>
          )}

          {!loading && result && (
            <div className="space-y-8 select-none animate-in slide-in-from-bottom-2 duration-300">
              
              {/* START HERE */}
              {result.do_now && (
                <div>
                  <div className="text-[10px] font-semibold text-zinc-400 tracking-[0.08em] uppercase mb-2">
                    START HERE
                  </div>
                  <div className="bg-zinc-50 border-l-2 border-zinc-900 rounded-[0_6px_6px_0] p-3.5 text-zinc-900 text-[14px] font-normal leading-[1.6]">
                    <p className="font-medium text-zinc-900 mb-1">{result.do_now.task_name}</p>
                    <p className="text-zinc-500 text-[13px] leading-relaxed">{result.do_now.reason}</p>
                  </div>
                </div>
              )}

              {/* THE 3 THAT MATTER */}
              {result.prioritized_tasks && result.prioritized_tasks.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-zinc-400 tracking-[0.08em] uppercase mb-2">
                    THE {result.prioritized_tasks.length} THAT MATTER
                  </div>
                  <div className="divide-y divide-zinc-50 border border-zinc-100 rounded-[8px] p-3">
                    {result.prioritized_tasks.map((pt: any, idx: number) => (
                      <div key={idx} className="py-2 flex items-start gap-3 text-[14px]">
                        <span className="font-mono text-[13px] text-zinc-350 w-[20px] flex-shrink-0 select-none">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1">
                          <span className="text-zinc-900 font-medium block leading-tight">{pt.name}</span>
                          {pt.reason && (
                            <span className="text-[13px] text-zinc-500 mt-1 block leading-normal">{pt.reason}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SAFE TO DEFER */}
              {result.safe_to_defer && result.safe_to_defer.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-zinc-400 tracking-[0.08em] uppercase mb-2">
                    SAFE TO DEFER
                  </div>
                  <div className="space-y-2">
                    {result.safe_to_defer.map((def: any, idx: number) => (
                      <div key={idx} className="bg-white border border-zinc-200 rounded-[8px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <span className="text-zinc-900 font-medium text-[14px] block truncate">{def.task_name}</span>
                          <span className="text-[13px] text-zinc-500 mt-0.5 block line-clamp-2">{def.reason}</span>
                        </div>
                        <button
                          onClick={() => handleAcceptDefer(def.id, def.suggested_date)}
                          className="whitespace-nowrap shrink-0 text-center border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 text-[12px] font-medium py-1.5 px-3 rounded-[6px] transition-colors duration-120 cursor-pointer"
                        >
                          Defer to {def.suggested_date}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
