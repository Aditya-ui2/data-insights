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
import { AlertCircle } from "lucide-react";
import { getIdToken } from "@/lib/firebase";

export default function AdminFieldTrackingPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [businessId, setBusinessId] = useState("");
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
      <div className="flex h-screen bg-black">
        <BusinessSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Loading field tracking dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !businessId) {
    return (
      <div className="flex h-screen bg-black">
        <BusinessSidebar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-red-300 mb-4">{error}</p>
            <Button
              onClick={() => navigate("/business")}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              Go to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black">
      <BusinessSidebar />
      <main className="flex-1 overflow-auto">
        <AdminFieldTracking businessId={businessId} isManager={isManager} />
      </main>
    </div>
  );
}
