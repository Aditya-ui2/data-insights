import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

import {
  BarChart3, MessageSquare, Share2, Sparkles, TrendingUp, Zap,
  Upload, Brain, LineChart, Shield, Clock, Users, ArrowRight,
  CheckCircle2, Target, Building2, ChevronRight,
  ChevronLeft, X, Play, FileSpreadsheet, Bot, Eye,
} from "lucide-react";

/* ─────────────────── elegant uppercase subtitle ──────────────────────────────── */
function ElegantSub({ text, centered = true }: { text: string; centered?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 mb-6 ${centered ? "items-center" : "items-start"}`}>
      <span className={`text-[10px] font-bold uppercase tracking-[0.25em] text-accent ${centered ? "text-center" : ""}`}>{text}</span>
      <div className="w-12 h-[1px] bg-accent" />
    </div>
  );
}

/* ─────────────────── animated chart bars ────────────────────────────────────── */
function MiniChart({ values, delay = 0 }: { values: number[]; delay?: number }) {
  return (
    <div className="flex items-end gap-1 h-16">
      {values.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ duration: 0.5, delay: delay + i * 0.07, ease: "easeOut" }}
          className="flex-1 bg-primary"
        />
      ))}
    </div>
  );
}

/* ─────────────────── dashboard mock card ────────────────────────────────────── */
function DashboardMock() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
      className="relative"
    >
      <div className="relative bg-white rounded-none border border-gray-200 shadow-xl p-6 space-y-4">
        {/* topbar */}
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <div className="w-2 h-2 bg-gray-300" />
          <div className="w-2 h-2 bg-gray-300" />
          <div className="w-2 h-2 bg-gray-300" />
          <div className="ml-2 flex-1 h-5 bg-gray-50 border border-gray-100 text-[10px] text-gray-400 flex items-center px-2 font-mono">datainsights.app/dashboard</div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Revenue", value: "₹2.48L", delta: "+24.5%", color: "text-primary" },
            { label: "Team Size", value: "12", delta: "+3 new", color: "text-accent" },
            { label: "Deals", value: "847", delta: "+18.2%", color: "text-gray-800" },
          ].map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="bg-gray-50 rounded-none p-3 border border-gray-100"
            >
              <div className="text-[9px] uppercase tracking-wider text-gray-400 mb-1 font-sans">{kpi.label}</div>
              <div className={`text-base font-sans font-medium ${kpi.color}`}>{kpi.value}</div>
              <div className="text-[9px] text-gray-500 flex items-center gap-0.5 mt-0.5 font-sans">
                <TrendingUp className="w-2.5 h-2.5 text-accent" />{kpi.delta}
              </div>
            </motion.div>
          ))}
        </div>

        {/* chart */}
        <div className="bg-gray-50 rounded-none p-4 border border-gray-100">
          <div className="text-[9px] uppercase tracking-wider text-gray-400 mb-3 font-sans">Revenue Trend</div>
          <MiniChart values={[40, 55, 50, 70, 60, 82, 75, 90, 85, 95, 88, 97]} delay={0.9} />
        </div>

        {/* AI chat bubble */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5 }}
          className="flex items-start gap-2 bg-sidebar border border-sidebar-border p-3"
        >
          <div className="w-6 h-6 bg-primary flex items-center justify-center flex-shrink-0">
            <Bot className="w-3 h-3 text-primary-foreground" />
          </div>
          <div className="text-[10px] text-foreground leading-relaxed font-sans">
            <span className="font-semibold text-primary">AI Insight:</span> Revenue grew 24.5% driven by festival season. Q3 forecast: ₹3.1L
          </div>
        </motion.div>
      </div>

      {/* floating badge */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-4 -right-4 bg-accent text-white rounded-none px-4 py-2 shadow-lg text-[10px] font-sans uppercase tracking-wider font-semibold flex items-center gap-1.5"
      >
        <Sparkles className="w-3 h-3" /> AI Powered
      </motion.div>

      <motion.div
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute -bottom-4 -left-4 bg-white rounded-none px-3 py-2 shadow-lg border border-gray-200 text-[10px] font-sans uppercase tracking-wider font-semibold text-gray-700 flex items-center gap-1.5"
      >
        <div className="w-1.5 h-1.5 bg-accent" />
        Live Data Synced
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────── interactive product tour ───────────────────────────────── */
const TOUR_STEPS = [
  {
    id: 0,
    label: "Upload Data",
    icon: FileSpreadsheet,
    color: "bg-gray-100 text-primary border-gray-200",
    dotColor: "bg-primary",
    arrowPos: { top: "18%", left: "28%" },
    arrowDir: "right",
    title: "Step 1 — Connect Your Data",
    description: "Upload Excel / CSV or connect Google Sheets directly. Supports up to 10MB files with automatic column detection, date parsing, and duplicate header handling.",
    mockHighlight: "upload",
  },
  {
    id: 1,
    label: "AI Analyzes",
    icon: Brain,
    color: "bg-gray-100 text-primary border-gray-200",
    dotColor: "bg-primary",
    arrowPos: { top: "38%", left: "30%" },
    arrowDir: "right",
    title: "Step 2 — Gemini AI Analyzes",
    description: "Gemini AI scans your data in seconds — identifies key metrics, picks optimal chart types, and surfaces hidden patterns you might have missed.",
    mockHighlight: "kpi",
  },
  {
    id: 2,
    label: "Auto Dashboards",
    icon: BarChart3,
    color: "bg-gray-100 text-primary border-gray-200",
    dotColor: "bg-primary",
    arrowPos: { top: "55%", left: "28%" },
    arrowDir: "right",
    title: "Step 3 — Dashboards Auto-Generated",
    description: "KPI cards, bar charts, line charts, and pie charts appear instantly. Everything is interactive — zoom, filter, and drill down without writing a single query.",
    mockHighlight: "chart",
  },
  {
    id: 3,
    label: "Chat with Data",
    icon: MessageSquare,
    color: "bg-gray-100 text-primary border-gray-200",
    dotColor: "bg-primary",
    arrowPos: { top: "72%", left: "30%" },
    arrowDir: "right",
    title: "Step 4 — Ask Questions in Plain English",
    description: '"What drove revenue last month?" "Which product sold most?" Just type your question — AI gives you precise, data-backed answers instantly.',
    mockHighlight: "chat",
  },
  {
    id: 4,
    label: "Share Link",
    icon: Share2,
    color: "bg-gray-100 text-primary border-gray-200",
    dotColor: "bg-primary",
    arrowPos: { top: "20%", right: "8%" },
    arrowDir: "left",
    title: "Step 5 — Share Securely in One Click",
    description: "Generate a token-based shareable link. Recipients can view the full dashboard without any login or account — perfect for sharing with clients or investors.",
    mockHighlight: "share",
  },
  {
    id: 5,
    label: "Business Suite",
    icon: Building2,
    color: "bg-gray-100 text-primary border-gray-200",
    dotColor: "bg-primary",
    arrowPos: { top: "60%", right: "6%" },
    arrowDir: "left",
    title: "Step 6 — Full Business Operations Suite",
    description: "Beyond analytics: Team EOD tracking, AI Revenue Forecasting, Performance Improvement Plans, FY-aware reports, festival season intelligence — built for Indian MSMEs.",
    mockHighlight: "business",
  },
];

function ProductTour() {
  const [activeStep, setActiveStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = (step: number) => {
    if (animating) return;
    setAnimating(true);
    setActiveStep(step);
    setTimeout(() => setAnimating(false), 400);
  };

  const step = TOUR_STEPS[activeStep];

  return (
    <section className="py-24 px-4 bg-white border-t border-gray-100 relative overflow-hidden">
      <div className="mx-auto max-w-7xl relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center text-center mb-16"
        >
          <ElegantSub text="Interactive Product Tour" />
          <h2 className="font-sans font-normal text-4xl md:text-5xl text-primary mb-4">
            See Exactly How It Works
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto font-sans">
            Click each step to see a live walkthrough of the platform features.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Step buttons */}
          <div className="space-y-3">
            {TOUR_STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.button
                  key={i}
                  onClick={() => goTo(i)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid={`tour-step-${i}`}
                  className={`w-full text-left p-4 rounded-none border transition-all duration-300 flex items-start gap-4 ${activeStep === i
                      ? "border-primary bg-sidebar shadow-md"
                      : "border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 shadow-sm"
                    }`}
                >
                  <div className={`w-10 h-10 rounded-none border flex items-center justify-center flex-shrink-0 transition-all ${activeStep === i ? "bg-primary text-primary-foreground border-primary" : "bg-gray-50 text-gray-400 border-gray-100"
                    }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${activeStep === i ? "text-accent" : "text-gray-400"}`}>
                        0{i + 1}
                      </span>
                      <span className={`font-sans font-medium text-sm ${activeStep === i ? "text-primary" : "text-gray-500"}`}>
                        {s.label}
                      </span>
                      {activeStep === i && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-auto"
                        >
                          <ChevronRight className="w-4 h-4 text-accent" />
                        </motion.div>
                      )}
                    </div>
                    <AnimatePresence mode="wait">
                      {activeStep === i && (
                        <motion.p
                          key={i}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-gray-600 leading-relaxed font-sans mt-1"
                        >
                          {s.description}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              );
            })}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goTo(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="flex-1 rounded-none border-gray-200 text-gray-700 hover:border-primary hover:text-primary"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button
                size="sm"
                onClick={() => goTo(Math.min(TOUR_STEPS.length - 1, activeStep + 1))}
                disabled={activeStep === TOUR_STEPS.length - 1}
                className="flex-1 rounded-none bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Tour visual */}
          <div className="relative lg:sticky lg:top-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="bg-white rounded-none border border-gray-200 shadow-xl overflow-hidden"
              >
                {/* mock topbar */}
                <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-300" />
                    <div className="w-2 h-2 bg-gray-300" />
                    <div className="w-2 h-2 bg-gray-300" />
                  </div>
                  <div className="flex-1 h-5 bg-white border border-gray-100 flex items-center px-2 text-[10px] text-gray-400 font-mono">
                    datainsights.app
                  </div>
                </div>

                <div className="p-6 space-y-4 font-sans">
                  {/* step indicator */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-none border flex items-center justify-center bg-gray-50 border-gray-150 text-primary`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">Step 0{activeStep + 1}</div>
                      <div className="text-xs font-sans font-medium text-primary">{step.title.split("—")[1]?.trim()}</div>
                    </div>
                    <div className="ml-auto flex gap-1">
                      {TOUR_STEPS.map((_, i) => (
                        <motion.button
                          key={i}
                          onClick={() => goTo(i)}
                          className={`w-2 h-2 rounded-none transition-all ${i === activeStep ? "w-4 bg-accent" : "bg-gray-200"}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* dynamic content based on step */}
                  {(step.mockHighlight === "upload") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="border border-dashed border-gray-300 bg-sidebar p-8 text-center rounded-none">
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-12 h-12 bg-white border border-gray-100 rounded-none flex items-center justify-center mx-auto mb-3"
                        >
                          <Upload className="w-6 h-6 text-accent" />
                        </motion.div>
                        <p className="text-xs font-medium text-primary mb-1">Drop your Excel / CSV here</p>
                        <p className="text-[10px] text-gray-400">or connect Google Sheets →</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-white border border-gray-200 rounded-none p-3 flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-accent" />
                          <span className="text-xs text-primary font-medium">sales_data.xlsx</span>
                          <motion.div
                            className="ml-auto w-3.5 h-3.5 border-2 border-accent border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {(step.mockHighlight === "kpi") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-6 h-6 bg-gray-50 border border-gray-100 rounded-none flex items-center justify-center"
                        >
                          <Brain className="w-3.5 h-3.5 text-accent" />
                        </motion.div>
                        <span className="text-xs font-sans text-gray-600">AI is analyzing your data...</span>
                      </div>
                      {["Identifying key metrics", "Detecting date columns", "Choosing chart types", "Generating insights"].map((t, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.25 }}
                          className="flex items-center gap-2 text-xs text-gray-600"
                        >
                          <motion.div
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                          </motion.div>
                          {t}
                        </motion.div>
                      ))}
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        className="h-1 bg-accent rounded-none mt-2"
                      />
                    </motion.div>
                  )}

                  {(step.mockHighlight === "chart") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Revenue", value: "₹2.48L", color: "text-primary" },
                          { label: "Deals", value: "847", color: "text-accent" },
                          { label: "Growth", value: "+24%", color: "text-gray-800" },
                        ].map((k, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-gray-50 rounded-none p-3 border border-gray-100"
                          >
                            <div className="text-[9px] uppercase tracking-wider text-gray-400">{k.label}</div>
                            <div className={`text-xs font-sans font-medium ${k.color}`}>{k.value}</div>
                          </motion.div>
                        ))}
                      </div>
                      <div className="bg-gray-50 rounded-none p-4 border border-gray-100">
                        <div className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Monthly Revenue</div>
                        <MiniChart values={[40, 55, 50, 68, 60, 80, 75, 90, 85, 95, 88, 97]} delay={0.3} />
                      </div>
                    </motion.div>
                  )}

                  {(step.mockHighlight === "chat") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 font-sans">
                      <div className="space-y-2">
                        <div className="flex justify-end">
                          <div className="bg-primary text-primary-foreground text-[10px] rounded-none px-3 py-2 max-w-[80%]">
                            What drove revenue last month?
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 bg-accent flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-gray-50 text-gray-700 text-[10px] border border-gray-100 rounded-none px-3 py-2 max-w-[85%] leading-relaxed"
                          >
                            <span className="font-semibold text-primary">AI Insight:</span> Festival season was the key driver — Diwali week contributed 38% of the month's revenue. Sales team added 3 new clients.
                          </motion.div>
                        </div>
                        <div className="flex justify-end">
                          <div className="bg-primary text-primary-foreground text-[10px] rounded-none px-3 py-2 max-w-[80%]">
                            Forecast for next quarter?
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 bg-accent flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1 }}
                            className="bg-gray-50 text-gray-700 text-[10px] border border-gray-100 rounded-none px-3 py-2 max-w-[85%]"
                          >
                            Q3 forecast: ₹3.1L with 92% confidence interval.
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {(step.mockHighlight === "share") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="bg-gray-50 rounded-none p-4 border border-gray-100">
                        <div className="text-[9px] uppercase tracking-wider text-gray-400 mb-2 font-semibold">Shareable Link Generated</div>
                        <div className="flex items-center gap-2 bg-white rounded-none border border-gray-200 p-2">
                          <span className="text-[10px] text-gray-500 flex-1 truncate font-mono">datainsights.app/shared/abc123...</span>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="text-[9px] uppercase tracking-wider bg-primary text-primary-foreground px-2 py-1 rounded-none font-semibold"
                          >
                            Copy
                          </motion.button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-sidebar border border-sidebar-border rounded-none px-3 py-2.5">
                        <Eye className="w-3.5 h-3.5 text-accent" />
                        <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Anyone with this link can view — no login required</span>
                      </div>
                    </motion.div>
                  )}

                  {(step.mockHighlight === "business") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      {[
                        { icon: Users, label: "Team Performance", value: "12 members tracked" },
                        { icon: TrendingUp, label: "AI Revenue Forecast", value: "₹3.1L next quarter" },
                        { icon: Target, label: "PIP Generated", value: "2 members flagged" },
                        { icon: Building2, label: "EOD Reports", value: "Today: 9/12 submitted" },
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-3 bg-gray-50 rounded-none p-3 border border-gray-100"
                        >
                          <div className={`w-8 h-8 rounded-none flex items-center justify-center bg-white border border-gray-100 text-accent`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 font-sans">
                            <div className="text-[9px] uppercase tracking-wider text-gray-400">{item.label}</div>
                            <div className="text-xs font-semibold text-primary">{item.value}</div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── scroll animation config ─────────────────────────────────── */
const scrollFadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

/* ─────────────────── stats ticker ──────────────────────────────────────────── */
/* ─────────────────── scroll animated stats section ────────────────────────── */
function AnimatedStatsSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Animated sliding values
  const x1 = useTransform(scrollYProgress, [0, 1], ["-30%", "40%"]);
  const x2 = useTransform(scrollYProgress, [0, 1], ["30%", "-50%"]);
  const x3 = useTransform(scrollYProgress, [0, 1], ["-10%", "50%"]);

  return (
    <section ref={containerRef} className="py-24 md:py-32 bg-[#F6E3AD] border-y border-gray-200 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-16 md:gap-0 relative">
          
          {/* Left Side: Statement */}
          <div className="md:pr-16 md:sticky md:top-32 self-start">
            <ElegantSub text="By The Numbers" centered={false} />
            <h2 className="font-sans font-normal text-3xl md:text-4xl lg:text-[2.6rem] leading-[1.15] text-primary tracking-[-0.01em] mt-8">
              From raw data to a clearly executed strategy, our insights speak for themselves.
            </h2>
          </div>

          {/* Right Side: Animated Graphic & Big Stat */}
          <div className="md:pl-16 relative md:border-l border-primary/10">
            {/* Geometric Graphic */}
            <div className="h-56 relative mb-12 flex flex-col justify-center gap-12 max-w-md mx-auto md:mx-0">
              {/* Track 1 */}
              <div className="relative w-full h-[1px] bg-primary/20">
                <motion.div 
                  style={{ x: x1 }}
                  className="absolute top-1/2 -translate-y-1/2 left-[15%] w-20 h-7 border-[1.5px] border-primary bg-transparent"
                />
              </div>
              {/* Track 2 */}
              <div className="relative w-full h-[1px] bg-primary/20">
                <motion.div 
                  style={{ x: x2 }}
                  className="absolute top-1/2 -translate-y-1/2 left-[45%] w-28 h-9 bg-primary"
                />
              </div>
              {/* Track 3 */}
              <div className="relative w-full h-[1px] bg-primary/20">
                <motion.div 
                  style={{ x: x3 }}
                  className="absolute top-1/2 -translate-y-1/2 left-[10%] w-24 h-7 border-[1.5px] border-primary bg-transparent"
                />
              </div>
            </div>

            {/* Big Stat */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h3 className="font-sans font-normal text-[3rem] sm:text-[4rem] lg:text-[4.5rem] text-primary leading-[1.05] tracking-[-0.03em] mb-6">
                10,000+ Dashboards<br/>Generated
              </h3>
              <p className="text-[15px] font-sans text-primary/80 leading-[1.7] max-w-[420px]">
                Whether it's uncovering hidden revenue opportunities, securing accurate performance reports, or saving hours on manual entry, we seek impactful outcomes that advance the growth of your business.
              </p>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────────── feature list — editorial style ────────────────────────── */
function FeatureGrid({ title, badge, features }: {
  title: string; badge: string;
  features: { icon: React.ElementType; title: string; desc: string }[];
}) {
  return (
    <section className="py-24 px-4 relative bg-white border-t border-gray-100">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 pb-8 border-b border-gray-200">
          <motion.div {...scrollFadeUp} className="flex flex-col items-start">
            <ElegantSub text={badge} centered={false} />
            <h2
              className="font-sans font-normal text-3xl md:text-[3.2rem] text-primary leading-[1.1] tracking-[-0.152rem]"
              dangerouslySetInnerHTML={{ __html: title }}
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base text-gray-500 font-sans max-w-xs md:text-right leading-[1.7] tracking-[-0.01em]"
          >
            Everything you need to <strong className="font-semibold text-primary">run smarter</strong> — built for the <strong className="font-semibold text-primary">modern business</strong>.
          </motion.p>
        </div>

        {/* Editorial numbered rows */}
        <div className="divide-y divide-gray-100">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.06, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="group flex items-start gap-6 md:gap-12 py-8 cursor-default transition-colors duration-300 hover:bg-gray-50 px-2 -mx-2"
              >
                {/* Number */}
                <span className="font-sans text-[2.5rem] md:text-[3.5rem] font-normal text-gray-100 group-hover:text-gray-200 transition-colors duration-300 leading-none select-none flex-shrink-0 w-14 text-center">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Icon + Title */}
                <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-start gap-4 md:gap-10">
                  <div className="flex items-center gap-4 md:w-56 flex-shrink-0">
                    <div className="w-9 h-9 border border-gray-200 group-hover:border-accent group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center transition-all duration-300 flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <h3 className="font-sans font-normal text-lg md:text-xl text-primary relative">
                      <span className="relative inline-block">
                        {f.title}
                        <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-accent group-hover:w-full transition-all duration-500 ease-out" />
                      </span>
                    </h3>
                  </div>

                  {/* Description */}
                  <p
                    className="text-[15px] text-gray-500 leading-[1.75] font-sans flex-1 pt-0.5 tracking-[-0.005em]"
                    dangerouslySetInnerHTML={{ __html: f.desc }}
                  />
                </div>

                {/* Arrow indicator */}
                <div className="hidden md:flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-accent flex-shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── scroll zoom image section ──────────────────────────────── */
function ScrollingImageSection() {
  const { scrollY } = useScroll();

  // Scale from 1.0 to 1.15 and apply a smooth parallax translation as page scrolls down
  const scale = useTransform(scrollY, [0, 800], [1.0, 1.15]);
  const y = useTransform(scrollY, [0, 800], [0, 80]);

  return (
    <section className="pb-24 pt-0 px-4 bg-white overflow-hidden flex justify-center items-center border-b border-gray-150">
      <div className="mx-auto max-w-6xl w-full border border-gray-200 overflow-hidden bg-white shadow-2xl rounded-none">
        <div className="w-full h-[300px] md:h-[580px] relative overflow-hidden">
          <motion.div
            style={{ scale, y }}
            className="w-full h-full"
          >
            <img
              src="/law-firm.jpg"
              alt="Office Collaboration"
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

import { logOut } from "@/lib/firebase";

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // For demo purposes: Whenever a user hits the landing page, clear any previous session.
    // This ensures that clicking "Sign In" will always show the Login page instead of skipping to the dashboard.
    logOut();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-white relative">
      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2"
          >
            <span className="font-sans font-medium text-xl text-primary tracking-wide">DigitValues</span>
          </motion.div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              asChild
              data-testid="button-signin"
              className="text-xs uppercase tracking-wider text-gray-600 hover:text-accent font-sans font-semibold shadow-none"
            >
              <a href="/login">Sign In</a>
            </Button>
            <Button
              asChild
              data-testid="button-signup"
              className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none"
            >
              <a href="/login">Start My Free Audit</a>
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-36 pb-12 px-4 sm:px-6 relative bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <ElegantSub text="AI-Powered Analytics Platform" centered={true} />

              <h1 className="font-sans font-normal text-[2.5rem] md:text-[4rem] lg:text-[5rem] leading-[1.1] tracking-[-0.152rem] text-primary mb-8 max-w-4xl">
                It's always personal when your business is involved. That's why leaders turn to DataInsights.
              </h1>

              <p className="text-base text-gray-600 mb-10 max-w-2xl leading-[1.7] font-sans tracking-[-0.01em]">
                Turn <strong className="font-semibold text-primary">complex spreadsheets</strong> into beautiful, actionable dashboards in <strong className="font-semibold text-primary">under 30 seconds</strong>.
                Ask questions in plain English and let <strong className="font-semibold text-primary">AI reveal the insights</strong> hidden in your data.
              </p>

              <div className="flex flex-wrap gap-4 justify-center mb-10">
                <Button
                  size="lg"
                  asChild
                  data-testid="button-hero-start"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs uppercase tracking-wider font-semibold rounded-none h-12 px-6 shadow-none"
                >
                  <a href="/login" className="flex items-center gap-2">
                    Start My Free Audit
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  data-testid="button-hero-signin"
                  className="h-12 px-6 text-xs uppercase tracking-wider font-semibold border-gray-250 text-gray-700 hover:border-primary hover:text-primary rounded-none"
                >
                  <a href="/login">Sign In</a>
                </Button>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-6 pt-8 border-t border-gray-100 font-sans text-xs w-full max-w-xl">
                {["Enterprise Ready", "SOC 2 Compliant", "GDPR Friendly", "256-bit Encryption"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SCROLLING ZOOM IMAGE ── */}
      <ScrollingImageSection />

      {/* ── ANIMATED STATS SECTION ── */}
      <AnimatedStatsSection />

      {/* ── INTERACTIVE PRODUCT TOUR ── */}
      <ProductTour />

      {/* ── ANALYTICS FEATURES ── */}
      <FeatureGrid
        badge="Analytics Suite"
        title='Powerful Analytics, <span class="text-accent">Zero Complexity</span>'
        features={[
          { icon: Sparkles, title: "AI-Powered Dashboards", desc: "<strong>Gemini AI</strong> generates KPIs, charts, and insights <strong>automatically</strong> from your raw data." },
          { icon: MessageSquare, title: "Natural Language Chat", desc: 'Ask <strong>"What drove revenue?"</strong> and get instant, data-backed answers in <strong>plain English</strong>.' },
          { icon: TrendingUp, title: "Predictive Insights", desc: "<strong>Revenue forecasts</strong> and trend analysis powered by AI for <strong>strategic planning</strong>." },
          { icon: Share2, title: "One-Click Sharing", desc: "<strong>Token-based shareable links.</strong> Viewers need no account — perfect for <strong>clients & investors</strong>." },
          { icon: Zap, title: "Under 30 Seconds", desc: "From data upload to <strong>actionable dashboard</strong> in under <strong>30 seconds</strong>. No setup needed." },
          { icon: Shield, title: "Enterprise Security", desc: "<strong>256-bit encryption</strong>, SOC 2 compliant, GDPR-friendly. Your data <strong>never leaves your control</strong>." },
        ]}
      />

      {/* ── BUSINESS SUITE FEATURES ── */}
      <div className="bg-sidebar border-t border-gray-100">
        <FeatureGrid
          badge="Business Suite — For Indian MSMEs"
          title='Complete Business Operations <span class="text-accent">Platform</span>'
          features={[
            { icon: Users, title: "Team Management", desc: "<strong>Owner, Manager, Employee</strong> roles with invite system and <strong>salary configuration</strong>." },
            { icon: Target, title: "AI Revenue Forecasting", desc: "AI predicts <strong>quarterly revenue trends</strong> using your <strong>historical EOD data</strong>." },
            { icon: BarChart3, title: "Industry-Adaptive EOD", desc: "Employees log <strong>daily performance</strong> with industry-specific metric labels — Visits, Deals, Consultations." },
            { icon: LineChart, title: "Festival Intelligence", desc: "<strong>Diwali, Navratri, Holi</strong> — dashboards automatically flag <strong>festival season patterns</strong>." },
            { icon: Brain, title: "Business Advisor AI", desc: "AI-generated <strong>Performance Improvement Plans</strong> and <strong>strategy recommendations</strong>." },
            { icon: Clock, title: "FY-Aware Analytics", desc: "<strong>April–March fiscal year</strong> with constrained month selectors and <strong>YTD reports</strong>." },
          ]}
        />
      </div>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-4 relative bg-white border-t border-gray-100">
        <div className="mx-auto max-w-7xl">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-gray-200 mb-0">
            <motion.div {...scrollFadeUp} className="flex flex-col items-start">
              <ElegantSub text="Client Voices" centered={false} />
              <h2 className="font-sans font-normal text-3xl md:text-5xl text-primary leading-tight">
                Trusted by teams<br />across India
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-base text-gray-500 font-sans max-w-xs md:text-right leading-[1.7] tracking-[-0.01em]"
            >
              Thousands of businesses rely on DataInsights for <strong className="font-semibold text-primary">clear, actionable data</strong> every day.
            </motion.p>
          </div>

          {/* Pull quotes — editorial rows */}
          <div className="divide-y divide-gray-100">
            {[
              { quote: "Transformed our data workflow. What took days now takes minutes. The AI insights are incredibly accurate.", author: "Priya Sharma", role: "Operations Head", company: "RetailCo India" },
              { quote: "The natural language chat is a game-changer. No SQL knowledge needed — just ask questions and get answers.", author: "Vikram Patel", role: "Business Manager", company: "TechStart" },
              { quote: "Finally a platform built for Indian businesses — FY April-March, festival intelligence, rupee formatting. Perfect.", author: "Anjali Desai", role: "Finance Director", company: "GrowthHub" },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="group py-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-16"
              >
                {/* Author */}
                <div className="flex-shrink-0 md:w-52 flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-2">
                  <div className="w-10 h-10 bg-primary flex items-center justify-center text-primary-foreground font-sans font-normal text-base flex-shrink-0">
                    {t.author[0]}
                  </div>
                  <div>
                    <div className="font-sans font-medium text-primary text-sm">{t.author}</div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-sans mt-0.5">{t.role}</div>
                    <div className="text-[10px] uppercase tracking-wider text-accent font-sans">{t.company}</div>
                  </div>
                </div>

                {/* Vertical divider */}
                <div className="hidden md:block w-px h-16 bg-gray-200 flex-shrink-0" />

                {/* Quote */}
                <p className="font-sans font-normal text-xl md:text-2xl text-primary leading-relaxed flex-1 group-hover:text-primary/80 transition-colors duration-300">
                  "{t.quote}"
                </p>

                {/* Stars */}
                <div className="hidden md:flex flex-col items-center gap-1 flex-shrink-0">
                  {[0,1,2,3,4].map(s => (
                    <span key={s} className="text-accent text-[10px] leading-none">★</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 bg-sidebar border-t border-gray-200 relative overflow-hidden">
        <div className="mx-auto max-w-4xl text-center relative">
          <motion.div
            {...scrollFadeUp}
            className="flex flex-col items-center"
          >
            <ElegantSub text="Get Started Today — It's Free" />
            <h2 className="font-sans font-normal text-3xl md:text-4xl text-primary mb-6">
              Ready to Illuminate Your Data?
            </h2>
            <p className="text-gray-500 mb-10 max-w-xl mx-auto text-sm font-sans">
              Join thousands of businesses using DataInsights. No credit card required. Upgrade anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs uppercase tracking-wider font-semibold rounded-none h-12 px-8 shadow-none"
              >
                <a href="/login" className="flex items-center gap-2">
                  Start Free Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-8 text-xs uppercase tracking-wider font-semibold border-gray-250 text-gray-700 hover:border-primary hover:text-primary rounded-none"
              >
                <a href="/login">View Demo</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-200 bg-white px-4 py-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {[
              { heading: "Product", links: ["Analytics Suite", "Business Suite", "Pricing", "Integrations"] },
              { heading: "Company", links: ["About", "Blog", "Careers", "Press"] },
              { heading: "Resources", links: ["Documentation", "Help Center", "Tutorials", "Status"] },
              { heading: "Legal", links: ["Privacy Policy", "Terms of Service", "Security", "GDPR"] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-sans font-medium text-primary mb-4 text-sm">{col.heading}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link, j) => {
                    const href = 
                      link === "Privacy Policy" ? "/privacy" : 
                      link === "Terms of Service" ? "/terms" : 
                      (link === "Help Center" || link === "Status") ? "/support" : "#";
                    return (
                      <li key={j}>
                        <a href={href} className="text-xs text-gray-500 hover:text-accent font-sans transition-colors">{link}</a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-205 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="font-sans font-medium text-lg text-primary tracking-wide">DigitValues</span>
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-sans">© 2026 DigitValues. Built for Indian MSMEs. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
