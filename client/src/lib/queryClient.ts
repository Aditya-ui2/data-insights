import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getIdToken } from "./firebase";

// Industry templates data for standalone mock mode
function getIndustryTemplatesData(): Record<string, any> {
  return {
    marble_granite: {
      key: "marble_granite", label: "Marble & Granite", icon: "🪨", description: "Stone processing, slabs, tiles, and export",
      verticals: [
        { name: "Slab Sales", description: "Premium marble and granite slabs", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Transport", "Loading", "Packaging"] },
        { name: "Tile Sales", description: "Cut tiles and custom sizes", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Transport", "Cutting Charges"] },
        { name: "Export", description: "International shipments", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Freight", "Customs", "Documentation"] },
        { name: "Processing", description: "Polish, edge-work, and fabrication", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Labour", "Machine Maintenance"] },
      ],
      kpiSuggestions: ["Total Revenue", "Slabs Sold (sqft)", "Top Customer", "Monthly Growth %", "Export Revenue"],
    },
    furniture: {
      key: "furniture", label: "Furniture", icon: "🪑", description: "Manufacturing, retail, and custom furniture",
      verticals: [
        { name: "Living Room", description: "Sofas, center tables, TV units", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Raw Material", "Delivery", "Assembly"] },
        { name: "Bedroom", description: "Beds, wardrobes, side tables", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Raw Material", "Delivery"] },
        { name: "Office Furniture", description: "Workstations, chairs, storage", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Raw Material", "Installation", "Delivery"] },
        { name: "Custom Orders", description: "Bespoke and made-to-order", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Raw Material", "Labour", "Hardware"] },
      ],
      kpiSuggestions: ["Total Sales", "Units Delivered", "Custom Order Value", "Avg Order Size", "Top Category"],
    },
    electronics: {
      key: "electronics", label: "Electronics", icon: "📱", description: "Electronics retail, repairs, and distribution",
      verticals: [
        { name: "Mobile & Accessories", description: "Smartphones, tablets, accessories", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Purchase Cost", "Transport"] },
        { name: "Home Appliances", description: "ACs, TVs, refrigerators", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Purchase Cost", "Installation", "Delivery"] },
        { name: "IT Equipment", description: "Laptops, desktops, peripherals", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Purchase Cost", "Transport"] },
        { name: "Service & Repair", description: "Warranty and out-of-warranty repairs", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Parts", "Labour", "Courier"] },
      ],
      kpiSuggestions: ["Total Revenue", "Units Sold", "Service Revenue", "Top Brand", "Avg Margin %"],
    },
    solar_energy: {
      key: "solar_energy", label: "Solar Energy", icon: "☀️", description: "Solar installation, AMC, and distribution",
      verticals: [
        { name: "Residential Installations", description: "Rooftop solar for homes", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Panels", "Inverter", "Labour", "Wiring"] },
        { name: "Commercial Installations", description: "Factories, offices", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Panels", "Inverter", "Labour", "Wiring", "Civil Work"] },
        { name: "AMC & Maintenance", description: "Annual maintenance contracts", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Labour", "Spare Parts", "Travel"] },
        { name: "Product Sales", description: "Panels, inverters, batteries", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Purchase Cost", "Transport"] },
      ],
      kpiSuggestions: ["Total Revenue", "KW Installed", "Active AMC Contracts", "Pending Installations", "Monthly Growth"],
    },
    software_agency: {
      key: "software_agency", label: "Software Agency", icon: "💻", description: "Custom software development and IT services",
      verticals: [
        { name: "Project-Based", description: "Fixed-scope project deliveries", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Developer Hours", "Tools/Licenses", "Server"] },
        { name: "Retainer", description: "Monthly ongoing service contracts", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Developer Hours", "Tools/Licenses"] },
        { name: "Support & Maintenance", description: "Bug fixes, updates, SLA", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Developer Hours", "Server"] },
        { name: "Consulting", description: "Strategy, audits, advisory", metricLabel: "Hours Billed", metricUnit: "hrs", expenseCategories: ["Travel", "Materials"] },
      ],
      kpiSuggestions: ["Monthly Recurring Revenue", "Active Projects", "Hours Billed", "Utilization %", "Pipeline Value"],
    },
    retail_trading: {
      key: "retail_trading", label: "Retail & Trading", icon: "🏪", description: "General retail, wholesale, and distribution",
      verticals: [
        { name: "Wholesale", description: "Bulk orders to retailers", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Purchase Cost", "Transport", "Storage"] },
        { name: "Retail", description: "Walk-in and counter sales", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Purchase Cost", "Packaging"] },
        { name: "Online Sales", description: "E-commerce and marketplace", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Platform Fee", "Packaging", "Courier"] },
      ],
      kpiSuggestions: ["Total Sales", "Units Sold", "Gross Margin %", "Top SKU", "Customer Count"],
    },
    manufacturing: {
      key: "manufacturing", label: "Manufacturing", icon: "🏭", description: "Product manufacturing and industrial production",
      verticals: [
        { name: "Production", description: "Manufacturing and assembly", metricLabel: "Units", metricUnit: "units", expenseCategories: ["Raw Material", "Labour", "Energy", "Machine Maintenance"] },
        { name: "Sales", description: "Direct and distribution sales", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Transport", "Packaging", "Dealer Margin"] },
        { name: "Export", description: "International market sales", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Freight", "Customs", "Packaging"] },
      ],
      kpiSuggestions: ["Units Produced", "Defect Rate %", "Production Cost/Unit", "Revenue", "On-Time Delivery %"],
    },
    stocks_finance: {
      key: "stocks_finance", label: "Stocks & Finance", icon: "📈", description: "Trading, broking, and financial services",
      verticals: [
        { name: "Equity Trading", description: "Stock market buy/sell", metricLabel: "P&L", metricUnit: "₹", expenseCategories: ["Brokerage", "STT", "Exchange Charges"] },
        { name: "Derivatives", description: "F&O and options trading", metricLabel: "P&L", metricUnit: "₹", expenseCategories: ["Brokerage", "STT", "Exchange Charges"] },
        { name: "Financial Advisory", description: "Client portfolio management", metricLabel: "Fee Revenue", metricUnit: "₹", expenseCategories: ["Research Tools", "Compliance"] },
        { name: "Mutual Funds", description: "MF distribution and SIP", metricLabel: "AUM", metricUnit: "₹", expenseCategories: ["Commission Clawback"] },
      ],
      kpiSuggestions: ["Net P&L", "Win Rate %", "Avg Trade Size", "AUM", "Monthly Return %"],
    },
    food_beverage: {
      key: "food_beverage", label: "Food & Beverage", icon: "🍽️", description: "Restaurant, cloud kitchen, and food distribution",
      verticals: [
        { name: "Dine-In", description: "Restaurant table service", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Ingredients", "Labour", "Utilities"] },
        { name: "Takeaway & Delivery", description: "Parcel orders and delivery", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Ingredients", "Packaging", "Platform Fee", "Delivery"] },
        { name: "Catering", description: "Events, offices, bulk orders", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Ingredients", "Labour", "Transport", "Packaging"] },
      ],
      kpiSuggestions: ["Daily Revenue", "Covers Served", "Average Order Value", "Food Cost %", "Repeat Customers"],
    },
    real_estate: {
      key: "real_estate", label: "Real Estate", icon: "🏠", description: "Property sales, rentals, and construction",
      verticals: [
        { name: "Residential Sales", description: "Apartments, villas, plots", metricLabel: "Deal Value", metricUnit: "₹", expenseCategories: ["Site Visit", "Marketing", "Legal", "Brokerage"] },
        { name: "Commercial Sales", description: "Offices, shops, industrial", metricLabel: "Deal Value", metricUnit: "₹", expenseCategories: ["Site Visit", "Marketing", "Legal", "Brokerage"] },
        { name: "Rentals", description: "Residential and commercial", metricLabel: "Monthly Rent", metricUnit: "₹", expenseCategories: ["Site Visit", "Legal"] },
        { name: "Construction", description: "New builds and renovation", metricLabel: "Project Value", metricUnit: "₹", expenseCategories: ["Material", "Labour", "Equipment", "Legal"] },
      ],
      kpiSuggestions: ["Deals Closed", "Total Deal Value", "Active Pipeline", "Avg Deal Size", "Conversion Rate %"],
    },
    healthcare: {
      key: "healthcare", label: "Healthcare & Pharma", icon: "🏥", description: "Clinics, pharma distribution, and medical equipment",
      verticals: [
        { name: "Consultations", description: "OPD and specialist visits", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Doctor Fees", "Consumables"] },
        { name: "Pharmacy Sales", description: "Medicine and supplement sales", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Purchase Cost", "Expiry Loss"] },
        { name: "Diagnostics", description: "Lab tests and imaging", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Reagents", "Lab Labour", "Equipment Maintenance"] },
      ],
      kpiSuggestions: ["Daily Revenue", "Patient Count", "Prescription Volume", "Inventory Turnover", "Top Product"],
    },
    education: {
      key: "education", label: "Education & Training", icon: "🎓", description: "Coaching, schools, and professional training",
      verticals: [
        { name: "Classroom Batches", description: "In-person coaching", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Faculty", "Rent", "Utilities"] },
        { name: "Online Courses", description: "Live and recorded online", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Platform Fee", "Content Creation", "Marketing"] },
        { name: "Workshops", description: "Short-term workshops", metricLabel: "Revenue", metricUnit: "₹", expenseCategories: ["Faculty", "Venue", "Materials"] },
      ],
      kpiSuggestions: ["Active Students", "Total Revenue", "Batch Utilization %", "New Enrollments", "Renewal Rate %"],
    },
  };
}

function getIndustryTemplateListData(): Array<{ key: string; label: string; icon: string; description: string }> {
  const all = getIndustryTemplatesData();
  return Object.values(all).map(({ key, label, icon, description }: any) => ({ key, label, icon, description }));
}

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

const getMockDatasets = () => {
  if (typeof window === "undefined") return [];
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
  if (typeof window === "undefined") return [];
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

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/");
    console.log("[QueryFn] Fetching:", path);

    const token = await getIdToken();
    if (token && token !== "demo-token-123") {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`
      };
      const res = await fetch(path, { headers, credentials: "include" });
      if (!res.ok) {
        if (res.status === 401 && unauthorizedBehavior === "returnNull") return null as any;
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    }

    // ── Mock responses for standalone mode ──
    if (path.includes("/api/auth/user") || path.includes("/api/users/me")) {
      return { id: "admin-demo-id", email: "admin@demodatainsights.com", firstName: "Admin", lastName: "User", role: "admin", onboardingComplete: true } as any;
    }
    if (path.includes("/api/business/profile")) {
      return { 
        id: "demo-biz-123", name: "NexGen Solutions Pvt Ltd", ownerId: "admin-demo-id",
        industry: "Technology & Services", onboardingComplete: true, setupStep: "complete",
        currencySymbol: "₹", memberRole: "owner", createdAt: new Date().toISOString()
      } as any;
    }
    if (path.includes("/api/business/member-profile")) {
      return { businessId: "demo-biz-123", memberId: "demo-member-456", memberRole: "runner", businessName: "NexGen Solutions Pvt Ltd" } as any;
    }
    if (path.includes("/api/tracking/templates")) {
      return [
        { id: "t1", name: "Daily Sales Report", description: "Track your sales and leads achievement for the day",
          fieldsConfig: [
            { key: "total_calls", name: "Total Calls Made", type: "number", required: true, placeholder: "0" },
            { key: "new_leads", name: "New Leads Found", type: "number", required: true, placeholder: "0" },
            { key: "collection", name: "Collection Amount", type: "currency", required: false, placeholder: "0.00" },
            { key: "feedback", name: "Customer Feedback", type: "textarea", required: false, placeholder: "Enter details..." }
          ]},
        { id: "t2", name: "Inventory Tracker", description: "Daily stock movement and inventory check",
          fieldsConfig: [
            { key: "stock_in", name: "Stock Received", type: "number", required: true },
            { key: "stock_out", name: "Stock Issued", type: "number", required: true },
            { key: "condition", name: "Condition Grade", type: "select", options: ["Excellent", "Good", "Fair", "Poor"] }
          ]}
      ] as any;
    }
    if (path.includes("/api/tracking/logs")) return [] as any;
    if (path.includes("/api/field-tracking/sites")) {
      return { sites: [
        { id: "s1", name: "North Hub Plaza", address: "Andheri West, Mumbai", latitude: "19.1136", longitude: "72.8697", geofenceRadiusMeters: 100, isActive: true },
        { id: "s2", name: "Corporate BKC", address: "Bandra Kurla Complex", latitude: "19.0652", longitude: "72.8777", geofenceRadiusMeters: 50, isActive: true }
      ]} as any;
    }
    if (path.includes("/api/field-tracking/my-today")) {
      const today = new Date(); today.setHours(9, 30, 0);
      return { logs: [
        { id: "l1", actionType: "punch_in", timestamp: today.toISOString(), status: "success", latitude: "19.1136", longitude: "72.8697" },
        { id: "l2", actionType: "check_in", timestamp: new Date(today.getTime() + 3600000).toISOString(), status: "success", clientSiteId: "s1" }
      ]} as any;
    }
    // Industry templates
    if (path.includes("/api/business/industry-templates/")) {
      const key = path.split("/").pop();
      const allTemplates: Record<string, any> = getIndustryTemplatesData();
      return (allTemplates[key!] || null) as any;
    }
    if (path.includes("/api/business/industry-templates")) {
      return getIndustryTemplateListData() as any;
    }
    if (path.includes("/api/business/verticals")) {
      return [
        { id: "v1", name: "Sales & CRM", businessId: "demo-biz-123" },
        { id: "v2", name: "Operations", businessId: "demo-biz-123" }
      ] as any;
    }
    if (path.includes("/api/datasets")) return getMockDatasets() as any;
    if (path.includes("/api/usage")) return { count: 35, limit: 100 } as any;
    if (path.includes("/api/dashboards/")) {
      const parts = path.split("/");
      const dashboardId = parts[parts.length - 1];
      const dashboards = getMockDashboards();
      const dashboard = dashboards.find((d: any) => d.id === dashboardId);
      if (dashboard) {
        const datasets = getMockDatasets();
        const dataset = datasets.find((d: any) => d.id === dashboard.datasetId);
        return { dashboard, dataset } as any;
      }
      return null as any;
    }
    if (path.includes("/api/dashboards")) return getMockDashboards() as any;
    if (path.includes("/api/copilot/agents/reports")) {
      const stored = sessionStorage.getItem("mock_agent_reports");
      return (stored ? JSON.parse(stored) : []) as any;
    }

    // ── Google APIs: PASS THROUGH to real server (with auth) ──
    if (path.includes("/api/google/") || path.includes("/api/spreadsheets")) {
      const googleToken = await getIdToken();
      const googleHeaders: Record<string, string> = {};
      if (googleToken && googleToken !== "demo-token-123") {
        googleHeaders["Authorization"] = `Bearer ${googleToken}`;
      }
      const res = await fetch(path, { headers: googleHeaders, credentials: "include" });
      if (!res.ok) {
        if (res.status === 401 && unauthorizedBehavior === "returnNull") return null as any;
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    }

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
