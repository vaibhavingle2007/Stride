/**
 * Activity logger utility for the Stride Dashboard.
 * Persists up to 50 items reactively in localStorage.
 */

export type ActivityType = 'completed' | 'added' | 'schedule' | 'warning' | 'braindump' | 'snap';

export interface ActivityEntry {
  type: ActivityType;
  description: string;
  timestamp: string;
}

export function logActivity(type: ActivityType, description: string) {
  try {
    const raw = localStorage.getItem("stride_activity");
    const list: ActivityEntry[] = raw ? JSON.parse(raw) : [];
    
    list.unshift({
      type,
      description,
      timestamp: new Date().toISOString()
    });
    
    // Cap at 50 entries
    const capped = list.slice(0, 50);
    localStorage.setItem("stride_activity", JSON.stringify(capped));
    
    // Dispatch standard event to trigger reactivity in same-tab window instances
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.warn("Storage activity logging failure:", e);
  }
}
