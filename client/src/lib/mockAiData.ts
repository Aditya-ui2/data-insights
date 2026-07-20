export interface NextBestActionItem {
  id: string;
  actionName: string;
  target: string;
  revenueImpact: string; // e.g. "₹1.8L"
  confidence: number;
  priority: "High" | "Medium" | "Low";
  category: "Sales" | "Retention" | "Operations" | "Marketing";
  reasoning: string;
  status: "Pending" | "Approved" | "Dismissed";
}

export interface CLVCustomer {
  id: string;
  name: string;
  currentCLV: string;
  predictedCLV: string; // e.g. "₹4.2L"
  churnRisk: "High" | "Medium" | "Low";
  contribution: number;
  tenureMonths: number;
  segment: "Enterprise" | "Mid-Market" | "SMB";
}

export interface UpsellLead {
  id: string;
  customerName: string;
  currentProduct: string;
  suggestedProduct: string;
  probability: number; // percentage
  expectedRevenue: string; // e.g. "₹2.5L"
  emailPitch: string;
}

export interface HiddenOpportunity {
  id: string;
  name: string;
  impactScore: number;
  difficulty: "Easy" | "Medium" | "Hard";
  revenueOpportunity: string; // e.g. "₹3.5L"
  description: string;
}

export interface PricingProduct {
  id: string;
  productName: string;
  currentPrice: number; // e.g. 10000
  recommendedPrice: number; // e.g. 11500
  profitImpact: string; // e.g. "+14%"
  description: string;
}

export interface ActiveDeal {
  id: string;
  dealName: string;
  client: string;
  probability: number;
  expectedRevenue: string; // e.g. "₹2.4L"
  stage: string;
  health: "Healthy" | "At Risk" | "Critical";
}

export interface EmployeeSkill {
  id: string;
  name: string;
  role: string;
  productivity: string;
  whatTheyDoDifferently: string; // e.g. "Top sales employees follow up within 30 minutes."
  coachingRecommendation: string;
}

export interface EmotionDriftCustomer {
  id: string;
  name: string;
  sentimentTrend: string; // e.g. "dropped 22% in last 30 days"
  driftDirection: "Positive" | "Neutral" | "Negative";
  churnWarning: boolean;
  explanation: string;
}

export interface HiddenRevenueNetworkItem {
  id: string;
  productA: string;
  productC: string;
  timeframeDays: number;
  crossSellPotential: string;
  explanation: string; // "Customers buying Product A often buy Product C after 45 days."
}

export interface DecisionScenario {
  id: string;
  title: string;
  revenueImpact: string; // "+18%"
  profitImpact: string; // "+11%"
  riskLevel: "Low" | "Medium" | "High";
  aiReasoning: string;
}

export interface WeakSignalAlert {
  id: string;
  warningText: string; // "Lead quality declining."
  futureImpact: string; // "Possible revenue impact in next 60 days: ₹1.2L"
  leadTimeDays: number;
  actionRequired: string;
}

export interface OpportunityTimingItem {
  id: string;
  name: string; // "Referral Program"
  category: "Do Now" | "Do Later" | "Monitor" | "Ignore";
  revenueImpact: string;
}

export interface CompetitorMove {
  id: string;
  competitor: string;
  predictedAction: string; // "Competitor likely to increase pricing next quarter."
  suggestedMove: string;
}

export interface BusinessMomentum {
  momentumScore: number; // 82/100
  acceleration: string; // "Business growth accelerating."
  velocityTrend: string;
}

export interface RevenueMultiplierLever {
  id: string;
  actionText: string; // "Increase repeat customers by 10%"
  revenueImpact: string; // "+₹4.1L"
  efficiencyRatio: string;
}

export interface WeakSignalIntelOverview {
  futureOpportunities: string; // "Growing demand trend detected before competitors."
  futureRisks: string;
  readinessRate: number;
}

export interface DecisionMemo {
  id: string;
  proposal: string; // "Open Jaipur branch"
  expectedROI: string; // "4.2x"
  expectedRisk: "Low" | "Medium" | "High";
  memoText: string;
}

export interface CausalDiscoveryData {
  steps: { label: string; trend: "up" | "down" | "stable" }[];
  explanation: string; // "Lead Quality ↓ leads to Conversion ↓ which directly causes Revenue ↓."
}

export interface TimeMachineVars {
  marketingSpendIncrease: number; // e.g. 20
  futureRevenueDelta: string; // e.g. "+14%"
}

export interface OpportunityNetworkItem {
  id: string;
  benchmarkText: string; // "Businesses similar to yours"
  caseStudy: string; // "grew 31% faster after implementing WhatsApp automation."
  actionText: string;
}

export interface DependencyRiskClient {
  id: string;
  name: string;
  revenueShare: number;
  revenueAmount: string;
  churnRisk: "High" | "Medium" | "Low";
  industry: string;
  engagementScore: number;
}

