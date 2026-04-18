import { useEffect, useState } from "react";

const KEY = "peaceboard_avatar_v1";
const DEFAULT_EMOJI = "🙂";

interface AvatarState {
  emoji: string;
  color: string;
}

const DEFAULT: AvatarState = { emoji: DEFAULT_EMOJI, color: "from-blue-500 to-indigo-600" };

function read(userId?: string | null): AvatarState {
  try {
    const raw = localStorage.getItem(`${KEY}_${userId || "anon"}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.emoji) return { emoji: parsed.emoji, color: parsed.color || DEFAULT.color };
    }
  } catch {}
  return DEFAULT;
}

export function useAvatar(userId?: string | null) {
  const [avatar, setAvatarState] = useState<AvatarState>(() => read(userId));

  useEffect(() => {
    setAvatarState(read(userId));
  }, [userId]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === `${KEY}_${userId || "anon"}`) setAvatarState(read(userId));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  const setAvatar = (next: Partial<AvatarState>) => {
    const merged = { ...avatar, ...next };
    setAvatarState(merged);
    try {
      localStorage.setItem(`${KEY}_${userId || "anon"}`, JSON.stringify(merged));
    } catch {}
  };

  return { avatar, setAvatar };
}

export const AVATAR_EMOJIS = [
  "🙂","😊","😎","🤩","🥳","🤓","🧐","😇","🤗","🫶",
  "🌸","🌻","🌟","✨","🌈","🌿","🍀","🌙","🔥","⚡",
  "🐶","🐱","🦊","🐼","🐨","🐯","🦁","🐰","🦄","🐙",
  "🎮","🎵","📚","🎨","🚀","🏆","💎","🎯","🧩","🪁",
];

export const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-500",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-500",
  "from-lime-500 to-green-600",
];
