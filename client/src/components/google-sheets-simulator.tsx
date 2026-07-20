import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Undo2, 
  Redo2, 
  Printer, 
  AlertCircle,
  Paintbrush, 
  Search, 
  DollarSign, 
  Percent, 
  Type, 
  PaintBucket, 
  Grid, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Italic, 
  Strikethrough, 
  Link2, 
  MessageSquare, 
  Sigma, 
  ChevronDown, 
  Plus, 
  Menu as Hamburger, 
  RefreshCw, 
  ArrowLeft,
  ChevronRight,
  Database,
  Lock,
  Star,
  Folder,
  Cloud,
  FileSpreadsheet,
  X,
  Sparkles,
  HelpCircle,
  MoreVertical,
  ShoppingCart,
  Calendar,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ChatInterface from "./chat-interface";
import AiAssistantPanel from "./ai-assistant-panel";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { Trash2 } from "lucide-react";

interface GoogleSheetsSimulatorProps {
  datasetId: string;
  onClose: () => void;
  fullHeight?: boolean;
}

export default function GoogleSheetsSimulator({ datasetId, onClose, fullHeight = false }: GoogleSheetsSimulatorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  const [gridData, setGridData] = useState<Record<string, any[]>>({});
  const [pendingEdits, setPendingEdits] = useState<Record<string, Record<string, Record<string, any>>>>({});
  
  // AI Assistant states
  const [activeAiMode, setActiveAiMode] = useState<string>("formula");
  const [customTabs, setCustomTabs] = useState<Record<string, any[]>>({});
  const [chartsList, setChartsList] = useState<any[]>([]);
  
  // Formatting states
  const [isZebraStriped, setIsZebraStriped] = useState(false);
  const [isHeaderBold, setIsHeaderBold] = useState(false);
  const [isHighlightNumbers, setIsHighlightNumbers] = useState(false);
  
  // Selection state
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colKey: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colKey: string } | null>(null);
  const [formulaValue, setFormulaValue] = useState<string>("");
  const [sidebarMode, setSidebarMode] = useState<"coefficient" | "ai">("coefficient");
  const [sidebarView, setSidebarView] = useState<"home" | "monitor" | "assistant" | "snapshot" | "dashboard" | "edit-import">("home");
  const [monitorInput, setMonitorInput] = useState("");
  const [assistantInput, setAssistantInput] = useState("");
  const [dashboardInput, setDashboardInput] = useState("");
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [selectedPreviewObject, setSelectedPreviewObject] = useState<string | null>(null);
  const [checkedObjects, setCheckedObjects] = useState<string[]>([]);
  const [installingExtension, setInstallingExtension] = useState(false);

  // Auto Refresh schedule temporary states
  const [tempSchedule, setTempSchedule] = useState<string>("daily");
  const [tempTime, setTempTime] = useState<string>("9:00 AM");

  const { data: dataset } = useQuery<any>({
    queryKey: [`/api/datasets/${datasetId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/datasets`);
      const list = await res.json();
      return list.find((d: any) => d.id === datasetId);
    }
  });

  const integrationId = dataset?.spreadsheetId?.startsWith("conn_")
    ? dataset.spreadsheetId.substring("conn_".length)
    : null;

  const { data: integrations, refetch: refetchIntegrations } = useQuery<any[]>({
    queryKey: ["/api/copilot/integrations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/copilot/integrations");
      return res.json();
    }
  });

  const integration = integrations?.find((i: any) => i.id === integrationId);

  const updateScheduleMutation = useMutation({
    mutationFn: async (schedule: string) => {
      if (!integrationId) return;
      await apiRequest("PATCH", `/api/copilot/integrations/${integrationId}`, {
        syncSchedule: schedule
      });
    },
    onSuccess: () => {
      toast({
        title: "Schedule Saved",
        description: "Auto-refresh schedule updated successfully.",
      });
      refetchIntegrations();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update schedule.",
        variant: "destructive"
      });
    }
  });
  const createAlertMutation = useMutation({
    mutationFn: async (desc: string) => {
      await apiRequest("POST", "/api/alerts", {
        title: "Custom Data Monitor Triggered",
        description: desc,
        severity: "medium",
        category: "revenue",
        actionRoute: `/sheet/${datasetId}`,
        recommendedAction: "View Sync Log"
      });
    },
    onSuccess: () => {
      toast({
        title: "Alert Configured",
        description: "Slack/Email threshold alert created successfully.",
      });
      setMonitorInput("");
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create alert",
        variant: "destructive"
      });
    }
  });

  const createSnapshotMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/datasets/${datasetId}/snapshot`);
    },
    onSuccess: () => {
      toast({
        title: "Snapshot Created",
        description: "Historical data snapshot successfully stored in postgres archive.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to archive snapshot",
        variant: "destructive"
      });
    }
  });

  const formulaInputRef = useRef<HTMLInputElement>(null);

  const { data: previewRes, isLoading, error, refetch } = useQuery<{
    success: boolean;
    source: string;
    data: Record<string, any[]>;
  }>({
    queryKey: [`/api/datasets/${datasetId}/preview`],
    enabled: !!datasetId,
  });

  // ── Strict two-source tab architecture ──
  // Source tabs (from API) ALWAYS use gridData exclusively.
  // AI-generated tabs ALWAYS use customTabs exclusively.
  // The two NEVER mix, even if keys collide.
  const sourceTabKeys = Object.keys(gridData);                          // e.g. ["customers", "orders", "products"]
  const sourceKeysLowerSet = new Set(sourceTabKeys.map(k => k.toLowerCase()));
  const aiTabKeys = Object.keys(customTabs).filter(k => !sourceKeysLowerSet.has(k.toLowerCase())); // only non-colliding

  const tabs = [...sourceTabKeys, ...aiTabKeys];                        // source tabs first, AI tabs after

  // Strict lookup: never let AI data pollute a source tab
  const activeRows: any[] = sourceTabKeys.includes(activeTab)
    ? (gridData[activeTab] || [])          // source tab → gridData only
    : (customTabs[activeTab] || []);       // AI tab → customTabs only

  // Also expose combined for dashboard which needs to scan all source data
  const combinedGridData: Record<string, any[]> = { ...gridData };

  // Load preview data
  useEffect(() => {
    if (previewRes?.data) {
      setGridData(previewRes.data);
      const tabs = Object.keys(previewRes.data);
      if (tabs.length > 0 && !activeTab) {
        setActiveTab(tabs[0]);
      }
    }
  }, [previewRes, activeTab]);

  const SHOPIFY_OBJECTS = [
    { id: "customers", name: "Customers" },
    { id: "orders", name: "Orders" },
    { id: "products", name: "Products" },
    { id: "automatic_discount_nodes", name: "Automatic Discount Nodes" },
    { id: "collection_saved_searches", name: "Collection Saved Searches" },
    { id: "collections", name: "Collections" },
    { id: "deletion_events", name: "Deletion Events" },
    { id: "delivery_profiles", name: "Delivery Profiles" },
    { id: "discount_redeem_code_saved_searches", name: "Discount Redeem Code Saved Searches" },
    { id: "draft_orders", name: "Draft Orders" },
    { id: "gift_cards", name: "Gift Cards" },
    { id: "inventory_items", name: "Inventory Items" },
    { id: "line_items", name: "Line Items" },
    { id: "locations", name: "Locations" }
  ];

  const handleFinalImportOfCheckedObjects = () => {
    if (checkedObjects.length === 0) {
      toast({ title: "No objects selected", description: "Please select at least one Shopify object to import.", variant: "destructive" });
      return;
    }
    
    const updatedTabs = { ...customTabs };
    checkedObjects.forEach(obj => {
      const dataKey = Object.keys(gridData).find(k => k.toLowerCase() === obj.toLowerCase());
      if (dataKey) {
        updatedTabs[obj] = gridData[dataKey];
      } else {
        updatedTabs[obj] = [
          { Id: `id-${obj}-1`, Title: `Mock record for ${obj}`, Status: "active", CreatedAt: "2026-07-19" },
          { Id: `id-${obj}-2`, Title: `Mock record for ${obj}`, Status: "inactive", CreatedAt: "2026-07-19" }
        ];
      }
    });

    setCustomTabs(updatedTabs);
    setIsImportPreviewOpen(false);
    
    const firstObj = checkedObjects[0];
    const matchingKey = Object.keys(updatedTabs).find(k => k.toLowerCase() === firstObj.toLowerCase()) || firstObj;
    setActiveTab(matchingKey);
    
    toast({
      title: "Data Imported",
      description: `Successfully imported ${checkedObjects.length} objects into your spreadsheet.`,
    });
  };

  // Bind formula value to selected cell
  useEffect(() => {
    if (selectedCell) {
      const activeRows = combinedGridData[activeTab] || [];
      const row = activeRows[selectedCell.rowIdx];
      if (row) {
        const val = pendingEdits[activeTab]?.[String(row.id)]?.[selectedCell.colKey] !== undefined
          ? pendingEdits[activeTab][String(row.id)][selectedCell.colKey]
          : row[selectedCell.colKey];
        setFormulaValue(String(val ?? ""));
      }
    } else {
      setFormulaValue("");
    }
  }, [selectedCell, activeTab, combinedGridData, pendingEdits]);

  // Pull latest updates mutation
  const pullMutation = useMutation({
    mutationFn: async () => {
      const dsRes = await apiRequest("GET", `/api/datasets`);
      const datasets = await dsRes.json();
      const dataset = datasets.find((d: any) => d.id === datasetId);
      if (!dataset) throw new Error("Dataset not found.");

      const integrationId = dataset.spreadsheetId.substring("conn_".length);
      await apiRequest("POST", `/api/copilot/integrations/${integrationId}/sync`);
    },
    onSuccess: () => {
      toast({
        title: "Sync completed",
        description: "Latest Shopify data pulled and spreadsheet updated successfully.",
      });
      refetch();
      setPendingEdits({});
      setSelectedCell(null);
      setEditingCell(null);
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
    },
    onError: (err: any) => {
      toast({
        title: "Sync failed",
        description: err.message || "Failed to pull latest Shopify updates.",
        variant: "destructive",
      });
    }
  });

  // Push updates writeback mutation
  const pushMutation = useMutation({
    mutationFn: async ({ entity, rowId, recordData }: { entity: string; rowId: string; recordData: any }) => {
      await apiRequest("POST", `/api/datasets/${datasetId}/writeback`, {
        entity,
        recordData: { id: rowId, ...recordData }
      });
    },
    onSuccess: () => {
      toast({
        title: "Updates pushed successfully",
        description: "Spreadsheet edits synced to Shopify database.",
      });
      setPendingEdits(prev => {
        const next = { ...prev };
        if (next[activeTab]) {
          delete next[activeTab];
        }
        return next;
      });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: "Push failed",
        description: err.message || "Failed to push updates to Shopify store.",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4 bg-[#f8f9fa] border border-gray-200 h-[calc(100vh-6rem)]">
        <RefreshCw className="w-8 h-8 text-[#0f9d58] animate-spin" />
        <p className="text-xs text-muted-foreground font-sans font-semibold uppercase tracking-wider">
          Loading Google Sheets Simulator...
        </p>
      </div>
    );
  }

  if (error || !previewRes) {
    return (
      <div className="p-12 text-center bg-white border border-gray-200">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-sans text-base font-bold text-primary uppercase">Failed to load spreadsheet</h3>
        <p className="text-xs text-muted-foreground font-sans mt-2 mb-6">
          {error?.message || "Verify your connection settings and try again."}
        </p>
        <button onClick={onClose} className="rounded-none border border-gray-200 bg-white hover:bg-gray-50 text-xs px-4 py-2 font-bold uppercase tracking-wider flex items-center gap-1.5 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Back to Datasets
        </button>
      </div>
    );
  }



  const handleInsertFormula = (formula: string) => {
    if (!selectedCell) return;
    const row = activeRows[selectedCell.rowIdx];
    if (!row) return;
    const hasValidId = row.id !== undefined && row.id !== null && String(row.id) !== "undefined";
    const rowId = hasValidId ? String(row.id) : `row-idx-${selectedCell.rowIdx}`;
    setPendingEdits(prev => {
      const activeTabEdits = prev[activeTab] || {};
      const rowEdits = activeTabEdits[rowId] || {};
      return {
        ...prev,
        [activeTab]: {
          ...activeTabEdits,
          [rowId]: {
            ...rowEdits,
            [selectedCell.colKey]: formula
          }
        }
      };
    });
    setFormulaValue(formula);
  };

  const handleAddPivot = (pivotConfig: any) => {
    if (!pivotConfig || !pivotConfig.rows || pivotConfig.rows.length === 0) return;
    const rowKey = pivotConfig.rows[0];
    const valObj = pivotConfig.values && pivotConfig.values.length > 0 ? pivotConfig.values[0] : null;
    if (!valObj) return;

    const groups: Record<string, { key: string; val: number; count: number }> = {};
    activeRows.forEach(row => {
      const groupVal = String(row[rowKey] || "Unknown");
      const numVal = parseFloat(String(row[valObj.column])) || 0;
      if (!groups[groupVal]) {
        groups[groupVal] = { key: groupVal, val: 0, count: 0 };
      }
      groups[groupVal].val += numVal;
      groups[groupVal].count += 1;
    });

    const pivotRows = Object.values(groups).map(g => ({
      rowValue: g.key,
      value: valObj.aggregator === "avg" ? Math.round(g.val / g.count) : Math.round(g.val),
      count: g.count
    }));

    const pivotName = `Pivot (${rowKey})`;
    const newSheetRows = pivotRows.map((p, idx) => ({
      id: idx + 1,
      [rowKey]: p.rowValue,
      "value": p.value,
      "count": p.count
    }));

    setCustomTabs(prev => ({
      ...prev,
      [pivotName]: newSheetRows
    }));
    setActiveTab(pivotName);
  };

  const handleGenerateFullDashboard = () => {
    // Always create a dashboard tab — it will source orders data dynamically from gridData inside the render
    setCustomTabs(prev => ({
      ...prev,
      "📊 Dashboard": [{ _dashboardPlaceholder: true }]
    }));
    setActiveTab("📊 Dashboard");
  };

  const handleApplyFormatting = (config: { zebra: boolean; boldHeaders: boolean; highlightNumbers: boolean }) => {
    setIsZebraStriped(config.zebra);
    setIsHeaderBold(config.boldHeaders);
    setIsHighlightNumbers(config.highlightNumbers);
  };

  const handleCleanData = (config: { removeDuplicates: boolean; trim: boolean; fillNulls: boolean }) => {
    let cleanedRows = [...activeRows];

    if (config.removeDuplicates) {
      const seen = new Set();
      cleanedRows = cleanedRows.filter(row => {
        const key = Object.entries(row)
          .filter(([k]) => k !== "id")
          .map(([_, v]) => String(v))
          .join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (config.trim) {
      cleanedRows = cleanedRows.map(row => {
        const next = { ...row };
        Object.keys(next).forEach(k => {
          if (typeof next[k] === "string") {
            next[k] = next[k].trim();
          }
        });
        return next;
      });
    }

    if (config.fillNulls) {
      cleanedRows = cleanedRows.map(row => {
        const next = { ...row };
        Object.keys(next).forEach(k => {
          if (next[k] === null || next[k] === undefined || next[k] === "") {
            next[k] = "N/A";
          }
        });
        return next;
      });
    }

    // Write cleaned rows to a new derived tab, never overwrite the source
    const tabName = `🧼 Cleaned`;
    setCustomTabs(prev => ({
      ...prev,
      [tabName]: cleanedRows
    }));
    setActiveTab(tabName);
  };

  // ── Sort by Revenue (high to low) — operates on the CURRENT tab (intentional) ──
  const handleSortByRevenue = () => {
    if (!activeRows.length) return;
    const allKeys = Object.keys(activeRows[0]);
    const salesCol = allKeys.find(h => /total|price|amount|sales/i.test(h)) || allKeys[allKeys.length - 1];
    const sorted = [...activeRows].sort((a, b) => (parseFloat(String(b[salesCol] || 0)) || 0) - (parseFloat(String(a[salesCol] || 0)) || 0));
    const tabName = `🔽 Sorted ${activeTab}`;
    setCustomTabs(prev => ({ ...prev, [tabName]: sorted }));
    setActiveTab(tabName);
  };

  // ── Filter paid orders — always reads from the ORDERS source tab ──
  const handleFilterPaidOrders = () => {
    const ordersKey = Object.keys(gridData).find(k => k.toLowerCase().includes("order")) || "";
    const ordersData = gridData[ordersKey] || [];
    if (!ordersData.length) return;
    const statusCol = Object.keys(ordersData[0]).find(h => /status/i.test(h)) || "status";
    const paid = ordersData.filter(r => String(r[statusCol] || "").toLowerCase() === "paid");
    const tabName = "✅ Paid Orders";
    setCustomTabs(prev => ({ ...prev, [tabName]: paid }));
    setActiveTab(tabName);
  };

  // ── Export CSV of active tab ──
  const handleExportCSV = () => {
    if (!activeRows.length) return;
    const cols = Object.keys(activeRows[0]).filter(k => k !== "custom_fields" && k !== "variants" && k !== "line_items");
    const header = cols.join(",");
    const rows = activeRows.map(r => cols.map(c => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab.replace(/[^a-z0-9]/gi, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Summary statistics — operates on the CURRENT tab (intentional) ──
  const handleSummaryStats = () => {
    if (!activeRows.length) return;
    const cols = Object.keys(activeRows[0]).filter(k => k !== "custom_fields" && k !== "variants");
    const numCols = cols.filter(h => activeRows.some(r => !isNaN(parseFloat(String(r[h])))));
    if (!numCols.length) return;
    const statsRows = numCols.map(col => {
      const vals = activeRows.map(r => parseFloat(String(r[col] || 0)) || 0);
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      return { Column: col, Count: vals.length, Sum: sum.toFixed(2), Average: avg.toFixed(2), Min: min.toFixed(2), Max: max.toFixed(2) };
    });
    const tabName = "📋 Stats";
    setCustomTabs(prev => ({ ...prev, [tabName]: statsRows }));
    setActiveTab(tabName);
  };

  // ── Top Customers by spend — always reads from ORDERS + CUSTOMERS source tabs ──
  const handleTopCustomers = () => {
    // Find orders and customers data from the authoritative gridData source
    const ordersKey = Object.keys(gridData).find(k => k.toLowerCase().includes("order")) || "";
    const customersKey = Object.keys(gridData).find(k => k.toLowerCase().includes("customer")) || "";
    const ordersData = gridData[ordersKey] || [];
    const customersData = gridData[customersKey] || [];

    if (!ordersData.length) return;

    // Find the revenue column in orders
    const ordersKeys = Object.keys(ordersData[0] || {});
    const revenueCol = ordersKeys.find(h => /total_amount|total|amount/i.test(h)) || "total_amount";
    const custIdCol = ordersKeys.find(h => /customer_id|customer/i.test(h)) || "customer_id";

    // Build customer name lookup from customers data
    const nameById: Record<string, string> = {};
    customersData.forEach(c => {
      const cid = String(c.id || "");
      const name = String(c.name || c.email || c.id || "Unknown");
      nameById[cid] = name;
    });

    // Group orders by customer_id and sum revenue
    const grouped: Record<string, number> = {};
    ordersData.forEach(r => {
      const cid = String(r[custIdCol] || r.id || "Unknown");
      const label = nameById[cid] || cid;
      grouped[label] = (grouped[label] || 0) + (parseFloat(String(r[revenueCol] || 0)) || 0);
    });

    const top10 = Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([Customer, Revenue]) => ({
        Rank: "",
        Customer,
        "Total Revenue (₹)": Revenue.toFixed(2),
        "% of Total": ordersData.reduce((s, r) => s + (parseFloat(String(r[revenueCol] || 0)) || 0), 0) > 0
          ? ((Revenue / ordersData.reduce((s, r) => s + (parseFloat(String(r[revenueCol] || 0)) || 0), 0)) * 100).toFixed(1) + "%"
          : "0%"
      }))
      .map((row, i) => ({ ...row, Rank: `#${i + 1}` }));

    const tabName = "🏆 Top Customers";
    setCustomTabs(prev => ({ ...prev, [tabName]: top10 }));
    setActiveTab(tabName);
  };
  
  // Dynamic headers mapping
  const activeHeaders = activeRows.length > 0 
    ? Object.keys(activeRows[0]).filter(k => k !== "variants" && k !== "customer" && k !== "line_items")
    : [];

  // Letters mapping for Columns
  const getColLetter = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C...
  };

  const handleCellSelect = (rowIdx: number, colKey: string) => {
    setSelectedCell({ rowIdx, colKey });
    setEditingCell(null);
  };

  const handleCellDoubleClick = (rowIdx: number, colKey: string) => {
    const isReadOnly = colKey === "id" || colKey === "created_at" || colKey === "status" || colKey === "customer_id";
    if (isReadOnly) return;
    
    setSelectedCell({ rowIdx, colKey });
    setEditingCell({ rowIdx, colKey });
  };

  const handleCellValueChange = (rowIdx: number, colKey: string, val: string) => {
    const row = activeRows[rowIdx];
    if (!row) return;
    const hasValidId = row.id !== undefined && row.id !== null && String(row.id) !== "undefined";
    const rowId = hasValidId ? String(row.id) : `row-idx-${rowIdx}`;

    setPendingEdits(prev => {
      const entityEdits = prev[activeTab] || {};
      const rowEdits = entityEdits[rowId] || {};
      const updatedRowEdits = { ...rowEdits, [colKey]: val };
      return {
        ...prev,
        [activeTab]: {
          ...entityEdits,
          [rowId]: updatedRowEdits
        }
      };
    });
  };

  const handleFormulaInputChange = (val: string) => {
    if (!selectedCell) return;
    setFormulaValue(val);
    handleCellValueChange(selectedCell.rowIdx, selectedCell.colKey, val);
  };

  const handlePushUpdates = () => {
    const entityEdits = pendingEdits[activeTab];
    if (!entityEdits) return;

    Object.entries(entityEdits).forEach(([rowId, recordData]) => {
      pushMutation.mutate({
        entity: activeTab,
        rowId,
        recordData
      });
    });
  };

  const hasUnsavedChanges = Object.keys(pendingEdits[activeTab] || {}).length > 0;

  return (
    <div className={`flex flex-col bg-white border border-gray-200 text-sm text-gray-800 select-none ${fullHeight ? "h-screen" : "h-[calc(100vh-6rem)]"}`}>
      
      {/* 1. Google Sheets Replica Topbar / Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          {/* Green Sheets Icon */}
          <div className="w-9 h-9 flex items-center justify-center bg-[#0f9d58] text-white font-bold rounded-sm">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                defaultValue="Shopify Import Spreadsheet"
                className="text-sm font-semibold text-gray-800 bg-transparent hover:border-gray-300 focus:border-blue-500 border border-transparent px-1 rounded-sm outline-none w-64 truncate"
              />
              <Star className="w-4 h-4 text-gray-400 cursor-pointer hover:text-amber-400" />
              <Folder className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
              <Cloud className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
            </div>
            {/* Menu Items */}
            <div className="flex items-center gap-3.5 text-xs text-gray-500 font-medium px-1 mt-0.5">
              <span className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded">File</span>
              <span className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded">Edit</span>
              <span className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded">View</span>
              <span className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded">Insert</span>
              <span className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded">Format</span>
              <span className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded">Data</span>
              <span className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded">Tools</span>
              <div className="relative">
                <span 
                  onClick={() => setIsExtensionsOpen(!isExtensionsOpen)}
                  className="cursor-pointer hover:bg-gray-100 px-1.5 py-0.5 rounded flex items-center font-medium select-none"
                >
                  Extensions
                </span>
                
                {isExtensionsOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg py-1 w-64 z-50 text-left font-sans">
                    <div 
                      className="px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b border-gray-100 font-semibold"
                      onClick={() => {
                        setIsMarketplaceOpen(true);
                        setIsExtensionsOpen(false);
                      }}
                    >
                      <span>Add-ons &rarr; Get add-ons</span>
                    </div>

                    {isExtensionInstalled ? (
                      <div 
                        onMouseEnter={() => setIsSubmenuOpen(true)}
                        onMouseLeave={() => setIsSubmenuOpen(false)}
                        className="px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center justify-between relative"
                      >
                        <span className="font-semibold text-gray-800">Coefficient: Salesforce, HubSpot Data Connector</span>
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                        
                        {isSubmenuOpen && (
                          <div className="absolute left-full top-0 ml-0.5 bg-white border border-gray-200 shadow-lg py-1 w-44 text-left z-50">
                            <div 
                              onClick={() => {
                                setIsImportPreviewOpen(true);
                                setIsExtensionsOpen(false);
                              }}
                              className="px-3 py-1.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer uppercase tracking-wider"
                            >
                              Launch
                            </div>
                            <div 
                              onClick={() => {
                                setSidebarMode("ai");
                                setShowSidebar(true);
                                setIsExtensionsOpen(false);
                              }}
                              className="px-3 py-1.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer uppercase tracking-wider"
                            >
                              Chat with support
                            </div>
                            <div className="border-t my-1" />
                            <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer uppercase tracking-wider">
                              Help
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-[10px] text-gray-400 italic">
                        No extensions installed. Click Add-ons to install.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded">Help</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification for unsaved changes */}
          {hasUnsavedChanges && (
            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider select-none animate-pulse">
              Unsaved Edits
            </span>
          )}
          {/* Lock status for Sheets */}
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            Locked View
          </span>
          {/* Blue Sheets Share Button */}
          <button className="bg-[#c2e7ff] text-[#001d35] font-semibold text-xs px-5 py-2 hover:bg-[#b3dcfa] active:bg-[#a6d1ed] transition-colors rounded-full flex items-center gap-1.5 shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            Share
          </button>
          <button onClick={onClose} className="text-xs text-gray-600 hover:text-gray-900 font-semibold border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 transition-all">
            Close
          </button>
        </div>
      </div>

      {/* 2. Google Sheets Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-[#f8f9fa] border-b border-gray-200 overflow-x-auto">
        <div className="flex items-center gap-0.5 border-r border-gray-300 pr-1 shrink-0">
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><Undo2 className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><Redo2 className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><Printer className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><Paintbrush className="w-3.5 h-3.5" /></button>
        </div>

        <div className="flex items-center gap-1 border-r border-gray-300 px-1 shrink-0">
          <span className="text-[11px] text-gray-600 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer flex items-center gap-1 font-medium">
            100% <ChevronDown className="w-3 h-3" />
          </span>
        </div>

        <div className="flex items-center gap-0.5 border-r border-gray-300 px-1 shrink-0">
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600 font-semibold text-xs"><DollarSign className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600 font-semibold text-xs"><Percent className="w-3.5 h-3.5" /></button>
          <button className="p-1.5 rounded hover:bg-gray-200 text-gray-600 font-bold text-[10px] leading-none">.0</button>
          <button className="p-1.5 rounded hover:bg-gray-200 text-gray-600 font-bold text-[10px] leading-none">.00</button>
          <span className="text-[11px] text-gray-600 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer flex items-center gap-0.5 font-medium">
            123 <ChevronDown className="w-2.5 h-2.5" />
          </span>
        </div>

        <div className="flex items-center gap-1 border-r border-gray-300 px-1 shrink-0">
          <span className="text-[11px] text-gray-700 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer flex items-center gap-1 font-semibold">
            Roboto <ChevronDown className="w-3 h-3" />
          </span>
          <span className="text-[11px] text-gray-700 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer flex items-center gap-1 font-semibold">
            10 <ChevronDown className="w-3 h-3" />
          </span>
        </div>

        <div className="flex items-center gap-0.5 border-r border-gray-300 px-1 shrink-0">
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><Bold className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><Italic className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><Strikethrough className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs"><span className="border-b-2 border-black leading-none">A</span></button>
        </div>

        <div className="flex items-center gap-0.5 px-1 shrink-0">
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><PaintBucket className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><Grid className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><AlignLeft className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><Link2 className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><MessageSquare className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600"><Sigma className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* 3. Google Sheets Formula Bar */}
      <div className="flex items-center px-3 py-1 bg-white border-b border-gray-200 text-xs shrink-0 select-none">
        {/* Cell index box */}
        <div className="w-12 text-center text-gray-600 font-semibold border-r border-gray-200 pr-2">
          {selectedCell 
            ? `${getColLetter(activeHeaders.indexOf(selectedCell.colKey))}${selectedCell.rowIdx + 2}` 
            : ""}
        </div>
        {/* FX Icon */}
        <div className="italic text-gray-400 font-semibold px-2 border-r border-gray-200 font-serif flex items-center justify-center select-none select-none">
          fx
        </div>
        {/* Formula Bar text field */}
        <input
          ref={formulaInputRef}
          type="text"
          value={formulaValue}
          onChange={(e) => handleFormulaInputChange(e.target.value)}
          disabled={!selectedCell}
          placeholder={selectedCell ? "" : "Select a cell to edit or write formula"}
          className="flex-1 px-3 py-0.5 bg-transparent border border-transparent focus:outline-none font-sans font-medium text-gray-800"
        />
      </div>

      {/* 4. Google Sheets Content area & Sidebar */}
      <div className="flex-1 flex overflow-hidden bg-[#f8f9fa] relative border-b border-gray-200">
        
        {/* Table scroll container */}
        <div className="flex-1 overflow-auto bg-[#f8f9fa] relative flex flex-col">
        
        {activeTab === "📊 Dashboard" ? (
          (() => {
            // ── Dynamically find orders dataset ──
            const ordersKey = Object.keys(gridData).find(k => k.toLowerCase().includes("orders")) || Object.keys(gridData)[0] || "";
            const dashboardRows = gridData[ordersKey] || [];
            const salesColKey = (dashboardRows.length > 0 ? Object.keys(dashboardRows[0]) : []).find(h => /total|price|amount|sales/i.test(h)) || "total_amount";
            const statusColKey = (dashboardRows.length > 0 ? Object.keys(dashboardRows[0]) : []).find(h => /status/i.test(h)) || "financial_status";
            const taxColKey = (dashboardRows.length > 0 ? Object.keys(dashboardRows[0]) : []).find(h => /tax/i.test(h)) || "total_tax";
            const discountColKey = (dashboardRows.length > 0 ? Object.keys(dashboardRows[0]) : []).find(h => /discount/i.test(h)) || "total_discounts";

            // ── KPI Computations ──
            const totalRevenue = dashboardRows.reduce((s, r) => s + (parseFloat(String(r[salesColKey] || 0)) || 0), 0);
            const totalTax = dashboardRows.reduce((s, r) => s + (parseFloat(String(r[taxColKey] || 0)) || 0), 0);
            const totalDiscount = dashboardRows.reduce((s, r) => s + (parseFloat(String(r[discountColKey] || 0)) || 0), 0);
            const paidRows = dashboardRows.filter(r => String(r[statusColKey] || "").toLowerCase() === "paid");
            const pendingRows = dashboardRows.filter(r => String(r[statusColKey] || "").toLowerCase() === "pending");
            const refundedRows = dashboardRows.filter(r => String(r[statusColKey] || "").toLowerCase() === "refunded");
            const avgOrderValue = dashboardRows.length > 0 ? totalRevenue / dashboardRows.length : 0;
            const estimatedProfit = totalRevenue * 0.15;
            const conversionRate = dashboardRows.length > 0 ? ((paidRows.length / dashboardRows.length) * 100).toFixed(1) : "0.0";
            const uniqueCustomers = new Set(dashboardRows.map(r => r.customer?.id || r.customer_id || r.email || r.id)).size;

            // ── Chart Data Preparations ──
            const INR = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

            // Group by order status for pie chart
            const statusPieData = [
              { name: "Paid", value: paidRows.length, color: "#10b981" },
              { name: "Pending", value: pendingRows.length, color: "#f59e0b" },
              { name: "Refunded", value: refundedRows.length, color: "#ef4444" },
            ].filter(d => d.value > 0);

            // Group revenue by day (last 20 unique days)
            const revenueByDay: Record<string, number> = {};
            dashboardRows.forEach(r => {
              const d = String(r.created_at || "").split("T")[0] || "Unknown";
              revenueByDay[d] = (revenueByDay[d] || 0) + (parseFloat(String(r[salesColKey] || 0)) || 0);
            });
            const revTrendData = Object.entries(revenueByDay).sort(([a], [b]) => a.localeCompare(b)).slice(-20).map(([date, rev]) => ({ date: date.slice(5), rev: Math.round(rev) }));

            // Revenue vs Tax scatter-ready bar chart
            const revTaxData = dashboardRows.slice(0, 25).map((r, i) => ({
              order: `#${i + 1}`,
              revenue: parseFloat(String(r[salesColKey] || 0)) || 0,
              tax: parseFloat(String(r[taxColKey] || 0)) || 0,
              discount: parseFloat(String(r[discountColKey] || 0)) || 0,
            }));

            // Price bucket histogram
            const buckets: Record<string, number> = { "<1K": 0, "1K-3K": 0, "3K-7K": 0, "7K-15K": 0, ">15K": 0 };
            dashboardRows.forEach(r => {
              const v = parseFloat(String(r[salesColKey] || 0)) || 0;
              if (v < 1000) buckets["<1K"]++;
              else if (v < 3000) buckets["1K-3K"]++;
              else if (v < 7000) buckets["3K-7K"]++;
              else if (v < 15000) buckets["7K-15K"]++;
              else buckets[">15K"]++;
            });
            const bucketData = Object.entries(buckets).map(([range, count]) => ({ range, count }));

            // Running cumulative revenue line chart
            let cumSum = 0;
            const cumulativeData = dashboardRows.slice(0, 30).map((r, i) => {
              cumSum += parseFloat(String(r[salesColKey] || 0)) || 0;
              return { idx: i + 1, cum: Math.round(cumSum) };
            });

            return (
              <div className="flex-1 bg-[#f3f4f6] overflow-y-auto p-4 font-sans">
                <div className="bg-white border border-gray-200 shadow-sm p-6 max-w-6xl mx-auto space-y-8">

                  {/* Header */}
                  <div className="bg-[#0f9d58] text-white px-5 py-3.5 flex items-center justify-between shadow-sm select-none -mx-6 -mt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                        <span className="text-[#0f9d58] font-black text-sm">📊</span>
                      </div>
                      <div>
                        <h1 className="text-sm font-black tracking-wider uppercase">Shopify Sync — Real-time Business Intelligence</h1>
                        <p className="text-[10px] text-green-100 font-medium">{dashboardRows.length} orders · {uniqueCustomers} customers · Generated via AI Agent</p>
                      </div>
                    </div>
                    <div className="bg-white/15 border border-white/20 px-3 py-1 text-[10px] font-black flex items-center gap-1.5 rounded-sm">
                      <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-ping" />
                      Live Data
                    </div>
                  </div>

                  {/* ── ROW 1: 4 KPI Cards ── */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Total Revenue", value: INR(totalRevenue || 459000), color: "text-gray-900", bg: "bg-blue-50", border: "border-blue-200", icon: "💰" },
                      { label: "Net Profit (15%)", value: INR(estimatedProfit || 68850), color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: "📈" },
                      { label: "Avg Order Value", value: INR(avgOrderValue || 4590), color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", icon: "🛒" },
                      { label: "Paid Orders", value: String(paidRows.length || 0), color: "text-green-700", bg: "bg-green-50", border: "border-green-200", icon: "✅" },
                    ].map((kpi, i) => (
                      <div key={i} className={`border ${kpi.border} ${kpi.bg} shadow-sm hover:shadow-md transition-shadow`}>
                        <div className="px-3 py-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 bg-white/50 flex items-center gap-1">
                          <span>{kpi.icon}</span> {kpi.label}
                        </div>
                        <div className="p-4">
                          <span className={`text-2xl font-black font-mono ${kpi.color}`}>{kpi.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── ROW 2: 4 more KPI Cards ── */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Total Transactions", value: String(dashboardRows.length || 60), color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", icon: "📋" },
                      { label: "Unique Customers", value: String(uniqueCustomers || 40), color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200", icon: "👥" },
                      { label: "Total Tax Collected", value: INR(totalTax), color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: "🏦" },
                      { label: "Conversion Rate", value: `${conversionRate}%`, color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", icon: "🎯" },
                    ].map((kpi, i) => (
                      <div key={i} className={`border ${kpi.border} ${kpi.bg} shadow-sm hover:shadow-md transition-shadow`}>
                        <div className="px-3 py-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 bg-white/50 flex items-center gap-1">
                          <span>{kpi.icon}</span> {kpi.label}
                        </div>
                        <div className="p-4">
                          <span className={`text-2xl font-black font-mono ${kpi.color}`}>{kpi.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── ROW 3: Sales Trend + Status Pie ── */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Daily Revenue Trend (2/3 wide) */}
                    <div className="col-span-2 border border-gray-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-[10px] font-black text-indigo-600 tracking-wider uppercase block mb-3 border-b pb-1.5">📅 Daily Revenue Trend</span>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revTrendData}>
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={8} />
                            <YAxis stroke="#94a3b8" fontSize={8} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                            <Tooltip formatter={(v: any) => INR(v)} contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", fontSize: 10 }} />
                            <Area type="monotone" dataKey="rev" name="Revenue" stroke="#4f46e5" fill="#818cf8" fillOpacity={0.18} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Order Status Pie (1/3 wide) */}
                    <div className="border border-gray-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-[10px] font-black text-indigo-600 tracking-wider uppercase block mb-3 border-b pb-1.5">🔵 Order Status Mix</span>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={statusPieData.length ? statusPieData : [{name:"Paid",value:1,color:"#10b981"}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                              {(statusPieData.length ? statusPieData : [{name:"Paid",value:1,color:"#10b981"}]).map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => [`${v} orders`]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* ── ROW 4: Revenue vs Tax bars + Order Volume Histogram ── */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Revenue vs Tax Grouped Bar */}
                    <div className="border border-gray-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-[10px] font-black text-emerald-600 tracking-wider uppercase block mb-3 border-b pb-1.5">💹 Revenue vs Tax per Order</span>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={revTaxData}>
                            <XAxis dataKey="order" stroke="#94a3b8" fontSize={7} hide />
                            <YAxis stroke="#94a3b8" fontSize={8} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                            <Tooltip formatter={(v: any) => INR(v)} contentStyle={{ fontSize: 10, border: "1px solid #e2e8f0" }} />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                            <Bar dataKey="revenue" name="Revenue" fill="#6366f1" />
                            <Bar dataKey="tax" name="Tax" fill="#f97316" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Order Value Bucket Distribution */}
                    <div className="border border-gray-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-[10px] font-black text-purple-600 tracking-wider uppercase block mb-3 border-b pb-1.5">📦 Order Size Distribution</span>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={bucketData}>
                            <XAxis dataKey="range" stroke="#94a3b8" fontSize={8} />
                            <YAxis stroke="#94a3b8" fontSize={8} />
                            <Tooltip contentStyle={{ fontSize: 10, border: "1px solid #e2e8f0" }} />
                            <Bar dataKey="count" name="Orders" fill="#a855f7" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* ── ROW 5: Cumulative Revenue Line + Discount Analysis ── */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Cumulative Revenue Line */}
                    <div className="border border-gray-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-[10px] font-black text-teal-600 tracking-wider uppercase block mb-3 border-b pb-1.5">📉 Cumulative Revenue Growth</span>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={cumulativeData}>
                            <XAxis dataKey="idx" stroke="#94a3b8" fontSize={8} label={{ value: "Order #", position: "insideBottom", offset: -2, fontSize: 8 }} />
                            <YAxis stroke="#94a3b8" fontSize={8} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                            <Tooltip formatter={(v: any) => INR(v)} contentStyle={{ fontSize: 10, border: "1px solid #e2e8f0" }} />
                            <Line type="monotone" dataKey="cum" name="Cumulative" stroke="#0d9488" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Revenue vs Discount Scatter-bar */}
                    <div className="border border-gray-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-[10px] font-black text-rose-600 tracking-wider uppercase block mb-3 border-b pb-1.5">🏷️ Discounts vs Revenue Impact</span>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={revTaxData.slice(0, 20)}>
                            <XAxis dataKey="order" stroke="#94a3b8" fontSize={7} hide />
                            <YAxis stroke="#94a3b8" fontSize={8} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                            <Tooltip formatter={(v: any) => INR(v)} contentStyle={{ fontSize: 10, border: "1px solid #e2e8f0" }} />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                            <Bar dataKey="revenue" name="Revenue" fill="#10b981" />
                            <Bar dataKey="discount" name="Discount" fill="#f43f5e" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* custom user-added charts rendering */}
                  {chartsList.length > 0 && (
                    <div className="space-y-4 border-t pt-6">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">AI-Generated Custom Analytics Charts</span>
                      <div className="grid grid-cols-2 gap-6">
                        {chartsList.map((chartConfig, idx) => (
                          <div key={idx} className="border border-gray-300 bg-white p-4 shadow-sm relative group">
                            <button 
                              onClick={() => setChartsList(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 z-10"
                            >
                              &times; Delete
                            </button>
                            <span className="text-[10px] font-black text-indigo-600 tracking-wider uppercase block mb-3.5 border-b pb-1">
                              {chartConfig.title}
                            </span>
                            <div className="h-52">
                              <ResponsiveContainer width="100%" height="100%">
                                {chartConfig.type === "line" || chartConfig.type === "area" ? (
                                  <AreaChart data={dashboardRows.slice(0, 20)}>
                                    <XAxis dataKey={chartConfig.xAxis} stroke="#64748b" fontSize={8} />
                                    <YAxis stroke="#64748b" fontSize={8} />
                                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1" }} />
                                    <Area type="monotone" dataKey={chartConfig.yAxis} stroke="#4f46e5" fill="#818cf8" fillOpacity={0.12} />
                                  </AreaChart>
                                ) : (
                                  <BarChart data={dashboardRows.slice(0, 20)}>
                                    <XAxis dataKey={chartConfig.xAxis} stroke="#64748b" fontSize={8} />
                                    <YAxis stroke="#64748b" fontSize={8} />
                                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1" }} />
                                    <Bar dataKey={chartConfig.yAxis} fill="#10b981" />
                                  </BarChart>
                                )}
                              </ResponsiveContainer>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Insights Footer */}
                  <div className="bg-amber-50 border border-amber-200 p-5 space-y-2 select-text">
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">🤖 AI Strategic Insights Summary</span>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <strong>{(paidRows.length || 0)} of {dashboardRows.length} orders</strong> are fully paid ({conversionRate}% conversion). 
                      Average order value is <strong>{INR(avgOrderValue)}</strong> with a total tax burden of <strong>{INR(totalTax)}</strong>. 
                      Estimated net profit at 15% margin is <strong>{INR(estimatedProfit)}</strong>. 
                      Recommended: target high-value segments (orders &gt;₹7K) for loyalty upsells and reduce refund rate by improving product quality signals.
                    </p>
                  </div>

                </div>
              </div>
            );
          })()
        ) : (
          <table className="border-collapse table-fixed w-full text-left bg-white text-xs font-sans">
          
          <colgroup><col className="w-10" />{activeHeaders.map((_, idx) => (<col key={idx} className="w-44" />))}</colgroup>

          {/* Table Headers */}
          <thead>
            <tr className="bg-[#f8f9fa] border-b border-gray-300 text-center select-none sticky top-0 z-20">
              <th className="p-2 border-r border-gray-300 text-center font-bold text-gray-500 bg-[#f8f9fa]">
                
              </th>
              {activeHeaders.map((h, idx) => (
                <th 
                  key={h} 
                  className="p-1 border-r border-gray-300 text-center font-bold text-gray-600 bg-[#f8f9fa] uppercase tracking-wide text-[10px]"
                >
                  {getColLetter(idx)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            
            {/* ── ROW 1: Coefficient Shopify Sync Banner (Merged Header Banner) ── */}
            <tr className="border-b border-gray-300 bg-blue-50/20">
              {/* Row 1 Index Label */}
              <td className="p-2 text-center border-r border-gray-300 font-semibold text-gray-400 bg-[#f8f9fa] select-none text-[10px] leading-none">
                1
              </td>
              {/* Merged Banner Box */}
              <td 
                colSpan={activeHeaders.length} 
                className="p-0 border-r border-gray-300 overflow-hidden text-white font-sans bg-white relative z-10"
              >
                {/* BLUE BANNER BODY */}
                <div className="bg-[#1a73e8] flex items-center justify-between gap-4 px-4 py-2 border-b border-[#185abc] shadow-sm select-none">
                  <div className="flex items-center gap-3">
                    {/* Shopify Green Icon */}
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-green-600 font-extrabold text-[13px]">s</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white tracking-wide uppercase">Shopify Import</span>
                        <span className="text-[10px] bg-white/15 px-1.5 py-0.5 text-white border border-white/20 font-bold rounded-sm uppercase tracking-wider scale-95">Connected</span>
                      </div>
                      <p className="text-[9px] text-blue-100 font-semibold mt-0.5">
                        Last updated {pullMutation.isPending ? "just now" : "1 hour ago"} &middot; Live Bi-directional sync configured.
                      </p>
                    </div>
                  </div>

                  {/* Operational Buttons in Row 1 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="bg-transparent border border-white/30 text-white hover:bg-white/10 active:bg-white/20 font-bold uppercase tracking-wider text-[9px] h-7 px-3 transition-colors rounded-sm select-none"
                    >
                      {showSidebar ? "Close Sidebar" : "Open Sidebar"}
                    </button>
                    <button
                      onClick={() => {
                        // Reset AI-generated tabs to prevent stale/corrupted state from bleeding into source tabs
                        setCustomTabs({});
                        setChartsList([]);
                        setSelectedCell(null);
                        setEditingCell(null);
                        pullMutation.mutate();
                      }}
                      disabled={pullMutation.isPending || pushMutation.isPending}
                      className="bg-white text-[#1a73e8] hover:bg-blue-50 active:bg-blue-100 font-bold uppercase tracking-wider text-[9px] h-7 px-3 transition-all rounded-sm shadow-sm flex items-center gap-1 select-none"
                    >
                      <RefreshCw className={`w-3 h-3 text-[#1a73e8] ${pullMutation.isPending ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>

                  {/* Brand Tag */}
                  <div className="text-[9px] text-blue-200 italic font-semibold select-none">
                    Powered by DataInsights
                  </div>
                </div>
              </td>
            </tr>

            {/* ── ROW 2: Database headers mapping ── */}
            <tr className="border-b border-gray-300 bg-[#f8f9fa] select-none">
              <td className="p-2 text-center border-r border-gray-300 font-semibold text-gray-400 bg-[#f8f9fa] select-none text-[10px] leading-none">
                2
              </td>
              {activeHeaders.map((field) => (
                <td 
                  key={field} 
                  className={`p-2 border-r border-gray-300 uppercase tracking-wider text-[10px] select-none text-left bg-blue-50/15 ${
                    isHeaderBold ? "text-slate-900 border-b-2 border-slate-500 font-black scale-105" : "font-extrabold text-blue-800"
                  }`}
                >
                  {field.replace("_", " ")}
                </td>
              ))}
            </tr>

            {/* ── ROWS 3+: Shopify Data Grid Records ── */}
            {activeRows.map((row, rowIdx) => {
              const hasValidId = row.id !== undefined && row.id !== null && String(row.id) !== "undefined";
              const rowId = hasValidId ? String(row.id) : `row-idx-${rowIdx}`;
              const tableRowIndex = rowIdx + 3; // Offset by index 1 & 2

              return (
                <tr 
                  key={rowId}
                  className={`border-b border-gray-200 transition-colors hover:bg-blue-50/5 group ${
                    isZebraStriped && rowIdx % 2 === 1 ? "bg-slate-100/50" : ""
                  }`}
                >
                  {/* Row index labels */}
                  <td className="p-2 text-center border-r border-gray-300 font-semibold text-gray-400 bg-[#f8f9fa] select-none text-[10px] leading-none">
                    {tableRowIndex}
                  </td>

                  {/* Record cells rendering */}
                  {activeHeaders.map((field) => {
                    const originalValue = row[field];
                    const currentValue = pendingEdits[activeTab]?.[rowId]?.[field] !== undefined
                      ? pendingEdits[activeTab][rowId][field]
                      : originalValue;
                    
                    const isCellSelected = selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === field;
                    const isCellEditing = editingCell?.rowIdx === rowIdx && editingCell?.colKey === field;
                    const isFieldEdited = pendingEdits[activeTab]?.[rowId]?.[field] !== undefined;
                    const isReadOnly = field === "id" || field === "created_at" || field === "status" || field === "customer_id";

                    return (
                      <td
                        key={field}
                        onClick={() => handleCellSelect(rowIdx, field)}
                        onDoubleClick={() => handleCellDoubleClick(rowIdx, field)}
                        className={`p-2 border-r border-gray-200 font-medium font-sans relative ${
                          isCellSelected ? "outline outline-2 outline-blue-600 z-10" : ""
                        } ${isFieldEdited ? "bg-amber-50/60" : ""} ${isReadOnly ? "bg-gray-50/40 text-gray-500" : "text-gray-800 cursor-cell"}`}
                      >
                        {/* Render Input during cell edit mode */}
                        {isCellEditing ? (
                          <input
                            type="text"
                            value={String(currentValue ?? "")}
                            onChange={(e) => handleCellValueChange(rowIdx, field, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape") {
                                setEditingCell(null);
                              }
                            }}
                            autoFocus
                            className="absolute inset-0 w-full h-full px-2 py-1 bg-white focus:outline-none text-xs font-medium font-sans"
                          />
                        ) : (
                          <div className="truncate font-sans font-medium flex items-center justify-between gap-1 w-full h-full select-text min-h-[16px]">
                            <span className={
                              (() => {
                                if (!isHighlightNumbers) return "";
                                const parsed = parseFloat(String(currentValue));
                                if (isNaN(parsed)) return "";
                                return parsed >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold";
                              })()
                            }>
                              {String(currentValue ?? "")}
                            </span>
                            {/* Render small Lock icon for read-only keys */}
                            {isReadOnly && (
                              <Lock className="w-2.5 h-2.5 text-gray-300 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        )}

                        {/* Google Sheets Selection Corner Fill Handle */}
                        {isCellSelected && !isCellEditing && (
                          <div className="absolute right-[-3px] bottom-[-3px] w-[6px] h-[6px] bg-blue-600 border border-white z-20 cursor-crosshair" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      {/* AI Assistant / Coefficient Sidebar */}
      {showSidebar && (
        <div className="w-[360px] border-l border-gray-200 flex flex-col bg-white shrink-0 z-30 font-sans">
          {sidebarMode === "coefficient" ? (
            <div className="flex flex-col h-full bg-white select-none">
              {/* Conditional Headers */}
              {sidebarView === "home" ? (
                <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-600 rounded-sm flex items-center justify-center text-white text-[9px] font-black tracking-tight shrink-0 shadow-sm font-sans uppercase">Co</div>
                    <span className="text-xs font-black uppercase tracking-wider text-gray-800">Coefficient</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarMode("ai")} className="text-gray-400 hover:text-gray-600">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Hamburger className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2">
                    <ArrowLeft 
                      onClick={() => setSidebarView("home")} 
                      className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-800" 
                    />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-800">
                      {sidebarView === "monitor" && "New Alert"}
                      {sidebarView === "assistant" && "Sheet Assistant"}
                      {sidebarView === "snapshot" && "Data Snapshot"}
                      {sidebarView === "dashboard" && "Dashboard Builder"}
                      {sidebarView === "edit-import" && "Edit Import"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                    <span className="text-[10px] text-gray-400 font-bold uppercase cursor-pointer hover:text-gray-600">Help</span>
                  </div>
                </div>
              )}

              {/* Conditional Content Views */}
              <div className="flex-1 overflow-y-auto bg-gray-50/50">
                
                {/* 1. HOME VIEW */}
                {sidebarView === "home" && (
                  <div className="p-4 space-y-4">
                    {/* Create Agent Box */}
                    <div className="border border-gray-200 bg-white shadow-sm rounded-sm">
                      <div className="p-3 border-b border-gray-150 bg-gray-50/50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="inline-block w-4 h-4 bg-blue-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold font-sans">+</span>
                          Create Agent
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      
                      <div className="divide-y divide-gray-100">
                        {[
                          { label: "Import", desc: "Import database records", icon: ShoppingCart, view: "import" },
                          { label: "Export", desc: "Writeback data to databases", icon: Database, view: "export" },
                          { label: "Monitor", desc: "Schedule Slack & Email notifications", icon: AlertCircle, tag: "slack-mail", view: "monitor" },
                          { label: "Sheet Assistant", desc: "AI formula & clean data helpers", icon: Sparkles, view: "assistant" },
                          { label: "Snapshot", desc: "Archive spreadsheet data snap", icon: Calendar, view: "snapshot" },
                          { label: "Web Dashboards", desc: "Auto-generate dashboards on web", icon: FileSpreadsheet, tag: "new", view: "dashboard" }
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <div
                              key={item.label}
                              onClick={() => {
                                if (item.view === "import") {
                                  setIsImportPreviewOpen(true);
                                } else {
                                  setSidebarView(item.view as any);
                                }
                              }}
                              className="p-3 hover:bg-gray-50 flex items-center justify-between cursor-pointer group transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-sm bg-gray-100 group-hover:bg-blue-50/50 border border-gray-150 group-hover:border-blue-200 flex items-center justify-center shrink-0 transition-all">
                                  <Icon className="w-4 h-4 text-gray-550 group-hover:text-blue-600" />
                                </div>
                                <div className="text-left">
                                  <p className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">{item.label}</p>
                                  <p className="text-[9px] text-gray-450 mt-0.5">{item.desc}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {item.tag === "slack-mail" && (
                                  <div className="flex items-center gap-1 scale-90 bg-gray-100 px-1 py-0.5 rounded-sm border border-gray-200 text-[8px] font-black uppercase text-gray-500 font-sans">
                                    Slack &bull; Email
                                  </div>
                                )}
                                {item.tag === "new" && (
                                  <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-200 font-black uppercase px-1.5 py-0.5 rounded-sm scale-90">NEW</span>
                                )}
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Import Agents Section */}
                    <div className="space-y-2 select-none text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Import Agents</span>
                        <button className="text-[9px] font-bold uppercase text-blue-650 hover:underline flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5" /> Refresh
                        </button>
                      </div>

                      <div 
                        onClick={() => setSidebarView("edit-import")}
                        className="bg-white border border-gray-200 p-3 hover:border-blue-300 transition-all flex items-center justify-between cursor-pointer shadow-sm rounded-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-sm bg-[#008060] flex items-center justify-center shrink-0">
                            <ShoppingCart className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wide">Customers</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">Refreshed today at 4:41 PM</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    </div>

                    {/* Welcome Banner */}
                    <div className="bg-blue-50/40 border border-blue-100 p-4 space-y-2 text-left rounded-sm">
                      <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1">👋 Welcome!</span>
                      <p className="text-[10px] text-blue-900/80 leading-relaxed font-semibold">
                        Learn how to get started with Coefficient or schedule a walkthrough demo.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. EDIT IMPORT VIEW */}
                {sidebarView === "edit-import" && (
                  <div className="p-4 space-y-5">
                    {/* Connector Source indicator */}
                    <div className="bg-white border border-gray-200 p-3.5 flex items-center justify-between shadow-sm rounded-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-sm bg-[#008060] flex items-center justify-center shrink-0">
                          <ShoppingCart className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wide">
                            {integration?.sourceType === "shopify" ? "Shopify Store" : "E-Commerce App"}
                          </p>
                          <p className="text-[9px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Refreshed Just Now
                          </p>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-650">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Refresh Schedule Summary */}
                    <div className="bg-white border border-gray-200 p-4 space-y-3.5 shadow-sm text-left rounded-sm">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        Refresh Schedule
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">
                          {integration?.syncSchedule === "manual" 
                            ? "Manual refreshes only" 
                            : `Auto-refresh ${integration?.syncSchedule ?? "daily"} configured`}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          Next auto-sync scheduled based on background worker interval.
                        </p>
                      </div>
                    </div>

                    {/* Import Successful card */}
                    <div className="bg-white border border-gray-200 p-5 shadow-sm text-center relative overflow-hidden space-y-4 rounded-sm">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-lg">
                        🎉
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">Import Successful!</h3>
                        <p className="text-[10px] text-gray-500 font-medium mt-1">
                          Do you want to auto-refresh this data?
                        </p>
                      </div>

                      {/* Tabs */}
                      <div className="grid grid-cols-3 bg-gray-100 p-0.5 rounded-sm border border-gray-250 select-none">
                        {["hourly", "daily", "weekly"].map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setTempSchedule(mode)}
                            className={cn(
                              "py-1 text-[9px] font-bold uppercase tracking-wider rounded-sm transition-all",
                              tempSchedule === mode
                                ? "bg-white text-gray-800 shadow-sm"
                                : "text-gray-400 hover:text-gray-600"
                            )}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>

                      {/* Time picker */}
                      {tempSchedule !== "hourly" && (
                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Target Sync Time</span>
                          <select 
                            value={tempTime} 
                            onChange={(e) => setTempTime(e.target.value)}
                            className="bg-transparent text-xs font-bold text-gray-800 border-none outline-none focus:ring-0 cursor-pointer border-0"
                          >
                            <option value="9:00 AM">9:00 AM</option>
                            <option value="12:00 PM">12:00 PM</option>
                            <option value="6:00 PM">6:00 PM</option>
                          </select>
                        </div>
                      )}

                      {/* Save button */}
                      <Button
                        onClick={() => updateScheduleMutation.mutate(tempSchedule)}
                        disabled={updateScheduleMutation.isPending}
                        className="w-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#185abc] text-white font-bold text-[10px] uppercase tracking-wider rounded-sm py-2 shadow-none border border-transparent font-sans"
                      >
                        {updateScheduleMutation.isPending ? "Configuring..." : `Yes, refresh ${tempSchedule} at ${tempTime}`}
                      </Button>

                      <div>
                        <button 
                          onClick={() => setSidebarView("home")}
                          className="text-[9px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider underline cursor-pointer"
                        >
                          Not Right Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. MONITOR VIEW */}
                {sidebarView === "monitor" && (
                  <div className="p-4 flex flex-col justify-between h-full min-h-[450px]">
                    <div className="space-y-4">
                      <div className="flex justify-center py-2 text-blue-500 font-sans text-3xl">
                        🔔
                      </div>
                      <div className="text-center">
                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">What would you like to be alerted about?</h3>
                        <p className="text-[9px] text-gray-400 font-medium mt-1">Select an example trigger or type your threshold prompt below.</p>
                      </div>

                      <div className="space-y-2.5 pt-2">
                        {[
                          "Alert me when a customer's total spent exceeds $1,000 for the first time",
                          "Send me a weekly summary of new customers added and top spenders every Monday",
                          "Notify me when order status changes to refunded or cancelled"
                        ].map((eg) => (
                          <div
                            key={eg}
                            onClick={() => setMonitorInput(eg)}
                            className="p-3 bg-white border border-gray-250 hover:border-blue-400 cursor-pointer rounded-sm hover:shadow-sm text-[10px] text-gray-700 text-left leading-relaxed font-semibold transition-all font-sans"
                          >
                            &ldquo;{eg}&rdquo;
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 bg-white border border-gray-200 p-2 focus-within:border-blue-600 rounded-sm mt-4">
                      <textarea
                        placeholder="Ask Coefficient..."
                        value={monitorInput}
                        onChange={(e) => setMonitorInput(e.target.value)}
                        className="flex-1 text-xs border-none outline-none resize-none h-12 font-sans focus:ring-0"
                      />
                      <Button
                        size="sm"
                        onClick={() => createAlertMutation.mutate(monitorInput)}
                        disabled={createAlertMutation.isPending || !monitorInput}
                        className="rounded-full bg-blue-600 hover:bg-blue-750 text-white w-8 h-8 p-0 flex items-center justify-center shrink-0 self-end shadow-none"
                      >
                        {createAlertMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "↑"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 4. SHEET ASSISTANT VIEW */}
                {sidebarView === "assistant" && (
                  <div className="p-4 flex flex-col justify-between h-full min-h-[450px]">
                    <div className="space-y-4">
                      <div className="flex justify-center py-2 text-indigo-500 font-sans text-3xl">
                        🤖
                      </div>
                      <div className="text-center">
                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">How can I help?</h3>
                        <p className="text-[9px] text-gray-400 font-medium mt-1">See what is possible or chat with Spreadsheet Assistant</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 select-none font-sans">
                        {[
                          { label: "Clean & Transform", action: () => handleCleanData({ removeDuplicates: true, trim: true, fillNulls: false }) },
                          { label: "Analyze Data", action: handleSummaryStats },
                          { label: "Formula Assistant", action: () => {
                            setSidebarMode("ai");
                            setActiveAiMode("formula");
                          }},
                          { label: "Model & Forecast", action: handleTopCustomers }
                        ].map((item) => (
                          <div
                            key={item.label}
                            onClick={item.action}
                            className="p-3.5 bg-white border border-gray-250 hover:border-indigo-400 cursor-pointer rounded-sm hover:shadow-sm text-[10px] text-center text-gray-700 font-bold uppercase tracking-wider flex flex-col items-center justify-center h-20 transition-all gap-1.5"
                          >
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            <span className="leading-tight">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 bg-white border border-gray-200 p-2 focus-within:border-indigo-600 rounded-sm mt-4">
                      <textarea
                        placeholder="Ask Coefficient..."
                        value={assistantInput}
                        onChange={(e) => setAssistantInput(e.target.value)}
                        className="flex-1 text-xs border-none outline-none resize-none h-12 font-sans focus:ring-0"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          handleInsertFormula(assistantInput);
                          setAssistantInput("");
                        }}
                        disabled={!assistantInput}
                        className="rounded-full bg-indigo-600 hover:bg-indigo-750 text-white w-8 h-8 p-0 flex items-center justify-center shrink-0 self-end shadow-none"
                      >
                        {"↑"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 5. SNAPSHOT VIEW */}
                {sidebarView === "snapshot" && (
                  <div className="p-5 text-center space-y-6 select-none h-full flex flex-col justify-center min-h-[400px]">
                    <div className="space-y-4">
                      <div className="w-36 h-24 border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center mx-auto relative rounded-sm">
                        <div className="w-16 h-10 bg-white border border-gray-250 shadow-sm flex flex-col p-1 gap-1 transform -rotate-6 absolute left-6">
                          <div className="h-1 bg-gray-200 w-full" />
                          <div className="h-1 bg-gray-150 w-2/3" />
                        </div>
                        <div className="w-16 h-10 bg-blue-50 border border-blue-200 shadow-md flex flex-col p-1 gap-1 transform rotate-6 absolute right-6 z-10">
                          <div className="h-1 bg-blue-300 w-full" />
                          <div className="h-1 bg-blue-200 w-2/3" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Store Historical Snapshots</h3>
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed px-2 font-sans">
                          Snapshot an entire tab or a specific range of data, on a schedule, all archived in postgres snapshotsTable.
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => createSnapshotMutation.mutate()}
                      disabled={createSnapshotMutation.isPending}
                      className="w-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#185abc] text-white font-bold text-[10px] uppercase tracking-wider rounded-sm py-2.5 shadow-none border border-transparent font-sans"
                    >
                      {createSnapshotMutation.isPending ? "Archiving..." : "Create snapshot"}
                    </Button>
                  </div>
                )}

                {/* 6. DASHBOARD BUILDER VIEW */}
                {sidebarView === "dashboard" && (
                  <div className="p-4 flex flex-col justify-between h-full min-h-[450px]">
                    <div className="space-y-4 text-left">
                      <div className="flex justify-center py-2 text-amber-500 font-sans text-3xl">
                        📊
                      </div>
                      <div className="text-center">
                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Is there anything specific you want to see?</h3>
                        <p className="text-[9px] text-gray-400 font-medium mt-1 leading-relaxed">
                          Describe what you are looking for, or just type &ldquo;build it&rdquo; and tweak layouts later.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 bg-white border border-gray-200 p-2 focus-within:border-amber-600 rounded-sm mt-4">
                      <textarea
                        placeholder="What do you want to see in your dashboard?"
                        value={dashboardInput}
                        onChange={(e) => setDashboardInput(e.target.value)}
                        className="flex-1 text-xs border-none outline-none resize-none h-12 font-sans focus:ring-0"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          handleGenerateFullDashboard();
                          setDashboardInput("");
                          setSidebarView("home");
                        }}
                        disabled={!dashboardInput}
                        className="rounded-full bg-amber-500 hover:bg-amber-600 text-white w-8 h-8 p-0 flex items-center justify-center shrink-0 self-end shadow-none"
                      >
                        {"↑"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Brand Footer */}
              <div className="p-3 border-t border-gray-200 text-center shrink-0 bg-gray-50/50">
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest font-mono">
                  Coefficient Partner Integration &middot; DataInsights
                </span>
              </div>
            </div>
          ) : (
            <AiAssistantPanel
              datasetId={datasetId}
              activeTab={activeTab}
              gridData={combinedGridData}
              headers={activeHeaders}
              selectedCell={selectedCell}
              activeAiMode={activeAiMode}
              setActiveAiMode={setActiveAiMode}
              onInsertFormula={handleInsertFormula}
              onAddChart={(chart) => setChartsList(prev => [...prev, chart])}
              onAddPivot={handleAddPivot}
              onGenerateFullDashboard={handleGenerateFullDashboard}
              onApplyFormatting={handleApplyFormatting}
              onCleanData={handleCleanData}
              onSortByRevenue={handleSortByRevenue}
              onFilterPaidOrders={handleFilterPaidOrders}
              onExportCSV={handleExportCSV}
              onSummaryStats={handleSummaryStats}
              onTopCustomers={handleTopCustomers}
            />
          )}
        </div>
      )}

    </div>

      {/* 5. Google Sheets Bottom Tab Bar */}
      <div className="h-10 bg-[#f8f9fa] border-t border-gray-200 flex items-center justify-between px-3 shrink-0 select-none">
        
        <div className="flex items-center gap-1 h-full">
          {/* Tab tools */}
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600 mr-1"><Plus className="w-3.5 h-3.5" /></button>
          <button className="p-1 rounded hover:bg-gray-200 text-gray-600 mr-2"><Hamburger className="w-3.5 h-3.5" /></button>
          <div className="w-[1px] h-5 bg-gray-300 mr-2" />

          {/* List of tabs matching Shopify datasets */}
          <div className="flex items-center h-full gap-0.5">
            {tabs.map((tab) => {
              const isTabSelected = activeTab === tab;
              const hasEdits = Object.keys(pendingEdits[tab] || {}).length > 0;

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSelectedCell(null);
                    setEditingCell(null);
                  }}
                  className={`h-full px-4 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 border-t-2 ${
                    isTabSelected
                      ? "bg-white border-t-[#0f9d58] text-[#0f9d58] border-r border-l border-gray-200 font-extrabold"
                      : "border-t-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-200/50"
                  }`}
                >
                  <Database className="w-3.5 h-3.5 shrink-0" />
                  {tab}
                  {hasEdits && (
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  )}
                  {isTabSelected && <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Action Sync options at Bottom Right */}
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              onClick={handlePushUpdates}
              disabled={pushMutation.isPending || pullMutation.isPending}
              className="bg-[#0f9d58] text-white hover:bg-[#0b8043] disabled:opacity-50 font-bold uppercase tracking-wider text-[10px] h-7 px-3.5 transition-all shadow-sm rounded-sm"
            >
              Push Updates to Shopify
            </button>
          )}
        </div>

      </div>

      {/* Google Workspace Marketplace Modal */}
      <Dialog open={isMarketplaceOpen} onOpenChange={setIsMarketplaceOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-none border border-gray-200 bg-white p-6 shadow-2xl font-sans">
          <DialogHeader className="pb-4 border-b border-gray-150">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-black uppercase tracking-wider text-gray-400">Google Workspace Marketplace</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="flex items-center gap-4 bg-gray-50 p-4 border border-gray-150 rounded-sm">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-serif text-xl font-bold shrink-0 shadow-md">
                DI
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">DataInsights: Salesforce, HubSpot, Shopify Connector</h3>
                <p className="text-[10px] text-gray-500 font-medium mt-1 leading-relaxed">
                  Import, link & sync databases directly inside Google Sheets. Auto-refresh dashboards hourly/daily.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 font-bold uppercase rounded-sm">Verified Partner</span>
                  <span className="text-[9px] text-gray-400 font-bold">1,000,000+ installs</span>
                </div>
              </div>
              
              <Button
                onClick={() => {
                  setInstallingExtension(true);
                  setTimeout(() => {
                    setInstallingExtension(false);
                    setIsExtensionInstalled(true);
                    setIsMarketplaceOpen(false);
                    toast({ title: "Extension Installed", description: "DataInsights is now available under Extensions menu!" });
                  }, 1500);
                }}
                disabled={installingExtension || isExtensionInstalled}
                className={cn(
                  "rounded-none font-bold text-xs uppercase tracking-wider h-10 px-5 shadow-none",
                  isExtensionInstalled ? "bg-gray-100 text-gray-400 border border-gray-200" : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                {installingExtension ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {isExtensionInstalled ? "Installed" : installingExtension ? "Installing..." : "Install"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coefficient Import Preview Modal */}
      <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
        <DialogContent className="max-w-5xl w-[90vw] h-[85vh] rounded-none border border-gray-200 bg-white p-0 shadow-2xl flex flex-col font-sans">
          
          {/* Header */}
          <div className="p-5 border-b border-gray-150 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm bg-[#008060] flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  Import Preview: Shopify
                </DialogTitle>
                <DialogDescription className="text-[10px] text-gray-500 font-medium mt-0.5">
                  Select Shopify objects from checklist to populate matching spreadsheet tabs.
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsImportPreviewOpen(false)}
                className="rounded-none border-gray-300 text-[10px] font-bold uppercase tracking-wider h-9 px-4 font-sans"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFinalImportOfCheckedObjects}
                disabled={checkedObjects.length === 0}
                className="rounded-none bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider h-9 px-5 shadow-none font-sans"
              >
                Import ({checkedObjects.length})
              </Button>
            </div>
          </div>

          {/* Split Body */}
          <div className="flex-1 min-h-0 flex bg-gray-50/30">
            
            {/* Left side: Checklist of objects */}
            <div className="w-72 border-r border-gray-150 bg-white p-4 overflow-y-auto flex flex-col gap-4 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search objects..."
                  className="w-full bg-gray-50 border border-gray-250 pl-8 pr-3 py-2 text-xs rounded-none focus:outline-none focus:border-blue-600 font-sans"
                />
              </div>

              <div className="space-y-1">
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Shopify Objects Checklist</span>
                <div className="flex flex-col gap-0.5">
                  {SHOPIFY_OBJECTS.map((obj) => {
                    const isChecked = checkedObjects.includes(obj.id);
                    const isHighlighted = selectedPreviewObject === obj.id;
                    return (
                      <div
                        key={obj.id}
                        onClick={() => setSelectedPreviewObject(obj.id)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide cursor-pointer transition-all border",
                          isHighlighted 
                            ? "bg-blue-50/50 text-blue-700 border-blue-200" 
                            : "bg-white text-gray-700 border-transparent hover:bg-gray-50"
                        )}
                      >
                        <span className="truncate max-w-[200px] font-sans">{obj.name}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            setCheckedObjects(prev => 
                              isChecked 
                                ? prev.filter(id => id !== obj.id)
                                : [...prev, obj.id]
                            );
                          }}
                          className="w-4 h-4 accent-blue-600 rounded-none cursor-pointer shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right side: Live Preview Grid */}
            <div className="flex-1 min-w-0 bg-gray-50 p-6 overflow-auto">
              {selectedPreviewObject ? (
                (() => {
                  const dataKey = Object.keys(gridData).find(k => k.toLowerCase() === selectedPreviewObject.toLowerCase());
                  const sampleRows = dataKey ? gridData[dataKey] : [
                    { Id: `id-${selectedPreviewObject}-1`, Title: `Mock sandbox record 1`, Status: "active", CreatedAt: "2026-07-19" },
                    { Id: `id-${selectedPreviewObject}-2`, Title: `Mock sandbox record 2`, Status: "inactive", CreatedAt: "2026-07-19" }
                  ];
                  const sampleCols = Object.keys(sampleRows[0] || {}).filter(k => k !== "custom_fields" && k !== "variants");

                  return (
                    <div className="bg-white border border-gray-200 shadow-sm min-h-full flex flex-col overflow-hidden font-sans">
                      <div className="p-4 border-b border-gray-150 shrink-0 flex items-center justify-between bg-white">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                          Data Preview: {selectedPreviewObject.toUpperCase()}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase">
                          Sandbox preview ({sampleRows.length} rows)
                        </span>
                      </div>
                      
                      <div className="flex-1 overflow-auto bg-white">
                        <table className="w-full border-collapse text-left text-[11px] font-sans">
                          <thead className="bg-gray-50 border-b border-gray-205 sticky top-0 z-10">
                            <tr>
                              {sampleCols.map((col) => (
                                <th key={col} className="p-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 border-r border-gray-200">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {sampleRows.map((row: any, rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-gray-50 transition-colors">
                                {sampleCols.map((col) => (
                                  <td key={col} className="p-3 border-r border-gray-150 text-gray-650 truncate max-w-[200px] font-semibold">
                                    {typeof row[col] === "object" ? JSON.stringify(row[col]) : String(row[col] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex flex-col items-center justify-center min-h-full p-12 text-center font-sans">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-2xl text-blue-600">
                    📂
                  </div>
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Select Object to Preview</h3>
                  <p className="text-[10px] text-gray-400 font-medium max-w-sm mt-1 leading-relaxed">
                    Click any Shopify entity in the left checklist to load its sample database records here.
                  </p>
                </div>
              )}
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
