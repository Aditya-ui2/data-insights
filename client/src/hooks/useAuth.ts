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
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      console.log("[Auth] onAuthChange fired, user:", user?.email ?? "null");
      setFirebaseUser(user);
      setFirebaseLoading(false);
      setAuthError(null);
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else {
        queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  const { data: user, isLoading: userLoading, error: userError } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: 2,
    retryDelay: 1000,
    enabled: !!firebaseUser,
    queryFn: async () => {
      console.log("[Auth] Fetching /api/auth/user...");
      const token = await getIdToken();
      if (!token) {
        console.error("[Auth] getIdToken returned null");
        throw new Error("No token available");
      }
      console.log("[Auth] Got token, calling backend...");
      const res = await fetch("/api/auth/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[Auth] Backend response status:", res.status);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[Auth] Backend error:", body);
        throw new Error(body.message || `Server error: ${res.status}`);
      }
      const data = await res.json();
      console.log("[Auth] Backend returned user:", data?.email);
      return data;
    },
  });

  useEffect(() => {
    if (userError && firebaseUser) {
      // Ignore backend errors for demo user
      if (firebaseUser.email === "admin@demodatainsights.com") return;

      const msg = (userError as Error).message || "Failed to verify account with server.";
      console.error("[Auth] userError:", msg);
      setAuthError(msg);
      logOut().catch(() => {});
    }
  }, [userError, firebaseUser]);

  const isDemo = firebaseUser?.email === "admin@demodatainsights.com";

  useEffect(() => {
    if (isDemo) {
      console.log("[Auth] Force Bypass: Demo Admin Authenticated");
      setAuthError(null);
    }
  }, [isDemo]);

  return {
    user: isDemo ? {
      id: "admin-demo-id",
      email: "admin@demodatainsights.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      onboardingComplete: true
    } as any : user,
    firebaseUser,
    isLoading: isDemo ? false : firebaseLoading || (!!firebaseUser && userLoading),
    isAuthenticated: isDemo ? true : (!!firebaseUser && !!user),
    authError,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
  };
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
