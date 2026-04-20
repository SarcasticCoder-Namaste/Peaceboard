import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, X, Send, Mic, MicOff, Settings, Trash2, Download,
  Sparkles, Search, Copy, Check,
  ThumbsUp, ThumbsDown, Cpu, Cloud, ArrowDown, Minus, Smile,
  Wand2, Zap,
} from "lucide-react";
import { ask as brainAsk, teach as brainTeach, type Persona as BrainPersona } from "@/lib/peaceBrain";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  reactions?: string[];
  mood?: string;
  suggestions?: string[];
  intent?: string;
  feedback?: "up" | "down";
}

const STORAGE_KEY = "peaceboard_chat_v2";
const PREFS_KEY = "peaceboard_chat_prefs_v2";

interface Persona {
  id: string; name: string; emoji: string; desc: string;
  greeting: string; color: string; gradient: string; ring: string;
}
interface Theme {
  id: string; name: string;
  bg: string; bubble: string; accent: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const PERSONAS: Persona[] = [
  { id: "friend", name: "Supportive Friend", emoji: "🤗", desc: "Warm & encouraging",
    greeting: "Hey! I'm so glad you're here. What's on your mind today? I'm all ears! 💙",
    color: "text-blue-600", gradient: "from-blue-500 via-cyan-500 to-teal-400", ring: "ring-cyan-300" },
  { id: "mentor", name: "Wise Mentor", emoji: "🦉", desc: "Thoughtful & insightful",
    greeting: "Welcome. Every conversation begins with courage. What would you like to explore today?",
    color: "text-violet-600", gradient: "from-violet-500 via-purple-500 to-fuchsia-500", ring: "ring-violet-300" },
  { id: "coach", name: "Playful Coach", emoji: "⚡", desc: "Energetic & fun",
    greeting: "Let's GO! 🚀 You showed up and that already makes you amazing. What are we working on?",
    color: "text-orange-600", gradient: "from-amber-500 via-orange-500 to-pink-500", ring: "ring-orange-300" },
  { id: "guide", name: "Calm Guide", emoji: "🌿", desc: "Peaceful & grounding",
    greeting: "Take a gentle breath. You're safe here. 🌿 How are you feeling in this moment?",
    color: "text-green-600", gradient: "from-emerald-500 via-green-500 to-teal-500", ring: "ring-emerald-300" },
];

const THEMES: Theme[] = [
  { id: "light", name: "Light", bg: "bg-white", bubble: "bg-slate-100/80 text-slate-800", accent: "blue" },
  { id: "dark", name: "Night", bg: "bg-slate-900", bubble: "bg-slate-800 text-slate-100", accent: "indigo" },
  { id: "nature", name: "Nature", bg: "bg-emerald-50", bubble: "bg-white text-slate-800", accent: "green" },
  { id: "sunset", name: "Sunset", bg: "bg-orange-50", bubble: "bg-white text-slate-800", accent: "orange" },
];

const QUICK_MOODS = [
  { emoji: "😢", label: "Sad", msg: "I'm feeling sad right now and could use some support." },
  { emoji: "😰", label: "Anxious", msg: "I'm feeling anxious. Can you help me calm down?" },
  { emoji: "😡", label: "Frustrated", msg: "I'm really frustrated and need to talk about it." },
  { emoji: "🤩", label: "Excited", msg: "Something great happened! I'm feeling really excited!" },
  { emoji: "💭", label: "Advice", msg: "I need some advice on a situation I'm dealing with." },
  { emoji: "🌱", label: "Just chat", msg: "I just want to have a nice conversation today." },
];

const REACTIONS = ["❤️", "😊", "👍", "💡", "🌟", "🙏"];

function TypingDots({ gradient }: { gradient: string }) {
  return (
    <div className="flex gap-1.5 items-center px-1 py-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className={`w-2 h-2 rounded-full bg-gradient-to-br ${gradient}`}
          animate={{ y: [-4, 0, -4], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function VoiceWave() {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div key={i}
          className="w-0.5 bg-red-500 rounded-full"
          animate={{ height: ["20%", "100%", "30%", "80%", "20%"] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function renderText(text: string) {
  return text.split("\n").map((line, i) => {
    const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("• ");
    const stripped = line.replace(/^[-•]\s/, "");
    const safe = escapeHtml(stripped)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
    return (
      <p key={i}
        className={`leading-relaxed ${isBullet ? "pl-3 before:content-['•'] before:mr-1.5 before:text-slate-400" : ""} ${i > 0 ? "mt-1.5" : ""}`}
        dangerouslySetInnerHTML={{ __html: safe }} />
    );
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FloatingChatbot() {
  const savedPrefs = (() => {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { return {}; }
  })();

  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [tab, setTab] = useState<"chat" | "settings">("chat");
  const [personaId, setPersonaId] = useState<string>(savedPrefs.personaId || "friend");
  const [themeId, setThemeId] = useState<string>(savedPrefs.themeId || "light");
  const [fontSize, setFontSize] = useState<number>(savedPrefs.fontSize || 14);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(savedPrefs.soundEnabled ?? true);
  const [offlineBrain, setOfflineBrain] = useState<boolean>(savedPrefs.offlineBrain ?? true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showMoodDock, setShowMoodDock] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [unread, setUnread] = useState(0);
  const [openReactionFor, setOpenReactionFor] = useState<string | null>(null);

  const persona = PERSONAS.find(p => p.id === personaId) || PERSONAS[0];
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Message[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
        }
      }
    } catch {}
    return [{ id: "init", role: "assistant", content: persona.greeting, timestamp: new Date() }];
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60))); } catch {}
  }, [messages]);
  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ personaId, themeId, fontSize, soundEnabled, offlineBrain })); } catch {}
  }, [personaId, themeId, fontSize, soundEnabled, offlineBrain]);

  useEffect(() => {
    setMessages(prev => {
      if (prev.length <= 1) return [{ id: "init", role: "assistant", content: persona.greeting, timestamp: new Date() }];
      return prev;
    });
  }, [personaId]);

  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragControls = useDragControls();

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);
  useEffect(() => { if (!scrolledUp) scrollToBottom(); }, [messages, scrolledUp, scrollToBottom]);

  // Track scroll-up state to show jump-to-bottom button
  useEffect(() => {
    const el = scrollContainerRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setScrolledUp(dist > 120);
      if (dist < 60) setUnread(0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isOpen, tab]);

  // Speech recognition
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e: any) => { setInputMessage(p => (p ? p + " " : "") + e.results[0][0].transcript); setIsListening(false); };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
  }, []);

  const playPop = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 620; osc.type = "sine";
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(); osc.stop(ctx.currentTime + 0.18);
    } catch {}
  }, [soundEnabled]);

  const onAssistantReply = (text: string, extra: Partial<Message> = {}) => {
    const newMsg: Message = { id: Date.now().toString() + "-a", role: "assistant", content: text, timestamp: new Date(), ...extra };
    setMessages(prev => [...prev, newMsg]);
    playPop();
    if (!isOpen || minimized) setUnread(u => u + 1);
  };

  const chatMutation = useMutation({
    mutationFn: async (payload: { msg: string; history: { role: string; content: string }[] }) => {
      const res = await apiRequest("POST", "/api/chat", {
        userId: user?.id || null, message: payload.msg, history: payload.history, persona: personaId,
      });
      return res.json();
    },
    onSuccess: (data) => onAssistantReply(data.response, { suggestions: Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 3) : [] }),
    onError: () => toast({ title: "Could not reach AI. Please try again.", variant: "destructive" }),
  });

  const sendMessage = (text = inputMessage) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setShowMoodDock(false);

    if (offlineBrain) {
      const brainPersona = (["friend","mentor","coach","guide"].includes(personaId) ? personaId : "friend") as BrainPersona;
      setTimeout(() => {
        const r = brainAsk(trimmed, { persona: brainPersona });
        onAssistantReply(r.text, { suggestions: r.suggestions, intent: r.intent });
      }, 350 + Math.min(900, trimmed.length * 12));
      return;
    }
    const history = messages
      .filter(m => m.id !== "init" || messages.length > 1)
      .map(m => ({ role: m.role, content: m.content }));
    chatMutation.mutate({ msg: trimmed, history });
  };

  const giveFeedback = (msgId: string, helpful: boolean) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const next: Message = { ...m, feedback: m.feedback === (helpful ? "up" : "down") ? undefined : (helpful ? "up" : "down") };
      if (m.intent && next.feedback) brainTeach(m.intent, helpful);
      return next;
    }));
    if (helpful) toast({ title: "Thanks! Peace just got smarter ✨", duration: 1800 });
  };

  const copyMessage = async (id: string, content: string) => {
    try { await navigator.clipboard.writeText(content); setCopiedId(id); setTimeout(() => setCopiedId(null), 1400); }
    catch { toast({ title: "Copy failed", variant: "destructive" }); }
  };

  useEffect(() => {
    if (isOpen && !minimized && tab === "chat") {
      const t = setTimeout(() => inputRef.current?.focus(), 280);
      return () => clearTimeout(t);
    }
  }, [isOpen, tab, minimized]);

  useEffect(() => { if (isOpen && !minimized) setUnread(0); }, [isOpen, minimized]);

  const addReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => m.id === msgId
      ? { ...m, reactions: m.reactions?.includes(emoji) ? m.reactions.filter(r => r !== emoji) : [...(m.reactions || []), emoji] }
      : m));
    setOpenReactionFor(null);
  };

  const exportChat = () => {
    const text = messages.map(m => `[${m.role.toUpperCase()}] ${m.timestamp.toLocaleTimeString()}\n${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "peace-chat.txt"; a.click();
    URL.revokeObjectURL(url);
  };
  const clearChat = () => {
    if (!confirm("Clear conversation? This cannot be undone.")) return;
    setMessages([{ id: "init", role: "assistant", content: persona.greeting, timestamp: new Date() }]);
    setShowMoodDock(false);
  };

  const filteredMessages = useMemo(() => searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages, [searchQuery, messages]);

  const charCount = inputMessage.length;
  const charLimit = 500;
  const isPending = chatMutation.isPending;

  // Keyboard: ESC closes, ⌘/Ctrl+K opens
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) { setIsOpen(false); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setIsOpen(o => !o); setMinimized(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <>
      {/* Floating action button */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.4 }}
      >
        {/* Pulsing ring */}
        {!isOpen && (
          <>
            <motion.span
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${persona.gradient}`}
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
            <motion.span
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${persona.gradient}`}
              animate={{ scale: [1, 1.7, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: 0.6 }}
            />
          </>
        )}

        <motion.button
          onClick={() => { setIsOpen(true); setMinimized(false); }}
          aria-label="Open AI assistant"
          whileHover={{ scale: 1.08, rotate: -6 }}
          whileTap={{ scale: 0.92 }}
          className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${persona.gradient} text-white shadow-2xl shadow-black/30 flex items-center justify-center group`}
        >
          <motion.span
            animate={{ rotate: [0, 12, -8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 1.5 }}
            className="text-3xl drop-shadow-md"
          >
            {persona.emoji}
          </motion.span>

          {/* Unread badge */}
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5 ring-2 ring-white"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Tooltip */}
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Chat with {persona.name.split(" ")[0]}
            <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900" />
          </span>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop (only on mobile) */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: minimized ? 0 : 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 sm:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Chat Panel */}
            <motion.div
              key="chat-panel"
              initial={{ y: 60, opacity: 0, scale: 0.92 }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
                height: minimized ? 64 : undefined,
              }}
              exit={{ y: 40, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 26, stiffness: 280, mass: 0.8 }}
              drag={minimized ? false : "y"}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => { if (info.offset.y > 140) setIsOpen(false); }}
              style={{ fontSize: `${fontSize}px` }}
              className={`
                fixed z-50
                inset-x-0 bottom-0 sm:inset-auto sm:bottom-6 sm:right-6
                ${minimized ? "h-16" : "h-[88vh] sm:h-[680px] sm:max-h-[85vh]"}
                w-full sm:w-[420px]
                ${theme.bg}
                rounded-t-3xl sm:rounded-3xl
                shadow-2xl shadow-black/40 overflow-hidden flex flex-col
                ring-1 ring-black/5 dark:ring-white/10
              `}
            >
              {/* Drag handle (mobile) */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="sm:hidden flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
              >
                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>

              {/* HEADER */}
              <div className={`relative bg-gradient-to-br ${persona.gradient} text-white flex-shrink-0 overflow-hidden`}>
                {/* Decorative blobs */}
                <div className="absolute -top-10 -right-8 w-32 h-32 bg-white/15 rounded-full blur-2xl" />
                <div className="absolute -bottom-12 left-1/3 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                <div className="relative px-4 py-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setShowPersonaPicker(s => !s)}
                    className="flex items-center gap-3 group min-w-0 flex-1"
                  >
                    <motion.div
                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                      animate={{ rotate: showPersonaPicker ? 180 : [0, 8, -8, 0] }}
                      transition={{ rotate: showPersonaPicker ? { duration: 0.3 } : { duration: 2.4, repeat: Infinity, repeatDelay: 5 } }}
                      className={`relative w-11 h-11 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl shadow-md ring-2 ring-white/30`}
                    >
                      {persona.emoji}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-white animate-pulse" />
                    </motion.div>
                    <div className="text-left min-w-0">
                      <h3 className="font-bold text-sm leading-tight truncate flex items-center gap-1">
                        {persona.name}
                        <Wand2 className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                      </h3>
                      <p className="text-[11px] text-white/85 flex items-center gap-1 truncate">
                        {offlineBrain ? <><Cpu className="w-3 h-3" /> On-device · </> : <><Cloud className="w-3 h-3" /> Cloud AI · </>}
                        {persona.desc}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setShowSearch(s => !s)}
                      className={`w-8 h-8 text-white hover:bg-white/20 rounded-full ${showSearch ? "bg-white/20" : ""}`}>
                      <Search className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setTab(t => t === "settings" ? "chat" : "settings")}
                      className={`w-8 h-8 text-white hover:bg-white/20 rounded-full ${tab === "settings" ? "bg-white/20" : ""}`}>
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setMinimized(m => !m)}
                      className="w-8 h-8 text-white hover:bg-white/20 rounded-full hidden sm:inline-flex">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}
                      className="w-8 h-8 text-white hover:bg-white/20 rounded-full">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Persona quick-switcher */}
                <AnimatePresence>
                  {showPersonaPicker && !minimized && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="relative overflow-hidden"
                    >
                      <div className="px-4 pb-3 grid grid-cols-4 gap-2">
                        {PERSONAS.map(p => (
                          <motion.button key={p.id}
                            whileHover={{ y: -3, scale: 1.05 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => { setPersonaId(p.id); setShowPersonaPicker(false); }}
                            className={`relative rounded-xl p-2 text-center text-white transition-all ${
                              personaId === p.id ? "bg-white/30 ring-2 ring-white" : "bg-white/10 hover:bg-white/20"
                            }`}
                          >
                            <div className="text-2xl">{p.emoji}</div>
                            <div className="text-[10px] mt-0.5 font-medium leading-tight">{p.name.split(" ")[0]}</div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Search */}
                <AnimatePresence>
                  {showSearch && !minimized && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="relative overflow-hidden">
                      <div className="px-4 pb-3">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus
                            placeholder="Search messages…"
                            className="w-full bg-white/20 placeholder-white/60 text-white text-sm rounded-xl pl-9 pr-3 py-2 outline-none border border-white/30 focus:bg-white/25 focus:border-white/50" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* BODY */}
              {!minimized && (
                <AnimatePresence mode="wait">
                  {tab === "settings" ? (
                    <motion.div key="settings"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="flex-1 overflow-y-auto p-5 space-y-6">
                      {/* Persona */}
                      <section>
                        <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> AI Personality
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {PERSONAS.map(p => (
                            <motion.button key={p.id}
                              whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                              onClick={() => { setPersonaId(p.id); setTab("chat"); }}
                              className={`relative text-left p-3 rounded-2xl border-2 transition-all overflow-hidden ${
                                personaId === p.id
                                  ? "border-transparent text-white shadow-lg"
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
                              }`}>
                              {personaId === p.id && (
                                <span className={`absolute inset-0 bg-gradient-to-br ${p.gradient} -z-0`} />
                              )}
                              <div className="relative">
                                <div className="text-2xl mb-1">{p.emoji}</div>
                                <p className={`text-xs font-bold ${personaId === p.id ? "text-white" : "text-slate-900 dark:text-white"}`}>{p.name}</p>
                                <p className={`text-[11px] mt-0.5 ${personaId === p.id ? "text-white/80" : "text-slate-500"}`}>{p.desc}</p>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </section>

                      {/* Theme */}
                      <section>
                        <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">Chat Theme</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {THEMES.map(t => (
                            <motion.button key={t.id} whileTap={{ scale: 0.95 }}
                              onClick={() => setThemeId(t.id)}
                              className={`p-2 rounded-xl border-2 text-center transition-all ${themeId === t.id ? "border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900/50" : "border-slate-200 dark:border-slate-700"}`}>
                              <div className={`w-8 h-8 rounded-full ${t.bg} mx-auto mb-1 ring-1 ring-slate-200 dark:ring-slate-600`} />
                              <p className="text-xs text-slate-600 dark:text-slate-300">{t.name}</p>
                            </motion.button>
                          ))}
                        </div>
                      </section>

                      {/* Brain mode */}
                      <section>
                        <button onClick={() => setOfflineBrain(s => !s)}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                            offlineBrain
                              ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800/60"
                              : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800/60"
                          }`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow ${offlineBrain ? "bg-gradient-to-br from-emerald-500 to-teal-500" : "bg-gradient-to-br from-blue-500 to-indigo-500"}`}>
                              {offlineBrain ? <Cpu className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-white">{offlineBrain ? "On-device Brain" : "Cloud AI"}</h4>
                              <p className="text-xs text-slate-500 mt-1">
                                {offlineBrain
                                  ? "Self-trained, runs in your browser. Tap 👍 / 👎 on replies to train it."
                                  : "Uses OpenAI on the server. Needs internet."}
                              </p>
                            </div>
                            <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${offlineBrain ? "bg-emerald-500" : "bg-blue-500"}`}>
                              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${offlineBrain ? "translate-x-5" : ""}`} />
                            </div>
                          </div>
                        </button>
                      </section>

                      {/* Font */}
                      <section>
                        <div className="flex items-center justify-between mb-2.5">
                          <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Text Size</h4>
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums">{fontSize}px</span>
                        </div>
                        <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} min={12} max={20} step={1} />
                      </section>

                      {/* Sound */}
                      <section>
                        <button onClick={() => setSoundEnabled(s => !s)} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60">
                          <div className="text-left">
                            <h4 className="text-sm font-medium text-slate-800 dark:text-white">🔔 Sound effects</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Soft chime when AI replies</p>
                          </div>
                          <div className={`relative w-11 h-6 rounded-full transition-colors ${soundEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${soundEnabled ? "translate-x-5" : ""}`} />
                          </div>
                        </button>
                      </section>

                      {/* Actions */}
                      <section className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={exportChat} className="flex-1 gap-1.5">
                          <Download className="w-3.5 h-3.5" /> Export
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearChat} className="flex-1 gap-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/40">
                          <Trash2 className="w-3.5 h-3.5" /> Clear
                        </Button>
                      </section>

                      <p className="text-center text-[11px] text-slate-400 pt-2">Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">⌘J</kbd> anywhere to toggle chat</p>
                    </motion.div>
                  ) : (
                    <motion.div key="chat" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex-1 flex flex-col min-h-0 relative">

                      {/* Messages */}
                      <ScrollArea ref={scrollContainerRef} className="flex-1 px-3 py-3">
                        <div className="space-y-4 pb-2">
                          {filteredMessages.map((msg, idx) => {
                            const isUser = msg.role === "user";
                            const showAvatar = !isUser && (idx === 0 || filteredMessages[idx - 1]?.role !== "assistant");
                            return (
                              <motion.div key={msg.id}
                                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                                className={`group flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                                {!isUser && (
                                  <div className={`w-8 h-8 rounded-2xl bg-gradient-to-br ${persona.gradient} flex items-center justify-center text-base shrink-0 shadow-md ${showAvatar ? "" : "invisible"}`}>
                                    {persona.emoji}
                                  </div>
                                )}

                                <div className={`relative max-w-[80%] flex flex-col ${isUser ? "items-end" : "items-start"} gap-1`}>
                                  <motion.div
                                    whileHover={{ scale: 1.01 }}
                                    onDoubleClick={() => setOpenReactionFor(msg.id)}
                                    className={`relative rounded-2xl px-4 py-2.5 shadow-sm ${
                                      isUser
                                        ? `bg-gradient-to-br ${persona.gradient} text-white rounded-br-md`
                                        : `${theme.bubble} rounded-bl-md`
                                    }`}>
                                    {renderText(msg.content)}
                                    <p className={`text-[10px] mt-1 ${isUser ? "text-white/70" : "text-slate-400"}`}>
                                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      {msg.feedback === "up" && <span className="ml-1.5">· trained 👍</span>}
                                      {msg.feedback === "down" && <span className="ml-1.5">· retraining…</span>}
                                    </p>
                                  </motion.div>

                                  {/* Reactions */}
                                  {msg.reactions && msg.reactions.length > 0 && (
                                    <motion.div layout className="flex gap-0.5 flex-wrap -mt-1">
                                      {msg.reactions.map((r, i) => (
                                        <motion.span
                                          key={`${r}-${i}`}
                                          initial={{ scale: 0, y: 8 }} animate={{ scale: 1, y: 0 }}
                                          transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                          className="text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full px-2 py-0.5 shadow-sm">
                                          {r}
                                        </motion.span>
                                      ))}
                                    </motion.div>
                                  )}

                                  {/* Reaction picker (popover) */}
                                  <AnimatePresence>
                                    {openReactionFor === msg.id && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 6, scale: 0.85 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 6, scale: 0.85 }}
                                        className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700"
                                      >
                                        {REACTIONS.map(r => (
                                          <motion.button
                                            key={r}
                                            whileHover={{ scale: 1.4, y: -2 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => addReaction(msg.id, r)}
                                            className="text-base"
                                          >{r}</motion.button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {/* Toolbar (shown on hover) */}
                                  <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 -mt-0.5">
                                    <button onClick={() => setOpenReactionFor(o => o === msg.id ? null : msg.id)}
                                      title="Add reaction"
                                      className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                      <Smile className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => copyMessage(msg.id, msg.content)} title="Copy"
                                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                    {!isUser && msg.intent && (
                                      <>
                                        <button onClick={() => giveFeedback(msg.id, true)} title="Helpful — train Peace"
                                          className={`p-1 rounded transition-colors ${msg.feedback === "up" ? "text-green-500 bg-green-50 dark:bg-green-900/20" : "text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"}`}>
                                          <ThumbsUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => giveFeedback(msg.id, false)} title="Not helpful"
                                          className={`p-1 rounded transition-colors ${msg.feedback === "down" ? "text-rose-500 bg-rose-50 dark:bg-rose-900/20" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"}`}>
                                          <ThumbsDown className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {/* Suggestions */}
                                  {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                                    <motion.div
                                      initial="hidden" animate="show"
                                      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                                      className="flex flex-wrap gap-1.5 mt-2"
                                    >
                                      {msg.suggestions.map((s, i) => (
                                        <motion.button
                                          key={`${msg.id}-sug-${i}`}
                                          variants={{ hidden: { opacity: 0, y: 6, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1 } }}
                                          whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                          onClick={() => sendMessage(s)}
                                          disabled={isPending}
                                          className={`text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/60 backdrop-blur hover:border-transparent hover:shadow-md transition-all text-slate-700 dark:text-slate-200 disabled:opacity-50 hover:text-white`}
                                          style={{ '--tw-gradient-from': '' } as any}
                                        >
                                          <span className="relative">{s}</span>
                                        </motion.button>
                                      ))}
                                    </motion.div>
                                  )}
                                </div>

                                {isUser && (
                                  <div className={`w-8 h-8 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 rounded-2xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm`}>
                                    {user?.firstName?.[0] || user?.email?.[0] || "U"}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}

                          {/* Typing */}
                          <AnimatePresence>
                            {(chatMutation.isPending) && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="flex items-end gap-2"
                              >
                                <div className={`w-8 h-8 rounded-2xl bg-gradient-to-br ${persona.gradient} flex items-center justify-center text-base shadow-md`}>{persona.emoji}</div>
                                <div className={`${theme.bubble} rounded-2xl rounded-bl-md px-4 py-3 shadow-sm`}>
                                  <TypingDots gradient={persona.gradient} />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {filteredMessages.length === 0 && searchQuery && (
                            <div className="text-center py-12 text-slate-400 text-sm">
                              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              No messages match "{searchQuery}"
                            </div>
                          )}

                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>

                      {/* Jump to bottom */}
                      <AnimatePresence>
                        {scrolledUp && (
                          <motion.button
                            initial={{ opacity: 0, y: 12, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.8 }}
                            onClick={() => { setScrolledUp(false); setUnread(0); scrollToBottom(); }}
                            className={`absolute bottom-32 right-3 w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-110 transition-transform`}
                          >
                            <ArrowDown className="w-4 h-4" />
                            {unread > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white dark:ring-slate-800">
                                {unread > 9 ? "9+" : unread}
                              </span>
                            )}
                          </motion.button>
                        )}
                      </AnimatePresence>

                      {/* Mood dock */}
                      <AnimatePresence>
                        {showMoodDock && (
                          <motion.div
                            initial={{ opacity: 0, y: 20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: 20, height: 0 }}
                            className="px-3 pt-2 pb-1 border-t border-slate-100 dark:border-slate-700/50 overflow-hidden"
                          >
                            <p className="text-[11px] text-slate-400 mb-2 px-1 flex items-center gap-1">
                              <Zap className="w-3 h-3" /> Quick prompts
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {QUICK_MOODS.map((m, i) => (
                                <motion.button
                                  key={m.label}
                                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.04 }}
                                  whileHover={{ y: -2, scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  onClick={() => sendMessage(m.msg)}
                                  className="text-xs pl-2 pr-3 py-1.5 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 hover:shadow-md text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition-all flex items-center gap-1"
                                >
                                  <span className="text-sm">{m.emoji}</span> {m.label}
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Input bar */}
                      <div className="px-3 pb-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex-shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur">
                        <motion.div
                          animate={{ scale: isListening ? 1.02 : 1 }}
                          className={`flex items-end gap-2 p-1.5 pr-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 ring-1 ${isListening ? "ring-red-400 bg-red-50 dark:bg-red-900/20" : "ring-slate-200 dark:ring-slate-700"} focus-within:ring-2 focus-within:ring-blue-400 transition-all`}
                        >
                          <Button variant="ghost" size="icon" onClick={() => setShowMoodDock(s => !s)} title="Quick prompts"
                            className={`w-9 h-9 rounded-xl shrink-0 ${showMoodDock ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20" : "text-slate-400 hover:text-slate-600"}`}>
                            <Sparkles className="w-4 h-4" />
                          </Button>

                          <Textarea
                            ref={inputRef}
                            value={inputMessage}
                            onChange={e => setInputMessage(e.target.value.slice(0, charLimit))}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder={isListening ? "Listening…" : "Type a message…"}
                            className="resize-none min-h-[36px] max-h-32 text-sm border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 py-2 placeholder-slate-400"
                            rows={1}
                            disabled={isPending}
                          />

                          {isListening && (
                            <div className="flex items-center px-2"><VoiceWave /></div>
                          )}

                          <Button variant="ghost" size="icon" onClick={() => {
                            if (!recognitionRef.current) { toast({ title: "Voice not supported in this browser" }); return; }
                            if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
                            else { setIsListening(true); recognitionRef.current.start(); }
                          }} title="Voice input"
                            className={`w-9 h-9 rounded-xl shrink-0 ${isListening ? "text-red-500 bg-red-100 dark:bg-red-900/30" : "text-slate-400 hover:text-slate-600"}`}>
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </Button>

                          <motion.button
                            whileHover={inputMessage.trim() && !isPending ? { scale: 1.06, rotate: -8 } : undefined}
                            whileTap={inputMessage.trim() && !isPending ? { scale: 0.92 } : undefined}
                            onClick={() => sendMessage()}
                            disabled={!inputMessage.trim() || isPending}
                            className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center transition-all ${
                              inputMessage.trim() && !isPending
                                ? `bg-gradient-to-br ${persona.gradient} text-white shadow-md`
                                : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            {isPending ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white" />
                              </motion.div>
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </motion.button>
                        </motion.div>

                        {/* Footer hint */}
                        <div className="flex items-center justify-between px-2 mt-1.5 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            {offlineBrain ? <><Cpu className="w-3 h-3 text-emerald-500" /> Self-trained brain</> : <><Cloud className="w-3 h-3 text-blue-500" /> Cloud AI</>}
                          </span>
                          <span className={`tabular-nums ${charCount > charLimit * 0.85 ? "text-amber-500 font-medium" : ""}`}>
                            {charCount}/{charLimit}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
