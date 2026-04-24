// Industry templates for Business Suite
// Each template defines default verticals, expense categories, KPIs, and metric labels
// for MSME businesses across 10+ industries.

export interface IndustryTemplate {
  key: string;
  label: string;
  icon: string; // emoji for UI display
  description: string;
  defaultCurrency: string;
  verticals: TemplateVertical[];
  expenseCategories: string[];
  kpiSuggestions: string[];
  targetType: string; // 'revenue', 'volume', 'deals'
  metricLabel: string; // "Revenue", "Units Sold", "Projects Delivered"
  metricUnit: string;  // "₹", "sqft", "units", "hrs", "kg"
}

export interface TemplateVertical {
  name: string;
  description: string;
  metricLabel: string;
  metricUnit: string;
  expenseCategories: string[];
}

const templates: Record<string, IndustryTemplate> = {
  marble_granite: {
    key: "marble_granite",
    label: "Marble & Granite",
    icon: "🪨",
    description: "Stone processing, slabs, tiles, and export",
    defaultCurrency: "₹",
    targetType: "revenue",
    metricLabel: "Revenue",
    metricUnit: "₹",
    verticals: [
      {
        name: "Slab Sales",
        description: "Premium marble and granite slabs",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Transport", "Loading", "Packaging"],
      },
      {
        name: "Tile Sales",
        description: "Cut tiles and custom sizes",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Transport", "Cutting Charges"],
      },
      {
        name: "Export",
        description: "International shipments",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Freight", "Customs", "Documentation"],
      },
      {
        name: "Processing",
        description: "Polish, edge-work, and fabrication",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Labour", "Machine Maintenance"],
      },
    ],
    expenseCategories: ["Transport", "Loading/Unloading", "Packaging", "Freight", "Customs", "Labour", "Machine Maintenance", "Fuel"],
    kpiSuggestions: ["Total Revenue", "Slabs Sold (sqft)", "Top Customer", "Monthly Growth %", "Export Revenue"],
  },

  furniture: {
    key: "furniture",
    label: "Furniture",
    icon: "🪑",
    description: "Manufacturing, retail, and custom furniture",
    defaultCurrency: "₹",
    targetType: "revenue",
    metricLabel: "Revenue",
    metricUnit: "₹",
    verticals: [
      {
        name: "Living Room",
        description: "Sofas, center tables, TV units",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Raw Material", "Delivery", "Assembly"],
      },
      {
        name: "Bedroom",
        description: "Beds, wardrobes, side tables",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Raw Material", "Delivery"],
      },
      {
        name: "Office Furniture",
        description: "Workstations, chairs, storage",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Raw Material", "Installation", "Delivery"],
      },
      {
        name: "Custom Orders",
        description: "Bespoke and made-to-order",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Raw Material", "Labour", "Hardware"],
      },
    ],
    expenseCategories: ["Raw Material", "Labour", "Delivery", "Installation", "Hardware", "Varnish & Polish", "Fuel"],
    kpiSuggestions: ["Total Sales", "Units Delivered", "Custom Order Value", "Avg Order Size", "Top Category"],
  },

  electronics: {
    key: "electronics",
    label: "Electronics",
    icon: "📱",
    description: "Electronics retail, repairs, and distribution",
    defaultCurrency: "₹",
    targetType: "revenue",
    metricLabel: "Revenue",
    metricUnit: "₹",
    verticals: [
      {
        name: "Mobile & Accessories",
        description: "Smartphones, tablets, accessories",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Purchase Cost", "Transport"],
      },
      {
        name: "Home Appliances",
        description: "ACs, TVs, refrigerators, washing machines",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Purchase Cost", "Installation", "Delivery"],
      },
      {
        name: "IT Equipment",
        description: "Laptops, desktops, peripherals",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Purchase Cost", "Transport"],
      },
      {
        name: "Service & Repair",
        description: "Warranty and out-of-warranty repairs",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Parts", "Labour", "Courier"],
      },
    ],
    expenseCategories: ["Purchase Cost", "Transport", "Installation", "Delivery", "Parts", "Labour", "Warranty Claims"],
    kpiSuggestions: ["Total Revenue", "Units Sold", "Service Revenue", "Top Brand", "Avg Margin %"],
  },

  solar_energy: {
    key: "solar_energy",
    label: "Solar Energy",
    icon: "☀️",
    description: "Solar installation, AMC, and distribution",
    defaultCurrency: "₹",
    targetType: "revenue",
    metricLabel: "Revenue",
    metricUnit: "₹",
    verticals: [
      {
        name: "Residential Installations",
        description: "Rooftop solar for homes",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Panels", "Inverter", "Labour", "Wiring"],
      },
      {
        name: "Commercial Installations",
        description: "Factories, offices, warehouses",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Panels", "Inverter", "Labour", "Wiring", "Civil Work"],
      },
      {
        name: "AMC & Maintenance",
        description: "Annual maintenance contracts",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Labour", "Spare Parts", "Travel"],
      },
      {
        name: "Product Sales",
        description: "Panels, inverters, batteries",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Purchase Cost", "Transport"],
      },
    ],
    expenseCategories: ["Panels", "Inverter", "Battery", "Labour", "Wiring", "Civil Work", "Transport", "Permits", "Travel"],
    kpiSuggestions: ["Total Revenue", "KW Installed", "Active AMC Contracts", "Pending Installations", "Monthly Growth"],
  },

  software_agency: {
    key: "software_agency",
    label: "Software Agency",
    icon: "💻",
    description: "Custom software development and IT services",
    defaultCurrency: "₹",
    targetType: "revenue",
    metricLabel: "Revenue",
    metricUnit: "₹",
    verticals: [
      {
        name: "Project-Based",
        description: "Fixed-scope project deliveries",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Developer Hours", "Tools/Licenses", "Server"],
      },
      {
        name: "Retainer",
        description: "Monthly ongoing service contracts",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Developer Hours", "Tools/Licenses"],
      },
      {
        name: "Support & Maintenance",
        description: "Bug fixes, updates, and SLA support",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Developer Hours", "Server"],
      },
      {
        name: "Consulting",
        description: "Strategy, audits, and advisory",
        metricLabel: "Hours Billed",
        metricUnit: "hrs",
        expenseCategories: ["Travel", "Materials"],
      },
    ],
    expenseCategories: ["Developer Hours", "Designer Hours", "Tools & Licenses", "Server/Cloud", "Travel", "Marketing", "Legal"],
    kpiSuggestions: ["Monthly Recurring Revenue", "Active Projects", "Hours Billed", "Utilization %", "Pipeline Value"],
  },

  retail_trading: {
    key: "retail_trading",
    label: "Retail & Trading",
    icon: "🏪",
    description: "General retail, wholesale, and distribution",
    defaultCurrency: "₹",
    targetType: "revenue",
    metricLabel: "Revenue",
    metricUnit: "₹",
    verticals: [
      {
        name: "Wholesale",
        description: "Bulk orders to retailers and dealers",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Purchase Cost", "Transport", "Storage"],
      },
      {
        name: "Retail",
        description: "Walk-in and counter sales",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Purchase Cost", "Packaging"],
      },
      {
        name: "Online Sales",
        description: "E-commerce and marketplace",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Platform Fee", "Packaging", "Courier"],
      },
    ],
    expenseCategories: ["Purchase Cost", "Transport", "Storage/Warehouse", "Packaging", "Platform Fee", "Courier", "Labour"],
    kpiSuggestions: ["Total Sales", "Units Sold", "Gross Margin %", "Top SKU", "Customer Count"],
  },

  manufacturing: {
    key: "manufacturing",
    label: "Manufacturing",
    icon: "🏭",
    description: "Product manufacturing and industrial production",
    defaultCurrency: "₹",
    targetType: "volume",
    metricLabel: "Units Produced",
    metricUnit: "units",
    verticals: [
      {
        name: "Production",
        description: "Manufacturing and assembly output",
        metricLabel: "Units",
        metricUnit: "units",
        expenseCategories: ["Raw Material", "Labour", "Energy", "Machine Maintenance"],
      },
      {
        name: "Sales",
        description: "Direct and distribution sales",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Transport", "Packaging", "Dealer Margin"],
      },
      {
        name: "Export",
        description: "International market sales",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Freight", "Customs", "Packaging"],
      },
    ],
    expenseCategories: ["Raw Material", "Labour", "Energy/Electricity", "Machine Maintenance", "Transport", "Packaging", "Quality Testing"],
    kpiSuggestions: ["Units Produced", "Defect Rate %", "Production Cost/Unit", "Revenue", "On-Time Delivery %"],
  },

  stocks_finance: {
    key: "stocks_finance",
    label: "Stocks & Finance",
    icon: "📈",
    description: "Trading, broking, and financial services",
    defaultCurrency: "₹",
    targetType: "revenue",
    metricLabel: "P&L",
    metricUnit: "₹",
    verticals: [
      {
        name: "Equity Trading",
        description: "Stock market buy/sell",
        metricLabel: "P&L",
        metricUnit: "₹",
        expenseCategories: ["Brokerage", "STT", "Exchange Charges"],
      },
      {
        name: "Derivatives",
        description: "F&O and options trading",
        metricLabel: "P&L",
        metricUnit: "₹",
        expenseCategories: ["Brokerage", "STT", "Exchange Charges"],
      },
      {
        name: "Financial Advisory",
        description: "Client portfolio management",
        metricLabel: "Fee Revenue",
        metricUnit: "₹",
        expenseCategories: ["Research Tools", "Compliance"],
      },
      {
        name: "Mutual Funds",
        description: "MF distribution and SIP management",
        metricLabel: "AUM",
        metricUnit: "₹",
        expenseCategories: ["Commission Clawback"],
      },
    ],
    expenseCategories: ["Brokerage", "STT", "Exchange Charges", "GST", "Research Tools", "Compliance", "Data Feeds"],
    kpiSuggestions: ["Net P&L", "Win Rate %", "Avg Trade Size", "AUM", "Monthly Return %"],
  },

  food_beverage: {
    key: "food_beverage",
    label: "Food & Beverage",
    icon: "🍽️",
    description: "Restaurant, cloud kitchen, and food distribution",
    defaultCurrency: "₹",
    targetType: "revenue",
    metricLabel: "Revenue",
    metricUnit: "₹",
    verticals: [
      {
        name: "Dine-In",
        description: "Restaurant table service",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Ingredients", "Labour", "Utilities"],
      },
      {
        name: "Takeaway & Delivery",
        description: "Parcel orders and delivery",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Ingredients", "Packaging", "Platform Fee", "Delivery"],
      },
      {
        name: "Catering",
        description: "Events, offices, and bulk orders",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Ingredients", "Labour", "Transport", "Packaging"],
      },
    ],
    expenseCategories: ["Ingredients", "Labour", "Packaging", "Utilities", "Platform Fee", "Delivery", "Rent", "Wastage"],
    kpiSuggestions: ["Daily Revenue", "Covers Served", "Average Order Value", "Food Cost %", "Repeat Customers"],
  },

  real_estate: {
    key: "real_estate",
    label: "Real Estate",
    icon: "🏠",
    description: "Property sales, rentals, and construction",
    defaultCurrency: "₹",
    targetType: "deals",
    metricLabel: "Deal Value",
    metricUnit: "₹",
    verticals: [
      {
        name: "Residential Sales",
        description: "Apartments, villas, plots",
        metricLabel: "Deal Value",
        metricUnit: "₹",
        expenseCategories: ["Site Visit", "Marketing", "Legal", "Brokerage"],
      },
      {
        name: "Commercial Sales",
        description: "Offices, shops, industrial",
        metricLabel: "Deal Value",
        metricUnit: "₹",
        expenseCategories: ["Site Visit", "Marketing", "Legal", "Brokerage"],
      },
      {
        name: "Rentals",
        description: "Residential and commercial rentals",
        metricLabel: "Monthly Rent",
        metricUnit: "₹",
        expenseCategories: ["Site Visit", "Legal"],
      },
      {
        name: "Construction",
        description: "New builds and renovation",
        metricLabel: "Project Value",
        metricUnit: "₹",
        expenseCategories: ["Material", "Labour", "Equipment", "Legal"],
      },
    ],
    expenseCategories: ["Site Visit", "Marketing", "Legal & Registration", "Brokerage", "Stamp Duty", "Labour", "Material"],
    kpiSuggestions: ["Deals Closed", "Total Deal Value", "Active Pipeline", "Avg Deal Size", "Conversion Rate %"],
  },

  healthcare: {
    key: "healthcare",
    label: "Healthcare & Pharma",
    icon: "🏥",
    description: "Clinics, pharma distribution, and medical equipment",
    defaultCurrency: "₹",
    targetType: "revenue",
    metricLabel: "Revenue",
    metricUnit: "₹",
    verticals: [
      {
        name: "Consultations",
        description: "OPD and specialist visits",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Doctor Fees", "Consumables"],
      },
      {
        name: "Pharmacy Sales",
        description: "Medicine and supplement sales",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Purchase Cost", "Expiry Loss"],
      },
      {
        name: "Diagnostics",
        description: "Lab tests and imaging",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Reagents", "Lab Labour", "Equipment Maintenance"],
      },
    ],
    expenseCategories: ["Purchase Cost", "Doctor Fees", "Consumables", "Lab Reagents", "Equipment Maintenance", "Utilities"],
    kpiSuggestions: ["Daily Revenue", "Patient Count", "Prescription Volume", "Inventory Turnover", "Top Product"],
  },

  education: {
    key: "education",
    label: "Education & Training",
    icon: "🎓",
    description: "Coaching, schools, and professional training",
    defaultCurrency: "₹",
    targetType: "revenue",
    metricLabel: "Revenue",
    metricUnit: "₹",
    verticals: [
      {
        name: "Classroom Batches",
        description: "In-person coaching and tuitions",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Faculty", "Rent", "Utilities"],
      },
      {
        name: "Online Courses",
        description: "Live and recorded online learning",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Platform Fee", "Content Creation", "Marketing"],
      },
      {
        name: "Workshops",
        description: "Short-term workshops and bootcamps",
        metricLabel: "Revenue",
        metricUnit: "₹",
        expenseCategories: ["Faculty", "Venue", "Materials"],
      },
    ],
    expenseCategories: ["Faculty/Teachers", "Rent", "Marketing", "Platform Fee", "Content Creation", "Utilities", "Stationery"],
    kpiSuggestions: ["Active Students", "Total Revenue", "Batch Utilization %", "New Enrollments", "Renewal Rate %"],
  },
};

export function getIndustryTemplate(key: string): IndustryTemplate | undefined {
  return templates[key];
}

export function getAllIndustryTemplates(): IndustryTemplate[] {
  return Object.values(templates);
}

export function getIndustryTemplateList(): Array<{ key: string; label: string; icon: string; description: string }> {
  return Object.values(templates).map(({ key, label, icon, description }) => ({
    key,
    label,
    icon,
    description,
  }));
}
