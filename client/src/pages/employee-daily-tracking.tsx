/**
 * Employee Daily Tracking Page - Full-screen view of all tracking templates
 * Dedicated page for employees to fill their daily tracking forms.
 */

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import BusinessSidebar from "@/components/business-sidebar";
import DynamicDailyTracker from "@/components/DynamicDailyTracker";

interface BusinessProfile {
  id: string;
  name: string;
  memberRole: string;
}

export default function EmployeeDailyTrackingPage() {
  const [, navigate] = useLocation();

  const { data: profile } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  return (
    <div className="min-h-screen bg-[#fbfaf7] flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[#fbfaf7]">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/business")}
                className="text-muted-foreground hover:text-primary rounded-none"
                data-testid="button-back-business"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-accent" />
                  Daily Activity Logs
                </h1>
                <p className="text-xs text-muted-foreground">
                  {profile?.name || "Business Suite"} · Fill out your daily activity sheets
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-6 w-full">
          <DynamicDailyTracker />
        </main>
      </div>
    </div>
  );
}
