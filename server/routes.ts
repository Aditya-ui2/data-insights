// API Routes - Firebase Authentication - DataInsights v2.0
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { conversations as conversationsTable, businessMembers as businessMembersTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import { setupFirebaseAuth, isAuthenticated, optionalAuth } from "./firebaseAuth";
import fieldTrackingRouter from "./fieldTrackingRouter";
import tasksRouter from "./tasksRouter";
import trackingRouter from "./trackingRouter";
import { 
  isGoogleOAuthConfigured,
  getGoogleAuthUrl, 
  parseOAuthState,
  exchangeCodeForTokens, 
  getValidAccessToken,
  listSpreadsheets,
  getSheetData,
  getExpectedRedirectUri
} from "./googleAuth";
import { generateDashboard, chatWithData, generateFormula, generateChart, generatePivot } from "./gemini";
import { groqChatWithData, isGroqAvailable } from "./groq";
import { fastChat, deepAnalysis, healthCheck } from "./aiRouter";
import { randomBytes } from "crypto";
import type { DashboardConfig, UserPlanFeatures, EodEntry, TeamPerformanceSummary } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";
import { getAllIndustryTemplates, getIndustryTemplateList, getIndustryTemplate } from "./industryTemplates";
import { indexDataset, retrieveRelevantChunks, formatContext } from "./ragSearch";
import { buildBusinessContext } from "./businessContext";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

import { parseDocument, indexKnowledgeBaseDocument, retrieveRelevantKbChunks } from "./services/knowledgeBase";
import { queryBusinessData } from "./services/dataCopilot";
import { orchestrateAgentAnalysis } from "./services/agentWorkspace";
import { createCopilotAction, executeCopilotAction } from "./services/actionsCenter";
import { 
  getShopifyGraphQLTypeName, 
  introspectShopifyType, 
  fetchShopifyMetafieldDefinitions, 
  parseIntrospectionToFieldNodes 
} from "./services/shopifySchemaFetcher";

import { 
  knowledgeBaseDocuments as kbDocsTable, 
  knowledgeBaseChunks as kbChunksTable, 
  copilotActions as copilotActionsTable, 
  integrations as integrationsTable, 
  agentReports as agentReportsTable,
  datasets as datasetsTable,
  users as usersTable,
  alerts as alertsTable,
  datasetSnapshots as snapshotsTable
} from "@shared/schema";
import { desc, and, or } from "drizzle-orm";

// Max file size set to Enterprise limit; plan-specific checks done in handler
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (Enterprise max)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

// Default plan limits
const FREE_AI_ACTIONS_PER_DAY = 100000000;
const PRO_AI_ACTIONS_PER_DAY = 100000000;
const ENTERPRISE_AI_ACTIONS_PER_DAY = 100000000;

// Premium whitelist emails (manual activation)
const PREMIUM_WHITELIST = new Set([
  'sarthakjhalani8@gmail.com',
  'admin@datainsights.com'
]);

// Get user's plan features based on their subscription/whitelist
async function getUserPlanFeatures(userId: string, userEmail: string | null): Promise<UserPlanFeatures> {
  // Check whitelist first
  if (userEmail && PREMIUM_WHITELIST.has(userEmail.toLowerCase())) {
    return {
      planName: 'pro',
      displayName: 'Pro (Whitelisted)',
      aiActionsPerDay: PRO_AI_ACTIONS_PER_DAY,
      maxFileSize: 50, // 50MB
      maxFiles: 10,
      features: ['groq_chat', 'forecasting', 'unlimited_history', 'priority_support', 'advanced_charts'],
      isPremium: true
    };
  }
  
  // Check database whitelist
  const dbWhitelist = await storage.getPremiumWhitelist(userEmail || '');
  if (dbWhitelist) {
    return {
      planName: dbWhitelist.planName,
      displayName: dbWhitelist.planName === 'enterprise' ? 'Enterprise' : 'Pro',
      aiActionsPerDay: dbWhitelist.planName === 'enterprise' ? ENTERPRISE_AI_ACTIONS_PER_DAY : PRO_AI_ACTIONS_PER_DAY,
      maxFileSize: dbWhitelist.planName === 'enterprise' ? 100 : 50,
      maxFiles: dbWhitelist.planName === 'enterprise' ? 50 : 10,
      features: ['groq_chat', 'forecasting', 'unlimited_history', 'priority_support', 'advanced_charts'],
      isPremium: true
    };
  }
  
  // Default free plan
  return {
    planName: 'free',
    displayName: 'Free',
    aiActionsPerDay: FREE_AI_ACTIONS_PER_DAY,
    maxFileSize: 10, // 10MB
    maxFiles: 2,
    features: ['basic_charts', 'basic_chat'],
    isPremium: false
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupFirebaseAuth(app);

  // Ensure the default admin demo user exists in the database so Google OAuth token storage works
  try {
    await storage.upsertUser({
      id: "admin-demo-id",
      email: "admin@demodatainsights.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      onboardingComplete: true
    });
    console.log("Admin demo user verified in database.");
  } catch (err: any) {
    console.error("Failed to seed admin demo user:", err.message);
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user.dbUser;
      if (!user) {
        const userId = req.user.claims.sub;
        try {
          const fetchedUser = await storage.getUser(userId);
          if (fetchedUser) {
            return res.json(fetchedUser);
          }
        } catch (dbErr) {
          console.warn("[API] Failed to fetch user from DB, using fallback", dbErr);
        }
        // If we don't have a user (or DB failed), just use what we have in req.user
        return res.json(req.user.dbUser);
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      // Fallback: return the user from the request object instead of erroring
      res.json(req.user.dbUser);
    }
  });

  // User profile update (onboarding)
  app.patch('/api/users/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role, goals, onboardingComplete } = req.body;
      const user = await storage.updateUser(userId, { role, goals, onboardingComplete });
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      // If DB fails, update our in-memory (fallback) user and return that
      const updatedUser = { ...req.user.dbUser, ...req.body, updatedAt: new Date() };
      req.user.dbUser = updatedUser;
      res.json(updatedUser);
    }
  });

  // Google OAuth routes
  app.get('/api/google/auth-url', optionalAuth, (req: any, res) => {
    try {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const redirectUri = `${protocol}://${host}/api/google/callback`;
      const userId = req.user?.claims?.sub || 'admin-demo-id';
      const loginHint = req.user?.claims?.email || undefined;
      const authUrl = getGoogleAuthUrl(redirectUri, userId, loginHint);
      res.json({ url: authUrl });
    } catch (error: any) {
      console.error('Google OAuth error:', error.message);
      res.status(503).json({ 
        error: 'Google Sheets integration is not configured',
        message: 'Please use Excel file upload instead, or contact administrator to configure Google OAuth.'
      });
    }
  });

  app.get('/api/google/callback', async (req: any, res) => {
    try {
      const { code, state } = req.query;
      
      if (!state) {
        console.error("Missing state parameter in Google callback");
        return res.redirect('/?google_error=missing_state');
      }
      
      const stateData = parseOAuthState(state as string);
      if (!stateData) {
        console.error("Invalid state parameter in Google callback");
        return res.redirect('/?google_error=invalid_state');
      }
      
      const userId = stateData.userId;
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const redirectUri = `${protocol}://${host}/api/google/callback`;
      
      const tokens = await exchangeCodeForTokens(code as string, redirectUri);
      
      await storage.updateUser(userId, {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000)
      });
      
      // Send a self-closing page for popup flow, fallback redirect for non-popup
      res.send(`<html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'google_oauth_success' }, '*');
          window.close();
        } else {
          window.location.href = '/data-import-suite?google_connected=true';
        }
      </script><p>Connected! You can close this window.</p></body></html>`);
    } catch (error) {
      console.error("Google OAuth error:", error);
      res.send(`<html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'google_oauth_error' }, '*');
          window.close();
        } else {
          window.location.href = '/data-import-suite?google_error=true';
        }
      </script><p>Error connecting. You can close this window.</p></body></html>`);
    }
  });

  app.post("/api/shopify/introspect-schema", async (req, res) => {
    try {
      const { shop, accessToken, object } = req.body;
      const cleanShop = (shop || "di-insights").trim().toLowerCase().replace(".myshopify.com", "");
      const token = accessToken || process.env.SHOPIFY_ACCESS_TOKEN || "";
      const typeName = getShopifyGraphQLTypeName(object || "Products");

      if (token) {
        const fields = await introspectShopifyType(cleanShop, token, typeName);
        const metafields = await fetchShopifyMetafieldDefinitions(cleanShop, token, typeName);
        const nodes = parseIntrospectionToFieldNodes(fields, metafields);
        return res.json({ success: true, isLive: true, nodes });
      }

      return res.json({
        success: true,
        isLive: false,
        message: "Live introspection endpoint active."
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/google/status', optionalAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'admin-demo-id';
      const accessToken = await getValidAccessToken(userId);
      const redirectUri = getExpectedRedirectUri(req);
      res.json({ 
        connected: !!accessToken, 
        configured: isGoogleOAuthConfigured(),
        redirectUri // Send expected redirect URI so frontend can show it to user for Cloud Console setup
      });
    } catch (error) {
      const redirectUri = getExpectedRedirectUri(req);
      res.json({ connected: false, configured: isGoogleOAuthConfigured(), redirectUri });
    }
  });

  // Spreadsheet routes
  app.get('/api/spreadsheets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accessToken = await getValidAccessToken(userId);
      
      if (!accessToken) {
        return res.status(401).json({ message: "Google not connected" });
      }
      
      const spreadsheets = await listSpreadsheets(accessToken);
      res.json(spreadsheets);
    } catch (error) {
      console.error("Error listing spreadsheets:", error);
      res.status(500).json({ message: "Failed to list spreadsheets" });
    }
  });

  // Dataset routes
  app.get('/api/datasets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const datasets = await storage.getDatasetsByUser(userId);
      res.json(datasets);
    } catch (error) {
      console.error("Error fetching datasets:", error);
      res.status(500).json({ message: "Failed to fetch datasets" });
    }
  });

  app.post('/api/datasets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { spreadsheetId, spreadsheetName, sheetName, sheetId, mimeType, syncSchedule } = req.body;
      
      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ message: "Google not connected" });
      }
      
      const { headers, data } = await getSheetData(accessToken, spreadsheetId, sheetName, mimeType);
      
      const dataset = await storage.createDataset({
        userId,
        spreadsheetId,
        spreadsheetName,
        sheetName,
        sheetId,
        headers,
        data,
        rowCount: data.length,
        source: 'google',
        syncSchedule: syncSchedule || 'manual'
      });

      // Fire-and-forget RAG indexing (non-blocking)
      indexDataset(dataset.id, userId, headers, data).catch(e =>
        console.error("Background RAG indexing error:", e)
      );
      
      res.json(dataset);
    } catch (error: any) {
      console.error("Error creating dataset detailed trace:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      try {
        const parsedJson = JSON.parse(errMsg);
        if (parsedJson.message === "DataFrame Integrity check failed" || parsedJson.failedStage) {
          return res.status(400).json(parsedJson);
        }
      } catch {}
      res.status(500).json({ message: "Failed to import dataset", details: errMsg });
    }
  });

  app.post('/api/datasets/:id/snapshot', isAuthenticated, async (req: any, res) => {
    try {
      const datasetId = req.params.id;
      const dataset = await storage.getDataset(datasetId);
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      
      const [snapshot] = await db
        .insert(snapshotsTable)
        .values({
          datasetId,
          snapshotData: dataset.data as any[]
        })
        .returning();

      res.json({ success: true, snapshotId: snapshot.id });
    } catch (error: any) {
      console.error("[Create Snapshot] Error:", error);
      res.status(500).json({ message: "Failed to create snapshot", error: error.message });
    }
  });

  app.get('/api/datasets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dataset = await storage.getDataset(req.params.id);
      
      if (!dataset || dataset.userId !== userId) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      
      res.json(dataset);
    } catch (error) {
      console.error("Error fetching dataset:", error);
      res.status(500).json({ message: "Failed to fetch dataset" });
    }
  });

  app.delete('/api/datasets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dataset = await storage.getDataset(req.params.id);
      
      if (!dataset || dataset.userId !== userId) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      
      // Delete associated dashboards and conversations first to avoid FK violation
      const dashboards = await storage.getDashboardsByUser(userId);
      const relatedDashboards = dashboards.filter(d => d.datasetId === req.params.id);
      for (const d of relatedDashboards) {
        await storage.deleteDashboard(d.id);
      }
      const conversations = await storage.getConversationsByUser(userId);
      const relatedConversations = conversations.filter(c => c.datasetId === req.params.id);
      for (const c of relatedConversations) {
        await storage.deleteConversation(c.id);
      }
      
      await storage.deleteDataset(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting dataset:", error);
      res.status(500).json({ message: "Failed to delete dataset" });
    }
  });

  // File upload endpoint (PDF, Excel, CSV, JSON, SQL) - delegates parsing to Python FastAPI backend
  app.post('/api/datasets/upload', isAuthenticated, (req: any, res, next) => {
    // Handle multer errors properly
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File size exceeds 100MB limit" });
        }
        return res.status(400).json({ message: `File upload error: ${err.message}` });
      }
      next();
    });
  }, async (req: any, res) => {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000);
    
    try {
      const userId = req.user.claims.sub;
      console.log("Starting file upload for user:", userId);
      
      const user = await storage.getUser(userId);
      const planFeatures = await getUserPlanFeatures(userId, user?.email || null);
      
      const excelCount = await storage.countExcelDatasetsByUser(userId);
      if (excelCount >= planFeatures.maxFiles) {
        return res.status(400).json({ 
          message: `File upload limit reached. Maximum ${planFeatures.maxFiles} files allowed on ${planFeatures.displayName} plan.`,
          limit: planFeatures.maxFiles,
          current: excelCount,
          upgrade: !planFeatures.isPremium
        });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const fileName = file.originalname;
      const fileExt = fileName.split('.').pop()?.toLowerCase();
      console.log(`Processing file: ${fileName}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      
      if (!['xlsx', 'xls', 'csv', 'pdf', 'json', 'sql'].includes(fileExt || '')) {
        return res.status(400).json({ message: "Invalid file type. Supported formats: .xlsx, .xls, .csv, .pdf, .json, .sql" });
      }

      // Check file size based on plan
      const maxSize = planFeatures.maxFileSize * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({ 
          message: `File size exceeds ${planFeatures.maxFileSize}MB limit for ${planFeatures.displayName} plan.`,
          upgrade: !planFeatures.isPremium
        });
      }

      // Forward all dataset uploads to Python FastAPI backend
      const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
      const docId = `upload_${userId}_${Date.now()}`;
      const formData = new FormData();
      formData.append('file', new Blob([file.buffer], { type: file.mimetype }), fileName);
      formData.append('userId', userId);
      formData.append('documentId', docId);

      let parseResult: { 
        headers: string[]; 
        rows: Record<string, any>[]; 
        rowCount: number; 
        fileType: string;
        profilingStats: any;
      };
      
      try {
        console.log("Forwarding file to Python FastAPI backend `/parse-document`...");
        const pyRes = await fetch(`${PYTHON_URL}/parse-document`, { method: 'POST', body: formData });
        if (!pyRes.ok) {
          const errorText = await pyRes.text();
          if (pyRes.status === 400) {
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.detail && typeof errorJson.detail === 'object') {
                return res.status(400).json(errorJson.detail);
              }
              return res.status(400).json({ message: errorJson.detail || errorText });
            } catch {
              return res.status(400).json({ message: errorText });
            }
          }
          throw new Error(errorText);
        }
        parseResult = await pyRes.json() as typeof parseResult;
      } catch (e: any) {
        console.error("Python parsing failed:", e);
        return res.status(500).json({ message: `Python backend error: ${e.message}. Ensure Python server is running on port 8000.` });
      }

      const baseName = fileName.replace(/\.[^/.]+$/, "");
      const dataset = await storage.createDataset({
        userId,
        spreadsheetId: docId, // Correlation key for Parquet file
        spreadsheetName: baseName,
        sheetName: 'Sheet1',
        sheetId: 0,
        headers: parseResult.headers,
        data: parseResult.rows,
        rowCount: parseResult.rowCount,
        source: 'excel'
      });

      // Background RAG embedding indexing
      indexDataset(dataset.id, userId, parseResult.headers, parseResult.rows, (parseResult as any).ragText).catch(e =>
        console.error("Background RAG indexing error:", e)
      );

      return res.json({ 
        ...dataset, 
        message: `Successfully imported ${parseResult.rowCount} rows.`, 
        originalRowCount: parseResult.rowCount, 
        wasSampled: false 
      });
      
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ 
        message: "Failed to process uploaded file. Please try again.",
        details: error.message || 'Unknown error'
      });
    }
  });

  // Update dataset data directly (for inline editing)
  app.patch('/api/datasets/:id/data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const datasetId = req.params.id;
      const { data, headers } = req.body;
      
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ message: "Invalid data format" });
      }
      
      // Verify dataset exists and belongs to user
      const dataset = await storage.getDataset(datasetId);
      if (!dataset || dataset.userId !== userId) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      
      // Use provided headers or existing ones
      const finalHeaders = headers && Array.isArray(headers) ? headers : dataset.headers;
      
      // Update the dataset with new data and headers
      const updated = await storage.updateDataset(datasetId, {
        headers: finalHeaders,
        data,
        rowCount: data.length,
        lastSyncedAt: new Date()
      });
      
      // Re-index for RAG search
      indexDataset(datasetId, userId, finalHeaders, data).catch(e =>
        console.warn("RAG re-indexing after edit failed (non-fatal):", e)
      );
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating dataset data:", error);
      res.status(500).json({ message: "Failed to update data" });
    }
  });

  // Sync Google Sheets dataset (refresh data)
  app.post('/api/datasets/:id/sync', isAuthenticated, async (req: any, res) => {
    const { dashboards: dashboardsTable } = await import("@shared/schema");
    
    async function regenerateDashboardsForDataset(datasetId: string, userId: string) {
      try {
        const dataset = await storage.getDataset(datasetId);
        if (!dataset) return;
        
        const dashes = await db.select().from(dashboardsTable).where(eq(dashboardsTable.datasetId, datasetId));
        if (dashes.length === 0) return;
        
        console.log(`Regenerating dashboard config for ${dashes.length} dashboards linked to dataset ${datasetId}...`);
        const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
        const pyRes = await fetch(`${PYTHON_URL}/api/analytics/generate-dashboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            datasetId: dataset.spreadsheetId,
            spreadsheetName: dataset.spreadsheetName,
            userId
          })
        });
        if (!pyRes.ok) throw new Error(await pyRes.text());
        const config = await pyRes.json();
        
        for (const d of dashes) {
          await db.update(dashboardsTable)
            .set({ config })
            .where(eq(dashboardsTable.id, d.id));
        }
        console.log(`Successfully regenerated ${dashes.length} dashboards for dataset ${datasetId}`);
      } catch (e) {
        console.error(`Failed to regenerate dashboards for dataset ${datasetId}:`, e);
      }
    }

    try {
      const userId = req.user.claims.sub;
      const dataset = await storage.getDataset(req.params.id);
      
      if (!dataset || dataset.userId !== userId) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      
      if (dataset.source === 'excel') {
        return res.status(400).json({ message: "Excel datasets cannot be synced. Use the replace endpoint to update Excel data." });
      }
      
      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ message: "Google not connected. Please reconnect Google Sheets." });
      }
      
      let mimeType: string | undefined;
      try {
        const metaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${dataset.spreadsheetId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (metaRes.ok) {
          const meta = await metaRes.json();
          mimeType = meta.mimeType;
        }
      } catch (e) {
        console.error("Failed to fetch file metadata during sync:", e);
      }
      
      const { headers, data } = await getSheetData(accessToken, dataset.spreadsheetId, dataset.sheetName, mimeType);
      
      const updated = await storage.updateDataset(req.params.id, {
        headers,
        data,
        rowCount: data.length,
        lastSyncedAt: new Date()
      });

      // Re-index for RAG after sync to keep retrieval fresh
      indexDataset(req.params.id, userId, headers, data).catch(e =>
        console.warn("RAG re-indexing after sync failed (non-fatal):", e)
      );
      
      // Regenerate associated dashboards to compile the fresh parsed clean structure
      await regenerateDashboardsForDataset(req.params.id, userId);
      
      res.json(updated);
    } catch (error) {
      console.error("Error syncing dataset:", error);
      res.status(500).json({ message: "Failed to sync dataset" });
    }
  });

  // Replace Excel dataset with new file (like Power BI refresh)
  app.post('/api/datasets/:id/replace', isAuthenticated, (req: any, res, next) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File size exceeds 100MB limit" });
        }
        return res.status(400).json({ message: `File upload error: ${err.message}` });
      }
      next();
    });
  }, async (req: any, res) => {
    req.setTimeout(300000);
    res.setTimeout(300000);
    
    try {
      const userId = req.user.claims.sub;
      const datasetId = req.params.id;
      
      // Verify dataset exists and belongs to user
      const existingDataset = await storage.getDataset(datasetId);
      if (!existingDataset || existingDataset.userId !== userId) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      
      if (existingDataset.source !== 'excel') {
        return res.status(400).json({ message: "Only Excel datasets can be replaced. Use sync for Google Sheets." });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const fileName = file.originalname;
      const fileExt = fileName.split('.').pop()?.toLowerCase();
      
      if (!['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
        return res.status(400).json({ message: "Invalid file type. Please upload .xlsx, .xls, or .csv files" });
      }

      // Get user's plan for file size limits
      const user = await storage.getUser(userId);
      const planFeatures = await getUserPlanFeatures(userId, user?.email || null);
      const maxSize = planFeatures.maxFileSize * 1024 * 1024;
      
      if (file.size > maxSize) {
        return res.status(400).json({ 
          message: `File size exceeds ${planFeatures.maxFileSize}MB limit for ${planFeatures.displayName} plan.`
        });
      }

      // Parse Excel/CSV
      let workbook;
      try {
        workbook = XLSX.read(file.buffer, { 
          type: 'buffer',
          cellDates: true,
          cellNF: false,
          cellText: false,
          cellStyles: false,
          sheetStubs: false,
          dense: false
        });
      } catch (parseError) {
        console.error("Excel parse error:", parseError);
        return res.status(400).json({ message: "Unable to read file. Please ensure it's a valid Excel or CSV file." });
      }
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return res.status(400).json({ message: "No sheets found in file" });
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        return res.status(400).json({ message: "Unable to read worksheet" });
      }
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: null,
        blankrows: false,
        raw: true
      }) as any[][];
      
      if (!jsonData || jsonData.length < 2) {
        return res.status(400).json({ message: "File must have at least a header row and one data row" });
      }

      // Clean headers
      const rawHeaders = jsonData[0];
      const headers: string[] = [];
      const headerSet = new Set<string>();
      
      for (let i = 0; i < rawHeaders.length; i++) {
        let header = String(rawHeaders[i] || '').trim();
        if (!header) header = `Column_${i + 1}`;
        
        let uniqueHeader = header;
        let counter = 1;
        while (headerSet.has(uniqueHeader.toLowerCase())) {
          uniqueHeader = `${header}_${counter}`;
          counter++;
        }
        
        headerSet.add(uniqueHeader.toLowerCase());
        headers.push(uniqueHeader);
      }
      
      // Process data rows
      const allDataRows = jsonData.slice(1);
      const dataRows: any[][] = [];
      
      for (let i = 0; i < allDataRows.length; i++) {
        const row = allDataRows[i];
        if (!Array.isArray(row)) continue;
        
        const hasData = row.some(cell => 
          cell !== null && cell !== undefined && String(cell).trim() !== ''
        );
        
        if (hasData) {
          dataRows.push(row);
        }
      }
      
      if (dataRows.length === 0) {
        return res.status(400).json({ message: "No data rows found in file" });
      }
      
      // Apply row limit
      const MAX_ROWS = 15000;
      let finalRows = dataRows;
      let wasSampled = false;
      
      if (dataRows.length > MAX_ROWS) {
        const first1k = dataRows.slice(0, 1000);
        const last1k = dataRows.slice(-1000);
        const middle = dataRows.slice(1000, -1000);
        const middleSampleSize = MAX_ROWS - 2000;
        const step = Math.ceil(middle.length / middleSampleSize);
        const sampledMiddle = middle.filter((_, i) => i % step === 0).slice(0, middleSampleSize);
        finalRows = [...first1k, ...sampledMiddle, ...last1k];
        wasSampled = true;
      }
      
      // Convert to objects
      const data = finalRows.map(row => {
        const obj: Record<string, any> = {};
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i];
          const value = row[i];
          
          if (value === null || value === undefined) {
            obj[header] = null;
          } else if (value instanceof Date) {
            obj[header] = value.toISOString();
          } else if (typeof value === 'number') {
            obj[header] = Math.round(value * 1000000) / 1000000;
          } else {
            const strValue = String(value).trim();
            obj[header] = strValue === '' ? null : strValue;
          }
        }
        return obj;
      });

      // Update the existing dataset with new data
      const updated = await storage.updateDataset(datasetId, {
        headers,
        data,
        rowCount: data.length,
        sheetName, // Update sheet name from new file
        lastSyncedAt: new Date()
      });

      // Re-index for RAG after replace to keep retrieval fresh
      indexDataset(datasetId, userId, headers, data).catch(e =>
        console.warn("RAG re-indexing after replace failed (non-fatal):", e)
      );

      res.json({
        ...updated,
        message: wasSampled 
          ? `Data updated! ${data.length} rows (sampled from ${dataRows.length})`
          : `Data updated! ${data.length} rows`,
        originalRowCount: dataRows.length,
        wasSampled
      });
    } catch (error: any) {
      console.error("Error replacing Excel file:", error);
      res.status(500).json({ 
        message: "Failed to replace file data. Please try again.",
        details: error.message
      });
    }
  });

  // Dashboard routes
  app.get('/api/dashboards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dashboards = await storage.getDashboardsByUser(userId);
      res.json(dashboards);
    } catch (error) {
      console.error("Error fetching dashboards:", error);
      res.status(500).json({ message: "Failed to fetch dashboards" });
    }
  });

  app.post('/api/dashboards/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { datasetId, title } = req.body;
      
      console.log("Dashboard generate request:", { datasetId, title, userId });
      
      // Get plan-based limits
      const user = await storage.getUser(userId);
      const planFeatures = await getUserPlanFeatures(userId, user?.email || null);
      
      const usage = await storage.getUsageForToday(userId);
      if (usage && (usage.aiActionsUsed || 0) >= planFeatures.aiActionsPerDay) {
        return res.status(429).json({ 
          message: `Daily AI limit of ${planFeatures.aiActionsPerDay} actions reached. ${planFeatures.isPremium ? 'Try again tomorrow.' : 'Upgrade to Pro for more actions.'}`,
          remaining: 0,
          limit: planFeatures.aiActionsPerDay,
          plan: planFeatures.displayName
        });
      }
      
      const dataset = await storage.getDataset(datasetId);
      console.log("Dataset lookup result:", dataset ? `Found dataset ${dataset.id}` : "Not found", "userId match:", dataset?.userId === userId);
      if (!dataset || dataset.userId !== userId) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      // Call Python FastAPI backend to construct deterministic dashboard configuration (KPIs + charts + outliers + insights)
      const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
      let config: any;
      try {
        console.log("Requesting dashboard generation from Python backend...");
        const pyRes = await fetch(`${PYTHON_URL}/api/analytics/generate-dashboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            datasetId: dataset.spreadsheetId, // Correlation key representing parquet document name
            spreadsheetName: dataset.spreadsheetName,
            userId
          })
        });
        if (!pyRes.ok) {
          const errorText = await pyRes.text();
          if (pyRes.status === 400) {
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.detail && typeof errorJson.detail === 'object') {
                return res.status(400).json(errorJson.detail);
              }
              return res.status(400).json({ message: errorJson.detail || errorText });
            } catch {
              return res.status(400).json({ message: errorText });
            }
          }
          throw new Error(errorText);
        }
        config = await pyRes.json();
      } catch (e: any) {
        console.error("Python dashboard generation failed, returning fallback config:", e);
        // Fallback to local JS dashboard generation if Python fails
        const headers = dataset.headers as string[];
        const data = dataset.data as Record<string, any>[];
        const compactStats: Record<string, any> = {};
        headers.forEach(header => {
          const values = data.map((row: any) => row[header]).filter((v: any) => v !== null && v !== undefined && v !== "");
          const numericValues = values.map((v: any) => parseFloat(String(v))).filter((n: number) => !isNaN(n));
          const isNumeric = numericValues.length > values.length * 0.5;
          const valueCounts: Record<string, number> = {};
          values.slice(0, 200).forEach((v: any) => {
            const k = String(v).trim().slice(0, 40);
            valueCounts[k] = (valueCounts[k] || 0) + 1;
          });
          compactStats[header] = {
            count: values.length,
            unique: new Set(values.map((v: any) => String(v).toLowerCase())).size,
            top5: Object.entries(valueCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
            ...(isNumeric ? {
              isNumeric: true,
              sum: Math.round(numericValues.reduce((a: number, b: number) => a + b, 0)),
              avg: Math.round(numericValues.reduce((a: number, b: number) => a + b, 0) / numericValues.length),
              min: Math.min(...numericValues),
              max: Math.max(...numericValues)
            } : { isNumeric: false })
          };
        });

        config = await generateDashboard({
          headers,
          data,
          spreadsheetName: dataset.spreadsheetName,
          sheetName: dataset.sheetName,
          ragContext: "",
          compactStats
        });
      }
      
      const dashboard = await storage.createDashboard({
        userId,
        datasetId,
        title: title || `${dataset.spreadsheetName} Dashboard`,
        config
      });
      
      await storage.incrementUsage(userId);
      
      res.json(dashboard);
    } catch (error) {
      console.error("Error generating dashboard:", error);
      res.status(500).json({ message: "Failed to generate dashboard" });
    }
  });

  app.get('/api/dashboards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dashboard = await storage.getDashboard(req.params.id);
      
      if (!dashboard || dashboard.userId !== userId) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      const dataset = await storage.getDataset(dashboard.datasetId);
      
      res.json({ dashboard, dataset });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard" });
    }
  });

  app.patch('/api/dashboards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dashboard = await storage.getDashboard(req.params.id);
      
      if (!dashboard || dashboard.userId !== userId) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      const { title, isPublic, config } = req.body;
      const updateData: any = {};
      
      if (title !== undefined) updateData.title = title;
      if (isPublic !== undefined) {
        updateData.isPublic = isPublic;
        if (isPublic && !dashboard.shareToken) {
          updateData.shareToken = randomBytes(16).toString('hex');
        }
      }
      if (config !== undefined) updateData.config = config;
      
      const updated = await storage.updateDashboard(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating dashboard:", error);
      res.status(500).json({ message: "Failed to update dashboard" });
    }
  });

  app.post('/api/dashboards/:id/insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dashboard = await storage.getDashboard(req.params.id);

      if (!dashboard || dashboard.userId !== userId) {
        return res.status(404).json({ message: "Dashboard not found" });
      }

      const dataset = await storage.getDataset(dashboard.datasetId);
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      const headers = dataset.headers || [];
      const rows = dataset.data || [];
      const numericColumns = headers.filter((h: string) => rows.some((r: any) => !isNaN(parseFloat(String(r[h])))));
      const categoryColumns = headers.filter((h: string) => rows.some((r: any) => isNaN(parseFloat(String(r[h]))) && r[h] !== null && r[h] !== undefined && String(r[h]).trim() !== ""));

      const safeRows = rows.slice(0, 2000);
      const stats = {
        totalRecords: rows.length,
        columns: headers.length,
        numericColumns,
        categoryColumns,
        sample: safeRows.slice(0, 8),
      };

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const prompt = `You are an expert BI analyst. Write AI Insights for this dashboard in EXACTLY 4 short lines.
Rules:
- Output plain text only.
- Exactly 4 lines separated by newline characters.
- Each line should be analytical and specific, not generic.
- Include at least one concrete number in each line when possible.

Dashboard title: ${dashboard.title}
Dataset name: ${dataset.spreadsheetName}
Sheet name: ${dataset.sheetName}
Stats: ${JSON.stringify(stats)}
Charts: ${JSON.stringify((dashboard.config as any)?.charts || [])}`;

      const result = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
      const raw = (result.text || "").trim();
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const normalized = (lines.length >= 4 ? lines.slice(0, 4) : [...lines, ...Array.from({ length: Math.max(0, 4 - lines.length) }, () => "Further analysis indicates stable distribution across major segments.")]).join("\n");

      const existingConfig: any = dashboard.config || {};
      const updatedConfig = {
        ...existingConfig,
        summary: normalized,
        generatedAt: new Date().toISOString(),
      };

      const updated = await storage.updateDashboard(req.params.id, { config: updatedConfig });
      await storage.incrementUsage(userId);

      res.json({ summary: normalized, dashboard: updated });
    } catch (error) {
      console.error("Error generating dashboard insights:", error);
      res.status(500).json({ message: "Failed to generate AI insights" });
    }
  });

  app.delete('/api/dashboards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dashboard = await storage.getDashboard(req.params.id);
      
      if (!dashboard || dashboard.userId !== userId) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      await storage.deleteDashboard(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting dashboard:", error);
      res.status(500).json({ message: "Failed to delete dashboard" });
    }
  });

  // Public shared dashboard
  app.get('/api/shared/:token', async (req, res) => {
    try {
      const dashboard = await storage.getDashboardByShareToken(req.params.token);
      
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      const dataset = await storage.getDataset(dashboard.datasetId);
      
      res.json({ dashboard, dataset });
    } catch (error) {
      console.error("Error fetching shared dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard" });
    }
  });

  // Chat with data - uses Groq for premium users, Gemini for free
  // Supports RAG (vector retrieval) + business context injection + source attribution
  app.post('/api/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { datasetId, question, conversationHistory, businessMode } = req.body;
      
      // Get user and their plan
      const user = await storage.getUser(userId);
      const planFeatures = await getUserPlanFeatures(userId, user?.email || null);
      
      const usage = await storage.getUsageForToday(userId);
      if (usage && (usage.aiActionsUsed || 0) >= planFeatures.aiActionsPerDay) {
        return res.status(429).json({ 
          message: `Daily AI limit reached (${planFeatures.aiActionsPerDay} actions). ${planFeatures.isPremium ? 'Contact support for more.' : 'Upgrade to Pro for 100 actions/day.'}`,
          remaining: 0,
          plan: planFeatures.planName
        });
      }

      let context_source: 'live_business_data' | 'rag_document' | 'general' = 'general';
      let response: string;
      let aiProvider = 'gemini';

      // Business mode: inject live business context — always returns early, never falls to dataset path
      if (businessMode) {
        const bizCtx = await buildBusinessContext(userId);
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

        let prompt: string;
        if (bizCtx.context) {
          context_source = 'live_business_data';
          prompt = `You are an expert AI business advisor for a small-to-medium enterprise. Use the following live business data to answer the question accurately and concisely.

LIVE BUSINESS DATA:
${bizCtx.context}

QUESTION: ${question}

Answer with specific numbers from the data. Provide actionable insights. Use plain text formatting.`;
        } else {
          context_source = 'general';
          prompt = `You are an expert AI business advisor for small-to-medium enterprises. The user has not yet set up their business profile. Answer the following business question with general best-practice advice.

QUESTION: ${question}

Provide practical, actionable advice. Suggest that the user set up their Business Suite profile for personalized data-driven insights.`;
        }

        const result = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
        response = result.text ?? "Unable to generate response.";

        await storage.incrementUsage(userId);
        const updatedUsage = await storage.getUsageForToday(userId);
        return res.json({
          response,
          remaining: planFeatures.aiActionsPerDay - (updatedUsage?.aiActionsUsed || 0),
          plan: planFeatures.planName,
          aiProvider: 'gemini',
          context_source,
        });
      }
      
      const dataset = await storage.getDataset(datasetId);
      if (!dataset || dataset.userId !== userId) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      // Always try SQL first, fall back to RAG only if SQL fails
      const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
      let chatResult: { response: string; sqlQuery: string | null; sqlResults: any[] | null; chatUsedSql: boolean };
      let ragUsed = false;
      
      try {
        console.log("Forwarding query to Python DuckDB chat engine...");
        const pyRes = await fetch(`${PYTHON_URL}/api/analytics/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            datasetId: dataset.spreadsheetId,
            userId,
            conversationHistory: conversationHistory || []
          })
        });
        if (!pyRes.ok) throw new Error(await pyRes.text());
        chatResult = await pyRes.json() as typeof chatResult;
        response = chatResult.response;
      } catch (e: any) {
        console.error("Python analytical chat failed, falling back to local JS semantic chat:", e);

        let ragContext = "";
        try {
          const chunks = await retrieveRelevantChunks(question, datasetId, 5, userId);
          if (chunks.length > 0) {
            ragContext = formatContext(chunks);
            ragUsed = true;
          }
        } catch {}

        response = await chatWithData({
          question,
          headers: dataset.headers,
          data: dataset.data,
          conversationHistory,
          ragContext,
        });
      }

      await storage.incrementUsage(userId);
      const updatedUsage = await storage.getUsageForToday(userId);
      
      res.json({ 
        response,
        remaining: planFeatures.aiActionsPerDay - (updatedUsage?.aiActionsUsed || 0),
        plan: planFeatures.planName,
        aiProvider,
        context_source: 'rag_document',
        rag_used: ragUsed,
      });
    } catch (error) {
      console.error("Error chatting with data:", error);
      res.status(500).json({ message: "Failed to get AI response" });
    }
  });

  // Usage tracking - plan aware
  app.get('/api/usage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const planFeatures = await getUserPlanFeatures(userId, user?.email || null);
      const usage = await storage.getUsageForToday(userId);
      
      res.json({
        used: usage?.aiActionsUsed || 0,
        limit: planFeatures.aiActionsPerDay,
        remaining: planFeatures.aiActionsPerDay - (usage?.aiActionsUsed || 0),
        plan: planFeatures
      });
    } catch (error) {
      console.error("Error fetching usage:", error);
      res.status(500).json({ message: "Failed to fetch usage" });
    }
  });
  
  // Get user's plan
  app.get('/api/plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const planFeatures = await getUserPlanFeatures(userId, user?.email || null);
      res.json(planFeatures);
    } catch (error) {
      console.error("Error fetching plan:", error);
      res.status(500).json({ message: "Failed to fetch plan" });
    }
  });

  // ── AI Router Endpoints ────────────────────────────────────────────────────────────

  // Health check - verify all AI services
  app.get('/api/health', async (req, res) => {
    try {
      const status = await healthCheck();
      res.json(status);
    } catch (error) {
      console.error("Error checking health:", error);
      res.status(500).json({ message: "Health check failed" });
    }
  });

  // Deep analysis endpoint - for complex tasks (MBA strategies, GTM analysis, etc.)
  app.post('/api/analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { task, data } = req.body;

      // Validate input
      if (!task || !task.trim()) {
        return res.status(400).json({ message: "Task prompt is required" });
      }

      // Get user and their plan
      const user = await storage.getUser(userId);
      const planFeatures = await getUserPlanFeatures(userId, user?.email || null);
      const usage = await storage.getUsageForToday(userId);

      // Check action limit
      if (usage && (usage.aiActionsUsed || 0) >= planFeatures.aiActionsPerDay) {
        return res.status(429).json({
          message: `Daily AI limit reached (${planFeatures.aiActionsPerDay} actions). ${planFeatures.isPremium ? 'Contact support for more.' : 'Upgrade to Pro for 100 actions/day.'}`,
          remaining: 0,
          plan: planFeatures.planName
        });
      }

      console.log("[API] /api/analysis called - Running deepAnalysis");

      // Call AI Router for deep analysis
      const analysis = await deepAnalysis(
        {
          prompt: task,
          contextData: data || {},
          maxTokens: 2000,
          temperature: 0.6
        },
        { fallbackEnabled: true }
      );

      // Increment usage
      await storage.incrementUsage(userId);
      const updatedUsage = await storage.getUsageForToday(userId);

      console.log("[API] /api/analysis completed successfully");

      res.json({
        analysis,
        remaining: planFeatures.aiActionsPerDay - (updatedUsage?.aiActionsUsed || 0),
        plan: planFeatures.planName,
        provider: "aiRouter_deepAnalysis"
      });
    } catch (error: any) {
      console.error("Error in deep analysis:", error);
      res.status(500).json({
        message: "Deep analysis failed",
        error: error?.message || "Unknown error"
      });
    }
  });

  // Fast chat endpoint - for quick, real-time queries
  app.post('/api/fast-chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { prompt } = req.body;

      // Validate input
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      // Get user and their plan
      const user = await storage.getUser(userId);
      const planFeatures = await getUserPlanFeatures(userId, user?.email || null);
      const usage = await storage.getUsageForToday(userId);

      // Check action limit
      if (usage && (usage.aiActionsUsed || 0) >= planFeatures.aiActionsPerDay) {
        return res.status(429).json({
          message: `Daily AI limit reached (${planFeatures.aiActionsPerDay} actions). ${planFeatures.isPremium ? 'Contact support for more.' : 'Upgrade to Pro for 100 actions/day.'}`,
          remaining: 0,
          plan: planFeatures.planName
        });
      }

      console.log("[API] /api/fast-chat called - Running fastChat");

      // Call AI Router for fast chat
      const response = await fastChat(
        {
          prompt,
          maxTokens: 500,
          temperature: 0.7
        },
        { fallbackEnabled: true }
      );

      // Increment usage
      await storage.incrementUsage(userId);
      const updatedUsage = await storage.getUsageForToday(userId);

      console.log("[API] /api/fast-chat completed successfully");

      res.json({
        response,
        remaining: planFeatures.aiActionsPerDay - (updatedUsage?.aiActionsUsed || 0),
        plan: planFeatures.planName,
        provider: "aiRouter_fastChat"
      });
    } catch (error: any) {
      console.error("Error in fast chat:", error);
      res.status(500).json({
        message: "Fast chat failed",
        error: error?.message || "Unknown error"
      });
    }
  });

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { datasetId, title, messages } = req.body;
      const conversation = await storage.createConversation({
        userId,
        datasetId: datasetId || null,
        title: title || "New Chat",
        messages: messages || [],
      });
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Also return the dataset info if linked
      let dataset = null;
      if (conversation.datasetId) {
        dataset = await storage.getDataset(conversation.datasetId);
      }
      
      res.json({ conversation, dataset });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.patch('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const { title, messages, datasetId, isPinned, isArchived } = req.body;
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (messages !== undefined) updateData.messages = messages;
      if (datasetId !== undefined) updateData.datasetId = datasetId;
      if (isPinned !== undefined) updateData.isPinned = isPinned;
      if (isArchived !== undefined) updateData.isArchived = isArchived;
      
      const updated = await storage.updateConversation(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });
  
  // Share conversation - generate share token
  app.post('/api/conversations/:id/share', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Generate or return existing share token
      let shareToken = conversation.shareToken;
      if (!shareToken) {
        shareToken = randomBytes(16).toString('hex');
        await storage.updateConversation(req.params.id, { shareToken });
      }
      
      res.json({ shareToken, shareUrl: `/shared/chat/${shareToken}` });
    } catch (error) {
      console.error("Error sharing conversation:", error);
      res.status(500).json({ message: "Failed to share conversation" });
    }
  });
  
  // Public shared conversation endpoint
  app.get('/api/shared/chat/:token', async (req, res) => {
    try {
      const conversations = await db.select().from(conversationsTable).where(eq(conversationsTable.shareToken, req.params.token));
      const conversation = conversations[0];
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Return conversation without user info
      res.json({
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt
      });
    } catch (error) {
      console.error("Error fetching shared conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.delete('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      await storage.deleteConversation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // ── Business Suite Routes ──────────────────────────────────────────────

  // Industry templates list
  app.get('/api/business/industry-templates', (_req, res) => {
    res.json(getIndustryTemplateList());
  });

  // Get specific template with full config
  app.get('/api/business/industry-templates/:key', (req, res) => {
    const template = getIndustryTemplate(req.params.key);
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  });

  // Business profile
  app.get('/api/business/profile', optionalAuth, async (req: any, res) => {
    try {
      // If user is authenticated, return their business profile
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const profile = await storage.getBusinessProfileForUser(userId);
        if (!profile) return res.status(404).json({ message: "No business profile found" });

        // Determine the user's role in this business
        let memberRole = 'owner';
        let memberId: string | undefined;

        // Look up member row by userId first, then fall back to email
        let member = await storage.getBusinessMemberByUser(profile.id, userId);
        if (!member && req.user.claims.email) {
          member = await storage.getBusinessMemberByEmail(profile.id, req.user.claims.email);
        }
        if (member) {
          memberRole = profile.ownerId === userId ? 'owner' : (member.memberRole || 'employee');
          memberId = member.id;
        }

        console.log(`[Profile] userId=${userId} email=${req.user.claims.email} memberId=${memberId}`);
        return res.json({ ...profile, memberRole, memberId });
      }

      // If not authenticated, return a demo/default business profile
      res.json({
        id: "demo-business-123",
        name: "Demo Business",
        industry: "technology",
        industryLabel: "Technology",
        ownerId: "demo-owner",
        memberRole: "owner"
      });
    } catch (error) {
      console.error("Error fetching business profile:", error);
      res.status(500).json({ message: "Failed to fetch business profile" });
    }
  });

  app.post('/api/business/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, industry, industryLabel, description, employeeCount, currencySymbol } = req.body;

      if (!name || !industry || !industryLabel) {
        return res.status(400).json({ message: "name, industry, and industryLabel are required" });
      }

      // Check if already exists
      const existing = await storage.getBusinessProfileByOwner(userId);
      if (existing) {
        const updated = await storage.updateBusinessProfile(existing.id, {
          name, industry, industryLabel, description, employeeCount, currencySymbol
        });
        return res.json({ ...updated, memberRole: 'owner' });
      }

      const profile = await storage.createBusinessProfile({
        ownerId: userId,
        name,
        industry,
        industryLabel,
        description,
        employeeCount: employeeCount || 1,
        currencySymbol: currencySymbol || '₹',
      });

      // Add owner as first member
      const user = await storage.getUser(userId);
      await storage.createBusinessMember({
        businessId: profile.id,
        userId,
        email: user?.email || '',
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || '',
        memberRole: 'owner',
        status: 'active',
        joinedAt: new Date(),
      });

      res.status(201).json({ ...profile, memberRole: 'owner' });
    } catch (error) {
      console.error("Error creating business profile:", error);
      res.status(500).json({ message: "Failed to create business profile" });
    }
  });

  app.patch('/api/business/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileByOwner(userId);
      if (!profile) return res.status(404).json({ message: "Business profile not found" });

      const { name, industry, industryLabel, description, employeeCount, currencySymbol } = req.body;
      const updated = await storage.updateBusinessProfile(profile.id, {
        name, industry, industryLabel, description, employeeCount, currencySymbol
      });
      res.json({ ...updated, memberRole: 'owner' });
    } catch (error) {
      console.error("Error updating business profile:", error);
      res.status(500).json({ message: "Failed to update business profile" });
    }
  });

  // Business members
  app.get('/api/business/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "Business profile not found" });

      // Only owner/manager can list members
      const requestingMember = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwner = profile.ownerId === userId;
      const isManager = requestingMember?.memberRole === 'manager';
      if (!isOwner && !isManager) {
        return res.status(403).json({ message: "Access denied" });
      }

      const members = await storage.getBusinessMembers(profile.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.post('/api/business/members/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "Business profile not found" });

      // Allow owner or managers to invite; managers may only invite employees (not other managers/owner)
      const isOwner = profile.ownerId === userId;
      if (!isOwner) {
        const callerMember = await storage.getBusinessMemberByUser(profile.id, userId);
        if (callerMember?.memberRole !== 'manager') {
          return res.status(403).json({ message: "Only the owner or managers can invite members" });
        }
      }

      const { email, name, memberRole } = req.body;
      if (!email) return res.status(400).json({ message: "email is required" });

      // Managers can only invite employees; only the owner can assign the manager role
      const assignedRole = isOwner ? (memberRole || 'employee') : 'employee';

      const emailLower = email.toLowerCase();

      // Check if already a member
      const existing = await storage.getBusinessMemberByEmail(profile.id, emailLower);
      if (existing) {
        return res.status(409).json({ message: "This person is already a member or has a pending invite" });
      }

      const inviteToken = randomBytes(20).toString('hex');
      const member = await storage.createBusinessMember({
        businessId: profile.id,
        email: emailLower,
        name: name || null,
        memberRole: assignedRole,
        status: 'pending',
        inviteToken,
      });

      // In production this would send an email; for now return the invite token
      res.status(201).json({
        ...member,
        inviteLink: `/business/join?token=${inviteToken}`,
        message: "Invite created. Share the invite link with the team member."
      });
    } catch (error) {
      console.error("Error inviting member:", error);
      res.status(500).json({ message: "Failed to invite member" });
    }
  });

  // Accept an invite — allow any authenticated user to accept
  app.post('/api/business/members/accept-invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "token is required" });

      const member = await storage.getBusinessMemberByInviteToken(token);
      if (!member) return res.status(404).json({ message: "Invalid or expired invite token" });
      if (member.status === 'active') return res.status(409).json({ message: "Invite already accepted" });

      const user = await storage.getUser(userId);

      await storage.updateBusinessMember(member.id, {
        userId,
        email: user?.email || member.email,
        status: 'active',
        joinedAt: new Date(),
      });
      // Clear the invite token separately to avoid TypeScript null-cast issues
      await storage.clearMemberInviteToken(member.id);

      const updated = await storage.getBusinessMemberByUser(member.businessId, userId);
      const profile = await storage.getBusinessProfileById(member.businessId);
      res.json({ member: updated, business: profile });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  app.patch('/api/business/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileByOwner(userId);
      if (!profile) return res.status(403).json({ message: "Only the owner can update member roles" });

      // Verify the target member belongs to the caller's business (IDOR prevention)
      const memberToUpdate = await storage.getBusinessMembers(profile.id).then(
        (members) => members.find((m) => m.id === req.params.id)
      );
      if (!memberToUpdate) return res.status(404).json({ message: "Member not found in your business" });

      const { memberRole, status } = req.body;
      const updated = await storage.updateBusinessMember(req.params.id, { memberRole, status });
      res.json(updated);
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  app.delete('/api/business/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileByOwner(userId);
      if (!profile) return res.status(403).json({ message: "Only the owner can remove members" });

      // Verify the target member belongs to the caller's business (IDOR prevention)
      const members = await storage.getBusinessMembers(profile.id);
      const memberToDelete = members.find((m) => m.id === req.params.id);
      if (!memberToDelete) return res.status(404).json({ message: "Member not found in your business" });

      await storage.deleteBusinessMember(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // Business verticals
  app.get('/api/business/verticals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "Business profile not found" });
      const verticals = await storage.getBusinessVerticals(profile.id);
      res.json(verticals);
    } catch (error) {
      console.error("Error fetching verticals:", error);
      res.status(500).json({ message: "Failed to fetch verticals" });
    }
  });

  app.post('/api/business/verticals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileByOwner(userId);
      if (!profile) return res.status(403).json({ message: "Only the owner can manage verticals" });

      const { name, description, metricLabel, metricUnit, expenseCategories, sortOrder } = req.body;
      if (!name) return res.status(400).json({ message: "name is required" });

      const vertical = await storage.createBusinessVertical({
        businessId: profile.id,
        name,
        description,
        metricLabel: metricLabel || 'Revenue',
        metricUnit: metricUnit || '₹',
        expenseCategories: expenseCategories || [],
        sortOrder: sortOrder || 0,
      });
      res.status(201).json(vertical);
    } catch (error) {
      console.error("Error creating vertical:", error);
      res.status(500).json({ message: "Failed to create vertical" });
    }
  });

  app.patch('/api/business/verticals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileByOwner(userId);
      if (!profile) return res.status(403).json({ message: "Only the owner can manage verticals" });

      // Verify the vertical belongs to this business (IDOR prevention)
      const vertical = await storage.getBusinessVertical(req.params.id);
      if (!vertical || vertical.businessId !== profile.id) {
        return res.status(404).json({ message: "Vertical not found in your business" });
      }

      const { name, description, metricLabel, metricUnit, expenseCategories, sortOrder } = req.body;
      const updated = await storage.updateBusinessVertical(req.params.id, {
        name, description, metricLabel, metricUnit, expenseCategories, sortOrder
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating vertical:", error);
      res.status(500).json({ message: "Failed to update vertical" });
    }
  });

  app.delete('/api/business/verticals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileByOwner(userId);
      if (!profile) return res.status(403).json({ message: "Only the owner can manage verticals" });

      // Verify the vertical belongs to this business (IDOR prevention)
      const vertical = await storage.getBusinessVertical(req.params.id);
      if (!vertical || vertical.businessId !== profile.id) {
        return res.status(404).json({ message: "Vertical not found in your business" });
      }

      await storage.deleteBusinessVertical(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vertical:", error);
      res.status(500).json({ message: "Failed to delete vertical" });
    }
  });

  // Bulk create verticals from template
  app.post('/api/business/verticals/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileByOwner(userId);
      if (!profile) return res.status(403).json({ message: "Only the owner can manage verticals" });

      const { verticals } = req.body;
      if (!Array.isArray(verticals)) return res.status(400).json({ message: "verticals array is required" });

      const created = await Promise.all(
        verticals.map((v: any, i: number) =>
          storage.createBusinessVertical({
            businessId: profile.id,
            name: v.name,
            description: v.description || '',
            metricLabel: v.metricLabel || 'Revenue',
            metricUnit: v.metricUnit || '₹',
            expenseCategories: v.expenseCategories || [],
            sortOrder: i,
          })
        )
      );

      res.status(201).json(created);
    } catch (error) {
      console.error("Error bulk creating verticals:", error);
      res.status(500).json({ message: "Failed to create verticals" });
    }
  });

  // Salary configs
  app.get('/api/business/salary-config', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "Business profile not found" });

      // Only the business owner or managers may read salary configuration
      const isOwner = profile.ownerId === userId;
      if (!isOwner) {
        const member = await storage.getBusinessMemberByUser(profile.id, userId);
        const isManager = member?.memberRole === 'manager';
        if (!isManager) {
          return res.status(403).json({ message: "Only the business owner or managers can view salary configs" });
        }
      }

      const configs = await storage.getSalaryConfigsByBusiness(profile.id);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching salary configs:", error);
      res.status(500).json({ message: "Failed to fetch salary config" });
    }
  });

  app.post('/api/business/salary-config', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileByOwner(userId);
      if (!profile) return res.status(403).json({ message: "Only the owner can set salary configs" });

      const { memberId, verticalId, baseSalary, incentivePercent, travelAllowanceCap, incentiveTiers } = req.body;

      // Verify memberId (if provided) belongs to this business (IDOR prevention)
      if (memberId) {
        const businessMembers = await storage.getBusinessMembers(profile.id);
        const targetMember = businessMembers.find((m) => m.id === memberId);
        if (!targetMember) return res.status(400).json({ message: "memberId does not belong to this business" });
      }

      // Verify verticalId (if provided) belongs to this business
      if (verticalId) {
        const verticals = await storage.getBusinessVerticals(profile.id);
        const targetVertical = verticals.find((v) => v.id === verticalId);
        if (!targetVertical) return res.status(400).json({ message: "verticalId does not belong to this business" });
      }

      const config = await storage.upsertSalaryConfig({
        businessId: profile.id,
        memberId: memberId || null,
        verticalId: verticalId || null,
        baseSalary: baseSalary || 0,
        incentivePercent: incentivePercent || 0,
        travelAllowanceCap: travelAllowanceCap || 0,
        incentiveTiers: incentiveTiers || [],
      });

      res.json(config);
    } catch (error) {
      console.error("Error saving salary config:", error);
      res.status(500).json({ message: "Failed to save salary config" });
    }
  });

  // PATCH salary-config: update by ID supplied in request body (body-based contract)
  // Also supports PATCH /api/business/salary-config/:id for URL-based access
  app.patch('/api/business/salary-config', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileByOwner(userId);
      if (!profile) return res.status(403).json({ message: "Only the owner can update salary configs" });

      const { id, baseSalary, incentivePercent, travelAllowanceCap, incentiveTiers } = req.body;
      if (!id) return res.status(400).json({ message: "id is required in request body" });

      const allConfigs = await storage.getSalaryConfigsByBusiness(profile.id);
      const configToUpdate = allConfigs.find((c) => c.id === id);
      if (!configToUpdate) return res.status(404).json({ message: "Salary config not found in your business" });

      const updated = await storage.upsertSalaryConfig({
        ...configToUpdate,
        baseSalary: baseSalary ?? configToUpdate.baseSalary,
        incentivePercent: incentivePercent ?? configToUpdate.incentivePercent,
        travelAllowanceCap: travelAllowanceCap ?? configToUpdate.travelAllowanceCap,
        incentiveTiers: incentiveTiers ?? configToUpdate.incentiveTiers,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating salary config:", error);
      res.status(500).json({ message: "Failed to update salary config" });
    }
  });

  // PATCH salary-config/:id: update a specific config by URL ID
  app.patch('/api/business/salary-config/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileByOwner(userId);
      if (!profile) return res.status(403).json({ message: "Only the owner can update salary configs" });

      // Verify this config belongs to the caller's business (IDOR prevention)
      const allConfigs = await storage.getSalaryConfigsByBusiness(profile.id);
      const configToUpdate = allConfigs.find((c) => c.id === req.params.id);
      if (!configToUpdate) return res.status(404).json({ message: "Salary config not found in your business" });

      const { baseSalary, incentivePercent, travelAllowanceCap, incentiveTiers } = req.body;
      const updated = await storage.upsertSalaryConfig({
        ...configToUpdate,
        baseSalary: baseSalary ?? configToUpdate.baseSalary,
        incentivePercent: incentivePercent ?? configToUpdate.incentivePercent,
        travelAllowanceCap: travelAllowanceCap ?? configToUpdate.travelAllowanceCap,
        incentiveTiers: incentiveTiers ?? configToUpdate.incentiveTiers,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating salary config:", error);
      res.status(500).json({ message: "Failed to update salary config" });
    }
  });

  // Employee targets
  app.get('/api/business/targets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "Business profile not found" });

      const { memberId, periodLabel } = req.query;

      // Employees can only see their own targets
      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwner = profile.ownerId === userId;
      const isManager = member?.memberRole === 'manager';

      let queryMemberId = memberId as string | undefined;
      if (!isOwner && !isManager) {
        // Regular employee: only their own targets
        queryMemberId = member?.id;
      }

      const targets = await storage.getEmployeeTargets(profile.id, queryMemberId, periodLabel as string | undefined);
      res.json(targets);
    } catch (error) {
      console.error("Error fetching targets:", error);
      res.status(500).json({ message: "Failed to fetch targets" });
    }
  });

  app.post('/api/business/targets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "Business profile not found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwner = profile.ownerId === userId;
      const isManager = member?.memberRole === 'manager';
      if (!isOwner && !isManager) return res.status(403).json({ message: "Only owner/manager can set targets" });

      const { memberId, verticalId, period, periodLabel, targetValue, targetType } = req.body;
      if (!memberId || !periodLabel || targetValue === undefined) {
        return res.status(400).json({ message: "memberId, periodLabel, and targetValue are required" });
      }

      // Verify memberId belongs to this business (IDOR prevention)
      const businessMembers = await storage.getBusinessMembers(profile.id);
      const targetMember = businessMembers.find((m) => m.id === memberId);
      if (!targetMember) return res.status(400).json({ message: "memberId does not belong to this business" });

      // Verify verticalId (if provided) belongs to this business
      if (verticalId) {
        const verticals = await storage.getBusinessVerticals(profile.id);
        const targetVertical = verticals.find((v) => v.id === verticalId);
        if (!targetVertical) return res.status(400).json({ message: "verticalId does not belong to this business" });
      }

      const target = await storage.createEmployeeTarget({
        businessId: profile.id,
        memberId,
        verticalId: verticalId || null,
        period: period || 'monthly',
        periodLabel,
        targetValue,
        targetType: targetType || 'revenue',
      });

      res.status(201).json(target);
    } catch (error) {
      console.error("Error creating target:", error);
      res.status(500).json({ message: "Failed to create target" });
    }
  });

  app.patch('/api/business/targets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "Business profile not found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwner = profile.ownerId === userId;
      const isManager = member?.memberRole === 'manager';
      if (!isOwner && !isManager) return res.status(403).json({ message: "Only owner/manager can edit targets" });

      // Verify target belongs to this business (IDOR prevention)
      const target = await storage.getEmployeeTarget(req.params.id);
      if (!target || target.businessId !== profile.id) {
        return res.status(404).json({ message: "Target not found in your business" });
      }

      const { targetValue, targetType, periodLabel, period } = req.body;
      const updated = await storage.updateEmployeeTarget(req.params.id, {
        targetValue, targetType, periodLabel, period
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating target:", error);
      res.status(500).json({ message: "Failed to update target" });
    }
  });

  app.delete('/api/business/targets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileByOwner(userId);
      if (!profile) return res.status(403).json({ message: "Only the owner can delete targets" });

      // Verify target belongs to this business (IDOR prevention)
      const target = await storage.getEmployeeTarget(req.params.id);
      if (!target || target.businessId !== profile.id) {
        return res.status(404).json({ message: "Target not found in your business" });
      }

      await storage.deleteEmployeeTarget(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting target:", error);
      res.status(500).json({ message: "Failed to delete target" });
    }
  });

  // ── EOD Entries ────────────────────────────────────────────────────────────

  interface EodFilters {
    memberId?: string;
    verticalId?: string;
    fromDate?: string;
    toDate?: string;
  }

  interface ExpenseItem {
    category: string;
    amount: number;
    description?: string;
  }

  interface EodUpdateFields {
    verticalId?: string | null;
    revenueAmount?: number;
    unitsSold?: number;
    dealsClosed?: number;
    expenseItems?: ExpenseItem[];
    notes?: string | null;
    managerNote?: string | null;
    status?: string;
  }

  function validateEodNumericFields(body: Record<string, unknown>): string | null {
    const { revenueAmount, unitsSold, dealsClosed } = body;
    if (revenueAmount !== undefined && (typeof revenueAmount !== 'number' || revenueAmount < 0)) return "revenueAmount must be a non-negative number";
    if (unitsSold !== undefined && (typeof unitsSold !== 'number' || unitsSold < 0)) return "unitsSold must be a non-negative number";
    if (dealsClosed !== undefined && (typeof dealsClosed !== 'number' || dealsClosed < 0)) return "dealsClosed must be a non-negative number";
    return null;
  }

  // Travel-related expense categories for cap enforcement (normalized lowercase)
  const TRAVEL_CATEGORIES = new Set(['travel', 'fuel', 'transport', 'conveyance', 'cab', 'auto', 'vehicle', 'petrol', 'diesel']);

  function validateExpenseItems(items: unknown): string | null {
    if (items === undefined) return null;
    if (!Array.isArray(items)) return "expenseItems must be an array";
    for (const item of items as unknown[]) {
      const e = item as Record<string, unknown>;
      if (!e.category || typeof e.category !== 'string' || !(e.category as string).trim()) return "Each expense must have a non-empty category string";
      if (typeof e.amount !== 'number' || (e.amount as number) < 0) return "Each expense amount must be a non-negative number";
    }
    return null;
  }

  function isTravelCategory(category: string): boolean {
    const normalized = category.toLowerCase().trim();
    return TRAVEL_CATEGORIES.has(normalized) || normalized.includes('travel') || normalized.includes('fuel');
  }

  async function enforceTravelCap(
    businessId: string,
    memberId: string,
    expenseItems: ExpenseItem[],
    entryDate?: string,    // date of the entry being submitted/updated
    excludeEntryId?: string // for PATCH: exclude the current entry from cumulative sum
  ): Promise<{ travelTotal: number; cap: number } | null> {
    // Resolve salary config: member-specific first, then business default (no memberId)
    let salaryConfig = await storage.getSalaryConfig(businessId, memberId);
    if (!salaryConfig) salaryConfig = await storage.getSalaryConfig(businessId, undefined);
    if (!salaryConfig || !salaryConfig.travelAllowanceCap || salaryConfig.travelAllowanceCap <= 0) return null;

    const period = entryDate ? entryDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
    const [yr, mo] = period.split("-").map(Number);
    const lastDay = new Date(yr, mo, 0).getDate();
    const fromDate = `${period}-01`;
    const toDate = `${period}-${String(lastDay).padStart(2, "0")}`;

    // Compute cumulative travel expenses for the month (excluding current entry if updating)
    const allEntries = await storage.getEodEntries(businessId, { memberId, fromDate, toDate });
    const monthEntries = allEntries.filter(e => e.entryDate.startsWith(period) && e.id !== excludeEntryId);
    const previousTravel = monthEntries.reduce((sum, e) => {
      const items = (e.expenseItems as ExpenseItem[] | null) ?? [];
      return sum + items.filter(i => isTravelCategory(i.category ?? '')).reduce((s, i) => s + (i.amount ?? 0), 0);
    }, 0);

    // Add current entry's travel
    const currentTravel = expenseItems
      .filter(e => isTravelCategory(e.category ?? ''))
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);

    const travelTotal = previousTravel + currentTravel;
    if (travelTotal > salaryConfig.travelAllowanceCap) {
      return { travelTotal, cap: salaryConfig.travelAllowanceCap };
    }
    return null;
  }

  // GET /api/business/eod — list EOD entries (employer sees all, employee sees own)
  app.get('/api/business/eod', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwnerOrManager = profile.ownerId === userId || member?.memberRole === 'manager';

      const { memberId, verticalId, fromDate, toDate } = req.query as Record<string, string>;

      const filters: EodFilters = {};
      if (!isOwnerOrManager) {
        if (!member) return res.status(403).json({ message: "Access denied" });
        filters.memberId = member.id;
      } else {
        if (memberId) filters.memberId = memberId;
      }
      if (verticalId) filters.verticalId = verticalId;
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;

      const entries = await storage.getEodEntries(profile.id, filters);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching EOD entries:", error);
      res.status(500).json({ message: "Failed to fetch EOD entries" });
    }
  });

  // Helper: compute achievement % for a member+period against active targets
  async function computeAchievement(businessId: string, memberId: string, entryDate: string): Promise<{ achievementPercent: number; targetRevenue: number; periodRevenue: number }> {
    const period = entryDate.slice(0, 7); // YYYY-MM
    // Compute last day of the month to bound the query
    const [yr, mo] = period.split("-").map(Number);
    const lastDay = new Date(yr, mo, 0).getDate(); // day 0 of next month = last day of current
    const fromDate = `${period}-01`;
    const toDate = `${period}-${String(lastDay).padStart(2, "0")}`;

    const targets = await storage.getEmployeeTargets(businessId, memberId);
    const revenueTarget = targets.find(t =>
      (t.periodLabel === period || t.periodLabel === entryDate.slice(0, 4)) && t.targetType === 'revenue'
    )?.targetValue ?? 0;
    const periodEntries = await storage.getEodEntries(businessId, { memberId, fromDate, toDate });
    const periodRevenue = periodEntries.reduce((s, e) => s + (e.revenueAmount ?? 0), 0);
    const achievementPercent = revenueTarget > 0 ? Math.round((periodRevenue / revenueTarget) * 100) : 0;
    return { achievementPercent, targetRevenue: revenueTarget, periodRevenue };
  }

  // POST /api/business/eod — submit EOD entry (employee or owner)
  app.post('/api/business/eod', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      // Determine memberId
      let memberId = req.body.memberId;
      if (!memberId) {
        const member = await storage.getBusinessMemberByUser(profile.id, userId);
        if (!member) return res.status(403).json({ message: "You are not a member of this business" });
        memberId = member.id;
      } else {
        // Verify member belongs to this business
        const member = await storage.getBusinessMemberByUser(profile.id, userId);
        const isOwnerOrManager = profile.ownerId === userId || member?.memberRole === 'manager';
        if (!isOwnerOrManager) {
          // Employees can only submit their own
          if (!member || member.id !== memberId) return res.status(403).json({ message: "Access denied" });
        }
        // If specifying a different memberId, verify it belongs to this business
        const members = await storage.getBusinessMembers(profile.id);
        const validMember = members.find(m => m.id === memberId);
        if (!validMember) return res.status(404).json({ message: "Member not found in your business" });
      }

      const body = req.body as Record<string, unknown>;
      const entryDate = body.entryDate as string | undefined;
      const verticalId = body.verticalId as string | undefined;
      const revenueAmount = body.revenueAmount as number | undefined;
      const unitsSold = body.unitsSold as number | undefined;
      const dealsClosed = body.dealsClosed as number | undefined;
      const expenseItems = body.expenseItems as ExpenseItem[] | undefined;
      const notes = body.notes as string | undefined;

      if (!entryDate) return res.status(400).json({ message: "entryDate is required" });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) return res.status(400).json({ message: "entryDate must be YYYY-MM-DD" });
      if (entryDate > new Date().toISOString().slice(0, 10)) return res.status(400).json({ message: "Cannot log future dates" });

      // Validate verticalId belongs to this business (tenant safety)
      if (verticalId) {
        const businessVerticals = await storage.getBusinessVerticals(profile.id);
        if (!businessVerticals.find(v => v.id === verticalId)) {
          return res.status(400).json({ message: "Invalid verticalId" });
        }
      }

      const numErr = validateEodNumericFields(body);
      if (numErr) return res.status(400).json({ message: numErr });

      const expErr = validateExpenseItems(body.expenseItems);
      if (expErr) return res.status(400).json({ message: expErr });

      // Determine role for edit restriction
      const actingMember = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwnerOrManagerActor = profile.ownerId === userId || actingMember?.memberRole === 'manager';

      // Check for duplicate entry (upsert path)
      const existing = await storage.getEodEntryByMemberAndDate(memberId, entryDate);

      // Travel allowance cap enforcement (cumulative for the month)
      // Exclude existing entry's ID (if replacing same-date entry) to avoid double-counting
      if (expenseItems && expenseItems.length > 0) {
        const capViolation = await enforceTravelCap(profile.id, memberId, expenseItems, entryDate, existing?.id);
        if (capViolation) {
          return res.status(400).json({
            message: `Travel expenses (${capViolation.travelTotal}) exceed monthly allowance cap (${capViolation.cap})`,
            travelTotal: capViolation.travelTotal,
            cap: capViolation.cap,
          });
        }
      }
      if (existing) {
        // Employees can only update today's entry; owners/managers can update any
        if (!isOwnerOrManagerActor) {
          const today = new Date().toISOString().slice(0, 10);
          if (entryDate !== today) {
            return res.status(403).json({ message: "Employees can only edit today's entry" });
          }
        }
        const upsertData: EodUpdateFields = {};
        if (verticalId !== undefined) upsertData.verticalId = verticalId;
        if (revenueAmount !== undefined) upsertData.revenueAmount = revenueAmount;
        if (unitsSold !== undefined) upsertData.unitsSold = unitsSold;
        if (dealsClosed !== undefined) upsertData.dealsClosed = dealsClosed;
        if (expenseItems !== undefined) upsertData.expenseItems = expenseItems;
        if (notes !== undefined) upsertData.notes = notes;
        const updated = await storage.updateEodEntry(existing.id, upsertData);
        const achievement = await computeAchievement(profile.id, memberId, entryDate);
        return res.json({ ...updated, ...achievement });
      }

      const entry = await storage.createEodEntry({
        businessId: profile.id,
        memberId,
        verticalId: verticalId || null,
        entryDate,
        revenueAmount: revenueAmount ?? 0,
        unitsSold: unitsSold ?? 0,
        dealsClosed: dealsClosed ?? 0,
        expenseItems: expenseItems ?? [],
        notes: notes || null,
        status: 'submitted',
      });
      const achievement = await computeAchievement(profile.id, memberId, entryDate);
      res.json({ ...entry, ...achievement });
    } catch (error) {
      console.error("Error creating EOD entry:", error);
      res.status(500).json({ message: "Failed to create EOD entry" });
    }
  });

  // PATCH /api/business/eod/:id — update EOD (employee updates own today-entry, employer adds manager note)
  app.patch('/api/business/eod/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      const entry = await storage.getEodEntry(req.params.id);
      if (!entry || entry.businessId !== profile.id) return res.status(404).json({ message: "Entry not found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwnerOrManager = profile.ownerId === userId || member?.memberRole === 'manager';

      if (!isOwnerOrManager && entry.memberId !== member?.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Employees can only edit today's entry
      if (!isOwnerOrManager) {
        const today = new Date().toISOString().slice(0, 10);
        if (entry.entryDate !== today) {
          return res.status(403).json({ message: "Employees can only edit today's entry" });
        }
      }

      const body = req.body as Record<string, unknown>;
      const { revenueAmount, unitsSold, dealsClosed, expenseItems, notes, managerNote, status, verticalId } = body;

      // Validate verticalId belongs to this business (tenant safety)
      if (verticalId) {
        const businessVerticals = await storage.getBusinessVerticals(profile.id);
        if (!businessVerticals.find(v => v.id === (verticalId as string))) {
          return res.status(400).json({ message: "Invalid verticalId" });
        }
      }

      // Validate numeric fields if being updated
      const numErr = validateEodNumericFields(body);
      if (numErr) return res.status(400).json({ message: numErr });

      // Validate expense items if being updated
      const expErr = validateExpenseItems(expenseItems);
      if (expErr) return res.status(400).json({ message: expErr });

      // Travel allowance cap enforcement on updates (cumulative monthly, excluding this entry)
      if (Array.isArray(expenseItems) && expenseItems.length > 0) {
        const capViolation = await enforceTravelCap(profile.id, entry.memberId, expenseItems as ExpenseItem[], entry.entryDate, entry.id);
        if (capViolation) {
          return res.status(400).json({
            message: `Travel expenses (${capViolation.travelTotal}) exceed monthly allowance cap (${capViolation.cap})`,
            travelTotal: capViolation.travelTotal,
            cap: capViolation.cap,
          });
        }
      }

      const updateData: EodUpdateFields = {};
      if (verticalId !== undefined) updateData.verticalId = verticalId as string | null;
      if (revenueAmount !== undefined) updateData.revenueAmount = revenueAmount as number;
      if (unitsSold !== undefined) updateData.unitsSold = unitsSold as number;
      if (dealsClosed !== undefined) updateData.dealsClosed = dealsClosed as number;
      if (expenseItems !== undefined) updateData.expenseItems = expenseItems as ExpenseItem[];
      if (notes !== undefined) updateData.notes = notes as string | null;
      // Only managers/owners can set manager note and review status
      if (isOwnerOrManager) {
        if (managerNote !== undefined) updateData.managerNote = managerNote as string | null;
        if (status !== undefined) {
          const allowedStatuses = ['submitted', 'reviewed'];
          if (!allowedStatuses.includes(status as string)) {
            return res.status(400).json({ message: `status must be one of: ${allowedStatuses.join(', ')}` });
          }
          updateData.status = status as string;
        }
      }

      const updated = await storage.updateEodEntry(req.params.id, updateData);
      const achievement = await computeAchievement(profile.id, entry.memberId, entry.entryDate);
      res.json({ ...updated, ...achievement });
    } catch (error) {
      console.error("Error updating EOD entry:", error);
      res.status(500).json({ message: "Failed to update EOD entry" });
    }
  });

  // DELETE /api/business/eod/:id
  app.delete('/api/business/eod/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      const entry = await storage.getEodEntry(req.params.id);
      if (!entry || entry.businessId !== profile.id) return res.status(404).json({ message: "Entry not found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwnerOrManager = profile.ownerId === userId || member?.memberRole === 'manager';

      if (!isOwnerOrManager && entry.memberId !== member?.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Employees can only delete today's entry (same restriction as edit/PATCH)
      if (!isOwnerOrManager) {
        const today = new Date().toISOString().slice(0, 10);
        if (entry.entryDate !== today) {
          return res.status(403).json({ message: "Employees can only delete today's entry" });
        }
      }

      await storage.deleteEodEntry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting EOD entry:", error);
      res.status(500).json({ message: "Failed to delete EOD entry" });
    }
  });

  // GET /api/business/eod/expenses?period=2024-01&memberId=... — expense summary by category
  // For employees: own expenses. For owners/managers: all or filtered by memberId.
  app.get('/api/business/eod/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwnerOrManager = profile.ownerId === userId || member?.memberRole === 'manager';

      const period = (req.query.period as string) || new Date().toISOString().slice(0, 7);
      const requestedMemberId = req.query.memberId as string | undefined;

      let filters: { memberId?: string; fromDate?: string } = {};
      if (period.length === 7) filters.fromDate = `${period}-01`;

      if (isOwnerOrManager) {
        if (requestedMemberId) {
          // Verify member belongs to this business
          const members = await storage.getBusinessMembers(profile.id);
          const valid = members.find(m => m.id === requestedMemberId);
          if (!valid) return res.status(404).json({ message: "Member not found" });
          filters.memberId = requestedMemberId;
        }
        // else: no memberId filter = all members
      } else {
        if (!member) return res.status(403).json({ message: "Access denied" });
        filters.memberId = member.id;
      }

      const entries = await storage.getEodEntries(profile.id, filters);
      const periodEntries = period.length === 7 ? entries.filter(e => e.entryDate.startsWith(period)) : entries;

      type ExpenseAgg = { category: string; total: number; count: number };
      const byCategory: Record<string, ExpenseAgg> = {};
      for (const entry of periodEntries) {
        for (const exp of (entry.expenseItems as ExpenseItem[] ?? [])) {
          if (!byCategory[exp.category]) byCategory[exp.category] = { category: exp.category, total: 0, count: 0 };
          byCategory[exp.category].total += exp.amount;
          byCategory[exp.category].count += 1;
        }
      }

      const summary = Object.values(byCategory).sort((a, b) => b.total - a.total);
      const grandTotal = summary.reduce((s, c) => s + c.total, 0);

      res.json({ period, grandTotal, byCategory: summary });
    } catch (error) {
      console.error("Error fetching expense summary:", error);
      res.status(500).json({ message: "Failed to fetch expense summary" });
    }
  });

  // ── Performance Aggregation ─────────────────────────────────────────────

  // GET /api/business/performance/trends?months=6 — last N months of monthly summaries for the requesting member
  app.get('/api/business/performance/trends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      if (!member) return res.status(404).json({ message: "You are not a member of this business" });

      const months = Math.min(parseInt(req.query.months as string || '6'), 12);
      const isOwnerOrManager = profile.ownerId === userId || member.memberRole === 'manager';
      const teamMode = isOwnerOrManager && req.query.team === 'true';

      // Optionally filter by memberId (owner/manager can request any member)
      let targetMemberId = member.id;
      if (!teamMode && isOwnerOrManager && req.query.memberId) {
        const members = await storage.getBusinessMembers(profile.id);
        if (members.find(m => m.id === req.query.memberId)) {
          targetMemberId = req.query.memberId as string;
        }
      }

      // Build array of last N months
      const now = new Date();
      const trends = [];
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const periodLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        if (teamMode) {
          // Team aggregate: sum across all active members
          const teamSummaries = await storage.getTeamPerformance(profile.id, periodLabel);
          const totalRevenue = teamSummaries.reduce((s, m) => s + m.totalRevenue, 0);
          const totalExpenses = teamSummaries.reduce((s, m) => s + m.totalExpenses, 0);
          const totalDeals = teamSummaries.reduce((s, m) => s + m.totalDeals, 0);
          const totalUnits = teamSummaries.reduce((s, m) => s + m.totalUnits, 0);
          const avgAchievement = teamSummaries.length > 0
            ? Math.round(teamSummaries.reduce((s, m) => s + m.achievementPercent, 0) / teamSummaries.length)
            : 0;
          // Vertical split: aggregate team EOD entries by vertical
          const verticalSplit: Record<string, { verticalId: string; revenue: number; deals: number }> = {};
          const teamEodEntries = await storage.getEodEntries(profile.id, { fromDate: `${periodLabel}-01` });
          const periodTeamEntries = teamEodEntries.filter(e => e.entryDate.startsWith(periodLabel));
          for (const e of periodTeamEntries) {
            const key = e.verticalId ?? 'unassigned';
            if (!verticalSplit[key]) verticalSplit[key] = { verticalId: key, revenue: 0, deals: 0 };
            verticalSplit[key].revenue += e.revenueAmount ?? 0;
            verticalSplit[key].deals += e.dealsClosed ?? 0;
          }
          // YoY: compare to same month last year
          const yoyLabel = `${d.getFullYear() - 1}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const yoyTeam = await storage.getTeamPerformance(profile.id, yoyLabel);
          const yoyRevenue = yoyTeam.reduce((s, m) => s + m.totalRevenue, 0);
          const yoyDelta = yoyRevenue > 0 ? Math.round(((totalRevenue - yoyRevenue) / yoyRevenue) * 100) : null;

          trends.push({
            period: periodLabel,
            label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
            totalRevenue,
            totalDeals,
            totalUnits,
            totalExpenses,
            achievementPercent: avgAchievement,
            projectedIncentive: 0,
            entryCount: teamSummaries.reduce((s, m) => s + m.entryCount, 0),
            verticalSplit: Object.values(verticalSplit),
            yoyRevenue,
            yoyDelta,
          });
        } else {
          const summary = await storage.getPerformanceSummary(profile.id, targetMemberId, periodLabel);
          trends.push({
            period: periodLabel,
            label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
            totalRevenue: summary.totalRevenue,
            totalDeals: summary.totalDeals,
            totalUnits: summary.totalUnits,
            totalExpenses: summary.totalExpenses,
            achievementPercent: summary.achievementPercent,
            projectedIncentive: summary.projectedIncentive,
            entryCount: summary.entryCount,
          });
        }
      }
      res.json(trends);
    } catch (error) {
      console.error("Error fetching performance trends:", error);
      res.status(500).json({ message: "Failed to fetch performance trends" });
    }
  });

  // GET /api/business/performance/my?period=2024-01
  app.get('/api/business/performance/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      if (!member) return res.status(404).json({ message: "You are not a member of this business" });

      const periodLabel = (req.query.period as string) || new Date().toISOString().slice(0, 7); // default current month
      const summary = await storage.getPerformanceSummary(profile.id, member.id, periodLabel);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching performance summary:", error);
      res.status(500).json({ message: "Failed to fetch performance summary" });
    }
  });

  // GET /api/business/performance/team?period=2024-01 (owner/manager only)
  app.get('/api/business/performance/team', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwnerOrManager = profile.ownerId === userId || member?.memberRole === 'manager';
      if (!isOwnerOrManager) return res.status(403).json({ message: "Only owners/managers can view team performance" });

      const periodLabel = (req.query.period as string) || new Date().toISOString().slice(0, 7);
      const summary = await storage.getTeamPerformance(profile.id, periodLabel);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching team performance:", error);
      res.status(500).json({ message: "Failed to fetch team performance" });
    }
  });

  // GET /api/business/performance/member/:memberId?period=2024-01&verticalId=... (owner/manager only)
  app.get('/api/business/performance/member/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwnerOrManager = profile.ownerId === userId || member?.memberRole === 'manager';
      if (!isOwnerOrManager) return res.status(403).json({ message: "Access denied" });

      // Verify target member belongs to this business (IDOR prevention)
      const targetMemberId = req.params.memberId as string;
      const allMembers = await storage.getBusinessMembers(profile.id);
      const targetMember = allMembers.find(m => m.id === targetMemberId);
      if (!targetMember) return res.status(404).json({ message: "Member not found in your business" });

      const periodLabel = (req.query.period as string) || new Date().toISOString().slice(0, 7);
      const verticalIdFilter = req.query.verticalId as string | undefined;

      const summary = await storage.getPerformanceSummary(profile.id, targetMemberId, periodLabel);

      // Include filtered EOD entries for drill-down (with month and vertical filters)
      const filters: { memberId: string; verticalId?: string; fromDate?: string } = { memberId: targetMemberId };
      if (periodLabel.length === 7) filters.fromDate = `${periodLabel}-01`; // YYYY-MM → first day
      if (verticalIdFilter) filters.verticalId = verticalIdFilter;
      const allEntries = await storage.getEodEntries(profile.id, filters);
      const filteredEntries = periodLabel.length === 7
        ? allEntries.filter(e => e.entryDate.startsWith(periodLabel))
        : allEntries;

      res.json({ ...summary, entries: filteredEntries, memberName: targetMember.name ?? targetMember.email, memberEmail: targetMember.email });
    } catch (error) {
      console.error("Error fetching member performance:", error);
      res.status(500).json({ message: "Failed to fetch member performance" });
    }
  });

  // GET /api/business/performance/summary?period=2024-01 — alias for /my that also supports ?memberId=... for managers
  app.get('/api/business/performance/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      if (!member) return res.status(404).json({ message: "You are not a member of this business" });

      const isOwnerOrManager = profile.ownerId === userId || member.memberRole === 'manager';
      let targetMemberId = member.id;

      if (isOwnerOrManager && req.query.memberId) {
        const allMembers = await storage.getBusinessMembers(profile.id);
        const target = allMembers.find(m => m.id === req.query.memberId);
        if (!target) return res.status(404).json({ message: "Member not found" });
        targetMemberId = target.id;
      }

      const periodLabel = (req.query.period as string) || new Date().toISOString().slice(0, 7);
      const summary = await storage.getPerformanceSummary(profile.id, targetMemberId, periodLabel);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching performance summary:", error);
      res.status(500).json({ message: "Failed to fetch performance summary" });
    }
  });

  // ── AI Business Intelligence Endpoints ────────────────────────────────────

  // POST /api/business/ai/pip — AI-generated Performance Improvement Plan (structured JSON)
  app.post('/api/business/ai/pip', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string;

      // Enforce daily usage limits
      const user = await storage.getUser(userId);
      const planFeatures = await getUserPlanFeatures(userId, user?.email || null);
      const todayUsage = await storage.getUsageForToday(userId);
      if (todayUsage && (todayUsage.aiActionsUsed || 0) >= planFeatures.aiActionsPerDay) {
        return res.status(429).json({
          message: `Daily AI limit reached (${planFeatures.aiActionsPerDay} actions). ${planFeatures.isPremium ? 'Try again tomorrow.' : 'Upgrade to Pro for more actions.'}`,
          remaining: 0,
          plan: planFeatures.planName,
        });
      }

      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwnerOrManager = profile.ownerId === userId || member?.memberRole === 'manager';
      if (!isOwnerOrManager) return res.status(403).json({ message: "Only owners/managers can generate PIPs" });

      const { memberId, periodLabel } = req.body;
      if (!memberId) return res.status(400).json({ message: "memberId is required" });

      // IDOR check
      const allMembers = await storage.getBusinessMembers(profile.id);
      const targetMember = allMembers.find(m => m.id === memberId);
      if (!targetMember) return res.status(404).json({ message: "Member not found" });

      const period = periodLabel || new Date().toISOString().slice(0, 7);
      const summary = await storage.getPerformanceSummary(profile.id, memberId, period);
      const sym = profile.currencySymbol ?? "₹";

      // Get member-level multi-period history (last 3 months)
      const memberHistory: string[] = [];
      const now = new Date();
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const hist = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (hist !== period) {
          try {
            const hs = await storage.getPerformanceSummary(profile.id, memberId, hist);
            memberHistory.push(`  ${hist}: Revenue ${sym}${hs.totalRevenue.toLocaleString()} (Ach: ${hs.achievementPercent}%), Units ${hs.totalUnits}, Deals ${hs.totalDeals}, EODs ${hs.entryCount}`);
          } catch { /* period may have no data */ }
        }
      }

      const prompt = `You are a professional HR consultant. Generate a structured Performance Improvement Plan (PIP) as JSON.

Employee: ${targetMember.name ?? targetMember.email}
Period: ${period}
Business: ${profile.name} (${profile.industry})

Current Period Performance:
- Revenue: ${sym}${summary.totalRevenue.toLocaleString()} (Target: ${sym}${summary.targetRevenue.toLocaleString()})
- Achievement: ${summary.achievementPercent}%
- Units Sold: ${summary.totalUnits} (Target: ${summary.targetUnits})
- Deals Closed: ${summary.totalDeals} (Target: ${summary.targetDeals})
- Expenses: ${sym}${summary.totalExpenses.toLocaleString()}
- EOD Entries: ${summary.entryCount}

Employee Performance History (prior months):
${memberHistory.length > 0 ? memberHistory.join("\n") : "  No prior period data available"}

Respond with valid JSON matching this schema exactly:
{
  "gapAnalysis": "2-3 sentences describing the performance gap with specific numbers",
  "rootCauses": ["cause 1", "cause 2", "cause 3"],
  "goals": {
    "day30": "Specific SMART goal for 30 days with a numeric target",
    "day60": "Specific SMART goal for 60 days with a numeric target",
    "day90": "Specific SMART goal for 90 days with a numeric target"
  },
  "actionItems": ["step 1", "step 2", "step 3", "step 4"],
  "managerSupport": "What the manager/business owner will provide",
  "reviewSchedule": "Check-in cadence (e.g., weekly 1:1 every Monday)",
  "summary": "1-sentence supportive closing statement"
}

Be specific with ${sym} numbers. Keep tone supportive and constructive.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
        contents: prompt,
      });
      const raw = result.text ?? "{}";
      let parsedPip: Record<string, unknown> = {};
      try { parsedPip = JSON.parse(raw); } catch { parsedPip = { gapAnalysis: raw }; }

      // Lightweight structural validation — ensure required PIP fields are present
      const pipData = {
        gapAnalysis: typeof parsedPip.gapAnalysis === "string" ? parsedPip.gapAnalysis : "Performance gap analysis not available.",
        rootCauses: Array.isArray(parsedPip.rootCauses) ? parsedPip.rootCauses as string[] : [],
        goals: (parsedPip.goals && typeof parsedPip.goals === "object")
          ? parsedPip.goals as { day30: string; day60: string; day90: string }
          : { day30: "", day60: "", day90: "" },
        actionItems: Array.isArray(parsedPip.actionItems) ? parsedPip.actionItems as string[] : [],
        managerSupport: typeof parsedPip.managerSupport === "string" ? parsedPip.managerSupport : "",
        reviewSchedule: typeof parsedPip.reviewSchedule === "string" ? parsedPip.reviewSchedule : "",
        summary: typeof parsedPip.summary === "string" ? parsedPip.summary : "",
      };

      await storage.incrementUsage(userId);
      const updated = await storage.getUsageForToday(userId);
      res.json({
        pip: pipData,
        memberName: targetMember.name ?? targetMember.email,
        period,
        remaining: planFeatures.aiActionsPerDay - (updated?.aiActionsUsed || 0),
      });
    } catch (error) {
      console.error("PIP generation error:", error);
      res.status(500).json({ message: "Failed to generate PIP" });
    }
  });

  // POST /api/business/ai/forecast — AI cash flow / revenue forecast (structured JSON)
  app.post('/api/business/ai/forecast', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string;

      // Enforce daily usage limits
      const user = await storage.getUser(userId);
      const planFeatures = await getUserPlanFeatures(userId, user?.email || null);
      const todayUsage = await storage.getUsageForToday(userId);
      if (todayUsage && (todayUsage.aiActionsUsed || 0) >= planFeatures.aiActionsPerDay) {
        return res.status(429).json({
          message: `Daily AI limit reached (${planFeatures.aiActionsPerDay} actions). ${planFeatures.isPremium ? 'Try again tomorrow.' : 'Upgrade to Pro for more actions.'}`,
          remaining: 0,
          plan: planFeatures.planName,
        });
      }

      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "No business profile found" });

      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwnerOrManager = profile.ownerId === userId || member?.memberRole === 'manager';
      if (!isOwnerOrManager) return res.status(403).json({ message: "Only owners/managers can generate forecasts" });

      // Get trend data (last 3 months — aligned with 90-day forecast window)
      const trends = await storage.getPerformanceTrends(profile.id, 3);
      const sym = profile.currencySymbol ?? "₹";

      const trendSummary = trends.map(t =>
        `${t.period}: Revenue ${sym}${t.totalRevenue.toLocaleString()}, Units ${t.totalUnits}, Deals ${t.totalDeals}, Entries ${t.entryCount}`
      ).join("\n");

      // Calculate last 3-month average for baseline
      const avgRevenue = trends.length > 0
        ? Math.round(trends.reduce((s, t) => s + t.totalRevenue, 0) / trends.length)
        : 0;

      const prompt = `You are an expert business financial analyst. Generate a structured 90-day revenue forecast as JSON.

Business: ${profile.name} (${profile.industry})
Currency: ${sym}

Historical Trend (last 3 months):
${trendSummary || "No historical data yet. Use conservative estimates."}

Average monthly revenue: ${sym}${avgRevenue.toLocaleString()}

Respond with valid JSON matching this schema exactly:
{
  "projections": [
    { "period": "Month 1 (30 days)", "revenue": <integer>, "units": <integer>, "confidence": <"high"|"medium"|"low">, "note": "brief note" },
    { "period": "Month 2 (60 days)", "revenue": <integer>, "units": <integer>, "confidence": <"high"|"medium"|"low">, "note": "brief note" },
    { "period": "Month 3 (90 days)", "revenue": <integer>, "units": <integer>, "confidence": <"high"|"medium"|"low">, "note": "brief note" }
  ],
  "assumptions": ["assumption 1", "assumption 2", "assumption 3"],
  "growthDrivers": ["driver 1", "driver 2"],
  "riskFactors": ["risk 1", "risk 2"],
  "recommendedActions": ["action 1", "action 2", "action 3"],
  "summary": "1-2 sentence executive summary"
}

Use exact integer revenue numbers in ${sym}. Base on trend. Set confidence based on data availability.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
        contents: prompt,
      });
      const raw = result.text ?? "{}";
      let parsedForecast: Record<string, unknown> = {};
      try { parsedForecast = JSON.parse(raw); } catch { parsedForecast = { summary: raw }; }

      // Lightweight structural validation — ensure required forecast fields are present
      const forecastData = {
        projections: Array.isArray(parsedForecast.projections) ? parsedForecast.projections as Array<Record<string, unknown>> : [],
        assumptions: Array.isArray(parsedForecast.assumptions) ? parsedForecast.assumptions as string[] : [],
        growthDrivers: Array.isArray(parsedForecast.growthDrivers) ? parsedForecast.growthDrivers as string[] : [],
        riskFactors: Array.isArray(parsedForecast.riskFactors) ? parsedForecast.riskFactors as string[] : [],
        recommendedActions: Array.isArray(parsedForecast.recommendedActions) ? parsedForecast.recommendedActions as string[] : [],
        summary: typeof parsedForecast.summary === "string" ? parsedForecast.summary : "Forecast summary not available.",
      };

      await storage.incrementUsage(userId);
      const updated = await storage.getUsageForToday(userId);
      // Build chart config from validated projections for direct frontend rendering
      const chartConfig = {
        data: forecastData.projections.map((p: Record<string, unknown>) => ({
          period: String(p.period ?? ""),
          revenue: Number(p.revenue ?? 0),
          units: Number(p.units ?? 0),
        })),
        xKey: "period",
        lines: [
          { dataKey: "revenue", name: "Projected Revenue", color: "#eab308" },
          { dataKey: "units", name: "Projected Units", color: "#6366f1" },
        ],
      };

      res.json({
        forecast: forecastData,
        chartConfig,
        trends,
        businessName: profile.name,
        currencySymbol: sym,
        remaining: planFeatures.aiActionsPerDay - (updated?.aiActionsUsed || 0),
      });
    } catch (error) {
      console.error("Forecast generation error:", error);
      res.status(500).json({ message: "Failed to generate forecast" });
    }
  });

  // POST /api/datasets/:id/index — trigger RAG indexing for a dataset (non-blocking)
  app.post('/api/datasets/:id/index', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string;
      const dataset = await storage.getDataset(req.params.id);
      if (!dataset || dataset.userId !== userId) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      // Fire-and-forget RAG indexing
      indexDataset(dataset.id, userId, dataset.headers, dataset.data).catch(e =>
        console.error("Background RAG indexing error:", e)
      );
      res.json({ message: "Indexing started", datasetId: dataset.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to start indexing" });
    }
  });

  // POST /api/export/pdf — export as binary PDF using pdfkit
  app.post('/api/export/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const PDFDocument = (await import('pdfkit')).default;
      const userId = req.user.claims.sub as string;
      const { dashboardId, businessReport, pipReport, chatSession } = req.body;

      // Validate request type before initializing PDF
      if (!dashboardId && !businessReport && !pipReport && !chatSession) {
        return res.status(400).json({ message: "Provide dashboardId, businessReport, pipReport, or chatSession" });
      }

      if (businessReport) {
        // Business performance report — owner/manager only
        const profile = await storage.getBusinessProfileForUser(userId);
        if (!profile) { return res.status(404).json({ message: "Business profile not found" }); }

        const member = await storage.getBusinessMemberByUser(profile.id, userId);
        const isOwnerOrManager = profile.ownerId === userId || member?.memberRole === 'manager';
        if (!isOwnerOrManager) { return res.status(403).json({ message: "Access denied" }); }
      }

      if (dashboardId) {
        const dashboard = await storage.getDashboard(dashboardId);
        if (!dashboard || dashboard.userId !== userId) { return res.status(404).json({ message: "Dashboard not found" }); }
      }

      // All validation passed — initialize PDF and pipe to response
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const GOLD = '#b8860b';
      const DARK = '#1a1a1a';
      const MUTED = '#666666';
      const pageWidth = 595.28 - 100;

      const addHeader = (title: string, subtitle?: string) => {
        doc.fillColor(GOLD).fontSize(20).font('Helvetica-Bold').text(title, 50, 50, { width: pageWidth });
        doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).strokeColor(GOLD).lineWidth(1.5).stroke();
        doc.moveDown(0.4);
        if (subtitle) {
          doc.fillColor(MUTED).fontSize(10).font('Helvetica').text(subtitle);
          doc.moveDown(0.4);
        }
        doc.fillColor(MUTED).fontSize(9).text(`Generated: ${new Date().toLocaleString()}`);
        doc.moveDown(1);
      };

      const addSection = (title: string) => {
        doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold').text(title);
        doc.moveDown(0.3);
      };

      const addText = (text: string, size = 10) => {
        doc.fillColor(DARK).fontSize(size).font('Helvetica').text(text, { lineGap: 3 });
        doc.moveDown(0.3);
      };

      const addBulletList = (items: string[], color = DARK) => {
        for (const item of items) {
          doc.fillColor(color).fontSize(10).font('Helvetica')
            .text(`• ${item}`, { indent: 12, lineGap: 2 });
        }
        doc.moveDown(0.4);
      };

      const addKpiRow = (kpis: { label: string; value: string }[]) => {
        const colW = pageWidth / kpis.length;
        const startY = doc.y;
        kpis.forEach((kpi, i) => {
          const x = 50 + i * colW;
          doc.rect(x, startY, colW - 6, 44).fillColor('#f9f9f9').fill();
          doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(kpi.label, x + 6, startY + 6, { width: colW - 12 });
          doc.fillColor(GOLD).fontSize(14).font('Helvetica-Bold').text(kpi.value, x + 6, startY + 18, { width: colW - 12 });
        });
        doc.y = startY + 52;
        doc.moveDown(0.5);
      };

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
      doc.pipe(res);

      if (businessReport) {
        // Business performance report — owner/manager only (already validated above)
        const profile = await storage.getBusinessProfileForUser(userId);
        if (!profile) { doc.end(); return; }

        const reportType: string = businessReport.type ?? "monthly";
        const periodStr: string = businessReport.period || new Date().toISOString().slice(0, 7);
        const reportExtraParams: Record<string, string> = businessReport.params ?? {};
        const sym = profile.currencySymbol ?? "₹";

        // Helper: render team performance table into the PDF
        const renderTeamTable = (teamPerf: TeamPerformanceSummary[]) => {
          const colHeaders = ['Member', 'Revenue', 'Units', 'Deals', 'Achievement'];
          const colWidths = [160, 100, 70, 70, 95];
          let tx = 50;
          const headerY = doc.y;
          colHeaders.forEach((h, i) => {
            doc.rect(tx, headerY, colWidths[i], 18).fillColor(GOLD).fill();
            doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text(h, tx + 4, headerY + 4, { width: colWidths[i] - 8 });
            tx += colWidths[i];
          });
          doc.y = headerY + 20;
          teamPerf.forEach((m, idx) => {
            if (doc.y > 750) { doc.addPage(); }
            const rowY = doc.y;
            doc.rect(50, rowY, pageWidth, 16).fillColor(idx % 2 === 0 ? '#f9f9f9' : 'white').fill();
            const cells = [m.memberName, `${sym}${m.totalRevenue.toLocaleString()}`, String(m.totalUnits ?? 0), String(m.totalDeals ?? 0), `${(m.achievementPercent ?? 0).toFixed(1)}%`];
            let cx = 50;
            cells.forEach((cell, i) => {
              doc.fillColor(DARK).fontSize(9).font('Helvetica').text(cell, cx + 4, rowY + 3, { width: colWidths[i] - 8, lineBreak: false });
              cx += colWidths[i];
            });
            doc.y = rowY + 18;
          });
        };

        // Helper: get total expenses from expenseItems JSONB array
        const sumExpenses = (e: EodEntry): number => {
          const items = Array.isArray(e.expenseItems) ? e.expenseItems : [];
          return items.reduce((s, item) => s + (item.amount ?? 0), 0);
        };

        // Helper: build member id→name map
        const buildMemberMap = async (): Promise<Record<string, string>> => {
          const members = await storage.getBusinessMembers(profile.id);
          const map: Record<string, string> = {};
          for (const m of members) {
            const name = m.user ? [m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || m.user.email || m.email : m.email;
            map[m.id] = name ?? m.id;
          }
          return map;
        };

        // Helper: render EOD entries table (uses correct EOD field names)
        const renderEodTable = (entries: EodEntry[], memberMap: Record<string, string>) => {
          const colHeaders = ['Date', 'Member', 'Revenue', 'Expenses', 'Notes'];
          const colWidths = [80, 130, 100, 100, 85];
          let tx = 50;
          const headerY = doc.y;
          colHeaders.forEach((h, i) => {
            doc.rect(tx, headerY, colWidths[i], 18).fillColor(GOLD).fill();
            doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text(h, tx + 4, headerY + 4, { width: colWidths[i] - 8 });
            tx += colWidths[i];
          });
          doc.y = headerY + 20;
          entries.slice(0, 60).forEach((e, idx) => {
            if (doc.y > 750) { doc.addPage(); }
            const rowY = doc.y;
            doc.rect(50, rowY, pageWidth, 16).fillColor(idx % 2 === 0 ? '#f9f9f9' : 'white').fill();
            const rev = e.revenueAmount ?? 0;
            const exp = sumExpenses(e);
            const cells = [e.entryDate ?? '', memberMap[e.memberId] ?? e.memberId ?? '', `${sym}${rev.toLocaleString()}`, `${sym}${exp.toLocaleString()}`, (e.notes ?? '').slice(0, 30)];
            let cx = 50;
            cells.forEach((cell, i) => {
              doc.fillColor(DARK).fontSize(8).font('Helvetica').text(cell, cx + 4, rowY + 3, { width: colWidths[i] - 8, lineBreak: false });
              cx += colWidths[i];
            });
            doc.y = rowY + 18;
          });
        };

        // AI executive summary helper (non-blocking)
        const tryAiSummary = async (prompt: string): Promise<string> => {
          try {
            const pdfUser = await storage.getUser(userId);
            const pdfPlanFeatures = await getUserPlanFeatures(userId, pdfUser?.email ?? null);
            const pdfUsage = await storage.getUsageForToday(userId);
            if ((pdfUsage?.aiActionsUsed ?? 0) >= pdfPlanFeatures.aiActionsPerDay) return "";
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
            const result = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
            await storage.incrementUsage(userId);
            return result.text ?? "";
          } catch { return ""; }
        };

        if (reportType === "monthly") {
          // MONTHLY TEAM PERFORMANCE
          const teamPerf = await storage.getTeamPerformance(profile.id, periodStr);
          const totalRevenue = teamPerf.reduce((s, m) => s + m.totalRevenue, 0);
          const totalExpenses = teamPerf.reduce((s, m) => s + m.totalExpenses, 0);
          const avgAch = teamPerf.length > 0 ? teamPerf.reduce((s, m) => s + m.achievementPercent, 0) / teamPerf.length : 0;
          const topPerformer = [...teamPerf].sort((a, b) => b.achievementPercent - a.achievementPercent)[0];
          const aiSummary = await tryAiSummary(`Write a concise 3-sentence executive summary for this monthly business performance report. Business: ${profile.name} (${profile.industry}). Period: ${periodStr}. Total Revenue: ${sym}${totalRevenue.toLocaleString()}. Team average achievement: ${avgAch.toFixed(0)}%. Top performer: ${topPerformer?.memberName ?? "N/A"} at ${topPerformer?.achievementPercent?.toFixed(0) ?? 0}%. Keep it professional and forward-looking.`);
          addHeader(`${profile.name} — Monthly Report`, `${profile.industry} · Month: ${periodStr}`);
          addKpiRow([{ label: 'TOTAL REVENUE', value: `${sym}${totalRevenue.toLocaleString()}` }, { label: 'TOTAL EXPENSES', value: `${sym}${totalExpenses.toLocaleString()}` }, { label: 'TEAM MEMBERS', value: String(teamPerf.length) }, { label: 'AVG ACHIEVEMENT', value: `${avgAch.toFixed(0)}%` }]);
          if (aiSummary) { addSection('AI Executive Summary'); addText(aiSummary); }
          addSection('Team Performance Detail');
          renderTeamTable(teamPerf);

        } else if (reportType === "ytd") {
          // YEAR-TO-DATE REPORT — aggregate across all months of current FY
          // periodStr = "ytd-2025" → FY starting April 2025
          const fyStartYear = parseInt((periodStr.split('-')[1]) || String(new Date().getFullYear()));
          const months: string[] = [];
          for (let m = 4; m <= 12; m++) months.push(`${fyStartYear}-${String(m).padStart(2, '0')}`);
          for (let m = 1; m <= 3; m++) months.push(`${fyStartYear + 1}-${String(m).padStart(2, '0')}`);
          const todayStr = new Date().toISOString().slice(0, 7);
          const validMonths = months.filter(mo => mo <= todayStr);
          type YtdAgg = TeamPerformanceSummary & { count: number };
          const ytdMap: Record<string, YtdAgg> = {};
          for (const mo of validMonths) {
            const mp = await storage.getTeamPerformance(profile.id, mo);
            for (const row of mp) {
              if (!ytdMap[row.memberId]) {
                ytdMap[row.memberId] = {
                  ...row,
                  totalRevenue: 0,
                  totalExpenses: 0,
                  totalUnits: 0,
                  totalDeals: 0,
                  achievementPercent: 0,
                  count: 0,
                };
              }
              ytdMap[row.memberId].totalRevenue += row.totalRevenue;
              ytdMap[row.memberId].totalExpenses += row.totalExpenses;
              ytdMap[row.memberId].totalUnits += row.totalUnits;
              ytdMap[row.memberId].totalDeals += row.totalDeals;
              ytdMap[row.memberId].achievementPercent += row.achievementPercent;
              ytdMap[row.memberId].count++;
            }
          }
          const ytdRows: TeamPerformanceSummary[] = Object.values(ytdMap).map(r => ({ ...r, achievementPercent: r.count > 0 ? r.achievementPercent / r.count : 0 }));
          const ytdRev = ytdRows.reduce((s, r) => s + r.totalRevenue, 0);
          const ytdExp = ytdRows.reduce((s, r) => s + r.totalExpenses, 0);
          const ytdAvgAch = ytdRows.length > 0 ? ytdRows.reduce((s, r) => s + r.achievementPercent, 0) / ytdRows.length : 0;
          addHeader(`${profile.name} — YTD Report`, `${profile.industry} · FY ${fyStartYear}–${fyStartYear + 1} (Apr–${todayStr.slice(0, 7)})`);
          addKpiRow([{ label: 'YTD REVENUE', value: `${sym}${ytdRev.toLocaleString()}` }, { label: 'YTD EXPENSES', value: `${sym}${ytdExp.toLocaleString()}` }, { label: 'MONTHS TRACKED', value: String(validMonths.length) }, { label: 'AVG ACHIEVEMENT', value: `${ytdAvgAch.toFixed(0)}%` }]);
          addSection('Year-to-Date Team Summary');
          renderTeamTable(ytdRows);

        } else if (reportType === "daily") {
          // DAILY REPORT — periodStr = YYYY-MM-DD
          const dateStr = periodStr;
          const entries = await storage.getEodEntries(profile.id, { fromDate: dateStr, toDate: dateStr });
          const memberMap = await buildMemberMap();
          const dayRev = entries.reduce((s, e) => s + (e.revenueAmount ?? 0), 0);
          const dayExp = entries.reduce((s, e) => s + sumExpenses(e), 0);
          addHeader(`${profile.name} — Daily Report`, `${profile.industry} · Date: ${dateStr}`);
          addKpiRow([{ label: 'DAILY REVENUE', value: `${sym}${dayRev.toLocaleString()}` }, { label: 'DAILY EXPENSES', value: `${sym}${dayExp.toLocaleString()}` }, { label: 'EOD ENTRIES', value: String(entries.length) }, { label: 'NET', value: `${sym}${(dayRev - dayExp).toLocaleString()}` }]);
          addSection('EOD Entries');
          renderEodTable(entries, memberMap);

        } else if (reportType === "weekly") {
          // WEEKLY REPORT — periodStr = "weekly-YYYY-MM-DD-YYYY-MM-DD"
          const parts = periodStr.split('-');
          // format: weekly-YYYY-MM-DD-YYYY-MM-DD → parts[1..3] and [4..6]
          const fromDate = parts.slice(1, 4).join('-');
          const toDate = parts.slice(4, 7).join('-');
          const entries = await storage.getEodEntries(profile.id, { fromDate, toDate });
          const memberMap = await buildMemberMap();
          const wkRev = entries.reduce((s, e) => s + (e.revenueAmount ?? 0), 0);
          const wkExp = entries.reduce((s, e) => s + sumExpenses(e), 0);
          addHeader(`${profile.name} — Weekly Report`, `${profile.industry} · Week: ${fromDate} to ${toDate}`);
          addKpiRow([{ label: 'WEEK REVENUE', value: `${sym}${wkRev.toLocaleString()}` }, { label: 'WEEK EXPENSES', value: `${sym}${wkExp.toLocaleString()}` }, { label: 'EOD ENTRIES', value: String(entries.length) }, { label: 'NET', value: `${sym}${(wkRev - wkExp).toLocaleString()}` }]);
          addSection('EOD Entries This Week');
          renderEodTable(entries, memberMap);

        } else if (reportType === "employee") {
          // EMPLOYEE REPORT — periodStr = FY start year (e.g. "2025"), params.memberId = member UUID
          const fyStart = parseInt(periodStr) || (new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1);
          const memberId = reportExtraParams.memberId ?? "";
          const fromDate = `${fyStart}-04-01`;
          const toDate = `${fyStart + 1}-03-31`;
          const empEntries = await storage.getEodEntries(profile.id, { memberId: memberId || undefined, fromDate, toDate });
          const memberMap = await buildMemberMap();
          const empRev = empEntries.reduce((s, e) => s + (e.revenueAmount ?? 0), 0);
          const empExp = empEntries.reduce((s, e) => s + sumExpenses(e), 0);
          const memberName = memberId ? (memberMap[memberId] ?? memberId) : "All Members";
          const targets = memberId ? await storage.getEmployeeTargets(profile.id, memberId) : [];
          const totalTarget = targets.reduce((s, t) => s + (t.targetValue ?? 0), 0);
          const achievePct = totalTarget > 0 ? (empRev / totalTarget) * 100 : 0;
          addHeader(`${profile.name} — Employee Report`, `${profile.industry} · Employee: ${memberName} · FY ${fyStart}–${fyStart + 1}`);
          addKpiRow([{ label: 'YTD REVENUE', value: `${sym}${empRev.toLocaleString()}` }, { label: 'YTD EXPENSES', value: `${sym}${empExp.toLocaleString()}` }, { label: 'EOD ENTRIES', value: String(empEntries.length) }, { label: 'TARGET ACHIEVEMENT', value: `${achievePct.toFixed(0)}%` }]);
          addSection('Performance History');
          renderEodTable(empEntries, memberMap);

        } else if (reportType === "festival") {
          // FESTIVAL SEASON REPORT — periodStr = "festival-YYYY-MM-DD-YYYY-MM-DD"
          const fparts = periodStr.split('-');
          const fromDate = fparts.slice(1, 4).join('-');
          const toDate = fparts.slice(4, 7).join('-');
          const entries = await storage.getEodEntries(profile.id, { fromDate, toDate });
          const memberMap = await buildMemberMap();
          const festRev = entries.reduce((s, e) => s + (e.revenueAmount ?? 0), 0);
          const festExp = entries.reduce((s, e) => s + sumExpenses(e), 0);
          addHeader(`${profile.name} — Festival Season Report`, `${profile.industry} · Period: ${fromDate} to ${toDate}`);
          addKpiRow([{ label: 'SEASON REVENUE', value: `${sym}${festRev.toLocaleString()}` }, { label: 'SEASON EXPENSES', value: `${sym}${festExp.toLocaleString()}` }, { label: 'WORKING DAYS', value: String(entries.length) }, { label: 'NET PROFIT', value: `${sym}${(festRev - festExp).toLocaleString()}` }]);
          addSection('Festival Period EOD Entries');
          renderEodTable(entries, memberMap);

        } else {
          // Fallback — treat as monthly
          const teamPerf = await storage.getTeamPerformance(profile.id, periodStr);
          addHeader(`${profile.name} — Performance Report`, `${profile.industry} · Period: ${periodStr}`);
          addSection('Team Performance Detail');
          renderTeamTable(teamPerf);
        }

        doc.moveDown(1.5);
        doc.fillColor(MUTED).fontSize(8).text('Generated by DataInsights v2.0 · AI-Powered Business Analytics', { align: 'center' });

      } else if (pipReport) {
        // PIP export
        const { pip, memberName, period } = pipReport;
        addHeader(`Performance Improvement Plan`, `Employee: ${memberName} · Period: ${period}`);

        if (pip.gapAnalysis) { addSection('Performance Gap Analysis'); addText(pip.gapAnalysis); }
        if (pip.rootCauses?.length) { addSection('Root Causes'); addBulletList(pip.rootCauses); }
        if (pip.goals) {
          addSection('SMART Goals');
          if (pip.goals.day30) addText(`30 Days: ${pip.goals.day30}`);
          if (pip.goals.day60) addText(`60 Days: ${pip.goals.day60}`);
          if (pip.goals.day90) addText(`90 Days: ${pip.goals.day90}`);
        }
        if (pip.actionItems?.length) { addSection('Action Plan'); addBulletList(pip.actionItems); }
        if (pip.managerSupport) { addSection('Manager Support'); addText(pip.managerSupport); }
        if (pip.reviewSchedule) { addSection('Review Schedule'); addText(pip.reviewSchedule); }
        if (pip.summary) { doc.moveDown(0.5); addText(pip.summary, 9); }

        doc.moveDown(1.5);
        doc.fillColor(MUTED).fontSize(8).text('Generated by DataInsights v2.0 · AI-Powered Business Analytics', { align: 'center' });

      } else if (chatSession) {
        // Chat session transcript
        const { messages, title, datasetName } = chatSession;
        addHeader('AI Chat Transcript', title || (datasetName ? `Dataset: ${datasetName}` : 'DataInsights Chat Session'));

        for (const msg of messages ?? []) {
          if (doc.y > 720) doc.addPage();
          const isUser = msg.role === 'user';
          doc.fillColor(isUser ? GOLD : DARK).fontSize(9).font('Helvetica-Bold').text(isUser ? 'You' : 'AI Assistant');
          doc.fillColor(DARK).fontSize(10).font('Helvetica').text(msg.content, { lineGap: 3 });
          if (msg.context_source && msg.context_source !== 'general') {
            doc.fillColor('#3b82f6').fontSize(8).text(`[${msg.context_source === 'rag_document' ? 'RAG Enhanced' : 'Live Business Data'}]`);
          }
          doc.moveDown(0.6);
        }

        doc.moveDown(0.5);
        doc.fillColor(MUTED).fontSize(8).text('Generated by DataInsights v2.0 · AI-Powered Business Analytics', { align: 'center' });

      } else if (dashboardId) {
        // Dashboard summary (already validated ownership above)
        const dashboard = await storage.getDashboard(dashboardId);
        if (!dashboard || dashboard.userId !== userId) { doc.end(); return; }
        const dataset = await storage.getDataset(dashboard.datasetId);

        addHeader(dashboard.title, `Dataset: ${dataset?.spreadsheetName ?? ''} · ${dataset?.rowCount ?? 0} records`);
        if (dashboard.config.summary) {
          addSection('AI Insights');
          addText(dashboard.config.summary);
        }
        const chartList = dashboard.config.charts ?? [];
        if (chartList.length > 0) {
          addSection('Dashboard Charts');
          chartList.forEach((chart) => {
            if (doc.y > 720) doc.addPage();
            const typeLabel = chart.type === 'kpi' ? 'KPI' : chart.type.charAt(0).toUpperCase() + chart.type.slice(1);
            addText(`${typeLabel}: ${chart.title}${chart.insights ? ' — ' + chart.insights : ''}`);
          });
        }

        doc.moveDown(1.5);
        doc.fillColor(MUTED).fontSize(8).text('Generated by DataInsights v2.0 · AI-Powered Business Analytics', { align: 'center' });

      }

      doc.end();
    } catch (error) {
      console.error("PDF export error:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // POST /api/business/reports/share — create a shareable token for a report
  app.post('/api/business/reports/share', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string;
      const profile = await storage.getBusinessProfileForUser(userId);
      if (!profile) return res.status(404).json({ message: "Business profile not found" });
      const member = await storage.getBusinessMemberByUser(profile.id, userId);
      const isOwnerOrManager = profile.ownerId === userId || member?.memberRole === 'manager';
      if (!isOwnerOrManager) return res.status(403).json({ message: "Access denied" });

      const { reportType, reportParams } = req.body;
      if (!reportType) return res.status(400).json({ message: "reportType is required" });

      const token = randomBytes(20).toString('hex');
      const reportToken = await storage.createBusinessReportToken({
        token,
        businessId: profile.id,
        reportType,
        reportParams: reportParams || {},
        createdBy: userId,
      });
      const shareUrl = `/business/reports/shared/${token}`;
      res.json({ token, shareUrl, fullUrl: `${req.protocol}://${req.get('host')}${shareUrl}` });
    } catch (error) {
      console.error("Report share error:", error);
      res.status(500).json({ message: "Failed to create share link" });
    }
  });

  // GET /api/business/reports/shared/:token — retrieve a shared report's metadata (PUBLIC — no auth required)
  app.get('/api/business/reports/shared/:token', async (req, res) => {
    try {
      const reportToken = await storage.getBusinessReportToken(req.params.token);
      if (!reportToken) return res.status(404).json({ message: "Report link not found or expired" });

      const profile = await storage.getBusinessProfileById(reportToken.businessId);

      res.json({
        reportType: reportToken.reportType,
        reportParams: reportToken.reportParams,
        businessId: reportToken.businessId,
        businessName: profile?.name ?? "Business Report",
        businessIndustry: profile?.industry,
        createdAt: reportToken.createdAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve share info" });
    }
  });

  // GET /api/business/reports/shared/:token/data — return actual report data for a shared token (PUBLIC)
  // This is the true "read-only share" endpoint — no auth needed, data scoped to token's business/params.
  app.get('/api/business/reports/shared/:token/data', async (req, res) => {
    try {
      const reportToken = await storage.getBusinessReportToken(req.params.token);
      if (!reportToken) return res.status(404).json({ message: "Report not found or expired" });

      const profile = await storage.getBusinessProfileById(reportToken.businessId);
      if (!profile) return res.status(404).json({ message: "Business not found" });

      const sym = profile.currencySymbol ?? "₹";
      const { reportType, reportParams } = reportToken;
      const p = reportParams as Record<string, string>;

      // Helper: sum expenses from JSONB expenseItems
      const sumExp = (e: EodEntry): number => {
        const items = Array.isArray(e.expenseItems) ? e.expenseItems : [];
        return items.reduce((s, item) => s + (item.amount ?? 0), 0);
      };

      // Build member display map
      const allMembers = await storage.getBusinessMembers(reportToken.businessId);
      const memberNameMap: Record<string, string> = {};
      for (const m of allMembers) {
        const name = m.user
          ? ([m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || m.user.email || m.email)
          : m.email;
        memberNameMap[m.id] = name ?? m.id;
      }

      let reportData: unknown;

      if (reportType === "monthly") {
        const period = p.period ?? new Date().toISOString().slice(0, 7);
        const teamPerf = await storage.getTeamPerformance(reportToken.businessId, period);
        const totalRevenue = teamPerf.reduce((s, m) => s + m.totalRevenue, 0);
        const totalExpenses = teamPerf.reduce((s, m) => s + m.totalExpenses, 0);
        const avgAch = teamPerf.length > 0 ? teamPerf.reduce((s, m) => s + m.achievementPercent, 0) / teamPerf.length : 0;
        reportData = { period, totalRevenue, totalExpenses, avgAch, teamPerf, sym };

      } else if (reportType === "ytd") {
        const fyStartYear = parseInt(p.fyStartYear ?? p.period ?? String(new Date().getFullYear()));
        const months: string[] = [];
        for (let m = 4; m <= 12; m++) months.push(`${fyStartYear}-${String(m).padStart(2, '0')}`);
        for (let m = 1; m <= 3; m++) months.push(`${fyStartYear + 1}-${String(m).padStart(2, '0')}`);
        const todayStr = new Date().toISOString().slice(0, 7);
        const validMonths = months.filter(mo => mo <= todayStr);
        const ytdMap: Record<string, TeamPerformanceSummary & { count: number }> = {};
        for (const mo of validMonths) {
          const mp = await storage.getTeamPerformance(reportToken.businessId, mo);
          for (const row of mp) {
            if (!ytdMap[row.memberId]) {
              ytdMap[row.memberId] = {
                ...row,
                totalRevenue: 0,
                totalExpenses: 0,
                totalUnits: 0,
                totalDeals: 0,
                achievementPercent: 0,
                count: 0,
              };
            }
            ytdMap[row.memberId].totalRevenue += row.totalRevenue;
            ytdMap[row.memberId].totalExpenses += row.totalExpenses;
            ytdMap[row.memberId].totalUnits += row.totalUnits;
            ytdMap[row.memberId].totalDeals += row.totalDeals;
            ytdMap[row.memberId].achievementPercent += row.achievementPercent;
            ytdMap[row.memberId].count++;
          }
        }
        const ytdRows = Object.values(ytdMap).map(r => ({ ...r, achievementPercent: r.count > 0 ? r.achievementPercent / r.count : 0 }));
        const totalRevenue = ytdRows.reduce((s, r) => s + r.totalRevenue, 0);
        const totalExpenses = ytdRows.reduce((s, r) => s + r.totalExpenses, 0);
        const avgAch = ytdRows.length > 0 ? ytdRows.reduce((s, r) => s + r.achievementPercent, 0) / ytdRows.length : 0;
        reportData = { fyStartYear, validMonths, ytdRows, totalRevenue, totalExpenses, avgAch, sym };

      } else if (reportType === "daily") {
        const dateStr = p.selectedDate ?? p.period ?? new Date().toISOString().slice(0, 10);
        const entries = await storage.getEodEntries(reportToken.businessId, { fromDate: dateStr, toDate: dateStr });
        const dayRev = entries.reduce((s, e) => s + (e.revenueAmount ?? 0), 0);
        const dayExp = entries.reduce((s, e) => s + sumExp(e), 0);
        const enriched = entries.map(e => ({ ...e, memberName: memberNameMap[e.memberId] ?? e.memberId, revenue: e.revenueAmount ?? 0, expenses: sumExp(e) }));
        reportData = { dateStr, entries: enriched, dayRev, dayExp, sym };

      } else if (reportType === "weekly") {
        const fromDate = p.weekStart ?? p.period?.slice(7, 17) ?? new Date().toISOString().slice(0, 10);
        const toDate = p.weekEnd ?? (fromDate ? new Date(new Date(fromDate).getTime() + 6 * 86400000).toISOString().slice(0, 10) : fromDate);
        const entries = await storage.getEodEntries(reportToken.businessId, { fromDate, toDate });
        const wkRev = entries.reduce((s, e) => s + (e.revenueAmount ?? 0), 0);
        const wkExp = entries.reduce((s, e) => s + sumExp(e), 0);
        const enriched = entries.map(e => ({ ...e, memberName: memberNameMap[e.memberId] ?? e.memberId, revenue: e.revenueAmount ?? 0, expenses: sumExp(e) }));
        reportData = { fromDate, toDate, entries: enriched, wkRev, wkExp, sym };

      } else if (reportType === "employee") {
        const fyStart = parseInt(p.fyStartYear ?? p.period ?? String(new Date().getFullYear()));
        const memberId = p.memberId;
        const fromDate = `${fyStart}-04-01`;
        const toDate = `${fyStart + 1}-03-31`;
        const entries = await storage.getEodEntries(reportToken.businessId, { memberId: memberId || undefined, fromDate, toDate });
        const empRev = entries.reduce((s, e) => s + (e.revenueAmount ?? 0), 0);
        const empExp = entries.reduce((s, e) => s + sumExp(e), 0);
        const targets = memberId ? await storage.getEmployeeTargets(reportToken.businessId, memberId) : [];
        const totalTarget = targets.reduce((s, t) => s + (t.targetValue ?? 0), 0);
        const achievePct = totalTarget > 0 ? (empRev / totalTarget) * 100 : 0;
        const enriched = entries.map(e => ({ ...e, memberName: memberNameMap[e.memberId] ?? e.memberId, revenue: e.revenueAmount ?? 0, expenses: sumExp(e) }));
        const memberName = memberId ? (memberNameMap[memberId] ?? memberId) : "All Members";
        reportData = { fyStart, memberId, memberName, entries: enriched, empRev, empExp, achievePct, sym };

      } else if (reportType === "festival") {
        const fromDate = p.from ?? p.period?.slice(8, 18) ?? `${new Date().getFullYear()}-10-01`;
        const toDate = p.to ?? p.period?.slice(19) ?? `${new Date().getFullYear()}-11-30`;
        const entries = await storage.getEodEntries(reportToken.businessId, { fromDate, toDate });
        const festRev = entries.reduce((s, e) => s + (e.revenueAmount ?? 0), 0);
        const festExp = entries.reduce((s, e) => s + sumExp(e), 0);
        const enriched = entries.map(e => ({ ...e, memberName: memberNameMap[e.memberId] ?? e.memberId, revenue: e.revenueAmount ?? 0, expenses: sumExp(e) }));
        reportData = { fromDate, toDate, entries: enriched, festRev, festExp, sym };

      } else {
        // Fallback: monthly team performance
        const period = p.period ?? new Date().toISOString().slice(0, 7);
        const teamPerf = await storage.getTeamPerformance(reportToken.businessId, period);
        reportData = { period, teamPerf, sym };
      }

      res.json({
        reportType,
        reportParams: p,
        businessName: profile.name,
        businessIndustry: profile.industryLabel ?? profile.industry,
        currencySymbol: sym,
        createdAt: reportToken.createdAt,
        data: reportData,
      });
    } catch (error) {
      console.error("Shared report data error:", error);
      res.status(500).json({ message: "Failed to load report" });
    }
  });

  // POST /api/ai/audit-questions — Generate industry-specific audit questions
  app.post('/api/ai/audit-questions', async (req: any, res) => {
    try {
      const { industry } = req.body;
      
      if (!industry) {
        return res.status(400).json({ message: "Industry is required" });
      }

      // Pre-defined simple questions for each industry (reliable & fast)
      const industryQuestions: Record<string, string[]> = {
        "real-estate": [
          "Do you track property deals digitally?",
          "Is your brokerage expense tracking automated?",
          "Do agents submit daily activity reports?",
          "Is client/lead data stored in one system?",
          "Can you see all listings performance instantly?",
          "Do you generate sales reports without Excel?",
          "Is commission tracking automated?",
          "Do you analyze deal data before decisions?",
        ],
        "retail": [
          "Do you track daily sales digitally?",
          "Is expense tracking automated?",
          "Do staff submit daily sales reports?",
          "Is customer data stored systematically?",
          "Can you check stock levels instantly?",
          "Do you generate reports without Excel?",
          "Is all store data in one dashboard?",
          "Do you use data for buying decisions?",
        ],
        "manufacturing": [
          "Do you track daily production digitally?",
          "Is raw material expense tracked automatically?",
          "Do workers submit daily output reports?",
          "Is supplier data stored systematically?",
          "Can you check inventory instantly?",
          "Do you generate production reports easily?",
          "Is all factory data in one place?",
          "Do you use data for production planning?",
        ],
        "agency": [
          "Do you track project revenue digitally?",
          "Is project expense tracking automated?",
          "Do team members submit daily updates?",
          "Is client data stored in one system?",
          "Can you see project status instantly?",
          "Do you generate client reports easily?",
          "Is all project data centralized?",
          "Do you analyze data before pitching?",
        ],
        "hospitality": [
          "Do you track daily revenue digitally?",
          "Is food/supply expense tracked automatically?",
          "Do staff submit daily shift reports?",
          "Is guest data stored systematically?",
          "Can you check table/room status instantly?",
          "Do you generate sales reports easily?",
          "Is all outlet data in one dashboard?",
          "Do you use data for menu decisions?",
        ],
        "healthcare": [
          "Do you track daily appointments digitally?",
          "Is clinic expense tracking automated?",
          "Do staff submit daily patient reports?",
          "Is patient data stored securely?",
          "Can you check appointment slots instantly?",
          "Do you generate billing reports easily?",
          "Is all clinic data in one system?",
          "Do you analyze patient data for decisions?",
        ],
        "education": [
          "Do you track fee collection digitally?",
          "Is institute expense tracking automated?",
          "Do teachers submit daily attendance?",
          "Is student data stored systematically?",
          "Can you check class schedules instantly?",
          "Do you generate progress reports easily?",
          "Is all institute data in one place?",
          "Do you use data for curriculum planning?",
        ],
        "logistics": [
          "Do you track deliveries digitally?",
          "Is fleet expense tracking automated?",
          "Do drivers submit daily trip reports?",
          "Is customer shipment data organized?",
          "Can you track vehicles in real-time?",
          "Do you generate delivery reports easily?",
          "Is all logistics data in one dashboard?",
          "Do you use data for route planning?",
        ],
        "services": [
          "Do you track service revenue digitally?",
          "Is project expense tracking automated?",
          "Do team members submit work logs?",
          "Is client data stored in one place?",
          "Can you see project progress instantly?",
          "Do you generate invoices easily?",
          "Is all client work data centralized?",
          "Do you analyze data before proposals?",
        ],
      };

      // Default questions for "other" or unknown industries
      const defaultQuestions = [
        "Do you track daily revenue digitally?",
        "Is your expense tracking automated?",
        "Do employees submit daily reports?",
        "Is customer data stored systematically?",
        "Can you check business metrics instantly?",
        "Do you generate reports without Excel?",
        "Is all business data in one place?",
        "Do you make data-driven decisions?",
      ];

      const industryLabels: Record<string, string> = {
        "real-estate": "Real Estate",
        "retail": "Retail & E-commerce",
        "manufacturing": "Manufacturing",
        "agency": "Agency / Consulting",
        "hospitality": "Hospitality & F&B",
        "healthcare": "Healthcare",
        "education": "Education",
        "logistics": "Logistics & Transport",
        "services": "Professional Services",
        "other": "General Business",
      };

      const industryLabel = industryLabels[industry] || industry;
      const questions = industryQuestions[industry] || defaultQuestions;
      
      console.log(`[Audit] Returning ${questions.length} questions for: ${industryLabel}`);
      
      res.json({ questions, industry: industryLabel });
    } catch (error) {
      console.error("Audit questions error:", error);
      res.status(500).json({ message: "Failed to generate audit questions" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Field Tracking Routes (Geo-tagged attendance, site visits, travel expenses)
  // ─────────────────────────────────────────────────────────────────────────

  // Dedicated endpoint for runner to get their business + member IDs
  app.get('/api/business/member-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;

      // Try finding business by userId first, then fall back to email-based member lookup
      let profile = await storage.getBusinessProfileForUser(userId);

      let member: any;

      if (profile) {
        member = await storage.getBusinessMemberByUser(profile.id, userId);
        if (!member && email) {
          member = await storage.getBusinessMemberByEmail(profile.id, email);
          // Patch userId in DB so future lookups work
          if (member) {
            await db.update(businessMembersTable).set({ userId }).where(eq(businessMembersTable.id, member.id));
          }
        }
      } else if (email) {
        // Owner lookup failed — find member row by email across all businesses
        const [row] = await db.select().from(businessMembersTable).where(eq(businessMembersTable.email, email.toLowerCase())).limit(1);
        if (row) {
          // Patch userId
          await db.update(businessMembersTable).set({ userId }).where(eq(businessMembersTable.id, row.id));
          member = { ...row, userId };
          profile = await storage.getBusinessProfileById(row.businessId);
        }
      }

      if (!profile) return res.status(404).json({ message: "No business profile found" });
      if (!member) return res.status(404).json({ message: "Member record not found" });

      const memberRole = profile.ownerId === userId ? 'owner' : (member.memberRole || 'employee');
      res.json({ businessId: profile.id, memberId: member.id, memberRole, businessName: profile.name });
    } catch (error) {
      console.error("Error fetching member profile:", error);
      res.status(500).json({ message: "Failed to fetch member profile" });
    }
  });

  app.use('/api/field-tracking', fieldTrackingRouter);

  // ─────────────────────────────────────────────────────────────────────────
  // Dynamic Field Tracking (Admin templates + Employee daily forms)
  // ─────────────────────────────────────────────────────────────────────────
  app.use('/api/tracking', trackingRouter);

  // ─────────────────────────────────────────────────────────────────────────
  // Tasks / Kanban Board Routes
  // ─────────────────────────────────────────────────────────────────────────
  app.use('/api/tasks', tasksRouter);

  // ── Enterprise AI Copilot Routes ──────────────────────────────────────────

  // 1. Knowledge Base Documents
  app.get('/api/copilot/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const docs = await db
        .select()
        .from(kbDocsTable)
        .where(eq(kbDocsTable.userId, userId))
        .orderBy(desc(kbDocsTable.createdAt));
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/copilot/documents', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const fileName = file.originalname;
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';

      if (!['pdf', 'docx', 'txt', 'csv', 'xlsx'].includes(fileExt)) {
        return res.status(400).json({ message: "Unsupported file type. Please upload PDF, DOCX, TXT, CSV, or Excel." });
      }

      // Parse document text and row/page count
      const { text, rowCount } = await parseDocument(file.buffer, fileExt);

      // Save document metadata in Postgres database
      const [doc] = await db
        .insert(kbDocsTable)
        .values({
          userId,
          fileName,
          fileSize: file.size,
          fileType: fileExt,
          processingStatus: "pending",
          indexingStatus: "pending",
          rowCount,
        })
        .returning();

      // Trigger RAG indexing in the Python backend in the background
      indexKnowledgeBaseDocument(doc.id, userId, text).catch(e => {
        console.error(`RAG indexing failed for doc ${doc.id}:`, e);
      });

      res.status(201).json(doc);
    } catch (error: any) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to process document", error: error.message });
    }
  });

  app.delete('/api/copilot/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await db
        .delete(kbDocsTable)
        .where(and(eq(kbDocsTable.id, req.params.id), eq(kbDocsTable.userId, userId)));

      // Call Python backend to remove chunks from ChromaDB
      const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
      await fetch(`${PYTHON_URL}/documents/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: req.params.id, userId }),
      }).catch(err => console.error("Error deleting from Chroma:", err));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // 2. Data Copilot Chat (combines SQL Agent + Knowledge Base RAG)
  app.post('/api/copilot/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { question, businessId } = req.body;

      if (!question || !question.trim()) {
        return res.status(400).json({ message: "Question is required" });
      }

      // Delegate RAG and SQL Agent query to Python FastAPI
      const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
      const pyResponse = await fetch(`${PYTHON_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, businessId, userId }),
      });

      if (!pyResponse.ok) {
        throw new Error(`Python Chat service failed with status ${pyResponse.status}`);
      }

      const results = await pyResponse.json();
      res.json(results);
    } catch (error: any) {
      console.error("Error in copilot chat:", error);
      res.status(500).json({ message: "Failed to process chat query", error: error.message });
    }
  });

  // 3. Multi-Agent Analysis
  app.post('/api/copilot/agents/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { businessId, period } = req.body;

      if (!businessId || !period) {
        return res.status(400).json({ message: "businessId and period are required" });
      }

      // Delegate multi-agent LangGraph analysis to Python FastAPI
      const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
      const pyResponse = await fetch(`${PYTHON_URL}/agents/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, userId, period }),
      });

      if (!pyResponse.ok) {
        throw new Error(`Python Agents workflow failed with status ${pyResponse.status}`);
      }

      const results = await pyResponse.json();
      res.json(results);
    } catch (error: any) {
      console.error("Error in multi-agent analysis:", error);
      res.status(500).json({ message: "Failed to run agent analysis", error: error.message });
    }
  });

  app.get('/api/copilot/agents/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reports = await db
        .select()
        .from(agentReportsTable)
        .where(eq(agentReportsTable.userId, userId))
        .orderBy(desc(agentReportsTable.createdAt));
      res.json(reports);
    } catch (error) {
      console.error("Error fetching agent reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // 4. Actions Center
  app.get('/api/copilot/actions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const actions = await db
        .select()
        .from(copilotActionsTable)
        .where(eq(copilotActionsTable.userId, userId))
        .orderBy(desc(copilotActionsTable.createdAt));
      res.json(actions);
    } catch (error) {
      console.error("Error fetching actions:", error);
      res.status(500).json({ message: "Failed to fetch actions" });
    }
  });

  app.post('/api/copilot/actions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const action = await createCopilotAction(userId, req.body);
      res.status(201).json(action);
    } catch (error: any) {
      console.error("Error creating action:", error);
      res.status(500).json({ message: "Failed to create action", error: error.message });
    }
  });

  app.post('/api/copilot/actions/:id/execute', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { businessId } = req.body;
      if (!businessId) {
        return res.status(400).json({ message: "businessId is required" });
      }

      // Delegate action execution to Python FastAPI
      const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
      const pyResponse = await fetch(`${PYTHON_URL}/actions/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: req.params.id, userId, businessId }),
      });

      if (!pyResponse.ok) {
        throw new Error(`Python Action execution failed with status ${pyResponse.status}`);
      }

      const results = await pyResponse.json();
      res.json(results);
    } catch (error: any) {
      console.error("Error executing action:", error);
      res.status(500).json({ message: "Failed to execute action", error: error.message });
    }
  });

  app.patch('/api/copilot/actions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [updated] = await db
        .update(copilotActionsTable)
        .set({
          status: req.body.status,
          updatedAt: new Date(),
        })
        .where(and(eq(copilotActionsTable.id, req.params.id), eq(copilotActionsTable.userId, userId)))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating action:", error);
      res.status(500).json({ message: "Failed to update action" });
    }
  });

  // OAuth Routes for external integrations (Shopify, Stripe, etc.)
  app.get('/api/oauth/:provider/authorize', optionalAuth, (req: any, res) => {
    const provider = req.params.provider;
    const shopUrl = req.query.shopUrl || '';
    const userId = req.user?.claims?.sub || 'admin-demo-id';

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/api/oauth/${provider}/callback`;

    const simulateUrl = `/oauth/simulate/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(userId)}&shopUrl=${encodeURIComponent(shopUrl)}`;
    res.redirect(simulateUrl);
  });

  app.get('/api/oauth/:provider/callback', async (req: any, res) => {
    const provider = req.params.provider;
    try {
      const { code, state, shopUrl } = req.query;
      let userId = (state as string) || 'admin-demo-id';

      // Verify that the user exists in the database to prevent foreign key constraint violations
      let userExists = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (userExists.length === 0) {
        console.warn(`[OAuth Callback] User ID ${userId} not found in database. Inserting user record.`);
        try {
          await db.insert(usersTable).values({
            id: userId,
            email: `${userId}@example.com`,
            firstName: "Demo",
            lastName: "User"
          });
        } catch (err) {
          console.error("[OAuth Callback] Failed to insert user, falling back to admin-demo-id", err);
          userId = 'admin-demo-id';
          const adminExists = await db.select().from(usersTable).where(eq(usersTable.id, 'admin-demo-id')).limit(1);
          if (adminExists.length === 0) {
            await db.insert(usersTable).values({
              id: 'admin-demo-id',
              email: 'admin@example.com',
              firstName: 'Admin',
              lastName: 'Demo'
            });
          }
        }
      }

      const sourceName = provider === 'shopify'
        ? `Shopify (${shopUrl || 'sandbox'})`
        : `${provider.charAt(0).toUpperCase() + provider.slice(1)} Connection`;

      let cleanCode = (code as string) || '';
      if (cleanCode.startsWith('real_token:')) {
        cleanCode = cleanCode.replace('real_token:', '');
      }

      const config = {
        apiUrl: shopUrl || '',
        apiKey: cleanCode,
        shopUrl: shopUrl || '',
        accessToken: cleanCode,
        host: shopUrl || '',
        database: cleanCode
      };

      const integration = await saveIntegrationSource(userId, sourceName, provider, config);

      res.send(`<html><body><script>
        try {
          localStorage.setItem('oauth_success_${provider}', JSON.stringify({
            integrationId: '${integration.id}'
          }));
        } catch (e) {
          console.error("localStorage failed:", e);
        }
        if (window.opener) {
          try {
            window.opener.postMessage({
              type: 'oauth_success',
              provider: '${provider}',
              integrationId: '${integration.id}'
            }, '*');
          } catch (err) {
            console.error("postMessage failed:", err);
          }
        }
        window.close();
      </script><p>Connected successfully! You can close this window now.</p></body></html>`);
    } catch (error: any) {
      console.error("OAuth callback error:", error);
      res.send(`<html><body><script>
        try {
          localStorage.setItem('oauth_error_${provider}', '${error.message || 'Authorization failed'}');
        } catch (e) {
          console.error("localStorage failed:", e);
        }
        if (window.opener) {
          try {
            window.opener.postMessage({
              type: 'oauth_error',
              error: '${error.message || 'Authorization failed'}'
            }, '*');
          } catch (err) {
            console.error("postMessage failed:", err);
          }
        }
        window.close();
      </script><p>Authorization failed. You can close this window.</p></body></html>`);
    }
  });

  app.post('/api/copilot/integrations/:id/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const integrationId = req.params.id;

      const [integration] = await db
        .select()
        .from(integrationsTable)
        .where(
          and(
            eq(integrationsTable.id, integrationId),
            or(eq(integrationsTable.userId, userId), eq(integrationsTable.userId, 'admin-demo-id'))
          )
        );

      if (!integration) {
        return res.status(404).json({ message: "Integration not found." });
      }

      await db
        .update(integrationsTable)
        .set({ syncStatus: "syncing", lastSyncedAt: new Date() })
        .where(eq(integrationsTable.id, integrationId));

      // Call Python FastAPI backend to execute real/sandbox sync using Enterprise Connector SDK
      const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
      let pyRes;
      try {
        pyRes = await fetch(`${PYTHON_URL}/integrations/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            integrationId,
            userId,
            incremental: false
          })
        });
      } catch (fetchErr: any) {
        throw new Error(`Python analytics backend is unreachable at ${PYTHON_URL}. Please ensure the Python server is running.`);
      }

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
          console.error("Error reading connector json:", readErr);
        }
      }

      // Check if dataset already exists for this integration, update if so, otherwise insert
      const [existingDataset] = await db
        .select()
        .from(datasetsTable)
        .where(and(eq(datasetsTable.spreadsheetId, datasetId), eq(datasetsTable.userId, userId)));

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

      await db
        .update(integrationsTable)
        .set({ syncStatus: "synced" })
        .where(eq(integrationsTable.id, integrationId));

      res.json({
        success: true,
        message: "Integration synchronized successfully.",
        datasetId: dataset.id
      });
    } catch (error: any) {
      console.error("Error syncing integration:", error);
      res.status(500).json({ message: "Failed to sync integration", error: error.message });
    }
  });

  // 5. Integrations Hub
  app.get('/api/copilot/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const list = await db
        .select()
        .from(integrationsTable)
        .where(or(eq(integrationsTable.userId, userId), eq(integrationsTable.userId, 'admin-demo-id')))
        .orderBy(desc(integrationsTable.createdAt));
      res.json(list);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  app.post('/api/copilot/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sourceName, sourceType, config } = req.body;
      const integration = await saveIntegrationSource(userId, sourceName, sourceType, config);
      res.status(201).json(integration);
    } catch (error: any) {
      console.error("Error saving integration:", error);
      res.status(500).json({ message: "Failed to save integration", error: error.message });
    }
  });

  app.patch('/api/copilot/integrations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const integrationId = req.params.id;
      const { syncSchedule } = req.body;

      const [updated] = await db
        .update(integrationsTable)
        .set({ syncSchedule })
        .where(
          and(
            eq(integrationsTable.id, integrationId),
            eq(integrationsTable.userId, userId)
          )
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Integration not found." });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating integration:", error);
      res.status(500).json({ message: "Failed to update integration", error: error.message });
    }
  });

  app.post('/api/copilot/integrations/:id/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Delegate integration testing to Python FastAPI
      const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
      const pyResponse = await fetch(`${PYTHON_URL}/integrations/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: req.params.id, userId }),
      });

      if (!pyResponse.ok) {
        throw new Error(`Python connection testing failed with status ${pyResponse.status}`);
      }

      const results = await pyResponse.json();
      res.json(results);
    } catch (error: any) {
      console.error("Error testing integration:", error);
      res.status(500).json({ message: "Failed to test integration", error: error.message });
    }
  });

  app.delete('/api/copilot/integrations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const integrationId = req.params.id;

      const [integration] = await db
        .select()
        .from(integrationsTable)
        .where(
          and(
            eq(integrationsTable.id, integrationId),
            or(eq(integrationsTable.userId, userId), eq(integrationsTable.userId, 'admin-demo-id'))
          )
        );

      if (!integration) {
        return res.status(404).json({ message: "Integration connection not found." });
      }

      await db
        .delete(integrationsTable)
        .where(eq(integrationsTable.id, integrationId));

      res.json({ message: "Integration disconnected successfully." });
    } catch (error: any) {
      console.error("[Delete Integration] Error:", error);
      res.status(500).json({ message: "Failed to disconnect integration", error: error.message });
    }
  });

  app.get('/api/copilot/integrations/:id/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const integrationId = req.params.id;

      const [integration] = await db
        .select()
        .from(integrationsTable)
        .where(
          and(
            eq(integrationsTable.id, integrationId),
            or(eq(integrationsTable.userId, userId), eq(integrationsTable.userId, 'admin-demo-id'))
          )
        );

      if (!integration) {
        return res.status(404).json({ message: "Integration connection not found." });
      }

      const datasetId = `conn_${integrationId}`;
      const dataDir = path.join(process.cwd(), "backend", "data");
      const jsonPath = path.join(dataDir, `${datasetId}.connector.json`);

      if (!fs.existsSync(jsonPath)) {
        return res.status(404).json({ message: "Preview data not found. Please sync your integration first." });
      }

      const fileContent = fs.readFileSync(jsonPath, "utf-8");
      const entitiesData = JSON.parse(fileContent);
      res.json(entitiesData);
    } catch (error: any) {
      console.error("[Get Integration Preview] Error:", error);
      res.status(500).json({ message: "Failed to load integration preview data", error: error.message });
    }
  });

  app.get('/api/datasets/:id/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (req.params.id === "ds_mock_123" || req.params.id.startsWith("ds_mock_")) {
        return res.json({
          success: true,
          source: "mock",
          data: {
            "customers": [
              { "id": "1001", "name": "Aarav Sharma", "email": "aarav@gmail.com", "phone": "9876543210", "created_at": "2026-06-07T09:47:29" },
              { "id": "1002", "name": "Diya Patel", "email": "diya@gmail.com", "phone": "9812345670", "created_at": "2026-06-09T09:47:29" }
            ],
            "orders": [
              { "id": "5001", "customer_id": "1001", "total_amount": 2499, "subtotal": 2299, "status": "paid", "created_at": "2026-06-27T09:47:29" },
              { "id": "5002", "customer_id": "1002", "total_amount": 1599, "subtotal": 1499, "status": "paid", "created_at": "2026-06-29T09:47:29" }
            ],
            "products": [
              { "id": "2001", "title": "Wireless Bluetooth Earbuds", "sku": "SKU-EARBUDS-01", "price": 2499, "inventory_quantity": 42 },
              { "id": "2002", "title": "Ergonomic Office Chair", "sku": "SKU-CHAIR-04", "price": 8999, "inventory_quantity": 8 }
            ]
          }
        });
      }

      const [dataset] = await db
        .select()
        .from(datasetsTable)
        .where(and(eq(datasetsTable.id, req.params.id), eq(datasetsTable.userId, userId)));

      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found." });
      }

      const datasetId = dataset.spreadsheetId || "";
      if (datasetId.startsWith("conn_")) {
        const dataDir = path.join(process.cwd(), "backend", "data");
        const jsonPath = path.join(dataDir, `${datasetId}.connector.json`);

        if (fs.existsSync(jsonPath)) {
          const fileContent = fs.readFileSync(jsonPath, "utf-8");
          const entitiesData = JSON.parse(fileContent);
          return res.json({ success: true, source: dataset.source, data: entitiesData });
        }
      }

      res.json({ success: true, source: dataset.source, data: { [dataset.sheetName]: [] } });
    } catch (error: any) {
      console.error("[Get Dataset Preview] Error:", error);
      res.status(500).json({ message: "Failed to load dataset preview", error: error.message });
    }
  });

  app.post('/api/datasets/:id/writeback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entity, recordData } = req.body;

      if (req.params.id === "ds_mock_123" || req.params.id.startsWith("ds_mock_")) {
        return res.json({
          success: true,
          message: "Mock dataset updated successfully (Sandbox Demo mode)."
        });
      }

      const [dataset] = await db
        .select()
        .from(datasetsTable)
        .where(and(eq(datasetsTable.id, req.params.id), eq(datasetsTable.userId, userId)));

      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found." });
      }

      const datasetId = dataset.spreadsheetId || "";
      if (datasetId.startsWith("conn_")) {
        const integrationId = datasetId.replace("conn_", "");
        const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
        
        const pyRes = await fetch(`${PYTHON_URL}/integrations/writeback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            integrationId,
            userId,
            entity,
            recordData
          })
        });

        if (!pyRes.ok) {
          const errText = await pyRes.text();
          throw new Error(`Python writeback failed: ${errText}`);
        }

        const pyData = await pyRes.json();
        return res.json({
          success: true,
          message: "Writeback completed successfully.",
          data: pyData
        });
      }

      return res.status(400).json({ message: "Dataset type does not support writeback." });
    } catch (error: any) {
      console.error("[Dataset Writeback] Error:", error);
      res.status(500).json({ message: "Failed to perform writeback", error: error.message });
    }
  });


  // Customers Intelligence API
  app.get('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      res.json({
        total: 148,
        active: 92,
        newThisMonth: 14,
        lostThisMonth: 3,
        topSharePercent: 38,
        growthTrends: [
          { period: "Jan", newCustomers: 8, activeCustomers: 72 },
          { period: "Feb", newCustomers: 11, activeCustomers: 78 },
          { period: "Mar", newCustomers: 9, activeCustomers: 81 },
          { period: "Apr", newCustomers: 12, activeCustomers: 88 },
          { period: "May", newCustomers: 14, activeCustomers: 92 }
        ],
        customersList: [
          { id: "c1", name: "Rohan Kapoor", email: "rohan@kapoorindustries.com", company: "Kapoor Industries", status: "active", lifetimeValue: 4500000, totalDeals: 18, growthRate: 15, lastActiveDate: "2026-06-24" },
          { id: "c2", name: "Ananya Sen", email: "ananya@senmediagroup.com", company: "Sen Media Group", status: "active", lifetimeValue: 3200000, totalDeals: 12, growthRate: 8, lastActiveDate: "2026-06-23" },
          { id: "c3", name: "Vikram Malhotra", email: "vikram@malhotralogistics.com", company: "Malhotra Logistics", status: "active", lifetimeValue: 2800000, totalDeals: 15, growthRate: -4, lastActiveDate: "2026-06-24" },
          { id: "c4", name: "Saira Banu", email: "saira@banufashions.com", company: "Banu Fashions", status: "new", lifetimeValue: 1200000, totalDeals: 4, growthRate: 35, lastActiveDate: "2026-06-22" },
          { id: "c5", name: "Devendra Patil", email: "devendra@patilconstructions.com", company: "Patil Constructions", status: "inactive", lifetimeValue: 850000, totalDeals: 3, growthRate: 0, lastActiveDate: "2026-05-15" }
        ]
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch customers", error: error.message });
    }
  });

  // Goals API
  const simulatedGoals: any[] = [
    { id: "g1", title: "Q2 Revenue Benchmark", type: "revenue", targetValue: 1500000, currentValue: 1250000, startDate: "2026-04-01", endDate: "2026-06-30", status: "active" },
    { id: "g2", title: "Leads Generation Target", type: "sales", targetValue: 300, currentValue: 210, startDate: "2026-05-01", endDate: "2026-06-30", status: "active" },
    { id: "g3", title: "Runner Geofence Operations", type: "team", targetValue: 50, currentValue: 48, startDate: "2026-06-01", endDate: "2026-06-30", status: "active" },
    { id: "g4", title: "Customer Retention Campaign", type: "operational", targetValue: 100, currentValue: 60, startDate: "2026-03-01", endDate: "2026-06-30", status: "active" }
  ];

  app.get('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const activeCount = simulatedGoals.filter((g: any) => g.status === "active").length;
      const completedCount = simulatedGoals.filter((g: any) => g.status === "completed").length;
      const atRiskCount = simulatedGoals.filter((g: any) => g.status === "at_risk" || (g.currentValue / g.targetValue < 0.5 && new Date(g.endDate).getTime() - Date.now() < 7 * 24 * 3600 * 1000)).length;

      res.json({
        achievementPercent: 78,
        activeCount,
        completedCount,
        atRiskCount,
        goals: simulatedGoals
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch goals", error: error.message });
    }
  });

  app.post('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const { title, type, targetValue, currentValue, startDate, endDate } = req.body;
      const newGoal = {
        id: `g_${Date.now()}`,
        title,
        type,
        targetValue: Number(targetValue),
        currentValue: Number(currentValue || 0),
        startDate,
        endDate,
        status: "active"
      };
      simulatedGoals.push(newGoal);
      res.status(201).json(newGoal);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create goal", error: error.message });
    }
  });

  // Alerts API
  app.get('/api/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Select alerts from db
      let dbAlerts = await db.select().from(alertsTable).where(eq(alertsTable.userId, userId));
      
      // Seed default alerts if empty
      if (dbAlerts.length === 0) {
        const defaultAlerts = [
          { userId, title: "Revenue Decline Detected", description: "Weekly rolling revenue has dropped 18% compared to last week's average.", severity: "high", category: "revenue", actionRoute: "/business/ai-strategy", recommendedAction: "Trigger AI Advisor Analysis", isResolved: false },
          { userId, title: "Missed Target Warning", description: "Leads generation target is trailing the expected trajectory by 32%.", severity: "medium", category: "revenue", actionRoute: "/business/goals", recommendedAction: "View Goals & Targets", isResolved: false },
          { userId, title: "Customer Inactivity Alert", description: "BKC Logistics client account has had no EOD logs or interaction for 14 days.", severity: "medium", category: "customers", actionRoute: "/business/customers", recommendedAction: "View Customer Intelligence", isResolved: false },
          { userId, title: "Overdue Task Warnings", description: "3 high priority items on the Kanban Task Board have passed their target due date.", severity: "low", category: "tasks", actionRoute: "/business/tasks", recommendedAction: "Review Task Board", isResolved: false }
        ];
        
        await db.insert(alertsTable).values(defaultAlerts);
        dbAlerts = await db.select().from(alertsTable).where(eq(alertsTable.userId, userId));
      }
      
      res.json(dbAlerts);
    } catch (error: any) {
      console.error("[Get Alerts] Error:", error);
      res.status(500).json({ message: "Failed to fetch alerts", error: error.message });
    }
  });

  app.post('/api/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, severity, category, actionRoute, recommendedAction } = req.body;
      const [alert] = await db
        .insert(alertsTable)
        .values({
          userId,
          title,
          description,
          severity: severity || 'medium',
          category: category || 'revenue',
          actionRoute: actionRoute || null,
          recommendedAction: recommendedAction || null,
          isResolved: false
        })
        .returning();
      res.json(alert);
    } catch (error: any) {
      console.error("[Create Alert] Error:", error);
      res.status(500).json({ message: "Failed to create alert", error: error.message });
    }
  });

  app.patch('/api/alerts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isResolved } = req.body;
      const [updated] = await db
        .update(alertsTable)
        .set({ isResolved })
        .where(eq(alertsTable.id, id))
        .returning();
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update alert", error: error.message });
    }
  });

  // AI Spreadsheet Assistant API Endpoints
  app.post('/api/copilot/ai/generate-formula', isAuthenticated, async (req: any, res) => {
    try {
      const { prompt, headers, selectedCell } = req.body;
      if (!prompt || !headers) {
        return res.status(400).json({ message: "Missing prompt or headers parameter." });
      }
      const result = await generateFormula(prompt, headers, selectedCell);
      res.json(result);
    } catch (error: any) {
      console.error("[AI Generate Formula] Error:", error);
      res.status(500).json({ message: "Failed to generate formula", error: error.message });
    }
  });

  app.post('/api/copilot/ai/generate-chart', isAuthenticated, async (req: any, res) => {
    try {
      const { prompt, headers } = req.body;
      if (!prompt || !headers) {
        return res.status(400).json({ message: "Missing prompt or headers parameter." });
      }
      const result = await generateChart(prompt, headers);
      res.json(result);
    } catch (error: any) {
      console.error("[AI Generate Chart] Error:", error);
      res.status(500).json({ message: "Failed to generate chart config", error: error.message });
    }
  });

  app.post('/api/copilot/ai/generate-pivot', isAuthenticated, async (req: any, res) => {
    try {
      const { prompt, headers } = req.body;
      if (!prompt || !headers) {
        return res.status(400).json({ message: "Missing prompt or headers parameter." });
      }
      const result = await generatePivot(prompt, headers);
      res.json(result);
    } catch (error: any) {
      console.error("[AI Generate Pivot] Error:", error);
      res.status(500).json({ message: "Failed to generate pivot configuration", error: error.message });
    }
  });

  app.post('/api/copilot/scraper', isAuthenticated, async (req: any, res) => {
    try {
      const { url } = req.body;
      const userId = req.user.claims.sub;
      if (!url) {
        return res.status(400).json({ message: "Missing url parameter." });
      }

      const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
      const pyRes = await fetch(`${PYTHON_URL}/integrations/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!pyRes.ok) {
        const errText = await pyRes.text();
        throw new Error(`Scraper failed: ${errText}`);
      }

      const pyData = await pyRes.json();
      if (!pyData.success) {
        throw new Error(pyData.error || "Scraping failed.");
      }

      const datasetId = `scraper_${Date.now()}`;
      const [inserted] = await db
        .insert(datasetsTable)
        .values({
          userId,
          spreadsheetId: datasetId,
          spreadsheetName: `Web Scraper: ${url.replace(/https?:\/\/(www\.)?/, '').slice(0, 30)}...`,
          sheetName: "scraped_data",
          sheetId: 0,
          headers: pyData.headers,
          data: pyData.rows,
          rowCount: pyData.rowCount,
          source: "scraper",
          lastSyncedAt: new Date()
        })
        .returning();

      res.json({
        success: true,
        message: "Web page scraped and imported successfully.",
        datasetId: inserted.id
      });
    } catch (error: any) {
      console.error("[Web Scraper] Error:", error);
      res.status(500).json({ message: "Failed to scrape web page", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
