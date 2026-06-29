import React, { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Task, AIAnalysisResult } from "../lib/gemini";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import TaskInput from "../components/TaskInput";
import TaskList from "../components/TaskList";
import BrainDump from "../components/BrainDump";
import { logActivity } from "../lib/activity";
import RightPanelWidgets from "../components/RightPanelWidgets";
import SmartNudgeBanner from "../components/SmartNudgeBanner";
import { getLocalDateString } from "../lib/productivity";
import { getStatus } from "../lib/calendar";
import confetti from "canvas-confetti";
import OverwhelmModal from "../components/OverwhelmModal";

interface DashboardProps {
  user: User;
  onSignOut: () => void;
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [fetchingTasks, setFetchingTasks] = useState(true);

  // States for Feature 3 & Feature 5
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [externalAlert, setExternalAlert] = useState<string | null>(null);
  const [rebalanceLoading, setRebalanceLoading] = useState(false);
  const [rebalanceSuggestion, setRebalanceSuggestion] = useState<{
    date: string;
    move_task: string;
    move_to: string;
    reason: string;
  } | null>(null);

  const [isOverwhelmedOpen, setIsOverwhelmedOpen] = useState(false);

  // Ref to track prevTasks for changes
  const prevTasksRef = useRef<Task[]>([]);

