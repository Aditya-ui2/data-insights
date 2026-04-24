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
  Map,
  MapPin,
  CheckSquare,
  Menu,
  FileText,
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

const NAV_ITEMS: NavItem[] = [
  { label: "My Business", href: "/business", icon: LayoutDashboard },
  { label: "Log My Day", href: "/business/eod", icon: ClipboardList },
  { label: "Daily Tracking", href: "/business/daily-tracking", icon: FileText, roles: ["employee"] },
  { label: "Attendance", href: "/business/field-tracking/runner", icon: MapPin, roles: ["employee"] },
  { label: "Task Board", href: "/business/tasks", icon: CheckSquare },
  { label: "Business Advisor", href: "/business/ai-strategy", icon: BrainCircuit },
  { label: "Team View", href: "/business/operations", icon: BarChart3, roles: ["owner", "manager"] },
  { label: "Field Tracking", href: "/business/field-tracking", icon: Map, roles: ["owner", "manager"] },
  { label: "Track Templates", href: "/business/tracking/templates", icon: FileText, roles: ["owner", "manager"] },
  { label: "My Teams", href: "/business/team", icon: Users, roles: ["owner", "manager"] },
  { label: "Reports", href: "/business/reports", icon: FileBarChart2, roles: ["owner", "manager"] },
  { label: "Data Import", href: "/data-import-suite", icon: Database, roles: ["owner", "manager"] },
  { label: "Settings", href: "/business/settings", icon: Settings, roles: ["owner"] },
];

export default function BusinessSidebar({ compact = false }: { compact?: boolean }) {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: profile } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  const role = profile?.memberRole ?? "employee";

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || item.roles.includes(role)
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {visibleItems.map(item => (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-xs",
              location === item.href
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
  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="p-4 border-b border-amber-500/30">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-sm truncate text-white">{profile?.name ?? "Business Suite"}</span>
        </div>
        {profile && (
          <Badge className="text-xs capitalize bg-amber-500/20 text-amber-300 border border-amber-500/40">{role}</Badge>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map(item => (
          <button
            key={item.href}
            onClick={() => { navigate(item.href); onNavigate?.(); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left",
              location === item.href
                ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40"
                : "text-white/70 hover:bg-white/8 hover:text-white"
            )}
            data-testid={`nav-business-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <item.icon className={cn("w-4 h-4 shrink-0", location === item.href ? "text-amber-400" : "text-white/50")} />
            <span>{item.label}</span>
            {item.badge && (
              <Badge className="ml-auto text-[10px] px-1.5 py-0 bg-amber-500/30 text-amber-200 border-0">{item.badge}</Badge>
            )}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-amber-500/30">
        <Button
          variant="ghost"
          size="default"
          className="w-full h-10 justify-start gap-2 text-black font-semibold bg-amber-500 hover:bg-amber-400 border-0 text-sm"
          onClick={() => { navigate("/home"); onNavigate?.(); }}
          data-testid="button-switch-analytics"
        >
          <BarChart2 className="w-4 h-4" />
          Switch to Analytics
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-52 shrink-0 border-r border-amber-500/20 bg-black h-screen sticky top-0 flex-col">
        <NavContent />
      </aside>

      {/* Mobile hamburger button — visible only on mobile */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-black border-amber-500/40 text-amber-400 shadow-sm hover:bg-amber-500/10"
              data-testid="button-mobile-menu"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 flex flex-col bg-black border-r border-amber-500/20">
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
