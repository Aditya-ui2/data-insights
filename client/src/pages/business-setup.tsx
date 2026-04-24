import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Building2, Users, Layers, Target, ChevronRight, ChevronLeft,
  Plus, Trash2, Check, Briefcase, ArrowRight, Sparkles
} from "lucide-react";

interface IndustryTemplate {
  key: string;
  label: string;
  icon: string;
  description: string;
}

interface TemplateDetail {
  key: string;
  label: string;
  icon: string;
  verticals: Array<{
    name: string;
    description: string;
    metricLabel: string;
    metricUnit: string;
    expenseCategories: string[];
  }>;
  kpiSuggestions: string[];
}

interface VerticalDraft {
  name: string;
  metricLabel: string;
  metricUnit: string;
  expenseCategories: string[];
}

const STEPS = [
  { id: 1, label: "Business Profile", icon: Building2 },
  { id: 2, label: "Industry", icon: Briefcase },
  { id: 3, label: "Verticals", icon: Layers },
  { id: 4, label: "Team Invite", icon: Users },
];

export default function BusinessSetup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Step 1: Business Profile
  const [bizName, setBizName] = useState("");
  const [employeeCount, setEmployeeCount] = useState("1");
  const [currencySymbol, setCurrencySymbol] = useState("₹");

  // Step 2: Industry
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [selectedTemplateDetail, setSelectedTemplateDetail] = useState<TemplateDetail | null>(null);

  // Step 3: Verticals
  const [verticals, setVerticals] = useState<VerticalDraft[]>([]);
  const [newVerticalName, setNewVerticalName] = useState("");

  // Step 4: Team invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [invites, setInvites] = useState<Array<{ email: string; name: string; role: string }>>([]);

  // Fetch industry templates
  const { data: templates = [] } = useQuery<IndustryTemplate[]>({
    queryKey: ["/api/business/industry-templates"],
  });

  // Fetch template detail when industry is selected
  const { isLoading: templateLoading } = useQuery<TemplateDetail>({
    queryKey: ["/api/business/industry-templates", selectedIndustry],
    enabled: !!selectedIndustry,
    queryFn: async () => {
      const res = await fetch(`/api/business/industry-templates/${selectedIndustry}`);
      const data = await res.json();
      setSelectedTemplateDetail(data);
      // Pre-populate verticals from template
      setVerticals(
        data.verticals.map((v: TemplateDetail["verticals"][0]) => ({
          name: v.name,
          metricLabel: v.metricLabel,
          metricUnit: v.metricUnit,
          expenseCategories: v.expenseCategories,
        }))
      );
      return data;
    },
  });

  // Create business profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async () => {
      const profileRes = await apiRequest("POST", "/api/business/profile", {
        name: bizName.trim(),
        industry: selectedIndustry,
        industryLabel: selectedTemplateDetail?.label || selectedIndustry,
        employeeCount: parseInt(employeeCount) || 1,
        currencySymbol,
      });
      const profile = await profileRes.json();

      // Create verticals in bulk
      if (verticals.length > 0) {
        await apiRequest("POST", "/api/business/verticals/bulk", { verticals });
      }

      // Send invites
      for (const invite of invites) {
        try {
          await apiRequest("POST", "/api/business/members/invite", invite);
        } catch (_) {
          // Non-fatal if invite fails
        }
      }

      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/profile"] });
      toast({ title: "Business Suite ready!", description: "Your workspace has been set up." });
      navigate("/business");
    },
    onError: (err: Error) => {
      toast({
        title: "Setup failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (!bizName.trim()) {
        toast({ title: "Enter your business name", variant: "destructive" });
        return;
      }
    }
    if (step === 2) {
      if (!selectedIndustry) {
        toast({ title: "Please select your industry", variant: "destructive" });
        return;
      }
    }
    if (step === 4) {
      createProfileMutation.mutate();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => {
    if (step === 1) {
      navigate("/");
    } else {
      setStep((s) => s - 1);
    }
  };

  const addVertical = () => {
    if (!newVerticalName.trim()) return;
    setVerticals((v) => [
      ...v,
      { name: newVerticalName.trim(), metricLabel: "Revenue", metricUnit: currencySymbol, expenseCategories: [] },
    ]);
    setNewVerticalName("");
  };

  const removeVertical = (i: number) => setVerticals((v) => v.filter((_, idx) => idx !== i));

  const addInvite = () => {
    if (!inviteEmail.trim()) return;
    setInvites((prev) => [
      ...prev,
      { email: inviteEmail.trim(), name: inviteName.trim(), role: inviteRole },
    ]);
    setInviteEmail("");
    setInviteName("");
    setInviteRole("employee");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" /> Business Suite Setup
          </div>
          <h1 className="text-2xl font-bold font-serif">Set up your workspace</h1>
          <p className="text-muted-foreground mt-1">Configure your business once, track performance forever.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all ${
                  step > s.id
                    ? "border-amber-500 bg-amber-500 text-black"
                    : step === s.id
                    ? "border-amber-500 text-amber-500 bg-amber-500/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                {step > s.id ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 ${step > s.id ? "bg-amber-500" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Business Profile */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="p-8 space-y-6">
                <div className="text-center">
                  <Building2 className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <h2 className="font-semibold text-xl">Your Business</h2>
                  <p className="text-muted-foreground text-sm">Basic information about your company.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Business Name *</Label>
                    <Input
                      placeholder="e.g. Sharma Marbles Pvt Ltd"
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                      data-testid="input-biz-name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Team Size</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="10"
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(e.target.value)}
                        data-testid="input-employee-count"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency Symbol</Label>
                      <div className="flex gap-2">
                        {["₹", "$", "€", "£"].map((c) => (
                          <button
                            key={c}
                            onClick={() => setCurrencySymbol(c)}
                            className={`flex-1 h-10 rounded-md border-2 font-mono text-sm transition-all ${
                              currencySymbol === c
                                ? "border-amber-500 bg-amber-500/10 text-amber-500"
                                : "border-border hover:border-primary/50"
                            }`}
                            data-testid={`button-currency-${c}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Industry */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="p-8">
                <div className="text-center mb-6">
                  <Briefcase className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <h2 className="font-semibold text-xl">Select Your Industry</h2>
                  <p className="text-muted-foreground text-sm">We'll pre-configure your verticals and KPIs automatically.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {templates.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setSelectedIndustry(t.key)}
                      className={`p-4 rounded-lg border-2 text-left transition-all hover-elevate ${
                        selectedIndustry === t.key
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      data-testid={`button-industry-${t.key}`}
                    >
                      <div className="text-2xl mb-1">{t.icon}</div>
                      <div className="font-medium text-sm">{t.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                    </button>
                  ))}
                </div>

                {selectedIndustry && selectedTemplateDetail && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-amber-500/20">
                    <p className="text-xs text-amber-400 font-medium mb-1">
                      ✓ Template loaded — {selectedTemplateDetail.verticals.length} verticals pre-configured
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTemplateDetail.verticals.map((v) => (
                        <Badge key={v.name} variant="secondary" className="text-xs">{v.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {templateLoading && selectedIndustry && (
                  <p className="mt-3 text-sm text-muted-foreground animate-pulse text-center">Loading template...</p>
                )}
              </Card>
            </motion.div>
          )}

          {/* Step 3: Verticals */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="p-8">
                <div className="text-center mb-6">
                  <Layers className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <h2 className="font-semibold text-xl">Business Verticals</h2>
                  <p className="text-muted-foreground text-sm">
                    These are the divisions you track revenue and performance for.
                  </p>
                </div>

                {/* Vertical list */}
                <div className="space-y-2 mb-4 max-h-52 overflow-y-auto pr-1">
                  {verticals.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border"
                    >
                      <div>
                        <span className="font-medium text-sm">{v.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{v.metricLabel} ({v.metricUnit})</span>
                      </div>
                      <button
                        onClick={() => removeVertical(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`button-remove-vertical-${i}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {verticals.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      No verticals yet. Add one below.
                    </p>
                  )}
                </div>

                {/* Add vertical */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a vertical (e.g. Export, Retail)"
                    value={newVerticalName}
                    onChange={(e) => setNewVerticalName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addVertical()}
                    data-testid="input-new-vertical"
                  />
                  <Button variant="outline" onClick={addVertical} data-testid="button-add-vertical">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Team Invite */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="p-8">
                <div className="text-center mb-6">
                  <Users className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <h2 className="font-semibold text-xl">Invite Your Team</h2>
                  <p className="text-muted-foreground text-sm">
                    Add team members now or skip and do it later.
                  </p>
                </div>

                {/* Invite form */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Email *</Label>
                      <Input
                        placeholder="employee@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        data-testid="input-invite-email"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        placeholder="Raj Kumar"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        data-testid="input-invite-name"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {["employee", "manager"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setInviteRole(r)}
                        className={`flex-1 py-2 rounded-lg border-2 text-sm capitalize transition-all ${
                          inviteRole === r
                            ? "border-amber-500 bg-amber-500/10 text-amber-500"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`button-role-${r}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={addInvite}
                    disabled={!inviteEmail.trim()}
                    data-testid="button-add-invite"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add to invite list
                  </Button>
                </div>

                {/* Pending invites */}
                {invites.length > 0 && (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    <p className="text-xs text-muted-foreground font-medium">Will invite:</p>
                    {invites.map((inv, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/40 text-sm">
                        <span>{inv.email}</span>
                        <Badge variant="secondary" className="text-xs capitalize">{inv.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-4 text-center">
                  You can always invite more team members from the Business Suite settings.
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={createProfileMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            data-testid="button-next"
          >
            {step === 4 ? (
              createProfileMutation.isPending ? "Setting up..." : (
                <><Check className="w-4 h-4 mr-1" /> Launch Business Suite</>
              )
            ) : step === 3 ? (
              <><ArrowRight className="w-4 h-4 mr-1" /> Continue</>
            ) : (
              <><ChevronRight className="w-4 h-4 mr-1" /> Continue</>
            )}
          </Button>
        </div>

        {step !== 4 && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            Step {step} of {STEPS.length}
          </p>
        )}
      </div>
    </div>
  );
}
