import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { signUpWithEmail, signInWithGoogle, getIdToken, logOut } from "@/lib/firebase";
import { SiGoogle } from "react-icons/si";
import {
  Sparkles, User, Mail, Lock, Building2, ChevronRight, 
  Brain, Target, Loader2, CheckCircle2, AlertTriangle,
  TrendingUp, RotateCcw, ArrowRight, ArrowLeft, Zap, BarChart3,
  Users, FileSpreadsheet, Activity, Briefcase
} from "lucide-react";

// Industry options for the magic dropdown
const INDUSTRIES = [
  { key: "real-estate", label: "Real Estate", icon: "🏠" },
  { key: "retail", label: "Retail & E-commerce", icon: "🛒" },
  { key: "manufacturing", label: "Manufacturing", icon: "🏭" },
  { key: "agency", label: "Agency / Consulting", icon: "💼" },
  { key: "hospitality", label: "Hospitality & F&B", icon: "🍽️" },
  { key: "healthcare", label: "Healthcare", icon: "🏥" },
  { key: "education", label: "Education", icon: "📚" },
  { key: "logistics", label: "Logistics & Transport", icon: "🚚" },
  { key: "services", label: "Professional Services", icon: "👔" },
  { key: "other", label: "Other", icon: "📊" },
];

// Likert scale options
const LIKERT_OPTIONS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Agree" },
  { value: 4, label: "Strongly Agree" },
];

// Emergency fallback questions (only used if AI fails completely)
const DEFAULT_QUESTIONS = [
  "Do you track daily revenue digitally?",
  "Is your expense tracking automated?",
  "Do employees submit daily reports?",
  "Is customer data stored systematically?",
  "Can you check stock/inventory instantly?",
  "Do you generate reports without Excel?",
  "Is all business data in one place?",
  "Do you make data-driven decisions?",
];

type OnboardingStep = "signup" | "industry-select" | "loading" | "audit" | "results" | "workspace";

type RecommendationType = "business" | "analytics" | "both";

// Inspirational Data Insights Quotes
const DATA_INSIGHTS_QUOTES = [
  { quote: "Turn your data into decisions", author: "Data Insights" },
  { quote: "See the patterns others miss", author: "Data Insights" },
  { quote: "From chaos to clarity in seconds", author: "Data Insights" },
  { quote: "Your data tells a story. Let us help you read it.", author: "Data Insights" },
  { quote: "Insights that drive growth", author: "Data Insights" },
  { quote: "Smart businesses run on smart data", author: "Data Insights" },
  { quote: "Unlock the power hidden in your numbers", author: "Data Insights" },
  { quote: "Data is the new gold. Mine it wisely.", author: "Data Insights" },
];

// Rotating Quotes Component
function RotatingQuotes() {
  const [currentQuote, setCurrentQuote] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % DATA_INSIGHTS_QUOTES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <motion.div
      className="text-center mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuote}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-2"
        >
          <motion.div
            className="flex items-center gap-2"
            animate={{ 
              textShadow: ["0 0 20px rgba(234,179,8,0)", "0 0 30px rgba(234,179,8,0.5)", "0 0 20px rgba(234,179,8,0)"]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-lg font-semibold bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
              "{DATA_INSIGHTS_QUOTES[currentQuote].quote}"
            </span>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

interface HealthStatus {
  level: "critical" | "stagnant" | "optimized";
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof AlertTriangle;
  lossPercent: number;
}

interface RecommendationContent {
  type: RecommendationType;
  headline: string;
  subtext: string;
  pitchTitle: string;
  pitchDescription: string;
  ctaText: string;
}

const getRecommendation = (score: number): RecommendationContent => {
  if (score <= 16) {
    return {
      type: "business",
      headline: "Your Business is Running on Guesswork. Let's Put It on Autopilot.",
      subtext: "The audit shows high manual effort and operational blind spots. Before analyzing data, we need to capture it accurately.",
      pitchTitle: "The Solution: Business Suite",
      pitchDescription: "Your business is losing 45% efficiency due to manual tracking. Data Insights is built to fix exactly this. Automate attendance, expenses, and daily reports in one place.",
      ctaText: "Unlock My Workspace",
    };
  } else if (score <= 25) {
    return {
      type: "analytics",
      headline: "You Have the Data. Now, Let's Find the Hidden Profits.",
      subtext: "Your operations are stable, but you're missing out on strategic growth. Your current bottleneck is analysis, not data entry.",
      pitchTitle: "The Solution: Analytics Suite",
      pitchDescription: "Your business is losing 30% potential revenue due to lack of insights. Upload your data and let AI find hidden profits, trends, and growth strategies.",
      ctaText: "Unlock My Workspace",
    };
  } else {
    return {
      type: "both",
      headline: "Your Operations are Optimized. Ready for the Next Level?",
      subtext: "You're ahead of 90% of businesses. Now choose your weapon to dominate the market.",
      pitchTitle: "Choose Your Path",
      pitchDescription: "Your business is already running efficiently. Pick the suite that aligns with your next strategic goal.",
      ctaText: "Unlock My Workspace",
    };
  }
};

const getHealthStatus = (score: number): HealthStatus => {
  if (score < 16) {
    return {
      level: "critical",
      label: "Critical Risk",
      description: "Manual Operations Dominating",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      icon: AlertTriangle,
      lossPercent: 45,
    };
  } else if (score <= 24) {
    return {
      level: "stagnant",
      label: "Stagnant",
      description: "Growth Bottlenecked",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
      icon: TrendingUp,
      lossPercent: 30,
    };
  } else {
    return {
      level: "optimized",
      label: "Optimized",
      description: "Ready for AI Enhancement",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      icon: Sparkles,
      lossPercent: 10,
    };
  }
};

// Animated Line Chart Component (Golden Theme)
function AnimatedLineChart() {
  const pathData = "M 0 80 Q 30 60, 60 70 T 120 50 T 180 65 T 240 35 T 300 45";
  
  return (
    <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
      {/* Grid lines */}
      {[20, 40, 60, 80].map((y) => (
        <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
      ))}
      {[60, 120, 180, 240].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
      ))}
      
      {/* Animated gradient area under chart */}
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#eab308" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      <motion.path
        d={`${pathData} L 300 100 L 0 100 Z`}
        fill="url(#chartGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      
      {/* Main line */}
      <motion.path
        d={pathData}
        fill="none"
        stroke="#eab308"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.8 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      
      {/* Data points */}
      {[
        { x: 0, y: 80 }, { x: 60, y: 70 }, { x: 120, y: 50 }, 
        { x: 180, y: 65 }, { x: 240, y: 35 }, { x: 300, y: 45 }
      ].map((point, i) => (
        <motion.circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="4"
          fill="#eab308"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 * i, duration: 0.3 }}
        />
      ))}
    </svg>
  );
}

