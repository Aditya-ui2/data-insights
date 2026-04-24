import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role"),
  goals: text("goals"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: timestamp("google_token_expiry"),
  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Datasets imported from Google Sheets or Excel files
export const datasets = pgTable("datasets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  spreadsheetId: varchar("spreadsheet_id").notNull(),
  spreadsheetName: varchar("spreadsheet_name").notNull(),
  sheetName: varchar("sheet_name").notNull(),
  sheetId: integer("sheet_id").notNull(),
  headers: jsonb("headers").$type<string[]>().notNull(),
  data: jsonb("data").$type<Record<string, any>[]>().notNull(),
  rowCount: integer("row_count").notNull(),
  source: varchar("source").default("google"), // 'google' or 'excel'
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboards created from datasets
export const dashboards = pgTable("dashboards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  datasetId: varchar("dataset_id").notNull().references(() => datasets.id),
  title: varchar("title").notNull(),
  description: text("description"),
  config: jsonb("config").$type<DashboardConfig>().notNull(),
  shareToken: varchar("share_token").unique(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily usage tracking for AI actions
export const usageTracking = pgTable("usage_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  aiActionsUsed: integer("ai_actions_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // 'free', 'pro', 'enterprise'
  displayName: varchar("display_name").notNull(),
  price: integer("price").notNull(), // in cents, 0 for free
  aiActionsPerDay: integer("ai_actions_per_day").notNull(),
  maxFileSize: integer("max_file_size").notNull(), // in MB
  maxFiles: integer("max_files").notNull(),
  features: jsonb("features").$type<string[]>().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  status: varchar("status").notNull().default("active"), // 'active', 'cancelled', 'expired'
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Premium user whitelist (for manual activation)
export const premiumWhitelist = pgTable("premium_whitelist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  planName: varchar("plan_name").notNull().default("pro"),
  grantedBy: varchar("granted_by"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat conversations for persistent history
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  datasetId: varchar("dataset_id").references(() => datasets.id),
  title: varchar("title").notNull().default("New Chat"),
  messages: jsonb("messages").$type<ChatMessage[]>().notNull().default([]),
  isPinned: boolean("is_pinned").default(false),
  isArchived: boolean("is_archived").default(false),
  shareToken: varchar("share_token").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Business Suite Foundation ──────────────────────────────────────────────

// Business profiles (one per company/business)
export const businessProfiles = pgTable("business_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  industry: varchar("industry").notNull(), // key like 'marble_granite', 'software_agency'
  industryLabel: varchar("industry_label").notNull(), // display name
  description: text("description"),
  employeeCount: integer("employee_count").default(1),
  currencySymbol: varchar("currency_symbol").default("₹"),
  logoUrl: varchar("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business members (team roster)
export const businessMembers = pgTable("business_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  userId: varchar("user_id").references(() => users.id), // null until invite accepted
  email: varchar("email").notNull(),
  name: varchar("name"),
  memberRole: varchar("member_role").notNull().default("employee"), // 'owner','manager','employee'
  status: varchar("status").notNull().default("pending"), // 'active','pending','inactive'
  inviteToken: varchar("invite_token").unique(),
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business verticals (configurable divisions like Sales, Marketing, Projects)
export const businessVerticals = pgTable("business_verticals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  name: varchar("name").notNull(),
  description: text("description"),
  metricLabel: varchar("metric_label").default("Revenue"), // What's tracked: Revenue, Units, Projects
  metricUnit: varchar("metric_unit").default("₹"), // ₹, units, hrs, kg, sqft, etc.
  expenseCategories: jsonb("expense_categories").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Salary & incentive configurations (per member or per vertical)
export const salaryConfigs = pgTable("salary_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  memberId: varchar("member_id").references(() => businessMembers.id), // null = vertical default
  verticalId: varchar("vertical_id").references(() => businessVerticals.id),
  baseSalary: integer("base_salary").notNull().default(0), // in smallest currency unit
  incentivePercent: integer("incentive_percent").notNull().default(0), // basis points (500 = 5%)
  travelAllowanceCap: integer("travel_allowance_cap").default(0),
  incentiveTiers: jsonb("incentive_tiers").$type<IncentiveTier[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee performance targets
export const employeeTargets = pgTable("employee_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  memberId: varchar("member_id").notNull().references(() => businessMembers.id),
  verticalId: varchar("vertical_id").references(() => businessVerticals.id),
  period: varchar("period").notNull(), // 'monthly', 'quarterly'
  periodLabel: varchar("period_label").notNull(), // '2024-01', '2024-Q1'
  targetValue: integer("target_value").notNull(), // amount in smallest unit
  targetType: varchar("target_type").notNull().default("revenue"), // 'revenue','volume','deals'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document chunks for RAG (Retrieval-Augmented Generation)
export const documentChunks = pgTable("document_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  datasetId: varchar("dataset_id").notNull().references(() => datasets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  chunkIndex: integer("chunk_index").notNull(),
  chunkText: text("chunk_text").notNull(),
  embedding: jsonb("embedding").$type<number[]>().notNull().default([]),
  tokenCount: integer("token_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_document_chunks_dataset_id").on(table.datasetId),
  index("idx_document_chunks_user_id").on(table.userId),
]);

export const insertDocumentChunkSchema = createInsertSchema(documentChunks).omit({ id: true, createdAt: true });
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;

// EOD (End-of-Day) entries — employees log their daily performance
export const eodEntries = pgTable("eod_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  memberId: varchar("member_id").notNull().references(() => businessMembers.id),
  verticalId: varchar("vertical_id").references(() => businessVerticals.id),
  entryDate: date("entry_date").notNull(), // YYYY-MM-DD
  // Core metrics
  revenueAmount: integer("revenue_amount").default(0), // in smallest currency unit
  unitsSold: integer("units_sold").default(0),
  dealsClosed: integer("deals_closed").default(0),
  // Expense items (JSONB array)
  expenseItems: jsonb("expense_items").$type<ExpenseItem[]>().default([]),
  // Notes / summary
  notes: text("notes"),
  // Employer feedback
  managerNote: text("manager_note"),
  // Status
  status: varchar("status").notNull().default("submitted"), // 'submitted', 'reviewed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  memberDateUnique: uniqueIndex("eod_entries_member_date_unique").on(table.memberId, table.entryDate),
}));

// ── Types for dashboard configuration ─────────────────────────────────────

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'kpi' | 'table' | 'area' | 'scatter' | 'donut' | 'horizontal_bar' | 'stacked_bar' | 'gauge' | 'funnel' | 'treemap' | 'heatmap' | 'waterfall' | 'combo';
  title: string;
  dataKey: string;
  labelKey?: string;
  valueKeys?: string[];
  color?: string;
  insights?: string;
  // Advanced options
  aggregation?: 'sum' | 'average' | 'count' | 'min' | 'max' | 'median';
  sortOrder?: 'asc' | 'desc' | 'none';
  limit?: number;
  showTrendline?: boolean;
  showDataLabels?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  fillOpacity?: number;
  secondaryDataKey?: string; // For combo charts
  secondaryChartType?: 'bar' | 'line' | 'area';
  colorScheme?: 'default' | 'rainbow' | 'blue' | 'green' | 'warm' | 'cool' | 'monochrome';
  percentageMode?: boolean;
  stacked?: boolean;
}

export interface DashboardConfig {
  charts: ChartConfig[];
  summary?: string;
  generatedAt: string;
}

export interface IncentiveTier {
  fromPercent: number; // achievement % threshold
  toPercent: number;   // achievement % ceiling (999 = no cap)
  incentivePercent: number; // basis points
}

export interface ExpenseItem {
  category: string;
  amount: number; // in smallest currency unit
  description?: string;
}

// Business report share tokens (for read-only report sharing)
export const businessReportTokens = pgTable("business_report_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique(),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  reportType: varchar("report_type").notNull(), // monthly, ytd, daily, weekly, employee, festival
  reportParams: jsonb("report_params").$type<Record<string, string>>().default({}), // period, weekStart, memberId, etc.
  createdBy: varchar("created_by").notNull(), // userId who created the share
  expiresAt: timestamp("expires_at"), // null = no expiry
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBusinessReportTokenSchema = createInsertSchema(businessReportTokens).omit({ id: true, createdAt: true });
export type BusinessReportToken = typeof businessReportTokens.$inferSelect;

// ── GEO-TAGGED FIELD TRACKING (Runners, Site Visits, Attendance) ──────────────

// Client sites - locations where runners visit for work
export const clientSites = pgTable("client_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  name: varchar("name").notNull(), // e.g., "ABC Corporation Delhi Office"
  address: text("address").notNull(),
  latitude: varchar("latitude").notNull(), // stored as string for precision
  longitude: varchar("longitude").notNull(),
  geofenceRadiusMeters: integer("geofence_radius_meters").default(100), // default 100m
  contactPerson: varchar("contact_person"),
  contactPhone: varchar("contact_phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_client_sites_business_id").on(table.businessId),
]);

// Geo-tagged visit logs - tracks punch in/out and site visits
export const visitLogs = pgTable("visit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  memberId: varchar("member_id").notNull().references(() => businessMembers.id),
  clientSiteId: varchar("client_site_id").references(() => clientSites.id), // null for punch in/out
  actionType: varchar("action_type").notNull(), // 'punch_in', 'punch_out', 'check_in', 'check_out'
  latitude: varchar("latitude").notNull(),
  longitude: varchar("longitude").notNull(),
  gpsAccuracy: integer("gps_accuracy").default(0), // in meters - for fraud detection
  timestamp: timestamp("timestamp").defaultNow().notNull(), // server-side timestamp
  clientTimestamp: timestamp("client_timestamp"), // for logging client-side time (for debugging)
  distanceFromSite: integer("distance_from_site"), // in meters (for check-ins)
  status: varchar("status").default("success"), // 'success', 'blocked' (if geofence failed)
  errorMessage: text("error_message"), // reason for blockage if status = 'blocked'
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // additional info
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_visit_logs_business_id").on(table.businessId),
  index("idx_visit_logs_member_id").on(table.memberId),
  index("idx_visit_logs_timestamp").on(table.timestamp),
  index("idx_visit_logs_action_type").on(table.actionType),
]);

// Travel expense auto-calculation
export const travelExpenses = pgTable("travel_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  memberId: varchar("member_id").notNull().references(() => businessMembers.id),
  expenseDate: date("expense_date").notNull(), // YYYY-MM-DD
  totalDistanceKm: varchar("total_distance_km").notNull(), // stored as string for precision
  ratePerKm: integer("rate_per_km").notNull(), // in smallest currency unit
  totalExpenseAmount: integer("total_expense_amount").notNull(), // in smallest currency unit
  visitCount: integer("visit_count").default(0), // number of site visits
  calculatedAt: timestamp("calculated_at").defaultNow(),
  status: varchar("status").default("auto_calculated"), // 'auto_calculated', 'reviewed', 'approved', 'rejected'
  managerNote: text("manager_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_travel_expenses_business_id").on(table.businessId),
  index("idx_travel_expenses_member_id").on(table.memberId),
  index("idx_travel_expenses_expense_date").on(table.expenseDate),
]);

// ── Business Tasks (Kanban) ─────────────────────────────────────────────────
export const businessTasks = pgTable("business_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  title: varchar("title").notNull(),
  description: text("description"),
  assignedToMemberId: varchar("assigned_to_member_id").references(() => businessMembers.id),
  createdByMemberId: varchar("created_by_member_id"),
  status: varchar("status").notNull().default("todo"),
  priority: varchar("priority").notNull().default("medium"),
  dueDate: date("due_date"),
  tags: jsonb("tags").$type<string[]>().default([]),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_business_tasks_business_id").on(table.businessId),
  index("idx_business_tasks_assigned_to").on(table.assignedToMemberId),
  index("idx_business_tasks_status").on(table.status),
]);

// ── Insert schemas ─────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertDatasetSchema = createInsertSchema(datasets).omit({ id: true, createdAt: true, updatedAt: true, lastSyncedAt: true });
export const insertDashboardSchema = createInsertSchema(dashboards).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUsageTrackingSchema = createInsertSchema(usageTracking).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPremiumWhitelistSchema = createInsertSchema(premiumWhitelist).omit({ id: true, createdAt: true });

export const insertBusinessProfileSchema = createInsertSchema(businessProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBusinessMemberSchema = createInsertSchema(businessMembers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBusinessVerticalSchema = createInsertSchema(businessVerticals).omit({ id: true, createdAt: true });
export const insertSalaryConfigSchema = createInsertSchema(salaryConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmployeeTargetSchema = createInsertSchema(employeeTargets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEodEntrySchema = createInsertSchema(eodEntries).omit({ id: true, createdAt: true, updatedAt: true });

export const insertClientSiteSchema = createInsertSchema(clientSites).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVisitLogSchema = createInsertSchema(visitLogs).omit({ id: true, createdAt: true });
export const insertTravelExpenseSchema = createInsertSchema(travelExpenses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(businessTasks).omit({ id: true, createdAt: true, updatedAt: true });

// ── Types ─────────────────────────────────────────────────────────────────

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Dataset = typeof datasets.$inferSelect;
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;
export type Dashboard = typeof dashboards.$inferSelect;
export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;
export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type PremiumWhitelist = typeof premiumWhitelist.$inferSelect;

export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = z.infer<typeof insertBusinessProfileSchema>;
export type BusinessMember = typeof businessMembers.$inferSelect;
export type InsertBusinessMember = z.infer<typeof insertBusinessMemberSchema>;
export type BusinessVertical = typeof businessVerticals.$inferSelect;
export type InsertBusinessVertical = z.infer<typeof insertBusinessVerticalSchema>;
export type SalaryConfig = typeof salaryConfigs.$inferSelect;
export type InsertSalaryConfig = z.infer<typeof insertSalaryConfigSchema>;
export type EmployeeTarget = typeof employeeTargets.$inferSelect;
export type InsertEmployeeTarget = z.infer<typeof insertEmployeeTargetSchema>;
export type EodEntry = typeof eodEntries.$inferSelect;
export type InsertEodEntry = z.infer<typeof insertEodEntrySchema>;

export type ClientSite = typeof clientSites.$inferSelect;
export type InsertClientSite = z.infer<typeof insertClientSiteSchema>;
export type VisitLog = typeof visitLogs.$inferSelect;
export type InsertVisitLog = z.infer<typeof insertVisitLogSchema>;
export type TravelExpense = typeof travelExpenses.$inferSelect;
export type InsertTravelExpense = z.infer<typeof insertTravelExpenseSchema>;

export type BusinessTask = typeof businessTasks.$inferSelect;
export type InsertBusinessTask = z.infer<typeof insertTaskSchema>;

// ── Premium feature flags ──────────────────────────────────────────────────

export interface UserPlanFeatures {
  planName: string;
  displayName: string;
  aiActionsPerDay: number;
  maxFileSize: number; // MB
  maxFiles: number;
  features: string[];
  isPremium: boolean;
}

// ── API response types ─────────────────────────────────────────────────────

export interface GoogleSheet {
  id: string;
  name: string;
  sheets: { sheetId: number; title: string }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context_source?: 'live_business_data' | 'rag_document' | 'general';
  aiProvider?: string;
  rag_used?: boolean;
}

export interface BusinessMemberWithUser extends BusinessMember {
  user?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'profileImageUrl'>;
}

export interface PerformanceSummary {
  memberId: string;
  periodLabel: string;
  totalRevenue: number;
  totalUnits: number;
  totalDeals: number;
  totalExpenses: number;
  targetRevenue: number;
  targetUnits: number;
  targetDeals: number;
  achievementPercent: number; // based on primary target type
  projectedIncentive: number;
  entryCount: number;
  verticalBreakdown: { verticalId: string; verticalName: string; revenue: number; units: number; deals: number }[];
}

export interface TeamPerformanceSummary {
  memberId: string;
  memberName: string;
  memberEmail: string;
  totalRevenue: number;
  totalUnits: number;
  totalDeals: number;
  totalExpenses: number;
  travelExpenses: number;
  baseSalary: number;
  targetRevenue: number;
  achievementPercent: number;
  projectedIncentive: number;
  entryCount: number;
}

// ── DYNAMIC FIELD TRACKING SYSTEM ─────────────────────────────────────────
// Admin-defined templates for employee daily data entry

// Field configuration interface for dynamic forms
export interface TrackingFieldConfig {
  name: string;          // Field label (e.g., "Deals Closed", "Travel Expense")
  key: string;           // Unique field key (e.g., "deals_closed", "travel_expense")
  type: "number" | "text" | "textarea" | "currency" | "select" | "date" | "time" | "checkbox" | "rating";
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: string[];    // For select type
  min?: number;          // For number/currency/rating
  max?: number;
  defaultValue?: string | number | boolean;
  unit?: string;         // ₹, km, hrs, etc.
}

// Tracking templates - Admin defines fields employees must fill daily
export const trackingTemplates = pgTable("tracking_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  name: varchar("name").notNull(), // e.g., "Daily Sales Report", "Field Visit Log"
  description: text("description"),
  fieldsConfig: jsonb("fields_config").$type<TrackingFieldConfig[]>().notNull().default([]),
  isActive: boolean("is_active").default(true),
  appliesTo: varchar("applies_to").default("all"), // 'all', 'vertical', 'member'
  targetVerticalId: varchar("target_vertical_id").references(() => businessVerticals.id),
  targetMemberIds: jsonb("target_member_ids").$type<string[]>().default([]), // specific members
  frequency: varchar("frequency").default("daily"), // 'daily', 'weekly', 'monthly'
  sortOrder: integer("sort_order").default(0),
  createdBy: varchar("created_by").references(() => businessMembers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tracking_templates_business_id").on(table.businessId),
]);

// Daily logs - Employee submissions based on template fields
export const trackingLogs = pgTable("tracking_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessProfiles.id),
  templateId: varchar("template_id").notNull().references(() => trackingTemplates.id),
  memberId: varchar("member_id").notNull().references(() => businessMembers.id),
  logDate: date("log_date").notNull(), // YYYY-MM-DD
  submittedData: jsonb("submitted_data").$type<Record<string, any>>().notNull().default({}),
  status: varchar("status").default("submitted"), // 'draft', 'submitted', 'reviewed', 'approved', 'rejected'
  notes: text("notes"),
  managerNote: text("manager_note"),
  reviewedBy: varchar("reviewed_by").references(() => businessMembers.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tracking_logs_business_id").on(table.businessId),
  index("idx_tracking_logs_template_id").on(table.templateId),
  index("idx_tracking_logs_member_id").on(table.memberId),
  index("idx_tracking_logs_date").on(table.logDate),
  uniqueIndex("tracking_logs_member_template_date_unique").on(table.memberId, table.templateId, table.logDate),
]);

// Insert schemas for tracking
export const insertTrackingTemplateSchema = createInsertSchema(trackingTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrackingLogSchema = createInsertSchema(trackingLogs).omit({ id: true, createdAt: true, updatedAt: true });

// Types for tracking
export type TrackingTemplate = typeof trackingTemplates.$inferSelect;
export type InsertTrackingTemplate = z.infer<typeof insertTrackingTemplateSchema>;
export type TrackingLog = typeof trackingLogs.$inferSelect;
export type InsertTrackingLog = z.infer<typeof insertTrackingLogSchema>;
