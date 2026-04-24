/**
 * Employee Daily Tracking Page - Full-screen view of all tracking templates
 * Dedicated page for employees to fill their daily tracking forms.
 */

import BusinessSidebar from "@/components/business-sidebar";
import DynamicDailyTracker from "@/components/DynamicDailyTracker";

export default function EmployeeDailyTrackingPage() {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <BusinessSidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <DynamicDailyTracker />
      </main>
    </div>
  );
}
