import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Building2, Users, Wrench } from "lucide-react";
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
    <div className="min-h-screen bg-background flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                Business Settings
              </h1>
              <p className="text-xs text-muted-foreground capitalize">
                {profile?.name || "Business"} · {profile?.industryLabel || "Settings"}
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-6 w-full">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-500" />
                  Business Profile & Configuration
                </h2>
                <p className="text-sm text-muted-foreground">
                  Update business name, industry, verticals, targets, salary setup, and workspace configuration.
                </p>
              </div>
              <Button
                onClick={() => navigate("/business/setup")}
                className="bg-amber-500 hover:bg-amber-600 text-black"
                data-testid="button-open-setup-wizard"
              >
                Open Setup Wizard
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  Team & Access
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage team members, roles, and invites for your business workspace.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/business/team")} data-testid="button-manage-team-settings">
                Manage Team
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-500" />
                  Operational Controls
                </h2>
                <p className="text-sm text-muted-foreground">
                  Configure advanced controls for targets, incentive logic, and operating preferences.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/business/setup")} data-testid="button-operational-controls">
                Configure
              </Button>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
