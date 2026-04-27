import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── STANDALONE MODE: GLOBAL API INTERCEPTOR (ALARM CLOCK FIX) ────────────────
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    let urlString = "";
    if (typeof url === "string") urlString = url;
    else if (url instanceof URL) urlString = url.toString();
    else if (url instanceof Request) urlString = url.url;

    if (urlString.includes("/api/")) {
      console.log("[Global Mock] Intercepting:", urlString);
      
      const mockResponse = (data: any, status = 200) => 
        new Response(JSON.stringify(data), { 
          status, 
          headers: { "Content-Type": "application/json" } 
        });

      if (urlString.includes("/auth/user") || urlString.includes("/users/me")) {
        return mockResponse({ id: "admin-demo-id", email: "admin@demodatainsights.com", firstName: "Admin", lastName: "User", role: "admin", onboardingComplete: true });
      }
      if (urlString.includes("/business/profile")) {
        return mockResponse({ id: "demo-biz-123", name: "NexGen Solutions Pvt Ltd", currencySymbol: "₹", onboardingComplete: true, setupStep: "complete" });
      }
      if (urlString.includes("/business/member-profile")) {
        return mockResponse({ businessId: "demo-biz-123", memberId: "m1", memberRole: "admin", businessName: "NexGen Solutions" });
      }
      if (urlString.includes("/business/members")) {
        return mockResponse([
          { id: "m1", userId: "u1", role: "owner", user: { firstName: "Aditya", lastName: "(You)", email: "admin@demodatainsights.com" } },
          { id: "m2", userId: "u2", role: "runner", user: { firstName: "Rahul", lastName: "Sharma", email: "rahul@demo.com" } },
          { id: "m3", userId: "u3", role: "employee", user: { firstName: "Priya", lastName: "Verma", email: "priya@demo.com" } }
        ]);
      }
      if (urlString.includes("/business/tasks")) {
        return mockResponse([
          { id: "t1", title: "Review Q1 Sales Report", status: "todo", priority: "high", createdAt: new Date().toISOString() },
          { id: "t2", title: "Visit North Hub Site", status: "in_progress", priority: "medium", createdAt: new Date().toISOString() },
          { id: "t3", title: "Setup Payroll for May", status: "done", priority: "low", createdAt: new Date().toISOString() },
          { id: "t4", title: "Onboard New Field Runner", status: "todo", priority: "high", createdAt: new Date().toISOString() }
        ]);
      }
      if (urlString.includes("/tracking/templates")) {
        return mockResponse([
          {
            id: "tmp1", name: "Daily Sales Report", description: "Collect sales stats", fieldsConfig: [
              { key: "revenue", name: "Revenue Collected", type: "currency", required: true },
              { key: "leads", name: "New Leads", type: "number", required: true },
              { key: "notes", name: "Notes", type: "textarea" }
            ]
          },
          {
            id: "tmp2", name: "Field Visit Log", description: "Runner visit details", fieldsConfig: [
              { key: "client_name", name: "Client Name", type: "text", required: true },
              { key: "outcome", name: "Visit Outcome", type: "select", options: ["Interested", "Follow-up", "Not Interested"] }
            ]
          }
        ]);
      }
      if (urlString.includes("/field-tracking/sites")) {
        return mockResponse({
          sites: [
            { id: "s1", name: "Andheri Hub", address: "Mumbai West", latitude: "19.11", longitude: "72.86", geofenceRadiusMeters: 50, isActive: true },
            { id: "s2", name: "BKC Office", address: "Bandra Kurla Complex", latitude: "19.06", longitude: "72.87", geofenceRadiusMeters: 100, isActive: true }
          ]
        });
      }
      if (urlString.includes("/field-tracking/my-today")) {
        return mockResponse({
          logs: [
            { id: "l1", actionType: "punch_in", timestamp: new Date().toISOString(), status: "success" }
          ]
        });
      }
      if (urlString.includes("/business/performance/my")) {
        return mockResponse({
          totalRevenue: 450000,
          totalUnits: 125,
          totalDeals: 18,
          totalExpenses: 52000,
          targetRevenue: 500000,
          targetUnits: 150,
          targetDeals: 25,
          achievementPercent: 90,
          projectedIncentive: 15000,
          entryCount: 22,
          verticalBreakdown: [
            { verticalId: "v1", verticalName: "Sales & CRM", revenue: 300000, units: 80, deals: 12 },
            { verticalId: "v2", verticalName: "Operations", revenue: 150000, units: 45, deals: 6 }
          ]
        });
      }
      if (urlString.includes("/business/eod")) {
        const today = new Date().toISOString().slice(0, 10);
        return mockResponse([
          { id: "e1", entryDate: today, verticalId: "v1", revenueAmount: 25000, unitsSold: 5, dealsClosed: 2, status: "pending", notes: "Good day, closed two big leads." },
          { id: "e2", entryDate: "2026-04-26", verticalId: "v1", revenueAmount: 18000, unitsSold: 3, dealsClosed: 1, status: "reviewed", managerNote: "Well done!", notes: "Steady progress." },
          { id: "e3", entryDate: "2026-04-25", verticalId: "v2", revenueAmount: 12000, unitsSold: 10, dealsClosed: 0, status: "reviewed", notes: "Ops maintenance day." }
        ]);
      }
      if (urlString.includes("/business/verticals")) {
        return mockResponse([
          { id: "v1", name: "Sales & CRM", metricLabel: "Leads", metricUnit: "Units", expenseCategories: ["Travel", "Client Meet", "Phone"] },
          { id: "v2", name: "Operations", metricLabel: "Tasks", metricUnit: "Hours", expenseCategories: ["Tools", "Repairs", "Other"] }
        ]);
      }
      if (urlString.includes("/datasets")) return mockResponse([]);
      if (urlString.includes("/dashboards")) return mockResponse([]);
      if (urlString.includes("/usage")) return mockResponse({ count: 42, limit: 100 });
      
      // Default empty array for any other API
      return mockResponse([]);
    }
    
    return originalFetch(url, options);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
