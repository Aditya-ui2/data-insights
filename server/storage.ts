// Database Storage - javascript_database & javascript_log_in_with_replit blueprints
import {
  users,
  datasets,
  dashboards,
  usageTracking,
  conversations,
  premiumWhitelist,
  businessProfiles,
  businessMembers,
  businessVerticals,
  salaryConfigs,
  employeeTargets,
  eodEntries,
  businessReportTokens,
  type User,
  type UpsertUser,
  type Dataset,
  type InsertDataset,
  type Dashboard,
  type InsertDashboard,
  type UsageTracking,
  type InsertUsageTracking,
  type Conversation,
  type InsertConversation,
  type ChatMessage,
  type PremiumWhitelist,
  type BusinessProfile,
  type InsertBusinessProfile,
  type BusinessMember,
  type InsertBusinessMember,
  type BusinessVertical,
  type InsertBusinessVertical,
  type SalaryConfig,
  type InsertSalaryConfig,
  type EmployeeTarget,
  type InsertEmployeeTarget,
  type EodEntry,
  type InsertEodEntry,
  type BusinessMemberWithUser,
  type PerformanceSummary,
  type TeamPerformanceSummary,
  type IncentiveTier,
  type ExpenseItem,
  type BusinessReportToken,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, or, gte, lte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  
  getDataset(id: string): Promise<Dataset | undefined>;
  getDatasetsByUser(userId: string): Promise<Dataset[]>;
  createDataset(dataset: InsertDataset): Promise<Dataset>;
  updateDataset(id: string, data: Partial<Dataset>): Promise<Dataset | undefined>;
  deleteDataset(id: string): Promise<void>;
  countExcelDatasetsByUser(userId: string): Promise<number>;
  
  getDashboard(id: string): Promise<Dashboard | undefined>;
  getDashboardByShareToken(shareToken: string): Promise<Dashboard | undefined>;
  getDashboardsByUser(userId: string): Promise<Dashboard[]>;
  getDashboardsByDataset(datasetId: string): Promise<Dashboard[]>;
  createDashboard(dashboard: InsertDashboard): Promise<Dashboard>;
  updateDashboard(id: string, data: Partial<InsertDashboard>): Promise<Dashboard | undefined>;
  deleteDashboard(id: string): Promise<void>;
  
  getUsageForToday(userId: string): Promise<UsageTracking | undefined>;
  incrementUsage(userId: string): Promise<UsageTracking>;
  
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<void>;
  
  getPremiumWhitelist(email: string): Promise<PremiumWhitelist | undefined>;
  addToPremiumWhitelist(email: string, planName: string, grantedBy?: string, reason?: string): Promise<PremiumWhitelist>;

  // Business Suite
  getBusinessProfileByOwner(ownerId: string): Promise<BusinessProfile | undefined>;
  getBusinessProfileById(id: string): Promise<BusinessProfile | undefined>;
  getBusinessProfileForUser(userId: string): Promise<BusinessProfile | undefined>;
  createBusinessProfile(profile: InsertBusinessProfile): Promise<BusinessProfile>;
  updateBusinessProfile(id: string, data: Partial<InsertBusinessProfile>): Promise<BusinessProfile | undefined>;

  getBusinessMembers(businessId: string): Promise<BusinessMemberWithUser[]>;
  getBusinessMemberByUser(businessId: string, userId: string): Promise<BusinessMember | undefined>;
  getBusinessMemberByEmail(businessId: string, email: string): Promise<BusinessMember | undefined>;
  getBusinessMemberByInviteToken(token: string): Promise<BusinessMember | undefined>;
  createBusinessMember(member: InsertBusinessMember): Promise<BusinessMember>;
  updateBusinessMember(id: string, data: Partial<InsertBusinessMember>): Promise<BusinessMember | undefined>;
  deleteBusinessMember(id: string): Promise<void>;
  clearMemberInviteToken(id: string): Promise<void>;

  getBusinessVerticals(businessId: string): Promise<BusinessVertical[]>;
  getBusinessVertical(id: string): Promise<BusinessVertical | undefined>;
  createBusinessVertical(vertical: InsertBusinessVertical): Promise<BusinessVertical>;
  updateBusinessVertical(id: string, data: Partial<InsertBusinessVertical>): Promise<BusinessVertical | undefined>;
  deleteBusinessVertical(id: string): Promise<void>;

  getSalaryConfig(businessId: string, memberId?: string, verticalId?: string): Promise<SalaryConfig | undefined>;
  getSalaryConfigsByBusiness(businessId: string): Promise<SalaryConfig[]>;
  upsertSalaryConfig(config: InsertSalaryConfig): Promise<SalaryConfig>;

  getEmployeeTargets(businessId: string, memberId?: string, periodLabel?: string): Promise<EmployeeTarget[]>;
  getEmployeeTarget(id: string): Promise<EmployeeTarget | undefined>;
  createEmployeeTarget(target: InsertEmployeeTarget): Promise<EmployeeTarget>;
  updateEmployeeTarget(id: string, data: Partial<InsertEmployeeTarget>): Promise<EmployeeTarget | undefined>;
  deleteEmployeeTarget(id: string): Promise<void>;

  // EOD Entries
  getEodEntries(businessId: string, filters?: { memberId?: string; verticalId?: string; fromDate?: string; toDate?: string }): Promise<EodEntry[]>;
  getEodEntry(id: string): Promise<EodEntry | undefined>;
  getEodEntryByMemberAndDate(memberId: string, entryDate: string): Promise<EodEntry | undefined>;
  createEodEntry(entry: InsertEodEntry): Promise<EodEntry>;
  updateEodEntry(id: string, data: Partial<InsertEodEntry>): Promise<EodEntry | undefined>;
  deleteEodEntry(id: string): Promise<void>;
  getPerformanceSummary(businessId: string, memberId: string, periodLabel: string): Promise<PerformanceSummary>;
  getTeamPerformance(businessId: string, periodLabel: string): Promise<TeamPerformanceSummary[]>;
  getPerformanceTrends(businessId: string, months: number): Promise<{ period: string; totalRevenue: number; totalUnits: number; totalDeals: number; entryCount: number }[]>;

  // Business Report Tokens (for read-only report sharing)
  createBusinessReportToken(data: { token: string; businessId: string; reportType: string; reportParams: Record<string, string>; createdBy: string }): Promise<BusinessReportToken>;
  getBusinessReportToken(token: string): Promise<BusinessReportToken | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!userData.id) {
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();
      return newUser;
    }

    // First check if user exists
    const existingUser = await this.getUser(userData.id);
    
    if (existingUser) {
      // Merge existing user with new data, preserving fields not provided in userData
      const [updatedUser] = await db
        .update(users)
        .set({ 
          // Only update fields that are actually provided in userData
          ...(userData.email !== undefined ? { email: userData.email } : {}),
          ...(userData.firstName !== undefined ? { firstName: userData.firstName } : {}),
          ...(userData.lastName !== undefined ? { lastName: userData.lastName } : {}),
          ...(userData.profileImageUrl !== undefined ? { profileImageUrl: userData.profileImageUrl } : {}),
          ...(userData.role !== undefined ? { role: userData.role } : {}),
          ...(userData.goals !== undefined ? { goals: userData.goals } : {}),
          ...(userData.googleAccessToken !== undefined ? { googleAccessToken: userData.googleAccessToken } : {}),
          ...(userData.googleRefreshToken !== undefined ? { googleRefreshToken: userData.googleRefreshToken } : {}),
          ...(userData.googleTokenExpiry !== undefined ? { googleTokenExpiry: userData.googleTokenExpiry } : {}),
          ...(userData.onboardingComplete !== undefined ? { onboardingComplete: userData.onboardingComplete } : {}),
          updatedAt: new Date()
        })
        .where(eq(users.id, userData.id))
        .returning();
      return updatedUser;
    } else {
      // Insert new user with defaults
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();
      return newUser;
    }
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getDataset(id: string): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));
    return dataset;
  }

  async getDatasetsByUser(userId: string): Promise<Dataset[]> {
    return db.select().from(datasets).where(eq(datasets.userId, userId));
  }

  async createDataset(dataset: InsertDataset): Promise<Dataset> {
    const [created] = await db.insert(datasets).values(dataset as typeof datasets.$inferInsert).returning();
    return created;
  }

  async updateDataset(id: string, data: Partial<Dataset>): Promise<Dataset | undefined> {
    const { id: _id, createdAt: _createdAt, ...rest } = data as Dataset;
    const updateData = { ...rest, updatedAt: new Date() };
    const [updated] = await db
      .update(datasets)
      .set(updateData)
      .where(eq(datasets.id, id))
      .returning();
    return updated;
  }

  async deleteDataset(id: string): Promise<void> {
    await db.delete(datasets).where(eq(datasets.id, id));
  }

  async countExcelDatasetsByUser(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(datasets)
      .where(and(eq(datasets.userId, userId), eq(datasets.source, 'excel')));
    return Number(result[0]?.count ?? 0);
  }

  async getDashboard(id: string): Promise<Dashboard | undefined> {
    const [dashboard] = await db.select().from(dashboards).where(eq(dashboards.id, id));
    return dashboard;
  }

  async getDashboardByShareToken(shareToken: string): Promise<Dashboard | undefined> {
    const [dashboard] = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.shareToken, shareToken), eq(dashboards.isPublic, true)));
    return dashboard;
  }

  async getDashboardsByUser(userId: string): Promise<Dashboard[]> {
    return db.select().from(dashboards).where(eq(dashboards.userId, userId));
  }

  async getDashboardsByDataset(datasetId: string): Promise<Dashboard[]> {
    return db.select().from(dashboards).where(eq(dashboards.datasetId, datasetId));
  }

  async createDashboard(dashboard: InsertDashboard): Promise<Dashboard> {
    const [created] = await db.insert(dashboards).values(dashboard as typeof dashboards.$inferInsert).returning();
    return created;
  }

  async updateDashboard(id: string, data: Partial<InsertDashboard>): Promise<Dashboard | undefined> {
    const [updated] = await db
      .update(dashboards)
      .set({ ...data, updatedAt: new Date() } as Partial<typeof dashboards.$inferInsert>)
      .where(eq(dashboards.id, id))
      .returning();
    return updated;
  }

  async deleteDashboard(id: string): Promise<void> {
    await db.delete(dashboards).where(eq(dashboards.id, id));
  }

  async getUsageForToday(userId: string): Promise<UsageTracking | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [usage] = await db
      .select()
      .from(usageTracking)
      .where(and(eq(usageTracking.userId, userId), eq(usageTracking.date, today)));
    return usage;
  }

  async incrementUsage(userId: string): Promise<UsageTracking> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.getUsageForToday(userId);
    
    if (existing) {
      const [updated] = await db
        .update(usageTracking)
        .set({ aiActionsUsed: (existing.aiActionsUsed || 0) + 1 })
        .where(eq(usageTracking.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(usageTracking)
        .values({ userId, date: today, aiActionsUsed: 1 })
        .returning();
      return created;
    }
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation as typeof conversations.$inferInsert).returning();
    return created;
  }

  async updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() } as Partial<typeof conversations.$inferInsert>)
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }
  
  async getPremiumWhitelist(email: string): Promise<PremiumWhitelist | undefined> {
    const [entry] = await db.select().from(premiumWhitelist).where(eq(premiumWhitelist.email, email.toLowerCase()));
    return entry;
  }
  
  async addToPremiumWhitelist(email: string, planName: string, grantedBy?: string, reason?: string): Promise<PremiumWhitelist> {
    const [created] = await db.insert(premiumWhitelist).values({
      email: email.toLowerCase(),
      planName,
      grantedBy,
      reason
    }).returning();
    return created;
  }

  // ── Business Suite Methods ─────────────────────────────────────────────

  async getBusinessProfileByOwner(ownerId: string): Promise<BusinessProfile | undefined> {
    const [profile] = await db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.ownerId, ownerId));
    return profile;
  }

  async getBusinessProfileById(id: string): Promise<BusinessProfile | undefined> {
    const [profile] = await db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.id, id));
    return profile;
  }

  async getBusinessProfileForUser(userId: string): Promise<BusinessProfile | undefined> {
    // Check if user is the owner
    const ownedProfile = await this.getBusinessProfileByOwner(userId);
    if (ownedProfile) return ownedProfile;

    // Check if user is a member
    const [member] = await db
      .select()
      .from(businessMembers)
      .where(and(eq(businessMembers.userId, userId), eq(businessMembers.status, 'active')));
    
    if (member) {
      return this.getBusinessProfileById(member.businessId);
    }
    return undefined;
  }

  async createBusinessProfile(profile: InsertBusinessProfile): Promise<BusinessProfile> {
    const [created] = await db.insert(businessProfiles).values(profile).returning();
    return created;
  }

  async updateBusinessProfile(id: string, data: Partial<InsertBusinessProfile>): Promise<BusinessProfile | undefined> {
    const [updated] = await db
      .update(businessProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(businessProfiles.id, id))
      .returning();
    return updated;
  }

  async getBusinessMembers(businessId: string): Promise<BusinessMemberWithUser[]> {
    const members = await db
      .select()
      .from(businessMembers)
      .where(eq(businessMembers.businessId, businessId))
      .orderBy(desc(businessMembers.createdAt));

    // Enrich with user data
    const enriched: BusinessMemberWithUser[] = await Promise.all(
      members.map(async (m) => {
        if (m.userId) {
          const user = await this.getUser(m.userId);
          return {
            ...m,
            user: user ? {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl,
            } : undefined,
          };
        }
        return m;
      })
    );
    return enriched;
  }

  async getBusinessMemberByUser(businessId: string, userId: string): Promise<BusinessMember | undefined> {
    const [member] = await db
      .select()
      .from(businessMembers)
      .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId)));
    return member;
  }

  async getBusinessMemberByEmail(businessId: string, email: string): Promise<BusinessMember | undefined> {
    const [member] = await db
      .select()
      .from(businessMembers)
      .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.email, email.toLowerCase())));
    return member;
  }

  async getBusinessMemberByInviteToken(token: string): Promise<BusinessMember | undefined> {
    const [member] = await db
      .select()
      .from(businessMembers)
      .where(eq(businessMembers.inviteToken, token));
    return member;
  }

  async createBusinessMember(member: InsertBusinessMember): Promise<BusinessMember> {
    const [created] = await db.insert(businessMembers).values(member).returning();
    return created;
  }

  async updateBusinessMember(id: string, data: Partial<InsertBusinessMember>): Promise<BusinessMember | undefined> {
    const [updated] = await db
      .update(businessMembers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(businessMembers.id, id))
      .returning();
    return updated;
  }

  async deleteBusinessMember(id: string): Promise<void> {
    await db.delete(businessMembers).where(eq(businessMembers.id, id));
  }

  async clearMemberInviteToken(id: string): Promise<void> {
    await db.execute(sql`UPDATE business_members SET invite_token = NULL WHERE id = ${id}`);
  }

  async getBusinessVerticals(businessId: string): Promise<BusinessVertical[]> {
    return db
      .select()
      .from(businessVerticals)
      .where(and(eq(businessVerticals.businessId, businessId), eq(businessVerticals.isActive, true)))
      .orderBy(businessVerticals.sortOrder);
  }

  async getBusinessVertical(id: string): Promise<BusinessVertical | undefined> {
    const [vertical] = await db
      .select()
      .from(businessVerticals)
      .where(eq(businessVerticals.id, id));
    return vertical;
  }

  async createBusinessVertical(vertical: InsertBusinessVertical): Promise<BusinessVertical> {
    const [created] = await db.insert(businessVerticals).values(vertical as typeof businessVerticals.$inferInsert).returning();
    return created;
  }

  async updateBusinessVertical(id: string, data: Partial<InsertBusinessVertical>): Promise<BusinessVertical | undefined> {
    const [updated] = await db
      .update(businessVerticals)
      .set(data as Partial<typeof businessVerticals.$inferInsert>)
      .where(eq(businessVerticals.id, id))
      .returning();
    return updated;
  }

  async deleteBusinessVertical(id: string): Promise<void> {
    await db
      .update(businessVerticals)
      .set({ isActive: false })
      .where(eq(businessVerticals.id, id));
  }

  async getSalaryConfig(businessId: string, memberId?: string, verticalId?: string): Promise<SalaryConfig | undefined> {
    const conditions = [eq(salaryConfigs.businessId, businessId)];
    if (memberId) conditions.push(eq(salaryConfigs.memberId, memberId));
    if (verticalId) conditions.push(eq(salaryConfigs.verticalId, verticalId));
    const [config] = await db.select().from(salaryConfigs).where(and(...conditions));
    return config;
  }

  async getSalaryConfigsByBusiness(businessId: string): Promise<SalaryConfig[]> {
    return db.select().from(salaryConfigs).where(eq(salaryConfigs.businessId, businessId));
  }

  async upsertSalaryConfig(config: InsertSalaryConfig): Promise<SalaryConfig> {
    const conditions = [eq(salaryConfigs.businessId, config.businessId as string)];
    if (config.memberId) conditions.push(eq(salaryConfigs.memberId, config.memberId));
    if (config.verticalId) conditions.push(eq(salaryConfigs.verticalId, config.verticalId));

    const [existing] = await db.select().from(salaryConfigs).where(and(...conditions));

    if (existing) {
      const [updated] = await db
        .update(salaryConfigs)
        .set({ ...config, updatedAt: new Date() } as Partial<typeof salaryConfigs.$inferInsert>)
        .where(eq(salaryConfigs.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(salaryConfigs).values(config as typeof salaryConfigs.$inferInsert).returning();
    return created;
  }

  async getEmployeeTargets(businessId: string, memberId?: string, periodLabel?: string): Promise<EmployeeTarget[]> {
    const conditions = [eq(employeeTargets.businessId, businessId)];
    if (memberId) conditions.push(eq(employeeTargets.memberId, memberId));
    if (periodLabel) conditions.push(eq(employeeTargets.periodLabel, periodLabel));
    return db.select().from(employeeTargets).where(and(...conditions));
  }

  async getEmployeeTarget(id: string): Promise<EmployeeTarget | undefined> {
    const [target] = await db.select().from(employeeTargets).where(eq(employeeTargets.id, id));
    return target;
  }

  async createEmployeeTarget(target: InsertEmployeeTarget): Promise<EmployeeTarget> {
    const [created] = await db.insert(employeeTargets).values(target).returning();
    return created;
  }

  async updateEmployeeTarget(id: string, data: Partial<InsertEmployeeTarget>): Promise<EmployeeTarget | undefined> {
    const [updated] = await db
      .update(employeeTargets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employeeTargets.id, id))
      .returning();
    return updated;
  }

  async deleteEmployeeTarget(id: string): Promise<void> {
    await db.delete(employeeTargets).where(eq(employeeTargets.id, id));
  }

  // ── EOD Entry Methods ──────────────────────────────────────────────────

  async getEodEntries(businessId: string, filters?: { memberId?: string; verticalId?: string; fromDate?: string; toDate?: string }): Promise<EodEntry[]> {
    const conditions = [eq(eodEntries.businessId, businessId)];
    if (filters?.memberId) conditions.push(eq(eodEntries.memberId, filters.memberId));
    if (filters?.verticalId) conditions.push(eq(eodEntries.verticalId, filters.verticalId));
    if (filters?.fromDate) conditions.push(gte(eodEntries.entryDate, filters.fromDate));
    if (filters?.toDate) conditions.push(lte(eodEntries.entryDate, filters.toDate));
    return db.select().from(eodEntries).where(and(...conditions)).orderBy(desc(eodEntries.entryDate));
  }

  async getEodEntry(id: string): Promise<EodEntry | undefined> {
    const [entry] = await db.select().from(eodEntries).where(eq(eodEntries.id, id));
    return entry;
  }

  async getEodEntryByMemberAndDate(memberId: string, entryDate: string): Promise<EodEntry | undefined> {
    const [entry] = await db.select().from(eodEntries).where(and(eq(eodEntries.memberId, memberId), eq(eodEntries.entryDate, entryDate)));
    return entry;
  }

  async createEodEntry(entry: InsertEodEntry): Promise<EodEntry> {
    const [created] = await db.insert(eodEntries).values(entry as typeof eodEntries.$inferInsert).returning();
    return created;
  }

  async updateEodEntry(id: string, data: Partial<InsertEodEntry>): Promise<EodEntry | undefined> {
    const [updated] = await db.update(eodEntries).set({ ...data, updatedAt: new Date() } as Partial<typeof eodEntries.$inferInsert>).where(eq(eodEntries.id, id)).returning();
    return updated;
  }

  async deleteEodEntry(id: string): Promise<void> {
    await db.delete(eodEntries).where(eq(eodEntries.id, id));
  }

  async getPerformanceSummary(businessId: string, memberId: string, periodLabel: string): Promise<PerformanceSummary> {
    // Parse period to date range (e.g., '2024-01' → Jan 2024, '2024-Q1' → Jan–Mar 2024)
    let fromDate: string, toDate: string;
    if (periodLabel.includes('-Q')) {
      const [year, q] = periodLabel.split('-Q');
      const quarter = parseInt(q);
      const startMonth = (quarter - 1) * 3 + 1;
      fromDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
      const endMonth = startMonth + 2;
      const endDay = new Date(parseInt(year), endMonth, 0).getDate();
      toDate = `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    } else {
      // Monthly: YYYY-MM
      const [year, month] = periodLabel.split('-');
      fromDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      toDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    }

    const entries = await this.getEodEntries(businessId, { memberId, fromDate, toDate });

    // Get targets for this member and period
    const targets = await this.getEmployeeTargets(businessId, memberId, periodLabel);
    const revenueTarget = targets.find(t => t.targetType === 'revenue')?.targetValue ?? 0;
    const unitsTarget = targets.find(t => t.targetType === 'volume')?.targetValue ?? 0;
    const dealsTarget = targets.find(t => t.targetType === 'deals')?.targetValue ?? 0;

    // Aggregate from entries
    let totalRevenue = 0, totalUnits = 0, totalDeals = 0, totalExpenses = 0;
    const verticalMap: Record<string, { verticalId: string; verticalName: string; revenue: number; units: number; deals: number }> = {};

    for (const entry of entries) {
      totalRevenue += entry.revenueAmount ?? 0;
      totalUnits += entry.unitsSold ?? 0;
      totalDeals += entry.dealsClosed ?? 0;
      const expenses = ((entry.expenseItems ?? []) as ExpenseItem[]).reduce((sum: number, e: ExpenseItem) => sum + (e.amount ?? 0), 0);
      totalExpenses += expenses;

      if (entry.verticalId) {
        if (!verticalMap[entry.verticalId]) {
          const v = await this.getBusinessVertical(entry.verticalId);
          verticalMap[entry.verticalId] = { verticalId: entry.verticalId, verticalName: v?.name ?? 'Unknown', revenue: 0, units: 0, deals: 0 };
        }
        verticalMap[entry.verticalId].revenue += entry.revenueAmount ?? 0;
        verticalMap[entry.verticalId].units += entry.unitsSold ?? 0;
        verticalMap[entry.verticalId].deals += entry.dealsClosed ?? 0;
      }
    }

    // Achievement % (use revenue if target exists, else deals, else units)
    let achievementPercent = 0;
    if (revenueTarget > 0) {
      achievementPercent = Math.round((totalRevenue / revenueTarget) * 100);
    } else if (dealsTarget > 0) {
      achievementPercent = Math.round((totalDeals / dealsTarget) * 100);
    } else if (unitsTarget > 0) {
      achievementPercent = Math.round((totalUnits / unitsTarget) * 100);
    }

    // Projected incentive from salary config (member-specific → business default fallback)
    let salaryConfig = await this.getSalaryConfig(businessId, memberId);
    if (!salaryConfig) salaryConfig = await this.getSalaryConfig(businessId, undefined);
    let projectedIncentive = 0;
    if (salaryConfig) {
      const tiers = ((salaryConfig.incentiveTiers ?? []) as IncentiveTier[]);
      if (tiers.length > 0) {
        const tier = tiers.find((t: IncentiveTier) => achievementPercent >= t.fromPercent && achievementPercent <= t.toPercent);
        if (tier) projectedIncentive = Math.round((totalRevenue * tier.incentivePercent) / 10000);
      } else if (salaryConfig.incentivePercent > 0) {
        projectedIncentive = Math.round((totalRevenue * salaryConfig.incentivePercent) / 10000);
      }
    }

    return {
      memberId,
      periodLabel,
      totalRevenue,
      totalUnits,
      totalDeals,
      totalExpenses,
      targetRevenue: revenueTarget,
      targetUnits: unitsTarget,
      targetDeals: dealsTarget,
      achievementPercent,
      projectedIncentive,
      entryCount: entries.length,
      verticalBreakdown: Object.values(verticalMap),
    };
  }

  async getTeamPerformance(businessId: string, periodLabel: string): Promise<TeamPerformanceSummary[]> {
    const members = await db.select().from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.status, 'active')));
    const allSalaryConfigs = await this.getSalaryConfigsByBusiness(businessId);
    const results: TeamPerformanceSummary[] = [];

    for (const member of members) {
      const perf = await this.getPerformanceSummary(businessId, member.id, periodLabel);
      const user = member.userId ? await this.getUser(member.userId) : undefined;
      const memberName = member.name || (user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '') || member.email;

      // Resolve base salary for this member (use member-specific or first config)
      const salaryConf = allSalaryConfigs.find(c => c.memberId === member.id) ?? allSalaryConfigs[0];
      const baseSalary = salaryConf?.baseSalary ?? 0;

      // Compute travel expenses specifically from EOD expenseItems
      const fromDate = periodLabel.length === 7 ? `${periodLabel}-01` : undefined;
      const toDate = periodLabel.length === 7 ? `${periodLabel}-${String(new Date(+periodLabel.slice(0,4), +periodLabel.slice(5,7), 0).getDate()).padStart(2,'0')}` : undefined;
      const entries = await this.getEodEntries(businessId, { memberId: member.id, fromDate, toDate });
      const periodEntries = periodLabel.length === 7 ? entries.filter(e => e.entryDate.startsWith(periodLabel)) : entries;
      const TRAVEL_CATS = new Set(['travel', 'fuel', 'transport', 'conveyance', 'cab', 'auto', 'vehicle', 'petrol', 'diesel']);
      const isTravelCat = (cat: string) => { const n = cat.toLowerCase().trim(); return TRAVEL_CATS.has(n) || n.includes('travel') || n.includes('fuel'); };
      const travelExpenses = periodEntries.reduce((s, e) => {
        const items = (e.expenseItems as { category: string; amount: number }[] | null) ?? [];
        return s + items.filter(i => isTravelCat(i.category)).reduce((t, i) => t + i.amount, 0);
      }, 0);

      results.push({
        memberId: member.id,
        memberName,
        memberEmail: member.email,
        totalRevenue: perf.totalRevenue,
        totalUnits: perf.totalUnits,
        totalDeals: perf.totalDeals,
        totalExpenses: perf.totalExpenses,
        travelExpenses,
        baseSalary,
        targetRevenue: perf.targetRevenue,
        achievementPercent: perf.achievementPercent,
        projectedIncentive: perf.projectedIncentive,
        entryCount: perf.entryCount,
      });
    }

    return results.sort((a, b) => b.achievementPercent - a.achievementPercent);
  }

  async getPerformanceTrends(businessId: string, months: number): Promise<{ period: string; totalRevenue: number; totalUnits: number; totalDeals: number; entryCount: number }[]> {
    const trends: { period: string; totalRevenue: number; totalUnits: number; totalDeals: number; entryCount: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const fromDate = `${period}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const toDate = `${period}-${String(lastDay).padStart(2, '0')}`;

      const entries = await this.getEodEntries(businessId, { fromDate, toDate });
      const periodEntries = entries.filter(e => e.entryDate.startsWith(period));

      trends.push({
        period,
        totalRevenue: periodEntries.reduce((s, e) => s + (e.revenueAmount ?? 0), 0),
        totalUnits: periodEntries.reduce((s, e) => s + (e.unitsSold ?? 0), 0),
        totalDeals: periodEntries.reduce((s, e) => s + (e.dealsClosed ?? 0), 0),
        entryCount: periodEntries.length,
      });
    }
    return trends;
  }

  async createBusinessReportToken(data: { token: string; businessId: string; reportType: string; reportParams: Record<string, string>; createdBy: string }): Promise<BusinessReportToken> {
    const [reportToken] = await db.insert(businessReportTokens).values(data).returning();
    return reportToken;
  }

  async getBusinessReportToken(token: string): Promise<BusinessReportToken | undefined> {
    const [row] = await db.select().from(businessReportTokens).where(eq(businessReportTokens.token, token));
    return row;
  }
}

export const storage = new DatabaseStorage();
