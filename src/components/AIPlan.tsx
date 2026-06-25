import React from "react";
import { Task, AIAnalysisResult } from "../lib/gemini";

interface AIPlanProps {
  tasks: Task[];
  analysisResult: AIAnalysisResult | null;
  loading: boolean;
  error: string | null;
  onAnalyze: () => void;
}

export default function AIPlan({
  tasks,
  analysisResult,
  loading,
  error,
  onAnalyze
}: AIPlanProps) {
  const hasTasks = tasks.length > 0;

  return (
    <div className="w-full text-left">
      {/* Label & Header line */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
        <span className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase">
          AI ANALYSIS
        </span>
      </div>

      {/* Button sitting below */}
      <button
        onClick={onAnalyze}
        disabled={loading || !hasTasks}
        className="w-full text-center border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 text-[14px] font-medium py-3 px-4 rounded-[6px] transition-colors duration-120 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-4 block"
      >
        {loading ? "Analyzing..." : "Analyze Tasks"}
      </button>

      {!hasTasks && (
        <p className="text-[11px] text-zinc-400 text-center mt-2.5 font-normal">
          Add at least 1 active task to trigger optimization
        </p>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-4 text-[12px] text-red-650 border-l-2 border-red-500 pl-3 py-1 font-mono">
          {error}
        </div>
      )}

      {/* Awaiting Analysis State */}
      {!loading && !analysisResult && !error && hasTasks && (
        <div className="text-center text-[13px] text-zinc-400 py-12 px-4 selection:bg-zinc-100 font-normal">
          Stride detects high-priority overlaps and crafts your timeline.
        </div>
      )}

      {/* Analysis Results Display */}
      {!loading && analysisResult && (
        <div className="mt-8 space-y-8 fade-in select-none">
          
          {/* Section 1: DO THIS NOW */}
          {analysisResult.do_now && (
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 tracking-[0.08em] uppercase mb-2">
                DO THIS NOW
              </div>
              <div className="bg-zinc-50 border-l-2 border-zinc-900 rounded-[0_6px_6px_0] p-3.5 text-zinc-900 text-[14px] font-normal leading-[1.6]">
                <p className="font-medium text-zinc-900 mb-1">{analysisResult.do_now.task_name}</p>
                <p className="text-zinc-500 text-[13px] leading-relaxed">{analysisResult.do_now.reason}</p>
              </div>
            </div>
          )}

          {/* Section 2: PRIORITY ORDER */}
          {analysisResult.prioritized_tasks && analysisResult.prioritized_tasks.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 tracking-[0.08em] uppercase mb-2">
                PRIORITY ORDER
              </div>
              <div className="divide-y divide-zinc-50">
                {analysisResult.prioritized_tasks.map((pt, idx) => (
                  <div key={idx} className="py-2.5 flex items-start gap-3 text-[14px]">
                    <span className="font-mono text-[13px] text-zinc-350 w-[20px] flex-shrink-0 select-none">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <span className="text-zinc-900 font-normal block leading-tight">{pt.name}</span>
                      {pt.reason && (
                        <span className="text-[12px] text-zinc-400 font-light mt-0.5 block leading-normal">{pt.reason}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: TODAY'S SCHEDULE */}
          {analysisResult.schedule && analysisResult.schedule.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 tracking-[0.08em] uppercase mb-2">
                TODAY&apos;S SCHEDULE
              </div>
              <div className="divide-y divide-zinc-50">
                {analysisResult.schedule.map((block, idx) => (
                  <div key={idx} className="py-2.5 flex items-baseline gap-4 text-[14px]">
                    <span className="font-mono text-[13px] text-zinc-400 w-[72px] flex-shrink-0 select-none">
                      {block.time}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-zinc-900 font-normal block truncate">{block.task_name}</span>
                      <span className="text-[11px] text-zinc-400 font-light truncate block mt-0.5">{block.activity_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
