import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { logOut } from "@/lib/firebase";
import { useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  BarChart3, 
  Plus, 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  LogOut,
  FileSpreadsheet,
  Sparkles,
  Share2,
  Copy,
  User,
  Palette,
  Info,
  MoreVertical,
  Pencil,
  HelpCircle,
  Crown,
  Trash2,
  Pin,
  Archive,
  RefreshCw,
  Building2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dashboard, Conversation, UserPlanFeatures, Dataset } from "@shared/schema";
import Onboarding from "./onboarding";
import SheetSelector from "@/components/sheet-selector";
import DashboardView from "@/components/dashboard-view";
import ChatInterface from "@/components/chat-interface";
import { ProfileModal, SettingsModal, AppearanceModal, AboutModal } from "@/components/account-modals";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OnboardingTutorial, useOnboardingTutorial } from "@/components/onboarding-tutorial";
import QuickWinPopup from "@/components/QuickWinPopup";

type View = "dashboards" | "new" | "dashboard" | "chat";
type ModalType = "profile" | "settings" | "appearance" | "about" | null;

export default function Home({ initialView = "dashboards" }: { initialView?: View }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentView, setCurrentView] = useState<View>(initialView);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(!user?.onboardingComplete);
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [renameDialog, setRenameDialog] = useState<{ type: "chat" | "dashboard"; id: string; currentName: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  
  const { showTutorial, completeTutorial, openTutorial, closeTutorial } = useOnboardingTutorial();

  // Sync onboarding state when user data loads (handles Google/Apple sign-in)
  useEffect(() => {
    if (user && user.onboardingComplete === false) {
      setShowOnboarding(true);
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (view === "new") {
      setCurrentView("new");
      return;
    }
    if (view === "chat") {
      setCurrentView("chat");
    }
  }, []);

  // Rename mutations
  const renameChatMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      await apiRequest("PATCH", `/api/conversations/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setRenameDialog(null);
      toast({ title: "Chat renamed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to rename chat", variant: "destructive" });
    },
  });

  const renameDashboardMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      await apiRequest("PATCH", `/api/dashboards/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards"] });
      setRenameDialog(null);
      toast({ title: "Dashboard renamed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to rename dashboard", variant: "destructive" });
    },
  });

  // Delete chat mutation
  const deleteChatMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (currentView === "chat" && selectedConversationId) {
        setSelectedConversationId(null);
      }
      toast({ title: "Chat deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete chat", variant: "destructive" });
    },
  });

  // Pin/unpin chat mutation
  const pinChatMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      await apiRequest("PATCH", `/api/conversations/${id}`, { isPinned });
      return { isPinned };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: data.isPinned ? "Chat pinned" : "Chat unpinned" });
    },
    onError: () => {
      toast({ title: "Failed to update chat", variant: "destructive" });
    },
  });

  // Archive chat mutation
  const archiveChatMutation = useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      await apiRequest("PATCH", `/api/conversations/${id}`, { isArchived });
      return { isArchived };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: data.isArchived ? "Chat archived" : "Chat restored" });
    },
    onError: () => {
      toast({ title: "Failed to update chat", variant: "destructive" });
    },
  });

  // Share chat mutation
  const shareChatMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/conversations/${id}/share`);
      return await res.json();
    },
    onSuccess: (data: { shareToken: string; shareUrl: string }) => {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      navigator.clipboard.writeText(fullUrl);
      toast({ 
        title: "Share link copied!", 
        description: "The link has been copied to your clipboard" 
      });
    },
    onError: () => {
      toast({ title: "Failed to create share link", variant: "destructive" });
    },
  });

  // Delete dashboard mutation
  const deleteDashboardMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/dashboards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards"] });
      if (currentView === "dashboard" && selectedDashboardId) {
        setSelectedDashboardId(null);
        setCurrentView("dashboards");
      }
      toast({ title: "Dashboard deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete dashboard", variant: "destructive" });
    },
  });

  const { data: dashboards, isLoading: dashboardsLoading } = useQuery<Dashboard[]>({
    queryKey: ["/api/dashboards"],
  });

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: datasets } = useQuery<Dataset[]>({
    queryKey: ["/api/datasets"],
  });

  const { data: usage } = useQuery<{ used: number; limit: number; remaining: number; plan: UserPlanFeatures }>({
    queryKey: ["/api/usage"],
  });

  // Sync/Refresh Google Sheet mutation
  const syncDatasetMutation = useMutation({
    mutationFn: async (datasetId: string) => {
      await apiRequest("POST", `/api/datasets/${datasetId}/sync`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({ title: "Data refreshed!", description: "Your dataset now has the latest data from Google Sheets." });
    },
    onError: () => {
      toast({ title: "Failed to refresh data", variant: "destructive" });
    },
  });

  // Helper to get dataset info for a conversation
  const getDatasetForConversation = (datasetId: string | null | undefined) => {
    if (!datasetId || !datasets) return null;
    return datasets.find(d => d.id === datasetId);
  };

  if (showOnboarding && !user?.onboardingComplete) {
    // Redirect to business onboarding with industry selection + AI audit
    return <Redirect to="/get-started" />;
  }

  const handleDashboardClick = (id: string) => {
    setSelectedDashboardId(id);
    setCurrentView("dashboard");
  };

  const handleNewDashboard = () => {
    setCurrentView("new");
  };

  const handleDashboardCreated = (dashboardId: string) => {
    setSelectedDashboardId(dashboardId);
    setCurrentView("dashboard");
  };

  const handleNewChat = () => {
    setSelectedConversationId(null);
    setCurrentView("chat");
  };

  const handleConversationClick = (id: string) => {
    setSelectedConversationId(id);
    setCurrentView("chat");
  };

  const handleConversationCreated = (id: string) => {
    setSelectedConversationId(id);
  };

  const openRenameDialog = (type: "chat" | "dashboard", id: string, currentName: string) => {
    setNewName(currentName);
    setRenameDialog({ type, id, currentName });
  };

  const handleRename = () => {
    if (!renameDialog || !newName.trim()) return;
    if (renameDialog.type === "chat") {
      renameChatMutation.mutate({ id: renameDialog.id, title: newName.trim() });
    } else {
      renameDashboardMutation.mutate({ id: renameDialog.id, title: newName.trim() });
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <QuickWinPopup suite="analytics" isFirstVisit={dashboards?.length === 0} />
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
                    <SidebarMenuButton
                      onClick={() => setCurrentView("dashboards")}
                      isActive={currentView === "dashboards"}
                      data-testid="nav-dashboards"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>My Dashboards</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={handleNewDashboard}
                      isActive={currentView === "new"}
                      data-testid="nav-new-dashboard"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={handleNewChat}
                      isActive={currentView === "chat" && !selectedConversationId}
                      data-testid="nav-new-chat"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Chat</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Chat History */}
            {conversations && conversations.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center justify-between">
                  <span>{showArchivedChats ? "Archived Chats" : "Your Chats"}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs"
                    onClick={() => setShowArchivedChats(!showArchivedChats)}
                    data-testid="button-toggle-archived"
                  >
                    {showArchivedChats ? "Show Active" : "Show Archived"}
                  </Button>
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="max-h-[200px] overflow-y-auto overflow-x-visible">
                    <SidebarMenu>
                      {conversations
                        .filter(c => showArchivedChats ? c.isArchived : !c.isArchived)
                        .sort((a, b) => {
                          if (a.isPinned && !b.isPinned) return -1;
                          if (!a.isPinned && b.isPinned) return 1;
                          return 0;
                        })
                        .slice(0, 10)
                        .map((conv) => {
                          const dataset = getDatasetForConversation(conv.datasetId);
                          const isGoogleSheet = dataset && dataset.source !== 'excel';
                          return (
                        <SidebarMenuItem key={conv.id}>
                          <div 
                            className="group relative flex items-center w-full px-2 py-1.5 rounded-md cursor-pointer hover:bg-sidebar-accent"
                            onClick={() => handleConversationClick(conv.id)}
                            data-testid={`nav-chat-${conv.id}`}
                          >
                            {conv.isPinned ? (
                              <Pin className="w-4 h-4 text-amber-500 shrink-0 mr-2" />
                            ) : (
                              <MessageSquare className="w-4 h-4 shrink-0 mr-2" />
                            )}
                            <div className="flex flex-col min-w-0 flex-1 pr-8">
                              <span className="truncate text-sm">{conv.title}</span>
                              {dataset && (
                                <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                  <FileSpreadsheet className="w-3 h-3 shrink-0" />
                                  {dataset.sheetName}
                                </span>
                              )}
                            </div>
                            <div 
                              className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5"
                            >
                              {isGoogleSheet && (
                                <button
                                  className="p-1 rounded hover:bg-accent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    syncDatasetMutation.mutate(dataset.id);
                                  }}
                                  disabled={syncDatasetMutation.isPending}
                                  data-testid={`button-refresh-${conv.id}`}
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${syncDatasetMutation.isPending ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="p-1 rounded hover:bg-accent"
                                    data-testid={`button-chat-menu-${conv.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-50">
                                  <DropdownMenuItem 
                                    onClick={() => openRenameDialog("chat", conv.id, conv.title)} 
                                    data-testid={`menu-rename-chat-${conv.id}`}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => pinChatMutation.mutate({ id: conv.id, isPinned: !conv.isPinned })}
                                    data-testid={`menu-pin-chat-${conv.id}`}
                                  >
                                    <Pin className="w-4 h-4 mr-2" />
                                    {conv.isPinned ? "Unpin" : "Pin"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => shareChatMutation.mutate(conv.id)}
                                    data-testid={`menu-share-chat-${conv.id}`}
                                  >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => archiveChatMutation.mutate({ id: conv.id, isArchived: !conv.isArchived })}
                                    data-testid={`menu-archive-chat-${conv.id}`}
                                  >
                                    <Archive className="w-4 h-4 mr-2" />
                                    {conv.isArchived ? "Unarchive" : "Archive"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => deleteChatMutation.mutate(conv.id)}
                                    className="text-destructive focus:text-destructive"
                                    data-testid={`menu-delete-chat-${conv.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </SidebarMenuItem>
                          );
                        })}
                    </SidebarMenu>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Usage indicator */}
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
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${((usage?.used ?? 0) / (usage?.limit ?? 5)) * 100}%` }}
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-2 text-xs"
                    onClick={openTutorial}
                    data-testid="button-help"
                  >
                    <HelpCircle className="w-3 h-3 mr-1" />
                    How to use DataInsights
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    className="w-full mt-3 h-10 text-sm justify-start text-amber-500/90 hover:text-amber-500"
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

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b border-border flex items-center justify-between gap-4 px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-border/70 bg-card/80 hover:bg-muted/70"
                    data-testid="button-user-menu"
                  >
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
                      queryClient.clear();
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
            {currentView === "dashboards" && (
              <DashboardList
                dashboards={dashboards ?? []}
                isLoading={dashboardsLoading}
                onSelect={handleDashboardClick}
                onNew={handleNewDashboard}
                onRename={(id, title) => openRenameDialog("dashboard", id, title)}
                onDelete={(id) => deleteDashboardMutation.mutate(id)}
              />
            )}
            {currentView === "new" && (
              <SheetSelector onDashboardCreated={handleDashboardCreated} />
            )}
            {currentView === "dashboard" && selectedDashboardId && (
              <DashboardView dashboardId={selectedDashboardId} />
            )}
            {currentView === "chat" && (
              <ChatInterface 
                conversationId={selectedConversationId}
                onConversationCreated={handleConversationCreated}
              />
            )}
          </main>
        </div>
      </div>

      <ProfileModal 
        open={openModal === "profile"} 
        onOpenChange={(open) => setOpenModal(open ? "profile" : null)} 
        user={user} 
      />
      <SettingsModal 
        open={openModal === "settings"} 
        onOpenChange={(open) => setOpenModal(open ? "settings" : null)} 
        user={user} 
      />
      <AppearanceModal 
        open={openModal === "appearance"} 
        onOpenChange={(open) => setOpenModal(open ? "appearance" : null)} 
      />
      <AboutModal 
        open={openModal === "about"} 
        onOpenChange={(open) => setOpenModal(open ? "about" : null)} 
      />

      {/* Onboarding Tutorial */}
      <OnboardingTutorial 
        isOpen={showTutorial}
        onClose={closeTutorial}
        onComplete={completeTutorial}
      />

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameDialog?.type === "chat" ? "Chat" : "Dashboard"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              data-testid="input-rename"
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)} data-testid="button-cancel-rename">
              Cancel
            </Button>
            <Button 
              onClick={handleRename} 
              disabled={!newName.trim() || renameChatMutation.isPending || renameDashboardMutation.isPending}
              data-testid="button-confirm-rename"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function DashboardList({
  dashboards,
  isLoading,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: {
  dashboards: Dashboard[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, currentTitle: string) => void;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();

  const shareMutation = useMutation({
    mutationFn: async (dashboardId: string) => {
      await apiRequest("PATCH", `/api/dashboards/${dashboardId}`, { isPublic: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards"] });
      toast({ title: "Dashboard is now shareable!" });
    },
    onError: () => {
      toast({ title: "Failed to enable sharing", variant: "destructive" });
    },
  });

  const handleShare = async (e: React.MouseEvent, dashboard: Dashboard) => {
    e.stopPropagation();
    if (dashboard.isPublic && dashboard.shareToken) {
      const link = `${window.location.origin}/shared/${dashboard.shareToken}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: dashboard.title, url: link });
        } catch (error: any) {
          // Ignore AbortError (user cancelled) and NotAllowedError (share already in progress)
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
            navigator.clipboard.writeText(link);
            toast({ title: "Share link copied!" });
          }
        }
      } else {
        navigator.clipboard.writeText(link);
        toast({ title: "Share link copied!" });
      }
    } else {
      shareMutation.mutate(dashboard.id);
    }
  };

  const handleCopy = (e: React.MouseEvent, dashboard: Dashboard) => {
    e.stopPropagation();
    if (dashboard.isPublic && dashboard.shareToken) {
      const link = `${window.location.origin}/shared/${dashboard.shareToken}`;
      navigator.clipboard.writeText(link);
      toast({ title: "Link copied to clipboard!" });
    } else {
      toast({ title: "Enable sharing first to copy link", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold">My Dashboards</h1>
          <p className="text-muted-foreground">View and manage your analytics dashboards</p>
        </div>
        <Button onClick={onNew} data-testid="button-create-dashboard" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          New Dashboard
        </Button>
      </div>

      {dashboards.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-semibold text-lg mb-2">No dashboards yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your Google Sheets and let AI create beautiful dashboards from your data.
          </p>
          <Button onClick={onNew} data-testid="button-create-first-dashboard" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            <Sparkles className="w-4 h-4 mr-2" />
            Create Your First Dashboard
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.slice(0, 5).map((dashboard) => (
              <Card
                key={dashboard.id}
                className="p-6 cursor-pointer hover-elevate"
                onClick={() => onSelect(dashboard.id)}
                data-testid={`card-dashboard-${dashboard.id}`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleShare(e, dashboard)}
                      data-testid={`button-share-${dashboard.id}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleCopy(e, dashboard)}
                      data-testid={`button-copy-${dashboard.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-dashboard-menu-${dashboard.id}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleShare(e, dashboard); }}
                          data-testid={`menu-share-dashboard-${dashboard.id}`}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); onRename(dashboard.id, dashboard.title); }}
                          data-testid={`menu-rename-dashboard-${dashboard.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); onDelete(dashboard.id); }}
                          className="text-destructive focus:text-destructive"
                          data-testid={`menu-delete-dashboard-${dashboard.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <h3 className="font-semibold mb-1 truncate">{dashboard.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {dashboard.description || "No description"}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(dashboard.createdAt!).toLocaleDateString()}
                  </p>
                  {dashboard.isPublic && (
                    <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded">Shared</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
          {dashboards.length >= 5 && (
            <Card className="p-4 text-center bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Showing last 5 dashboards. To save more history, contact <a href="mailto:sarthakjhalani8@gmail.com" className="text-amber-500 underline">admin</a>.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
