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
    <span className="flex items-center text-[10px] font-sans font-bold uppercase tracking-wider text-primary border border-gray-200 px-3 py-1.5 bg-white rounded-none shrink-0 shadow-sm" data-testid="badge-fy-context-data-import">
      <span className="font-extrabold text-primary">FY {fy.label}</span>
      <span className="text-gray-350 mx-2 font-light">|</span>
      <span className="text-accent font-extrabold">Month {fy.monthInFY} of 12</span>
    </span>
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
    <div className="min-h-screen bg-[#fbfaf7] flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-5 h-5 text-accent" />
                Data Import Suite
              </h1>
              <p className="text-xs text-muted-foreground capitalize font-sans">
                {profile?.name || "Business"} · {profile?.memberRole || "owner"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <FYContextBadge />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/home")}
                className="rounded-none border border-gray-200 text-muted-foreground hover:bg-gray-50 text-[10px] font-sans font-bold uppercase tracking-wider h-8 px-3"
                data-testid="button-analytics-data-import"
              >
                <BarChart3 className="w-4 h-4 mr-1.5 text-accent" /> Analytics
              </Button>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none border border-gray-200 bg-white hover:bg-gray-50 shadow-none shrink-0"
                    data-testid="button-business-profile-menu-data-import"
                  >
                    <Avatar className="w-7 h-7 rounded-none">
                      <AvatarImage src={user?.profileImageUrl ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs rounded-none">
                        {user?.firstName?.[0] ?? user?.email?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-none border border-gray-200 bg-white font-sans text-xs">
                  <DropdownMenuLabel className="font-sans font-bold text-primary text-[10px] uppercase tracking-wide px-3 py-2">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={() => navigate("/business/settings")} className="hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans py-2 px-3 text-muted-foreground hover:text-primary" data-testid="menu-business-settings-data-import">
                    <Settings className="w-4 h-4 mr-2 text-accent" />
                    Business Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/business/team")} className="hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans py-2 px-3 text-muted-foreground hover:text-primary" data-testid="menu-business-team-data-import">
                    <User className="w-4 h-4 mr-2 text-accent" />
                    Manage Team
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/home")} className="hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans py-2 px-3 text-muted-foreground hover:text-primary" data-testid="menu-analytics-data-import">
                    <BarChart3 className="w-4 h-4 mr-2 text-accent" />
                    Analytics Home
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem className="hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans py-2 px-3 text-muted-foreground hover:text-primary" data-testid="menu-theme-data-import">
                    <Palette className="w-4 h-4 mr-2 text-accent" />
                    Appearance
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans py-2 px-3 text-muted-foreground hover:text-primary" data-testid="menu-about-data-import">
                    <Info className="w-4 h-4 mr-2 text-accent" />
                    About DataInsights
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logOut();
                      window.location.href = "/";
                    }}
                    data-testid="menu-business-logout-data-import"
                    className="hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans py-2 px-3 text-destructive font-semibold"
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
          <SheetSelector onDashboardCreated={(dashboardId) => navigate(`/home?dashboardId=${dashboardId}`)} />
        </main>
      </div>
    </div>
  );
}
