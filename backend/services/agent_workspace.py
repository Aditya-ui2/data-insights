import os
import json
from datetime import datetime
from typing import TypedDict
from sqlalchemy.orm import Session
from google import genai
from langgraph.graph import StateGraph, END

# Import SQLAlchemy models
from db import (
    BusinessMember, BusinessVertical, EodEntry, 
    SalaryConfig, BusinessTask, VisitLog, AgentReport
)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)

# Define LangGraph shared state
class AgentState(TypedDict):
    db: Session
    business_id: str
    user_id: str
    period: str
    sales_analysis: str
    finance_analysis: str
    operations_analysis: str
    hr_analysis: str
    consensus_report: str

def sales_agent_node(state: AgentState) -> AgentState:
    db = state["db"]
    b_id = state["business_id"]
    
    # Query database
    eods = db.query(EodEntry).filter(EodEntry.businessId == b_id).all()
    verticals = db.query(BusinessVertical).filter(BusinessVertical.businessId == b_id).all()
    
    # Serialize data
    data_str = json.dumps({
        "eod_entries": [
            {
                "date": str(e.entryDate),
                "revenue_amount": e.revenueAmount,
                "units_sold": e.unitsSold,
                "deals_closed": e.dealsClosed,
                "notes": e.notes
            } for e in eods
        ],
        "verticals": [{"name": v.name, "metric": v.metricLabel} for v in verticals]
    }, indent=2)

    prompt = f"""
You are the Sales Agent for an enterprise copilot. Analyze the following sales data and EOD reports for the period.
Focus on: revenue trends, top performing verticals, and pipeline conversion indicators.
Provide 3 key sales findings in clear bullet points.

DATA:
{data_str}
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        state["sales_analysis"] = response.text or "No sales analysis generated."
    except Exception as e:
        print(f"[Sales Agent] Error: {e}")
        state["sales_analysis"] = "Unable to analyze sales data."
        
    return state

def finance_agent_node(state: AgentState) -> AgentState:
    db = state["db"]
    b_id = state["business_id"]
    
    eods = db.query(EodEntry).filter(EodEntry.businessId == b_id).all()
    salaries = db.query(SalaryConfig).filter(SalaryConfig.businessId == b_id).all()
    
    data_str = json.dumps({
        "eod_entries": [{"revenue_amount": e.revenueAmount} for e in eods],
        "salaries": [{"base_salary": s.baseSalary, "travel_cap": s.travelAllowanceCap} for s in salaries]
    }, indent=2)

    prompt = f"""
You are the Finance Agent for an enterprise copilot. Analyze the following financial logs, expense categories, and base salaries.
Focus on: expense optimization, salary-to-revenue efficiency, and operational spending patterns.
Provide 3 key financial findings in clear bullet points.

DATA:
{data_str}
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        state["finance_analysis"] = response.text or "No finance analysis generated."
    except Exception as e:
        print(f"[Finance Agent] Error: {e}")
        state["finance_analysis"] = "Unable to analyze financial data."
        
    return state

def operations_agent_node(state: AgentState) -> AgentState:
    db = state["db"]
    b_id = state["business_id"]
    
    tasks = db.query(BusinessTask).filter(BusinessTask.businessId == b_id).all()
    logs = db.query(VisitLog).filter(VisitLog.businessId == b_id).all()
    
    data_str = json.dumps({
        "tasks": [
            {
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "due_date": str(t.dueDate) if t.dueDate else None
            } for t in tasks
        ],
        "visit_logs_count": len(logs)
    }, indent=2)

    prompt = f"""
You are the Operations Agent for an enterprise copilot. Analyze the task management stats and field site visits.
Focus on: operational speed (completed vs pending tasks), client site check-in volumes, and logistics efficiency.
Provide 3 key operational findings in clear bullet points.

DATA:
{data_str}
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        state["operations_analysis"] = response.text or "No operations analysis generated."
    except Exception as e:
        print(f"[Operations Agent] Error: {e}")
        state["operations_analysis"] = "Unable to analyze operations data."
        
    return state

def hr_agent_node(state: AgentState) -> AgentState:
    db = state["db"]
    b_id = state["business_id"]
    
    members = db.query(BusinessMember).filter(BusinessMember.businessId == b_id).all()
    salaries = db.query(SalaryConfig).filter(SalaryConfig.businessId == b_id).all()
    
    data_str = json.dumps({
        "team_roster": [{"name": m.name, "role": m.memberRole, "status": m.status} for m in members],
        "salaries": [{"base_salary": s.baseSalary} for s in salaries]
    }, indent=2)

    prompt = f"""
