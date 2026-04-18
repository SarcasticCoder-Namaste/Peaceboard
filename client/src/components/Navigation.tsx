import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sun, Moon, Menu, User, LogOut, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import logoImage from "@assets/generated_images/PeaceBoard_educational_platform_logo_a1809512.png";

export default function Navigation() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = user?.userType === "school_admin" || user?.userType === "teacher";

  const navigationItems = [
    ...(user ? [{ href: "/home", label: "Dashboard", icon: "🏠" }] : []),
    { href: "/games", label: "Games", icon: "🎮" },
    { href: "/music", label: "Music", icon: "🎵" },
    { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
    { href: "/check-emotion", label: "Check Your Emotion", icon: "🧠" },
    ...(user ? [{ href: "/profile", label: "Profile", icon: "👤" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: "🛡️" }] : []),
  ];

  const NavLink = ({ href, label, icon, mobile = false }: { href: string; label: string; icon: string; mobile?: boolean }) => {
    const isActive = location === href;

    return (
      <Link href={href}>
        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          className={`relative ${
            mobile ? "flex items-center space-x-3 px-4 py-3 rounded-lg" : "px-3 py-2 rounded-lg text-sm font-medium"
          } transition-colors cursor-pointer ${
            isActive
              ? "text-primary"
              : "text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/5"
          }`}
          onClick={() => mobile && setIsOpen(false)}
        >
          {isActive && (
            <motion.span
              layoutId={mobile ? "active-mobile-pill" : "active-nav-pill"}
              className="absolute inset-0 rounded-lg bg-primary/10 -z-0"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          {mobile && <span className="relative z-10 text-lg">{icon}</span>}
          <span className="relative z-10">{label}</span>
        </motion.div>
      </Link>
    );
  };

  return (
    <nav className="navigation-bar fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-3 cursor-pointer"
            >
              <img 
                src={logoImage} 
                alt="PeaceBoard Logo" 
                className="w-10 h-10 rounded-xl object-contain"
              />
              <span className="text-xl font-bold text-slate-900 dark:text-white">PeaceBoard</span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>

          {/* Theme Toggle & User Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="hidden md:flex items-center space-x-3 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {user.firstName || user.email || (user.userType ? `${user.userType.charAt(0).toUpperCase()}${user.userType.slice(1)}` : "User")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="p-1 h-auto"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button
                  size="sm"
                  className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-primary to-secondary text-white"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}
            
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-8">
                  {user && (
                    <div className="flex items-center space-x-3 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4">
                      <User className="w-5 h-5" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {user.firstName || user.email || (user.userType ? `${user.userType.charAt(0).toUpperCase()}${user.userType.slice(1)}` : "User")}
                        </p>
                        <p className="text-xs text-slate-500">{user.userType || "user"}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          logout();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  {navigationItems.map((item) => (
                    <NavLink key={item.href} {...item} mobile />
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
