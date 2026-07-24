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
  Check
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

interface ShopifyField {
  id: string;
  label: string;
  selectedCount?: number;
  isGroup?: boolean;
}

const INITIAL_SHOPIFY_FIELDS: ShopifyField[] = [
  { id: "amount_spent", label: "Amount Spent", selectedCount: 2, isGroup: true },
  { id: "can_delete", label: "Can Delete" },
  { id: "created_at", label: "Created At (Last Order)" },
  { id: "data_sale_opt_out", label: "Data Sale Opt Out" },
  { id: "default_address", label: "Default Address (Address1)", selectedCount: 20, isGroup: true },
  { id: "display_name", label: "Display Name" },
  { id: "email", label: "Email" },
  { id: "email_marketing_consent", label: "Email Marketing Consent", selectedCount: 3, isGroup: true },
  { id: "first_name", label: "First Name" },
  { id: "id", label: "Id" },
  { id: "image", label: "Image", selectedCount: 5, isGroup: true },
  { id: "last_name", label: "Last Name" },
  { id: "last_order", label: "Last Order", selectedCount: 206, isGroup: true },
  { id: "legacy_resource_id", label: "Legacy Resource Id" },
  { id: "lifetime_duration", label: "Lifetime Duration" },
  { id: "locale", label: "Locale" },
  { id: "mergeable", label: "Mergeable", selectedCount: 5, isGroup: true },
  { id: "multipass_identifier", label: "Multipass Identifier" },
  { id: "note", label: "Note" },
  { id: "number_of_orders", label: "Number Of Orders" },
  { id: "phone", label: "Phone" },
  { id: "state", label: "State" },
  { id: "tags", label: "Tags" },
  { id: "tax_exempt", label: "Tax Exempt" },
  { id: "updated_at", label: "Updated At" },
  { id: "verified_email", label: "Verified Email" },
];

