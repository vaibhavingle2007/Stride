import React, { useState, useEffect } from "react";
import { Task, AIScheduleBlock } from "../lib/gemini";
import { ActivityEntry, logActivity } from "../lib/activity";
import CalendarSync from "./CalendarSync";
import { calculateStreak, calculateScore, getLocalDateString, calculateOnTimeStreak } from "../lib/productivity";
import { auth, googleProvider, db } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { createCalendarEvent } from "../lib/calendarService";
import { doc, updateDoc } from "firebase/firestore";

interface RightPanelWidgetsProps {
  tasks: Task[];
  scheduleFromAi: AIScheduleBlock[] | null;
  userId: string;
}

export default function RightPanelWidgets({ tasks, scheduleFromAi, userId }: RightPanelWidgetsProps) {
  const todayStr = getLocalDateString();
  const yesterdayStr = dDaysAgo(1);

  // --- WIDGET State & Hooks ---
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [schedule, setSchedule] = useState<AIScheduleBlock[]>([]);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  
  // Calendar State
  const [isConnected, setIsConnected] = useState(false);
  const [showBulkSync, setShowBulkSync] = useState(false);
  const [bulkSyncProgress, setBulkSyncProgress] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsConnected(!!localStorage.getItem('stride_gcal_token'));
    }
  }, []);

  const handleConnectCalendar = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const wasConnected = !!localStorage.getItem('stride_gcal_token');
        localStorage.setItem('stride_gcal_token', credential.accessToken);
        setIsConnected(true);
        if (!wasConnected) {
          setShowBulkSync(true);
        }
      }
    } catch (e) {
      console.error("Google Calendar connection failed", e);
    }
  };

  const handleDisconnectCalendar = () => {
    localStorage.removeItem('stride_gcal_token');
    setIsConnected(false);
    setShowBulkSync(false);
  };

  const handleBulkSync = async () => {
    const incompleteTasks = tasks.filter(t => !t.completed && t.deadline && !t.googleEventId);
    if (incompleteTasks.length === 0) {
      setBulkSyncProgress(`✓ 0 tasks to sync`);
      setTimeout(() => setShowBulkSync(false), 3000);
      return;
    }
    
    let count = 0;
    for (const t of incompleteTasks) {
      setBulkSyncProgress(`Syncing ${count + 1} of ${incompleteTasks.length} tasks...`);
      const googleEventId = await createCalendarEvent(t);
      if (googleEventId && t.id) {
        const taskRef = doc(db, "tasks", t.id);
        await updateDoc(taskRef, { googleEventId });
      }
      count++;
    }
    
    setBulkSyncProgress(`✓ ${count} tasks synced to Google Calendar`);
    setTimeout(() => setShowBulkSync(false), 3000);
  };
  const [editingBlocks, setEditingBlocks] = useState<AIScheduleBlock[]>([]);
  const [score, setScore] = useState(0);
  const [percentChange, setPercentChange] = useState(0);

  // Helper: date computation
  function dDaysAgo(d: number): string {
    const date = new Date();
    date.setDate(date.getDate() - d);
    return getLocalDateString(date);
  }

  // Load activities, schedule, and score on mount/update
  useEffect(() => {
    const handleStorageChange = () => {
      // 1. Loading Activity Feed
      try {
        const rawAct = localStorage.getItem("stride_activity");
        setActivities(rawAct ? JSON.parse(rawAct) : []);
      } catch (e) {
        console.error("Corrupted local storage stride_activity parsing fallback", e);
        setActivities([]);
      }
    };

    handleStorageChange();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Sync AI-generated schedule or fallback to local storage
  useEffect(() => {
    if (scheduleFromAi && scheduleFromAi.length > 0) {
      setSchedule(scheduleFromAi);
      localStorage.setItem("stride_schedule", JSON.stringify(scheduleFromAi));
    } else {
      try {
        const stored = localStorage.getItem("stride_schedule");
        if (stored) {
          setSchedule(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Corrupted local storage stride_schedule parsing fallback", e);
      }
    }
  }, [scheduleFromAi]);

  // Score Calculation React Block
  useEffect(() => {
    // Streak count computation
    const streakDays = calculateOnTimeStreak(tasks, todayStr);

    // Cumulative Score
    const newScore = calculateScore(tasks, streakDays, todayStr);
    setScore(newScore);

    // Store index
    localStorage.setItem(`stride_score_${todayStr}`, String(newScore));

    // Percent Change determination
    const yesterdayScoreRaw = localStorage.getItem(`stride_score_${yesterdayStr}`);
    const yesterdayScore = yesterdayScoreRaw ? parseInt(yesterdayScoreRaw, 10) : 0;
    const diff = newScore - yesterdayScore;
    
    setPercentChange(diff);
  }, [tasks, todayStr, yesterdayStr]);

  // --- Logic Helpers ---

  // Focus level computation
  const activeHighTasks = tasks.filter(t => !t.completed && t.priority === "high").length;
  let focusLevel: "High" | "Medium" | "Low" = "Low";
  if (activeHighTasks >= 3) {
    focusLevel = "High";
  } else if (activeHighTasks >= 1) {
    focusLevel = "Medium";
  }

  // Focus level styling map
  const focusPillClasses = {
    High: "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]",
    Medium: "bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]",
    Low: "bg-[#F7F7F8] text-[#52525B] border border-[#E4E4E7]"
  };

  // Mon-Sun Week Generation
  const getWeeklyDates = () => {
    const current = new Date();
    const day = current.getDay();
    const distanceToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(current);
    monday.setDate(current.getDate() + distanceToMonday);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const currentWeekDays = getWeeklyDates();
  const dayInitials = ["M", "T", "W", "T", "F", "S", "S"];

  // Activity feed relative temporal parsing helper
  function getRelativeTime(timestamp: string): string {
    try {
      const d = new Date(timestamp);
      const diff = Date.now() - d.getTime();
      const sec = Math.floor(diff / 1000);
      if (sec < 60) return "just now";
      const min = Math.floor(sec / 60);
      if (min < 60) return `${min}m ago`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `${hr}h ago`;
      const dy = Math.floor(hr / 24);
      return `${dy}d ago`;
    } catch (e) {
      return "";
    }
  }

  // Get matching activity emojis
  function getActivityEmoji(type: string): string {
    switch (type) {
      case "completed": return "✓";
      case "added": return "+";
      case "schedule": return "↑";
      case "warning": return "⚠";
      case "braindump": return "🧠";
      case "snap": return "📷";
      default: return "⚡";
    }
  }

  // Active schedule detector: compares hours & minutes range
  function isTimeBlockActive(timeRange: string): boolean {
    if (!timeRange) return false;
    try {
      const parts = timeRange.split("-");
      if (parts.length !== 2) return false;
      
      const parseTimeToMinutes = (t: string) => {
        t = t.trim().toLowerCase();
        let isPM = t.includes("pm");
        let isAM = t.includes("am");
        t = t.replace(/(am|pm)/g, "").trim();
        const timeParts = t.split(":");
        if (timeParts.length < 2) return 0;
        let hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      
      const startMin = parseTimeToMinutes(parts[0]);
      const endMin = parseTimeToMinutes(parts[1]);
      
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      
      return currentMin >= startMin && currentMin <= endMin;
    } catch (e) {
      return false;
    }
  }

  // Schedule Custom Editor Hooks
  const openEditPlanModal = () => {
    setEditingBlocks(schedule.length > 0 ? [...schedule] : [{ time: "09:00 - 10:00", task_name: "", activity_type: "Work" }]);
    setIsEditingPlan(true);
  };

  const handleSavePlan = () => {
    const list = editingBlocks.filter(b => b.time && b.task_name);
    setSchedule(list);
    localStorage.setItem("stride_schedule", JSON.stringify(list));
    logActivity("schedule", "Manual timeline adjustments applied successfully");
    setIsEditingPlan(false);
  };

  const handleFieldChange = (idx: number, field: keyof AIScheduleBlock, val: string) => {
    const clone = [...editingBlocks];
    clone[idx][field] = val;
    setEditingBlocks(clone);
  };

  const addEditingBlock = () => {
    setEditingBlocks([...editingBlocks, { time: "11:00 - 12:00", task_name: "", activity_type: "Sprint" }]);
  };

  const removeEditingBlock = (idx: number) => {
    const clone = [...editingBlocks];
    clone.splice(idx, 1);
    setEditingBlocks(clone);
  };

  return (
    <div className="w-full flex flex-col gap-8 text-left bg-white p-6 border border-zinc-200 rounded-xl select-none">
      
      {/* ━━━ GOOGLE CALENDAR SYNC WIDGET ━━━ */}
      <CalendarSync userId={userId} />

      {/* ━━━ WIDGET 1: FOCUS STATUS ━━━ */}
      <div className="flex items-center justify-between py-3 border-b border-zinc-200">
        <span className="text-[11px] font-bold text-zinc-400 tracking-[0.08em] uppercase font-sans">
          FOCUS STATUS
        </span>
        <span className={`text-[12px] font-medium rounded-full px-2.5 py-[3px] transition-colors leading-none ${focusPillClasses[focusLevel]}`}>
          {focusLevel}
        </span>
      </div>

      {/* ━━━ WIDGET 2: PRODUCTIVITY SCORE ━━━ */}
      <div className="flex flex-col border-b border-[#E4E4E7] pb-4">
        <span className="text-[11px] font-bold text-zinc-400 tracking-[0.08em] uppercase mb-3 font-sans">
          PRODUCTIVITY SCORE
        </span>
        <div className="flex items-baseline mb-3">
          <span className="font-mono text-[48px] font-light text-zinc-900 leading-none mr-1">
            {score}
          </span>
          <span className="font-sans text-[16px] text-zinc-400 font-normal leading-none">
            /100
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-[3px] bg-zinc-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-zinc-900 rounded-full transition-all duration-[600ms] ease-out" 
            style={{ width: `${score}%` }}
          />
        </div>
        {/* Percentage change display */}
        <div className={`text-[12px] leading-none mt-2.5 font-medium ${
          percentChange > 0 
            ? "text-[#15803D]" 
            : percentChange < 0 
              ? "text-[#DC2626]" 
              : "text-zinc-400"
        }`}>
          {percentChange > 0 ? `+${percentChange}%` : percentChange < 0 ? `${percentChange}%` : "0%"} from yesterday
        </div>
      </div>

      {/* ━━━ WIDGET 3: WEEKLY STREAK ━━━ */}
      <div className="flex flex-col border-b border-zinc-200 pb-4">
        <span className="text-[11px] font-bold text-zinc-400 tracking-[0.08em] uppercase mb-3.5 font-sans">
          WEEKLY STREAK
        </span>
        <div className="flex items-center gap-1.5 mb-3.5">
          {currentWeekDays.map((dt, idx) => {
            const dateStr = dt.toISOString().split("T")[0];
            const isCompleted = tasks.some(t => {
              if (!t.completed) return false;
              // Check if completed on this date
              const completionDate = t.completedAt || t.deadline || todayStr;
              return completionDate === dateStr;
            });
            const isToday = dateStr === todayStr;

            let circleClass = "";
            let textElement = dayInitials[idx];

            if (isCompleted) {
              circleClass = "bg-zinc-900 text-white font-medium border border-zinc-900";
              textElement = "✓";
            } else if (isToday) {
              circleClass = "bg-[#F7F7F8] border border-zinc-900 text-zinc-900 font-semibold";
            } else {
              circleClass = "bg-[#F0FDF4]/10 border border-zinc-200 text-zinc-400 font-normal";
            }

            return (
              <div key={idx} className="flex flex-col items-center flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono select-none ${circleClass}`}>
                  {textElement}
                </div>
                <span className="text-[9.5px] font-medium text-zinc-400 tracking-wider uppercase mt-1 font-sans">
                  {dayInitials[idx]}
                </span>
              </div>
            );
          })}
        </div>
        <span className="text-[13px] text-zinc-500 font-normal font-sans">
          Current streak: {calculateOnTimeStreak(tasks, todayStr)} days
        </span>
      </div>

      {/* ━━━ WIDGET 4: AI SCHEDULE ━━━ */}
      <div className="flex flex-col border-b border-zinc-200 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-zinc-400 tracking-[0.08em] uppercase font-sans">
            AI SCHEDULE
          </span>
          <span 
            onClick={openEditPlanModal}
            className="text-[12px] text-zinc-400 cursor-pointer underline hover:text-zinc-900 font-sans tracking-wide"
          >
            Edit Plan
          </span>
        </div>

        {schedule.length === 0 ? (
          <p className="text-[13px] text-zinc-400/85 text-center py-6 font-normal">
            Run AI Analysis to generate schedule
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-zinc-50">
            {schedule.map((block, idx) => {
              const active = isTimeBlockActive(block.time);
              return (
                <div 
                  key={idx} 
                  className={`flex items-start py-3.5 transition-all duration-150 ${
                    active 
                      ? "border-l-2 border-zinc-900 pl-3.5 bg-zinc-50/50 -mx-1" 
                      : "border-l-2 border-transparent pl-0"
                  }`}
                >
                  <span className="font-mono text-[11px] text-zinc-400 w-[85px] leading-tight shrink-0">
                    {block.time}
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 mx-2 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0 pr-1 ml-1 text-left">
                    <p className="text-[13px] text-zinc-900 font-medium leading-none mb-1 text-ellipsis overflow-hidden whitespace-nowrap">
                      {block.task_name}
                    </p>
                    <p className={`text-[11px] leading-none ${active ? "text-[#15803D] font-semibold" : "text-zinc-400"}`}>
                      {active ? "Active Now" : block.activity_type || "Standard block"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ━━━ WIDGET 5: ACTIVITY FEED ━━━ */}
      <div className="flex flex-col mb-6">
        <span className="text-[11px] font-bold text-zinc-400 tracking-[0.08em] uppercase mb-3.5 font-sans">
          ACTIVITY
        </span>
        {activities.length === 0 ? (
          <p className="text-[13px] text-zinc-400/80 text-center py-4 font-normal">
            No recent activity logged
          </p>
        ) : (
          <div className="max-h-[290px] overflow-y-auto custom-scrollbar flex flex-col divide-y divide-zinc-50">
            {activities.slice(0, 12).map((act, idx) => (
              <div key={idx} className="flex items-start gap-3 py-3 text-left">
                <div className="w-5 h-5 rounded bg-zinc-50 border border-zinc-100 flex items-center justify-center text-[10px] select-none shrink-0 font-medium text-zinc-600">
                  {getActivityEmoji(act.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-zinc-900 font-normal leading-normal whitespace-normal break-words pr-1">
                    {act.description}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-none">
                    {getRelativeTime(act.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ━━━ SCHEDULE EDIT PANEL MODAL (FLUID ABSOLUTE / FIXED SCREEN GLASS OVERLAY) ━━━ */}
      {isEditingPlan && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4 select-none">
              <h3 className="text-[15px] font-medium text-zinc-900">Edit AI Schedule</h3>
              <button 
                onClick={() => setIsEditingPlan(false)}
                className="text-[12px] text-zinc-400 hover:text-zinc-600 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 mb-6">
              {editingBlocks.length === 0 ? (
                <p className="text-[13px] text-zinc-400 text-center py-6">No blocks. Add one below!</p>
              ) : (
                editingBlocks.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 border border-zinc-100 p-2.5 rounded-[6px] bg-zinc-50/20">
                    <input 
                      type="text" 
                      placeholder="e.g. 09:00 - 10:00"
                      value={b.time}
                      onChange={(e) => handleFieldChange(idx, "time", e.target.value)}
                      className="font-mono text-[12px] text-zinc-900 w-[115px] border border-zinc-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-zinc-400"
                    />
                    <input 
                      type="text" 
                      placeholder="Task or Action name"
                      value={b.task_name}
                      onChange={(e) => handleFieldChange(idx, "task_name", e.target.value)}
                      className="text-[13px] text-zinc-900 flex-1 border border-zinc-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-zinc-400"
                    />
                    <button 
                      onClick={() => removeEditingBlock(idx)}
                      className="text-[12px] text-red-500 hover:text-red-700 px-1 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
              
              <button 
                onClick={addEditingBlock}
                className="w-full text-center py-2 border border-dashed border-zinc-200 text-zinc-500 hover:text-zinc-800 text-[12px] rounded-[6px] transition bg-zinc-50/5 hover:bg-zinc-50"
              >
                + Add Custom Interval
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 select-none">
              <button 
                onClick={() => setIsEditingPlan(false)}
                className="border border-zinc-200 text-zinc-500 hover:text-zinc-800 text-[12px] font-medium py-2 px-4 rounded-[6px] bg-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePlan}
                disabled={editingBlocks.some(b => !b.time || !b.task_name)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] font-medium py-2 px-4 rounded-[6px] transition cursor-pointer disabled:opacity-40"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
