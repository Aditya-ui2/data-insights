import { db } from "./db";
import { integrations as integrationsTable, datasets as datasetsTable, datasetSnapshots as snapshotsTable } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import path from "path";
import fs from "fs";

export async function executeSync(integrationId: string, userId: string) {
  console.log(`[Scheduler] Auto-sync triggered for integration ${integrationId} (User: ${userId})`);
  
  const [integration] = await db
    .select()
    .from(integrationsTable)
    .where(eq(integrationsTable.id, integrationId));

  if (!integration) {
    console.error(`[Scheduler] Integration ${integrationId} not found.`);
    return;
  }

  try {
    // 1. Update status to syncing
    await db
      .update(integrationsTable)
      .set({ syncStatus: "syncing", lastSyncedAt: new Date() })
      .where(eq(integrationsTable.id, integrationId));

    // 2. Trigger Python sync
    const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
    const pyRes = await fetch(`${PYTHON_URL}/integrations/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integrationId,
        userId,
        incremental: false
      })
    });

    if (!pyRes.ok) {
      const errText = await pyRes.text();
      throw new Error(`Python sync failed: ${errText}`);
    }

    const pyData = await pyRes.json();
    const datasetId = `conn_${integrationId}`;
    const dataDir = path.join(process.cwd(), "backend", "data");
    const jsonPath = path.join(dataDir, `${datasetId}.connector.json`);

    let dataRecords: any[] = [];
    let headers: string[] = [];
    let primaryEntity = pyData.primaryEntity || 'orders';

    if (fs.existsSync(jsonPath)) {
      try {
        const fileContent = fs.readFileSync(jsonPath, "utf-8");
        const validatedEntities = JSON.parse(fileContent);
        dataRecords = validatedEntities[primaryEntity] || [];
        headers = dataRecords.length > 0 ? Object.keys(dataRecords[0]) : pyData.headers || [];
      } catch (readErr) {
        console.error("[Scheduler] Error reading connector json:", readErr);
      }
    }

    // 3. Save snapshot before overwriting
    const [existingDataset] = await db
      .select()
      .from(datasetsTable)
      .where(and(eq(datasetsTable.spreadsheetId, datasetId), eq(datasetsTable.userId, userId)));

    if (existingDataset && existingDataset.data && (existingDataset.data as any[]).length > 0) {
      await db.insert(snapshotsTable).values({
        datasetId: existingDataset.id,
        snapshotData: existingDataset.data as Record<string, any>[]
      });
      console.log(`[Scheduler] Historical snapshot saved for dataset ${existingDataset.id}`);
    }

    // 4. Update or insert dataset
    let dataset;
    if (existingDataset) {
      const [updated] = await db
        .update(datasetsTable)
        .set({
          headers,
          data: dataRecords,
          rowCount: dataRecords.length,
          lastSyncedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(datasetsTable.id, existingDataset.id))
        .returning();
      dataset = updated;
    } else {
      const [inserted] = await db
        .insert(datasetsTable)
        .values({
          userId,
          spreadsheetId: datasetId,
          spreadsheetName: integration.sourceName,
          sheetName: primaryEntity,
          sheetId: 0,
          headers,
          data: dataRecords,
          rowCount: dataRecords.length,
          source: integration.sourceType,
          lastSyncedAt: new Date()
        })
        .returning();
      dataset = inserted;
    }

    // 5. Update syncStatus to synced
    await db
      .update(integrationsTable)
      .set({ syncStatus: "synced" })
      .where(eq(integrationsTable.id, integrationId));

    console.log(`[Scheduler] Integration ${integrationId} synchronized successfully.`);
  } catch (error: any) {
    console.error(`[Scheduler] Sync failed for integration ${integrationId}:`, error);
    await db
      .update(integrationsTable)
      .set({ syncStatus: "failed" })
      .where(eq(integrationsTable.id, integrationId));
  }
}

export function startScheduler() {
  console.log("[Scheduler] Background Sync Scheduler started.");
  
  // Run check every 60 seconds
  setInterval(async () => {
    try {
      const allIntegrations = await db.select().from(integrationsTable);
      
      for (const integration of allIntegrations) {
        if (!integration.syncSchedule || integration.syncSchedule === 'manual') {
          continue;
        }

        const lastSynced = integration.lastSyncedAt ? new Date(integration.lastSyncedAt).getTime() : 0;
        const now = Date.now();
        let shouldSync = false;

        if (integration.syncSchedule === 'hourly') {
          shouldSync = (now - lastSynced) >= 60 * 60 * 1000;
        } else if (integration.syncSchedule === 'daily') {
          shouldSync = (now - lastSynced) >= 24 * 60 * 60 * 1000;
        } else if (integration.syncSchedule === 'weekly') {
          shouldSync = (now - lastSynced) >= 7 * 24 * 60 * 60 * 1000;
        }

        if (shouldSync) {
          // Trigger async sync without blocking the loop
          executeSync(integration.id, integration.userId).catch(err => {
            console.error(`[Scheduler] Async executeSync error for ${integration.id}:`, err);
          });
        }
      }
    } catch (err) {
      console.error("[Scheduler] Error in check loop:", err);
    }
  }, 60 * 1000);
}
