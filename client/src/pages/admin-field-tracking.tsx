/**
 * Admin Field Tracking Dashboard Page
 * For employers/managers to view runner locations and visit analytics
 */

import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import AdminFieldTracking from "@/components/field-tracking-dashboard";
import BusinessSidebar from "@/components/business-sidebar";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, MapPin } from "lucide-react";
import { getIdToken } from "@/lib/firebase";

export default function AdminFieldTrackingPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Check if user is authenticated and is a manager/owner
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    loadBusinessData();
  }, [isAuthenticated, user]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      setError("");

      // Get user's business ID from their business profile
      const token = await getIdToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const businessResponse = await fetch("/api/business/profile", {
        credentials: "include",
        headers,
      });

      if (businessResponse.ok) {
        const business = await businessResponse.json();
        setBusinessId(business.id);
        setBusinessName(business.name);

        // You can add a check here to verify the user is a manager
        // For now, assuming access control is handled by the backend
        setIsManager(true);
      } else if (businessResponse.status === 401) {
        setError("Session expired. Please log in again.");
      } else if (businessResponse.status === 404) {
        setError("User does not have a business profile");
      } else if (businessResponse.status === 403) {
        setError("You do not have permission to access this page");
      } else {
        setError("Failed to load business data");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
      console.error("Error loading admin field tracking:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-[#fbfaf7]">
        <BusinessSidebar />
        <main className="flex-1 flex items-center justify-center bg-[#fbfaf7]">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-none animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Loading field tracking dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !businessId) {
    return (
      <div className="flex h-screen bg-[#fbfaf7]">
        <BusinessSidebar />
        <main className="flex-1 flex items-center justify-center p-4 bg-[#fbfaf7]">
          <div className="bg-red-500/5 border border-red-500/20 rounded-none p-8 max-w-md text-center shadow-lg relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-sans text-red-700 mb-4">{error}</p>
            <Button
              onClick={() => navigate("/business")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#fbfaf7] overflow-hidden">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#fbfaf7]">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10 flex-none">
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
                  <MapPin className="w-5 h-5 text-accent" />
                  Field Tracking Admin
                </h1>
                <p className="text-xs text-muted-foreground">
                  {businessName || "Business Suite"} · Real-time Runner Locations &amp; Visits
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#fbfaf7]">
          <AdminFieldTracking businessId={businessId} isManager={isManager} />
        </main>
      </div>
    </div>
  );
}
