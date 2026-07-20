import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  Play
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BusinessSidebar from "@/components/business-sidebar";
import { cn } from "@/lib/utils";

interface BusinessProfile {
  id: string;
  name: string;
  memberRole: string;
}

interface BusinessAlert {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  category: "revenue" | "teams" | "customers" | "tasks";
  createdAt: string;
  recommendedAction: string;
  actionRoute?: string;
  isResolved: boolean;
}

export default function BusinessAlertsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: profile } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  const { data: alerts = [], isLoading, refetch } = useQuery<BusinessAlert[]>({
    queryKey: ["/api/alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    }
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await apiRequest("PATCH", `/api/alerts/${alertId}`, { isResolved: true });
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Alert resolved!" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to resolve alert", description: err.message, variant: "destructive" });
    }
  });

  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity !== "all" && alert.severity !== filterSeverity) return false;
    if (filterCategory !== "all" && alert.category !== filterCategory) return false;
    return !alert.isResolved;
  });

  const getSeverityStyles = (severity: BusinessAlert["severity"]) => {
    switch (severity) {
      case "high":
        return {
          bg: "bg-red-50 border-red-200 text-red-600",
          icon: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        };
      case "medium":
        return {
          bg: "bg-amber-50 border-amber-200 text-amber-600",
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
        };
      case "low":
        return {
          bg: "bg-blue-50 border-blue-200 text-blue-600",
          icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <BusinessSidebar />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
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
                  Proactive Alerts
                </h1>
                <p className="text-xs text-muted-foreground">
                  {profile?.name || "Business Suite"} · Business Health Risk Control
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-6 w-full">
          {/* Filters Area */}
          <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider mr-2">
              <Filter className="w-4 h-4 text-accent" />
              <span>Filters</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground/80">Severity:</span>
              <div className="flex gap-1">
                {["all", "high", "medium", "low"].map(sev => (
                  <Button
                    key={sev}
                    variant={filterSeverity === sev ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterSeverity(sev)}
                    className={cn(
                      "h-7 rounded-none px-2.5 text-[10px] font-sans font-bold uppercase tracking-wider",
                      filterSeverity === sev
                        ? "bg-primary text-primary-foreground hover:bg-primary"
                        : "bg-white border-gray-250 text-muted-foreground hover:bg-gray-50"
                    )}
                  >
                    {sev}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground/80">Category:</span>
              <div className="flex gap-1">
                {["all", "revenue", "teams", "customers", "tasks"].map(cat => (
                  <Button
                    key={cat}
                    variant={filterCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterCategory(cat)}
                    className={cn(
                      "h-7 rounded-none px-2.5 text-[10px] font-sans font-bold uppercase tracking-wider",
                      filterCategory === cat
                        ? "bg-primary text-primary-foreground hover:bg-primary"
                        : "bg-white border-gray-250 text-muted-foreground hover:bg-gray-50"
                    )}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          {/* Alerts Feed */}
          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <Card className="p-8 text-center bg-white border border-gray-200 rounded-none shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-sans font-bold text-primary text-sm uppercase tracking-wider">All Systems Operational</p>
                <p className="text-xs text-muted-foreground mt-1">No pending anomalies or business growth risk alerts identified.</p>
              </Card>
            ) : (
              filteredAlerts.map(alert => {
                const styles = getSeverityStyles(alert.severity);
                return (
                  <Card
                    key={alert.id}
                    className="p-5 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start"
                  >
                    <div className="flex gap-3 items-start min-w-0">
                      <div className="mt-0.5">{styles.icon}</div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={cn(
                              "text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5",
                              styles.bg
                            )}
                          >
                            {alert.severity}
                          </Badge>
                          <Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5">
                            {alert.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-sans">
                            {alert.createdAt}
                          </span>
                        </div>
                        <h3 className="font-sans font-bold text-primary text-sm uppercase tracking-tight">
                          {alert.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {alert.description}
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 flex flex-row sm:flex-col gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 justify-end">
                      <Button
                        size="sm"
                        onClick={() => resolveAlertMutation.mutate(alert.id)}
                        className="rounded-none border border-gray-200 bg-white hover:bg-gray-50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider h-8"
                      >
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => alert.actionRoute && navigate(alert.actionRoute)}
                        className="rounded-none bg-primary hover:bg-primary/95 text-primary-foreground text-[10px] font-bold uppercase tracking-wider h-8 px-3.5 flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" /> Take Action
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
