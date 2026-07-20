import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BusinessSidebar from "@/components/business-sidebar";
import {
  ArrowLeft,
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Zap,
  BarChart3,
  UserX,
  TrendingDown,
  Loader2,
  FileText,
  Download,
  RefreshCw,
  Send,
  Upload,
  Cpu,
  Database,
  Trash2,
  ClipboardCheck,
  CheckCircle2,
  DatabaseBackup,
  Link,
  Bot,
  User,
  Sparkles,
  Search,
  Plus,
  ShoppingCart,
  Store,
  CreditCard,
  Receipt,
  Wallet,
  Megaphone,
  Facebook
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getIdToken } from "@/lib/firebase";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  memberRole: string;
  currencySymbol: string;
}

interface TeamPerformance {
  memberId: string;
  memberName: string;
  totalRevenue: number;
  totalUnits: number;
  totalDeals: number;
  totalExpenses: number;
  achievementPercent: number;
  entryCount: number;
}

interface TrendPoint {
  period: string;
  totalRevenue: number;
  totalUnits: number;
  totalDeals: number;
  entryCount: number;
}

interface PipGoals {
  day30: string;
  day60: string;
  day90: string;
}

interface PipData {
  gapAnalysis: string;
  rootCauses: string[];
  goals: PipGoals;
  actionItems: string[];
  managerSupport: string;
  reviewSchedule: string;
  summary: string;
  memberName: string;
  period: string;
}

interface ForecastProjection {
  period: string;
  revenue: number | string;
  units: number | string;
  deals?: number | string;
  confidence?: 'high' | 'medium' | 'low';
  note?: string;
}

interface ForecastData {
  projections: ForecastProjection[];
  assumptions: string[];
  growthDrivers: string[];
  riskFactors: string[];
  recommendedActions: string[];
  summary: string;
  businessName: string;
  currencySymbol: string;
  trends: TrendPoint[];
}

interface PipApiResponse {
  pip: Omit<PipData, 'memberName' | 'period'>;
  memberName: string;
  period: string;
}

interface ForecastApiResponse {
  forecast: Omit<ForecastData, 'businessName' | 'currencySymbol' | 'trends'>;
  businessName: string;
  currencySymbol: string;
  trends: TrendPoint[];
}

