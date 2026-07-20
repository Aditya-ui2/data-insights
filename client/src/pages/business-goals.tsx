import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Target,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingDown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BusinessSidebar from "@/components/business-sidebar";

interface BusinessProfile {
  id: string;
  name: string;
  currencySymbol: string;
  memberRole: string;
}

interface Goal {
  id: string;
  title: string;
  type: "revenue" | "sales" | "team" | "operational";
  targetValue: number;
  currentValue: number;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "at_risk";
}

interface GoalStats {
  achievementPercent: number;
  activeCount: number;
  completedCount: number;
  atRiskCount: number;
  goals: Goal[];
}

export default function BusinessGoalsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<Goal["type"]>("revenue");
  const [newTarget, setNewTarget] = useState("");
  const [newCurrent, setNewCurrent] = useState("0");
  const [newStart, setNewStart] = useState(new Date().toISOString().slice(0, 10));
  const [newEnd, setNewEnd] = useState("");

  const { data: profile } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  const { data: stats, isLoading, refetch } = useQuery<GoalStats>({
    queryKey: ["/api/goals"],
    queryFn: async () => {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to fetch goals data");
      return res.json();
    }
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goal: Omit<Goal, "id" | "status">) => {
      const res = await apiRequest("POST", "/api/goals", goal);
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Goal created successfully!" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create goal", description: err.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setNewTitle("");
    setNewType("revenue");
    setNewTarget("");
    setNewCurrent("0");
    setNewStart(new Date().toISOString().slice(0, 10));
    setNewEnd("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTarget || !newEnd) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    createGoalMutation.mutate({
      title: newTitle,
      type: newType,
      targetValue: parseFloat(newTarget),
      currentValue: parseFloat(newCurrent),
      startDate: newStart,
      endDate: newEnd,
    });
  };

  const currencySymbol = profile?.currencySymbol ?? "₹";

  const formatGoalValue = (val: number, type: Goal["type"]) => {
    if (type === "revenue" || type === "sales") {
      return `${currencySymbol}${val.toLocaleString()}`;
    }
    return val.toLocaleString();
  };

  // Forecast helper: Simple calculation of achievement vs time elapsed
  const getGoalStatusInfo = (goal: Goal) => {
    const start = new Date(goal.startDate).getTime();
    const end = new Date(goal.endDate).getTime();
    const now = new Date().getTime();

    const totalDuration = end - start;
    const elapsedDuration = now - start;

    const percentTimeElapsed = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
    const percentProgress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);

    let statusLabel = "On Track";
    let statusColor = "text-green-600 bg-green-50 border-green-200";
    let isBehind = false;

    if (percentProgress >= 100) {
      statusLabel = "Completed";
      statusColor = "text-green-600 bg-green-50 border-green-200";
    } else if (percentTimeElapsed > percentProgress + 15) {
      statusLabel = "Behind Schedule";
      statusColor = "text-red-600 bg-red-50 border-red-200";
      isBehind = true;
    } else if (percentTimeElapsed > percentProgress) {
      statusLabel = "Needs Attention";
      statusColor = "text-amber-600 bg-amber-50 border-amber-200";
    }

    return { percentProgress, percentTimeElapsed, statusLabel, statusColor, isBehind };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <BusinessSidebar />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

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
                <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider">
                  Goals &amp; Targets
                </h1>
                <p className="text-xs text-muted-foreground">
                  {profile?.name || "Business Suite"} · Operations Alignment
                </p>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-wider text-xs px-4"
                  data-testid="button-create-goal"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Create Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border border-gray-250 text-primary max-w-md w-full rounded-none shadow-xl">
                <DialogHeader>
                  <DialogTitle className="font-sans font-bold text-sm uppercase tracking-wider">Create New Target</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2 font-sans text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="title" className="font-semibold text-primary">Goal Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Q3 Sales Expansion"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="rounded-none border-gray-250 focus:border-accent text-xs shadow-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="type" className="font-semibold text-primary">Goal Category</Label>
                      <Select value={newType} onValueChange={val => setNewType(val as Goal["type"])}>
                        <SelectTrigger className="rounded-none border-gray-250 focus:border-accent text-xs h-9 shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revenue">Revenue Goal</SelectItem>
                          <SelectItem value="sales">Sales &amp; Leads</SelectItem>
                          <SelectItem value="team">Team Productivity</SelectItem>
                          <SelectItem value="operational">Operational Tasks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="target" className="font-semibold text-primary">Target Value</Label>
                      <Input
                        id="target"
                        type="number"
                        placeholder="e.g. 50000"
                        value={newTarget}
                        onChange={e => setNewTarget(e.target.value)}
                        className="rounded-none border-gray-250 focus:border-accent text-xs shadow-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="start" className="font-semibold text-primary">Start Date</Label>
                      <Input
                        id="start"
                        type="date"
                        value={newStart}
                        onChange={e => setNewStart(e.target.value)}
                        className="rounded-none border-gray-250 focus:border-accent text-xs shadow-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="end" className="font-semibold text-primary">Target End Date</Label>
                      <Input
                        id="end"
                        type="date"
                        value={newEnd}
                        onChange={e => setNewEnd(e.target.value)}
                        className="rounded-none border-gray-250 focus:border-accent text-xs shadow-none"
                        required
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="rounded-none border-gray-200 hover:bg-gray-50 text-xs px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createGoalMutation.isPending}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-wider text-xs px-4"
                    >
                      Launch Goal
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8 space-y-8 w-full">
          {/* Executive Progress overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-primary mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/80">Average Progress</span>
                <Target className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary font-sans leading-none">{stats?.achievementPercent || 0}%</p>
                <p className="text-[10px] text-muted-foreground mt-1">Across all categories</p>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-primary mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/80">Active Goals</span>
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary font-sans leading-none">{stats?.activeCount || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Under execution pipelines</p>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-primary mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/80">Completed Targets</span>
                <CheckCircle2 className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary font-sans leading-none">{stats?.completedCount || 0}</p>
                <p className="text-[10px] text-green-600 font-semibold mt-1">Target objectives secured</p>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-primary mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/80">At Risk Targets</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 font-sans leading-none">{stats?.atRiskCount || 0}</p>
                <p className="text-[10px] text-red-500 font-semibold mt-1">Need operational focus</p>
              </div>
            </Card>
          </div>

          {/* Goal List Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats?.goals.map(goal => {
              const { percentProgress, percentTimeElapsed, statusLabel, statusColor, isBehind } = getGoalStatusInfo(goal);
              return (
                <Card
                  key={goal.id}
                  className="p-5 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-shadow"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/20 group-hover:bg-accent transition-colors" />
                  
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-primary/5 border border-primary/20 rounded-none text-primary text-[9px] font-bold uppercase tracking-wider py-0.5">
                            {goal.type}
                          </Badge>
                          <span className="text-muted-foreground text-[10px] flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3" />
                            until {goal.endDate}
                          </span>
                        </div>
                        <h3 className="font-sans font-bold text-primary text-sm uppercase tracking-tight group-hover:text-accent transition-colors">
                          {goal.title}
                        </h3>
                      </div>

                      <Badge
                        className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 border rounded-none ${statusColor}`}
                      >
                        {statusLabel}
                      </Badge>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-2 font-sans text-xs">
                      <div className="flex justify-between items-center text-primary font-medium">
                        <span>Progress: {percentProgress.toFixed(0)}%</span>
                        <span>
                          {formatGoalValue(goal.currentValue, goal.type)} / {formatGoalValue(goal.targetValue, goal.type)}
                        </span>
                      </div>
                      <Progress value={percentProgress} className="h-1.5 bg-gray-100 rounded-none overflow-hidden" />
                    </div>
                  </div>

                  {/* Actions & Warnings Footer */}
                  <div className="pt-4 mt-4 border-t border-gray-150 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {isBehind ? (
                        <div className="flex items-center gap-1 text-[10px] text-red-500 font-semibold">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Trailing target progress</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-green-600 font-semibold">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Pacing efficiently</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/business/ai-strategy")}
                      className="text-[10px] uppercase font-bold tracking-wider text-accent p-0 h-auto hover:bg-transparent flex items-center gap-1"
                    >
                      Analyze Opportunity <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
