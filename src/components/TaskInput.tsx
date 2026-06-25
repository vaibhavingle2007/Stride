import React, { useState } from "react";
import { getLocalDateString } from "../lib/productivity";

interface TaskInputProps {
  onAddTask: (task: { name: string; description: string; priority: "high" | "medium" | "low"; deadline: string }) => Promise<void>;
}

export default function TaskInput({ onAddTask }: TaskInputProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [deadline, setDeadline] = useState(() => {
    const prefilled = localStorage.getItem("stride_prefilled_deadline");
    if (prefilled) {
      localStorage.removeItem("stride_prefilled_deadline");
      return prefilled;
    }
    return "";
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Task title is required");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      // Default to today's date if empty
      const finalDeadline = deadline || getLocalDateString();
      await onAddTask({
        name: name.trim(),
        description: description.trim(),
        priority,
        deadline: finalDeadline
      });
      setName("");
      setDescription("");
      setPriority("medium");
      setDeadline("");
    } catch (err: any) {
      setError(err?.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full text-left">
      <div className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase mb-4">
        CREATE TASK
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-[12px] text-red-600 font-mono">
            {error}
          </div>
        )}

        {/* Task Name Input */}
        <input
          type="text"
          placeholder="What needs to be done?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          className="w-full h-[40px] px-3.5 bg-white border border-zinc-200 rounded-[6px] text-[14px] text-zinc-900 placeholder:text-zinc-350 focus:outline-none focus:border-zinc-400 transition-colors duration-125"
        />

        {/* Description textarea */}
        <textarea
          placeholder="Add description or reference notes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          className="w-full h-[80px] p-3.5 bg-white border border-zinc-200 rounded-[6px] text-[14px] text-zinc-900 placeholder:text-zinc-350 focus:outline-none focus:border-zinc-400 resize-none transition-colors duration-125"
        />

        {/* Bottom selector row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Priority selector */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPriority("high")}
              disabled={submitting}
              className={`text-[13px] font-medium transition-all duration-120 cursor-pointer select-none pb-0.5 ${
                priority === "high"
                  ? "text-[#DC2626] border-b border-[#DC2626] pb-0 font-medium"
                  : "text-zinc-450 hover:text-zinc-900"
              }`}
            >
              High
            </button>
            <button
              type="button"
              onClick={() => setPriority("medium")}
              disabled={submitting}
              className={`text-[13px] font-medium transition-all duration-120 cursor-pointer select-none pb-0.5 ${
                priority === "medium"
                  ? "text-[#C2410C] border-b border-[#C2410C] pb-0 font-medium"
                  : "text-zinc-450 hover:text-zinc-900"
              }`}
            >
              Medium
            </button>
            <button
              type="button"
              onClick={() => setPriority("low")}
              disabled={submitting}
              className={`text-[13px] font-medium transition-all duration-120 cursor-pointer select-none pb-0.5 ${
                priority === "low"
                  ? "text-[#15803D] border-b border-[#15803D] pb-0 font-medium"
                  : "text-zinc-450 hover:text-zinc-900"
              }`}
            >
              Low
            </button>
          </div>

          {/* Date input + Submit Button */}
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={submitting}
              className="w-[160px] h-[36px] px-3 bg-white border border-zinc-200 rounded-[6px] text-[13px] font-mono text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors duration-120"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-[13px] h-[36px] px-4 rounded-[6px] transition-all duration-120 cursor-pointer"
            >
              {submitting ? "Adding..." : "Add task"}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
