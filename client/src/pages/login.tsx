import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  signInWithGoogle,
  signInWithFacebook,
  signInWithApple,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
} from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { SiGoogle, SiFacebook, SiApple } from "react-icons/si";
import { Mail, Lock, User, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Activity, Building2 } from "lucide-react";
import { Link } from "wouter";

// Animated Line Chart Component
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
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
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
        stroke="white"
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
          fill="white"
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
          fill="white"
          fillOpacity="0.3"
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

// Animated Pie/Donut Chart
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
            fill="white"
            fillOpacity={0.15 + i * 0.1}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: segment.delay, duration: 0.5 }}
          />
        );
      })}
      {/* Center circle for donut effect */}
      <circle cx="50" cy="50" r="20" fill="#f97316" />
      <motion.text
        x="50"
        y="54"
        textAnchor="middle"
        fill="white"
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

// Floating Stats Card
function FloatingStatsCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
    >
      <motion.div 
        className="text-white text-xl font-bold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.3 }}
      >
        {value}
      </motion.div>
      <div className="text-white/60 text-xs">{label}</div>
    </motion.div>
  );
}

// Pulsing Data Node
function DataNode({ x, y, size, delay }: { x: string; y: string; size: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white/30"
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
        className="absolute inset-0 rounded-full bg-white/50"
        animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay }}
      />
    </motion.div>
  );
}

