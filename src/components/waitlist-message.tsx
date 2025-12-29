"use client";

import { Sparkles, BookOpen, Headphones, Brain, Mail } from "lucide-react";
import { Button } from "~/components/ui/button";
import { signOut } from "~/lib/auth-client";

interface WaitlistMessageProps {
  userName: string;
  userEmail: string;
}

export function WaitlistMessage({ userName, userEmail }: WaitlistMessageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-slate-50 via-violet-50 to-indigo-100 p-4 dark:from-slate-950 dark:via-violet-950 dark:to-indigo-950">
      <div className="w-full max-w-2xl">
        {/* Header Card */}
        <div className="relative overflow-hidden rounded-3xl border border-violet-200/50 bg-white/80 shadow-2xl shadow-violet-500/10 backdrop-blur-xl dark:border-violet-800/50 dark:bg-slate-900/80">
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-linear-to-br from-violet-500/5 via-transparent to-indigo-500/5" />

          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="animate-blob absolute top-0 -left-4 h-72 w-72 rounded-full bg-violet-300 mix-blend-multiply blur-xl filter dark:bg-violet-700 dark:mix-blend-overlay" />
            <div className="animate-blob animation-delay-2000 absolute top-0 -right-4 h-72 w-72 rounded-full bg-indigo-300 mix-blend-multiply blur-xl filter dark:bg-indigo-700 dark:mix-blend-overlay" />
            <div className="animate-blob animation-delay-4000 absolute -bottom-8 left-20 h-72 w-72 rounded-full bg-purple-300 mix-blend-multiply blur-xl filter dark:bg-purple-700 dark:mix-blend-overlay" />
          </div>

          <div className="relative p-8 md:p-12">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 p-4 shadow-lg shadow-violet-500/30">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="mb-8 text-center">
              <h1 className="mb-3 bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-3xl font-bold text-transparent md:text-4xl dark:from-violet-400 dark:to-indigo-400">
                Welcome to EdgeLang Beta!
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Hi <span className="font-semibold">{userName}</span>, thank you
                for signing up!
              </p>
            </div>

            {/* Message */}
            <div className="mb-8 rounded-2xl border border-violet-200/50 bg-gradient-to-r from-violet-50 to-indigo-50 p-6 dark:border-violet-700/50 dark:from-violet-900/30 dark:to-indigo-900/30">
              <p className="text-center leading-relaxed text-slate-700 dark:text-slate-200">
                EdgeLang is currently in{" "}
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  private beta
                </span>
                . We&apos;re carefully onboarding users to ensure the best
                experience possible.
              </p>
              <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300">
                You&apos;re on the waitlist and we&apos;ll notify you at{" "}
                <span className="font-medium">{userEmail}</span> once your
                account is approved.
              </p>
            </div>

            {/* Features Preview */}
            <div className="mb-8">
              <p className="mb-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                What you&apos;ll get access to:
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FeaturePreview
                  icon={BookOpen}
                  title="AI Stories"
                  description="Personalized mini-stories from your daily life"
                />
                <FeaturePreview
                  icon={Headphones}
                  title="Native Audio"
                  description="High-quality TTS for every word"
                />
                <FeaturePreview
                  icon={Brain}
                  title="Smart Review"
                  description="Spaced repetition for lasting memory"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  (window.location.href = "mailto:support@edgelang.app")
                }
              >
                <Mail className="h-4 w-4" />
                Contact Support
              </Button>
              <Button variant="ghost" onClick={() => void signOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Questions? Reach out to us at{" "}
          <a
            href="mailto:support@edgelang.app"
            className="text-violet-600 hover:underline dark:text-violet-400"
          >
            support@edgelang.app
          </a>
        </p>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

interface FeaturePreviewProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function FeaturePreview({
  icon: Icon,
  title,
  description,
}: FeaturePreviewProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200/50 bg-white/50 p-4 text-center dark:border-slate-700/50 dark:bg-slate-800/50">
      <div className="mb-2 rounded-lg bg-violet-100 p-2 dark:bg-violet-900/50">
        <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}
