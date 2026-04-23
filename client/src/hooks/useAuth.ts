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

const AUTH_EVENT = "peaceboard:auth-change";
const STORAGE_KEY = "peaceboard_user";

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as User;
    if (user.userType === "guest" && user.guestSessionExpiry) {
      if (new Date() > new Date(user.guestSessionExpiry)) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    }
    return user;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    typeof window === "undefined" ? null : readUser()
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCurrentUser(readUser());
    setIsLoading(false);

    const sync = () => setCurrentUser(readUser());
    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_EVENT, sync);
    };
  }, []);

  const login = (user: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
    window.dispatchEvent(new Event(AUTH_EVENT));
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    window.dispatchEvent(new Event(AUTH_EVENT));
  };

  return {
    user: currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    login,
    logout,
  };
}
