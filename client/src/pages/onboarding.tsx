import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { logOut } from "@/lib/firebase";
import { BarChart3, Briefcase, GraduationCap, LineChart, PieChart, User, Users } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [goals, setGoals] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const roles = [
    { id: "business", label: "Business Owner", icon: Briefcase },
    { id: "analyst", label: "Data Analyst", icon: LineChart },
    { id: "marketer", label: "Marketer", icon: PieChart },
    { id: "student", label: "Student", icon: GraduationCap },
    { id: "manager", label: "Manager", icon: Users },
    { id: "other", label: "Other", icon: User },
  ];

  const goalOptions = [
    "Track sales and revenue",
    "Analyze customer data",
    "Monitor KPIs",
    "Create reports for team",
    "Visualize survey results",
    "Explore personal data",
  ];

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/users/me", { role, goals, onboardingComplete: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete();
      // Business owners and managers go directly to the Business Suite setup wizard
      if (role === "business" || role === "manager") {
        navigate("/business/setup");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 1 && !role) {
      toast({ title: "Please select a role", variant: "destructive" });
      return;
    }
    if (step === 2 && !goals) {
      toast({ title: "Please select or enter your goals", variant: "destructive" });
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      mutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? "w-12 bg-primary" : s < step ? "w-8 bg-primary/60" : "w-8 bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-amber-500" />
                  </div>
                  <h1 className="font-serif text-2xl font-bold mb-2">Welcome to DataInsights!</h1>
                  <p className="text-muted-foreground">Let's personalize your experience. What best describes you?</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      data-testid={`button-role-${r.id}`}
                      className={`p-4 rounded-lg border-2 text-center transition-all hover-elevate ${
                        role === r.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <r.icon className={`w-8 h-8 mx-auto mb-2 ${role === r.id ? "text-amber-500" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">{r.label}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-8">
                <div className="text-center mb-8">
                  <h1 className="font-serif text-2xl font-bold mb-2">What are your goals?</h1>
                  <p className="text-muted-foreground">This helps us customize your dashboard experience.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {goalOptions.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGoals(g)}
                      data-testid={`button-goal-${g.toLowerCase().replace(/\s+/g, "-")}`}
                      className={`p-3 rounded-lg border-2 text-left text-sm transition-all hover-elevate ${
                        goals === g
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-goal">Or describe your own</Label>
                  <Input
                    id="custom-goal"
                    placeholder="I want to..."
                    value={goalOptions.includes(goals) ? "" : goals}
                    onChange={(e) => setGoals(e.target.value)}
                    data-testid="input-custom-goal"
                  />
                </div>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
                <h1 className="font-serif text-2xl font-bold mb-2">You're all set!</h1>
                <p className="text-muted-foreground mb-6">
                  Ready to transform your spreadsheets into powerful dashboards. Let's connect your Google Sheets and get started.
                </p>
                <div className="p-4 rounded-lg bg-muted/50 text-left mb-6">
                  <div className="text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Role:</span>
                      <span className="text-muted-foreground capitalize">{role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Goal:</span>
                      <span className="text-muted-foreground">{goals}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={async () => {
              if (step === 1) {
                await logOut();
                navigate("/login");
              } else {
                setStep(step - 1);
              }
            }}
            data-testid="button-back"
          >
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={mutation.isPending} 
            data-testid="button-continue"
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
          >
            {step === 3 ? (mutation.isPending ? "Saving..." : "Get Started") : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
