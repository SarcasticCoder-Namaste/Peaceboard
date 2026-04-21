import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getStreak } from "@/lib/streak";

export default function StreakBadge() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const refresh = () => setStreak(getStreak(user.id));
    refresh();
    window.addEventListener("peaceboard-streak", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("peaceboard-streak", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [user?.id]);

  if (!user || streak === 0) return null;

  return (
    <Link href="/profile">
      <motion.div
        whileHover={{ scale: 1.06, y: -1 }}
        whileTap={{ scale: 0.95 }}
        title={`${streak}-day kindness streak`}
        className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-100 to-rose-100 dark:from-orange-900/40 dark:to-rose-900/40 border border-orange-200 dark:border-orange-800/60 text-orange-700 dark:text-orange-200 text-xs font-bold shadow-sm cursor-pointer"
      >
        <motion.span
          animate={{ scale: [1, 1.18, 1], rotate: [0, -8, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2 }}
        >
          <Flame className="w-3.5 h-3.5" />
        </motion.span>
        {streak}
      </motion.div>
    </Link>
  );
}
