import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc 
} from "firebase/firestore";
import { db } from "./firebase";

export interface CalendarStatus {
  connected: boolean;
  lastSyncAt?: string | null;
  calendarId?: string;
  error?: string;
}

export interface ImportedEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
}

export interface SyncSummary {
  connected?: boolean;
  pushed: number;
  updated: number;
  deleted: number;
  importedEvents: ImportedEvent[];
  lastSyncAt: string;
}

/**
 * Retrieves the signed Google OAuth consent URL for a specific user ID.
 */
export async function getAuthUrl(uid: string): Promise<string> {
  const res = await fetch(`/api/calendar/auth-url?uid=${encodeURIComponent(uid)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to get auth URL");
  }
  const { url } = await res.json();
  return url;
}

/**
 * Gets the current Google Calendar integration status for a user.
 */
export async function getStatus(uid: string): Promise<CalendarStatus> {
  try {
    const docRef = doc(db, "calendar_connections", uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return { connected: false };
    }
    const data = docSnap.data();
    if (!data || !data.refreshToken) {
      return { connected: false };
    }
    return {
      connected: true,
      lastSyncAt: data.lastSyncAt || null,
      calendarId: data.calendarId || "primary"
    };
  } catch (err: any) {
    console.error("Error reading calendar status from Firestore:", err);
    throw new Error("Failed to get calendar status from database.");
  }
}

/**
 * Runs the idempotent bidirectional synchronization.
 */
export async function syncCalendar(uid: string): Promise<SyncSummary> {
  // 1. Fetch connections doc from Firestore
  let connDocSnap;
  try {
    const connDocRef = doc(db, "calendar_connections", uid);
    connDocSnap = await getDoc(connDocRef);
  } catch (err: any) {
    console.error("[Sync Step 1] Failed to read calendar connection:", err);
    throw new Error(`[Database Read Error] Unable to access calendar connection: ${err.message || err}`);
  }

  if (!connDocSnap.exists()) {
    return { connected: false, pushed: 0, updated: 0, deleted: 0, importedEvents: [], lastSyncAt: "" };
  }
  const tokens = connDocSnap.data();
  if (!tokens || !tokens.refreshToken) {
    return { connected: false, pushed: 0, updated: 0, deleted: 0, importedEvents: [], lastSyncAt: "" };
  }

  // 2. Fetch all user tasks from Firestore
  let tasksSnap;
  try {
    const tasksQuery = query(collection(db, "tasks"), where("userId", "==", uid));
    tasksSnap = await getDocs(tasksQuery);
  } catch (err: any) {
    console.error("[Sync Step 2] Failed to fetch active tasks:", err);
    throw new Error(`[Database Read Error] Unable to load tasks for sync: ${err.message || err}`);
  }

  const tasks: any[] = [];
  tasksSnap.forEach((doc) => {
    tasks.push({ id: doc.id, ...doc.data() });
  });

  // 3. Send tokens and tasks to the stateless server sync API
  let res;
  try {
    res = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, tokens, tasks })
    });
  } catch (err: any) {
    console.error("[Sync Step 3] Network request to sync API failed:", err);
    throw new Error(`[Network Error] Failed to connect to sync server: ${err.message || err}`);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && data.error === "reconnect_needed") {
      throw new Error("reconnect_needed");
    }
    console.error("[Sync Step 3] Server responded with an error:", data);
    throw new Error(data.error || "Google Calendar sync request failed on the server.");
  }

  let result;
  try {
    result = await res.json();
  } catch (err: any) {
    console.error("[Sync Step 3] Failed to parse sync API response JSON:", err);
    throw new Error(`[Response Error] Failed to process sync server response: ${err.message || err}`);
  }

  // 4. Update the connection document with new tokens if refreshed
  const mergedTokens = { ...tokens };
  let hasTokenUpdates = false;
  if (result.newTokens) {
    mergedTokens.accessToken = result.newTokens.accessToken;
    mergedTokens.expiryDate = result.newTokens.expiryDate;
    if (result.newTokens.refreshToken) {
      mergedTokens.refreshToken = result.newTokens.refreshToken;
    }
    hasTokenUpdates = true;
  }

  // 5. Update tasks in Firestore with any googleEventId assignments
  if (result.taskUpdates && Array.isArray(result.taskUpdates)) {
    for (const update of result.taskUpdates) {
      try {
        await updateDoc(doc(db, "tasks", update.id), {
          googleEventId: update.googleEventId
        });
      } catch (updateErr) {
        console.error(`Failed to save googleEventId for task ${update.id}:`, updateErr);
      }
    }
  }

  // 6. Update lastSyncAt on connection doc
  const lastSyncAt = result.lastSyncAt || new Date().toISOString();
  mergedTokens.lastSyncAt = lastSyncAt;
  
  try {
    const connDocRef = doc(db, "calendar_connections", uid);
    await setDoc(connDocRef, mergedTokens, { merge: true });
  } catch (err: any) {
    console.error("[Sync Step 6] Failed to update calendar connection doc:", err);
    throw new Error(`[Database Write Error] Failed to record last sync time: ${err.message || err}`);
  }

  return {
    connected: true,
    pushed: result.pushed || 0,
    updated: result.updated || 0,
    deleted: result.deleted || 0,
    importedEvents: result.importedEvents || [],
    lastSyncAt
  };
}

/**
 * Revokes Google OAuth access and removes the connection document.
 */
export async function disconnectCalendar(uid: string): Promise<void> {
  const connDocRef = doc(db, "calendar_connections", uid);
  const connDocSnap = await getDoc(connDocRef);
  let refreshToken = "";
  if (connDocSnap.exists()) {
    refreshToken = connDocSnap.data()?.refreshToken || "";
  }

  // Send request to server to revoke token
  const res = await fetch("/api/calendar/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, refreshToken })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to disconnect calendar on server");
  }

  // Delete local connection document in Firestore
  if (connDocSnap.exists()) {
    await deleteDoc(connDocRef);
  }
}
