import React, { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getAuthUrl, getStatus, syncCalendar, disconnectCalendar } from "../lib/calendar";

interface CalendarSyncProps {
  userId: string;
  onSyncComplete?: (summary: { pushed: number; updated: number; deleted: number; lastSyncAt: string }) => void;
}

export default function CalendarSync({ userId, onSyncComplete }: CalendarSyncProps) {
  const [connected, setConnected] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await getStatus(userId);
      setConnected(status.connected);
      setLastSyncAt(status.lastSyncAt || null);
      if (status.error === "reconnect_needed") {
        setError("Your Google Calendar connection has expired. Please reconnect.");
      }
    } catch (err: any) {
      console.error("Failed to fetch calendar status:", err);
      setError(err.message || "Failed to fetch calendar connection status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchStatus();
    }
  }, [userId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Accept message from the development environment or production URL
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }
      if (event.data?.type === "CALENDAR_AUTH_SUCCESS") {
        console.log("OAuth success message received from popup!");
        if (event.data?.tokens) {
          const saveTokens = async () => {
            try {
              await setDoc(doc(db, "calendar_connections", userId), {
                ...event.data.tokens,
                connected: true,
                lastSyncAt: new Date().toISOString()
              }, { merge: true });
            } catch (err) {
              console.error("Failed to save calendar connection tokens client-side:", err);
            }
          };
          saveTokens().then(() => {
            setConnected(true);
            fetchStatus().then(() => {
              handleSync();
            });
          });
        } else {
          setConnected(true);
          fetchStatus().then(() => {
            handleSync();
          });
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [userId]);

  const handleConnect = async () => {
    setError(null);
    try {
      const url = await getAuthUrl(userId);
      const width = 600;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        url,
        "google_calendar_oauth",
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      if (!authWindow) {
        setError("Popup was blocked. Please enable popups in your browser to connect your Google Calendar.");
      }
    } catch (err: any) {
      console.error("Failed to generate OAuth URL:", err);
      setError(err.message || "Could not launch Google authentication.");
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const summary = await syncCalendar(userId);
      setLastSyncAt(summary.lastSyncAt);
      if (onSyncComplete) {
        onSyncComplete(summary);
      }
    } catch (err: any) {
      console.error("Calendar sync failed:", err);
      if (err.message === "reconnect_needed") {
        setConnected(false);
        setError("Your Google Calendar connection has expired. Please reconnect.");
      } else {
        setError(err.message || "Bidirectional synchronization failed. Please retry.");
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect Google Calendar? This will stop automatic task synchronization.")) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await disconnectCalendar(userId);
      setConnected(false);
      setLastSyncAt(null);
    } catch (err: any) {
      console.error("Calendar disconnect failed:", err);
      setError(err.message || "Failed to disconnect Google Calendar.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRedirect = () => {
    const redirectUrl = `${window.location.origin}/api/calendar/callback`;
    navigator.clipboard.writeText(redirectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "Never synced";
    try {
      const d = new Date(isoString);
      return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "Unknown";
    }
  };

  return (
    <div className="w-full flex flex-col text-left py-4 border-b border-zinc-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-zinc-400 tracking-[0.08em] uppercase font-sans">
          GOOGLE CALENDAR
        </span>
        {connected && !loading && (
          <button
            onClick={handleDisconnect}
            className="text-[11px] text-zinc-400 hover:text-red-500 transition-colors underline cursor-pointer"
          >
            Disconnect
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2.5 text-[12.5px] leading-relaxed text-red-600 bg-red-50 border border-red-100 rounded-[6px]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-3.5 h-3.5 border border-zinc-300 border-t-zinc-600 animate-spin rounded-full"></div>
          <span className="text-[12.5px] text-zinc-400 font-mono">Checking connection...</span>
        </div>
      ) : connected ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[13px] font-medium text-zinc-800">Connected</span>
            </div>
            <span className="text-[11.5px] text-zinc-400 font-mono">
              Last: {formatTime(lastSyncAt)}
            </span>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full h-8 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-[12.5px] rounded-[6px] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                <span>Syncing...</span>
              </>
            ) : (
              <span>Sync now</span>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[12.5px] text-zinc-500 leading-normal">
            Keep your deadlines and workloads in step with Google Calendar as all-day events.
          </p>
          <button
            onClick={handleConnect}
            className="w-full h-8 flex items-center justify-center gap-2 border border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 text-zinc-700 font-medium text-[12.5px] rounded-[6px] transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-zinc-600" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M21.35 11.1H12v2.7h5.38c-.23 1.28-.95 2.37-2.03 3.1v2.58h3.29c1.92-1.78 3.03-4.38 3.03-7.48c0-.52-.05-1.03-.15-1.4M12 21.6c2.59 0 4.77-.86 6.36-2.32l-3.29-2.58c-.91.61-2.08.97-3.07.97c-2.37 0-4.38-1.6-5.1-3.76H3.3v2.66c1.62 3.22 4.96 5.43 8.7 5.43m-5.1-10.1c-.19-.58-.3-1.2-.3-1.83c0-.63.11-1.25.3-1.83V5.01H3.3a8.98 8.98 0 0 0 0 7.98l3.6-2.49M12 7.17c1.41 0 2.68.49 3.68 1.44l2.76-2.76C16.76 4.12 14.58 3.3 12 3.3c-3.74 0-7.08 2.21-8.7 5.43l3.6 2.49c.72-2.16 2.73-3.76 5.1-3.76"
              />
            </svg>
            <span>Connect Google Calendar</span>
          </button>

          <div className="mt-2 border-t border-zinc-100 pt-2">
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="text-[11.5px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{showSetup ? "Hide" : "Show"} Redirect URL for setup</span>
              <svg
                className={`w-3 h-3 transform transition-transform ${showSetup ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showSetup && (
              <div className="mt-2 p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-[11.5px] text-zinc-600 flex flex-col gap-1.5 leading-relaxed">
                <span className="font-semibold text-zinc-700">Authorized Redirect URI:</span>
                <div className="flex items-center justify-between gap-2 bg-white px-2 py-1.5 rounded border border-zinc-200 font-mono text-[10.5px] text-zinc-800 break-all">
                  <span>{window.location.origin}/api/calendar/callback</span>
                  <button
                    onClick={handleCopyRedirect}
                    className="shrink-0 text-[10.5px] font-sans text-zinc-500 hover:text-zinc-900 px-1.5 py-0.5 hover:bg-zinc-100 rounded transition-all cursor-pointer"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-zinc-500 text-[10px] mt-0.5">
                  Paste this URI into your Google Cloud Platform credentials settings under <strong>"Authorized redirect URIs"</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
