/**
 * Demo Seed Script
 * Creates 1 admin + 3 employee Firebase accounts and full demo business data.
 *
 * Usage:
 *   npx tsx script/seed-demo.ts
 *
 * Requires: DATABASE_URL in environment (same as the running server).
 * The Firebase API key is read from VITE_FIREBASE_API_KEY or falls back to
 * the hardcoded project default.
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";
import { eq } from "drizzle-orm";

const { Pool } = pg;

// ── Config ────────────────────────────────────────────────────────────────

const FIREBASE_API_KEY =
  process.env.VITE_FIREBASE_API_KEY || "AIzaSyA8nZGVW2I-XX78wujFkUNc8rbfQkUutCA";

const DEMO_ACCOUNTS = [
  {
    email: "admin@demodatainsights.com",
    password: "Demo@1234",
    firstName: "Rahul",
    lastName: "Sharma",
    role: "owner" as const,
  },
  {
    email: "emp1@demodatainsights.com",
    password: "Demo@1234",
    firstName: "Priya",
    lastName: "Verma",
    role: "employee" as const,
  },
  {
    email: "emp2@demodatainsights.com",
    password: "Demo@1234",
    firstName: "Aman",
    lastName: "Gupta",
    role: "employee" as const,
  },
  {
    email: "emp3@demodatainsights.com",
    password: "Demo@1234",
    firstName: "Neha",
    lastName: "Singh",
    role: "employee" as const,
  },
];

// ── Firebase REST helpers ─────────────────────────────────────────────────

async function createOrFetchFirebaseUser(
  email: string,
  password: string
): Promise<string> {
  // Try to create
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();

  if (data.localId) {
    console.log(`  ✓ Firebase user created: ${email} (uid: ${data.localId})`);
    return data.localId;
  }

  // If account already exists, sign in to get uid
  if (data.error?.message === "EMAIL_EXISTS") {
    const loginRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const loginData = await loginRes.json();
    if (loginData.localId) {
      console.log(`  ↩ Firebase user already exists: ${email} (uid: ${loginData.localId})`);
      return loginData.localId;
    }
    throw new Error(`Could not sign in existing user ${email}: ${JSON.stringify(loginData)}`);
  }

  throw new Error(`Firebase create user failed for ${email}: ${JSON.stringify(data)}`);
}

// ── DB helpers ────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool, { schema });

  console.log("\n🌱  Starting demo seed...\n");

  // ── Step 1: Create Firebase users & DB user rows ─────────────────────────

  console.log("── Step 1: Firebase + DB users");

  const uids: Record<string, string> = {};

  for (const account of DEMO_ACCOUNTS) {
    const uid = await createOrFetchFirebaseUser(account.email, account.password);
    uids[account.email] = uid;

    // Upsert into users table
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, uid))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.users).values({
        id: uid,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        onboardingComplete: true,
      });
      console.log(`  ✓ DB user row inserted: ${account.email}`);
    } else {
      console.log(`  ↩ DB user row already exists: ${account.email}`);
    }
  }

  const adminUid = uids[DEMO_ACCOUNTS[0].email];

  // ── Step 2: Create business profile ──────────────────────────────────────

  console.log("\n── Step 2: Business profile");

  let business = (
    await db
      .select()
      .from(schema.businessProfiles)
      .where(eq(schema.businessProfiles.ownerId, adminUid))
      .limit(1)
  )[0];

  if (!business) {
    [business] = await db
      .insert(schema.businessProfiles)
      .values({
        ownerId: adminUid,
        name: "Demo Business",
        industry: "technology",
        industryLabel: "Technology",
        description: "A demo business for testing DataInsights Business Suite.",
        employeeCount: 4,
        currencySymbol: "₹",
      })
      .returning();
    console.log(`  ✓ Business created: "${business.name}" (id: ${business.id})`);
  } else {
    console.log(`  ↩ Business already exists: "${business.name}" (id: ${business.id})`);
  }

  const bizId = business.id;

  // ── Step 3: Create business members ──────────────────────────────────────

  console.log("\n── Step 3: Business members");

  const memberIds: Record<string, string> = {};

  for (const account of DEMO_ACCOUNTS) {
    const uid = uids[account.email];
    const role = account.role === "owner" ? "owner" : "employee";

    const existing = await db
      .select()
      .from(schema.businessMembers)
      .where(
        eq(schema.businessMembers.userId, uid)
      )
      .limit(1);

    let memberId: string;

    if (existing.length > 0) {
      memberId = existing[0].id;
      console.log(`  ↩ Member already exists: ${account.email} (${role})`);
    } else {
      const [member] = await db
        .insert(schema.businessMembers)
        .values({
          businessId: bizId,
          userId: uid,
          email: account.email,
          name: `${account.firstName} ${account.lastName}`,
          memberRole: role,
          status: "active",
          joinedAt: new Date(),
        })
        .returning();
      memberId = member.id;
      console.log(`  ✓ Member created: ${account.email} (${role})`);
    }

    memberIds[account.email] = memberId;
  }

  // ── Step 4: Create business verticals ────────────────────────────────────

  console.log("\n── Step 4: Verticals");

  const existingVerticals = await db
    .select()
    .from(schema.businessVerticals)
    .where(eq(schema.businessVerticals.businessId, bizId));

  let verticals = existingVerticals;

  if (existingVerticals.length === 0) {
    verticals = await db
      .insert(schema.businessVerticals)
      .values([
        {
          businessId: bizId,
          name: "Sales",
          description: "Direct sales and client acquisition",
          metricLabel: "Revenue",
          metricUnit: "₹",
          expenseCategories: ["Travel", "Client Entertainment", "Misc"],
          sortOrder: 0,
        },
        {
          businessId: bizId,
          name: "Operations",
          description: "Delivery, support, and operations",
          metricLabel: "Units Delivered",
          metricUnit: "units",
          expenseCategories: ["Logistics", "Supplies", "Misc"],
          sortOrder: 1,
        },
      ])
      .returning();
    console.log(`  ✓ Created ${verticals.length} verticals: Sales, Operations`);
  } else {
    console.log(`  ↩ Verticals already exist (${existingVerticals.length})`);
  }

  const salesVertical = verticals.find((v) => v.name === "Sales") ?? verticals[0];
  const opsVertical = verticals.find((v) => v.name === "Operations") ?? verticals[1] ?? verticals[0];

  // ── Step 5: EOD entries (last 20 days) for employees ─────────────────────

  console.log("\n── Step 5: EOD entries");

  const employeeAccounts = DEMO_ACCOUNTS.filter((a) => a.role === "employee");
  let eodCount = 0;

  for (const account of employeeAccounts) {
    const memberId = memberIds[account.email];
    const vertical = employeeAccounts.indexOf(account) === 0 ? opsVertical : salesVertical;

    for (let daysBack = 1; daysBack <= 20; daysBack++) {
      // Skip weekends
      const d = new Date();
      d.setDate(d.getDate() - daysBack);
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const entryDate = daysAgo(daysBack);

      const existing = await db
        .select({ id: schema.eodEntries.id })
        .from(schema.eodEntries)
        .where(
          eq(schema.eodEntries.memberId, memberId)
        )
        .limit(1);

      // Skip if this member already has any entry (rough check)
      if (existing.length > 0 && daysBack > 1) continue;

      try {
        await db.insert(schema.eodEntries).values({
          businessId: bizId,
          memberId,
          verticalId: vertical?.id ?? null,
          entryDate,
          revenueAmount: rand(20000, 150000),
          unitsSold: rand(2, 20),
          dealsClosed: rand(0, 4),
          expenseItems: [
            { category: "Travel", amount: rand(200, 800), note: "Client visit" },
          ],
          notes: `Productive day. Visited ${rand(2, 5)} clients.`,
          status: "submitted",
        });
        eodCount++;
      } catch {
        // unique constraint hit — entry already exists for that member+date, skip
      }
    }
  }

  console.log(`  ✓ Inserted ${eodCount} EOD entries`);

  // ── Done ──────────────────────────────────────────────────────────────────

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              ✅  Demo seed complete!                         ║
╠══════════════════════════════════════════════════════════════╣
║  Business : Demo Business (Technology)                       ║
║                                                              ║
║  ADMIN (owner)                                               ║
║    Email    : admin@demodatainsights.com                     ║
║    Password : Demo@1234                                      ║
║                                                              ║
║  EMPLOYEE 1                                                  ║
║    Email    : emp1@demodatainsights.com                      ║
║    Password : Demo@1234                                      ║
║                                                              ║
║  EMPLOYEE 2                                                  ║
║    Email    : emp2@demodatainsights.com                      ║
║    Password : Demo@1234                                      ║
║                                                              ║
║  EMPLOYEE 3                                                  ║
║    Email    : emp3@demodatainsights.com                      ║
║    Password : Demo@1234                                      ║
╚══════════════════════════════════════════════════════════════╝
`);

  await pool.end();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
