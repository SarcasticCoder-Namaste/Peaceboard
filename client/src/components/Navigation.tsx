import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sun, Moon, Menu, LogOut, LogIn } from "lucide-react";
import { motion, AnimatePresence, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import logoImage from "@assets/generated_images/PeaceBoard_educational_platform_logo_a1809512.png";
import { useAvatar } from "@/hooks/useAvatar";
import AvatarPicker from "@/components/AvatarPicker";
import NotificationsCenter from "@/components/NotificationsCenter";
import StreakBadge from "@/components/StreakBadge";

export default function Navigation() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const { avatar } = useAvatar(user?.id);

  // Scroll-aware header
  const { scrollY, scrollYProgress } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerHeight = useTransform(scrollY, [0, 80], [72, 56]);
  const logoScale = useTransform(scrollY, [0, 80], [1, 0.88]);
  const blurAmount = useTransform(scrollY, [0, 80], [10, 18]);
  const backdropFilter = useTransform(blurAmount, v => `blur(${v}px) saturate(180%)`);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    const delta = latest - previous;
    setScrolled(latest > 12);
    if (latest < 80) { setHidden(false); return; }
    if (delta > 6 && !isOpen) setHidden(true);
    else if (delta < -4) setHidden(false);
  });

  const isAdmin = user?.userType === "school_admin" || user?.userType === "teacher";

  const navigationItems = [
    ...(user ? [{ href: "/home", label: "Dashboard", icon: "🏠" }] : []),
    { href: "/games", label: "Games", icon: "🎮" },
    { href: "/music", label: "Music", icon: "🎵" },
    { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
    { href: "/check-emotion", label: "Check Your Emotion", icon: "🧠" },
    ...(user ? [{ href: "/diary", label: "Diary", icon: "📓" }] : []),
    ...(user ? [{ href: "/profile", label: "Profile", icon: "👤" }] : []),
    ...(user ? [{ href: "/settings", label: "Settings", icon: "⚙️" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: "🛡️" }] : []),
  ];

  const NavLink = ({ href, label, icon, mobile = false }: { href: string; label: string; icon: string; mobile?: boolean }) => {
    const isActive = location === href;
    return (
      <Link href={href}>
        <motion.div
          whileHover={{ scale: 1.04, y: mobile ? 0 : -1 }}
          whileTap={{ scale: 0.96 }}
          className={`relative ${
            mobile ? "flex items-center space-x-3 px-4 py-3 rounded-lg" : "px-3 py-2 rounded-lg text-sm font-medium"
          } transition-colors cursor-pointer ${
            isActive ? "text-primary" : "text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/5"
          }`}
          onClick={() => mobile && setIsOpen(false)}
        >
          {isActive && (
            <motion.span
              layoutId={mobile ? "active-mobile-pill" : "active-nav-pill"}
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/15 to-secondary/15 -z-0 ring-1 ring-primary/20"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          {mobile && <span className="relative z-10 text-lg">{icon}</span>}
          <span className="relative z-10">{label}</span>
        </motion.div>
      </Link>
    );
  };

  // Reveal mobile sheet → keep header visible
  useEffect(() => { if (isOpen) setHidden(false); }, [isOpen]);

  return (
    <>
      <motion.nav
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: hidden ? -110 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.7 }}
        style={{ backdropFilter, WebkitBackdropFilter: backdropFilter as any }}
        className={`navigation-bar fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          scrolled
            ? "bg-white/75 dark:bg-slate-900/75 border-b border-slate-200/70 dark:border-slate-700/60 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.15)]"
            : "bg-white/40 dark:bg-slate-900/40 border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div style={{ height: headerHeight }} className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/">
              <motion.div
                style={{ scale: logoScale }}
                whileHover={{ scale: 1.06 }}
                className="flex items-center space-x-3 cursor-pointer origin-left"
              >
                <motion.img
                  src={logoImage}
                  alt="PeaceBoard Logo"
                  className="w-10 h-10 rounded-xl object-contain ring-2 ring-primary/10"
                  animate={{ rotate: scrolled ? -6 : 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                />
                <motion.span
                  className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent"
                  animate={{ letterSpacing: scrolled ? "-0.02em" : "0em" }}
                >
                  PeaceBoard
                </motion.span>
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
              {navigationItems.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <NavLink {...item} />
                </motion.div>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <StreakBadge />
              {user && <NotificationsCenter />}
              {user ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="hidden md:flex items-center space-x-2 px-2 py-1 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/60 rounded-full border border-slate-200 dark:border-slate-700"
                >
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 6 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setAvatarPickerOpen(true)}
                    title="Edit your avatar"
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatar.color} text-white flex items-center justify-center text-base shadow-sm`}
                  >
                    {avatar.emoji}
                  </motion.button>
                  <span className="text-sm font-medium pr-1 max-w-[120px] truncate">
                    {user.firstName || user.email || (user.userType ? `${user.userType.charAt(0).toUpperCase()}${user.userType.slice(1)}` : "User")}
                  </span>
                  <Button variant="ghost" size="sm" onClick={logout} className="p-1 h-auto rounded-full" title="Sign out">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </motion.div>
              ) : (
                <Link href="/login">
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <Button size="sm" className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/20">
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </Button>
                  </motion.div>
                </Link>
              )}

              <motion.div whileHover={{ rotate: 15 }} whileTap={{ scale: 0.9, rotate: 0 }}>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTheme}
                  className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-full"
                  title={theme === "light" ? "Dark mode" : "Light mode"}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={theme}
                      initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.25 }}
                    >
                      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    </motion.div>
                  </AnimatePresence>
                </Button>
              </motion.div>

              {/* Mobile Menu */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:hidden bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-full"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <div className="flex flex-col space-y-2 mt-8">
                    {user && (
                      <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl mb-3">
                        <button
                          onClick={() => { setAvatarPickerOpen(true); setIsOpen(false); }}
                          className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatar.color} text-white flex items-center justify-center text-xl shadow-md`}
                        >
                          {avatar.emoji}
                        </button>
                        <div className="flex-1">
                          <p className="font-bold">
                            {user.firstName || user.email || (user.userType ? `${user.userType.charAt(0).toUpperCase()}${user.userType.slice(1)}` : "User")}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">{user.userType?.replace("_", " ") || "user"}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { logout(); setIsOpen(false); }}>
                          <LogOut className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {navigationItems.map((item, i) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <NavLink {...item} mobile />
                      </motion.div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </motion.div>
        </div>

        {/* Scroll progress bar */}
        <motion.div
          style={{ scaleX: scrollYProgress }}
          className="origin-left h-0.5 bg-gradient-to-r from-primary via-secondary to-pink-500"
        />
      </motion.nav>
      <AvatarPicker open={avatarPickerOpen} onClose={() => setAvatarPickerOpen(false)} />
    </>
  );
}
