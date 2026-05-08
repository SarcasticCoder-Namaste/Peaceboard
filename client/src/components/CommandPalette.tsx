import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Home, Gamepad2, Music, Trophy, BarChart3, Heart, User as UserIcon,
  Shield, Sun, Moon, Search, LogIn, MessageSquare, Info, BookOpen, Settings as SettingsIcon, UserPlus,
  FileText, Sparkles,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { listEntries, TYPE_META, type DiaryEntry } from "@/lib/diaryStore";
import type { Game } from "@shared/schema";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
  show?: boolean;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const isAdmin = user?.userType === "school_admin" || user?.userType === "teacher";

  // Pull all games and the user's diary so search can dive into content, not just nav.
  const gamesQuery = useQuery<Game[]>({ queryKey: ["/api/games"], enabled: open });
  // Load diary once when the palette opens (and refresh when entries change)
  // so the search input stays snappy on every keystroke.
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  useEffect(() => {
    if (!open || !user) { setDiaryEntries([]); return; }
    setDiaryEntries(listEntries(user.id));
    const onChange = () => setDiaryEntries(listEntries(user.id));
    window.addEventListener("peaceboard:diary-change", onChange);
    return () => window.removeEventListener("peaceboard:diary-change", onChange);
  }, [open, user]);

  // Open with Cmd/Ctrl + K, close with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const go = (path: string) => {
    setLocation(path);
    setOpen(false);
  };

  const openChat = () => {
    setOpen(false);
    // Click the floating chat button if present
    setTimeout(() => {
      const btn = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Open AI assistant"]',
      );
      btn?.click();
    }, 50);
  };

  const all: Cmd[] = [
    { id: "home", label: "Go to Home", hint: "Welcome page", icon: Info, run: () => go("/") },
    { id: "dashboard", label: "Open Dashboard", hint: "Your stats & progress", icon: Home, run: () => go("/home"), show: !!user },
    { id: "games", label: "Play Games", hint: "Empathy & kindness games", icon: Gamepad2, run: () => go("/games") },
    { id: "arcade", label: "Open Arcade", hint: "Quick mini-games · perfect for exhibitions", icon: Sparkles, run: () => go("/arcade") },
    { id: "music", label: "Open Music Center", hint: "Calming sounds & meditation", icon: Music, run: () => go("/music") },
    { id: "leaderboard", label: "View Leaderboard", hint: "Top kindness scores", icon: Trophy, run: () => go("/leaderboard") },
    { id: "emotion", label: "Check Your Emotion", hint: "AI face & mood analysis", icon: Heart, run: () => go("/check-emotion") },
    { id: "profile", label: "Your Profile", hint: "Stats, badges, history", icon: UserIcon, run: () => go("/profile"), show: !!user },
    { id: "diary", label: "Open Diary", hint: "Private journal · PIN-locked", icon: BookOpen, run: () => go("/diary"), show: !!user },
    { id: "settings", label: "Settings", hint: "Notifications, devices, privacy", icon: SettingsIcon, run: () => go("/settings"), show: !!user },
    { id: "invite", label: "Invite a Friend", hint: "Share PeaceBoard", icon: UserPlus, run: () => go("/settings"), show: !!user },
    { id: "analytics", label: "Open Analytics", hint: "Class & student insights", icon: BarChart3, run: () => go("/analytics"), show: isAdmin },
    { id: "digest", label: "Weekly Digest", hint: "School snapshot for the week", icon: BarChart3, run: () => go("/digest"), show: isAdmin },
    { id: "admin", label: "Admin Console", hint: "Manage school", icon: Shield, run: () => go("/admin"), show: isAdmin },
    { id: "chat", label: "Open AI Assistant", hint: "Chat with Peace", icon: MessageSquare, run: openChat },
    { id: "theme", label: theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode", icon: theme === "light" ? Moon : Sun, run: () => { toggleTheme(); setOpen(false); } },
    { id: "login", label: "Sign In", icon: LogIn, run: () => go("/login"), show: !user },
    { id: "logout", label: "Sign Out", icon: LogIn, run: () => { logout(); setOpen(false); }, show: !!user },
  ];

  const items = useMemo(() => {
    const visible = all.filter((c) => c.show !== false);
    const q = query.trim().toLowerCase();
    if (!q) return visible;

    const cmds = visible.filter((c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q));

    // Search inside games (title + description)
    const gameMatches: Cmd[] = (gamesQuery.data || [])
      .filter((g) => g.title.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((g) => ({
        id: `game-${g.id}`,
        label: `🎮 ${g.title}`,
        hint: `Game · ${g.category} · ${g.difficulty}`,
        icon: Sparkles,
        run: () => go("/games"),
      }));

    // Search inside the user's diary entries (title + body) — local only, never leaves the device
    const diaryMatches: Cmd[] = diaryEntries
      .filter((e) => e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q) || e.tags?.some(t => t.toLowerCase().includes(q)))
      .slice(0, 5)
      .map((e) => ({
        id: `diary-${e.id}`,
        label: `${TYPE_META[e.type]?.emoji || "📓"} ${e.title || "(untitled entry)"}`,
        hint: `Diary · ${new Date(e.createdAt).toLocaleDateString()} · ${e.body.slice(0, 60)}`,
        icon: FileText,
        run: () => go("/diary"),
      }));

    return [...cmds, ...gameMatches, ...diaryMatches];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, theme, user, gamesQuery.data, diaryEntries]);

  useEffect(() => {
    if (active >= items.length) setActive(0);
  }, [items.length, active]);

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ y: -16, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onListKey}
                placeholder="Search pages, games, or your diary…"
                className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
              <kbd className="hidden sm:inline-block text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto py-1" onKeyDown={onListKey}>
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No matches.</div>
              ) : (
                items.map((c, i) => {
                  const Icon = c.icon;
                  const isActive = i === active;
                  return (
                    <button
                      key={c.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={c.run}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? "bg-primary/10 text-primary" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{c.label}</div>
                        {c.hint && <div className="text-xs text-slate-500 truncate">{c.hint}</div>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Tip: press <kbd className="font-mono bg-white dark:bg-slate-900 px-1 rounded border border-slate-200 dark:border-slate-700">↑↓</kbd> to navigate, <kbd className="font-mono bg-white dark:bg-slate-900 px-1 rounded border border-slate-200 dark:border-slate-700">⏎</kbd> to select</span>
              <span><kbd className="font-mono bg-white dark:bg-slate-900 px-1 rounded border border-slate-200 dark:border-slate-700">⌘K</kbd> anytime</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
