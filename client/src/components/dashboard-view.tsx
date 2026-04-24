import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
} from "recharts";
import { 
  Share2, 
  Copy, 
  Check, 
  TrendingUp, 
  TrendingDown,
  Minus,
  ExternalLink,
  RefreshCw,
  Loader2,
  Download,
  Pencil,
  Upload,
  Save,
  X,
  Plus,
  Trash2,
  BarChart3,
  Table,
  ChevronDown,
  Settings,
  Activity,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  AreaChart,
  ScatterChart,
  Gauge,
  GitBranch,
  LayoutGrid,
  Layers,
  Target,
  ArrowUpDown,
  Palette,
  Eye,
  Grid3X3,
  TrendingUp as Trendline,
  Sparkles,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getIdToken } from "@/lib/firebase";
import type { Dashboard, Dataset, ChartConfig } from "@shared/schema";

interface DashboardViewProps {
  dashboardId: string;
}

// Chart type configurations
const CHART_TYPES = [
  { value: 'kpi', label: 'KPI Card', icon: Target, category: 'Metrics' },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3, category: 'Comparison' },
  { value: 'horizontal_bar', label: 'Horizontal Bar', icon: BarChart3, category: 'Comparison' },
  { value: 'stacked_bar', label: 'Stacked Bar', icon: Layers, category: 'Comparison' },
  { value: 'line', label: 'Line Chart', icon: LineChartIcon, category: 'Trends' },
  { value: 'area', label: 'Area Chart', icon: AreaChart, category: 'Trends' },
  { value: 'pie', label: 'Pie Chart', icon: PieChartIcon, category: 'Distribution' },
  { value: 'donut', label: 'Donut Chart', icon: PieChartIcon, category: 'Distribution' },
  { value: 'scatter', label: 'Scatter Plot', icon: ScatterChart, category: 'Correlation' },
  { value: 'combo', label: 'Combo Chart', icon: Activity, category: 'Mixed' },
  { value: 'funnel', label: 'Funnel Chart', icon: GitBranch, category: 'Process' },
  { value: 'gauge', label: 'Gauge', icon: Gauge, category: 'Metrics' },
  { value: 'treemap', label: 'Treemap', icon: LayoutGrid, category: 'Hierarchy' },
  { value: 'table', label: 'Data Table', icon: Table, category: 'Detail' },
];

const COLOR_SCHEMES = {
  default: ["hsl(43, 74%, 49%)", "hsl(200, 65%, 38%)", "hsl(280, 55%, 42%)", "hsl(25, 70%, 45%)", "hsl(160, 60%, 40%)"],
  rainbow: ["#e74c3c", "#f39c12", "#27ae60", "#3498db", "#9b59b6", "#1abc9c"],
  blue: ["#1a365d", "#2a4365", "#2c5282", "#2b6cb0", "#3182ce", "#4299e1"],
  green: ["#1a4731", "#22543d", "#276749", "#2f855a", "#38a169", "#48bb78"],
  warm: ["#c53030", "#dd6b20", "#d69e2e", "#ed8936", "#f6ad55", "#fbd38d"],
  cool: ["#2c5282", "#2b6cb0", "#319795", "#38b2ac", "#4fd1c5", "#81e6d9"],
  monochrome: ["#1a202c", "#2d3748", "#4a5568", "#718096", "#a0aec0", "#cbd5e0"],
};

const AGGREGATIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'average', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
  { value: 'median', label: 'Median' },
];

const CHART_COLORS = [
  "hsl(43, 74%, 49%)", // Gold
  "hsl(200, 65%, 38%)", // Blue
  "hsl(280, 55%, 42%)", // Purple
  "hsl(25, 70%, 45%)", // Orange
  "hsl(160, 60%, 40%)", // Teal
];

