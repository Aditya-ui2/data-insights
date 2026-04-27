import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Settings, ArrowLeft, Plus, ChevronRight, Sparkles,
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

function StatCard({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Icon className="w-5 h-5 text-amber-500" />
        </div>
      </div>
    </Card>
  );
}

function FestivalBanner() {
  const upcoming = getUpcomingFestivals(30);
  if (upcoming.length === 0) return null;
  const { festival, daysAway } = upcoming[0];
  const urgency = daysAway <= 7 ? "bg-amber-500/15 border-amber-500/40" : "bg-card border-border";
  const label = daysAway === 0 ? "Today!" : daysAway === 1 ? "Tomorrow" : `${daysAway} days away`;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
      <div className={`border rounded-xl px-5 py-3 flex items-center justify-between gap-4 ${urgency}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{festival.emoji}</span>
          <div>
            <p className="font-semibold text-sm">{festival.name} — <span className="text-amber-500">{label}</span></p>
            {festival.tip && <p className="text-xs text-muted-foreground mt-0.5">{festival.tip}</p>}
          </div>
        </div>
        {upcoming.length > 1 && (
          <Badge variant="outline" className="text-xs shrink-0">
            +{upcoming.length - 1} more this month
          </Badge>
        )}
      </div>
    </motion.div>
  );
}

function FYContextBadge() {
  const fy = getCurrentFY();
  return (
    <Badge variant="secondary" className="text-xs font-normal gap-1.5" data-testid="badge-fy-context">
      <span className="opacity-60">📅</span>
      {fy.label} · Month {fy.monthInFY} of 12
    </Badge>
  );
}

export default function BusinessHome() {
  const [, navigate] = useLocation();

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
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Building2 className="w-14 h-14 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">No Business Profile Found</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Set up your Business Suite to track performance, manage your team, and get AI insights.
          </p>
          <Button
            onClick={() => navigate("/business/setup")}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            data-testid="button-start-setup"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Set Up Business Suite
          </Button>
          <button 
            onClick={() => navigate("/home")} 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto mt-2"
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
  const showNextSteps = isOwner && (verticals.length === 0 || activeMembers.length <= 1 || hasLowDataAge);

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
      <div className="min-h-screen bg-background flex">
        <BusinessSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <h1 className="font-bold text-lg leading-tight">{profile.name}</h1>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile.industryLabel} · Employee
                </p>
              </div>
              <div className="flex items-center gap-2">
                <FYContextBadge />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full border border-border/70 bg-card/80 hover:bg-muted/70"
                    >
                      <Avatar className="w-8 h-8 ring-1 ring-amber-400/40">
                        <AvatarImage src={user?.profileImageUrl ?? undefined} />
                        <AvatarFallback className="bg-amber-600 text-white font-semibold">
                          {user?.firstName?.[0] ?? user?.email?.[0] ?? "E"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground truncate">
                        {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.email}
                      </p>
                      <p className="truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/home")}>
                      <BarChart3 className="w-4 h-4 mr-2" /> Analytics Home
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => { await logOut(); window.location.href = "/"; }}
                      className="text-destructive"
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
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl font-bold text-amber-400">
                  {firstName[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {firstName}! 👋</h2>
                  <p className="text-sm text-muted-foreground">
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
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-300">EOD not logged for today</p>
                      <p className="text-xs text-amber-500/70 mt-0.5">Log your revenue, deals, and expenses before the day ends.</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold shrink-0"
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
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employeeActions.map(({ icon: Icon, title, desc, href, highlight, badge }) => (
                  <Card
                    key={href}
                    onClick={() => navigate(href)}
                    className={`p-4 cursor-pointer transition-all group hover:border-amber-500/40 ${highlight ? "border-amber-500/40 bg-amber-500/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${highlight ? "text-amber-400" : "text-amber-500"}`} />
                        <p className="font-medium text-sm">{title}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {badge && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${loggedToday ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>
                            {badge}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </Card>
                ))}
              </div>
            </motion.div>

            {/* Business verticals info */}
            {verticals.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your Business Divisions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {verticals.map((v) => (
                    <Card key={v.id} className="p-4">
                      <p className="font-medium text-sm">{v.name}</p>
                      {v.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{v.description}</p>}
                      <Badge variant="secondary" className="mt-2 text-xs">{v.metricLabel} ({v.metricUnit})</Badge>
                    </Card>
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
    <div className="min-h-screen bg-background flex">
      <BusinessSidebar />
      {profile && !isSecondaryLoading && (
        <QuickWinPopup suite="business" isFirstVisit={showNextSteps} />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="font-bold text-lg leading-tight">{profile.name}</h1>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile.industryLabel} · {profile.memberRole}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FYContextBadge />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/home")}
                data-testid="button-analytics"
              >
                <BarChart3 className="w-4 h-4 mr-1" /> Analytics
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-border/70 bg-card/80 hover:bg-muted/70"
                    data-testid="button-business-profile-menu"
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
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground truncate">
                      {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.email}
                    </p>
                    <p className="truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/home")} data-testid="menu-business-go-analytics">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics Home
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/business/settings")} data-testid="menu-business-settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Business Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/business/team")} data-testid="menu-business-team">
                    <User className="w-4 h-4 mr-2" />
                    Manage Team
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logOut();
                      window.location.href = "/";
                    }}
                    data-testid="menu-business-logout"
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

        <main className="max-w-5xl mx-auto px-6 py-8 space-y-8 w-full">
          {/* Festival Banner */}
          <FestivalBanner />

          {/* What to do here — UX explainer strip */}
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">What you can do here</p>
            <p className="text-sm text-muted-foreground">
              This is your business dashboard. View team performance, upcoming festivals, and your top KPIs at a glance. Use the sidebar to navigate to <span className="font-medium text-foreground">Log My Day</span> (EOD entries), <span className="font-medium text-foreground">Team View</span>, <span className="font-medium text-foreground">Reports</span>, or <span className="font-medium text-foreground">Business Advisor</span>.
            </p>
          </div>

          {/* First-time "How it works" guide — shown for new owners with no data yet */}
          {showNextSteps && activeMembers.length <= 1 && verticals.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-5 space-y-4" data-testid="panel-how-it-works">
                <p className="font-semibold flex items-center gap-2 text-amber-500">
                  <Sparkles className="w-4 h-4" /> Welcome to your Business Suite — here's how to get started
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      step: "1",
                      title: "Set up your business",
                      body: "Add your business verticals (e.g., Sales, Operations, Retail) and configure targets and salaries in Settings.",
                      action: "Go to Settings",
                      href: "/business/setup",
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
                    <div key={step} className="bg-background/40 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
                        <p className="font-medium text-sm">{title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{body}</p>
                      <button
                        onClick={() => navigate(href)}
                        className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium transition-colors"
                        data-testid={testid}
                      >
                        {action} <ChevronRight className="w-3 h-3" />
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
              <Card className="p-5 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-2">
                      {hasLowDataAge && verticals.length > 0 && activeMembers.length > 1
                        ? "Keep data flowing — next steps"
                        : "Complete your setup"}
                    </p>
                    <div className="space-y-2">
                      {verticals.length === 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Add business verticals (Sales, Operations, etc.)</span>
                          <Button size="sm" variant="ghost" className="text-amber-500 h-7 px-2" onClick={() => navigate("/business/setup")} data-testid="button-next-add-verticals">
                            Set up <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      )}
                      {activeMembers.length <= 1 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Invite your team members</span>
                          <Button size="sm" variant="ghost" className="text-amber-500 h-7 px-2" onClick={() => navigate("/business/team")} data-testid="button-next-invite-team">
                            Invite <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      )}
                      {hasLowDataAge && verticals.length > 0 && activeMembers.length > 1 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Your team has logged {recentEods.length} EOD{recentEods.length !== 1 ? 's' : ''} in the last 7 days — encourage daily logging for better AI insights
                          </span>
                          <Button size="sm" variant="ghost" className="text-amber-500 h-7 px-2" onClick={() => navigate("/business/operations")} data-testid="button-next-view-eods">
                            View EODs <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Verticals section */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" /> Business Verticals
              </h2>
              {isOwner && (
                <Button variant="outline" size="sm" onClick={() => navigate("/business/setup")} data-testid="button-manage-verticals">
                  <Plus className="w-3 h-3 mr-1" /> Manage
                </Button>
              )}
            </div>

            {verticalsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : verticals.length === 0 ? (
              <Card className="p-10 text-center">
                <Layers className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-medium mb-1">No verticals yet</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Verticals are your business divisions — like Sales, Operations, or Projects. Add them to start tracking performance per team.
                </p>
                {isOwner && (
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    onClick={() => navigate("/business/setup")}
                    data-testid="button-add-verticals"
                  >
                    Add Verticals
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {verticals.map((v) => (
                  <Card key={v.id} className="p-4 hover:border-amber-500/30 transition-all cursor-default" data-testid={`card-vertical-${v.id}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        {v.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{v.description}</p>}
                        <Badge variant="secondary" className="mt-2 text-xs">{v.metricLabel} ({v.metricUnit})</Badge>
                      </div>
                      <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>

          {/* Team section (owner/manager only) */}
          {(isOwner || isManager) && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" /> Team Members
                </h2>
                <Button variant="outline" size="sm" onClick={() => navigate("/business/team")} data-testid="button-manage-team">
                  Manage Team
                </Button>
              </div>

              {membersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : members.length === 0 ? (
                <Card className="p-10 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium mb-1">Your team is empty</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Invite employees and managers to start tracking their daily performance and EOD reports.
                  </p>
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    onClick={() => navigate("/business/team")}
                    data-testid="button-invite-first-member"
                  >
                    Invite Team Member
                  </Button>
                </Card>
              ) : (
                <Card>
                  <div className="divide-y divide-border">
                    {members.slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-5 py-3" data-testid={`row-member-${m.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-sm font-semibold">
                            {(m.name || m.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{m.name || m.user?.firstName || m.email}</p>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`text-xs capitalize ${m.status === 'pending' ? 'text-amber-500 border-amber-500/30' : ''}`}
                          >
                            {m.status === 'pending' ? 'Invite Pending' : m.memberRole}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {members.length > 5 && (
                      <button
                        className="flex items-center gap-1 px-5 py-3 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => navigate("/business/team")}
                        data-testid="button-view-all-members"
                      >
                        View all {members.length} members <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card
                className="p-4 cursor-pointer hover:border-amber-500/40 transition-all group"
                onClick={() => navigate("/business/eod")}
                data-testid="card-log-day"
              >
                <div className="flex items-center gap-3 mb-1">
                  <ClipboardList className="w-4 h-4 text-amber-500" />
                  <p className="font-medium text-sm">Log My Day</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-amber-500 transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground">Record today's revenue, deals, and expenses in under 2 minutes.</p>
              </Card>

              {(isOwner || isManager) && (
                <Card
                  className="p-4 cursor-pointer hover:border-amber-500/40 transition-all group"
                  onClick={() => navigate("/business/operations")}
                  data-testid="card-team-view"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <BarChart3 className="w-4 h-4 text-amber-500" />
                    <p className="font-medium text-sm">Team View</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-amber-500 transition-colors" />
                  </div>
                  <p className="text-xs text-muted-foreground">See your team's performance, leaderboard, and pending EOD reviews.</p>
                </Card>
              )}

              <Card
                className="p-4 cursor-pointer hover:border-amber-500/40 transition-all group"
                onClick={() => navigate("/business/ai-strategy")}
                data-testid="card-business-advisor"
              >
                <div className="flex items-center gap-3 mb-1">
                  <BrainCircuit className="w-4 h-4 text-amber-500" />
                  <p className="font-medium text-sm">Business Advisor</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-amber-500 transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground">AI-powered forecasts, strategy, and performance improvement plans.</p>
              </Card>

              {(isOwner || isManager) && (
                <Card
                  className="p-4 cursor-pointer hover:border-amber-500/40 transition-all group"
                  onClick={() => navigate("/business/reports")}
                  data-testid="card-reports"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <FileBarChart2 className="w-4 h-4 text-amber-500" />
                    <p className="font-medium text-sm">Reports</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-amber-500 transition-colors" />
                  </div>
                  <p className="text-xs text-muted-foreground">Daily, weekly, monthly, and YTD reports — export to PDF or CSV.</p>
                </Card>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
