// Lightweight in-app notifications, persisted per user in localStorage.
// Used by the bell-icon dropdown in the navigation bar.

export type NotificationType =
  | "achievement" | "streak" | "invite" | "system" | "diary" | "game";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  emoji?: string;
  createdAt: number;
  read?: boolean;
}

const KEY = (uid: string) => `peaceboard_notifications_${uid || "guest"}`;
const EVT = "peaceboard-notifications";
const MAX = 50;

function load(uid: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY(uid));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function save(uid: string, list: AppNotification[]) {
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent(EVT, { detail: { uid } }));
  } catch {}
}

export function listNotifications(uid: string): AppNotification[] {
  return load(uid).sort((a, b) => b.createdAt - a.createdAt);
}

export function unreadCount(uid: string): number {
  return load(uid).filter(n => !n.read).length;
}

export function pushNotification(uid: string, n: Omit<AppNotification, "id" | "createdAt" | "read">) {
  if (!uid) return;
  const list = load(uid);
  // Dedupe identical title+type within last 60s
  const now = Date.now();
  const dupe = list.find(x => x.title === n.title && x.type === n.type && now - x.createdAt < 60_000);
  if (dupe) return;
  list.unshift({ ...n, id: `n_${now}_${Math.random().toString(36).slice(2, 7)}`, createdAt: now, read: false });
  save(uid, list);
}

export function markAllRead(uid: string) {
  const list = load(uid).map(n => ({ ...n, read: true }));
  save(uid, list);
}

export function markRead(uid: string, id: string) {
  const list = load(uid).map(n => n.id === id ? { ...n, read: true } : n);
  save(uid, list);
}

export function clearAll(uid: string) {
  save(uid, []);
}

export const NOTIFICATIONS_EVENT = EVT;
