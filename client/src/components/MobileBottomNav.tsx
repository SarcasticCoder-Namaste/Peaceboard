import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Home, Gamepad2, Sprout, BookHeart, Music } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { href: "/home",    label: "Home",   icon: Home },
  { href: "/games",   label: "Games",  icon: Gamepad2 },
  { href: "/garden",  label: "Garden", icon: Sprout },
  { href: "/diary",   label: "Diary",  icon: BookHeart },
  { href: "/music",   label: "Music",  icon: Music },
];

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  if (!user) return null; // only show once logged in / guest

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = location === href || (href !== "/home" && location.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={`block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 rounded-md ${
                  active ? "text-primary" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className="flex flex-col items-center justify-center gap-0.5 py-2.5 cursor-pointer transition-colors"
                >
                  <div className="relative">
                    {active && (
                      <motion.span
                        layoutId="bottom-nav-pill"
                        className="absolute -inset-2 rounded-full bg-primary/15 -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-semibold">{label}</span>
                </motion.div>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