export interface DependencyRiskSummary {
  concentrationPercentage: number;
  topCount: number;
  clients: DependencyRiskClient[];
}

// ────────────────────────────────────────────────────────────────────────
// MOCK DATA VECTORS
// ────────────────────────────────────────────────────────────────────────

export const mockNextBestActions: NextBestActionItem[] = [
  {
    id: "nba-1",
    actionName: "Follow up 23 pending quotations",
    target: "Warm Pipeline Leads",
    revenueImpact: "₹1.8L",
    confidence: 89,
    priority: "High",
    category: "Sales",
    reasoning: "AI analysis shows these 23 quotations are in the sweet-spot threshold of 48 hours. Quick calls right now will lock in ₹1.8L immediately before competitor pitches land.",
    status: "Pending"
  },
  {
    id: "nba-2",
    actionName: "Send contract renewal trigger to Initech",
    target: "Initech Corp",
    revenueImpact: "₹2.5L",
    confidence: 94,
    priority: "High",
    category: "Retention",
    reasoning: "Initech ka sandbox activity pattern drop ho raha hai. Ek discount callback renew and lock-in karega ₹2.5L core retention value.",
    status: "Pending"
  },
  {
    id: "nba-3",
    actionName: "Activate automated invoice email templates",
    target: "Accounts Department",
    revenueImpact: "₹90K",
    confidence: 76,
    priority: "Medium",
    category: "Operations",
    reasoning: "Pending cash collections average cycle drifted up to 18 days. Automatic triggers will clear ₹90K cash flow constraint.",
    status: "Pending"
  }
];

export const mockCLVCustomers: CLVCustomer[] = [
  { id: "clv-1", name: "Customer A", currentCLV: "₹2.8L", predictedCLV: "₹4.2L", churnRisk: "Low", contribution: 15.2, tenureMonths: 24, segment: "Enterprise" },
  { id: "clv-2", name: "Customer B", currentCLV: "₹1.5L", predictedCLV: "₹3.1L", churnRisk: "Medium", contribution: 10.5, tenureMonths: 12, segment: "Mid-Market" },
  { id: "clv-3", name: "Customer C", currentCLV: "₹90K", predictedCLV: "₹1.8L", churnRisk: "High", contribution: 6.2, tenureMonths: 6, segment: "SMB" },
];

export const mockUpsellLeads: UpsellLead[] = [
  {
    id: "up-1",
    customerName: "Customer A",
    currentProduct: "Basic Plan",
    suggestedProduct: "Premium Plan Upgrade",
    probability: 87,
    expectedRevenue: "₹1.2L",
    emailPitch: "Subject: Strategic scaling of your infrastructure with Premium Plan\n\nDear Customer A team,\n\nWe see your database transactions exceeded the basic caps by 28% with excellent latency response. Upgrading to the Premium Plan locks in lower query cost and gives you 4.2x capacity multiplier.\n\nBest,\nAccount Optimization Team"
  },
  {
    id: "up-2",
    customerName: "Customer B",
    currentProduct: "Core CRM API",
    suggestedProduct: "WhatsApp Automation Integration",
    probability: 72,
    expectedRevenue: "₹85K",
    emailPitch: "Subject: Accelerating customer updates with WhatsApp automation\n\nDear Customer B,\n\nYour outbound notifications limit has been reached. Activating direct WhatsApp automation will speed up dispatch updates by 45%.\n\nWarmly,\nAI Strategy Team"
  }
];

export const mockHiddenOpportunities: HiddenOpportunity[] = [
  {
    id: "opp-1",
    name: "Dormant upsell campaign for existing customers",
    impactScore: 94,
    difficulty: "Easy",
    revenueOpportunity: "₹3.5L",
    description: "Existing customers are not being upsold. Out of 120 basic plans, 45 accounts have qualified usage growth triggers but haven't received upgrade recommendations."
  },
  {
    id: "opp-2",
    name: "Recover lost pipeline checkout drop-offs",
    impactScore: 81,
    difficulty: "Medium",
    revenueOpportunity: "₹2.2L",
    description: "Cart checkout leads drop off on payment verification steps. Setting up instant WhatsApp prompts recovers estimated 18% sales."
  }
];

export const mockPricingProducts: PricingProduct[] = [
  {
    id: "pr-1",
    productName: "Premium Service Licensing",
    currentPrice: 10000,
    recommendedPrice: 11500,
    profitImpact: "+14%",
    description: "AI pricing index shows customers are highly insensitive (inelastic) up to ₹12,000 due to lack of local alternatives."
  },
  {
    id: "pr-2",
    productName: "Basic Server Slot Add-on",
    currentPrice: 2500,
    recommendedPrice: 2900,
    profitImpact: "+16%",
    description: "Recommended marginal increase based on high demand trends."
  }
];

export const mockActiveDeals: ActiveDeal[] = [
  { id: "deal-1", dealName: "Deal ABC", client: "Globex Corp", probability: 82, expectedRevenue: "₹2.4L", stage: "Proposal Negotiation", health: "Healthy" },
  { id: "deal-2", dealName: "Deal XYZ", client: "Wayne Enterprises", probability: 45, expectedRevenue: "₹1.8L", stage: "Discovery Call", health: "At Risk" },
];

