import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Trash2, CheckCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  AppNotification, listNotifications, unreadCount,
  markAllRead, markRead, clearAll, NOTIFICATIONS_EVENT,
} from "@/lib/notifications";

const TYPE_STYLE: Record<string, string> = {
  achievement: "from-amber-400 to-orange-500",
  streak:      "from-rose-500 to-pink-500",
  invite:      "from-purple-500 to-fuchsia-500",
  system:      "from-slate-400 to-slate-600",
  diary:       "from-indigo-500 to-purple-500",
  game:        "from-emerald-500 to-teal-500",
};

function timeAgo(t: number) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationsCenter() {
  const { user } = useAuth();
  const uid = user?.id || "";
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  const refresh = () => {
    setList(listNotifications(uid));
    setUnread(unreadCount(uid));
  };

  useEffect(() => {
    if (!uid) return;
    refresh();
    const onEvt = () => refresh();
    window.addEventListener(NOTIFICATIONS_EVENT, onEvt);
    window.addEventListener("storage", onEvt);
    const t = setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener(NOTIFICATIONS_EVENT, onEvt);
      window.removeEventListener("storage", onEvt);
      clearInterval(t);
    };
  }, [uid]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!uid) return null;

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        className="relative w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-[340px] max-w-[92vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Notifications</span>
                {unread > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300">{unread} new</span>}
              </div>
              <div className="flex items-center gap-1">
                {list.length > 0 && (
                  <>
                    <button
                      onClick={() => { markAllRead(uid); refresh(); }}
                      title="Mark all as read"
                      className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { clearAll(uid); refresh(); }}
                      title="Clear all"
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {list.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  You're all caught up! ✨
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {list.map(n => (
                    <motion.li
                      key={n.id}
                      layout
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${n.title}${n.read ? "" : " (unread)"}`}
                      onClick={() => {
                        markRead(uid, n.id);
                        if (n.href) setLocation(n.href);
                        setOpen(false);
                        refresh();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          markRead(uid, n.id);
                          if (n.href) setLocation(n.href);
                          setOpen(false);
                          refresh();
                        }
                      }}
                      className={`px-3 py-3 flex gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/60 ${!n.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                    >
                      <div className={`w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br ${TYPE_STYLE[n.type] || TYPE_STYLE.system} flex items-center justify-center text-white text-base shadow-sm`}>
                        {n.emoji || "🔔"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{n.title}</p>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                        </div>
                        {n.body && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
