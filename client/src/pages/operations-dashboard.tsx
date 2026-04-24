import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  DollarSign,
  Handshake,
  Package,
  Download,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Receipt,
} from "lucide-react";
import { getIdToken } from "@/lib/firebase";
import BusinessSidebar from "@/components/business-sidebar";
import { getUpcomingFestivals, getCurrentFY } from "@/lib/festivalCalendar";

interface BusinessProfile {
  id: string;
  name: string;
  currencySymbol: string;
  memberRole: string;
  ownerId: string;
}

interface BusinessVertical {
  id: string;
  name: string;
  metricLabel: string;
  metricUnit: string;
}

interface TeamPerformanceSummary {
  memberId: string;
  memberName: string;
  memberEmail: string;
  totalRevenue: number;
  totalUnits: number;
  totalDeals: number;
  totalExpenses: number;
  travelExpenses: number;
  baseSalary: number;
  targetRevenue: number;
  achievementPercent: number;
  projectedIncentive: number;
  entryCount: number;
}

interface EodEntry {
  id: string;
  memberId: string;
  entryDate: string;
  verticalId?: string;
  revenueAmount: number;
  unitsSold: number;
  dealsClosed: number;
  expenseItems: { category: string; amount: number; description?: string }[];
  notes?: string;
  managerNote?: string;
  status: string;
}

interface TrendPoint {
  period: string;
  label: string;
  totalRevenue: number;
  totalDeals: number;
  totalExpenses: number;
  achievementPercent: number;
  entryCount: number;
}

const CHART_COLORS = [
  "hsl(43, 74%, 49%)",
  "hsl(200, 65%, 38%)",
  "hsl(280, 55%, 42%)",
  "hsl(25, 70%, 45%)",
  "hsl(160, 60%, 40%)",
];

