/**
 * Field Tracking Router - Geo-tagged attendance and site visits
 * Handles punch in/out, site check-in/out, and travel expense calculations
 */

import { Router, Request, Response } from "express";
import { db } from "./db";
import {
  visitLogs,
  businessProfiles,
  businessMembers,
  clientSites,
  travelExpenses,
} from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { isAuthenticated } from "./firebaseAuth";
import {
  validateGeofence,
  validateGpsAccuracy,
  calculateTravelDistance,
  parseCoordinates,
  LocationCoords,
} from "./geofencing";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// RUNNER MOBILE ENDPOINTS (Punch In/Out, Check-In/Out)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Punch In - Runner starts their day
 * POST /api/field-tracking/punch-in
 */
router.post("/punch-in", async (req: Request, res: Response) => {
  try {
    const { businessId, memberId, latitude, longitude, gpsAccuracy } = req.body;

    if (!memberId || !businessId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ── GPS Accuracy validation - require ≤50m for attendance ───────────────
    const MAX_GPS_ACCURACY = 50; // meters
    if (gpsAccuracy && gpsAccuracy > MAX_GPS_ACCURACY) {
      return res.status(400).json({
        error: `GPS accuracy too low (±${Math.round(gpsAccuracy)}m). Required: ≤${MAX_GPS_ACCURACY}m. Move to an open area.`,
        gpsAccuracyTooLow: true,
        currentAccuracy: gpsAccuracy,
        requiredAccuracy: MAX_GPS_ACCURACY,
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── One punch-in per day check ──────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingPunchIn = await db.query.visitLogs.findFirst({
      where: and(
        eq(visitLogs.businessId, businessId),
        eq(visitLogs.memberId, memberId),
        eq(visitLogs.actionType, "punch_in"),
        gte(visitLogs.timestamp, todayStart),
        lte(visitLogs.timestamp, todayEnd)
      ),
    });

    if (existingPunchIn) {
      return res.status(409).json({
        error: "Already punched in today",
        alreadyPunchedIn: true,
        record: existingPunchIn,
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    // Create punch-in record
    const record = await db.insert(visitLogs).values({
      businessId,
      memberId,
      actionType: "punch_in",
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      gpsAccuracy: gpsAccuracy || 0,
      status: "success",
    }).returning();

    res.json({
      success: true,
      message: "Punch-in successful",
      record: record[0],
    });
  } catch (error: any) {
    console.error("[Punch-In Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check-In at Client Site
 * POST /api/field-tracking/check-in
 * Validates geofence before allowing check-in
 */
router.post("/check-in", async (req: Request, res: Response) => {
  try {
    const { businessId, memberId, clientSiteId, latitude, longitude, gpsAccuracy } = req.body;

    if (!memberId || !businessId || !clientSiteId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get site details
    const site = await db.query.clientSites.findFirst({
      where: eq(clientSites.id, clientSiteId),
    });

    if (!site) {
      return res.status(404).json({ error: "Site not found" });
    }

    // Parse site coordinates
    const siteCoords = parseCoordinates(site.latitude, site.longitude);
    if (!siteCoords) {
      return res.status(500).json({ error: "Invalid site coordinates" });
    }

    // Validate geofence
    const runnerCoords: LocationCoords = { latitude, longitude };
    const geofenceResult = validateGeofence(runnerCoords, siteCoords, site.geofenceRadiusMeters ?? 100);

    if (!geofenceResult.isValid) {
      const blockedRecord = await db.insert(visitLogs).values({
        businessId,
        memberId,
        clientSiteId,
        actionType: "check_in",
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        gpsAccuracy: gpsAccuracy || 0,
        distanceFromSite: geofenceResult.distance,
        status: "blocked",
        errorMessage: geofenceResult.errorMessage,
      }).returning();

      return res.status(400).json({
        error: geofenceResult.errorMessage,
        distance: geofenceResult.distance,
        status: "blocked",
        record: blockedRecord[0],
      });
    }

    // Check-in allowed
    const successRecord = await db.insert(visitLogs).values({
      businessId,
      memberId,
      clientSiteId,
      actionType: "check_in",
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      gpsAccuracy: gpsAccuracy || 0,
      distanceFromSite: geofenceResult.distance,
      status: "success",
    }).returning();

    res.json({
      success: true,
      message: "Check-in successful",
      distance: geofenceResult.distance,
      record: successRecord[0],
    });
  } catch (error: any) {
    console.error("[Check-In Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check-Out from Client Site
 * POST /api/field-tracking/check-out
 */
router.post("/check-out", async (req: Request, res: Response) => {
  try {
    const { businessId, memberId, clientSiteId, latitude, longitude, gpsAccuracy } = req.body;

    if (!memberId || !businessId || !clientSiteId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create check-out record
    const record = await db.insert(visitLogs).values({
      businessId,
      memberId,
      clientSiteId,
      actionType: "check_out",
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      gpsAccuracy: gpsAccuracy || 0,
      status: "success",
    }).returning();

    res.json({
      success: true,
      message: "Check-out successful",
      record: record[0],
    });
  } catch (error: any) {
    console.error("[Check-Out Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Live Location Update - Runner sends GPS ping while active (Swiggy/Zomato style tracking)
 * POST /api/field-tracking/location-ping
 * Called every 10 seconds while runner's day is active
 */
router.post("/location-ping", async (req: Request, res: Response) => {
  try {
    const { businessId, memberId, latitude, longitude, gpsAccuracy } = req.body;

    if (!memberId || !businessId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Insert a location_update log (or upsert to keep only latest)
    const record = await db.insert(visitLogs).values({
      businessId,
      memberId,
      actionType: "location_update",
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      gpsAccuracy: gpsAccuracy || 0,
      status: "success",
    }).returning();

    res.json({ success: true, timestamp: record[0].timestamp });
  } catch (error: any) {
    console.error("[Location Ping Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Punch Out - Runner ends their day
 * POST /api/field-tracking/punch-out
 */
router.post("/punch-out", async (req: Request, res: Response) => {
  try {
    const { businessId, memberId, latitude, longitude, gpsAccuracy } = req.body;

    if (!memberId || !businessId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create punch-out record
    const record = await db.insert(visitLogs).values({
      businessId,
      memberId,
      actionType: "punch_out",
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      gpsAccuracy: gpsAccuracy || 0,
      status: "success",
    }).returning();

    res.json({
      success: true,
      message: "Punch-out successful, day ended",
      record: record[0],
    });
  } catch (error: any) {
    console.error("[Punch-Out Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Today's Logs for a Runner by memberId (no auth check — memberId acts as identifier)
 * GET /api/field-tracking/my-today/:businessId/:memberId
 */
router.get("/my-today/:businessId/:memberId", async (req: Request, res: Response) => {
  try {
    const { businessId, memberId } = req.params;

    const today = new Date();
    // Use local IST offset (+5:30)
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await db.query.visitLogs.findMany({
      where: and(
        eq(visitLogs.businessId, businessId),
        eq(visitLogs.memberId, memberId),
        gte(visitLogs.timestamp, startOfDay),
        lte(visitLogs.timestamp, endOfDay)
      ),
      orderBy: [visitLogs.timestamp],
    });

    res.json({ logs });
  } catch (error: any) {
    console.error("[MyToday Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Today's Visit Timeline
 * GET /api/field-tracking/today-timeline/:businessId
 */
router.get("/today-timeline/:businessId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify member
    const member = await db.query.businessMembers.findFirst({
      where: and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.userId, userId)
      ),
    });

    if (!member) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Get today's logs
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = new Date(`${today}T00:00:00Z`);
    const endOfDay = new Date(`${today}T23:59:59Z`);

    const logs = await db.query.visitLogs.findMany({
      where: and(
        eq(visitLogs.businessId, businessId),
        eq(visitLogs.memberId, member.id),
        gte(visitLogs.timestamp, startOfDay),
        lte(visitLogs.timestamp, endOfDay)
      ),
      orderBy: desc(visitLogs.timestamp),
    });

    res.json({ timeline: logs, memberName: member.name });
  } catch (error: any) {
    console.error("[Timeline Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get All Client Sites for a Business
 * GET /api/field-tracking/sites/:businessId
 */
router.get("/sites/:businessId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;

    const sites = await db.query.clientSites.findMany({
      where: eq(clientSites.businessId, businessId),
    });

    res.json({ sites });
  } catch (error: any) {
    console.error("[Get Sites Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create New Client Site
 * POST /api/field-tracking/sites
 */
router.post("/sites", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId, name, address, latitude, longitude, contactPerson, contactPhone } = req.body;

    // Verify user is admin/owner
    const member = await db.query.businessMembers.findFirst({
      where: and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.userId, req.user?.claims?.sub ?? "")
      ),
    });

    if (!member || !["owner", "manager"].includes(member.memberRole)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const newSite = await db.insert(clientSites).values({
      businessId,
      name,
      address,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      contactPerson,
      contactPhone,
    }).returning();

    res.json({ site: newSite[0] });
  } catch (error: any) {
    console.error("[Create Site Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Live Locations of All Active Runners
 * GET /api/field-tracking/live-locations/:businessId
 */
router.get("/live-locations/:businessId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;

    // Get all active members of the business
    const activeMembers = await db.query.businessMembers.findMany({
      where: and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.status, "active")
      ),
    });

    // Get today's date range
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = new Date(`${today}T00:00:00Z`);
    const endOfDay = new Date(`${today}T23:59:59Z`);

    const locations = await Promise.all(
      activeMembers.map(async (member) => {
        // Get latest log today
        const latestLog = await db.query.visitLogs.findFirst({
          where: and(
            eq(visitLogs.memberId, member.id),
            gte(visitLogs.timestamp, startOfDay),
            lte(visitLogs.timestamp, endOfDay)
          ),
          orderBy: desc(visitLogs.timestamp),
        });

        if (!latestLog) return null;
        // Hide runners who already punched out
        if (latestLog.actionType === "punch_out") return null;

        return {
          memberId: member.id,
          memberName: member.name,
          latitude: parseFloat(latestLog.latitude),
          longitude: parseFloat(latestLog.longitude),
          lastUpdated: latestLog.timestamp,
          actionType: latestLog.actionType,
        };
      })
    );

    res.json({ locations: locations.filter((l) => l !== null) });
  } catch (error: any) {
    console.error("[Live Locations Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Runner's Path/Trail for Today (all location points for drawing route line)
 * GET /api/field-tracking/runner-paths/:businessId
 */
router.get("/runner-paths/:businessId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;

    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get all today's location logs for this business
    const allLogs = await db.query.visitLogs.findMany({
      where: and(
        eq(visitLogs.businessId, businessId),
        gte(visitLogs.timestamp, todayStart),
        lte(visitLogs.timestamp, todayEnd)
      ),
      orderBy: [visitLogs.timestamp], // chronological order
    });

    // Group logs by memberId and extract coordinates
    const pathsByMember: Record<string, Array<{lat: number; lng: number; time: string; action: string}>> = {};

    for (const log of allLogs) {
      if (!pathsByMember[log.memberId]) {
        pathsByMember[log.memberId] = [];
      }
      // Skip if punch_out (end of journey)
      if (log.actionType !== "punch_out") {
        pathsByMember[log.memberId].push({
          lat: parseFloat(log.latitude),
          lng: parseFloat(log.longitude),
          time: log.timestamp?.toISOString() || "",
          action: log.actionType,
        });
      }
    }

    res.json({ paths: pathsByMember });
  } catch (error: any) {
    console.error("[Runner Paths Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Member's Visit Details for a Date
 * GET /api/field-tracking/member-visits/:businessId/:memberId?date=YYYY-MM-DD
 */
router.get("/member-visits/:businessId/:memberId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId, memberId } = req.params;
    const { date } = req.query;

    const dateStr = (date as string) || new Date().toISOString().split("T")[0];
    const startOfDay = new Date(`${dateStr}T00:00:00Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59Z`);

    const visits = await db.query.visitLogs.findMany({
      where: and(
        eq(visitLogs.businessId, businessId),
        eq(visitLogs.memberId, memberId),
        gte(visitLogs.timestamp, startOfDay),
        lte(visitLogs.timestamp, endOfDay)
      ),
      orderBy: visitLogs.timestamp,
    });

    res.json({ visits, date: dateStr });
  } catch (error: any) {
    console.error("[Member Visits Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Calculate Daily Travel Expense
 * POST /api/field-tracking/calculate-expense
 */
router.post("/calculate-expense", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId, memberId, date, ratePerKm } = req.body;

    // Verify user is admin/owner
    const member = await db.query.businessMembers.findFirst({
      where: and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.userId, req.user?.claims?.sub ?? "")
      ),
    });

    if (!member || !["owner", "manager"].includes(member.memberRole)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const dateStr = date || new Date().toISOString().split("T")[0];
    const startOfDay = new Date(`${dateStr}T00:00:00Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59Z`);

    // Get all visit logs for the member on this date
    const visits = await db.query.visitLogs.findMany({
      where: and(
        eq(visitLogs.businessId, businessId),
        eq(visitLogs.memberId, memberId),
        gte(visitLogs.timestamp, startOfDay),
        lte(visitLogs.timestamp, endOfDay),
        eq(visitLogs.status, "success") // only successful check-ins
      ),
      orderBy: visitLogs.timestamp,
    });

    // Extract coordinates for distance calculation
    const locations: LocationCoords[] = visits.map((v) => ({
      latitude: parseFloat(v.latitude),
      longitude: parseFloat(v.longitude),
    }));

    const { calculateTravelDistance } = await import("./geofencing");
    const distanceKm = calculateTravelDistance(locations);
    const rate = ratePerKm || 500; // default ₹5 per km (500 paise)
    const totalExpense = Math.round(distanceKm * rate);

    // Save travel expense
    const expenseRecord = await db.insert(travelExpenses).values({
      businessId,
      memberId,
      expenseDate: dateStr,
      totalDistanceKm: distanceKm.toString(),
      ratePerKm: rate,
      totalExpenseAmount: totalExpense,
      visitCount: visits.length,
    }).returning();

    res.json({
      distanceKm,
      ratePerKm: rate,
      totalExpense,
      visitCount: visits.length,
      expenseRecord: expenseRecord[0],
    });
  } catch (error: any) {
    console.error("[Calculate Expense Error]", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