export const mockEmployeeSkills: EmployeeSkill[] = [
  {
    id: "emp-1",
    name: "Sarah Jenkins",
    role: "Sales Representative",
    productivity: "96%",
    whatTheyDoDifferently: "Top sales employees follow up within 30 minutes of lead arrival.",
    coachingRecommendation: "Sarah's closing rate is 96% due to rapid first-touch timing. Replicate Sarah's templates across Mid-Market teams."
  },
  {
    id: "emp-2",
    name: "Alex Rivera",
    role: "Support Associate",
    productivity: "78%",
    whatTheyDoDifferently: "High ticket solvers resolve account disputes with direct links.",
    coachingRecommendation: "Improve Alex's initial call delay template to align response speed with Sarah's lead conversion metrics."
  }
];

export const mockEmotionDriftCustomers: EmotionDriftCustomer[] = [
  {
    id: "emo-1",
    name: "Hooli Corp",
    sentimentTrend: "dropped 22% in last 30 days",
    driftDirection: "Negative",
    churnWarning: true,
    explanation: "Downtime flags have created service ticket backlogs, drifting client satisfaction indicators down."
  },
  {
    id: "emo-2",
    name: "Globex Corp",
    sentimentTrend: "grew 12% in last 30 days",
    driftDirection: "Positive",
    churnWarning: false,
    explanation: "Positive onboarding experience and zero query fails keep sentiment index stable."
  }
];

export const mockHiddenRevenueNetwork: HiddenRevenueNetworkItem[] = [
  {
    id: "net-1",
    productA: "Starter Cloud Suite",
    productC: "Automated API Gateway",
    timeframeDays: 45,
    crossSellPotential: "₹1.5L",
    explanation: "Customers buying Product A (Starter Cloud Suite) often buy Product C (Automated API Gateway) after 45 days."
  },
  {
    id: "net-2",
    productA: "Database Storage Core",
    productC: "AI Strategy Suite",
    timeframeDays: 60,
    crossSellPotential: "₹2.8L",
    explanation: "Core database buyers scale storage caps and upgrade to AI Strategy Suite within 60 days."
  }
];

export const mockDecisionScenarios: DecisionScenario[] = [
  {
    id: "ds-1",
    title: "Hire 2 salespeople",
    revenueImpact: "+18%",
    profitImpact: "+11%",
    riskLevel: "Medium",
    aiReasoning: "Hiring 2 salespeople speeds up quotation follow-ups within 30 minutes, capturing ₹3.5L hidden pipeline. Operational costs offset margins initially."
  },
  {
    id: "ds-2",
    title: "Launch referral marketing system",
    revenueImpact: "+12%",
    profitImpact: "+9%",
    riskLevel: "Low",
    aiReasoning: "Low spend marketing yields reliable customer acquisitions through active advocates clusters."
  }
];

export const mockWeakSignalAlerts: WeakSignalAlert[] = [
  {
    id: "ws-1",
    warningText: "Lead quality declining.",
    futureImpact: "Possible revenue impact in next 60 days: ₹1.2L",
    leadTimeDays: 60,
    actionRequired: "Audit third-party Google Search keyword ads and shift focus to organic email outreach."
  },
  {
    id: "ws-2",
    warningText: "Support callback delay scaling.",
    futureImpact: "Possible renewal churn impact: ₹1.8L",
    leadTimeDays: 45,
    actionRequired: "Deploy automated triage dispatch templates to CS team."
  }
];

export const mockOpportunityTimingItems: OpportunityTimingItem[] = [
  { id: "ot-1", name: "Referral Program launch", category: "Do Now", revenueImpact: "₹1.8L" },
  { id: "ot-2", name: "Pricing seat license raise", category: "Do Later", revenueImpact: "₹2.2L" },
  { id: "ot-3", name: "WhatsApp shipping notices", category: "Monitor", revenueImpact: "₹80K" },
  { id: "ot-4", name: "Server slot reallocation", category: "Ignore", revenueImpact: "₹15K" }
];

export const mockCompetitorMoves: CompetitorMove[] = [
  {
    id: "comp-1",
    competitor: "Acuity Systems",
    predictedAction: "Competitor likely to increase pricing next quarter.",
    suggestedMove: "Lock-in active basic tier clients on 1-year agreements right now at current prices."
  },
  {
    id: "comp-2",
    competitor: "LogiScale Inc",
    predictedAction: "Competitor launching a low-cost WhatsApp support bot.",
    suggestedMove: "Optimize our database check-in widgets to maintain superior user onboarding."
  }
];

export const mockMomentum: BusinessMomentum = {
  momentumScore: 82,
  acceleration: "Business growth accelerating.",
  velocityTrend: "Outbound sales deals won rose 18% WoW."
};

