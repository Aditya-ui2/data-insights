// Consolidated global fetch mock interceptor for standalone/mock mode
// Intercepts /api/ requests and returns mock responses, but passes through real backend routes.

if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    let urlString = "";
    if (typeof url === "string") urlString = url;
    else if (url instanceof URL) urlString = url.toString();
    else if (url instanceof Request) urlString = url.url;

    let authorizationHeader = "";
    if (options?.headers) {
      if (options.headers instanceof Headers) {
        authorizationHeader = options.headers.get("Authorization") || options.headers.get("authorization") || "";
      } else if (Array.isArray(options.headers)) {
        const pair = options.headers.find(p => p[0]?.toLowerCase() === "authorization");
        if (pair) authorizationHeader = pair[1];
      } else {
        const headersObj = options.headers as Record<string, string>;
        authorizationHeader = headersObj["Authorization"] || headersObj["authorization"] || "";
      }
    }
    const token = authorizationHeader.startsWith("Bearer ") ? authorizationHeader.substring(7) : "";

    if (token && token !== "demo-token-123") {
      return originalFetch(url, options);
    }

    if (urlString.includes("/api/")) {
      // ── PASS THROUGH to Express server for Google Sheets, Uploads, Chat, etc. ──
      if (
        urlString.includes("/google/") ||
        urlString.includes("/spreadsheets") ||
        urlString.includes("/datasets") ||
        urlString.includes("/upload") ||
        urlString.includes("/chat") ||
        urlString.includes("/conversations") ||
        urlString.includes("/export/") ||
        urlString.includes("/copilot/integrations") ||
        urlString.includes("/oauth/") ||
        urlString.includes("/shopify/")
      ) {
        console.log("[Fetch Pass-Through] Directing to backend server:", urlString);
        return originalFetch(url, options);
      }

      console.log("[Fetch Interceptor] Mocking response for:", urlString);

      const mockResponse = (data: any, status = 200) =>
        new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json" }
        });

      const getMockDatasets = () => {
        const stored = sessionStorage.getItem("mock_datasets");
        if (stored) return JSON.parse(stored);
        const defaults = [
          {
            id: "ds_mock_123",
            userId: "admin-demo-id",
            spreadsheetId: "mock_sheet",
            spreadsheetName: "Sales Data Q2.xlsx",
            sheetName: "Sheet1",
            sheetId: 0,
            headers: ["Region", "Revenue", "Sales", "Month"],
            data: [
              { "Region": "North", "Revenue": 450000, "Sales": 120, "Month": "Jan" },
              { "Region": "South", "Revenue": 320000, "Sales": 95, "Month": "Feb" },
              { "Region": "East", "Revenue": 150000, "Sales": 45, "Month": "Mar" },
              { "Region": "West", "Revenue": 610000, "Sales": 180, "Month": "Apr" }
            ],
            rowCount: 4,
            source: "excel",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          { id: "d1", name: "Q1 Sales Report.xlsx", source: "excel", createdAt: new Date().toISOString(), status: "processed" },
          { id: "d2", name: "Marketing_Campaigns_2024", source: "google_sheets", createdAt: new Date().toISOString(), status: "processed" }
        ];
        sessionStorage.setItem("mock_datasets", JSON.stringify(defaults));
        return defaults;
      };

      const getMockDashboards = () => {
        const stored = sessionStorage.getItem("mock_dashboards");
        if (stored) return JSON.parse(stored);
        const defaults = [
          {
            id: "db_mock_456",
            userId: "admin-demo-id",
            datasetId: "ds_mock_123",
            title: "Excel Upload Analysis",
            description: "Generated from uploaded Excel spreadsheet",
            config: {
              generatedAt: new Date().toISOString(),
              summary: "AI Insights:\nTop categories are performing above average.\nRevenue distribution shows key growth spikes in North and West sectors.\nRecommendations: Scale logistics and expand sales coverage in underrepresented zones.",
              charts: [
                {
                  id: "chart_1",
                  type: "kpi",
                  title: "Total Revenue",
                  dataKey: "Revenue",
                  aggregation: "sum",
                  valueKeys: ["Revenue"],
                  color: "hsl(43, 74%, 49%)"
                },
                {
                  id: "chart_2",
                  type: "bar",
                  title: "Revenue by Region",
                  dataKey: "Revenue",
                  labelKey: "Region",
                  aggregation: "sum",
                  color: "hsl(200, 65%, 38%)"
                },
                {
                  id: "chart_3",
                  type: "line",
                  title: "Sales Performance Trend",
                  dataKey: "Sales",
                  labelKey: "Month",
                  aggregation: "average",
                  color: "hsl(160, 60%, 40%)"
                }
              ]
            },
            isPublic: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        sessionStorage.setItem("mock_dashboards", JSON.stringify(defaults));
        return defaults;
      };

      if (urlString.includes("/auth/user") || urlString.includes("/users/me")) {
        return mockResponse({ id: "admin-demo-id", email: "admin@demodatainsights.com", firstName: "Admin", lastName: "User", role: "admin", onboardingComplete: true });
      }
      if (urlString.includes("/business/profile")) {
        return mockResponse({ id: "demo-biz-123", name: "NexGen Solutions Pvt Ltd", currencySymbol: "₹", onboardingComplete: true, setupStep: "complete", memberRole: "owner" });
      }
      if (urlString.includes("/business/member-profile")) {
        return mockResponse({ businessId: "demo-biz-123", memberId: "m1", memberRole: "admin", businessName: "NexGen Solutions" });
      }
      if (urlString.includes("/api/business/members")) {
        return mockResponse([
          { id: "m1", userId: "u1", role: "owner", status: "active", name: "Aditya Singh", email: "admin@demodatainsights.com" },
          { id: "m2", userId: "u2", role: "runner", status: "active", name: "Rahul Sharma", email: "rahul@demo.com" },
          { id: "m3", userId: "u3", role: "employee", status: "active", name: "Priya Verma", email: "priya@demo.com" }
        ]);
      }
      if (urlString.includes("/api/tasks")) {
        return mockResponse({
          tasks: [
            { id: "t1", title: "Review Q1 Financials", description: "Audit the expense logs vs revenue", status: "todo", priority: "urgent", assignedToMemberId: "m1", dueDate: new Date().toISOString() },
            { id: "t2", title: "Site Visit: North Hub", description: "Geofence testing and runner check-in", status: "in_progress", priority: "high", assignedToMemberId: "m2", dueDate: new Date().toISOString() },
            { id: "t3", title: "Update Inventory Stock", description: "Verify closing stock for month-end", status: "in_review", priority: "medium", assignedToMemberId: "m3", dueDate: new Date().toISOString() },
            { id: "t4", title: "Client Proposal: NexGen", description: "Negotiate pricing for the next quarter", status: "done", priority: "low", assignedToMemberId: "m1", dueDate: new Date().toISOString() },
            { id: "t5", title: "Follow-up with Leads", description: "Call potential clients from the CRM", status: "todo", priority: "medium", assignedToMemberId: "m3", dueDate: new Date().toISOString() }
          ]
        });
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
      if (urlString.includes("/business/performance/team")) {
        return mockResponse([
          { memberId: "m1", memberName: "Aditya Singh", memberEmail: "admin@demodatainsights.com", totalRevenue: 450000, totalUnits: 180, totalDeals: 25, totalExpenses: 40000, travelExpenses: 12000, baseSalary: 80000, targetRevenue: 500000, achievementPercent: 90, projectedIncentive: 15000, entryCount: 24 },
          { memberId: "m2", memberName: "Rahul Sharma", memberEmail: "rahul@demo.com", totalRevenue: 250000, totalUnits: 110, totalDeals: 12, totalExpenses: 50000, travelExpenses: 25000, baseSalary: 50000, targetRevenue: 300000, achievementPercent: 83, projectedIncentive: 8000, entryCount: 22 },
          { memberId: "m3", memberName: "Priya Verma", memberEmail: "priya@demo.com", totalRevenue: 150000, totalUnits: 50, totalDeals: 8, totalExpenses: 30000, travelExpenses: 15000, baseSalary: 50000, targetRevenue: 200000, achievementPercent: 75, projectedIncentive: 2000, entryCount: 18 }
        ]);
      }
      if (urlString.includes("/business/performance/trends")) {
        return mockResponse([
          { period: "2026-01", label: "Jan 26", totalRevenue: 720000, totalDeals: 38, totalExpenses: 95000, achievementPercent: 80, entryCount: 50 },
          { period: "2026-02", label: "Feb 26", totalRevenue: 750000, totalDeals: 40, totalExpenses: 100000, achievementPercent: 82, entryCount: 55 },
          { period: "2026-03", label: "Mar 26", totalRevenue: 800000, totalDeals: 42, totalExpenses: 110000, achievementPercent: 85, entryCount: 60 },
          { period: "2026-04", label: "Apr 26", totalRevenue: 820000, totalDeals: 43, totalExpenses: 115000, achievementPercent: 84, entryCount: 62 },
          { period: "2026-05", label: "May 26", totalRevenue: 850000, totalDeals: 45, totalExpenses: 120000, achievementPercent: 85, entryCount: 64 }
        ]);
      }
      if (urlString.includes("/business/performance/member")) {
        const match = urlString.match(/\/performance\/member\/([^\/\?]+)/);
        const memberId = match ? match[1] : "m1";
        const name = memberId === "m1" ? "Aditya Singh" : memberId === "m2" ? "Rahul Sharma" : "Priya Verma";
        const email = memberId === "m1" ? "admin@demodatainsights.com" : memberId === "m2" ? "rahul@demo.com" : "priya@demo.com";
        return mockResponse({
          memberName: name,
          memberEmail: email,
          totalRevenue: memberId === "m1" ? 450000 : memberId === "m2" ? 250000 : 150000,
          achievementPercent: memberId === "m1" ? 90 : memberId === "m2" ? 83 : 75,
          targetRevenue: memberId === "m1" ? 500000 : memberId === "m2" ? 300000 : 200000,
          entries: [
            { id: "e_dd1", entryDate: "2026-05-24", verticalId: "v1", revenueAmount: 25000, unitsSold: 5, dealsClosed: 2, status: "reviewed", notes: "Negotiated client contract successfully." },
            { id: "e_dd2", entryDate: "2026-05-23", verticalId: "v1", revenueAmount: 18000, unitsSold: 3, dealsClosed: 1, status: "reviewed", notes: "Regular follow ups done." }
          ]
        });
      }
      if (urlString.includes("/business/performance/my") || (urlString.includes("/business/performance") && !urlString.includes("/performance/team") && !urlString.includes("/performance/trends") && !urlString.includes("/performance/member"))) {
        console.log("[Fetch Interceptor] Matched Business Performance");
        return mockResponse({
          totalRevenue: 850000,
          totalUnits: 340,
          totalDeals: 45,
          totalExpenses: 120000,
          targetRevenue: 1000000,
          targetUnits: 400,
          targetDeals: 60,
          achievementPercent: 85,
          projectedIncentive: 25000,
          entryCount: 64,
          verticalBreakdown: [
            { verticalId: "v1", verticalName: "Sales & CRM", revenue: 550000, units: 210, deals: 32 },
            { verticalId: "v2", verticalName: "Operations", revenue: 300000, units: 130, deals: 13 }
          ]
        });
      }

      // EOD Entries
      if (urlString.includes("/business/eod")) {
        console.log("[Fetch Interceptor] Matched EOD List");
        const today = new Date().toISOString().slice(0, 10);
        return mockResponse([
          { id: "e1", memberId: "m1", entryDate: today, verticalId: "v1", revenueAmount: 25000, unitsSold: 5, dealsClosed: 2, status: "pending", notes: "Good day, closed two big leads." },
          { id: "e2", memberId: "m1", entryDate: "2026-04-26", verticalId: "v1", revenueAmount: 18000, unitsSold: 3, dealsClosed: 1, status: "reviewed", managerNote: "Well done!", notes: "Steady progress." },
          { id: "e3", memberId: "m2", entryDate: "2026-04-25", verticalId: "v2", revenueAmount: 12000, unitsSold: 10, dealsClosed: 0, status: "reviewed", notes: "Ops maintenance day." }
        ]);
      }
      if (urlString.includes("/business/verticals")) {
        return mockResponse([
          { id: "v1", name: "Sales & CRM", metricLabel: "Leads", metricUnit: "Units", expenseCategories: ["Travel", "Client Meet", "Phone"] },
          { id: "v2", name: "Operations", metricLabel: "Tasks", metricUnit: "Hours", expenseCategories: ["Tools", "Repairs", "Other"] }
        ]);
      }
      if (urlString.includes("/api/customers")) {
        return mockResponse({
          total: 148,
          active: 92,
          newThisMonth: 14,
          lostThisMonth: 3,
          topSharePercent: 38,
          growthTrends: [
            { period: "Jan", newCustomers: 8, activeCustomers: 72 },
            { period: "Feb", newCustomers: 11, activeCustomers: 78 },
            { period: "Mar", newCustomers: 9, activeCustomers: 81 },
            { period: "Apr", newCustomers: 12, activeCustomers: 88 },
            { period: "May", newCustomers: 14, activeCustomers: 92 }
          ],
          customersList: [
            { id: "c1", name: "Rohan Kapoor", email: "rohan@kapoorindustries.com", company: "Kapoor Industries", status: "active", lifetimeValue: 4500000, totalDeals: 18, growthRate: 15, lastActiveDate: "2026-06-24" },
            { id: "c2", name: "Ananya Sen", email: "ananya@senmediagroup.com", company: "Sen Media Group", status: "active", lifetimeValue: 3200000, totalDeals: 12, growthRate: 8, lastActiveDate: "2026-06-23" },
            { id: "c3", name: "Vikram Malhotra", email: "vikram@malhotralogistics.com", company: "Malhotra Logistics", status: "active", lifetimeValue: 2800000, totalDeals: 15, growthRate: -4, lastActiveDate: "2026-06-24" },
            { id: "c4", name: "Saira Banu", email: "saira@banufashions.com", company: "Banu Fashions", status: "new", lifetimeValue: 1200000, totalDeals: 4, growthRate: 35, lastActiveDate: "2026-06-22" },
            { id: "c5", name: "Devendra Patil", email: "devendra@patilconstructions.com", company: "Patil Constructions", status: "inactive", lifetimeValue: 850000, totalDeals: 3, growthRate: 0, lastActiveDate: "2026-05-15" }
          ]
        });
      }
      if (urlString.includes("/api/goals")) {
        const stored = sessionStorage.getItem("mock_goals");
        let goalsList = stored ? JSON.parse(stored) : [
          { id: "g1", title: "Q2 Revenue Benchmark", type: "revenue", targetValue: 1500000, currentValue: 1250000, startDate: "2026-04-01", endDate: "2026-06-30", status: "active" },
          { id: "g2", title: "Leads Generation Target", type: "sales", targetValue: 300, currentValue: 210, startDate: "2026-05-01", endDate: "2026-06-30", status: "active" },
          { id: "g3", title: "Runner Geofence Operations", type: "team", targetValue: 50, currentValue: 48, startDate: "2026-06-01", endDate: "2026-06-30", status: "active" },
          { id: "g4", title: "Customer Retention Campaign", type: "operational", targetValue: 100, currentValue: 60, startDate: "2026-03-01", endDate: "2026-06-30", status: "active" }
        ];

        if (options?.method === "POST" && options.body) {
          const body = JSON.parse(options.body as string);
          const newGoal = {
            id: `g_${Date.now()}`,
            ...body,
            status: "active"
          };
          goalsList.push(newGoal);
          sessionStorage.setItem("mock_goals", JSON.stringify(goalsList));
          return mockResponse(newGoal, 201);
        }

        const activeCount = goalsList.filter((g: any) => g.status === "active").length;
        const completedCount = goalsList.filter((g: any) => g.status === "completed").length;
        const atRiskCount = goalsList.filter((g: any) => g.status === "at_risk" || (g.currentValue / g.targetValue < 0.5 && new Date(g.endDate).getTime() - Date.now() < 7 * 24 * 3600 * 1000)).length;
        
        return mockResponse({
          achievementPercent: 78,
          activeCount,
          completedCount,
          atRiskCount,
          goals: goalsList
        });
      }
      if (urlString.includes("/api/alerts")) {
        const stored = sessionStorage.getItem("mock_alerts");
        let alertsList = stored ? JSON.parse(stored) : [
          { id: "a1", title: "Revenue Decline Detected", description: "Weekly rolling revenue has dropped 18% compared to last week's average.", severity: "high", category: "revenue", createdAt: "2 hours ago", recommendedAction: "Trigger AI Advisor Analysis", actionRoute: "/business/ai-strategy", isResolved: false },
          { id: "a2", title: "Missed Target Warning", description: "Leads generation target is trailing the expected trajectory by 32%.", severity: "medium", category: "revenue", createdAt: "5 hours ago", recommendedAction: "View Goals & Targets", actionRoute: "/business/goals", isResolved: false },
          { id: "a3", title: "Customer Inactivity Alert", description: "BKC Logistics client account has had no EOD logs or interaction for 14 days.", severity: "medium", category: "customers", createdAt: "1 day ago", recommendedAction: "View Customer Intelligence", actionRoute: "/business/customers", isResolved: false },
          { id: "a4", title: "Overdue Task Warnings", description: "3 high priority items on the Kanban Task Board have passed their target due date.", severity: "low", category: "tasks", createdAt: "2 days ago", recommendedAction: "Review Task Board", actionRoute: "/business/tasks", isResolved: false }
        ];

        const match = urlString.match(/\/api\/alerts\/([^\/]+)/);
        if (match && options?.method === "PATCH" && options.body) {
          const id = match[1];
          const body = JSON.parse(options.body as string);
          alertsList = alertsList.map((a: any) => a.id === id ? { ...a, ...body } : a);
          sessionStorage.setItem("mock_alerts", JSON.stringify(alertsList));
          return mockResponse(alertsList.find((a: any) => a.id === id));
        }

        return mockResponse(alertsList);
      }

      // DATASETS
      if (urlString.includes("/datasets/upload")) {
        const datasets = getMockDatasets();
        const newDataset = {
          id: "ds_mock_123",
          userId: "admin-demo-id",
          spreadsheetId: "mock_sheet",
          spreadsheetName: "Sales Data Q2.xlsx",
          sheetName: "Sheet1",
          sheetId: 0,
          headers: ["Region", "Revenue", "Sales", "Month"],
          data: [
            { "Region": "North", "Revenue": 450000, "Sales": 120, "Month": "Jan" },
            { "Region": "South", "Revenue": 320000, "Sales": 95, "Month": "Feb" },
            { "Region": "East", "Revenue": 150000, "Sales": 45, "Month": "Mar" },
            { "Region": "West", "Revenue": 610000, "Sales": 180, "Month": "Apr" }
          ],
          rowCount: 4,
          source: "excel",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const filtered = datasets.filter((d: any) => d.id !== "ds_mock_123");
        filtered.push(newDataset);
        sessionStorage.setItem("mock_datasets", JSON.stringify(filtered));

        return mockResponse({
          id: "ds_mock_123",
          spreadsheetName: "Sales Data Q2.xlsx",
          rowCount: 4,
          originalRowCount: 4,
          wasSampled: false
        });
      }

      const datasetDataMatch = urlString.match(/\/datasets\/([^\/]+)\/data/);
      if (datasetDataMatch && options?.method === "PATCH" && options.body) {
        const id = datasetDataMatch[1];
        const body = JSON.parse(options.body as string);
        const datasets = getMockDatasets();
        const index = datasets.findIndex((d: any) => d.id === id);
        if (index !== -1) {
          datasets[index].headers = body.headers;
          datasets[index].data = body.data;
          datasets[index].rowCount = body.data.length;
          datasets[index].updatedAt = new Date().toISOString();
          sessionStorage.setItem("mock_datasets", JSON.stringify(datasets));
          return mockResponse(datasets[index]);
        }
        return mockResponse({ message: "Dataset not found" }, 404);
      }

      const datasetReplaceMatch = urlString.match(/\/datasets\/([^\/]+)\/replace/);
      if (datasetReplaceMatch && options?.method === "POST") {
        return mockResponse({ message: "File replaced successfully" });
      }

      if (urlString.includes("/datasets")) {
        return mockResponse(getMockDatasets());
      }

      // DASHBOARDS
      if (urlString.includes("/dashboards/generate")) {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        const datasetId = body.datasetId || "ds_mock_123";
        const title = body.title || "Generated Dashboard";
        
        const datasets = getMockDatasets();
        const dataset = datasets.find((d: any) => d.id === datasetId) || datasets[0];
        
        const dashboards = getMockDashboards();
        const newDashboard = {
          id: "db_mock_456",
          userId: "admin-demo-id",
          datasetId: dataset.id,
          title: title,
          description: `Generated from ${dataset.spreadsheetName || 'dataset'}`,
          config: {
            generatedAt: new Date().toISOString(),
            summary: "AI Insights:\nAnalysis complete for the dataset.\nKey columns mapped: " + dataset.headers.join(", "),
            charts: [
              {
                id: "chart_1",
                type: "kpi",
                title: `Total ${dataset.headers[1] || 'Value'}`,
                dataKey: dataset.headers[1] || 'Revenue',
                aggregation: "sum",
                valueKeys: [dataset.headers[1] || 'Revenue'],
                color: "hsl(43, 74%, 49%)"
              },
              {
                id: "chart_2",
                type: "bar",
                title: `Distribution by ${dataset.headers[0] || 'Category'}`,
                dataKey: dataset.headers[1] || 'Revenue',
                labelKey: dataset.headers[0] || 'Region',
                aggregation: "sum",
                color: "hsl(200, 65%, 38%)"
              }
            ]
          },
          isPublic: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const filtered = dashboards.filter((d: any) => d.id !== "db_mock_456");
        filtered.push(newDashboard);
        sessionStorage.setItem("mock_dashboards", JSON.stringify(filtered));

        return mockResponse(newDashboard);
      }

      const insightsMatch = urlString.match(/\/dashboards\/([^\/]+)\/insights/);
      if (insightsMatch && options?.method === "POST") {
        const id = insightsMatch[1];
        const summary = "AI Insights:\nTrends analysis indicates positive trajectory across primary segments.\nKey spikes observed in performance groups.\nOperational targets achieved at 112% capacity.";
        
        const dashboards = getMockDashboards();
        const index = dashboards.findIndex((d: any) => d.id === id);
        if (index !== -1) {
          dashboards[index].config = {
            ...dashboards[index].config,
            summary: summary
          };
          dashboards[index].updatedAt = new Date().toISOString();
          sessionStorage.setItem("mock_dashboards", JSON.stringify(dashboards));
        }
        
        return mockResponse({ summary });
      }

      const dashboardPatchMatch = urlString.match(/\/dashboards\/([^\/]+)$/);
      if (dashboardPatchMatch && options?.method === "PATCH" && options.body) {
        const id = dashboardPatchMatch[1];
        const body = JSON.parse(options.body as string);
        const dashboards = getMockDashboards();
        const index = dashboards.findIndex((d: any) => d.id === id);
        if (index !== -1) {
          if (body.title !== undefined) dashboards[index].title = body.title;
          if (body.isPublic !== undefined) dashboards[index].isPublic = body.isPublic;
          if (body.config !== undefined) {
            dashboards[index].config = {
              ...dashboards[index].config,
              ...body.config
            };
          }
          dashboards[index].updatedAt = new Date().toISOString();
          sessionStorage.setItem("mock_dashboards", JSON.stringify(dashboards));
          return mockResponse(dashboards[index]);
        }
        return mockResponse({ message: "Dashboard not found" }, 404);
      }

      const dashboardDeleteMatch = urlString.match(/\/dashboards\/([^\/]+)$/);
      if (dashboardDeleteMatch && options?.method === "DELETE") {
        const id = dashboardDeleteMatch[1];
        const dashboards = getMockDashboards();
        const filtered = dashboards.filter((d: any) => d.id !== id);
        sessionStorage.setItem("mock_dashboards", JSON.stringify(filtered));
        return mockResponse({ message: "Dashboard deleted" });
      }

      const dashboardGetMatch = urlString.match(/\/dashboards\/([^\/]+)$/);
      if (dashboardGetMatch && (options?.method === "GET" || !options?.method)) {
        const id = dashboardGetMatch[1];
        const dashboards = getMockDashboards();
        const dashboard = dashboards.find((d: any) => d.id === id);
        if (dashboard) {
          const datasets = getMockDatasets();
          const dataset = datasets.find((d: any) => d.id === dashboard.datasetId);
          return mockResponse({ dashboard, dataset });
        }
        return mockResponse({ message: "Dashboard not found" }, 404);
      }

      if (urlString.includes("/copilot/agents/analyze") && options?.method === "POST") {
        const body = options.body ? JSON.parse(options.body as string) : {};
        const period = body.period || new Date().toISOString().slice(0, 7);
        const stored = sessionStorage.getItem("mock_agent_reports");
        const reportsList = stored ? JSON.parse(stored) : [];

        const newReport = {
          id: `rep_${Date.now()}`,
          title: `Coordinated Consensus Audit (${period})`,
          period: period,
          salesAnalysis: "SALES TEAM SUMMARY:\n• Active deals closed: 45 deals this period.\n• Conversion Rate: Improved by 2.4% MoM.\n• Pipeline Health: Q3 pipeline shows strong potential, but middle-of-funnel drop-offs exist.",
          financeAnalysis: "FINANCE AUDIT REPORT:\n• Gross Revenue: ₹8,50,000 recorded vs ₹10,00,000 target.\n• Operating Expenses: High travel payouts (totaling ₹52,000) observed.\n• Recommendation: Enforce dynamic caps on travel allowance.",
          operationsAnalysis: "OPERATIONS AUDIT LOG:\n• Attendance & site visits: 24 active entries logged.\n• Geofence Success: 98% of visits punched in inside designated boundaries.\n• Travel Distance: Runner logs indicate BKC hub plaza site visits are correlated with highest mileage anomalies.",
          hrAnalysis: "HR STABILITY REPORT:\n• Team Roster Size: 3 active members, 1 pending invite.\n• Performance PIP triggers: 1 member trailing performance targets by more than 25%.\n• Recommendation: Initiate HR feedback loop with employee Priya Verma.",
          consensusReport: "EXECUTIVE AUDIT SUMMARY:\nOverall business operations show strong performance indicators, but highlighted anomalies require immediate cross-departmental focus. High travel expenditure logs in operations must be audited against site check-ins.\n\nKEY ACTIONS RECOMMENDATION:\n1. Operations: Audit runner fuel logs vs Bandra BKC site logs.\n2. Finance: Adjust salary configurations default caps for travel allowances.\n3. HR: Initiate PIP review process for outlier underperformance.",
          createdAt: new Date().toISOString()
        };

        reportsList.unshift(newReport);
        sessionStorage.setItem("mock_agent_reports", JSON.stringify(reportsList));

        return mockResponse(newReport);
      }

      if (urlString.includes("/copilot/agents/reports")) {
        const stored = sessionStorage.getItem("mock_agent_reports");
        return mockResponse(stored ? JSON.parse(stored) : []);
      }

      if (urlString.includes("/dashboards")) {
        return mockResponse(getMockDashboards());
      }

      if (urlString.includes("/usage")) return mockResponse({ count: 42, limit: 100 });
      
      // Default fallback mock response
      return mockResponse([]);
    }

    return originalFetch(url, options);
  };
}
