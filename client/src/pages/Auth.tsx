import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { runPostLoginTasks } from "@/lib/postLogin";
import { School, GraduationCap, UserCircle, Info } from "lucide-react";

type AuthTab = "school" | "student" | "guest";

export default function Auth() {
  const [activeTab, setActiveTab] = useState<AuthTab>("school");
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  // School login form
  const [schoolForm, setSchoolForm] = useState({
    schoolDomain: "",
    adminId: "",
    password: "",
  });

  // Student login form
  const [studentForm, setStudentForm] = useState({
    studentId: "",
    schoolCode: "",
  });

  const schoolMutation = useMutation({
    mutationFn: async (data: typeof schoolForm) => {
      const response = await apiRequest("POST", "/api/auth/school", data);
      return response.json();
    },
    onSuccess: async (data) => {
      const u = data.user || data;
      login(u);
      await runPostLoginTasks(u?.id);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to your school dashboard.",
      });
      setLocation("/analytics");
    },
    onError: () => {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const studentMutation = useMutation({
    mutationFn: async (data: typeof studentForm) => {
      const response = await apiRequest("POST", "/api/auth/student", data);
      return response.json();
    },
    onSuccess: async (data) => {
      const u = data.user || data;
      login(u);
      await runPostLoginTasks(u?.id);
      toast({
        title: "Welcome!",
        description: "Successfully logged in to your learning space.",
      });
      setLocation("/home");
    },
    onError: () => {
      toast({
        title: "Login failed",
        description: "Please check your student ID and school code.",
        variant: "destructive",
      });
    },
  });

  const guestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/guest", {
        firstName: "Guest",
        lastName: "Explorer",
        sessionDuration: 24 * 60
      });
      return response.json();
    },
    onSuccess: async (data) => {
      const u = data.user || data;
      login(u);
      await runPostLoginTasks(u?.id);
      toast({
        title: "Welcome, guest!",
        description: "Your 24-hour session has started. Enjoy exploring PeaceBoard!",
      });
      setLocation("/home");
    },
    onError: () => {
      toast({
        title: "Session creation failed",
        description: "Unable to create guest session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSchoolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    schoolMutation.mutate(schoolForm);
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    studentMutation.mutate(studentForm);
  };

  const handleGuestAccess = () => {
    guestMutation.mutate();
  };

  const tabs = [
    {
      id: "school" as const,
      label: "School",
      icon: School,
      description: "Access your institution's dashboard",
    },
    {
      id: "student" as const,
      label: "Student",
      icon: GraduationCap,
      description: "Use your school credentials",
    },
    {
      id: "guest" as const,
      label: "Guest",
      icon: UserCircle,
      description: "Explore without an account",
    },
  ];

  return (
    <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800/50">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Auth Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "text-primary bg-primary/5 border-b-2 border-primary"
                      : "text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                </button>
              ))}
            </div>

            <CardContent className="p-8">
              {/* School Login */}
              {activeTab === "school" && (
                <motion.div
                  key="school"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      School Login
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300">
                      Access your institution's dashboard
                    </p>
                  </div>

                  <form onSubmit={handleSchoolSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="schoolDomain" className="text-slate-700 dark:text-slate-300">
                        School Domain
                      </Label>
                      <Input
                        id="schoolDomain"
                        type="text"
                        placeholder="yourschool.edu"
                        value={schoolForm.schoolDomain}
                        onChange={(e) => setSchoolForm({ ...schoolForm, schoolDomain: e.target.value })}
                        className="mt-2"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="adminId" className="text-slate-700 dark:text-slate-300">
                        Administrator ID
                      </Label>
                      <Input
                        id="adminId"
                        type="text"
                        placeholder="admin.id"
                        value={schoolForm.adminId}
                        onChange={(e) => setSchoolForm({ ...schoolForm, adminId: e.target.value })}
                        className="mt-2"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={schoolForm.password}
                        onChange={(e) => setSchoolForm({ ...schoolForm, password: e.target.value })}
                        className="mt-2"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={schoolMutation.isPending}
                      className="w-full mt-6 bg-gradient-to-r from-primary to-primary text-white font-semibold"
                      size="lg"
                    >
                      {schoolMutation.isPending ? "Logging in..." : "Access Dashboard"}
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* Student Login */}
              {activeTab === "student" && (
                <motion.div
                  key="student"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      Student Login
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300">
                      Use your school credentials
                    </p>
                  </div>

                  <form onSubmit={handleStudentSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="studentId" className="text-slate-700 dark:text-slate-300">
                        Student ID
                      </Label>
                      <Input
                        id="studentId"
                        type="text"
                        placeholder="student.12345"
                        value={studentForm.studentId}
                        onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                        className="mt-2"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="schoolCode" className="text-slate-700 dark:text-slate-300">
                        School Code
                      </Label>
                      <Input
                        id="schoolCode"
                        type="text"
                        placeholder="SCH001"
                        value={studentForm.schoolCode}
                        onChange={(e) => setStudentForm({ ...studentForm, schoolCode: e.target.value })}
                        className="mt-2"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={studentMutation.isPending}
                      className="w-full mt-6 bg-gradient-to-r from-secondary to-green-600 text-white font-semibold"
                      size="lg"
                    >
                      {studentMutation.isPending ? "Logging in..." : "Enter Learning Space"}
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* Guest Access */}
              {activeTab === "guest" && (
                <motion.div
                  key="guest"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      Guest Access
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300">
                      Explore PeaceBoard without an account
                    </p>
                  </div>

                  <Alert className="mb-6 border-accent/20 bg-accent/10">
                    <Info className="h-4 w-4 text-accent" />
                    <AlertDescription className="text-slate-700 dark:text-slate-300">
                      Guest sessions last 24 hours. No personal information required - just click to start exploring!
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleGuestAccess}
                    disabled={guestMutation.isPending}
                    className="w-full bg-gradient-to-r from-accent to-orange-600 text-white font-semibold"
                    size="lg"
                  >
                    {guestMutation.isPending ? "Creating session..." : "Start Exploring"}
                    <motion.div
                      className="ml-2"
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.div>
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