export const mockRevenueMultiplierLevers: RevenueMultiplierLever[] = [
  { id: "mult-1", actionText: "Increase repeat customers by 10%", revenueImpact: "+₹4.1L", efficiencyRatio: "4.8x ROI" },
  { id: "mult-2", actionText: "Speed up quotation response to 30 mins", revenueImpact: "+₹2.8L", efficiencyRatio: "6.2x ROI" },
  { id: "mult-3", actionText: "Run referral marketing campaign", revenueImpact: "+₹1.5L", efficiencyRatio: "2.4x ROI" }
];

export const mockWeakSignalIntel: WeakSignalIntelOverview = {
  futureOpportunities: "Growing demand trend detected in regional services before competitor launch.",
  futureRisks: "Inbound channel conversion rates dipping due to server check-in delay spikes.",
  readinessRate: 78
};

export const mockDecisionMemos: DecisionMemo[] = [
  {
    id: "dm-1",
    proposal: "Open Jaipur branch",
    expectedROI: "4.2x",
    expectedRisk: "Medium",
    memoText: "Jaipur represents an untapped regional market with 48% growth index in retail accounts. Setting up a local sales depot captures client onboarding margins."
  },
  {
    id: "dm-2",
    proposal: "Transition to usage-based pricing core",
    expectedROI: "2.8x",
    expectedRisk: "High",
    memoText: "Usage-based APIs boost expansion revenue for high-capacity enterprise customers but could create billing frictions in low-growth SMB sectors."
  }
];

export const mockCausalDiscovery: CausalDiscoveryData = {
  steps: [
    { label: "Lead Quality", trend: "down" },
    { label: "Conversion Rate", trend: "down" },
    { label: "Expected Revenue", trend: "down" }
  ],
  explanation: "Lead Quality ↓ causes Conversion ↓ which directly triggers Revenue ↓. Marketing data shows budget spent shifted to broad keywords, which lowered lead quality indicators."
};

export const mockOpportunityNetworkItems: OpportunityNetworkItem[] = [
  {
    id: "net-1",
    benchmarkText: "Businesses similar to yours",
    caseStudy: "grew 31% faster after implementing WhatsApp automation.",
    actionText: "Integrate WhatsApp notification triggers."
  },
  {
    id: "net-2",
    benchmarkText: "Enterprise peers in software",
    caseStudy: "saved ₹2.4L annually by automating quotation dispatch timers.",
    actionText: "Deploy auto-drafting email pitch templates."
  }
];

export const mockDependencyRisk: DependencyRiskSummary = {
  concentrationPercentage: 62,
  topCount: 3,
  clients: [
    { id: "dep-1", name: "Initech Corp", revenueShare: 28, revenueAmount: "₹5.2L", churnRisk: "Low", industry: "SaaS Enterprise", engagementScore: 94 },
    { id: "dep-2", name: "Wayne Enterprises", revenueShare: 20, revenueAmount: "₹3.7L", churnRisk: "Medium", industry: "Defense & Tech", engagementScore: 78 },
    { id: "dep-3", name: "Globex Corp", revenueShare: 14, revenueAmount: "₹2.6L", churnRisk: "High", industry: "Global Logistics", engagementScore: 61 }
  ]
};

export interface ReplacementCostItem {
  id: string;
  customerName: string;
  industry: string;
  monthsActive: number;
  ltvAtChurn: string;          // e.g. "₹3.6L"
  churnReason: string;
  acquisitionCost: number;     // original CAC in ₹
  onboardingCost: number;      // ₹
  lostRevenueMo: number;       // ₹/month lost
  salesCycleMonths: number;    // months to replace
  totalReplacementCost: number;// ₹ — headline number
  riskLevel: "Critical" | "High" | "Medium";
  recoveryAction: string;
}

export interface ResilienceScoreItem {
  id: string;
  employeeName: string;
  role: string;
  tenureMonths: number;
  impactScore: number;            // 0‑100, higher = higher risk
  projectedGrowthLoss: string;    // e.g. "₹3.4L"
  riskLevel: "Critical" | "High" | "Medium";
  suggestedAction: string;
  // optional recent monthly scores for chart
  recentMetrics?: { month: string; score: number }[];
}

