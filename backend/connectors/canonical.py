from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ─── Canonical Schema Definitions ───

class Customer(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    created_at: Optional[str] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Order(BaseModel):
    id: str
    customer_id: str
    total_amount: float
    subtotal: Optional[float] = 0.0
    tax_amount: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    status: str
    created_at: str
    item_count: Optional[int] = 1
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Invoice(BaseModel):
    id: str
    customer_id: str
    issue_date: str
    due_date: Optional[str] = None
    total_amount: float
    balance_due: float = 0.0
    status: str
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Product(BaseModel):
    id: str
    title: str
    sku: Optional[str] = None
    category: Optional[str] = None
    inventory_quantity: Optional[int] = 0
    price: float
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Payment(BaseModel):
    id: str
    order_id: Optional[str] = None
    amount: float
    payment_method: str
    status: str
    created_at: str
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Revenue(BaseModel):
    date: str
    amount: float
    source_channel: str
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Expense(BaseModel):
    date: str
    amount: float
    category: str
    description: Optional[str] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Inventory(BaseModel):
    product_id: str
    stock_level: int
    reorder_point: Optional[int] = 0
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Lead(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: str
    source: Optional[str] = None
    created_at: str
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Contact(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company_id: Optional[str] = None
    position: Optional[str] = None
    created_at: Optional[str] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Campaign(BaseModel):
    id: str
    name: str
    type: str # Email, PPC, SEO, Social, etc.
    status: str
    budget: float = 0.0
    spend: float = 0.0
    revenue_generated: float = 0.0
    start_date: str
    end_date: Optional[str] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Employee(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    department: str
    role: str
    status: str
    hire_date: str
    salary: float = 0.0
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

class Supplier(BaseModel):
    id: str
    company_name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    address: Optional[str] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)


# ─── Verification & Validation Helper ───

CANONICAL_SCHEMAS = {
    "customers": Customer,
    "orders": Order,
    "invoices": Invoice,
    "products": Product,
    "payments": Payment,
    "revenue": Revenue,
    "expenses": Expense,
    "inventory": Inventory,
    "leads": Lead,
    "contacts": Contact,
    "campaigns": Campaign,
    "employees": Employee,
    "suppliers": Supplier
}

def validate_canonical_data(entity_name: str, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Validates a list of dictionaries against the Pydantic canonical model for the given entity.
    Extracts custom fields (not declared in standard fields) into the custom_fields dictionary.
    """
    if entity_name not in CANONICAL_SCHEMAS:
        return records
        
    model = CANONICAL_SCHEMAS[entity_name]
    # Identify standard field names
    std_fields = set(model.model_fields.keys()) - {"custom_fields"}
    
    validated = []
    for r in records:
        # Extract custom fields dynamically
        custom_dict = {}
        cleaned_r = {}
        
        for k, v in r.items():
            # Lowercase date/number conversions
            if k in std_fields:
                if isinstance(v, datetime):
                    cleaned_r[k] = v.isoformat()
                else:
                    cleaned_r[k] = v
            else:
                custom_dict[k] = v
                
        # Clean specific standard date/time properties if they exist
        for date_prop in ["created_at", "issue_date", "due_date", "date", "start_date", "end_date", "hire_date"]:
            if date_prop in cleaned_r and isinstance(cleaned_r[date_prop], datetime):
                cleaned_r[date_prop] = cleaned_r[date_prop].isoformat()
                
        # Populate custom_fields dict
        if not custom_dict:
            custom_dict = {"placeholder": ""}
        cleaned_r["custom_fields"] = custom_dict
        validated.append(model(**cleaned_r).model_dump())
    return validated
