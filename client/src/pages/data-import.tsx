import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { logOut } from "@/lib/firebase";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart3,
  Plus,
  LayoutDashboard,
  MessageSquare,
  Building2,
  HelpCircle,
  User,
  Settings,
  Palette,
  Info,
  LogOut,
  Crown,
} from "lucide-react";
import { ProfileModal, SettingsModal, AppearanceModal, AboutModal } from "@/components/account-modals";
import SheetSelector from "@/components/sheet-selector";
import { useState } from "react";

type ModalType = "profile" | "settings" | "appearance" | "about" | null;

export default function DataImportPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [openModal, setOpenModal] = useState<ModalType>(null);

  const { data: usage } = useQuery<{ used: number; limit: number; plan?: { isPremium?: boolean; displayName?: string } }>({
    queryKey: ["/api/usage"],
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full bg-[#fbfaf7] font-sans">
        <Sidebar className="border-r border-gray-200 bg-white">
          <SidebarHeader className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-none bg-primary/5 border border-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <span className="font-sans text-lg font-bold text-primary uppercase tracking-wider">DataInsights</span>
            </div>
          </SidebarHeader>

          <SidebarContent className="bg-white">
            <SidebarGroup>
              <SidebarGroupLabel className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/home")} className="rounded-none font-sans font-semibold text-xs py-2 px-3 hover:bg-gray-50 focus:bg-gray-50 text-muted-foreground hover:text-primary" data-testid="nav-dashboards">
                      <LayoutDashboard className="w-4 h-4 text-accent" />
                      <span>My Dashboards</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive className="rounded-none font-sans font-bold text-xs py-2 px-3 bg-primary/5 text-primary border-r-2 border-accent" data-testid="nav-new-dashboard">
                      <Plus className="w-4 h-4 text-accent" />
                      <span>New Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/home?view=chat")} className="rounded-none font-sans font-semibold text-xs py-2 px-3 hover:bg-gray-50 focus:bg-gray-50 text-muted-foreground hover:text-primary" data-testid="nav-new-chat">
                      <MessageSquare className="w-4 h-4 text-accent" />
                      <span>New Chat</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/business")} className="rounded-none font-sans font-bold text-xs py-2 px-3 hover:bg-accent/5 text-accent hover:text-accent" data-testid="nav-business-suite">
                      <Building2 className="w-4 h-4 text-accent" />
                      <span>Business Suite</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel className="flex items-center justify-between gap-2 font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>AI Usage Today</span>
                {usage?.plan?.isPremium && (
                  <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 text-[9px] font-bold rounded-none border uppercase tracking-wider px-1.5 py-0.5">
                    <Crown className="w-3 h-3 mr-1 text-accent" />
                    {usage.plan.displayName}
                  </Badge>
                )}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 font-sans">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-primary">
                    <span className="text-muted-foreground">Actions</span>
                    <span>{usage?.used ?? 0} / Unlimited</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-none overflow-hidden border border-gray-200">
                    <div className="h-full bg-accent transition-all" style={{ width: "0%" }} />
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-3 text-[10px] rounded-none border border-gray-200 bg-white hover:bg-gray-50 font-sans font-bold uppercase tracking-wider h-8" data-testid="button-help">
                    <HelpCircle className="w-3 h-3 mr-1 text-accent" />
                    How to use DataInsights
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1.5 text-[10px] justify-start text-accent hover:text-accent font-bold uppercase tracking-wider rounded-none hover:bg-gray-50 border border-transparent hover:border-gray-200 h-8"
                    onClick={() => navigate("/business")}
                    data-testid="button-switch-business-suite"
                  >
                    <Building2 className="w-3 h-3 mr-1.5" />
                    Switch to Business Suite
                  </Button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden bg-[#fbfaf7]">
          <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between gap-4 px-4">
            <SidebarTrigger className="rounded-none" data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border border-gray-200 bg-white hover:bg-gray-50 shadow-none shrink-0" data-testid="button-user-menu">
                    <Avatar className="w-7 h-7 rounded-none">
                      <AvatarImage src={user?.profileImageUrl ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs rounded-none">{user?.firstName?.[0] ?? user?.email?.[0] ?? "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-none border border-gray-200 bg-white font-sans text-xs">
                  <DropdownMenuLabel className="font-sans font-bold text-primary text-[10px] uppercase tracking-wide px-3 py-2">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={() => setOpenModal("profile")} className="hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans py-2 px-3 text-muted-foreground hover:text-primary" data-testid="menu-profile">
                    <User className="w-4 h-4 mr-2 text-accent" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenModal("settings")} className="hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans py-2 px-3 text-muted-foreground hover:text-primary" data-testid="menu-settings">
                    <Settings className="w-4 h-4 mr-2 text-accent" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenModal("appearance")} className="hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans py-2 px-3 text-muted-foreground hover:text-primary" data-testid="menu-theme">
                    <Palette className="w-4 h-4 mr-2 text-accent" />
                    Appearance
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={() => setOpenModal("about")} className="hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans py-2 px-3 text-muted-foreground hover:text-primary" data-testid="menu-about">
                    <Info className="w-4 h-4 mr-2 text-accent" />
                    About DataInsights
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logOut();
                      window.location.href = "/";
                    }}
                    data-testid="menu-logout"
                    className="hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer text-xs font-sans py-2 px-3 text-destructive font-semibold"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 bg-[#fbfaf7]">
            <SheetSelector onDashboardCreated={(dashboardId) => navigate(`/home?dashboardId=${dashboardId}`)} />
          </main>
        </div>
      </div>

      <ProfileModal open={openModal === "profile"} onOpenChange={(open) => setOpenModal(open ? "profile" : null)} user={user} />
      <SettingsModal open={openModal === "settings"} onOpenChange={(open) => setOpenModal(open ? "settings" : null)} user={user} />
      <AppearanceModal open={openModal === "appearance"} onOpenChange={(open) => setOpenModal(open ? "appearance" : null)} />
      <AboutModal open={openModal === "about"} onOpenChange={(open) => setOpenModal(open ? "about" : null)} />
    </SidebarProvider>
  );
}
