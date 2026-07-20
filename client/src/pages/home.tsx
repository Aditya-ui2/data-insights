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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
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
  Menu,
  ChevronDown,
  ChevronRight,
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
import GoogleSheetsSimulator from "@/components/google-sheets-simulator";

type View = "dashboards" | "new" | "dashboard" | "chat" | "datasets";
type ModalType = "profile" | "settings" | "appearance" | "about" | null;

export default function Home({ initialView = "dashboards" }: { initialView?: View }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentView, setCurrentView] = useState<View>(initialView);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // If the user already completed onboarding, don't redirect
    if (typeof window !== 'undefined' && localStorage.getItem('onboardingDone') === 'true') {
      return false;
    }
    return !user?.onboardingComplete;
  });
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [renameDialog, setRenameDialog] = useState<{ type: "chat" | "dashboard"; id: string; currentName: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  
  const { showTutorial, completeTutorial, openTutorial, closeTutorial } = useOnboardingTutorial();

  // Sync onboarding state when user data loads (handles Google/Apple sign-in)
  useEffect(() => {
    // If localStorage says we're done, always skip onboarding regardless of DB
    if (typeof window !== 'undefined' && localStorage.getItem('onboardingDone') === 'true') {
      setShowOnboarding(false);
      return;
    }
    
    if (user && user.onboardingComplete === false) {
      setShowOnboarding(true);
    } else if (user && user.onboardingComplete === true) {
      setShowOnboarding(false);
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const dId = params.get("dashboardId");
    if (dId) {
      setSelectedDashboardId(dId);
      setCurrentView("dashboard");
      return;
    }
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

  const deleteDatasetMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/datasets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      toast({ title: "Dataset deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete dataset", variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards"] });
      toast({ title: "Data refreshed!", description: "Your dataset and dashboard have been updated with the latest data." });
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

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => {
    return (
      <>
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-1.5">
            <BarChart3 className="w-4 h-4 text-accent" />
            <span className="font-sans font-bold text-sm truncate text-primary">DataInsights</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-gray-200 px-2 py-0.5 bg-gray-50 rounded-none shrink-0">
            Analytics Suite
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto bg-[#fbfaf7]">
          <div className="space-y-1">
            <button
              onClick={() => { setCurrentView("dashboards"); onNavigate?.(); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition-all text-left rounded-none relative group",
                currentView === "dashboards"
                  ? "bg-white text-primary border border-gray-250 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 hover:text-primary border border-transparent"
              )}
              data-testid="nav-dashboards"
            >
              {currentView === "dashboards" && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />}
              <LayoutDashboard className={cn("w-3.5 h-3.5 shrink-0 transition-colors", currentView === "dashboards" ? "text-accent" : "text-muted-foreground/60 group-hover:text-primary")} />
              <span className="font-sans">My Dashboards</span>
            </button>

            <button
              onClick={() => { setCurrentView("new"); onNavigate?.(); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition-all text-left rounded-none relative group",
                currentView === "new"
                  ? "bg-white text-primary border border-gray-250 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 hover:text-primary border border-transparent"
              )}
              data-testid="nav-new-dashboard"
            >
              {currentView === "new" && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />}
              <Plus className={cn("w-3.5 h-3.5 shrink-0 transition-colors", currentView === "new" ? "text-accent" : "text-muted-foreground/60 group-hover:text-primary")} />
              <span className="font-sans">New Dashboard</span>
            </button>

            <button
              onClick={() => { handleNewChat(); onNavigate?.(); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition-all text-left rounded-none relative group",
                currentView === "chat" && !selectedConversationId
                  ? "bg-white text-primary border border-gray-250 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 hover:text-primary border border-transparent"
              )}
              data-testid="nav-new-chat"
            >
              {currentView === "chat" && !selectedConversationId && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />}
              <Plus className={cn("w-3.5 h-3.5 shrink-0 transition-colors", currentView === "chat" && !selectedConversationId ? "text-accent" : "text-muted-foreground/60 group-hover:text-primary")} />
              <span className="font-sans">New Chat</span>
            </button>

            <button
              onClick={() => { setCurrentView("datasets"); onNavigate?.(); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition-all text-left rounded-none relative group",
                currentView === "datasets"
                  ? "bg-white text-primary border border-gray-250 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 hover:text-primary border border-transparent"
              )}
              data-testid="nav-datasets"
            >
              {currentView === "datasets" && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />}
              <FileSpreadsheet className={cn("w-3.5 h-3.5 shrink-0 transition-colors", currentView === "datasets" ? "text-accent" : "text-muted-foreground/60 group-hover:text-primary")} />
              <span className="font-sans">My Sheets</span>
            </button>
          </div>

          {conversations && conversations.length > 0 && (
            <div className="space-y-1 pt-2">
              <div
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70"
              >
                <span>{showArchivedChats ? "Archived Chats" : "Your Chats"}</span>
                <button
                  className="text-[9px] uppercase tracking-wider text-accent hover:text-primary transition-colors font-bold"
                  onClick={() => setShowArchivedChats(!showArchivedChats)}
                  data-testid="button-toggle-archived"
                >
                  {showArchivedChats ? "Active" : "Archived"}
                </button>
              </div>

              <div className="pl-1.5 space-y-1 border-l border-gray-200 ml-3 max-h-[250px] overflow-y-auto overflow-x-visible">
                {conversations
                  .filter(c => showArchivedChats ? c.isArchived : !c.isArchived)
                  .sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return 0;
                  })
                  .map((conv) => {
                    const dataset = getDatasetForConversation(conv.datasetId);
                    const isGoogleSheet = dataset && dataset.source !== 'excel';
                    const isActive = currentView === "chat" && selectedConversationId === conv.id;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => { handleConversationClick(conv.id); onNavigate?.(); }}
                        className={cn(
                          "group relative flex items-center w-full px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition-all text-left rounded-none cursor-pointer border border-transparent hover:bg-gray-50",
                          isActive
                            ? "bg-white text-primary border border-gray-250 shadow-sm"
                            : "text-muted-foreground hover:text-primary"
                        )}
                        data-testid={`nav-chat-${conv.id}`}
                      >
                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />}
                        {conv.isPinned ? (
                          <Pin className="w-3.5 h-3.5 text-accent shrink-0 mr-1.5" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mr-1.5 group-hover:text-primary" />
                        )}
                        <div className="flex flex-col min-w-0 flex-1 pr-6">
                          <span className="truncate font-sans font-semibold tracking-wider text-[11px] leading-tight">{conv.title}</span>
                          {dataset && (
                            <span className="text-[9px] text-muted-foreground/80 truncate flex items-center gap-1 mt-0.5 lowercase tracking-normal">
                              <FileSpreadsheet className="w-2.5 h-2.5 shrink-0" />
                              {dataset.sheetName}
                            </span>
                          )}
                        </div>
                        <div 
                          className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isGoogleSheet && (
                            <button
                              className="p-0.5 rounded hover:bg-gray-200 text-muted-foreground hover:text-primary transition-colors"
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
                                className="p-0.5 rounded hover:bg-gray-250 text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`button-chat-menu-${conv.id}`}
                              >
                                <MoreVertical className="w-3 h-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-50 rounded-none border border-gray-200 bg-white shadow-xl">
                              <DropdownMenuItem 
                                onClick={() => openRenameDialog("chat", conv.id, conv.title)} 
                                data-testid={`menu-rename-chat-${conv.id}`}
                                className="rounded-none cursor-pointer text-xs uppercase font-semibold tracking-wider"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-2 text-accent" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => pinChatMutation.mutate({ id: conv.id, isPinned: !conv.isPinned })}
                                data-testid={`menu-pin-chat-${conv.id}`}
                                className="rounded-none cursor-pointer text-xs uppercase font-semibold tracking-wider"
                              >
                                <Pin className="w-3.5 h-3.5 mr-2 text-accent" />
                                {conv.isPinned ? "Unpin" : "Pin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => shareChatMutation.mutate(conv.id)}
                                data-testid={`menu-share-chat-${conv.id}`}
                                className="rounded-none cursor-pointer text-xs uppercase font-semibold tracking-wider"
                              >
                                <Share2 className="w-3.5 h-3.5 mr-2 text-accent" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => archiveChatMutation.mutate({ id: conv.id, isArchived: !conv.isArchived })}
                                data-testid={`menu-archive-chat-${conv.id}`}
                                className="rounded-none cursor-pointer text-xs uppercase font-semibold tracking-wider"
                              >
                                <Archive className="w-3.5 h-3.5 mr-2 text-accent" />
                                {conv.isArchived ? "Unarchive" : "Archive"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-100" />
                              <DropdownMenuItem 
                                onClick={() => deleteChatMutation.mutate(conv.id)}
                                className="text-destructive focus:text-destructive rounded-none cursor-pointer text-xs uppercase font-semibold tracking-wider"
                                data-testid={`menu-delete-chat-${conv.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-gray-200 bg-white space-y-2.5">
          <div className="px-1.5 py-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-1.5">
              <span className="text-muted-foreground">AI Actions</span>
              <span className="font-semibold text-primary">{usage?.used ?? 0} / Unlimited</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-none overflow-hidden border border-gray-150">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: "0%" }}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="default"
            className="w-full h-8 justify-center gap-1.5 text-muted-foreground hover:text-primary border border-gray-200 text-[10px] uppercase tracking-wider rounded-none shadow-none font-bold"
            onClick={openTutorial}
            data-testid="button-help"
          >
            <HelpCircle className="w-3.5 h-3.5 text-accent" />
            How to use
          </Button>
          <Button
            variant="ghost"
            size="default"
            className="w-full h-9 justify-center gap-2 text-primary-foreground font-semibold bg-primary hover:bg-primary/90 border border-primary text-xs uppercase tracking-wider rounded-none shadow-none"
            onClick={() => { navigate("/business"); onNavigate?.(); }}
            data-testid="button-switch-business-suite"
          >
            <Building2 className="w-4 h-4 text-accent" />
            Business Suite
          </Button>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] flex w-full">
      <QuickWinPopup suite="analytics" isFirstVisit={dashboards?.length === 0} />
      
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 shrink-0 border-r border-gray-200 bg-[#fbfaf7] h-screen sticky top-0 flex-col">
        <NavContent />
      </aside>

      {/* Mobile hamburger menu */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-white border-gray-250 text-primary shadow-sm hover:bg-gray-50 rounded-none"
              data-testid="button-mobile-menu"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4 text-accent" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 flex flex-col bg-[#fbfaf7] border-r border-gray-200 rounded-none">
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 pl-10 md:pl-0">
              <div>
                <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider">
                  {currentView === "dashboards" && "My Dashboards"}
                  {currentView === "new" && "New Dashboard"}
                  {currentView === "dashboard" && "Dashboard Analytics"}
                  {currentView === "chat" && "AI Business Chat"}
                  {currentView === "datasets" && "My Sheets"}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentView === "dashboards" && "View and manage your analytics dashboards"}
                  {currentView === "new" && "Connect a dataset to generate a new dashboard"}
                  {currentView === "dashboard" && "Detailed visualization and insights of your data"}
                  {currentView === "chat" && "Ask AI assistant questions about your business data"}
                  {currentView === "datasets" && "Manage your uploaded datasets and sheets"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-none border border-gray-250 bg-white hover:bg-gray-50 shadow-sm"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="w-8 h-8 rounded-none">
                      <AvatarImage src={user?.profileImageUrl ?? undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold rounded-none">
                        {user?.firstName?.[0] ?? user?.email?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-none border border-gray-200 bg-white shadow-xl">
                  <DropdownMenuLabel className="font-sans text-sm font-normal text-primary">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={() => setOpenModal("profile")} className="rounded-none cursor-pointer" data-testid="menu-profile">
                    <User className="w-4 h-4 mr-2 text-accent" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenModal("settings")} className="rounded-none cursor-pointer" data-testid="menu-settings">
                    <Settings className="w-4 h-4 mr-2 text-accent" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenModal("appearance")} className="rounded-none cursor-pointer" data-testid="menu-theme">
                    <Palette className="w-4 h-4 mr-2 text-accent" /> Appearance
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={() => setOpenModal("about")} className="rounded-none cursor-pointer" data-testid="menu-about">
                    <Info className="w-4 h-4 mr-2 text-accent" /> About DataInsights
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logOut();
                      queryClient.clear();
                      window.location.href = "/";
                    }}
                    data-testid="menu-logout"
                    className="text-destructive rounded-none cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 max-w-5xl w-full mx-auto">
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
            <SheetSelector 
              onDashboardCreated={handleDashboardCreated} 
              onDatasetCreated={(datasetId) => {
                window.open(`/sheet/${datasetId}`, '_blank');
                setCurrentView("datasets");
                setSelectedDatasetId(null);
              }}
            />
          )}
          {currentView === "dashboard" && selectedDashboardId && (
            <DashboardView dashboardId={selectedDashboardId} />
          )}
          {currentView === "datasets" && (
            <DatasetList
              datasets={datasets ?? []}
              onDelete={(id) => deleteDatasetMutation.mutate(id)}
              onSelect={(id) => {
                window.open(`/sheet/${id}`, '_blank');
              }}
            />
          )}
          {currentView === "chat" && (
            <ChatInterface 
              conversationId={selectedConversationId}
              onConversationCreated={handleConversationCreated}
            />
          )}
        </main>
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
    </div>
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
        <div className="flex items-center justify-between pb-4 border-b border-gray-150">
          <Skeleton className="h-8 w-48 rounded-none" />
          <Skeleton className="h-9 w-32 rounded-none" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-gray-150">
        <div>
          <h2 className="font-sans font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-accent" /> My Dashboards
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">View and manage your analytics dashboards</p>
        </div>
        <Button 
          onClick={onNew} 
          data-testid="button-create-dashboard" 
          className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-none shadow-none h-9 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 text-accent" />
          New Dashboard
        </Button>
      </div>

      {dashboards.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-none shadow-sm">
          <div className="w-12 h-12 border border-gray-150 bg-gray-50 flex items-center justify-center text-accent mx-auto mb-4">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h2 className="font-sans text-lg font-normal mb-1">No dashboards yet</h2>
          <p className="text-xs text-muted-foreground font-sans max-w-md mx-auto mb-6 leading-relaxed">
            Connect your Google Sheets and let AI create beautiful dashboards from your data.
          </p>
          <Button 
            onClick={onNew} 
            data-testid="button-create-first-dashboard" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none shadow-none mx-auto flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            Create Your First Dashboard
          </Button>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                className="bg-white border border-gray-200 rounded-none p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                onClick={() => onSelect(dashboard.id)}
                data-testid={`card-dashboard-${dashboard.id}`}
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-9 h-9 border border-gray-200 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none hover:bg-gray-100 text-muted-foreground hover:text-primary"
                      onClick={(e) => handleShare(e, dashboard)}
                      data-testid={`button-share-${dashboard.id}`}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none hover:bg-gray-100 text-muted-foreground hover:text-primary"
                      onClick={(e) => handleCopy(e, dashboard)}
                      data-testid={`button-copy-${dashboard.id}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none hover:bg-gray-100 text-muted-foreground hover:text-primary"
                          data-testid={`button-dashboard-menu-${dashboard.id}`}
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-none border border-gray-200 bg-white shadow-xl">
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleShare(e, dashboard); }}
                          data-testid={`menu-share-dashboard-${dashboard.id}`}
                          className="rounded-none cursor-pointer text-xs uppercase font-semibold tracking-wider"
                        >
                          <Share2 className="w-3.5 h-3.5 mr-2 text-accent" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); onRename(dashboard.id, dashboard.title); }}
                          data-testid={`menu-rename-dashboard-${dashboard.id}`}
                          className="rounded-none cursor-pointer text-xs uppercase font-semibold tracking-wider"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2 text-accent" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-100" />
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); onDelete(dashboard.id); }}
                          className="text-destructive focus:text-destructive rounded-none cursor-pointer text-xs uppercase font-semibold tracking-wider"
                          data-testid={`menu-delete-dashboard-${dashboard.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-primary truncate mb-1">{dashboard.title}</h3>
                  <p className="text-xs text-muted-foreground font-sans line-clamp-2 leading-relaxed mb-4">
                    {dashboard.description || "No description"}
                  </p>
                </div>
                
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <p className="text-[10px] text-muted-foreground/80 uppercase font-semibold tracking-wider">
                    Created {new Date(dashboard.createdAt!).toLocaleDateString()} {new Date(dashboard.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                  {dashboard.isPublic && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 border border-accent/20 bg-accent/10 text-accent rounded-none">Shared</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DatasetList({
  datasets,
  onDelete,
  onSelect,
}: {
  datasets: Dataset[];
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === datasets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(datasets.map((d) => d.id)));
    }
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach((id) => onDelete(id));
    setSelectedIds(new Set());
  };

  if (datasets.length === 0) {
    return (
      <div className="p-12 text-center bg-white border border-gray-200 rounded-none shadow-sm">
        <div className="w-12 h-12 border border-gray-150 bg-gray-50 flex items-center justify-center text-accent mx-auto mb-4">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h2 className="font-sans text-lg font-normal mb-1">No datasets yet</h2>
        <p className="text-xs text-muted-foreground font-sans max-w-md mx-auto mb-6 leading-relaxed">
          Upload an Excel/CSV file or connect Google Sheets to create your first dataset.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-gray-150">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === datasets.length && datasets.length > 0}
              onChange={selectAll}
              className="w-4 h-4 accent-accent rounded-none"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select All ({datasets.length})
            </span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="text-xs text-muted-foreground font-semibold">
              {selectedIds.size} selected
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={deleteSelected}
            disabled={selectedIds.size === 0}
            className="rounded-none border-red-200 text-red-600 hover:bg-red-50 text-xs uppercase font-bold tracking-wider h-9 px-4 shadow-none"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete Selected
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {datasets.map((dataset) => (
          <div
            key={dataset.id}
            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-none shadow-sm hover:shadow-md transition-all"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(dataset.id)}
              onChange={() => toggleSelect(dataset.id)}
              className="w-4 h-4 accent-accent rounded-none shrink-0"
            />
            <div 
              onClick={() => onSelect(dataset.id)}
              className="flex-1 flex items-center gap-4 cursor-pointer min-w-0"
            >
              <div className="w-10 h-10 rounded-none border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary uppercase tracking-tight truncate">
                  {dataset.spreadsheetName}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {dataset.sheetName} &middot; {(dataset.rowCount ?? 0).toLocaleString()} rows &middot; {dataset.source}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider shrink-0">
                {new Date(dataset.createdAt!).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
