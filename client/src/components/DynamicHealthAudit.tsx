import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, AlertTriangle, TrendingUp, Sparkles, 
  ChevronRight, RotateCcw, CheckCircle2, Target 
} from "lucide-react";

// Mock questions - will eventually come from AI backend
const MOCK_QUESTIONS = [
  "I have real-time access to daily performance metrics.",
  "My team's expense tracking is fully digitized.",
  "Revenue data from all business verticals is consolidated in one place.",
  "I can generate financial reports without manual data entry.",
  "My inventory or service delivery is tracked with automated systems.",
  "Customer data and interactions are logged systematically.",
  "My team submits end-of-day reports through a digital workflow.",
  "I use data-driven insights to make strategic business decisions.",
];

const LIKERT_OPTIONS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Agree" },
  { value: 4, label: "Strongly Agree" },
];

type HealthStatus = "high-risk" | "stagnant" | "optimized";

interface StatusConfig {
  status: HealthStatus;
  label: string;
  description: string;
  icon: typeof AlertTriangle;
  color: string;
  bgColor: string;
  borderColor: string;
}

const getStatusConfig = (score: number): StatusConfig => {
  if (score < 16) {
    return {
      status: "high-risk",
      label: "High Risk",
      description: "Manual Operations",
      icon: AlertTriangle,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
    };
  } else if (score <= 24) {
    return {
      status: "stagnant",
      label: "Stagnant",
      description: "Growth Bottlenecked",
      icon: TrendingUp,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
    };
  } else {
    return {
      status: "optimized",
      label: "Optimized",
      description: "Ready for AI",
      icon: Sparkles,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
    };
  }
};

export default function DynamicHealthAudit() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = MOCK_QUESTIONS.length;
  const progress = (answeredCount / totalQuestions) * 100;
  const isComplete = answeredCount === totalQuestions;

  const totalScore = useMemo(() => {
    return Object.values(answers).reduce((sum, val) => sum + val, 0);
  }, [answers]);

  const maxScore = totalQuestions * 4; // 32

  const handleSelect = (questionIndex: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  };

  const handleSubmit = () => {
    if (isComplete) {
      setIsSubmitted(true);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setIsSubmitted(false);
  };

  const statusConfig = getStatusConfig(totalScore);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-4">
            <Activity className="w-4 h-4" />
            Business Health Audit
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            How Healthy is Your Business Operations?
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Answer 8 quick questions to discover your operational efficiency score
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              key="questions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Progress</span>
                  <span className="text-sm font-medium text-yellow-400">
                    {answeredCount} / {totalQuestions} answered
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {MOCK_QUESTIONS.map((question, qIndex) => (
                  <motion.div
                    key={qIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: qIndex * 0.05 }}
                    className={`p-5 rounded-xl border transition-all duration-300 ${
                      answers[qIndex]
                        ? "bg-gray-800/50 border-yellow-500/30"
                        : "bg-gray-800/30 border-gray-700/50"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-500/10 text-yellow-400 text-sm font-semibold flex items-center justify-center">
                        {qIndex + 1}
                      </span>
                      <p className="text-gray-100 font-medium leading-relaxed">
                        {question}
                      </p>
                    </div>

                    {/* Likert Options */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-10">
                      {LIKERT_OPTIONS.map((option) => {
                        const isSelected = answers[qIndex] === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleSelect(qIndex, option.value)}
                            className={`px-3 py-2.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 border-2 ${
                              isSelected
                                ? "bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20"
                                : "bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600 hover:bg-gray-750"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Submit Button */}
              <motion.div
                className="mt-8 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  onClick={handleSubmit}
                  disabled={!isComplete}
                  className={`group flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                    isComplete
                      ? "bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40"
                      : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                  }`}
                >
                  <Target className="w-5 h-5" />
                  Generate Health Report
                  {isComplete && (
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  )}
                </button>
              </motion.div>

              {!isComplete && (
                <p className="text-center text-gray-500 text-sm mt-3">
                  Please answer all questions to generate your report
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Score Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-850 border border-gray-700 p-8">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative">
                  <div className="text-center mb-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 mb-4"
                    >
                      <span className="text-3xl font-bold text-yellow-400">
                        {totalScore}
                      </span>
                    </motion.div>
                    <p className="text-gray-400 text-sm">out of {maxScore} points</p>
                  </div>

                  {/* Score Progress Ring */}
                  <div className="flex justify-center mb-8">
                    <div className="w-full max-w-md h-3 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, 
                            ${totalScore < 16 ? '#ef4444' : totalScore <= 24 ? '#f59e0b' : '#10b981'} 0%, 
                            ${totalScore < 16 ? '#f87171' : totalScore <= 24 ? '#fbbf24' : '#34d399'} 100%
                          )`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(totalScore / maxScore) * 100}%` }}
                        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={`flex items-center justify-center gap-3 p-4 rounded-xl ${statusConfig.bgColor} border ${statusConfig.borderColor}`}
                  >
                    <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                    <div className="text-center">
                      <p className={`font-semibold text-lg ${statusConfig.color}`}>
                        Status: {statusConfig.label}
                      </p>
                      <p className="text-gray-400 text-sm">
                        ({statusConfig.description})
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Insights Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                {["Strongly Disagree", "Disagree", "Agree", "Strongly Agree"].map(
                  (label, idx) => {
                    const count = Object.values(answers).filter(
                      (v) => v === idx + 1
                    ).length;
                    return (
                      <div
                        key={label}
                        className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 text-center"
                      >
                        <p className="text-2xl font-bold text-white mb-1">{count}</p>
                        <p className="text-xs text-gray-400">{label}</p>
                      </div>
                    );
                  }
                )}
              </motion.div>

              {/* CTA Block */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20 p-8"
              >
                <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
                
                <div className="relative flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-yellow-400" />
                    </div>
                  </div>
                  
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-bold text-white mb-2">
                      Bridge the Gap with Data Insights
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      Data Insights can bridge this gap. Launch your personalized 
                      <span className="text-yellow-400 font-medium"> Business Suite </span> 
                      to automate these workflows and unlock AI-powered analytics.
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    <button className="group flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40">
                      <CheckCircle2 className="w-5 h-5" />
                      Launch Business Suite
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Reset Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex justify-center"
              >
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-5 py-2.5 text-gray-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake Assessment
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
