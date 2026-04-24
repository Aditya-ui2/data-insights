import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Building2, BarChart3, TrendingUp, Users, AlertCircle, Loader2, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SharedReportPayload {
  reportType: string;
  reportParams: Record<string, string>;
  businessName: string;
  businessIndustry: string;
  currencySymbol: string;
  createdAt: string;
  data: Record<string, unknown>;
}

interface TeamRow {
  memberId: string;
  memberName: string;
  totalRevenue: number;
  totalExpenses: number;
  totalUnits: number;
  totalDeals: number;
  achievementPercent: number;
}

interface EodRow {
  id: string;
  entryDate: string;
  memberName: string;
  revenue: number;
  expenses: number;
  notes?: string;
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-amber-500">{value}</p>
    </div>
  );
}

function TeamTable({ rows, sym }: { rows: TeamRow[]; sym: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-amber-500/10 border-b border-border">
            <th className="text-left px-4 py-2 font-semibold">Member</th>
            <th className="text-right px-4 py-2 font-semibold">Revenue</th>
            <th className="text-right px-4 py-2 font-semibold">Units</th>
            <th className="text-right px-4 py-2 font-semibold">Deals</th>
            <th className="text-right px-4 py-2 font-semibold">Achievement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.memberId} className={i % 2 === 0 ? "bg-muted/30" : ""}>
              <td className="px-4 py-2">{r.memberName}</td>
              <td className="px-4 py-2 text-right">{sym}{r.totalRevenue.toLocaleString()}</td>
              <td className="px-4 py-2 text-right">{r.totalUnits}</td>
              <td className="px-4 py-2 text-right">{r.totalDeals}</td>
              <td className="px-4 py-2 text-right font-medium">{r.achievementPercent.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EodTable({ rows, sym }: { rows: EodRow[]; sym: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-amber-500/10 border-b border-border">
            <th className="text-left px-4 py-2 font-semibold">Date</th>
            <th className="text-left px-4 py-2 font-semibold">Member</th>
            <th className="text-right px-4 py-2 font-semibold">Revenue</th>
            <th className="text-right px-4 py-2 font-semibold">Expenses</th>
            <th className="text-left px-4 py-2 font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => (
            <tr key={e.id} className={i % 2 === 0 ? "bg-muted/30" : ""}>
              <td className="px-4 py-2 text-muted-foreground">{e.entryDate}</td>
              <td className="px-4 py-2">{e.memberName}</td>
              <td className="px-4 py-2 text-right">{sym}{(e.revenue ?? 0).toLocaleString()}</td>
              <td className="px-4 py-2 text-right">{sym}{(e.expenses ?? 0).toLocaleString()}</td>
              <td className="px-4 py-2 text-muted-foreground text-xs">{e.notes ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SharedBusinessReport() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data, isLoading, isError } = useQuery<SharedReportPayload>({
    queryKey: ["/api/business/reports/shared", token, "data"],
    queryFn: async () => {
      const res = await fetch(`/api/business/reports/shared/${token}/data`);
      if (!res.ok) throw new Error("Report not found");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const REPORT_LABELS: Record<string, string> = {
    monthly: "Monthly Report",
    ytd: "Year-to-Date Report",
    daily: "Daily Summary",
    weekly: "Weekly Recap",
    employee: "Employee Report",
    festival: "Festival Season Report",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p>Loading shared report…</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-sm w-full p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 mx-auto text-destructive" />
          <h2 className="text-lg font-semibold">Report Not Found</h2>
          <p className="text-sm text-muted-foreground">This share link may be expired or invalid.</p>
        </Card>
      </div>
    );
  }

  const { reportType, businessName, businessIndustry, currencySymbol: sym, createdAt } = data;
  const d = data.data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">{businessName}</h1>
            <p className="text-xs text-muted-foreground">{businessIndustry} · {REPORT_LABELS[reportType] ?? reportType}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span>Read-only · Shared report</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Shared report notice */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-muted-foreground">
          This is a <span className="font-medium text-foreground">read-only shared report</span> from <span className="font-medium text-foreground">{businessName}</span>. Data is presented as of the time this link was created.
        </div>

        {/* MONTHLY / YTD — Team performance table */}
        {(reportType === "monthly" || reportType === "ytd") && (() => {
          const teamPerf = (reportType === "monthly" ? (d as { teamPerf: TeamRow[] }).teamPerf : (d as { ytdRows: TeamRow[] }).ytdRows) ?? [];
          const totalRevenue: number = (d as { totalRevenue: number }).totalRevenue ?? 0;
          const totalExpenses: number = (d as { totalExpenses: number }).totalExpenses ?? 0;
          const avgAch: number = (d as { avgAch: number }).avgAch ?? 0;
          const period = reportType === "monthly"
            ? (d as { period: string }).period
            : `FY ${(d as { fyStartYear: number }).fyStartYear}–${((d as { fyStartYear: number }).fyStartYear ?? 0) + 1}`;
          return (
            <>
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold">{REPORT_LABELS[reportType]} · {period}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="Total Revenue" value={`${sym}${totalRevenue.toLocaleString()}`} />
                <KpiCard label="Total Expenses" value={`${sym}${totalExpenses.toLocaleString()}`} />
                <KpiCard label="Team Members" value={String(teamPerf.length)} />
                <KpiCard label="Avg Achievement" value={`${avgAch.toFixed(0)}%`} />
              </div>
              <TeamTable rows={teamPerf} sym={sym} />
            </>
          );
        })()}

        {/* DAILY / WEEKLY / FESTIVAL / EMPLOYEE — EOD entries */}
        {(reportType === "daily" || reportType === "weekly" || reportType === "festival" || reportType === "employee") && (() => {
          const entries: EodRow[] = (d as { entries: EodRow[] }).entries ?? [];
          let rev = 0, exp = 0, periodLabel = "";
          if (reportType === "daily") {
            rev = (d as { dayRev: number }).dayRev ?? 0;
            exp = (d as { dayExp: number }).dayExp ?? 0;
            periodLabel = (d as { dateStr: string }).dateStr ?? "";
          } else if (reportType === "weekly") {
            rev = (d as { wkRev: number }).wkRev ?? 0;
            exp = (d as { wkExp: number }).wkExp ?? 0;
            periodLabel = `${(d as { fromDate: string }).fromDate} → ${(d as { toDate: string }).toDate}`;
          } else if (reportType === "festival") {
            rev = (d as { festRev: number }).festRev ?? 0;
            exp = (d as { festExp: number }).festExp ?? 0;
            periodLabel = `${(d as { fromDate: string }).fromDate} → ${(d as { toDate: string }).toDate}`;
          } else if (reportType === "employee") {
            rev = (d as { empRev: number }).empRev ?? 0;
            exp = (d as { empExp: number }).empExp ?? 0;
            const fyStart = (d as { fyStart: number }).fyStart;
            periodLabel = `FY ${fyStart}–${(fyStart ?? 0) + 1}`;
          }
          return (
            <>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold">{REPORT_LABELS[reportType]} · {periodLabel}</h2>
                {reportType === "employee" && (
                  <span className="text-sm text-muted-foreground">
                    — {(d as { memberName: string }).memberName}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="Total Revenue" value={`${sym}${rev.toLocaleString()}`} />
                <KpiCard label="Total Expenses" value={`${sym}${exp.toLocaleString()}`} />
                <KpiCard label="Net" value={`${sym}${(rev - exp).toLocaleString()}`} />
                <KpiCard label="EOD Entries" value={String(entries.length)} />
              </div>
              {entries.length > 0 ? (
                <EodTable rows={entries} sym={sym} />
              ) : (
                <div className="text-center py-12 text-muted-foreground rounded-xl border border-dashed border-border">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No entries found for this period.</p>
                </div>
              )}
            </>
          );
        })()}

        <p className="text-xs text-center text-muted-foreground pt-4 border-t border-border">
          Generated by DataInsights v2.0 · AI-Powered Business Analytics · Shared {new Date(createdAt).toLocaleDateString()}
        </p>
      </main>
    </div>
  );
}
