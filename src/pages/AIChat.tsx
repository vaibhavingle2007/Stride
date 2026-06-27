import React, { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Task } from "../lib/gemini";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import { motion } from "motion/react";
import { calculateStreak, calculateScore, getLocalDateString, calculateOnTimeStreak } from "../lib/productivity";

interface AIChatProps {
  user: User;
  onSignOut: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function AIChat({ user, onSignOut }: AIChatProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync tasks from firestore so the AI coach has active context
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList: Task[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        taskList.push({
          id: doc.id,
          name: data.name,
          deadline: data.deadline,
          priority: data.priority,
          description: data.description || "",
          completed: !!data.completed,
          completedAt: data.completedAt
        });
      });
      setTasks(taskList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "tasks");
    });
    return () => unsubscribe();
  }, [user]);

  // Streak & Score calculations to send context to Gemini
  useEffect(() => {
    const todayStr = getLocalDateString();
    const streakDays = calculateOnTimeStreak(tasks, todayStr);
    setStreak(streakDays);

    const calculatedScore = calculateScore(tasks, streakDays, todayStr);
    setScore(calculatedScore);
  }, [tasks]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputValue;
    if (!rawText.trim() || sending) return;

    setError(null);
    if (!textToSend) setInputValue("");

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: rawText,
      timestamp: formattedTime
    };

    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      // Build conversation payload (last 10 messages)
      const chatHistory = [...messages, userMsg].slice(-10);
      const chatPayload = chatHistory.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatPayload,
          tasks: tasks.map(t => ({
            name: t.name,
            deadline: t.deadline,
            priority: t.priority,
            description: t.description || "",
            completed: !!t.completed
          })),
          score: score,
          streak: streak
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Coaching API error.");

      const replyTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response || "No reply generated.",
          timestamp: replyTime
        }
      ]);
    } catch (err: any) {
      console.error("Coaching interaction error:", err);
      setError(err?.message || "Oops, Stride Chat lost response connection. Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const welcomeSuggestions = [
    "What should I focus on right now?",
    "Am I going to hit my June 29 deadline?",
    "Which tasks can I drop or delay?",
    "Give me a plan for the next 3 days"
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans selection:bg-zinc-200 selection:text-zinc-950">
      <Header user={user} onSignOut={onSignOut} />
      <Navigation user={user} />

      <motion.div 
        className="flex-1 flex max-w-[1280px] w-full mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {/* Left Side Chat Area */}
        <div className="flex-1 flex flex-col justify-between bg-white relative">
          
          {/* Messages List Container */}
          <div className="flex-1 flex flex-col gap-4 px-[48px] py-[24px] overflow-y-auto h-[calc(100vh-180px)] custom-scrollbar">
            {messages.length === 0 ? (
              /* Welcome State */
              <div className="flex-1 flex flex-col items-center justify-center text-center my-auto">
                <h3 className="text-[20px] font-normal text-zinc-900 mb-6 font-sans">
                  Ask Stride anything
                </h3>
                <div className="grid grid-cols-2 gap-3 max-w-xl w-full">
                  {welcomeSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSendMessage(suggestion)}
                      className="border border-zinc-200 rounded-[6px] p-3 text-[13px] text-zinc-650 bg-white hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer text-left transition-all duration-120 flex items-center"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Current Conversation listing */
              <div className="flex flex-col gap-[16px]">
                {messages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`text-[14px] leading-relaxed p-[10px_14px] max-w-[70%] ${
                          isUser
                            ? "bg-zinc-900 text-white rounded-[12px_12px_2px_12px]"
                            : "bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-[12px_12px_12px_2px]"
                        }`}
                      >
                        {m.content}
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 mt-1 select-none">
                        {m.timestamp}
                      </span>
                    </div>
                  );
                })}

                {/* Loading state pulsing bubble */}
                {sending && (
                  <div className="flex flex-col items-start">
                    <div className="bg-zinc-100 border border-zinc-200 rounded-[12px_12px_12px_2px] p-[10px_14px] max-w-[70%] text-[14px] flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 mt-1 select-none">
                      analyzing
                    </span>
                  </div>
                )}

                {error && (
                  <div className="p-3 border border-red-200 bg-red-50 text-[12px] text-red-600 font-mono rounded-[6px] self-center max-w-md w-full text-center">
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Form container fixed at bottom */}
          <div className="border-t border-zinc-200 px-[48px] py-[16px] bg-white flex gap-2 items-center">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Stride anything..."
              disabled={sending}
              style={{ height: "44px" }}
              className="flex-1 border border-zinc-200 rounded-[6px] p-[10px_14px] text-[14px] resize-none focus:outline-none focus:border-zinc-350 transition-all custom-scrollbar bg-white text-zinc-900"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || sending}
              className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-35 disabled:cursor-not-allowed text-white rounded-[6px] p-[10px_16px] text-[13px] font-medium h-[44px] flex items-center justify-center transition-colors cursor-pointer select-none"
            >
              Send
            </button>
          </div>
        </div>

        {/* Right Side Context Sidebar */}
        <div className="w-[260px] border-l border-zinc-200 flex flex-col justify-between bg-white text-left">
          
          <div className="flex-1 flex flex-col">
            <div className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase p-4 border-b border-zinc-200 select-none">
              CHAT CONTEXT
            </div>

            {/* Tasks Section */}
            <div className="p-4 border-b border-zinc-100 fill-height max-h-[340px] overflow-y-auto custom-scrollbar">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-2 select-none">
                Tasks in context ({tasks.length})
              </span>
              {tasks.length === 0 ? (
                <p className="text-xs text-zinc-450 italic py-1">No active tasks in context</p>
              ) : (
                <div className="flex flex-col">
                  {tasks.map((task) => {
                    const dotColors = {
                      high: "#DC2626",
                      medium: "#C2410C",
                      low: "#15803D"
                    };
                    const priorityValue = task.priority as "high" | "medium" | "low";
                    const dotColor = dotColors[priorityValue] || "#52525B";

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-2.5 text-[13px] text-zinc-700 py-2.5 border-b border-zinc-50 last:border-b-0 truncate"
                        title={task.name}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span className="truncate">{task.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Memory Section */}
            <div className="p-4 flex-1">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1 select-none">
                Memory
              </span>
              <p className="text-[12px] text-zinc-450 leading-relaxed">
                Stride remembers your last 10 messages
              </p>
            </div>
          </div>

          {/* Sidebar Actions bottom footer */}
          <div className="p-4 border-t border-zinc-100 flex items-center justify-start bg-zinc-50/50">
            <button
              onClick={clearChat}
              disabled={messages.length === 0}
              className="text-[12.5px] text-zinc-500 hover:text-zinc-900 disabled:opacity-30 disabled:no-underline underline transition-all font-medium cursor-pointer select-none"
            >
              Clear chat
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
