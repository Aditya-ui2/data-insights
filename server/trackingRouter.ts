/**
 * Tracking Router – Dynamic Field Tracking System
 * Admin defines templates, employees fill daily forms, data flows to dashboard
 * 
 * Templates:
 * GET    /api/tracking/templates/:businessId         — fetch all templates
 * GET    /api/tracking/templates/:businessId/my      — fetch templates for current employee
 * POST   /api/tracking/templates                     — create template (admin only)
 * PATCH  /api/tracking/templates/:templateId         — update template
 * DELETE /api/tracking/templates/:templateId         — delete template
 * 
 * Logs:
 * GET    /api/tracking/logs/:businessId              — fetch logs (with filters)
 * GET    /api/tracking/logs/:businessId/my           — fetch current employee's logs
 * POST   /api/tracking/logs                          — submit daily log
 * PATCH  /api/tracking/logs/:logId                   — update log
 * PATCH  /api/tracking/logs/:logId/review            — review/approve log (admin)
 */

import { Router, Request, Response } from "express";
import { db } from "./db";
import { trackingTemplates, trackingLogs, businessMembers, businessVerticals } from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { isAuthenticated } from "./firebaseAuth";

const router = Router();

// Helper – resolve caller's memberId from the authenticated user
async function getCallerMember(userId: string, businessId: string) {
  const member = await db.query.businessMembers.findFirst({
    where: and(
      eq(businessMembers.businessId, businessId),
      eq(businessMembers.userId, userId)
    ),
  });
  return member;
}

