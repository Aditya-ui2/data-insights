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
    <div className="bg-white border border-gray-200 rounded-none p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
      <p className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="text-xl font-sans font-bold text-primary tracking-tight mt-1">{value}</p>
    </div>
  );
}

function TeamTable({ rows, sym }: { rows: TeamRow[]; sym: string }) {
  return (
    <div className="overflow-x-auto bg-white border border-gray-200 rounded-none shadow-sm">
      <table className="w-full text-sm font-sans">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-muted-foreground uppercase tracking-wide bg-gray-50/50">
            <th className="text-left px-4 py-3 font-semibold">Member</th>
            <th className="text-right px-4 py-3 font-semibold">Revenue</th>
            <th className="text-right px-4 py-3 font-semibold">Units</th>
            <th className="text-right px-4 py-3 font-semibold">Deals</th>
            <th className="text-right px-4 py-3 font-semibold">Achievement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.memberId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 font-semibold text-primary">{r.memberName}</td>
              <td className="px-4 py-3 text-right text-primary font-semibold">{sym}{r.totalRevenue.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-gray-800 font-medium">{r.totalUnits}</td>
              <td className="px-4 py-3 text-right text-accent font-medium">{r.totalDeals}</td>
              <td className="px-4 py-3 text-right font-bold text-primary">{r.achievementPercent.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EodTable({ rows, sym }: { rows: EodRow[]; sym: string }) {
  return (
    <div className="overflow-x-auto bg-white border border-gray-200 rounded-none shadow-sm">
      <table className="w-full text-sm font-sans">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-muted-foreground uppercase tracking-wide bg-gray-50/50">
            <th className="text-left px-4 py-3 font-semibold">Date</th>
            <th className="text-left px-4 py-3 font-semibold">Member</th>
            <th className="text-right px-4 py-3 font-semibold">Revenue</th>
            <th className="text-right px-4 py-3 font-semibold">Expenses</th>
            <th className="text-left px-4 py-3 font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 text-muted-foreground">{e.entryDate}</td>
              <td className="px-4 py-3 font-semibold text-primary">{e.memberName}</td>
              <td className="px-4 py-3 text-right text-primary font-semibold">{sym}{(e.revenue ?? 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-red-600 font-semibold">{sym}{(e.expenses ?? 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-muted-foreground text-xs italic">{e.notes ?? ""}</td>
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
    monthly: "Monthly Performance Report",
    ytd: "Indian FY Year-to-Date Report",
    daily: "EOD Daily Summary",
    weekly: "Weekly Recap Report",
    employee: "Individual Team Member Report",
    festival: "Festival Season Analysis Report",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="font-sans text-xs uppercase tracking-wider font-semibold">Loading shared report…</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center p-6">
        <Card className="max-w-sm w-full p-8 text-center space-y-4 bg-white border border-gray-200 rounded-none shadow-sm">
          <AlertCircle className="w-10 h-10 mx-auto text-destructive" />
          <h2 className="text-lg font-sans font-bold text-primary uppercase tracking-wider">Report Not Found</h2>
          <p className="text-xs text-muted-foreground">This share link may be expired or invalid.</p>
        </Card>
      </div>
    );
  }

  const { reportType, businessName, businessIndustry, currencySymbol: sym, createdAt } = data;
  const d = data.data;

  return (
    <div className="min-h-screen bg-[#fbfaf7]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-primary uppercase tracking-wider leading-tight">{businessName}</h1>
            <p className="text-xs text-muted-foreground">{businessIndustry} · {REPORT_LABELS[reportType] ?? reportType}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-sans">Read-only · Shared report</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Shared report notice */}
        <div className="bg-sidebar border border-sidebar-border rounded-none px-4 py-3 text-xs text-muted-foreground font-sans">
          This is a <span className="font-semibold text-primary">read-only shared report</span> from <span className="font-semibold text-primary">{businessName}</span>. Data is presented as of the time this link was created.
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
                <BarChart3 className="w-5 h-5 text-accent" />
                <h2 className="font-sans font-bold text-base text-primary uppercase tracking-wider">{REPORT_LABELS[reportType]} · {period}</h2>
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
                <TrendingUp className="w-5 h-5 text-accent" />
                <h2 className="font-sans font-bold text-base text-primary uppercase tracking-wider">{REPORT_LABELS[reportType]} · {periodLabel}</h2>
                {reportType === "employee" && (
                  <span className="text-xs text-muted-foreground font-sans ml-2">
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
                <div className="text-center py-12 text-muted-foreground rounded-none border border-dashed border-gray-200 bg-white">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-accent" />
                  <p className="font-sans text-xs uppercase tracking-wider">No entries found for this period.</p>
                </div>
              )}
            </>
          );
        })()}

        <p className="text-[10px] text-center text-muted-foreground pt-4 border-t border-gray-200 uppercase tracking-widest font-sans">
          Generated by DataInsights v2.0 · AI-Powered Business Analytics · Shared {new Date(createdAt).toLocaleDateString()}
        </p>
      </main>
    </div>
  );
}
