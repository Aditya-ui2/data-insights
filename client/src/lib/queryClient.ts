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
    const path = queryKey.join("/");
    console.log("[Standalone Mode] Mocking response for:", path);

    // Initial Login & User profile
    if (path.includes("/api/auth/user") || path.includes("/api/users/me")) {
      return { id: "admin-demo-id", email: "admin@demodatainsights.com", firstName: "Admin", lastName: "User", role: "admin", onboardingComplete: true } as any;
    }

    // Business Profile
    if (path.includes("/api/business/profile")) {
      return { 
        id: "demo-biz-123", 
        name: "NexGen Solutions Pvt Ltd", 
        ownerId: "admin-demo-id",
        industry: "Technology & Services",
        onboardingComplete: true,
        setupStep: "complete",
        currencySymbol: "₹",
        createdAt: new Date().toISOString()
      } as any;
    }

    // Member profile for field tracking
    if (path.includes("/api/business/member-profile")) {
      return {
        businessId: "demo-biz-123",
        memberId: "demo-member-456",
        memberRole: "runner",
        businessName: "NexGen Solutions Pvt Ltd"
      } as any;
    }

    // Tracking Templates (Forms)
    if (path.includes("/api/tracking/templates")) {
      return [
        {
          id: "t1",
          name: "Daily Sales Report",
          description: "Track your sales and leads achievement for the day",
          fieldsConfig: [
            { key: "total_calls", name: "Total Calls Made", type: "number", required: true, placeholder: "0" },
            { key: "new_leads", name: "New Leads Found", type: "number", required: true, placeholder: "0" },
            { key: "collection", name: "Collection Amount", type: "currency", required: false, placeholder: "0.00" },
            { key: "feedback", name: "Customer Feedback", type: "textarea", required: false, placeholder: "Enter details..." }
          ]
        },
        {
          id: "t2",
          name: "Inventory Tracker",
          description: "Daily stock movement and inventory check",
          fieldsConfig: [
            { key: "stock_in", name: "Stock Received", type: "number", required: true },
            { key: "stock_out", name: "Stock Issued", type: "number", required: true },
            { key: "condition", name: "Condition Grade", type: "select", options: ["Excellent", "Good", "Fair", "Poor"] }
          ]
        }
      ] as any;
    }

    // Daily Logs
    if (path.includes("/api/tracking/logs")) {
      return [] as any; 
    }

    // Field Tracking Sites
    if (path.includes("/api/field-tracking/sites")) {
      return {
        sites: [
          { id: "s1", name: "North Hub Plaza", address: "Andheri West, Mumbai", latitude: "19.1136", longitude: "72.8697", geofenceRadiusMeters: 100, isActive: true },
          { id: "s2", name: "Corporate BKC", address: "Bandra Kurla Complex", latitude: "19.0652", longitude: "72.8777", geofenceRadiusMeters: 50, isActive: true }
        ]
      } as any;
    }

    // Today's site logs
    if (path.includes("/api/field-tracking/my-today")) {
      const today = new Date();
      today.setHours(9, 30, 0);
      return {
        logs: [
          { id: "l1", actionType: "punch_in", timestamp: today.toISOString(), status: "success", latitude: "19.1136", longitude: "72.8697" },
          { id: "l2", actionType: "check_in", timestamp: new Date(today.getTime() + 3600000).toISOString(), status: "success", clientSiteId: "s1" }
        ]
      } as any;
    }

    // Verticals
    if (path.includes("/api/business/verticals")) {
      return [
        { id: "v1", name: "Sales & CRM", businessId: "demo-biz-123" },
        { id: "v2", name: "Operations", businessId: "demo-biz-123" }
      ] as any;
    }

    // Datasets
    if (path.includes("/api/datasets")) {
      return [
        { id: "d1", name: "Q1 Sales Report.xlsx", source: "excel", createdAt: new Date().toISOString(), status: "processed" },
        { id: "d2", name: "Marketing_Campaigns_2024", source: "google_sheets", createdAt: new Date().toISOString(), status: "processed" }
      ] as any;
    }

    // Usage & Dashboards
    if (path.includes("/api/usage")) return { count: 35, limit: 100 } as any;
    if (path.includes("/api/dashboards")) return [] as any;

    return [] as any;
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
