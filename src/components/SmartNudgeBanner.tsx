import React, { useState, useEffect } from "react";
import { Task } from "../lib/gemini";
import { getLocalDateString } from "../lib/productivity";

interface SmartNudgeBannerProps {
  tasks: Task[];
}

export default function SmartNudgeBanner({ tasks }: SmartNudgeBannerProps) {
  const [timeOnDashboard, setTimeOnDashboard] = useState(0); // in minutes
  const [isDismissed, setIsDismissed] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);

  // 1. Trace planning/idle duration in minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeOnDashboard((prev) => prev + 1);
    }, 60 * 1000); // every minute

    return () => clearInterval(timer);
  }, []);

  // 2. Check 30 minutes dismiss cooldown from localStorage
  useEffect(() => {
    const lastDismissed = localStorage.getItem("stride_nudge_dismissed_at");
    if (lastDismissed) {
      const elapsed = Date.now() - parseInt(lastDismissed, 10);
      if (elapsed < 30 * 60 * 1000) {
        setIsDismissed(true);
      }
    }
  }, []);

  // 3. Auto-hide after 10 minutes if not dismissed
  useEffect(() => {
    const hideTimer = setTimeout(() => {
      setAutoHidden(true);
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearTimeout(hideTimer);
  }, []);

  if (isDismissed || autoHidden || tasks.length === 0) return null;

  const todayStr = getLocalDateString();
  const hoursLeft = 24 - new Date().getHours();

  // Condition 1: HIGH priority task due within 2 hours and not complete
  const urgentHighTask = tasks.find(t => 
    !t.completed && 
    t.priority === "high" && 
    t.deadline === todayStr && 
    hoursLeft <= 2
  );

  // Condition 2: Overloaded day today (3+ high priority tasks due today)
  const highTasksToday = tasks.filter(t => 
    !t.completed && 
    t.priority === "high" && 
    t.deadline === todayStr
  );
  const isOverloadedToday = highTasksToday.length >= 3;

  // Condition 3: User has been on the dashboard for 20+ minutes
  const isIdlePlanning = timeOnDashboard >= 20;

  // Trigger evaluation in priority order
  let nudgeMessage = "";
  if (urgentHighTask) {
    nudgeMessage = `"${urgentHighTask.name}" is due in ${hoursLeft} hours. Start now to finish on time.`;
  } else if (isOverloadedToday) {
    nudgeMessage = `You have ${highTasksToday.length} high priority tasks today. Pick ONE to start.`;
  } else if (isIdlePlanning) {
    nudgeMessage = `You've been planning for 20 minutes. Time to execute.`;
  } else {
    // If no triggers are active, do not render the banner
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem("stride_nudge_dismissed_at", String(Date.now()));
    setIsDismissed(true);
  };

  return (
    <div 
      id="smart-nudge-banner"
      className="bg-[#FFFBEB] border border-[#FED7AA] rounded-md p-3 px-4 mb-4 flex justify-between items-center gap-4 select-none animate-fade-in fade-in"
    >
      <div className="flex items-center text-left">
        <span className="text-[14px] mr-2.5">💡</span>
        <span className="text-[13px] text-zinc-900 font-normal leading-normal">
          {nudgeMessage}
        </span>
      </div>
      <button 
        onClick={handleDismiss}
        className="border border-zinc-200 bg-white text-zinc-500 text-[12px] font-normal px-3 py-1.5 rounded-[4px] hover:bg-zinc-50 transition cursor-pointer shrink-0 leading-none"
      >
        Dismiss
      </button>
    </div>
  );
}
