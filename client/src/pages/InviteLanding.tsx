import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Heart, UserPlus, LogIn, Check, Clock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { apiRequest } from "@/lib/queryClient";

type InviteInfo = {
  code: string;
  inviterName?: string | null;
  message?: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
};

export default function InviteLanding() {
  const [, params] = useRoute("/invite/:code");
  const code = (params?.code || "").toUpperCase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [claimed, setClaimed] = useState(false);

  const { data, isLoading, error } = useQuery<InviteInfo>({
    queryKey: [`/api/invites/${code}`],
    enabled: !!code,
  });

  const claim = useMutation({
    mutationFn: () => apiRequest("POST", `/api/invites/${code}/claim`),
    onSuccess: () => {
      setClaimed(true);
      toast({ title: "Welcome aboard!", description: `You joined via ${data?.inviterName || "a friend"}'s invite.` });
    },
    onError: (e: any) => {
      toast({ title: "Couldn't accept invite", description: e?.message || "Try again later.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (user && data?.status === "pending" && !claimed && !claim.isPending) {
      claim.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, data?.status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50/40 to-blue-50 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950">
      <Navigation />
      <main className="max-w-md mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-7 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center mb-4 shadow-lg">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">You're invited to PeaceBoard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">A kindness, empathy & wellbeing space for everyone.</p>

            {isLoading && <p className="text-sm text-slate-400 mt-6">Loading invite…</p>}
            {error && (
              <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-center gap-2 justify-center text-sm">
                <AlertTriangle className="w-4 h-4" /> This invite link isn't valid.
              </div>
            )}

            {data && (
              <>
                <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-left">
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Invited by</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{data.inviterName || "A friend"}</p>
                  {data.message && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic">"{data.message}"</p>
                  )}
                  <p className="text-xs text-slate-400 mt-3">Code: <code className="font-mono">{data.code}</code></p>
                </div>

                {data.status === "expired" && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2 justify-center">
                    <Clock className="w-4 h-4" /> This invite has expired.
                  </div>
                )}
                {data.status === "revoked" && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm flex items-center gap-2 justify-center">
                    <AlertTriangle className="w-4 h-4" /> This invite was revoked.
                  </div>
                )}
                {data.status === "accepted" && !claimed && (
                  <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-sm">
                    This invite has already been used.
                  </div>
                )}

                {data.status === "pending" && !user && (
                  <div className="mt-6 space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-300">Sign in or create an account to accept.</p>
                    <Button className="w-full" onClick={() => {
                      sessionStorage.setItem("pendingInvite", code);
                      setLocation("/login");
                    }}>
                      <LogIn className="w-4 h-4 mr-1" /> Sign in
                    </Button>
                    <Button className="w-full" variant="outline" onClick={() => {
                      sessionStorage.setItem("pendingInvite", code);
                      setLocation("/auth");
                    }}>
                      <UserPlus className="w-4 h-4 mr-1" /> Create an account
                    </Button>
                  </div>
                )}

                {data.status === "pending" && user && (
                  <div className="mt-6">
                    {claim.isPending && <p className="text-sm text-slate-400">Accepting invite…</p>}
                    {claimed && (
                      <>
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2 justify-center">
                          <Check className="w-4 h-4" /> Invite accepted!
                        </div>
                        <Link href="/home">
                          <Button className="w-full mt-3">Go to Dashboard</Button>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
