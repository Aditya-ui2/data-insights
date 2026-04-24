import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BusinessSidebar from "@/components/business-sidebar";
import { getUpcomingFestivals, getCurrentFY } from "@/lib/festivalCalendar";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  Target,
  DollarSign,
  Package,
  Handshake,
  Receipt,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  currencySymbol: string;
  memberRole: string;
}

interface BusinessVertical {
  id: string;
  name: string;
  metricLabel: string;
  metricUnit: string;
  expenseCategories: string[];
}

interface EodEntry {
  id: string;
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

interface EodExpenseItem {
  category: string;
  amount: number;
  description?: string;
}

interface EodSubmitPayload {
  entryDate: string;
  verticalId?: string;
  revenueAmount: number;
  unitsSold: number;
  dealsClosed: number;
  expenseItems: EodExpenseItem[];
  notes?: string;
}

interface PerformanceSummary {
  totalRevenue: number;
  totalUnits: number;
  totalDeals: number;
  totalExpenses: number;
  targetRevenue: number;
  targetUnits: number;
  targetDeals: number;
  achievementPercent: number;
  projectedIncentive: number;
  entryCount: number;
  verticalBreakdown: { verticalId: string; verticalName: string; revenue: number; units: number; deals: number }[];
}

function getPeriodLabel(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

function formatCurrency(amount: number, symbol: string = "₹"): string {
  if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}

function AchievementBar({ percent }: { percent: number }) {
  const clampedPercent = Math.min(percent, 100);
  const color = percent >= 80 ? "bg-green-500" : percent >= 50 ? "bg-amber-500" : "bg-red-500";
  const textColor = percent >= 80 ? "text-green-500" : percent >= 50 ? "text-amber-500" : "text-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Achievement</span>
        <span className={`font-semibold ${textColor}`}>{percent}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${clampedPercent}%` }} />
      </div>
    </div>
  );
}

export default function EmployeeEod() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [period, setPeriod] = useState(getPeriodLabel());
  const [showEodDialog, setShowEodDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EodEntry | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [lastSubmittedEntry, setLastSubmittedEntry] = useState<EodSubmitPayload | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formVerticalId, setFormVerticalId] = useState("");
  const [formRevenue, setFormRevenue] = useState("");
  const [formUnits, setFormUnits] = useState("");
  const [formDeals, setFormDeals] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formExpenses, setFormExpenses] = useState<{ category: string; amount: string; description: string }[]>([]);

  const { data: profile, isLoading: profileLoading } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  const { data: verticals = [] } = useQuery<BusinessVertical[]>({
    queryKey: ["/api/business/verticals"],
    enabled: !!profile,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery<EodEntry[]>({
    queryKey: ["/api/business/eod"],
  });

  const { data: performance, isLoading: perfLoading } = useQuery<PerformanceSummary>({
    queryKey: ["/api/business/performance/my", period],
    queryFn: async () => {
      const res = await fetch(`/api/business/performance/my?period=${period}`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch performance");
      return res.json();
    },
    enabled: !!profile,
  });

  const submitEodMutation = useMutation({
    mutationFn: async (data: EodSubmitPayload) => {
      const res = await apiRequest("POST", "/api/business/eod", data);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/eod"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business/performance/my", period] });
      setShowEodDialog(false);
      setLastSubmittedEntry(variables);
      setShowSubmitConfirmation(true);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
    },
  });

  const updateEodMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EodSubmitPayload }) => {
      const res = await apiRequest("PATCH", `/api/business/eod/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/eod"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business/performance/my", period] });
      setShowEodDialog(false);
      setEditingEntry(null);
      resetForm();
      toast({ title: "EOD entry updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const deleteEodMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/business/eod/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/eod"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business/performance/my", period] });
      toast({ title: "Entry deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  function resetForm() {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormVerticalId("");
    setFormRevenue("");
    setFormUnits("");
    setFormDeals("");
    setFormNotes("");
    setFormExpenses([]);
  }

  function openNewEntry() {
    const today = new Date().toISOString().slice(0, 10);
    const todayEntry = entries.find(e => e.entryDate === today);
    if (todayEntry) {
      // Prefill from today's existing entry
      openEditEntry(todayEntry);
    } else {
      setEditingEntry(null);
      resetForm();
      setShowEodDialog(true);
    }
  }

  function openEditEntry(entry: EodEntry) {
    setEditingEntry(entry);
    setFormDate(entry.entryDate);
    setFormVerticalId(entry.verticalId ?? "");
    setFormRevenue(String(entry.revenueAmount ?? 0));
    setFormUnits(String(entry.unitsSold ?? 0));
    setFormDeals(String(entry.dealsClosed ?? 0));
    setFormNotes(entry.notes ?? "");
    setFormExpenses((entry.expenseItems ?? []).map(e => ({ category: e.category, amount: String(e.amount), description: e.description ?? "" })));
    setShowEodDialog(true);
  }

  function handleSubmitForm() {
    const data: EodSubmitPayload = {
      entryDate: formDate,
      verticalId: formVerticalId || undefined,
      revenueAmount: parseInt(formRevenue) || 0,
      unitsSold: parseInt(formUnits) || 0,
      dealsClosed: parseInt(formDeals) || 0,
      expenseItems: formExpenses.filter(e => e.category).map(e => ({ category: e.category, amount: parseInt(e.amount) || 0, description: e.description || undefined })),
      notes: formNotes || undefined,
    };

    if (editingEntry) {
      updateEodMutation.mutate({ id: editingEntry.id, data });
    } else {
      submitEodMutation.mutate(data);
    }
  }

  function addExpense() {
    setFormExpenses([...formExpenses, { category: "", amount: "", description: "" }]);
  }

  function updateExpense(idx: number, field: string, value: string) {
    setFormExpenses(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  function removeExpense(idx: number) {
    setFormExpenses(prev => prev.filter((_, i) => i !== idx));
  }

  const sym = profile?.currencySymbol ?? "₹";

  // Get current period's entries
  const [periodYear, periodMonth] = period.split("-");
  const periodEntries = entries.filter(e => e.entryDate.startsWith(period));

  function csvEscape(value: unknown): string {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function exportMyEodCSV() {
    if (!periodEntries.length) return;
    const headers = ["Date", "Vertical", "Revenue", "Units", "Deals", "Total Expenses", "Notes", "Status"];
    const rows = periodEntries.map(e => [
      e.entryDate,
      verticals.find(v => v.id === e.verticalId)?.name ?? "",
      e.revenueAmount, e.unitsSold, e.dealsClosed,
      (e.expenseItems ?? []).reduce((s: number, x: { amount: number }) => s + x.amount, 0),
      e.notes ?? "",
      e.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-eod-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported!" });
  }

  const selectedVertical = verticals.find(v => v.id === formVerticalId);
  const defaultExpenseCategories = selectedVertical?.expenseCategories ?? ["Travel", "Food", "Other"];

  // Derive industry-appropriate label for the "deals" counter from the vertical's metricLabel
  const getDealsLabel = (metricLabel?: string): string => {
    const m = (metricLabel ?? "").toLowerCase();
    if (m.includes("visit") || m.includes("footfall") || m.includes("walk")) return "Visits";
    if (m.includes("patient") || m.includes("consult") || m.includes("appointment")) return "Consultations";
    if (m.includes("student") || m.includes("enroll") || m.includes("admission")) return "Enrollments";
    if (m.includes("booking") || m.includes("reservation") || m.includes("room") || m.includes("table")) return "Bookings";
    if (m.includes("project") || m.includes("contract") || m.includes("order")) return "Orders Closed";
    if (m.includes("session") || m.includes("class") || m.includes("training")) return "Sessions";
    if (m.includes("lead") || m.includes("enquir") || m.includes("inquir")) return "Enquiries";
    if (m.includes("ticket") || m.includes("case") || m.includes("issue")) return "Cases Resolved";
    return "Deals Closed";
  };
  const dealsLabel = getDealsLabel(selectedVertical?.metricLabel);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/business")} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-business">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg leading-tight">My EOD Reports</h1>
              <p className="text-xs text-muted-foreground">{profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportMyEodCSV}
              disabled={!periodEntries.length}
              data-testid="button-export-eod-csv"
            >
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button
              onClick={openNewEntry}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              data-testid="button-new-eod"
            >
              <Plus className="w-4 h-4 mr-1" /> Log Today
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* What to do here — UX explainer strip */}
        <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">How Log My Day works</p>
            <div className="flex flex-col sm:flex-row gap-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">1.</span>
                <span><span className="font-medium text-foreground">Log your day</span> — revenue, deals, units, and expenses you incurred.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">2.</span>
                <span><span className="font-medium text-foreground">Your entry goes to Team View</span> — your manager sees it in real time on the operations dashboard.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">3.</span>
                <span><span className="font-medium text-foreground">AI learns</span> — the Business Advisor uses your EODs to generate revenue forecasts and performance insights.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Post-submit confirmation banner */}
        {showSubmitConfirmation && lastSubmittedEntry && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-green-500/30 bg-green-500/8 rounded-xl p-5 flex items-start gap-4"
            data-testid="panel-submit-confirmation"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-500 mb-0.5">EOD submitted successfully!</p>
              <p className="text-sm text-muted-foreground mb-2">
                Your entry for <span className="font-medium text-foreground">{lastSubmittedEntry.entryDate}</span> has been logged —{" "}
                {formatCurrency(lastSubmittedEntry.revenueAmount, sym)} revenue, {lastSubmittedEntry.dealsClosed} {getDealsLabel(verticals.find(v => v.id === lastSubmittedEntry.verticalId)?.metricLabel).toLowerCase()}, {lastSubmittedEntry.unitsSold} {(verticals.find(v => v.id === lastSubmittedEntry.verticalId)?.metricUnit ?? "units").toLowerCase()}.
              </p>
              <p className="text-xs text-muted-foreground border-l-2 border-green-500/40 pl-3">
                Your manager can now see this in the Team View dashboard. It will also be included in performance tracking and AI-powered insights.
              </p>
            </div>
            <button
              onClick={() => setShowSubmitConfirmation(false)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 text-lg leading-none"
              data-testid="button-dismiss-confirmation"
            >×</button>
          </motion.div>
        )}

        {/* Festival Banner */}
        {(() => {
          const upcoming = getUpcomingFestivals(30);
          const fy = getCurrentFY();
          if (upcoming.length === 0) return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>📅</span> {fy.label} · Month {fy.monthInFY} of 12
            </div>
          );
          const { festival, daysAway } = upcoming[0];
          const label = daysAway === 0 ? "Today!" : daysAway === 1 ? "Tomorrow" : `${daysAway} days away`;
          return (
            <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{festival.emoji}</span>
                <div>
                  <p className="text-sm font-medium">{festival.name} — <span className="text-amber-500">{label}</span></p>
                  {festival.tip && <p className="text-xs text-muted-foreground">{festival.tip}</p>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{fy.label} · Month {fy.monthInFY}/12</span>
            </div>
          );
        })()}

        {/* Today's status strip */}
        {(() => {
          const today = new Date().toISOString().slice(0, 10);
          const todayEntry = entries.find(e => e.entryDate === today);
          if (!todayEntry) {
            return (
              <div className="flex items-center justify-between p-4 border border-dashed border-border rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Today's report not submitted yet</p>
                    <p className="text-xs text-muted-foreground">It takes less than 2 minutes to log your day.</p>
                  </div>
                </div>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={openNewEntry} data-testid="button-log-today-strip">
                  <Plus className="w-3 h-3 mr-1" /> Log Now
                </Button>
              </div>
            );
          }
          return (
            <div className="flex items-center justify-between p-4 border border-green-500/30 bg-green-500/5 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-500">Today's report submitted</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(todayEntry.revenueAmount, sym)} revenue · {todayEntry.dealsClosed} {getDealsLabel(verticals.find(v => v.id === todayEntry.verticalId)?.metricLabel).toLowerCase()} · {todayEntry.unitsSold} {verticals.find(v => v.id === todayEntry.verticalId)?.metricUnit ?? "units"}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={`text-xs ${todayEntry.status === 'reviewed' ? 'text-green-500 border-green-500/30' : 'text-amber-500 border-amber-500/30'}`}>
                {todayEntry.status === 'reviewed' ? '✓ Reviewed' : '⏳ Pending review'}
              </Badge>
            </div>
          );
        })()}

        {/* Period selector */}
        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground">Period:</Label>
          <Input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="w-40"
            data-testid="input-period"
          />
        </div>

        {/* Performance summary cards */}
        {perfLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : performance ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1 text-amber-500">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Revenue</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(performance.totalRevenue, sym)}</p>
                {performance.targetRevenue > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">Target: {formatCurrency(performance.targetRevenue, sym)}</p>
                )}
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1 text-blue-500">
                  <Package className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Units</span>
                </div>
                <p className="text-xl font-bold">{performance.totalUnits.toLocaleString()}</p>
                {performance.targetUnits > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">Target: {performance.targetUnits.toLocaleString()}</p>
                )}
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1 text-green-500">
                  <Handshake className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Deals</span>
                </div>
                <p className="text-xl font-bold">{performance.totalDeals}</p>
                {performance.targetDeals > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">Target: {performance.targetDeals}</p>
                )}
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1 text-purple-500">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Incentive</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(performance.projectedIncentive, sym)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Projected</p>
              </Card>
            </div>
            {performance.targetRevenue > 0 && (
              <Card className="p-4">
                <AchievementBar percent={performance.achievementPercent} />
              </Card>
            )}
            {/* Per-vertical progress breakdown */}
            {performance.verticalBreakdown && performance.verticalBreakdown.length > 0 && (
              <Card className="p-4">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Revenue by Vertical</p>
                <div className="space-y-3">
                  {performance.verticalBreakdown.map(v => {
                    const maxRevenue = Math.max(...performance.verticalBreakdown.map(vb => vb.revenue), 1);
                    const percent = Math.round((v.revenue / maxRevenue) * 100);
                    return (
                      <div key={v.verticalId} data-testid={`vertical-progress-${v.verticalId}`}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium">{v.verticalName}</span>
                          <span className="text-muted-foreground">{formatCurrency(v.revenue, sym)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {v.units > 0 && <span>{v.units} units</span>}
                          {v.deals > 0 && <span>{v.deals} deals</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </motion.div>
        ) : null}

        {/* EOD Entries List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">
              {periodYear && periodMonth ? `${new Date(period + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })} Entries` : "Entries"}
            </h2>
            <Badge variant="secondary">{periodEntries.length} entries</Badge>
          </div>

          {entriesLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : periodEntries.length === 0 ? (
            <Card className="p-10 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium mb-1">No entries for this period</p>
              <p className="text-sm text-muted-foreground mb-3">
                Start logging your daily performance — revenue, deals closed, units sold, and expenses — so your manager can track your progress.
              </p>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={openNewEntry} data-testid="button-log-first">
                <Plus className="w-3 h-3 mr-1" /> Log Your First Entry
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {periodEntries.map(entry => {
                const vertical = verticals.find(v => v.id === entry.verticalId);
                const isExpanded = expandedEntryId === entry.id;
                const totalExpenses = (entry.expenseItems ?? []).reduce((sum, e) => sum + e.amount, 0);
                return (
                  <Card key={entry.id} className="overflow-hidden" data-testid={`card-eod-${entry.id}`}>
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">{new Date(entry.entryDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'short' })}</p>
                            <p className="font-bold text-lg leading-tight">{new Date(entry.entryDate + 'T00:00:00').getDate()}</p>
                          </div>
                          <div>
                            {vertical && <Badge variant="outline" className="text-xs mb-1">{vertical.name}</Badge>}
                            <div className="flex items-center gap-3 text-sm">
                              {entry.revenueAmount > 0 && <span className="text-amber-500 font-medium">{formatCurrency(entry.revenueAmount, sym)}</span>}
                              {entry.dealsClosed > 0 && <span className="text-green-500">{entry.dealsClosed} {getDealsLabel(vertical?.metricLabel).toLowerCase()}</span>}
                              {entry.unitsSold > 0 && <span className="text-blue-500">{entry.unitsSold} {vertical?.metricUnit ?? "units"}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={entry.status === 'reviewed' ? 'default' : 'secondary'}
                            className={`text-xs ${entry.status === 'reviewed' ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}`}
                          >
                            {entry.status === 'reviewed' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                            {entry.status}
                          </Badge>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-border"
                        >
                          <div className="p-4 space-y-3">
                            {entry.notes && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                                <p className="text-sm">{entry.notes}</p>
                              </div>
                            )}
                            {(entry.expenseItems ?? []).length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Expenses ({formatCurrency(totalExpenses, sym)} total)</p>
                                <div className="space-y-1">
                                  {entry.expenseItems.map((e, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                      <span>{e.category}{e.description ? ` - ${e.description}` : ""}</span>
                                      <span className="font-medium">{formatCurrency(e.amount, sym)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {entry.managerNote && (
                              <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-3">
                                <p className="text-xs font-medium text-amber-500 mb-1">Manager Note</p>
                                <p className="text-sm">{entry.managerNote}</p>
                              </div>
                            )}
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" variant="outline" onClick={() => openEditEntry(entry)} data-testid={`button-edit-eod-${entry.id}`}>
                                <Edit className="w-3 h-3 mr-1" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteEodMutation.mutate(entry.id)}
                                disabled={deleteEodMutation.isPending}
                                data-testid={`button-delete-eod-${entry.id}`}
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Expense Breakdown by Category */}
        {periodEntries.some(e => (e.expenseItems ?? []).length > 0) && (() => {
          const allExpenses: { category: string; amount: number }[] = periodEntries.flatMap(e => e.expenseItems ?? []);
          const byCategory: Record<string, number> = {};
          for (const ex of allExpenses) {
            byCategory[ex.category] = (byCategory[ex.category] ?? 0) + ex.amount;
          }
          const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
          const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
          return (
            <div className="mt-6">
              <h2 className="font-semibold text-lg mb-3">Expense Breakdown</h2>
              <Card className="p-4" data-testid="card-expense-breakdown">
                <div className="space-y-2">
                  {sorted.map(([cat, amt]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-sm w-28 truncate">{cat}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(amt / total) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium w-24 text-right">{formatCurrency(amt, sym)}</span>
                      <span className="text-xs text-muted-foreground w-10 text-right">{Math.round((amt / total) * 100)}%</span>
                    </div>
                  ))}
                  <div className="border-t border-border mt-2 pt-2 flex justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(total, sym)}</span>
                  </div>
                </div>
              </Card>
            </div>
          );
        })()}

        {/* 30-Day History Table */}
        {entries.length > 0 && (() => {
          // Determine column labels from entries' actual verticals (single vertical → use its labels; mixed → generic)
          const entryVerticalIds = Array.from(new Set(entries.map(e => e.verticalId).filter((id): id is string => !!id)));
          const dominantVertical = entryVerticalIds.length === 1 ? verticals.find(v => v.id === entryVerticalIds[0]) : undefined;
          const histUnitsLabel = dominantVertical?.metricLabel ?? (entryVerticalIds.length > 1 ? "Units / Activity" : (selectedVertical?.metricLabel ?? "Units"));
          const histDealsLabel = getDealsLabel(dominantVertical?.metricLabel ?? (entryVerticalIds.length > 1 ? undefined : selectedVertical?.metricLabel));
          return (
          <div className="mt-6">
            <h2 className="font-semibold text-lg mb-3">30-Day History</h2>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-history-30d">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Vertical</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                      <th className="px-4 py-2 text-right">{histUnitsLabel}</th>
                      <th className="px-4 py-2 text-right">{histDealsLabel}</th>
                      <th className="px-4 py-2 text-right">Expenses</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, 30).map(entry => {
                      const vertical = verticals.find(v => v.id === entry.verticalId);
                      const entryExpenses = (entry.expenseItems ?? []).reduce((sum, e) => sum + e.amount, 0);
                      return (
                        <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-history-${entry.id}`}>
                          <td className="px-4 py-2">{new Date(entry.entryDate + 'T00:00:00').toLocaleDateString('default', { month: 'short', day: 'numeric' })}</td>
                          <td className="px-4 py-2">
                            {vertical ? <Badge variant="outline" className="text-xs">{vertical.name}</Badge> : <span className="text-muted-foreground">–</span>}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {entry.revenueAmount > 0 ? <span className="text-amber-500 font-medium">{formatCurrency(entry.revenueAmount, sym)}</span> : <span className="text-muted-foreground">–</span>}
                          </td>
                          <td className="px-4 py-2 text-right">{entry.unitsSold > 0 ? entry.unitsSold : <span className="text-muted-foreground">–</span>}</td>
                          <td className="px-4 py-2 text-right">{entry.dealsClosed > 0 ? entry.dealsClosed : <span className="text-muted-foreground">–</span>}</td>
                          <td className="px-4 py-2 text-right">
                            {entryExpenses > 0 ? <span className="text-red-400">{formatCurrency(entryExpenses, sym)}</span> : <span className="text-muted-foreground">–</span>}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Badge variant="secondary" className={`text-xs ${entry.status === 'reviewed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}`}>
                              {entry.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          );
        })()}
      </main>

      {/* EOD Submit Dialog */}
      <Dialog open={showEodDialog} onOpenChange={setShowEodDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit EOD Entry" : "Log End-of-Day Report"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm mb-1.5 block">Date *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  data-testid="input-eod-date"
                />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Vertical</Label>
                <Select value={formVerticalId || "none"} onValueChange={v => setFormVerticalId(v === "none" ? "" : v)}>
                  <SelectTrigger data-testid="select-vertical">
                    <SelectValue placeholder="Select vertical" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vertical</SelectItem>
                    {verticals.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">Revenue ({sym})</Label>
                <Input
                  type="number"
                  min="0"
                  value={formRevenue}
                  onChange={e => setFormRevenue(e.target.value)}
                  placeholder="0"
                  data-testid="input-revenue"
                />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">
                  {selectedVertical?.metricLabel ?? "Units"} ({selectedVertical?.metricUnit ?? "qty"})
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formUnits}
                  onChange={e => setFormUnits(e.target.value)}
                  placeholder="0"
                  data-testid="input-units"
                />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">{dealsLabel}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formDeals}
                  onChange={e => setFormDeals(e.target.value)}
                  placeholder="0"
                  data-testid="input-deals"
                />
              </div>
            </div>

            {/* Live target progress bar */}
            {performance && performance.targetRevenue > 0 && (() => {
              const currentRevenue = performance.totalRevenue;
              const target = performance.targetRevenue;
              const inputRevenue = parseInt(formRevenue) || 0;
              const projectedTotal = currentRevenue + inputRevenue;
              const projectedPercent = Math.min(Math.round((projectedTotal / target) * 100), 100);
              const color = projectedPercent >= 80 ? "bg-green-500" : projectedPercent >= 50 ? "bg-amber-500" : "bg-red-500";
              const textColor = projectedPercent >= 80 ? "text-green-500" : projectedPercent >= 50 ? "text-amber-500" : "text-red-500";
              return (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5" data-testid="panel-target-progress">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Monthly Target Progress</span>
                    <span className={`font-semibold ${textColor}`}>{projectedPercent}% {inputRevenue > 0 ? "(after this entry)" : ""}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${projectedPercent}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(projectedTotal, sym)} of {formatCurrency(target, sym)} target
                    {inputRevenue > 0 && <span className="text-amber-500 ml-1">(+{formatCurrency(inputRevenue, sym)} this entry)</span>}
                  </p>
                </div>
              );
            })()}

            {/* Expenses */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Expenses</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addExpense} data-testid="button-add-expense">
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              {formExpenses.map((exp, idx) => (
                <div key={idx} className="grid grid-cols-7 gap-2 mb-2">
                  <div className="col-span-3">
                    <Select value={exp.category} onValueChange={v => updateExpense(idx, 'category', v)}>
                      <SelectTrigger data-testid={`select-expense-cat-${idx}`}>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {defaultExpenseCategories.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder={`Amount (${sym})`}
                      value={exp.amount}
                      onChange={e => updateExpense(idx, 'amount', e.target.value)}
                      data-testid={`input-expense-amount-${idx}`}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      placeholder="Note"
                      value={exp.description}
                      onChange={e => updateExpense(idx, 'description', e.target.value)}
                      data-testid={`input-expense-desc-${idx}`}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeExpense(idx)} data-testid={`button-remove-expense-${idx}`}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label className="text-sm mb-1.5 block">Notes / Summary</Label>
              <Textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Describe your day — meetings, visits, progress..."
                rows={3}
                data-testid="textarea-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEodDialog(false); setEditingEntry(null); }}>Cancel</Button>
            <Button
              onClick={handleSubmitForm}
              disabled={submitEodMutation.isPending || updateEodMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              data-testid="button-submit-eod"
            >
              {editingEntry ? "Save Changes" : "Submit EOD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

async function getToken(): Promise<string> {
  try {
    const { getIdToken } = await import("@/lib/firebase");
    return await getIdToken() ?? "";
  } catch {
    return "";
  }
}
