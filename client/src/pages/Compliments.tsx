import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Heart, Eye, EyeOff, Flag, Sparkles, Search, Inbox, ScrollText } from "lucide-react";
import Confetti from "@/components/Confetti";

type Recipient = { id: string; name: string; userType: string };
type InboxNote = {
  id: number; message: string; emoji: string | null;
  readAt: string | null; createdAt: string; isHidden: boolean; isFlagged: boolean;
};
type SentNote = InboxNote & { recipientId: string };

const STARTERS = [
  "I noticed how you helped today —",
  "Something I admire about you is",
  "You made me smile when",
  "Your kindness showed when",
  "I really appreciate that you",
];
const EMOJIS = ["💖","🌟","🌈","🌻","🦋","☀️","🤗","✨","🍀","🌸"];

export default function Compliments() {
  useDocumentTitle("Anonymous Compliments");
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"inbox" | "compose" | "sent">("inbox");
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // Compose state
  const [recipientId, setRecipientId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [emoji, setEmoji] = useState<string>("💖");
  const [search, setSearch] = useState("");

  const isGuest = !user || user.userType === "guest";

  const inboxQuery = useQuery<InboxNote[]>({
    queryKey: ["/api/compliments/inbox"],
    enabled: !!user && !isGuest,
  });
  const sentQuery = useQuery<SentNote[]>({
    queryKey: ["/api/compliments/sent"],
    enabled: !!user && !isGuest,
  });
  const recipientsQuery = useQuery<Recipient[]>({
    queryKey: ["/api/compliments/recipients"],
    enabled: !!user && !isGuest && tab === "compose",
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/compliments", { recipientId, message, emoji });
    },
    onSuccess: () => {
      toast({ title: "Sent anonymously ✨", description: "Your kindness is on its way." });
      setMessage(""); setRecipientId(""); setEmoji("💖");
      setConfettiTrigger((t) => t + 1);
      queryClient.invalidateQueries({ queryKey: ["/api/compliments/sent"] });
      setTab("sent");
    },
    onError: (e: any) => {
      toast({ title: "Couldn't send", description: e?.message || "Please try again.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "read" | "hide" | "flag" }) => {
      return apiRequest("PATCH", `/api/compliments/${id}`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliments/inbox"] });
    },
  });

  const filteredRecipients = useMemo(() => {
    const list = recipientsQuery.data || [];
    if (!search.trim()) return list.slice(0, 25);
    const q = search.toLowerCase();
    return list.filter(r => r.name.toLowerCase().includes(q)).slice(0, 25);
  }, [recipientsQuery.data, search]);

  const unreadCount = (inboxQuery.data || []).filter(n => !n.readAt).length;
  const sentCount = sentQuery.data?.length || 0;
  const canSend = !!recipientId && message.trim().length >= 4 && !sendMutation.isPending;

  if (isGuest) {
    return (
      <div className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Mail className="w-16 h-16 mx-auto text-rose-500 mb-4" />
          <h1 className="text-3xl font-bold mb-3 text-slate-900 dark:text-white">Anonymous Compliments</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Sign in with a school or student account to send and receive kind, anonymous notes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <Confetti trigger={confettiTrigger} />
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200 mb-3">
            <Heart className="w-3 h-3 mr-1" /> Spread kindness, anonymously
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Compliment Box</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2">
            Send a kind note — your name stays hidden. Receive notes from classmates that brighten your day.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
          {[
            { id: "inbox" as const,   label: "Inbox",      icon: Inbox,      badge: unreadCount },
            { id: "compose" as const, label: "Send a note",icon: Send,       badge: 0 },
            { id: "sent" as const,    label: "Sent",       icon: ScrollText, badge: sentCount },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-rose-500 text-rose-600 dark:text-rose-300"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <t.icon className="w-4 h-4" /> {t.label}
              {t.badge > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold rounded-full bg-rose-500 text-white">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Inbox tab */}
        {tab === "inbox" && (
          <div>
            {inboxQuery.isLoading && <p className="text-slate-500">Loading your notes…</p>}
            {!inboxQuery.isLoading && (inboxQuery.data?.length ?? 0) === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Mail className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-600 dark:text-slate-300">No notes yet. Send one to spark a chain of kindness.</p>
                  <Button onClick={() => setTab("compose")} className="mt-4 bg-rose-500 hover:bg-rose-600 text-white">
                    Send the first one
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {(inboxQuery.data || []).map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onRead={() => !note.readAt && updateMutation.mutate({ id: note.id, action: "read" })}
                    onHide={() => updateMutation.mutate({ id: note.id, action: "hide" })}
                    onFlag={() => {
                      if (confirm("Hide this note and report it as unkind?")) {
                        updateMutation.mutate({ id: note.id, action: "flag" });
                      }
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Compose tab */}
        {tab === "compose" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-rose-500" /> Send anonymously</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Recipient picker */}
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 block">
                  Who's it for?
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search classmates by name…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {recipientsQuery.isLoading && <p className="text-sm text-slate-500">Loading classmates…</p>}
                <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecipients.length === 0 && !recipientsQuery.isLoading && (
                    <p className="p-3 text-sm text-slate-500">No matches yet — try a different name.</p>
                  )}
                  {filteredRecipients.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRecipientId(r.id)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors ${
                        recipientId === r.id ? "bg-rose-50 dark:bg-rose-900/30" : ""
                      }`}
                      aria-pressed={recipientId === r.id}
                    >
                      <span className="font-medium text-slate-900 dark:text-white">{r.name}</span>
                      <span className="text-xs text-slate-500 capitalize">{r.userType.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 block">
                  Your kind words ({message.length}/280)
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 280))}
                  placeholder="Tell them what you appreciate…"
                  rows={5}
                  className="resize-none"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {STARTERS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setMessage((m) => (m ? m : s + " "))}
                      className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                    >
                      {s}…
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji */}
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 block">Pick a sparkle</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={`w-10 h-10 rounded-full text-xl border-2 transition-all ${
                        emoji === e ? "border-rose-500 bg-rose-50 dark:bg-rose-900/30 scale-110" : "border-transparent bg-slate-100 dark:bg-slate-800"
                      }`}
                      aria-pressed={emoji === e}
                      aria-label={`Choose ${e}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-800 dark:text-rose-200">
                Your name stays hidden. Notes are kindness-only — unkind words can be reported by the recipient.
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setMessage(""); setRecipientId(""); }}>Clear</Button>
                <Button
                  onClick={() => sendMutation.mutate()}
                  disabled={!canSend}
                  className="bg-rose-500 hover:bg-rose-600 text-white"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  {sendMutation.isPending ? "Sending…" : "Send anonymously"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sent tab */}
        {tab === "sent" && (
          <div>
            {sentQuery.isLoading && <p className="text-slate-500">Loading…</p>}
            {!sentQuery.isLoading && (sentQuery.data?.length ?? 0) === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Send className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-600 dark:text-slate-300">You haven't sent any notes yet.</p>
                </CardContent>
              </Card>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(sentQuery.data || []).map(note => (
                <Card key={note.id} className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/30 border-rose-200 dark:border-rose-800">
                  <CardContent className="pt-5">
                    <div className="text-3xl mb-2">{note.emoji || "💖"}</div>
                    <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed mb-3">{note.message}</p>
                    <p className="text-[11px] text-slate-500">
                      Sent {new Date(note.createdAt).toLocaleDateString()} · stays anonymous
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, onRead, onHide, onFlag }: {
  note: InboxNote;
  onRead: () => void;
  onHide: () => void;
  onFlag: () => void;
}) {
  const [opened, setOpened] = useState(!!note.readAt);
  const handleOpen = () => {
    setOpened(true);
    onRead();
  };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card className={`relative overflow-hidden border-2 transition-all ${
        opened
          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          : "bg-gradient-to-br from-amber-100 via-rose-100 to-pink-100 dark:from-amber-900/30 dark:via-rose-900/30 dark:to-pink-900/30 border-amber-300 dark:border-amber-700 shadow-md"
      }`}>
        <CardContent className="pt-5 pb-4">
          {!opened ? (
            <button
              type="button"
              onClick={handleOpen}
              className="w-full text-center py-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-lg"
              aria-label="Open anonymous compliment"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl mb-2"
              >
                ✉️
              </motion.div>
              <p className="font-semibold text-slate-800 dark:text-white">A kind note for you</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Tap to open</p>
            </button>
          ) : (
            <>
              <div className="text-3xl mb-2">{note.emoji || "💖"}</div>
              <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed mb-3">{note.message}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <button onClick={onHide} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Hide this note">
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={onFlag} className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600" aria-label="Report unkind">
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
        {!note.readAt && opened && (
          <div className="absolute top-2 right-2">
            <Eye className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        )}
      </Card>
    </motion.div>
  );
}
