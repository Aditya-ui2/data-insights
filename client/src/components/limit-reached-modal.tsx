import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Zap, Mail, Crown, Sparkles } from "lucide-react";

interface LimitReachedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LimitReachedModal({ open, onOpenChange }: LimitReachedModalProps) {
  const handleContactSupport = () => {
    window.location.href = "mailto:sarthakjhalani8@gmail.com?subject=DataInsights%20Premium%20Inquiry";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="w-5 h-5 text-amber-500" />
            Daily Limit Reached
          </DialogTitle>
          <DialogDescription>
            You've used all 5 AI actions for today.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Unlock Premium Features</h3>
                  <p className="text-sm text-muted-foreground">
                    Get unlimited AI actions, priority support, and advanced analytics features.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">What's Included</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Unlimited AI dashboard generation</li>
                    <li>Unlimited data chat queries</li>
                    <li>Extended history storage</li>
                    <li>Priority email support</li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>

          <div className="pt-2">
            <Button 
              onClick={handleContactSupport}
              className="w-full gap-2"
              data-testid="button-contact-support"
            >
              <Mail className="w-4 h-4" />
              Contact Support for Premium
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Email: sarthakjhalani8@gmail.com
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
