import { motion } from "framer-motion";

// Soft, slow-moving gradient blobs that sit fixed behind the whole app.
// Pointer-events disabled so they never interfere with interaction.
// Respects prefers-reduced-motion automatically (framer-motion).
export default function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-blue-300/40 to-cyan-300/30 dark:from-blue-500/20 dark:to-cyan-500/10 blur-3xl"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-emerald-300/40 to-teal-300/30 dark:from-emerald-500/20 dark:to-teal-500/10 blur-3xl"
        animate={{ x: [0, -50, 30, 0], y: [0, -30, 40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 left-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-violet-300/30 to-pink-300/30 dark:from-violet-500/15 dark:to-pink-500/10 blur-3xl"
        animate={{ x: [0, 40, -40, 0], y: [0, -50, 20, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
