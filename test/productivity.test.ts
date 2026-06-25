import { describe, it, expect } from "vitest";
import { calculateStreak, calculateScore, getLocalDateString, isOnTime, calculateOnTimeStreak } from "../src/lib/productivity";
import { extractJson } from "../server";
import { Task } from "../src/lib/gemini";

describe("Productivity Helpers", () => {
  describe("isOnTime", () => {
    it("should return false for uncompleted tasks", () => {
      const task: Task = { name: "T1", deadline: "2026-06-25", priority: "medium", description: "", completed: false };
      expect(isOnTime(task)).toBe(false);
    });

    it("should return true for legacy completed tasks without completedAt", () => {
      const task: Task = { name: "T1", deadline: "2026-06-25", priority: "medium", description: "", completed: true };
      expect(isOnTime(task)).toBe(true);
    });

    it("should return true for tasks completed on or before deadline", () => {
      const task1: Task = { name: "T1", deadline: "2026-06-25", priority: "medium", description: "", completed: true, completedAt: "2026-06-24" };
      const task2: Task = { name: "T2", deadline: "2026-06-25", priority: "medium", description: "", completed: true, completedAt: "2026-06-25" };
      expect(isOnTime(task1)).toBe(true);
      expect(isOnTime(task2)).toBe(true);
    });

    it("should return false for tasks completed after deadline", () => {
      const task: Task = { name: "T1", deadline: "2026-06-23", priority: "medium", description: "", completed: true, completedAt: "2026-06-24" };
      expect(isOnTime(task)).toBe(false);
    });
  });

  describe("calculateOnTimeStreak", () => {
    it("should return consecutive days of on-time task completions", () => {
      const tasks: Task[] = [
        { name: "T1", deadline: "2026-06-24", priority: "medium", description: "", completed: true, completedAt: "2026-06-24" },
        { name: "T2", deadline: "2026-06-23", priority: "medium", description: "", completed: true, completedAt: "2026-06-23" },
        { name: "T3", deadline: "2026-06-22", priority: "medium", description: "", completed: true, completedAt: "2026-06-22" },
      ];
      expect(calculateOnTimeStreak(tasks, "2026-06-24")).toBe(3);
    });
  });
  describe("getLocalDateString", () => {
    it("should format dates correctly as YYYY-MM-DD", () => {
      const d = new Date(2026, 5, 24); // June 24, 2026
      expect(getLocalDateString(d)).toBe("2026-06-24");
    });
  });

  describe("calculateStreak", () => {
    it("should return 0 when streak map is empty", () => {
      expect(calculateStreak({}, "2026-06-24")).toBe(0);
      expect(calculateStreak(null, "2026-06-24")).toBe(0);
    });

    it("should calculate consecutive completed days ending today", () => {
      const streakMap = {
        "2026-06-24": true,
        "2026-06-23": true,
        "2026-06-22": true,
        "2026-06-20": true, // gap on 21st
      };
      expect(calculateStreak(streakMap, "2026-06-24")).toBe(3);
    });

    it("should calculate consecutive completed days ending yesterday", () => {
      const streakMap = {
        "2026-06-23": true,
        "2026-06-22": true,
        "2026-06-21": true,
      };
      // Today is 24th, not completed, but streak maintained from yesterday
      expect(calculateStreak(streakMap, "2026-06-24")).toBe(3);
    });

    it("should break streak if gap is 2 or more days", () => {
      const streakMap = {
        "2026-06-22": true,
        "2026-06-21": true,
      };
      // Today is 24th (not completed), yesterday is 23rd (not completed), so streak is broken
      expect(calculateStreak(streakMap, "2026-06-24")).toBe(0);
    });
  });

  describe("calculateScore", () => {
    const todayStr = "2026-06-24";

    it("should award 15 points per completed task up to 45", () => {
      const tasks: Task[] = [
        { id: "1", name: "T1", completed: true, deadline: "2026-06-25", priority: "medium", description: "" },
        { id: "2", name: "T2", completed: true, deadline: "2026-06-25", priority: "medium", description: "" },
        { id: "3", name: "T3", completed: true, deadline: "2026-06-25", priority: "medium", description: "" },
        { id: "4", name: "T4", completed: true, deadline: "2026-06-25", priority: "medium", description: "" }, // 4th task shouldn't exceed completion points cap of 45
      ];
      // Completed points: min(4 * 15, 45) = 45
      // High points: 0
      // Streak bonus: 0
      expect(calculateScore(tasks, 0, todayStr)).toBe(45);
    });

    it("should award 20 points per high priority task completed on/before deadline up to 40", () => {
      const tasks: Task[] = [
        { id: "1", name: "High on track", completed: true, deadline: "2026-06-24", priority: "high", description: "" }, // on deadline
        { id: "2", name: "High early", completed: true, deadline: "2026-06-25", priority: "high", description: "" }, // before deadline
        { id: "3", name: "High late", completed: true, deadline: "2026-06-23", priority: "high", description: "" }, // late (not awarded)
      ];
      // Completed points: min(3 * 15, 45) = 45
      // High points: min(2 * 20, 40) = 40
      // Streak: 0
      // Total: 45 + 40 = 85
      expect(calculateScore(tasks, 0, todayStr)).toBe(85);
    });

    it("should add streak days as bonus points up to 15", () => {
      const tasks: Task[] = [
        { id: "1", name: "T1", completed: true, deadline: "2026-06-25", priority: "medium", description: "" },
      ];
      // Completed points: 15
      // Streak bonus: 10
      expect(calculateScore(tasks, 10, todayStr)).toBe(25);

      // Streak bonus cap at 15
      expect(calculateScore(tasks, 20, todayStr)).toBe(30);
    });

    it("should cap overall productivity score at 100", () => {
      const tasks: Task[] = [
        { id: "1", name: "H1", completed: true, deadline: "2026-06-25", priority: "high", description: "" },
        { id: "2", name: "H2", completed: true, deadline: "2026-06-25", priority: "high", description: "" },
        { id: "3", name: "H3", completed: true, deadline: "2026-06-25", priority: "high", description: "" },
        { id: "4", name: "H4", completed: true, deadline: "2026-06-25", priority: "high", description: "" },
      ];
      // Completed points: min(4 * 15, 45) = 45
      // High points: min(4 * 20, 40) = 40
      // Streak bonus: 20 -> min(20, 15) = 15
      // Sum: 45 + 40 + 15 = 100
      expect(calculateScore(tasks, 20, todayStr)).toBe(100);
    });
  });
});

describe("JSON Extraction Helper", () => {
  it("should extract simple JSON objects", () => {
    const raw = `Some conversational text before {"hello": "world"} conversational text after`;
    expect(extractJson(raw)).toEqual({ hello: "world" });
  });

  it("should handle markdown code blocks wrapper", () => {
    const raw = `
Here is the result:
\`\`\`json
{
  "tasks": ["wash dishes"]
}
\`\`\`
hope that helps!
`;
    expect(extractJson(raw)).toEqual({ tasks: ["wash dishes"] });
  });

  it("should support array structures", () => {
    const raw = `
\`\`\`
[
  {"name": "test"}
]
\`\`\`
`;
    expect(extractJson(raw)).toEqual([{ name: "test" }]);
  });

  it("should throw standard informative error on empty or invalid non-JSON output", () => {
    expect(() => extractJson("")).toThrow("Empty or non-string response received from AI model.");
    expect(() => extractJson("Not JSON at all")).toThrow("Failed to extract valid JSON");
  });
});
