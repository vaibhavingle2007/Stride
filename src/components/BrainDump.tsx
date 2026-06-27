import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Task } from "../lib/gemini";
import { getLocalDateString } from "../lib/productivity";

interface BrainDumpProps {
  onAddTasks: (newTasks: Omit<Task, "id" | "completed">[]) => Promise<void>;
}

interface ExtractedTask {
  name: string;
  deadline: string | null;
  priority: "high" | "medium" | "low";
  description: string;
  checked: boolean;
}

export default function BrainDump({ onAddTasks }: BrainDumpProps) {
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setUserInput((prev) => prev + (prev ? " " : "") + finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'network') {
            shouldListenRef.current = false;
            setIsListening(false);
          }
        };

        recognitionRef.current.onend = () => {
          if (shouldListenRef.current) {
            try {
              recognitionRef.current?.start();
            } catch (e) {
              shouldListenRef.current = false;
              setIsListening(false);
            }
          } else {
            setIsListening(false);
          }
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        shouldListenRef.current = true;
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start listening", err);
        shouldListenRef.current = false;
        setIsListening(false);
      }
    }
  };

  const handleExtract = async () => {
    if (!userInput.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const today = getLocalDateString();
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userInput, today })
      });

      if (!res.ok) {
        let errorMessage = "Failed to extract tasks";
        try {
          const data = await res.json();
          if (data && data.error) {
            errorMessage = data.error;
          }
        } catch (_) {}
        throw new Error(errorMessage);
      }

      const data = await res.json();
      if (data && Array.isArray(data.tasks)) {
        const mapped = data.tasks.map((t: any) => ({
          name: t.name || "",
          deadline: t.deadline || null,
          priority: t.priority || "medium",
          description: t.description || "",
          checked: true
        }));
        if (mapped.length === 0) {
          setError("No clear tasks could be identified from your brain dump. Try describing specific actions or deadlines!");
        } else {
          setExtractedTasks(mapped);
        }
      } else {
        throw new Error("Invalid structure returned from the extraction engine.");
      }
    } catch (err: any) {
      console.error("Task extraction failed:", err);
      setError(err?.message || "Task extraction failed. The AI model might be experiencing temporary high demand; please click extract again to retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChecked = (index: number) => {
    setExtractedTasks((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, checked: !t.checked } : t))
    );
  };

  const handleConfirm = async () => {
    const tasksToAdd = extractedTasks.filter((t) => t.checked);
    if (tasksToAdd.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      const formattedTasks = tasksToAdd.map((t) => ({
        name: t.name,
        deadline: t.deadline || getLocalDateString(),
        priority: t.priority,
        description: t.description
      }));
      await onAddTasks(formattedTasks);
      setUserInput("");
      setExtractedTasks([]);
    } catch (error) {
      console.error("Failed to add extracted tasks:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full text-left mb-8 border-b border-zinc-150 pb-8">
      <div className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase mb-4 selection:bg-zinc-200">
        BRAIN DUMP
      </div>

      <div className="space-y-4">
        {/* Single Textarea */}
        <div className="relative">
          <textarea
            placeholder="Type or say everything on your mind... e.g. exam on friday, fix bug, call client monday, submit report"
            value={userInput}
            onChange={(e) => {
              setUserInput(e.target.value);
              if (error) setError(null);
            }}
            disabled={loading || submitting}
            className="w-full h-[100px] p-3.5 pr-12 bg-white border border-zinc-200 rounded-[6px] text-[14px] text-zinc-900 placeholder:text-zinc-350 focus:outline-none focus:border-zinc-400 resize-none transition-colors duration-125"
          />
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Start listening"}
            disabled={loading || submitting}
            className={`absolute top-3.5 right-3.5 p-1.5 rounded-[4px] transition-colors ${
              isListening ? "bg-red-50 text-red-500" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3 text-[13px] leading-relaxed text-red-600 bg-red-50/75 border border-red-100 rounded-[6px] font-normal">
            {error}
          </div>
        )}

        {/* Action Button */}
        <div>
          <button
            type="button"
            onClick={handleExtract}
            disabled={!userInput.trim() || loading || submitting}
            className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-[13px] h-[36px] px-4 rounded-[6px] transition-all duration-120 cursor-pointer"
          >
            {loading ? "Extracting..." : "Extract Tasks"}
          </button>
        </div>

        {/* Preview Extracted Tasks */}
        {!loading && extractedTasks.length > 0 && (
          <div className="mt-6 p-4 bg-zinc-50 border border-zinc-200 rounded-[6px] transition-all duration-150">
            <div className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide mb-3 select-none">
              Found {extractedTasks.length} tasks — confirm to add all
            </div>

            <div className="space-y-3 mb-4">
              {extractedTasks.map((task, index) => {
                let priorityClass = "";
                const isHigh = task.priority === "high";
                const isMedium = task.priority === "medium";

                if (isHigh) {
                  priorityClass = "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]";
                } else if (isMedium) {
                  priorityClass = "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]";
                } else {
                  priorityClass = "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
                }

                return (
                  <div key={index} className="flex items-center justify-between py-1.5 border-b border-zinc-200/50 last:border-b-0">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <input
                        type="checkbox"
                        checked={task.checked}
                        onChange={() => handleToggleChecked(index)}
                        className="w-4 h-4 rounded-[3px] border border-zinc-350 bg-white text-zinc-900 focus:ring-0 accent-zinc-900 cursor-pointer"
                      />
                      <span className={`text-[13.5px] truncate font-normal ${task.checked ? "text-zinc-900" : "text-zinc-400 line-through"}`}>
                        {task.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-medium border rounded-[4px] px-1.5 py-0.25 uppercase tracking-wide select-none ${priorityClass}`}>
                        {task.priority}
                      </span>
                      <span className="text-[11.5px] font-mono text-zinc-400">
                        {task.deadline || "no date"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={extractedTasks.filter(t => t.checked).length === 0 || submitting}
              className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-[13px] h-[36px] px-4 rounded-[6px] transition-all duration-120 cursor-pointer"
            >
              {submitting ? "Adding..." : "Add Checked Tasks"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
