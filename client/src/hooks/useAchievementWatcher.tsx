import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Confetti from "@/components/Confetti";
import { pingStreak } from "@/lib/streak";
import { pushNotification } from "@/lib/notifications";

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
const POINT_MILESTONES = [50, 100, 250, 500, 1000, 2500];

// Watches the logged-in user's progress + achievements + streak and fires
// celebratory toasts (with confetti) when something new happens.
// Persists last-seen counters per user in localStorage so it doesn't refire
// on page refresh.
export function AchievementWatcher() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const initialized = useRef(false);

  const { data: progress = [] } = useQuery<any[]>({
    queryKey: [`/api/progress/${user?.id}`],
    enabled: !!user,
  });
  const { data: achievements = [] } = useQuery<any[]>({
    queryKey: [`/api/achievements/${user?.id}`],
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const completed = progress.filter((p: any) => p.completed).length;
    const points = progress.reduce((s: number, p: any) => s + (p.pointsEarned || 0), 0);
    const ach = achievements.length;

    // Streak (last 60d)
    const days = new Set<string>();
    for (const p of progress) {
      if (p.completedAt) days.add(new Date(p.completedAt).toISOString().slice(0, 10));
    }
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      if (days.has(d.toISOString().slice(0, 10))) streak++;
      else if (i === 0) continue;
      else break;
    }

    const key = `peaceboard_seen_${user.id}`;
    let seen = { completed: 0, points: 0, ach: 0, streak: 0 };
    try {
      const raw = localStorage.getItem(key);
      if (raw) seen = { ...seen, ...JSON.parse(raw) };
    } catch {}

    // First mount with no saved state: just record current values, no toasts.
    if (!initialized.current) {
      initialized.current = true;
      try { localStorage.setItem(key, JSON.stringify({ completed, points, ach, streak })); } catch {}
      return;
    }

    let celebrated = false;

    // New game completion
    if (completed > seen.completed) {
      const delta = completed - seen.completed;
      toast({
        title: delta === 1 ? "Game completed!" : `${delta} games completed!`,
        description: "Nice work — keep that streak going.",
      });
      celebrated = true;
      const ping = pingStreak(user.id);
      pushNotification(user.id, {
        type: "game", emoji: "🎮",
        title: delta === 1 ? "Game completed!" : `${delta} games completed`,
        body: "Your effort is paying off. See your progress on the profile.",
        href: "/profile",
      });
      if (ping.milestone) {
        pushNotification(user.id, {
          type: "streak", emoji: "🔥",
          title: `${ping.milestone}-day kindness streak!`,
          body: "You showed up — that matters.",
          href: "/profile",
        });
      }
    }

    // New achievement(s)
    if (ach > seen.ach) {
      const newest: any = achievements[0];
      toast({
        title: `🏆 New achievement: ${newest?.title || "Badge unlocked"}!`,
        description: newest?.description || "You earned a new badge.",
      });
      celebrated = true;
      pushNotification(user.id, {
        type: "achievement", emoji: "🏆",
        title: `Achievement: ${newest?.title || "Badge unlocked"}`,
        body: newest?.description || "You earned a new badge.",
        href: "/profile",
      });
    }

    // Point milestones
    for (const m of POINT_MILESTONES) {
      if (seen.points < m && points >= m) {
        toast({
          title: `✨ ${m} points reached!`,
          description: "Your kindness is adding up.",
        });
        celebrated = true;
        pushNotification(user.id, {
          type: "achievement", emoji: "✨",
          title: `${m} points reached`,
          body: "Your kindness is adding up. Keep going!",
          href: "/profile",
        });
      }
    }

    // Streak milestones
    for (const m of STREAK_MILESTONES) {
      if (seen.streak < m && streak >= m) {
        toast({
          title: `🔥 ${m}-day streak!`,
          description: "Consistency is everything — amazing.",
        });
        celebrated = true;
      }
    }

    if (celebrated) setConfettiTrigger((n) => n + 1);

    try { localStorage.setItem(key, JSON.stringify({ completed, points, ach, streak })); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, achievements, user?.id]);

  return <Confetti trigger={confettiTrigger} />;
}