export const mockReplacementCostData: ReplacementCostItem[] = [
  {
    id: "rc-1",
    customerName: "Nexora Retail Pvt Ltd",
    industry: "Retail & E-Commerce",
    monthsActive: 14,
    ltvAtChurn: "₹2.8L",
    churnReason: "Competitor offered 20% lower pricing",
    acquisitionCost: 8500,
    onboardingCost: 4200,
    lostRevenueMo: 21000,
    salesCycleMonths: 2.5,
    totalReplacementCost: 18000,
    riskLevel: "Critical",
    recoveryAction: "Dispatch win-back offer with 3-month locked pricing at ₹9,800/mo"
  },
  {
    id: "rc-2",
    customerName: "BlueSky Logistics",
    industry: "Logistics & Supply Chain",
    monthsActive: 8,
    ltvAtChurn: "₹1.4L",
    churnReason: "Poor API integration support",
    acquisitionCost: 6200,
    onboardingCost: 3100,
    lostRevenueMo: 14500,
    salesCycleMonths: 3,
    totalReplacementCost: 24500,
    riskLevel: "High",
    recoveryAction: "Assign dedicated integration support engineer for 30 days"
  },
  {
    id: "rc-3",
    customerName: "Medanta Wellness",
    industry: "Healthcare & Wellness",
    monthsActive: 22,
    ltvAtChurn: "₹4.1L",
    churnReason: "Internal budget freeze",
    acquisitionCost: 11000,
    onboardingCost: 5500,
    lostRevenueMo: 18500,
    salesCycleMonths: 1.5,
    totalReplacementCost: 12800,
    riskLevel: "Medium",
    recoveryAction: "Schedule quarterly check-in call; offer 60-day extended billing pause"
  }
];

export const mockResilienceScores: ResilienceScoreItem[] = [
  {
    id: "rs-1",
    employeeName: "Aditi Sharma",
    role: "Senior Sales Lead",
    tenureMonths: 18,
    impactScore: 92,
    projectedGrowthLoss: "₹5.6L",
    riskLevel: "Critical",
    suggestedAction: "Create succession plan and offer retention bonus",
    recentMetrics: [
      { month: "Jan", score: 85 },
      { month: "Feb", score: 88 },
      { month: "Mar", score: 90 },
      { month: "Apr", score: 92 },
      { month: "May", score: 94 },
      { month: "Jun", score: 93 }
    ]
  },
  {
    id: "rs-2",
    employeeName: "Rohit Verma",
    role: "Lead Engineer",
    tenureMonths: 12,
    impactScore: 78,
    projectedGrowthLoss: "₹3.2L",
    riskLevel: "High",
    suggestedAction: "Cross‑train team and set up knowledge base",
    recentMetrics: [
      { month: "Jan", score: 70 },
      { month: "Feb", score: 72 },
      { month: "Mar", score: 75 },
      { month: "Apr", score: 77 },
      { month: "May", score: 78 },
      { month: "Jun", score: 78 }
    ]
  },
  {
    id: "rs-3",
    employeeName: "Sneha Patel",
    role: "Product Manager",
    tenureMonths: 9,
    impactScore: 65,
    projectedGrowthLoss: "₹1.9L",
    riskLevel: "Medium",
    suggestedAction: "Mentor junior PMs and document roadmap",
    recentMetrics: [
      { month: "Jan", score: 60 },
      { month: "Feb", score: 62 },
      { month: "Mar", score: 64 },
      { month: "Apr", score: 65 },
      { month: "May", score: 65 },
      { month: "Jun", score: 65 }
    ]
  }
];

export interface CashFlowInflowItem {
  id: string;
  source: string;
  category: "Client Invoice" | "Recurring Subscription" | "Contract Milestone";
  amount: number;
  dueDays: number;
  isSeasonal: boolean;
}

export interface CashFlowOutflowItem {
  id: string;
  target: string;
  category: "Payroll" | "Software/Infrastructure" | "Office Expense" | "Tax & Compliance" | "Marketing/Ad Spend";
  amount: number;
  dueDays: number;
  isSeasonal: boolean;
}

export interface CashFlowData {
  startingBalance: number;
  inflows: CashFlowInflowItem[];
  outflows: CashFlowOutflowItem[];
  seasonalTrends: { month: string; inflowFactor: number; outflowFactor: number }[];
}

