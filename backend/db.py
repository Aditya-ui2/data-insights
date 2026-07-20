import os
import json
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, Column, String, Integer, DateTime, Date, 
    Text, ForeignKey, Index, Table
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "postgresql://adityapratapsinghrathore:@localhost:5432/data_insights"
)

# Replace postgresql:// with postgresql+psycopg2:// if not present
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Disable SSL check for local postgres, enable/disable reject unauthorized depending on RDS
connect_args = {}
if "amazonaws.com" in DATABASE_URL or "sslmode=require" in DATABASE_URL:
    connect_args = {"sslmode": "require"}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    firstName = Column("first_name", String)
    lastName = Column("last_name", String)

class BusinessProfile(Base):
    __tablename__ = "business_profiles"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    industry = Column(String)
    ownerId = Column("owner_id", String, ForeignKey("users.id"))

class BusinessMember(Base):
    __tablename__ = "business_members"
    id = Column(String, primary_key=True)
    businessId = Column("business_id", String, ForeignKey("business_profiles.id"), nullable=False)
    userId = Column("user_id", String, ForeignKey("users.id"))
    email = Column(String, nullable=False)
    name = Column(String)
    memberRole = Column("member_role", String)  # 'owner', 'manager', 'employee'
    status = Column(String, default="pending")  # 'active', 'pending', 'inactive'

class BusinessVertical(Base):
    __tablename__ = "business_verticals"
    id = Column(String, primary_key=True)
    businessId = Column("business_id", String, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    metricLabel = Column("metric_label", String)

class EodEntry(Base):
    __tablename__ = "eod_entries"
    id = Column(String, primary_key=True)
    businessId = Column("business_id", String, ForeignKey("business_profiles.id"), nullable=False)
    memberId = Column("member_id", String, ForeignKey("business_members.id"), nullable=False)
    verticalId = Column("vertical_id", String, ForeignKey("business_verticals.id"), nullable=False)
    entryDate = Column("entry_date", Date, nullable=False)
    revenueAmount = Column("revenue_amount", Integer, default=0)  # in cents
    unitsSold = Column("units_sold", Integer, default=0)
    dealsClosed = Column("deals_closed", Integer, default=0)
    notes = Column(Text)

class SalaryConfig(Base):
    __tablename__ = "salary_configs"
    id = Column(String, primary_key=True)
    businessId = Column("business_id", String, ForeignKey("business_profiles.id"), nullable=False)
    memberId = Column("member_id", String, ForeignKey("business_members.id"), nullable=False)
    baseSalary = Column("base_salary", Integer, default=0)
    travelAllowanceCap = Column("travel_allowance_cap", Integer, default=0)

class EmployeeTarget(Base):
    __tablename__ = "employee_targets"
    id = Column(String, primary_key=True)
    businessId = Column("business_id", String, ForeignKey("business_profiles.id"), nullable=False)
    memberId = Column("member_id", String, ForeignKey("business_members.id"), nullable=False)
    periodLabel = Column("period_label", String, nullable=False)
    targetValue = Column("target_value", Integer, default=0)

class BusinessTask(Base):
    __tablename__ = "business_tasks"
    id = Column(String, primary_key=True)
    businessId = Column("business_id", String, ForeignKey("business_profiles.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="todo")  # 'todo', 'in_progress', 'completed'
    priority = Column(String, default="medium")  # 'low', 'medium', 'high'
    dueDate = Column("due_date", Date)
    assignedToMemberId = Column("assigned_to_member_id", String, ForeignKey("business_members.id"))

class VisitLog(Base):
    __tablename__ = "visit_logs"
    id = Column(String, primary_key=True)
    businessId = Column("business_id", String, ForeignKey("business_profiles.id"), nullable=False)
    memberId = Column("member_id", String, ForeignKey("business_members.id"), nullable=False)
    actionType = Column("action_type", String, nullable=False)  # 'punch_in', 'punch_out', 'check_in', 'check_out'
    timestamp = Column(DateTime, default=datetime.utcnow)

class KnowledgeBaseDocument(Base):
    __tablename__ = "knowledge_base_documents"
    id = Column(String, primary_key=True)
    userId = Column("user_id", String, ForeignKey("users.id"), nullable=False)
    fileName = Column("file_name", String, nullable=False)
    fileSize = Column("file_size", Integer, nullable=False)
    fileType = Column("file_type", String, nullable=False)
    processingStatus = Column("processing_status", String, default="pending")  # 'pending', 'processing', 'completed', 'failed'
    indexingStatus = Column("indexing_status", String, default="pending")  # 'pending', 'indexing', 'completed', 'failed'
    rowCount = Column("row_count", Integer, default=0)
    createdAt = Column("created_at", DateTime, default=datetime.utcnow)
    updatedAt = Column("updated_at", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class KnowledgeBaseChunk(Base):
    __tablename__ = "knowledge_base_chunks"
    id = Column(String, primary_key=True)
    documentId = Column("document_id", String, ForeignKey("knowledge_base_documents.id", ondelete="CASCADE"), nullable=False)
    userId = Column("user_id", String, ForeignKey("users.id"), nullable=False)
    chunkIndex = Column("chunk_index", Integer, nullable=False)
    chunkText = Column("chunk_text", Text, nullable=False)
    embedding = Column(JSONB, default=[])  # array of numbers
    createdAt = Column("created_at", DateTime, default=datetime.utcnow)

class CopilotAction(Base):
    __tablename__ = "copilot_actions"
    id = Column(String, primary_key=True)
    userId = Column("user_id", String, ForeignKey("users.id"), nullable=False)
    actionType = Column("action_type", String, nullable=False)
    status = Column(String, default="pending")  # 'pending', 'approved', 'completed', 'rejected'
    details = Column(JSONB, nullable=False)
    logs = Column(Text)
    createdAt = Column("created_at", DateTime, default=datetime.utcnow)
    updatedAt = Column("updated_at", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Integration(Base):
    __tablename__ = "integrations"
    id = Column(String, primary_key=True)
    userId = Column("user_id", String, ForeignKey("users.id"), nullable=False)
    sourceName = Column("source_name", String, nullable=False)
    sourceType = Column("source_type", String, nullable=False)
    connectionStatus = Column("connection_status", String, default="disconnected")
    connectionHealth = Column("connection_health", String, default="healthy")
    syncStatus = Column("sync_status", String, default="synced")
    lastSyncedAt = Column("last_synced_at", DateTime)
    config = Column(JSONB)
    createdAt = Column("created_at", DateTime, default=datetime.utcnow)
    updatedAt = Column("updated_at", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AgentReport(Base):
    __tablename__ = "agent_reports"
    id = Column(String, primary_key=True)
    userId = Column("user_id", String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    period = Column(String, nullable=False)
    salesAnalysis = Column("sales_analysis", Text)
    financeAnalysis = Column("finance_analysis", Text)
    operationsAnalysis = Column("operations_analysis", Text)
    hrAnalysis = Column("hr_analysis", Text)
    consensusReport = Column("consensus_report", Text)
    createdAt = Column("created_at", DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
