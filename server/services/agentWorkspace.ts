import { db } from "../db";
import { 
  eodEntries, 
  businessMembers, 
  businessVerticals, 
  salaryConfigs, 
  businessTasks, 
  visitLogs, 
  agentReports 
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AgentInsightResult {
  salesAnalysis: string;
  financeAnalysis: string;
  operationsAnalysis: string;
  hrAnalysis: string;
  consensusReport: string;
}

/**
 * Orchestrates multi-agent analysis over business metrics.
 */
export async function orchestrateAgentAnalysis(
  businessId: string,
  userId: string,
  period: string
): Promise<AgentInsightResult> {
  try {
    // 1. Gather all data slices
    
    // Roster / Members
    const members = await db
      .select()
      .from(businessMembers)
      .where(eq(businessMembers.businessId, businessId));

    // Verticals
    const verticals = await db
      .select()
      .from(businessVerticals)
      .where(eq(businessVerticals.businessId, businessId));

    // EOD performance metrics
    const eod = await db
      .select()
      .from(eodEntries)
      .where(eq(eodEntries.businessId, businessId));

    // Salary configs
    const salaries = await db
      .select()
      .from(salaryConfigs)
      .where(eq(salaryConfigs.businessId, businessId));

    // Tasks
    const tasks = await db
      .select()
      .from(businessTasks)
      .where(eq(businessTasks.businessId, businessId));

    // Visit logs
    const logs = await db
      .select()
      .from(visitLogs)
      .where(eq(visitLogs.businessId, businessId));

    // Serialize data slices for specialized agents
    const salesData = JSON.stringify({ eod, verticals }, null, 2);
    const financeData = JSON.stringify({ eodEntries: eod, salaries }, null, 2);
    const opsData = JSON.stringify({ tasks, visitLogsCount: logs.length }, null, 2);
    const hrData = JSON.stringify({ members, salaries }, null, 2);

    // 2. Execute individual agent analyses concurrently
    const [salesAnalysis, financeAnalysis, operationsAnalysis, hrAnalysis] = await Promise.all([
      // Sales Agent
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
You are the Sales Agent for an enterprise copilot. Analyze the following sales data and EOD reports for the period.
Focus on: revenue trends, top performing verticals, and pipeline conversion indicators.
Provide 3 key sales findings in clear bullet points.

DATA:
${salesData}
`,
      }).then(r => r.text || "No sales analysis generated."),

      // Finance Agent
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
You are the Finance Agent for an enterprise copilot. Analyze the following financial logs, expense categories, and base salaries.
Focus on: expense optimization, salary-to-revenue efficiency, and operational spending patterns.
Provide 3 key financial findings in clear bullet points.

DATA:
${financeData}
`,
      }).then(r => r.text || "No finance analysis generated."),

      // Operations Agent
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
You are the Operations Agent for an enterprise copilot. Analyze the task management stats and field site visits.
Focus on: operational speed (completed vs pending tasks), client site check-in volumes, and logistics efficiency.
Provide 3 key operational findings in clear bullet points.

DATA:
${opsData}
`,
      }).then(r => r.text || "No operations analysis generated."),

      // HR Agent
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
You are the HR Agent for an enterprise copilot. Analyze the team roster, employee roles, and active support/salaries.
Focus on: team utilization, employee headcount capacity, performance risks, and organizational layout.
Provide 3 key HR findings in clear bullet points.

DATA:
${hrData}
`,
      }).then(r => r.text || "No HR analysis generated.")
    ]);

    // 3. Consensus Orchestrator Aggregator
    const consensusPrompt = `
You are the Executive Consensus Agent. Gather the findings of our four expert agents: Sales, Finance, Operations, and HR.
Analyze their insights, resolve any conflicts, and aggregate them into a single, high-impact executive report for management.

FINDINGS FROM SALES AGENT:
${salesAnalysis}

FINDINGS FROM FINANCE AGENT:
${financeAnalysis}

FINDINGS FROM OPERATIONS AGENT:
${operationsAnalysis}

FINDINGS FROM HR AGENT:
${hrAnalysis}

Please write a consolidated executive consensus report containing:
1. Executive Summary: High-level overview of business health.
2. Major opportunities for expansion or optimization.
3. Critical business risks to mitigate.
4. Top 3 actionable recommendations.
`;

    const consensusResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: consensusPrompt,
    });

    const consensusReport = consensusResponse.text || "No consensus report generated.";

    // 4. Save to Database
    await db.insert(agentReports).values({
      userId,
      title: `Multi-Agent Consensus Analysis (${period})`,
      period,
      salesAnalysis,
      financeAnalysis,
      operationsAnalysis,
      hrAnalysis,
      consensusReport,
    });

    return {
      salesAnalysis,
      financeAnalysis,
      operationsAnalysis,
      hrAnalysis,
      consensusReport,
    };
  } catch (error) {
    console.error("[Agent Workspace] Error in orchestrateAgentAnalysis:", error);
    throw error;
  }
}
