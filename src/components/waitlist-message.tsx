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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50 to-indigo-100 dark:from-slate-950 dark:via-violet-950 dark:to-indigo-950 p-4">
      <div className="w-full max-w-2xl">
        {/* Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-violet-500/10 border border-violet-200/50 dark:border-violet-800/50">
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5" />
          
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-violet-300 dark:bg-violet-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl animate-blob" />
            <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 dark:bg-indigo-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl animate-blob animation-delay-2000" />
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-300 dark:bg-purple-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl animate-blob animation-delay-4000" />
          </div>

          <div className="relative p-8 md:p-12">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 p-4 shadow-lg shadow-violet-500/30">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent mb-3">
                Welcome to EdgeLang Beta!
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Hi <span className="font-semibold">{userName}</span>, thank you for signing up!
              </p>
            </div>

            {/* Message */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 rounded-2xl p-6 mb-8 border border-violet-200/50 dark:border-violet-700/50">
              <p className="text-center text-slate-700 dark:text-slate-200 leading-relaxed">
                EdgeLang is currently in <span className="font-semibold text-violet-600 dark:text-violet-400">private beta</span>. 
                We&apos;re carefully onboarding users to ensure the best experience possible.
              </p>
              <p className="text-center text-slate-600 dark:text-slate-300 mt-3 text-sm">
                You&apos;re on the waitlist and we&apos;ll notify you at{" "}
                <span className="font-medium">{userEmail}</span> once your account is approved.
              </p>
            </div>

            {/* Features Preview */}
            <div className="mb-8">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mb-4">
                What you&apos;ll get access to:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.location.href = "mailto:support@edgelang.app"}
              >
                <Mail className="h-4 w-4" />
                Contact Support
              </Button>
              <Button
                variant="ghost"
                onClick={() => void signOut()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Questions? Reach out to us at{" "}
          <a
            href="mailto:support@edgelang.app"
            className="text-violet-600 dark:text-violet-400 hover:underline"
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

function FeaturePreview({ icon: Icon, title, description }: FeaturePreviewProps) {
  return (
    <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
      <div className="rounded-lg bg-violet-100 dark:bg-violet-900/50 p-2 mb-2">
        <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
      </div>
      <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {description}
      </p>
    </div>
  );
}

