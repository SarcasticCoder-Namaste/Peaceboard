import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navigation from "@/components/Navigation";
import FloatingChatbot from "@/components/FloatingChatbot";
import ErrorBoundary from "@/components/ErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import BackToTop from "@/components/BackToTop";
import CommandPalette from "@/components/CommandPalette";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import OnboardingTour from "@/components/OnboardingTour";
import { AchievementWatcher } from "@/hooks/useAchievementWatcher";

// Pages
import About from "@/pages/About";
import Auth from "@/pages/Auth";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Games from "@/pages/Games";
import MusicCenter from "@/pages/MusicCenter";
import Leaderboard from "@/pages/Leaderboard";
import Analytics from "@/pages/Analytics";
import FaceAnalysis from "@/pages/FaceAnalysis";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/AdminDashboard";
import Diary from "@/pages/Diary";
import Settings from "@/pages/Settings";
import InviteLanding from "@/pages/InviteLanding";
import Garden from "@/pages/Garden";
import EmotionWheelPage from "@/pages/EmotionWheelPage";
import WindDown from "@/pages/WindDown";
import Compliments from "@/pages/Compliments";
import Digest from "@/pages/Digest";
import Arcade from "@/pages/Arcade";
import MobileBottomNav from "@/components/MobileBottomNav";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={About} />
      <Route path="/login" component={Login} />
      <Route path="/auth" component={Auth} />
      <Route path="/home" component={Home} />
      <Route path="/games" component={Games} />
      <Route path="/music" component={MusicCenter} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/check-emotion" component={FaceAnalysis} />
      <Route path="/face-analysis" component={FaceAnalysis} />
      <Route path="/profile" component={Profile} />
      <Route path="/diary" component={Diary} />
      <Route path="/garden" component={Garden} />
      <Route path="/emotion-wheel" component={EmotionWheelPage} />
      <Route path="/wind-down" component={WindDown} />
      <Route path="/compliments" component={Compliments} />
      <Route path="/settings" component={Settings} />
      <Route path="/invite/:code" component={InviteLanding} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/digest" component={Digest} />
      <Route path="/arcade" component={Arcade} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const [location] = useLocation();
  // Pages that should take over the whole screen with no global chrome
  const immersive = location.startsWith("/wind-down");
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-300 overflow-x-hidden">
      {!immersive && <AnimatedBackground />}
      {!immersive && <Navigation />}
      <main id="main-content" tabIndex={-1} className="outline-none">
        <PageTransition>
          <Router />
        </PageTransition>
      </main>
      {!immersive && <FloatingChatbot />}
      {!immersive && <MobileBottomNav />}
      {!immersive && <BackToTop />}
      <CommandPalette />
      <KeyboardShortcuts />
      {!immersive && <OnboardingTour />}
      <AchievementWatcher />
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <ScrollToTop />
            <AppShell />
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