// Animated Bar Chart Component  
function AnimatedBarChart() {
  const bars = [65, 45, 80, 55, 90, 40, 75, 60];
  
  return (
    <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
      {bars.map((height, i) => (
        <motion.rect
          key={i}
          x={i * 25 + 5}
          y={100 - height}
          width="15"
          height={height}
          rx="2"
          fill="#eab308"
          fillOpacity="0.4"
          initial={{ height: 0, y: 100 }}
          animate={{ height, y: 100 - height }}
          transition={{ 
            delay: i * 0.1, 
            duration: 0.8, 
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: 3,
            repeatType: "reverse"
          }}
        />
      ))}
    </svg>
  );
}

// Animated Pie/Donut Chart (Golden)
function AnimatedDonutChart() {
  const segments = [
    { percent: 35, delay: 0 },
    { percent: 25, delay: 0.2 },
    { percent: 25, delay: 0.4 },
    { percent: 15, delay: 0.6 },
  ];
  
  let cumulativePercent = 0;
  
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {segments.map((segment, i) => {
        const startAngle = cumulativePercent * 3.6;
        cumulativePercent += segment.percent;
        const endAngle = cumulativePercent * 3.6;
        
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;
        
        const x1 = 50 + 35 * Math.cos(startRad);
        const y1 = 50 + 35 * Math.sin(startRad);
        const x2 = 50 + 35 * Math.cos(endRad);
        const y2 = 50 + 35 * Math.sin(endRad);
        
        const largeArc = segment.percent > 50 ? 1 : 0;
        
        return (
          <motion.path
            key={i}
            d={`M 50 50 L ${x1} ${y1} A 35 35 0 ${largeArc} 1 ${x2} ${y2} Z`}
            fill="#eab308"
            fillOpacity={0.2 + i * 0.15}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: segment.delay, duration: 0.5 }}
          />
        );
      })}
      {/* Center circle for donut effect */}
      <circle cx="50" cy="50" r="20" fill="black" />
      <motion.text
        x="50"
        y="54"
        textAnchor="middle"
        fill="#eab308"
        fontSize="12"
        fontWeight="bold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        85%
      </motion.text>
    </svg>
  );
}

// Floating Stats Card (Golden)
function FloatingStatsCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      className="bg-yellow-500/10 backdrop-blur-md rounded-xl p-3 border border-yellow-500/30"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
    >
      <motion.div 
        className="text-yellow-400 text-xl font-bold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.3 }}
      >
        {value}
      </motion.div>
      <div className="text-yellow-400/60 text-xs">{label}</div>
    </motion.div>
  );
}

// Pulsing Data Node (Golden)
function DataNode({ x, y, size, delay }: { x: string; y: string; size: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-yellow-500/30"
      style={{ left: x, top: y, width: size, height: size }}
      initial={{ scale: 0 }}
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.6, 0.3]
      }}
      transition={{
        delay,
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-yellow-500/50"
        animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay }}
      />
    </motion.div>
  );
}

