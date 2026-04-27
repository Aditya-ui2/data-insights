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
      if (urlString.includes("/business/verticals")) {
        return mockResponse([
          { id: "v1", name: "Sales & CRM", count: 12 },
          { id: "v2", name: "Operations", count: 8 }
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
