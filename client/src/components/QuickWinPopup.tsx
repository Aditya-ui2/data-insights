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
  Users, FileSpreadsheet, Brain, Zap, CheckCircle2,
  TrendingUp, BarChart3, Target
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
    title: "Welcome to Your Business Suite! 🚀",
    description: "Add your first team member to unlock daily tracking & real-time insights.",
    cta: "Add First Team Member",
    benefits: [
      { text: "Track daily EOD reports & performance", icon: TrendingUp },
      { text: "Monitor revenue, deals, and expenses per person", icon: BarChart3 },
      { text: "Get AI-powered insights & forecasts", icon: Target },
    ],
    illustration: (
      <div className="relative w-full h-28 bg-white border border-gray-200 rounded-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40" />
        
        <div className="absolute inset-0 flex items-center justify-center gap-3">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.12, type: "spring" }}
              className="w-11 h-16 bg-white border border-gray-200 rounded-none flex flex-col items-center justify-center gap-1 shadow-sm"
            >
              <div className="w-6 h-6 bg-gray-50 border border-gray-200 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-accent" />
              </div>
              <div className="w-7 h-1.5 rounded-none bg-gray-100" />
              <div className="w-5 h-1 rounded-none bg-gray-100" />
            </motion.div>
          ))}
          
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 250 }}
            className="absolute -right-2 -top-2"
          >
            <div className="w-8 h-8 bg-primary flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
          </motion.div>
        </div>
      </div>
    ),
  } : {
    icon: FileSpreadsheet,
    title: "Welcome to Your Analytics Suite! 📊",
    description: "Upload your data and let AI find hidden patterns & opportunities.",
    cta: "Upload My First Report",
    benefits: [
      { text: "AI analyzes your data in seconds", icon: Zap },
      { text: "Find insights you'd miss manually", icon: Brain },
      { text: "Get actionable recommendations", icon: Target },
    ],
    illustration: (
      <div className="relative w-full h-28 bg-white border border-gray-200 rounded-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative flex items-center gap-3"
          >
            {/* Excel icon */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-20 bg-emerald-600 flex items-center justify-center shadow-sm"
            >
              <span className="text-white font-bold text-xs">XLS</span>
            </motion.div>
            
            {/* Arrow */}
            <motion.div
              initial={{ x: -8, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="flex-shrink-0"
            >
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </motion.div>
            
            {/* AI brain */}
            <motion.div
              initial={{ x: 15, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              whileHover={{ scale: 1.1 }}
            >
              <div className="w-14 h-14 bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm">
                <Brain className="w-7 h-7 text-accent" />
              </div>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Sparkle decorations */}
        <motion.div
          animate={{ 
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-3 right-8"
        >
          <Zap className="w-4 h-4 text-accent" />
        </motion.div>
      </div>
    ),
  };

  const Icon = content.icon;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-card border border-gray-200 text-primary p-0 rounded-none shadow-2xl overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40" />
        
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center rounded-none bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-primary transition-all duration-300 z-10 border border-gray-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <DialogHeader className="text-center pb-1 pt-6 px-6">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.1, stiffness: 250 }}
            className="w-16 h-16 bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4 shadow-sm"
          >
            <Icon className="w-8 h-8 text-accent" />
          </motion.div>
          
          <DialogTitle className="text-xl font-sans font-bold uppercase tracking-wider">
            {content.title}
          </DialogTitle>
          
          <DialogDescription className="text-muted-foreground text-xs mt-2 leading-relaxed">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        {/* Illustration */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="my-5 px-6"
        >
          {content.illustration}
        </motion.div>

        {/* Benefits */}
        <div className="space-y-2 mb-5 px-6">
          {content.benefits.map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              className="flex items-center gap-2.5 text-xs text-primary bg-muted border border-gray-200 rounded-none p-2.5 shadow-sm"
            >
              <div className="w-5 h-5 bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                <benefit.icon className="w-3 h-3 text-accent" />
              </div>
              {benefit.text}
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="px-6 mb-1"
        >
          <Button
            onClick={handleAction}
            className="w-full h-10 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border border-primary rounded-none shadow-none text-xs uppercase tracking-wider"
          >
            {suite === "business" ? <UserPlus className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            {content.cta}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>

        <button
          onClick={handleDismiss}
          className="text-center text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mt-1 pb-6 w-full font-semibold"
        >
          I'll do this later
        </button>
      </DialogContent>
    </Dialog>
  );
}
