import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Building2, Users, Layers, ChevronRight, ChevronLeft,
  Plus, Trash2, Check, Briefcase, ArrowRight, Sparkles,
  ArrowLeft, Gem, Armchair, Smartphone, Sun, Code2,
  ShoppingBag, Factory, TrendingUp, UtensilsCrossed, Home,
  Stethoscope, GraduationCap, type LucideIcon
} from "lucide-react";

// Map industry keys to premium Lucide icons
const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  marble_granite: Gem,
  furniture: Armchair,
  electronics: Smartphone,
  solar_energy: Sun,
  software_agency: Code2,
  retail_trading: ShoppingBag,
  manufacturing: Factory,
  stocks_finance: TrendingUp,
  food_beverage: UtensilsCrossed,
  real_estate: Home,
  healthcare: Stethoscope,
  education: GraduationCap,
};

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

// Animated background component
function SetupBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#fbfaf7]">
      {/* Gradient orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-[#c59b43]/8 to-[#1cbd9c]/8 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-[#1cbd9c]/8 to-[#c59b43]/8 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-[#c59b43]/30 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            opacity: 0,
          }}
          animate={{
            y: [null, Math.random() * -200],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

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
    <div className="min-h-screen bg-[#fbfaf7] text-gray-900 relative">
      <SetupBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="relative inline-block"
            >
              <motion.div
                className="absolute inset-0 rounded-none bg-[#c59b43]/20 blur-md"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-none bg-white border border-[#c59b43]/30 text-sm font-medium mb-4 shadow-sm">
                <Sparkles className="w-4 h-4 text-[#c59b43]" style={{ color: "#c59b43" }} />
                <span className="text-[#c59b43]" style={{ color: "#c59b43" }}>Business Suite Setup</span>
              </div>
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">
              Set up your workspace
            </h1>
            <p className="text-gray-500">
              Configure your business once, track performance forever.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-0 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <motion.div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    step > s.id
                      ? "border-[#c59b43] bg-[#c59b43] text-white"
                      : step === s.id
                      ? "border-[#c59b43] text-[#c59b43] bg-[#c59b43]/10"
                      : "border-gray-300 text-gray-400"
                  }`}
                  animate={step === s.id ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {step > s.id ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                </motion.div>
                {i < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 transition-colors ${step > s.id ? "bg-[#c59b43]" : "bg-gray-300"}`} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Business Profile */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-none bg-white backdrop-blur-xl border border-gray-200 shadow-lg p-8">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-[#c59b43]/30 rounded-none" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-[#c59b43]/30 rounded-none" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#c59b43]/5 rounded-full blur-3xl" />

                  <div className="relative">
                    <div className="text-center mb-6">
                      <motion.div
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#c59b43]/10 to-[#1cbd9c]/5 border border-[#c59b43]/30 flex items-center justify-center mx-auto mb-4"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        <Building2 className="w-7 h-7 text-[#c59b43]" style={{ color: "#c59b43" }} />
                      </motion.div>
                      <h2 className="font-bold text-xl text-gray-900">Your Business</h2>
                      <p className="text-gray-500 text-sm mt-1">Basic information about your company.</p>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">Business Name <span className="text-[#c59b43]">*</span></Label>
                        <Input
                          placeholder="e.g. Sharma Marbles Pvt Ltd"
                          value={bizName}
                          onChange={(e) => setBizName(e.target.value)}
                          data-testid="input-biz-name"
                          className="bg-gray-50 border-gray-300 rounded-none text-gray-900 placeholder:text-gray-400 focus:border-[#c59b43] focus:ring-[#c59b43]/20"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-700 text-sm">Team Size</Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="10"
                            value={employeeCount}
                            onChange={(e) => setEmployeeCount(e.target.value)}
                            data-testid="input-employee-count"
                            className="bg-gray-50 border-gray-300 rounded-none text-gray-900 placeholder:text-gray-400 focus:border-[#c59b43] focus:ring-[#c59b43]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700 text-sm">Currency Symbol</Label>
                          <div className="flex gap-2">
                            {["₹", "$", "€", "£"].map((c) => (
                              <button
                                key={c}
                                onClick={() => setCurrencySymbol(c)}
                                className={`flex-1 h-10 rounded-none border-2 font-mono text-sm transition-all ${
                                  currencySymbol === c
                                    ? "border-[#c59b43] bg-[#c59b43]/10 text-[#c59b43]"
                                    : "border-gray-300 text-gray-500 hover:border-gray-400"
                                }`}
                                style={currencySymbol === c ? { color: "#c59b43" } : {}}
                                data-testid={`button-currency-${c}`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Industry */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-none bg-white backdrop-blur-xl border border-gray-200 shadow-lg p-8">
                  <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-[#c59b43]/30 rounded-none" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-[#c59b43]/30 rounded-none" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#1cbd9c]/5 rounded-full blur-3xl" />

                  <div className="relative">
                    <div className="text-center mb-6">
                      <motion.div
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#c59b43]/10 to-[#1cbd9c]/5 border border-[#c59b43]/30 flex items-center justify-center mx-auto mb-4"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        <Briefcase className="w-7 h-7 text-[#c59b43]" style={{ color: "#c59b43" }} />
                      </motion.div>
                      <h2 className="font-bold text-xl text-gray-900">Select Your Industry</h2>
                      <p className="text-gray-500 text-sm mt-1">We'll pre-configure your verticals and KPIs automatically.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                      {templates.map((t, idx) => (
                        <motion.button
                          key={t.key}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => setSelectedIndustry(t.key)}
                          className={`group p-4 rounded-none border text-left transition-all ${
                            selectedIndustry === t.key
                              ? "border-[#c59b43] bg-[#c59b43]/5 shadow-lg shadow-[#c59b43]/10"
                              : "border-gray-200 bg-gray-50 hover:border-[#c59b43]/50 hover:bg-gray-100"
                          }`}
                          data-testid={`button-industry-${t.key}`}
                        >
                          <div className="mb-2">{(() => { const Icon = INDUSTRY_ICONS[t.key] || Briefcase; return <div className="w-10 h-10 rounded-full bg-[#c59b43]/10 border border-[#c59b43]/20 flex items-center justify-center"><Icon className="w-5 h-5 text-[#c59b43]" style={{ color: "#c59b43" }} /></div>; })()}</div>
                          <div className={`font-medium text-sm ${selectedIndustry === t.key ? "text-gray-900" : "text-gray-700"}`}>
                            {t.label}
                          </div>
                          <div className="text-xs text-gray-500 line-clamp-1">{t.description}</div>
                          {selectedIndustry === t.key && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2"
                            >
                              <Check className="w-4 h-4 text-[#c59b43]" style={{ color: "#c59b43" }} />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </div>

                    {selectedIndustry && selectedTemplateDetail && selectedTemplateDetail.verticals && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 rounded-none bg-[#1cbd9c]/5 border border-[#1cbd9c]/20 shadow-sm"
                      >
                        <p className="text-xs font-medium mb-1 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#1cbd9c]" style={{ color: "#1cbd9c" }} />
                          <span className="text-[#1cbd9c]" style={{ color: "#1cbd9c" }}>
                            Template loaded — {selectedTemplateDetail.verticals.length} verticals pre-configured
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTemplateDetail.verticals.map((v) => (
                            <span key={v.name} className="px-2 py-0.5 rounded-none bg-gray-100 border border-gray-200 text-xs text-gray-600">
                              {v.name}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {templateLoading && selectedIndustry && (
                      <p className="mt-3 text-sm text-gray-500 animate-pulse text-center">Loading template...</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Verticals */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-none bg-white backdrop-blur-xl border border-gray-200 shadow-lg p-8">
                  <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-[#c59b43]/30 rounded-none" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-[#c59b43]/30 rounded-none" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#c59b43]/5 rounded-full blur-3xl" />

                  <div className="relative">
                    <div className="text-center mb-6">
                      <motion.div
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#c59b43]/10 to-[#1cbd9c]/5 border border-[#c59b43]/30 flex items-center justify-center mx-auto mb-4"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        <Layers className="w-7 h-7 text-[#c59b43]" style={{ color: "#c59b43" }} />
                      </motion.div>
                      <h2 className="font-bold text-xl text-gray-900">Business Verticals</h2>
                      <p className="text-gray-500 text-sm mt-1">
                        These are the divisions you track revenue and performance for.
                      </p>
                    </div>

                    {/* Vertical list */}
                    <div className="space-y-2 mb-4 max-h-52 overflow-y-auto pr-1">
                      {verticals.map((v, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-none bg-gray-50 border border-gray-200 group"
                        >
                          <div>
                            <span className="font-medium text-sm text-gray-900">{v.name}</span>
                            <span className="text-xs text-gray-500 ml-2">{v.metricLabel} ({v.metricUnit})</span>
                          </div>
                          <button
                            onClick={() => removeVertical(i)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            data-testid={`button-remove-vertical-${i}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                      {verticals.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-4">
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
                        className="bg-gray-50 border-gray-300 rounded-none text-gray-900 placeholder:text-gray-400 focus:border-[#c59b43] focus:ring-[#c59b43]/20"
                      />
                      <button
                        onClick={addVertical}
                        className="px-4 rounded-none border border-[#c59b43]/50 text-[#c59b43] hover:bg-[#c59b43]/5 transition-all"
                        style={{ color: "#c59b43" }}
                        data-testid="button-add-vertical"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Team Invite */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-none bg-white backdrop-blur-xl border border-gray-200 shadow-lg p-8">
                  <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-[#c59b43]/30 rounded-none" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-[#c59b43]/30 rounded-none" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#1cbd9c]/5 rounded-full blur-3xl" />

                  <div className="relative">
                    <div className="text-center mb-6">
                      <motion.div
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#c59b43]/10 to-[#1cbd9c]/5 border border-[#c59b43]/30 flex items-center justify-center mx-auto mb-4"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        <Users className="w-7 h-7 text-[#c59b43]" style={{ color: "#c59b43" }} />
                      </motion.div>
                      <h2 className="font-bold text-xl text-gray-900">Invite Your Team</h2>
                      <p className="text-gray-500 text-sm mt-1">
                        Add team members now or skip and do it later.
                      </p>
                    </div>

                    {/* Invite form */}
                    <div className="space-y-3 mb-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-gray-600 text-xs">Email <span className="text-[#c59b43]">*</span></Label>
                          <Input
                            placeholder="employee@company.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            data-testid="input-invite-email"
                            className="bg-gray-50 border-gray-300 rounded-none text-gray-900 placeholder:text-gray-400 focus:border-[#c59b43] focus:ring-[#c59b43]/20"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-gray-600 text-xs">Name</Label>
                          <Input
                            placeholder="Raj Kumar"
                            value={inviteName}
                            onChange={(e) => setInviteName(e.target.value)}
                            data-testid="input-invite-name"
                            className="bg-gray-50 border-gray-300 rounded-none text-gray-900 placeholder:text-gray-400 focus:border-[#c59b43] focus:ring-[#c59b43]/20"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {["employee", "manager"].map((r) => (
                          <button
                            key={r}
                            onClick={() => setInviteRole(r)}
                            className={`flex-1 py-2.5 rounded-none border text-sm capitalize transition-all ${
                              inviteRole === r
                                ? "border-[#c59b43] bg-[#c59b43]/5 text-[#c59b43]"
                                : "border-gray-300 text-gray-500 hover:border-gray-400"
                            }`}
                            style={inviteRole === r ? { color: "#c59b43" } : {}}
                            data-testid={`button-role-${r}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={addInvite}
                        disabled={!inviteEmail.trim()}
                        className={`w-full py-2.5 rounded-none border flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                          inviteEmail.trim()
                            ? "border-[#1cbd9c]/50 text-[#1cbd9c] hover:bg-[#1cbd9c]/5"
                            : "border-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                        data-testid="button-add-invite"
                      >
                        <Plus className="w-4 h-4" /> Add to invite list
                      </button>
                    </div>

                    {/* Pending invites */}
                    {invites.length > 0 && (
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        <p className="text-xs text-gray-500 font-medium">Will invite:</p>
                        {invites.map((inv, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-none bg-gray-50 border border-gray-200 text-sm">
                            <span className="text-gray-700">{inv.email}</span>
                            <span className="px-2 py-0.5 rounded-none bg-[#c59b43]/10 border border-[#c59b43]/20 text-[#c59b43] text-xs capitalize" style={{ color: "#c59b43" }}>
                              {inv.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-600 mt-4 text-center">
                      You can always invite more team members from the Business Suite settings.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2.5 rounded-none transition-colors border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 group"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
              <span className="text-gray-600 group-hover:text-gray-900 transition-colors duration-200">Back</span>
            </button>

            <motion.button
              onClick={handleNext}
              disabled={createProfileMutation.isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative group flex items-center gap-2 px-6 py-2.5 rounded-none font-semibold transition-all duration-300 overflow-hidden ${
                step === 4
                  ? "bg-gradient-to-r from-[#8a6d2b] to-[#c59b43] hover:from-[#c59b43] hover:to-[#d4ab53] text-white shadow-[0_4px_20px_rgba(197,155,67,0.3)]"
                  : "bg-gradient-to-r from-[#13322b] to-[#1a473d] hover:from-[#1a473d] hover:to-[#225f52] text-white shadow-[0_4px_20px_rgba(19,50,43,0.3)]"
              }`}
              data-testid="button-next"
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
              />
              <span className="relative flex items-center gap-2">
                {step === 4 ? (
                  createProfileMutation.isPending ? "Setting up..." : (
                    <><Check className="w-4 h-4" /> Launch Business Suite</>
                  )
                ) : (
                  <><span>Continue</span><ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                )}
              </span>
            </motion.button>
          </div>

          {step !== 4 && (
            <p className="text-center text-xs text-gray-600 mt-3">
              Step <span className="text-[#c59b43] font-medium" style={{ color: "#c59b43" }}>{step}</span> of {STEPS.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
