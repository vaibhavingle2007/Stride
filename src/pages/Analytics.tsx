import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Task } from "../lib/gemini";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import { motion } from "motion/react";
import { Sparkles, RefreshCw, Trophy, Award, Zap, Clock, Lock, CheckCircle2, Flame } from "lucide-react";
import { calculateStreak, getLocalDateString, isOnTime, calculateOnTimeStreak } from "../lib/productivity";

interface AnalyticsProps {
  user: User;
  onSignOut: () => void;
}

export default function Analytics({ user, onSignOut }: AnalyticsProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streak, setStreak] = useState(0);
  const [insight, setInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightFetched, setInsightFetched] = useState(false);

  // Firestore sync for tasks
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

  // Streak calculations
  useEffect(() => {
    let streakMap = {};
    try {
      const rawStreak = localStorage.getItem("stride_streak");
      streakMap = rawStreak ? JSON.parse(rawStreak) : {};
    } catch (e) {
      console.error("Corrupted local storage stride_streak parsing fallback", e);
    }

    const todayStr = getLocalDateString();
    const count = calculateStreak(streakMap, todayStr);
    setStreak(count);
  }, [tasks]);

  // 1. Completion Rate calculation
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const completionRate = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // 2. Weekly Velocity - tasks completed in the last 7 days
  const getWeeklyVelocity = () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    return tasks.filter(t => {
      if (!t.completed || !t.deadline) return false;
      const tDate = new Date(t.deadline);
      return tDate >= sevenDaysAgo && tDate <= today;
    }).length;
  };
  const completedThisWeekCount = getWeeklyVelocity();

  // 3. Priority Breakdown rates
  const getPriorityStat = (prio: "high" | "medium" | "low") => {
    const subset = tasks.filter(t => t.priority === prio);
    const total = subset.length;
    const completed = subset.filter(t => t.completed).length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 105); // cap at 100 below for render
    return {
      total,
      completed,
      rate: Math.min(rate, 100)
    };
  };

  const highStats = getPriorityStat("high");
  const medStats = getPriorityStat("medium");
  const lowStats = getPriorityStat("low");

  // 4. On-Time & Gamification Stats
  const onTimeStreak = calculateOnTimeStreak(tasks, getLocalDateString());
  const onTimeTasks = tasks.filter(isOnTime);
  const onTimeCount = onTimeTasks.length;
  const highPriorityOnTimeCount = onTimeTasks.filter(t => t.priority === "high").length;
  const onTimeRate = completedCount === 0 ? 0 : Math.round((onTimeCount / completedCount) * 100);

  const badges = [
    {
      id: "speed_demon",
      name: "Speed Demon",
      description: "Complete any task on or before its deadline",
      icon: Clock,
      unlocked: onTimeCount >= 1,
      current: onTimeCount,
      target: 1,
      bgColor: "bg-blue-50/70 border-blue-200 text-blue-600",
      bgFill: "bg-blue-600",
    },
    {
      id: "punctual_master",
      name: "Punctual Master",
      description: "Complete 5 tasks on or before their deadlines",
      icon: Award,
      unlocked: onTimeCount >= 5,
      current: onTimeCount,
      target: 5,
      bgColor: "bg-amber-50/70 border-amber-200 text-amber-600",
      bgFill: "bg-amber-600",
    },
    {
      id: "deadline_destroyer",
      name: "Deadline Destroyer",
      description: "Complete 10 tasks on or before their deadlines",
      icon: Trophy,
      unlocked: onTimeCount >= 10,
      current: onTimeCount,
      target: 10,
      bgColor: "bg-emerald-50/70 border-emerald-200 text-emerald-600",
      bgFill: "bg-emerald-600",
    },
    {
      id: "clutch_hero",
      name: "Clutch Hero",
      description: "Complete 3 High Priority tasks on time",
      icon: Zap,
      unlocked: highPriorityOnTimeCount >= 3,
      current: highPriorityOnTimeCount,
      target: 3,
      bgColor: "bg-rose-50/70 border-rose-200 text-rose-600",
      bgFill: "bg-rose-600",
    },
    {
      id: "on_time_streak_badge",
      name: "On-Time Streak",
      description: "Maintain a 3-day on-time completion streak",
      icon: Flame,
      unlocked: onTimeStreak >= 3,
      current: onTimeStreak,
      target: 3,
      bgColor: "bg-purple-50/70 border-purple-200 text-purple-600",
      bgFill: "bg-purple-600",
    },
  ];

  // Fetch AI Insight from API
  const fetchInsightData = async (force: boolean = false) => {
    if (tasks.length === 0) {
      setInsight("Create some tasks to generate productivity insights.");
      return;
    }
    if (insightFetched && !force) return;

    setLoadingInsight(true);
    try {
      const todayStr = getLocalDateString();
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: tasks.map(t => ({ name: t.name, priority: t.priority, deadline: t.deadline, completed: t.completed })),
          completedThisWeek: completedThisWeekCount,
          streak: streak,
          rate: completionRate,
          today: todayStr
        })
      });
      const data = await res.json();
      setInsight(data.insight || "Keep focusing on high priority deadlines to reach today's stride.");
      setInsightFetched(true);
    } catch (err) {
      console.error("Insight fetching failed:", err);
      setInsight("Focus on completing high-priority tasks before they reach their deadlines.");
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    if (tasks.length > 0 && !insightFetched && !loadingInsight) {
      fetchInsightData();
    }
  }, [tasks, insightFetched]);

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans selection:bg-zinc-200 selection:text-zinc-950">
      <Header user={user} onSignOut={onSignOut} />
      <Navigation user={user} />

      <motion.div 
        className="flex-1 w-full max-w-[1000px] mx-auto px-12 py-8 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        <div className="space-y-8 text-left">
          
          {/* Section: Metrics Row (3 Columns Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Card 1: Completion Rate */}
            <div className="border border-zinc-200 rounded-[8px] p-5 bg-white select-none shadow-sm">
              <span className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase block mb-1">
                Completion Rate
              </span>
              <div className="text-[32px] font-normal text-zinc-900 leading-none py-1 font-sans">
                {completionRate}%
              </div>
              <span className="text-[12px] text-zinc-450 mt-1 block">
                {completedCount} of {totalCount} tasks finished
              </span>
            </div>

            {/* Card 2: Weekly Velocity */}
            <div className="border border-zinc-200 rounded-[8px] p-5 bg-white select-none shadow-sm">
              <span className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase block mb-1">
                Weekly Velocity
              </span>
              <div className="text-[32px] font-normal text-zinc-900 leading-none py-1 font-sans">
                {completedThisWeekCount}
              </div>
              <span className="text-[12px] text-zinc-450 mt-1 block">
                {completedThisWeekCount} {completedThisWeekCount === 1 ? "task" : "tasks"} completed in the last 7 days
              </span>
            </div>

            {/* Card 3: Streak Status */}
            <div className="border border-zinc-200 rounded-[8px] p-5 bg-white select-none shadow-sm">
              <span className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase block mb-1">
                Streak Status
              </span>
              <div className="text-[32px] font-normal text-zinc-900 leading-none py-1 font-sans">
                {streak} {streak === 1 ? "day" : "days"}
              </div>
              <span className="text-[12px] text-zinc-450 mt-1 block">
                Maintain your daily streak
              </span>
            </div>

          </div>

          {/* Section: Priority Breakdown Chart */}
          <div className="border border-zinc-200 rounded-[8px] p-6 bg-white shadow-sm">
            <h3 className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase mb-5 select-none">
              Priority Breakdown
            </h3>
            
            <div className="space-y-4">
              
              {/* Row 1: High */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px] text-zinc-700 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span>High Priority</span>
                  </div>
                  <span className="font-mono text-xs text-zinc-450">
                    {highStats.completed} / {highStats.total} completed ({highStats.rate}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#EF4444] rounded-full transition-all duration-[600ms] ease-out-quad"
                    style={{ width: `${highStats.rate}%` }}
                  />
                </div>
              </div>

              {/* Row 2: Medium */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px] text-zinc-700 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                    <span>Medium Priority</span>
                  </div>
                  <span className="font-mono text-xs text-zinc-450">
                    {medStats.completed} / {medStats.total} completed ({medStats.rate}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#F97316] rounded-full transition-all duration-[600ms] ease-out-quad"
                    style={{ width: `${medStats.rate}%` }}
                  />
                </div>
              </div>

              {/* Row 3: Low */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px] text-zinc-700 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                    <span>Low Priority</span>
                  </div>
                  <span className="font-mono text-xs text-zinc-450">
                    {lowStats.completed} / {lowStats.total} completed ({lowStats.rate}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#10B981] rounded-full transition-all duration-[600ms] ease-out-quad"
                    style={{ width: `${lowStats.rate}%` }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Section: Gamification Progress & Badges */}
          <div className="border border-zinc-200 rounded-[8px] p-6 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-6 select-none">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-zinc-500" />
                <h3 className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase">
                  MILESTONES & BADGES
                </h3>
              </div>
              <span className="text-[12px] text-zinc-500 font-medium">
                {badges.filter(b => b.unlocked).length} of {badges.length} Unlocked
              </span>
            </div>

            {/* Overall Gamification Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 border-b border-zinc-150/40 pb-6">
              <div className="flex items-center gap-3 bg-zinc-50/40 rounded-[6px] p-4 border border-zinc-150">
                <div className="p-2 bg-emerald-50 rounded-full border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <div className="text-[18px] font-medium text-zinc-900 leading-tight">
                    {onTimeCount} / {completedCount}
                  </div>
                  <div className="text-[12px] text-zinc-500">
                    On-time completions ({onTimeRate}% Punctuality)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-zinc-50/40 rounded-[6px] p-4 border border-zinc-150">
                <div className="p-2 bg-purple-50 rounded-full border border-purple-100">
                  <Flame className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <div className="text-[18px] font-medium text-zinc-900 leading-tight">
                    {onTimeStreak} {onTimeStreak === 1 ? "day" : "days"}
                  </div>
                  <div className="text-[12px] text-zinc-500">
                    Current on-time completion streak
                  </div>
                </div>
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge) => {
                const IconComponent = badge.icon;
                const percentage = Math.min(Math.round((badge.current / badge.target) * 100), 100);

                return (
                  <div 
                    key={badge.id}
                    className={`border rounded-[8px] p-4 flex flex-col justify-between transition-all duration-350 relative overflow-hidden ${
                      badge.unlocked 
                        ? `${badge.bgColor.split(" ")[0]} border-zinc-250 shadow-sm translate-y-0 opacity-100` 
                        : "bg-zinc-50/20 border-zinc-150 opacity-60"
                    }`}
                  >
                    {/* Corner shine for unlocked badges */}
                    {badge.unlocked && (
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-tr from-transparent via-white/10 to-white/40 rotate-45 pointer-events-none" />
                    )}

                    <div className="flex items-start gap-3 text-left">
                      <div className={`p-2.5 rounded-[6px] border shrink-0 transition-transform ${
                        badge.unlocked 
                          ? `${badge.bgColor.split(" ")[2]} ${badge.bgColor.split(" ")[0]} ${badge.bgColor.split(" ")[1]} scale-105` 
                          : "bg-zinc-100 border-zinc-200 text-zinc-400"
                      }`}>
                        {badge.unlocked ? (
                          <IconComponent className="w-5 h-5" />
                        ) : (
                          <Lock className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className={`text-[14px] font-medium leading-tight ${
                          badge.unlocked ? "text-zinc-900" : "text-zinc-400"
                        }`}>
                          {badge.name}
                        </h4>
                        <p className="text-[11px] text-zinc-450 leading-normal">
                          {badge.description}
                        </p>
                      </div>
                    </div>

                    {/* Progress tracking */}
                    <div className="mt-4 pt-3 border-t border-zinc-150/40 space-y-1.5 text-left">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-450">
                        <span>Progress</span>
                        <span>{badge.current} / {badge.target}</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            badge.unlocked ? badge.bgFill : "bg-zinc-300"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: AI Insight Card */}
          <div className="border border-zinc-200 rounded-[8px] p-6 bg-zinc-50/50 shadow-sm relative overflow-hidden">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150 mb-4 select-none">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zinc-500" />
                <span className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase">
                  AI INSIGHTS
                </span>
              </div>
              <button
                onClick={() => fetchInsightData(true)}
                disabled={loadingInsight || tasks.length === 0}
                className="text-zinc-400 hover:text-zinc-800 disabled:opacity-30 cursor-pointer p-1 rounded-full transition-all"
                title="Refresh Insight"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingInsight ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loadingInsight ? (
              /* Skeletal pulse loading placeholder */
              <div className="space-y-2 py-1 animate-pulse">
                <div className="h-3 w-5/6 bg-zinc-200 rounded" />
                <div className="h-3 w-3/4 bg-zinc-200 rounded" />
              </div>
            ) : (
              /* Inside plain text tip from Gemini */
              <div className="text-[14px] text-zinc-750 font-sans leading-relaxed tracking-wide">
                {insight || "No active insights. Tackle your tasks and build up a streak!"}
              </div>
            )}

          </div>

        </div>
      </motion.div>
    </div>
  );
}
