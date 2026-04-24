import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BarChart3,
  Settings,
  User,
  LogOut,
  Palette,
  Info,
  Upload,
} from "lucide-react";
import { logOut } from "@/lib/firebase";
import BusinessSidebar from "@/components/business-sidebar";
import SheetSelector from "@/components/sheet-selector";
import { getCurrentFY } from "@/lib/festivalCalendar";

interface BusinessProfile {
  id: string;
  name: string;
  industryLabel: string;
  memberRole: string;
}

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

function FYContextBadge() {
  const fy = getCurrentFY();
  return (
    <Badge variant="secondary" className="text-xs font-normal gap-1.5" data-testid="badge-fy-context-data-import">
      <span className="opacity-60">📅</span>
      {fy.label} · Month {fy.monthInFY} of 12
    </Badge>
  );
}

export default function DataImportSuitePage() {
  const [, navigate] = useLocation();

  const { data: profile } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
  });

  return (
    <div className="min-h-screen bg-background flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" />
                Data Import Suite
              </h1>
              <p className="text-xs text-muted-foreground capitalize">
                {profile?.name || "Business"} · {profile?.memberRole || "owner"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <FYContextBadge />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/home")}
                data-testid="button-analytics-data-import"
              >
                <BarChart3 className="w-4 h-4 mr-1" /> Analytics
              </Button>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-border/70 bg-card/80 hover:bg-muted/70"
                    data-testid="button-business-profile-menu-data-import"
                  >
                    <Avatar className="w-8 h-8 ring-1 ring-cyan-400/40">
                      <AvatarImage src={user?.profileImageUrl ?? undefined} />
                      <AvatarFallback className="bg-cyan-600 text-white font-semibold">
                        {user?.firstName?.[0] ?? user?.email?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/business/settings")} data-testid="menu-business-settings-data-import">
                    <Settings className="w-4 h-4 mr-2" />
                    Business Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/business/team")} data-testid="menu-business-team-data-import">
                    <User className="w-4 h-4 mr-2" />
                    Manage Team
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/home")} data-testid="menu-analytics-data-import">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics Home
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem data-testid="menu-theme-data-import">
                    <Palette className="w-4 h-4 mr-2" />
                    Appearance
                  </DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-about-data-import">
                    <Info className="w-4 h-4 mr-2" />
                    About DataInsights
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logOut();
                      window.location.href = "/";
                    }}
                    data-testid="menu-business-logout-data-import"
                    className="text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8 w-full">
          <SheetSelector onDashboardCreated={(dashboardId) => navigate(`/home`)} />
        </main>
      </div>
    </div>
  );
}
