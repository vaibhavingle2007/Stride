# Stride — AI-Powered Productivity Engine

> **Stop managing tasks. Start finishing them.**

Stride is a full-stack AI productivity companion that thinks ahead — extracting tasks from your thoughts, photos, and voice, then building a schedule that actually keeps you on track.

Built for the **Vibe2Ship Hackathon** using **Google AI Studio**, **Gemini 3.1 Flash Lite**, **Firebase**, and **React**.

---

## ✨ Features

Stride packs **13+ AI-powered features** into one clean interface:

| Feature | Description |
|---|---|
| 🧠 **Brain Dump → Tasks** | Type a messy stream of consciousness — Gemini reads it and creates structured tasks with deadlines and priorities |
| 📷 **Snap & Plan** | Photograph a whiteboard, assignment sheet, or handwritten list — Gemini Vision extracts every task automatically |
| 🎙️ **Voice Brain Dump** | Speak your tasks out loud; Stride transcribes and structures them via the AI extraction engine |
| 🔄 **Auto-Rescheduler** | Silently rebuilds your full schedule in the background whenever a task is completed, added, or changed |
| 🎯 **Procrastination Radar** | Tracks deadline changes; flags tasks after 2 delays and explains what might be blocking you |
| 📅 **Google Calendar Sync** | Two-way real-time sync with color-coded priorities and smart reminders (4 alerts for High priority) |
| ⚠️ **Overload Warning** | Warns when 3+ high-priority tasks fall on the same day; asks Gemini which to move, then updates your calendar in one click |
| 💬 **AI Chat Coach** | Ask anything: *"Am I going to finish before June 29?"* — Gemini responds with full context of all your tasks |
| 📊 **Productivity Score & Streak** | A live 0–100 score based on daily completions, streak, and high-priority handling — resets daily to build habits |
| 🔮 **Predictive Risk Assessment** | Analyzes your workload to proactively foresee and alert you about missed deadlines before they happen |
| 🚨 **Visual Risk Indicators** | Highlights at-risk tasks with intuitive visual tags to keep your focus on what needs immediate attention |
| 🪜 **AI Micro-Steps & Context** | Breaks large tasks into bite-sized, achievable steps with automatically added context and resources |
| ⏱️ **Integrated Timer & Actions** | Built-in focus timers and swift task actions to keep you in the zone |
| 📈 **Analytics Dashboard** | Completion rate, weekly velocity, priority breakdown, gamification badges, and AI-powered insights |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| **Backend** | Node.js, Express, TypeScript (`tsx`) |
| **AI** | Google Gemini 3.1 Flash Lite (`@google/genai`) |
| **Auth** | Firebase Authentication (Google Sign-In) |
| **Database** | Cloud Firestore |
| **Calendar** | Google Calendar API (OAuth 2.0) |
| **Animation** | Motion (Framer Motion v12) |
| **Icons** | Lucide React |

---

## 📁 Project Structure

```
stride/
├── src/
│   ├── pages/
│   │   ├── Home.tsx          # Landing page with features showcase
│   │   ├── Dashboard.tsx     # Main workspace (tasks, brain dump, widgets)
│   │   ├── AIChat.tsx        # Gemini-powered productivity chat coach
│   │   ├── CalendarView.tsx  # Google Calendar integration UI
│   │   ├── Analytics.tsx     # Productivity stats, badges & AI insights
│   │   ├── SnapAndPlan.tsx   # Image → tasks extraction (Gemini Vision)
│   │   ├── Privacy.tsx       # Privacy policy
│   │   └── Terms.tsx         # Terms of service
│   ├── components/
│   │   ├── TaskList.tsx         # Task list with inline editing & risk flags
│   │   ├── TaskInput.tsx        # Add task form
│   │   ├── BrainDump.tsx        # Free-text & voice task extraction
│   │   ├── RightPanelWidgets.tsx # AI schedule, score, nudge, calendar sync
│   │   ├── SmartNudgeBanner.tsx  # Contextual nudge banner
│   │   ├── AIPlan.tsx           # AI micro-step planner
│   │   ├── CalendarSync.tsx     # Google Calendar connect/disconnect
│   │   ├── FocusModeModal.tsx   # Focus timer modal
│   │   ├── Header.tsx           # App header with user info & sign-out
│   │   └── Navigation.tsx       # Workspace navigation bar
│   └── lib/
│       ├── firebase.ts          # Firebase client initialization
│       ├── gemini.ts            # Gemini types & shared interfaces
│       ├── calendar.ts          # Calendar utility functions
│       ├── calendarService.ts   # Google Calendar event CRUD
│       ├── productivity.ts      # Score, streak & date utilities
│       ├── risk.ts              # Risk assessment logic
│       ├── activity.ts          # Activity logging
│       ├── firestore-errors.ts  # Firestore error handler
│       └── router.tsx           # Client-side hash router
├── server.ts                # Express backend — all AI & Calendar API routes
├── firestore.rules          # Firestore security rules
├── firebase-blueprint.json  # Data model specification
├── vite.config.ts           # Vite build configuration
├── tsconfig.json
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) account with a Gemini API key
- A Firebase project with **Authentication** (Google provider) and **Firestore** enabled
- *(Optional)* Google Cloud OAuth credentials for Calendar sync

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/stride.git
cd stride
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required — Your Gemini API key from Google AI Studio
GEMINI_API_KEY="your_gemini_api_key_here"

# Required — The URL where this app is hosted (used for OAuth callbacks)
APP_URL="http://localhost:3000"

# Optional — Google Calendar OAuth credentials
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/calendar/callback"
```

