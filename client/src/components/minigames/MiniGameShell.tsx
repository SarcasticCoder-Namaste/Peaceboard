import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

// A polished popup wrapper used by every mini-game. Locks scroll, traps focus
// loosely (Escape closes), and fades in with a fun spring scale.
export default function MiniGameShell({
  open, onClose, title, gradient, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  gradient: string;
  children: React.ReactNode;
}) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Remember whoever opened us so we can hand focus back on close
    openerRef.current = (document.activeElement as HTMLElement) || null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      // Light focus trap — keep tab cycling inside the dialog
      const root = dialogRef.current; if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move initial focus into the dialog
    window.setTimeout(() => closeBtnRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      // Defensive — ensure scroll lock can never get stuck
      window.setTimeout(() => { document.body.style.overflow = ""; }, 0);
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl h-[85vh] sm:h-[80vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/30"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className={`relative px-5 py-3 text-white bg-gradient-to-r ${gradient}`}>
              <h2 className="font-bold text-lg drop-shadow-sm">{title}</h2>
              <button
                ref={closeBtnRef}
                onClick={onClose}
                aria-label="Close game"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Small reusable Web Audio "blip" so games feel responsive without bundling assets.
let _ctx: AudioContext | null = null;
export function playTone(freq: number, ms = 140, type: OscillatorType = "sine", vol = 0.18) {
  try {
    if (typeof window === "undefined") return;
    _ctx = _ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = _ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
  } catch {}
}
