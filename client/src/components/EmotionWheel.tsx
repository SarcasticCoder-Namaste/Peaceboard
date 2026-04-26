import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface EmotionDef {
  key: string;
  label: string;
  emoji: string;
  color: string;       // hex for SVG fill
  textColor: string;   // foreground text on the wedge
  nuances: string[];
  wellness: number;    // 1..100 wellness contribution if this is your current feeling
}

// Plutchik-inspired core emotions, each with a few human-friendly nuances.
export const CORE_EMOTIONS: EmotionDef[] = [
  { key: "joy",          label: "Joy",          emoji: "😊", color: "#FACC15", textColor: "#3F3000", nuances: ["happy", "grateful", "playful", "proud"],     wellness: 90 },
  { key: "trust",        label: "Trust",        emoji: "🤗", color: "#86EFAC", textColor: "#053924", nuances: ["safe", "loved", "accepted", "supported"],   wellness: 85 },
  { key: "fear",         label: "Fear",         emoji: "😨", color: "#A78BFA", textColor: "#1F0E58", nuances: ["worried", "anxious", "nervous", "scared"],   wellness: 35 },
  { key: "surprise",     label: "Surprise",     emoji: "😮", color: "#7DD3FC", textColor: "#082F49", nuances: ["amazed", "curious", "confused", "shocked"], wellness: 65 },
  { key: "sadness",      label: "Sadness",      emoji: "😢", color: "#93C5FD", textColor: "#0B2545", nuances: ["lonely", "disappointed", "hurt", "tired"],    wellness: 30 },
  { key: "disgust",      label: "Disgust",      emoji: "😖", color: "#C4B5FD", textColor: "#2E1065", nuances: ["uncomfortable", "annoyed", "judged", "bored"], wellness: 40 },
  { key: "anger",        label: "Anger",        emoji: "😠", color: "#FCA5A5", textColor: "#450A0A", nuances: ["frustrated", "irritated", "jealous", "mad"],   wellness: 30 },
  { key: "anticipation", label: "Anticipation", emoji: "✨", color: "#FDBA74", textColor: "#431407", nuances: ["excited", "hopeful", "focused", "inspired"],  wellness: 80 },
];

interface EmotionWheelProps {
  onSelect: (core: EmotionDef, nuance: string) => void;
  size?: number;
  disabled?: boolean;
}

export default function EmotionWheel({ onSelect, size = 320, disabled = false }: EmotionWheelProps) {
  const [active, setActive] = useState<EmotionDef | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 4;
  const innerRadius = radius * 0.32;
  const segments = CORE_EMOTIONS.length;
  const angleStep = (Math.PI * 2) / segments;

  function arcPath(i: number): string {
    const start = i * angleStep - Math.PI / 2;
    const end = start + angleStep;
    const x1 = cx + Math.cos(start) * radius;
    const y1 = cy + Math.sin(start) * radius;
    const x2 = cx + Math.cos(end) * radius;
    const y2 = cy + Math.sin(end) * radius;
    const x3 = cx + Math.cos(end) * innerRadius;
    const y3 = cy + Math.sin(end) * innerRadius;
    const x4 = cx + Math.cos(start) * innerRadius;
    const y4 = cy + Math.sin(start) * innerRadius;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4} Z`;
  }

  function labelPosition(i: number) {
    const mid = i * angleStep + angleStep / 2 - Math.PI / 2;
    const r = (radius + innerRadius) / 2;
    return { x: cx + Math.cos(mid) * r, y: cy + Math.sin(mid) * r };
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="group"
        aria-label="Emotion wheel — pick the feeling closest to yours"
        className="select-none"
      >
        {CORE_EMOTIONS.map((e, i) => {
          const isActive = active?.key === e.key;
          const { x, y } = labelPosition(i);
          return (
            <g key={e.key}>
              <motion.path
                d={arcPath(i)}
                fill={e.color}
                stroke={focused === e.key ? "#0f172a" : "#ffffff"}
                strokeWidth={focused === e.key ? 4 : 2}
                style={{ cursor: disabled ? "not-allowed" : "pointer", transformOrigin: `${cx}px ${cy}px`, outline: "none" }}
                animate={{ scale: isActive ? 1.04 : 1, opacity: !active || isActive ? 1 : 0.55 }}
                whileHover={!disabled ? { scale: 1.04 } : undefined}
                onClick={() => !disabled && setActive(isActive ? null : e)}
                onFocus={() => setFocused(e.key)}
                onBlur={() => setFocused(null)}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-pressed={isActive}
                aria-label={`${e.label}${isActive ? ", selected" : ""}. Choose to see ${e.nuances.length} more specific feelings.`}
                onKeyDown={(ev) => {
                  if (disabled) return;
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setActive(isActive ? null : e);
                  }
                }}
              />
              <text
                x={x}
                y={y - 6}
                textAnchor="middle"
                fontSize={18}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {e.emoji}
              </text>
              <text
                x={x}
                y={y + 12}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill={e.textColor}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {e.label}
              </text>
            </g>
          );
        })}

        {/* Center hub */}
        <circle cx={cx} cy={cy} r={innerRadius - 2} fill="white" stroke="#e5e7eb" strokeWidth={1} className="dark:fill-slate-900 dark:stroke-slate-700" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} className="fill-slate-500 dark:fill-slate-400" style={{ pointerEvents: "none" }}>
          How do you
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={11} className="fill-slate-500 dark:fill-slate-400" style={{ pointerEvents: "none" }}>
          feel?
        </text>
      </svg>

      {/* Nuance picker */}
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You picked <span className="font-semibold" style={{ color: active.color }}>{active.label}</span>. Which feels closest?
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {active.nuances.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(active, n)}
                  className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-all hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderColor: active.color, color: active.textColor, background: `${active.color}33` }}
                >
                  {n}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
