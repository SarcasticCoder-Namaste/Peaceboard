import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  userType: string;
  schoolDomain?: string;
  studentId?: string;
  schoolCode?: string;
  guestSessionExpiry?: string;
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for current user
    const savedUser = localStorage.getItem("peaceboard_user");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        // Check if guest session is still valid
        if (user.userType === "guest" && user.guestSessionExpiry) {
          if (new Date() > new Date(user.guestSessionExpiry)) {
            localStorage.removeItem("peaceboard_user");
            setCurrentUser(null);
          } else {
            setCurrentUser(user);
          }
        } else {
          setCurrentUser(user);
        }
      } catch {
        localStorage.removeItem("peaceboard_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("peaceboard_user", JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("peaceboard_user");
  };

  return {
    user: currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    login,
    logout,
  };
}
