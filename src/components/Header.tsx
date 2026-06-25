import React from "react";
import { User, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

interface HeaderProps {
  user: User | null;
  onSignOut: () => void;
}

export default function Header({ user, onSignOut }: HeaderProps) {
  const currentPath = window.location.pathname;
  
  let pageTitle = "Dashboard";
  if (currentPath.includes("chat")) pageTitle = "AI Chat";
  else if (currentPath.includes("calendar")) pageTitle = "Calendar";
  else if (currentPath.includes("analytics")) pageTitle = "Analytics";

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut(auth);
      onSignOut();
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  return (
    <header className="h-[52px] px-12 bg-white border-b border-zinc-200 z-55 sticky top-0 flex items-center justify-between transition-colors duration-150 select-none">
      
      {/* Left side: Brand + Page Title */}
      <div className="flex items-center gap-1.5 text-[15px] font-sans">
        <span className="font-medium text-zinc-900">Stride</span>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-400 font-normal">{pageTitle}</span>
      </div>

      {/* Center: Workspace Active Pill */}
      <div className="flex items-center gap-1.5 px-[10px] py-[3px] border border-zinc-200 rounded-[999px] text-[12px] font-normal text-zinc-400">
        <span className="text-[9px] text-zinc-400" style={{ transform: "translateY(-1px)" }}>●</span>
        <span>Workspace active</span>
      </div>

      {/* Right side: User information + sign out */}
      <div className="flex items-center gap-4 text-[13px] font-sans">
        {user && (
          <>
            <span className="font-normal text-zinc-500">
              {user.displayName || user.email || "Workspace User"}
            </span>
            <span className="text-zinc-200">|</span>
            <button
              onClick={handleLogout}
              className="text-zinc-400 hover:text-zinc-900 transition-colors duration-120 cursor-pointer"
            >
              Sign out
            </button>
          </>
        )}
      </div>

    </header>
  );
}
