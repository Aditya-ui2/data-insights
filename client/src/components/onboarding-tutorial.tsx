import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  BarChart3, 
  MessageSquare, 
  Share2, 
  Sparkles,
  ArrowRight,
  CheckCircle,
  FileSpreadsheet,
  Zap
} from "lucide-react";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: typeof Upload;
  details: string[];
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: "Connect Your Data",
    description: "Import data from Google Sheets or upload Excel files",
    icon: FileSpreadsheet,
    details: [
      "Connect your Google account to access Sheets",
      "Or upload Excel files (up to 10MB for free, 50MB for Pro)",
      "Supports .xlsx and .xls formats",
      "Data is securely stored and encrypted"
    ]
  },
  {
    id: 2,
    title: "Generate AI Dashboards",
    description: "One-click AI-powered dashboard creation",
    icon: BarChart3,
    details: [
      "AI analyzes your data automatically",
      "Creates 4 KPIs and 4 charts instantly",
      "Bar charts, pie charts, and line graphs",
      "Smart insights and summaries included"
    ]
  },
  {
    id: 3,
    title: "Chat with Your Data",
    description: "Ask questions in natural language",
    icon: MessageSquare,
    details: [
      "Ask any question about your data",
      "Get instant, data-backed answers",
      "AI understands context and history",
      "Pro users get ultra-fast Groq AI responses"
    ]
  },
  {
    id: 4,
    title: "Share & Collaborate",
    description: "Share dashboards with anyone",
    icon: Share2,
    details: [
      "Generate shareable public links",
      "No login required for viewers",
      "Perfect for team presentations",
      "Control visibility per dashboard"
    ]
  }
];

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingTutorial({ isOpen, onClose, onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleNext = () => {
    setCompletedSteps(prev => new Set(Array.from(prev).concat(currentStep)));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <Badge variant="secondary">DataInsights v2.0</Badge>
          </div>
          <DialogTitle className="text-xl">Welcome to DataInsights</DialogTitle>
          <DialogDescription>
            Transform your spreadsheets into powerful insights with AI
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-center mb-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index === currentStep 
                      ? 'bg-primary text-primary-foreground' 
                      : completedSteps.has(index)
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {completedSteps.has(index) ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ${
                    completedSteps.has(index) ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <Card className="border-primary/20">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10">
                <Icon className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
              <CardDescription>{currentStepData.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {currentStepData.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <Button variant="ghost" onClick={handleSkip} data-testid="button-skip-tutorial">
            Skip Tutorial
          </Button>
          <Button onClick={handleNext} data-testid="button-next-step">
            {currentStep < steps.length - 1 ? (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Get Started
                <Sparkles className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-2">
          Free plan: 5 AI actions/day | Pro plan: 100 AI actions/day
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useOnboardingTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem('datainsights_tutorial_seen');
    if (!seen) {
      setHasSeenTutorial(false);
      setShowTutorial(true);
    }
  }, []);

  const completeTutorial = () => {
    localStorage.setItem('datainsights_tutorial_seen', 'true');
    setHasSeenTutorial(true);
    setShowTutorial(false);
  };

  const openTutorial = () => {
    setShowTutorial(true);
  };

  return {
    showTutorial,
    hasSeenTutorial,
    completeTutorial,
    openTutorial,
    closeTutorial: () => setShowTutorial(false)
  };
}
