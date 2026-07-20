import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessSidebar from "@/components/business-sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Users, ArrowLeft, UserPlus, Trash2, Copy, Check
} from "lucide-react";
import type { BusinessMemberWithUser } from "@shared/schema";

function RoleBadge({ role, status }: { role: string; status: string }) {
  if (status === "pending") {
    return <Badge variant="outline" className="text-accent border-accent/40 bg-accent/5 rounded-none text-xs">Invite Pending</Badge>;
  }
  const colors: Record<string, string> = {
    owner: "text-accent border-accent/30 bg-accent/5 rounded-none",
    manager: "text-primary border-primary/30 bg-primary/5 rounded-none",
    employee: "text-muted-foreground border-gray-200 bg-gray-50/50 rounded-none",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${colors[role] ?? ""}`}>
      {role}
    </Badge>
  );
}

export default function BusinessTeam() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery<{
    id: string; ownerId: string; name: string; memberRole?: string
  }>({
    queryKey: ["/api/business/profile"],
  });

  const { data: members = [], isLoading } = useQuery<BusinessMemberWithUser[]>({
    queryKey: ["/api/business/members"],
    enabled: !!profile,
  });

  // Redirect non-owner/manager users back to business home; they have no actions here
  useEffect(() => {
    if (!profileLoading && profile) {
      const role = profile.memberRole;
      if (role && role !== "owner" && role !== "manager") {
        navigate("/business");
      }
    }
  }, [profile, profileLoading, navigate]);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/business/members/invite", {
        email: inviteEmail,
        name: inviteName || undefined,
        memberRole: inviteRole,
      });
    },
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/business/members"] });
      if (data.inviteLink) {
        const fullLink = `${window.location.origin}${data.inviteLink}`;
        await navigator.clipboard.writeText(fullLink).catch(() => {});
        toast({
          title: "Invite created",
          description: "Invite link copied to clipboard.",
        });
      } else {
        toast({ title: "Invite created" });
      }
      setShowInvite(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("employee");
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to invite",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/business/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/members"] });
      toast({ title: "Member removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove member", description: err.message, variant: "destructive" });
    },
  });

  const copyInviteLink = async (m: BusinessMemberWithUser & { inviteToken?: string }) => {
    if (!m.inviteToken) return;
    const link = `${window.location.origin}/business/join?token=${m.inviteToken}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(m.id);
    setTimeout(() => setCopiedLink(null), 2000);
    toast({ title: "Invite link copied" });
  };
  return (
    <div className="min-h-screen bg-[#fbfaf7] flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/business")}
                className="text-muted-foreground hover:text-primary rounded-none"
                data-testid="button-back-business"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" /> My Teams
                </h1>
                <p className="text-xs text-muted-foreground">{profile?.name || "Business Suite"} · Member Roster & Access Control</p>
              </div>
            </div>
            <Button
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-wider text-xs px-4 h-9 shadow-none flex items-center gap-1.5"
              onClick={() => setShowInvite(true)}
              data-testid="button-invite-member"
            >
              <UserPlus className="w-4 h-4" /> Invite Member
            </Button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-8 w-full space-y-6">
        {/* What to do here — UX explainer */}
        <div className="bg-white border border-gray-200 rounded-none p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-accent/40"></div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-3">How My Teams works</p>
          <div className="grid sm:grid-cols-3 gap-6 text-xs text-muted-foreground">
            <div className="flex items-start gap-3">
              <span className="text-accent font-bold text-sm leading-none mt-0.5">01</span>
              <div>
                <p className="font-semibold text-primary mb-1">Invite members</p>
                <p className="leading-relaxed">Send invite links to employees and managers. They create an account and join your business.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-accent font-bold text-sm leading-none mt-0.5">02</span>
              <div>
                <p className="font-semibold text-primary mb-1">They log daily EODs</p>
                <p className="leading-relaxed">Employees submit revenue, deals, units, and expenses via "Log My Day" every workday.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-accent font-bold text-sm leading-none mt-0.5">03</span>
              <div>
                <p className="font-semibold text-primary mb-1">You review in Team View</p>
                <p className="leading-relaxed">All submissions appear on the operations dashboard for tracking and review.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Members list */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-none border-gray-200 shadow-none bg-white">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-none" />)}
              </div>
            ) : members.length === 0 ? (
              <div className="py-16 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-none bg-primary/5 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-sans font-bold text-base text-primary uppercase tracking-wider mb-2">Your team is empty</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Invite employees and managers so they can log their daily EOD reports and be tracked in the operations dashboard.
                </p>
                <Button 
                  size="sm" 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-none uppercase tracking-wider text-xs px-5 h-9 shadow-none inline-flex items-center gap-1.5" 
                  onClick={() => setShowInvite(true)} 
                  data-testid="button-invite-first"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Invite First Member
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-5 py-4"
                    data-testid={`row-member-${m.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-none bg-primary/5 text-primary border border-primary/10 flex items-center justify-center font-semibold text-sm">
                        {(m.name || m.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{m.name || m.user?.firstName || m.email}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={m.memberRole} status={m.status} />
                      {m.status === "pending" && (m as BusinessMemberWithUser & { inviteToken?: string }).inviteToken && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none border border-gray-200 bg-white hover:bg-gray-50 text-muted-foreground hover:text-primary"
                          title="Copy invite link"
                          onClick={() => copyInviteLink(m as BusinessMemberWithUser & { inviteToken?: string })}
                          data-testid={`button-copy-invite-${m.id}`}
                        >
                          {copiedLink === m.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                      {m.memberRole !== "owner" && profile?.ownerId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none border border-gray-200 bg-white hover:bg-gray-50 text-destructive hover:bg-destructive/5 hover:text-destructive"
                          onClick={() => removeMutation.mutate(m.id)}
                          disabled={removeMutation.isPending}
                          data-testid={`button-remove-member-${m.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Invite Dialog */}
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogContent data-testid="dialog-invite" className="rounded-none border-gray-200 bg-white">
            <DialogHeader>
              <DialogTitle className="font-sans font-bold uppercase tracking-wider text-sm text-primary">Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Email Address *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="rounded-none border-gray-200 focus-visible:ring-1 focus-visible:ring-accent"
                  data-testid="input-invite-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-name" className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Name (optional)</Label>
                <Input
                  id="invite-name"
                  placeholder="Full name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="rounded-none border-gray-200 focus-visible:ring-1 focus-visible:ring-accent"
                  data-testid="input-invite-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger data-testid="select-invite-role" className="rounded-none border-gray-200 focus:ring-1 focus:ring-accent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="employee" className="focus:bg-primary/5 focus:text-primary rounded-none">Employee</SelectItem>
                    <SelectItem value="manager" className="focus:bg-primary/5 focus:text-primary rounded-none">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setShowInvite(false)} className="rounded-none text-xs uppercase tracking-wider font-semibold">Cancel</Button>
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-none uppercase tracking-wider text-xs px-5 h-9 shadow-none"
                onClick={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending || !inviteEmail}
                data-testid="button-send-invite"
              >
                {inviteMutation.isPending ? "Sending…" : "Send Invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </main>
      </div>
    </div>
  );
}
