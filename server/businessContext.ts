// Business Context Injector - pulls live business data for AI prompts
import { db } from "./db";
import {
  businessProfiles,
  businessMembers,
  businessVerticals,
  eodEntries,
  employeeTargets,
} from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

function monthLastDay(year: string, month: string): string {
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
}

export interface BusinessContextResult {
  context: string;
  businessId: string | null;
  memberRole: string | null;
}

/**
 * Build a live business context string to inject into AI prompts.
 * Returns the context and metadata.
 */
export async function buildBusinessContext(
  userId: string,
  periodLabel?: string
): Promise<BusinessContextResult> {
  try {
    // Get business profile + member role
    const member = await db
      .select({
        businessId: businessMembers.businessId,
        memberRole: businessMembers.memberRole,
        memberId: businessMembers.id,
        memberStatus: businessMembers.status,
      })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.status, "active")
        )
      )
      .limit(1);

    if (!member.length) {
      // Try as owner
      const profile = await db
        .select()
        .from(businessProfiles)
        .where(eq(businessProfiles.ownerId, userId))
        .limit(1);
      if (!profile.length) return { context: "", businessId: null, memberRole: null };

      const p = profile[0];
      return buildOwnerContext(userId, p.id, p.name, p.industry, p.currencySymbol ?? "₹", periodLabel);
    }

    const m = member[0];
    const profile = await db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.id, m.businessId))
      .limit(1);

    if (!profile.length) return { context: "", businessId: null, memberRole: null };

    const p = profile[0];

    if (m.memberRole === "owner" || m.memberRole === "manager") {
      return buildOwnerContext(userId, p.id, p.name, p.industry, p.currencySymbol ?? "₹", periodLabel, m.memberId, m.memberRole);
    } else {
      return buildEmployeeContext(userId, p.id, m.memberId, p.name, p.currencySymbol ?? "₹", periodLabel);
    }
  } catch (error) {
    console.error("Business context error (non-fatal):", error);
    return { context: "", businessId: null, memberRole: null };
  }
}

async function buildOwnerContext(
  userId: string,
  businessId: string,
  businessName: string,
  industry: string,
  sym: string,
  periodLabel?: string,
  memberId?: string,
  explicitRole?: string
): Promise<BusinessContextResult> {
  const period = periodLabel || new Date().toISOString().slice(0, 7);

  // Get verticals
  const verticals = await db
    .select()
    .from(businessVerticals)
    .where(and(eq(businessVerticals.businessId, businessId), eq(businessVerticals.isActive, true)));

  // Get team members
  const members = await db
    .select()
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.status, "active")));

  // Get EOD entries for the period
  const [year, month] = period.split("-");
  const startDate = `${year}-${month}-01`;
  const endDate = monthLastDay(year, month);

  const eod = await db
    .select()
    .from(eodEntries)
    .where(
      and(
        eq(eodEntries.businessId, businessId),
        gte(eodEntries.entryDate, startDate),
        lte(eodEntries.entryDate, endDate)
      )
    );

  // Aggregate by member
  const memberStats: Record<string, { name: string; revenue: number; units: number; deals: number; expenses: number; entries: number }> = {};
  for (const e of eod) {
    if (!memberStats[e.memberId]) {
      const mem = members.find(m => m.id === e.memberId);
      memberStats[e.memberId] = { name: mem?.name ?? mem?.email ?? "Unknown", revenue: 0, units: 0, deals: 0, expenses: 0, entries: 0 };
    }
    memberStats[e.memberId].revenue += e.revenueAmount ?? 0;
    memberStats[e.memberId].units += e.unitsSold ?? 0;
    memberStats[e.memberId].deals += e.dealsClosed ?? 0;
    const expItems = Array.isArray(e.expenseItems) ? e.expenseItems as { amount?: number }[] : [];
    memberStats[e.memberId].expenses += expItems.reduce((s, x) => s + (x.amount ?? 0), 0);
    memberStats[e.memberId].entries += 1;
  }

  const totalRevenue = Object.values(memberStats).reduce((s, m) => s + m.revenue, 0);
  const totalUnits = Object.values(memberStats).reduce((s, m) => s + m.units, 0);
  const totalDeals = Object.values(memberStats).reduce((s, m) => s + m.deals, 0);
  const totalExpenses = Object.values(memberStats).reduce((s, m) => s + m.expenses, 0);

  // Per-vertical target vs achievement
  const allTargets = await db
    .select()
    .from(employeeTargets)
    .where(
      and(
        eq(employeeTargets.businessId, businessId),
        eq(employeeTargets.periodLabel, period)
      )
    );

  // Aggregate targets per vertical
  const verticalTargets: Record<string, { name: string; targetRevenue: number; targetUnits: number; actualRevenue: number; actualUnits: number }> = {};
  for (const v of verticals) {
    verticalTargets[v.id] = { name: v.name, targetRevenue: 0, targetUnits: 0, actualRevenue: 0, actualUnits: 0 };
    const vTargets = allTargets.filter(t => t.verticalId === v.id);
    for (const t of vTargets) {
      if (t.targetType === 'revenue') verticalTargets[v.id].targetRevenue += t.targetValue;
      if (t.targetType === 'volume') verticalTargets[v.id].targetUnits += t.targetValue;
    }
    // Actual from EOD entries for this vertical
    const vEod = eod.filter(e => e.verticalId === v.id);
    verticalTargets[v.id].actualRevenue = vEod.reduce((s, e) => s + (e.revenueAmount ?? 0), 0);
    verticalTargets[v.id].actualUnits = vEod.reduce((s, e) => s + (e.unitsSold ?? 0), 0);
  }

  const lines: string[] = [
    `Business: ${businessName} (${industry})`,
    `Period: ${period}`,
    `Team size: ${members.length} active members`,
    ``,
    `Team Performance for ${period}:`,
    `- Total Revenue: ${sym}${totalRevenue.toLocaleString()}`,
    `- Total Units Sold: ${totalUnits}`,
    `- Total Deals Closed: ${totalDeals}`,
    `- Total Expenses: ${sym}${totalExpenses.toLocaleString()}`,
    `- EOD Entries Logged: ${eod.length}`,
  ];

  if (Object.keys(verticalTargets).length > 0) {
    lines.push("", "Target vs Achievement by Vertical:");
    for (const vt of Object.values(verticalTargets)) {
      const revAch = vt.targetRevenue > 0 ? Math.round((vt.actualRevenue / vt.targetRevenue) * 100) : 0;
      const unitsAch = vt.targetUnits > 0 ? Math.round((vt.actualUnits / vt.targetUnits) * 100) : 0;
      lines.push(`  ${vt.name}: Revenue ${sym}${vt.actualRevenue.toLocaleString()} / Target ${sym}${vt.targetRevenue.toLocaleString()} (${revAch}%), Units ${vt.actualUnits} / Target ${vt.targetUnits} (${unitsAch}%)`);
    }
  }

  if (Object.keys(memberStats).length > 0) {
    lines.push("", "Individual Performance:");
    for (const stat of Object.values(memberStats)) {
      lines.push(`  ${stat.name}: Revenue ${sym}${stat.revenue.toLocaleString()}, Units ${stat.units}, Deals ${stat.deals}, Expenses ${sym}${stat.expenses.toLocaleString()}, Entries ${stat.entries}`);
    }
  }

  return {
    context: lines.join("\n"),
    businessId,
    memberRole: explicitRole ?? (memberId ? "manager" : "owner"),
  };
}