// Animated Background with charts and golden elements - MORE VISIBLE VERSION
function AnimatedChartBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5" />
      
      {/* Animated Line Chart - Top Right - LARGER & MORE VISIBLE */}
      <motion.div 
        className="absolute top-[8%] right-[3%] w-64 h-32 opacity-80"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 0.8, x: 0 }}
        transition={{ delay: 0.3, duration: 1 }}
      >
        <AnimatedLineChart />
      </motion.div>

      {/* Animated Line Chart - Bottom Right */}
      <motion.div 
        className="absolute bottom-[8%] right-[5%] w-56 h-28 opacity-70"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 0.7, x: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
      >
        <AnimatedLineChart />
      </motion.div>

      {/* Animated Bar Chart - Bottom Left - LARGER */}
      <motion.div 
        className="absolute bottom-[15%] left-[3%] w-52 h-28 opacity-75"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 0.75, y: 0 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <AnimatedBarChart />
      </motion.div>

      {/* Second Bar Chart - Top Left */}
      <motion.div 
        className="absolute top-[20%] left-[5%] w-44 h-24 opacity-60"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 0.6, y: 0 }}
        transition={{ delay: 0.7, duration: 1 }}
      >
        <AnimatedBarChart />
      </motion.div>

      {/* Donut Chart - Center Right - LARGER */}
      <motion.div 
        className="absolute top-[35%] right-[8%] w-32 h-32 opacity-80"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.8, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        <AnimatedDonutChart />
      </motion.div>

      {/* Second Donut Chart - Left Side */}
      <motion.div 
        className="absolute top-[50%] left-[8%] w-28 h-28 opacity-70"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.7, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <AnimatedDonutChart />
      </motion.div>

      {/* Floating Stats Cards - More of them and more visible */}
      <div className="absolute top-[10%] right-[15%]">
        <FloatingStatsCard value="+24%" label="Growth" delay={0.2} />
      </div>
      <div className="absolute top-[28%] right-[2%]">
        <FloatingStatsCard value="12.5K" label="Users" delay={0.4} />
      </div>
      <div className="absolute bottom-[20%] right-[12%]">
        <FloatingStatsCard value="98.5%" label="Accuracy" delay={0.6} />
      </div>
      <div className="absolute top-[15%] left-[12%]">
        <FloatingStatsCard value="₹2.5Cr" label="Revenue" delay={0.8} />
      </div>
      <div className="absolute bottom-[30%] left-[3%]">
        <FloatingStatsCard value="45%" label="Savings" delay={1.0} />
      </div>

      {/* Data Nodes / Connection Points */}
      <DataNode x="25%" y="15%" size={12} delay={0} />
      <DataNode x="55%" y="30%" size={8} delay={0.3} />
      <DataNode x="20%" y="60%" size={10} delay={0.6} />
      <DataNode x="65%" y="70%" size={14} delay={0.9} />
      <DataNode x="40%" y="80%" size={8} delay={1.2} />

      {/* Animated Connection Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
        <motion.line
          x1="25%" y1="15%" x2="55%" y2="30%"
          stroke="#eab308"
          strokeWidth="1"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.line
          x1="55%" y1="30%" x2="65%" y2="70%"
          stroke="#eab308"
          strokeWidth="1"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, delay: 0.5, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.line
          x1="20%" y1="60%" x2="40%" y2="80%"
          stroke="#eab308"
          strokeWidth="1"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 1, repeat: Infinity, repeatType: "reverse" }}
        />
      </svg>

      {/* Large floating orb 1 */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-yellow-400/20 to-amber-500/10 blur-3xl"
        animate={{
          x: [0, 80, 40, 0],
          y: [0, -40, 80, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ top: "-10%", right: "-10%" }}
      />

      {/* Large floating orb 2 */}
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-amber-600/30 to-yellow-500/10 blur-3xl"
        animate={{
          x: [0, -60, 30, 0],
          y: [0, 60, -30, 0],
          scale: [1, 0.85, 1.05, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ bottom: "-5%", left: "-5%" }}
      />

      {/* Rising Data Particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-yellow-400/60"
          animate={{
            y: [0, -200],
            opacity: [0, 1, 0],
            x: [0, (i % 2 === 0 ? 20 : -20)],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 0.6,
          }}
          style={{ 
            left: `${10 + i * 10}%`, 
            bottom: "5%" 
          }}
        />
      ))}
    </div>
  );
}

export default function BusinessOnboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Current step in the funnel
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("signup");

  // Step 1: Signup data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [industry, setIndustry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 2: Loading illusion
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);

  // Step 3: Audit questions & answers
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Step 4: Results
  const [totalScore, setTotalScore] = useState(0);

  // Confirmation modals
  const [showLoginConfirm, setShowLoginConfirm] = useState(false);
  const [showRetakeConfirm, setShowRetakeConfirm] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // If user is already authenticated, ask if they want to redo
  useEffect(() => {
    if (!authChecked && !authLoading) {
      setAuthChecked(true);
      if (isAuthenticated && currentStep === "signup") {
        setShowRetakeConfirm(true);
      } else if (!isAuthenticated && currentStep === "signup") {
        setShowLoginConfirm(true);
      }
    }
  }, [isAuthenticated, authLoading, authChecked]);

  // Loading illusion messages
  const runLoadingIllusion = async () => {
    // Reset loading messages
    setLoadingMessages([]);
    
    const industryLabel = INDUSTRIES.find(i => i.key === industry)?.label || customIndustry || "your industry";
    
    const messages = [
      "Connecting to AI engine...",
      `Analyzing ${industryLabel} benchmarks...`,
      "Generating industry-specific audit questions...",
      "Calibrating health metrics...",
      "Almost ready...",
    ];

    // Start loading messages
    for (let i = 0; i < 3; i++) {
      setLoadingMessages(prev => [...prev, messages[i]]);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Fetch AI-generated questions based on selected industry
    let aiQuestions: string[] = [];
    try {
      const token = await getIdToken();
      const industryToSend = industry === "other" ? customIndustry : industry;
      
      console.log("[Audit] Requesting AI questions for industry:", industryToSend);
      
      const res = await fetch("/api/ai/audit-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ industry: industryToSend }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("[Audit] AI response received:", data);
        
        if (data.questions && Array.isArray(data.questions) && data.questions.length === 8) {
          aiQuestions = data.questions;
          console.log("[Audit] ✅ AI-generated questions:", aiQuestions);
        } else {
          console.warn("[Audit] ⚠️ Invalid question format, using fallback");
        }
      } else {
        console.error("[Audit] ❌ API error:", res.status, res.statusText);
      }
    } catch (error) {
      console.error("[Audit] ❌ Failed to fetch AI questions:", error);
    }

    // Continue loading messages
    for (let i = 3; i < messages.length; i++) {
      setLoadingMessages(prev => [...prev, messages[i]]);
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    // Set questions - use AI questions if available, otherwise defaults
    if (aiQuestions.length === 8) {
      setQuestions(aiQuestions);
      console.log("[Audit] Using AI-generated questions");
    } else {
      setQuestions(DEFAULT_QUESTIONS);
      console.log("[Audit] Using fallback questions");
    }

    await new Promise(resolve => setTimeout(resolve, 300));
    setCurrentQuestionIndex(0);
    setCurrentStep("audit");
  };

  // Handle industry selection for authenticated users
  const handleIndustrySelect = async () => {
    if (!industry) {
      toast({ title: "Please select your business type", variant: "destructive" });
      return;
    }
    if (industry === "other" && !customIndustry.trim()) {
      toast({ title: "Please describe your business type", variant: "destructive" });
      return;
    }
    // Don't set questions here - let AI generate them in runLoadingIllusion
    setCurrentStep("loading");
    runLoadingIllusion();
  };

  // Handle signup submission
  const handleSignup = async () => {
    if (!name.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }
    if (!password || password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (!industry) {
      toast({ title: "Please select your business type", variant: "destructive" });
      return;
    }
    if (industry === "other" && !customIndustry.trim()) {
      toast({ title: "Please describe your business type", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await signUpWithEmail(email, password);
      // Don't set questions here - let AI generate them in runLoadingIllusion
      setCurrentStep("loading");
      runLoadingIllusion();
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google signup
  const handleGoogleSignup = async () => {
    if (!industry) {
      toast({ title: "Please select your industry first", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      // Don't set questions here - let AI generate them in runLoadingIllusion
      setCurrentStep("loading");
      runLoadingIllusion();
    } catch (error: any) {
      toast({
        title: "Google signup failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Likert answer selection - auto advance to next question
  const handleAnswerSelect = (questionIndex: number, value: number) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: value }));
    
    // Auto advance to next question after a short delay
    if (questionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(questionIndex + 1);
      }, 400);
    }
  };

  // Go to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Calculate and show results
  const handleSubmitAudit = () => {
    const score = Object.values(answers).reduce((sum, val) => sum + val, 0);
    setTotalScore(score);
    setCurrentStep("results");
  };

  // Navigate to workspace selection
  const handleUnlockWorkspace = () => {
    setCurrentStep("workspace");
  };

  // Final navigation to selected suite
  const handleSelectSuite = (suite: "business" | "analytics") => {
    if (suite === "business") {
      navigate("/business/setup");
    } else {
      navigate("/home");
    }
  };

  const answeredCount = Object.keys(answers).length;
  const isAuditComplete = answeredCount === questions.length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const healthStatus = getHealthStatus(totalScore);
  const StatusIcon = healthStatus.icon;
  const recommendation = getRecommendation(totalScore);

  // Smart routing based on recommendation
  const handleSmartLaunch = () => {
    // Always go to workspace selection for the "Aha!" moment
    setCurrentStep("workspace");
  };

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── LOGIN CONFIRMATION (not authenticated) ── */}
      <AnimatePresence>
        {showLoginConfirm && (
          <motion.div
            key="login-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <AnimatedChartBackground />
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="relative z-10 w-full max-w-sm bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl p-8 text-center"
            >
              <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-yellow-500/30 rounded-tl-3xl" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-yellow-500/30 rounded-br-3xl" />

              <motion.div
                className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto mb-5"
                animate={{ boxShadow: ["0 0 0 rgba(234,179,8,0)", "0 0 24px rgba(234,179,8,0.3)", "0 0 0 rgba(234,179,8,0)"] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Lock className="w-7 h-7 text-yellow-400" />
              </motion.div>

              <RotatingQuotes />

              <h2 className="text-xl font-bold text-white mb-2">Login Required</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                You need to be logged in to take the Business Health Audit.<br />
                Would you like to go to the login page?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { navigate("/login"); }}
                  className="flex-1 h-11 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-colors"
                >
                  Yes, Login
                </button>
                <button
                  onClick={() => { navigate("/"); }}
                  className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 font-medium text-sm border border-slate-700 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RETAKE CONFIRMATION (already authenticated) ── */}
      <AnimatePresence>
        {showRetakeConfirm && (
          <motion.div
            key="retake-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <AnimatedChartBackground />
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="relative z-10 w-full max-w-sm bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl p-8 text-center"
            >
              <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-yellow-500/30 rounded-tl-3xl" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-yellow-500/30 rounded-br-3xl" />

              {/* Mini animated bar chart */}
              <motion.div
                className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-end justify-center gap-[3px] px-3 pb-3 mx-auto mb-5 overflow-hidden"
                animate={{ boxShadow: ["0 0 0 rgba(234,179,8,0)", "0 0 24px rgba(234,179,8,0.3)", "0 0 0 rgba(234,179,8,0)"] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-[6px] rounded-sm bg-yellow-400"
                    initial={{ scaleY: 0, originY: 1 }}
                    animate={{ scaleY: [h, h * 0.7, h, h * 1.1, h] }}
                    transition={{
                      duration: 1.8,
                      delay: i * 0.12,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    style={{ height: `${h * 28}px`, transformOrigin: "bottom" }}
                  />
                ))}
              </motion.div>

              <RotatingQuotes />

              <h2 className="text-xl font-bold text-white mb-2">
                Welcome Back, {user?.firstName || "there"}! 👋
              </h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                You are already logged in.<br />
                Would you like to retake the Business Health Audit?
              </p>

              <div className="space-y-2">
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowRetakeConfirm(false); setCurrentStep("industry-select"); }}
                    className="flex-1 h-11 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-colors"
                  >
                    Yes, Retake
                  </button>
                  <button
                    onClick={() => navigate("/business")}
                    className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 font-medium text-sm border border-slate-700 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await logOut();
                      await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (error) {
                      console.error("Logout error:", error);
                    }
                    navigate("/");
                  }}
                  className="w-full h-11 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 font-medium text-sm border border-red-500/30 transition-colors"
                >
                  Back to Landing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════════════════════════════════
            STEP 1: SIGNUP WITH INDUSTRY SELECTION
        ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === "signup" && !showLoginConfirm && (
          <motion.div
            key="signup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-screen flex items-center justify-center p-4 relative"
          >
            {/* Animated Chart Background */}
            <AnimatedChartBackground />
            
            <div className="w-full max-w-md relative z-10">
              {/* Back Navigation */}
              <button
                type="button"
                onClick={async () => { 
                  try {
                    await logOut();
                    // Small delay to ensure logout completes
                    await new Promise(resolve => setTimeout(resolve, 500));
                  } catch (error) {
                    console.error("Logout error:", error);
                  }
                  navigate("/"); 
                }}
                className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              
              {/* Rotating Quotes */}
              <RotatingQuotes />
              
              {/* Header */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-4"
                >
                  <Target className="w-4 h-4" />
                  Free Business Health Audit
                </motion.div>
                <h1 className="text-3xl font-bold mb-2">Discover Your Operational Gaps</h1>
                <p className="text-gray-400">
                  Get a personalized AI-powered audit in under 2 minutes
                </p>
              </div>

              {/* Signup Form */}
              <Card className="bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl p-8 space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <Label className="text-gray-300">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-12 rounded-xl bg-slate-800/50 border-slate-600 focus:border-yellow-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-gray-300">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="email"
                      placeholder="rahul@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-xl bg-slate-800/50 border-slate-600 focus:border-yellow-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 rounded-xl bg-slate-800/50 border-slate-600 focus:border-yellow-500"
                    />
                  </div>
                </div>

                {/* Industry Selection - The Magic Input */}
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-yellow-400" />
                    What's your business type?
                  </Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {INDUSTRIES.map((ind) => (
                      <button
                        key={ind.key}
                        onClick={() => setIndustry(ind.key)}
                        className={`p-3 rounded-xl border-2 text-left transition-all text-sm ${
                          industry === ind.key
                            ? "border-yellow-500 bg-yellow-500/10"
                            : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                        }`}
                      >
                        <span className="mr-2">{ind.icon}</span>
                        {ind.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom industry text input when Other is selected */}
                  {industry === "other" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      <Input
                        placeholder="Describe your business type..."
                        value={customIndustry}
                        onChange={(e) => setCustomIndustry(e.target.value)}
                        className="h-12 rounded-xl bg-slate-800/50 border-slate-600 focus:border-yellow-500 text-white placeholder:text-gray-500"
                      />
                    </motion.div>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={handleSignup}
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-base"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-2" />
                      Start My Free Business Audit
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900 px-2 text-gray-500">or continue with</span>
                  </div>
                </div>

                {/* Google Signup */}
                <Button
                  variant="outline"
                  onClick={handleGoogleSignup}
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl border-slate-600 bg-slate-800/50 hover:bg-slate-800"
                >
                  <SiGoogle className="w-4 h-4 mr-2" />
                  Continue with Google
                </Button>

                <p className="text-center text-xs text-gray-500">
                  Already have an account?{" "}
                  <button onClick={() => navigate("/login")} className="text-yellow-400 hover:underline">
                    Sign in
                  </button>
                </p>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 1B: INDUSTRY SELECTION FOR AUTHENTICATED USERS
        ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === "industry-select" && (
          <motion.div
            key="industry-select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-screen flex items-center justify-center p-4 relative"
          >
            {/* Animated Chart Background */}
            <AnimatedChartBackground />
            
            <div className="w-full max-w-lg relative z-10">
              {/* Rotating Quotes */}
              <RotatingQuotes />

              <Card className="p-8 bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl relative overflow-hidden">
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-yellow-500/30 rounded-tl-xl" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-yellow-500/30 rounded-br-xl" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl" />
                
                {/* Welcome Message */}
                <div className="text-center mb-8 relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="relative inline-flex items-center justify-center w-16 h-16 mx-auto mb-4"
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-transparent"
                      style={{
                        background: "linear-gradient(black, black) padding-box, linear-gradient(90deg, #eab308, #f59e0b, #eab308) border-box",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="w-14 h-14 rounded-full bg-slate-800 border border-yellow-500/30 flex items-center justify-center">
                      <Building2 className="w-7 h-7 text-yellow-400" />
                    </div>
                  </motion.div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Welcome, {user?.firstName || 'there'}! 👋
                  </h1>
                  <p className="text-gray-500">
                    One quick step before your free Business Health Score
                  </p>
                </div>

                {/* Industry Selection */}
                <div className="space-y-4">
                  <Label className="text-gray-300 flex items-center gap-2 text-base">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    What's your business type?
                  </Label>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {INDUSTRIES.map((ind) => (
                      <button
                        key={ind.key}
                        onClick={() => setIndustry(ind.key)}
                        className={`p-3 rounded-xl border-2 text-left transition-all text-sm ${
                          industry === ind.key
                            ? "border-yellow-500 bg-yellow-500/10"
                            : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                        }`}
                      >
                        <span className="mr-2">{ind.icon}</span>
                        {ind.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom industry text input when Other is selected */}
                  {industry === "other" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      <Input
                        placeholder="Describe your business type..."
                        value={customIndustry}
                        onChange={(e) => setCustomIndustry(e.target.value)}
                        className="bg-gray-950 border-gray-800 focus:border-yellow-500 text-white placeholder:text-gray-600"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Premium CTA Button */}
                <motion.div className="relative mt-6">
                  <motion.div
                    className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/50 to-amber-500/50 rounded-xl blur-sm"
                    animate={{ opacity: industry ? [0.5, 0.8, 0.5] : 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <Button
                    onClick={handleIndustrySelect}
                    disabled={!industry}
                    className="relative w-full h-12 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-semibold text-base disabled:opacity-50 overflow-hidden"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                      initial={{ x: "-100%" }}
                      animate={{ x: industry ? "100%" : "-100%" }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                    />
                    <span className="relative flex items-center justify-center gap-2">
                      <Brain className="w-5 h-5" />
                      Generate My Health Score
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  </Button>
                </motion.div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 2: LOADING ILLUSION (AI IN ACTION)
        ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
          >
            {/* Animated Chart Background */}
            <AnimatedChartBackground />
            
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-r from-yellow-500/10 to-amber-500/10 blur-3xl"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="text-center max-w-md relative z-10">
              {/* Rotating Quotes */}
              <RotatingQuotes />

              {/* Animated Brain Icon with rotating ring */}
              <motion.div
                className="relative w-28 h-28 mx-auto mb-8"
              >
                {/* Rotating outer ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-transparent"
                  style={{
                    background: "linear-gradient(black, black) padding-box, linear-gradient(90deg, #eab308, transparent, #eab308) border-box",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                {/* Pulsing glow */}
                <motion.div
                  className="absolute inset-2 rounded-full bg-yellow-500/20"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {/* Brain icon */}
                <div className="absolute inset-3 rounded-full bg-black border border-yellow-500/30 flex items-center justify-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Brain className="w-10 h-10 text-yellow-400" />
                  </motion.div>
                </div>
              </motion.div>

              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Preparing Your Audit...
              </h2>

              {/* Loading Messages */}
              <div className="space-y-3 text-left max-w-xs mx-auto">
                {loadingMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-4 h-4 text-yellow-400" />
                    </motion.div>
                    <span className="text-gray-400">{msg}</span>
                  </motion.div>
                ))}
              </div>

              {/* Premium progress bar */}
              <div className="mt-8 h-1 bg-gray-900 rounded-full overflow-hidden max-w-xs mx-auto border border-gray-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 relative overflow-hidden"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                >
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 3: THE REALITY CHECK (INTERACTIVE AUDIT)
        ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === "audit" && (
          <motion.div
            key="audit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-screen p-4 md:p-8 relative overflow-hidden"
          >
            {/* Animated Chart Background */}
            <AnimatedChartBackground />
            
            {/* Background effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div 
                className="absolute top-0 right-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-yellow-500/5 to-amber-500/5 blur-3xl"
                animate={{ 
                  y: [0, 50, 0],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="max-w-3xl mx-auto relative z-10">
              {/* Back Button */}
              <button
                onClick={() => setCurrentStep("industry-select")}
                className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {/* Rotating Quotes */}
              <RotatingQuotes />

              {/* Header */}
              <div className="text-center mb-8">
                <motion.div 
                  className="relative inline-block"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-full bg-yellow-500/20 blur-md"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-yellow-500/30 text-yellow-400 text-sm font-medium mb-4">
                    <Activity className="w-4 h-4" />
                    Business Health Audit
                  </div>
                </motion.div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
                  Rate Your Business Operations
                </h1>
                <p className="text-gray-500">
                  Be honest — your personalized insights depend on it
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <span className="text-sm font-medium text-yellow-400">
                    {answeredCount} / {questions.length} answered
                  </span>
                </div>
                <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 rounded-full relative overflow-hidden"
                    animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                    />
                  </motion.div>
                </div>
              </div>

              {/* Single Question Display */}
              <AnimatePresence mode="wait">
                {questions[currentQuestionIndex] && (
                  <motion.div
                    key={currentQuestionIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="relative"
                  >
                    {/* Question Card */}
                    <div className="relative overflow-hidden rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl p-8">
                      {/* Corner accents */}
                      <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-yellow-500/30 rounded-tl-3xl" />
                      <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-yellow-500/30 rounded-br-3xl" />
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl" />

                      <div className="relative">
                        {/* Question Number */}
                        <motion.div 
                          className="flex items-center justify-center w-14 h-14 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/30"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring" }}
                        >
                          <span className="text-2xl font-bold text-yellow-400">{currentQuestionIndex + 1}</span>
                        </motion.div>

                        {/* Question Text */}
                        <h3 className="text-xl md:text-2xl font-semibold text-white text-center mb-8 leading-relaxed">
                          {questions[currentQuestionIndex]}
                        </h3>

                        {/* Likert Options - Vertical Stack */}
                        <div className="space-y-3 max-w-md mx-auto">
                          {LIKERT_OPTIONS.map((option, optIndex) => {
                            const isSelected = answers[currentQuestionIndex] === option.value;
                            return (
                              <motion.button
                                key={option.value}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: optIndex * 0.1 }}
                                onClick={() => handleAnswerSelect(currentQuestionIndex, option.value)}
                                whileHover={{ scale: 1.02, x: 5 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full px-6 py-4 rounded-xl text-left font-medium transition-all duration-200 border flex items-center gap-4 ${
                                  isSelected
                                    ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20"
                                    : "bg-slate-800/50 text-gray-300 border-slate-600 hover:border-yellow-500/50 hover:bg-slate-800"
                                }`}
                              >
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  isSelected ? "bg-black/20 text-black" : "bg-yellow-500/10 text-yellow-400"
                                }`}>
                                  {option.value}
                                </span>
                                <span className="flex-1">{option.label}</span>
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring" }}
                                  >
                                    <CheckCircle2 className="w-5 h-5" />
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-6">
                      <button
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          currentQuestionIndex === 0 
                            ? "text-gray-700 cursor-not-allowed" 
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Previous
                      </button>

                      {/* Progress dots */}
                      <div className="flex gap-1.5">
                        {questions.map((_, idx) => (
                          <motion.div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                              idx === currentQuestionIndex 
                                ? "bg-yellow-400" 
                                : answers[idx] 
                                  ? "bg-yellow-500/50" 
                                  : "bg-gray-700"
                            }`}
                            onClick={() => setCurrentQuestionIndex(idx)}
                            whileHover={{ scale: 1.3 }}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => setCurrentQuestionIndex(Math.min(currentQuestionIndex + 1, questions.length - 1))}
                        disabled={currentQuestionIndex === questions.length - 1}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          currentQuestionIndex === questions.length - 1 
                            ? "text-gray-700 cursor-not-allowed" 
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        Next
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.div className="mt-8 flex justify-center">
                <motion.div className="relative">
                  {isAuditComplete && (
                    <motion.div
                      className="absolute -inset-1 bg-gradient-to-r from-yellow-500/50 to-amber-500/50 rounded-xl blur-md"
                      animate={{ opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  <motion.button
                    onClick={handleSubmitAudit}
                    disabled={!isAuditComplete}
                    whileHover={isAuditComplete ? { scale: 1.02 } : {}}
                    whileTap={isAuditComplete ? { scale: 0.98 } : {}}
                    className={`relative group flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 overflow-hidden ${
                      isAuditComplete
                        ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-black"
                        : "bg-gray-950 text-gray-600 cursor-not-allowed border border-gray-800"
                    }`}
                  >
                    {isAuditComplete && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Generate My Health Score
                      {isAuditComplete && (
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      )}
                    </span>
                  </motion.button>
                </motion.div>
              </motion.div>

              {!isAuditComplete && (
                <p className="text-center text-gray-600 text-sm mt-3">
                  Please answer all questions to see your results
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 4: THE PRESCRIPTION (RESULTS & SMART RECOMMENDATION)
        ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden"
          >
            {/* Animated Chart Background */}
            <AnimatedChartBackground />
            
            {/* Animated background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Golden particles */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-yellow-400/30 rounded-full"
                  initial={{ 
                    x: Math.random() * window.innerWidth, 
                    y: Math.random() * window.innerHeight,
                    opacity: 0 
                  }}
                  animate={{ 
                    y: [null, Math.random() * -200],
                    opacity: [0, 0.8, 0],
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeOut"
                  }}
                />
              ))}
              {/* Gradient orbs */}
              <motion.div 
                className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-yellow-500/5 to-amber-500/5 blur-3xl"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-amber-500/5 to-yellow-600/5 blur-3xl"
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="max-w-3xl w-full space-y-6 relative z-10">
              {/* Back Navigation */}
              <button
                onClick={() => setCurrentStep("audit")}
                className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Audit</span>
              </button>
              
              {/* Rotating Quotes */}
              <RotatingQuotes />

              {/* Score Card */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative"
              >
                {/* Golden glow border */}
                <motion.div 
                  className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/50 via-amber-400/30 to-yellow-500/50 rounded-3xl blur-sm"
                  animate={{ 
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                
                <div className="relative overflow-hidden rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl p-8">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                  <div className="relative text-center">
                    {/* Score Circle */}
                    <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
                      {/* Rotating golden ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-yellow-500"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        style={{
                          borderTopColor: "transparent",
                          borderRightColor: "#eab308",
                          borderBottomColor: "#f59e0b", 
                          borderLeftColor: "transparent",
                        }}
                      />
                      {/* Inner circle with score */}
                      <div className="w-28 h-28 rounded-full bg-slate-800 border-2 border-yellow-500/50 flex items-center justify-center">
                        <span className="text-5xl font-bold text-yellow-400">
                          {totalScore}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm mb-6">out of 32 points</p>

                    {/* Animated Score Bar */}
                    <div className="flex justify-center mb-8">
                      <div className="w-full max-w-md h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                        <motion.div
                          className="h-full rounded-full relative overflow-hidden"
                          style={{
                            background: `linear-gradient(90deg, 
                              ${healthStatus.level === "critical" ? "#ef4444" : healthStatus.level === "stagnant" ? "#eab308" : "#10b981"} 0%, 
                              ${healthStatus.level === "critical" ? "#f87171" : healthStatus.level === "stagnant" ? "#fbbf24" : "#34d399"} 100%
                            )`,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(totalScore / 32) * 100}%` }}
                          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                        >
                          {/* Shine effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{ duration: 1, delay: 1.5, repeat: Infinity, repeatDelay: 3 }}
                          />
                        </motion.div>
                      </div>
                    </div>

                    {/* Dynamic Headline */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mb-6"
                    >
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                        {recommendation.headline}
                      </h2>
                      <p className="text-gray-400 leading-relaxed max-w-lg mx-auto">
                        {recommendation.subtext}
                      </p>
                    </motion.div>

                    {/* Status Badge with pulse */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="relative inline-block"
                    >
                      <motion.div
                        className={`absolute inset-0 rounded-xl ${healthStatus.bgColor} blur-md`}
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <div className={`relative inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-black border ${healthStatus.borderColor}`}>
                        <StatusIcon className={`w-6 h-6 ${healthStatus.color}`} />
                        <div className="text-left">
                          <p className={`font-semibold text-lg ${healthStatus.color}`}>
                            Status: {healthStatus.label}
                          </p>
                          <p className="text-gray-500 text-sm">
                            ({healthStatus.description})
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Smart Recommendation Card */}
              {recommendation.type !== "both" ? (
                <>
                  {/* Primary Recommendation - Premium Golden Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="relative"
                  >
                    {/* Animated glow effect */}
                    <motion.div 
                      className="absolute -inset-1 bg-gradient-to-r from-yellow-500/40 via-amber-400/30 to-yellow-500/40 rounded-3xl blur-lg"
                      animate={{ 
                        opacity: [0.4, 0.7, 0.4],
                        scale: [1, 1.02, 1],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                    
                    <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 p-8">
                      {/* Animated corner accents */}
                      <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-yellow-500/50 rounded-tl-2xl" />
                      <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-yellow-500/50 rounded-br-2xl" />
                      
                      <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
                      
                      <div className="relative">
                        {/* Header with Badge */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <motion.div 
                              className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/30"
                              animate={{ 
                                boxShadow: ["0 0 0 rgba(234,179,8,0)", "0 0 20px rgba(234,179,8,0.3)", "0 0 0 rgba(234,179,8,0)"]
                              }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              {recommendation.type === "business" ? (
                                <Briefcase className="w-7 h-7 text-yellow-400" />
                              ) : (
                                <BarChart3 className="w-7 h-7 text-yellow-400" />
                              )}
                            </motion.div>
                            <div>
                              <h3 className="text-xl font-bold text-white">
                                {recommendation.type === "business" ? "Business Suite" : "Analytics Suite"}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {recommendation.type === "business" ? "Operations & Team Management" : "AI-Powered Data Analysis"}
                              </p>
                            </div>
                          </div>
                          <motion.div 
                            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-semibold flex items-center gap-1.5"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Highly Recommended
                          </motion.div>
                        </div>

                        <p className="text-gray-400 leading-relaxed mb-6">
                          {recommendation.pitchDescription}
                        </p>

                        {/* Features Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          {(recommendation.type === "business" ? [
                            "Automate attendance tracking",
                            "Real-time expense logging",
                            "Daily EOD reports system",
                            "Target monitoring dashboard"
                          ] : [
                            "Upload Excel/CSV instantly",
                            "AI Virtual MBA advisor",
                            "Hidden trend detection",
                            "Go-To-Market strategies"
                          ]).map((feature, i) => (
                            <motion.div 
                              key={i} 
                              className="flex items-center gap-2 text-sm text-gray-300"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.7 + i * 0.1 }}
                            >
                              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-yellow-400" />
                              {feature}
                            </motion.div>
                          ))}
                        </div>

                        {/* Premium CTA Button */}
                        <motion.button
                          onClick={handleSmartLaunch}
                          className="w-full group relative overflow-hidden flex items-center justify-center gap-3 px-8 py-4 font-semibold text-lg rounded-xl transition-all duration-300 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* Shine effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                          />
                          <span className="relative flex items-center gap-3">
                            {recommendation.type === "business" ? (
                              <Briefcase className="w-5 h-5" />
                            ) : (
                              <Brain className="w-5 h-5" />
                            )}
                            {recommendation.ctaText}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Secondary Option - Subtle Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    onClick={() => handleSelectSuite(recommendation.type === "business" ? "analytics" : "business")}
                    className="cursor-pointer group relative overflow-hidden rounded-xl bg-black border border-gray-800 hover:border-yellow-500/50 p-5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20">
                          {recommendation.type === "business" ? (
                            <BarChart3 className="w-5 h-5 text-yellow-400" />
                          ) : (
                            <Briefcase className="w-5 h-5 text-yellow-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">
                            {recommendation.type === "business" ? "Analytics Suite" : "Business Suite"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {recommendation.type === "business" 
                              ? "Already have data? Start here instead" 
                              : "Need to digitize operations first?"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-yellow-400 transition-colors" />
                    </div>
                  </motion.div>
                </>
              ) : (
                /* Both Options - Equal Prominence */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="grid md:grid-cols-2 gap-6"
                >
                  {/* Business Suite Card */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -4 }}
                    onClick={() => handleSelectSuite("business")}
                    className="cursor-pointer group relative overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 hover:border-yellow-500/50 p-6 transition-all shadow-xl"
                  >
                    <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-yellow-500/30 rounded-tl-2xl" />
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-yellow-500/30 rounded-br-2xl" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors" />
                    
                    <div className="relative">
                      <motion.div 
                        className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-4"
                        animate={{ boxShadow: ["0 0 0 rgba(234,179,8,0)", "0 0 15px rgba(234,179,8,0.2)", "0 0 0 rgba(234,179,8,0)"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Briefcase className="w-6 h-6 text-yellow-400" />
                      </motion.div>

                      <h3 className="text-xl font-bold text-white mb-2">Business Suite</h3>
                      <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                        Manage team operations, track daily EOD reports, and automate expense logging.
                      </p>

                      <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm group-hover:gap-3 transition-all">
                        Start with Operations
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Analytics Suite Card */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -4 }}
                    onClick={() => handleSelectSuite("analytics")}
                    className="cursor-pointer group relative overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 hover:border-yellow-500/50 p-6 transition-all shadow-xl"
                  >
                    <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-yellow-500/30 rounded-tl-2xl" />
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-yellow-500/30 rounded-br-2xl" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors" />
                    
                    <div className="relative">
                      <motion.div 
                        className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-4"
                        animate={{ boxShadow: ["0 0 0 rgba(234,179,8,0)", "0 0 15px rgba(234,179,8,0.2)", "0 0 0 rgba(234,179,8,0)"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <BarChart3 className="w-6 h-6 text-yellow-400" />
                      </motion.div>

                      <h3 className="text-xl font-bold text-white mb-2">Analytics Suite</h3>
                      <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                        Upload your data and let AI uncover hidden trends and growth strategies.
                      </p>

                      <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm group-hover:gap-3 transition-all">
                        Start with Analytics
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Retake */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex justify-center"
              >
                <button
                  onClick={() => {
                    setAnswers({});
                    setCurrentQuestionIndex(0);
                    setCurrentStep("audit");
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake Assessment
                </button>
              </motion.div>

              {/* Helper text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-center text-gray-600 text-xs"
              >
                You can switch between suites anytime from your dashboard
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 5: WORKSPACE SELECTION (Only shown for "both" recommendation)
        ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === "workspace" && (
          <motion.div
            key="workspace"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden"
          >
            {/* Animated Chart Background */}
            <AnimatedChartBackground />
            
            {/* Animated background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Golden particles */}
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-yellow-400/20 rounded-full"
                  initial={{ 
                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
                    y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                    opacity: 0 
                  }}
                  animate={{ 
                    y: [null, Math.random() * -150],
                    opacity: [0, 0.6, 0],
                  }}
                  transition={{ 
                    duration: 4 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 3,
                    ease: "easeOut"
                  }}
                />
              ))}
              <motion.div 
                className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full bg-gradient-to-r from-yellow-500/5 to-amber-500/5 blur-3xl"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute bottom-1/3 right-1/3 w-64 h-64 rounded-full bg-gradient-to-r from-yellow-500/5 to-amber-500/5 blur-3xl"
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="max-w-4xl w-full relative z-10">
              {/* Back Navigation */}
              <button
                onClick={() => setCurrentStep("results")}
                className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Results</span>
              </button>
              
              {/* Rotating Quotes */}
              <RotatingQuotes />

              {/* Header */}
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="relative inline-block"
                >
                  <motion.div
                    className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-4">
                    <CheckCircle2 className="w-4 h-4" />
                    Workspace Unlocked
                  </div>
                </motion.div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
                  {recommendation.headline}
                </h1>
                <p className="text-gray-500 text-lg">
                  {recommendation.subtext}
                </p>
              </div>

              {/* Suite Cards - Premium Design */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Business Suite Card */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  onClick={() => handleSelectSuite("business")}
                  className="cursor-pointer group relative"
                >
                  {/* Glow effect */}
                  <motion.div 
                    className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/30 to-amber-500/30 rounded-3xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  
                  <div className="relative overflow-hidden rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl group-hover:border-yellow-500/50 p-8 transition-all">
                    <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-yellow-500/30 rounded-tl-3xl" />
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-yellow-500/30 rounded-br-3xl" />
                    <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl group-hover:bg-yellow-500/10 transition-colors" />
                    
                    <div className="relative">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/30 flex items-center justify-center mb-6"
                        animate={{ boxShadow: ["0 0 0 rgba(234,179,8,0)", "0 0 20px rgba(234,179,8,0.2)", "0 0 0 rgba(234,179,8,0)"] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Briefcase className="w-8 h-8 text-yellow-400" />
                      </motion.div>

                      <h2 className="text-2xl font-bold text-white mb-2">Business Suite</h2>
                      <p className="text-gray-500 mb-6 leading-relaxed">
                        Track daily operations, manage team attendance, log expenses, and build 
                        your business data from scratch.
                      </p>

                      <div className="space-y-3 mb-8">
                        {[
                          "Employee end-of-day reports",
                          "Expense & revenue tracking",
                          "Team management & roles",
                          "Vertical-wise analytics",
                        ].map((feature, i) => (
                          <motion.div 
                            key={i} 
                            className="flex items-center gap-3 text-sm text-gray-400"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                          >
                            <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                            {feature}
                          </motion.div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-yellow-400 font-semibold group-hover:gap-3 transition-all">
                        Launch Business Suite
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Analytics Suite Card */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  onClick={() => handleSelectSuite("analytics")}
                  className="cursor-pointer group relative"
                >
                  {/* Glow effect */}
                  <motion.div 
                    className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/30 to-amber-500/30 rounded-3xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  
                  <div className="relative overflow-hidden rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl group-hover:border-yellow-500/50 p-8 transition-all">
                    <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-yellow-500/30 rounded-tl-3xl" />
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-yellow-500/30 rounded-br-3xl" />
                    <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl group-hover:bg-yellow-500/10 transition-colors" />
                    
                    <div className="relative">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/30 flex items-center justify-center mb-6"
                        animate={{ boxShadow: ["0 0 0 rgba(234,179,8,0)", "0 0 20px rgba(234,179,8,0.2)", "0 0 0 rgba(234,179,8,0)"] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <BarChart3 className="w-8 h-8 text-yellow-400" />
                      </motion.div>

                      <h2 className="text-2xl font-bold text-white mb-2">Analytics Suite</h2>
                      <p className="text-gray-500 mb-6 leading-relaxed">
                        Already have data? Upload your Excel/CSV files and let AI generate 
                        insights, dashboards, and strategic recommendations.
                      </p>

                      <div className="space-y-3 mb-8">
                        {[
                          "Upload Excel/CSV/Google Sheets",
                          "AI-powered chat with your data",
                          "Auto-generated visualizations",
                          "Strategic business insights",
                        ].map((feature, i) => (
                          <motion.div 
                            key={i} 
                            className="flex items-center gap-3 text-sm text-gray-400"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                          >
                            <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                            {feature}
                          </motion.div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-yellow-400 font-semibold group-hover:gap-3 transition-all">
                        Launch Analytics Suite
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Back Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center mt-6"
              >
                <button
                  onClick={() => setCurrentStep("results")}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Results
                </button>
              </motion.div>

              {/* Helper text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-gray-600 text-sm mt-4"
              >
                Don't worry — you can switch between suites anytime from your dashboard.
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
