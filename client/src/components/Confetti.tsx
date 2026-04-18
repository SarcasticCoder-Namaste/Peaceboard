import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

interface Piece {
  id: number;
  x: number;
  rot: number;
  delay: number;
  color: string;
  size: number;
}

export default function Confetti({ trigger, count = 50 }: { trigger: number; count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const next: Piece[] = Array.from({ length: count }, (_, i) => ({
      id: trigger * 1000 + i,
      x: (Math.random() - 0.5) * 600,
      rot: Math.random() * 720 - 360,
      delay: Math.random() * 0.15,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 2200);
    return () => clearTimeout(t);
  }, [trigger, count]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <AnimatePresence>
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: p.x, y: 600, opacity: 0, rotate: p.rot }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, delay: p.delay, ease: [0.2, 0.7, 0.4, 1] }}
            style={{
              position: "absolute",
              left: "50%",
              top: "30%",
              width: p.size,
              height: p.size * 0.4,
              backgroundColor: p.color,
              borderRadius: 2,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
