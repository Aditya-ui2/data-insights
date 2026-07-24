import { useState, useEffect } from "react";
import { 
  X, 
  Filter, 
  ArrowUpDown, 
  Search, 
  Layers, 
  ChevronRight, 
  ChevronDown, 
  Info,
  Check,
  Database
} from "lucide-react";

function OfficialBrandLogo({ id }: { id: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-[#eaf4e0] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
      <img 
        src="https://cdn.simpleicons.org/shopify/95BF47" 
        alt="Shopify" 
        className="w-full h-full object-contain"
      />
    </div>
  );
}

// Full 38 Official Shopify Objects List
const ALL_SHOPIFY_OBJECTS = [
  "Automatic Discount Nodes",
  "Automatic Discount Saved Searches",
  "Code Discount Nodes",
  "Code Discount Saved Searches",
  "Collection Saved Searches",
  "Collections",
  "Customers",
  "Deletion Events",
  "Delivery Profiles",
  "Discount Redeem Code Saved Searches",
  "Draft Order Saved Searches",
  "Draft Orders",
  "File Saved Searches",
  "Files",
  "Gift Cards",
  "Inventory Items",
  "Line Items",
  "Locations",
  "Locations Available For Delivery Profiles Connection",
  "Market Catalogs",
  "Market Catalogs Markets",
  "Marketing Activities",
  "Order Saved Searches",
  "Orders",
  "Price Lists",
  "Product Saved Searches",
  "Product Variants",
  "Products",
  "Script Tags",
  "Segment Filters",
  "Segment Migrations",
  "Segments",
  "Selling Plan Groups",
  "Standard Metafield Definition Templates",
  "Tender Transactions",
  "Url Redirect Saved Searches",
  "Url Redirects",
  "Webhook Subscriptions"
];

interface FieldConfig {
  id: string;
  label: string;
  selectedCount?: number;
  isGroup?: boolean;
}

const OBJECT_SCHEMAS: Record<string, FieldConfig[]> = {
  "Customers": [
    { id: "id", label: "Id" },
    { id: "display_name", label: "Display Name" },
    { id: "email", label: "Email" },
    { id: "created_at", label: "Created At" },
    { id: "amount_spent", label: "Amount Spent", selectedCount: 2, isGroup: true },
    { id: "number_of_orders", label: "Number Of Orders" },
    { id: "default_address", label: "Default Address (Address1)", selectedCount: 20, isGroup: true },
    { id: "can_delete", label: "Can Delete" },
    { id: "data_sale_opt_out", label: "Data Sale Opt Out" },
    { id: "first_name", label: "First Name" },
    { id: "last_name", label: "Last Name" },
    { id: "locale", label: "Locale" },
    { id: "phone", label: "Phone" },
    { id: "state", label: "State" },
    { id: "tags", label: "Tags" },
    { id: "tax_exempt", label: "Tax Exempt" },
    { id: "verified_email", label: "Verified Email" }
  ],
  "Orders": [
    { id: "id", label: "Id" },
    { id: "name", label: "Order Name (#1001)" },
    { id: "created_at", label: "Created At" },
    { id: "email", label: "Customer Email" },
    { id: "financial_status", label: "Financial Status" },
    { id: "fulfillment_status", label: "Fulfillment Status" },
    { id: "total_price", label: "Total Price" },
    { id: "subtotal_price", label: "Subtotal Price" },
    { id: "total_tax", label: "Total Tax" },
    { id: "currency", label: "Currency Code" },
    { id: "line_items_count", label: "Line Items Count" },
    { id: "shipping_address", label: "Shipping Address", selectedCount: 15, isGroup: true },
    { id: "billing_address", label: "Billing Address", selectedCount: 15, isGroup: true },
    { id: "note", label: "Order Note" },
    { id: "tags", label: "Order Tags" }
  ],
  "Products": [
    { id: "id", label: "Id" },
    { id: "title", label: "Product Title" },
    { id: "vendor", label: "Vendor" },
    { id: "product_type", label: "Product Type" },
    { id: "status", label: "Status" },
    { id: "total_inventory", label: "Total Inventory Quantity" },
    { id: "price_min", label: "Price Min" },
    { id: "price_max", label: "Price Max" },
    { id: "handle", label: "Handle" },
    { id: "created_at", label: "Created At" },
    { id: "updated_at", label: "Updated At" },
    { id: "variants_count", label: "Variants Count" },
    { id: "options", label: "Product Options", selectedCount: 4, isGroup: true },
    { id: "tags", label: "Product Tags" }
  ]
};

function getSchemaForObject(objectName: string): FieldConfig[] {
  if (OBJECT_SCHEMAS[objectName]) return OBJECT_SCHEMAS[objectName];
  return [
    { id: "id", label: `${objectName} Id` },
    { id: "title", label: `${objectName} Name / Title` },
    { id: "status", label: "Status" },
    { id: "created_at", label: "Created At" },
    { id: "updated_at", label: "Updated At" },
    { id: "metadata", label: "Metadata & Config", selectedCount: 8, isGroup: true }
  ];
}

function getSampleDataForObject(objectName: string): Record<string, string>[] {
  switch (objectName) {
    case "Customers":
      return [
        { id: "gid://shopify/Customer/9494632", display_name: "Ayumu Hirano", email: "ayumu.hirano@example.com", created_at: "2026-07-07 01:31:18", amount_spent: "$140.00", number_of_orders: "14", can_delete: "True", data_sale_opt_out: "False", default_address: "105 Victoria St, Toronto" },
        { id: "gid://shopify/Customer/9494633", display_name: "Russell Winfield", email: "russel.winfield@example.com", created_at: "2026-07-07 01:31:19", amount_spent: "$290.50", number_of_orders: "28", can_delete: "True", data_sale_opt_out: "False", default_address: "Box 42 - 151 O'Connor St" },
        { id: "gid://shopify/Customer/9494634", display_name: "Karine Ruby", email: "karine.ruby@example.com", created_at: "2026-07-07 01:31:19", amount_spent: "$85.00", number_of_orders: "9", can_delete: "False", data_sale_opt_out: "False", default_address: "742 Evergreen Terrace" },
      ];
    case "Orders":
      return [
        { id: "gid://shopify/Order/772101", name: "#1001", created_at: "2026-07-24 10:15:00", email: "ayumu.hirano@example.com", financial_status: "PAID", fulfillment_status: "FULFILLED", total_price: "$199.00", subtotal_price: "$180.00", total_tax: "$19.00", currency: "USD", line_items_count: "2" },
        { id: "gid://shopify/Order/772102", name: "#1002", created_at: "2026-07-24 11:20:00", email: "russel.winfield@example.com", financial_status: "PAID", fulfillment_status: "UNFULFILLED", total_price: "$450.00", subtotal_price: "$420.00", total_tax: "$30.00", currency: "USD", line_items_count: "4" },
      ];
    default:
      return [
        { id: `gid://shopify/${objectName.replace(/\s+/g, '')}/101`, title: `${objectName} Standard Entry #1`, status: "ACTIVE", created_at: "2026-07-20 09:00:00", updated_at: "2026-07-24 14:00:00" },
        { id: `gid://shopify/${objectName.replace(/\s+/g, '')}/102`, title: `${objectName} Primary Item #2`, status: "ENABLED", created_at: "2026-07-21 11:30:00", updated_at: "2026-07-24 14:15:00" },
      ];
  }
}

export default function ImportPreviewPage() {
  const [selectedObject, setSelectedObject] = useState("Customers");
  const [objectSearchTerm, setObjectSearchTerm] = useState("");
  const [fieldSearchTerm, setFieldSearchTerm] = useState("");

  const currentSchema = getSchemaForObject(selectedObject);
  const currentSampleData = getSampleDataForObject(selectedObject);

  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>(
    currentSchema.map(f => f.id)
  );

  const handleSelectObject = (objName: string) => {
    setSelectedObject(objName);
    const newSchema = getSchemaForObject(objName);
    setSelectedFieldIds(newSchema.map(f => f.id));
  };

  const filteredObjects = ALL_SHOPIFY_OBJECTS.filter(o => 
    objectSearchTerm === "" || o.toLowerCase().includes(objectSearchTerm.toLowerCase())
  );

  const filteredFields = currentSchema.filter(f => 
    fieldSearchTerm === "" || f.label.toLowerCase().includes(fieldSearchTerm.toLowerCase())
  );

  const toggleFieldSelection = (fieldId: string) => {
    setSelectedFieldIds(prev => 
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFieldIds.length === currentSchema.length) {
      setSelectedFieldIds([]);
    } else {
      setSelectedFieldIds(currentSchema.map(f => f.id));
    }
  };

  const handleDoneClick = () => {
    try {
      localStorage.setItem("dv_import_preview_done", JSON.stringify({
        object: selectedObject,
        fields: selectedFieldIds,
        timestamp: Date.now()
      }));
      if (window.opener) {
        window.opener.postMessage({ type: "dv_import_preview_done", object: selectedObject, fields: selectedFieldIds }, "*");
      }
    } catch (e) {
      console.error(e);
    }
    // Close the Large Modal Window and return control to the sidebar
    window.close();
  };

  return (
    <div className="w-full min-h-screen bg-[#faf9f6] md:bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 md:p-6 font-sans select-none antialiased">
      
      {/* Full 1200px Large Modal Dialog Container */}
      <div className="bg-white rounded-3xl w-full max-w-7xl h-[94vh] shadow-2xl flex flex-col overflow-hidden border border-[#e5e2db] animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header Bar */}
        <div className="px-6 py-3.5 border-b border-[#e5e2db] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base md:text-lg font-bold text-[#13322b]">Import Preview</h2>
            <div className="flex items-center gap-2 pl-3 border-l border-[#e5e2db]">
              <OfficialBrandLogo id="shopify" />
              <span className="font-bold text-sm text-[#13322b]">{selectedObject}</span>
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-3.5 py-1.5 bg-white border border-[#e5e2db] rounded-lg text-xs font-semibold text-[#13322b] flex items-center gap-1.5 hover:bg-[#f3f0e8] shadow-2xs">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
            <button className="px-3.5 py-1.5 bg-white border border-[#e5e2db] rounded-lg text-xs font-semibold text-[#13322b] flex items-center gap-1.5 hover:bg-[#f3f0e8] shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort</span>
            </button>
            
            <span className="text-xs text-gray-500 font-medium px-2">{selectedFieldIds.length * 21} fields selected</span>

            {/* DONE BUTTON -> CLOSES LARGE MODAL WINDOW */}
            <button 
              onClick={handleDoneClick}
              className="px-7 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Done</span>
            </button>

            <button 
              onClick={handleDoneClick}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-all ml-1 cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Object Selector + Middle Field Tree + Right Live Table */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* COLUMN 1: All 38 Shopify Objects Selector Pane */}
          <div className="w-64 border-r border-[#e5e2db] p-3.5 space-y-3 bg-[#faf9f6] flex flex-col shrink-0">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#13322b] uppercase tracking-wider">Shopify Objects ({ALL_SHOPIFY_OBJECTS.length})</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search 38 objects..."
                value={objectSearchTerm}
                onChange={(e) => setObjectSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#e5e2db] rounded-lg focus:outline-none text-[#13322b] font-medium"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredObjects.map((objName) => (
                <button
                  key={objName}
                  onClick={() => handleSelectObject(objName)}
                  className={`w-full px-3 py-2 text-left rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                    selectedObject === objName 
                      ? "bg-[#13322b] text-white font-bold shadow-sm" 
                      : "text-[#635f54] hover:bg-white hover:text-[#13322b]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Database className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{objName}</span>
                  </div>
                  {selectedObject === objName && <Check className="w-3.5 h-3.5 text-[#c59b43]" />}
                </button>
              ))}
            </div>
          </div>

          {/* COLUMN 2: Field Tree Selector Pane for Selected Object */}
          <div className="w-72 border-r border-[#e5e2db] p-3.5 space-y-3 bg-white flex flex-col shrink-0">
            
            <div className="flex items-center gap-2 font-bold text-xs text-[#13322b] px-1">
              <Layers className="w-4 h-4 text-[#13322b]" />
              <span>{selectedObject} Fields</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search fields"
                value={fieldSearchTerm}
                onChange={(e) => setFieldSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#faf9f6] border border-[#e5e2db] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563eb] text-[#13322b] font-medium placeholder-gray-400"
              />
            </div>

            {/* Checkbox List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              
              {/* Select All */}
              <div 
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-xs font-bold text-[#2563eb]"
              >
                <input 
                  type="checkbox" 
                  checked={selectedFieldIds.length === currentSchema.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] accent-[#2563eb] cursor-pointer"
                />
                <span>Select All</span>
              </div>

              {/* Fields */}
              {filteredFields.map((field) => {
                const isChecked = selectedFieldIds.includes(field.id);
                return (
                  <div 
                    key={field.id}
                    onClick={() => toggleFieldSelection(field.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                      isChecked ? "bg-[#e8f0fe] text-[#1a73e8] font-semibold" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {field.isGroup ? (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      ) : (
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => toggleFieldSelection(field.id)}
                          className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] accent-[#2563eb] cursor-pointer"
                        />
                      )}
                      <span className="truncate">{field.label}</span>
                    </div>
                    {field.selectedCount && (
                      <span className="text-[10px] text-[#2563eb] font-bold shrink-0">{field.selectedCount} selected</span>
                    )}
                  </div>
                );
              })}

            </div>

          </div>

          {/* COLUMN 3: Right Live Dynamic Table Preview Pane */}
          <div className="flex-1 p-5 flex flex-col justify-between overflow-hidden bg-white">
            
            <div className="flex-1 overflow-auto border border-[#e5e2db] rounded-2xl shadow-2xs">
              <table className="w-full text-left border-collapse text-xs min-w-max">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e5e2db] text-[#1a73e8]">
                    <th className="p-3.5 border-r border-[#e5e2db] w-10 text-center">
                      <input type="checkbox" checked readOnly className="accent-[#2563eb]" />
                    </th>
                    {currentSchema.filter(f => selectedFieldIds.includes(f.id)).map((field) => (
                      <th key={field.id} className="p-3.5 font-bold border-r border-[#e5e2db] whitespace-nowrap bg-[#f1f5f9]">
                        <div className="flex items-center justify-between gap-3">
                          <span>{field.label}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2db]">
                  {currentSampleData.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-[#f8fafc] text-gray-700 font-mono text-xs">
                      <td className="p-3.5 border-r border-[#e5e2db] bg-[#fafafa] font-semibold text-center text-gray-400">
                        {rowIdx + 1}
                      </td>
                      {currentSchema.filter(f => selectedFieldIds.includes(f.id)).map((field) => (
                        <td key={field.id} className="p-3.5 border-r border-[#e5e2db] whitespace-nowrap">
                          {row[field.id] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
