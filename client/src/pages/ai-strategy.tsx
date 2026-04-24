import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import ChatInterface from "@/components/chat-interface";

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

interface ChartConfigLine {
  dataKey: string;
  name: string;
  color: string;
}

interface ChartConfig {
  data: Array<{ period: string; revenue: number; units: number }>;
  xKey: string;
  lines: ChartConfigLine[];
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
  chartConfig?: ChartConfig;
}

interface PipApiResponse {
  pip: Omit<PipData, 'memberName' | 'period'>;
  memberName: string;
  period: string;
}

interface ForecastApiResponse {
  forecast: Omit<ForecastData, 'businessName' | 'currencySymbol' | 'trends'>;
  chartConfig?: ChartConfig;
  businessName: string;
  currencySymbol: string;
  trends: TrendPoint[];
}

export default function AiStrategy() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [pipMemberId, setPipMemberId] = useState("");
  const [pipData, setPipData] = useState<PipData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);

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
      setForecastData({ ...data.forecast, businessName: data.businessName, currencySymbol: data.currencySymbol, trends: data.trends, chartConfig: data.chartConfig });
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

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      </div>
    );
  }

  const sym = profile?.currencySymbol ?? "₹";

  // Derive AI insights from data
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
    <div className="min-h-screen bg-background flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/business")} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-business">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-amber-500" />
                <div>
                  <h1 className="font-bold text-lg leading-tight">Business Advisor</h1>
                  <p className="text-xs text-muted-foreground">Data-driven insights for {profile?.name}</p>
                </div>
              </div>
            </div>
            {isManager && (
              <Button variant="outline" size="sm" onClick={() => exportPdf('business')} data-testid="button-export-report">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            )}
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-8 w-full">
          {/* What to do here — Business Advisor UX explainer */}
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">What the Business Advisor does</p>
            <div className="flex flex-col sm:flex-row gap-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">1.</span>
                <span><span className="font-medium text-foreground">Revenue forecasting</span> — generates AI-powered revenue predictions based on your historical EOD data and industry trends.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">2.</span>
                <span><span className="font-medium text-foreground">PIP generation</span> — creates Performance Improvement Plans for underperforming team members with actionable steps.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">3.</span>
                <span><span className="font-medium text-foreground">Strategy insights</span> — AI observes patterns in your team's data and surfaces risks, opportunities, and recommendations.</span>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-lg">AI-Generated Insights</h2>
              <Badge variant="outline" className="text-xs">Auto-updated</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Based on your team's EOD entries and performance data from the last 6 months.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((ins, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className={`p-4 border ${colorMap[ins.type]}`} data-testid={`card-insight-${i}`}>
                    <div className="flex items-start gap-3">
                      {iconMap[ins.type]}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{ins.title}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 capitalize ${badgeMap[ins.type]}`}>
                            {ins.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{ins.description}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* AI Revenue Forecast (owner/manager only) */}
          {isManager && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-blue-500" />
                    AI Revenue Forecast
                  </h2>
                  <p className="text-sm text-muted-foreground">30/60/90-day forward projection based on your trends</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => forecastMutation.mutate()}
                  disabled={forecastMutation.isPending}
                  data-testid="button-generate-forecast"
                >
                  {forecastMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Generate Forecast</>
                  )}
                </Button>
              </div>
              {forecastData ? (
                <div className="space-y-4" data-testid="card-forecast">
                  {/* Summary */}
                  {forecastData.summary && (
                    <Card className="p-4 border-blue-500/20 bg-blue-500/5">
                      <p className="text-sm leading-relaxed text-muted-foreground italic">{forecastData.summary}</p>
                    </Card>
                  )}
                  {/* 30/60/90 Projections */}
                  {forecastData.projections?.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {forecastData.projections.map((proj: ForecastProjection, i: number) => (
                        <Card key={i} className={`p-4 border ${
                          proj.confidence === 'high' ? 'border-green-500/20 bg-green-500/5' :
                          proj.confidence === 'medium' ? 'border-amber-500/20 bg-amber-500/5' :
                          'border-red-500/20 bg-red-500/5'
                        }`} data-testid={`card-forecast-period-${i}`}>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{proj.period}</p>
                          <p className="text-lg font-bold">{sym}{Number(proj.revenue || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{proj.units?.toLocaleString()} units</p>
                          <div className="flex items-center gap-1 mt-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              proj.confidence === 'high' ? 'bg-green-500/15 text-green-600' :
                              proj.confidence === 'medium' ? 'bg-amber-500/15 text-amber-600' :
                              'bg-red-500/15 text-red-500'
                            }`}>
                              {proj.confidence} confidence
                            </span>
                          </div>
                          {proj.note && <p className="text-[11px] text-muted-foreground mt-2">{proj.note}</p>}
                        </Card>
                      ))}
                    </div>
                  )}
                  {/* Revenue Trend Line Chart */}
                  {forecastData.projections?.length > 0 && (
                    <Card className="p-4" data-testid="card-forecast-chart">
                      <h4 className="text-sm font-semibold mb-3">Revenue Projection Chart</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={forecastData.projections.map((p: ForecastProjection) => ({ period: p.period, revenue: Number(p.revenue || 0), units: Number(p.units || 0) }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number, name: string) => [name === 'revenue' ? `${sym}${Number(value).toLocaleString()}` : value.toLocaleString(), name === 'revenue' ? 'Revenue' : 'Units']} />
                          <Line type="monotone" dataKey="revenue" stroke="#eab308" strokeWidth={2} dot={{ fill: "#eab308", r: 4 }} name="revenue" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  )}
                  {/* Assumptions & Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {forecastData.assumptions?.length > 0 && (
                      <Card className="p-4">
                        <h4 className="text-sm font-semibold mb-2">Key Assumptions</h4>
                        <ul className="space-y-1">
                          {forecastData.assumptions.map((a: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-amber-500 flex-shrink-0">•</span>{a}</li>
                          ))}
                        </ul>
                      </Card>
                    )}
                    {forecastData.recommendedActions?.length > 0 && (
                      <Card className="p-4">
                        <h4 className="text-sm font-semibold mb-2">Recommended Actions</h4>
                        <ul className="space-y-1">
                          {forecastData.recommendedActions.map((a: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-green-500 flex-shrink-0">→</span>{a}</li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </div>
                  {/* Risk Factors */}
                  {forecastData.riskFactors?.length > 0 && (
                    <Card className="p-4 border-red-500/20 bg-red-500/5">
                      <h4 className="text-sm font-semibold mb-2 text-red-500">Risk Factors</h4>
                      <ul className="space-y-1">
                        {forecastData.riskFactors.map((r: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-2"><AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />{r}</li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
              ) : (
                <Card className="p-8 text-center border-dashed">
                  <TrendingDown className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click "Generate Forecast" to create an AI-powered 30/60/90-day revenue projection.</p>
                </Card>
              )}
            </motion.div>
          )}

          {/* PIP Generator (owner/manager only) */}
          {isManager && teamPerformance.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <UserX className="w-5 h-5 text-red-500" />
                    Performance Improvement Plan
                  </h2>
                  <p className="text-sm text-muted-foreground">Generate an AI-drafted PIP for any team member</p>
                </div>
              </div>
              <Card className="p-5 space-y-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1.5 block">Select Team Member</label>
                    <Select value={pipMemberId} onValueChange={setPipMemberId}>
                      <SelectTrigger data-testid="select-pip-member">
                        <SelectValue placeholder="Choose a member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teamPerformance.map(m => (
                          <SelectItem key={m.memberId} value={m.memberId}>
                            {m.memberName} ({m.achievementPercent.toFixed(0)}% achievement)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => pipMutation.mutate(pipMemberId)}
                    disabled={!pipMemberId || pipMutation.isPending}
                    data-testid="button-generate-pip"
                  >
                    {pipMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><FileText className="w-4 h-4 mr-2" /> Generate PIP</>
                    )}
                  </Button>
                </div>
                {pipData && (
                  <div className="border-t pt-4 space-y-4" data-testid="card-pip-result">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">PIP — {pipData.memberName}</p>
                        <span className="text-xs text-muted-foreground">({pipData.period})</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => exportPdf('pip')} data-testid="button-export-pip">
                        <Download className="w-3 h-3 mr-1" />Export PDF
                      </Button>
                    </div>
                    {pipData.gapAnalysis && (
                      <div>
                        <p className="text-xs font-medium text-red-500 mb-1">Performance Gap</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{pipData.gapAnalysis}</p>
                      </div>
                    )}
                    {pipData.rootCauses?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Root Causes</p>
                        <ul className="space-y-1">
                          {pipData.rootCauses.map((c: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-amber-500 flex-shrink-0">•</span>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {pipData.goals && (
                      <div>
                        <p className="text-xs font-medium mb-2">SMART Goals</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {[
                            { label: "30 Days", value: pipData.goals.day30, color: "bg-blue-500/10 text-blue-600" },
                            { label: "60 Days", value: pipData.goals.day60, color: "bg-amber-500/10 text-amber-600" },
                            { label: "90 Days", value: pipData.goals.day90, color: "bg-green-500/10 text-green-600" },
                          ].map((g, i) => (
                            <div key={i} className={`rounded-lg p-3 text-xs ${g.color}`}>
                              <p className="font-semibold mb-1">{g.label}</p>
                              <p>{g.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {pipData.actionItems?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Action Plan</p>
                        <ol className="space-y-1 list-decimal list-inside">
                          {pipData.actionItems.map((a: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground">{a}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {(pipData.managerSupport || pipData.reviewSchedule) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pipData.managerSupport && (
                          <div className="rounded-lg bg-muted p-3">
                            <p className="text-xs font-medium mb-1">Manager Support</p>
                            <p className="text-xs text-muted-foreground">{pipData.managerSupport}</p>
                          </div>
                        )}
                        {pipData.reviewSchedule && (
                          <div className="rounded-lg bg-muted p-3">
                            <p className="text-xs font-medium mb-1">Review Schedule</p>
                            <p className="text-xs text-muted-foreground">{pipData.reviewSchedule}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {pipData.summary && (
                      <p className="text-xs text-muted-foreground italic border-t pt-3">{pipData.summary}</p>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="font-semibold text-lg mb-4">Recommended Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate("/business/operations")} data-testid="action-view-operations">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-sm">Review Team Performance</span>
                </div>
                <p className="text-xs text-muted-foreground">Check this month's leaderboard and EOD reports.</p>
              </Card>
              <Card className="p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate("/business/verticals")} data-testid="action-adjust-targets">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm">Adjust Targets</span>
                </div>
                <p className="text-xs text-muted-foreground">Update vertical targets based on performance trends.</p>
              </Card>
              <Card className="p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate("/")} data-testid="action-import-data">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-sm">Import External Data</span>
                </div>
                <p className="text-xs text-muted-foreground">Connect Google Sheets or upload Excel for deeper analysis.</p>
              </Card>
            </div>
          </motion.div>

          {/* Performance trends summary */}
          {trends.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="font-semibold text-lg mb-4">6-Month Revenue Trend</h2>
              <Card className="p-4" data-testid="card-revenue-trend">
                <div className="flex items-end gap-2 h-32">
                  {trends.map((t, i) => {
                    const maxRev = Math.max(...trends.map(x => x.totalRevenue), 1);
                    const height = Math.max((t.totalRevenue / maxRev) * 100, 4);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{sym}{t.totalRevenue >= 1000 ? (t.totalRevenue / 1000).toFixed(0) + "k" : t.totalRevenue}</span>
                        <div className="w-full rounded-t-sm bg-amber-500/80 transition-all" style={{ height: `${height}%` }} />
                        <span className="text-[10px] text-muted-foreground">{t.period.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Business AI Chat — live business data mode */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-amber-500" />
                Ask AI About Your Business
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Ask questions about your team's performance, targets, and revenue — AI answers using your live business data.
              </p>
            </div>
            <Card className="overflow-hidden" data-testid="card-business-chat">
              <ChatInterface businessMode={true} />
            </Card>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
