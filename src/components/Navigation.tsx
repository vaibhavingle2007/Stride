import React from "react";
import { NavLink } from "../lib/router";
import { User } from "firebase/auth";
import { Camera } from "lucide-react";

interface NavigationProps {
  user: User | null;
  onSignedIn?: () => void;
}

export default function Navigation({ user }: NavigationProps) {
  const currentPath = window.location.pathname;

  const tabs = [
    { name: "Dashboard", path: "/dashboard", icon: null },
    { name: "Snap & Plan", path: "/snap", icon: <Camera size={14} className="mr-1.5" /> },
    { name: "AI Chat", path: "/chat", icon: null },
    { name: "Calendar", path: "/calendar", icon: null },
    { name: "Analytics", path: "/analytics", icon: null },
  ];

  return (
    <div className="bg-white border-b border-zinc-200">
      <div className="max-w-[1280px] mx-auto px-12">
        <div className="flex items-center h-[44px]">
          <nav className="flex items-center gap-6 h-full">
            {tabs.map((tab) => {
              // Exact match or active route base match
              const isActive = currentPath === tab.path || (tab.path !== "/dashboard" && currentPath.startsWith(tab.path));

              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={`h-full flex items-center text-[13px] font-normal transition-all duration-120 border-b-2 cursor-pointer ${
                    isActive
                      ? "border-zinc-900 text-zinc-900 font-medium"
                      : "border-transparent text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  {tab.icon}
                  {tab.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