  // 1. Real-time Firestore sync for the authenticated user
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid)
    );

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
          createdAt: data.createdAt,
          completedAt: data.completedAt,
          deadline_changes: data.deadline_changes || 0,
          original_deadline: data.original_deadline || data.deadline || ""
        });
      });
      
      setTasks(taskList);
      setFetchingTasks(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "tasks");
      setFetchingTasks(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Helper to show a bottom-right auto-dismissing toast
  const triggerToast = (message: string) => {
    setToastMessage(message);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  };

  // Run the Automatic Rescheduler logic on triggers
  const runAutoReschedule = async (triggerDescription: string) => {
    try {
      const activeTasks = tasks.filter(t => !t.completed);
      const todayString = getLocalDateString();

      const res = await fetch("/api/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: activeTasks.map(t => ({
            name: t.name,
            deadline: t.deadline,
            priority: t.priority,
            description: t.description || ""
          })),
          today: todayString,
          triggerDescription
        })
      });

      if (!res.ok) {
        throw new Error("Reschedule API failed");
      }

      const data = await res.json();
      
      // Map returned schedule format back to standard AIAnalysisResult format
      if (data) {
        let mappedDoNow = { task_name: "", reason: "" };
        if (typeof data.do_now === "string") {
          mappedDoNow = {
            task_name: data.do_now,
            reason: data.reason || ""
          };
        } else if (data.do_now && typeof data.do_now === "object") {
          mappedDoNow = {
            task_name: data.do_now.task_name || "",
            reason: data.do_now.reason || data.reason || ""
          };
        }

        const mappedAnalysis: AIAnalysisResult = {
          prioritized_tasks: analysisResult?.prioritized_tasks || [],
          do_now: mappedDoNow,
          schedule: (data.schedule || []).map((s: any) => ({
            time: s.time || "",
            task_name: s.task || "",
            activity_type: s.duration || ""
          }))
        };

        setAnalysisResult(mappedAnalysis);
        logActivity("schedule", "Auto-Rescheduler updated timeline on task changes");

        // Toast update if rescheduled list not empty
        if (data.rescheduled && data.rescheduled.length > 0) {
          triggerToast(`↑ Schedule updated — ${data.rescheduled[0]} moved up`);
          logActivity("schedule", `Schedule updated — ${data.rescheduled[0]} moved up`);
        }

        // Warning banner slot override
        if (data.alert) {
          setExternalAlert(data.alert);
        } else {
          setExternalAlert(null);
        }
      }
    } catch (err: any) {
      console.error("Auto rescheduling agent failed:", err);
    }
  };

  // Watch for task mutation triggers (Feature 3 Integration)
  useEffect(() => {
    if (fetchingTasks) return;

    if (tasks.length === 0) {
      prevTasksRef.current = [];
      return;
    }

    const prevTasks = prevTasksRef.current;
    if (!prevTasks || prevTasks.length === 0) {
      // Just initialize state on first snapshot sync
      prevTasksRef.current = tasks;
      return;
    }

    // Detect complete toggle
    const completedTask = tasks.find(
      t => t.completed && !prevTasks.find(pt => pt.id === t.id)?.completed
    );

    // Detect deadline change
    const deadlineChangedTask = tasks.find(
      t => {
        const pt = prevTasks.find(p => p.id === t.id);
        return pt && pt.deadline !== t.deadline;
      }
    );

    // Detect new HIGH priority task
    const newHighTask = tasks.find(
      t => !prevTasks.find(pt => pt.id === t.id) && String(t.priority).toLowerCase() === "high"
    );

    let triggerText = "";
    if (completedTask) {
      triggerText = `Completed task: ${completedTask.name}`;
      logActivity("completed", `Completed "${completedTask.name}"`);
    } else if (deadlineChangedTask) {
      triggerText = `Changed deadline of ${deadlineChangedTask.name} to ${deadlineChangedTask.deadline}`;
      logActivity("schedule", `Changed deadline of "${deadlineChangedTask.name}" to ${deadlineChangedTask.deadline}`);
    } else if (newHighTask) {
      triggerText = `Added new high priority task: ${newHighTask.name}`;
      logActivity("added", `Added high priority task: "${newHighTask.name}"`);
    } else {
      const newlyAddedTask = tasks.find(t => !prevTasks.find(pt => pt.id === t.id));
      if (newlyAddedTask) {
        logActivity("added", `Added task: "${newlyAddedTask.name}"`);
      }
    }

    const deletedTask = prevTasks.find(pt => !tasks.find(t => t.id === pt.id));
    let hasTaskChanges = false;
    if (deletedTask) {
      logActivity("warning", `Deleted task: "${deletedTask.name}"`);
      hasTaskChanges = true;
    }

    if (completedTask || deadlineChangedTask || newHighTask || deletedTask) {
      hasTaskChanges = true;
    } else {
      const anyTaskEdited = tasks.some(t => {
        const pt = prevTasks.find(p => p.id === t.id);
        return pt && (
          pt.name !== t.name || 
          pt.description !== t.description || 
          pt.completed !== t.completed || 
          pt.priority !== t.priority
        );
      });
      if (anyTaskEdited) {
        hasTaskChanges = true;
      }
    }

    // Always update tracking ref
    prevTasksRef.current = tasks;

    let rescheduleTimeout: NodeJS.Timeout | null = null;
    if (triggerText) {
      rescheduleTimeout = setTimeout(() => {
        runAutoReschedule(triggerText);
      }, 800);
    }

    let calendarSyncTimeout: NodeJS.Timeout | null = null;
    if (hasTaskChanges) {
      calendarSyncTimeout = setTimeout(async () => {
        try {
          const status = await getStatus(user.uid);
          if (status && status.connected) {
            console.log("Triggering debounced calendar sync on task update...");
            await fetch("/api/calendar/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uid: user.uid })
            });
          }
        } catch (err) {
          console.warn("Silent background calendar auto-sync failed:", err);
        }
      }, 1500);
    }

    return () => {
      if (rescheduleTimeout) clearTimeout(rescheduleTimeout);
      if (calendarSyncTimeout) clearTimeout(calendarSyncTimeout);
    };
  }, [tasks, fetchingTasks, user.uid]);

  // 2. Add Task Action
  const handleAddTask = async (taskData: Omit<Task, 'id' | 'completed'>) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, "tasks"), {
        ...taskData,
        completed: false,
        userId: user.uid,
        createdAt: Date.now(),
        deadline_changes: 0,
        original_deadline: taskData.deadline || ""
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "tasks");
      throw e;
    }
  };

  // Bulk add tasks extracted via BrainDump
  const handleAddMultipleTasks = async (newTasks: Omit<Task, 'id' | 'completed'>[]) => {
    if (!user) return;
    try {
      for (const t of newTasks) {
        await addDoc(collection(db, "tasks"), {
          ...t,
          completed: false,
          userId: user.uid,
          createdAt: Date.now(),
          deadline_changes: 0,
          original_deadline: t.deadline || ""
        });
      }
      logActivity("braindump", `Extracted and synchronized ${newTasks.length} tasks via Brain Dump`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "tasks");
    }
  };

  // 3. Toggle Complete Action
  const handleToggleComplete = async (taskId: string, currentCompleted: boolean) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      const isCompleting = !currentCompleted;
      await updateDoc(taskRef, {
        completed: isCompleting,
        completedAt: isCompleting ? getLocalDateString() : null
      });

      if (isCompleting) {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.priority === "high") {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, scalar: 0.9 });
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  // Deadline manual picker update
  const handleUpdateDeadline = async (taskId: string, newDeadline: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.deadline === newDeadline) return;

    try {
      const taskRef = doc(db, "tasks", taskId);
      const changesCount = (task.deadline_changes || 0) + 1;
      const originalDeadline = task.original_deadline || task.deadline || "";

      await updateDoc(taskRef, {
        deadline: newDeadline,
        deadline_changes: changesCount,
        original_deadline: originalDeadline
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  // 4. Delete Action
  const handleDeleteTask = async (taskId: string) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await deleteDoc(taskRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  // Ask AI for Rebalance Recommendation
  const handleAskRebalance = async (date: string, tasksOnDate: Task[]) => {
    try {
      setRebalanceLoading(true);
      const activeTasks = tasks.filter(t => !t.completed);
      const response = await fetch("/api/rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          tasksOnDate: tasksOnDate.map(t => t.name).join(", "),
          allTasks: activeTasks.map(t => ({ name: t.name, deadline: t.deadline, priority: t.priority }))
        })
      });

      if (!response.ok) {
        throw new Error("Rebalance request failed");
      }

      const data = await response.json();
      if (data && data.move_task && data.move_to) {
        setRebalanceSuggestion({
          date,
          move_task: data.move_task,
          move_to: data.move_to,
          reason: data.reason || ""
        });
      }
    } catch (error) {
      console.error("Overload rebalance analysis failed:", error);
    } finally {
      setRebalanceLoading(false);
    }
  };

  const handleAcceptRebalance = async () => {
    if (!rebalanceSuggestion) return;
    const taskToMove = tasks.find(
      t => !t.completed && t.name.toLowerCase() === rebalanceSuggestion.move_task.toLowerCase()
    );

    if (taskToMove && taskToMove.id) {
      await handleUpdateDeadline(taskToMove.id, rebalanceSuggestion.move_to);
    }
    setRebalanceSuggestion(null);
  };

  const handleDismissRebalance = () => {
    setRebalanceSuggestion(null);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans selection:bg-zinc-200 selection:text-zinc-950 relative">
      
      {/* Target Nav Setup */}
      <Header user={user} onSignOut={onSignOut} />
      <Navigation user={user} />

      {/* Main Column Grid (2-column layout) */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 lg:px-12 py-8 flex flex-col gap-6">
        
        {/* Widget 6: Smart Nudge Banner (Full-width, above core columns) */}
        <SmartNudgeBanner tasks={tasks} />

        <div className="flex justify-end w-full mb-[-12px]">
          <button
            onClick={() => setIsOverwhelmedOpen(true)}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[12px] font-medium py-1.5 px-3 rounded-[6px] transition-colors"
          >
            🚨 I&apos;m Overwhelmed
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 w-full items-start">
          
          {/* Main task area: flex-grow */}
          <div className="flex-grow min-w-0 flex flex-col gap-6">
            
            {/* Feature 1: Brain Dump Task Extractor */}
            <BrainDump onAddTasks={handleAddMultipleTasks} />

            {/* Create Task Form */}
            <TaskInput onAddTask={handleAddTask} />
            
            {/* Task List */}
            <div>
              {fetchingTasks ? (
                <div className="flex flex-col items-center justify-center py-20 text-center select-none">
                  <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 animate-spin rounded-full"></div>
                  <p className="text-[12px] font-mono text-zinc-400 uppercase tracking-widest mt-4 animate-pulse">
                    Syncing Workspace Database...
                  </p>
                </div>
              ) : (
                <TaskList 
                  tasks={tasks}
                  onToggleTask={handleToggleComplete}
                  onDeleteTask={handleDeleteTask}
                  onUpdateDeadline={handleUpdateDeadline}
                  onAskRebalance={handleAskRebalance}
                  rebalanceSuggestion={rebalanceSuggestion}
                  onAcceptRebalance={handleAcceptRebalance}
                  onDismissRebalance={handleDismissRebalance}
                  rebalanceLoading={rebalanceLoading}
                />
              )}
            </div>

          </div>

          {/* Productivity & Status Widgets */}
          <div className="w-full lg:w-[340px] lg:shrink-0 lg:sticky lg:top-20 pl-0 lg:pl-8 lg:border-l border-zinc-200">
            <RightPanelWidgets 
              tasks={tasks}
              scheduleFromAi={analysisResult?.schedule || null}
              userId={user.uid}
            />
          </div>

        </div>

      </main>

      {/* Slide-in elegant bottom-right Toast notification (Feature 3 integration) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-white border border-zinc-200 shadow-md py-2.5 px-4 rounded-[6px] text-zinc-900 text-[13px] font-medium z-50 transition-all duration-150 select-none animate-pulse">
          {toastMessage}
        </div>
      )}

      <OverwhelmModal
        isOpen={isOverwhelmedOpen}
        onClose={() => setIsOverwhelmedOpen(false)}
        tasks={tasks}
        onUpdateDeadline={handleUpdateDeadline}
      />

    </div>
  );
}
