import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./lib/firebase";
import { usePath } from "./lib/router";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AIChat from "./pages/AIChat";
import CalendarView from "./pages/CalendarView";
import Analytics from "./pages/Analytics";
import SnapAndPlan from "./pages/SnapAndPlan";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import { ArrowRight } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { path, navigate } = usePath();

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center select-none">
        <div className="relative mb-5 scale-110">
          <div className="absolute inset-0 bg-zinc-500/10 rounded-full blur-xl scale-125 animate-pulse"></div>
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden">
            <span className="text-lg font-bold text-zinc-100 font-serif italic tracking-tighter">S</span>
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-zinc-400 rounded-full ring-4 ring-zinc-950 animate-ping"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-zinc-400 rounded-full ring-4 ring-zinc-950"></div>
        </div>
        <h2 className="text-zinc-100 font-sans text-sm font-semibold tracking-wide uppercase">Stride Engine</h2>
        <p className="text-[10px] text-zinc-450 uppercase font-mono tracking-widest mt-1.5 animate-pulse">
          Starting up workspace environment // auth_check
        </p>
      </div>
    );
  }

  const handleSignedIn = () => {
    navigate("/dashboard");
  };

  const handleSignOut = () => {
    setUser(null);
    navigate("/");
  };

  // Auth Guard Wrapper for workspace pages
  const AuthGuard = ({ children }: { children: React.ReactElement }) => {
    if (!user) {
      return (
        <div className="min-h-screen bg-zinc-50/75 text-zinc-900 flex flex-col items-center justify-center font-sans p-6">
          <div className="max-w-md w-full bg-white border border-zinc-200 p-8 rounded-2xl shadow-sm text-center">
            <span className="text-3xl mb-4 block">🔒</span>
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">Restricted Workspace Path</h2>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed serif-italic">
              Please return to the main gate to authorize. Use our guest credentials or Google sign-in to access workstreams.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs py-3 rounded-xl transition duration-150 active:translate-y-[0.5px] cursor-pointer"
            >
              <span>Return to Launch Screen</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }
    return children;
  };

  // EXACTLY FIVE distinct route pathways
  switch (path) {
    case "/":
      return <Home onSignedIn={handleSignedIn} />;
    case "/privacy":
      return <Privacy />;
    case "/terms":
      return <Terms />;
    case "/dashboard":
      return (
        <AuthGuard>
          <Dashboard user={user!} onSignOut={handleSignOut} />
        </AuthGuard>
      );
    case "/chat":
      return (
        <AuthGuard>
          <AIChat user={user!} onSignOut={handleSignOut} />
        </AuthGuard>
      );
    case "/calendar":
      return (
        <AuthGuard>
          <CalendarView user={user!} onSignOut={handleSignOut} />
        </AuthGuard>
      );
    case "/analytics":
      return (
        <AuthGuard>
          <Analytics user={user!} onSignOut={handleSignOut} />
        </AuthGuard>
      );
    case "/snap":
      return (
        <AuthGuard>
          <SnapAndPlan user={user!} onSignOut={handleSignOut} />
        </AuthGuard>
      );
    default:
      // Route fallbacks seamlessly to landing
      return <Home onSignedIn={handleSignedIn} />;
  }
}