export const mockCashFlowData: CashFlowData = {
  startingBalance: 180000,
  inflows: [
    { id: "in-1", source: "Initech Corp - Q2 Milestone", category: "Contract Milestone", amount: 120000, dueDays: 12, isSeasonal: false },
    { id: "in-2", source: "Monthly Premium Plan Subscriptions", category: "Recurring Subscription", amount: 150000, dueDays: 25, isSeasonal: true },
    { id: "in-3", source: "Globex Corp - Retention Retainer", category: "Recurring Subscription", amount: 80000, dueDays: 5, isSeasonal: false },
    { id: "in-4", source: "Wayne Enterprises - Consultation Fee", category: "Client Invoice", amount: 95000, dueDays: 38, isSeasonal: false },
    { id: "in-5", source: "Hooli Corp - Integration Support", category: "Client Invoice", amount: 60000, dueDays: 52, isSeasonal: true },
    { id: "in-6", source: "Acme Corp - Service Delivery", category: "Client Invoice", amount: 110000, dueDays: 75, isSeasonal: false },
    { id: "in-7", source: "Vandelay Industries - Custom Implementation", category: "Contract Milestone", amount: 130000, dueDays: 88, isSeasonal: true }
  ],
  outflows: [
    { id: "out-1", target: "Core Team Payroll (June)", category: "Payroll", amount: 160000, dueDays: 10, isSeasonal: false },
    { id: "out-2", target: "Amazon Web Services (AWS) Hosting", category: "Software/Infrastructure", amount: 45000, dueDays: 15, isSeasonal: false },
    { id: "out-3", target: "Google Ads & Meta Campaigns", category: "Marketing/Ad Spend", amount: 75000, dueDays: 20, isSeasonal: true },
    { id: "out-4", target: "Main Office Lease Rent", category: "Office Expense", amount: 50000, dueDays: 1, isSeasonal: false },
    { id: "out-5", target: "Quarterly GST Filing Taxes", category: "Tax & Compliance", amount: 90000, dueDays: 45, isSeasonal: false },
    { id: "out-6", target: "Core Team Payroll (July)", category: "Payroll", amount: 160000, dueDays: 40, isSeasonal: false },
    { id: "out-7", target: "Marketing Agency Retainer", category: "Marketing/Ad Spend", amount: 35000, dueDays: 48, isSeasonal: true },
    { id: "out-8", target: "Core Team Payroll (August)", category: "Payroll", amount: 160000, dueDays: 70, isSeasonal: false },
    { id: "out-9", target: "Annual Security Audit License", category: "Tax & Compliance", amount: 55000, dueDays: 62, isSeasonal: true }
  ],
  seasonalTrends: [
    { month: "Jan", inflowFactor: 1.1, outflowFactor: 0.95 },
    { month: "Feb", inflowFactor: 1.05, outflowFactor: 0.95 },
    { month: "Mar", inflowFactor: 1.2, outflowFactor: 1.05 },
    { month: "Apr", inflowFactor: 0.95, outflowFactor: 1.0 },
    { month: "May", inflowFactor: 0.9, outflowFactor: 1.1 },
    { month: "Jun", inflowFactor: 0.85, outflowFactor: 1.15 },
    { month: "Jul", inflowFactor: 0.95, outflowFactor: 1.0 },
    { month: "Aug", inflowFactor: 1.05, outflowFactor: 0.95 },
    { month: "Sep", inflowFactor: 1.1, outflowFactor: 0.95 },
    { month: "Oct", inflowFactor: 1.15, outflowFactor: 1.05 },
    { month: "Nov", inflowFactor: 1.25, outflowFactor: 1.1 },
    { month: "Dec", inflowFactor: 1.3, outflowFactor: 1.2 }
  ]
};

export interface ExpenseAnomaly {
  id: string;
  merchant: string;
  category: "Software/SaaS" | "Travel & Transport" | "Office Equipment" | "Meals & Entertainment" | "Professional Services" | "Marketing/Ad Spend";
  amount: number;
  avgAmount: number;
  increasePercent: number;
  date: string;
  employeeName: string;
  severity: "Critical" | "High" | "Medium";
  reasoning: string;
  status: "Flagged" | "Reviewed" | "Approved";
}

export interface ExpenseCategorySpend {
  category: string;
  current: number;
  historical: number;
}

export interface ExpenseAnomalyData {
  anomalies: ExpenseAnomaly[];
  categories: ExpenseCategorySpend[];
}

export const mockExpenseAnomalyData: ExpenseAnomalyData = {
  anomalies: [
    {
      id: "anom-1",
      merchant: "Figma Inc - Team Licenses Upgrade",
      category: "Software/SaaS",
      amount: 45000,
      avgAmount: 11250,
      increasePercent: 300,
      date: "2026-06-12",
      employeeName: "Sneha Patel",
      severity: "Critical",
      reasoning: "Ye expense Figma active monthly license fee se 300% zyada hai. Audit logs check karein — lagta hai unauthorized users ko premium seats assign ki gayi hain.",
      status: "Flagged"
    },
    {
      id: "anom-2",
      merchant: "Uber India - Airport Premium Taxi Cab",
      category: "Travel & Transport",
      amount: 7200,
      avgAmount: 1800,
      increasePercent: 300,
      date: "2026-06-14",
      employeeName: "Alex Rivera",
      severity: "High",
      reasoning: "Unusual travel spend spike detected! Active business hours ke bahar weekend ride ticket submittals are 300% above threshold limit.",
      status: "Flagged"
    },
    {
      id: "anom-3",
      merchant: "Croma Store - Dual 4K Monitors Purchase",
      category: "Office Equipment",
      amount: 32000,
      avgAmount: 0,
      increasePercent: 0,
      date: "2026-06-10",
      employeeName: "Aditi Sharma",
      severity: "Medium",
      reasoning: "Achanak non-standard supplier category expense registered. Ye Croma transaction hardware onboarding process se trigger nahi kiya gaya tha.",
      status: "Reviewed"
    },
    {
      id: "anom-4",
      merchant: "Taj Hotels - Client Dinner Suite",
      category: "Meals & Entertainment",
      amount: 18500,
      avgAmount: 5500,
      increasePercent: 236,
      date: "2026-06-08",
      employeeName: "Sarah Jenkins",
      severity: "High",
      reasoning: "Meals policy audit warning: Out-of-hours billing trigger recorded. Regular client relationship limits range below ₹6,000.",
      status: "Flagged"
    }
  ],
  categories: [
    { category: "Software/SaaS", current: 85000, historical: 35000 },
    { category: "Travel & Transport", current: 24000, historical: 12000 },
    { category: "Office Equipment", current: 32000, historical: 8000 },
    { category: "Meals & Ent.", current: 28000, historical: 10000 },
    { category: "Marketing/Ads", current: 95000, historical: 88000 },
    { category: "Prof. Services", current: 15000, historical: 18000 }
  ]
};

