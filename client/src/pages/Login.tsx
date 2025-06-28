import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { School, GraduationCap, UserCircle, Info, Heart, ArrowLeft } from "lucide-react";

export default function Login() {
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
    onSuccess: (user) => {
      login(user);
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
    onSuccess: (user) => {
      login(user);
      toast({
        title: "Welcome!",
        description: "Successfully logged in. Ready to start learning!",
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
      const response = await apiRequest("POST", "/api/auth/guest", {});
      return response.json();
    },
    onSuccess: (user) => {
      login(user);
      toast({
        title: "Welcome, Guest!",
        description: "You now have temporary access to explore PeaceBoard.",
      });
      setLocation("/home");
    },
    onError: () => {
      toast({
        title: "Error",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-6 text-slate-600 dark:text-slate-300 hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold text-xl">
              P
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">PeaceBoard</h1>
          </div>
          
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Choose your access type to start building empathy and kindness skills
          </p>
        </motion.div>

        {/* Login Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="school" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-white dark:bg-slate-800 shadow-sm">
              <TabsTrigger value="school" className="flex items-center space-x-2">
                <School className="w-4 h-4" />
                <span>School Admin</span>
              </TabsTrigger>
              <TabsTrigger value="student" className="flex items-center space-x-2">
                <GraduationCap className="w-4 h-4" />
                <span>Student</span>
              </TabsTrigger>
              <TabsTrigger value="guest" className="flex items-center space-x-2">
                <UserCircle className="w-4 h-4" />
                <span>Guest Access</span>
              </TabsTrigger>
            </TabsList>

            {/* School Login */}
            <TabsContent value="school">
              <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white mx-auto mb-4">
                    <School className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">School Administrator Login</CardTitle>
                  <p className="text-slate-600 dark:text-slate-300">Access your school's analytics dashboard and manage student progress</p>
                </CardHeader>
                <CardContent className="card-content">
                  <form onSubmit={handleSchoolSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="schoolDomain" className="text-layer-fix">School Domain</Label>
                      <Input
                        id="schoolDomain"
                        type="text"
                        placeholder="yourschool.edu"
                        value={schoolForm.schoolDomain}
                        onChange={(e) => setSchoolForm({ ...schoolForm, schoolDomain: e.target.value })}
                        className="bg-slate-50 dark:bg-slate-700"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="adminId" className="text-layer-fix">Administrator ID</Label>
                      <Input
                        id="adminId"
                        type="text"
                        placeholder="admin.smith"
                        value={schoolForm.adminId}
                        onChange={(e) => setSchoolForm({ ...schoolForm, adminId: e.target.value })}
                        className="bg-slate-50 dark:bg-slate-700"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-layer-fix">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={schoolForm.password}
                        onChange={(e) => setSchoolForm({ ...schoolForm, password: e.target.value })}
                        className="bg-slate-50 dark:bg-slate-700"
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                      disabled={schoolMutation.isPending}
                    >
                      {schoolMutation.isPending ? "Signing In..." : "Sign In as Administrator"}
                    </Button>
                  </form>
                  
                  <Alert className="mt-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700 dark:text-blue-300">
                      School administrators can view analytics, monitor student progress, and manage classroom activities.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Student Login */}
            <TabsContent value="student">
              <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white mx-auto mb-4">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">Student Login</CardTitle>
                  <p className="text-slate-600 dark:text-slate-300">Join your school's empathy learning program</p>
                </CardHeader>
                <CardContent className="card-content">
                  <form onSubmit={handleStudentSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="studentId" className="text-layer-fix">Student ID</Label>
                      <Input
                        id="studentId"
                        type="text"
                        placeholder="S123456789"
                        value={studentForm.studentId}
                        onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                        className="bg-slate-50 dark:bg-slate-700"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="schoolCode" className="text-layer-fix">School Code</Label>
                      <Input
                        id="schoolCode"
                        type="text"
                        placeholder="ABC123"
                        value={studentForm.schoolCode}
                        onChange={(e) => setStudentForm({ ...studentForm, schoolCode: e.target.value })}
                        className="bg-slate-50 dark:bg-slate-700"
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      disabled={studentMutation.isPending}
                    >
                      {studentMutation.isPending ? "Joining..." : "Join Your School"}
                    </Button>
                  </form>
                  
                  <Alert className="mt-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <Info className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      Students can play empathy games, track progress, and participate in mindfulness activities.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Guest Access */}
            <TabsContent value="guest">
              <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white mx-auto mb-4">
                    <Heart className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-2xl text-slate-900 dark:text-white">Guest Access</CardTitle>
                  <p className="text-slate-600 dark:text-slate-300">Explore PeaceBoard with temporary access</p>
                </CardHeader>
                <CardContent className="card-content">
                  <div className="text-center space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Try PeaceBoard Free</h3>
                      <p className="text-slate-600 dark:text-slate-300 mb-4">
                        Get instant access to explore our empathy games, calming music, and AI guidance. 
                        No registration required.
                      </p>
                      <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                        <li>• Play sample empathy games</li>
                        <li>• Access meditation music</li>
                        <li>• Chat with AI guidance</li>
                        <li>• 24-hour session limit</li>
                      </ul>
                    </div>
                    
                    <Button 
                      onClick={handleGuestAccess}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                      disabled={guestMutation.isPending}
                    >
                      {guestMutation.isPending ? "Creating Guest Session..." : "Continue as Guest"}
                    </Button>
                  </div>
                  
                  <Alert className="mt-6 border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950">
                    <Info className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-700 dark:text-purple-300">
                      Guest sessions are perfect for trying out PeaceBoard before setting up school integration.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400"
        >
          <p>Need help? Contact your school administrator or email support@peaceboard.edu</p>
        </motion.div>
      </div>
    </div>
  );
}