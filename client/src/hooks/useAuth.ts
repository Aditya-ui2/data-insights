import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { onAuthChange, getIdToken, logOut, type FirebaseUser } from "@/lib/firebase";
import { createContext, useContext } from "react";

interface AuthState {
  user: User | undefined;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  refetch: () => void;
}

export const AuthContext = createContext<AuthState>({
  user: undefined,
  firebaseUser: null,
  isLoading: true,
  isAuthenticated: false,
  authError: null,
  refetch: () => {},
});

export function useAuthState(): AuthState {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDemoPersistent, setIsDemoPersistent] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("isDemoLoggedIn") === "true";
    }
    return false;
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setFirebaseUser(user);
      setFirebaseLoading(false);
      if (user?.email === "admin@demodatainsights.com") {
        localStorage.setItem("isDemoLoggedIn", "true");
        setIsDemoPersistent(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!firebaseUser && !isDemoPersistent,
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch("/api/auth/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const demoUser: User = {
    id: "admin-demo-id",
    email: "admin@demodatainsights.com",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
    onboardingComplete: true
  } as any;

  const authenticated = isDemoPersistent || (!!firebaseUser && !!user);
  const loading = !isDemoPersistent && (firebaseLoading || (!!firebaseUser && userLoading));

  return {
    user: isDemoPersistent || firebaseUser?.email === "admin@demodatainsights.com" ? demoUser : user,
    firebaseUser,
    isLoading: loading,
    isAuthenticated: authenticated,
    authError,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
  };
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