export interface RegretItem {
  id: string;
  decisionName: string;
  category: "Talent" | "Product Strategy" | "Inventory Management" | "Marketing Channel";
  timestamp: string;
  description: string;
  emotionalTrigger: string;
  regretCost: number;
}

export interface UpcomingDecisionAlert {
  id: string;
  title: string;
  daysRemaining: number;
  potentialRegret: number;
  preventativeAction: string;
}

export interface RegretData {
  totalRegret: number;
  topMisses: string[];
  pastRegrets: RegretItem[];
  upcomingDecisions: UpcomingDecisionAlert[];
}

export const mockRegretData: RegretData = {
  totalRegret: 450000,
  topMisses: [
    "Product X Launch (Competitor captured ₹2L/month)",
    "Employee A Raise Denied (₹50K replacement cost + 3mo productivity loss)",
    "Festival Season Stock Delay (₹80K direct sales loss)"
  ],
  pastRegrets: [
    {
      id: "reg-1",
      decisionName: "Product X Launch Delay",
      category: "Product Strategy",
      timestamp: "6 months ago",
      description: "Naya Product X launch time par decide nahi kiya. Competitor ne launch kar diya aur ab unka steady customer base ₹2,00,000/month capture kar raha hai.",
      emotionalTrigger: "Market share captured. Competitor is running active ads directly targeting our dormant leads database.",
      regretCost: 320000
    },
    {
      id: "reg-2",
      decisionName: "Denied ₹5K Raise to Sr. Engineer A",
      category: "Talent",
      timestamp: "3 months ago",
      description: "Employee A ne ₹5,000 extra demand kiya tha. We declined. Wo chhod gaya aur replacement check karne me ₹50,000 cost + recruitment agency fee aur 3 months onboarding delay lag gaya.",
      emotionalTrigger: "Core system expertise lost. Project delivery deadlines extended by 45 days.",
      regretCost: 50000
    },
    {
      id: "reg-3",
      decisionName: "Delayed Festival Inventory Order",
      category: "Inventory Management",
      timestamp: "Oct 2025 (Diwali)",
      description: "Supplier payment clearing delay ke kaaran festive safety stock order late dispatch hua. Festive surge ke dauran we ran out of stock on day 2.",
      emotionalTrigger: "Direct customer dropouts to local shop vendors. High refund query rate in chat logs.",
      regretCost: 80000
    }
  ],
  upcomingDecisions: [
    {
      id: "updec-1",
      title: "Jaipur Regional Branch Setup Assessment",
      daysRemaining: 12,
      potentialRegret: 180000,
      preventativeAction: "Jaipur logistics report review karein and approve lease contract parameters before June 30."
    },
    {
      id: "updec-2",
      title: "Senior Product Manager Annual Review",
      daysRemaining: 18,
      potentialRegret: 220000,
      preventativeAction: "Schedule proactive check-in call directly; competitive poaching risk is currently flagged as high."
    }
  ]
};

export interface EnergyDrainTask {
  id: string;
  taskName: string;
  hoursSpentWeekly: number;
  stressLevel: number; // 1-10
  opportunityCostPerHr: number; // default ₹500
  isAutoEnabled: boolean;
  autoSolutionText: string;
  reclaimedHoursSimulated: number;
}

export interface EnergyDrainData {
  weeklyHoursWasted: number;
  hourlyOpportunityCost: number;
  tasks: EnergyDrainTask[];
}

export const mockEnergyDrainData: EnergyDrainData = {
  weeklyHoursWasted: 17.5,
  hourlyOpportunityCost: 500,
  tasks: [
    {
      id: "drain-1",
      taskName: "GST Portal Manual Reconciliation",
      hoursSpentWeekly: 2.5,
      stressLevel: 9,
      opportunityCostPerHr: 500,
      isAutoEnabled: false,
      autoSolutionText: "GST Automation Suite Integrate Karein (2.5 hours → 15 mins)",
      reclaimedHoursSimulated: 0.25
    },
    {
      id: "drain-2",
      taskName: "Client Follow-up Collection Calls",
      hoursSpentWeekly: 4.0,
      stressLevel: 8,
      opportunityCostPerHr: 500,
      isAutoEnabled: false,
      autoSolutionText: "Automated WhatsApp Reminders Turn On Karein (4.0 hours → 30 mins)",
      reclaimedHoursSimulated: 0.5
    },
    {
      id: "drain-3",
      taskName: "Physical Stock Inventory Counts",
      hoursSpentWeekly: 8.0,
      stressLevel: 6,
      opportunityCostPerHr: 500,
      isAutoEnabled: false,
      autoSolutionText: "Inventory Assistant Hire Karein ₹8K/month (8.0 hours → 1.0 hour)",
      reclaimedHoursSimulated: 1.0
    },
    {
      id: "drain-4",
      taskName: "Ad-hoc Customer Complaint Resolution",
      hoursSpentWeekly: 3.0,
      stressLevel: 7,
      opportunityCostPerHr: 500,
      isAutoEnabled: false,
      autoSolutionText: "Shared Support Portal + FAQ Docs (3.0 hours → 1.0 hour)",
      reclaimedHoursSimulated: 1.0
    }
  ]
};