export default function DashboardView({ dashboardId }: DashboardViewProps) {
  const [copied, setCopied] = useState(false);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [chartEditorOpen, setChartEditorOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isTypingInsights, setIsTypingInsights] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editableData, setEditableData] = useState<Record<string, any>[]>([]);
  const [editableHeaders, setEditableHeaders] = useState<string[]>([]);
  const [editableCharts, setEditableCharts] = useState<ChartConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasChartChanges, setHasChartChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCharts, setSavingCharts] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ dashboard: Dashboard; dataset: Dataset }>({
    queryKey: ["/api/dashboards", dashboardId],
  });

  const dashboard = data?.dashboard;
  const dataset = data?.dataset;

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/dashboards/${dashboardId}`, { isPublic: true });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards", dashboardId] });
    },
    onError: () => {
      toast({ title: "Failed to generate share link", variant: "destructive" });
    },
  });

  const buildLocalInsights = () => {
    const rows = dataset?.data || [];
    const headers = dataset?.headers || [];
    if (rows.length === 0 || headers.length === 0) {
      return [
        "The dataset is currently empty, so no trend analysis can be computed.",
        "Upload or sync data to generate metric-driven insights and chart narratives.",
        "Once records are available, AI insights will summarize top categories and movements.",
        "Use Edit Data to refresh values and regenerate a complete analytical summary.",
      ].join("\n");
    }

    const numericHeaders = headers.filter((h) => rows.some((r) => !isNaN(parseFloat(String(r[h])))));
    const categoryHeaders = headers.filter((h) => rows.some((r) => isNaN(parseFloat(String(r[h]))) && String(r[h] ?? "").trim() !== ""));
    const primaryCategory = categoryHeaders[0] || headers[0];
    const primaryNumeric = numericHeaders[0];

    const uniqueCount = new Set(rows.map((r) => String(r[primaryCategory] ?? "").toLowerCase().trim()).filter(Boolean)).size;

    let numericLine = "Numeric columns are limited, so the dashboard is currently highlighting distribution patterns.";
    if (primaryNumeric) {
      const vals = rows.map((r) => parseFloat(String(r[primaryNumeric]))).filter((n) => !isNaN(n));
      const total = vals.reduce((a, b) => a + b, 0);
      const avg = vals.length ? total / vals.length : 0;
      numericLine = `${primaryNumeric} totals ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}, with an average of ${avg.toLocaleString(undefined, { maximumFractionDigits: 2 })} per record.`;
    }

    return [
      `This dashboard analyzes ${rows.length.toLocaleString()} records across ${headers.length} columns for ${dashboard?.title || "the selected dataset"}.`,
      `${primaryCategory} contains ${uniqueCount.toLocaleString()} unique values, indicating the main segmentation axis for this view.`,
      numericLine,
      "Current chart composition suggests stable category concentration with room for deeper drill-down using additional dimensions.",
    ].join("\n");
  };

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/dashboards/${dashboardId}/insights`, {});
      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();
      if (!contentType.includes("application/json")) {
        throw new Error("Insights API returned non-JSON response");
      }
      try {
        return JSON.parse(raw) as { summary: string };
      } catch {
        throw new Error("Insights API returned invalid JSON");
      }
    },
    onSuccess: async (payload) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards", dashboardId] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      const fullText = payload?.summary || "";
      const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const normalized = (lines.length >= 4
        ? lines.slice(0, 4)
        : [...lines, ...Array.from({ length: Math.max(0, 4 - lines.length) }, () => "Further analysis indicates stable distribution across key segments.")]
      ).join("\n");

      setAiSummary("");
      setIsTypingInsights(true);
      for (let i = 1; i <= normalized.length; i++) {
        setAiSummary(normalized.slice(0, i));
        await new Promise((resolve) => setTimeout(resolve, 12));
      }
      setIsTypingInsights(false);
      toast({ title: "AI Insights generated" });
    },
    onError: (error: Error) => {
      const fallback = buildLocalInsights();
      const lines = fallback.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 4).join("\n");
      setAiSummary(lines);
      toast({ title: "AI service unavailable, showing local insights", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      setIsGeneratingInsights(false);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!dataset) throw new Error("No dataset");
      const res = await apiRequest("POST", `/api/datasets/${dataset.id}/sync`, {});
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards", dashboardId] });
      toast({ title: "Dashboard updated successfully!" });
      setEditPanelOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  // Initialize editable data when panel opens
  useEffect(() => {
    if (editPanelOpen && dataset?.data) {
      setEditableData(JSON.parse(JSON.stringify(dataset.data)));
      setEditableHeaders([...dataset.headers]);
      setHasChanges(false);
    }
  }, [editPanelOpen, dataset?.data, dataset?.headers]);

  // Initialize editable charts when chart editor opens
  useEffect(() => {
    if (chartEditorOpen && dashboard?.config?.charts) {
      setEditableCharts(JSON.parse(JSON.stringify(dashboard.config.charts)));
      setHasChartChanges(false);
    }
  }, [chartEditorOpen, dashboard?.config?.charts]);

  // Keep local AI summary in sync with dashboard config when not animating
  useEffect(() => {
    if (!isTypingInsights) {
      setAiSummary((dashboard?.config as any)?.summary || "");
    }
  }, [dashboard?.config, isTypingInsights]);

  // Update chart config
  const updateChart = (chartIndex: number, field: keyof ChartConfig, value: any) => {
    const newCharts = [...editableCharts];
    newCharts[chartIndex] = { ...newCharts[chartIndex], [field]: value };
    setEditableCharts(newCharts);
    setHasChartChanges(true);
  };

  // Delete chart
  const deleteChart = (chartIndex: number) => {
    const newCharts = editableCharts.filter((_, i) => i !== chartIndex);
    setEditableCharts(newCharts);
    setHasChartChanges(true);
  };

  // Add new chart
  const addNewChart = (type: ChartConfig['type']) => {
    if (!dataset?.headers || dataset.headers.length === 0) return;
    const newChart: ChartConfig = {
      id: `chart-${Date.now()}`,
      type,
      title: type === 'kpi' ? 'New KPI' : `New ${type.replace('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())} Chart`,
      dataKey: dataset.headers[0],
      labelKey: dataset.headers.length > 1 ? dataset.headers[1] : dataset.headers[0],
      aggregation: 'sum',
      sortOrder: 'desc',
      limit: 8,
      showTrendline: false,
      showDataLabels: false,
      showLegend: true,
      showGrid: true,
      fillOpacity: 0.65,
      colorScheme: 'default',
      percentageMode: false,
      stacked: type === 'stacked_bar',
    };
    setEditableCharts([...editableCharts, newChart]);
    setHasChartChanges(true);
  };

  // Save chart changes
  const saveChartChanges = async () => {
    if (!dashboard) return;
    setSavingCharts(true);
    try {
      const res = await apiRequest("PATCH", `/api/dashboards/${dashboardId}`, {
        config: { ...dashboard.config, charts: editableCharts }
      });
      if (!res.ok) throw new Error('Save failed');
      
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards", dashboardId] });
      toast({ title: "Charts saved!", description: "Dashboard has been updated." });
      setHasChartChanges(false);
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setSavingCharts(false);
    }
  };

  // Update cell value
  const updateCell = (rowIndex: number, header: string, value: string) => {
    const newData = [...editableData];
    newData[rowIndex] = { ...newData[rowIndex], [header]: value };
    setEditableData(newData);
    setHasChanges(true);
  };

  // Add new row
  const addRow = () => {
    const newRow: Record<string, any> = {};
    editableHeaders.forEach(h => newRow[h] = '');
    setEditableData([...editableData, newRow]);
    setHasChanges(true);
  };

  // Delete row
  const deleteRow = (rowIndex: number) => {
    const newData = editableData.filter((_, i) => i !== rowIndex);
    setEditableData(newData);
    setHasChanges(true);
  };

  // Add new column
  const addColumn = () => {
    if (!newColumnName.trim()) {
      toast({ title: "Please enter a column name", variant: "destructive" });
      return;
    }
    if (editableHeaders.includes(newColumnName.trim())) {
      toast({ title: "Column already exists", variant: "destructive" });
      return;
    }
    const colName = newColumnName.trim();
    setEditableHeaders([...editableHeaders, colName]);
    // Add empty value for this column in all rows
    const newData = editableData.map(row => ({ ...row, [colName]: '' }));
    setEditableData(newData);
    setNewColumnName('');
    setShowAddColumn(false);
    setHasChanges(true);
  };

  // Delete column
  const deleteColumn = (header: string) => {
    const newHeaders = editableHeaders.filter(h => h !== header);
    setEditableHeaders(newHeaders);
    // Remove this column from all rows
    const newData = editableData.map(row => {
      const { [header]: _, ...rest } = row;
      return rest;
    });
    setEditableData(newData);
    setHasChanges(true);
  };

  // Save changes
  const saveChanges = async () => {
    if (!dataset) return;
    setSaving(true);
    try {
      const res = await apiRequest("PATCH", `/api/datasets/${dataset.id}/data`, {
        headers: editableHeaders,
        data: editableData
      });
      if (!res.ok) throw new Error('Save failed');
      
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards", dashboardId] });
      toast({ title: "Changes saved!", description: "Dashboard has been updated." });
      setHasChanges(false);
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dataset) return;

    setUploading(true);
    try {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/datasets/${dataset.id}/replace`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards", dashboardId] });
      toast({ title: "Excel file updated!", description: "Dashboard data has been refreshed." });
      setEditPanelOpen(false);
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/shared/${dashboard?.shareToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copied to clipboard!" });
  };

  const exportDashboardPdf = async () => {
    if (!dashboardId) return;
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers,
        body: JSON.stringify({ dashboardId }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboard-${dashboard?.title || dashboardId}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Dashboard exported", description: "PDF downloaded successfully" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Dashboard not found</p>
      </Card>
    );
  }

  const config = dashboard.config;
  const chartData = dataset?.data || [];

  // Separate KPIs and charts
  const kpis = config.charts.filter((c) => c.type === "kpi");
  const charts = config.charts.filter((c) => c.type !== "kpi");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold">{dashboard.title}</h1>
          {dashboard.description && (
            <p className="text-muted-foreground mt-1">{dashboard.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Generated {new Date(dashboard.createdAt!).toLocaleDateString()}
            </p>
            {dataset?.source && (
              <Badge variant="secondary" className="text-xs">
                {dataset.source === 'excel' ? 'Excel' : 'Google Sheets'}
              </Badge>
            )}
            {dataset?.lastSyncedAt && dataset.source !== 'excel' && (
              <span className="text-xs text-muted-foreground">
                Last synced: {new Date(dataset.lastSyncedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit Dropdown */}
          {dataset && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-border bg-background text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40"
                  data-testid="button-edit-dropdown"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="hover:bg-amber-500/10 focus:bg-amber-500/10 hover:text-amber-500 focus:text-amber-500" onClick={() => setChartEditorOpen(true)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Edit Dashboard
                  <span className="text-xs text-muted-foreground ml-2">(Charts & KPIs)</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-amber-500/10 focus:bg-amber-500/10 hover:text-amber-500 focus:text-amber-500" onClick={() => setEditPanelOpen(true)}>
                  <Table className="w-4 h-4 mr-2" />
                  Edit Data
                  <span className="text-xs text-muted-foreground ml-2">(Excel)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="outline"
            className="border-border bg-background text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40 disabled:bg-background disabled:text-muted-foreground/60"
            onClick={() => {
              setIsGeneratingInsights(true);
              generateInsightsMutation.mutate();
            }}
            disabled={isGeneratingInsights || generateInsightsMutation.isPending}
            data-testid="button-generate-ai-insights"
          >
            {isGeneratingInsights || generateInsightsMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            AI
          </Button>
          <Button
            variant="outline"
            className="border-border bg-background text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40"
            onClick={exportDashboardPdf}
            data-testid="button-export-dashboard-pdf"
          >
            <Download className="w-4 h-4 mr-2" />Export PDF
          </Button>
          {dashboard.shareToken ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-border bg-background text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40"
                  data-testid="button-share-dashboard"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Dashboard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Anyone with this link can view your dashboard.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/shared/${dashboard.shareToken}`}
                      data-testid="input-share-link"
                    />
                    <Button onClick={copyShareLink} data-testid="button-copy-link">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button 
              variant="outline" 
              className="border-border bg-background text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40 disabled:bg-background disabled:text-muted-foreground/60"
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending}
              data-testid="button-enable-sharing"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {shareMutation.isPending ? "Creating..." : "Enable Sharing"}
            </Button>
          )}
        </div>
      </div>

      {/* AI Summary - Scrollable with min 4 lines */}
      {(config.summary || aiSummary || isGeneratingInsights || isTypingInsights) && (
        <Card className="p-4 bg-primary/5 border-primary/20 min-h-[120px] max-h-48 overflow-y-auto">
          <div className="text-sm leading-relaxed">
            <span className="font-medium text-amber-500">AI Insights: </span>
            <span className="whitespace-pre-line">{aiSummary || (config.summary as string) || "Generating insights..."}</span>
            {(isGeneratingInsights || isTypingInsights) && <span className="inline-block ml-1 animate-pulse">|</span>}
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <KPICard key={kpi.id} config={kpi} data={chartData} index={i} />
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {charts.map((chart, i) => (
          <ChartCard key={chart.id} config={chart} data={chartData} index={i} />
        ))}
      </div>

      {/* Edit Data Panel */}
      <Sheet open={editPanelOpen} onOpenChange={setEditPanelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center justify-between">
              <span>Edit Data - {dashboard.title}</span>
            </SheetTitle>
            <SheetDescription>
              Edit your data directly. Changes will update the dashboard.
            </SheetDescription>
          </SheetHeader>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 py-3 border-b flex-shrink-0 flex-wrap">
            <Button
              onClick={saveChanges}
              disabled={saving || !hasChanges}
              size="sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={addRow}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddColumn(!showAddColumn)}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="sm"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload Excel
              </Button>
            </div>
          </div>

          {/* Add Column Input */}
          {showAddColumn && (
            <div className="flex items-center gap-2 py-2 px-1 border-b flex-shrink-0">
              <Input
                placeholder="Enter column name..."
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                className="h-8 text-sm max-w-[200px]"
                onKeyDown={(e) => e.key === 'Enter' && addColumn()}
              />
              <Button size="sm" onClick={addColumn}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddColumn(false); setNewColumnName(''); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Editable Table */}
          <ScrollArea className="flex-1 mt-2">
            <div className="min-w-max">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium text-muted-foreground w-10">#</th>
                    {editableHeaders.map((header, i) => (
                      <th key={i} className="p-2 text-left font-medium text-muted-foreground min-w-[120px]">
                        <div className="flex items-center gap-1 group">
                          <span>{header}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteColumn(header)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </th>
                    ))}
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {editableData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-muted-foreground">{rowIndex + 1}</td>
                      {editableHeaders.map((header, colIndex) => (
                        <td key={colIndex} className="p-1">
                          <Input
                            value={row[header] ?? ''}
                            onChange={(e) => updateCell(rowIndex, header, e.target.value)}
                            className="h-8 text-sm border-transparent hover:border-border focus:border-primary"
                          />
                        </td>
                      ))}
                      <td className="p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRow(rowIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>

          {hasChanges && (
            <div className="flex-shrink-0 pt-2 border-t">
              <p className="text-sm text-amber-500">You have unsaved changes</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Chart Editor Panel */}
      <Sheet open={chartEditorOpen} onOpenChange={setChartEditorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>Edit Dashboard Charts</SheetTitle>
            <SheetDescription>
              Customize charts, change chart types, and modify data mappings.
            </SheetDescription>
          </SheetHeader>

          {/* Action buttons */}
          <div className="flex items-center gap-2 py-3 border-b flex-shrink-0">
            <Button
              onClick={saveChartChanges}
              disabled={savingCharts || !hasChartChanges}
              size="sm"
            >
              {savingCharts ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {savingCharts ? 'Saving...' : 'Save Changes'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Chart
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-80 overflow-y-auto">
                {CHART_TYPES.map((chartType) => {
                  const Icon = chartType.icon;
                  return (
                    <DropdownMenuItem key={chartType.value} onClick={() => addNewChart(chartType.value as ChartConfig['type'])}>
                      <Icon className="w-4 h-4 mr-2" />
                      {chartType.label}
                      <span className="text-xs text-muted-foreground ml-2">{chartType.category}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Charts List */}
          <ScrollArea className="flex-1 mt-2">
            <div className="space-y-4 pr-4">
              {editableCharts.map((chart, index) => (
                <Card key={chart.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={chart.type === 'kpi' ? 'default' : 'secondary'}>
                      {chart.type.toUpperCase()}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteChart(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid grid-cols-3 w-full h-8">
                      <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
                      <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
                      <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-3 mt-3">
                      <div>
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={chart.title}
                          onChange={(e) => updateChart(index, 'title', e.target.value)}
                          className="h-8 text-sm mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Chart Type</Label>
                        <Select
                          value={chart.type}
                          onValueChange={(value) => updateChart(index, 'type', value as ChartConfig['type'])}
                        >
                          <SelectTrigger className="h-8 text-sm mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CHART_TYPES.map((typeOption) => (
                              <SelectItem key={typeOption.value} value={typeOption.value}>
                                {typeOption.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Data Column (Values)</Label>
                        <Select
                          value={chart.dataKey}
                          onValueChange={(value) => updateChart(index, 'dataKey', value)}
                        >
                          <SelectTrigger className="h-8 text-sm mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dataset?.headers.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {chart.type !== 'kpi' && (
                        <div>
                          <Label className="text-xs">Label Column (Categories)</Label>
                          <Select
                            value={chart.labelKey || dataset?.headers[0] || chart.dataKey}
                            onValueChange={(value) => updateChart(index, 'labelKey', value)}
                          >
                            <SelectTrigger className="h-8 text-sm mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {dataset?.headers.map((header) => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {chart.type === 'combo' && (
                        <div>
                          <Label className="text-xs">Secondary Value Column</Label>
                          <Select
                            value={chart.secondaryDataKey || chart.dataKey}
                            onValueChange={(value) => updateChart(index, 'secondaryDataKey', value)}
                          >
                            <SelectTrigger className="h-8 text-sm mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {dataset?.headers.map((header) => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-3 mt-3">
                      <div>
                        <Label className="text-xs">Aggregation</Label>
                        <Select
                          value={chart.aggregation || 'sum'}
                          onValueChange={(value) => updateChart(index, 'aggregation', value)}
                        >
                          <SelectTrigger className="h-8 text-sm mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AGGREGATIONS.map((agg) => (
                              <SelectItem key={agg.value} value={agg.value}>{agg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Sort Order</Label>
                        <Select
                          value={chart.sortOrder || 'desc'}
                          onValueChange={(value) => updateChart(index, 'sortOrder', value)}
                        >
                          <SelectTrigger className="h-8 text-sm mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">Highest First</SelectItem>
                            <SelectItem value="asc">Lowest First</SelectItem>
                            <SelectItem value="none">No Sort</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Top N Records</Label>
                        <Input
                          type="number"
                          min={3}
                          max={50}
                          value={chart.limit || 8}
                          onChange={(e) => updateChart(index, 'limit', Number(e.target.value) || 8)}
                          className="h-8 text-sm mt-1"
                        />
                      </div>

                      {chart.type === 'kpi' && (
                        <div>
                          <Label className="text-xs">KPI Mode</Label>
                          <Select
                            value={chart.insights || 'total'}
                            onValueChange={(value) => updateChart(index, 'insights', value)}
                          >
                            <SelectTrigger className="h-8 text-sm mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="total">Total Sum</SelectItem>
                              <SelectItem value="average">Average</SelectItem>
                              <SelectItem value="count">Count</SelectItem>
                              <SelectItem value="median">Median</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Show Trendline</Label>
                          <Switch
                            checked={!!chart.showTrendline}
                            onCheckedChange={(checked) => updateChart(index, 'showTrendline', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Percentage Mode</Label>
                          <Switch
                            checked={!!chart.percentageMode}
                            onCheckedChange={(checked) => updateChart(index, 'percentageMode', checked)}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="style" className="space-y-3 mt-3">
                      <div>
                        <Label className="text-xs">Color Scheme</Label>
                        <Select
                          value={chart.colorScheme || 'default'}
                          onValueChange={(value) => updateChart(index, 'colorScheme', value)}
                        >
                          <SelectTrigger className="h-8 text-sm mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(COLOR_SCHEMES).map((scheme) => (
                              <SelectItem key={scheme} value={scheme}>{scheme.charAt(0).toUpperCase() + scheme.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Show Data Labels</Label>
                          <Switch
                            checked={!!chart.showDataLabels}
                            onCheckedChange={(checked) => updateChart(index, 'showDataLabels', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Show Legend</Label>
                          <Switch
                            checked={chart.showLegend !== false}
                            onCheckedChange={(checked) => updateChart(index, 'showLegend', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Show Grid</Label>
                          <Switch
                            checked={chart.showGrid !== false}
                            onCheckedChange={(checked) => updateChart(index, 'showGrid', checked)}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Fill Opacity (0.1 to 1.0)</Label>
                        <Input
                          type="number"
                          min={0.1}
                          max={1}
                          step={0.1}
                          value={chart.fillOpacity || 0.65}
                          onChange={(e) => updateChart(index, 'fillOpacity', Number(e.target.value) || 0.65)}
                          className="h-8 text-sm mt-1"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>
              ))}

              {editableCharts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No charts yet. Click "Add Chart" to create one.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {hasChartChanges && (
            <div className="flex-shrink-0 pt-2 border-t">
              <p className="text-sm text-amber-500">You have unsaved changes</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Helper function to normalize values (handle case-insensitive matching)
function normalizeValue(val: any): string {
  if (val === null || val === undefined || val === "") return "";
  return String(val).toLowerCase().trim();
}

// Helper function to get normalized counts (merges "Sales" and "sales" etc.)
function getNormalizedCounts(data: any[], key: string): Record<string, { count: number; displayName: string }> {
  const normalized: Record<string, { count: number; displayName: string }> = {};
  
  data.forEach(row => {
    const rawValue = row[key];
    if (rawValue === null || rawValue === undefined || rawValue === "") return;
    
    const normalizedKey = normalizeValue(rawValue);
    if (!normalized[normalizedKey]) {
      normalized[normalizedKey] = { count: 0, displayName: String(rawValue).trim() };
    }
    normalized[normalizedKey].count++;
  });
  
  return normalized;
}

function KPICard({ config, data, index }: { config: ChartConfig; data: any[]; index: number }) {
  // Calculate KPI value from data with case-insensitive handling
  const sampleValue = data[0]?.[config.dataKey];
  const isNumericData = !isNaN(parseFloat(sampleValue)) && sampleValue !== null && sampleValue !== "";
  
  let displayValue: number;
  let formattedValue: string;
  let trend = 0;
  
  if (isNumericData) {
    // Numeric data - sum or average
    const values = data.map((row) => parseFloat(row[config.dataKey]) || 0);
    const total = values.reduce((a, b) => a + b, 0);
    const average = values.length > 0 ? total / values.length : 0;
    
    displayValue = config.insights?.includes("average") ? average : total;
    formattedValue = displayValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
    
    // Calculate trend
    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint || 0;
    const secondHalf = values.slice(midpoint).reduce((a, b) => a + b, 0) / (values.length - midpoint) || 0;
    trend = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
  } else {
    // Categorical data - count occurrences or calculate rate (case-insensitive)
    const title = config.title.toLowerCase();
    const normalizedCounts = getNormalizedCounts(data, config.dataKey);
    
    if (title.includes("rate") || title.includes("success") || title.includes("percentage")) {
      // Calculate success rate based on outcomes
      const successTerms = ["closed", "interested", "quotation", "deal", "success", "won"];
      let successCount = 0;
      Object.keys(normalizedCounts).forEach(key => {
        if (successTerms.some(term => key.includes(term))) {
          successCount += normalizedCounts[key].count;
        }
      });
      displayValue = data.length > 0 ? (successCount / data.length) * 100 : 0;
      formattedValue = displayValue.toFixed(1) + "%";
    } else if (title.includes("total") || title.includes("count") || title.includes("records")) {
      // Count total records
      displayValue = data.length;
      formattedValue = displayValue.toLocaleString();
    } else {
      // Count unique values (case-insensitive)
      displayValue = Object.keys(normalizedCounts).length;
      formattedValue = displayValue.toLocaleString();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-1">{config.title}</p>
        <p className="text-2xl font-bold" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
          {formattedValue}
        </p>
        {trend !== 0 && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${
            trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : 
             trend < 0 ? <TrendingDown className="w-3 h-3" /> : 
             <Minus className="w-3 h-3" />}
            <span>{Math.abs(trend).toFixed(1)}% vs previous</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function ChartCard({ config, data, index }: { config: ChartConfig; data: any[]; index: number }) {
  // Prepare chart data - aggregate if needed with case-insensitive grouping
  const labelKey = config.labelKey || Object.keys(data[0] || {})[0];
  const chartPalette = COLOR_SCHEMES[config.colorScheme || 'default'] || CHART_COLORS;
  const limit = config.limit || 8;
  const sortOrder = config.sortOrder || 'desc';
  const aggregation = config.aggregation || 'sum';
  
  // Check if we need to aggregate (count occurrences) or use numeric values
  const sampleValue = data[0]?.[config.dataKey];
  const isNumericData = !isNaN(parseFloat(sampleValue)) && sampleValue !== null && sampleValue !== "";
  
  let chartData: any[];
  
  // Use case-insensitive grouping
  const normalizedCounts = getNormalizedCounts(data, labelKey);
  
  if (isNumericData) {
    // If data is numeric, aggregate by label key (sum/avg/min/max/median/count)
    const aggregated: Record<string, { values: number[]; displayName: string }> = {};
    
    data.forEach(row => {
      const rawLabel = row[labelKey];
      if (rawLabel === null || rawLabel === undefined || rawLabel === "") return;
      
      const normalizedLabel = normalizeValue(rawLabel);
      const value = parseFloat(row[config.dataKey]) || 0;
      
      if (!aggregated[normalizedLabel]) {
        aggregated[normalizedLabel] = { values: [], displayName: String(rawLabel).trim() };
      }
      aggregated[normalizedLabel].values.push(value);
    });

    const aggregateValue = (values: number[]) => {
      if (values.length === 0) return 0;
      if (aggregation === 'count') return values.length;
      if (aggregation === 'average') return values.reduce((a, b) => a + b, 0) / values.length;
      if (aggregation === 'min') return Math.min(...values);
      if (aggregation === 'max') return Math.max(...values);
      if (aggregation === 'median') {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      }
      return values.reduce((a, b) => a + b, 0);
    };
    
    chartData = Object.values(aggregated)
      .map(({ displayName, values }) => ({ name: displayName, value: aggregateValue(values) }));
  } else {
    // If dataKey is not numeric, COUNT occurrences per label (case-insensitive)
    chartData = Object.values(normalizedCounts)
      .map(({ displayName, count }) => ({ name: displayName, value: count }));
  }

  if (sortOrder === 'asc') chartData.sort((a, b) => a.value - b.value);
  else if (sortOrder === 'desc') chartData.sort((a, b) => b.value - a.value);
  chartData = chartData.slice(0, limit);

  if (config.percentageMode) {
    const total = chartData.reduce((sum, row) => sum + row.value, 0) || 1;
    chartData = chartData.map((row) => ({ ...row, value: (row.value / total) * 100 }));
  }
  
  // Truncate long names for display
  const truncateName = (name: string, maxLen: number = 12) => {
    return name.length > maxLen ? name.substring(0, maxLen) + "..." : name;
  };

  // Horizontal bar chart
  const renderHorizontalBar = () => (
    <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
      <YAxis 
        type="category" 
        dataKey="name" 
        tick={{ fontSize: 11 }} 
        stroke="hsl(var(--muted-foreground))" 
        width={55}
        tickFormatter={(val) => truncateName(val, 8)}
      />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: "hsl(var(--card))", 
          border: "1px solid hsl(var(--border))",
          borderRadius: "6px",
        }}
        formatter={(value: number) => [value.toLocaleString(), "Count"]}
      />
      <Bar dataKey="value" fill={chartPalette[index % chartPalette.length]} radius={[0, 4, 4, 0]} />
    </BarChart>
  );

  // Vertical bar chart
  const renderVerticalBar = () => (
    <BarChart data={chartData} margin={{ bottom: 50 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={config.showGrid !== false} horizontal={config.showGrid !== false} />
      <XAxis 
        dataKey="name" 
        tick={{ fontSize: 10 }} 
        stroke="hsl(var(--muted-foreground))"
        interval={0}
        height={60}
        tickFormatter={(val) => truncateName(val, 8)}
      />
      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: "hsl(var(--card))", 
          border: "1px solid hsl(var(--border))",
          borderRadius: "6px",
        }}
        formatter={(value: number) => [value.toLocaleString(), "Count"]}
      />
      <Bar dataKey="value" fill={chartPalette[index % chartPalette.length]} radius={[4, 4, 0, 0]} />
    </BarChart>
  );

  // Pie chart with legend (no overlapping labels)
  const renderPie = () => (
    <PieChart>
      <Pie
        data={chartData}
        cx="40%"
        cy="50%"
        outerRadius={65}
        innerRadius={25}
        dataKey="value"
        paddingAngle={2}
      >
        {chartData.map((_, i) => (
          <Cell key={i} fill={chartPalette[i % chartPalette.length]} />
        ))}
      </Pie>
      <Tooltip 
        contentStyle={{ 
          backgroundColor: "hsl(var(--card))", 
          border: "1px solid hsl(var(--border))",
          borderRadius: "6px",
        }}
        formatter={(value: number, name: string) => [value.toLocaleString(), name]}
      />
      {config.showLegend !== false && <Legend 
        layout="vertical" 
        align="right" 
        verticalAlign="middle"
        wrapperStyle={{ paddingLeft: 10, fontSize: 11, maxWidth: '40%' }}
        formatter={(value) => truncateName(value, 14)}
      />}
    </PieChart>
  );

  // Line chart
  const renderLine = () => (
    <LineChart data={chartData} margin={{ bottom: 50 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={config.showGrid !== false} horizontal={config.showGrid !== false} />
      <XAxis 
        dataKey="name" 
        tick={{ fontSize: 10 }} 
        stroke="hsl(var(--muted-foreground))"
        interval={0}
        height={60}
        tickFormatter={(val) => truncateName(val, 8)}
      />
      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: "hsl(var(--card))", 
          border: "1px solid hsl(var(--border))",
          borderRadius: "6px",
        }}
        formatter={(value: number) => [value.toLocaleString(), "Value"]}
      />
      <Line 
        type="monotone" 
        dataKey="value" 
        stroke={chartPalette[index % chartPalette.length]} 
        strokeWidth={2}
        dot={{ fill: chartPalette[index % chartPalette.length], r: 4 }}
      />
      {config.showTrendline && (
        <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
      )}
    </LineChart>
  );

  const renderArea = () => (
    <LineChart data={chartData} margin={{ bottom: 50 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={config.showGrid !== false} horizontal={config.showGrid !== false} />
      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={0} height={60} tickFormatter={(val) => truncateName(val, 8)} />
      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} />
      <Line type="monotone" dataKey="value" stroke={chartPalette[index % chartPalette.length]} strokeWidth={2} dot={false} />
    </LineChart>
  );

  const renderScatter = () => (
    <BarChart data={chartData} margin={{ bottom: 50 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={0} height={60} tickFormatter={(val) => truncateName(val, 8)} />
      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} />
      <Bar dataKey="value" fill={chartPalette[index % chartPalette.length]} radius={[8, 8, 8, 8]} />
    </BarChart>
  );

  // Table view
  const renderTable = () => (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 font-medium">Name</th>
            <th className="text-right py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((row, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2">{row.name}</td>
              <td className="text-right py-2">{row.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Determine which chart to render based on type and index for variety
  const getChartRenderer = () => {
    if (config.type === "bar") {
      // Alternate between horizontal and vertical bars
      return index % 2 === 0 ? renderHorizontalBar : renderVerticalBar;
    } else if (config.type === "horizontal_bar") {
      return renderHorizontalBar;
    } else if (config.type === "stacked_bar") {
      return renderVerticalBar;
    } else if (config.type === "line") {
      return renderLine;
    } else if (config.type === "area") {
      return renderArea;
    } else if (config.type === "pie") {
      return renderPie;
    } else if (config.type === "donut") {
      return renderPie;
    } else if (config.type === "scatter" || config.type === "combo" || config.type === "treemap" || config.type === "heatmap" || config.type === "waterfall" || config.type === "funnel" || config.type === "gauge") {
      return renderScatter;
    } else {
      return renderTable;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1 }}
    >
      <Card className="p-6">
        <h3 className="font-semibold mb-4">{config.title}</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {getChartRenderer()()}
          </ResponsiveContainer>
        </div>
        {config.insights && (
          <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
            {config.insights}
          </p>
        )}
      </Card>
    </motion.div>
  );
}
