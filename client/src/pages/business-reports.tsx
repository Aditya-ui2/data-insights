import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileBarChart2,
  Download,
  Users,
  TrendingUp,
  DollarSign,
  Handshake,
  Package,
  FileText,
  CalendarRange,
  Printer,
  Calendar,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import BusinessSidebar from "@/components/business-sidebar";
import { getCurrentFY, getFYDateRange } from "@/lib/festivalCalendar";
import { getIdToken } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ReferenceLine,
} from "recharts";

interface BusinessProfile {
  id: string;
  name: string;
  currencySymbol: string;
  memberRole: string;
  ownerId: string;
  industryLabel: string;
}

interface BusinessVertical {
  id: string;
  name: string;
  metricLabel: string;
  metricUnit: string;
}

interface BusinessMemberWithUser {
  id: string;
  name?: string;
  email: string;
  memberRole: string;
  status: string;
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
  status: string;
}

function formatCurrency(amount: number, symbol = "₹"): string {
  if (amount >= 10000000) return `${symbol}${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}

async function getToken(): Promise<string> {
  try { return await getIdToken() ?? ""; } catch { return ""; }
}

const REPORT_TYPES = [
  { id: "daily", label: "Daily Summary", icon: FileText, desc: "One employee's EOD for a specific date" },
  { id: "weekly", label: "Weekly Recap", icon: Calendar, desc: "Team performance for any 7-day window" },
  { id: "monthly", label: "Monthly Report", icon: CalendarRange, desc: "Full team performance for any month" },
  { id: "ytd", label: "Year-to-Date", icon: TrendingUp, desc: "Business performance since April (Indian FY)" },
  { id: "employee", label: "Individual Report", icon: Users, desc: "Complete history for one team member" },
  { id: "festival", label: "Festival Season", icon: FileBarChart2, desc: "Performance during peak festival periods" },
] as const;

type ReportType = typeof REPORT_TYPES[number]["id"];

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

// Build Indian FY selector options (Apr–Mar) from 2022 to current FY
function getFYOptions(): { label: string; startYear: number }[] {
  const m = new Date().getMonth();
  const y = new Date().getFullYear();
  const currentFYStart = m >= 3 ? y : y - 1;
  const opts = [];
  for (let s = 2022; s <= currentFYStart; s++) opts.push({ label: `FY ${s}–${s + 1}`, startYear: s });
  return opts.reverse();
}

export default function BusinessReports() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // FY-aware default: current calendar month (April–March FY context)
  const fy = getCurrentFY();
  const fyRange = getFYDateRange(fy.startYear);

  // Parse query params for shared report token
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const sharedToken = location.startsWith("/business/reports/shared/")
    ? location.split("/business/reports/shared/")[1]?.split("?")[0]
    : null;

  const [activeReport, setActiveReport] = useState<ReportType>("monthly");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedMonthFY, setSelectedMonthFY] = useState(fy.startYear);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  // Festival season defaults: Oct 1 – Nov 15 of the FY's festive period
  const [festivalFrom, setFestivalFrom] = useState(`${fy.startYear}-10-01`);
  const [festivalTo, setFestivalTo] = useState(`${fy.startYear}-11-15`);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  // Load shared report metadata if viewing via share token (public endpoint — no auth required)
  const { data: sharedReportMeta } = useQuery<{ reportType: string; reportParams: Record<string, string>; businessId: string; businessName?: string; businessIndustry?: string } | null>({
    queryKey: ["/api/business/reports/shared", sharedToken],
    queryFn: async () => {
      if (!sharedToken) return null;
      const res = await fetch(`/api/business/reports/shared/${sharedToken}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!sharedToken,
  });

  // Apply shared report settings when metadata loads
  useEffect(() => {
    if (!sharedReportMeta) return;
    const rt = sharedReportMeta.reportType as ReportType;
    if (REPORT_TYPES.some(r => r.id === rt)) {
      setActiveReport(rt);
      if (sharedReportMeta.reportParams.period) setPeriod(sharedReportMeta.reportParams.period);
      if (sharedReportMeta.reportParams.selectedDate) setSelectedDate(sharedReportMeta.reportParams.selectedDate);
      if (sharedReportMeta.reportParams.weekStart) setWeekStart(sharedReportMeta.reportParams.weekStart);
      if (sharedReportMeta.reportParams.from) setFestivalFrom(sharedReportMeta.reportParams.from);
      if (sharedReportMeta.reportParams.to) setFestivalTo(sharedReportMeta.reportParams.to);
      if (sharedReportMeta.reportParams.memberId) setSelectedMemberId(sharedReportMeta.reportParams.memberId);
    }
  }, [sharedReportMeta]);

  const { data: profile, isLoading: profileLoading } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  const { data: verticals = [] } = useQuery<BusinessVertical[]>({
    queryKey: ["/api/business/verticals"],
    enabled: !!profile,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<BusinessMemberWithUser[]>({
    queryKey: ["/api/business/members"],
    enabled: !!profile,
  });

  const activeMembers = members.filter(m => m.status === "active");

  const weekEnd = getWeekEnd(weekStart);

  const { data: teamPerf = [], isLoading: teamLoading } = useQuery<TeamPerformanceSummary[]>({
    queryKey: ["/api/business/performance/team", period],
    queryFn: async () => {
      const res = await fetch(`/api/business/performance/team?period=${period}`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!profile && activeReport === "monthly",
  });

  // Prior-month comparison for month-over-month delta
  const priorPeriod = (() => {
    const [y, m] = period.split("-").map(Number);
    const d = new Date(y, m - 2, 1); // subtract 1 month
    return d.toISOString().slice(0, 7);
  })();
  const { data: priorTeamPerf = [] } = useQuery<TeamPerformanceSummary[]>({
    queryKey: ["/api/business/performance/team", priorPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/business/performance/team?period=${priorPeriod}`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!profile && activeReport === "monthly",
  });

  const { data: weeklyEntries = [], isLoading: weeklyLoading } = useQuery<EodEntry[]>({
    queryKey: ["/api/business/eod", "weekly", weekStart, weekEnd],
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate: weekStart, toDate: weekEnd });
      const res = await fetch(`/api/business/eod?${params}`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!profile && activeReport === "weekly",
  });

  // YTD data: pull for each month of the current FY
  const fyMonths: string[] = [];
  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(fy.startYear, 3 + m, 1); // April = month index 3
    if (monthDate <= new Date()) {
      fyMonths.push(monthDate.toISOString().slice(0, 7));
    }
  }

  const { data: ytdEntries = [], isLoading: ytdLoading } = useQuery<EodEntry[]>({
    queryKey: ["/api/business/eod", "ytd", fyRange.from, fyRange.to],
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate: fyRange.from, toDate: fyRange.to });
      const res = await fetch(`/api/business/eod?${params}`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!profile && activeReport === "ytd",
  });

  // Daily entries
  const { data: dailyEntries = [], isLoading: dailyLoading } = useQuery<EodEntry[]>({
    queryKey: ["/api/business/eod", "daily", selectedDate],
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate: selectedDate, toDate: selectedDate });
      const res = await fetch(`/api/business/eod?${params}`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!profile && activeReport === "daily",
  });

  // Individual employee entries
  const selectedMember = activeMembers.find(m => m.id === selectedMemberId);
  const { data: memberEntries = [], isLoading: memberLoading } = useQuery<EodEntry[]>({
    queryKey: ["/api/business/eod", "member", selectedMemberId, fyRange.from, fyRange.to],
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate: fyRange.from, toDate: fyRange.to });
      const res = await fetch(`/api/business/eod?${params}`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      const all: EodEntry[] = await res.json();
      return all.filter(e => e.memberId === selectedMemberId);
    },
    enabled: !!profile && activeReport === "employee" && !!selectedMemberId,
  });

  const sym = profile?.currencySymbol ?? "₹";

  function exportMonthlyCSV() {
    if (!teamPerf.length) { toast({ title: "No data to export" }); return; }
    const headers = ["Name", "Email", "Revenue", "Units", "Deals", "Expenses", "Target", "Achievement%", "Incentive", "Entries"];
    const rows = teamPerf.map(m => [
      m.memberName, m.memberEmail, m.totalRevenue, m.totalUnits, m.totalDeals,
      m.totalExpenses, m.targetRevenue, m.achievementPercent + "%", m.projectedIncentive, m.entryCount,
    ]);
    downloadCSV(`monthly-report-${period}.csv`, headers, rows);
    toast({ title: "Monthly report exported!" });
  }

  function exportDailyCSV() {
    if (!dailyEntries.length) { toast({ title: "No data for this date" }); return; }
    const headers = ["Member", "Vertical", "Revenue", "Units", "Deals", "Total Expenses", "Notes", "Status"];
    const rows = dailyEntries.map(e => {
      const member = members.find(m => m.id === e.memberId);
      const vertical = verticals.find(v => v.id === e.verticalId);
      return [
        member?.name || member?.email || "",
        vertical?.name || "",
        e.revenueAmount, e.unitsSold, e.dealsClosed,
        (e.expenseItems ?? []).reduce((s: number, x: { amount: number }) => s + x.amount, 0),
        e.notes ?? "", e.status,
      ];
    });
    downloadCSV(`daily-summary-${selectedDate}.csv`, headers, rows);
    toast({ title: "Daily summary exported!" });
  }

  function exportYtdCSV() {
    if (!ytdEntries.length) { toast({ title: "No data for this FY" }); return; }
    const headers = ["Date", "Member", "Vertical", "Revenue", "Units", "Deals", "Expenses", "Status"];
    const rows = ytdEntries.map(e => {
      const member = members.find(m => m.id === e.memberId);
      const vertical = verticals.find(v => v.id === e.verticalId);
      return [
        e.entryDate, member?.name || member?.email || "", vertical?.name || "",
        e.revenueAmount, e.unitsSold, e.dealsClosed,
        (e.expenseItems ?? []).reduce((s: number, x: { amount: number }) => s + x.amount, 0),
        e.status,
      ];
    });
    downloadCSV(`ytd-report-${fy.label.replace(/\s+/g, "-")}.csv`, headers, rows);
    toast({ title: "YTD report exported!" });
  }

  function exportEmployeeCSV() {
    if (!memberEntries.length) { toast({ title: "No entries for this member" }); return; }
    const headers = ["Date", "Vertical", "Revenue", "Units", "Deals", "Expenses", "Notes", "Status"];
    const rows = memberEntries.map(e => {
      const vertical = verticals.find(v => v.id === e.verticalId);
      return [
        e.entryDate, vertical?.name || "",
        e.revenueAmount, e.unitsSold, e.dealsClosed,
        (e.expenseItems ?? []).reduce((s: number, x: { amount: number }) => s + x.amount, 0),
        e.notes ?? "", e.status,
      ];
    });
    downloadCSV(`employee-report-${selectedMember?.name ?? selectedMemberId}-${fy.label.replace(/\s+/g, "-")}.csv`, headers, rows);
    toast({ title: "Employee report exported!" });
  }

  const { data: festivalEntries = [], isLoading: festivalLoading } = useQuery<EodEntry[]>({
    queryKey: ["/api/business/eod", "festival", festivalFrom, festivalTo],
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate: festivalFrom, toDate: festivalTo });
      const res = await fetch(`/api/business/eod?${params}`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${await getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!profile && activeReport === "festival",
  });

  function exportWeeklyCSV() {
    if (!weeklyEntries.length) { toast({ title: "No data for this week" }); return; }
    const headers = ["Date", "Member", "Vertical", "Revenue", "Units", "Deals", "Expenses", "Status"];
    const rows = weeklyEntries.map(e => {
      const member = members.find(m => m.id === e.memberId);
      const vertical = verticals.find(v => v.id === e.verticalId);
      return [
        e.entryDate, member?.name || member?.email || "", vertical?.name || "",
        e.revenueAmount, e.unitsSold, e.dealsClosed,
        (e.expenseItems ?? []).reduce((s: number, x: { amount: number }) => s + x.amount, 0),
        e.status,
      ];
    });
    downloadCSV(`weekly-recap-${weekStart}-to-${weekEnd}.csv`, headers, rows);
    toast({ title: "Weekly recap exported!" });
  }

  async function exportPDF() {
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Build the correct period string and optional params for each report type
      let periodStr: string;
      const reportParams: Record<string, string> = {};
      switch (activeReport) {
        case "ytd":
          periodStr = `ytd-${fy.startYear}`;
          break;
        case "daily":
          periodStr = selectedDate;
          break;
        case "weekly":
          periodStr = `weekly-${weekStart}-${weekEnd}`;
          break;
        case "employee":
          periodStr = `${fy.startYear}`;
          if (selectedMemberId) reportParams.memberId = selectedMemberId;
          break;
        case "festival":
          periodStr = `festival-${festivalFrom}-${festivalTo}`;
          break;
        default:
          periodStr = period; // monthly: YYYY-MM
      }

      const body = { businessReport: { period: periodStr, type: activeReport, params: reportParams } };
      const res = await fetch("/api/export/pdf", { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("PDF export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${profile?.name?.replace(/\s+/g, "-") ?? "business"}-${activeReport}-${periodStr}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF downloaded", description: "Report saved as PDF" });
    } catch {
      toast({ title: "PDF export failed", description: "Using print dialog as fallback", variant: "destructive" });
      window.print();
    }
  }

  function printReport() {
    window.print();
  }

  const canExportPDF = true; // All report types now route to PDF endpoint

  const [generatedShareLink, setGeneratedShareLink] = useState<string>("");
  const [shareLoading, setShareLoading] = useState(false);

  async function generateShareLink(): Promise<string> {
    setShareLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const reportParams: Record<string, string> = { period, fyStartYear: String(fy.startYear) };
      if (activeReport === "daily") { reportParams.selectedDate = selectedDate; }
      if (activeReport === "weekly") { reportParams.weekStart = weekStart; reportParams.weekEnd = weekEnd; }
      if (activeReport === "festival") { reportParams.from = festivalFrom; reportParams.to = festivalTo; }
      if (activeReport === "employee") {
        reportParams.fyStartYear = String(fy.startYear);
        if (selectedMemberId) reportParams.memberId = selectedMemberId;
      }

      const res = await fetch("/api/business/reports/share", {
        method: "POST",
        headers,
        body: JSON.stringify({ reportType: activeReport, reportParams }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const link = data.fullUrl || `${window.location.origin}${data.shareUrl}`;
      setGeneratedShareLink(link);
      return link;
    } catch {
      toast({ title: "Could not generate share link", variant: "destructive" });
      return "";
    } finally {
      setShareLoading(false);
    }
  }

  async function copyShareLink() {
    const link = generatedShareLink || await generateShareLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
      toast({ title: "Link copied!", description: "Share this link with managers for read-only report access." });
    } catch {
      toast({ title: "Could not copy", description: "Please copy the link manually.", variant: "destructive" });
    }
  }

  function exportFestivalCSV() {
    if (!festivalEntries.length) { toast({ title: "No festival season data" }); return; }
    const headers = ["Date", "Member", "Vertical", "Revenue", "Units", "Deals", "Expenses"];
    const rows = festivalEntries.map(e => {
      const member = members.find(m => m.id === e.memberId);
      const vertical = verticals.find(v => v.id === e.verticalId);
      return [
        e.entryDate, member?.name || member?.email || "", vertical?.name || "",
        e.revenueAmount, e.unitsSold, e.dealsClosed,
        (e.expenseItems ?? []).reduce((s: number, x: { amount: number }) => s + x.amount, 0),
      ];
    });
    downloadCSV(`festival-season-report-${fy.label.replace(/\s+/g, "-")}.csv`, headers, rows);
    toast({ title: "Festival season report exported!" });
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  if (!profile || (profile.memberRole !== "owner" && profile.memberRole !== "manager")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <FileBarChart2 className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <p className="font-medium">Access restricted</p>
          <p className="text-sm text-muted-foreground">Reports are available to owners and managers only.</p>
          <Button variant="ghost" onClick={() => navigate("/business")} data-testid="button-back-business">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to My Business
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
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
                <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                  <FileBarChart2 className="w-5 h-5 text-amber-500" /> Reports
                </h1>
                <p className="text-xs text-muted-foreground">{profile.name} · {fy.label} · Month {fy.monthInFY}/12</p>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="ghost" size="sm" onClick={() => setShareDialogOpen(true)} data-testid="button-share-report">
                <Share2 className="w-4 h-4 mr-1" /> Share
              </Button>
              {canExportPDF ? (
                <Button variant="outline" size="sm" onClick={exportPDF} data-testid="button-export-pdf">
                  <Download className="w-4 h-4 mr-1" /> Export PDF
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={printReport} data-testid="button-print-report">
                  <Printer className="w-4 h-4 mr-1" /> Print / Save PDF
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8 space-y-8 w-full print:space-y-4">
          {/* Shared report banner */}
          {sharedToken && sharedReportMeta && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3 print:hidden">
              <Share2 className="w-4 h-4 text-blue-500 shrink-0" />
              <p className="text-sm text-muted-foreground">
                You're viewing a <span className="font-medium text-foreground">shared report</span> — {REPORT_TYPES.find(r => r.id === sharedReportMeta.reportType)?.label ?? sharedReportMeta.reportType}. The report type and period have been pre-selected.
              </p>
            </div>
          )}

          {/* What to do here — UX explainer (hidden on shared views) */}
          {!sharedToken && (
            <div className="bg-muted/30 border border-border rounded-xl p-4 print:hidden">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">What you can do here</p>
              <p className="text-sm text-muted-foreground">
                Choose a report type below to view your team's performance data. Use <span className="font-medium text-foreground">Export CSV</span> to download data to a spreadsheet, or <span className="font-medium text-foreground">Print / PDF</span> to save a formatted report. Reports use your Indian fiscal year (April–March) as the default period.
              </p>
            </div>
          )}

          {/* Report Type Selector */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Select a report type</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {REPORT_TYPES.map(rt => (
                <button
                  key={rt.id}
                  onClick={() => setActiveReport(rt.id)}
                  data-testid={`button-report-type-${rt.id}`}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activeReport === rt.id
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
                      : "border-border hover:border-border/80 hover:bg-muted/40"
                  }`}
                >
                  <rt.icon className="w-4 h-4 mb-1.5" />
                  <p className="text-xs font-medium leading-tight">{rt.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{rt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Weekly Recap ──────────────────────────────────────── */}
          {activeReport === "weekly" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Label className="text-sm text-muted-foreground">Week starting:</Label>
                  <Input
                    type="date"
                    value={weekStart}
                    onChange={e => setWeekStart(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-40"
                    data-testid="input-week-start"
                  />
                  <span className="text-xs text-muted-foreground">→ {weekEnd}</span>
                </div>
                <Button onClick={exportWeeklyCSV} variant="outline" size="sm" data-testid="button-export-weekly">
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
              {weeklyLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : weeklyEntries.length === 0 ? (
                <Card className="p-10 text-center">
                  <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium mb-1">No entries for this week</p>
                  <p className="text-sm text-muted-foreground">No EOD reports were submitted for {weekStart} to {weekEnd}.</p>
                </Card>
              ) : (() => {
                const totalRevenue = weeklyEntries.reduce((s, e) => s + e.revenueAmount, 0);
                const totalDeals = weeklyEntries.reduce((s, e) => s + e.dealsClosed, 0);
                const totalUnits = weeklyEntries.reduce((s, e) => s + e.unitsSold, 0);
                const totalExpenses = weeklyEntries.reduce((s, e) => s + (e.expenseItems ?? []).reduce((es: number, ex: { amount: number }) => es + ex.amount, 0), 0);
                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: "Week Revenue", value: formatCurrency(totalRevenue, sym), icon: DollarSign, color: "text-amber-500" },
                        { label: "Total Deals", value: totalDeals, icon: Handshake, color: "text-green-500" },
                        { label: "Total Units", value: totalUnits, icon: Package, color: "text-blue-500" },
                        { label: "Total Expenses", value: formatCurrency(totalExpenses, sym), icon: TrendingUp, color: "text-purple-500" },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <Card key={label} className="p-4">
                          <div className={`flex items-center gap-2 mb-1 ${color}`}>
                            <Icon className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
                          </div>
                          <p className="text-xl font-bold">{value}</p>
                        </Card>
                      ))}
                    </div>
                    <Card>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="table-weekly-report">
                          <thead>
                            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                              <th className="px-4 py-2 text-left">Date</th>
                              <th className="px-4 py-2 text-left">Member</th>
                              <th className="px-4 py-2 text-right">Revenue</th>
                              <th className="px-4 py-2 text-right">Deals</th>
                              <th className="px-4 py-2 text-right">Units</th>
                              <th className="px-4 py-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weeklyEntries.map(e => {
                              const member = members.find(m => m.id === e.memberId);
                              const vertical = verticals.find(v => v.id === e.verticalId);
                              return (
                                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20" data-testid={`row-weekly-${e.id}`}>
                                  <td className="px-4 py-2">{new Date(e.entryDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                                  <td className="px-4 py-2">
                                    <span className="font-medium">{member?.name || member?.email || "—"}</span>
                                    {vertical && <Badge variant="outline" className="text-xs ml-1">{vertical.name}</Badge>}
                                  </td>
                                  <td className="px-4 py-2 text-right text-amber-500 font-medium">{e.revenueAmount > 0 ? formatCurrency(e.revenueAmount, sym) : "—"}</td>
                                  <td className="px-4 py-2 text-right text-green-500">{e.dealsClosed > 0 ? e.dealsClosed : "—"}</td>
                                  <td className="px-4 py-2 text-right text-blue-500">{e.unitsSold > 0 ? e.unitsSold : "—"}</td>
                                  <td className="px-4 py-2 text-center">
                                    <Badge variant="secondary" className={`text-xs ${e.status === "reviewed" ? "text-green-500" : ""}`}>{e.status}</Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* ── Monthly Report ─────────────────────────────────────── */}
          {activeReport === "monthly" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <Label className="text-sm text-muted-foreground">FY:</Label>
                  <Select
                    value={String(selectedMonthFY)}
                    onValueChange={val => {
                      const fyS = parseInt(val);
                      setSelectedMonthFY(fyS);
                      setPeriod(`${fyS}-04`);
                    }}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-report-fy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getFYOptions().map(opt => (
                        <SelectItem key={opt.startYear} value={String(opt.startYear)}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="text-sm text-muted-foreground">Month:</Label>
                  <Input
                    type="month"
                    value={period}
                    min={`${selectedMonthFY}-04`}
                    max={`${selectedMonthFY + 1}-03`}
                    onChange={e => {
                      setPeriod(e.target.value);
                      const [y, m] = e.target.value.split("-").map(Number);
                      setSelectedMonthFY(m >= 4 ? y : y - 1);
                    }}
                    className="w-36"
                    data-testid="input-report-month"
                  />
                  {(() => {
                    const monthNum = parseInt(period.split("-")[1]);
                    if ([10, 11].includes(monthNum)) return <Badge variant="secondary" className="text-xs text-amber-500 border-amber-500/30">🪔 Festival Season</Badge>;
                    if ([12, 1].includes(monthNum)) return <Badge variant="secondary" className="text-xs text-blue-500 border-blue-500/20">🎉 Year-End Season</Badge>;
                    if ([6, 9, 3].includes(monthNum)) return <Badge variant="secondary" className="text-xs text-muted-foreground">Q-End</Badge>;
                    return null;
                  })()}
                </div>
                <Button onClick={exportMonthlyCSV} variant="outline" size="sm" data-testid="button-export-monthly">
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
              {teamLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : teamPerf.length === 0 ? (
                <Card className="p-10 text-center">
                  <TrendingUp className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium mb-1">No data for {period}</p>
                  <p className="text-sm text-muted-foreground">Your team hasn't logged any EOD entries for this month yet.</p>
                </Card>
              ) : (
                <>
                  {/* Month-over-month comparison KPI row */}
                  {(() => {
                    const curRev = teamPerf.reduce((s, m) => s + m.totalRevenue, 0);
                    const prvRev = priorTeamPerf.reduce((s, m) => s + m.totalRevenue, 0);
                    const curExp = teamPerf.reduce((s, m) => s + m.totalExpenses, 0);
                    const prvExp = priorTeamPerf.reduce((s, m) => s + m.totalExpenses, 0);
                    const revDelta = prvRev > 0 ? ((curRev - prvRev) / prvRev) * 100 : null;
                    const expDelta = prvExp > 0 ? ((curExp - prvExp) / prvExp) * 100 : null;
                    const avgAch = teamPerf.length > 0 ? teamPerf.reduce((s, m) => s + m.achievementPercent, 0) / teamPerf.length : 0;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: "Team Revenue", value: formatCurrency(curRev, sym), icon: DollarSign, color: "text-amber-500", delta: revDelta },
                          { label: "Total Deals", value: teamPerf.reduce((s, m) => s + m.totalDeals, 0), icon: Handshake, color: "text-green-500", delta: null },
                          { label: "Avg Achievement", value: `${avgAch.toFixed(0)}%`, icon: TrendingUp, color: "text-green-500", delta: null },
                          { label: "Total Expenses", value: formatCurrency(curExp, sym), icon: Package, color: "text-purple-500", delta: expDelta },
                        ].map(({ label, value, icon: Icon, color, delta }) => (
                          <Card key={label} className="p-4">
                            <div className={`flex items-center gap-2 mb-1 ${color}`}>
                              <Icon className="w-4 h-4" />
                              <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
                            </div>
                            <p className="text-xl font-bold">{value}</p>
                            {delta !== null && priorTeamPerf.length > 0 && (
                              <p className={`text-xs mt-1 ${delta >= 0 ? "text-green-500" : "text-red-500"}`}>
                                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs last month
                              </p>
                            )}
                          </Card>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Team Revenue vs Deals Chart (bar chart comparison) */}
                  {teamPerf.length > 0 && (
                    <Card className="p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Revenue by Team Member</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={teamPerf.map(m => ({ name: m.memberName || m.memberEmail.split("@")[0], Revenue: m.totalRevenue, Target: m.targetRevenue > 0 ? m.targetRevenue : undefined }))} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatCurrency(v, sym)} />
                          <Tooltip formatter={(v: number) => formatCurrency(v, sym)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Target" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} fillOpacity={0.35} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  )}

                  {/* Month-over-month line chart (current vs prior) */}
                  {priorTeamPerf.length > 0 && teamPerf.length > 0 && (() => {
                    const curRev = teamPerf.reduce((s, m) => s + m.totalRevenue, 0);
                    const prvRev = priorTeamPerf.reduce((s, m) => s + m.totalRevenue, 0);
                    const [py, pm] = priorPeriod.split("-");
                    const [cy, cm] = period.split("-");
                    const monthName = (ym: string) => new Date(parseInt(ym.split("-")[0]), parseInt(ym.split("-")[1]) - 1, 1).toLocaleString("default", { month: "short", year: "2-digit" });
                    const chartData = [
                      { month: monthName(priorPeriod), Revenue: prvRev, Expenses: priorTeamPerf.reduce((s, m) => s + m.totalExpenses, 0) },
                      { month: monthName(period), Revenue: curRev, Expenses: teamPerf.reduce((s, m) => s + m.totalExpenses, 0) },
                    ];
                    return (
                      <Card className="p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Month-over-Month Comparison</p>
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatCurrency(v, sym)} />
                            <Tooltip formatter={(v: number) => formatCurrency(v, sym)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="Revenue" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 5 }} />
                            <Line type="monotone" dataKey="Expenses" stroke="#a855f7" strokeWidth={2} dot={{ fill: "#a855f7", r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </Card>
                    );
                  })()}
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" data-testid="table-monthly-report">
                        <thead>
                          <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                            <th className="px-4 py-3 text-left">Member</th>
                            <th className="px-4 py-3 text-right">Revenue</th>
                            <th className="px-4 py-3 text-right">Deals</th>
                            <th className="px-4 py-3 text-right">Units</th>
                            <th className="px-4 py-3 text-right">Target</th>
                            <th className="px-4 py-3 text-right">Achievement</th>
                            <th className="px-4 py-3 text-right">Incentive</th>
                            <th className="px-4 py-3 text-right">Entries</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamPerf.map(m => (
                            <tr key={m.memberId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-medium">{m.memberName || m.memberEmail}</td>
                              <td className="px-4 py-3 text-right text-amber-500 font-medium">{formatCurrency(m.totalRevenue, sym)}</td>
                              <td className="px-4 py-3 text-right text-green-500">{m.totalDeals}</td>
                              <td className="px-4 py-3 text-right text-blue-500">{m.totalUnits}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{m.targetRevenue > 0 ? formatCurrency(m.targetRevenue, sym) : "—"}</td>
                              <td className="px-4 py-3 text-right">
                                <Badge variant="secondary" className={`text-xs ${m.achievementPercent >= 80 ? 'text-green-500' : m.achievementPercent >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                  {m.achievementPercent}%
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right text-purple-500">{formatCurrency(m.projectedIncentive, sym)}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{m.entryCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              )}
            </motion.div>
          )}

          {/* ── Daily Summary ─────────────────────────────────────── */}
          {activeReport === "daily" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-muted-foreground">Date:</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-40"
                    data-testid="input-report-date"
                  />
                </div>
                <Button onClick={exportDailyCSV} variant="outline" size="sm" data-testid="button-export-daily">
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
              {dailyLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : dailyEntries.length === 0 ? (
                <Card className="p-10 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium mb-1">No entries for {selectedDate}</p>
                  <p className="text-sm text-muted-foreground">No team member submitted an EOD report for this date.</p>
                </Card>
              ) : (
                <Card>
                  <div className="divide-y divide-border">
                    {dailyEntries.map(entry => {
                      const member = members.find(m => m.id === entry.memberId);
                      const vertical = verticals.find(v => v.id === entry.verticalId);
                      const totalExpenses = (entry.expenseItems ?? []).reduce((s: number, e: { amount: number }) => s + e.amount, 0);
                      return (
                        <div key={entry.id} className="px-5 py-4" data-testid={`row-daily-${entry.id}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-xs font-bold">
                                {(member?.name || member?.email || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-sm">{member?.name || member?.email}</span>
                              {vertical && <Badge variant="outline" className="text-xs">{vertical.name}</Badge>}
                            </div>
                            <Badge variant="secondary" className={`text-xs ${entry.status === "reviewed" ? "text-green-500" : "text-amber-500"}`}>
                              {entry.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {entry.revenueAmount > 0 && <span><span className="text-muted-foreground">Revenue:</span> <span className="text-amber-500 font-medium">{formatCurrency(entry.revenueAmount, sym)}</span></span>}
                            {entry.dealsClosed > 0 && <span><span className="text-muted-foreground">Deals:</span> <span className="text-green-500 font-medium">{entry.dealsClosed}</span></span>}
                            {entry.unitsSold > 0 && <span><span className="text-muted-foreground">Units:</span> <span className="text-blue-500 font-medium">{entry.unitsSold}</span></span>}
                            {totalExpenses > 0 && <span><span className="text-muted-foreground">Expenses:</span> <span className="text-red-400 font-medium">{formatCurrency(totalExpenses, sym)}</span></span>}
                          </div>
                          {entry.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">"{entry.notes}"</p>}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* ── YTD Report ─────────────────────────────────────────── */}
          {activeReport === "ytd" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{fy.label} Year-to-Date</p>
                  <p className="text-xs text-muted-foreground">{fyRange.from} → {fyRange.to}</p>
                </div>
                <Button onClick={exportYtdCSV} variant="outline" size="sm" data-testid="button-export-ytd">
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
              {ytdLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : ytdEntries.length === 0 ? (
                <Card className="p-10 text-center">
                  <CalendarRange className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium mb-1">No data for {fy.label}</p>
                  <p className="text-sm text-muted-foreground">No EOD entries have been submitted this financial year yet.</p>
                </Card>
              ) : (() => {
                const totalRevenue = ytdEntries.reduce((s, e) => s + e.revenueAmount, 0);
                const totalDeals = ytdEntries.reduce((s, e) => s + e.dealsClosed, 0);
                const totalUnits = ytdEntries.reduce((s, e) => s + e.unitsSold, 0);
                const totalExpenses = ytdEntries.reduce((s, e) => s + (e.expenseItems ?? []).reduce((es: number, ex: { amount: number }) => es + ex.amount, 0), 0);
                const entryDays = new Set(ytdEntries.map(e => e.entryDate)).size;

                // Monthly breakdown
                const byMonth: Record<string, { revenue: number; deals: number; units: number; entries: number }> = {};
                for (const e of ytdEntries) {
                  const m = e.entryDate.slice(0, 7);
                  if (!byMonth[m]) byMonth[m] = { revenue: 0, deals: 0, units: 0, entries: 0 };
                  byMonth[m].revenue += e.revenueAmount;
                  byMonth[m].deals += e.dealsClosed;
                  byMonth[m].units += e.unitsSold;
                  byMonth[m].entries++;
                }

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: "Total Revenue", value: formatCurrency(totalRevenue, sym), icon: DollarSign, color: "text-amber-500" },
                        { label: "Total Deals", value: totalDeals, icon: Handshake, color: "text-green-500" },
                        { label: "Total Units", value: totalUnits, icon: Package, color: "text-blue-500" },
                        { label: "Total Expenses", value: formatCurrency(totalExpenses, sym), icon: TrendingUp, color: "text-purple-500" },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <Card key={label} className="p-4">
                          <div className={`flex items-center gap-2 mb-1 ${color}`}>
                            <Icon className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
                          </div>
                          <p className="text-xl font-bold">{value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{entryDays} active days</p>
                        </Card>
                      ))}
                    </div>
                    <Card>
                      <CardTitle className="text-sm px-5 pt-4 pb-2">Monthly Breakdown</CardTitle>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="table-ytd-breakdown">
                          <thead>
                            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                              <th className="px-4 py-2 text-left">Month</th>
                              <th className="px-4 py-2 text-right">Revenue</th>
                              <th className="px-4 py-2 text-right">Deals</th>
                              <th className="px-4 py-2 text-right">Units</th>
                              <th className="px-4 py-2 text-right">Entries</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([mo, data]) => {
                              const monthNum = parseInt(mo.split("-")[1]);
                              const isFestivalSeason = [9, 10, 11].includes(monthNum); // Oct, Nov = Navratri/Diwali; Dec = Year end
                              const isQuarterEnd = [6, 9, 12, 3].includes(monthNum); // Indian FY quarter ends
                              return (
                              <tr key={mo} className={`border-b border-border last:border-0 hover:bg-muted/20 ${isFestivalSeason ? 'bg-amber-500/3' : ''}`}>
                                <td className="px-4 py-2 font-medium">
                                  <span>{new Date(mo + "-01").toLocaleString("default", { month: "long", year: "numeric" })}</span>
                                  {isFestivalSeason && <Badge variant="secondary" className="ml-2 text-[9px] text-amber-500 border-amber-500/30 py-0">🪔 Festival</Badge>}
                                  {isQuarterEnd && !isFestivalSeason && <Badge variant="secondary" className="ml-2 text-[9px] text-blue-500 border-blue-500/20 py-0">Q-end</Badge>}
                                </td>
                                <td className="px-4 py-2 text-right text-amber-500">{formatCurrency(data.revenue, sym)}</td>
                                <td className="px-4 py-2 text-right text-green-500">{data.deals}</td>
                                <td className="px-4 py-2 text-right text-blue-500">{data.units}</td>
                                <td className="px-4 py-2 text-right text-muted-foreground">{data.entries}</td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* ── Individual Employee Report ─────────────────────────── */}
          {activeReport === "employee" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-muted-foreground">Team Member:</Label>
                  <Select value={selectedMemberId || "none"} onValueChange={v => setSelectedMemberId(v === "none" ? "" : v)}>
                    <SelectTrigger className="w-52" data-testid="select-report-member">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a member</SelectItem>
                      {activeMembers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedMemberId && (
                  <Button onClick={exportEmployeeCSV} variant="outline" size="sm" data-testid="button-export-employee">
                    <Download className="w-4 h-4 mr-1" /> Export CSV
                  </Button>
                )}
              </div>
              {!selectedMemberId ? (
                <Card className="p-10 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium mb-1">Select a team member</p>
                  <p className="text-sm text-muted-foreground">Choose a member above to view their full-year performance history.</p>
                </Card>
              ) : memberLoading ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
              ) : memberEntries.length === 0 ? (
                <Card className="p-10 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium mb-1">No entries for {selectedMember?.name || selectedMember?.email}</p>
                  <p className="text-sm text-muted-foreground">This member hasn't submitted any EOD entries this financial year.</p>
                </Card>
              ) : (() => {
                const totalRevenue = memberEntries.reduce((s, e) => s + e.revenueAmount, 0);
                const totalDeals = memberEntries.reduce((s, e) => s + e.dealsClosed, 0);
                const totalUnits = memberEntries.reduce((s, e) => s + e.unitsSold, 0);
                return (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                        <p className="text-xl font-bold text-amber-500">{formatCurrency(totalRevenue, sym)}</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Total Deals</p>
                        <p className="text-xl font-bold text-green-500">{totalDeals}</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Total Entries</p>
                        <p className="text-xl font-bold">{memberEntries.length}</p>
                      </Card>
                    </div>
                    <Card>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="table-employee-report">
                          <thead>
                            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                              <th className="px-4 py-2 text-left">Date</th>
                              <th className="px-4 py-2 text-left">Vertical</th>
                              <th className="px-4 py-2 text-right">Revenue</th>
                              <th className="px-4 py-2 text-right">Deals</th>
                              <th className="px-4 py-2 text-right">Units</th>
                              <th className="px-4 py-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberEntries.slice(0, 60).map(e => {
                              const vertical = verticals.find(v => v.id === e.verticalId);
                              return (
                                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                                  <td className="px-4 py-2">{e.entryDate}</td>
                                  <td className="px-4 py-2">{vertical ? <Badge variant="outline" className="text-xs">{vertical.name}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                                  <td className="px-4 py-2 text-right text-amber-500">{e.revenueAmount > 0 ? formatCurrency(e.revenueAmount, sym) : "—"}</td>
                                  <td className="px-4 py-2 text-right text-green-500">{e.dealsClosed > 0 ? e.dealsClosed : "—"}</td>
                                  <td className="px-4 py-2 text-right text-blue-500">{e.unitsSold > 0 ? e.unitsSold : "—"}</td>
                                  <td className="px-4 py-2 text-center">
                                    <Badge variant="secondary" className={`text-xs ${e.status === "reviewed" ? "text-green-500" : ""}`}>{e.status}</Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* ── Festival Season Report ──────────────────────────────── */}
          {activeReport === "festival" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium flex items-center gap-2">🪔 Festival Season Report</p>
                  <p className="text-xs text-muted-foreground">Analyze performance during any peak festival window</p>
                </div>
                <Button onClick={exportFestivalCSV} variant="outline" size="sm" data-testid="button-export-festival">
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
              <div className="flex items-center gap-3 flex-wrap bg-muted/30 border border-border rounded-xl p-3">
                <Label className="text-sm text-muted-foreground">Season window:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={festivalFrom}
                    onChange={e => setFestivalFrom(e.target.value)}
                    className="w-36"
                    data-testid="input-festival-from"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={festivalTo}
                    onChange={e => setFestivalTo(e.target.value)}
                    className="w-36"
                    data-testid="input-festival-to"
                  />
                </div>
                <div className="flex gap-2">
                  {[
                    { label: "🪔 Diwali", from: `${fy.startYear}-10-01`, to: `${fy.startYear}-11-15` },
                    { label: "🎊 Navratri", from: `${fy.startYear}-10-01`, to: `${fy.startYear}-10-12` },
                    { label: "🎉 New Year", from: `${fy.startYear}-12-25`, to: `${fy.endYear}-01-10` },
                    { label: "🕌 Eid", from: `${fy.endYear}-03-28`, to: `${fy.endYear}-04-05` },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => { setFestivalFrom(preset.from); setFestivalTo(preset.to); }}
                      className="text-xs px-2 py-1 rounded border border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-all"
                      data-testid={`button-festival-preset-${preset.label}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              {festivalLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : festivalEntries.length === 0 ? (
                <Card className="p-10 text-center">
                  <span className="text-4xl mb-3 block">🪔</span>
                  <p className="font-medium mb-1">No Diwali season data yet</p>
                  <p className="text-sm text-muted-foreground">EOD entries from Oct 1 to Nov 15 will appear here for season analysis.</p>
                </Card>
              ) : (() => {
                const totalRevenue = festivalEntries.reduce((s, e) => s + e.revenueAmount, 0);
                const totalDeals = festivalEntries.reduce((s, e) => s + e.dealsClosed, 0);
                const byMember: Record<string, number> = {};
                for (const e of festivalEntries) {
                  byMember[e.memberId] = (byMember[e.memberId] ?? 0) + e.revenueAmount;
                }
                const topPerformer = Object.entries(byMember).sort(([, a], [, b]) => b - a)[0];
                const topMember = topPerformer ? members.find(m => m.id === topPerformer[0]) : null;

                return (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="p-4 text-center border-amber-500/30">
                        <p className="text-xs text-muted-foreground mb-1">Season Revenue</p>
                        <p className="text-xl font-bold text-amber-500">{formatCurrency(totalRevenue, sym)}</p>
                      </Card>
                      <Card className="p-4 text-center border-amber-500/30">
                        <p className="text-xs text-muted-foreground mb-1">Season Deals</p>
                        <p className="text-xl font-bold text-green-500">{totalDeals}</p>
                      </Card>
                      <Card className="p-4 text-center border-amber-500/30">
                        <p className="text-xs text-muted-foreground mb-1">Top Performer</p>
                        <p className="text-xl font-bold text-amber-500 truncate">{topMember?.name || topMember?.email || "—"}</p>
                      </Card>
                    </div>
                    {/* Daily revenue trend chart for festival window */}
                    {festivalEntries.length > 0 && (() => {
                      const dayMap: Record<string, number> = {};
                      for (const e of festivalEntries) {
                        dayMap[e.entryDate] = (dayMap[e.entryDate] ?? 0) + e.revenueAmount;
                      }
                      const chartData = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, Revenue]) => ({
                        date: new Date(date + "T00:00:00").toLocaleDateString("default", { month: "short", day: "numeric" }),
                        Revenue,
                      }));
                      const avgRevPerDay = chartData.length > 0 ? chartData.reduce((s, d) => s + d.Revenue, 0) / chartData.length : 0;
                      return (
                        <Card className="p-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Daily Revenue — Festival Window</p>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatCurrency(v, sym)} />
                              <Tooltip formatter={(v: number) => formatCurrency(v, sym)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                              <ReferenceLine y={avgRevPerDay} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "Avg", position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }} />
                              <Bar dataKey="Revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                            </BarChart>
                          </ResponsiveContainer>
                          <p className="text-xs text-muted-foreground mt-2">Avg daily revenue: {formatCurrency(Math.round(avgRevPerDay), sym)} · Dashed line = daily average baseline</p>
                        </Card>
                      );
                    })()}

                    {/* Member revenue distribution chart */}
                    {festivalEntries.length > 0 && (() => {
                      const memberRevMap: Record<string, { name: string; Revenue: number }> = {};
                      for (const e of festivalEntries) {
                        const member = members.find(m => m.id === e.memberId);
                        const name = member?.name || member?.email?.split("@")[0] || e.memberId.slice(0, 8);
                        if (!memberRevMap[e.memberId]) memberRevMap[e.memberId] = { name, Revenue: 0 };
                        memberRevMap[e.memberId].Revenue += e.revenueAmount;
                      }
                      const memberData = Object.values(memberRevMap).sort((a, b) => b.Revenue - a.Revenue);
                      return (
                        <Card className="p-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Revenue by Member — Festival Window</p>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={memberData} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatCurrency(v, sym)} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={60} />
                              <Tooltip formatter={(v: number) => formatCurrency(v, sym)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                              <Bar dataKey="Revenue" fill="#10b981" radius={[0, 4, 4, 0]} fillOpacity={0.85} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Card>
                      );
                    })()}

                    <Card>
                      <CardTitle className="text-sm px-5 pt-4 pb-2">Daily Entries — Diwali Season</CardTitle>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="table-festival-report">
                          <thead>
                            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                              <th className="px-4 py-2 text-left">Date</th>
                              <th className="px-4 py-2 text-left">Member</th>
                              <th className="px-4 py-2 text-right">Revenue</th>
                              <th className="px-4 py-2 text-right">Deals</th>
                            </tr>
                          </thead>
                          <tbody>
                            {festivalEntries.map(e => {
                              const member = members.find(m => m.id === e.memberId);
                              return (
                                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                                  <td className="px-4 py-2">{e.entryDate}</td>
                                  <td className="px-4 py-2">{member?.name || member?.email || "—"}</td>
                                  <td className="px-4 py-2 text-right text-amber-500">{e.revenueAmount > 0 ? formatCurrency(e.revenueAmount, sym) : "—"}</td>
                                  <td className="px-4 py-2 text-right text-green-500">{e.dealsClosed > 0 ? e.dealsClosed : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </>
                );
              })()}
            </motion.div>
          )}
        </main>
      </div>
    </div>

    {/* Share Report Dialog */}
    <Dialog open={shareDialogOpen} onOpenChange={(open) => { setShareDialogOpen(open); if (!open) setGeneratedShareLink(""); }}>
      <DialogContent className="max-w-md" data-testid="dialog-share-report">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-500" /> Share {REPORT_TYPES.find(r => r.id === activeReport)?.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Generate a read-only shareable link for this report. <span className="font-medium text-foreground">Anyone with the link can view the report</span> — no login required. The link is token-based and scoped to this specific report view.
          </p>
          {generatedShareLink ? (
            <>
              <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{generatedShareLink}</span>
                <Button size="sm" variant="ghost" className="shrink-0 h-7 px-2" onClick={copyShareLink} data-testid="button-copy-share-link">
                  {shareLinkCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={copyShareLink} data-testid="button-share-copy-main">
                {shareLinkCopied ? <><Check className="w-4 h-4 mr-2" /> Copied!</> : <><Copy className="w-4 h-4 mr-2" /> Copy Link</>}
              </Button>
            </>
          ) : (
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              onClick={generateShareLink}
              disabled={shareLoading}
              data-testid="button-generate-share-link"
            >
              {shareLoading ? "Generating..." : <><Share2 className="w-4 h-4 mr-2" /> Generate Share Link</>}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={printReport} data-testid="button-share-print">
              <Printer className="w-4 h-4 mr-1" /> Print / Save PDF
            </Button>
            <Button variant="outline" className="flex-1" onClick={exportPDF} data-testid="button-share-export-pdf">
              <Download className="w-4 h-4 mr-1" /> Export PDF
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Each link is unique and token-protected. Only business owners and managers can access it.
          </p>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
