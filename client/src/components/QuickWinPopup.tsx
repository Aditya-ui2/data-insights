import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  UserPlus, Upload, Sparkles, ArrowRight, X,
  Users, FileSpreadsheet, Brain, Zap, CheckCircle2
} from "lucide-react";

interface QuickWinPopupProps {
  suite: "business" | "analytics";
  isFirstVisit?: boolean;
  onDismiss?: () => void;
}

export default function QuickWinPopup({ suite, isFirstVisit = true, onDismiss }: QuickWinPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();

  // Check if user has seen this popup before
  useEffect(() => {
    if (!isFirstVisit) return;
    
    const seenKey = `quickwin_${suite}_seen`;
    const hasSeen = localStorage.getItem(seenKey);
    
    if (!hasSeen) {
      // Delay popup appearance for better UX
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [suite, isFirstVisit]);

  const handleDismiss = () => {
    const seenKey = `quickwin_${suite}_seen`;
    localStorage.setItem(seenKey, "true");
    setIsOpen(false);
    onDismiss?.();
  };

  const handleAction = () => {
    handleDismiss();
    if (suite === "business") {
      navigate("/business/team");
    } else {
      navigate("/data-import-suite");
    }
  };

  const content = suite === "business" ? {
    icon: Users,
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-400",
    title: "Your Business Suite is Ready! 🎉",
    description: "Add your first employee or runner to start tracking daily operations and see the magic unfold.",
    cta: "Add First Team Member",
    benefits: [
      "Track daily EOD reports automatically",
      "Monitor revenue & expenses by person",
      "See real-time team performance",
    ],
    illustration: (
      <div className="relative w-full h-32 rounded-lg bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="w-12 h-16 rounded-lg bg-gray-800 border border-gray-700 flex flex-col items-center justify-center gap-1"
            >
              <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Users className="w-3 h-3 text-yellow-400" />
              </div>
              <div className="w-8 h-1.5 rounded bg-gray-700" />
              <div className="w-6 h-1 rounded bg-gray-700" />
            </motion.div>
          ))}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="absolute -right-2 top-2"
          >
            <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
          </motion.div>
        </div>
      </div>
    ),
  } : {
    icon: FileSpreadsheet,
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-400",
    title: "Your Analytics Suite is Ready! 🎉",
    description: "Upload your last month's Excel report and ask AI to find hidden profits and patterns.",
    cta: "Upload My First Report",
    benefits: [
      "AI analyzes your data instantly",
      "Discover trends you missed manually",
      "Get strategic recommendations",
    ],
    illustration: (
      <div className="relative w-full h-32 rounded-lg bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            {/* Excel icon */}
            <div className="w-16 h-20 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">XLS</span>
            </div>
            {/* Arrow */}
            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute -right-12 top-1/2 -translate-y-1/2"
            >
              <ArrowRight className="w-6 h-6 text-gray-500" />
            </motion.div>
            {/* AI brain */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -right-24 top-1/2 -translate-y-1/2"
            >
              <div className="w-14 h-14 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                <Brain className="w-7 h-7 text-yellow-400" />
              </div>
            </motion.div>
          </motion.div>
        </div>
        {/* Sparkle decorations */}
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-3 right-8"
        >
          <Zap className="w-4 h-4 text-yellow-400" />
        </motion.div>
      </div>
    ),
  };

  const Icon = content.icon;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <DialogHeader className="text-center pb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className={`w-14 h-14 rounded-xl ${content.iconBg} flex items-center justify-center mx-auto mb-3`}
          >
            <Icon className={`w-7 h-7 ${content.iconColor}`} />
          </motion.div>
          <DialogTitle className="text-xl font-bold">{content.title}</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm mt-1">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        {/* Illustration */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="my-4"
        >
          {content.illustration}
        </motion.div>

        {/* Benefits */}
        <div className="space-y-2 mb-4">
          {content.benefits.map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-2 text-sm text-gray-300"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-yellow-400" />
              {benefit}
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={handleAction}
            className="w-full h-11 font-semibold bg-yellow-500 hover:bg-yellow-400 text-black"
          >
            {suite === "business" ? <UserPlus className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            {content.cta}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>

        <button
          onClick={handleDismiss}
          className="text-center text-xs text-gray-500 hover:text-gray-400 transition-colors mt-2"
        >
          I'll do this later
        </button>
      </DialogContent>
    </Dialog>
  );
}
