import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  Target,
  BarChart2,
  BrainCircuit,
  Database,
  FileBarChart2,
  MapPin,
  CheckSquare,
  Menu,
  FileText,
  ChevronDown,
  ChevronRight,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  memberRole: string;
  ownerId: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  badge?: string;
}

interface NavGroup {
  label: string;
  type: "group";
  items: NavItem[];
}

type SidebarElement = NavItem | NavGroup;

const SIDEBAR_ITEMS = (role: string): SidebarElement[] => {
  const attendanceHref = role === "employee" ? "/business/field-tracking/runner" : "/business/field-tracking";

  return [
    { label: "Dashboard", href: "/business", icon: LayoutDashboard },
    {
      label: "Activities",
      type: "group",
      items: [
        { label: "Log My Day", href: "/business/eod", icon: ClipboardList },
        { label: "Daily Tracking", href: "/business/daily-tracking", icon: FileText, roles: ["employee", "owner", "manager"] },
        { label: "Task Board", href: "/business/tasks", icon: CheckSquare }
      ]
    },
    {
      label: "People",
      type: "group",
      items: [
        { label: "Attendance", href: attendanceHref, icon: MapPin },
        { label: "Team Performance", href: "/business/operations", icon: BarChart3, roles: ["owner", "manager"] }
      ]
    },
    { label: "Customers", href: "/business/customers", icon: Users, roles: ["owner", "manager"] },
    { label: "Goals & Targets", href: "/business/goals", icon: Target, roles: ["owner", "manager"] },
    { label: "Reports", href: "/business/reports", icon: FileBarChart2, roles: ["owner", "manager"] },
    { label: "Business Advisor (AI)", href: "/business/ai-strategy", icon: BrainCircuit },
    { label: "Alerts", href: "/business/alerts", icon: Bell, roles: ["owner", "manager"] },
    { label: "Integrations", href: "/data-import-suite", icon: Database, roles: ["owner", "manager"] },
    { label: "Settings", href: "/business/settings", icon: Settings, roles: ["owner"] }
  ];
};

const getFlatItems = (role: string): NavItem[] => {
  const elements = SIDEBAR_ITEMS(role);
  const flat: NavItem[] = [];
  elements.forEach(el => {
    if ("type" in el && el.type === "group") {
      el.items.forEach(sub => {
        if (!sub.roles || sub.roles.includes(role)) {
          flat.push(sub);
        }
      });
    } else {
      const item = el as NavItem;
      if (!item.roles || item.roles.includes(role)) {
        flat.push(item);
      }
    }
  });
  return flat;
};

export default function BusinessSidebar({ compact = false }: { compact?: boolean }) {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // States to keep the groupings open by default
  const [activitiesOpen, setActivitiesOpen] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(true);

  const { data: profile } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  const role = profile?.memberRole ?? "employee";

  if (compact) {
    const flatItems = getFlatItems(role);
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {flatItems.map(item => (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-xs",
              (location === item.href)
                ? "bg-amber-500/10 text-amber-500 font-medium"
                : "hover:bg-muted/60 text-muted-foreground"
            )}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  // Shared nav content used in both desktop sidebar and mobile sheet
  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => {
    const items = SIDEBAR_ITEMS(role);

    return (
      <>
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 className="w-4 h-4 text-accent" />
            <span className="font-sans font-bold text-sm truncate text-primary">{profile?.name ?? "Business Suite"}</span>
          </div>
          {profile && (
            <Badge className="text-[10px] uppercase font-bold tracking-wider rounded-none bg-accent/10 text-accent border border-accent/20 hover:bg-accent/10">{role}</Badge>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto bg-[#fbfaf7]">
          {items.map((item) => {
            if ("type" in item && item.type === "group") {
              const isOpen = item.label === "Activities" ? activitiesOpen : peopleOpen;
              const setIsOpen = item.label === "Activities" ? setActivitiesOpen : setPeopleOpen;
              
              // Filter sub-items based on role
              const visibleSubItems = item.items.filter(sub => !sub.roles || sub.roles.includes(role));
              if (visibleSubItems.length === 0) return null;

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 hover:text-primary transition-colors text-left"
                  >
                    <span>{item.label}</span>
                    {isOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground/60" /> : <ChevronRight className="w-3 h-3 text-muted-foreground/60" />}
                  </button>
                  
                  {isOpen && (
                    <div className="pl-1.5 space-y-1 border-l border-gray-200 ml-3">
                      {visibleSubItems.map(sub => {
                        const isActive = location === sub.href;
                        return (
                          <button
                            key={sub.href}
                            onClick={() => { navigate(sub.href); onNavigate?.(); }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition-all text-left rounded-none relative group",
                              isActive
                                ? "bg-white text-primary border border-gray-250 shadow-sm"
                                : "text-muted-foreground hover:bg-gray-50 hover:text-primary border border-transparent"
                            )}
                            data-testid={`nav-business-${sub.label.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />}
                            <sub.icon className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isActive ? "text-accent" : "text-muted-foreground/60 group-hover:text-primary")} />
                            <span className="font-sans">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            } else {
              const navItem = item as NavItem;
              if (navItem.roles && !navItem.roles.includes(role)) return null;

              const isActive = location === navItem.href;
              return (
                <button
                  key={navItem.href}
                  onClick={() => { navigate(navItem.href); onNavigate?.(); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-xs uppercase tracking-wider font-semibold transition-all text-left rounded-none relative group",
                    isActive
                      ? "bg-white text-primary border border-gray-250 shadow-sm"
                      : "text-muted-foreground hover:bg-gray-50 hover:text-primary border border-transparent"
                  )}
                  data-testid={`nav-business-${navItem.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />}
                  <navItem.icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-accent" : "text-muted-foreground/60 group-hover:text-primary")} />
                  <span className="font-sans">{navItem.label}</span>
                  {navItem.badge && (
                    <Badge className="ml-auto text-[9px] px-1.5 py-0 bg-accent/10 text-accent border border-accent/20 rounded-none uppercase font-bold tracking-wider">{navItem.badge}</Badge>
                  )}
                </button>
              );
            }
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 bg-white">
          <Button
            variant="ghost"
            size="default"
            className="w-full h-10 justify-center gap-2 text-primary-foreground font-semibold bg-primary hover:bg-primary/90 border border-primary text-xs uppercase tracking-wider rounded-none shadow-none"
            onClick={() => { navigate("/home"); onNavigate?.(); }}
            data-testid="button-switch-analytics"
          >
            <BarChart2 className="w-4 h-4 text-accent" />
            Switch to Analytics
          </Button>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-52 shrink-0 border-r border-gray-200 bg-[#fbfaf7] h-screen sticky top-0 flex-col">
        <NavContent />
      </aside>

      {/* Mobile hamburger button — visible only on mobile */}
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
    </>
  );
}
