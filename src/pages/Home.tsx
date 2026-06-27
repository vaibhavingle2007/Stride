import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

interface HomeProps {
  onSignedIn: () => void;
}

export default function Home({ onSignedIn }: HomeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      await signInWithPopup(auth, googleProvider);
      onSignedIn();
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      if (err?.code === "auth/popup-blocked") {
        setError("Sign-in popup blocked by browser. Please enable popups or adjust privacy settings.");
      } else if (err?.code === "auth/operation-not-allowed" || err?.code === "auth/configuration-not-found") {
        setError("Google Auth is not fully configured yet. Please configure the Authorized Domain in your Firebase Console.");
      } else {
        setError(err?.message || "Failed to authenticate with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans flex flex-col justify-between selection:bg-zinc-200">
      
      {/* NAVBAR */}
      <header className="h-[52px] border-b border-zinc-200 bg-white sticky top-0 z-50 transition-all duration-150">
        <div className="max-w-[1280px] mx-auto h-full px-12 flex items-center justify-between">
          <div className="text-[15px] font-medium text-zinc-900">
            Stride
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="text-[13px] text-zinc-500 hover:text-zinc-900 transition-colors duration-100 cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="bg-zinc-900 hover:bg-zinc-800 text-white text-[13px] font-medium h-[32px] px-3.5 rounded-[6px] transition-all duration-120 cursor-pointer"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-12">
        
        {/* HERO SECTION */}
        <section className="pt-24 pb-20 max-w-[680px] text-left">
          
          {/* Eyebrow Label */}
          <div className="text-[11px] font-bold text-zinc-450 uppercase tracking-widest mb-4">
            AI-Powered Productivity · Built with AI Studio
          </div>

          {/* Headline */}
          <h1 className="text-[52px] font-light text-zinc-900 leading-[1.1] tracking-[-0.03em] mb-5">
            Stop managing tasks.<br />
            Start finishing them.
          </h1>

          {/* Subtext */}
          <p className="text-[16px] font-normal text-zinc-500 leading-[1.65] max-w-[480px] mb-7">
            Stride is your AI productivity companion that thinks ahead —
            extracting tasks from your thoughts, photos, and voice,
            then building a schedule that actually keeps you on track.
          </p>

          {/* Error Message display if any */}
          {error && (
            <div className="mb-4 text-[13px] text-zinc-650 border-l-2 border-orange-500 pl-3 py-1 font-mono">
              {error}
            </div>
          )}

          {/* CTA Row */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-[13px] h-[36px] px-[18px] rounded-[6px] transition-all duration-120 cursor-pointer"
            >
              {loading ? "Authorizing..." : "Start for free"}
            </button>
            <button
              onClick={() => {
                const element = document.getElementById("how-it-works-sec");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="bg-transparent border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-350 font-medium text-[13px] h-[36px] px-[18px] rounded-[6px] transition-all duration-120 cursor-pointer"
            >
              See how it works
            </button>
          </div>

          <div className="text-[11px] text-zinc-400 font-normal mt-3">
            Free to use · Powered by Gemini 3.5 Flash · No credit card
          </div>
        </section>

        {/* STATS ROW */}
        <section className="mb-20 text-left border-y border-zinc-200 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-[32px] font-light text-zinc-900 mb-1">13+</div>
              <div className="text-[13px] text-zinc-500">AI agents working in the background for you</div>
            </div>
            <div>
              <div className="text-[32px] font-light text-zinc-900 mb-1">3 sec</div>
              <div className="text-[13px] text-zinc-500">to extract all tasks from a photo or brain dump</div>
            </div>
            <div>
              <div className="text-[32px] font-light text-zinc-900 mb-1">0</div>
              <div className="text-[13px] text-zinc-500">deadlines missed when Stride is active</div>
            </div>
          </div>
        </section>

        {/* APP PREVIEW MOCKUP */}
        <section className="mb-20">
          <div className="border border-zinc-200 rounded-[10px] overflow-hidden bg-zinc-50">
            
            {/* Top bar */}
            <div className="h-[48px] border-b border-zinc-200 px-6 flex items-center justify-between bg-white">
              <span className="text-[13px] font-medium text-zinc-900">Dashboard</span>
              <span className="text-[12px] font-medium text-zinc-500">Vaibhav</span>
            </div>

            {/* Content row */}
            <div className="flex flex-col md:flex-row min-h-[220px]">
              
              {/* Left task list panel (70% width) */}
              <div className="flex-1 divide-y divide-zinc-200 bg-white">
                
                {/* Mock Row 1 */}
                <div className="h-[52px] px-6 flex items-center justify-between transition-colors duration-120 hover:bg-zinc-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-[14px] h-[14px] border border-zinc-300 rounded-[3px]"></div>
                    <span className="text-[14px] text-zinc-900 font-normal">Refactor database schema for client storage</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-[11px] font-medium border border-orange-200 bg-orange-50 text-orange-600 rounded-[4px]">
                      High
                    </span>
                    <span className="text-[12px] font-mono text-zinc-400">2026-06-25</span>
                  </div>
                </div>

                {/* Mock Row 2 */}
                <div className="h-[52px] px-6 flex items-center justify-between transition-colors duration-120 hover:bg-zinc-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-[14px] h-[14px] border border-zinc-300 rounded-[3px]"></div>
                    <span className="text-[14px] text-zinc-900 font-normal">Review user onboarding feedback reports</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-[11px] font-medium border border-orange-200 bg-orange-50 text-orange-600 rounded-[4px]">
                      High
                    </span>
                    <span className="text-[12px] font-mono text-zinc-400">2026-06-25</span>
                  </div>
                </div>

                {/* Mock Row 3 */}
                <div className="h-[52px] px-6 flex items-center justify-between transition-colors duration-120 hover:bg-zinc-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-[14px] h-[14px] border border-zinc-300 rounded-[3px]"></div>
                    <span className="text-[14px] text-zinc-900 font-normal">Prepare presentation deck for beta launch</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-[11px] font-medium border border-emerald-100 bg-emerald-50 text-emerald-500 rounded-[4px]">
                      Low
                    </span>
                    <span className="text-[12px] font-mono text-zinc-400">2026-06-28</span>
                  </div>
                </div>

              </div>

              {/* Right AI Analysis panel (30% width) */}
              <div className="w-full md:w-[30%] border-t md:border-t-0 md:border-l border-zinc-200 p-6 bg-zinc-50 text-left">
                <div className="text-[11px] font-semibold text-zinc-400 tracking-[0.08em] uppercase mb-4">
                  AI Analysis
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-[4px] bg-zinc-200 rounded-[2px] w-[90%]"></div>
                    <div className="h-[4px] bg-zinc-200 rounded-[2px] w-[75%]"></div>
                    <div className="h-[4px] bg-zinc-200 rounded-[2px] w-[60%]"></div>
                  </div>
                  <div className="pt-2">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">DO THIS NOW</div>
                    <div className="h-[32px] bg-zinc-200 rounded-[4px] w-full"></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works-sec" className="mb-20 text-left">
          
          {/* Label */}
          <div className="text-[11px] font-semibold tracking-[0.08em] text-zinc-400 uppercase mb-4">
            HOW IT WORKS
          </div>

          {/* Steps */}
          <div className="flex flex-col">
            
            {/* Step 1 */}
            <div className="border-t border-zinc-200 py-6 flex">
              <div className="w-[40px] font-mono text-[13px] text-zinc-400 flex-shrink-0">
                01
              </div>
              <div className="flex-1">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Dump, snap, or speak your tasks</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Type a messy thought, photograph a whiteboard,
                  or speak out loud — Stride extracts every task automatically
                  using Gemini Vision and voice recognition.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border-t border-zinc-200 py-6 flex">
              <div className="w-[40px] font-mono text-[13px] text-zinc-400 flex-shrink-0">
                02
              </div>
              <div className="flex-1">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Gemini analyzes your entire workload</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Every task gets ranked by urgency, deadline proximity,
                  and real impact — not just the order you added them.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border-t border-zinc-200 py-6 flex">
              <div className="w-[40px] font-mono text-[13px] text-zinc-400 flex-shrink-0">
                03
              </div>
              <div className="flex-1">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Your day gets planned automatically</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Stride builds time blocks around your Google Calendar
                  events, warns you about overloaded days, and tells you
                  exactly what to work on right now.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="border-t border-zinc-200 py-6 flex">
              <div className="w-[40px] font-mono text-[13px] text-zinc-400 flex-shrink-0">
                04
              </div>
              <div className="flex-1">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Agents keep you on track all day</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  The Auto-Rescheduler, Procrastination Radar, and
                  Smart Nudge work silently in the background — adapting
                  your plan every time something changes.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* FEATURES */}
        <section className="mb-24 text-left">
          <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
            
            {/* Sticky/Fixed Left (40% columns) */}
            <div className="md:col-span-4 sticky top-[76px] self-start">
              <div className="text-[11px] font-bold text-zinc-450 uppercase tracking-widest mb-2">
                EVERYTHING STRIDE DOES
              </div>
              <h2 className="text-[28px] font-normal text-zinc-900 leading-[1.25]">
                13 AI features. One calm interface.
              </h2>
            </div>

            {/* Feature descriptions Right (60% columns) */}
            <div className="md:col-span-6 flex flex-col">
              
              {/* Feature 1 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Brain Dump → Tasks</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Type everything on your mind in one messy paragraph.
                  Gemini reads it and creates structured tasks with deadlines
                  and priorities — no forms, no friction.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Snap & Plan</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Photograph a handwritten list, whiteboard, assignment
                  sheet, or timetable. Gemini Vision reads the image and
                  extracts every task automatically — even messy handwriting.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Voice Brain Dump</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Hit the mic and speak your tasks out loud. Stride
                  transcribes your voice and passes it through the same
                  AI extraction engine as Brain Dump.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Auto-Rescheduler</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  When you complete a task, change a deadline, or add
                  something new — Stride silently rebuilds your entire
                  schedule in the background. No button. No prompt.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Procrastination Radar</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Stride tracks how many times you've pushed a deadline.
                  After two delays, it flags the task and tells you why
                  it might be blocking you.
                </p>
              </div>

              {/* Feature 7 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Google Calendar Sync</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Every task syncs to your Google Calendar automatically
                  with color-coded priority and smart reminders — 4 alerts
                  for high priority, fewer for low. Two-way, real-time.
                </p>
              </div>

              {/* Feature 8 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Overload Warning</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  If three or more high-priority tasks land on the same
                  day, Stride warns you and asks Gemini which one to move —
                  then updates your calendar in one click.
                </p>
              </div>

              {/* Feature 9 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">AI Chat</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Ask Stride anything about your workload. &apos;Am I going
                  to finish before June 29?&apos; or &apos;What can I drop this week?&apos;
                  Gemini responds with full context of all your tasks.
                </p>
              </div>

              {/* Feature 10 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Productivity Score & Streak</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  A live score from 0–100 based on what you've completed
                  today, your streak, and how you handle high-priority tasks.
                  Resets daily. Builds a habit of finishing.
                </p>
              </div>

              {/* Feature 11 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Predictive Risk Assessment Engine</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Analyzes your workload to foresee missed deadlines. 
                  It alerts you proactively before you are overwhelmed.
                </p>
              </div>

              {/* Feature 12 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Visual Risk Indicators</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Highlights tasks that are at risk of being delayed with intuitive visual 
                  tags to keep your focus on what needs immediate attention.
                </p>
              </div>

              {/* Feature 13 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">AI-Powered Micro-Steps & Context</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Breaks down large, daunting tasks into bite-sized, achievable micro-steps, 
                  automatically adding necessary context and resources.
                </p>
              </div>

              {/* Feature 14 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Integrated Timer & Actions</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Stay in the zone with built-in focus timers and swift actions 
                  directly linked to your active tasks.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* THREE WAYS TO ADD TASKS */}
        <section className="mb-24 py-16">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest text-center mb-3">
            THREE WAYS TO ADD TASKS
          </div>
          <h2 className="text-[32px] font-light text-zinc-900 text-center mb-16 leading-[1.25]">
            However your mind works.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* Col 1 */}
            <div className="border-t border-zinc-200 pt-5">
              <div className="font-mono text-[13px] text-zinc-400 mb-2">01</div>
              <h4 className="text-[16px] font-medium text-zinc-900 mb-1.5">Type it</h4>
              <p className="text-[13px] text-zinc-500 leading-[1.6]">
                Open Brain Dump and write everything on your
                mind in one go. Messy, unstructured, stream of consciousness
                — Gemini figures it out.
              </p>
            </div>

            {/* Col 2 */}
            <div className="border-t border-zinc-200 pt-5">
              <div className="font-mono text-[13px] text-zinc-400 mb-2">02</div>
              <h4 className="text-[16px] font-medium text-zinc-900 mb-1.5">Snap it</h4>
              <p className="text-[13px] text-zinc-500 leading-[1.6]">
                Take a photo of your handwritten notes, a college
                timetable, or a whiteboard. Snap & Plan extracts
                every item in under 3 seconds.
              </p>
            </div>

            {/* Col 3 */}
            <div className="border-t border-zinc-200 pt-5">
              <div className="font-mono text-[13px] text-zinc-400 mb-2">03</div>
              <h4 className="text-[16px] font-medium text-zinc-900 mb-1.5">Say it</h4>
              <p className="text-[13px] text-zinc-500 leading-[1.6]">
                Hit the mic button and speak your tasks out loud.
                Stride transcribes and structures them
                the same way as everything else.
              </p>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mb-24 text-center">
          <h2 className="text-[40px] font-light text-zinc-900 mb-2">
            Your deadlines won't wait.
          </h2>
          <p className="text-[18px] font-light text-zinc-500 mb-8">
            Stride thinks ahead so you don't have to.
          </p>
          <div className="flex flex-col items-center">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-[13px] h-[44px] px-[24px] rounded-[6px] transition-all duration-120 cursor-pointer mb-3"
            >
              Start using Stride free
            </button>
            <div className="text-[11px] text-zinc-400 font-normal">
              Gemini 3.5 Flash · Firebase · Google Calendar · Google AI Studio
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 bg-white py-7 transition-all duration-150">
        <div className="max-w-[1280px] mx-auto px-12 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-[13px] text-zinc-400">
            <span>Stride · © 2026 · Built for Vibe2Ship Hackathon</span>
            <div className="flex gap-4">
              <a href="/privacy" className="hover:text-zinc-600 transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-zinc-600 transition-colors">Terms of Service</a>
            </div>
          </div>
          <div className="text-[13px] text-zinc-400">
            Gemini 3.5 Flash · Firebase · Google AI Studio
          </div>
        </div>
      </footer>

    </div>
  );
}