function getPeriodLabel(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

function formatCurrency(amount: number, symbol: string = "₹"): string {
  if (amount >= 10000000) return `${symbol}${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}

function AchievementBadge({ percent }: { percent: number }) {
  if (percent >= 80) return <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">{percent}%</Badge>;
  if (percent >= 50) return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs">{percent}%</Badge>;
  return <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-xs">{percent}%</Badge>;
}

async function getToken(): Promise<string> {
  try { return await getIdToken() ?? ""; } catch { return ""; }
}

// Build list of Indian FY options (Apr–Mar) from 2022 to current+1
function getFYOptions(): { label: string; startYear: number }[] {
  const currentMonth = new Date().getMonth(); // 0-indexed
  const currentYear = new Date().getFullYear();
  const currentFYStart = currentMonth >= 3 ? currentYear : currentYear - 1;
  const options = [];
  for (let y = 2022; y <= currentFYStart; y++) {
    options.push({ label: `FY ${y}–${y + 1}`, startYear: y });
  }
  return options.reverse();
}

// Get FY start year from a period string like "2025-06"
function getFYStartFromPeriod(period: string): number {
  const [y, m] = period.split("-").map(Number);
  return m >= 4 ? y : y - 1;
}

// Get min/max month strings for a given FY start year
function getFYRange(fyStart: number): { min: string; max: string } {
  return { min: `${fyStart}-04`, max: `${fyStart + 1}-03` };
}

export default function OperationsDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [period, setPeriod] = useState(getPeriodLabel());
  const [fyStartYear, setFyStartYear] = useState(() => getFYStartFromPeriod(getPeriodLabel()));
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [drillDownPeriod, setDrillDownPeriod] = useState(getPeriodLabel());
  const [drillDownVerticalId, setDrillDownVerticalId] = useState("");
  const [reviewEntry, setReviewEntry] = useState<EodEntry | null>(null);
  const [managerNote, setManagerNote] = useState("");
  const [filterVertical, setFilterVertical] = useState("");
  const [leaderboardSort, setLeaderboardSort] = useState<"achievement" | "revenue" | "deals">("achievement");

  const { data: profile, isLoading: profileLoading } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  const { data: verticals = [] } = useQuery<BusinessVertical[]>({
    queryKey: ["/api/business/verticals"],
    enabled: !!profile,
  });

  const { data: teamPerformance = [], isLoading: teamLoading, refetch: refetchTeam } = useQuery<TeamPerformanceSummary[]>({
    queryKey: ["/api/business/performance/team", period],
    queryFn: async () => {
      const res = await fetch(`/api/business/performance/team?period=${period}`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!profile,
  });

  const eodQuery = useQuery<EodEntry[]>({
    queryKey: ["/api/business/eod", filterVertical, period],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterVertical) params.set("verticalId", filterVertical);
      // Scope EOD list to the selected period so all widgets are period-consistent
      const [yr, mo] = period.split("-");
      const lastDay = new Date(+yr, +mo, 0).getDate();
      params.set("fromDate", `${period}-01`);
      params.set("toDate", `${period}-${String(lastDay).padStart(2, "0")}`);
      const url = `/api/business/eod?${params.toString()}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!profile,
  });

  const trendsQuery = useQuery<TrendPoint[]>({
    queryKey: ["/api/business/performance/trends", "team"],
    queryFn: async () => {
      const res = await fetch(`/api/business/performance/trends?months=6&team=true`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!profile,
  });

  // YoY comparison: same period from last year
  const lastYearPeriod = (() => {
    const [year, month] = period.split("-");
    return `${parseInt(year) - 1}-${month}`;
  })();

  const lastYearTeamQuery = useQuery<TeamPerformanceSummary[]>({
    queryKey: ["/api/business/performance/team", lastYearPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/business/performance/team?period=${lastYearPeriod}`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!profile,
  });

  type MemberDrillDown = { entries: EodEntry[]; memberName: string; memberEmail: string; totalRevenue: number; achievementPercent: number; targetRevenue: number };
  const memberDrillDownQuery = useQuery<MemberDrillDown>({
    queryKey: ["/api/business/performance/member", selectedMemberId, drillDownPeriod, drillDownVerticalId],
    queryFn: async () => {
      let url = `/api/business/performance/member/${selectedMemberId}?period=${drillDownPeriod}`;
      if (drillDownVerticalId) url += `&verticalId=${drillDownVerticalId}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedMemberId,
  });

  const addManagerNoteMutation = useMutation({
    mutationFn: async ({ id, note, status }: { id: string; note: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/business/eod/${id}`, { managerNote: note, status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/eod"] });
      setReviewEntry(null);
      setManagerNote("");
      toast({ title: "Entry reviewed!" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  function csvEscape(value: unknown): string {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function exportCSV() {
    if (!teamPerformance.length) return;
    const headers = ["Name", "Email", "Revenue", unitLabel, "Deals", "Expenses", "Target Revenue", "Achievement%", "Incentive", "EOD Entries"];
    const rows = teamPerformance.map(m => [
      m.memberName, m.memberEmail,
      m.totalRevenue, m.totalUnits, m.totalDeals, m.totalExpenses,
      m.targetRevenue, m.achievementPercent + "%",
      m.projectedIncentive, m.entryCount,
    ]);
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-performance-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported!" });
  }

  const sym = profile?.currencySymbol ?? "₹";

  // Industry-adaptive metric labels from primary vertical
  const primaryVertical = verticals.length > 0 ? verticals[0] : null;
  const unitLabel = primaryVertical?.metricLabel ?? "Units";
  const unitMetric = primaryVertical?.metricUnit ?? "units";

  // Aggregate totals
  const totalRevenue = teamPerformance.reduce((s, m) => s + m.totalRevenue, 0);
  const totalDeals = teamPerformance.reduce((s, m) => s + m.totalDeals, 0);
  const totalExpenses = teamPerformance.reduce((s, m) => s + m.totalExpenses, 0);
  const avgAchievement = teamPerformance.length ? Math.round(teamPerformance.reduce((s, m) => s + m.achievementPercent, 0) / teamPerformance.length) : 0;

  // YoY totals
  const lastYearRevenue = (lastYearTeamQuery.data ?? []).reduce((s, m) => s + m.totalRevenue, 0);
  const yoyDelta = lastYearRevenue > 0 ? Math.round(((totalRevenue - lastYearRevenue) / lastYearRevenue) * 100) : null;

  // Sorted leaderboard
  const sortedLeaderboard = [...teamPerformance].sort((a, b) => {
    if (leaderboardSort === "revenue") return b.totalRevenue - a.totalRevenue;
    if (leaderboardSort === "deals") return b.totalDeals - a.totalDeals;
    return b.achievementPercent - a.achievementPercent;
  });

  // Chart data: Revenue vs Target per member
  const revenueChartData = teamPerformance.slice(0, 8).map(m => ({
    name: (m.memberName.split(" ")[0] || m.memberEmail.split("@")[0]).slice(0, 10),
    revenue: Math.round(m.totalRevenue / 1000),
    target: Math.round(m.targetRevenue / 1000),
  }));

  // Vertical revenue split (aggregate across all entries)
  const verticalRevMap: Record<string, number> = {};
  for (const entry of eodQuery.data ?? []) {
    const vId = entry.verticalId ?? "no_vertical";
    verticalRevMap[vId] = (verticalRevMap[vId] ?? 0) + entry.revenueAmount;
  }
  const verticalPieData = Object.entries(verticalRevMap)
    .map(([vId, rev]) => ({
      name: verticals.find(v => v.id === vId)?.name ?? (vId === "no_vertical" ? "General" : "Unknown"),
      value: rev,
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Employer cost composition pie: Salary vs Incentives vs Travel (from team performance data)
  const totalSalary = teamPerformance.reduce((s, m) => s + (m.baseSalary ?? 0), 0);
  const totalIncentives = teamPerformance.reduce((s, m) => s + (m.projectedIncentive ?? 0), 0);
  const totalTravel = teamPerformance.reduce((s, m) => s + (m.travelExpenses ?? 0), 0);
  const expensePieData = [
    { name: "Salary", value: totalSalary },
    { name: "Incentives", value: totalIncentives },
    { name: "Travel", value: totalTravel },
  ].filter(d => d.value > 0);

  // Monthly trend data (from trends API)
  const trendData = (trendsQuery.data ?? []).map(t => ({
    label: t.label,
    revenue: Math.round(t.totalRevenue / 1000),
    deals: t.totalDeals,
    expenses: Math.round(t.totalExpenses / 1000),
    achievement: t.achievementPercent,
  }));

  // Recent EOD entries
  const recentEntries = (eodQuery.data ?? []).slice(0, 15);


  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  // Role guard: employees are redirected to My Performance page
  if (profile && profile.memberRole === "employee") {
    navigate("/business/eod");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/business")} className="text-muted-foreground hover:text-foreground" data-testid="button-back-business">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg">Team View</h1>
              <p className="text-xs text-muted-foreground">{profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(fyStartYear)}
              onValueChange={val => {
                const fy = parseInt(val);
                setFyStartYear(fy);
                setPeriod(`${fy}-04`);
              }}
            >
              <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-fy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getFYOptions().map(opt => (
                  <SelectItem key={opt.startYear} value={String(opt.startYear)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="month"
              value={period}
              min={getFYRange(fyStartYear).min}
              max={getFYRange(fyStartYear).max}
              onChange={e => {
                setPeriod(e.target.value);
                setFyStartYear(getFYStartFromPeriod(e.target.value));
              }}
              className="w-36"
              data-testid="input-period"
            />
            <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { refetchTeam(); eodQuery.refetch(); trendsQuery.refetch(); }}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* What to do here — UX data journey explainer */}
        <div className="bg-muted/30 border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">How Team View works</p>
          <div className="flex flex-col sm:flex-row gap-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">1.</span>
              <span><span className="font-medium text-foreground">Employees log EODs</span> — revenue, deals, units, and expenses submitted daily via "Log My Day".</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">2.</span>
              <span><span className="font-medium text-foreground">Entries appear here</span> — you review them, leave notes, and track achievement vs. targets in real time.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">3.</span>
              <span><span className="font-medium text-foreground">AI learns &amp; forecasts</span> — the Business Advisor uses this data to generate revenue forecasts and strategy insights.</span>
            </div>
          </div>
        </div>

        {/* Festival Banner */}
        {(() => {
          const upcoming = getUpcomingFestivals(30);
          if (upcoming.length === 0) return null;
          const { festival, daysAway } = upcoming[0];
          const fy = getCurrentFY();
          const label = daysAway === 0 ? "Today!" : daysAway === 1 ? "Tomorrow" : `${daysAway} days away`;
          return (
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{festival.emoji}</span>
                <div>
                  <p className="font-semibold text-sm">{festival.name} — <span className="text-amber-500">{label}</span></p>
                  {festival.tip && <p className="text-xs text-muted-foreground mt-0.5">{festival.tip}</p>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">{fy.label} · Month {fy.monthInFY}/12</p>
              </div>
            </div>
          );
        })()}

        {/* Aggregate KPIs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Team Revenue</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue, sym)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{period}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <Handshake className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Total Deals</span>
            </div>
            <p className="text-2xl font-bold">{totalDeals}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{teamPerformance.length} members</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Avg Achievement</span>
            </div>
            <p className="text-2xl font-bold">{avgAchievement}%</p>
            <p className={`text-xs mt-0.5 ${avgAchievement >= 80 ? 'text-green-500' : avgAchievement >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {avgAchievement >= 80 ? 'On Track' : avgAchievement >= 50 ? 'Needs Focus' : 'Below Target'}
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-purple-500 mb-1">
              <Receipt className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Total Expenses</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalExpenses, sym)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Team expenses</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-orange-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">YoY Revenue</span>
            </div>
            {lastYearTeamQuery.isLoading ? (
              <div className="h-8 flex items-center"><span className="text-muted-foreground text-sm">Loading…</span></div>
            ) : yoyDelta !== null ? (
              <>
                <p className={`text-2xl font-bold ${yoyDelta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {yoyDelta >= 0 ? '+' : ''}{yoyDelta}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">vs {lastYearPeriod}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">–</p>
                <p className="text-xs text-muted-foreground mt-0.5">No prior year data</p>
              </>
            )}
          </Card>
        </motion.div>

        {/* Row 1: Revenue vs Target + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-3">
            <Card className="p-4">
              <CardTitle className="text-base mb-4">Revenue vs Target ({sym}K)</CardTitle>
              {teamLoading ? (
                <Skeleton className="h-48" />
              ) : revenueChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueChartData} margin={{ bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }}
                      formatter={(value: number, name: string) => [`${sym}${value}K`, name === 'revenue' ? 'Revenue' : 'Target']}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="Revenue" radius={[4,4,0,0]} fill="hsl(43, 74%, 49%)" />
                    <Bar dataKey="target" name="Target" radius={[4,4,0,0]} fill="hsl(var(--muted))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="lg:col-span-2">
            <Card className="p-4 h-full">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" /> Leaderboard
                </CardTitle>
                <Select value={leaderboardSort} onValueChange={v => setLeaderboardSort(v as typeof leaderboardSort)}>
                  <SelectTrigger className="w-28 h-7 text-xs" data-testid="select-leaderboard-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="achievement">Achievement</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="deals">Deals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {teamLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : sortedLeaderboard.length === 0 ? (
                <div className="py-6 text-center">
                  <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No performance data yet for this period</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedLeaderboard.slice(0, 6).map((m, i) => (
                    <div
                      key={m.memberId}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedMemberId === m.memberId ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-muted/50'}`}
                      onClick={() => setSelectedMemberId(m.memberId === selectedMemberId ? null : m.memberId)}
                      data-testid={`row-team-${m.memberId}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4 text-center font-bold">#{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium leading-tight">{m.memberName || m.memberEmail}</p>
                          <p className="text-xs text-muted-foreground">
                            {leaderboardSort === "deals" ? `${m.totalDeals} deals` : formatCurrency(m.totalRevenue, sym)}
                          </p>
                        </div>
                      </div>
                      <AchievementBadge percent={m.achievementPercent} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Row 2: Monthly Trend + Vertical Split + Expense Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
            <Card className="p-4">
              <CardTitle className="text-base mb-4">6-Month Revenue Trend ({sym}K)</CardTitle>
              {trendsQuery.isLoading ? (
                <Skeleton className="h-44" />
              ) : trendData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">No trend data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trendData} margin={{ bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }}
                      formatter={(value: number, name: string) => [`${sym}${value}K`, name === 'revenue' ? 'Revenue' : 'Expenses']}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(43, 74%, 49%)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(0, 70%, 50%)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-4">
            {/* Vertical revenue split */}
            <Card className="p-4">
              <CardTitle className="text-sm mb-3">Revenue by Vertical</CardTitle>
              {eodQuery.isLoading ? <Skeleton className="h-32" /> : verticalPieData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={verticalPieData} cx="40%" cy="50%" outerRadius={50} dataKey="value" paddingAngle={2}>
                      {verticalPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }}
                      formatter={(value: number) => [formatCurrency(value, sym), 'Revenue']}
                    />
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 10, maxWidth: '45%' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Expense breakdown */}
            <Card className="p-4">
              <CardTitle className="text-sm mb-3">Employer Costs</CardTitle>
              {teamLoading ? <Skeleton className="h-32" /> : expensePieData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No salary/incentive data</p>
              ) : (
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={expensePieData} cx="40%" cy="50%" outerRadius={50} dataKey="value" paddingAngle={2}>
                      {expensePieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }}
                      formatter={(value: number) => [formatCurrency(value, sym), 'Expense']}
                    />
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 10, maxWidth: '45%' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Member Detail drill-down */}
        {selectedMemberId && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-base">
                  Member Detail — {memberDrillDownQuery.data?.memberName ?? teamPerformance.find(m => m.memberId === selectedMemberId)?.memberName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {memberDrillDownQuery.data && memberDrillDownQuery.data.entries.length > 0 && (
                    <Button variant="outline" size="sm" className="gap-1 text-xs" data-testid="button-export-drilldown"
                      onClick={() => {
                        const dd = memberDrillDownQuery.data!;
                        const headers = ["Date", "Vertical", "Revenue", unitLabel, "Deals", "Expenses", "Status"];
                        const rows = dd.entries.map(e => [
                          e.entryDate,
                          verticals.find(v => v.id === e.verticalId)?.name ?? "",
                          e.revenueAmount, e.unitsSold, e.dealsClosed,
                          (e.expenseItems ?? []).reduce((s: number, x: { amount: number }) => s + x.amount, 0),
                          e.status,
                        ]);
                        const csv = [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = `${dd.memberName}_${drillDownPeriod}.csv`; a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="w-3 h-3" />Export
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMemberId(null)} data-testid="button-close-member">Close</Button>
                </div>
              </div>

              {/* Drill-down filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Month</label>
                  <input
                    type="month"
                    value={drillDownPeriod}
                    onChange={e => setDrillDownPeriod(e.target.value)}
                    className="text-sm border border-border rounded px-2 py-1 bg-muted/30 focus:outline-none"
                    data-testid="input-drilldown-period"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Vertical</label>
                  <Select value={drillDownVerticalId || "all"} onValueChange={v => setDrillDownVerticalId(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-8 w-36 text-xs" data-testid="select-drilldown-vertical">
                      <SelectValue placeholder="All verticals" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All verticals</SelectItem>
                      {verticals.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {memberDrillDownQuery.isLoading ? (
                <Skeleton className="h-40" />
              ) : memberDrillDownQuery.data ? (() => {
                const dd = memberDrillDownQuery.data;
                const teamMember = teamPerformance.find(x => x.memberId === selectedMemberId);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="font-bold text-lg">{formatCurrency(dd.totalRevenue, sym)}</p>
                        {dd.targetRevenue > 0 && <p className="text-xs text-muted-foreground">of {formatCurrency(dd.targetRevenue, sym)}</p>}
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Deals</p>
                        <p className="font-bold text-lg">{teamMember?.totalDeals ?? "—"}</p>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Achievement</p>
                        <p className={`font-bold text-lg ${dd.achievementPercent >= 80 ? 'text-green-500' : dd.achievementPercent >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                          {dd.achievementPercent}%
                        </p>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Incentive</p>
                        <p className="font-bold text-lg text-purple-500">{formatCurrency(teamMember?.projectedIncentive ?? 0, sym)}</p>
                      </div>
                    </div>

                    {/* Filtered member entries */}
                    {dd.entries.length > 0 ? (
                      <div>
                        <p className="text-sm font-medium mb-2 text-muted-foreground">Entries ({dd.entries.length})</p>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {dd.entries.map(entry => {
                            const vertical = verticals.find(v => v.id === entry.verticalId);
                            return (
                              <div key={entry.id} className="flex items-center justify-between text-sm px-3 py-2 bg-muted/20 rounded-md" data-testid={`row-member-entry-${entry.id}`}>
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground w-20">{entry.entryDate}</span>
                                  {vertical && <Badge variant="outline" className="text-xs">{vertical.name}</Badge>}
                                </div>
                                <div className="flex items-center gap-3">
                                  {entry.revenueAmount > 0 && <span className="text-amber-500 font-medium">{formatCurrency(entry.revenueAmount, sym)}</span>}
                                  {entry.dealsClosed > 0 && <span className="text-green-500">{entry.dealsClosed} deals</span>}
                                  <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => { setReviewEntry(entry); setManagerNote(entry.managerNote ?? ""); }} data-testid={`button-review-drilldown-${entry.id}`}>Review</Button>
                                  <Badge variant="secondary" className={`text-xs ${entry.status === 'reviewed' ? 'text-green-500' : ''}`}>{entry.status}</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No entries for this period/vertical.</p>
                    )}
                  </div>
                );
              })() : null}
            </Card>
          </motion.div>
        )}

        {/* Recent EOD Entries for Review */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">EOD Entries for Review</h2>
            <Select value={filterVertical || "all"} onValueChange={v => setFilterVertical(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40" data-testid="select-filter-vertical">
                <SelectValue placeholder="All verticals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All verticals</SelectItem>
                {verticals.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {eodQuery.isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : recentEntries.length === 0 ? (
            <Card className="p-10 text-center">
              <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium mb-1">No EOD entries yet</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Team members haven't submitted their daily reports for this period. Share the invite link so they can get started.
              </p>
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {recentEntries.map(entry => {
                  const member = teamPerformance.find(m => m.memberId === entry.memberId);
                  const vertical = verticals.find(v => v.id === entry.verticalId);
                  return (
                    <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors" data-testid={`row-eod-${entry.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[40px]">
                          <p className="text-xs text-muted-foreground">{new Date(entry.entryDate + 'T00:00:00').toLocaleDateString('default', { month: 'short' })}</p>
                          <p className="font-bold text-base leading-tight">{new Date(entry.entryDate + 'T00:00:00').getDate()}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member?.memberName ?? "Member"}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {vertical && <span>{vertical.name}</span>}
                            {entry.revenueAmount > 0 && <span className="text-amber-500">{formatCurrency(entry.revenueAmount, sym)}</span>}
                            {entry.dealsClosed > 0 && <span>{entry.dealsClosed} deals</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${entry.status === 'reviewed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}`}
                        >
                          {entry.status === 'reviewed' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                          {entry.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setReviewEntry(entry); setManagerNote(entry.managerNote ?? ""); }}
                          data-testid={`button-review-${entry.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" /> Review
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </motion.div>
      </main>

      {/* Review Dialog */}
      <Dialog open={!!reviewEntry} onOpenChange={open => { if (!open) { setReviewEntry(null); setManagerNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review EOD Entry</DialogTitle>
          </DialogHeader>
          {reviewEntry && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="font-semibold text-sm">{formatCurrency(reviewEntry.revenueAmount, sym)}</p>
                </div>
                <div className="p-2 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground">Deals</p>
                  <p className="font-semibold text-sm">{reviewEntry.dealsClosed}</p>
                </div>
                <div className="p-2 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground">{unitLabel}</p>
                  <p className="font-semibold text-sm">{reviewEntry.unitsSold} {unitMetric}</p>
                </div>
              </div>

              {reviewEntry.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Employee Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-muted/30 rounded-md">{reviewEntry.notes}</p>
                </div>
              )}

              {(reviewEntry.expenseItems ?? []).length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Expenses</Label>
                  <div className="mt-1 space-y-1">
                    {reviewEntry.expenseItems.map((e, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{e.category}{e.description ? ` - ${e.description}` : ''}</span>
                        <span className="font-medium">{formatCurrency(e.amount, sym)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm mb-1.5 block">Manager Note (optional)</Label>
                <Textarea
                  value={managerNote}
                  onChange={e => setManagerNote(e.target.value)}
                  placeholder="Leave feedback or acknowledgement..."
                  rows={3}
                  data-testid="textarea-manager-note"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setReviewEntry(null); setManagerNote(""); }}>Cancel</Button>
            <Button
              onClick={() => addManagerNoteMutation.mutate({ id: reviewEntry!.id, note: managerNote, status: 'reviewed' })}
              disabled={addManagerNoteMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              data-testid="button-mark-reviewed"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
