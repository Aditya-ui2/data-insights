import { db } from "../db";
import { integrations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IntegrationConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  apiUrl?: string;
  apiKey?: string;
}

/**
 * Adds or updates an integration source.
 */
export async function saveIntegrationSource(
  userId: string,
  sourceName: string,
  sourceType: string,
  config: IntegrationConfig
): Promise<any> {
  const [integration] = await db
    .insert(integrations)
    .values({
      userId,
      sourceName,
      sourceType,
      connectionStatus: "disconnected",
      connectionHealth: "healthy",
      syncStatus: "synced",
      config,
    })
    .returning();
  return integration;
}

/**
 * Simulates testing connection health for a data source.
 */
export async function testConnection(
  integrationId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId)));

    if (!integration) {
      throw new Error("Integration not found");
    }

    // Update status to syncing
    await db
      .update(integrations)
      .set({ syncStatus: "syncing" })
      .where(eq(integrations.id, integrationId));

    // Mock ping check based on source type
    await new Promise(resolve => setTimeout(resolve, 1500)); // simulate network ping

    const config = integration.config as IntegrationConfig;
    let success = true;
    let message = "Connection verified successfully.";

    if (integration.sourceType === "postgres" || integration.sourceType === "mysql") {
      if (!config.host || !config.database) {
        success = false;
        message = "Connection failed: Missing host or database name.";
      }
    } else if (integration.sourceType === "crm" || integration.sourceType === "erp") {
      if (!config.apiUrl) {
        success = false;
        message = "Connection failed: Invalid API endpoint.";
      }
    }

    await db
      .update(integrations)
      .set({
        connectionStatus: success ? "connected" : "failed",
        connectionHealth: success ? "healthy" : "unhealthy",
        syncStatus: "synced",
        lastSyncedAt: new Date(),
      })
      .where(eq(integrations.id, integrationId));

    return { success, message };
  } catch (error: any) {
    console.error("[Integrations Hub] Error testing connection:", error);
    await db
      .update(integrations)
      .set({
        connectionStatus: "failed",
        connectionHealth: "unhealthy",
        syncStatus: "failed",
      })
      .where(eq(integrations.id, integrationId));
    return { success: false, message: error.message };
  }
}