// Helper – check if user is admin/owner/manager
function isAdminRole(role: string | null): boolean {
  return role === "owner" || role === "manager";
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/tracking/templates/:businessId
 * Fetch all templates for a business (admin view)
 */
router.get("/templates/:businessId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const member = await getCallerMember(userId, businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });

    const templates = await db.query.trackingTemplates.findMany({
      where: eq(trackingTemplates.businessId, businessId),
      orderBy: [trackingTemplates.sortOrder],
    });

    res.json({ templates });
  } catch (err: any) {
    console.error("[Tracking] GET templates error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tracking/templates/:businessId/my
 * Fetch templates applicable to the current employee
 */
router.get("/templates/:businessId/my", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const member = await getCallerMember(userId, businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });

    // Get all active templates for this business
    const allTemplates = await db.query.trackingTemplates.findMany({
      where: and(
        eq(trackingTemplates.businessId, businessId),
        eq(trackingTemplates.isActive, true)
      ),
      orderBy: [trackingTemplates.sortOrder],
    });

    // Filter templates that apply to this member
    const myTemplates = allTemplates.filter((template) => {
      if (template.appliesTo === "all") return true;
      if (template.appliesTo === "member" && template.targetMemberIds?.includes(member.id)) return true;
      // Add vertical check if needed
      return false;
    });

    res.json({ templates: myTemplates });
  } catch (err: any) {
    console.error("[Tracking] GET my templates error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tracking/templates
 * Create a new tracking template (admin only)
 */
router.post("/templates", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId, name, description, fieldsConfig, appliesTo, targetVerticalId, targetMemberIds, frequency } = req.body;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!businessId || !name || !fieldsConfig || !Array.isArray(fieldsConfig)) {
      return res.status(400).json({ error: "businessId, name, and fieldsConfig array required" });
    }

    const member = await getCallerMember(userId, businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });
    if (!isAdminRole(member.memberRole)) {
      return res.status(403).json({ error: "Only admin/manager can create templates" });
    }

    // Validate fieldsConfig structure
    for (const field of fieldsConfig) {
      if (!field.name || !field.key || !field.type) {
        return res.status(400).json({ error: "Each field must have name, key, and type" });
      }
    }

    const [template] = await db
      .insert(trackingTemplates)
      .values({
        businessId,
        name: name.trim(),
        description: description?.trim() ?? null,
        fieldsConfig,
        appliesTo: appliesTo ?? "all",
        targetVerticalId: targetVerticalId ?? null,
        targetMemberIds: targetMemberIds ?? [],
        frequency: frequency ?? "daily",
        createdBy: member.id,
      })
      .returning();

    res.status(201).json({ template });
  } catch (err: any) {
    console.error("[Tracking] POST template error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/tracking/templates/:templateId
 * Update a tracking template
 */
router.patch("/templates/:templateId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const existing = await db.query.trackingTemplates.findFirst({
      where: eq(trackingTemplates.id, templateId),
    });
    if (!existing) return res.status(404).json({ error: "Template not found" });

    const member = await getCallerMember(userId, existing.businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });
    if (!isAdminRole(member.memberRole)) {
      return res.status(403).json({ error: "Only admin/manager can update templates" });
    }

    const { name, description, fieldsConfig, isActive, appliesTo, targetVerticalId, targetMemberIds, frequency } = req.body;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() ?? null;
    if (fieldsConfig !== undefined) updateData.fieldsConfig = fieldsConfig;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (appliesTo !== undefined) updateData.appliesTo = appliesTo;
    if (targetVerticalId !== undefined) updateData.targetVerticalId = targetVerticalId;
    if (targetMemberIds !== undefined) updateData.targetMemberIds = targetMemberIds;
    if (frequency !== undefined) updateData.frequency = frequency;

    const [updated] = await db
      .update(trackingTemplates)
      .set(updateData)
      .where(eq(trackingTemplates.id, templateId))
      .returning();

    res.json({ template: updated });
  } catch (err: any) {
    console.error("[Tracking] PATCH template error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/tracking/templates/:templateId
 * Delete a tracking template
 */
router.delete("/templates/:templateId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const existing = await db.query.trackingTemplates.findFirst({
      where: eq(trackingTemplates.id, templateId),
    });
    if (!existing) return res.status(404).json({ error: "Template not found" });

    const member = await getCallerMember(userId, existing.businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });
    if (!isAdminRole(member.memberRole)) {
      return res.status(403).json({ error: "Only admin/manager can delete templates" });
    }

    await db.delete(trackingTemplates).where(eq(trackingTemplates.id, templateId));

    res.json({ success: true });
  } catch (err: any) {
    console.error("[Tracking] DELETE template error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LOG ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/tracking/logs/:businessId
 * Fetch all logs for a business (with optional filters)
 * Query params: templateId, memberId, startDate, endDate, status
 */
router.get("/logs/:businessId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { templateId, memberId, startDate, endDate, status } = req.query;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const member = await getCallerMember(userId, businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });

    // Build where conditions
    let logs = await db.query.trackingLogs.findMany({
      where: eq(trackingLogs.businessId, businessId),
      orderBy: [desc(trackingLogs.logDate), desc(trackingLogs.createdAt)],
      with: {
        // We'll join member info separately if needed
      },
    });

    // Apply filters
    if (templateId) {
      logs = logs.filter((log) => log.templateId === templateId);
    }
    if (memberId) {
      logs = logs.filter((log) => log.memberId === memberId);
    }
    if (startDate) {
      logs = logs.filter((log) => log.logDate >= startDate);
    }
    if (endDate) {
      logs = logs.filter((log) => log.logDate <= endDate);
    }
    if (status) {
      logs = logs.filter((log) => log.status === status);
    }

    // Enrich with member names
    const memberIds = Array.from(new Set(logs.map((l) => l.memberId)));
    const members = await db.query.businessMembers.findMany({
      where: eq(businessMembers.businessId, businessId),
    });
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const enrichedLogs = logs.map((log) => ({
      ...log,
      memberName: memberMap.get(log.memberId)?.name ?? "Unknown",
      memberEmail: memberMap.get(log.memberId)?.email ?? "",
    }));

    res.json({ logs: enrichedLogs });
  } catch (err: any) {
    console.error("[Tracking] GET logs error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tracking/logs/:businessId/my
 * Fetch current employee's own logs
 */
router.get("/logs/:businessId/my", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const member = await getCallerMember(userId, businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });

    let logs = await db.query.trackingLogs.findMany({
      where: and(
        eq(trackingLogs.businessId, businessId),
        eq(trackingLogs.memberId, member.id)
      ),
      orderBy: [desc(trackingLogs.logDate)],
    });

    // Apply date filters
    if (startDate) {
      logs = logs.filter((log) => log.logDate >= startDate);
    }
    if (endDate) {
      logs = logs.filter((log) => log.logDate <= endDate);
    }

    res.json({ logs });
  } catch (err: any) {
    console.error("[Tracking] GET my logs error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tracking/logs
 * Submit a daily log entry
 */
router.post("/logs", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId, templateId, logDate, submittedData, notes, status } = req.body;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!businessId || !templateId || !logDate || !submittedData) {
      return res.status(400).json({ error: "businessId, templateId, logDate, and submittedData required" });
    }

    const member = await getCallerMember(userId, businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });

    // Verify template exists and is active
    const template = await db.query.trackingTemplates.findFirst({
      where: and(
        eq(trackingTemplates.id, templateId),
        eq(trackingTemplates.businessId, businessId)
      ),
    });
    if (!template) return res.status(404).json({ error: "Template not found" });
    if (!template.isActive) return res.status(400).json({ error: "Template is no longer active" });

    // Check if log already exists for this date + template + member
    const existing = await db.query.trackingLogs.findFirst({
      where: and(
        eq(trackingLogs.memberId, member.id),
        eq(trackingLogs.templateId, templateId),
        eq(trackingLogs.logDate, logDate)
      ),
    });

    if (existing) {
      // Update existing log
      const [updated] = await db
        .update(trackingLogs)
        .set({
          submittedData,
          notes: notes ?? existing.notes,
          status: status ?? "submitted",
          updatedAt: new Date(),
        })
        .where(eq(trackingLogs.id, existing.id))
        .returning();

      return res.json({ log: updated, updated: true });
    }

    // Create new log
    const [log] = await db
      .insert(trackingLogs)
      .values({
        businessId,
        templateId,
        memberId: member.id,
        logDate,
        submittedData,
        notes: notes ?? null,
        status: status ?? "submitted",
      })
      .returning();

    res.status(201).json({ log, created: true });
  } catch (err: any) {
    console.error("[Tracking] POST log error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/tracking/logs/:logId
 * Update a log entry (employee can update their own draft/submitted)
 */
router.patch("/logs/:logId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const existing = await db.query.trackingLogs.findFirst({
      where: eq(trackingLogs.id, logId),
    });
    if (!existing) return res.status(404).json({ error: "Log not found" });

    const member = await getCallerMember(userId, existing.businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });

    // Only allow editing own logs (unless admin)
    if (existing.memberId !== member.id && !isAdminRole(member.memberRole)) {
      return res.status(403).json({ error: "Cannot edit another member's log" });
    }

    const { submittedData, notes, status } = req.body;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (submittedData !== undefined) updateData.submittedData = submittedData;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db
      .update(trackingLogs)
      .set(updateData)
      .where(eq(trackingLogs.id, logId))
      .returning();

    res.json({ log: updated });
  } catch (err: any) {
    console.error("[Tracking] PATCH log error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/tracking/logs/:logId/review
 * Review/approve a log entry (admin only)
 */
router.patch("/logs/:logId/review", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    const { status, managerNote } = req.body;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const existing = await db.query.trackingLogs.findFirst({
      where: eq(trackingLogs.id, logId),
    });
    if (!existing) return res.status(404).json({ error: "Log not found" });

    const member = await getCallerMember(userId, existing.businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });
    if (!isAdminRole(member.memberRole)) {
      return res.status(403).json({ error: "Only admin/manager can review logs" });
    }

    const [updated] = await db
      .update(trackingLogs)
      .set({
        status: status ?? "reviewed",
        managerNote: managerNote ?? null,
        reviewedBy: member.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(trackingLogs.id, logId))
      .returning();

    res.json({ log: updated });
  } catch (err: any) {
    console.error("[Tracking] PATCH review error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tracking/logs/:businessId/summary
 * Get aggregated summary of tracking data for dashboard
 */
router.get("/logs/:businessId/summary", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { templateId, startDate, endDate } = req.query;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const member = await getCallerMember(userId, businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });

    // Fetch all logs for the period
    let logs = await db.query.trackingLogs.findMany({
      where: eq(trackingLogs.businessId, businessId),
      orderBy: [desc(trackingLogs.logDate)],
    });

    // Apply filters
    if (templateId) {
      logs = logs.filter((log) => log.templateId === templateId);
    }
    if (startDate) {
      logs = logs.filter((log) => log.logDate >= startDate);
    }
    if (endDate) {
      logs = logs.filter((log) => log.logDate <= endDate);
    }

    // Get template to know field types
    const templates = await db.query.trackingTemplates.findMany({
      where: eq(trackingTemplates.businessId, businessId),
    });
    const templateMap = new Map(templates.map((t) => [t.id, t]));

    // Aggregate numeric fields
    const aggregations: Record<string, { sum: number; count: number; values: number[] }> = {};
    
    for (const log of logs) {
      const template = templateMap.get(log.templateId);
      if (!template) continue;

      for (const field of template.fieldsConfig || []) {
        if (field.type === "number" || field.type === "currency") {
          const value = Number(log.submittedData?.[field.key]) || 0;
          if (!aggregations[field.key]) {
            aggregations[field.key] = { sum: 0, count: 0, values: [] };
          }
          aggregations[field.key].sum += value;
          aggregations[field.key].count += 1;
          aggregations[field.key].values.push(value);
        }
      }
    }

    // Calculate averages
    const summary = Object.entries(aggregations).map(([key, data]) => ({
      fieldKey: key,
      total: data.sum,
      average: data.count > 0 ? data.sum / data.count : 0,
      count: data.count,
      min: Math.min(...data.values),
      max: Math.max(...data.values),
    }));

    res.json({
      summary,
      totalLogs: logs.length,
      periodStart: startDate || "all",
      periodEnd: endDate || "all",
    });
  } catch (err: any) {
    console.error("[Tracking] GET summary error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
