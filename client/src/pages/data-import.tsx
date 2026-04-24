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
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-amber-500 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-black" />
              </div>
              <span className="font-serif text-lg font-bold">DataInsights</span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/home")} data-testid="nav-dashboards">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>My Dashboards</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive data-testid="nav-new-dashboard">
                      <Plus className="w-4 h-4" />
                      <span>New Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/home?view=chat")} data-testid="nav-new-chat">
                      <MessageSquare className="w-4 h-4" />
                      <span>New Chat</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/business")} className="text-amber-500/80 hover:text-amber-500" data-testid="nav-business-suite">
                      <Building2 className="w-4 h-4" />
                      <span>Business Suite</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel className="flex items-center justify-between gap-2">
                <span>AI Usage Today</span>
                {usage?.plan?.isPremium && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    {usage.plan.displayName}
                  </Badge>
                )}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Actions</span>
                    <span className="font-medium">{usage?.used ?? 0} / {usage?.limit ?? 5}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all" style={{ width: `${((usage?.used ?? 0) / (usage?.limit ?? 5)) * 100}%` }} />
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" data-testid="button-help">
                    <HelpCircle className="w-3 h-3 mr-1" />
                    How to use DataInsights
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 text-xs justify-start text-amber-500/90 hover:text-amber-500"
                    onClick={() => navigate("/business")}
                    data-testid="button-switch-business-suite"
                  >
                    <Building2 className="w-3 h-3 mr-1" />
                    Switch to Business Suite
                  </Button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b border-border flex items-center justify-between gap-4 px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-border/70 bg-card/80 hover:bg-muted/70" data-testid="button-user-menu">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.profileImageUrl ?? undefined} />
                      <AvatarFallback>{user?.firstName?.[0] ?? user?.email?.[0] ?? "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setOpenModal("profile")} data-testid="menu-profile">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenModal("settings")} data-testid="menu-settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenModal("appearance")} data-testid="menu-theme">
                    <Palette className="w-4 h-4 mr-2" />
                    Appearance
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setOpenModal("about")} data-testid="menu-about">
                    <Info className="w-4 h-4 mr-2" />
                    About DataInsights
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logOut();
                      window.location.href = "/";
                    }}
                    data-testid="menu-logout"
                    className="text-destructive cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <SheetSelector onDashboardCreated={() => navigate("/home")} />
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