export interface ReadinessGap {
  skill: string;
  percentage: number;
}

export interface MentorProfile {
  id: string;
  name: string;
  businessType: string;
  bio: string;
  experience: string;
  status: "Available" | "Requested" | "Connected";
}

export interface GenerationalReadinessData {
  founderAge: number;
  successorName: string;
  successorAge: number;
  successorEducation: string;
  successorYearsAway: number;
  initialRiskChance: number;
  initialShrinkPercentage: number;
  gaps: ReadinessGap[];
  curriculum: { period: string; focus: string; description: string }[];
  mentors: MentorProfile[];
}

export const mockGenerationalReadinessData: GenerationalReadinessData = {
  founderAge: 58,
  successorName: "Rohan Rathore",
  successorAge: 28,
  successorEducation: "MBA, London Business School",
  successorYearsAway: 2,
  initialRiskChance: 70,
  initialShrinkPercentage: 40,
  gaps: [
    { skill: "Financial Literacy & P&L", percentage: 45 },
    { skill: "Operational Knowledge", percentage: 30 },
    { skill: "Vendor & Supplier Relationships", percentage: 10 },
    { skill: "Customer & Client Trust", percentage: 5 }
  ],
  curriculum: [
    { period: "Month 1-3", focus: "Shadow Founder", description: "All vendor negotiations, procurement alignment, and raw material deals me shadow karein." },
    { period: "Month 4-6", focus: "Account Management", description: "Top 2 key customer accounts ko independently handle karein; client communications manage karein." },
    { period: "Month 7-9", focus: "P&L Ownership", description: "Daily operations expenditure, budgeting sheets, and profit margins reconciliation hold karein." },
    { period: "Month 10-12", focus: "Full Succession Transition", description: "Strategic decisions control and operations command complete transfer of authority phase." }
  ],
  mentors: [
    {
      id: "men-1",
      name: "Rajesh Singhania",
      businessType: "Industrial Manufacturing (2nd Gen)",
      bio: "Singhania Products me successfully generational transfer lead kiya, increasing company valuation by 2.4x in 5 years.",
      experience: "Completed Succession in 2021",
      status: "Available"
    },
    {
      id: "men-2",
      name: "Devendra Mehta",
      businessType: "Retail Supply Chain Logistics (1st Gen)",
      bio: "Advised 15+ family businesses on next-gen transitions and structured professional board management models.",
      experience: "15+ transitions mentored",
      status: "Available"
    }
  ]
};

export async function fetchAiSuiteData<T>(moduleName: string): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  const registry: Record<string, any> = {
    "next-best-action": mockNextBestActions,
    "customer-lifetime-value": mockCLVCustomers,
    "upsell": mockUpsellLeads,
    "opportunity-discovery": mockHiddenOpportunities,
    "pricing": mockPricingProducts,
    "deal-win": mockActiveDeals,
    "employee-amplifier": mockEmployeeSkills,
    "emotion-drift": mockEmotionDriftCustomers,
    "revenue-network": mockHiddenRevenueNetwork,
    "decision-predictor": mockDecisionScenarios,
    "weak-signal": mockWeakSignalAlerts,
    "timing-engine": mockOpportunityTimingItems,
    "competitor-predictor": mockCompetitorMoves,
    "momentum-engine": mockMomentum,
    "revenue-multiplier": mockRevenueMultiplierLevers,
    "weak-signal-intel": mockWeakSignalIntel,
    "decision-intelligence": mockDecisionMemos,
    "causal-discovery": mockCausalDiscovery,
    "time-machine": {},
    "opportunity-network": mockOpportunityNetworkItems,
    "dependency-risk": mockDependencyRisk,
    "replacement-cost": mockReplacementCostData,
    "business-resilience": mockResilienceScores,
    "cash-flow-predictor": mockCashFlowData,
    "expense-anomaly-detector": mockExpenseAnomalyData,
    "regret-minimizer": mockRegretData,
    "energy-drain-detector": mockEnergyDrainData,
    "generational-readiness": mockGenerationalReadinessData,
  };

  return registry[moduleName] as T;
}
