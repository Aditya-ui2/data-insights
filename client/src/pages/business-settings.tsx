import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Building2, Users, Wrench, ArrowLeft } from "lucide-react";
import BusinessSidebar from "@/components/business-sidebar";

interface BusinessProfile {
  id: string;
  name: string;
  industryLabel: string;
  memberRole: string;
}

export default function BusinessSettingsPage() {
  const [, navigate] = useLocation();

  const { data: profile, isLoading } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <BusinessSidebar />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
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
                <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-5 h-5 text-accent" />
                  Business Settings
                </h1>
                <p className="text-xs text-muted-foreground">
                  {profile?.name || "Business Suite"} · Setup &amp; Configuration Preferences
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-6 w-full">
          <Card className="p-6 bg-white border border-gray-200 rounded-none shadow-sm">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-sans font-bold text-primary text-sm uppercase tracking-tight flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-accent" />
                  Business Profile &amp; Configuration
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Update business name, industry, verticals, targets, salary setup, and workspace configuration.
                </p>
              </div>
              <Button
                onClick={() => navigate("/business/setup")}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-wider text-xs px-4 h-9 shadow-none shrink-0"
                data-testid="button-open-setup-wizard"
              >
                Open Setup Wizard
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200 rounded-none shadow-sm">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-sans font-bold text-primary text-sm uppercase tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  Team &amp; Access
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Manage team members, roles, and invites for your business workspace.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate("/business/team")} 
                className="rounded-none border-gray-250 text-muted-foreground text-[10px] font-bold uppercase tracking-wider h-8 px-4 hover:bg-gray-50 shrink-0"
                data-testid="button-manage-team-settings"
              >
                Manage Team
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200 rounded-none shadow-sm">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-sans font-bold text-primary text-sm uppercase tracking-tight flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-accent" />
                  Operational Controls
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configure advanced controls for targets, incentive logic, and operating preferences.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate("/business/setup")} 
                className="rounded-none border-gray-250 text-muted-foreground text-[10px] font-bold uppercase tracking-wider h-8 px-4 hover:bg-gray-50 shrink-0"
                data-testid="button-operational-controls"
              >
                Configure
              </Button>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
