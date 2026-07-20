import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import {
  Brain,
  Cpu,
  TrendingUp,
  Target,
  Search,
  ChevronRight,
  Sparkles,
  Zap,
  ShieldAlert,
  Clock,
  Compass,
  Activity,
  Layers,
  Percent,
  Mail,
  Check,
  AlertTriangle,
  Play,
  Sliders,
  DollarSign,
  RefreshCw,
  Award,
  Smile,
  Network,
  GitBranch,
  Hourglass,
  ArrowRight,
  Coins,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";

import BusinessSidebar from "@/components/business-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch as UiSwitch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

import {
  fetchAiSuiteData,
  NextBestActionItem,
  CLVCustomer,
  UpsellLead,
  HiddenOpportunity,
  PricingProduct,
  ActiveDeal,
  EmployeeSkill,
  EmotionDriftCustomer,
  HiddenRevenueNetworkItem,
  DecisionScenario,
  WeakSignalAlert,
  OpportunityTimingItem,
  CompetitorMove,
  BusinessMomentum,
  RevenueMultiplierLever,
  WeakSignalIntelOverview,
  DecisionMemo,
  CausalDiscoveryData,
  OpportunityNetworkItem,
  DependencyRiskSummary,
  ReplacementCostItem,
  CashFlowData,
  ExpenseAnomalyData,
  ExpenseAnomaly,
  UpcomingDecisionAlert,
  EnergyDrainTask,
  MentorProfile,
  RegretData,
  EnergyDrainData,
  GenerationalReadinessData
} from "@/lib/mockAiData";

interface EngineItem {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: "Growth & Optimization" | "Strategy & Simulation" | "Risk & Intelligence" | "Performance & Customers";
  simpleExplanation: string;
}

const AI_ENGINES: EngineItem[] = [
  {
    id: "next-best-action",
    name: "Next Best Action",
    description: "Sabse important kaam jo abhi karna hai",
    icon: Sparkles,
    category: "Growth & Optimization",
    simpleExplanation: "Yeh AI model aapke business ke saare pending kaam aur customers ko scan karke batata hai ki right now kis customer ko message ya call karne se sabse zyada aur jaldi paisa (revenue) banega, taaki aapka time waste na ho."
  },
  {
    id: "customer-lifetime-value",
    name: "Customer Lifetime Value",
    description: "Top customers aur unki future business value",
    icon: TrendingUp,
    category: "Performance & Customers",
    simpleExplanation: "Yeh AI model aapke customers ki purchase history aur behavior ko dekhkar predict karta hai ki aane wale saalo me kaunsa customer aapko sabse zyada total munafa (value) dega. Isse aapko pata chalta hai ki kin customers par sabse zyada dhyan dena hai."
  },
  {
    id: "upsell",
    name: "Upsell Prediction",
    description: "Kaunse customers naya product khareed sakte hain",
    icon: Zap,
    category: "Growth & Optimization",
    simpleExplanation: "Yeh AI model batata hai ki aapke existing customers me se kaunse log aapki badi ya premium services khareedne ke sabse zyada kabil hain. Yeh unki probability (chance) aur sahi product recommend karta hai."
  },
  {
    id: "opportunity-discovery",
    name: "Dynamic Opportunity Discovery",
    description: "Business me chhipi hui bachat aur growth points",
    icon: Compass,
    category: "Growth & Optimization",
    simpleExplanation: "Yeh AI model aapke business operations me se aisi opportunities (mouke) dhoondhta hai jo aamtaur par miss ho jaati hain—jaise soye huye purane customers ko wapas activate karna ya drop-off leads ko WhatsApp se capture karna."
  },
  {
    id: "pricing",
    name: "Pricing Optimization",
    description: "Profit badhane ke liye optimal price suggestions",
    icon: Coins,
    category: "Growth & Optimization",
    simpleExplanation: "Yeh AI model demand aur customer feedback ko analyze karke batata hai ki aapko apne products/services ka price kitna rakhna chahiye jisse customers bhi na bhaagein aur aapka profit margin bhi badh jaye."
  },
  {
    id: "deal-win",
    name: "Deal Win Probability",
    description: "Active deals ke close hone ki probability",
    icon: Target,
    category: "Performance & Customers",
    simpleExplanation: "Yeh AI model aapke active sales deals ke metrics dekhkar batata hai ki kis deal ke close hone ke kitne percent chances hain. Isse aap critical deals par pehle focus karke revenue secure kar sakte hain."
  },
  {
    id: "employee-amplifier",
    name: "Employee Performance Amplifier",
    description: "Top employees kya alag karte hain aur improvements",
    icon: Award,
    category: "Performance & Customers",
    simpleExplanation: "Yeh AI model aapke top performing staff ki working patterns ko analyze karta hai (jaise call timing, follow-ups) aur batata hai ki baaki employees ko kaise train kiya jaye taaki sabki sales badh sakein."
  },
  {
    id: "emotion-drift",
    name: "Customer Emotion Drift",
    description: "Customers ke sentiment aur churn warnings",
    icon: Smile,
    category: "Risk & Intelligence",
    simpleExplanation: "Yeh AI model customers ke feedback aur behavior se unki narazgi ya khushi ko track karta hai. Agar koi customer dheere-dheere aap se dur ja raha ho, toh yeh pehle hi warning alert de deta hai taaki aap use bacha sakein."
  },
  {
    id: "revenue-network",
    name: "Hidden Revenue Network",
    description: "Products ke aapsi links aur cross-sell options",
    icon: Network,
    category: "Performance & Customers",
    simpleExplanation: "Yeh AI model ye dhoondhta hai ki customers kaunse products ko aaps me milakar khareedte hain. Jaise agar kisi ne Product A liya toh 45 days baad wo Product C zaroor khareedega. Isse aap timely cross-sell kar sakte hain."
  },
  {
    id: "decision-predictor",
    name: "Decision Outcome Predictor",
    description: "Naye decisions ka simulated margin output",
    icon: Activity,
    category: "Strategy & Simulation",
    simpleExplanation: "Yeh ek smart simulator hai. Agar aapko koi bada decision lena ho—jaise 2 naye salespeople rakhna—toh aap isme daalkar check kar sakte hain ki isse revenue aur profit par kya asar padega aur kitna risk hoga."
  },
  {
    id: "weak-signal",
    name: "Business Weak Signal Detector",
    description: "Badi problems aane se pehle warning alerts",
    icon: ShieldAlert,
    category: "Risk & Intelligence",
    simpleExplanation: "Yeh AI model business me aane wali problems ko shuruat me hi pakad leta hai—jaise leads ki quality girna ya support reply me deri hona—aur batata hai ki agle 60 din me isse kitna nuksan ho sakta hai."
  },
  {
    id: "dependency-risk",
    name: "Business Dependency Risk Engine",
    description: "Bade clients par concentration aur dependency alerts",
    icon: AlertTriangle,
    category: "Risk & Intelligence",
    simpleExplanation: "Yeh AI model check karta hai ki aapka kitna revenue sirf gine-chune customers se aa raha hai. Jaise abhi 62% revenue sirf 3 customers se aa raha hai—agar inme se koi ek bhi chhod ke jata hai toh business ko bada financial hit lagega."
  },
  {
    id: "replacement-cost",
    name: "Customer Replacement Cost Predictor",
    description: "Churned customer ko replace karne ki exact cost",
    icon: AlertTriangle,
    category: "Risk & Intelligence",
    simpleExplanation: "Jab ek customer chala jaata hai toh us jaisi value ka naya customer laana bahut mehenga padta hai. Yeh AI model exact replacement cost calculate karta hai — jaise Nexora chali gayi toh uski replacement cost ₹18,000 hogi. Isse aap decide kar sakte hain ki retention par invest karna zyaada samajhdaari hai."
  },
  {
    id: "timing-engine",
    name: "Opportunity Timing Engine",
    description: "Konse kaam pehle karne hain aur konse baad me",
    icon: Clock,
    category: "Growth & Optimization",
    simpleExplanation: "Yeh AI aapko ek roadmap deta hai ki kis growth strategy par abhi kaam karna hai (Do Now), kise baad me karna hai (Do Later), kise monitor karna hai aur kise ignore karna hai."
  },
  {
    id: "competitor-predictor",
    name: "Competitor Movement Predictor",
    description: "Competitors ke movements aur counter playbooks",
    icon: Compass,
    category: "Risk & Intelligence",
    simpleExplanation: "Yeh AI competitors ke activity patterns ko dekhkar unke aane wale kadam (jaise price badhana ya new feature lana) predict karta hai aur aapko counter-attack karne ki strategy batata hai."
  },
  {
    id: "momentum-engine",
    name: "Business Momentum Engine",
    description: "Business growth speed aur trajectory limits",
    icon: TrendingUp,
    category: "Strategy & Simulation",
    simpleExplanation: "Yeh model aapke business ki growth speed aur acceleration ko evaluate karta hai aur ek simple Momentum Score (out of 100) deta hai taaki aapko pata chale ki business tezi se badh raha hai ya slow ho raha hai."
  },
  {
    id: "revenue-multiplier",
    name: "Revenue Multiplier Discovery",
    description: "Sabse zyada leverage wale growth actions",
    icon: Percent,
    category: "Growth & Optimization",
    simpleExplanation: "Yeh AI model batata hai ki business ko grow karne ke liye sabse kam mehnat me sabse bada output kahan se milega—jaise repeat customers ko 10% badhane se kitna revenue profit milega."
  },
  {
    id: "weak-signal-intel",
    name: "Weak Signal Intelligence",
    description: "Future opportunities aur risk signals metrics",
    icon: ShieldAlert,
    category: "Risk & Intelligence",
    simpleExplanation: "Yeh model future opportunities aur risks ko aane se pehle predict karke unki list banata hai, taaki aap competitor se pehle market trends ko capture kar sakein aur nuksan se bach sakein."
  },
  {
    id: "decision-intelligence",
    name: "Decision Intelligence Engine",
    description: "Strategic decisions aur expected ROI maps",
    icon: Cpu,
    category: "Strategy & Simulation",
    simpleExplanation: "Yeh AI business owners ko strategic options (jaise Jaipur me nayi branch kholna) ke risks aur exact expected ROI ki deep intelligence details deta hai."
  },
  {
    id: "causal-discovery",
    name: "Enterprise Causal Discovery",
    description: "Kaam kyu hua uske cause-effect paths",
    icon: GitBranch,
    category: "Strategy & Simulation",
    simpleExplanation: "Yeh model correlation nahi, balki asli Wajah (Causality) dhoondhta hai. Jaise agar revenue gira, toh uski aapsi wajah kya thi (Lead Quality ↓ se Conversion ↓ se Revenue ↓) aur isko thik kaise karein."
  },
  {
    id: "time-machine",
    name: "Business Time Machine",
    description: "Variables badal kar future outcome predictions",
    icon: Hourglass,
    category: "Strategy & Simulation",
    simpleExplanation: "Yeh simulator aapko business me peeche aur aage jaane deta hai. Marketing budget ya team size badhane par aane wale dino me future revenue kitna badhega, aap sliders se live simulate karke dekh sakte hain."
  },
  {
    id: "opportunity-network",
    name: "Opportunity Discovery Network",
    description: "Aapke jaise similar businesses ke benchmarks",
    icon: Layers,
    category: "Strategy & Simulation",
    simpleExplanation: "Yeh AI aapke jaise similar businesses ka benchmark check karke batata hai ki unhone kaunsi cheezein karke fast growth haasil ki (jaise WhatsApp automation lagane se 31% fast growth hui)."
  },
  {
    id: "cash-flow-predictor",
    name: "Cash Flow Predictor",
    description: "Agle mahine paise kahan se aayenge?",
    icon: DollarSign,
    category: "Risk & Intelligence",
    simpleExplanation: "Yeh AI model aapke business ki purchase/sales cycle, upcoming bills aur monthly seasonal trends ko analyze karke aane wale 30/60/90 days ka cash flow predict karta hai aur cash crash se bachata hai."
  },
  {
    id: "expense-anomaly-detector",
    name: "Expense Anomaly Detector",
    description: "Pata nahi paisa kahan gaya",
    icon: Search,
    category: "Risk & Intelligence",
    simpleExplanation: "Yeh AI model aapke normal business expenditure aur category limits ko study karta hai. Agar achanak koi unusual category spend ya normal se 300% zyada expense record hota hai, toh yeh turant alert deta hai."
  },
  {
    id: "regret-minimizer",
    name: "Regret Minimization Engine",
    description: "Past decisions ka 'what if' checklist",
    icon: ShieldAlert,
    category: "Strategy & Simulation",
    simpleExplanation: "Yeh AI model aapke purane missed opportunities (jaise branch na kholna ya staff salary raise drop karna) ki financial impact trace karta hai, taaki business owner future decisions proactively handle karein."
  },
  {
    id: "energy-drain-detector",
    name: "Energy Drain Detector",
    description: "Time + mental energy kahan waste ho rha hai",
    icon: Clock,
    category: "Risk & Intelligence",
    simpleExplanation: "Yeh detector owner ke administrative activities me spent hours aur stress level track karta hai, aur task automation tools (like GST API portal integration ya WhatsApp collections) se weekly saved hours calculate karta hai."
  },
  {
    id: "generational-readiness",
    name: "Generational Transition Readiness",
    description: "Family business succession checklist",
    icon: Compass,
    category: "Strategy & Simulation",
    simpleExplanation: "Yeh AI model family business me next generation successor ke skill gaps (finance, operations, vendor relations, customer trust) ko analyze karke transition risk estimate karta hai, aur customized training modules create karta hai."
  }
];

export default function AiSuiteHub() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Growth & Optimization": true,
    "Strategy & Simulation": true,
    "Risk & Intelligence": true,
    "Performance & Customers": true,
  });

  const pathParts = location.split("/");
  const currentPageId = pathParts[3] || "next-best-action";

  const currentEngine = AI_ENGINES.find(e => e.id === currentPageId) || AI_ENGINES[0];

  const { data: pageData, isLoading, refetch } = useQuery({
    queryKey: ["/api/ai-suite/data", currentPageId],
    queryFn: () => fetchAiSuiteData<any>(currentPageId),
  });

  const filteredEngines = AI_ENGINES.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {!isSidebarCollapsed && <BusinessSidebar />}

      <div className="flex-1 flex overflow-hidden h-screen">
        {/* Inner Search & Nav Sidebar */}
        {!isSidebarCollapsed && (
          <aside className="w-80 shrink-0 border-r border-border bg-card/40 flex flex-col h-full">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/15">
                <Brain className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-bold text-xs text-white tracking-wider uppercase font-mono">AI Suite</h2>
                <p className="text-[10px] text-muted-foreground font-mono">Owner Dashboard v2.0</p>
              </div>
              <Badge className="ml-auto text-[9px] px-1 bg-amber-500/20 text-amber-300 border border-amber-500/30">PREMIUM</Badge>
            </div>
            
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                placeholder="Search AI models..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-black/40 border-border/80 text-xs placeholder:text-muted-foreground/60 focus-visible:ring-amber-500/50"
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-4">
            {["Growth & Optimization", "Strategy & Simulation", "Risk & Intelligence", "Performance & Customers"].map((cat) => {
              const items = filteredEngines.filter(e => e.category === cat);
              if (items.length === 0) return null;
              const isExpanded = expandedCategories[cat];

              return (
                <div key={cat} className="space-y-1">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-white transition-colors"
                  >
                    <span>{cat}</span>
                    <span className="text-[9px] opacity-65">{isExpanded ? "▼" : "▶"}</span>
                  </button>

                  {isExpanded && (
                    <div className="space-y-0.5">
                      {items.map(item => {
                        const Icon = item.icon;
                        const isSelected = item.id === currentPageId;
                        return (
                          <button
                            key={item.id}
                            onClick={() => navigate(`/business/ai-suite/${item.id}`)}
                            className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all relative ${
                              isSelected
                                ? "bg-amber-500/10 border border-amber-500/30 text-white shadow-sm"
                                : "text-muted-foreground hover:bg-muted/30 hover:text-white border border-transparent"
                            }`}
                          >
                            <div className={`p-1.5 rounded-md mt-0.5 shrink-0 ${isSelected ? "bg-amber-500/20 text-amber-400" : "bg-muted text-muted-foreground"}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs truncate leading-snug">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate leading-normal mt-0.5">{item.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border bg-black/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-muted-foreground">AI Output Mode: Activated</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-white"
              onClick={() => { refetch(); toast({ title: "AI Model Recalculated", description: "Cached simulation outputs." }); }}
              aria-label="Recalculate AI Model"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </aside>
        )}

        {/* Workspace Area */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto bg-black/40">
          <header className="border-b border-border bg-card/60 backdrop-blur-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-white mr-1 shrink-0"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                title={isSidebarCollapsed ? "Expand Menus" : "Collapse Menus"}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </Button>

              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <currentEngine.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg text-white leading-tight">{currentEngine.name}</h1>
                  <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 py-0.5 font-mono">
                    {currentEngine.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{currentEngine.description}</p>
              </div>
            </div>
          </header>

          <div className="p-6 flex-1 max-w-6xl mx-auto w-full">
            {isLoading ? (
              <div className="space-y-6">
                <Card className="p-5"><Skeleton className="h-24 w-full" /></Card>
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2"><Skeleton className="h-64 w-full" /></div>
                  <div><Skeleton className="h-64 w-full" /></div>
                </div>
              </div>
            ) : (
              <motion.div
                key={currentPageId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* AI Explanation Banner */}
                <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent shadow-md p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                      <Brain className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Yeh AI Model Kya Kaam Karta Hai? (Simple Explanation)
                      </h3>
                      <p className="text-sm font-medium text-white/95 mt-1 leading-relaxed">
                        {currentEngine.simpleExplanation}
                      </p>
                    </div>
                  </div>
                </Card>

                {renderDashboard(currentPageId, pageData, toast)}
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// DYNAMIC DASHBOARD RENDERER FOR 20 ENGINES
// ────────────────────────────────────────────────────────────────────────
function renderDashboard(id: string, data: any, toast: any) {
  if (!data) return null;

  switch (id) {
    case "next-best-action":
      return <NextBestActionDashboard data={data} toast={toast} />;
    case "customer-lifetime-value":
      return <CLVDashboard data={data} toast={toast} />;
    case "upsell":
      return <UpsellDashboard data={data} toast={toast} />;
    case "opportunity-discovery":
      return <OpportunityDiscoveryDashboard data={data} toast={toast} />;
    case "pricing":
      return <PricingDashboard data={data} toast={toast} />;
    case "deal-win":
      return <DealWinDashboard data={data} toast={toast} />;
    case "employee-amplifier":
      return <EmployeeAmplifierDashboard data={data} toast={toast} />;
    case "emotion-drift":
      return <EmotionDriftDashboard data={data} toast={toast} />;
    case "revenue-network":
      return <RevenueNetworkDashboard data={data} toast={toast} />;
    case "decision-predictor":
      return <DecisionPredictorDashboard data={data} toast={toast} />;
    case "weak-signal":
      return <WeakSignalDashboard data={data} toast={toast} />;
    case "timing-engine":
      return <TimingEngineDashboard data={data} toast={toast} />;
    case "competitor-predictor":
      return <CompetitorPredictorDashboard data={data} toast={toast} />;
    case "momentum-engine":
      return <MomentumEngineDashboard data={data} toast={toast} />;
    case "revenue-multiplier":
      return <RevenueMultiplierDashboard data={data} toast={toast} />;
    case "weak-signal-intel":
      return <WeakSignalIntelDashboard data={data} toast={toast} />;
    case "decision-intelligence":
      return <DecisionIntelligenceDashboard data={data} toast={toast} />;
    case "causal-discovery":
      return <CausalDiscoveryDashboard data={data} toast={toast} />;
    case "time-machine":
      return <TimeMachineDashboard data={data} toast={toast} />;
    case "opportunity-network":
      return <OpportunityNetworkDashboard data={data} toast={toast} />;
    case "dependency-risk":
      return <DependencyRiskDashboard data={data} toast={toast} />;
    case "replacement-cost":
      return <ReplacementCostDashboard data={data} toast={toast} />;
    case "cash-flow-predictor":
      return <CashFlowPredictorDashboard data={data} toast={toast} />;
    case "expense-anomaly-detector":
      return <ExpenseAnomalyDetectorDashboard data={data} toast={toast} />;
    case "regret-minimizer":
      return <RegretMinimizerDashboard data={data} toast={toast} />;
    case "energy-drain-detector":
      return <EnergyDrainDetectorDashboard data={data} toast={toast} />;
    case "generational-readiness":
      return <GenerationalReadinessDashboard data={data} toast={toast} />;
    default:
      return <div>Loading workspace...</div>;
  }
}

// ────────────────────────────────────────────────────────────────────────
// MASTER TEMPLATE: OWNER ADVISOR CARD (APPLE/STRIPE VIBE)
// ────────────────────────────────────────────────────────────────────────
interface OwnerAdvisorCardProps {
  title: string;
  executiveSummary: string;
  keyInsight: string;
  revenueImpact: string;
  aiReasoning: string;
  recommendedAction: string;
  confidenceScore: number;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

function OwnerAdvisorCard({
  title,
  executiveSummary,
  keyInsight,
  revenueImpact,
  aiReasoning,
  recommendedAction,
  confidenceScore,
  actionLabel = "Execute Recommendation",
  onAction,
  children
}: OwnerAdvisorCardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Interactive Playground / Details Table */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-card/30 border-border/80 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white tracking-tight">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {children}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Clean McKinsey-style AI Insight Panel */}
      <div className="space-y-6">
        <Card className="border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent shadow-lg p-5 space-y-5">
          {/* Header Summary */}
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <Brain className="w-3 h-3" /> AI Model Explanation
            </p>
            <p className="text-xs text-amber-200/90 leading-relaxed font-sans">{executiveSummary}</p>
          </div>

          <hr className="border-border/60" />

          {/* Key Insight */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">What is happening?</h4>
            <p className="text-xs font-semibold text-white leading-normal">{keyInsight}</p>
          </div>

          {/* Revenue Impact */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Money Involved</h4>
            <p className="text-xl font-bold text-green-400 font-mono">{revenueImpact}</p>
          </div>

          {/* AI Reasoning */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Why is it happening?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-sans">{aiReasoning}</p>
          </div>

          {/* Recommended Action */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">What should I do next?</h4>
            <div className="p-3.5 rounded-lg bg-black/40 border border-border text-xs text-white/90 leading-relaxed font-medium">
              {recommendedAction}
            </div>
          </div>

          {/* Confidence Indicator */}
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground">
              <span>CONFIDENCE INDEX</span>
              <span className="font-bold text-amber-400">{confidenceScore}%</span>
            </div>
            <Progress value={confidenceScore} className="h-1 bg-muted [&>div]:bg-amber-500" />
          </div>

          {/* Action Trigger */}
          {onAction && (
            <Button
              onClick={onAction}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black border-0 font-bold text-xs h-10 shadow transition-all"
            >
              {actionLabel}
            </Button>
          )}
        </Card>
      </div>

    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 1. NEXT BEST ACTION
// ────────────────────────────────────────────────────────────────────────
function NextBestActionDashboard({ data, toast }: { data: NextBestActionItem[], toast: any }) {
  const [actions, setActions] = useState<NextBestActionItem[]>(data);
  const [active, setActive] = useState<NextBestActionItem>(data[0]);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleRun = (id: string) => {
    setIsDeploying(true);
    setTimeout(() => {
      setActions(prev => prev.map(a => a.id === id ? { ...a, status: "Approved" } : a));
      toast({
        title: "Follow-up Deployed",
        description: `Dispatched customized email pitch and CRM task trigger successfully.`,
      });
      setIsDeploying(false);
      if (active.id === id) {
        setActive(prev => ({ ...prev, status: "Approved" }));
      }
    }, 1200);
  };

  return (
    <OwnerAdvisorCard
      title="Abhi business ko grow karne ke liye sabse important kaam kya hai?"
      executiveSummary="Yeh model pending leads aur actions ko analyze karke batata hai ki kaunse quotation par action lene se sabse zyada fayda hoga."
      keyInsight={active.actionName}
      revenueImpact={`Expected Gain: ${active.revenueImpact}`}
      aiReasoning={active.reasoning}
      recommendedAction="Automated followup triggers activate karein aur call scheduling connect karein."
      confidenceScore={active.confidence}
      actionLabel={active.status === "Approved" ? "Completed ✓" : isDeploying ? "Deploying workflow..." : "Execute Automated Follow-Up"}
      onAction={active.status === "Approved" || isDeploying ? undefined : () => handleRun(active.id)}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg border border-border">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-mono">Focus Target</p>
            <p className="text-sm font-bold text-white">{active.target}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={active.priority === "High" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-yellow-500/20 text-yellow-400"}>
              {active.priority} Priority
            </Badge>
            <Badge variant="outline" className="text-amber-400 border-amber-500/30">
              {active.category}
            </Badge>
          </div>
        </div>

        {/* Detailed AI suggestion checklist */}
        <div className="p-3 bg-black/40 border border-border rounded-lg space-y-2">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">💡 Why AI Recommended This Action?</p>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
            <li>Quotation response timing index is inside the golden 48-hour window.</li>
            <li>No competitor follow-up has been registered on these pipeline contacts.</li>
            <li>Expected conversion chance raised from 32% to 89% with immediate call.</li>
          </ul>
        </div>

        {/* Recovery Action Checklist */}
        <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs space-y-1.5">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">🛠️ Recommended Implementation Steps</p>
          <div className="space-y-1 text-muted-foreground font-mono mt-1 text-[11px]">
            <p>✓ Auto-generate personalized outreach copy</p>
            <p>✓ Pre-fill customer billing metadata</p>
            <p>☐ Schedule follow-up calendar reminder</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground">Pending Quotations Queue</p>
          <div className="grid gap-2">
            {actions.map(action => (
              <button
                key={action.id}
                onClick={() => setActive(action)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === action.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">{action.actionName}</p>
                    <p className="text-[10px] text-muted-foreground">Segment: {action.target}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-bold text-green-400">{action.revenueImpact}</p>
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${action.status === "Approved" ? "text-green-400 border-green-500/30" : "text-amber-400 border-amber-500/30"}`}>
                      {action.status === "Approved" ? "Active ✓" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 2. CLV
// ────────────────────────────────────────────────────────────────────────
function CLVDashboard({ data, toast }: { data: CLVCustomer[], toast: any }) {
  const [active, setActive] = useState<CLVCustomer>(data[0]);
  const [retentionMonths, setRetentionMonths] = useState<number>(data[0].tenureMonths);

  useEffect(() => {
    setRetentionMonths(active.tenureMonths);
  }, [active]);

  const baseValue = parseFloat(active.currentCLV.replace("₹", "").replace("L", "").replace("K", ""));
  const isLakh = active.currentCLV.includes("L");
  const calculatedPredictedCLV = isLakh 
    ? `₹${(baseValue * (1 + retentionMonths * 0.05)).toFixed(1)}L`
    : `₹${Math.round(baseValue * (1 + retentionMonths * 0.05))}K`;

  return (
    <OwnerAdvisorCard
      title="Expected Lifetime Revenue from Top Customers"
      executiveSummary="Yeh AI model client activity patterns ko analyze karke predict karta hai ki kis customer se long-term me kitna profit aur future value milegi."
      keyInsight={`${active.name} holds high strategic importance. Predicted to yield ${calculatedPredictedCLV}.`}
      revenueImpact={`Future CLV: ${calculatedPredictedCLV}`}
      aiReasoning="Client transaction frequency stable hai aur usage metrics indicate positive loyalty pattern."
      recommendedAction="VIP Customer Retention program trigger karein aur dedicated account manager assign karein."
      confidenceScore={92}
      actionLabel="Schedule Retaining Call"
      onAction={() => toast({ title: "Call Scheduled", description: `Assigned VIP account manager for ${active.name}.` })}
    >
      <div className="space-y-4">
        {/* Retention Simulator Slider */}
        <div className="p-4 rounded-lg bg-black/40 border border-border space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span>Simulate Retention Months:</span>
            <span className="font-bold text-amber-400">+{retentionMonths} Months</span>
          </div>
          <Slider
            min={3}
            max={36}
            step={1}
            value={[retentionMonths]}
            onValueChange={val => setRetentionMonths(val[0])}
            className="[&>.bg-primary]:bg-amber-500"
          />
          <div className="pt-2 border-t border-border/40 text-[10px] font-mono flex justify-between text-muted-foreground">
            <span>Current Value: <strong className="text-white">{active.currentCLV}</strong></span>
            <span>Predicted Future CLV: <strong className="text-green-400">{calculatedPredictedCLV}</strong></span>
          </div>
        </div>

        {/* Customer Profile Highlights */}
        <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs space-y-1.5">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">📋 VIP Profile Summary: {active.name}</p>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground mt-1 text-[11px] font-sans">
            <div>Historical Orders: <strong className="text-white">18 purchases</strong></div>
            <div>Average Order Value: <strong className="text-white">₹24,500</strong></div>
            <div>Acquisition Source: <strong className="text-white">Organic Referral</strong></div>
            <div>Last Contact: <strong className="text-white">3 days ago</strong></div>
          </div>
        </div>

        {/* VIP Customer Leaderboard */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground">VIP Customer Leaderboard</p>
          <div className="grid gap-2">
            {data.map(cust => (
              <button
                key={cust.id}
                onClick={() => setActive(cust)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === cust.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{cust.name}</p>
                    <p className="text-[10px] text-muted-foreground">Risk Category: <span className={cust.churnRisk === "High" ? "text-red-400" : cust.churnRisk === "Medium" ? "text-yellow-400" : "text-green-400"}>{cust.churnRisk}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-400 font-mono">{cust.predictedCLV}</p>
                    <p className="text-[9px] text-muted-foreground">Current: {cust.currentCLV}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 3. UPSELL PREDICTION
// ────────────────────────────────────────────────────────────────────────
function UpsellDashboard({ data, toast }: { data: UpsellLead[], toast: any }) {
  const [active, setActive] = useState<UpsellLead>(data[0]);
  const [emailText, setEmailText] = useState(data[0].emailPitch);

  useEffect(() => {
    setEmailText(active.emailPitch);
  }, [active]);

  return (
    <OwnerAdvisorCard
      title="Customers Likely to Buy Additional Services"
      executiveSummary="Yeh model customer utilization logs ko monitor karke batata hai ki kaunsa customer naye capabilities khareedne ke sabse kareeb hai."
      keyInsight={`${active.customerName} fits the profile for ${active.suggestedProduct} upgrade.`}
      revenueImpact={`Upsell Revenue: ${active.expectedRevenue}`}
      aiReasoning="Client server limit aur database utilization rates 87% exceed ho gaye hain, jisse slow down alert trigger ho sakta hai."
      recommendedAction="In-app discount and upgrade workflow email automatically initiate karein."
      confidenceScore={active.probability}
      actionLabel="Send Personalized Pitch"
      onAction={() => toast({ title: "Email Sent", description: `Upsell pitch dispatched to ${active.customerName}.` })}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded bg-muted/40 border border-border">
            <span className="text-[10px] text-muted-foreground uppercase block font-mono">Current Plan</span>
            <span className="font-bold text-white block mt-1">{active.currentProduct}</span>
          </div>
          <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30">
            <span className="text-[10px] text-amber-400 uppercase block font-mono">Suggested Upsell</span>
            <span className="font-bold text-amber-300 block mt-1">{active.suggestedProduct}</span>
          </div>
        </div>

        {/* Account Limit Telemetry */}
        <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs space-y-1.5">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">📊 System Usage Telemetry: {active.customerName}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5 font-mono">
              <span>Database Slots Usage</span>
              <span>92% (Threshold exceeded)</span>
            </div>
            <Progress value={92} className="h-1 bg-muted [&>div]:bg-red-400" />
          </div>
          <p className="text-[10px] text-slate-400 leading-normal italic mt-1 font-sans">
            Client exceeds database caps. High latency risk detected for peak traffic events.
          </p>
        </div>

        {/* Email Editor Pane */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold text-amber-400">Customizable AI Email Draft</p>
          <textarea
            value={emailText}
            onChange={e => setEmailText(e.target.value)}
            className="w-full h-32 p-3 text-xs bg-black/40 border border-border rounded-lg text-white font-mono focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Select Customer Upsell Targets</p>
          <div className="grid gap-2">
            {data.map(lead => (
              <button
                key={lead.id}
                onClick={() => setActive(lead)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === lead.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{lead.customerName}</p>
                    <p className="text-[10px] text-muted-foreground">Suggested: {lead.suggestedProduct}</p>
                  </div>
                  <div className="text-right font-mono">
                    <p className="text-xs font-bold text-amber-400">{lead.probability}% probability</p>
                    <p className="text-[9px] text-muted-foreground">{lead.expectedRevenue} impact</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 4. DYNAMIC OPPORTUNITY DISCOVERY
// ────────────────────────────────────────────────────────────────────────
function OpportunityDiscoveryDashboard({ data, toast }: { data: HiddenOpportunity[], toast: any }) {
  const [active, setActive] = useState<HiddenOpportunity>(data[0]);

  return (
    <OwnerAdvisorCard
      title="Hidden Growth Opportunities Discovered by AI"
      executiveSummary="Yeh model transaction data and feedback channels ko compare karke chhipe huye revenue channels dhoondhta hai."
      keyInsight={active.name}
      revenueImpact={`Leakage Recoverable: ${active.revenueOpportunity}`}
      aiReasoning={active.description}
      recommendedAction="Automated WhatsApp check-out drop-off reminders active karein."
      confidenceScore={active.impactScore}
      actionLabel="Deploy Recovery Campaign"
      onAction={() => toast({ title: "Campaign Triggered", description: "Outbound campaign flows initiated." })}
    >
      <div className="space-y-4">
        {/* Opportunity details info panel */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-lg bg-black/40 border border-border">
            <span className="text-[9px] uppercase font-mono text-muted-foreground block">Implementation Difficulty</span>
            <strong className="text-white block mt-1 text-xs">{active.difficulty}</strong>
          </div>
          <div className="p-3 rounded-lg bg-black/40 border border-border">
            <span className="text-[9px] uppercase font-mono text-amber-400 block">AI Impact Score</span>
            <strong className="text-amber-300 block mt-1 text-xs font-mono">{active.impactScore}/100</strong>
          </div>
        </div>

        {/* Recovery Action Checklist */}
        <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs space-y-1">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">🛠️ Recommended Recovery Steps</p>
          <div className="space-y-1 text-muted-foreground mt-1 text-[11px] font-sans">
            <p>1. Deploy WhatsApp automation webhook triggers on checkout drop-off events.</p>
            <p>2. Pre-fill abandoned cart checkout links with dynamic 10% coupon codes.</p>
            <p>3. Generate EOD reports summarizing recovered sales value.</p>
          </div>
        </div>

        {/* Priorities list */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground">Discovered Growth Opportunities</p>
          <div className="grid gap-2">
            {data.map(opp => (
              <button
                key={opp.id}
                onClick={() => setActive(opp)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === opp.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-white">{opp.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Difficulty: {opp.difficulty}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-green-400 font-mono">{opp.revenueOpportunity}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 5. PRICING OPTIMIZATION
// ────────────────────────────────────────────────────────────────────────
function PricingDashboard({ data, toast }: { data: PricingProduct[], toast: any }) {
  const [products, setProducts] = useState<PricingProduct[]>(data);
  const [active, setActive] = useState<PricingProduct>(data[0]);
  const [simulatedPrice, setSimulatedPrice] = useState<number>(data[0].recommendedPrice);

  useEffect(() => {
    setSimulatedPrice(active.recommendedPrice);
  }, [active]);

  const priceDiffPercent = ((simulatedPrice - active.currentPrice) / active.currentPrice) * 100;
  const expectedProfitDelta = priceDiffPercent * 0.9;
  const simulatedDemandLoss = priceDiffPercent > 15 ? "-4.2%" : priceDiffPercent > 8 ? "-1.5%" : "0.0%";
  const projectedExtraProfitYear = Math.max(0, Math.round(active.currentPrice * (expectedProfitDelta / 100) * 12 * 8.5));

  return (
    <OwnerAdvisorCard
      title="Recommended Pricing adjustments"
      executiveSummary="Yeh model pricing data aur purchase demand limits ko evaluate karke recommended price point calculate karta hai."
      keyInsight={`${active.productName} pricing is currently underpriced compared to market benchmarks.`}
      revenueImpact={`Est. Margin Gain: +₹${projectedExtraProfitYear.toLocaleString()}/yr`}
      aiReasoning={`AI model reports high customer price tolerance. Raising price to ₹${simulatedPrice} yields optimal revenue before conversion drop-off.`}
      recommendedAction={`Set up project budget thresholds and apply ₹${simulatedPrice} catalog pricing.`}
      confidenceScore={88}
      actionLabel="Apply Suggested Pricing"
      onAction={() => toast({ title: "Pricing Applied", description: `Updated catalog price to ₹${simulatedPrice}.` })}
    >
      <div className="space-y-4">
        {/* Selector Grid */}
        <div className="grid grid-cols-2 gap-2">
          {products.map(prod => (
            <button
              key={prod.id}
              onClick={() => setActive(prod)}
              className={`p-3 text-left rounded-lg border transition-all ${
                active.id === prod.id ? "bg-amber-500/10 border-amber-500/40" : "bg-black/25 border-border hover:bg-muted/10"
              }`}
            >
              <p className="text-xs font-bold text-white truncate">{prod.productName}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Current: ₹{prod.currentPrice}</p>
            </button>
          ))}
        </div>

        {/* Elasticity Simulator Slider */}
        <div className="space-y-4 p-4 rounded-lg bg-black/40 border border-border">
          <p className="text-[10px] text-amber-400 uppercase font-mono font-bold">🎯 Interactive Pricing Elasticity Simulator</p>
          
          <div className="grid grid-cols-2 gap-2 text-center text-xs border-b border-border/40 pb-3">
            <div>
              <span className="text-[10px] text-muted-foreground block uppercase font-mono">Current Price</span>
              <span className="font-bold text-white block mt-0.5">₹{active.currentPrice}</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-400 block uppercase font-mono">Simulated Price</span>
              <span className="font-bold text-amber-300 block mt-0.5">₹{simulatedPrice}</span>
            </div>
          </div>

          <Slider
            min={active.currentPrice - 2000}
            max={active.currentPrice + 4000}
            step={100}
            value={[simulatedPrice]}
            onValueChange={val => setSimulatedPrice(val[0])}
            className="[&>.bg-primary]:bg-amber-500"
          />

          <div className="pt-2 text-[10px] font-mono grid grid-cols-3 text-muted-foreground text-center gap-1">
            <div className="border-r border-border/40">
              <span className="block text-[8px] uppercase">Price Raise</span>
              <strong className="text-white">+{priceDiffPercent.toFixed(1)}%</strong>
            </div>
            <div className="border-r border-border/40">
              <span className="block text-[8px] uppercase">Profit Gain</span>
              <strong className="text-green-400 font-mono">+{expectedProfitDelta.toFixed(1)}%</strong>
            </div>
            <div>
              <span className="block text-[8px] uppercase">Est. Demand Loss</span>
              <strong className={parseFloat(simulatedDemandLoss) < 0 ? "text-red-400" : "text-slate-400 font-mono"}>{simulatedDemandLoss}</strong>
            </div>
          </div>
        </div>

        {/* Competitor Benchmarks Table */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Competitor Pricing Index Matrix</p>
          <div className="border border-border/80 rounded-lg overflow-hidden bg-black/20 text-xs">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[9px] uppercase font-mono py-2">Provider</TableHead>
                  <TableHead className="text-[9px] uppercase font-mono py-2 text-right">Price Point</TableHead>
                  <TableHead className="text-[9px] uppercase font-mono py-2 text-right">Premium Index</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-b border-border/40">
                  <TableCell className="py-2 text-white font-semibold">Your Price (Current)</TableCell>
                  <TableCell className="py-2 text-right font-mono">₹{active.currentPrice.toLocaleString()}</TableCell>
                  <TableCell className="py-2 text-right text-muted-foreground font-mono">Base</TableCell>
                </TableRow>
                <TableRow className="border-b border-border/40">
                  <TableCell className="py-2 text-amber-300 font-semibold">Suggested Price</TableCell>
                  <TableCell className="py-2 text-right font-mono text-amber-300">₹{simulatedPrice.toLocaleString()}</TableCell>
                  <TableCell className="py-2 text-right text-green-400 font-mono">+{priceDiffPercent.toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow className="border-b border-border/40 text-muted-foreground">
                  <TableCell className="py-2">Acuity Systems</TableCell>
                  <TableCell className="py-2 text-right font-mono">₹{Math.round(active.currentPrice * 1.18).toLocaleString()}</TableCell>
                  <TableCell className="py-2 text-right font-mono">+18%</TableCell>
                </TableRow>
                <TableRow className="text-muted-foreground">
                  <TableCell className="py-2">LogiScale Inc</TableCell>
                  <TableCell className="py-2 text-right font-mono">₹{Math.round(active.currentPrice * 1.05).toLocaleString()}</TableCell>
                  <TableCell className="py-2 text-right font-mono">+5%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 6. DEAL WIN PROBABILITY
// ────────────────────────────────────────────────────────────────────────
function DealWinDashboard({ data, toast }: { data: ActiveDeal[], toast: any }) {
  const [active, setActive] = useState<ActiveDeal>(data[0]);
  const [followUpDone, setFollowUpDone] = useState(false);
  const [discountOffered, setDiscountOffered] = useState(false);

  let calculatedProb = active.probability;
  if (followUpDone) calculatedProb += 12;
  if (discountOffered) calculatedProb += 8;
  calculatedProb = Math.min(98, calculatedProb);

  return (
    <OwnerAdvisorCard
      title="Active Deals Win Probabilities"
      executiveSummary="Yeh model sales pipeline ke variables track karke batata hai ki deal close hone ki kitni percentage chance hai."
      keyInsight={`${active.dealName} closes at ${calculatedProb}% probability under current conditions.`}
      revenueImpact={`Expected Deal Revenue: ${active.expectedRevenue}`}
      aiReasoning={`Globex accounts show interest in integrations. Client response delays are low.`}
      recommendedAction="Agle validation step ke liye followup contract templates dispatch karein."
      confidenceScore={calculatedProb}
      actionLabel="Schedule Deal Action"
      onAction={() => toast({ title: "Action Scheduled", description: "Added to account follow-up queue." })}
    >
      <div className="space-y-4">
        {/* Deal Health status card */}
        <div className="p-3 bg-muted/40 border border-border rounded-lg flex justify-between items-center text-xs">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-mono">Deal Stage</p>
            <p className="font-bold text-white">{active.stage}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-mono">Deal Health</p>
            <Badge className={active.health === "Healthy" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"}>
              {active.health}
            </Badge>
          </div>
        </div>

        {/* Win rate accelerator switch simulator */}
        <div className="p-4 rounded-lg bg-black/40 border border-border space-y-3">
          <p className="text-[10px] text-amber-400 uppercase font-mono font-bold">⚡ Win Rate Accelerator Simulator</p>
          
          <div className="flex justify-between items-center text-xs">
            <span>Follow up completed within 30 mins (+12% chance)</span>
            <UiSwitch checked={followUpDone} onCheckedChange={setFollowUpDone} />
          </div>

          <div className="flex justify-between items-center text-xs">
            <span>Offer 10% loyalty contract terms (+8% chance)</span>
            <UiSwitch checked={discountOffered} onCheckedChange={setDiscountOffered} />
          </div>

          <div className="pt-2 border-t border-border/40 flex justify-between items-center text-xs font-mono">
            <span>Base Win Rate: {active.probability}%</span>
            <span className="font-bold text-green-400">Simulated Rate: {calculatedProb}%</span>
          </div>
        </div>

        {/* Progress Checklist */}
        <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs space-y-2">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">📋 Deal Progression Checklist</p>
          <div className="space-y-1.5 text-muted-foreground font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-green-400">✓</span>
              <span>Initial Discovery Call Conducted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-400">✓</span>
              <span>Decision Makers Engaged ({active.client})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={followUpDone ? "text-green-400" : "text-amber-400"}>{followUpDone ? "✓" : "☐"}</span>
              <span>Technical Scope & Integrations Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={discountOffered ? "text-green-400" : "text-slate-500"}>{discountOffered ? "✓" : "☐"}</span>
              <span>Loyalty Discount Offered</span>
            </div>
          </div>
        </div>

        {/* Communications Telemetry */}
        <div className="p-3 bg-black/40 border border-border rounded-lg text-[10px] font-mono space-y-2">
          <p className="text-muted-foreground uppercase font-bold text-slate-400">Pipeline Communications Stats</p>
          <div className="grid grid-cols-3 gap-2 text-center text-muted-foreground">
            <div className="p-1.5 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Emails Sent</span>
              <strong className="text-white text-xs">14</strong>
            </div>
            <div className="p-1.5 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Avg Delay</span>
              <strong className="text-white text-xs">12 mins</strong>
            </div>
            <div className="p-1.5 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Last Contact</span>
              <strong className="text-white text-xs">1d ago</strong>
            </div>
          </div>
        </div>

        {/* Pipeline Log */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Active Deals Pipeline</p>
          <div className="grid gap-2">
            {data.map(deal => (
              <button
                key={deal.id}
                onClick={() => setActive(deal)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === deal.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{deal.dealName}</p>
                    <p className="text-[10px] text-muted-foreground">Client: {deal.client}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-amber-400 font-mono">{deal.probability}% probability</p>
                    <p className="text-[9px] text-muted-foreground">{deal.expectedRevenue}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 7. EMPLOYEE PERFORMANCE AMPLIFIER
// ────────────────────────────────────────────────────────────────────────
function EmployeeAmplifierDashboard({ data, toast }: { data: EmployeeSkill[], toast: any }) {
  const [active, setActive] = useState<EmployeeSkill>(data[0]);

  return (
    <OwnerAdvisorCard
      title="Top Performers & Activity Analysis"
      executiveSummary="Yeh AI model employees ke daily activity pattern ko track karke best productivity behaviors dhoondhta hai."
      keyInsight={`${active.name} maintains a high benchmark metrics score.`}
      revenueImpact="Productivity Factor: +24% Team Revenue Gain Possible"
      aiReasoning={active.whatTheyDoDifferently}
      recommendedAction={active.coachingRecommendation}
      confidenceScore={91}
      actionLabel="Distribute Coaching Guide"
      onAction={() => toast({ title: "Guidelines Sent", description: `Dispatched ${active.name}'s follow-up templates to the sales team.` })}
    >
      <div className="space-y-4">
        {/* Performance benchmarks visualization */}
        <div className="p-4 rounded-lg bg-black/40 border border-border space-y-3">
          <p className="text-[10px] text-amber-400 uppercase font-mono font-bold">📊 Benchmarks ({active.name} vs Team Avg)</p>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>First Response Time</span>
                <span>22 mins vs 140 mins (Avg)</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                <div className="h-full bg-green-400" style={{ width: "20%" }} />
                <div className="h-full bg-red-400/40" style={{ width: "80%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Follow-Up Touchpoints</span>
                <span>4.8 touches vs 2.1 touches (Avg)</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                <div className="h-full bg-green-400" style={{ width: "96%" }} />
                <div className="h-full bg-amber-400/40" style={{ width: "42%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Detailed Activity Benchmarks</p>
          <div className="border border-border/80 rounded-lg overflow-hidden bg-black/20 text-xs">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[9px] uppercase font-mono py-2">Metric</TableHead>
                  <TableHead className="text-[9px] uppercase font-mono py-2 text-right">Sarah Jenkins</TableHead>
                  <TableHead className="text-[9px] uppercase font-mono py-2 text-right">Team Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-b border-border/40">
                  <TableCell className="py-2 text-white font-semibold">First-Touch Delay</TableCell>
                  <TableCell className="py-2 text-right font-mono text-green-400">22 mins</TableCell>
                  <TableCell className="py-2 text-right font-mono">140 mins</TableCell>
                </TableRow>
                <TableRow className="border-b border-border/40">
                  <TableCell className="py-2 text-white font-semibold">CRM Log Completion</TableCell>
                  <TableCell className="py-2 text-right font-mono text-green-400">98%</TableCell>
                  <TableCell className="py-2 text-right font-mono">71%</TableCell>
                </TableRow>
                <TableRow className="border-b border-border/40">
                  <TableCell className="py-2 text-white font-semibold">Average Touchpoints</TableCell>
                  <TableCell className="py-2 text-right font-mono text-green-400">4.8</TableCell>
                  <TableCell className="py-2 text-right font-mono">2.1</TableCell>
                </TableRow>
                <TableRow className="text-muted-foreground">
                  <TableCell className="py-2">Deals Assisted (Mtd)</TableCell>
                  <TableCell className="py-2 text-right font-mono text-white">₹3.8L</TableCell>
                  <TableCell className="py-2 text-right font-mono">₹1.4L</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Registry log */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Team Performance Registry</p>
          <div className="grid gap-2">
            {data.map(emp => (
              <button
                key={emp.id}
                onClick={() => setActive(emp)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === emp.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{emp.name}</p>
                    <p className="text-[10px] text-muted-foreground">{emp.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-400 font-mono">{emp.productivity} Productivity</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 8. CUSTOMER EMOTION DRIFT
// ────────────────────────────────────────────────────────────────────────
function EmotionDriftDashboard({ data, toast }: { data: EmotionDriftCustomer[], toast: any }) {
  const [active, setActive] = useState<EmotionDriftCustomer>(data[0]);

  return (
    <OwnerAdvisorCard
      title="Customer Sentiment Drift Tracker"
      executiveSummary="Yeh model customer reviews aur support tickets ko evaluate karke sentiment changes ko track karta hai."
      keyInsight={`${active.name}'s sentiment has drifted down 22% this month.`}
      revenueImpact={active.churnWarning ? "Churn Warning: High Risk (₹1.8L)" : "Churn Risk: Stable"}
      aiReasoning={active.explanation}
      recommendedAction="Callback sequence trigger karein aur dedicated account credits offer karein."
      confidenceScore={87}
      actionLabel="Mitigate Sentiment Churn"
      onAction={() => toast({ title: "Remediation Flow Active", description: `Dispatched credit remediation for ${active.name}.` })}
    >
      <div className="space-y-4">
        {/* Sentiment Ring Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono p-3 bg-black/40 border border-border rounded-lg">
          <div>
            <span className="text-muted-foreground block">Positive Mood</span>
            <span className="text-sm font-bold text-green-400">42%</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Neutral Mood</span>
            <span className="text-sm font-bold text-slate-400">36%</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Negative Mood</span>
            <span className="text-sm font-bold text-red-400">22%</span>
          </div>
        </div>

        {/* Flagged interaction logs */}
        <div className="p-3 rounded-lg bg-black/40 border border-border space-y-2">
          <p className="text-[10px] text-red-400 uppercase font-mono font-bold">🚨 AI Flagged Support Interactions</p>
          <div className="text-[11px] text-muted-foreground space-y-1.5 font-mono leading-normal">
            <p className="border-b border-border/20 pb-1">"Ticket #2409: Database sync failure unresolved since Thursday."</p>
            <p>"Transaction fail count reached 3 triggers during checkout."</p>
          </div>
        </div>

        {/* Sentiment Drift History Timeline */}
        <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs space-y-2">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">📅 Customer Sentiment Log</p>
          <div className="space-y-1 text-muted-foreground font-mono text-[10px]">
            <p className="flex justify-between">
              <span>June 12 - API Limit Warnings Hit</span>
              <span className="text-yellow-400 font-bold">Neutral</span>
            </p>
            <p className="flex justify-between">
              <span>June 14 - Support Response Delayed &gt; 4 hrs</span>
              <span className="text-red-400 font-bold">Negative</span>
            </p>
            <p className="flex justify-between">
              <span>June 16 - Billing Card Retry Failures</span>
              <span className="text-red-400 font-bold">Severe</span>
            </p>
          </div>
        </div>

        {/* Sentiment drift list */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Sentiment Drift Registry</p>
          <div className="grid gap-2">
            {data.map(emo => (
              <button
                key={emo.id}
                onClick={() => setActive(emo)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === emo.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{emo.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{emo.sentimentTrend}</p>
                  </div>
                  <div className="text-right font-mono">
                    <Badge className={emo.churnWarning ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400"}>
                      {emo.driftDirection}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 9. HIDDEN REVENUE NETWORK
// ────────────────────────────────────────────────────────────────────────
function RevenueNetworkDashboard({ data, toast }: { data: HiddenRevenueNetworkItem[], toast: any }) {
  const [active, setActive] = useState<HiddenRevenueNetworkItem>(data[0]);

  return (
    <OwnerAdvisorCard
      title="Product Relationships & Cross-Sell Cycles"
      executiveSummary="Yeh model client utility cycles read karke automatic products dependencies mapping design karta hai."
      keyInsight={active.explanation}
      revenueImpact={`Cross-Sell Value: ${active.crossSellPotential}`}
      aiReasoning={`AI discovery shows client expansion triggers peak at day ${active.timeframeDays} after Core product purchase.`}
      recommendedAction={`Setup automated cross-sell sequence emails targeting ${active.productA} users.`}
      confidenceScore={84}
      actionLabel="Initiate Cross-Sell Campaign"
      onAction={() => toast({ title: "Campaign Triggered", description: `Started target campaign to ${active.productA} owners.` })}
    >
      <div className="space-y-4">
        {/* Node path visualization */}
        <div className="p-5 rounded-lg bg-black/40 border border-border flex items-center justify-center gap-4 text-xs font-mono text-center">
          <div className="p-3 bg-muted rounded border border-border text-white font-bold">{active.productA}</div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-amber-400 font-bold">{active.timeframeDays} Days</span>
            <div className="w-12 h-0.5 bg-amber-500/40 border-t border-dashed animate-pulse" />
          </div>
          <div className="p-3 bg-amber-500/10 rounded border border-amber-500/30 text-amber-300 font-bold">{active.productC}</div>
        </div>

        {/* Purchase Affinity Grid */}
        <div className="p-3 bg-black/40 border border-border rounded-lg text-[10px] font-mono space-y-2">
          <p className="text-amber-400 uppercase font-bold">📊 Purchase Affinity Metrics</p>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div className="p-2 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Co-Purchase Rate</span>
              <strong className="text-white text-xs">84% probability</strong>
            </div>
            <div className="p-2 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Avg Order Bump</span>
              <strong className="text-green-400 text-xs">+₹45,000 (LPA)</strong>
            </div>
            <div className="p-2 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Peak Trigger</span>
              <strong className="text-white text-xs">Day {active.timeframeDays}</strong>
            </div>
            <div className="p-2 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Target Segment</span>
              <strong className="text-white text-xs">Mid-Market / SMB</strong>
            </div>
          </div>
        </div>

        {/* Dynamic Bundle Offer Card */}
        <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs space-y-1">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">🎁 Suggested Bundle Opportunity</p>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Create an upgrade bundle: <strong className="text-white">{active.productA} + {active.productC}</strong> at a 12% combined discount. Estimated conversion uplift is <strong className="text-green-400 font-mono">+18%</strong> over sequential pitches.
          </p>
        </div>

        {/* Product Network Log */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Product Network Discovery Log</p>
          <div className="grid gap-2">
            {data.map(net => (
              <button
                key={net.id}
                onClick={() => setActive(net)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === net.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{net.productA} → {net.productC}</p>
                    <p className="text-[10px] text-muted-foreground">Suggested Cycle: Day {net.timeframeDays}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-400 font-mono">{net.crossSellPotential}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 10. DECISION OUTCOME PREDICTOR
// ────────────────────────────────────────────────────────────────────────
function DecisionPredictorDashboard({ data, toast }: { data: DecisionScenario[], toast: any }) {
  const [active, setActive] = useState<DecisionScenario>(data[0]);
  const [salespeopleCount, setSalespeopleCount] = useState<number>(2);
  const [extraMarketingSpend, setExtraMarketingSpend] = useState<number>(50000);

  const isHiringScen = active.title.includes("salespeople");
  
  const simulatedRev = isHiringScen 
    ? `+${10 + salespeopleCount * 4}%` 
    : `+${(extraMarketingSpend / 10000 + 4).toFixed(0)}%`;
  const simulatedProf = isHiringScen 
    ? `+${7 + salespeopleCount * 2}%` 
    : `+${(extraMarketingSpend / 15000 + 2).toFixed(0)}%`;

  return (
    <OwnerAdvisorCard
      title="Strategic Scenario Predictor"
      executiveSummary="Yeh mathematical Monte Carlo simulations apply karke check karta hai ki strategic variables badalne par final profit margins par kya asar padega."
      keyInsight={`Simulated Decision: ${active.title}`}
      revenueImpact={`Revenue Impact: ${simulatedRev} | Profit: ${simulatedProf}`}
      aiReasoning={active.aiReasoning}
      recommendedAction={`Decision risk matches: ${active.riskLevel}. Suggested to proceed in phases.`}
      confidenceScore={82}
      actionLabel="Lock Strategic Plan"
      onAction={() => toast({ title: "Scenario Locked", description: "Drafted project memo for implementation." })}
    >
      <div className="space-y-4">
        {/* Selector Buttons */}
        <div className="flex gap-2">
          {data.map(sc => (
            <Button
              key={sc.id}
              size="sm"
              variant={active.id === sc.id ? "default" : "outline"}
              onClick={() => setActive(sc)}
              className={active.id === sc.id ? "bg-amber-500 text-black hover:bg-amber-600 font-bold" : "text-muted-foreground"}
            >
              {sc.title}
            </Button>
          ))}
        </div>

        {/* Dynamic Simulator parameters */}
        <div className="p-4 rounded-lg bg-black/40 border border-border space-y-4">
          <p className="text-[10px] text-amber-400 uppercase font-mono font-bold">🎛️ Simulation Parameters Editor</p>
          
          {isHiringScen ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span>Headcount to Add:</span>
                <span className="font-bold text-amber-400">+{salespeopleCount} Sales FTEs</span>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[salespeopleCount]}
                onValueChange={val => setSalespeopleCount(val[0])}
                className="[&>.bg-primary]:bg-amber-500"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span>Marketing Spend Delta:</span>
                <span className="font-bold text-amber-400">₹{extraMarketingSpend.toLocaleString()}</span>
              </div>
              <Slider
                min={10000}
                max={200000}
                step={5000}
                value={[extraMarketingSpend]}
                onValueChange={val => setExtraMarketingSpend(val[0])}
                className="[&>.bg-primary]:bg-amber-500"
              />
            </div>
          )}

          <div className="pt-3 border-t border-border/40 text-[10px] font-mono grid grid-cols-2 text-center text-muted-foreground gap-1">
            <div>
              <span className="block text-[8px] uppercase">Simulated Revenue</span>
              <strong className="text-green-400 text-xs font-mono">{simulatedRev}</strong>
            </div>
            <div>
              <span className="block text-[8px] uppercase">Simulated Profit</span>
              <strong className="text-white text-xs font-mono">{simulatedProf}</strong>
            </div>
          </div>
        </div>

        {/* Monte Carlo Simulator Metadata */}
        <div className="p-3 bg-black/40 border border-border rounded-lg text-[10px] font-mono space-y-2">
          <p className="text-muted-foreground uppercase font-bold text-slate-400">Monte Carlo Simulation Log</p>
          <div className="grid grid-cols-3 gap-2 text-center text-muted-foreground">
            <div className="p-1.5 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Runs Run</span>
              <strong className="text-white text-xs">10,000</strong>
            </div>
            <div className="p-1.5 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Conf. Interval</span>
              <strong className="text-white text-xs">95%</strong>
            </div>
            <div className="p-1.5 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Variance</span>
              <strong className="text-red-400 text-xs">±3.4%</strong>
            </div>
          </div>
        </div>

        {/* Feasibility Brief */}
        <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs space-y-2">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">📋 Feasibility Brief Checklist</p>
          <div className="space-y-1.5 text-muted-foreground font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span>Payback Period:</span>
              <strong className="text-white font-sans">6 Months</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Operational Risk:</span>
              <strong className="text-amber-300 font-sans">{active.riskLevel}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Team Capacity Multiplier:</span>
              <strong className="text-green-400 font-sans">1.4x scale</strong>
            </div>
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 11. BUSINESS WEAK SIGNAL DETECTOR
// ────────────────────────────────────────────────────────────────────────
function WeakSignalDashboard({ data, toast }: { data: WeakSignalAlert[], toast: any }) {
  const [active, setActive] = useState<WeakSignalAlert>(data[0]);

  return (
    <OwnerAdvisorCard
      title="Early Warnings & Risk Sentinel Warnings"
      executiveSummary="Yeh model minor database alerts aur pipeline checks ko track karke early alerts surfaces karta hai."
      keyInsight={active.warningText}
      revenueImpact={active.futureImpact}
      aiReasoning="Support response SLA timing index drift ho raha hai. Isse renewal margins drop ho sakte hain."
      recommendedAction={active.actionRequired}
      confidenceScore={82}
      actionLabel="Acknowledge & Mitigate Risk"
      onAction={() => toast({ title: "Mitigation Process Active", description: "Created task board alerts." })}
    >
      <div className="space-y-4">
        {/* Timeline of impact */}
        <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-xs space-y-1">
          <p className="text-[10px] text-red-400 font-bold uppercase font-mono">🚨 Days to Potential Revenue Impact</p>
          <div className="flex justify-between items-center pt-1">
            <span className="text-white font-bold">{active.leadTimeDays} Days Remaining</span>
            <Progress value={Math.round((active.leadTimeDays / 60) * 100)} className="h-2 w-32 bg-muted [&>div]:bg-red-500" />
          </div>
        </div>

        {/* Sentinel Log */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Active Risk Sentinel Logs</p>
          <div className="grid gap-2">
            {data.map(alert => (
              <button
                key={alert.id}
                onClick={() => setActive(alert)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === alert.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{alert.warningText}</p>
                    <p className="text-[10px] text-muted-foreground">Audit trigger: {alert.leadTimeDays} Days Lead</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-bold text-red-400">{alert.futureImpact.split("Impact:")[1] || alert.futureImpact}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 12. OPPORTUNITY TIMING ENGINE
// ────────────────────────────────────────────────────────────────────────
function TimingEngineDashboard({ data, toast }: { data: OpportunityTimingItem[], toast: any }) {
  const [active, setActive] = useState<OpportunityTimingItem>(data[0]);

  return (
    <OwnerAdvisorCard
      title="Action Priority Matrix: Timing engine"
      executiveSummary="Yeh timing models impact vs difficulty mapping se select karta hai ki kaunsa program right now action lane ke liye perfect hai."
      keyInsight={`${active.name} is prioritized as a ${active.category} target.`}
      revenueImpact={`Opportunity Value: ${active.revenueImpact}`}
      aiReasoning="Low implementation effort and high conversion efficiency make this the top leverage timing option."
      recommendedAction="Initiate automated workflows for this strategy target."
      confidenceScore={91}
      actionLabel="Promote Strategy Now"
      onAction={() => toast({ title: "Promotion Initiated", description: "Enqueued campaign target." })}
    >
      <div className="space-y-4">
        {/* 2x2 Matrix grid */}
        <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Strategic Eisenhower Grid</p>
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          {["Do Now", "Do Later", "Monitor", "Ignore"].map(cat => {
            const matched = data.find(d => d.category === cat);
            if (!matched) return null;
            const isSelected = active.id === matched.id;
            return (
              <button
                key={cat}
                onClick={() => setActive(matched)}
                className={`p-3.5 rounded-lg border transition-all text-left flex flex-col justify-between h-24 ${
                  isSelected 
                    ? "bg-amber-500/15 border-amber-500/60 shadow-md font-bold" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div>
                  <span className={`text-[8px] uppercase font-mono font-bold ${
                    cat === "Do Now" ? "text-red-400" : cat === "Do Later" ? "text-amber-400" : cat === "Monitor" ? "text-slate-400" : "text-slate-600"
                  }`}>{cat}</span>
                  <p className="font-bold text-white text-xs mt-1 truncate max-w-[120px]">{matched.name}</p>
                </div>
                <span className="text-[10px] text-green-400 font-mono block mt-2">{matched.revenueImpact}</span>
              </button>
            );
          })}
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 13. COMPETITOR MOVEMENT PREDICTOR
// ────────────────────────────────────────────────────────────────────────
function CompetitorPredictorDashboard({ data, toast }: { data: CompetitorMove[], toast: any }) {
  const [active, setActive] = useState<CompetitorMove>(data[0]);

  return (
    <OwnerAdvisorCard
      title="Predicted Competitor actions logs"
      executiveSummary="Yeh model competitor pricing movements aur share of voice changes ko monitor karke proactive tactics recommend karta hai."
      keyInsight={`Competitor predicted activity: ${active.predictedAction}`}
      revenueImpact="Strategic Impact: High"
      aiReasoning="Competitor seat indexing indicates margin pressure, creating a golden opportunity for our lock-in playbook."
      recommendedAction={active.suggestedMove}
      confidenceScore={87}
      actionLabel="Adopt Response Playbook"
      onAction={() => toast({ title: "Playbook Approved", description: "Created competitor counter marketing assets." })}
    >
      <div className="space-y-4">
        {/* Recommended defense playbook checklist */}
        <div className="p-3 bg-black/40 border border-border rounded-lg space-y-2">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">🛠️ Recommended Action Playbook Steps</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            <li>Identify basic-tier accounts with renewal dates in next 60 days.</li>
            <li>Send locked-price renewal contracts before competitor price hikes launch.</li>
            <li>Deploy feature comparison page highlighting our lower pricing tiers.</li>
          </ul>
        </div>

        {/* List Selector */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Competitor Intelligence Registry</p>
          <div className="grid gap-2">
            {data.map(comp => (
              <button
                key={comp.id}
                onClick={() => setActive(comp)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === comp.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{comp.competitor}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{comp.predictedAction}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 14. BUSINESS MOMENTUM ENGINE
// ────────────────────────────────────────────────────────────────────────
function MomentumEngineDashboard({ data, toast }: { data: BusinessMomentum, toast: any }) {
  return (
    <OwnerAdvisorCard
      title="Growth Momentum Score & Velocity Tracker"
      executiveSummary="Yeh model system outputs aur quarterly deal acceleration values se absolute growth speed index calculate karta hai."
      keyInsight={data.acceleration}
      revenueImpact="Momentum Status: Stable"
      aiReasoning={data.velocityTrend}
      recommendedAction="Inbound leads criteria check karein aur active sales team outreach limits expand karein."
      confidenceScore={data.momentumScore}
      actionLabel="Optimize Pipeline Velocity"
      onAction={() => toast({ title: "Velocity Optimized", description: "Expanded pipeline limits." })}
    >
      <div className="space-y-4">
        {/* Speedometer representation */}
        <div className="p-4 rounded-lg bg-black/40 border border-border flex flex-col items-center justify-center space-y-4">
          <div className="relative w-36 h-36 flex items-center justify-center rounded-full border-4 border-amber-500/20">
            <div className="absolute inset-2 rounded-full border border-dashed border-amber-500/30 animate-spin" style={{ animationDuration: "12s" }} />
            <div className="text-center z-10">
              <span className="text-4xl font-bold font-mono text-white">{data.momentumScore}</span>
              <span className="text-xs text-muted-foreground block font-mono">/ 100</span>
            </div>
          </div>
          <p className="text-xs font-semibold text-white font-mono text-center">{data.acceleration}</p>
        </div>

        {/* Metrics comparison checklist */}
        <div className="p-3 bg-black/40 border border-border rounded-lg text-xs space-y-2">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">📈 Acceleration Indicators Log</p>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-muted/40 rounded">
              <span className="text-[9px] text-muted-foreground block">Pipeline velocity</span>
              <strong className="text-green-400 font-mono">+18% YoY</strong>
            </div>
            <div className="p-2 bg-muted/40 rounded">
              <span className="text-[9px] text-muted-foreground block">Conversion Rate</span>
              <strong className="text-white font-mono">+2.4% WoW</strong>
            </div>
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 15. REVENUE MULTIPLIER DISCOVERY
// ────────────────────────────────────────────────────────────────────────
function RevenueMultiplierDashboard({ data, toast }: { data: RevenueMultiplierLever[], toast: any }) {
  const [active, setActive] = useState<RevenueMultiplierLever>(data[0]);
  const [simulatedIncrease, setSimulatedIncrease] = useState<number>(10);

  const parsedImpact = parseFloat(active.revenueImpact.replace("+₹", "").replace("L", "").replace("K", ""));
  const isLakh = active.revenueImpact.includes("L");
  const calculatedImpact = isLakh 
    ? `+₹${((parsedImpact / 10) * simulatedIncrease).toFixed(1)}L` 
    : `+₹${Math.round((parsedImpact / 10) * simulatedIncrease)}K`;

  return (
    <OwnerAdvisorCard
      title="Highest Leverage Growth Actions (Levers)"
      executiveSummary="Yeh AI model resource allocations aur margins yield ratios ko track karke optimal growth options prioritize karta hai."
      keyInsight={active.actionText}
      revenueImpact={`Potential Impact: ${calculatedImpact}`}
      aiReasoning="Customer lifetime frequency models indicate high growth multipliers for loyalty updates."
      recommendedAction="Initiate growth campaigns targeting selected lever areas."
      confidenceScore={91}
      actionLabel="Initiate Lever Campaign"
      onAction={() => toast({ title: "Campaign Dispatched", description: "Loyalty campaign assets sent." })}
    >
      <div className="space-y-4">
        {/* Dynamic Calculator slider */}
        <div className="p-4 rounded-lg bg-black/40 border border-border space-y-4">
          <p className="text-[10px] text-amber-400 uppercase font-mono font-bold">🧮 Lever Impact Calculator</p>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span>Target Change:</span>
              <span className="font-bold text-amber-400">+{simulatedIncrease}%</span>
            </div>
            <Slider
              min={2}
              max={30}
              step={1}
              value={[simulatedIncrease]}
              onValueChange={val => setSimulatedIncrease(val[0])}
              className="[&>.bg-primary]:bg-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-border/40 text-[10px] font-mono flex justify-between text-muted-foreground">
            <span>Base Impact (at 10%): {active.revenueImpact}</span>
            <span>Est. Gain: <strong className="text-green-400">{calculatedImpact}</strong></span>
          </div>
        </div>

        {/* Priority list */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Lever Priority Registry</p>
          <div className="grid gap-2">
            {data.map(lever => (
              <button
                key={lever.id}
                onClick={() => setActive(lever)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === lever.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{lever.actionText}</p>
                    <p className="text-[10px] text-muted-foreground">ROI target: {lever.efficiencyRatio}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-400 font-mono">{lever.revenueImpact}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 16. WEAK SIGNAL INTELLIGENCE
// ────────────────────────────────────────────────────────────────────────
function WeakSignalIntelDashboard({ data, toast }: { data: WeakSignalIntelOverview, toast: any }) {
  return (
    <OwnerAdvisorCard
      title="Future Opportunities & Risk Sentinel Scan"
      executiveSummary="Yeh model macro industry indicator updates ko process karta hai, aur alert lists compile karta hai."
      keyInsight={`Opportunity: ${data.futureOpportunities}`}
      revenueImpact={`System Readiness Score: ${data.readinessRate}%`}
      aiReasoning="Regional market trends confirm competitor pricing insensitivity, presenting a low-risk growth entry window."
      recommendedAction="Deploy early-market WhatsApp bot automation triggers to preempt competitors."
      confidenceScore={data.readinessRate}
      actionLabel="Synchronize Intelligence Logs"
      onAction={() => toast({ title: "Database Synced", description: "Verified active sentinel check-ins." })}
    >
      <div className="space-y-4">
        {/* Readiness Meter */}
        <div className="p-4 rounded-lg bg-black/40 border border-border space-y-3">
          <p className="text-[10px] text-amber-400 uppercase font-mono font-bold">⚙️ Strategic Readiness Rating</p>
          <div className="flex justify-between items-center text-xs font-mono">
            <span>Market entry preparedness:</span>
            <span className="font-bold text-amber-400">{data.readinessRate}%</span>
          </div>
          <Progress value={data.readinessRate} className="h-2 bg-muted [&>div]:bg-amber-500" />
        </div>

        {/* Opportunity and Risk panels */}
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <span className="text-[9px] uppercase font-mono text-green-400 font-bold font-mono">Opportunity Radar Alert</span>
            <p className="text-white mt-1 leading-normal font-medium">{data.futureOpportunities}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <span className="text-[9px] uppercase font-mono text-red-400 font-bold font-mono">Threat Radar Alert</span>
            <p className="text-white mt-1 leading-normal font-medium">{data.futureRisks}</p>
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 17. DECISION INTELLIGENCE ENGINE
// ────────────────────────────────────────────────────────────────────────
function DecisionIntelligenceDashboard({ data, toast }: { data: DecisionMemo[], toast: any }) {
  const [active, setActive] = useState<DecisionMemo>(data[0]);

  return (
    <OwnerAdvisorCard
      title="Strategic Proposals & ROI targets"
      executiveSummary="Yeh model complex business targets ko evaluate karke dynamic risk score card generate karta hai."
      keyInsight={`Strategic Proposal: ${active.proposal}`}
      revenueImpact={`Target ROI: ${active.expectedROI}`}
      aiReasoning={active.memoText}
      recommendedAction="Initial project budget allocation thresholds lock-in karein."
      confidenceScore={88}
      actionLabel="Approve Strategic Proposal"
      onAction={() => toast({ title: "Proposal Approved", description: `Marked "${active.proposal}" as strategic target.` })}
    >
      <div className="space-y-4">
        {/* Proposal selector */}
        <div className="divide-y divide-border">
          {data.map(memo => (
            <button
              key={memo.id}
              onClick={() => setActive(memo)}
              className={`w-full p-3 text-left flex justify-between items-center rounded-lg transition-all border ${
                active.id === memo.id 
                  ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                  : "bg-black/25 border-transparent hover:bg-muted/10"
              }`}
            >
              <div>
                <p className="text-xs font-bold text-white">{memo.proposal}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Risk level: {memo.expectedRisk}</p>
              </div>
              <p className="text-xs font-bold text-amber-400 font-mono shrink-0">{memo.expectedROI} ROI</p>
            </button>
          ))}
        </div>

        {/* Detailed McKinsey-style tabs summary */}
        <div className="p-4 rounded-lg bg-black/40 border border-border space-y-3">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">📊 ROI Feasibility Map</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center pb-1 border-b border-border/20">
              <span className="text-muted-foreground font-sans">Project ROI Target</span>
              <strong className="text-white font-mono">{active.expectedROI}</strong>
            </div>
            <div className="flex justify-between items-center pb-1 border-b border-border/20">
              <span className="text-muted-foreground font-sans">Risk Level Evaluation</span>
              <Badge className={active.expectedRisk === "High" ? "bg-red-500/20 text-red-400" : active.expectedRisk === "Medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}>
                {active.expectedRisk}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-sans">Strategic Feasibility</span>
              <strong className="text-green-400 font-mono">89% (Optimal)</strong>
            </div>
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 18. ENTERPRISE CAUSAL DISCOVERY
// ────────────────────────────────────────────────────────────────────────
function CausalDiscoveryDashboard({ data, toast }: { data: CausalDiscoveryData, toast: any }) {
  const [selectedNode, setSelectedNode] = useState<string>("Lead Quality");

  const getNodeExplanation = (node: string) => {
    switch (node) {
      case "Lead Quality":
        return "Ad campaigns broad search keywords pe shift hone ki wajah se leads junk ho gayi hain, jisse quality index 28% drop hua.";
      case "Conversion Rate":
        return "Low-quality leads standard sales follow-up timers se bounce ho rahi hain, jisse conversions pipeline impact ho gayi hai.";
      case "Expected Revenue":
        return "Conversion rate fall hone se automatic check-in numbers drop ho gaye hain, jisse total revenue forecast ₹1.2L low ho gaya.";
      default:
        return "";
    }
  };

  return (
    <OwnerAdvisorCard
      title="Interactive Cause-Effect Causal Graph"
      executiveSummary="Yeh model simple correlations ke badle variables ke dependency flow (Causality) ko monitor karta hai."
      keyInsight="Google search ad criterion shifts are driving downstream revenue reductions."
      revenueImpact="Causal Path: Ad spent -> Lead Quality -> Conversion"
      aiReasoning={data.explanation}
      recommendedAction="Audit Google Search ad keywords and update quotation dispatch automation timing targets."
      confidenceScore={92}
      actionLabel="Re-index Causal Factors"
      onAction={() => toast({ title: "Causal Graph Re-indexed", description: "Re-calculated path parameters." })}
    >
      <div className="space-y-4">
        {/* Interactive Causal Path Graph Flow */}
        <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Interactive Causal Graph Flow (Click Nodes)</p>
        <div className="flex flex-col items-center justify-center space-y-3 py-2">
          {data.steps.map((step, idx) => {
            const isSelected = selectedNode === step.label;
            return (
              <div key={idx} className="flex flex-col items-center w-full max-w-[240px]">
                <button
                  onClick={() => setSelectedNode(step.label)}
                  className={`w-full p-2.5 rounded border transition-all text-xs font-mono flex items-center justify-between ${
                    isSelected 
                      ? "bg-amber-500/15 border-amber-500/60 shadow-md font-bold" 
                      : "bg-black/25 border-border hover:bg-muted/10"
                  }`}
                >
                  <span className="text-white">{step.label}</span>
                  <span className="text-red-400 font-bold">↓ Down</span>
                </button>
                {idx < data.steps.length - 1 && (
                  <div className="h-6 w-0.5 border-l border-dashed border-amber-500/40 my-0.5 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Node explanations banner */}
        <div className="p-4 rounded-lg bg-black/40 border border-border space-y-2">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">🔍 AI Root Cause: {selectedNode}</p>
          <p className="text-xs text-muted-foreground leading-relaxed font-sans">{getNodeExplanation(selectedNode)}</p>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 19. BUSINESS TIME MACHINE
// ────────────────────────────────────────────────────────────────────────
function TimeMachineDashboard({ data, toast }: { data: any, toast: any }) {
  const [marketingSlider, setMarketingSlider] = useState<number>(20);
  const [teamSlider, setTeamSlider] = useState<number>(2);
  const [priceSlider, setPriceSlider] = useState<number>(10);

  const revenueGainPercent = 10 + Math.round(marketingSlider * 0.25) + teamSlider * 3 + Math.round(priceSlider * 0.5);
  const simulatedRev = `+${revenueGainPercent}%`;

  const baseQ1 = 4.2;
  const q1Proj = (baseQ1 * (1 + revenueGainPercent / 100)).toFixed(1);
  const q2Proj = (baseQ1 * 1.15 * (1 + revenueGainPercent / 100)).toFixed(1);
  const q3Proj = (baseQ1 * 1.25 * (1 + revenueGainPercent / 100)).toFixed(1);
  const q4Proj = (baseQ1 * 1.40 * (1 + revenueGainPercent / 100)).toFixed(1);

  return (
    <OwnerAdvisorCard
      title="Future Output Simulator: Business Time Machine"
      executiveSummary="Yeh model price points, hiring limits aur marketing spends variables ko simulate karke future yield forecast karta hai."
      keyInsight="Adjust parameters below to project strategic targets dynamically."
      revenueImpact={`Predicted Future Revenue: ${simulatedRev}`}
      aiReasoning={`Increase in marketing by ${marketingSlider}% and price index adjustments optimize client acquisition budgets.`}
      recommendedAction="Agle quarter budget limits lock-in karke growth campaigns activate karein."
      confidenceScore={89}
      actionLabel="Lock Simulation Settings"
      onAction={() => toast({ title: "Configuration Locked", description: "Updated financial projection tables." })}
    >
      <div className="space-y-4">
        {/* Multi-variable sliders */}
        <div className="p-4 rounded-lg bg-black/40 border border-border space-y-4">
          <p className="text-[10px] text-amber-400 uppercase font-mono font-bold">🎛️ Time Machine Variables</p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span>Marketing Budget Delta:</span>
              <span className="font-bold text-amber-400">+{marketingSlider}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              value={[marketingSlider]}
              onValueChange={val => setMarketingSlider(val[0])}
              className="[&>.bg-primary]:bg-amber-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span>Sales Headcount FTEs:</span>
              <span className="font-bold text-amber-400">+{teamSlider} Positions</span>
            </div>
            <Slider
              min={0}
              max={8}
              value={[teamSlider]}
              onValueChange={val => setTeamSlider(val[0])}
              className="[&>.bg-primary]:bg-amber-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span>Seat Price Delta:</span>
              <span className="font-bold text-amber-400">{priceSlider >= 0 ? "+" : ""}{priceSlider}%</span>
            </div>
            <Slider
              min={-20}
              max={40}
              value={[priceSlider]}
              onValueChange={val => setPriceSlider(val[0])}
              className="[&>.bg-primary]:bg-amber-500"
            />
          </div>
        </div>

        {/* Quarterly Projections Grid */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Simulated Quarterly Projections (₹ Lakhs)</p>
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
            <div className="p-2 bg-muted/40 rounded border border-border/60">
              <span className="text-muted-foreground block font-sans text-[9px] uppercase">Q1 Target</span>
              <strong className="text-white block mt-1">₹{q1Proj}L</strong>
            </div>
            <div className="p-2 bg-muted/40 rounded border border-border/60">
              <span className="text-muted-foreground block font-sans text-[9px] uppercase">Q2 Target</span>
              <strong className="text-white block mt-1">₹{q2Proj}L</strong>
            </div>
            <div className="p-2 bg-muted/40 rounded border border-border/60">
              <span className="text-muted-foreground block font-sans text-[9px] uppercase">Q3 Target</span>
              <strong className="text-white block mt-1">₹{q3Proj}L</strong>
            </div>
            <div className="p-2 bg-muted/40 rounded border border-border/60">
              <span className="text-muted-foreground block font-sans text-[9px] uppercase">Q4 Target</span>
              <strong className="text-green-400 block mt-1">₹{q4Proj}L</strong>
            </div>
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 20. OPPORTUNITY DISCOVERY NETWORK
// ────────────────────────────────────────────────────────────────────────
function OpportunityNetworkDashboard({ data, toast }: { data: OpportunityNetworkItem[], toast: any }) {
  const [active, setActive] = useState<OpportunityNetworkItem>(data[0]);

  return (
    <OwnerAdvisorCard
      title="Peer-to-peer benchmarking standards"
      executiveSummary="Yeh model aapke business KPIs ko identical sectors ke standards se compare karke savings audit run karta hai."
      keyInsight="Similar businesses are growing 31% faster by implementing automation channels."
      revenueImpact="Growth Gap: 31% Speed Multiplier"
      aiReasoning={active.caseStudy}
      recommendedAction={active.actionText}
      confidenceScore={92}
      actionLabel="Adopt Peer Strategy Workflow"
      onAction={() => toast({ title: "Strategy Adopted", description: "Configured WhatsApp automation templates." })}
    >
      <div className="space-y-4">
        {/* Comparison card details */}
        <div className="p-4 rounded-lg bg-black/40 border border-border space-y-3 text-xs">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">📊 Peer Benchmarks Overview</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center border-b border-border/20 pb-1">
              <span className="text-muted-foreground">Your Automation rate</span>
              <strong className="text-red-400 font-mono">12%</strong>
            </div>
            <div className="flex justify-between items-center border-b border-border/20 pb-1">
              <span className="text-muted-foreground">Peer Average Automation</span>
              <strong className="text-green-400 font-mono">68%</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Expected Growth delta</span>
              <strong className="text-white font-mono">+31% faster</strong>
            </div>
          </div>
        </div>

        {/* Discovery logs */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold font-mono">Peer Discoveries List</p>
          <div className="grid gap-2">
            {data.map(item => (
              <button
                key={item.id}
                onClick={() => setActive(item)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === item.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{item.benchmarkText}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{item.caseStudy}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 21. BUSINESS DEPENDENCY RISK ENGINE
// ────────────────────────────────────────────────────────────────────────
function DependencyRiskDashboard({ data, toast }: { data: DependencyRiskSummary; toast: any }) {
  const [newClientsSimulated, setNewClientsSimulated] = useState<number>(0);

  const baseConcentration = data.concentrationPercentage; // 62
  const simulatedConcentration = Math.max(25, baseConcentration - newClientsSimulated * 4.5);
  const simulatedRemainingShare = 100 - simulatedConcentration;

  return (
    <OwnerAdvisorCard
      title="Revenue Concentration & Dependency Alert"
      executiveSummary="Yeh model business revenue streams ko analyse karke batata hai ki income sources me customer dependency kitni hai."
      keyInsight={`Revenue ka ${simulatedConcentration.toFixed(0)}% concentration sirf ${data.topCount} primary customers se generate ho raha hai.`}
      revenueImpact="High Concentration Risk: 62% Core Income Linked"
      aiReasoning="Initech, Wayne, and Globex represent the critical revenue nodes. Churn risk on Client C is currently flagged as High."
      recommendedAction="Diversify portfolio immediately by engaging simulated pipeline leads and setting active retention agreements."
      confidenceScore={94}
      actionLabel="Initiate Portfolio Diversification"
      onAction={() => toast({ title: "Diversification Initiated", description: "Enqueued campaign target and pipeline outreach templates." })}
    >
      <div className="space-y-4">
        {/* Concentration Alert Banner */}
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-red-400 font-bold font-mono">
            <AlertTriangle className="w-4 h-4" /> REVENUE CONCENTRATION EXCEEDED THRESHOLD
          </div>
          <p className="text-muted-foreground text-[11px] font-sans">
            Your top 3 customers account for <strong className="text-white font-mono">{simulatedConcentration.toFixed(0)}%</strong> of your total revenue. The safe recommended threshold is &lt; 40%.
          </p>
        </div>

        {/* Client Concentration Table */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Top Revenue Contributors</p>
          <div className="border border-border/80 rounded-lg overflow-hidden bg-black/20">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[9px] uppercase font-mono py-2">Customer</TableHead>
                  <TableHead className="text-[9px] uppercase font-mono py-2 text-right">Revenue Share</TableHead>
                  <TableHead className="text-[9px] uppercase font-mono py-2 text-right">Value</TableHead>
                  <TableHead className="text-[9px] uppercase font-mono py-2 text-center">Churn Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {data.clients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/10 border-b border-border/40">
                    <TableCell className="font-semibold text-white py-2.5">{client.name}</TableCell>
                    <TableCell className="text-right py-2.5 font-mono">
                      {((client.revenueShare / baseConcentration) * simulatedConcentration).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right py-2.5 font-mono text-green-400">{client.revenueAmount}</TableCell>
                    <TableCell className="text-center py-2.5">
                      <Badge className={
                        client.churnRisk === "High" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                        client.churnRisk === "Medium" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                        "bg-green-500/20 text-green-400 border border-green-500/30"
                      }>
                        {client.churnRisk}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/10 font-medium text-muted-foreground hover:bg-muted/10">
                  <TableCell className="py-2.5">Remaining Clients (47 total)</TableCell>
                  <TableCell className="text-right py-2.5 font-mono">{simulatedRemainingShare.toFixed(1)}%</TableCell>
                  <TableCell className="text-right py-2.5 font-mono text-green-400">₹7.1L</TableCell>
                  <TableCell className="text-center py-2.5">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Portfolio Diversification Simulator */}
        <div className="p-4 rounded-lg bg-black/40 border border-border space-y-3">
          <p className="text-[10px] text-amber-400 uppercase font-mono font-bold">🛡️ Client Diversification Simulator</p>
          <div className="flex justify-between items-center text-xs font-mono">
            <span>Simulate acquiring new SMB clients:</span>
            <span className="font-bold text-amber-400">+{newClientsSimulated} Clients</span>
          </div>
          <Slider
            min={0}
            max={10}
            step={1}
            value={[newClientsSimulated]}
            onValueChange={(val) => setNewClientsSimulated(val[0])}
            className="[&>.bg-primary]:bg-amber-500"
          />
          <div className="pt-2 border-t border-border/40 text-[10px] font-mono flex justify-between text-muted-foreground">
            <span>Top-3 Share: <strong className={simulatedConcentration < 50 ? "text-green-400" : "text-red-400"}>{simulatedConcentration.toFixed(0)}%</strong></span>
            <span>Diversified remaining share: <strong className="text-white">{simulatedRemainingShare.toFixed(0)}%</strong></span>
          </div>
        </div>

        {/* Strategic Risk Mitigation Checklist */}
        <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs space-y-1.5">
          <p className="text-[10px] text-amber-400 font-bold uppercase font-mono">🛠️ AI Portfolio Risk Mitigation Playbook</p>
          <div className="space-y-1 text-muted-foreground font-mono mt-1 text-[11px]">
            <p>✓ Draft dedicated SLA and lock-in contracts for Globex Corp</p>
            <p>✓ Launch expansion outreach to 12 warm pipeline enterprise targets</p>
            <p>☐ Set up trigger alerts for customer check-in drops under top 3 slots</p>
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}


// ────────────────────────────────────────────────────────────────────────
// 22. CUSTOMER REPLACEMENT COST PREDICTOR
// ────────────────────────────────────────────────────────────────────────
function ReplacementCostDashboard({ data, toast }: { data: ReplacementCostItem[]; toast: any }) {
  const [active, setActive] = useState<ReplacementCostItem>(data[0]);
  const totalExposure = data.reduce((sum, c) => sum + c.totalReplacementCost, 0);

  return (
    <OwnerAdvisorCard
      title="Customer Replacement Cost Predictor"
      executiveSummary="Jab ek customer churn karta hai toh sirf revenue nahi jaata — naya customer laane ki cost bhi hoti hai. Yeh model woh exact cost calculate karta hai."
      keyInsight={`${active.customerName} churn ki wajah se replacement cost ₹${active.totalReplacementCost.toLocaleString()} estimate ki gayi hai.`}
      revenueImpact={`Total Portfolio Replacement Exposure: ₹${totalExposure.toLocaleString()}`}
      aiReasoning={`Churn reason: "${active.churnReason}". ${active.salesCycleMonths} months ka sales cycle x ₹${active.lostRevenueMo.toLocaleString()}/mo lost revenue + CAC & onboarding = ₹${active.totalReplacementCost.toLocaleString()} total replacement cost.`}
      recommendedAction={active.recoveryAction}
      confidenceScore={91}
      actionLabel="Send Win-Back Campaign"
      onAction={() =>
        toast({ title: "Win-Back Dispatched", description: `Retention offer sent to ${active.customerName}.` })
      }
    >
      <div className="space-y-4">
        {/* Headline replacement cost badge */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-red-950/60 to-black border border-red-500/30 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-mono text-red-400 font-bold tracking-wider">Estimated Replacement Cost</p>
            <p className="text-3xl font-bold font-mono text-white mt-1">
              ₹{active.totalReplacementCost.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{active.customerName} &middot; {active.industry}</p>
          </div>
          <div className="text-right space-y-1">
            <Badge className={
              active.riskLevel === "Critical" ? "bg-red-500/20 text-red-400 border border-red-500/40 text-xs" :
              active.riskLevel === "High" ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs" :
              "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs"
            }>
              {active.riskLevel} Risk
            </Badge>
            <p className="text-[10px] text-muted-foreground font-mono block">LTV at churn: <strong className="text-white">{active.ltvAtChurn}</strong></p>
            <p className="text-[10px] text-muted-foreground font-mono block">{active.monthsActive} months as customer</p>
          </div>
        </div>

        {/* Cost Breakdown Table */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Replacement Cost Breakdown</p>
          <div className="border border-border/80 rounded-lg overflow-hidden bg-black/20">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[9px] uppercase font-mono py-2">Cost Component</TableHead>
                  <TableHead className="text-[9px] uppercase font-mono py-2 text-right">Amount</TableHead>
                  <TableHead className="text-[9px] uppercase font-mono py-2 text-right">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                <TableRow className="border-b border-border/40">
                  <TableCell className="py-2.5 text-white font-semibold">New Customer Acquisition (CAC)</TableCell>
                  <TableCell className="py-2.5 text-right font-mono text-amber-300">₹{active.acquisitionCost.toLocaleString()}</TableCell>
                  <TableCell className="py-2.5 text-right text-muted-foreground font-mono text-[10px]">Ads + Sales effort</TableCell>
                </TableRow>
                <TableRow className="border-b border-border/40">
                  <TableCell className="py-2.5 text-white font-semibold">Onboarding and Setup Cost</TableCell>
                  <TableCell className="py-2.5 text-right font-mono text-amber-300">₹{active.onboardingCost.toLocaleString()}</TableCell>
                  <TableCell className="py-2.5 text-right text-muted-foreground font-mono text-[10px]">Support + integration</TableCell>
                </TableRow>
                <TableRow className="border-b border-border/40">
                  <TableCell className="py-2.5 text-white font-semibold">Lost Revenue During Gap</TableCell>
                  <TableCell className="py-2.5 text-right font-mono text-red-400">
                    ₹{(active.lostRevenueMo * active.salesCycleMonths).toLocaleString()}
                  </TableCell>
                  <TableCell className="py-2.5 text-right text-muted-foreground font-mono text-[10px]">
                    ₹{active.lostRevenueMo.toLocaleString()}/mo x {active.salesCycleMonths}mo
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/20">
                  <TableCell className="py-2.5 font-bold text-white">Total Replacement Cost</TableCell>
                  <TableCell className="py-2.5 text-right font-bold font-mono text-white text-sm">
                    ₹{active.totalReplacementCost.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-2.5 text-right text-muted-foreground font-mono text-[10px]">Headline figure</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Churn Reason + Recovery Action */}
        <div className="grid grid-cols-1 gap-2">
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-xs space-y-1">
            <p className="text-[9px] uppercase font-mono text-red-400 font-bold">Churn Reason (AI Detected)</p>
            <p className="text-white font-medium">"{active.churnReason}"</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-xs space-y-1">
            <p className="text-[9px] uppercase font-mono text-green-400 font-bold">AI Recommended Recovery Action</p>
            <p className="text-white font-medium">{active.recoveryAction}</p>
          </div>
        </div>

        {/* Retention vs Replacement insight */}
        <div className="p-3 bg-black/40 border border-border rounded-lg text-[10px] font-mono space-y-2">
          <p className="text-amber-400 font-bold uppercase">Retention vs Replacement Math</p>
          <div className="grid grid-cols-2 gap-2 text-center text-muted-foreground">
            <div className="p-2 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Cost to Retain</span>
              <strong className="text-green-400 text-sm">₹{Math.round(active.acquisitionCost * 0.3).toLocaleString()}</strong>
              <span className="block text-[8px] text-muted-foreground mt-0.5">~30% of CAC</span>
            </div>
            <div className="p-2 bg-muted/40 rounded">
              <span className="block text-[8px] uppercase">Cost to Replace</span>
              <strong className="text-red-400 text-sm">₹{active.totalReplacementCost.toLocaleString()}</strong>
              <span className="block text-[8px] text-muted-foreground mt-0.5">Full replacement</span>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground pt-1">
            Retaining is <strong className="text-green-400">{Math.round(active.totalReplacementCost / (active.acquisitionCost * 0.3))}x cheaper</strong> than acquiring a new equivalent customer.
          </p>
        </div>

        {/* Churned Customer List */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Churned Customer Registry</p>
          <div className="grid gap-2">
            {data.map((item) => (
              <button
                key={item.id}
                onClick={() => setActive(item)}
                className={`p-3 text-left rounded-lg transition-all border ${
                  active.id === item.id
                    ? "bg-red-500/10 border-red-500/40 shadow-md"
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{item.customerName}</p>
                    <p className="text-[10px] text-muted-foreground">{item.industry} &middot; {item.monthsActive} mo active</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs font-bold text-red-400 font-mono">₹{item.totalReplacementCost.toLocaleString()}</p>
                    <Badge className={
                      item.riskLevel === "Critical" ? "bg-red-500/20 text-red-400 border border-red-500/30 text-[9px]" :
                      item.riskLevel === "High" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px]" :
                      "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[9px]"
                    }>
                      {item.riskLevel}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 23. CASH FLOW PREDICTOR DASHBOARD
// ────────────────────────────────────────────────────────────────────────
interface CashFlowPredictorDashboardProps {
  data: CashFlowData;
  toast: any;
}

function CashFlowPredictorDashboard({ data, toast }: CashFlowPredictorDashboardProps) {
  const [timeframe, setTimeframe] = useState<"30" | "60" | "90">("30");
  const [dsoReduction, setDsoReduction] = useState<number>(0);
  const [vendorDelay, setVendorDelay] = useState<number>(0);
  const [useSeasonality, setUseSeasonality] = useState<boolean>(true);

  const currentMonth = "Jun";
  const seasonalTrend = data.seasonalTrends.find(t => t.month === currentMonth) || { inflowFactor: 1, outflowFactor: 1 };
  
  const inflowMultiplier = useSeasonality ? seasonalTrend.inflowFactor : 1.0;
  const outflowMultiplier = useSeasonality ? seasonalTrend.outflowFactor : 1.0;

  const activeDaysLimit = parseInt(timeframe, 10);

  // Inflows: reduce due days based on DSO reduction if it's an Invoice
  const simulatedInflows = data.inflows.map(item => {
    const originalDueDays = item.dueDays;
    const isInvoice = item.category === "Client Invoice";
    const simulatedDueDays = isInvoice 
      ? Math.max(1, originalDueDays - dsoReduction) 
      : originalDueDays;

    const amount = item.isSeasonal ? Math.round(item.amount * inflowMultiplier) : item.amount;
    
    return {
      ...item,
      amount,
      originalDueDays,
      dueDays: simulatedDueDays,
    };
  });

  // Outflows: delay due days for Software / Office Expenses
  const simulatedOutflows = data.outflows.map(item => {
    const originalDueDays = item.dueDays;
    const isVendorPayable = item.category === "Software/Infrastructure" || item.category === "Office Expense";
    const simulatedDueDays = isVendorPayable
      ? originalDueDays + vendorDelay
      : originalDueDays;

    const amount = item.isSeasonal ? Math.round(item.amount * outflowMultiplier) : item.amount;

    return {
      ...item,
      amount,
      originalDueDays,
      dueDays: simulatedDueDays,
    };
  });

  // Filter items that fall inside current timeframe
  const activeInflows = simulatedInflows.filter(item => item.dueDays <= activeDaysLimit);
  const activeOutflows = simulatedOutflows.filter(item => item.dueDays <= activeDaysLimit);

  const totalInflow = activeInflows.reduce((sum, item) => sum + item.amount, 0);
  const totalOutflow = activeOutflows.reduce((sum, item) => sum + item.amount, 0);
  const netCashFlow = totalInflow - totalOutflow;
  const endingBalance = data.startingBalance + netCashFlow;

  // Generate weekly projections for Recharts
  const numWeeks = timeframe === "30" ? 4 : timeframe === "60" ? 8 : 12;
  const chartData = Array.from({ length: numWeeks + 1 }, (_, i) => {
    const weekNum = i;
    const dayLimit = weekNum * 7;
    
    const cumInflows = simulatedInflows
      .filter(item => item.dueDays <= dayLimit)
      .reduce((sum, item) => sum + item.amount, 0);
      
    const cumOutflows = simulatedOutflows
      .filter(item => item.dueDays <= dayLimit)
      .reduce((sum, item) => sum + item.amount, 0);

    const balance = data.startingBalance + cumInflows - cumOutflows;

    return {
      name: weekNum === 0 ? "Start" : `Wk ${weekNum}`,
      balance,
    };
  });

  // Find if cash balance drops below 0 at any week
  const hasCashCrunch = chartData.some(pt => pt.balance < 0);
  const crunchPoint = chartData.find(pt => pt.balance < 0);

  return (
    <OwnerAdvisorCard
      title="Interactive Cash Flow Prediction Sandbox"
      executiveSummary="Aane wale 30/60/90 din ke inflows aur outflows ko monitor karein. Sliders ke sath collection speeds aur vendor delays simulate karke runway optimize karein."
      keyInsight={
        hasCashCrunch 
          ? `WARNING: Cash Deficit predicted at ${crunchPoint?.name}! Ending Balance ₹${endingBalance.toLocaleString()} drop ho sakti hai.`
          : `Optimal Cash Balance: Runway active. Ending balance ₹${endingBalance.toLocaleString()} levels safety threshold ke upar hai.`
      }
      revenueImpact={`Ending Balance: ₹${endingBalance.toLocaleString()}`}
      aiReasoning={
        `Current seasonal adjustments (Month: ${currentMonth}): Inflow Multiplier ${Math.round(inflowMultiplier * 100)}%, Outflow Multiplier ${Math.round(outflowMultiplier * 100)}%. ` +
        `Total predicted inflows are ₹${totalInflow.toLocaleString()} and outflows are ₹${totalOutflow.toLocaleString()}.`
      }
      recommendedAction={
        hasCashCrunch
          ? "💡 Tip: Deficit se bachne ke liye 'Reduce Invoice Collection DSO' slider badhayein ya vendor delay extend karein."
          : "✅ Sabhi safety margins positive hain. Koi negative cash crunch warnings detect nahi hui hain."
      }
      confidenceScore={87}
      actionLabel="Lock In Cash Plan"
      onAction={() => {
        toast({
          title: "Cash Strategy Saved",
          description: `Locked simulation plan with ${dsoReduction} days DSO speedup and ${vendorDelay} days payable extensions.`,
        });
      }}
    >
      <div className="space-y-6">
        {/* Controls Row: Timeframe + Seasonality Switch */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-border">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-muted-foreground block">Select Projection Window</span>
            <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border">
              {(["30", "60", "90"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                    timeframe === t 
                      ? "bg-amber-500 text-black shadow-sm" 
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {t} Days
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-white block">Seasonal Variations</span>
              <span className="text-[10px] text-muted-foreground">Apply June Summer Slump (-15% Inflows)</span>
            </div>
            <UiSwitch 
              checked={useSeasonality} 
              onCheckedChange={setUseSeasonality} 
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        </div>

        {/* Dynamic Warning Card */}
        {hasCashCrunch && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-3 text-red-300">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wide">Cash Crunch Alert detected!</p>
              <p className="text-xs mt-1 text-red-200">
                Aapka cash balance negative (₹{chartData.find(pt => pt.balance < 0)?.balance.toLocaleString()}) jaa raha hai. 
                Niche diye sliders se collections tezi se complete karein ya vendor payout dates delay karein.
              </p>
            </div>
          </div>
        )}

        {/* Financial KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-black/20 border border-border/80 rounded-lg">
            <p className="text-[9px] uppercase font-mono text-muted-foreground">Starting Cash</p>
            <p className="text-base font-bold font-mono text-white mt-1">₹{data.startingBalance.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-black/20 border border-border/80 rounded-lg">
            <p className="text-[9px] uppercase font-mono text-green-400">Total Inflows (+)</p>
            <p className="text-base font-bold font-mono text-green-400 mt-1">₹{totalInflow.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-black/20 border border-border/80 rounded-lg">
            <p className="text-[9px] uppercase font-mono text-red-400">Total Outflows (-)</p>
            <p className="text-base font-bold font-mono text-red-400 mt-1">₹{totalOutflow.toLocaleString()}</p>
          </div>
          <div className={`p-3 border rounded-lg ${endingBalance < 0 ? "bg-red-500/5 border-red-500/30" : "bg-amber-500/5 border-amber-500/20"}`}>
            <p className="text-[9px] uppercase font-mono text-amber-400">Ending Balance</p>
            <p className={`text-base font-bold font-mono mt-1 ${endingBalance < 0 ? "text-red-400" : "text-white"}`}>
              ₹{endingBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Visual Chart */}
        <div className="p-4 rounded-xl border border-border bg-black/30">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold mb-3 tracking-wider">Projected Cash Balance Runway</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="name" stroke="#737373" fontSize={9} className="font-mono" />
              <YAxis stroke="#737373" fontSize={9} className="font-mono" tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px' }} 
                labelStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                itemStyle={{ color: '#fbbf24', fontSize: '10px' }}
                formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Balance"]}
              />
              <Area type="monotone" dataKey="balance" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Simulation Sliders */}
        <div className="space-y-4 p-4 rounded-xl border border-border/80 bg-black/20">
          <p className="text-[10px] uppercase font-mono text-amber-400 font-bold tracking-wider">⚙️ Simulation Sandbox Playground</p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Reduce Invoice Collection DSO (Invoice Early Collection):</span>
              <span className="font-mono font-bold text-green-400">+{dsoReduction} Days Speedup</span>
            </div>
            <Slider
              min={0}
              max={25}
              step={1}
              value={[dsoReduction]}
              onValueChange={val => setDsoReduction(val[0])}
              className="[&>.bg-primary]:bg-amber-500"
            />
            <span className="text-[9px] text-muted-foreground block">Invoice clients to pay faster. Shorter DSO shifts invoice dates forward in the timeframe.</span>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Delay Supplier Payables (Vendor Grace Extensions):</span>
              <span className="font-mono font-bold text-amber-400">+{vendorDelay} Days Delay</span>
            </div>
            <Slider
              min={0}
              max={30}
              step={1}
              value={[vendorDelay]}
              onValueChange={val => setVendorDelay(val[0])}
              className="[&>.bg-primary]:bg-amber-500"
            />
            <span className="text-[9px] text-muted-foreground block">Defer software / office rent billing slightly to retain active reserves in key weeks.</span>
          </div>
        </div>

        {/* Inflows & Outflows Tables side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Inflows List */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-mono text-green-400 font-bold tracking-wider">Inflow Schedules ({activeInflows.length})</p>
            <div className="border border-border rounded-lg overflow-hidden bg-black/20 text-xs">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[8px] uppercase font-mono py-1.5">Source</TableHead>
                    <TableHead className="text-[8px] uppercase font-mono py-1.5 text-right font-bold">Days</TableHead>
                    <TableHead className="text-[8px] uppercase font-mono py-1.5 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeInflows.map(item => (
                    <TableRow key={item.id} className="border-b border-border/40 hover:bg-white/5">
                      <TableCell className="py-2">
                        <span className="block font-medium text-white truncate max-w-[130px]">{item.source}</span>
                        <span className="text-[8px] text-muted-foreground uppercase font-mono">{item.category}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right font-mono text-[10px]">
                        {item.dueDays !== item.originalDueDays ? (
                          <span className="text-green-400">
                            Day {item.dueDays} <span className="line-through text-muted-foreground text-[8px]">({item.originalDueDays})</span>
                          </span>
                        ) : (
                          `Day ${item.dueDays}`
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-right font-mono text-green-400 font-semibold">
                        ₹{item.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {activeInflows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">No active inflows in this window</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Outflows List */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-mono text-red-400 font-bold tracking-wider">Outflow Schedules ({activeOutflows.length})</p>
            <div className="border border-border rounded-lg overflow-hidden bg-black/20 text-xs">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[8px] uppercase font-mono py-1.5">Target</TableHead>
                    <TableHead className="text-[8px] uppercase font-mono py-1.5 text-right font-bold">Days</TableHead>
                    <TableHead className="text-[8px] uppercase font-mono py-1.5 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeOutflows.map(item => (
                    <TableRow key={item.id} className="border-b border-border/40 hover:bg-white/5">
                      <TableCell className="py-2">
                        <span className="block font-medium text-white truncate max-w-[130px]">{item.target}</span>
                        <span className="text-[8px] text-muted-foreground uppercase font-mono">{item.category}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right font-mono text-[10px]">
                        {item.dueDays !== item.originalDueDays ? (
                          <span className="text-amber-400">
                            Day {item.dueDays} <span className="line-through text-muted-foreground text-[8px]">({item.originalDueDays})</span>
                          </span>
                        ) : (
                          `Day ${item.dueDays}`
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-right font-mono text-red-400 font-semibold">
                        ₹{item.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {activeOutflows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">No active outflows in this window</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 24. EXPENSE ANOMALY DETECTOR DASHBOARD
// ────────────────────────────────────────────────────────────────────────
interface ExpenseAnomalyDetectorDashboardProps {
  data: ExpenseAnomalyData;
  toast: any;
}

function ExpenseAnomalyDetectorDashboard({ data, toast }: ExpenseAnomalyDetectorDashboardProps) {
  const [anomalies, setAnomalies] = useState<ExpenseAnomaly[]>(data.anomalies);
  const [activeId, setActiveId] = useState<string>(data.anomalies[0]?.id || "");

  const activeAnomaly = anomalies.find(a => a.id === activeId) || anomalies[0];
  const pendingCount = anomalies.filter(a => a.status === "Flagged").length;
  const totalExposure = anomalies
    .filter(a => a.status === "Flagged")
    .reduce((sum, a) => sum + a.amount, 0);

  const handleAction = (id: string, newStatus: "Approved" | "Flagged" | "Reviewed") => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    
    const item = anomalies.find(a => a.id === id);
    if (!item) return;

    if (newStatus === "Approved") {
      toast({
        title: "Expense Approved",
        description: `${item.merchant} (₹${item.amount.toLocaleString()}) approved and cleared for payout.`,
      });
    } else if (newStatus === "Reviewed") {
      toast({
        title: "Flagged as Fraud / Rejected",
        description: `Rejected ${item.merchant}. Suspended reimbursement and logged HR Audit workflow for ${item.employeeName}.`,
      });
    }
  };

  return (
    <OwnerAdvisorCard
      title="Real-time Expenditure Anomaly Stream"
      executiveSummary="Normal business spending categories aur employee transaction baseline patterns ko analyze karke anomaly scores identify karein."
      keyInsight={
        pendingCount > 0 
          ? `WARNING: ${pendingCount} high-risk spend anomalies require manual audit checks. Total risk exposure at ₹${totalExposure.toLocaleString()}.`
          : "Healthy Ledger: Koi unresolved expense anomalies detected nahi hui hain."
      }
      revenueImpact={`Risk Exposure: ₹${totalExposure.toLocaleString()}`}
      aiReasoning={
        activeAnomaly 
          ? `${activeAnomaly.employeeName} ne ${activeAnomaly.merchant} ke liye ₹${activeAnomaly.amount.toLocaleString()} ka bill submit kiya. ` +
            (activeAnomaly.avgAmount > 0 
              ? `Yeh is category ke historical average (₹${activeAnomaly.avgAmount.toLocaleString()}) se ${activeAnomaly.increasePercent}% zyada hai.` 
              : "Yeh category is employee ke transaction history me pehle kabhi nahi dekhi gayi.")
          : "All items reviewed."
      }
      recommendedAction={
        activeAnomaly?.severity === "Critical" 
          ? "🔴 Recommendation: Immediate action recommended. Reject expense aur employee credentials audit verify karein."
          : "🟡 Recommendation: Detail invoice attachments aur client meeting checklogs cross-reference karein."
      }
      confidenceScore={91}
      actionLabel={activeAnomaly?.status === "Flagged" ? "Flag as Fraud & Reject" : "Already Resolved"}
      onAction={activeAnomaly?.status === "Flagged" ? () => handleAction(activeAnomaly.id, "Reviewed") : undefined}
    >
      <div className="space-y-6">
        {/* Metric Overview Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-black/20 border border-border">
            <span className="text-[10px] uppercase font-mono text-muted-foreground block">Active Alerts</span>
            <span className="text-xl font-bold font-mono text-white block mt-1">{pendingCount} Flagged</span>
          </div>
          <div className="p-3.5 rounded-xl bg-black/20 border border-border">
            <span className="text-[10px] uppercase font-mono text-red-400 block">Total Risk Value</span>
            <span className="text-xl font-bold font-mono text-red-400 block mt-1">₹{totalExposure.toLocaleString()}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-black/20 border border-border">
            <span className="text-[10px] uppercase font-mono text-muted-foreground block">AI Core Sensitivity</span>
            <span className="text-xl font-bold font-mono text-amber-400 block mt-1">High (95%)</span>
          </div>
        </div>

        {/* Categories Comparison BarChart */}
        <div className="p-4 rounded-xl border border-border bg-black/30">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold tracking-wider">Current Month Spend vs Historical Category Average</p>
            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">June Live</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.categories} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="category" stroke="#737373" fontSize={9} />
              <YAxis stroke="#737373" fontSize={9} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px' }}
                labelStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '10px' }}
                formatter={(value: any, name: any) => [`₹${Number(value).toLocaleString()}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
              <Bar dataKey="current" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Current Month" />
              <Bar dataKey="historical" fill="#404040" radius={[4, 4, 0, 0]} name="Historical Avg" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Flagged Anomalies Queue */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold tracking-wider">Anomaly Review Pipeline</p>
          <div className="grid gap-2">
            {anomalies.map(item => (
              <div
                key={item.id}
                onClick={() => setActiveId(item.id)}
                className={`p-4 rounded-xl text-left transition-all border cursor-pointer ${
                  activeId === item.id 
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md" 
                    : "bg-black/25 border-border hover:bg-muted/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-white truncate">{item.merchant}</p>
                      <Badge className={
                        item.severity === "Critical" ? "bg-red-500/20 text-red-400 border border-red-500/30 text-[9px]" :
                        item.severity === "High" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px]" :
                        "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[9px]"
                      }>
                        {item.severity}
                      </Badge>
                      {item.increasePercent > 0 && (
                        <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/20">
                          {item.increasePercent}% Spike
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      By {item.employeeName} &middot; Category: {item.category} &middot; Date: {item.date}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">{item.reasoning}</p>

                    {item.status === "Flagged" && (
                      <div className="flex items-center gap-2 pt-3">
                        <Button 
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(item.id, "Reviewed");
                          }}
                        >
                          Reject & Flag Fraud
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] border-green-500/30 text-green-400 hover:bg-green-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(item.id, "Approved");
                          }}
                        >
                          Approve Expense
                        </Button>
                      </div>
                    )}

                    {item.status === "Approved" && (
                      <div className="pt-2 text-[10px] text-green-400 font-mono flex items-center gap-1 font-bold">
                        <span>✓ Approved and Cleared</span>
                      </div>
                    )}

                    {item.status === "Reviewed" && (
                      <div className="pt-2 text-[10px] text-red-400 font-mono flex items-center gap-1 font-bold">
                        <span>✖ Rejected & Flagged for Audit</span>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 25. REGRET MINIMIZATION ENGINE DASHBOARD
// ────────────────────────────────────────────────────────────────────────
interface RegretMinimizerDashboardProps {
  data: RegretData;
  toast: any;
}

function RegretMinimizerDashboard({ data, toast }: RegretMinimizerDashboardProps) {
  const [alerts, setAlerts] = useState<UpcomingDecisionAlert[]>(data.upcomingDecisions);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  const toggleAlert = (id: string) => {
    const isResolved = resolvedIds.includes(id);
    if (isResolved) {
      setResolvedIds(prev => prev.filter(x => x !== id));
    } else {
      setResolvedIds(prev => [...prev, id]);
      const alertItem = alerts.find(a => a.id === id);
      toast({
        title: "Proactive Alert Enabled",
        description: `Alert timer & evaluation meeting set for: "${alertItem?.title}".`,
      });
    }
  };

  return (
    <OwnerAdvisorCard
      title="Behavioral Loss Aversion & Regret Board"
      executiveSummary="Pehle ke missed opportunities ka actual financial impact analysis aur future decisions me proactively decision locking dashboard."
      keyInsight={`Is saal total regret ₹${data.totalRegret.toLocaleString()} calculate kiya gaya hai. Top 3 missed decisions standard pipeline margin parameters me highly significant performance gaps hold karte hain.`}
      revenueImpact={`Annual Regret Cost: ₹${data.totalRegret.toLocaleString()}`}
      aiReasoning="Past decisions me lack of first-touch evaluation triggers aur delayed inventory release orders key causes the."
      recommendedAction="Aage aane wale 3 mahino me similar high-risk decisions pending hain. Proactive alert flags configure karein."
      confidenceScore={94}
      actionLabel="Acknowledge & Sync History"
      onAction={() => toast({ title: "Decisions Synced", description: "Updated internal opportunity models." })}
    >
      <div className="space-y-6">
        {/* Top Misses Headline Alert */}
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs space-y-2">
          <p className="text-[10px] uppercase font-mono font-bold text-red-400 tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Top 3 Misses Summary (Is Saal Ka Regret)
          </p>
          <ul className="space-y-1 text-red-200 pl-4 list-disc font-sans leading-relaxed">
            {data.topMisses.map((m, idx) => (
              <li key={idx}>{m}</li>
            ))}
          </ul>
        </div>

        {/* Proactive Alert Prevention Panel */}
        <div className="space-y-3 p-4 rounded-xl border border-border bg-black/20">
          <p className="text-[10px] uppercase font-mono text-amber-400 font-bold tracking-wider">💡 Proactive Prevention: Upcoming Decisions alerts</p>
          <div className="space-y-2">
            {alerts.map(item => {
              const active = resolvedIds.includes(item.id);
              return (
                <div key={item.id} className="p-3 bg-black/40 border border-border/80 rounded-lg flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white leading-tight">{item.title}</p>
                      <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 font-mono">
                        {item.daysRemaining} days remaining
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 font-sans">
                      Preventative action: <strong className="text-white">{item.preventativeAction}</strong>
                    </p>
                    <p className="text-[9px] text-red-400 font-mono block">Potential Regret: ₹{item.potentialRegret.toLocaleString()}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={active ? "outline" : "default"}
                    className={`h-7 px-3 text-[10px] font-bold shrink-0 ${
                      active ? "border-green-500/30 text-green-400 bg-green-500/5 hover:bg-green-500/10" : "bg-amber-500 hover:bg-amber-600 text-black border-0"
                    }`}
                    onClick={() => toggleAlert(item.id)}
                  >
                    {active ? "Alert Active ✓" : "Set Alert Reminder"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline of Past Regrets */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold tracking-wider">Historical Missed Opportunities Timeline</p>
          <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
            {data.pastRegrets.map(item => (
              <div key={item.id} className="relative pl-8 flex items-start gap-3 text-xs">
                {/* Timeline node marker */}
                <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full border-2 border-amber-500 bg-background flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                </div>

                <div className="flex-1 p-3.5 rounded-lg border border-border bg-black/25 space-y-1.5">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-white text-xs">{item.decisionName}</p>
                      <p className="text-[9px] text-muted-foreground font-mono">{item.category} &middot; {item.timestamp}</p>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-[9px] py-0.5">
                      Regret Cost: ₹{item.regretCost.toLocaleString()}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px] font-sans">
                    {item.description}
                  </p>
                  <div className="p-2 rounded bg-red-950/20 border border-red-500/15 text-[10px] text-red-300 italic font-mono">
                    Emotional Trigger: "{item.emotionalTrigger}"
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 26. ENERGY DRAIN DETECTOR DASHBOARD
// ────────────────────────────────────────────────────────────────────────
interface EnergyDrainDetectorDashboardProps {
  data: EnergyDrainData;
  toast: any;
}

function EnergyDrainDetectorDashboard({ data, toast }: EnergyDrainDetectorDashboardProps) {
  const [tasks, setTasks] = useState<EnergyDrainTask[]>(data.tasks);

  const toggleTaskAutomation = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextState = !t.isAutoEnabled;
        toast({
          title: nextState ? "Automation Enabled" : "Automation Disabled",
          description: nextState ? `Activated automatic solution for: "${t.taskName}".` : `Disabled automated workflow for: "${t.taskName}".`,
        });
        return { ...t, isAutoEnabled: nextState };
      }
      return t;
    }));
  };

  const updateHours = (id: string, hrs: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, hoursSpentWeekly: hrs } : t));
  };

  const updateStress = (id: string, str: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, stressLevel: str } : t));
  };

  // Calculations
  const calculatedWeeklyHoursBefore = data.weeklyHoursWasted;
  const calculatedWeeklyHoursAfter = tasks.reduce((sum, t) => {
    const hrs = t.isAutoEnabled ? t.reclaimedHoursSimulated : t.hoursSpentWeekly;
    return sum + hrs;
  }, 0);

  const hourlyOppCost = data.hourlyOpportunityCost;

  // Energy Drain Index = sum(hours * stress * oppCost)
  const drainIndexBefore = tasks.reduce((sum, t) => {
    return sum + (t.hoursSpentWeekly * t.stressLevel * hourlyOppCost);
  }, 0);

  const drainIndexAfter = tasks.reduce((sum, t) => {
    const hrs = t.isAutoEnabled ? t.reclaimedHoursSimulated : t.hoursSpentWeekly;
    const str = t.isAutoEnabled ? 2 : t.stressLevel; // stress drops to 2 when automated
    return sum + (hrs * str * hourlyOppCost);
  }, 0);

  const savedHoursWeekly = Math.max(0, calculatedWeeklyHoursBefore - calculatedWeeklyHoursAfter);
  const monthlySavingsValue = Math.round(savedHoursWeekly * hourlyOppCost * 4.3);

  // BarChart Data mapping
  const chartData = tasks.map(t => ({
    name: t.taskName.split(" ").slice(0, 2).join(" "), // truncate labels
    Before: t.hoursSpentWeekly,
    After: t.isAutoEnabled ? t.reclaimedHoursSimulated : t.hoursSpentWeekly
  }));

  return (
    <OwnerAdvisorCard
      title="Owner Time & Energy Audit Platform"
      executiveSummary="Admin work me spent operational hours aur mental stress evaluate karein. Automation tools turn-on karke saved business ceiling values aur opportunity costs verify karein."
      keyInsight={
        savedHoursWeekly > 0
          ? `SUCCESS: Automation enabled. Reclaiming ${savedHoursWeekly.toFixed(1)} hours/week. Monthly Opportunity Cost Savings: ₹${monthlySavingsValue.toLocaleString()}.`
          : `Energy Drain Index is high (${drainIndexBefore.toLocaleString()}). Toggle 'Auto-Solutions' check marks below to reclaim operational runway.`
      }
      revenueImpact={`Monthly Savings: ₹${monthlySavingsValue.toLocaleString()}`}
      aiReasoning={`GST billing delay reconciliation, manual invoicing and stock verification are key drain loops. Reclaiming hours enables Jaipur branch planning.`}
      recommendedAction="Aage diye active administrative work list me 'GST Automation Suite' and 'Collections auto-WhatsApp' toggle turn-on karein."
      confidenceScore={90}
      actionLabel="Lock In Time Savings"
      onAction={() => {
        toast({
          title: "Time Allocation Saved",
          description: `Locked in automated workflows. Reclaimed weekly time: ${savedHoursWeekly.toFixed(1)} hours.`,
        });
      }}
    >
      <div className="space-y-6">
        {/* Scoreboard Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-black/25 border border-border rounded-lg">
            <span className="text-[9px] uppercase font-mono text-muted-foreground block">Hours Wasted Weekly</span>
            <span className="text-base font-bold font-mono text-white block mt-1">
              {calculatedWeeklyHoursAfter.toFixed(1)} hrs <span className="text-xs text-muted-foreground line-through">({calculatedWeeklyHoursBefore.toFixed(1)})</span>
            </span>
          </div>
          <div className="p-3 bg-black/25 border border-border rounded-lg">
            <span className="text-[9px] uppercase font-mono text-green-400 block">Weekly Saved Hours</span>
            <span className="text-base font-bold font-mono text-green-400 block mt-1">+{savedHoursWeekly.toFixed(1)} Hours</span>
          </div>
          <div className="p-3 bg-black/25 border border-border rounded-lg">
            <span className="text-[9px] uppercase font-mono text-muted-foreground block">Energy Drain Score</span>
            <span className="text-base font-bold font-mono text-white block mt-1">
              {Math.round(drainIndexAfter).toLocaleString()} <span className="text-xs text-muted-foreground line-through">({Math.round(drainIndexBefore).toLocaleString()})</span>
            </span>
          </div>
          <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
            <span className="text-[9px] uppercase font-mono text-green-400 block">Simulated Monthly Value</span>
            <span className="text-base font-bold font-mono text-green-400 block mt-1">₹{monthlySavingsValue.toLocaleString()}</span>
          </div>
        </div>

        {/* Visual Comparison Chart */}
        <div className="p-4 rounded-xl border border-border bg-black/30">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold mb-3 tracking-wider">Weekly Time spent comparison: Before vs After Automation Solutions</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="name" stroke="#737373" fontSize={9} />
              <YAxis stroke="#737373" fontSize={9} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#737373', fontSize: 9 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px' }}
                labelStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '10px' }}
                formatter={(value: any, name: any) => [`${value} Hours`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
              <Bar dataKey="Before" fill="#404040" radius={[4, 4, 0, 0]} name="Manual Process" />
              <Bar dataKey="After" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Automated Process" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Task Nodes Configuration list */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold tracking-wider">Active Administrative Task List</p>
          <div className="grid gap-3">
            {tasks.map(item => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.isAutoEnabled 
                    ? "bg-green-500/5 border-green-500/20" 
                    : "bg-black/25 border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <p className="text-xs font-bold text-white leading-tight">{item.taskName}</p>
                    
                    {/* Time & Stress controls (Only show sliders if not automated) */}
                    {item.isAutoEnabled ? (
                      <div className="p-2 rounded bg-green-950/20 border border-green-500/15 text-[10px] text-green-300 font-mono">
                        Active Automation: {item.autoSolutionText}
                      </div>
                    ) : (
                      <div className="space-y-3.5 pt-2">
                        {/* Weekly Hours Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span>Weekly Hours spent:</span>
                            <span className="font-mono font-bold text-white">{item.hoursSpentWeekly} Hours</span>
                          </div>
                          <Slider
                            min={0.5}
                            max={15}
                            step={0.5}
                            value={[item.hoursSpentWeekly]}
                            onValueChange={val => updateHours(item.id, val[0])}
                            className="[&>.bg-primary]:bg-amber-500"
                          />
                        </div>

                        {/* Stress level Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span>Stress / Friction level (1-10):</span>
                            <span className={`font-mono font-bold ${item.stressLevel >= 8 ? "text-red-400" : item.stressLevel >= 5 ? "text-yellow-400" : "text-green-400"}`}>
                              {item.stressLevel} / 10
                            </span>
                          </div>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            value={[item.stressLevel]}
                            onValueChange={val => updateStress(item.id, val[0])}
                            className="[&>.bg-primary]:bg-amber-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Toggle Automation solution */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[9px] uppercase font-mono text-muted-foreground">Auto-Solution</span>
                    <UiSwitch
                      checked={item.isAutoEnabled}
                      onCheckedChange={() => toggleTaskAutomation(item.id)}
                      className="data-[state=checked]:bg-green-500"
                    />
                    <div className="text-right font-mono mt-1">
                      <p className="text-xs font-bold text-white">
                        ₹{((item.isAutoEnabled ? item.reclaimedHoursSimulated : item.hoursSpentWeekly) * hourlyOppCost).toLocaleString()}/wk
                      </p>
                      <span className="text-[8px] text-muted-foreground uppercase font-mono">Opportunity Cost</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 27. GENERATIONAL TRANSITION READINESS DASHBOARD
// ────────────────────────────────────────────────────────────────────────
interface GenerationalReadinessDashboardProps {
  data: GenerationalReadinessData;
  toast: any;
}

function GenerationalReadinessDashboard({ data, toast }: GenerationalReadinessDashboardProps) {
  const [trainingHours, setTrainingHours] = useState<number>(0);
  const [mentors, setMentors] = useState<MentorProfile[]>(data.mentors);

  const requestMentor = (id: string) => {
    setMentors(prev => prev.map(m => m.id === id ? { ...m, status: "Requested" } : m));
    const mentor = mentors.find(m => m.id === id);
    toast({
      title: "Connection Requested",
      description: `Request sent to connect with ${mentor?.name} (${mentor?.businessType}).`,
    });
  };

  // Simulating gaps closing
  // 0 hours -> base gap percentages
  // 30 hours -> maximum progress
  const simulatedGaps = data.gaps.map(gap => {
    let boost = trainingHours * 1.5; // boost factor
    if (gap.skill.includes("Vendor")) boost = trainingHours * 2.0; // vendor relations grow faster
    if (gap.skill.includes("Trust")) boost = trainingHours * 1.8;
    
    const simulatedPercentage = Math.min(100, Math.round(gap.percentage + boost));
    return {
      ...gap,
      percentage: simulatedPercentage
    };
  });

  // Risk Reduction Calculations
  const simulatedRiskChance = Math.max(10, Math.round(data.initialRiskChance - (trainingHours * 2.0)));
  const simulatedShrinkPercentage = Math.max(5, Math.round(data.initialShrinkPercentage - (trainingHours * 1.2)));

  return (
    <OwnerAdvisorCard
      title="Succession Planning & Transition Monitor"
      executiveSummary="Next generation family business successor ko prepare karein. Real-time gaps check aur structural mentoring simulation board."
      keyInsight={
        simulatedRiskChance > 45 
          ? `WARNING: High Transition Risk! Agar aaj transition kiya jaye toh business shrink opportunity index ${simulatedShrinkPercentage}% hai.`
          : `Transition Risk Controlled: Risk factor down to ${simulatedRiskChance}%. Successor is qualifying for active strategic ownership.`
      }
      revenueImpact={`Transition Risk Index: ${simulatedRiskChance}%`}
      aiReasoning={
        `Founder Age: ${data.founderAge}. Successor: ${data.successorName} (${data.successorAge}, ${data.successorEducation}). ` +
        `Mentoring hours index is at ${trainingHours} hours/week. Skill targets are moving toward target benchmarks.`
      }
      recommendedAction={
        trainingHours < 15
          ? "💡 Tip: Successor shadow hours badhayein (target >15 hours/week) vendor relations aur trust building speed up karne ke liye."
          : "✅ Succession training schedule positive progress show kar raha hai. Professional mentorship align karein."
      }
      confidenceScore={92}
      actionLabel="Finalize Curriculum Path"
      onAction={() => {
        toast({
          title: "Curriculum Locked",
          description: `Locked 12-month transition curriculum for ${data.successorName} with active weekly mentoring.`,
        });
      }}
    >
      <div className="space-y-6">
        {/* Profile Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-black/40 border border-border">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-mono text-muted-foreground block">Founder Profile</span>
            <p className="text-xs font-bold text-white">Active Owner & Founder</p>
            <p className="text-[10px] text-muted-foreground">Age: {data.founderAge} &middot; Planning retirement in next 24 months</p>
          </div>
          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-border/60 pt-2 sm:pt-0 sm:pl-3">
            <span className="text-[9px] uppercase font-mono text-muted-foreground block">Successor Profile</span>
            <p className="text-xs font-bold text-white">{data.successorName} ({data.successorAge})</p>
            <p className="text-[10px] text-muted-foreground">{data.successorEducation} &middot; Years away: {data.successorYearsAway} yrs</p>
          </div>
        </div>

        {/* Transition Risk Projection Panel */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          simulatedRiskChance > 45 ? "bg-red-500/5 border-red-500/30 text-red-300" : "bg-green-500/5 border-green-500/20 text-green-300"
        }`}>
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-white uppercase tracking-wide">Transition Risk Evaluation</p>
            <p className="text-xs mt-1 text-muted-foreground leading-relaxed">
              Founder ke immediate retirement par business ke <strong className="text-white">{simulatedShrinkPercentage}% shrink</strong> hone ka chance abhi <strong className="text-white">{simulatedRiskChance}%</strong> calculated hai. 
              Guided training and shadowing badha kar is risk percentage indicators ko reduce karein.
            </p>
          </div>
        </div>

        {/* Simulator Slider */}
        <div className="p-4 rounded-xl border border-border/80 bg-black/20 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-semibold">Simulate Weekly Guided Mentoring Hours:</span>
            <span className="font-mono font-bold text-amber-400">+{trainingHours} Hours / Week</span>
          </div>
          <Slider
            min={0}
            max={30}
            step={2}
            value={[trainingHours]}
            onValueChange={val => setTrainingHours(val[0])}
            className="[&>.bg-primary]:bg-amber-500"
          />
          <span className="text-[9px] text-muted-foreground block">Guided shadow hours direct mentor relationship, operational processes, aur client meetings cover karte hain.</span>
        </div>

        {/* Skill Gaps Meter */}
        <div className="space-y-3.5 p-4 rounded-xl border border-border bg-black/30">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold tracking-wider">Successor Readiness Gap Analysis</p>
          <div className="space-y-3">
            {simulatedGaps.map((gap, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white font-medium">{gap.skill}</span>
                  <span className={`font-mono font-bold ${gap.percentage >= 75 ? "text-green-400" : gap.percentage >= 45 ? "text-yellow-400" : "text-red-400"}`}>
                    {gap.percentage}% Ready
                  </span>
                </div>
                <Progress value={gap.percentage} className={`h-1.5 bg-muted ${
                  gap.percentage >= 75 ? "[&>div]:bg-green-500" :
                  gap.percentage >= 45 ? "[&>div]:bg-amber-500" :
                  "[&>div]:bg-red-500"
                }`} />
              </div>
            ))}
          </div>
        </div>

        {/* Auto-Curriculum roadmap */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-mono text-muted-foreground font-bold tracking-wider">AI succession Auto-Curriculum Roadmap</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.curriculum.map((c, idx) => (
              <div key={idx} className="p-3.5 rounded-lg border border-border/80 bg-black/25 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-amber-400 font-bold uppercase">{c.period}</span>
                  <Badge variant="outline" className="text-[8px] px-1 bg-amber-500/10 text-amber-400 border-amber-500/20">{c.focus}</Badge>
                </div>
                <p className="text-white font-bold text-xs mt-1.5">{c.focus} Phase</p>
                <p className="text-muted-foreground leading-normal mt-1 text-[11px] font-sans">{c.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mentor Matching Panel */}
        <div className="space-y-3 p-4 rounded-xl border border-border bg-black/20">
          <p className="text-[10px] uppercase font-mono text-amber-400 font-bold tracking-wider">🤝 Succession Mentors Match</p>
          <div className="grid gap-3">
            {mentors.map(m => (
              <div key={m.id} className="p-3 bg-black/40 border border-border/80 rounded-lg flex items-start justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-white leading-tight">{m.name}</p>
                  <p className="text-[9px] text-muted-foreground font-mono">{m.businessType} &middot; {m.experience}</p>
                  <p className="text-[11px] text-muted-foreground leading-normal mt-1.5 font-sans">{m.bio}</p>
                </div>
                <Button
                  size="sm"
                  variant={m.status === "Requested" ? "outline" : "default"}
                  className={`h-7 px-3 text-[10px] font-bold shrink-0 ${
                    m.status === "Requested" ? "border-green-500/30 text-green-400 bg-green-500/5" : "bg-amber-500 hover:bg-amber-600 text-black border-0"
                  }`}
                  onClick={() => requestMentor(m.id)}
                  disabled={m.status === "Requested"}
                >
                  {m.status === "Requested" ? "Requested ✓" : "Request Intro"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OwnerAdvisorCard>
  );
}