You are the HR Agent for an enterprise copilot. Analyze the team roster, employee roles, and active support/salaries.
Focus on: team utilization, employee headcount capacity, performance risks, and organizational layout.
Provide 3 key HR findings in clear bullet points.

DATA:
{data_str}
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        state["hr_analysis"] = response.text or "No HR analysis generated."
    except Exception as e:
        print(f"[HR Agent] Error: {e}")
        state["hr_analysis"] = "Unable to analyze HR data."
        
    return state

def consensus_agent_node(state: AgentState) -> AgentState:
    sales = state["sales_analysis"]
    finance = state["finance_analysis"]
    ops = state["operations_analysis"]
    hr = state["hr_analysis"]

    prompt = f"""
You are the Executive Consensus Agent. Gather the findings of our four expert agents: Sales, Finance, Operations, and HR.
Analyze their insights, resolve any conflicts, and aggregate them into a single, high-impact executive report for management.

FINDINGS FROM SALES AGENT:
{sales}

FINDINGS FROM FINANCE AGENT:
{finance}

FINDINGS FROM OPERATIONS AGENT:
{ops}

FINDINGS FROM HR AGENT:
{hr}

Please write a consolidated executive consensus report containing:
1. Executive Summary: High-level overview of business health.
2. Major opportunities for expansion or optimization.
3. Critical business risks to mitigate.
4. Top 3 actionable recommendations.
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        state["consensus_report"] = response.text or "No consensus report generated."
    except Exception as e:
        print(f"[Consensus Agent] Error: {e}")
        state["consensus_report"] = "Unable to compile consensus report."
        
    return state

# Setup LangGraph workflow
builder = StateGraph(AgentState)
builder.add_node("sales", sales_agent_node)
builder.add_node("finance", finance_agent_node)
builder.add_node("ops", operations_agent_node)
builder.add_node("hr", hr_agent_node)
builder.add_node("consensus", consensus_agent_node)

# Set up execution flow
builder.set_entry_point("sales")
builder.add_edge("sales", "finance")
builder.add_edge("finance", "ops")
builder.add_edge("ops", "hr")
builder.add_edge("hr", "consensus")
builder.add_edge("consensus", END)

# Compile graph
graph = builder.compile()

def run_agent_analysis_workflow(db: Session, business_id: str, user_id: str, period: str) -> dict:
    """
    Orchestrates the multi-agent analysis by running the LangGraph state graph.
    Saves the final report into the postgres database.
    """
    initial_state: AgentState = {
        "db": db,
        "business_id": business_id,
        "user_id": user_id,
        "period": period,
        "sales_analysis": "",
        "finance_analysis": "",
        "operations_analysis": "",
        "hr_analysis": "",
        "consensus_report": ""
    }

    # Execute graph
    final_state = graph.invoke(initial_state)

    # Save to database
    report = AgentReport(
        id=f"rep_{int(datetime.utcnow().timestamp())}",
        userId=user_id,
        title=f"Multi-Agent Consensus Analysis ({period})",
        period=period,
        salesAnalysis=final_state["sales_analysis"],
        financeAnalysis=final_state["finance_analysis"],
        operationsAnalysis=final_state["operations_analysis"],
        hrAnalysis=final_state["hr_analysis"],
        consensusReport=final_state["consensus_report"]
    )
    db.add(report)
    db.commit()

    return {
        "salesAnalysis": final_state["sales_analysis"],
        "financeAnalysis": final_state["finance_analysis"],
        "operationsAnalysis": final_state["operations_analysis"],
        "hrAnalysis": final_state["hr_analysis"],
        "consensusReport": final_state["consensus_report"]
    }
