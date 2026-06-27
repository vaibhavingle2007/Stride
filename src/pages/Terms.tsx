import React from "react";
import { usePath } from "../lib/router";

// DISCLAIMER: This is a starter template for a hackathon project.
// It should be reviewed by a legal professional before production use.

export default function Terms() {
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
          <div className="text-[13px] font-medium text-zinc-900">Terms of Service</div>
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-6 py-12">
        <h1 className="text-3xl font-light tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-500 mb-8">Effective Date: June 26, 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-zinc-700">
          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">1. User Acceptance</h2>
            <p>
              By accessing or using the Stride application ("https://ais-pre-ik5zi3o7ljgn57xm3gwj6j-1057668469993.asia-southeast1.run.app"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">2. App Purpose</h2>
            <p>
              Stride is an AI-powered productivity and deadline companion developed as a hackathon/student project. It is not intended to act as an enterprise-grade or commercially guaranteed service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">3. Optional Features</h2>
            <p>
              Features such as Google Sign-in and Google Calendar connection are optional. You choose to use these features at your own discretion to enhance the application's core functionality.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">4. User Responsibility</h2>
            <p>
              You are solely responsible for the accuracy of tasks, deadlines, and schedules managed within Stride. The app is a companion tool, not a replacement for your own diligence in managing critical deadlines.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">5. AI Suggestions</h2>
            <p>
              Stride utilizes AI models (such as Google Gemini) to extract tasks, provide scheduling suggestions, and offer productivity advice. These AI suggestions are provided "as is" and are not guaranteed to be perfectly accurate, complete, or optimal. You should always review AI-generated tasks and schedules.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">6. No Warranty</h2>
            <p>
              The service is provided "as is" and "as available" without any warranties of any kind, whether express or implied. The developer makes no warranty that the app will be uninterrupted, timely, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, the developer of Stride shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data or missed deadlines resulting from the use of or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">8. Termination</h2>
            <p>
              You may stop using Stride at any time. We reserve the right to suspend or terminate access to the app at any time, with or without cause or notice, as this is a student project environment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">9. Updates to Terms</h2>
            <p>
              The developer may update these terms from time to time. We will indicate at the top of this page when the terms were last updated. Your continued use of the app constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-zinc-900 mb-3">10. Contact</h2>
            <p>
              If you have any questions or concerns about these terms or wish to request data deletion, please contact the developer, Vaibhav Ingle, at <a href="mailto:vaibhavingleg@gmail.com" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900">vaibhavingleg@gmail.com</a>.
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
