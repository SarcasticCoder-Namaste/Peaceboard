import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sun, Moon, Menu, User, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export default function Navigation() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
    { href: "/", label: "About", icon: "📖" },
    { href: "/home", label: "Home", icon: "🏠" },
    { href: "/games", label: "Games", icon: "🎮" },
    { href: "/music", label: "Music", icon: "🎵" },
    { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
    ...(user?.userType === "school" ? [{ href: "/analytics", label: "Analytics", icon: "📊" }] : []),
  ];

  const NavLink = ({ href, label, icon, mobile = false }: { href: string; label: string; icon: string; mobile?: boolean }) => {
    const isActive = location === href;
    
    return (
      <Link href={href}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`${
            mobile ? "flex items-center space-x-3 px-4 py-3 rounded-lg" : "px-3 py-2 rounded-lg text-sm font-medium"
          } transition-colors cursor-pointer ${
            isActive
              ? "text-primary bg-primary/10"
              : "text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/5"
          }`}
          onClick={() => mobile && setIsOpen(false)}
        >
          {mobile && <span className="text-lg">{icon}</span>}
          <span>{label}</span>
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
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold text-lg">
                P
              </div>
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
            {user && (
              <div className="hidden md:flex items-center space-x-3 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {user.firstName || user.email || `${user.userType.charAt(0).toUpperCase()}${user.userType.slice(1)}`}
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
                          {user.firstName || user.email || `${user.userType.charAt(0).toUpperCase()}${user.userType.slice(1)}`}
                        </p>
                        <p className="text-xs text-slate-500">{user.userType}</p>
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
