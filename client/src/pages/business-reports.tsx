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
import { cn } from "@/lib/utils";
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
    <div className="min-h-screen bg-[#fbfaf7] flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0">
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
                <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
                  <FileBarChart2 className="w-5 h-5 text-accent" /> Business Performance Reports
                </h1>
                <p className="text-xs text-muted-foreground">{profile.name} · {fy.label} · Indian Fiscal Year Analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="ghost" size="sm" onClick={() => setShareDialogOpen(true)} className="rounded-none hover:text-accent font-sans font-semibold tracking-wider uppercase text-xs shadow-none" data-testid="button-share-report">
                <Share2 className="w-4 h-4 mr-1" /> Share
              </Button>
              {canExportPDF ? (
                <Button variant="outline" size="sm" onClick={exportPDF} className="rounded-none border-gray-200 text-muted-foreground hover:bg-gray-50 text-[10px] font-sans font-bold uppercase tracking-wider h-8 px-3" data-testid="button-export-pdf">
                  <Download className="w-4 h-4 mr-1" /> Export PDF
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={printReport} className="rounded-none border-gray-200 text-muted-foreground hover:bg-gray-50 text-[10px] font-sans font-bold uppercase tracking-wider h-8 px-3" data-testid="button-print-report">
                  <Printer className="w-4 h-4 mr-1" /> Print / Save PDF
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8 space-y-8 w-full print:space-y-4">
          {/* Shared report banner */}
          {sharedToken && sharedReportMeta && (
            <div className="bg-sidebar border border-sidebar-border rounded-none px-4 py-3 flex items-center gap-3 print:hidden">
              <Share2 className="w-4 h-4 text-accent shrink-0" />
              <p className="text-xs text-muted-foreground font-sans">
                You're viewing a <span className="font-semibold text-primary">shared report</span> — {REPORT_TYPES.find(r => r.id === sharedReportMeta.reportType)?.label ?? sharedReportMeta.reportType}. The report type and period have been pre-selected.
              </p>
            </div>
          )}

          {/* What to do here — UX explainer (hidden on shared views) */}
          {!sharedToken && (
            <div className="bg-white border border-gray-200 rounded-none p-5 shadow-sm print:hidden">
              <p className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.2em] mb-1.5">Console Guide</p>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                Select a reporting interval below to audit team performance and financial indicators. You can export verified raw records via <span className="font-bold text-primary font-sans">Export CSV</span>, compile presentation dossiers with <span className="font-bold text-primary font-sans">Export PDF</span>, or publish access using secure tokens with <span className="font-bold text-primary font-sans">Share</span>. Calculations automatically align with the standard Indian Fiscal Year (April–March).
              </p>
            </div>
          )}

          {/* Report Type Selector */}
          <div>
            <p className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">Report Interval</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {REPORT_TYPES.map(rt => (
                <button
                  key={rt.id}
                  onClick={() => setActiveReport(rt.id)}
                  data-testid={`button-report-type-${rt.id}`}
                  className={cn(
                    "p-4 rounded-none border text-left transition-all relative flex flex-col justify-between h-28 bg-white shadow-xs hover:shadow-sm duration-200",
                    activeReport === rt.id
                      ? "border-primary border-t-2 border-t-accent shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-muted-foreground"
                  )}
                >
                  <rt.icon className={cn("w-4.5 h-4.5 mb-1.5", activeReport === rt.id ? "text-accent" : "text-muted-foreground")} />
                  <div>
                    <p className={cn("text-xs font-sans font-bold uppercase tracking-wider leading-tight", activeReport === rt.id ? "text-primary" : "text-muted-foreground")}>{rt.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-1 leading-normal font-sans">{rt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Weekly Recap ──────────────────────────────────────── */}
          {activeReport === "weekly" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-gray-200 p-4 rounded-none shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">Week starting:</Label>
                  <Input
                    type="date"
                    value={weekStart}
                    onChange={e => setWeekStart(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-40 rounded-none border-gray-200 bg-white focus-visible:ring-0 focus-visible:border-accent text-xs h-8"
                    data-testid="input-week-start"
                  />
                  <span className="text-xs text-muted-foreground font-sans">→ {weekEnd}</span>
                </div>
                <Button
                  onClick={exportWeeklyCSV}
                  className="rounded-none border border-gray-200 bg-white hover:bg-gray-50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider h-8 shadow-none animate-none"
                  data-testid="button-export-weekly"
                >
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
              {weeklyLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : weeklyEntries.length === 0 ? (
                <Card className="p-10 text-center bg-white border border-gray-200 rounded-none shadow-sm">
                  <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-sans font-bold text-primary uppercase text-sm mb-1 tracking-wider">No entries for this week</p>
                  <p className="text-xs text-muted-foreground mt-1">No EOD reports were submitted for {weekStart} to {weekEnd}.</p>
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
                        { label: "Week Revenue", value: formatCurrency(totalRevenue, sym), icon: DollarSign, color: "text-primary" },
                        { label: "Total Deals", value: totalDeals, icon: Handshake, color: "text-accent" },
                        { label: "Total Units", value: totalUnits, icon: Package, color: "text-gray-800" },
                        { label: "Total Expenses", value: formatCurrency(totalExpenses, sym), icon: TrendingUp, color: "text-red-600" },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div className="bg-white border border-gray-200 rounded-none p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300" key={label}>
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                              <p className="text-2xl font-sans font-bold text-primary tracking-tight mt-1">{value}</p>
                            </div>
                            <div className="w-8 h-8 border border-gray-200 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Card className="bg-white border border-gray-200 rounded-none shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm font-sans" data-testid="table-weekly-report">
                          <thead>
                            <tr className="border-b border-gray-200 text-xs text-muted-foreground uppercase tracking-wide bg-gray-50/50">
                              <th className="px-4 py-3 text-left">Date</th>
                              <th className="px-4 py-3 text-left">Member</th>
                              <th className="px-4 py-3 text-right">Revenue</th>
                              <th className="px-4 py-3 text-right">Deals</th>
                              <th className="px-4 py-3 text-right">Units</th>
                              <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weeklyEntries.map(e => {
                              const member = members.find(m => m.id === e.memberId);
                              const vertical = verticals.find(v => v.id === e.verticalId);
                              return (
                                <tr key={e.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50/50 transition-colors" data-testid={`row-weekly-${e.id}`}>
                                  <td className="px-4 py-3">{new Date(e.entryDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                                  <td className="px-4 py-3">
                                    <span className="font-semibold text-primary">{member?.name || member?.email || "—"}</span>
                                    {vertical && <Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5 ml-2">{vertical.name}</Badge>}
                                  </td>
                                  <td className="px-4 py-3 text-right text-primary font-semibold">{e.revenueAmount > 0 ? formatCurrency(e.revenueAmount, sym) : "—"}</td>
                                  <td className="px-4 py-3 text-right text-accent font-semibold">{e.dealsClosed > 0 ? e.dealsClosed : "—"}</td>
                                  <td className="px-4 py-3 text-right text-gray-800 font-semibold">{e.unitsSold > 0 ? e.unitsSold : "—"}</td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5", e.status === "reviewed" ? "bg-green-50 border-green-200 text-green-600" : "bg-amber-50 border-amber-200 text-amber-600")}>{e.status}</Badge>
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
              <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-gray-200 p-4 rounded-none shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">FY:</Label>
                  <Select
                    value={String(selectedMonthFY)}
                    onValueChange={val => {
                      const fyS = parseInt(val);
                      setSelectedMonthFY(fyS);
                      setPeriod(`${fyS}-04`);
                    }}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs rounded-none border-gray-200 bg-white focus:ring-accent" data-testid="select-report-fy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-gray-200 bg-white">
                      {getFYOptions().map(opt => (
                        <SelectItem key={opt.startYear} value={String(opt.startYear)} className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">Month:</Label>
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
                    className="w-36 rounded-none border-gray-200 bg-white focus-visible:ring-0 focus-visible:border-accent text-xs h-8"
                    data-testid="input-report-month"
                  />
                  {(() => {
                    const monthNum = parseInt(period.split("-")[1]);
                    if ([10, 11].includes(monthNum)) return <Badge className="bg-amber-50 border-amber-200 text-amber-600 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5">🪔 Festival Season</Badge>;
                    if ([12, 1].includes(monthNum)) return <Badge className="bg-blue-50 border-blue-200 text-blue-600 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5">🎉 Year-End Season</Badge>;
                    if ([6, 9, 3].includes(monthNum)) return <Badge className="bg-gray-100 border-gray-200 text-gray-700 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5">Q-End</Badge>;
                    return null;
                  })()}
                </div>
                <Button
                  onClick={exportMonthlyCSV}
                  className="rounded-none border border-gray-200 bg-white hover:bg-gray-50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider h-8 shadow-none animate-none"
                  data-testid="button-export-monthly"
                >
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
              {teamLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : teamPerf.length === 0 ? (
                <Card className="p-10 text-center bg-white border border-gray-200 rounded-none shadow-sm">
                  <TrendingUp className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-sans font-bold text-primary uppercase text-sm mb-1 tracking-wider">No data for {period}</p>
                  <p className="text-xs text-muted-foreground mt-1">Your team hasn't logged any EOD entries for this month yet.</p>
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
                          { label: "Team Revenue", value: formatCurrency(curRev, sym), icon: DollarSign, color: "text-primary", delta: revDelta },
                          { label: "Total Deals", value: teamPerf.reduce((s, m) => s + m.totalDeals, 0), icon: Handshake, color: "text-accent", delta: null },
                          { label: "Avg Achievement", value: `${avgAch.toFixed(0)}%`, icon: TrendingUp, color: "text-green-600", delta: null },
                          { label: "Total Expenses", value: formatCurrency(curExp, sym), icon: Package, color: "text-red-600", delta: expDelta },
                        ].map(({ label, value, icon: Icon, color, delta }) => (
                          <div className="bg-white border border-gray-200 rounded-none p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300" key={label}>
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                                <p className="text-2xl font-sans font-bold text-primary tracking-tight mt-1">{value}</p>
                                {delta !== null && priorTeamPerf.length > 0 && (
                                  <p className={`text-[10px] font-sans font-bold uppercase tracking-wider mt-1.5 {delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs last month
                                  </p>
                                )}
                              </div>
                              <div className="w-8 h-8 border border-gray-200 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 shrink-0">
                                <Icon className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Team Revenue vs Deals Chart (bar chart comparison) */}
                  {teamPerf.length > 0 && (
                    <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm">
                      <p className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.2em] mb-3">Revenue by Team Member</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={teamPerf.map(m => ({ name: m.memberName || m.memberEmail.split("@")[0], Revenue: m.totalRevenue, Target: m.targetRevenue > 0 ? m.targetRevenue : undefined }))} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatCurrency(v, sym)} />
                          <Tooltip formatter={(v: number) => formatCurrency(v, sym)} contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Revenue" fill="#13322b" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Target" fill="hsl(var(--muted-foreground))" radius={[0, 0, 0, 0]} fillOpacity={0.35} />
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
                      <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm">
                        <p className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.2em] mb-3">Month-over-Month Comparison</p>
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatCurrency(v, sym)} />
                            <Tooltip formatter={(v: number) => formatCurrency(v, sym)} contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="Revenue" stroke="#13322b" strokeWidth={2} dot={{ stroke: "#13322b", strokeWidth: 2, fill: "#ffffff", r: 4 }} activeDot={{ stroke: "#13322b", strokeWidth: 2, fill: "#13322b", r: 6 }} />
                            <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ stroke: "#ef4444", strokeWidth: 2, fill: "#ffffff", r: 4 }} activeDot={{ stroke: "#ef4444", strokeWidth: 2, fill: "#ef4444", r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </Card>
                    );
                  })()}
                  <Card className="bg-white border border-gray-200 rounded-none shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm font-sans" data-testid="table-monthly-report">
                        <thead>
                          <tr className="border-b border-gray-200 text-xs text-muted-foreground uppercase tracking-wide bg-gray-50/50">
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
                            <tr key={m.memberId} className="border-b border-gray-200 last:border-0 hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-primary">{m.memberName || m.memberEmail}</td>
                              <td className="px-4 py-3 text-right text-primary font-semibold">{formatCurrency(m.totalRevenue, sym)}</td>
                              <td className="px-4 py-3 text-right text-accent font-medium">{m.totalDeals}</td>
                              <td className="px-4 py-3 text-right text-gray-800 font-medium">{m.totalUnits}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{m.targetRevenue > 0 ? formatCurrency(m.targetRevenue, sym) : "—"}</td>
                              <td className="px-4 py-3 text-right">
                                <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5", m.achievementPercent >= 80 ? "bg-green-50 border-green-200 text-green-600" : m.achievementPercent >= 50 ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-red-50 border-red-200 text-red-600")}>
                                  {m.achievementPercent}%
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right text-red-600 font-semibold">{formatCurrency(m.projectedIncentive, sym)}</td>
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
              <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-gray-200 p-4 rounded-none shadow-sm">
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">Date:</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-40 rounded-none border-gray-200 bg-white focus-visible:ring-0 focus-visible:border-accent text-xs h-8"
                    data-testid="input-report-date"
                  />
                </div>
                <Button
                  onClick={exportDailyCSV}
                  className="rounded-none border border-gray-200 bg-white hover:bg-gray-50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider h-8 shadow-none animate-none"
                  data-testid="button-export-daily"
                >
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
              {dailyLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : dailyEntries.length === 0 ? (
                <Card className="p-10 text-center bg-white border border-gray-200 rounded-none shadow-sm">
                  <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-sans font-bold text-primary uppercase text-sm mb-1 tracking-wider">No entries for {selectedDate}</p>
                  <p className="text-xs text-muted-foreground mt-1">No team member submitted an EOD report for this date.</p>
                </Card>
              ) : (
                <Card className="bg-white border border-gray-200 rounded-none shadow-sm">
                  <div className="divide-y divide-gray-200 font-sans">
                    {dailyEntries.map(entry => {
                      const member = members.find(m => m.id === entry.memberId);
                      const vertical = verticals.find(v => v.id === entry.verticalId);
                      const totalExpenses = (entry.expenseItems ?? []).reduce((s: number, e: { amount: number }) => s + e.amount, 0);
                      return (
                        <div key={entry.id} className="px-5 py-4" data-testid={`row-daily-${entry.id}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold uppercase">
                                {(member?.name || member?.email || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-sm text-primary">{member?.name || member?.email}</span>
                              {vertical && <Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5">{vertical.name}</Badge>}
                            </div>
                            <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5", entry.status === "reviewed" ? "bg-green-50 border-green-200 text-green-600" : "bg-amber-50 border-amber-200 text-amber-600")}>
                              {entry.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs">
                            {entry.revenueAmount > 0 && <span><span className="text-muted-foreground">Revenue:</span> <span className="text-primary font-semibold">{formatCurrency(entry.revenueAmount, sym)}</span></span>}
                            {entry.dealsClosed > 0 && <span><span className="text-muted-foreground">Deals:</span> <span className="text-accent font-semibold">{entry.dealsClosed}</span></span>}
                            {entry.unitsSold > 0 && <span><span className="text-muted-foreground">Units:</span> <span className="text-gray-800 font-semibold">{entry.unitsSold}</span></span>}
                            {totalExpenses > 0 && <span><span className="text-muted-foreground">Expenses:</span> <span className="text-red-600 font-semibold">{formatCurrency(totalExpenses, sym)}</span></span>}
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
              <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-gray-200 p-4 rounded-none shadow-sm">
                <div>
                  <p className="font-sans font-bold text-primary text-sm uppercase tracking-wider">{fy.label} Year-to-Date</p>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">{fyRange.from} → {fyRange.to}</p>
                </div>
                <Button
                  onClick={exportYtdCSV}
                  className="rounded-none border border-gray-200 bg-white hover:bg-gray-50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider h-8 shadow-none animate-none"
                  data-testid="button-export-ytd"
                >
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
              {ytdLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : ytdEntries.length === 0 ? (
                <Card className="p-10 text-center bg-white border border-gray-200 rounded-none shadow-sm">
                  <CalendarRange className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-sans font-bold text-primary uppercase text-sm mb-1 tracking-wider">No data for {fy.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">No EOD entries have been submitted this financial year yet.</p>
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
                        { label: "Total Revenue", value: formatCurrency(totalRevenue, sym), icon: DollarSign, color: "text-primary" },
                        { label: "Total Deals", value: totalDeals, icon: Handshake, color: "text-accent" },
                        { label: "Total Units", value: totalUnits, icon: Package, color: "text-gray-800" },
                        { label: "Total Expenses", value: formatCurrency(totalExpenses, sym), icon: TrendingUp, color: "text-red-600" },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div className="bg-white border border-gray-200 rounded-none p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300" key={label}>
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                              <p className="text-2xl font-sans font-bold text-primary tracking-tight mt-1">{value}</p>
                              <p className="text-[10px] text-muted-foreground mt-1.5 font-sans">{entryDays} active days</p>
                            </div>
                            <div className="w-8 h-8 border border-gray-200 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Card className="bg-white border border-gray-200 rounded-none shadow-sm">
                      <div className="text-xs font-bold text-accent uppercase tracking-[0.25em] px-5 pt-4 pb-2 font-sans">Monthly Breakdown</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm font-sans" data-testid="table-ytd-breakdown">
                          <thead>
                            <tr className="border-b border-gray-200 text-xs text-muted-foreground uppercase tracking-wide bg-gray-50/50">
                              <th className="px-4 py-3 text-left">Month</th>
                              <th className="px-4 py-3 text-right">Revenue</th>
                              <th className="px-4 py-3 text-right">Deals</th>
                              <th className="px-4 py-3 text-right">Units</th>
                              <th className="px-4 py-3 text-right">Entries</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([mo, data]) => {
                              const monthNum = parseInt(mo.split("-")[1]);
                              const isFestivalSeason = [9, 10, 11].includes(monthNum); // Oct, Nov = Navratri/Diwali; Dec = Year end
                              const isQuarterEnd = [6, 9, 12, 3].includes(monthNum); // Indian FY quarter ends
                              return (
                              <tr key={mo} className={cn("border-b border-gray-200 last:border-0 hover:bg-gray-50/50 transition-colors", isFestivalSeason ? "bg-accent/5" : "")}>
                                <td className="px-4 py-3 font-semibold text-primary">
                                  <span>{new Date(mo + "-01").toLocaleString("default", { month: "long", year: "numeric" })}</span>
                                  {isFestivalSeason && <Badge className="bg-amber-50 border-amber-200 text-amber-600 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5 ml-2">🪔 Festival</Badge>}
                                  {isQuarterEnd && !isFestivalSeason && <Badge className="bg-blue-50 border-blue-200 text-blue-600 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5 ml-2">Q-end</Badge>}
                                </td>
                                <td className="px-4 py-3 text-right text-primary font-semibold">{formatCurrency(data.revenue, sym)}</td>
                                <td className="px-4 py-3 text-right text-accent font-medium">{data.deals}</td>
                                <td className="px-4 py-3 text-right text-gray-800 font-medium">{data.units}</td>
                                <td className="px-4 py-3 text-right text-muted-foreground">{data.entries}</td>
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
              <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-gray-200 p-4 rounded-none shadow-sm">
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">Team Member:</Label>
                  <Select value={selectedMemberId || "none"} onValueChange={v => setSelectedMemberId(v === "none" ? "" : v)}>
                    <SelectTrigger className="w-52 rounded-none border-gray-200 bg-white text-xs h-8 cursor-pointer focus:ring-accent" data-testid="select-report-member">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-gray-200 bg-white">
                      <SelectItem value="none" className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">Select a member</SelectItem>
                      {activeMembers.map(m => (
                        <SelectItem key={m.id} value={m.id} className="text-xs hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer">{m.name || m.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedMemberId && (
                  <Button
                    onClick={exportEmployeeCSV}
                    className="rounded-none border border-gray-200 bg-white hover:bg-gray-50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider h-8 shadow-none animate-none"
                    data-testid="button-export-employee"
                  >
                    <Download className="w-4 h-4 mr-1" /> Export CSV
                  </Button>
                )}
              </div>
              {!selectedMemberId ? (
                <Card className="p-10 text-center bg-white border border-gray-200 rounded-none shadow-sm">
                  <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-sans font-bold text-primary uppercase text-sm mb-1 tracking-wider">Select a team member</p>
                  <p className="text-xs text-muted-foreground mt-1">Choose a member above to view their full-year performance history.</p>
                </Card>
              ) : memberLoading ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
              ) : memberEntries.length === 0 ? (
                <Card className="p-10 text-center bg-white border border-gray-200 rounded-none shadow-sm">
                  <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-sans font-bold text-primary uppercase text-sm mb-1 tracking-wider">No entries for {selectedMember?.name || selectedMember?.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">This member hasn't submitted any EOD entries this financial year.</p>
                </Card>
              ) : (() => {
                const totalRevenue = memberEntries.reduce((s, e) => s + e.revenueAmount, 0);
                const totalDeals = memberEntries.reduce((s, e) => s + e.dealsClosed, 0);
                const totalUnits = memberEntries.reduce((s, e) => s + e.unitsSold, 0);
                return (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Total Revenue", value: formatCurrency(totalRevenue, sym), icon: DollarSign },
                        { label: "Total Deals", value: totalDeals, icon: Handshake },
                        { label: "Total Entries", value: memberEntries.length, icon: FileText },
                      ].map(({ label, value, icon: Icon }) => (
                        <div className="bg-white border border-gray-200 rounded-none p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300" key={label}>
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                              <p className="text-2xl font-sans font-bold text-primary tracking-tight mt-1">{value}</p>
                            </div>
                            <div className="w-8 h-8 border border-gray-200 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Card className="bg-white border border-gray-200 rounded-none shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm font-sans" data-testid="table-employee-report">
                          <thead>
                            <tr className="border-b border-gray-200 text-xs text-muted-foreground uppercase tracking-wide bg-gray-50/50">
                              <th className="px-4 py-3 text-left">Date</th>
                              <th className="px-4 py-3 text-left">Vertical</th>
                              <th className="px-4 py-3 text-right">Revenue</th>
                              <th className="px-4 py-3 text-right">Deals</th>
                              <th className="px-4 py-3 text-right">Units</th>
                              <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberEntries.slice(0, 60).map(e => {
                              const vertical = verticals.find(v => v.id === e.verticalId);
                              return (
                                <tr key={e.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50/50 transition-colors">
                                  <td className="px-4 py-3">{e.entryDate}</td>
                                  <td className="px-4 py-3">{vertical ? <Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5">{vertical.name}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                                  <td className="px-4 py-3 text-right text-primary font-semibold">{e.revenueAmount > 0 ? formatCurrency(e.revenueAmount, sym) : "—"}</td>
                                  <td className="px-4 py-3 text-right text-accent font-semibold">{e.dealsClosed > 0 ? e.dealsClosed : "—"}</td>
                                  <td className="px-4 py-3 text-right text-gray-800 font-semibold">{e.unitsSold > 0 ? e.unitsSold : "—"}</td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge className={cn("text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5", e.status === "reviewed" ? "bg-green-50 border-green-200 text-green-600" : "bg-amber-50 border-amber-200 text-amber-600")}>{e.status}</Badge>
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
              <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-gray-200 p-4 rounded-none shadow-sm">
                <div>
                  <p className="font-sans font-bold text-primary text-sm uppercase tracking-wider">🪔 Festival Season Report</p>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">Analyze performance during any peak festival window</p>
                </div>
                <Button
                  onClick={exportFestivalCSV}
                  className="rounded-none border border-gray-200 bg-white hover:bg-gray-50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider h-8 shadow-none animate-none"
                  data-testid="button-export-festival"
                >
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
              <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 p-4 rounded-none shadow-sm">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">Season window:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={festivalFrom}
                    onChange={e => setFestivalFrom(e.target.value)}
                    className="w-36 rounded-none border-gray-200 bg-white focus-visible:ring-0 focus-visible:border-accent text-xs h-8"
                    data-testid="input-festival-from"
                  />
                  <span className="text-xs text-muted-foreground font-sans">to</span>
                  <Input
                    type="date"
                    value={festivalTo}
                    onChange={e => setFestivalTo(e.target.value)}
                    className="w-36 rounded-none border-gray-200 bg-white focus-visible:ring-0 focus-visible:border-accent text-xs h-8"
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
                      className="text-xs px-2 py-1 rounded-none border border-gray-200 hover:border-accent hover:bg-primary/5 transition-all font-sans text-primary"
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
                <Card className="p-10 text-center bg-white border border-gray-200 rounded-none shadow-sm">
                  <span className="text-4xl mb-3 block">🪔</span>
                  <p className="font-sans font-bold text-primary uppercase text-sm mb-1 tracking-wider">No festival season data yet</p>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">EOD entries from Oct 1 to Nov 15 will appear here for season analysis.</p>
                </Card>
              ) : (() => {
                const totalRevenue = festivalEntries.reduce((s, e) => s + e.revenueAmount, 0);
                const totalDeals = festivalEntries.reduce((s, e) => s + e.dealsClosed, 0);
                const byMember: Record<string, number> = {};
                for (const e of festivalEntries) {
                  const mId = e.memberId || "unknown";
                  byMember[mId] = (byMember[mId] ?? 0) + e.revenueAmount;
                }
                const topPerformer = Object.entries(byMember).sort(([, a], [, b]) => b - a)[0];
                const topMember = topPerformer ? members.find(m => m.id === topPerformer[0]) : null;

                return (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Season Revenue", value: formatCurrency(totalRevenue, sym), icon: DollarSign },
                        { label: "Season Deals", value: totalDeals, icon: Handshake },
                        { label: "Top Performer", value: topMember?.name || topMember?.email || "—", icon: Users },
                      ].map(({ label, value, icon: Icon }) => (
                        <div className="bg-white border border-gray-200 rounded-none p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300" key={label}>
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 min-w-0 flex-1">
                              <p className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                              <p className="text-2xl font-sans font-bold text-primary tracking-tight mt-1 truncate">{value}</p>
                            </div>
                            <div className="w-8 h-8 border border-gray-200 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      ))}
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
                        <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm">
                          <p className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.2em] mb-3">Daily Revenue — Festival Window</p>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatCurrency(v, sym)} />
                              <Tooltip formatter={(v: number) => formatCurrency(v, sym)} contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 12 }} />
                              <ReferenceLine y={avgRevPerDay} stroke="#c59b43" strokeDasharray="4 2" label={{ value: "Avg", position: "insideTopRight", fontSize: 10, fill: "#c59b43" }} />
                              <Bar dataKey="Revenue" fill="#13322b" radius={[0, 0, 0, 0]} fillOpacity={0.85} />
                            </BarChart>
                          </ResponsiveContainer>
                          <p className="text-xs text-muted-foreground mt-2 font-sans">Avg daily revenue: {formatCurrency(Math.round(avgRevPerDay), sym)} · Dashed line = daily average baseline</p>
                        </Card>
                      );
                    })()}

                    {/* Member revenue distribution chart */}
                    {festivalEntries.length > 0 && (() => {
                      const memberRevMap: Record<string, { name: string; Revenue: number }> = {};
                      for (const e of festivalEntries) {
                        const mId = e.memberId || "unknown";
                        const member = members.find(m => m.id === mId);
                        const name = member?.name || member?.email?.split("@")[0] || mId.slice(0, 8);
                        if (!memberRevMap[mId]) memberRevMap[mId] = { name, Revenue: 0 };
                        memberRevMap[mId].Revenue += e.revenueAmount;
                      }
                      const memberData = Object.values(memberRevMap).sort((a, b) => b.Revenue - a.Revenue);
                      return (
                        <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm">
                          <p className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.2em] mb-3">Revenue by Member — Festival Window</p>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={memberData} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatCurrency(v, sym)} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={60} />
                              <Tooltip formatter={(v: number) => formatCurrency(v, sym)} contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 12 }} />
                              <Bar dataKey="Revenue" fill="#13322b" radius={[0, 0, 0, 0]} fillOpacity={0.85} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Card>
                      );
                    })()}

                    <Card className="bg-white border border-gray-200 rounded-none shadow-sm">
                      <div className="text-xs font-bold text-accent uppercase tracking-[0.25em] px-5 pt-4 pb-2 font-sans">Daily Entries — Diwali Season</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm font-sans" data-testid="table-festival-report">
                          <thead>
                            <tr className="border-b border-gray-200 text-xs text-muted-foreground uppercase tracking-wide bg-gray-50/50">
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
                                <tr key={e.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50/50 transition-colors">
                                  <td className="px-4 py-2">{e.entryDate}</td>
                                  <td className="px-4 py-2 font-semibold text-primary">{member?.name || member?.email || "—"}</td>
                                  <td className="px-4 py-2 text-right text-primary font-semibold">{e.revenueAmount > 0 ? formatCurrency(e.revenueAmount, sym) : "—"}</td>
                                  <td className="px-4 py-2 text-right text-accent font-semibold">{e.dealsClosed > 0 ? e.dealsClosed : "—"}</td>
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
      <DialogContent className="max-w-md rounded-none border border-gray-200 bg-white" data-testid="dialog-share-report">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-sans font-bold uppercase tracking-wider text-primary text-sm">
            <Share2 className="w-4 h-4 text-accent" /> Share {REPORT_TYPES.find(r => r.id === activeReport)?.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2 font-sans">
          <p className="text-xs text-muted-foreground leading-relaxed font-sans">
            Generate a read-only shareable link for this report. <span className="font-semibold text-primary">Anyone with the link can view the report</span> — no login required. The link is token-based and scoped to this specific report view.
          </p>
          {generatedShareLink ? (
            <>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-none px-3 py-2">
                <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{generatedShareLink}</span>
                <Button size="sm" variant="ghost" className="shrink-0 h-7 px-2 hover:bg-gray-100 rounded-none" onClick={copyShareLink} data-testid="button-copy-share-link">
                  {shareLinkCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                </Button>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-wider text-xs h-10 shadow-none" onClick={copyShareLink} data-testid="button-share-copy-main">
                {shareLinkCopied ? <><Check className="w-4 h-4 mr-2" /> Copied!</> : <><Copy className="w-4 h-4 mr-2" /> Copy Link</>}
              </Button>
            </>
          ) : (
            <Button
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-wider text-xs h-10 shadow-none"
              onClick={generateShareLink}
              disabled={shareLoading}
              data-testid="button-generate-share-link"
            >
              {shareLoading ? "Generating..." : <><Share2 className="w-4 h-4 mr-2" /> Generate Share Link</>}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-none border border-gray-200 hover:bg-gray-50 text-[10px] font-bold uppercase tracking-wider h-9" onClick={printReport} data-testid="button-share-print">
              <Printer className="w-4 h-4 mr-1 text-muted-foreground" /> Print / Save PDF
            </Button>
            <Button variant="outline" className="flex-1 rounded-none border border-gray-200 hover:bg-gray-50 text-[10px] font-bold uppercase tracking-wider h-9" onClick={exportPDF} data-testid="button-share-export-pdf">
              <Download className="w-4 h-4 mr-1 text-muted-foreground" /> Export PDF
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground italic leading-normal">
            Each link is unique and token-protected. Only business owners and managers can access it.
          </p>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