// Animated background with floating orbs and gradient waves
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600" />
      
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-red-500/30 via-transparent to-yellow-400/20"
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Animated Line Chart - Top Right */}
      <motion.div 
        className="absolute top-[15%] right-[5%] w-48 h-24 opacity-60"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 0.6, x: 0 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <AnimatedLineChart />
      </motion.div>

      {/* Animated Bar Chart - Bottom Left */}
      <motion.div 
        className="absolute bottom-[25%] left-[8%] w-40 h-20 opacity-50"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 0.5, y: 0 }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        <AnimatedBarChart />
      </motion.div>

      {/* Donut Chart - Center Right */}
      <motion.div 
        className="absolute top-[45%] right-[15%] w-24 h-24 opacity-70"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.7, scale: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <AnimatedDonutChart />
      </motion.div>

      {/* Floating Stats Cards */}
      <div className="absolute top-[15%] right-[15%]">
        <FloatingStatsCard value="+24%" label="Growth" delay={0.3} />
      </div>
      <div className="absolute top-[40%] right-[8%]">
        <FloatingStatsCard value="12.5K" label="Users" delay={0.6} />
      </div>
      <div className="absolute top-[70%] right-[20%]">
        <FloatingStatsCard value="98.5%" label="Accuracy" delay={0.9} />
      </div>

      {/* Data Nodes / Connection Points */}
      <DataNode x="30%" y="20%" size={12} delay={0} />
      <DataNode x="60%" y="35%" size={8} delay={0.3} />
      <DataNode x="25%" y="65%" size={10} delay={0.6} />
      <DataNode x="70%" y="75%" size={14} delay={0.9} />
      <DataNode x="45%" y="85%" size={8} delay={1.2} />

      {/* Animated Connection Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
        <motion.line
          x1="30%" y1="20%" x2="60%" y2="35%"
          stroke="white"
          strokeWidth="1"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.line
          x1="60%" y1="35%" x2="70%" y2="75%"
          stroke="white"
          strokeWidth="1"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, delay: 0.5, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.line
          x1="25%" y1="65%" x2="45%" y2="85%"
          stroke="white"
          strokeWidth="1"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 1, repeat: Infinity, repeatType: "reverse" }}
        />
      </svg>

      {/* Large floating orb 1 */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-yellow-400/30 to-orange-300/10 blur-3xl"
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
        className="absolute w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-orange-600/40 to-red-500/20 blur-3xl"
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
          className="absolute w-1 h-1 rounded-full bg-white/60"
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

      {/* Animated Trend Arrow */}
      <motion.div
        className="absolute top-[38%] left-[35%] text-white/40"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: [0.4, 0.7, 0.4], y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 17L17 7M17 7H7M17 7V17" />
        </svg>
      </motion.div>

      {/* Glowing circle accent */}
      <motion.div
        className="absolute w-48 h-48 rounded-full border border-white/20"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ top: "10%", right: "5%" }}
      />

      {/* Second glowing ring */}
      <motion.div
        className="absolute w-32 h-32 rounded-full border-2 border-white/15"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.15, 0.3, 0.15],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ bottom: "20%", left: "15%" }}
      />

      {/* Subtle noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />
    </div>
  );
}

// Social icon button component
function SocialIconButton({ onClick, disabled, loading, icon: Icon, label }: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="w-14 h-14 rounded-full border border-border/60 bg-background/50 hover:bg-accent/80 flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : (
        <Icon className="w-5 h-5 text-foreground/70" />
      )}
    </motion.button>
  );
}

// Industry options for business audit
const INDUSTRY_OPTIONS = [
  { value: "real-estate", label: "Real Estate" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "agency", label: "Agency / Consultancy" },
  { value: "healthcare", label: "Healthcare" },
  { value: "hospitality", label: "Hospitality" },
  { value: "education", label: "Education" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "logistics", label: "Logistics & Transport" },
  { value: "other", label: "Other" },
];

export default function Login() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [industry, setIndustry] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const { toast } = useToast();
  const { isLoading: authLoading, authError, firebaseUser } = useAuth();

  const verifying = !!firebaseUser && authLoading;

  useEffect(() => {
    if (authError) setInlineError(authError);
  }, [authError]);

  const clearError = () => setInlineError(null);

  const handleGoogleSignIn = async () => {
    clearError();
    setLoadingProvider("google");
    const { error } = await signInWithGoogle();
    setLoadingProvider(null);
    if (error) setInlineError(error);
  };

  const handleAppleSignIn = async () => {
    clearError();
    setLoadingProvider("apple");
    const { error } = await signInWithApple();
    setLoadingProvider(null);
    if (error) setInlineError(error);
  };

  const handleFacebookSignIn = async () => {
    clearError();
    setLoadingProvider("facebook");
    const { error } = await signInWithFacebook();
    setLoadingProvider(null);
    if (error) setInlineError(error);
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email || !password) {
      setInlineError("Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    const { error } = await signInWithEmail(email, password);
    setIsLoading(false);
    if (error) setInlineError(error);
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email || !password) {
      setInlineError("Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      setInlineError("Password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    const { error } = await signUpWithEmail(email, password);
    setIsLoading(false);
    if (error) setInlineError(error);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setInlineError("Please enter your email address.");
      return;
    }
    setForgotLoading(true);
    const { error } = await resetPassword(forgotEmail);
    setForgotLoading(false);
    if (error) setInlineError(error);
    else setForgotSent(true);
  };

  // Loading / verifying state
  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-slate-950 dark:via-amber-950/20 dark:to-slate-950 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-muted-foreground text-sm">Signing you in…</p>
      </div>
    );
  }

  // Forgot password view
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-slate-950 dark:via-amber-950/20 dark:to-slate-950 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-800/50 p-8">
            <h2 className="text-2xl font-bold text-center mb-2">Reset Password</h2>
            <p className="text-muted-foreground text-center text-sm mb-6">Enter your email to receive a reset link</p>
            {forgotSent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <p className="font-medium">Reset email sent!</p>
                <p className="text-sm text-muted-foreground">Check your inbox for a password reset link.</p>
                <Button
                  variant="outline"
                  className="mt-2 rounded-xl"
                  onClick={() => { setShowForgotPassword(false); setForgotSent(false); }}
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {inlineError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{inlineError}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send Reset Link
                </Button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Main login/signup view
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-slate-950 dark:via-amber-950/20 dark:to-slate-950">
      {/* Left decorative panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link href="/">
            <button className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <motion.h1
                  className="text-5xl font-bold leading-tight"
                >
                  {activeTab === "signin" ? (
                    <>
                      Welcome Back<br />
                      <span className="text-yellow-200">to Data Insights</span>
                    </>
                  ) : (
                    <>
                      Hello, Welcome<br />
                      <span className="text-yellow-200">to Data Insights</span>
                    </>
                  )}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/80 text-lg max-w-xs leading-relaxed mt-4"
                >
                  {activeTab === "signin" 
                    ? "Sign in to access your AI-powered data dashboards and insights"
                    : "Create your account and start transforming your data into insights"
                  }
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex gap-4 text-sm text-white/50">
            <button
              onClick={() => setActiveTab("signin")}
              className={`pb-1 transition-colors ${activeTab === "signin" ? "text-white border-b-2 border-white font-semibold" : "hover:text-white/70"}`}
            >
              Sign in
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={`pb-1 transition-colors ${activeTab === "signup" ? "text-white border-b-2 border-white font-semibold" : "hover:text-white/70"}`}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl"
        >
          {/* Mobile back button */}
          <Link href="/">
            <button className="flex lg:hidden items-center gap-2 text-amber-600 hover:text-amber-700 mb-6 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>

          <motion.div 
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 dark:border-slate-800/50 p-10 sm:p-12"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {/* Header */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-center mb-10"
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                    {activeTab === "signin" ? "Welcome Back" : "Get Started"}
                  </h2>
                </motion.div>
                <motion.p 
                  className="text-muted-foreground mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  {activeTab === "signin"
                    ? "Sign in to continue to Data Insights"
                    : "Get your free Business Health Score in 2 minutes"}
                </motion.p>
              </motion.div>
            </AnimatePresence>

            {/* Error display */}
            {inlineError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm mb-6"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{inlineError}</span>
              </motion.div>
            )}

            {/* Forms */}
            <AnimatePresence mode="wait">
              {activeTab === "signin" ? (
                <motion.form
                  key="signin"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleEmailSignIn}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearError(); }}
                      className="h-14 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-amber-500/20 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError(); }}
                      className="h-14 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-amber-500/20 text-base"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(v) => setRememberMe(v as boolean)}
                        className="border-slate-300 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                      <Label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">
                        Remember me
                      </Label>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium hover:underline underline-offset-2"
                      onClick={() => { setShowForgotPassword(true); setForgotEmail(email); setInlineError(null); }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-base shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:shadow-xl"
                      disabled={isLoading || loadingProvider !== null}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Sign in
                    </Button>
                  </motion.div>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-slate-900 px-2 text-muted-foreground">Or bypass for testing</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-medium"
                    onClick={() => {
                      setEmail("admin@demodatainsights.com");
                      setPassword("Demo@1234");
                      setTimeout(() => {
                        handleEmailSignIn({ preventDefault: () => {} } as any);
                      }, 100);
                    }}
                  >
                    Demo Admin Access
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleEmailSignUp}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter Full Name"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); clearError(); }}
                      className="h-14 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-amber-500/20 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter Email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearError(); }}
                      className="h-14 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-amber-500/20 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError(); }}
                      className="h-14 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-amber-500/20 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-industry" className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-500" />
                      What's your business type?
                    </Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="h-14 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-amber-500/20 text-base">
                        <SelectValue placeholder="Choose your industry..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {INDUSTRY_OPTIONS.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value}
                            className="cursor-pointer"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="agree-terms"
                      checked={agreeTerms}
                      onCheckedChange={(v) => setAgreeTerms(v as boolean)}
                      className="border-slate-300 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <Label htmlFor="agree-terms" className="text-xs text-muted-foreground cursor-pointer">
                      I agree to the processing of{" "}
                      <span className="text-amber-600 font-medium">Personal data</span>
                    </Label>
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-base shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:shadow-xl gap-2"
                      disabled={isLoading || loadingProvider !== null}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Activity className="w-5 h-5" />
                      )}
                      Start My Free Business Audit
                    </Button>
                  </motion.div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Social login section */}
            <div className="mt-10">
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-slate-900 px-4 text-muted-foreground">
                    {activeTab === "signin" ? "Sign in with" : "Sign up with"}
                  </span>
                </div>
              </div>
              <div className="flex justify-center gap-5">
                <SocialIconButton
                  onClick={handleFacebookSignIn}
                  disabled={loadingProvider !== null || isLoading}
                  loading={loadingProvider === "facebook"}
                  icon={SiFacebook}
                  label="Continue with Facebook"
                />
                <SocialIconButton
                  onClick={handleGoogleSignIn}
                  disabled={loadingProvider !== null || isLoading}
                  loading={loadingProvider === "google"}
                  icon={SiGoogle}
                  label="Continue with Google"
                />
                <SocialIconButton
                  onClick={handleAppleSignIn}
                  disabled={loadingProvider !== null || isLoading}
                  loading={loadingProvider === "apple"}
                  icon={SiApple}
                  label="Continue with Apple"
                />
              </div>
            </div>

            {/* Toggle between sign in / sign up */}
            <p className="text-center text-muted-foreground mt-8">
              {activeTab === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setActiveTab("signup"); clearError(); }}
                    className="text-amber-600 font-semibold hover:underline underline-offset-2"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setActiveTab("signin"); clearError(); }}
                    className="text-amber-600 font-semibold hover:underline underline-offset-2"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
