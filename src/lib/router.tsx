import React, { useState, useEffect } from "react";

export function usePath() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("pushstate", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("pushstate", handleLocationChange);
    };
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new Event("pushstate"));
  };

  return { path, navigate };
}

// Global NavLink component to make path updates clean
export interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: any; // Catch-all for React key and custom anchor attributes
}

export function NavLink({ to, children, className, ...props }: NavLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      window.history.pushState({}, "", to);
      window.dispatchEvent(new Event("pushstate"));
    }
  };

  return (
    <a href={to} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
