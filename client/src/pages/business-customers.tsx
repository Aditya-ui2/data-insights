import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserPlus,
  UserMinus,
  TrendingUp,
  Search,
  Building2,
  Calendar,
  DollarSign
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import BusinessSidebar from "@/components/business-sidebar";
import { cn } from "@/lib/utils";

interface BusinessProfile {
  id: string;
  name: string;
  currencySymbol: string;
  memberRole: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  status: "active" | "inactive" | "new";
  lifetimeValue: number;
  totalDeals: number;
  growthRate: number;
  lastActiveDate: string;
}

interface CustomerStats {
  total: number;
  active: number;
  newThisMonth: number;
  lostThisMonth: number;
  topSharePercent: number;
  growthTrends: { period: string; newCustomers: number; activeCustomers: number }[];
  customersList: Customer[];
}

export default function BusinessCustomersPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: profile } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  const { data: stats, isLoading } = useQuery<CustomerStats>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customer data");
      return res.json();
    }
  });

  const currencySymbol = profile?.currencySymbol ?? "₹";

  const filteredCustomers = stats?.customersList.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <BusinessSidebar />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
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
                <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider">
                  Customer Intelligence
                </h1>
                <p className="text-xs text-muted-foreground">
                  {profile?.name || "Business Suite"} · Performance &amp; Retention
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8 space-y-8 w-full">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-primary mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/80">Total Customers</span>
                <Users className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary font-sans leading-none">{stats?.total || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Lifetime unique accounts</p>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-primary mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/80">Active Customers</span>
                <UserCheck className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary font-sans leading-none">{stats?.active || 0}</p>
                <p className="text-[10px] text-green-600 font-semibold mt-1">
                  {stats && stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% Active Engagement
                </p>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-primary mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/80">Growth (This Month)</span>
                <div className="flex gap-1 items-center">
                  <UserPlus className="w-3.5 h-3.5 text-accent" />
                  <UserMinus className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary font-sans leading-none">
                  +{stats?.newThisMonth || 0} / -{stats?.lostThisMonth || 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Net growth: {stats ? stats.newThisMonth - stats.lostThisMonth : 0} customers
                </p>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-primary mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/80">Concentration Risk</span>
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary font-sans leading-none">{stats?.topSharePercent || 0}%</p>
                <p className="text-[10px] text-muted-foreground mt-1">Top 3 accounts revenue share</p>
              </div>
            </Card>
          </div>

          {/* Retention and Growth Chart */}
          <Card className="p-5 bg-white border border-gray-200 rounded-none shadow-sm">
            <h2 className="text-sm font-sans font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent" /> Customer Base &amp; Growth Trends
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.growthTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fontFamily: "sans-serif" }} stroke="#888888" />
                  <YAxis tick={{ fontSize: 10, fontFamily: "sans-serif" }} stroke="#888888" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", fontFamily: "sans-serif", borderRadius: 0 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "sans-serif" }} />
                  <Line
                    type="monotone"
                    dataKey="activeCustomers"
                    name="Active Customers"
                    stroke="#13322b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="newCustomers"
                    name="New Additions"
                    stroke="#d4af37"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Customer Intelligence Table */}
          <Card className="p-5 bg-white border border-gray-200 rounded-none shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-sm font-sans font-bold text-primary uppercase tracking-wider">Top Accounts Analysis</h2>
                <p className="text-xs text-muted-foreground">List of premium client operations, sales volume, and churn risk.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Search client database..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 rounded-none border-gray-250 text-xs font-sans shadow-none focus:border-accent"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 uppercase text-[10px] tracking-wider text-muted-foreground font-bold">
                    <th className="p-3">Customer / Company</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Lifetime Value</th>
                    <th className="p-3 text-right">Total Deals</th>
                    <th className="p-3 text-right">Growth Rate</th>
                    <th className="p-3 text-right">Last Interaction</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No customer accounts found matching search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => (
                      <tr key={cust.id} className="border-b border-gray-150 hover:bg-gray-50/50 transition-colors">
                        <td className="p-3">
                          <p className="font-semibold text-primary">{cust.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {cust.company} · {cust.email}
                          </p>
                        </td>
                        <td className="p-3">
                          <Badge
                            className={cn(
                              "text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5",
                              cust.status === "active" && "bg-green-50 text-green-600 border-green-200 hover:bg-green-50",
                              cust.status === "new" && "bg-amber-50 text-accent border-accent/25 hover:bg-amber-50",
                              cust.status === "inactive" && "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-100"
                            )}
                          >
                            {cust.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-sans font-medium text-primary">
                          {currencySymbol}{(cust.lifetimeValue / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-primary font-medium">{cust.totalDeals}</td>
                        <td className="p-3 text-right text-primary font-medium">
                          <span className={cn(cust.growthRate >= 0 ? "text-green-600" : "text-red-500")}>
                            {cust.growthRate >= 0 ? "+" : ""}{cust.growthRate}%
                          </span>
                        </td>
                        <td className="p-3 text-right text-muted-foreground text-[10px] font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground/50" />
                            {cust.lastActiveDate}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
