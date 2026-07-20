import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2, Users, Layers, Target, TrendingUp, BarChart3,
  Settings, ArrowLeft, Plus, ChevronRight, Sparkles, X,
  ClipboardList, BrainCircuit, FileBarChart2, LogOut, User, MapPin,
  CheckSquare, Calendar, type LucideIcon
} from "lucide-react";
import BusinessSidebar from "@/components/business-sidebar";
import { getUpcomingFestivals, getCurrentFY } from "@/lib/festivalCalendar";
import { logOut } from "@/lib/firebase";
import QuickWinPopup from "@/components/QuickWinPopup";
import DynamicDailyTracker from "@/components/DynamicDailyTracker";

interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  industryLabel: string;
  description?: string;
  employeeCount: number;
  currencySymbol: string;
  memberRole: string;
  ownerId: string;
}

interface BusinessMember {
  id: string;
  name?: string;
  email: string;
  memberRole: string;
  status: string;
  user?: { firstName?: string; lastName?: string; profileImageUrl?: string; email: string };
}

interface BusinessVertical {
  id: string;
  name: string;
  description?: string;
  metricLabel: string;
  metricUnit: string;
}

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

function ElegantSub({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1.5 mb-2.5">
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent">{text}</span>
      <div className="w-8 h-[1px] bg-accent/60" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-none p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
          <p className="text-3xl font-sans font-bold text-primary tracking-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-9 h-9 border border-gray-200 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

function FestivalBanner() {
  const upcoming = getUpcomingFestivals(30);
  if (upcoming.length === 0) return null;
  const { festival, daysAway } = upcoming[0];
  const urgency = daysAway <= 7 ? "bg-amber-500/5 border-amber-500/20 text-primary" : "bg-white border-gray-200";
  const label = daysAway === 0 ? "Today!" : daysAway === 1 ? "Tomorrow" : `${daysAway} days away`;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
      <div className={`border rounded-none px-5 py-3.5 flex items-center justify-between gap-4 relative overflow-hidden ${urgency}`}>
        {daysAway <= 7 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
        <div className="flex items-center gap-3">
          <span className="text-2xl">{festival.emoji}</span>
          <div>
            <p className="font-sans font-normal text-sm text-primary">
              {festival.name} — <span className="text-accent font-sans font-bold uppercase text-[9px] tracking-wider">{label}</span>
            </p>
            {festival.tip && <p className="text-xs text-muted-foreground mt-0.5">{festival.tip}</p>}
          </div>
        </div>
        {upcoming.length > 1 && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-gray-200 px-2 py-0.5 bg-white rounded-none shrink-0">
            +{upcoming.length - 1} more this month
          </span>
        )}
      </div>
    </motion.div>
  );
}

function FYContextBadge() {
  const fy = getCurrentFY();
  return (
    <span className="flex items-center text-[10px] font-sans font-bold uppercase tracking-wider text-primary border border-gray-200 px-3 py-1.5 bg-white rounded-none shrink-0 shadow-sm" data-testid="badge-fy-context">
      <span className="font-extrabold text-primary">FY {fy.label}</span>
      <span className="text-gray-350 mx-2 font-light">|</span>
      <span className="text-accent font-extrabold">Month {fy.monthInFY} of 12</span>
    </span>
  );
}

export default function BusinessHome() {
  const [, navigate] = useLocation();

  // Dismissible welcome guide - moved to top
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('bizWelcomeDismissed') === 'true';
  });
  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    sessionStorage.setItem('bizWelcomeDismissed', 'true');
  };

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<BusinessMember[]>({
    queryKey: ["/api/business/members"],
    enabled: !!profile && (profile.memberRole === 'owner' || profile.memberRole === 'manager'),
  });

  const { data: verticals = [], isLoading: verticalsLoading } = useQuery<BusinessVertical[]>({
    queryKey: ["/api/business/verticals"],
    enabled: !!profile,
  });

  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch recent EOD entries to measure data age (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const { data: recentEods = [] } = useQuery<{ id: string; entryDate: string }[]>({
    queryKey: ["/api/business/eod", "recent7", sevenDaysAgoStr],
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate: sevenDaysAgoStr, toDate: today });
      try {
        const res = await fetch(`/api/business/eod?${params}`, { credentials: "include" });
        if (!res.ok) return [];
        return res.json();
      } catch { return []; }
    },
    enabled: !!profile && (profile.memberRole === 'owner' || profile.memberRole === 'manager'),
  });

  const isOwnerOrManager = profile && (profile.memberRole === 'owner' || profile.memberRole === 'manager');
  const isSecondaryLoading = isOwnerOrManager ? (membersLoading || verticalsLoading) : verticalsLoading;

  if (profileLoading || (profile && isSecondaryLoading)) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-12 w-64 rounded-none" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-none" />)}
          </div>
          <Skeleton className="h-64 rounded-none" />
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-5 bg-white border border-gray-200 p-8 shadow-xl max-w-sm rounded-none">
          <Building2 className="w-12 h-12 text-accent mx-auto" />
          <h2 className="text-2xl font-sans font-normal text-primary">No Business Profile Found</h2>
          <p className="text-muted-foreground text-xs leading-relaxed font-sans">
            Set up your Business Suite to track performance, manage your team, and get AI insights.
          </p>
          <Button
            onClick={() => navigate("/business/setup")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none w-full"
            data-testid="button-start-setup"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Set Up Business Suite
          </Button>
          <button 
            onClick={() => navigate("/home")} 
            className="flex items-center gap-2 text-xs uppercase tracking-wider font-sans font-semibold text-muted-foreground hover:text-accent transition-colors mx-auto mt-2"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Analytics</span>
          </button>
        </div>
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.status === "active");
  const pendingInvites = members.filter((m) => m.status === "pending");
  const isOwner = profile.memberRole === "owner";
  const isManager = profile.memberRole === "manager";
  const isEmployee = profile.memberRole === "employee";

  // Data-age logic: business has < 7 days of EOD data = "new" business
  const hasLowDataAge = recentEods.length < 5; // fewer than 5 EOD entries in last 7 days
  // Only show setup prompts when something is genuinely missing (verticals or team)
  // Don't nag just because data is new — that's expected for fresh businesses
  const showNextSteps = isOwner && (verticals.length === 0 || activeMembers.length <= 1);
  const showDataTip = isOwner && hasLowDataAge && verticals.length > 0 && activeMembers.length > 1;

  // ── Employee dashboard ────────────────────────────────────────────────────
  if (isEmployee) {
    const firstName = user?.firstName ?? user?.email?.split("@")[0] ?? "there";
    const todayStr = new Date().toISOString().slice(0, 10);
    const loggedToday = recentEods.some((e) => e.entryDate === todayStr);

    const employeeActions = [
      {
        icon: ClipboardList,
        title: "Log My Day",
        desc: "Record today's revenue, deals, and expenses in under 2 minutes.",
        href: "/business/eod",
        highlight: !loggedToday,
        badge: loggedToday ? "Done today ✓" : "Pending",
      },
      {
        icon: MapPin,
        title: "Attendance",
        desc: "Punch in / punch out and log your site visits with geo-tagging.",
        href: "/business/field-tracking/runner",
        highlight: false,
      },
      {
        icon: CheckSquare,
        title: "Task Board",
        desc: "View and update your assigned tasks for today.",
        href: "/business/tasks",
        highlight: false,
      },
      {
        icon: BrainCircuit,
        title: "Business Advisor",
        desc: "Get AI-powered tips and improvement suggestions.",
        href: "/business/ai-strategy",
        highlight: false,
      },
    ];

    return (
      <div className="min-h-screen bg-[#fbfaf7] flex">
        <BusinessSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider">{profile.name}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile.industryLabel} · Employee Portal
                </p>
              </div>
              <div className="flex items-center gap-3">
                <FYContextBadge />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-none border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
                    >
                      <Avatar className="w-8 h-8 rounded-none">
                        <AvatarImage src={user?.profileImageUrl ?? undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold rounded-none">
                          {user?.firstName?.[0] ?? user?.email?.[0] ?? "E"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-none border border-gray-200 bg-white shadow-xl">
                    <DropdownMenuLabel className="font-sans text-sm font-normal text-primary">My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <div className="px-2 py-1.5 text-xs text-muted-foreground font-sans">
                      <p className="font-medium text-foreground truncate">
                        {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.email}
                      </p>
                      <p className="truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem onClick={() => navigate("/home")} className="rounded-none cursor-pointer">
                      <BarChart3 className="w-4 h-4 mr-2 text-accent" /> Analytics Home
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem
                      onClick={async () => { await logOut(); window.location.href = "/"; }}
                      className="text-destructive rounded-none cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="max-w-2xl mx-auto px-6 py-8 space-y-8 w-full">
            <FestivalBanner />

            {/* Greeting */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-none bg-primary text-primary-foreground border border-primary flex items-center justify-center text-xl font-sans">
                  {firstName[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-sans font-bold text-primary uppercase tracking-wider">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {firstName}! 👋</h2>
                  <p className="text-xs text-muted-foreground leading-normal font-sans mt-0.5">
                    {loggedToday
                      ? "You've logged your day — great work! Check your tasks or attendance below."
                      : "You haven't logged your day yet — tap 'Log My Day' to get started."}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* EOD reminder banner */}
            {!loggedToday && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-none px-5 py-4 flex items-center justify-between gap-4 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-primary">EOD not logged for today</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Log your revenue, deals, and expenses before the day ends.</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-none shrink-0"
                    onClick={() => navigate("/business/eod")}
                  >
                    Log Now
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Dynamic Daily Tracking Forms */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <DynamicDailyTracker compact />
            </motion.div>

            {/* Actions grid */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <ElegantSub text="Your Actions" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employeeActions.map(({ icon: Icon, title, desc, href, highlight, badge }) => (
                  <div
                    key={href}
                    onClick={() => navigate(href)}
                    className={`p-5 bg-white border border-gray-200 hover:border-accent hover:shadow-md transition-all duration-300 rounded-none cursor-pointer group flex flex-col justify-between ${highlight ? "border-accent/40 bg-amber-500/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 border border-gray-150 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <p className="font-sans font-normal text-sm text-primary">{title}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {badge && (
                          <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border font-semibold rounded-none ${loggedToday ? "bg-green-500/5 border-green-500/20 text-green-600" : "bg-amber-500/5 border-amber-500/20 text-amber-600"}`}>
                            {badge}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Business verticals info */}
            {verticals.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <ElegantSub text="Your Business Divisions" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {verticals.map((v) => (
                    <div key={v.id} className="p-4 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col justify-between">
                      <div>
                        <p className="font-sans font-normal text-sm text-primary">{v.name}</p>
                        {v.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{v.description}</p>}
                      </div>
                      <div className="mt-3">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-gray-200 px-2 py-0.5 bg-gray-50 rounded-none">
                          {v.metricLabel} ({v.metricUnit})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    );
  }
  // ── End employee dashboard ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#fbfaf7] flex">
      <BusinessSidebar />
      {profile && !isSecondaryLoading && (
        <QuickWinPopup suite="business" isFirstVisit={showNextSteps} />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider">{profile.name}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile.industryLabel} · {profile.memberRole} Portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FYContextBadge />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/home")}
                className="text-xs uppercase tracking-wider text-gray-600 hover:text-accent font-sans font-semibold rounded-none border border-gray-200 shadow-none bg-white px-3 py-1.5"
                data-testid="button-analytics"
              >
                <BarChart3 className="w-4 h-4 mr-1 text-accent" /> Analytics
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-none border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
                    data-testid="button-business-profile-menu"
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
                  <div className="px-2 py-1.5 text-xs text-muted-foreground font-sans">
                    <p className="font-medium text-foreground truncate">
                      {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.email}
                    </p>
                    <p className="truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={() => navigate("/home")} className="rounded-none cursor-pointer" data-testid="menu-business-go-analytics">
                    <BarChart3 className="w-4 h-4 mr-2 text-accent" />
                    Analytics Home
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/business/settings")} className="rounded-none cursor-pointer" data-testid="menu-business-settings">
                    <Settings className="w-4 h-4 mr-2 text-accent" />
                    Business Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/business/team")} className="rounded-none cursor-pointer" data-testid="menu-business-team">
                    <User className="w-4 h-4 mr-2 text-accent" />
                    Manage Team
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logOut();
                      window.location.href = "/";
                    }}
                    data-testid="menu-business-logout"
                    className="text-destructive rounded-none cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8 space-y-8 w-full">
          {/* Festival Banner */}
          <FestivalBanner />

          {/* What to do here — UX explainer strip */}
          <div className="bg-gray-50 border border-gray-200 rounded-none p-5 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
            <div className="pl-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-2">What you can do here</p>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                This is your business dashboard. View team performance, upcoming festivals, and your top KPIs at a glance. Use the sidebar to navigate to <span className="font-semibold text-primary">Log My Day</span> (EOD entries), <span className="font-semibold text-primary">Team View</span>, <span className="font-semibold text-primary">Reports</span>, or <span className="font-semibold text-primary">Business Advisor</span>.
              </p>
            </div>
          </div>

          {/* First-time "How it works" guide — shown for new owners with no data yet */}
          {showNextSteps && !welcomeDismissed && activeMembers.length <= 1 && verticals.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="border border-accent/20 bg-amber-500/5 rounded-none p-5 space-y-4 relative overflow-hidden" data-testid="panel-how-it-works">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                <div className="flex items-center justify-between pl-2">
                  <p className="font-sans font-normal text-lg flex items-center gap-2 text-primary">
                    <Sparkles className="w-4.5 h-4.5 text-accent" /> Welcome to your Business Suite — here's how to get started
                  </p>
                  <button onClick={dismissWelcome} className="text-muted-foreground hover:text-primary transition-colors p-1" data-testid="button-dismiss-welcome">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-2">
                  {[
                    {
                      step: "1",
                      title: "Set up your business",
                      body: "Add your business verticals (e.g., Sales, Operations, Retail) and configure targets and salaries in Settings.",
                      action: "Go to Settings",
                      href: "/business/settings",
                      testid: "button-howto-settings",
                    },
                    {
                      step: "2",
                      title: "Invite your team",
                      body: "Add employees and managers. They'll log daily EOD reports — revenue, deals, units — which appear here in real time.",
                      action: "Invite Members",
                      href: "/business/team",
                      testid: "button-howto-team",
                    },
                    {
                      step: "3",
                      title: "Get AI insights",
                      body: "Once data flows in, the Business Advisor generates AI revenue forecasts, PIPs, and strategy recommendations for your industry.",
                      action: "Business Advisor",
                      href: "/business/ai-strategy",
                      testid: "button-howto-ai",
                    },
                  ].map(({ step, title, body, action, href, testid }) => (
                    <div key={step} className="bg-white border border-gray-150 rounded-none p-4 space-y-2 flex flex-col justify-between shadow-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5.5 h-5.5 rounded-none bg-primary text-primary-foreground text-xs font-sans flex items-center justify-center shrink-0">{step}</span>
                          <p className="font-sans font-normal text-sm text-primary">{title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground font-sans leading-relaxed">{body}</p>
                      </div>
                      <button
                        onClick={() => navigate(href)}
                        className="text-xs text-accent hover:text-primary flex items-center gap-1 font-semibold uppercase tracking-wider font-sans mt-3 transition-colors text-left"
                        data-testid={testid}
                      >
                        {action} <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Overview stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <StatCard
              icon={Users}
              label="Team Members"
              value={activeMembers.length || profile.employeeCount}
              sub={pendingInvites.length > 0 ? `${pendingInvites.length} invite${pendingInvites.length > 1 ? 's' : ''} pending` : "All active"}
            />
            <StatCard
              icon={Layers}
              label="Verticals"
              value={verticals.length}
              sub={verticals.length > 0 ? verticals.map((v) => v.name).slice(0, 2).join(", ") : "No verticals yet"}
            />
            <StatCard
              icon={Target}
              label="Industry"
              value={profile.industryLabel}
              sub={profile.description?.slice(0, 40) || "Track, grow, excel"}
            />
          </motion.div>

          {/* Next Steps card — shown when setup incomplete or < 7 days of data */}
          {showNextSteps && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="p-5 border border-accent/25 bg-amber-500/5 rounded-none relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                <div className="flex items-start gap-3 pl-2">
                  <Sparkles className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-sans font-normal text-sm text-primary mb-2.5">
                      {hasLowDataAge && verticals.length > 0 && activeMembers.length > 1
                        ? "Keep data flowing — next steps"
                        : "Complete your setup"}
                    </p>
                    <div className="space-y-2">
                      {verticals.length === 0 && (
                        <div className="flex items-center justify-between text-xs font-sans">
                          <span className="text-muted-foreground">Add business verticals (Sales, Operations, etc.)</span>
                          <Button size="sm" variant="ghost" className="text-accent hover:text-primary h-7 px-2 font-semibold uppercase tracking-wider rounded-none" onClick={() => navigate("/business/settings")} data-testid="button-next-add-verticals">
                            Set up <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      )}
                      {activeMembers.length <= 1 && (
                        <div className="flex items-center justify-between text-xs font-sans">
                          <span className="text-muted-foreground">Invite your team members</span>
                          <Button size="sm" variant="ghost" className="text-accent hover:text-primary h-7 px-2 font-semibold uppercase tracking-wider rounded-none" onClick={() => navigate("/business/team")} data-testid="button-next-invite-team">
                            Invite <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      )}
                      {hasLowDataAge && verticals.length > 0 && activeMembers.length > 1 && (
                        <div className="flex items-center justify-between text-xs font-sans">
                          <span className="text-muted-foreground">
                            Your team has logged {recentEods.length} EOD{recentEods.length !== 1 ? 's' : ''} in the last 7 days — encourage daily logging for better AI insights
                          </span>
                          <Button size="sm" variant="ghost" className="text-accent hover:text-primary h-7 px-2 font-semibold uppercase tracking-wider rounded-none" onClick={() => navigate("/business/operations")} data-testid="button-next-view-eods">
                            View EODs <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Verticals section */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-150">
              <h2 className="font-sans font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" /> Business Verticals
              </h2>
              {isOwner && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate("/business/settings")} 
                  className="text-xs uppercase tracking-wider font-sans font-semibold rounded-none border-gray-200 text-gray-700 hover:border-primary hover:text-primary shadow-none"
                  data-testid="button-manage-verticals"
                >
                  <Plus className="w-3 h-3 mr-1 text-accent" /> Manage
                </Button>
              )}
            </div>

            {verticalsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-none" />)}
              </div>
            ) : verticals.length === 0 ? (
              <div className="p-10 text-center bg-white border border-gray-200 rounded-none shadow-sm">
                <Layers className="w-10 h-10 text-muted-foreground/45 mx-auto mb-3" />
                <p className="font-sans text-lg font-normal mb-1">No verticals yet</p>
                <p className="text-xs text-muted-foreground font-sans max-w-md mx-auto mb-4 leading-relaxed">
                  Verticals are your business divisions — like Sales, Operations, or Projects. Add them to start tracking performance per team.
                </p>
                {isOwner && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none"
                    onClick={() => navigate("/business/settings")}
                    data-testid="button-add-verticals"
                  >
                    Add Verticals
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {verticals.map((v) => (
                  <div key={v.id} className="p-5 border border-gray-200 bg-white hover:border-accent hover:shadow-md transition-all rounded-none cursor-default group relative overflow-hidden" data-testid={`card-vertical-${v.id}`}>
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gray-100 group-hover:bg-accent transition-colors" />
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-sans font-normal text-base text-primary">{v.name}</p>
                        {v.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{v.description}</p>}
                        <div className="mt-3">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-gray-200 px-2 py-0.5 bg-gray-50 rounded-none">
                            {v.metricLabel} ({v.metricUnit})
                          </span>
                        </div>
                      </div>
                      <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-accent transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Team section (owner/manager only) */}
          {(isOwner || isManager) && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-150">
                <h2 className="font-sans font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" /> Team Members
                </h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate("/business/team")}
                  className="text-xs uppercase tracking-wider font-sans font-semibold rounded-none border-gray-200 text-gray-700 hover:border-primary hover:text-primary shadow-none"
                  data-testid="button-manage-team"
                >
                  Manage Team
                </Button>
              </div>

              {membersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-none" />)}
                </div>
              ) : members.length === 0 ? (
                <div className="p-10 text-center bg-white border border-gray-200 rounded-none shadow-sm">
                  <Users className="w-10 h-10 text-muted-foreground/45 mx-auto mb-3" />
                  <p className="font-sans text-lg font-normal mb-1">Your team is empty</p>
                  <p className="text-xs text-muted-foreground font-sans max-w-md mx-auto mb-4 leading-relaxed">
                    Invite employees and managers to start tracking their daily performance and EOD reports.
                  </p>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none"
                    onClick={() => navigate("/business/team")}
                    data-testid="button-invite-first-member"
                  >
                    Invite Team Member
                  </Button>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-none shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {members.slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors" data-testid={`row-member-${m.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-none bg-primary text-primary-foreground flex items-center justify-center text-sm font-sans">
                            {(m.name || m.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-sans font-normal text-primary">{m.name || m.user?.firstName || m.email}</p>
                            <p className="text-xs text-muted-foreground font-sans mt-0.5">{m.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border font-semibold rounded-none ${m.status === 'pending' ? 'bg-amber-500/5 border-amber-500/20 text-amber-600' : 'bg-gray-50 border-gray-200 text-muted-foreground'}`}>
                            {m.status === 'pending' ? 'Invite Pending' : m.memberRole}
                          </span>
                        </div>
                      </div>
                    ))}
                    {members.length > 5 && (
                      <button
                        className="flex items-center justify-center gap-1.5 px-5 py-3 w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-accent transition-colors border-t border-gray-100"
                        onClick={() => navigate("/business/team")}
                        data-testid="button-view-all-members"
                      >
                        View all {members.length} members <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="mb-4 pb-2 border-b border-gray-150">
              <h2 className="font-sans font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" /> Quick Actions
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className="bg-white border border-gray-200 rounded-none p-5 cursor-pointer hover:border-accent hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between"
                onClick={() => navigate("/business/eod")}
                data-testid="card-log-day"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gray-100 group-hover:bg-accent transition-colors" />
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 border border-gray-150 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <p className="font-sans font-normal text-sm text-primary">Log My Day</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">Record today's revenue, deals, and expenses in under 2 minutes.</p>
              </div>

              {(isOwner || isManager) && (
                <div
                  className="bg-white border border-gray-200 rounded-none p-5 cursor-pointer hover:border-accent hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between"
                  onClick={() => navigate("/business/operations")}
                  data-testid="card-team-view"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gray-100 group-hover:bg-accent transition-colors" />
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 border border-gray-150 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <p className="font-sans font-normal text-sm text-primary">Team View</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">See your team's performance, leaderboard, and pending EOD reviews.</p>
                </div>
              )}

              <div
                className="bg-white border border-gray-200 rounded-none p-5 cursor-pointer hover:border-accent hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between"
                onClick={() => navigate("/business/ai-strategy")}
                data-testid="card-business-advisor"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gray-100 group-hover:bg-accent transition-colors" />
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 border border-gray-150 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <p className="font-sans font-normal text-sm text-primary">Business Advisor</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">AI-powered forecasts, strategy, and performance improvement plans.</p>
              </div>

              {(isOwner || isManager) && (
                <div
                  className="bg-white border border-gray-200 rounded-none p-5 cursor-pointer hover:border-accent hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between"
                  onClick={() => navigate("/business/reports")}
                  data-testid="card-reports"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gray-100 group-hover:bg-accent transition-colors" />
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 border border-gray-150 bg-gray-50 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                      <FileBarChart2 className="w-4 h-4" />
                    </div>
                    <p className="font-sans font-normal text-sm text-primary">Reports</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Daily, weekly, monthly, and YTD reports — export to PDF or CSV.</p>
                </div>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
