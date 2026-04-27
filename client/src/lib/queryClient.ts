import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getIdToken } from "./firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = await getIdToken();
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = await getIdToken();

    // Global Demo Mode Interceptor
    if (token === "demo-token-123") {
      const path = queryKey.join("/");
      console.log("[Demo Mode] Mocking response for:", path);
      
      if (path.includes("/api/auth/user") || path.includes("/api/users/me")) {
        return { id: "admin-demo-id", email: "admin@demodatainsights.com", firstName: "Admin", lastName: "User", role: "admin", onboardingComplete: true } as any;
      }
      if (path.includes("/api/business/profile")) {
        return { 
          id: "demo-biz-123", 
          name: "NexGen Solutions Pvt Ltd", 
          ownerId: "admin-demo-id",
          industry: "Technology & Services",
          onboardingComplete: true,
          setupStep: "complete",
          createdAt: new Date().toISOString()
        } as any;
      }
      if (path.includes("/api/business/verticals")) {
        return [
          { id: "v1", name: "Sales & CRM", businessId: "demo-biz-123" },
          { id: "v2", name: "Operations", businessId: "demo-biz-123" },
          { id: "v3", name: "Marketing", businessId: "demo-biz-123" }
        ] as any;
      }
      if (path.includes("/api/business/members")) {
        return [
          { id: "m1", userId: "admin-demo-id", role: "owner", user: { firstName: "Admin", lastName: "User", email: "admin@demodatainsights.com" } }
        ] as any;
      }
      if (path.includes("/api/datasets")) {
        return [
          { id: "d1", name: "Q1 Sales Report.xlsx", source: "excel", createdAt: new Date().toISOString(), status: "processed" },
          { id: "d2", name: "Marketing_Campaigns_2024", source: "google_sheets", createdAt: new Date().toISOString(), status: "processed" },
          { id: "d3", name: "Inventory_Master.csv", source: "excel", createdAt: new Date().toISOString(), status: "processed" }
        ] as any;
      }
      if (path.includes("/api/dashboards")) {
        return [
          { id: "db1", name: "Executive Performance Summary", isPublic: true, datasetId: "d1", createdAt: new Date().toISOString() },
          { id: "db2", name: "Operational Efficiency Tracker", isPublic: false, datasetId: "d2", createdAt: new Date().toISOString() }
        ] as any;
      }
      if (path.includes("/api/usage")) return { count: 35, limit: 100 } as any;
      return [] as any; 
    }

    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
