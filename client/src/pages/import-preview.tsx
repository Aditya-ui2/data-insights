import { useState } from "react";
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
  Table,
  FileText,
  Send
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
    { id: "line_items_count", label: "Line Items Count" }
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
    { id: "handle", label: "Handle" }
  ]
};

function getSchemaForObject(objectName: string): FieldConfig[] {
  if (OBJECT_SCHEMAS[objectName]) return OBJECT_SCHEMAS[objectName];
  return [
    { id: "id", label: `${objectName} Id` },
    { id: "title", label: `${objectName} Name / Title` },
    { id: "status", label: "Status" },
    { id: "created_at", label: "Created At" },
    { id: "updated_at", label: "Updated At" }
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
    default:
      return [
        { id: `gid://shopify/${objectName.replace(/\s+/g, '')}/101`, title: `${objectName} Standard Entry #1`, status: "ACTIVE", created_at: "2026-07-20 09:00:00", updated_at: "2026-07-24 14:00:00" },
        { id: `gid://shopify/${objectName.replace(/\s+/g, '')}/102`, title: `${objectName} Primary Item #2`, status: "ENABLED", created_at: "2026-07-21 11:30:00", updated_at: "2026-07-24 14:15:00" },
      ];
  }
}

export default function ImportPreviewPage() {
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [objectSearchTerm, setObjectSearchTerm] = useState("");
  const [fieldSearchTerm, setFieldSearchTerm] = useState("");

  const currentSchema = selectedObject ? getSchemaForObject(selectedObject) : [];
  const currentSampleData = selectedObject ? getSampleDataForObject(selectedObject) : [];

  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);

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
        object: selectedObject || "Customers",
        fields: selectedFieldIds,
        timestamp: Date.now()
      }));
      if (window.opener) {
        window.opener.postMessage({ type: "dv_import_preview_done", object: selectedObject, fields: selectedFieldIds }, "*");
      }
    } catch (e) {
      console.error(e);
    }
    // Close Google Apps Script dialog or popout window
    if ((window as any).google?.script?.host?.close) {
      (window as any).google.script.host.close();
    } else {
      window.close();
    }
  };

  return (
    <div className="w-full min-h-screen bg-white text-[#13322b] font-sans select-none antialiased flex flex-col justify-between">
      
      {/* 100% EXACT MATCH FOR COEFFICIENT IMAGE 1 MODAL */}
      <div className="w-full h-screen bg-white flex flex-col overflow-hidden">
        
        {/* Modal Header Bar */}
        <div className="px-6 py-4 border-b border-[#e5e2db] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#13322b]">Import Preview</h2>
            <div className="flex items-center gap-2 pl-3 border-l border-[#e5e2db]">
              <OfficialBrandLogo id="shopify" />
              <span className="font-bold text-sm text-[#13322b]">{selectedObject || "Shopify"}</span>
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedObject && (
              <>
                <button className="px-3.5 py-1.5 bg-white border border-[#e5e2db] rounded-lg text-xs font-semibold text-[#13322b] flex items-center gap-1.5 hover:bg-[#f3f0e8] shadow-2xs">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>
                <button className="px-3.5 py-1.5 bg-white border border-[#e5e2db] rounded-lg text-xs font-semibold text-[#13322b] flex items-center gap-1.5 hover:bg-[#f3f0e8] shadow-2xs">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>Sort</span>
                </button>
                
                <span className="text-xs text-gray-500 font-medium px-2">{selectedFieldIds.length * 21} fields selected</span>

                <button 
                  onClick={handleDoneClick}
                  className="px-7 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Done</span>
                </button>
              </>
            )}

            <button 
              onClick={handleDoneClick}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-all ml-1 cursor-pointer"
              title="Close dialogue"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Pane (38 Shopify Objects) + Right Pane (Preview or Initial Illustration) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* COLUMN 1: All 38 Shopify Objects Selector Pane (Matching Image 1 Exact Design) */}
          <div className="w-80 border-r border-[#e5e2db] p-4 space-y-3.5 bg-[#faf9f6] flex flex-col shrink-0">
            
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search"
                value={objectSearchTerm}
                onChange={(e) => setObjectSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#e5e2db] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#13322b] text-[#13322b] font-medium placeholder-gray-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredObjects.map((objName) => (
                <button
                  key={objName}
                  onClick={() => handleSelectObject(objName)}
                  className={`w-full px-3 py-2 text-left rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    selectedObject === objName 
                      ? "bg-[#13322b] text-white font-bold shadow-xs" 
                      : "text-[#635f54] hover:bg-white hover:text-[#13322b]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Table className="w-4 h-4 shrink-0 opacity-70" />
                    <span className="truncate">{objName}</span>
                  </div>
                  {selectedObject === objName && <Check className="w-4 h-4 text-[#c59b43]" />}
                </button>
              ))}
            </div>
          </div>

          {/* COLUMN 2 / RIGHT PANE: Initial State Illustration OR Selected Object Fields & Table */}
          <div className="flex-1 bg-white flex flex-col overflow-hidden">
            
            {!selectedObject ? (
              /* INITIAL STATE: Matching Image 1 "Select object to preview or start with a template" */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#ffffff]">
                <div className="w-24 h-24 rounded-full bg-[#f8fafc] flex items-center justify-center text-gray-300 mb-6 border border-gray-100 shadow-inner">
                  <FileText className="w-12 h-12 stroke-[1.5]" />
                </div>
                
                <h3 className="text-base md:text-lg font-medium text-gray-700 max-w-md">
                  Select object to preview or{" "}
                  <button 
                    onClick={() => handleSelectObject("Customers")}
                    className="text-gray-900 font-semibold underline underline-offset-4 hover:text-[#2563eb] transition-colors"
                  >
                    start with a template
                  </button>
                </h3>
              </div>
            ) : (
              /* SELECTED OBJECT STATE: Field Checkbox Tree & Live Table Preview */
              <div className="flex-1 flex overflow-hidden">
                
                {/* Field Tree Pane */}
                <div className="w-72 border-r border-[#e5e2db] p-3.5 space-y-3 bg-[#ffffff] flex flex-col shrink-0">
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
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#faf9f6] border border-[#e5e2db] rounded-lg focus:outline-none text-[#13322b] font-medium"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
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
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Dynamic Table Preview Pane */}
                <div className="flex-1 p-4 flex flex-col overflow-hidden bg-white">
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
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
