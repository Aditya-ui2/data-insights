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

function formatCurrency(amount: number | undefined | null, symbol: string = "₹"): string {
  const val = amount || 0;
  if (val >= 100000) return `${symbol}${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `${symbol}${(val / 1000).toFixed(1)}K`;
  return `${symbol}${val.toLocaleString()}`;
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
      <div className="min-h-screen bg-[#fbfaf7] p-6">
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
    <div className="min-h-screen bg-[#fbfaf7] flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[#fbfaf7]">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
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
              <div>
                <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider">My EOD Reports</h1>
                <p className="text-xs text-muted-foreground">{profile?.name || "Business Suite"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportMyEodCSV}
                disabled={!periodEntries.length}
                data-testid="button-export-eod-csv"
                className="border-gray-200 text-muted-foreground hover:bg-gray-50 rounded-none text-xs uppercase tracking-wider font-semibold shadow-none"
              >
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>
              <Button
                onClick={openNewEntry}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none shadow-none h-9"
                data-testid="button-new-eod"
              >
                <Plus className="w-4 h-4 mr-1" /> Log Today
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-8 w-full">
          {/* What to do here — UX explainer strip */}
          <div className="bg-gray-50 border border-gray-250 rounded-none p-5 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
            <div className="pl-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-2">How Log My Day works</p>
              <div className="flex flex-col sm:flex-row gap-4 text-xs text-muted-foreground font-sans">
                <div className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">1.</span>
                  <span><span className="font-semibold text-primary">Log your day</span> — revenue, deals, units, and expenses you incurred.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">2.</span>
                  <span><span className="font-semibold text-primary">Goes to Team View</span> — your manager sees it in real time on the dashboard.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">3.</span>
                  <span><span className="font-semibold text-primary">AI learns</span> — Business Advisor uses EODs to generate forecasts and strategy.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Post-submit confirmation banner */}
          {showSubmitConfirmation && lastSubmittedEntry && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-green-500/20 bg-green-500/5 rounded-none p-5 flex items-start gap-4 relative overflow-hidden"
              data-testid="panel-submit-confirmation"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-600" />
              <div className="w-10 h-10 border border-green-500/20 bg-green-500/10 flex items-center justify-center shrink-0 rounded-none">
                <CheckCircle2 className="w-5 h-5 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans font-bold text-base text-green-800 mb-1">EOD submitted successfully!</p>
                <p className="text-xs text-muted-foreground mb-2 font-sans">
                  Your entry for <span className="font-semibold text-primary">{lastSubmittedEntry.entryDate}</span> has been logged —{" "}
                  {formatCurrency(lastSubmittedEntry.revenueAmount, sym)} revenue, {lastSubmittedEntry.dealsClosed} {getDealsLabel(verticals.find(v => v.id === lastSubmittedEntry.verticalId)?.metricLabel).toLowerCase()}, {lastSubmittedEntry.unitsSold} {(verticals.find(v => v.id === lastSubmittedEntry.verticalId)?.metricUnit ?? "units").toLowerCase()}.
                </p>
                <p className="text-xs text-muted-foreground border-l-2 border-green-500/20 pl-3 font-sans">
                  Your manager can now see this in the Team View dashboard. It will also be included in performance tracking and AI-powered insights.
                </p>
              </div>
              <button
                onClick={() => setShowSubmitConfirmation(false)}
                className="text-muted-foreground hover:text-primary transition-colors shrink-0 text-lg leading-none"
                data-testid="button-dismiss-confirmation"
              >×</button>
            </motion.div>
          )}

          {/* Festival Banner */}
          {(() => {
            const upcoming = getUpcomingFestivals(30);
            const fy = getCurrentFY();
            if (upcoming.length === 0) return (
              <div className="flex items-center text-[10px] font-sans font-bold uppercase tracking-wider text-primary border border-gray-200 px-3 py-1.5 bg-white rounded-none w-max shadow-sm">
                <span className="font-extrabold text-primary">FY {fy.label}</span>
                <span className="text-gray-350 mx-2 font-light">|</span>
                <span className="text-accent font-extrabold">Month {fy.monthInFY} of 12</span>
              </div>
            );
            const { festival, daysAway } = upcoming[0];
            const label = daysAway === 0 ? "Today!" : daysAway === 1 ? "Tomorrow" : `${daysAway} days away`;
            return (
              <div className="border border-accent/25 bg-amber-500/5 rounded-none px-5 py-3.5 flex items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                <div className="flex items-center gap-3">
                  <span className="text-xl">{festival.emoji}</span>
                  <div>
                    <p className="font-sans font-semibold text-sm text-primary">
                      {festival.name} — <span className="text-accent font-sans font-bold uppercase text-[9px] tracking-wider">{label}</span>
                    </p>
                    {festival.tip && <p className="text-xs text-muted-foreground mt-0.5 font-sans">{festival.tip}</p>}
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-gray-200 px-2.5 py-1 bg-white rounded-none shrink-0 font-sans">
                  FY {fy.label} · Month {fy.monthInFY}/12
                </span>
              </div>
            );
          })()}

          {/* Today's status strip */}
          {(() => {
            const today = new Date().toISOString().slice(0, 10);
            const todayEntry = entries.find(e => e.entryDate === today);
            if (!todayEntry) {
              return (
                <div className="flex items-center justify-between p-5 border border-dashed border-gray-250 rounded-none bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-bold text-primary font-sans">Today's report not submitted yet</p>
                      <p className="text-xs text-muted-foreground font-sans mt-0.5">It takes less than 2 minutes to log your day.</p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-none shadow-none h-9" onClick={openNewEntry} data-testid="button-log-today-strip">
                    <Plus className="w-3 h-3 mr-1" /> Log Now
                  </Button>
                </div>
              );
            }
            return (
              <div className="flex items-center justify-between p-5 border border-green-500/20 bg-green-500/5 rounded-none">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-bold text-green-800 font-sans">Today's report submitted</p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      {formatCurrency(todayEntry.revenueAmount, sym)} revenue · {todayEntry.dealsClosed} {getDealsLabel(verticals.find(v => v.id === todayEntry.verticalId)?.metricLabel).toLowerCase()} · {todayEntry.unitsSold} {verticals.find(v => v.id === todayEntry.verticalId)?.metricUnit ?? "units"}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] uppercase font-semibold tracking-wider rounded-none ${todayEntry.status === 'reviewed' ? 'text-green-700 bg-green-500/5 border-green-500/20' : 'text-accent bg-accent/5 border-accent/25'}`}>
                  {todayEntry.status === 'reviewed' ? '✓ Reviewed' : '⏳ Pending review'}
                </Badge>
              </div>
            );
          })()}

          {/* Period selector */}
          <div className="flex items-center gap-3">
            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Period:</Label>
            <Input
              type="month"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="w-40 border-gray-200 text-primary rounded-none font-sans"
              data-testid="input-period"
            />
          </div>

          {/* Performance summary cards */}
          {perfLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-none" />)}
            </div>
          ) : performance ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-5 bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                  <div className="flex items-center gap-2 text-accent">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Revenue</span>
                  </div>
                  <p className="text-2xl font-sans font-bold text-primary mt-1">{formatCurrency(performance.totalRevenue, sym)}</p>
                  {performance.targetRevenue > 0 && (
                    <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Target: {formatCurrency(performance.targetRevenue, sym)}</p>
                  )}
                </Card>
                <Card className="p-5 bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                  <div className="flex items-center gap-2 text-accent">
                    <Package className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Units</span>
                  </div>
                  <p className="text-2xl font-sans font-bold text-primary mt-1">{performance.totalUnits.toLocaleString()}</p>
                  {performance.targetUnits > 0 && (
                    <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Target: {performance.targetUnits.toLocaleString()}</p>
                  )}
                </Card>
                <Card className="p-5 bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                  <div className="flex items-center gap-2 text-accent">
                    <Handshake className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Deals</span>
                  </div>
                  <p className="text-2xl font-sans font-bold text-primary mt-1">{performance.totalDeals}</p>
                  {performance.targetDeals > 0 && (
                    <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Target: {performance.targetDeals}</p>
                  )}
                </Card>
                <Card className="p-5 bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                  <div className="flex items-center gap-2 text-accent">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Incentive</span>
                  </div>
                  <p className="text-2xl font-sans font-bold text-primary mt-1">{formatCurrency(performance.projectedIncentive, sym)}</p>
                  <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Projected</p>
                </Card>
              </div>
              {performance.targetRevenue > 0 && (
                <Card className="p-5 bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40" />
                  <div className="space-y-1 bg-white">
                    <div className="flex justify-between text-xs font-sans">
                      <span className="text-muted-foreground font-semibold uppercase tracking-wider">Achievement</span>
                      <span className="font-semibold text-accent">{performance.achievementPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-none overflow-hidden">
                      <div className="h-full bg-accent rounded-none transition-all" style={{ width: `${Math.min(performance.achievementPercent, 100)}%` }} />
                    </div>
                  </div>
                </Card>
              )}
              {/* Per-vertical progress breakdown */}
              {performance.verticalBreakdown && performance.verticalBreakdown.length > 0 && (
                <Card className="p-5 bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 font-sans">Revenue by Vertical</p>
                  <div className="space-y-4">
                    {performance.verticalBreakdown.map(v => {
                      const maxRevenue = Math.max(...performance.verticalBreakdown.map(vb => vb.revenue), 1);
                      const percent = Math.round((v.revenue / maxRevenue) * 100);
                      return (
                        <div key={v.verticalId} data-testid={`vertical-progress-${v.verticalId}`} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-sans">
                            <span className="font-sans font-semibold text-base text-primary">{v.verticalName}</span>
                            <span className="text-muted-foreground font-semibold">{formatCurrency(v.revenue, sym)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-none overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-none transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex gap-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 pb-2">
              <h2 className="font-sans font-bold text-2xl text-primary">
                {periodYear && periodMonth ? `${new Date(period + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })} Entries` : "Entries"}
              </h2>
              <Badge variant="outline" className="border-gray-205 text-muted-foreground bg-gray-50 rounded-none uppercase tracking-wider text-[10px] font-semibold px-2 py-0.5">{periodEntries.length} entries</Badge>
            </div>

            {entriesLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-none" />)}
              </div>
            ) : periodEntries.length === 0 ? (
              <Card className="p-10 text-center border-gray-250 bg-white rounded-none shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                <FileText className="w-10 h-10 text-accent/40 mx-auto mb-3" />
                <p className="font-sans font-bold text-lg text-primary mb-1">No entries for this period</p>
                <p className="text-xs text-muted-foreground font-sans max-w-md mx-auto mb-4 leading-relaxed">
                  Start logging your daily performance — revenue, deals closed, units sold, and expenses — so your manager can track your progress.
                </p>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none" onClick={openNewEntry} data-testid="button-log-first">
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
                    <Card key={entry.id} className="overflow-hidden rounded-none border border-gray-250 shadow-sm bg-white hover:shadow-md transition-shadow relative group" data-testid={`card-eod-${entry.id}`}>
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/20 group-hover:bg-accent transition-colors" />
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-center w-12 border-r border-gray-100 pr-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{new Date(entry.entryDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'short' })}</p>
                              <p className="font-sans font-bold text-2xl text-primary leading-tight mt-0.5">{new Date(entry.entryDate + 'T00:00:00').getDate()}</p>
                            </div>
                            <div>
                              {vertical && <Badge variant="outline" className="border-gray-200 text-muted-foreground bg-gray-50 text-[9px] uppercase tracking-wider font-semibold rounded-none mb-1 px-1.5 py-0.5">{vertical.name}</Badge>}
                              <div className="flex items-center gap-3 text-sm font-sans">
                                {entry.revenueAmount > 0 && <span className="text-accent font-semibold">{formatCurrency(entry.revenueAmount, sym)}</span>}
                                {entry.dealsClosed > 0 && <span className="text-primary font-medium">{entry.dealsClosed} {getDealsLabel(vertical?.metricLabel).toLowerCase()}</span>}
                                {entry.unitsSold > 0 && <span className="text-muted-foreground">{entry.unitsSold} {vertical?.metricUnit ?? "units"}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase tracking-wider font-semibold rounded-none px-2 py-0.5 ${entry.status === 'reviewed' ? 'bg-green-500/5 border-green-500/20 text-green-700' : 'bg-amber-500/5 border-amber-500/20 text-amber-600'}`}
                            >
                              {entry.status === 'reviewed' ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
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
                            className="overflow-hidden border-t border-gray-150"
                          >
                            <div className="p-4 space-y-4 bg-gray-50">
                              {entry.notes && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                                  <p className="text-sm text-primary font-sans leading-relaxed">{entry.notes}</p>
                                </div>
                              )}
                              {(entry.expenseItems ?? []).length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Expenses ({formatCurrency(totalExpenses, sym)} total)</p>
                                  <div className="space-y-1 bg-white border border-gray-200 p-3.5 rounded-none max-w-md">
                                    {entry.expenseItems.map((e, i) => (
                                      <div key={i} className="flex justify-between text-xs text-primary font-sans">
                                        <span>{e.category}{e.description ? ` - ${e.description}` : ""}</span>
                                        <span className="font-semibold">{formatCurrency(e.amount, sym)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {entry.managerNote && (
                                <div className="bg-accent/5 border border-accent/25 rounded-none p-3.5 border-l-4 border-l-accent max-w-md">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1">Manager Note</p>
                                  <p className="text-sm font-sans text-primary leading-relaxed">{entry.managerNote}</p>
                                </div>
                              )}
                              <div className="flex gap-2 pt-1 border-t border-gray-150">
                                <Button size="sm" variant="outline" onClick={() => openEditEntry(entry)} className="border-gray-200 text-muted-foreground hover:bg-gray-50 rounded-none text-xs uppercase tracking-wider font-semibold" data-testid={`button-edit-eod-${entry.id}`}>
                                  <Edit className="w-3 h-3 mr-1" /> Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-destructive/25 text-destructive hover:text-destructive hover:bg-destructive/5 rounded-none text-xs uppercase tracking-wider font-semibold"
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
              <div className="space-y-3">
                <h2 className="font-sans font-bold text-2xl text-primary border-b border-gray-150 pb-2">Expense Breakdown</h2>
                <Card className="p-5 bg-white border border-gray-250 rounded-none shadow-sm" data-testid="card-expense-breakdown">
                  <div className="space-y-3">
                    {sorted.map(([cat, amt]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28 truncate">{cat}</span>
                        <div className="flex-1 bg-gray-100 rounded-none h-1.5 overflow-hidden">
                          <div className="bg-accent h-full rounded-none" style={{ width: `${(amt / total) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-primary w-24 text-right">{formatCurrency(amt, sym)}</span>
                        <span className="text-xs text-muted-foreground w-10 text-right">{Math.round((amt / total) * 100)}%</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-150 mt-4 pt-3 flex justify-between text-xs font-bold uppercase tracking-wider text-primary">
                      <span>Total</span>
                      <span className="text-accent">{formatCurrency(total, sym)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* 30-Day History Table */}
          {entries.length > 0 && (() => {
            // Determine column labels from entries' actual verticals
            const entryVerticalIds = Array.from(new Set(entries.map(e => e.verticalId).filter((id): id is string => !!id)));
            const dominantVertical = entryVerticalIds.length === 1 ? verticals.find(v => v.id === entryVerticalIds[0]) : undefined;
            const histUnitsLabel = dominantVertical?.metricLabel ?? (entryVerticalIds.length > 1 ? "Units / Activity" : (selectedVertical?.metricLabel ?? "Units"));
            const histDealsLabel = getDealsLabel(dominantVertical?.metricLabel ?? (entryVerticalIds.length > 1 ? undefined : selectedVertical?.metricLabel));
            return (
              <div className="space-y-3">
                <h2 className="font-sans font-bold text-2xl text-primary border-b border-gray-150 pb-2">30-Day History</h2>
                <Card className="rounded-none border border-gray-250 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-sans" data-testid="table-history-30d">
                      <thead>
                        <tr className="border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-gray-50/50">
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Vertical</th>
                          <th className="px-4 py-3 text-right">Revenue</th>
                          <th className="px-4 py-3 text-right">{histUnitsLabel}</th>
                          <th className="px-4 py-3 text-right">{histDealsLabel}</th>
                          <th className="px-4 py-3 text-right">Expenses</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {entries.slice(0, 30).map(entry => {
                          const vertical = verticals.find(v => v.id === entry.verticalId);
                          const entryExpenses = (entry.expenseItems ?? []).reduce((sum, e) => sum + e.amount, 0);
                          return (
                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors" data-testid={`row-history-${entry.id}`}>
                              <td className="px-4 py-3 text-xs text-primary">{new Date(entry.entryDate + 'T00:00:00').toLocaleDateString('default', { month: 'short', day: 'numeric' })}</td>
                              <td className="px-4 py-3">
                                {vertical ? <Badge variant="outline" className="border-gray-200 text-muted-foreground bg-gray-50 text-[9px] uppercase tracking-wider font-semibold rounded-none px-1.5 py-0.5">{vertical.name}</Badge> : <span className="text-muted-foreground">–</span>}
                              </td>
                              <td className="px-4 py-3 text-right text-xs">
                                {entry.revenueAmount > 0 ? <span className="text-accent font-semibold">{formatCurrency(entry.revenueAmount, sym)}</span> : <span className="text-muted-foreground">–</span>}
                              </td>
                              <td className="px-4 py-3 text-right text-xs text-primary">{entry.unitsSold > 0 ? entry.unitsSold : <span className="text-muted-foreground">–</span>}</td>
                              <td className="px-4 py-3 text-right text-xs text-primary">{entry.dealsClosed > 0 ? entry.dealsClosed : <span className="text-muted-foreground">–</span>}</td>
                              <td className="px-4 py-3 text-right text-xs">
                                {entryExpenses > 0 ? <span className="text-red-700 font-semibold">{formatCurrency(entryExpenses, sym)}</span> : <span className="text-muted-foreground">–</span>}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant="outline" className={`text-[9px] uppercase tracking-wider font-semibold rounded-none px-2 py-0.5 ${entry.status === 'reviewed' ? 'bg-green-500/5 border-green-500/20 text-green-700' : 'bg-amber-500/5 border-amber-500/20 text-amber-600'}`}>
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-gray-250 text-primary rounded-none shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent" />
            <DialogHeader>
              <DialogTitle className="font-sans font-semibold text-2xl text-primary">{editingEntry ? "Edit EOD Entry" : "Log End-of-Day Report"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Date *</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    data-testid="input-eod-date"
                    className="bg-white border-gray-200 text-primary rounded-none font-sans"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Vertical</Label>
                  <Select value={formVerticalId || "none"} onValueChange={v => setFormVerticalId(v === "none" ? "" : v)}>
                    <SelectTrigger data-testid="select-vertical" className="bg-white border-gray-200 text-primary rounded-none focus:outline-none font-sans">
                      <SelectValue placeholder="Select vertical" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-250 shadow-lg rounded-none">
                      <SelectItem value="none" className="text-primary hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">No vertical</SelectItem>
                      {verticals.map(v => (
                        <SelectItem key={v.id} value={v.id} className="text-primary hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Revenue ({sym})</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formRevenue}
                    onChange={e => setFormRevenue(e.target.value)}
                    placeholder="0"
                    data-testid="input-revenue"
                    className="bg-white border-gray-200 text-primary rounded-none font-sans"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
                    {selectedVertical?.metricLabel ?? "Units"} ({selectedVertical?.metricUnit ?? "qty"})
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formUnits}
                    onChange={e => setFormUnits(e.target.value)}
                    placeholder="0"
                    data-testid="input-units"
                    className="bg-white border-gray-200 text-primary rounded-none font-sans"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">{dealsLabel}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formDeals}
                    onChange={e => setFormDeals(e.target.value)}
                    placeholder="0"
                    data-testid="input-deals"
                    className="bg-white border-gray-200 text-primary rounded-none font-sans"
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
                  <div className="rounded-none border border-gray-200 bg-gray-50 p-4 space-y-1.5" data-testid="panel-target-progress">
                    <div className="flex justify-between text-xs font-sans">
                      <span className="text-muted-foreground font-semibold uppercase tracking-wider">Monthly Target Progress</span>
                      <span className={`font-semibold ${textColor}`}>{projectedPercent}% {inputRevenue > 0 ? "(after this entry)" : ""}</span>
                    </div>
                    <div className="h-1.5 bg-gray-150 rounded-none overflow-hidden">
                      <div className={`h-full ${color} rounded-none transition-all`} style={{ width: `${projectedPercent}%` }} />
                    </div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      {formatCurrency(projectedTotal, sym)} of {formatCurrency(target, sym)} target
                      {inputRevenue > 0 && <span className="text-accent ml-1">(+{formatCurrency(inputRevenue, sym)} this entry)</span>}
                    </p>
                  </div>
                );
              })()}

              {/* Expenses */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Expenses</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addExpense} className="border-gray-250 text-muted-foreground hover:bg-gray-50 rounded-none text-[10px] uppercase tracking-wider font-bold h-7 px-2" data-testid="button-add-expense">
                    <Plus className="w-3 h-3 mr-1 text-accent" /> Add Expense
                  </Button>
                </div>
                {formExpenses.map((exp, idx) => (
                  <div key={idx} className="grid grid-cols-7 gap-2 items-center">
                    <div className="col-span-3">
                      <Select value={exp.category} onValueChange={v => updateExpense(idx, 'category', v)}>
                        <SelectTrigger data-testid={`select-expense-cat-${idx}`} className="bg-white border-gray-200 text-primary rounded-none font-sans text-xs focus:outline-none">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-250 shadow-lg rounded-none">
                          {defaultExpenseCategories.map(c => (
                            <SelectItem key={c} value={c} className="text-primary hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans">{c}</SelectItem>
                          ))}
                          <SelectItem value="Other" className="text-primary hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder={`Amt (${sym})`}
                        value={exp.amount}
                        onChange={e => updateExpense(idx, 'amount', e.target.value)}
                        data-testid={`input-expense-amount-${idx}`}
                        className="bg-white border-gray-200 text-primary rounded-none font-sans text-xs"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        placeholder="Note"
                        value={exp.description}
                        onChange={e => updateExpense(idx, 'description', e.target.value)}
                        data-testid={`input-expense-desc-${idx}`}
                        className="bg-white border-gray-200 text-primary rounded-none font-sans text-xs"
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeExpense(idx)} data-testid={`button-remove-expense-${idx}`} className="hover:bg-destructive/5 text-destructive rounded-none">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Notes / Summary</Label>
                <Textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Describe your day — meetings, visits, progress..."
                  rows={3}
                  data-testid="textarea-notes"
                  className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground rounded-none font-sans"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 border-t border-gray-100 pt-3">
              <Button variant="outline" onClick={() => { setShowEodDialog(false); setEditingEntry(null); }} className="border-gray-200 text-muted-foreground hover:bg-gray-50 rounded-none h-10 shadow-none">Cancel</Button>
              <Button
                onClick={handleSubmitForm}
                disabled={submitEodMutation.isPending || updateEodMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none h-10 shadow-none"
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
