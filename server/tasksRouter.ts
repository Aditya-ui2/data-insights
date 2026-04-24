/**
 * Tasks Router – Kanban-style task management for business teams
 * GET    /api/tasks/:businessId         — fetch all tasks for a business
 * POST   /api/tasks                     — create a task
 * PATCH  /api/tasks/:taskId             — update title / desc / priority / status / dueDate
 * PATCH  /api/tasks/:taskId/status      — move card between columns
 * DELETE /api/tasks/:taskId             — delete a task
 */

import { Router, Request, Response } from "express";
import { db } from "./db";
import { businessTasks, businessMembers } from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { isAuthenticated } from "./firebaseAuth";

const router = Router();

// Helper – resolve callerʼs memberId from the authenticated user
async function getCallerMemberId(
  userId: string,
  businessId: string
): Promise<{ member: typeof businessMembers.$inferSelect | undefined }> {
  const member = await db.query.businessMembers.findFirst({
    where: and(
      eq(businessMembers.businessId, businessId),
      eq(businessMembers.userId, userId)
    ),
  });
  return { member };
}

/* ─── GET /api/tasks/:businessId ─────────────────────────────────────────── */
router.get("/:businessId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { member } = await getCallerMemberId(userId, businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });

    const tasks = await db.query.businessTasks.findMany({
      where: eq(businessTasks.businessId, businessId),
      orderBy: asc(businessTasks.sortOrder),
    });

    res.json({ tasks });
  } catch (err: any) {
    console.error("[Tasks] GET error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /api/tasks ────────────────────────────────────────────────────── */
router.post("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { businessId, title, description, assignedToMemberId, priority, dueDate, tags } = req.body;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!businessId || !title) return res.status(400).json({ error: "businessId and title required" });

    const { member } = await getCallerMemberId(userId, businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });

    const [task] = await db
      .insert(businessTasks)
      .values({
        businessId,
        title: title.trim(),
        description: description?.trim() ?? null,
        assignedToMemberId: assignedToMemberId ?? null,
        createdByMemberId: member.id,
        priority: priority ?? "medium",
        dueDate: dueDate ?? null,
        tags: tags ?? [],
        status: "todo",
      })
      .returning();

    res.status(201).json({ task });
  } catch (err: any) {
    console.error("[Tasks] POST error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─── PATCH /api/tasks/:taskId ───────────────────────────────────────────── */
router.patch("/:taskId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const existing = await db.query.businessTasks.findFirst({
      where: eq(businessTasks.id, taskId),
    });
    if (!existing) return res.status(404).json({ error: "Task not found" });

    const { member } = await getCallerMemberId(userId, existing.businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });

    const { title, description, assignedToMemberId, priority, status, dueDate, tags } = req.body;
    const updates: Partial<typeof businessTasks.$inferInsert> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (assignedToMemberId !== undefined) updates.assignedToMemberId = assignedToMemberId;
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) updates.status = status;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (tags !== undefined) updates.tags = tags;

    const [updated] = await db
      .update(businessTasks)
      .set(updates)
      .where(eq(businessTasks.id, taskId))
      .returning();

    res.json({ task: updated });
  } catch (err: any) {
    console.error("[Tasks] PATCH error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─── DELETE /api/tasks/:taskId ──────────────────────────────────────────── */
router.delete("/:taskId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const existing = await db.query.businessTasks.findFirst({
      where: eq(businessTasks.id, taskId),
    });
    if (!existing) return res.status(404).json({ error: "Task not found" });

    const { member } = await getCallerMemberId(userId, existing.businessId);
    if (!member) return res.status(403).json({ error: "Not a member of this business" });

    if (!["owner", "manager"].includes(member.memberRole) && member.id !== existing.createdByMemberId) {
      return res.status(403).json({ error: "Only the creator or a manager can delete this task" });
    }

    await db.delete(businessTasks).where(eq(businessTasks.id, taskId));
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Tasks] DELETE error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
