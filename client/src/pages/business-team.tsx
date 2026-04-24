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
    return <Badge variant="outline" className="text-amber-500 border-amber-500/40 text-xs">Invite Pending</Badge>;
  }
  const colors: Record<string, string> = {
    owner: "text-amber-500 border-amber-500/40",
    manager: "text-blue-500 border-blue-500/40",
    employee: "text-muted-foreground",
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
    <div className="min-h-screen bg-background flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/business")} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-business">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" /> My Teams
                </h1>
                <p className="text-xs text-muted-foreground">{profile?.name}</p>
              </div>
            </div>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              size="sm"
              onClick={() => setShowInvite(true)}
              data-testid="button-invite-member"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Invite Member
            </Button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-8 w-full space-y-6">
        {/* What to do here — UX explainer */}
        <div className="bg-muted/30 border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">How My Teams works</p>
          <div className="flex flex-col sm:flex-row gap-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">1.</span>
              <span><span className="font-medium text-foreground">Invite members</span> — send invite links to employees and managers. They create an account and join your business.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">2.</span>
              <span><span className="font-medium text-foreground">They log daily EODs</span> — employees submit revenue, deals, units, and expenses via "Log My Day" every workday.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">3.</span>
              <span><span className="font-medium text-foreground">You review in Team View</span> — all submissions appear on the operations dashboard for tracking and review.</span>
            </div>
          </div>
        </div>

        {/* Members list */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium mb-1">Your team is empty</p>
                <p className="text-sm text-muted-foreground mb-3">Invite employees and managers so they can log their daily EOD reports and be tracked in the operations dashboard.</p>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={() => setShowInvite(true)} data-testid="button-invite-first">
                  <UserPlus className="w-3 h-3 mr-1" /> Invite First Member
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-5 py-3"
                    data-testid={`row-member-${m.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-semibold text-sm">
                        {(m.name || m.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.name || m.user?.firstName || m.email}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={m.memberRole} status={m.status} />
                      {m.status === "pending" && (m as BusinessMemberWithUser & { inviteToken?: string }).inviteToken && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
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
                          className="h-7 w-7 text-destructive hover:text-destructive"
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
          <DialogContent data-testid="dialog-invite">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="invite-email">Email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  data-testid="input-invite-email"
                />
              </div>
              <div>
                <Label htmlFor="invite-name">Name (optional)</Label>
                <Input
                  id="invite-name"
                  placeholder="Full name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  data-testid="input-invite-name"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger data-testid="select-invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
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
