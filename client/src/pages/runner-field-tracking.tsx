/**
 * Runner Field Tracking Page
 * Mobile-responsive page for runners to track their day
 */

import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import RunnerFieldTracking from "@/components/runner-field-tracking";
import BusinessSidebar from "@/components/business-sidebar";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { getIdToken } from "@/lib/firebase";

interface ClientSite {
  id: string;
  businessId: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  geofenceRadiusMeters: number;
  contactPerson?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: string;
}

export default function RunnerFieldTrackingPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [businessId, setBusinessId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [clientSites, setClientSites] = useState<ClientSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Check if user is authenticated and is a runner
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    loadData();
  }, [isAuthenticated, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getIdToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Get businessId + memberId from dedicated authenticated endpoint
      const memberResponse = await fetch("/api/business/member-profile", {
        credentials: "include",
        headers,
      });

      if (memberResponse.ok) {
        const data = await memberResponse.json();

        // Owners and managers track others — send them to admin dashboard
        if (data.memberRole === "owner" || data.memberRole === "manager") {
          navigate("/business/field-tracking");
          return;
        }

        setBusinessId(data.businessId);
        setMemberId(data.memberId);

        // Load client sites for this business
        const sitesResponse = await fetch(`/api/field-tracking/sites/${data.businessId}`, {
          credentials: "include",
          headers,
        });

        if (sitesResponse.ok) {
          const sitesData = await sitesResponse.json();
          setClientSites(sitesData.sites || []);
        }
      } else if (memberResponse.status === 401) {
        setError("Session expired. Please log in again.");
      } else if (memberResponse.status === 404) {
        setError("User does not have access to a business");
      } else {
        setError("Failed to load business data");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
      console.error("Error loading runner field tracking:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <BusinessSidebar />
        <main className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-none animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Loading field tracking...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !businessId) {
    return (
      <div className="flex h-screen bg-background">
        <BusinessSidebar />
        <main className="flex-1 flex items-center justify-center p-4 bg-white">
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
    <div className="flex h-screen bg-background">
      <BusinessSidebar />
      <main className="flex-1 overflow-auto bg-white">
        <RunnerFieldTracking
          businessId={businessId}
          memberId={memberId}
          clientSites={clientSites}
        />
      </main>
    </div>
  );
}
