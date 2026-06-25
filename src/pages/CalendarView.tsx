import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Task } from "../lib/gemini";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import { usePath } from "../lib/router";
import { motion } from "motion/react";

interface CalendarViewProps {
  user: User;
  onSignOut: () => void;
}

export default function CalendarView({ user, onSignOut }: CalendarViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { navigate } = usePath();

  // Selected date state. Default to today's date
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Let's check if there is an active date, otherwise fallback to current date
    return new Date();
  });

  // Current viewed month date state
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    return new Date();
  });

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

  // Calendar Date calculations
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper formatting pad zero
  const pad = (num: number) => String(num).padStart(2, "0");

  const formatDateStr = (y: number, m: number, d: number) => {
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  };

  const getDayTasks = (cellDate: Date) => {
    const formattedStr = formatDateStr(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
    return tasks.filter(t => t.deadline === formattedStr);
  };

  // Build the calendar days grid
  const daysGrid = [];
  
  // Total days in current viewed month
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  
  // day of week for 1st of month (0 = Sun, 1 = Mon...)
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  
  // Align week to start on Monday (0 = Mon, 1 = Tue, ..., 6 = Sun)
  const prefixDaysCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // 1. Previous month trailing days
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  for (let i = prefixDaysCount - 1; i >= 0; i--) {
    const dayVal = prevMonthLastDate - i;
    daysGrid.push({
      date: new Date(prevYear, prevMonth, dayVal),
      dayNumber: dayVal,
      isCurrentMonth: false
    });
  }

  // 2. Current month days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    daysGrid.push({
      date: new Date(year, month, i),
      dayNumber: i,
      isCurrentMonth: true
    });
  }

  // 3. Next month leading days to complete full rows (of 7 cells)
  const totalCellsSoFar = daysGrid.length;
  const suffixDaysCount = (7 - (totalCellsSoFar % 7)) % 7;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  for (let i = 1; i <= suffixDaysCount; i++) {
    daysGrid.push({
      date: new Date(nextYear, nextMonth, i),
      dayNumber: i,
      isCurrentMonth: false
    });
  }

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const selectedDateStr = formatDateStr(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const selectedDayTasks = tasks.filter(t => t.deadline === selectedDateStr);

  const formattedSelectedTitle = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  const handleAddTaskRedirect = () => {
    localStorage.setItem("stride_prefilled_deadline", selectedDateStr);
    navigate("/dashboard");
  };

  // Render weekday labels row
  const weekdayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans selection:bg-zinc-200 selection:text-zinc-950">
      <Header user={user} onSignOut={onSignOut} />
      <Navigation user={user} />

      <motion.div 
        className="flex-1 max-w-[1280px] w-full mx-auto px-12 py-8 flex flex-col lg:flex-row gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {/* Left Side: Calendar Grid Area */}
        <div className="flex-1 flex flex-col text-left">
          
          {/* Header row */}
          <div className="flex items-center justify-between padding-0-0-16-0 pb-4 select-none mb-4">
            <h2 className="text-[18px] font-normal text-zinc-900">
              {monthNames[month]} <span className="text-zinc-400 font-sans font-normal">{year}</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="text-[13px] text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-[4px] py-1 px-3 transition-colors duration-120 cursor-pointer"
              >
                &larr; Prev
              </button>
              <button
                onClick={handleToday}
                className="text-[13px] text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-[4px] py-1 px-3 transition-colors duration-120 cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="text-[13px] text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-[4px] py-1 px-3 transition-colors duration-120 cursor-pointer"
              >
                Next &rarr;
              </button>
            </div>
          </div>

          {/* Weekday Labels row */}
          <div className="grid grid-cols-7 border-b border-zinc-200 mb-1 select-none">
            {weekdayLabels.map((lbl, idx) => (
              <div 
                key={idx} 
                className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-center py-2"
              >
                {lbl}
              </div>
            ))}
          </div>

          {/* Grid responsive container (horizontal scroll on mobile) */}
          <div className="overflow-x-auto custom-scrollbar">
            <div className="grid grid-cols-7 min-w-[700px] border-t border-l border-zinc-100 bg-zinc-200/20">
              {daysGrid.map((dayCell, index) => {
                const cellTasks = getDayTasks(dayCell.date);
                
                // Checks
                const isCellToday = formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) === 
                                    formatDateStr(dayCell.date.getFullYear(), dayCell.date.getMonth(), dayCell.date.getDate());
                
                const isCellSelected = formatDateStr(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()) === 
                                       formatDateStr(dayCell.date.getFullYear(), dayCell.date.getMonth(), dayCell.date.getDate());

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(dayCell.date)}
                    className={`min-h-[85px] p-2 flex flex-col justify-between border-r border-b border-zinc-200/80 cursor-pointer transition-colors duration-120 hover:bg-zinc-50 relative ${
                      isCellSelected
                        ? "ring-1 ring-inset ring-zinc-900 bg-zinc-50/50 z-10"
                        : ""
                    } ${
                      !dayCell.isCurrentMonth
                        ? "bg-zinc-50 text-zinc-400"
                        : "bg-white text-zinc-900"
                    }`}
                  >
                    {/* Day number cell badge */}
                    <div className="mb-1 text-left">
                      {isCellToday ? (
                        <span className="w-5 h-5 bg-zinc-900 text-white rounded-[4px] inline-flex items-center justify-center text-[12px] font-mono font-medium">
                          {dayCell.dayNumber}
                        </span>
                      ) : (
                        <span className="text-[12px] font-mono text-zinc-450">
                          {dayCell.dayNumber}
                        </span>
                      )}
                    </div>

                    {/* Task capsules */}
                    <div className="flex flex-col gap-0.5 select-none overflow-hidden max-w-full">
                      {cellTasks.slice(0, 3).map((task) => {
                        const isHigh = task.priority === "high";
                        const isMedium = task.priority === "medium";
                        
                        let pillStyles = "bg-emerald-50 text-emerald-700 border-emerald-100";
                        if (isHigh) {
                          pillStyles = "bg-red-50 text-red-700 border-red-100";
                        } else if (isMedium) {
                          pillStyles = "bg-orange-50 text-orange-700 border-orange-100";
                        }

                        return (
                          <div
                            key={task.id}
                            className={`rounded-[3px] py-0.5 px-1.5 text-[11px] border leading-none truncate max-w-full font-sans ${pillStyles}`}
                            title={task.name}
                          >
                            {task.name}
                          </div>
                        );
                      })}
                      {cellTasks.length > 3 && (
                        <div className="text-[11px] text-zinc-400 font-medium pl-1 mt-0.5 font-mono">
                          +{cellTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Side: Date Detail Panel */}
        <div className="w-full lg:w-[280px] shrink-0 border border-zinc-200 rounded-[8px] flex flex-col bg-white overflow-hidden text-left h-fit self-start">
          
          {/* Header */}
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/50">
            <h3 className="text-[15px] font-medium text-zinc-900 leading-normal">
              {formattedSelectedTitle}
            </h3>
          </div>

          {/* Tasks Detail Container */}
          <div className="flex-1 max-h-[400px] overflow-y-auto custom-scrollbar">
            {selectedDayTasks.length === 0 ? (
              <p className="text-[13px] text-zinc-400 p-4 font-light text-center">
                No tasks on this day
              </p>
            ) : (
              <div className="flex flex-col">
                {selectedDayTasks.map((t) => {
                  const isHigh = t.priority === "high";
                  const isMedium = t.priority === "medium";

                  let priorityTextStyles = "text-emerald-700 bg-emerald-50 border-emerald-100";
                  if (isHigh) {
                    priorityTextStyles = "text-red-700 bg-red-50 border-red-100";
                  } else if (isMedium) {
                    priorityTextStyles = "text-orange-700 bg-orange-50 border-orange-100";
                  }

                  return (
                    <div 
                      key={t.id} 
                      className="p-4 border-b border-zinc-100 last:border-b-0 flex flex-col gap-1 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={`text-[14px] font-medium block leading-tight ${t.completed ? "line-through text-zinc-400" : "text-zinc-900"}`}>
                          {t.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.25 font-semibold rounded-[4px] border uppercase shrink-0 ${priorityTextStyles}`}>
                          {t.priority}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-[12px] text-zinc-450 leading-relaxed font-light mt-0.5">
                          {t.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom redirection */}
          <div className="p-4 border-t border-zinc-150 bg-zinc-50/50">
            <button
              onClick={handleAddTaskRedirect}
              className="w-full border border-zinc-200 bg-white hover:bg-zinc-50 rounded-[6px] text-[13px] text-zinc-800 font-medium py-2.5 px-3 transition-colors text-center cursor-pointer select-none shadow-sm"
            >
              Add task on this date
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