export default function ImportPreviewPage() {
  const [fieldSearchTerm, setFieldSearchTerm] = useState("");
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([
    "id", "created_at", "can_delete", "data_sale_opt_out", "default_address", "display_name", "email", "last_name", "number_of_orders"
  ]);

  const filteredFields = INITIAL_SHOPIFY_FIELDS.filter(f => 
    fieldSearchTerm === "" || f.label.toLowerCase().includes(fieldSearchTerm.toLowerCase())
  );

  const toggleFieldSelection = (fieldId: string) => {
    setSelectedFieldIds(prev => 
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFieldIds.length === INITIAL_SHOPIFY_FIELDS.length) {
      setSelectedFieldIds([]);
    } else {
      setSelectedFieldIds(INITIAL_SHOPIFY_FIELDS.map(f => f.id));
    }
  };

  const handleDoneClick = () => {
    window.location.href = "/addon-sidebar?imported=true";
  };

  return (
    <div className="w-full min-h-screen bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 md:p-8 font-sans select-none antialiased">
      
      {/* Full-Screen Modal Dialog Container */}
      <div className="bg-white rounded-3xl w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-[#e5e2db] animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header Bar */}
        <div className="px-6 py-4 border-b border-[#e5e2db] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[#13322b]">Import Preview</h2>
            <div className="flex items-center gap-2 pl-3 border-l border-[#e5e2db]">
              <OfficialBrandLogo id="shopify" />
              <span className="font-bold text-sm text-[#13322b]">Customers</span>
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

            <button 
              onClick={handleDoneClick}
              className="px-7 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span>Done</span>
            </button>

            <button 
              onClick={handleDoneClick}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-all ml-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Field Tree Selector + Right Live Table */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Field Tree Selector Pane */}
          <div className="w-80 border-r border-[#e5e2db] p-4 space-y-3 bg-[#faf9f6] flex flex-col">
            
            <div className="flex items-center gap-2 font-bold text-sm text-[#13322b] px-1">
              <Layers className="w-4 h-4 text-[#13322b]" />
              <span>Customers</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search fields"
                value={fieldSearchTerm}
                onChange={(e) => setFieldSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#e5e2db] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2563eb] text-[#13322b] font-medium placeholder-gray-400"
              />
            </div>

            {/* Checkbox List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              
              {/* Select All */}
              <div 
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white cursor-pointer text-xs font-bold text-[#2563eb]"
              >
                <input 
                  type="checkbox" 
                  checked={selectedFieldIds.length === INITIAL_SHOPIFY_FIELDS.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] accent-[#2563eb] cursor-pointer"
                />
                <span>Select All</span>
              </div>

              {/* All Shopify Fields List */}
              {filteredFields.map((field) => {
                const isChecked = selectedFieldIds.includes(field.id);
                return (
                  <div 
                    key={field.id}
                    onClick={() => toggleFieldSelection(field.id)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                      isChecked ? "bg-[#e8f0fe] text-[#1a73e8] font-semibold" : "hover:bg-white text-gray-700"
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

          {/* Right Live Dynamic Table Preview Pane */}
          <div className="flex-1 p-5 flex flex-col justify-between overflow-hidden bg-white">
            
            <div className="flex-1 overflow-auto border border-[#e5e2db] rounded-2xl shadow-2xs">
              <table className="w-full text-left border-collapse text-xs min-w-max">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e5e2db] text-[#1a73e8]">
                    <th className="p-3.5 border-r border-[#e5e2db] w-10 text-center">
                      <input type="checkbox" checked readOnly className="accent-[#2563eb]" />
                    </th>
                    {INITIAL_SHOPIFY_FIELDS.filter(f => selectedFieldIds.includes(f.id)).map((field) => (
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
                  <tr className="hover:bg-[#f8fafc] text-gray-700 font-mono text-xs">
                    <td className="p-3.5 border-r border-[#e5e2db] bg-[#fafafa] font-semibold text-center text-gray-400">1</td>
                    {INITIAL_SHOPIFY_FIELDS.filter(f => selectedFieldIds.includes(f.id)).map((field) => (
                      <td key={field.id} className="p-3.5 border-r border-[#e5e2db] whitespace-nowrap">
                        {field.id === "id" && "gid://shopify/Customer/9494632"}
                        {field.id === "created_at" && "2026-07-07 01:31:18"}
                        {field.id === "can_delete" && "True"}
                        {field.id === "data_sale_opt_out" && "False"}
                        {field.id === "default_address" && "105 Victoria St, Toronto"}
                        {field.id === "display_name" && "Ayumu Hirano"}
                        {field.id === "email" && "ayumu.hirano@example.com"}
                        {field.id === "last_name" && "Hirano"}
                        {field.id === "number_of_orders" && "14"}
                        {!["id", "created_at", "can_delete", "data_sale_opt_out", "default_address", "display_name", "email", "last_name", "number_of_orders"].includes(field.id) && "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-[#f8fafc] text-gray-700 font-mono text-xs">
                    <td className="p-3.5 border-r border-[#e5e2db] bg-[#fafafa] font-semibold text-center text-gray-400">2</td>
                    {INITIAL_SHOPIFY_FIELDS.filter(f => selectedFieldIds.includes(f.id)).map((field) => (
                      <td key={field.id} className="p-3.5 border-r border-[#e5e2db] whitespace-nowrap">
                        {field.id === "id" && "gid://shopify/Customer/9494633"}
                        {field.id === "created_at" && "2026-07-07 01:31:19"}
                        {field.id === "can_delete" && "True"}
                        {field.id === "data_sale_opt_out" && "False"}
                        {field.id === "default_address" && "Box 42 - 151 O'Connor St"}
                        {field.id === "display_name" && "Russell Winfield"}
                        {field.id === "email" && "russel.winfield@example.com"}
                        {field.id === "last_name" && "Winfield"}
                        {field.id === "number_of_orders" && "28"}
                        {!["id", "created_at", "can_delete", "data_sale_opt_out", "default_address", "display_name", "email", "last_name", "number_of_orders"].includes(field.id) && "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-[#f8fafc] text-gray-700 font-mono text-xs">
                    <td className="p-3.5 border-r border-[#e5e2db] bg-[#fafafa] font-semibold text-center text-gray-400">3</td>
                    {INITIAL_SHOPIFY_FIELDS.filter(f => selectedFieldIds.includes(f.id)).map((field) => (
                      <td key={field.id} className="p-3.5 border-r border-[#e5e2db] whitespace-nowrap">
                        {field.id === "id" && "gid://shopify/Customer/9494634"}
                        {field.id === "created_at" && "2026-07-07 01:31:19"}
                        {field.id === "can_delete" && "False"}
                        {field.id === "data_sale_opt_out" && "False"}
                        {field.id === "default_address" && "742 Evergreen Terrace"}
                        {field.id === "display_name" && "Karine Ruby"}
                        {field.id === "email" && "karine.ruby@example.com"}
                        {field.id === "last_name" && "Ruby"}
                        {field.id === "number_of_orders" && "9"}
                        {!["id", "created_at", "can_delete", "data_sale_opt_out", "default_address", "display_name", "email", "last_name", "number_of_orders"].includes(field.id) && "—"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
