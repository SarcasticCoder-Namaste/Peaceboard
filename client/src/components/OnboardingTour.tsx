import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Gamepad2, MessageSquare, Command, ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "peaceboard_onboarded_v1";

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Welcome to PeaceBoard",
    body: "A friendly space to build empathy, kindness, and emotional skills through games, music, and AI-powered support.",
    accent: "from-blue-500 to-indigo-600",
  },
  {
    icon: Gamepad2,
    title: "Play & learn",
    body: "Try interactive empathy games, log your mood, and listen to calming music. Every action earns points and builds your streak.",
    accent: "from-emerald-500 to-teal-600",
  },
  {
    icon: MessageSquare,
    title: "Meet Peace, your AI buddy",
    body: "Tap the floating chat button anytime. Pick a personality (friend / mentor / coach / guide) and ask anything — homework, ideas, or how you're feeling.",
    accent: "from-rose-500 to-pink-600",
  },
  {
    icon: Command,
    title: "Power moves",
    body: "Press ⌘/Ctrl + K for the command palette to jump anywhere. Press ? anytime to see all keyboard shortcuts. Have fun!",
    accent: "from-violet-500 to-purple-600",
  },
];

export default function OnboardingTour() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [user, isLoading]);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setOpen(false);
    setStep(0);
  };
  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else {
      finish();
      setLocation("/home");
    }
  };
  const skip = () => finish();

  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            key={step}
            initial={{ y: 12, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className={`h-32 bg-gradient-to-br ${s.accent} relative flex items-center justify-center`}>
              <button
                onClick={skip}
                aria-label="Skip onboarding"
                className="absolute top-3 right-3 p-1.5 rounded-full text-white/80 hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
              <motion.div
                key={`icon-${step}`}
                initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg"
              >
                <Icon className="w-10 h-10" />
              </motion.div>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{s.body}</p>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === step ? "w-6 bg-primary" : "w-1.5 bg-slate-300 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={skip}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1"
                  >
                    Skip
                  </button>
                  <button
                    onClick={next}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
                  >
                    {step === STEPS.length - 1 ? "Let’s go" : "Next"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
