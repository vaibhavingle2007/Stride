import React from "react";
import { usePath } from "../lib/router";

// DISCLAIMER: This is a starter template for a hackathon project.
// It should be reviewed by a legal professional before production use.

export default function Privacy() {
  const { navigate } = usePath();

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-200">
      <header className="h-[52px] border-b border-zinc-200 bg-white sticky top-0 z-50 transition-all duration-150">
        <div className="max-w-[760px] mx-auto h-full px-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-[13px] font-medium text-zinc-900 hover:text-zinc-600 transition-colors duration-100 cursor-pointer flex items-center gap-2"
          >
            ← Back to Home
          </button>
          <div className="text-[13px] font-medium text-zinc-900">Privacy Policy</div>
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-6 py-12">
        <h1 className="text-3xl font-light tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-8">Effective Date: June 26, 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-zinc-700">
          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">1. What Stride Is</h2>
            <p>
              Stride is an AI-powered productivity and deadline companion built as a hackathon/student project, not a paid commercial product. Our goal is to help you manage tasks and deadlines efficiently.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">2. Data We Collect</h2>
            <p className="mb-2">We collect only the information necessary to provide the app's core features:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Google Account Information:</strong> Basic profile info (name, email) used for sign-in via Google Auth.</li>
              <li><strong>Task Data:</strong> Tasks created by you, including task names, descriptions, deadlines, priority, and completion status.</li>
              <li><strong>Calendar Connection Status:</strong> Whether you have connected your Google Calendar to Stride.</li>
              <li><strong>Google Calendar Event Data:</strong> Accessed only when you explicitly connect Google Calendar to Stride.</li>
              <li><strong>Uploaded Images:</strong> Collected only for Snap & Plan analysis to extract tasks.</li>
              <li><strong>Brain Dump Text:</strong> Collected only for task extraction when using the Brain Dump feature.</li>
              <li><strong>AI Chat Messages:</strong> Collected only for generating productivity help within the AI Chat feature.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">3. Google Calendar Usage</h2>
            <p>
              Stride uses Google Calendar access only to create task events, update task events, delete task events, and sync deadline-related calendar events. We do not use your calendar data for any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">4. Google User Data Policy</h2>
            <p className="font-medium text-zinc-900 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              Stride's use and transfer of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-600">Google API Services User Data Policy</a>, including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">5. Data Sharing</h2>
            <p>
              Stride <strong>does not</strong> sell your user data. We do not share your data with advertisers. Your data may be processed by Firebase, Google Gemini, and Google Calendar APIs <em>only</em> to provide Stride's app features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">6. AI Processing</h2>
            <p>
              To provide intelligent productivity features, task text, uploaded images, and chat messages may be sent to Google Gemini APIs to extract tasks, generate schedules, or provide productivity suggestions. This data is processed transiently to return results.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">7. Data Storage</h2>
            <p>
              Your user tasks and related data are stored securely in Firebase Firestore. If Google Calendar tokens are used, they are stored and used only to maintain calendar sync functionality.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">8. Data Deletion</h2>
            <p>
              You can delete individual tasks within the app at any time. To request complete account and data deletion, please email the developer at <a href="mailto:vaibhavingleg@gmail.com" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900">vaibhavingleg@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">9. Security</h2>
            <p>
              We implement reasonable safeguards to protect your information, including Firebase Auth for secure sign-in, strict Firestore security rules to ensure you can only access your own data, and secure server-side API handling.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">10. Children's Privacy</h2>
            <p>
              Stride is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">Contact</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact developer Vaibhav Ingle at <a href="mailto:vaibhavingleg@gmail.com" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900">vaibhavingleg@gmail.com</a>.
            </p>
          </section>
        </div>
      </main>
      <footer className="border-t border-zinc-200 bg-white py-8 mt-12">
        <div className="max-w-[760px] mx-auto px-6 text-center text-[13px] text-zinc-400">
          Stride · © 2026 · Built for Vibe2Ship Hackathon
        </div>
      </footer>
    </div>
  );
}
