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

          {/* Headline */}
          <h1 className="text-[52px] font-light text-zinc-900 leading-[1.1] tracking-[-0.03em] mb-5">
            The productivity tool<br />
            that thinks ahead.
          </h1>

          {/* Subtext */}
          <p className="text-[16px] font-normal text-zinc-500 leading-[1.65] max-w-[480px] mb-7">
            Stride uses Gemini AI to prioritize your tasks, build your daily schedule,
            and tell you exactly what to work on — before deadlines slip.
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

          <div className="text-[11px] text-zinc-400 font-normal">
            Free to use. No credit card.
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
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Log your goals and deadlines</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Enter your agenda deliverables cleanly without worrying about ordering. Paste raw notes, set tentative deadlines, and categorize priorities.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border-t border-zinc-200 py-6 flex">
              <div className="w-[40px] font-mono text-[13px] text-zinc-400 flex-shrink-0">
                02
              </div>
              <div className="flex-1">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Generate adaptive schedules</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Let Gemini analyze your current backlog, calculate deadline hazards, and suggest exactly which task to focus on right now.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border-t border-zinc-200 py-6 flex">
              <div className="w-[40px] font-mono text-[13px] text-zinc-400 flex-shrink-0">
                03
              </div>
              <div className="flex-1">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Chat naturally with your agenda</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Query your schedule with natural language. Ask things like &quot;What are my high priority items due this week?&quot; and receive perfectly compiled, organized summaries.
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
                BUILT FOR FOCUS
              </div>
              <h2 className="text-[28px] font-normal text-zinc-900 leading-[1.25]">
                Everything you need,<br />nothing you don&apos;t.
              </h2>
            </div>

            {/* Feature descriptions Right (60% columns) */}
            <div className="md:col-span-6 flex flex-col">
              
              {/* Feature 2 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Intelligent AI Chat Workspace</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Interact directly with your database using natural prompts. Plan, schedule, and review items interactively.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Minimalist Monthly Calendar</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  A clean grid layout optimized for scheduling density and quick slot allocation without heavy visuals.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="border-t border-zinc-200 py-5">
                <h4 className="text-[15px] font-medium text-zinc-900 mb-1">Workload Analytics Overview</h4>
                <p className="text-[14px] text-zinc-500 leading-[1.6]">
                  Tracks completion percentages and warning metrics like Burnout Hazards based on high-importance items.
                </p>
              </div>

            </div>

          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 bg-white py-7 transition-all duration-150">
        <div className="max-w-[1280px] mx-auto px-12 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-[13px] text-zinc-400">
            Stride ・ © 2026
          </div>
          <div className="text-[13px] text-zinc-400">
            Built with Gemini AI
          </div>
        </div>
      </footer>

    </div>
  );
}
