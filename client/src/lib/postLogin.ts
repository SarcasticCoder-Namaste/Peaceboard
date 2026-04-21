// Side-effects that run right after a user logs in / signs up.
// Currently: auto-redeems any invite code that was stashed in sessionStorage
// when the user landed on /invite/:code while logged out.

import { apiRequest } from "@/lib/queryClient";
import { pushNotification } from "@/lib/notifications";

export async function runPostLoginTasks(userId?: string) {
  if (!userId) return;
  const code = sessionStorage.getItem("pendingInvite");
  if (!code) return;
  try {
    const res = await apiRequest("POST", `/api/invites/${code}/claim`);
    if (res.ok) {
      sessionStorage.removeItem("pendingInvite");
      pushNotification(userId, {
        type: "invite",
        emoji: "💜",
        title: "You're connected with a friend!",
        body: `Invite ${code} accepted. Welcome to PeaceBoard.`,
        href: "/home",
      });
    } else if (res.status === 400 || res.status === 404 || res.status === 409 || res.status === 410) {
      // Invite is permanently unusable for this user — don't keep retrying.
      sessionStorage.removeItem("pendingInvite");
    }
    // Any other status (5xx, network) leaves the code in sessionStorage so
    // the next login attempt can retry the redemption.
  } catch {
    // Network failure — keep the pending code so a future sign-in can retry.
  }
}
