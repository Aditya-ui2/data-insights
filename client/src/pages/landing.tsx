import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BarChart3, MessageSquare, Share2, Sparkles, TrendingUp, Zap,
  Upload, Brain, LineChart, Shield, Clock, Users, ArrowRight,
  CheckCircle2, Quote, Target, Building2, ChevronRight,
  ChevronLeft, X, Play, FileSpreadsheet, Bot, Eye,
} from "lucide-react";

/* ─────────────────── floating micro-orbs (subtle, cream theme) ─────────────── */
function FloatingOrb({ delay, duration, size, left, top, color = "amber" }: {
  delay: number; duration: number; size: number; left: string; top: string; color?: string;
}) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl pointer-events-none ${color === "amber" ? "bg-amber-400/20" : "bg-yellow-300/15"}`}
      style={{ width: size, height: size, left, top }}
      animate={{ y: [0, -30, 0], x: [0, 15, 0], opacity: [0.15, 0.35, 0.15] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ─────────────────── shimmer badge ─────────────────────────────────────────── */
function ShimmerBadge({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-50 border border-amber-200 mb-8 relative overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-100/60 to-transparent"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      />
      <Sparkles className="w-4 h-4 text-amber-600" />
      <span className="text-sm font-semibold text-amber-700 relative">{text}</span>
    </motion.div>
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
          className="flex-1 rounded-t-sm bg-gradient-to-t from-amber-600 to-amber-400"
        />
      ))}
    </div>
  );
}

/* ─────────────────── dashboard mock card ────────────────────────────────────── */
function DashboardMock() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
      className="relative"
    >
      {/* glow ring */}
      <div className="absolute -inset-4 bg-gradient-to-br from-amber-400/20 to-amber-600/10 rounded-3xl blur-2xl" />
      
      <div className="relative bg-white rounded-2xl border border-amber-100 shadow-2xl shadow-amber-500/20 p-6 space-y-4">
        {/* topbar */}
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="ml-2 flex-1 h-5 bg-gray-100 rounded-md text-[10px] text-gray-400 flex items-center px-2">datainsights.app/dashboard</div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Revenue", value: "₹2.48L", delta: "+24.5%", color: "text-amber-600" },
            { label: "Team Size", value: "12", delta: "+3 new", color: "text-green-600" },
            { label: "Deals", value: "847", delta: "+18.2%", color: "text-blue-600" },
          ].map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="bg-gray-50 rounded-xl p-3 border border-gray-100"
            >
              <div className="text-[10px] text-gray-400 mb-1">{kpi.label}</div>
              <div className={`text-base font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-[9px] text-green-600 flex items-center gap-0.5 mt-0.5">
                <TrendingUp className="w-2.5 h-2.5" />{kpi.delta}
              </div>
            </motion.div>
          ))}
        </div>

        {/* chart */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="text-[10px] text-gray-400 mb-3 font-medium">Revenue Trend</div>
          <MiniChart values={[40, 55, 50, 70, 60, 82, 75, 90, 85, 95, 88, 97]} delay={0.9} />
        </div>

        {/* AI chat bubble */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5 }}
          className="flex items-start gap-2 bg-amber-50 rounded-xl p-3 border border-amber-100"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
            <Bot className="w-3 h-3 text-white" />
          </div>
          <div className="text-[10px] text-amber-800 leading-relaxed">
            <span className="font-semibold">AI Insight:</span> Revenue grew 24.5% driven by festival season. Q3 forecast: ₹3.1L
          </div>
        </motion.div>
      </div>

      {/* floating badge */}
      <motion.div
        animate={{ y: [0, -8, 0], rotate: [0, 4, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-5 -right-5 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl px-4 py-2.5 shadow-lg shadow-amber-500/40 text-xs font-semibold flex items-center gap-1.5"
      >
        <Sparkles className="w-3.5 h-3.5" /> AI Powered
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-4 -left-4 bg-white rounded-xl px-3 py-2 shadow-lg border border-gray-100 text-xs font-semibold text-gray-700 flex items-center gap-1.5"
      >
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
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
    color: "bg-blue-100 text-blue-600 border-blue-200",
    dotColor: "bg-blue-500",
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
    color: "bg-purple-100 text-purple-600 border-purple-200",
    dotColor: "bg-purple-500",
    arrowPos: { top: "38%", left: "30%" },
    arrowDir: "right",
    title: "Step 2 — Gemini AI Analyzes",
    description: "Gemini 2.5 Flash scans your data in seconds — identifies key metrics, picks optimal chart types, and surfaces hidden patterns you might have missed.",
    mockHighlight: "kpi",
  },
  {
    id: 2,
    label: "Auto Dashboards",
    icon: BarChart3,
    color: "bg-amber-100 text-amber-600 border-amber-200",
    dotColor: "bg-amber-500",
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
    color: "bg-green-100 text-green-600 border-green-200",
    dotColor: "bg-green-500",
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
    color: "bg-teal-100 text-teal-600 border-teal-200",
    dotColor: "bg-teal-500",
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
    color: "bg-rose-100 text-rose-600 border-rose-200",
    dotColor: "bg-rose-500",
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
    <section className="py-24 px-4 bg-gradient-to-b from-amber-50/50 to-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.08)_0%,_transparent_70%)]" />
      <div className="mx-auto max-w-7xl relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <ShimmerBadge text="Interactive Product Tour" />
          <h2 className="font-bold text-4xl md:text-5xl text-gray-900 mb-4">
            See Exactly How It{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700">
              Works
            </span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
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
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 flex items-start gap-4 ${
                    activeStep === i
                      ? "border-amber-400 bg-amber-50 shadow-lg shadow-amber-100"
                      : "border-transparent bg-white hover:bg-gray-50 hover:border-gray-200 shadow-sm"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all ${
                    activeStep === i ? s.color : "bg-gray-100 text-gray-400 border-gray-200"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase tracking-wider ${activeStep === i ? "text-amber-600" : "text-gray-400"}`}>
                        0{i + 1}
                      </span>
                      <span className={`font-semibold text-sm ${activeStep === i ? "text-gray-900" : "text-gray-500"}`}>
                        {s.label}
                      </span>
                      {activeStep === i && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-auto"
                        >
                          <ChevronRight className="w-4 h-4 text-amber-500" />
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
                          className="text-sm text-gray-600 leading-relaxed"
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
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button
                size="sm"
                onClick={() => goTo(Math.min(TOUR_STEPS.length - 1, activeStep + 1))}
                disabled={activeStep === TOUR_STEPS.length - 1}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
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
                className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden"
              >
                {/* mock topbar */}
                <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 h-5 bg-white rounded-md border border-gray-200 flex items-center px-2 text-[10px] text-gray-400">
                    datainsights.app
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* step indicator */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${step.color}`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Step 0{activeStep + 1}</div>
                      <div className="text-sm font-bold text-gray-800">{step.title.split("—")[1]?.trim()}</div>
                    </div>
                    <div className="ml-auto flex gap-1">
                      {TOUR_STEPS.map((_, i) => (
                        <motion.button
                          key={i}
                          onClick={() => goTo(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === activeStep ? "w-6 bg-amber-500" : "bg-gray-200"}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* dynamic content based on step */}
                  {(step.mockHighlight === "upload") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-2xl p-8 text-center">
                        <motion.div
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3"
                        >
                          <Upload className="w-7 h-7 text-amber-600" />
                        </motion.div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Drop your Excel / CSV here</p>
                        <p className="text-xs text-gray-400">or connect Google Sheets →</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                          <span className="text-xs text-blue-700 font-medium">sales_data.xlsx</span>
                          <motion.div
                            className="ml-auto w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent"
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
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center"
                        >
                          <Brain className="w-4 h-4 text-purple-600" />
                        </motion.div>
                        <span className="text-xs font-semibold text-gray-600">AI is analyzing your data...</span>
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
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                          </motion.div>
                          {t}
                        </motion.div>
                      ))}
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        className="h-1.5 bg-purple-400 rounded-full mt-2"
                      />
                    </motion.div>
                  )}

                  {(step.mockHighlight === "chart") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Revenue", value: "₹2.48L", color: "text-amber-600" },
                          { label: "Deals", value: "847", color: "text-blue-600" },
                          { label: "Growth", value: "+24%", color: "text-green-600" },
                        ].map((k, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                          >
                            <div className="text-[9px] text-gray-400">{k.label}</div>
                            <div className={`text-sm font-bold ${k.color}`}>{k.value}</div>
                          </motion.div>
                        ))}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="text-[10px] text-gray-400 mb-2">Monthly Revenue</div>
                        <MiniChart values={[40, 55, 50, 68, 60, 80, 75, 90, 85, 95, 88, 97]} delay={0.3} />
                      </div>
                    </motion.div>
                  )}

                  {(step.mockHighlight === "chat") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-end">
                          <div className="bg-amber-600 text-white text-xs rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%]">
                            What drove revenue last month?
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-gray-100 text-gray-700 text-xs rounded-2xl rounded-bl-sm px-3 py-2 max-w-[85%] leading-relaxed"
                          >
                            Festival season was the key driver — Diwali week contributed 38% of the month's revenue. Sales team added 3 new clients.
                          </motion.div>
                        </div>
                        <div className="flex justify-end">
                          <div className="bg-amber-600 text-white text-xs rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%]">
                            Forecast for next quarter?
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1 }}
                            className="bg-gray-100 text-gray-700 text-xs rounded-2xl rounded-bl-sm px-3 py-2 max-w-[85%]"
                          >
                            Q3 forecast: ₹3.1L with 92% confidence interval.
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {(step.mockHighlight === "share") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="text-[10px] text-gray-400 mb-2 font-semibold">Shareable Link Generated</div>
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
                          <span className="text-[10px] text-gray-500 flex-1 truncate">datainsights.app/shared/abc123...</span>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="text-[10px] bg-amber-500 text-white px-2 py-1 rounded-md font-semibold"
                          >
                            Copy
                          </motion.button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                        <Eye className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs text-green-700">Anyone with this link can view — no login required</span>
                      </div>
                    </motion.div>
                  )}

                  {(step.mockHighlight === "business") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      {[
                        { icon: Users, label: "Team Performance", value: "12 members tracked", color: "bg-blue-50 text-blue-600" },
                        { icon: TrendingUp, label: "AI Revenue Forecast", value: "₹3.1L next quarter", color: "bg-amber-50 text-amber-600" },
                        { icon: Target, label: "PIP Generated", value: "2 members flagged", color: "bg-rose-50 text-rose-600" },
                        { icon: Building2, label: "EOD Reports", value: "Today: 9/12 submitted", color: "bg-purple-50 text-purple-600" },
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color.split(" ")[0]}`}>
                            <item.icon className={`w-4 h-4 ${item.color.split(" ")[1]}`} />
                          </div>
                          <div className="flex-1">
                            <div className="text-[10px] text-gray-400">{item.label}</div>
                            <div className="text-xs font-semibold text-gray-700">{item.value}</div>
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

/* ─────────────────── stats ticker ──────────────────────────────────────────── */
function StatsTicker() {
  const stats = [
    { value: "10K+", label: "Dashboards Created", icon: BarChart3 },
    { value: "<30s", label: "Avg Generation Time", icon: Clock },
    { value: "12+", label: "Industry Templates", icon: Building2 },
    { value: "99.9%", label: "Uptime Guarantee", icon: Shield },
  ];
  return (
    <section className="py-16 px-4 border-y border-amber-100 bg-gradient-to-r from-amber-50 via-white to-amber-50 relative overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="text-center"
            >
              <motion.div
                whileHover={{ scale: 1.08 }}
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 mb-4"
              >
                <stat.icon className="w-7 h-7 text-amber-600" />
              </motion.div>
              <div className="text-3xl md:text-4xl font-bold text-amber-600 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── feature grid ──────────────────────────────────────────── */
function FeatureGrid({ title, badge, features }: {
  title: string; badge: string;
  features: { icon: React.ElementType; title: string; desc: string }[];
}) {
  return (
    <section className="py-24 px-4 relative">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <ShimmerBadge text={badge} />
          <h2 className="font-bold text-4xl md:text-5xl text-gray-900 mb-4"
            dangerouslySetInnerHTML={{ __html: title }}
          />
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-6 h-full bg-white border border-gray-100 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-50 group cursor-pointer transition-all duration-300">
                  <motion.div
                    whileHover={{ scale: 1.12, rotate: 6 }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center mb-5 border border-amber-100"
                  >
                    <Icon className="w-7 h-7 text-amber-600" />
                  </motion.div>
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── main export ────────────────────────────────────────────── */
export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0.6]);
  const heroScale = useTransform(scrollYProgress, [0, 0.12], [1, 0.97]);

  return (
    <div ref={containerRef} className="min-h-screen bg-white relative">
      {/* subtle warm background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,_rgba(251,191,36,0.12)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingOrb delay={0} duration={10} size={500} left="5%" top="5%" />
        <FloatingOrb delay={2} duration={13} size={350} left="70%" top="0%" />
        <FloatingOrb delay={4} duration={11} size={300} left="80%" top="60%" />
        <FloatingOrb delay={1} duration={12} size={250} left="10%" top="70%" />
      </div>

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-md shadow-amber-200">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 tracking-tight">DataInsights</span>
          </motion.div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="outline"
              asChild
              data-testid="button-signin"
              className="border-gray-200 text-gray-700 hover:border-amber-300 hover:text-amber-700"
            >
              <a href="/login">Sign In</a>
            </Button>
            <Button
              asChild
              data-testid="button-signup"
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md shadow-amber-200"
            >
              <a href="/login">Start My Free Audit</a>
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <motion.section
        className="pt-36 pb-28 px-4 sm:px-6 relative"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* left */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <ShimmerBadge text="AI-Powered Analytics Platform" />

              <h1 className="font-bold text-5xl md:text-6xl lg:text-7xl leading-[1.08] text-gray-900 mb-6">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="block"
                >
                  Illuminate Every
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700"
                >
                  Decision
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="block"
                >
                  with Data
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="text-lg text-gray-500 mb-10 max-w-lg leading-relaxed"
              >
                Turn complex spreadsheets into beautiful, actionable dashboards in seconds. 
                Ask questions in plain English and let AI reveal the insights hidden in your data.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="flex flex-wrap gap-4 mb-10"
              >
                <Button
                  size="lg"
                  asChild
                  data-testid="button-hero-start"
                  className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg shadow-amber-200 group h-12 px-7 text-base"
                >
                  <a href="/login">
                    Start My Free Audit
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </motion.span>
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  data-testid="button-hero-signin"
                  className="h-12 px-7 text-base border-gray-200 text-gray-700 hover:border-amber-300 hover:text-amber-700"
                >
                  <a href="/login">Sign In</a>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex flex-wrap items-center gap-6 pt-8 border-t border-gray-100"
              >
                {["Enterprise Ready", "SOC 2 Compliant", "GDPR Friendly", "256-bit Encryption"].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.3 + i * 0.1 }}
                    className="flex items-center gap-2 text-sm text-gray-400"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* right: dashboard mock */}
            <DashboardMock />
          </div>
        </div>
      </motion.section>

      {/* ── STATS ── */}
      <StatsTicker />

      {/* ── INTERACTIVE PRODUCT TOUR ── */}
      <ProductTour />

      {/* ── ANALYTICS FEATURES ── */}
      <FeatureGrid
        badge="Analytics Suite"
        title='Powerful Analytics, <span class="text-amber-600">Zero Complexity</span>'
        features={[
          { icon: Sparkles, title: "AI-Powered Dashboards", desc: "Gemini AI generates KPIs, charts, and insights automatically from your raw data." },
          { icon: MessageSquare, title: "Natural Language Chat", desc: 'Ask "What drove revenue?" and get instant, data-backed answers in plain English.' },
          { icon: TrendingUp, title: "Predictive Insights", desc: "Revenue forecasts and trend analysis powered by AI for strategic planning." },
          { icon: Share2, title: "One-Click Sharing", desc: "Token-based shareable links. Viewers need no account — perfect for clients." },
          { icon: Zap, title: "Under 30 Seconds", desc: "From data upload to actionable dashboard in under 30 seconds. No setup needed." },
          { icon: Shield, title: "Enterprise Security", desc: "256-bit encryption, SOC 2 compliant, GDPR-friendly. Your data never leaves your control." },
        ]}
      />

      {/* ── BUSINESS SUITE FEATURES ── */}
      <div className="bg-amber-50/50">
        <FeatureGrid
          badge="Business Suite — For Indian MSMEs"
          title='Complete Business Operations <span class="text-amber-600">Platform</span>'
          features={[
            { icon: Users, title: "Team Management", desc: "Owner, Manager, Employee roles with invite system and salary configuration." },
            { icon: Target, title: "AI Revenue Forecasting", desc: "AI predicts quarterly revenue trends using your historical EOD data." },
            { icon: BarChart3, title: "Industry-Adaptive EOD", desc: "Employees log daily performance with industry-specific metric labels (Visits, Deals, Consultations)." },
            { icon: LineChart, title: "Festival Intelligence", desc: "Diwali, Navratri, Holi — dashboards automatically flag festival season patterns." },
            { icon: Brain, title: "Business Advisor AI", desc: "AI-generated Performance Improvement Plans and strategy recommendations." },
            { icon: Clock, title: "FY-Aware Analytics", desc: "April–March fiscal year with constrained month selectors and YTD reports." },
          ]}
        />
      </div>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-4 relative">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <ShimmerBadge text="Trusted by Businesses" />
            <h2 className="font-bold text-4xl md:text-5xl text-gray-900 mb-4">
              Loved by{" "}
              <span className="text-amber-600">Data Teams</span>{" "}Everywhere
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: "Transformed our data workflow. What took days now takes minutes. The AI insights are incredibly accurate.", author: "Priya Sharma", role: "Operations Head", company: "RetailCo India" },
              { quote: "The natural language chat is a game-changer. No SQL knowledge needed — just ask questions and get answers.", author: "Vikram Patel", role: "Business Manager", company: "TechStart" },
              { quote: "Finally a platform built for Indian businesses — FY April-March, festival intelligence, rupee formatting. Perfect.", author: "Anjali Desai", role: "Finance Director", company: "GrowthHub" },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
              >
                <Card className="p-7 h-full relative overflow-visible bg-white border border-gray-100 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-50 transition-all">
                  <Quote className="w-8 h-8 text-amber-100 absolute -top-1 -left-1" />
                  <div className="flex gap-0.5 mb-5">
                    {[0,1,2,3,4].map(s => (
                      <motion.div
                        key={s}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.12 + s * 0.06 }}
                        className="w-4 h-4 text-amber-400 fill-amber-400"
                      >
                        ★
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-gray-600 mb-7 leading-relaxed text-sm relative z-10">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow">
                      {t.author[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{t.author}</div>
                      <div className="text-xs text-gray-400">{t.role}, {t.company}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 bg-gradient-to-b from-amber-50/60 to-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(251,191,36,0.15)_0%,_transparent_70%)]" />
        <div className="mx-auto max-w-4xl text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <ShimmerBadge text="Get Started Today — It's Free" />
            <h2 className="font-bold text-4xl md:text-5xl text-gray-900 mb-6">
              Ready to Illuminate Your Data?
            </h2>
            <p className="text-gray-500 mb-10 max-w-xl mx-auto text-lg">
              Join thousands of businesses using DataInsights. No credit card required. Upgrade anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-xl shadow-amber-200 group text-base h-13 px-10"
              >
                <a href="/login">
                  Start Free Now
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-13 px-10 text-base border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700"
              >
                <a href="/login">View Demo</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 bg-gray-50 px-4 py-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {[
              { heading: "Product", links: ["Analytics Suite", "Business Suite", "Pricing", "Integrations"] },
              { heading: "Company", links: ["About", "Blog", "Careers", "Press"] },
              { heading: "Resources", links: ["Documentation", "Help Center", "Tutorials", "Status"] },
              { heading: "Legal", links: ["Privacy Policy", "Terms of Service", "Security", "GDPR"] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold text-gray-800 mb-4 text-sm">{col.heading}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="text-sm text-gray-400 hover:text-amber-600 transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-800">DataInsights</span>
            </div>
            <p className="text-sm text-gray-400">© 2024 DataInsights. Built for Indian MSMEs. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