export default function AiStrategy() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // State elements
  const [pipMemberId, setPipMemberId] = useState("");
  const [pipData, setPipData] = useState<PipData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);

  // Queries for standard Advisor Overview
  const { data: profile, isLoading: profileLoading } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  const currentPeriod = new Date().toISOString().slice(0, 7);

  const { data: teamPerformance = [] } = useQuery<TeamPerformance[]>({
    queryKey: ["/api/business/performance/team", currentPeriod],
    queryFn: async () => {
      const token = await getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/business/performance/team?period=${currentPeriod}`, { headers });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profile && (profile.memberRole === "owner" || profile.memberRole === "manager"),
  });

  const { data: trends = [] } = useQuery<TrendPoint[]>({
    queryKey: ["/api/business/performance/trends", "team"],
    queryFn: async () => {
      const token = await getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/business/performance/trends?months=6&team=true`, { headers });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profile && (profile.memberRole === "owner" || profile.memberRole === "manager"),
  });

  const pipMutation = useMutation<PipApiResponse, Error, string>({
    mutationFn: async (memberId: string) => {
      const res = await apiRequest("POST", "/api/business/ai/pip", {
        memberId,
        periodLabel: currentPeriod,
      });
      return await res.json() as PipApiResponse;
    },
    onSuccess: (data: PipApiResponse) => {
      setPipData({ ...data.pip, memberName: data.memberName, period: data.period });
      toast({ title: "PIP generated", description: `Performance Improvement Plan for ${data.memberName}` });
    },
    onError: (error: Error) => {
      toast({ title: "PIP generation failed", description: error.message, variant: "destructive" });
    },
  });

  const forecastMutation = useMutation<ForecastApiResponse, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/business/ai/forecast", { months: 3 });
      return await res.json() as ForecastApiResponse;
    },
    onSuccess: (data: ForecastApiResponse) => {
      setForecastData({ ...data.forecast, businessName: data.businessName, currencySymbol: data.currencySymbol, trends: data.trends });
      toast({ title: "Forecast generated", description: "90-day revenue forecast ready" });
    },
    onError: (error: Error) => {
      toast({ title: "Forecast failed", description: error.message, variant: "destructive" });
    },
  });

  const exportPdf = async (type: 'business' | 'pip' = 'business') => {
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body = type === 'pip' && pipData
        ? { pipReport: { pip: pipData, memberName: pipData.memberName, period: pipData.period } }
        : { businessReport: { period: currentPeriod } };

      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === 'pip' && pipData
        ? `pip-${pipData.memberName}-${pipData.period}.pdf`
        : `${profile?.name}-report-${currentPeriod}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF downloaded", description: "Report saved as PDF" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  // ──── COPILOT CHAT TAB STATE ────
  interface ChatMsg {
    role: "user" | "assistant";
    content: string;
    sqlQuery?: string | null;
    sqlResults?: any[] | null;
    citations?: string[];
  }
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatSending) return;
    const query = chatInput.trim();
    setChatInput("");
    setIsChatSending(true);

    const userMsg: ChatMsg = { role: "user", content: query };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const res = await apiRequest("POST", "/api/copilot/chat", {
        question: query,
        businessId: profile?.id,
      });
      const data = await res.json();
      
      const botMsg: ChatMsg = {
        role: "assistant",
        content: data.response,
        sqlQuery: data.sqlQuery,
        sqlResults: data.sqlResults,
        citations: data.citations,
      };
      setChatMessages(prev => [...prev, botMsg]);
    } catch (e: any) {
      toast({ title: "Failed to get response", description: e.message, variant: "destructive" });
    } finally {
      setIsChatSending(false);
    }
  };

  // ──── KNOWLEDGE BASE STATE ────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: kbDocs = [], refetch: refetchKbDocs } = useQuery<any[]>({
    queryKey: ["/api/copilot/documents"],
  });

  const uploadKbDocMutation = useMutation({
    mutationFn: async (file: File) => {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/copilot/documents", {
        method: "POST",
        body: formData,
        headers,
      });

      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      refetchKbDocs();
      toast({ title: "Document uploaded", description: "Parsing and vector indexing has started." });
    },
    onError: (e: Error) => {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    },
  });

  const deleteKbDocMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/copilot/documents/${id}`);
    },
    onSuccess: () => {
      refetchKbDocs();
      toast({ title: "Document deleted", description: "Associated vector chunks removed." });
    },
  });

  const handleKbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadKbDocMutation.mutate(file);
    }
  };

  // ──── AGENT WORKSPACE STATE ────
  const [selectedAgentPeriod, setSelectedAgentPeriod] = useState(currentPeriod);
  const [agentAnalysisPending, setAgentAnalysisPending] = useState(false);
  const [agentResults, setAgentResults] = useState<any>(null);

  const { data: pastAgentReports = [], refetch: refetchAgentReports } = useQuery<any[]>({
    queryKey: ["/api/copilot/agents/reports"],
  });

  const runAgentAnalysis = async () => {
    if (!profile?.id) return;
    setAgentAnalysisPending(true);
    setAgentResults(null);

    try {
      const res = await apiRequest("POST", "/api/copilot/agents/analyze", {
        businessId: profile.id,
        period: selectedAgentPeriod,
      });
      const data = await res.json();
      setAgentResults(data);
      refetchAgentReports();
      toast({ title: "Audit finished", description: "Consensus report finalized by Executive Agent." });
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setAgentAnalysisPending(false);
    }
  };

  // ──── ACTIONS CENTER STATE ────
  const { data: actions = [], refetch: refetchActions } = useQuery<any[]>({
    queryKey: ["/api/copilot/actions"],
  });

  const approveActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const res = await apiRequest("POST", `/api/copilot/actions/${actionId}/execute`, {
        businessId: profile?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      refetchActions();
      toast({ title: "Action executed", description: "Task generated on Kanban board." });
    },
    onError: (e: Error) => {
      toast({ title: "Execution failed", description: e.message, variant: "destructive" });
    },
  });

  // ──── INTEGRATIONS HUB STATE ────
  const INTEGRATION_APPS = [
    { id: "shopify", name: "Shopify Store", type: "shopify", description: "Sync orders, customers, and product metrics.", defaultName: "Shopify Store", defaultHost: "sandbox-store.myshopify.com", defaultDb: "shpat_mocktoken123", icon: ShoppingCart, color: "from-green-500/10 to-emerald-500/10", border: "border-green-200" },
    { id: "woocommerce", name: "WooCommerce", type: "woocommerce", description: "Connect e-commerce sales, stock, and checkouts.", defaultName: "WooCommerce Shop", defaultHost: "sandbox-woo.com", defaultDb: "woo_mockkey123", icon: Store, color: "from-purple-500/10 to-indigo-500/10", border: "border-purple-200" },
    { id: "stripe", name: "Stripe Payments", type: "stripe", description: "Pull payment logs, refunds, and collections.", defaultName: "Stripe Live", defaultHost: "sk_test_mock5123", defaultDb: "stripe_gateway", icon: CreditCard, color: "from-blue-500/10 to-sky-500/10", border: "border-blue-200" },
    { id: "zoho_books", name: "Zoho Books", type: "zoho_books", description: "Import accounting books, invoices, and expenses.", defaultName: "Zoho Books India", defaultHost: "api.zoho.in", defaultDb: "auth_mockzoho123", icon: Receipt, color: "from-red-500/10 to-orange-500/10", border: "border-red-200" },
    { id: "razorpay", name: "Razorpay API", type: "razorpay", description: "Capture UPI, cards, and payment gateway logs.", defaultName: "Razorpay Sandbox", defaultHost: "rzp_test_mock5123", defaultDb: "razorpay_gateway", icon: Wallet, color: "from-cyan-500/10 to-blue-500/10", border: "border-cyan-200" },
    { id: "google_ads", name: "Google Ads", type: "google_ads", description: "Monitor ad campaigns spend, reach, and ROI.", defaultName: "Google PPC Ads", defaultHost: "client_id_mock_123", defaultDb: "google_ads_network", icon: Megaphone, color: "from-yellow-500/10 to-amber-500/10", border: "border-yellow-200" },
    { id: "meta_ads", name: "Meta Ads", type: "meta_ads", description: "Track Facebook/Instagram budgets and conversions.", defaultName: "Meta Social Ads", defaultHost: "act_100200300400", defaultDb: "meta_ads_network", icon: Facebook, color: "from-blue-600/10 to-indigo-600/10", border: "border-blue-300" },
    { id: "ga4", name: "Google Analytics (GA4)", type: "ga4", description: "Analyze web traffic, purchases, and sessions.", defaultName: "GA4 Stream", defaultHost: "property_id_100200", defaultDb: "ga4_web", icon: BarChart3, color: "from-orange-500/10 to-yellow-500/10", border: "border-orange-200" },
    { id: "postgres", name: "PostgreSQL", type: "postgres", description: "Sync database customer logs and custom tables.", defaultName: "Postgres Database", defaultHost: "localhost", defaultDb: "postgres_db", icon: Database, color: "from-slate-500/10 to-gray-500/10", border: "border-slate-200" },
    { id: "mysql", name: "MySQL Database", type: "mysql", description: "Pull operational order tables and SQL data.", defaultName: "MySQL Production", defaultHost: "localhost", defaultDb: "mysql_db", icon: Database, color: "from-teal-500/10 to-emerald-500/10", border: "border-teal-200" }
  ];

  const [integrationName, setIntegrationName] = useState("");
  const [integrationType, setIntegrationType] = useState("postgres");
  const [dbHost, setDbHost] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");

  const handleAppConnect = async (app: typeof INTEGRATION_APPS[0]) => {
    if (app.type === "postgres" || app.type === "mysql") {
      setIntegrationType(app.type);
      setIntegrationName(app.defaultName);
      setDbHost(app.defaultHost);
      setDbName(app.defaultDb);
      setDbUser("demo_user");
      setIsAddIntegrationOpen(true);
    } else {
      let shopUrl = "";
      if (app.type === "shopify") {
        const input = window.prompt(
          "Enter your Shopify Store URL (e.g., your-brand.myshopify.com):",
          "sandbox-store.myshopify.com"
        );
        if (input === null) return; // user cancelled
        shopUrl = input.trim() || "sandbox-store.myshopify.com";
      }

      // Production one-click OAuth popup connection flow
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      // Clear any previous stale state
      localStorage.removeItem(`oauth_success_${app.type}`);
      localStorage.removeItem(`oauth_error_${app.type}`);

      const token = await getIdToken();
      const url = `/api/oauth/${app.type}/authorize?token=${encodeURIComponent(token || '')}` + 
        (shopUrl ? `&shopUrl=${encodeURIComponent(shopUrl)}` : "");
        
      const popup = window.open(
        url,
        `oauth_${app.type}`,
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      let handleOAuthMessage: ((event: MessageEvent) => void) | null = null;
      let pollInterval: any = null;

      const cleanup = () => {
        if (pollInterval) clearInterval(pollInterval);
        if (handleOAuthMessage) window.removeEventListener('message', handleOAuthMessage);
      };

      handleOAuthMessage = (event: MessageEvent) => {
        if (event.data?.type === 'oauth_success' && event.data?.provider === app.type) {
          toast({
            title: `${app.name} Authorized`,
            description: "App connected successfully! Commencing metadata sync..."
          });
          refetchIntegrations();
          if (event.data.integrationId) {
            syncIntegrationMutation.mutate(event.data.integrationId);
          }
          cleanup();
        } else if (event.data?.type === 'oauth_error') {
          toast({
            title: "OAuth Connection Failed",
            description: event.data.error || "Permission request denied.",
            variant: "destructive"
          });
          cleanup();
        }
      };

      // Polling fallback check
      pollInterval = setInterval(() => {
        const successData = localStorage.getItem(`oauth_success_${app.type}`);
        const errorData = localStorage.getItem(`oauth_error_${app.type}`);

        if (successData) {
          const parsed = JSON.parse(successData);
          localStorage.removeItem(`oauth_success_${app.type}`);
          cleanup();
          toast({
            title: `${app.name} Authorized`,
            description: "App connected successfully! Commencing metadata sync..."
          });
          refetchIntegrations();
          if (parsed.integrationId) {
            syncIntegrationMutation.mutate(parsed.integrationId);
          }
        } else if (errorData) {
          localStorage.removeItem(`oauth_error_${app.type}`);
          cleanup();
          toast({
            title: "OAuth Connection Failed",
            description: errorData || "Permission request denied.",
            variant: "destructive"
          });
        }
      }, 1000);

      window.addEventListener('message', handleOAuthMessage);
    }
  };
  const [isAddIntegrationOpen, setIsAddIntegrationOpen] = useState(false);

  const { data: integrations = [], refetch: refetchIntegrations } = useQuery<any[]>({
    queryKey: ["/api/copilot/integrations"],
  });

  const saveIntegrationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/copilot/integrations", {
        sourceName: integrationName,
        sourceType: integrationType,
        config: {
          host: dbHost,
          database: dbName,
          username: dbUser,
        },
      });
      return res.json();
    },
    onSuccess: () => {
      refetchIntegrations();
      setIsAddIntegrationOpen(false);
      setIntegrationName("");
      setDbHost("");
      setDbName("");
      setDbUser("");
      toast({ title: "Integration added", description: "Source registered." });
    },
  });

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const generateDashboardFromSyncMutation = useMutation({
    mutationFn: async ({ datasetId, title }: { datasetId: string; title: string }) => {
      const res = await apiRequest("POST", "/api/dashboards/generate", {
        datasetId,
        title
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Dashboard Created",
        description: "Your connector dashboard is ready to view!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards"] });
      navigate(`/home?dashboardId=${data.id}`);
    },
    onError: (err: any) => {
      toast({
        title: "Dashboard Generation Failed",
        description: err.message || "An error occurred.",
        variant: "destructive"
      });
    }
  });

  const syncIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      setSyncingId(id);
      const res = await apiRequest("POST", `/api/copilot/integrations/${id}/sync`);
      return res.json();
    },
    onSuccess: (data) => {
      refetchIntegrations();
      toast({
        title: "Sync completed",
        description: data.message || "Integration data synchronized successfully."
      });
      generateDashboardFromSyncMutation.mutate({
        datasetId: data.datasetId,
        title: "Connector Dashboard"
      });
    },
    onError: (err: any) => {
      toast({
        title: "Sync failed",
        description: err.message || "Could not sync integration.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setSyncingId(null);
    }
  });

  const testIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/copilot/integrations/${id}/test`);
      return res.json();
    },
    onSuccess: (data) => {
      refetchIntegrations();
      toast({
        title: data.success ? "Connection healthy" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
  });

  const disconnectIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/copilot/integrations/${id}`);
      return res.json();
    },
    onSuccess: (data) => {
      refetchIntegrations();
      toast({
        title: "Disconnected",
        description: data.message || "Integration disconnected successfully."
      });
    },
    onError: (err: any) => {
      toast({
        title: "Disconnection failed",
        description: err.message || "Failed to disconnect integration.",
        variant: "destructive"
      });
    }
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      </div>
    );
  }

  const sym = profile?.currencySymbol ?? "₹";

  // Existing Insights Logic
  const insights: { type: "opportunity" | "risk" | "insight"; title: string; description: string }[] = [];

  if (trends.length >= 2) {
    const lastTwo = trends.slice(-2);
    const revGrowth = lastTwo[0].totalRevenue > 0
      ? ((lastTwo[1].totalRevenue - lastTwo[0].totalRevenue) / lastTwo[0].totalRevenue) * 100
      : 0;
    if (revGrowth > 10) {
      insights.push({
        type: "opportunity",
        title: "Strong Revenue Growth",
        description: `Revenue grew ${revGrowth.toFixed(1)}% month-over-month. Consider scaling top-performing activities.`,
      });
    } else if (revGrowth < -10) {
      insights.push({
        type: "risk",
        title: "Revenue Declining",
        description: `Revenue dropped ${Math.abs(revGrowth).toFixed(1)}% vs. last month. Review team targets and client pipeline.`,
      });
    } else {
      insights.push({
        type: "insight",
        title: "Stable Revenue Trend",
        description: `Revenue is holding steady month-over-month (${revGrowth.toFixed(1)}%). Focus on expanding volume and deal size.`,
      });
    }
  }

  if (teamPerformance.length > 0) {
    const avg = teamPerformance.reduce((s, m) => s + m.achievementPercent, 0) / teamPerformance.length;
    const underperformers = teamPerformance.filter(m => m.achievementPercent < 50);
    const topPerformers = teamPerformance.filter(m => m.achievementPercent >= 80);

    if (underperformers.length > 0) {
      insights.push({
        type: "risk",
        title: `${underperformers.length} Team Member${underperformers.length > 1 ? "s" : ""} Below 50% Target`,
        description: `${underperformers.map(m => m.memberName).join(", ")} need coaching or target review this month.`,
      });
    }
    if (topPerformers.length > 0) {
      insights.push({
        type: "opportunity",
        title: `${topPerformers.length} High Performer${topPerformers.length > 1 ? "s" : ""} This Month`,
        description: `${topPerformers.map(m => m.memberName).join(", ")} exceeded 80% of target. Consider recognition or higher targets.`,
      });
    }
    if (avg < 60) {
      insights.push({
        type: "risk",
        title: "Team Average Below Target",
        description: `Average achievement is ${avg.toFixed(0)}%. Review whether targets are realistic or if additional support is needed.`,
      });
    }
  }

  if (trends.length > 0 && teamPerformance.length > 0) {
    const avgExpenses = teamPerformance.reduce((s, m) => s + m.totalExpenses, 0) / teamPerformance.length;
    const avgRevenue = teamPerformance.reduce((s, m) => s + m.totalRevenue, 0) / teamPerformance.length;
    if (avgRevenue > 0 && avgExpenses / avgRevenue > 0.3) {
      insights.push({
        type: "risk",
        title: "High Expense-to-Revenue Ratio",
        description: `Team expenses average ${((avgExpenses / avgRevenue) * 100).toFixed(0)}% of revenue. Consider reviewing travel/operational costs.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: "insight",
      title: "No Data Yet",
      description: "Start logging EOD entries to unlock AI-powered insights about your team's performance trends.",
    });
  }

  const iconMap = {
    opportunity: <Lightbulb className="w-5 h-5 text-green-500" />,
    risk: <AlertTriangle className="w-5 h-5 text-red-500" />,
    insight: <TrendingUp className="w-5 h-5 text-blue-500" />,
  };
  const colorMap = {
    opportunity: "border-green-500/20 bg-green-500/5",
    risk: "border-red-500/20 bg-red-500/5",
    insight: "border-blue-500/20 bg-blue-500/5",
  };
  const badgeMap = {
    opportunity: "bg-green-500/10 text-green-500",
    risk: "bg-red-500/10 text-red-500",
    insight: "bg-blue-500/10 text-blue-500",
  };

  const isManager = profile?.memberRole === "owner" || profile?.memberRole === "manager";

  return (
    <div className="min-h-screen bg-[#fbfaf7] flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/business")}
                className="text-muted-foreground hover:text-primary rounded-none"
                data-testid="button-back-business"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-accent" />
                <div>
                  <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider">Enterprise AI Advisor</h1>
                  <p className="text-xs text-muted-foreground">{profile?.name || "Business Suite"} · Central AI Intelligence Layer</p>
                </div>
              </div>
            </div>
            {isManager && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportPdf('business')} 
                className="rounded-none border border-gray-200 text-muted-foreground hover:bg-gray-50 text-[10px] font-sans font-bold uppercase tracking-wider h-8 px-3"
                data-testid="button-export-report"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Audit Report
              </Button>
            )}
          </div>
        </header>

        <div className="border-b border-gray-200 bg-white px-6 print:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex bg-transparent border-0 gap-6 h-12 p-0 select-none">
              {["overview", "chat", "knowledge", "agents", "actions", "integrations"].map((tab) => {
                const labels: Record<string, string> = {
                  overview: "Overview Insights",
                  chat: "Copilot Chat",
                  knowledge: "Knowledge Base",
                  agents: "Agent Workspace",
                  actions: "Actions Center",
                  integrations: "Integrations Hub",
                };
                return (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:text-accent rounded-none bg-transparent px-1 h-12 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-all duration-200 cursor-pointer shadow-none!"
                  >
                    {labels[tab]}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        <main className="max-w-5xl mx-auto px-6 py-8 w-full flex-1">
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Explainer Box */}
              <div className="bg-white border border-gray-200 rounded-none p-4 shadow-sm">
                <p className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.2em] mb-3">What the Business Advisor does</p>
                <div className="flex flex-col sm:flex-row gap-6 text-xs text-muted-foreground font-sans">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-accent font-bold mt-0.5">1.</span>
                    <span><span className="font-semibold text-primary uppercase text-[10px] tracking-wider block mb-0.5">Revenue forecasting</span> AI-powered forward predictions based on your historical patterns.</span>
                  </div>
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-accent font-bold mt-0.5">2.</span>
                    <span><span className="font-semibold text-primary uppercase text-[10px] tracking-wider block mb-0.5">Performance Plans</span> Automatically drafts target PIP coaching directives.</span>
                  </div>
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-accent font-bold mt-0.5">3.</span>
                    <span><span className="font-semibold text-primary uppercase text-[10px] tracking-wider block mb-0.5">Strategy insights</span> Dynamically reviews and surfaces potential operational and financial risks.</span>
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <BrainCircuit className="w-5 h-5 text-accent" />
                  <h2 className="font-sans font-bold text-base uppercase tracking-wider text-primary">AI-Generated Insights</h2>
                  <Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5">Auto-updated</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-6 font-sans">Real-time analysis derived from staff EOD entries and performance trends.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.map((ins, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                      <Card className="bg-white border border-gray-200 rounded-none p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between" data-testid={`card-insight-${i}`}>
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                        <div className="flex gap-4 items-start">
                          <div className="p-2 bg-primary/5 border border-primary/10 rounded-none text-primary">
                            {iconMap[ins.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-sans font-bold text-sm text-primary uppercase tracking-tight">{ins.title}</span>
                              <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5", 
                                ins.type === 'opportunity' ? 'bg-green-50 border-green-200 text-green-600' :
                                ins.type === 'risk' ? 'bg-red-50 border-red-200 text-red-600' :
                                'bg-blue-50 border-blue-200 text-blue-600'
                              )}>
                                {ins.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed font-sans">{ins.description}</p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* AI Revenue Forecast */}
              {isManager && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <div className="flex items-center justify-between mb-4 mt-8">
                    <div>
                      <h2 className="font-sans font-bold text-base uppercase tracking-wider text-primary flex items-center gap-2.5">
                        <TrendingUp className="w-5 h-5 text-accent" />
                        AI Revenue Forecast
                      </h2>
                      <p className="text-xs text-muted-foreground font-sans">30/60/90-day forward projection based on your trends</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => forecastMutation.mutate()} 
                      disabled={forecastMutation.isPending} 
                      className="rounded-none bg-primary hover:bg-primary/95 text-primary-foreground font-sans font-bold text-xs uppercase tracking-wider h-9 shadow-none px-4"
                      data-testid="button-generate-forecast"
                    >
                      {forecastMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Generate Forecast</>}
                    </Button>
                  </div>
                  {forecastData ? (
                    <div className="space-y-4" data-testid="card-forecast">
                      <Card className="p-4 rounded-none bg-white border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-accent" />
                        <p className="text-xs leading-relaxed text-muted-foreground font-sans italic pl-2">"{forecastData.summary}"</p>
                      </Card>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {forecastData.projections?.map((proj: ForecastProjection, i: number) => {
                          const confStyles = proj.confidence === 'high' 
                            ? { border: 'border-green-200', bg: 'bg-green-50/50', text: 'text-green-600', badge: 'bg-green-50 border-green-200 text-green-700' }
                            : proj.confidence === 'medium'
                            ? { border: 'border-amber-200', bg: 'bg-amber-50/50', text: 'text-amber-600', badge: 'bg-amber-50 border-amber-200 text-amber-700' }
                            : { border: 'border-red-200', bg: 'bg-red-50/50', text: 'text-red-500', badge: 'bg-red-50 border-red-200 text-red-700' };

                          return (
                            <Card key={i} className={cn("p-5 bg-white border rounded-none shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300", confStyles.border)} data-testid={`card-forecast-period-${i}`}>
                              <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                              <p className="text-[10px] font-sans font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{proj.period}</p>
                              <p className="text-xl font-sans font-bold text-primary">{sym}{Number(proj.revenue || 0).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground font-sans mt-0.5">{proj.units?.toLocaleString()} units</p>
                              <div className="flex items-center gap-1 mt-3">
                                <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5", confStyles.badge)}>{proj.confidence} confidence</Badge>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <Card className="p-10 text-center bg-white border border-gray-200 rounded-none shadow-sm">
                      <TrendingUp className="w-10 h-10 text-muted-foreground/35 mx-auto mb-3" />
                      <p className="font-sans font-bold text-primary uppercase text-sm mb-1 tracking-wider">No Forecast Generated</p>
                      <p className="text-xs text-muted-foreground font-sans">Click "Generate Forecast" to run predictive algorithms on your current volume.</p>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* PIP Generator */}
              {isManager && teamPerformance.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <h2 className="font-sans font-bold text-base uppercase tracking-wider text-primary mb-4 flex items-center gap-2.5">
                    <UserX className="w-5 h-5 text-red-500" />
                    Performance Improvement Plan
                  </h2>
                  <Card className="p-5 bg-white border border-gray-200 rounded-none shadow-sm space-y-4">
                    <div className="flex gap-4 items-end flex-wrap sm:flex-nowrap">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans mb-1.5 block">Select Team Member</label>
                        <Select value={pipMemberId} onValueChange={setPipMemberId}>
                          <SelectTrigger className="w-full h-9 text-xs rounded-none border-gray-200 bg-white focus:ring-accent" data-testid="select-pip-member">
                            <SelectValue placeholder="Choose a member..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-gray-200 bg-white">
                            {teamPerformance.map(m => (
                              <SelectItem key={m.memberId} value={m.memberId} className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">
                                {m.memberName} ({m.achievementPercent.toFixed(0)}% achievement)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        onClick={() => pipMutation.mutate(pipMemberId)} 
                        disabled={!pipMemberId || pipMutation.isPending}
                        className="rounded-none bg-primary hover:bg-primary/95 text-primary-foreground font-sans font-bold text-xs uppercase tracking-wider h-9 shadow-none px-4"
                        data-testid="button-generate-pip"
                      >
                        {pipMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><FileText className="w-4 h-4 mr-2" /> Generate PIP</>}
                      </Button>
                    </div>
                    {pipData && (
                      <div className="border-t border-gray-200 pt-4 space-y-3 font-sans" data-testid="card-pip-result">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-primary">PIP — {pipData.memberName} ({pipData.period})</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => exportPdf('pip')} 
                            className="rounded-none border border-gray-200 hover:bg-gray-50 text-[10px] font-sans font-bold uppercase tracking-wider h-8"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> Save PIP PDF
                          </Button>
                        </div>
                        
                        <div className="bg-gray-50 border border-gray-200 p-4 space-y-3 rounded-none">
                          <div>
                            <span className="text-[10px] font-bold text-accent uppercase tracking-widest block mb-1">Gap Analysis</span>
                            <p className="text-xs text-muted-foreground leading-relaxed">{pipData.gapAnalysis}</p>
                          </div>
                          
                          {pipData.rootCauses && pipData.rootCauses.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-accent uppercase tracking-widest block mb-1">Identified Root Causes</span>
                              <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                                {pipData.rootCauses.map((rc, idx) => <li key={idx}>{rc}</li>)}
                              </ul>
                            </div>
                          )}

                          <div>
                            <span className="text-[10px] font-bold text-accent uppercase tracking-widest block mb-1">Action Items</span>
                            <ul className="list-decimal pl-4 text-xs text-muted-foreground space-y-1">
                              {pipData.actionItems?.map((item, idx) => <li key={idx}>{item}</li>)}
                            </ul>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                            <div className="p-3 bg-white border border-gray-200 rounded-none shadow-sm">
                              <span className="text-[9px] font-bold text-primary uppercase tracking-wider block mb-1">30-Day Goal</span>
                              <p className="text-xs text-muted-foreground leading-relaxed">{pipData.goals?.day30}</p>
                            </div>
                            <div className="p-3 bg-white border border-gray-200 rounded-none shadow-sm">
                              <span className="text-[9px] font-bold text-primary uppercase tracking-wider block mb-1">60-Day Goal</span>
                              <p className="text-xs text-muted-foreground leading-relaxed">{pipData.goals?.day60}</p>
                            </div>
                            <div className="p-3 bg-white border border-gray-200 rounded-none shadow-sm">
                              <span className="text-[9px] font-bold text-primary uppercase tracking-wider block mb-1">90-Day Goal</span>
                              <p className="text-xs text-muted-foreground leading-relaxed">{pipData.goals?.day90}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 pt-2 text-xs border-t border-gray-200">
                            <div><span className="text-[10px] font-bold text-primary uppercase block">Manager Support</span> <span className="text-muted-foreground">{pipData.managerSupport}</span></div>
                            <div><span className="text-[10px] font-bold text-primary uppercase block">Review Schedule</span> <span className="text-muted-foreground">{pipData.reviewSchedule}</span></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}
            </div>
          )}

          {/* ──── COPILOT CHAT TAB ──── */}
          {activeTab === "chat" && (
            <Card className="flex flex-col h-[600px] border border-gray-200 bg-white rounded-none overflow-hidden shadow-sm">
              <ScrollArea ref={scrollRef} className="flex-1 p-6 bg-[#fbfaf7]/40">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-12">
                    <div>
                      <Bot className="w-12 h-12 text-accent mx-auto mb-4" />
                      <h3 className="text-lg font-sans font-bold text-primary mb-2 uppercase tracking-wider">Ask anything about your business data</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mb-4 font-sans leading-relaxed">
                        Try asking questions like "Show sales trends" or "Who are the top performers?". You can also query facts from the RAG Knowledge base!
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                        {[
                          "What caused revenue decline?",
                           "Who performed best this month?",
                          "Check inventory values in uploaded documents"
                        ].map((promptText) => (
                          <Button key={promptText} variant="outline" size="sm" className="text-xs rounded-none border-gray-200 text-primary hover:bg-gray-50 bg-white shadow-none h-8 font-sans font-semibold" onClick={() => setChatInput(promptText)}>
                            "{promptText}"
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                        {msg.role === "assistant" && (
                          <div className="w-8 h-8 rounded-none bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-none px-4 py-3 text-xs font-sans ${msg.role === "user" ? "bg-primary text-primary-foreground font-semibold shadow-sm" : "bg-white border border-gray-200 text-primary shadow-sm"}`}>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
 
                          {/* Render generated SQL if available */}
                          {msg.sqlQuery && (
                            <div className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-none border border-slate-800 font-mono text-[10px] leading-relaxed">
                              <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">SQL Query Executed:</p>
                              <code>{msg.sqlQuery}</code>
                            </div>
                          )}
 
                          {/* Render query result table if available */}
                          {msg.sqlResults && msg.sqlResults.length > 0 && (
                            <div className="mt-2 overflow-x-auto max-w-full rounded-none border border-gray-200 shadow-xs">
                              <Table className="text-[10px] font-sans">
                                <TableHeader className="bg-slate-800 text-slate-100">
                                  <TableRow className="hover:bg-slate-800/90 border-b border-slate-700">
                                    {Object.keys(msg.sqlResults[0]).map(k => (
                                      <TableHead key={k} className="h-8 font-mono text-slate-300 font-bold uppercase tracking-wider px-3">{k}</TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody className="bg-white text-primary">
                                  {msg.sqlResults.slice(0, 5).map((row, idx) => (
                                    <TableRow key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                                      {Object.values(row).map((val: any, cidx) => (
                                        <TableCell key={cidx} className="py-2 px-3 font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
 
                          {/* Citations / sources */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Sources:</span>
                              {msg.citations.map(c => (
                                <Badge key={c} variant="outline" className="text-[9px] border-accent/20 text-accent bg-accent/5 rounded-none font-bold uppercase tracking-wider px-1.5 py-0.5">{c}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
 
                    {isChatSending && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-none bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                          <Bot className="w-4 h-4 text-primary animate-pulse" />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-none px-4 py-3 text-xs flex items-center gap-2.5 font-sans shadow-sm">
                          <Loader2 className="w-4 h-4 animate-spin text-accent" />
                           <span className="text-muted-foreground">Running SQL Agent & RAG lookup...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t border-gray-200 bg-white flex gap-3 items-end">
                <Textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }} placeholder="Ask Copilot about EOD logs, tasks, sites, or search knowledge base..." className="min-h-[44px] h-[44px] resize-none rounded-none border-gray-200 focus-visible:ring-0 focus-visible:border-accent text-foreground text-xs leading-normal font-sans" />
                <Button size="icon" className="h-[44px] w-[44px] shrink-0 bg-primary hover:bg-primary/95 text-primary-foreground rounded-none shadow-none" onClick={sendChatMessage} disabled={isChatSending || !chatInput.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* ──── KNOWLEDGE BASE TAB ──── */}
          {activeTab === "knowledge" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4 bg-white border border-gray-200 p-5 rounded-none shadow-sm">
                <div>
                  <h2 className="font-sans font-bold text-base uppercase tracking-wider text-primary">Document Library</h2>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">Upload guidelines, project plans, reports, or contract files to index for semantic retrieval.</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleKbUpload} className="hidden" accept=".pdf,.docx,.txt,.csv,.xlsx" />
                <Button 
                  className="rounded-none bg-primary hover:bg-primary/95 text-primary-foreground font-sans font-bold text-xs uppercase tracking-wider h-9 shadow-none px-4" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploadKbDocMutation.isPending}
                >
                  {uploadKbDocMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Document
                </Button>
              </div>

              <Card className="bg-white border border-gray-200 rounded-none shadow-sm overflow-hidden">
                <Table className="font-sans">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 text-xs text-muted-foreground uppercase tracking-wide bg-gray-50/50">
                      <TableHead className="font-semibold px-4 py-3">File Name</TableHead>
                      <TableHead className="font-semibold px-4 py-3">Type</TableHead>
                      <TableHead className="font-semibold px-4 py-3">Size</TableHead>
                      <TableHead className="font-semibold px-4 py-3">Processing Status</TableHead>
                      <TableHead className="font-semibold px-4 py-3">Vector Index</TableHead>
                      <TableHead className="font-semibold px-4 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kbDocs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                          No documents uploaded yet. Supports PDF, DOCX, TXT, CSV up to 100MB.
                        </TableCell>
                      </TableRow>
                    ) : (
                      kbDocs.map((doc) => (
                        <TableRow key={doc.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-semibold text-primary px-4 py-3.5">{doc.fileName}</TableCell>
                          <TableCell className="px-4 py-3.5"><Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5">{doc.fileType}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground px-4 py-3.5">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</TableCell>
                          <TableCell className="px-4 py-3.5">
                            <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5",
                              doc.processingStatus === 'completed' ? 'bg-green-50 border-green-200 text-green-600' :
                              doc.processingStatus === 'failed' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600'
                            )}>
                              {doc.processingStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5",
                              doc.indexingStatus === 'completed' ? 'bg-green-50 border-green-200 text-green-600' :
                              doc.indexingStatus === 'failed' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600'
                            )}>
                              {doc.indexingStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right px-4 py-3.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 rounded-none hover:bg-gray-100" onClick={() => deleteKbDocMutation.mutate(doc.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* ──── AGENT WORKSPACE TAB ──── */}
          {activeTab === "agents" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4 bg-white border border-gray-200 p-5 rounded-none shadow-sm">
                <div className="space-y-0.5">
                  <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-primary">Multi-Agent Consensus Audit</h3>
                  <p className="text-xs text-muted-foreground font-sans">Trigger coordinated checks across Sales, Finance, Operations, and HR agent personas.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <Input 
                    type="month" 
                    value={selectedAgentPeriod} 
                    onChange={e => setSelectedAgentPeriod(e.target.value)} 
                    className="h-9 w-40 text-xs rounded-none border-gray-200 bg-white focus-visible:ring-0 focus-visible:border-accent" 
                  />
                  <Button 
                    className="rounded-none bg-primary hover:bg-primary/95 text-primary-foreground font-sans font-bold text-xs uppercase tracking-wider h-9 shadow-none px-4" 
                    onClick={runAgentAnalysis} 
                    disabled={agentAnalysisPending}
                  >
                    {agentAnalysisPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Auditing...</> : <><Cpu className="w-4 h-4 mr-2" /> Run AI Audit</>}
                  </Button>
                </div>
              </div>

              {agentResults && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {/* Consensus Executive Report */}
                  <Card className="bg-white border border-gray-200 rounded-none shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-accent" />
                    <CardHeader className="border-b border-gray-100 py-3.5 pl-6">
                      <CardTitle className="text-xs font-bold text-accent font-sans tracking-wider uppercase flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Executive Consensus Report ({selectedAgentPeriod})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 pb-5 pl-6 pr-5 text-xs text-primary font-sans leading-relaxed whitespace-pre-wrap">
                      {agentResults.consensusReport}
                    </CardContent>
                  </Card>

                  {/* Individual Agents findings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: "Sales Agent", content: agentResults.salesAnalysis, color: "border-l-blue-500", iconColor: "text-blue-500" },
                      { name: "Finance Agent", content: agentResults.financeAnalysis, color: "border-l-green-500", iconColor: "text-green-500" },
                      { name: "Operations Agent", content: agentResults.operationsAnalysis, color: "border-l-purple-500", iconColor: "text-purple-500" },
                      { name: "HR Agent", content: agentResults.hrAnalysis, color: "border-l-red-500", iconColor: "text-red-500" }
                    ].map((agent, index) => (
                      <Card key={index} className={`border border-gray-200 border-l-4 rounded-none bg-white shadow-sm flex flex-col justify-between ${agent.color}`}>
                        <CardHeader className="py-3 bg-gray-50/50 border-b border-gray-100">
                          <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider font-sans flex items-center gap-1.5">
                            <Bot className={`w-3.5 h-3.5 ${agent.iconColor}`} /> {agent.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">
                          {agent.content}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Past Reports List */}
              <div className="space-y-3 mt-8">
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-primary">Audit Log History</h3>
                <div className="space-y-2">
                  {pastAgentReports.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-sans italic">No audits recorded yet.</p>
                  ) : (
                    pastAgentReports.map((report) => (
                      <Card 
                        key={report.id} 
                        className="p-4 bg-white border border-gray-200 hover:border-accent rounded-none shadow-sm transition-all cursor-pointer relative overflow-hidden group" 
                        onClick={() => setAgentResults(report)}
                      >
                        <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-accent/40 group-hover:bg-accent transition-colors" />
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/5 text-primary border border-primary/10 rounded-none">
                              <Cpu className="w-4 h-4 text-accent" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-primary leading-none uppercase tracking-tight">{report.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-1 font-sans">Audit executed on {new Date(report.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          <Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5">{report.period}</Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ──── ACTIONS CENTER TAB ──── */}
          {activeTab === "actions" && (
            <div className="space-y-6">
              <div className="space-y-1 bg-white border border-gray-200 p-5 rounded-none shadow-sm">
                <h2 className="font-sans font-bold text-base uppercase tracking-wider text-primary">Audit Execution Logs</h2>
                <p className="text-xs text-muted-foreground font-sans mt-0.5">Propose actions during AI audits. Approve them to generate live entities in database (Kanban board tasking, calendar updates, reminders).</p>
              </div>

              <Card className="bg-white border border-gray-200 rounded-none shadow-sm overflow-hidden">
                <Table className="font-sans">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 text-xs text-muted-foreground uppercase tracking-wide bg-gray-50/50">
                      <TableHead className="font-semibold px-4 py-3">Action Type</TableHead>
                      <TableHead className="font-semibold px-4 py-3">Target Details</TableHead>
                      <TableHead className="font-semibold px-4 py-3">Workflow Status</TableHead>
                      <TableHead className="font-semibold px-4 py-3">Logs</TableHead>
                      <TableHead className="font-semibold px-4 py-3 text-right">Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                          No pending actions generated by agents. Ask AI to "Create a task" to test.
                        </TableCell>
                      </TableRow>
                    ) : (
                      actions.map((act) => (
                        <TableRow key={act.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-bold text-primary uppercase text-[10px] tracking-wide font-sans px-4 py-3.5">{act.actionType.replace("_", " ")}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground max-w-[200px] truncate px-4 py-3.5">
                            {JSON.stringify(act.details)}
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5",
                              act.status === 'completed' ? 'bg-green-50 border-green-200 text-green-600' :
                              act.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600'
                            )}>
                              {act.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] font-mono text-muted-foreground max-w-[200px] truncate px-4 py-3.5">
                            {act.logs}
                          </TableCell>
                          <TableCell className="text-right px-4 py-3.5">
                            {act.status === 'pending' && (
                              <Button 
                                size="sm" 
                                className="rounded-none bg-accent hover:bg-accent/95 text-white font-sans font-bold text-[9px] uppercase tracking-wider h-7 px-3 shadow-none" 
                                onClick={() => approveActionMutation.mutate(act.id)} 
                                disabled={approveActionMutation.isPending}
                              >
                                Approve & Run
                              </Button>
                            )}
                            {act.status === 'completed' && (
                              <span className="text-[10px] text-green-600 flex items-center justify-end gap-1.5 font-bold font-sans uppercase tracking-wider">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Executed
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* ──── INTEGRATIONS HUB TAB ──── */}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4 bg-white border border-gray-200 p-5 rounded-none shadow-sm">
                <div>
                  <h2 className="font-sans font-bold text-base uppercase tracking-wider text-primary">Integrations Connection Dashboard</h2>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">Connect external data systems (ERP, CRM, SQL Server) to pipeline metrics directly into your Analytics engine.</p>
                </div>
                <Dialog open={isAddIntegrationOpen} onOpenChange={setIsAddIntegrationOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-none bg-primary hover:bg-primary/95 text-primary-foreground font-sans font-bold text-xs uppercase tracking-wider h-9 shadow-none px-4">
                      <Plus className="w-4 h-4 mr-2" /> Connect Data Source
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-none border border-gray-200 bg-white font-sans">
                    <DialogHeader>
                      <DialogTitle className="font-sans font-bold uppercase tracking-wider text-primary text-sm">Add Integration Source</DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">Setup database credentials to pull table contexts.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source Name</label>
                        <Input value={integrationName} onChange={e => setIntegrationName(e.target.value)} placeholder="e.g. ERP Postgres Client" className="rounded-none border-gray-200 bg-white focus-visible:ring-0 focus-visible:border-accent text-xs h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source Type</label>
                        <Select value={integrationType} onValueChange={setIntegrationType}>
                          <SelectTrigger className="w-full h-9 text-xs rounded-none border-gray-200 bg-white focus:ring-accent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-gray-200 bg-white">
                            <SelectItem value="postgres" className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">PostgreSQL</SelectItem>
                            <SelectItem value="mysql" className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">MySQL Database</SelectItem>
                            <SelectItem value="shopify" className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">Shopify Store</SelectItem>
                            <SelectItem value="woocommerce" className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">WooCommerce</SelectItem>
                            <SelectItem value="zoho_books" className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">Zoho Books</SelectItem>
                            <SelectItem value="stripe" className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">Stripe Payments</SelectItem>
                            <SelectItem value="razorpay" className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">Razorpay API</SelectItem>
                            <SelectItem value="google_ads" className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">Google Ads</SelectItem>
                            <SelectItem value="meta_ads" className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">Meta Ads</SelectItem>
                            <SelectItem value="ga4" className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">Google Analytics (GA4)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Host Endpoint / URL */}
                      {integrationType !== "stripe" && integrationType !== "zoho_books" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {integrationType === "shopify" ? "Shopify Store URL" : 
                             integrationType === "woocommerce" ? "WooCommerce Store URL" : 
                             "Host Endpoint / URL"}
                          </label>
                          <Input 
                            value={dbHost} 
                            onChange={e => setDbHost(e.target.value)} 
                            placeholder={integrationType === "shopify" ? "your-store.myshopify.com" : 
                                         integrationType === "woocommerce" ? "www.my-store.com" : 
                                         "localhost / api.crm.com"} 
                            className="rounded-none border-gray-200 bg-white focus-visible:ring-0 focus-visible:border-accent text-xs h-9" 
                          />
                        </div>
                      )}
                      
                      {/* Key / Access Token / Database Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {integrationType === "shopify" ? "Shopify Admin Access Token (shpat_...)" : 
                           integrationType === "stripe" ? "Stripe Secret API Key (sk_...)" : 
                           integrationType === "woocommerce" ? "WooCommerce Consumer Secret (cs_...)" : 
                           integrationType === "zoho_books" ? "Zoho API/Access Key" : 
                           "Database Name"}
                        </label>
                        <Input 
                          value={dbName} 
                          onChange={e => setDbName(e.target.value)} 
                          placeholder={integrationType === "shopify" ? "shpat_xxxxxxxxxxxxxxxx" : 
                                       integrationType === "stripe" ? "sk_live_xxxxxxxxxxxxxxxx" : 
                                       integrationType === "woocommerce" ? "cs_xxxxxxxxxxxxxxxx" : 
                                       "data_insights_db"} 
                          className="rounded-none border-gray-200 bg-white focus-visible:ring-0 focus-visible:border-accent text-xs h-9" 
                        />
                      </div>
                      
                      {/* Username / Consumer Key */}
                      {(integrationType === "postgres" || integrationType === "mysql" || integrationType === "woocommerce") && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {integrationType === "woocommerce" ? "Consumer Key (ck_...)" : "Username"}
                          </label>
                          <Input 
                            value={dbUser} 
                            onChange={e => setDbUser(e.target.value)} 
                            placeholder={integrationType === "woocommerce" ? "ck_xxxxxxxxxxxxxxxx" : "postgres"} 
                            className="rounded-none border-gray-200 bg-white focus-visible:ring-0 focus-visible:border-accent text-xs h-9" 
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => setIsAddIntegrationOpen(false)} className="rounded-none border border-gray-200 bg-white hover:bg-gray-50 text-[10px] font-bold uppercase tracking-wider h-9 font-sans">Cancel</Button>
                      <Button className="rounded-none bg-primary hover:bg-primary/95 text-primary-foreground font-sans font-bold text-xs uppercase tracking-wider h-9 shadow-none px-4" onClick={() => saveIntegrationMutation.mutate()}>Save Connection</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* App Store Connectors Grid */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Available Integrations (Discover & Connect)</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {INTEGRATION_APPS.map((app) => {
                    const AppIcon = app.icon;
                    return (
                      <Card 
                        key={app.id} 
                        onClick={() => handleAppConnect(app)}
                        className={cn(
                          "bg-gradient-to-br border rounded-none p-4 shadow-sm flex flex-col justify-between h-36 hover:shadow-md cursor-pointer hover:border-primary/30 transition-all group",
                          app.color, 
                          app.border
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-white border border-gray-150 group-hover:scale-105 transition-transform">
                              <AppIcon className="w-4 h-4 text-primary" />
                            </div>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider truncate font-sans">{app.name}</p>
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-2 font-sans line-clamp-2 leading-relaxed">{app.description}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full h-6 text-[9px] rounded-none font-bold uppercase tracking-wider bg-white/70 hover:bg-white hover:text-primary mt-2 border-gray-200"
                        >
                          Connect App
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-100 my-6" />

              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Active Connections</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {integrations.length === 0 ? (
                  <Card className="col-span-3 p-10 bg-white border border-gray-200 rounded-none shadow-sm text-center font-sans">
                    <DatabaseBackup className="w-10 h-10 text-muted-foreground/35 mx-auto mb-3" />
                    <p className="font-sans font-bold text-primary uppercase text-sm mb-1 tracking-wider">No connected integrations</p>
                    <p className="text-xs text-muted-foreground">Click "Connect Data Source" to connect ERP, CRM, or external databases.</p>
                  </Card>
                ) : (
                  integrations.map((int) => (
                    <Card key={int.id} className="bg-white border border-gray-200 rounded-none shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between h-48">
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-accent" />
                            <p className="text-xs font-bold text-primary uppercase tracking-tight truncate max-w-[120px] font-sans">{int.sourceName}</p>
                          </div>
                          <Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5">{int.sourceType}</Badge>
                        </div>
                        {["postgres", "mysql"].includes(int.sourceType) ? (
                          <>
                            <p className="text-[10px] text-muted-foreground font-sans mt-3">Host: {(int.config as any)?.host || "localhost"}</p>
                            <p className="text-[10px] text-muted-foreground font-sans">DB: {(int.config as any)?.database || "data_insights"}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-[10px] text-muted-foreground font-sans mt-3">Connection: Secure OAuth</p>
                            <p className="text-[10px] text-muted-foreground font-sans">Last Synced: {int.lastSyncedAt ? new Date(int.lastSyncedAt).toLocaleString() : "Never"}</p>
                          </>
                        )}
                        
                        <div className="flex gap-2 mt-4 flex-wrap">
                          <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5",
                            int.connectionStatus === 'connected' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'
                          )}>
                            {int.connectionStatus}
                          </Badge>
                          <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5",
                            int.connectionHealth === 'healthy' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'
                          )}>
                            Health: {int.connectionHealth}
                          </Badge>
                          <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5",
                            int.syncStatus === 'synced' ? 'bg-green-50 border-green-200 text-green-600' : (int.syncStatus === 'syncing' ? 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse' : 'bg-red-50 border-red-200 text-red-600')
                          )}>
                            Sync: {int.syncStatus}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2 border-t border-gray-100 pt-3 mt-3 flex-wrap">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-[10px] px-2 text-muted-foreground hover:text-primary rounded-none hover:bg-gray-50 uppercase font-sans font-bold tracking-wider" 
                          onClick={() => testIntegrationMutation.mutate(int.id)} 
                          disabled={testIntegrationMutation.isPending}
                        >
                          {testIntegrationMutation.isPending ? "Testing..." : "Test Connection"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-[10px] px-2 text-muted-foreground hover:text-primary rounded-none hover:bg-gray-50 uppercase font-sans font-bold tracking-wider" 
                          onClick={() => syncIntegrationMutation.mutate(int.id)} 
                          disabled={syncingId === int.id || int.syncStatus === 'syncing'}
                        >
                          {syncingId === int.id || int.syncStatus === 'syncing' ? "Syncing..." : "Sync Data"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-[10px] px-2 text-red-600 hover:text-red-700 rounded-none hover:bg-red-50 uppercase font-sans font-bold tracking-wider ml-auto" 
                          onClick={() => disconnectIntegrationMutation.mutate(int.id)} 
                          disabled={disconnectIntegrationMutation.isPending}
                        >
                          {disconnectIntegrationMutation.isPending ? "Disconnecting..." : "Disconnect"}
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