async function buildEmployeeContext(
  userId: string,
  businessId: string,
  memberId: string,
  businessName: string,
  sym: string,
  periodLabel?: string
): Promise<BusinessContextResult> {
  const period = periodLabel || new Date().toISOString().slice(0, 7);
  const [year, month] = period.split("-");
  const startDate = `${year}-${month}-01`;
  const endDate = monthLastDay(year, month);

  const myEntries = await db
    .select()
    .from(eodEntries)
    .where(
      and(
        eq(eodEntries.memberId, memberId),
        gte(eodEntries.entryDate, startDate),
        lte(eodEntries.entryDate, endDate)
      )
    )
    .orderBy(desc(eodEntries.entryDate));

  const myTargets = await db
    .select()
    .from(employeeTargets)
    .where(
      and(
        eq(employeeTargets.memberId, memberId),
        eq(employeeTargets.periodLabel, period)
      )
    );

  const totalRevenue = myEntries.reduce((s, e) => s + (e.revenueAmount ?? 0), 0);
  const totalUnits = myEntries.reduce((s, e) => s + (e.unitsSold ?? 0), 0);
  const totalDeals = myEntries.reduce((s, e) => s + (e.dealsClosed ?? 0), 0);
  const totalExpenses = myEntries.reduce((s, e) => {
    const expItems = Array.isArray(e.expenseItems) ? e.expenseItems as { amount?: number }[] : [];
    return s + expItems.reduce((a, x) => a + (x.amount ?? 0), 0);
  }, 0);

  const targetRevenue = myTargets.filter(t => t.targetType === "revenue").reduce((s, t) => s + t.targetValue, 0);
  const achPct = targetRevenue > 0 ? Math.round((totalRevenue / targetRevenue) * 100) : 0;

  const lines: string[] = [
    `Business: ${businessName}`,
    `Your Performance for ${period}:`,
    `- Revenue: ${sym}${totalRevenue.toLocaleString()} (Target: ${sym}${targetRevenue.toLocaleString()}, Achievement: ${achPct}%)`,
    `- Units Sold: ${totalUnits}`,
    `- Deals Closed: ${totalDeals}`,
    `- Expenses: ${sym}${totalExpenses.toLocaleString()}`,
    `- EOD Entries This Month: ${myEntries.length}`,
  ];

  if (myEntries.length > 0) {
    lines.push("", "Recent EOD Entries:");
    myEntries.slice(0, 5).forEach(e => {
      lines.push(`  ${e.entryDate}: Revenue ${sym}${(e.revenueAmount ?? 0).toLocaleString()}, Units ${e.unitsSold ?? 0}, Deals ${e.dealsClosed ?? 0}`);
    });
  }

  return {
    context: lines.join("\n"),
    businessId,
    memberRole: "employee",
  };
}
