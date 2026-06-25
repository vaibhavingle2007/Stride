const BASE_URL = 'https://www.googleapis.com/calendar/v3';

export function getToken() {
  return localStorage.getItem('stride_gcal_token');
}

export function getPriorityColor(priority: string) {
  if (priority === 'high') return '11';      // Tomato red
  if (priority === 'medium') return '5';     // Banana yellow
  if (priority === 'low') return '10';       // Sage green
  return '0';
}

export function getReminders(priority: string) {
  if (priority === 'high') return [
    { method: 'popup', minutes: 1440 },   // 1 day before
    { method: 'popup', minutes: 240 },    // 4 hours before
    { method: 'email', minutes: 1440 },   // email 1 day before
    { method: 'popup', minutes: 60 }      // 1 hour before
  ];
  if (priority === 'medium') return [
    { method: 'popup', minutes: 1440 },   // 1 day before
    { method: 'email', minutes: 1440 },   // email 1 day before
    { method: 'popup', minutes: 180 }     // 3 hours before
  ];
  if (priority === 'low') return [
    { method: 'popup', minutes: 1440 },   // 1 day before
    { method: 'email', minutes: 2880 }    // email 2 days before
  ];
  return [];
}

function buildEventObject(task: any) {
  return {
    summary: task.name,
    description: `Priority: ${task.priority.toUpperCase()}\n\n${task.description || ''}\n\nCreated by Stride`,
    start: {
      date: task.deadline,          // "YYYY-MM-DD" (all-day event)
      timeZone: 'Asia/Kolkata'
    },
    end: {
      date: task.deadline,          // same date = all-day
      timeZone: 'Asia/Kolkata'
    },
    colorId: getPriorityColor(task.priority),
    reminders: {
      useDefault: false,
      overrides: getReminders(task.priority)
    },
    extendedProperties: {
      private: {
        strideTaskId: task.id || '',
        stridePriority: task.priority
      }
    }
  };
}

// Queue failed syncs when offline
function queueSync(operation: string, data: any) {
  try {
    const queue = JSON.parse(localStorage.getItem('stride_sync_queue') || '[]');
    queue.push({ operation, data, timestamp: Date.now() });
    localStorage.setItem('stride_sync_queue', JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to queue sync', e);
  }
}

export async function processSyncQueue() {
  const queueStr = localStorage.getItem('stride_sync_queue');
  if (!queueStr) return;
  
  try {
    const queue = JSON.parse(queueStr);
    if (!queue || queue.length === 0) return;
    
    // Clear queue before processing to avoid infinite loops on failure
    localStorage.removeItem('stride_sync_queue');
    
    for (const item of queue) {
      if (item.operation === 'create') {
        // Not implemented in background retry as we need to update Firestore with the new ID
        // In a real app, we'd need a more complex sync state machine
      } else if (item.operation === 'update') {
        await updateCalendarEvent(item.data.task, item.data.googleEventId);
      } else if (item.operation === 'delete') {
        await deleteCalendarEvent(item.data.googleEventId);
      } else if (item.operation === 'complete') {
        await completeCalendarEvent(item.data.task, item.data.googleEventId);
      }
    }
  } catch (e) {
    console.error('Failed to process sync queue', e);
  }
}

// Set up online listener for queue processing
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processSyncQueue();
  });
}

export async function createCalendarEvent(task: any, retries = 0): Promise<string | null> {
  if (!task.deadline) return null;
  
  const token = getToken();
  if (!token) return null;
  
  if (!navigator.onLine) {
    // Cannot queue create easily since we need to return the ID to store in Firestore.
    // For now, it will just fail.
    return null;
  }
  
  try {
    const res = await fetch(
      `${BASE_URL}/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildEventObject(task))
      }
    );
    
    if (res.status === 401) {
      localStorage.removeItem('stride_gcal_token');
      return null;
    }
    
    if (res.status === 429 && retries < 2) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return createCalendarEvent(task, retries + 1);
    }
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return data.id;   // Google Calendar event ID — save to Firestore
  } catch {
    return null;
  }
}

export async function updateCalendarEvent(task: any, googleEventId: string, retries = 0): Promise<string | null> {
  if (!googleEventId) return null;
  
  // If no deadline, we can't really update it as an all-day event easily without a date.
  // We'll skip or we could delete the event. Let's just skip if no deadline.
  if (!task.deadline) return null;
  
  const token = getToken();
  if (!token) return null;
  
  if (!navigator.onLine) {
    queueSync('update', { task, googleEventId });
    return null;
  }
  
  try {
    const res = await fetch(
      `${BASE_URL}/calendars/primary/events/${googleEventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildEventObject(task))
      }
    );
    
    if (res.status === 401) {
      localStorage.removeItem('stride_gcal_token');
      return null;
    }
    
    if (res.status === 429 && retries < 2) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return updateCalendarEvent(task, googleEventId, retries + 1);
    }
    
    if (res.status === 404) {
      // Event already deleted on Google Calendar side, create a new one
      return createCalendarEvent(task);
    }
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return data.id;
  } catch {
    return null;
  }
}

export async function deleteCalendarEvent(googleEventId: string, retries = 0): Promise<void> {
  if (!googleEventId) return;
  
  const token = getToken();
  if (!token) return;
  
  if (!navigator.onLine) {
    queueSync('delete', { googleEventId });
    return;
  }
  
  try {
    const res = await fetch(
      `${BASE_URL}/calendars/primary/events/${googleEventId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (res.status === 401) {
      localStorage.removeItem('stride_gcal_token');
      return;
    }
    
    if (res.status === 429 && retries < 2) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return deleteCalendarEvent(googleEventId, retries + 1);
    }
  } catch {
    return;
  }
}

export async function completeCalendarEvent(task: any, googleEventId: string, retries = 0): Promise<void> {
  if (!googleEventId) return;
  
  const token = getToken();
  if (!token) return;
  
  if (!navigator.onLine) {
    queueSync('complete', { task, googleEventId });
    return;
  }
  
  try {
    const res = await fetch(
      `${BASE_URL}/calendars/primary/events/${googleEventId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: `✓ ${task.name}`,
          colorId: '8',   // Graphite = completed
          reminders: { useDefault: false, overrides: [] }  // remove all reminders
        })
      }
    );
    
    if (res.status === 401) {
      localStorage.removeItem('stride_gcal_token');
      return;
    }
    
    if (res.status === 429 && retries < 2) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return completeCalendarEvent(task, googleEventId, retries + 1);
    }
    
    if (res.status === 404) {
      // Event missing, maybe ignore
      return;
    }
  } catch {
    return;
  }
}
