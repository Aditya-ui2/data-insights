/**
 * Runner Field Tracking Component
 * Mobile-first UI for runners to track attendance and site visits
 * Handles: Punch In/Out, Site Check-In/Out with geofencing validation
 */

import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getIdToken } from "@/lib/firebase";
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPinOff,
  Signal,
  TrendingUp,
  LogOut,
  LogIn,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ClientSite {
  id: string;
  name: string;
  address: string;
  contactPerson?: string;
  contactPhone?: string;
  geofenceRadiusMeters: number;
}

interface VisitLog {
  id: string;
  actionType: "punch_in" | "punch_out" | "check_in" | "check_out";
  latitude: string;
  longitude: string;
  timestamp: string;
  distanceFromSite?: number;
  status: "success" | "blocked";
  errorMessage?: string;
}

interface RunnerFieldTrackingProps {
  businessId: string;
  memberId?: string;
  clientSites: ClientSite[];
}

export default function RunnerFieldTracking({
  businessId,
  memberId,
  clientSites,
}: RunnerFieldTrackingProps) {
  const { toast } = useToast();

  // State
  const [dayStatus, setDayStatus] = useState<"not_started" | "active" | "ended">(
    "not_started"
  );
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"waiting" | "acquiring" | "locked" | "weak">(
    "waiting"
  );
  const [selectedSite, setSelectedSite] = useState<ClientSite | null>(null);
  const [daySiteLogs, setDaySiteLogs] = useState<VisitLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalDistance, setTotalDistance] = useState("0.0");

  // Initialize GPS on mount + restore today's attendance
  useEffect(() => {
    startGPSTracking();
    return () => stopGPSTracking();
  }, []);

  // Restore today's state once businessId + memberId are available
  useEffect(() => {
    if (businessId && memberId) {
      loadTodayLogs();
    }
  }, [businessId, memberId]);

  // ── Live location ping every 10s while day is active (Swiggy/Zomato style) ──
  useEffect(() => {
    if (dayStatus !== "active" || !businessId || !memberId || !currentLocation) {
      return;
    }

    const sendLocationPing = async () => {
      try {
        const token = await getIdToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        await fetch("/api/field-tracking/location-ping", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            businessId,
            memberId,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            gpsAccuracy: currentLocation.accuracy,
          }),
        });
      } catch (err) {
        // Silent fail — non-critical
      }
    };

    // Send immediately on activation, then every 10 seconds
    sendLocationPing();
    const interval = setInterval(sendLocationPing, 10000);
    return () => clearInterval(interval);
  }, [dayStatus, businessId, memberId, currentLocation]);

  // Restore today's logs and derive day status
  const loadTodayLogs = async () => {
    try {
      const resp = await fetch(
        `/api/field-tracking/my-today/${businessId}/${memberId}`
      );
      if (!resp.ok) return;
      const { logs } = await resp.json();
      if (!logs || logs.length === 0) return;

      setDaySiteLogs(logs);

      // Derive status from last log
      const last = logs[logs.length - 1] as VisitLog;
      if (last.actionType === "punch_out") {
        setDayStatus("ended");
      } else if (last.actionType === "punch_in" || last.actionType === "check_out") {
        setDayStatus("active");
      } else if (last.actionType === "check_in") {
        setDayStatus("active");
        // Restore selected site from clientSites list if available
        const siteLog = [...logs].reverse().find(
          (l: VisitLog) => l.actionType === "check_in"
        );
        if (siteLog && (siteLog as any).clientSiteId) {
          const site = clientSites.find((s) => s.id === (siteLog as any).clientSiteId);
          if (site) setSelectedSite(site);
        }
      }
    } catch (err) {
      // Non-critical — ignore
    }
  };

  // GPS Functions
  let watchId: number | null = null;

  const startGPSTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS Not Supported",
        description: "Your device does not support geolocation",
        variant: "destructive",
      });
      return;
    }

    setGpsStatus("acquiring");

    // Request high accuracy - require ≤50m for attendance
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentLocation({ latitude, longitude, accuracy });
        // GPS is "locked" only if accuracy is good enough (≤50m for punch-in)
        setGpsStatus(accuracy <= 50 ? "locked" : accuracy <= 100 ? "acquiring" : "weak");
      },
      (error) => {
        console.error("GPS Error:", error);
        toast({
          title: "GPS Error",
          description: "Unable to get location. Please enable GPS.",
          variant: "destructive",
        });
        setGpsStatus("waiting");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  };

  const stopGPSTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };

  // API Calls
  const callAPI = async (endpoint: string, method: string, payload: any) => {
    try {
      setIsLoading(true);
      const token = await getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(endpoint, {
        method,
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.errorMessage || "API Error");
      }

      return await response.json();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Action Handlers
  const handlePunchIn = async () => {
    if (!currentLocation) {
      toast({
        title: "GPS Not Ready",
        description: "Please wait for GPS to lock",
        variant: "destructive",
      });
      return;
    }

    // Enforce 50m GPS accuracy for attendance punch-in
    if (currentLocation.accuracy > 50) {
      toast({
        title: "GPS Accuracy Too Low",
        description: `Current accuracy: ±${Math.round(currentLocation.accuracy)}m. Required: ≤50m. Move to an open area for better signal.`,
        variant: "destructive",
      });
      return;
    }

    if (!memberId) {
      toast({
        title: "Session Error",
        description: "Member ID not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const token = await getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch("/api/field-tracking/punch-in", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          businessId,
          memberId,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          gpsAccuracy: currentLocation.accuracy,
        }),
      });

      const data = await response.json();

      if (response.status === 409 && data.alreadyPunchedIn) {
        // Already punched in today — restore state silently
        await loadTodayLogs();
        toast({ title: "Already Punched In", description: "You have already started your day." });
        return;
      }

      if (!response.ok) {
        toast({ title: "Error", description: data.error || "Punch-in failed", variant: "destructive" });
        return;
      }

      if (data.success) {
        setDayStatus("active");
        setDaySiteLogs([data.record]);
        toast({ title: "Success", description: "Day started! You're punched in." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async (site: ClientSite) => {
    if (!currentLocation) {
      toast({
        title: "GPS Not Ready",
        description: "Please wait for GPS to lock",
        variant: "destructive",
      });
      return;
    }

    const result = await callAPI("/api/field-tracking/check-in", "POST", {
      businessId,
      memberId,
      clientSiteId: site.id,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      gpsAccuracy: currentLocation.accuracy,
    });

    if (result?.success) {
      setSelectedSite(site);
      setDaySiteLogs([...daySiteLogs, result.record]);
      toast({
        title: "Check-In Successful",
        description: `You're now at ${site.name}`,
      });
    } else if (result?.status === "blocked") {
      toast({
        title: "Check-In Blocked",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleCheckOut = async () => {
    if (!selectedSite || !currentLocation) return;

    const result = await callAPI("/api/field-tracking/check-out", "POST", {
      businessId,
      memberId,
      clientSiteId: selectedSite.id,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      gpsAccuracy: currentLocation.accuracy,
    });

    if (result?.success) {
      setDaySiteLogs([...daySiteLogs, result.record]);
      setSelectedSite(null);
      toast({
        title: "Check-Out Successful",
        description: "Meeting logged",
      });
    }
  };

  const handlePunchOut = async () => {
    if (!currentLocation) {
      toast({
        title: "GPS Not Ready",
        description: "Please wait for GPS to lock",
        variant: "destructive",
      });
      return;
    }

    const result = await callAPI("/api/field-tracking/punch-out", "POST", {
      businessId,
      memberId,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      gpsAccuracy: currentLocation.accuracy,
    });

    if (result?.success) {
      setDayStatus("ended");
      setDaySiteLogs([...daySiteLogs, result.record]);
      toast({
        title: "Day Ended",
        description: "You've been punched out. Great work!",
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full min-h-full bg-black p-4 pb-20">
      {/* Header */}
      <div className="mb-6 pt-2">
        <h1 className="text-3xl font-bold text-white mb-1">Field Tracker</h1>
        <p className="text-white/50">Geo-tagged attendance &amp; site visits</p>
      </div>

      {/* GPS Status Bar */}
      <motion.div
        className={`rounded-xl p-4 mb-6 flex items-center gap-3 border ${
          gpsStatus === "locked"
            ? "bg-green-500/10 border-green-500/30"
            : gpsStatus === "acquiring"
            ? "bg-yellow-500/10 border-yellow-500/30"
            : gpsStatus === "weak"
            ? "bg-orange-500/10 border-orange-500/30"
            : "bg-red-500/10 border-red-500/30"
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {gpsStatus === "locked" && (
          <>
            <Signal className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm font-semibold text-green-300">GPS Locked ✓</p>
              <p className="text-xs text-green-200">
                Accuracy: ±{Math.round(currentLocation?.accuracy || 0)}m — Ready for punch-in
              </p>
            </div>
          </>
        )}
        {gpsStatus === "acquiring" && (
          <>
            <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
            <div>
              <p className="text-sm font-semibold text-yellow-300">Improving Accuracy...</p>
              <p className="text-xs text-yellow-200">
                Current: ±{Math.round(currentLocation?.accuracy || 0)}m — Need ≤50m
              </p>
            </div>
          </>
        )}
        {gpsStatus === "weak" && (
          <>
            <Signal className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-sm font-semibold text-orange-300">⚠️ Weak GPS Signal</p>
              <p className="text-xs text-orange-200">
                Accuracy: ±{Math.round(currentLocation?.accuracy || 0)}m — Move outside for better signal (need ≤50m)
              </p>
            </div>
          </>
        )}
        {gpsStatus === "waiting" && (
          <>
            <MapPinOff className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-300">GPS Not Ready</p>
              <p className="text-xs text-red-200">Enable location access</p>
            </div>
          </>
        )}
      </motion.div>

      {/* Day Control Section */}
      <AnimatePresence mode="wait">
        {dayStatus === "not_started" && (
          <motion.div
            key="not-started"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-black border border-amber-500/20 rounded-2xl p-6 mb-6"
          >
            <div className="text-center mb-4">
              <Clock className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">Start Your Day</h2>
              <p className="text-gray-400 text-sm">
                Punch in to begin tracking your visits
              </p>
            </div>
            <Button
              onClick={handlePunchIn}
              disabled={gpsStatus !== "locked" || isLoading}
              className="w-full h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold text-lg rounded-xl transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Punching In...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Start My Day
                </>
              )}
            </Button>
          </motion.div>
        )}

        {dayStatus === "active" && (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Current Visit Display */}
            {selectedSite && (
              <motion.div
                className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-4 border border-blue-400/30"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">
                      Current Visit
                    </p>
                    <h3 className="text-lg font-bold text-white">{selectedSite.name}</h3>
                    <p className="text-sm text-gray-300 mt-1">{selectedSite.address}</p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                </div>
                <Button
                  onClick={handleCheckOut}
                  disabled={isLoading}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg"
                >
                  {isLoading ? "Checking Out..." : "Check Out"}
                </Button>
              </motion.div>
            )}

            {/* Sites List */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">Today's Sites</h3>
              <div className="space-y-2">
                {clientSites.map((site) => (
                  <motion.div
                    key={site.id}
                    className={`rounded-xl p-4 border transition-all cursor-pointer ${
                      selectedSite?.id === site.id
                        ? "bg-yellow-500/10 border-yellow-400 ring-2 ring-yellow-400/30"
                        : "bg-white/5 border-white/10 hover:border-amber-500/30"
                    }`}
                    onClick={() => !selectedSite && handleCheckIn(site)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{site.name}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {site.contactPerson && <span>{site.contactPerson} • </span>}
                          Within {site.geofenceRadiusMeters}m
                        </p>
                      </div>
                      {selectedSite?.id === site.id && (
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Visit Timeline */}
            {daySiteLogs.length > 0 && (
              <div className="space-y-3">
                {/* Attendance Summary Card */}
                <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 rounded-xl p-4 border border-amber-500/30">
                  <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    My Attendance
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Punch-in time */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Punch In</p>
                      <p className="text-sm font-bold text-green-400">
                        {daySiteLogs.find((l) => l.actionType === "punch_in")
                          ? new Date(
                              daySiteLogs.find((l) => l.actionType === "punch_in")!.timestamp
                            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "--"}
                      </p>
                    </div>
                    {/* Sites visited */}
                    <div className="text-center border-x border-white/10">
                      <p className="text-xs text-gray-500 mb-1">Sites</p>
                      <p className="text-sm font-bold text-blue-400">
                        {daySiteLogs.filter((l) => l.actionType === "check_in").length}
                      </p>
                    </div>
                    {/* Punch-out time or ongoing */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Punch Out</p>
                      <p className="text-sm font-bold text-red-400">
                        {daySiteLogs.find((l) => l.actionType === "punch_out")
                          ? new Date(
                              daySiteLogs.find((l) => l.actionType === "punch_out")!.timestamp
                            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : <span className="text-yellow-400">Active</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                    Today's Timeline
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {daySiteLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 text-sm border-l-2 border-yellow-400/30 pl-3 py-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-200 capitalize">
                            {log.actionType.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        {log.status === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Punch Out Button */}
            <Button
              onClick={handlePunchOut}
              disabled={isLoading || selectedSite !== null}
              className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-lg rounded-xl transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ending Day...
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5 mr-2" />
                  End My Day
                </>
              )}
            </Button>
          </motion.div>
        )}

        {dayStatus === "ended" && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-green-500/30 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Day Completed!</h2>
              <p className="text-gray-300 mb-4">
                {daySiteLogs.filter((l) => l.actionType === "check_in").length} sites visited
              </p>
            </div>

            {/* Attendance Summary */}
            <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 rounded-xl p-4 border border-amber-500/30">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                My Attendance
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Punch In</p>
                  <p className="text-sm font-bold text-green-400">
                    {daySiteLogs.find((l) => l.actionType === "punch_in")
                      ? new Date(
                          daySiteLogs.find((l) => l.actionType === "punch_in")!.timestamp
                        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "--"}
                  </p>
                </div>
                <div className="text-center border-x border-white/10">
                  <p className="text-xs text-gray-500 mb-1">Sites</p>
                  <p className="text-sm font-bold text-blue-400">
                    {daySiteLogs.filter((l) => l.actionType === "check_in").length}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Punch Out</p>
                  <p className="text-sm font-bold text-red-400">
                    {daySiteLogs.find((l) => l.actionType === "punch_out")
                      ? new Date(
                          daySiteLogs.find((l) => l.actionType === "punch_out")!.timestamp
                        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "--"}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {daySiteLogs.length > 0 && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Today's Timeline
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {daySiteLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 text-sm border-l-2 border-yellow-400/30 pl-3 py-1"
                    >
                      <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-200 capitalize">
                          {log.actionType.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Info - Only in dev */}
      {process.env.NODE_ENV === "development" && currentLocation && (
        <div className="mt-6 bg-white/5 rounded-lg p-3 text-xs text-white/40 border border-white/10">
          <p>📍 Lat: {currentLocation.latitude.toFixed(6)}</p>
          <p>📍 Lon: {currentLocation.longitude.toFixed(6)}</p>
          <p>📡 Accuracy: ±{Math.round(currentLocation.accuracy)}m</p>
        </div>
      )}
    </div>
  );
}
