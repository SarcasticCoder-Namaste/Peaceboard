import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navigation from "@/components/Navigation";
import FloatingChatbot from "@/components/FloatingChatbot";

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
      <Route path="/face-analysis" component={FaceAnalysis} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-300">
            <Navigation />
            <Router />
            <FloatingChatbot />
            <Toaster />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
