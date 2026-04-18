import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, X, Send, Mic, MicOff, Settings, Trash2, Download,
  ChevronDown, Sparkles, Heart, BookOpen, Smile, RefreshCw,
  Search, Volume2, VolumeX, Sun, Moon, MessageSquare, Copy, Check
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  reactions?: string[];
  mood?: string;
  suggestions?: string[];
}

const STORAGE_KEY = "peaceboard_chat_v2";
const PREFS_KEY = "peaceboard_chat_prefs_v2";

interface Persona {
  id: string; name: string; emoji: string; desc: string;
  greeting: string; color: string; gradient: string;
}

interface Theme {
  id: string; name: string;
  bg: string; header: string; bubble: string; userBubble: string; accent: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const PERSONAS: Persona[] = [
  { id: "friend", name: "Supportive Friend", emoji: "🤗", desc: "Warm, casual, and encouraging",
    greeting: "Hey! I'm so glad you're here. What's on your mind today? I'm all ears! 💙",
    color: "text-blue-600", gradient: "from-blue-500 to-cyan-500" },
  { id: "mentor", name: "Wise Mentor", emoji: "🦉", desc: "Thoughtful, insightful, and wise",
    greeting: "Welcome. Every conversation begins with courage. What would you like to explore today?",
    color: "text-violet-600", gradient: "from-violet-500 to-purple-600" },
  { id: "coach", name: "Playful Coach", emoji: "⚡", desc: "Energetic, fun, and motivating",
    greeting: "Let's GO! 🚀 You showed up today and that already makes you amazing. What are we working on?",
    color: "text-orange-600", gradient: "from-orange-500 to-pink-500" },
  { id: "guide", name: "Calm Guide", emoji: "🌿", desc: "Peaceful, mindful, and grounding",
    greeting: "Take a gentle breath. You're safe here. 🌿 How are you feeling in this moment?",
    color: "text-green-600", gradient: "from-green-500 to-teal-500" },
];

const THEMES: Theme[] = [
  { id: "light", name: "Light", bg: "bg-white", header: "from-blue-500 to-indigo-600",
    bubble: "bg-white shadow-sm text-slate-800", userBubble: "from-blue-500 to-indigo-600 text-white", accent: "blue" },
  { id: "dark", name: "Night", bg: "bg-slate-900", header: "from-slate-800 to-slate-700",
    bubble: "bg-slate-700 text-slate-100", userBubble: "from-indigo-600 to-purple-700 text-white", accent: "indigo" },
  { id: "nature", name: "Nature", bg: "bg-green-50", header: "from-green-500 to-teal-600",
    bubble: "bg-white shadow-sm text-slate-800", userBubble: "from-green-500 to-teal-600 text-white", accent: "green" },
  { id: "sunset", name: "Sunset", bg: "bg-orange-50", header: "from-orange-500 to-pink-500",
    bubble: "bg-white shadow-sm text-slate-800", userBubble: "from-orange-500 to-pink-500 text-white", accent: "orange" },
];

const QUICK_MOODS = [
  { label: "😢 I'm sad", msg: "I'm feeling sad right now and could use some support." },
  { label: "😰 Anxious", msg: "I'm feeling anxious. Can you help me calm down?" },
  { label: "😡 Frustrated", msg: "I'm really frustrated and need to talk about it." },
  { label: "🤩 Excited!", msg: "Something great happened! I'm feeling really excited!" },
  { label: "💭 Need advice", msg: "I need some advice on a situation I'm dealing with." },
  { label: "🌱 Just chatting", msg: "I just want to have a nice conversation today." },
];

const REACTIONS = ["❤️", "😊", "👍", "💡", "🌟", "🙏"];

function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-2 h-2 bg-slate-400 rounded-full"
          animate={{ y: [-3, 0, -3] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  );
}

// Safely render a tiny markdown subset (**bold**, *italic*, bullet lines).
// Escapes all HTML first to prevent XSS from model output (or persisted history).
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderText(text: string) {
  return text.split("\n").map((line, i) => {
    const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("• ");
    const stripped = line.replace(/^[-•]\s/, "");
    const safe = escapeHtml(stripped)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
    return (
      <p
        key={i}
        className={`text-sm leading-relaxed ${isBullet ? "pl-3 before:content-['•'] before:mr-1.5" : ""} ${i > 0 ? "mt-1" : ""}`}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FloatingChatbot() {
  // Load saved preferences once
  const savedPrefs = (() => {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { return {}; }
  })();

  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "settings">("chat");
  const [personaId, setPersonaId] = useState<string>(savedPrefs.personaId || "friend");
  const [themeId, setThemeId] = useState<string>(savedPrefs.themeId || "light");
  const [fontSize, setFontSize] = useState<number>(savedPrefs.fontSize || 14);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(savedPrefs.soundEnabled ?? true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showMoods, setShowMoods] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const persona = PERSONAS.find(p => p.id === personaId) || PERSONAS[0];
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

  // Load conversation from localStorage (or seed with persona greeting)
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

  // Persist conversation
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60))); } catch {}
  }, [messages]);

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ personaId, themeId, fontSize, soundEnabled }));
    } catch {}
  }, [personaId, themeId, fontSize, soundEnabled]);

  // Reset greeting when persona changes (only if conversation is empty / fresh)
  useEffect(() => {
    setMessages(prev => {
      const onlyGreeting = prev.length <= 1;
      if (onlyGreeting) {
        return [{ id: "init", role: "assistant", content: persona.greeting, timestamp: new Date() }];
      }
      return prev;
    });
  }, [personaId]);

  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => { setInputMessage(e.results[0][0].transcript); setIsListening(false); };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
  }, []);

  const playPop = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 520; osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, [soundEnabled]);

  const chatMutation = useMutation({
    mutationFn: async (payload: { msg: string; history: { role: string; content: string }[] }) => {
      const res = await apiRequest("POST", "/api/chat", {
        userId: user?.id || null,
        message: payload.msg,
        history: payload.history,
        persona: personaId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const suggestions = Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 3) : [];
      const newMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        suggestions,
      };
      setMessages(prev => [...prev, newMsg]);
      playPop();
    },
    onError: () => toast({ title: "Could not reach AI. Please try again.", variant: "destructive" }),
  });

  const sendMessage = (text = inputMessage) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Build history from current messages (excluding the seed greeting "init") for context
    const history = messages
      .filter(m => m.id !== "init" || messages.length > 1)
      .map(m => ({ role: m.role, content: m.content }));
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    chatMutation.mutate({ msg: trimmed, history });
    setInputMessage("");
    setShowMoods(false);
  };

  const copyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(c => (c === id ? null : c)), 1400);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  // Auto-focus input when chat panel opens
  useEffect(() => {
    if (isOpen && tab === "chat") {
      const t = setTimeout(() => inputRef.current?.focus(), 280);
      return () => clearTimeout(t);
    }
  }, [isOpen, tab]);

  const addReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => m.id === msgId
      ? { ...m, reactions: m.reactions?.includes(emoji) ? m.reactions.filter(r => r !== emoji) : [...(m.reactions || []), emoji] }
      : m));
  };

  const exportChat = () => {
    const text = messages.map(m => `[${m.role.toUpperCase()}] ${m.timestamp.toLocaleTimeString()}\n${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "peace-chat.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const clearChat = () => {
    setMessages([{ id: "init", role: "assistant", content: persona.greeting, timestamp: new Date() }]);
    setShowMoods(true);
  };

  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <>
      {/* Floating button */}
      <motion.div className="fixed bottom-6 right-6 z-40" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.93 }}>
        <Button onClick={() => setIsOpen(true)}
          className={`w-16 h-16 rounded-full bg-gradient-to-br ${persona.gradient} text-white shadow-2xl`} size="icon">
          <Bot className="w-8 h-8" />
        </Button>
        {!isOpen && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1">
            <span className="text-lg">{persona.emoji}</span>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setIsOpen(false)} />

            <motion.div initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className={`fixed right-0 top-0 h-full w-full max-w-md ${theme.bg} shadow-2xl z-50 flex flex-col`}
              style={{ fontSize: `${fontSize}px` }}>

              {/* Header */}
              <div className={`bg-gradient-to-r ${persona.gradient} px-5 py-4 text-white flex-shrink-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                      className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                      {persona.emoji}
                    </motion.div>
                    <div>
                      <h3 className="font-bold text-sm">{persona.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-xs text-white/80">Online · AI Assistant</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setShowSearch(s => !s)}
                      className="w-8 h-8 text-white hover:bg-white/20 rounded-full">
                      <Search className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setTab(t => t === "settings" ? "chat" : "settings")}
                      className="w-8 h-8 text-white hover:bg-white/20 rounded-full">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}
                      className="w-8 h-8 text-white hover:bg-white/20 rounded-full">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Search bar */}
                <AnimatePresence>
                  {showSearch && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3">
                      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search messages…" className="w-full bg-white/20 placeholder-white/60 text-white text-sm rounded-xl px-3 py-2 outline-none border border-white/30" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                {tab === "settings" ? (
                  <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex-1 overflow-y-auto p-5 space-y-6">

                    {/* Persona */}
                    <section>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">AI Personality</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {PERSONAS.map(p => (
                          <button key={p.id} onClick={() => { setPersonaId(p.id); setTab("chat"); }}
                            className={`text-left p-3 rounded-xl border-2 transition-all ${personaId === p.id ? `border-blue-400 bg-blue-50 dark:bg-blue-900/20` : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                            <div className="text-xl mb-1">{p.emoji}</div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">{p.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Theme */}
                    <section>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">Chat Theme</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {THEMES.map(t => (
                          <button key={t.id} onClick={() => setThemeId(t.id)}
                            className={`p-2 rounded-xl border-2 text-center transition-all ${themeId === t.id ? "border-blue-400" : "border-slate-200 dark:border-slate-700"}`}>
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.header} mx-auto mb-1`} />
                            <p className="text-xs text-slate-600 dark:text-slate-300">{t.name}</p>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Font size */}
                    <section>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">
                        Text Size — {fontSize}px
                      </h4>
                      <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} min={12} max={20} step={1} />
                    </section>

                    {/* Sound */}
                    <section>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sound Effects</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Soft chime when AI replies</p>
                        </div>
                        <button onClick={() => setSoundEnabled(s => !s)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${soundEnabled ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`}>
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${soundEnabled ? "translate-x-5" : ""}`} />
                        </button>
                      </div>
                    </section>

                    {/* Actions */}
                    <section className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={exportChat} className="flex-1 gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Export Chat
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearChat} className="flex-1 gap-1.5 text-red-500 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" /> Clear Chat
                      </Button>
                    </section>
                  </motion.div>
                ) : (
                  <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">

                    {/* Messages */}
                    <ScrollArea className="flex-1 px-4 py-3">
                      <div className="space-y-4">
                        {filteredMessages.map((msg) => (
                          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className={`group flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                            {msg.role === "assistant" && (
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${persona.gradient} flex items-center justify-center text-sm shrink-0`}>
                                {persona.emoji}
                              </div>
                            )}

                            <div className={`relative max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                              <div className={`rounded-2xl px-4 py-3 ${msg.role === "user"
                                ? `bg-gradient-to-br ${persona.gradient} text-white rounded-br-sm`
                                : `${theme.bubble} rounded-bl-sm border border-slate-100 dark:border-slate-600`}`}>
                                {renderText(msg.content)}
                                <p className={`text-xs mt-1.5 ${msg.role === "user" ? "text-white/60" : "text-slate-400"}`}>
                                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>

                              {/* Reactions */}
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className="flex gap-0.5 flex-wrap">
                                  {msg.reactions.map((r, i) => (
                                    <span key={i} className="text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full px-1.5 py-0.5 shadow-sm">{r}</span>
                                  ))}
                                </div>
                              )}

                              {/* Reaction picker + copy on hover */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 mt-0.5">
                                {REACTIONS.map(r => (
                                  <button key={r} onClick={() => addReaction(msg.id, r)}
                                    className="text-sm hover:scale-125 transition-transform p-0.5">{r}</button>
                                ))}
                                <button onClick={() => copyMessage(msg.id, msg.content)}
                                  title="Copy"
                                  className="ml-1 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                                  {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>

                              {/* Smart follow-up suggestions */}
                              {msg.role === "assistant" && msg.suggestions && msg.suggestions.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {msg.suggestions.map((s, i) => (
                                    <button
                                      key={`${msg.id}-sug-${i}`}
                                      onClick={() => sendMessage(s)}
                                      disabled={chatMutation.isPending}
                                      className={`text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-800/60 hover:bg-gradient-to-r hover:${persona.gradient} hover:text-white hover:border-transparent transition-all text-slate-700 dark:text-slate-200 disabled:opacity-50`}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {msg.role === "user" && (
                              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0">
                                {user?.firstName?.[0] || user?.email?.[0] || "U"}
                              </div>
                            )}
                          </motion.div>
                        ))}

                        {chatMutation.isPending && (
                          <div className="flex items-end gap-2">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${persona.gradient} flex items-center justify-center text-sm`}>{persona.emoji}</div>
                            <div className={`${theme.bubble} rounded-2xl rounded-bl-sm px-4 py-3 border border-slate-100 dark:border-slate-600`}>
                              <TypingDots />
                            </div>
                          </div>
                        )}

                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Mood quick tags */}
                    <AnimatePresence>
                      {showMoods && messages.length <= 2 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }} className="px-4 py-2 border-t border-slate-100 dark:border-slate-700">
                          <p className="text-xs text-slate-400 mb-2">How are you feeling?</p>
                          <div className="flex flex-wrap gap-1.5">
                            {QUICK_MOODS.map(m => (
                              <button key={m.label} onClick={() => sendMessage(m.msg)}
                                className="text-xs px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-300">
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Input area */}
                    <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                          <Textarea
                            ref={inputRef}
                            value={inputMessage}
                            onChange={e => setInputMessage(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="Type a message… (Shift+Enter for new line)"
                            className="resize-none min-h-[44px] max-h-32 pr-10 text-sm rounded-2xl border-slate-200 dark:border-slate-600"
                            rows={1}
                            disabled={chatMutation.isPending}
                          />
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (!recognitionRef.current) return;
                            if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
                            else { setIsListening(true); recognitionRef.current.start(); }
                          }}
                            className={`absolute right-2 bottom-2 w-6 h-6 ${isListening ? "text-red-500" : "text-slate-400"}`}>
                            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                        <Button onClick={() => sendMessage()} disabled={!inputMessage.trim() || chatMutation.isPending}
                          className={`bg-gradient-to-br ${persona.gradient} text-white shadow-md w-11 h-11 rounded-2xl p-0 flex-shrink-0`}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-400 text-center mt-2">
                        {persona.emoji} {persona.name} · Tap Settings to customize
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