### 4. Configure Firebase

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Create a project and enable **Google Authentication** and **Cloud Firestore**
3. Update `src/lib/firebase.ts` with your Firebase project config
4. Deploy the Firestore security rules from `firestore.rules`

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Sign in with Google to get started.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server (Vite + Express via `tsx`) |
| `npm run build` | Build frontend (Vite) and bundle backend (esbuild) for production |
| `npm run start` | Run the production build (`dist/server.cjs`) |
| `npm run lint` | TypeScript type checking (`tsc --noEmit`) |

---

## 🔌 API Endpoints

The Express backend exposes these AI and calendar routes:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Analyze tasks — prioritize and build a day schedule |
| `POST` | `/api/extract` | Brain dump — extract structured tasks from free text |
| `POST` | `/api/reschedule` | Auto-rescheduler — rebuild schedule after task mutations |
| `POST` | `/api/rebalance` | Overload warning — suggest which task to move |
| `POST` | `/api/chat` | AI Chat coach — Gemini conversation with full task context |
| `POST` | `/api/insight` | Analytics — generate a specific, actionable AI insight |
| `GET` | `/api/calendar/auth-url` | Start Google Calendar OAuth flow |
| `GET` | `/api/calendar/callback` | Handle OAuth callback and store tokens |
| `GET` | `/api/calendar/status` | Check if Calendar is connected for a user |
| `POST` | `/api/calendar/sync` | Two-way sync tasks ↔ Google Calendar events |
| `POST` | `/api/calendar/disconnect` | Revoke calendar access |

---

## 🗄️ Data Model

### Firestore Collections

**`tasks/{taskId}`**

```typescript
{
  name: string;            // Task title (max 500 chars)
  description: string;     // Optional notes
  deadline: string;        // ISO date — "YYYY-MM-DD"
  priority: "high" | "medium" | "low";
  completed: boolean;
  completedAt: string | null;  // Date string when completed
  userId: string;          // Firebase Auth UID (owner)
  createdAt: number;       // Timestamp (ms)
  deadline_changes: number; // Count of deadline modifications
  original_deadline: string; // Original deadline before any changes
  googleEventId?: string;  // Linked Google Calendar event ID
}
```

**`calendar_connections/{uid}`**

```typescript
{
  refreshToken: string;
  accessToken: string;
  expiryDate: number;
  calendarId: string;     // "primary"
  syncEnabled: boolean;
}
```

---

## 🔐 Security

- **Firestore Rules**: All tasks are strictly scoped to the authenticated user's UID. Users can only read, create, update, and delete their own tasks.
- **OAuth State**: CSRF protection is implemented via HMAC-signed state tokens during Google Calendar OAuth.
- **AI Prompt Injection**: Brain dump text is sandboxed with explicit delimiters (`[BEGIN RAW TEXT]` / `[END RAW TEXT]`) and instruction to prevent prompt injection attacks.
- **API Keys**: All secrets are server-side only via environment variables and never exposed to the client.

---

## 🤖 AI Architecture

Stride uses a resilient Gemini call architecture with:

- **Model Fallback**: Automatically falls back to `gemini-3.1-flash-lite` if the preferred model fails
- **Exponential Backoff**: Retries up to 3 times for transient errors (429, 503, 504) with 1.5s → 3s delays
- **JSON Extraction**: A robust `extractJson()` utility that handles markdown-wrapped, text-prefixed, or clean JSON responses from the model

---

## 📄 License

This project was built for the **Vibe2Ship Hackathon 2026**. See [Privacy Policy](/privacy) and [Terms of Service](/terms) for usage details.

---

## 🙌 Acknowledgements

- [Google AI Studio](https://aistudio.google.com/) — for the Gemini API and build environment
- [Firebase](https://firebase.google.com/) — for auth and real-time database
- [Lucide](https://lucide.dev/) — for the beautiful icon set
- [Motion](https://motion.dev/) — for smooth animations
