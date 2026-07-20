/**
 * Field Tracking Admin Dashboard
 * Real-time location tracking, visit history, and expense calculations
 * Features: Live map with Leaflet, timeline view, travel expense auto-calc
 */

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getIdToken } from "@/lib/firebase";
import {
  Map as MapIcon,
  Users,
  MapPin,
  TrendingUp,
  Calendar,
  DollarSign,
  Eye,
  RefreshCw,
  Plus,
  Settings,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";

// Leaflet types
interface LeafletMap {
  setView(latlng: [number, number], zoom: number): void;
  removeLayer(layer: any): void;
}

interface LeafletMarker {
  setLatLng(latlng: [number, number]): void;
  setIcon(icon: any): void;
  setPopupContent(content: string): void;
  openPopup(): void;
}

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

interface RunnerLocation {
  memberId: string;
  memberName: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  actionType: string;
}

interface VisitLog {
  id: string;
  memberId: string;
  actionType: string;
  latitude: string;
  longitude: string;
  timestamp: string;
  distanceFromSite?: number;
  status: string;
  errorMessage?: string;
}

interface AdminFieldTrackingProps {
  businessId: string;
  isManager?: boolean;
}

export default function AdminFieldTracking({
  businessId,
  isManager = false,
}: AdminFieldTrackingProps) {
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<Map<string, any>>(new globalThis.Map<string, any>());
  const siteMarkers = useRef<Map<string, any>>(new globalThis.Map<string, any>());
  const pathLines = useRef<Map<string, any>>(new globalThis.Map<string, any>()); // Runner trail lines
  const pathMarkers = useRef<any[]>([]); // Direction dots and start markers

  // State
  const [view, setView] = useState<"map" | "timeline" | "expenses">("map");
  const [selectedRunner, setSelectedRunner] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [runnerLocations, setRunnerLocations] = useState<RunnerLocation[]>([]);
  const [clientSites, setClientSites] = useState<ClientSite[]>([]);
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [newSite, setNewSite] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
  });

  // Initialize map — delay 150ms so the container is painted and has real dimensions
  useEffect(() => {
    if (view !== "map") return;
    const timer = setTimeout(() => {
      if (mapContainer.current && !map.current) {
        initializeMap();
      } else if (map.current) {
        (map.current as any).invalidateSize();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [view]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (map.current) {
        (map.current as any).remove();
        map.current = null;
      }
    };
  }, []);

  // Auto-refresh runner locations every 5s while on map view
  useEffect(() => {
    if (view !== "map") return;
    const interval = setInterval(() => {
      loadRunnerLocations();
    }, 5000);
    return () => clearInterval(interval);
  }, [view, businessId]);

  const initializeMap = async () => {
    try {
      const L = await import("leaflet");

      if (!mapContainer.current) return;

      const leafletMap = L.map(mapContainer.current).setView([28.6139, 77.209], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(leafletMap);

      map.current = leafletMap;
      // Force layout recalc after tiles load
      setTimeout(() => (leafletMap as any).invalidateSize(), 300);

      // Load initial data
      loadRunnerLocations();
      loadClientSites();
    } catch (error) {
      console.error("Map initialization error:", error);
      toast({
        title: "Map Error",
        description: "Failed to load map. Using fallback view.",
        variant: "destructive",
      });
    }
  };

  // Data Loading Functions
  const loadRunnerLocations = async () => {
    try {
      setIsLoading(true);
      const token = await getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      
      // Load latest locations
      const response = await fetch(`/api/field-tracking/live-locations/${businessId}`, { headers, credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setRunnerLocations(data.locations || []);
        updateMapMarkers(data.locations || []);
      }

      // Load runner paths for trail lines
      const pathsResponse = await fetch(`/api/field-tracking/runner-paths/${businessId}`, { headers, credentials: "include" });
      if (pathsResponse.ok) {
        const pathsData = await pathsResponse.json();
        updatePathLines(pathsData.paths || {});
      }
    } catch (error: any) {
      console.error("Error loading runner locations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadClientSites = async () => {
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`/api/field-tracking/sites/${businessId}`, { headers, credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setClientSites(data.sites || []);
        updateSiteMarkers(data.sites || []);
      }
    } catch (error: any) {
      console.error("Error loading sites:", error);
    }
  };

  const loadVisitTimeline = async () => {
    if (!selectedRunner) return;

    try {
      setIsLoading(true);
      const token = await getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const url = `/api/field-tracking/member-visits/${businessId}/${selectedRunner}?date=${selectedDate}`;
      const response = await fetch(url, { headers, credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setVisitLogs(data.visits || []);
      }
    } catch (error: any) {
      console.error("Error loading visit timeline:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Map Functions
  const updateMapMarkers = async (locations: RunnerLocation[]) => {
    if (!map.current) return;

    try {
      const L = await import("leaflet");

      // Remove old markers
      markers.current.forEach((marker) => {
        map.current?.removeLayer(marker);
      });
      markers.current.clear();

      // Add new markers with Swiggy/Zomato style vehicle icon + pulsing effect
      locations.forEach((location) => {
        // Motorcycle/scooter SVG icon with pulsing ring animation
        const vehicleIconSvg = `
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='48' height='48'>
            <!-- Pulsing ring animation -->
            <circle cx='32' cy='32' r='28' fill='none' stroke='%23f59e0b' stroke-width='2' opacity='0.3'>
              <animate attributeName='r' from='20' to='30' dur='1.5s' repeatCount='indefinite'/>
              <animate attributeName='opacity' from='0.6' to='0' dur='1.5s' repeatCount='indefinite'/>
            </circle>
            <!-- Main circle background -->
            <circle cx='32' cy='32' r='20' fill='%23f59e0b' stroke='%23000' stroke-width='2'/>
            <!-- Motorcycle/bike icon -->
            <g transform='translate(16, 18)' fill='%23000'>
              <path d='M5 20a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm22 0a5 5 0 1 0 0-10 5 5 0 0 0 0 10z'/>
              <circle cx='5' cy='15' r='2.5' fill='white'/>
              <circle cx='27' cy='15' r='2.5' fill='white'/>
              <path d='M8 14h16l-3-8H11l-3 8z' fill='%23000'/>
              <path d='M14 6h4v3h-4z' fill='%23f59e0b'/>
              <path d='M10 10h12v2H10z' fill='%23333'/>
            </g>
          </svg>
        `;

        const icon = L.divIcon({
          className: "runner-vehicle-marker",
          html: vehicleIconSvg,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
          popupAnchor: [0, -24],
        });

        const marker = L.marker([location.latitude, location.longitude], {
          icon,
        }).addTo((map.current as any)!);

        // Format action type nicely
        const actionLabel = location.actionType === "location_update" ? "🔴 Moving" 
          : location.actionType === "punch_in" ? "✅ Punched In"
          : location.actionType === "check_in" ? "📍 At Site"
          : location.actionType === "check_out" ? "🚶 Left Site"
          : location.actionType;

        marker.bindPopup(
          `<div style="font-family: Georgia, serif; min-width: 140px; color: #13322b; padding: 4px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; border-b: 1px solid #eee; padding-bottom: 2px;">${location.memberName}</div>
            <div style="color: #c59b43; font-family: system-ui, sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">${actionLabel}</div>
            <div style="color: #666; font-family: system-ui, sans-serif; font-size: 10px;">🕐 ${new Date(location.lastUpdated).toLocaleTimeString()}</div>
          </div>`
        );

        markers.current.set(location.memberId, marker);
      } );
    } catch (error) {
      console.error("Error updating markers:", error);
    }
  };

  // Draw trail/path lines for each runner (Swiggy/Zomato style route tracking)
  const updatePathLines = async (paths: Record<string, Array<{lat: number; lng: number; time: string; action: string}>>) => {
    if (!map.current) return;

    try {
      const L = await import("leaflet");

      // Remove old path lines
      pathLines.current.forEach((line) => {
        map.current?.removeLayer(line);
      });
      pathLines.current.clear();

      // Remove old path markers (direction dots, start markers)
      pathMarkers.current.forEach((marker) => {
        map.current?.removeLayer(marker);
      });
      pathMarkers.current = [];

      // Draw new path lines for each runner
      Object.entries(paths).forEach(([memberId, points]) => {
        if (points.length < 2) return; // Need at least 2 points to draw a line

        const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);

        // Create a gradient-style polyline (newer points are brighter)
        const polyline = L.polyline(latLngs, {
          color: "#f59e0b", // Amber/gold
          weight: 4,
          opacity: 0.8,
          dashArray: "10, 5", // Dashed line for trail effect
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map.current as any);

        // Add arrow decorations to show direction (using small markers)
        if (points.length >= 2) {
          // Add small direction dots along the path
          const step = Math.max(1, Math.floor(points.length / 5)); // Show ~5 direction markers
          for (let i = step; i < points.length - 1; i += step) {
            const p = points[i];
            const dotIcon = L.divIcon({
              className: "path-direction-dot",
              html: `<div style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; border: 2px solid #000; box-shadow: 0 0 4px rgba(245,158,11,0.5);"></div>`,
              iconSize: [8, 8],
              iconAnchor: [4, 4],
            });
            const dotMarker = L.marker([p.lat, p.lng], { icon: dotIcon }).addTo(map.current as any);
            pathMarkers.current.push(dotMarker);
          }

          // Add START marker at the first point
          const startIcon = L.divIcon({
            className: "path-start-marker",
            html: `<div style="background: #22c55e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 1px solid #166534; white-space: nowrap;">START</div>`,
            iconSize: [40, 18],
            iconAnchor: [20, 9],
          });
          const startMarker = L.marker([points[0].lat, points[0].lng], { icon: startIcon }).addTo(map.current as any);
          pathMarkers.current.push(startMarker);
        }

        pathLines.current.set(memberId, polyline);
      });
    } catch (error) {
      console.error("Error updating path lines:", error);
    }
  };

  const focusRunner = (runner: RunnerLocation) => {
    // Switch to map view if not already there
    setView("map");
    // Pan map to runner and open popup
    setTimeout(() => {
      if (map.current) {
        (map.current as any).setView([runner.latitude, runner.longitude], 15);
        const marker = markers.current.get(runner.memberId);
        if (marker) marker.openPopup();
      }
    }, 200);
  };

  const updateSiteMarkers = async (sites: ClientSite[]) => {
    if (!map.current) return;

    try {
      const L = await import("leaflet");

      // Remove old site markers
      siteMarkers.current.forEach((marker) => {
        map.current?.removeLayer(marker);
      });
      siteMarkers.current.clear();

      // Add site markers
      sites.forEach((site) => {
        const icon = L.icon({
          iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'/%3E%3C/svg%3E",
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -28],
        });

        const marker = L.marker([parseFloat(site.latitude), parseFloat(site.longitude)], {
          icon,
        }).addTo((map.current as any)!);

        marker.bindPopup(
          `<div style="font-family: Georgia, serif; color: #13322b;">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">${site.name}</div>
            <div style="font-family: system-ui, sans-serif; font-size: 11px; color: #666; margin-bottom: 2px;">${site.address}</div>
            <div style="font-family: system-ui, sans-serif; font-size: 10px; color: #c59b43; font-weight: bold; text-transform: uppercase;">Radius: ${site.geofenceRadiusMeters}m</div>
          </div>`
        );

        siteMarkers.current.set(site.id, marker);
      });

      // Auto-fit bounds if markers exist
      if (siteMarkers.current.size > 0) {
        const group = new (window as any).L.featureGroup(
          Array.from(siteMarkers.current.values())
        );
        (map.current as any)?.fitBounds(group.getBounds().pad(0.1));
      }
    } catch (error) {
      console.error("Error updating site markers:", error);
    }
  };

  // Action Handlers
  const handleAddSite = async () => {
    if (!newSite.name || !newSite.latitude || !newSite.longitude) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/field-tracking/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          ...newSite,
          latitude: parseFloat(newSite.latitude),
          longitude: parseFloat(newSite.longitude),
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Site added successfully",
        });
        setShowSiteForm(false);
        setNewSite({ name: "", address: "", latitude: "", longitude: "" });
        loadClientSites();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (view === "map") loadRunnerLocations();
    if (view === "timeline") loadVisitTimeline();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-6 bg-transparent p-6">
      {/* View Tabs & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 pb-2">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "map", label: "Live Map", icon: MapIcon },
            { id: "timeline", label: "Timeline", icon: TrendingUp },
            { id: "expenses", label: "Expenses", icon: DollarSign },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-all rounded-none border ${
                view === id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-gray-200 text-muted-foreground hover:bg-gray-50 hover:text-primary"
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-accent" />
              {label}
            </button>
          ))}
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading}
          variant="outline"
          className="border-gray-200 text-muted-foreground hover:bg-gray-50 text-xs uppercase tracking-wider font-semibold rounded-none h-9 px-4 shadow-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Map View */}
      {view === "map" && (
        <div className="space-y-6">
          {/* Map Container */}
          <Card className="bg-white border border-gray-250 rounded-none shadow-sm overflow-hidden">
            <CardContent className="p-0 rounded-none">
              <div
                ref={mapContainer}
                style={{ height: "500px", width: "100%" }}
                className="rounded-none overflow-hidden"
              />
            </CardContent>
          </Card>

          {/* Active Runners Card */}
          <Card className="bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 font-sans font-normal text-primary text-xl">
                <Users className="w-5 h-5 text-accent" />
                Active Runners ({runnerLocations.length})
                {isLoading && <RefreshCw className="w-3.5 h-3.5 ml-auto animate-spin text-accent" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {runnerLocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-accent" />
                  <p className="text-sm font-semibold">No runners are currently in the field</p>
                  <p className="text-xs mt-1 text-muted-foreground">Locations appear here once a runner punches in</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {runnerLocations.map((runner) => {
                    // Status badge styling based on action type
                    const isMoving = runner.actionType === "location_update";
                    const statusLabel = isMoving ? "Moving" 
                      : runner.actionType === "punch_in" ? "Punched In"
                      : runner.actionType === "check_in" ? "At Site"
                      : runner.actionType === "check_out" ? "In Transit"
                      : runner.actionType.replace(/_/g, " ");
                    const statusColor = isMoving ? "bg-green-500/5 text-green-700 border-green-500/20" 
                      : runner.actionType === "check_in" ? "bg-blue-500/5 text-blue-700 border-blue-500/20"
                      : "bg-accent/5 text-accent border-accent/20";

                    return (
                      <motion.div
                        key={runner.memberId}
                        className="bg-white hover:bg-gray-50 rounded-none p-4 border border-gray-250 hover:border-accent transition-colors cursor-pointer relative group/runner"
                        whileHover={{ scale: 1.01 }}
                        onClick={() => focusRunner(runner)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-sans font-normal text-base text-primary truncate">{runner.memberName}</p>
                            <p className="text-xs text-accent mt-1 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              {runner.latitude.toFixed(5)}, {runner.longitude.toFixed(5)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Last seen: {new Date(runner.lastUpdated).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`shrink-0 px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded-none border flex items-center gap-1.5 ${statusColor}`}>
                              {isMoving && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-none h-2 w-2 bg-green-500"></span>
                                </span>
                              )}
                              {statusLabel}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-accent/70 font-sans">Locate ↑</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sites Management */}
          <Card className="bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 font-sans font-normal text-primary text-xl">
                <MapPin className="w-5 h-5 text-accent" />
                Client Sites ({clientSites.length})
              </CardTitle>
              {isManager && (
                <Button
                  onClick={() => setShowSiteForm(!showSiteForm)}
                  size="sm"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground border border-accent rounded-none text-xs uppercase tracking-wider font-semibold shadow-none px-3 py-1.5"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Site
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {showSiteForm && (
                <motion.div
                  className="bg-gray-50 p-5 rounded-none space-y-4 border border-gray-200"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Input
                    placeholder="Site Name"
                    value={newSite.name}
                    onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                    className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground rounded-none"
                  />
                  <Input
                    placeholder="Address"
                    value={newSite.address}
                    onChange={(e) => setNewSite({ ...newSite, address: e.target.value })}
                    className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground rounded-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Latitude"
                      type="number"
                      step="0.0001"
                      value={newSite.latitude}
                      onChange={(e) => setNewSite({ ...newSite, latitude: e.target.value })}
                      className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground rounded-none"
                    />
                    <Input
                      placeholder="Longitude"
                      type="number"
                      step="0.0001"
                      value={newSite.longitude}
                      onChange={(e) => setNewSite({ ...newSite, longitude: e.target.value })}
                      className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground rounded-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddSite}
                      disabled={isLoading}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none h-10"
                    >
                      {isLoading ? "Adding..." : "Add Site"}
                    </Button>
                    <Button
                      onClick={() => setShowSiteForm(false)}
                      variant="outline"
                      className="flex-1 border-gray-250 text-muted-foreground hover:bg-gray-50 rounded-none h-10"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}

              {clientSites.length === 0 && !showSiteForm && (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-3 opacity-30 text-accent" />
                  <p className="text-sm font-semibold">No client sites added yet</p>
                </div>
              )}

              {clientSites.map((site) => (
                <div
                  key={site.id}
                  className="bg-white hover:bg-gray-50 p-4 rounded-none border border-gray-250 hover:border-accent transition-colors flex flex-col gap-1.5"
                >
                  <p className="font-sans font-normal text-base text-primary">{site.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{site.address}</p>
                  <div className="mt-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-accent border border-accent/25 px-2 py-0.5 bg-accent/5 rounded-none shrink-0">
                      Geofence radius: {site.geofenceRadiusMeters}m
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeline View */}
      {view === "timeline" && (
        <div className="space-y-6">
          <Card className="bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="font-sans font-normal text-primary text-xl">Visit Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground rounded-none"
                />
                <select
                  value={selectedRunner}
                  onChange={(e) => setSelectedRunner(e.target.value)}
                  className="bg-white border border-gray-200 text-primary rounded-none px-3 py-2 text-sm shadow-none focus:outline-none"
                >
                  <option value="" className="text-muted-foreground">Select Runner...</option>
                  {runnerLocations.map((runner) => (
                    <option key={runner.memberId} value={runner.memberId} className="text-primary">
                      {runner.memberName}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={loadVisitTimeline}
                disabled={!selectedRunner || isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none h-12 transition-all shadow-none"
              >
                Load Timeline
              </Button>
            </CardContent>
          </Card>

          {/* Timeline Events */}
          {visitLogs.length > 0 && (
            <Card className="bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="font-sans font-normal text-primary text-xl">{selectedDate} — {visitLogs.length} Events</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {visitLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-none border-l-4 border-l-accent"
                    >
                      <div className="flex-1">
                        <p className="font-sans font-normal text-base text-primary capitalize">
                          {log.actionType.replace(/_/g, " ")}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                        {log.distanceFromSite && (
                          <p className="text-[10px] text-accent/80 font-sans mt-1">
                            Distance: {log.distanceFromSite}m
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 border text-[10px] uppercase tracking-wider font-semibold rounded-none ${
                          log.status === "success"
                            ? "bg-green-500/5 border-green-500/20 text-green-700"
                            : "bg-red-500/5 border-red-500/20 text-red-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Expenses View */}
      {view === "expenses" && (
        <Card className="bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 font-sans font-normal text-primary text-xl">
              <DollarSign className="w-5 h-5 text-accent" />
              Travel Expense Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-sm mb-4 font-sans leading-relaxed">
              Automatically calculates daily travel expenses based on visit locations and configured rates.
            </p>
            <div className="bg-gray-50 p-8 rounded-none text-center border border-dashed border-gray-200">
              <TrendingUp className="w-8 h-8 text-accent/30 mx-auto mb-2" />
              <p className="text-primary font-sans font-normal text-base">Feature coming soon</p>
              <p className="text-xs text-muted-foreground mt-1 font-sans">
                Expense reports will be generated from visit timelines
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
