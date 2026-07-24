import { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Filter, 
  ArrowUpDown, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Info,
  Check,
  Table,
  FileText,
  Loader2
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

// Coefficient Empty State Graphic Component (Exact Vector Illustration Match)
function EmptyObjectSelectionGraphic() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center select-none">
      <div className="w-48 h-48 rounded-full bg-[#f4f7f6] flex items-center justify-center relative shadow-2xs">
        <svg 
          className="w-24 h-24 text-gray-300" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth="1.2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="absolute top-8 right-8 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-blue-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-base font-semibold text-[#13322b]">
          Select object to preview or{" "}
          <button className="text-blue-600 underline font-semibold hover:text-blue-800 cursor-pointer">
            start with a template
          </button>
        </p>
      </div>
    </div>
  );
}

// All 38 Official Shopify Objects (Coefficient 100% Match)
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

export interface FieldNode {
  id: string;
  label: string;
  isGroup?: boolean;
  selectedCount?: number;
  children?: FieldNode[];
}

function getLeafNodes(nodes: FieldNode[]): { id: string; label: string }[] {
  let list: { id: string; label: string }[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      list = [...list, ...getLeafNodes(node.children)];
    } else {
      list.push({ id: node.id, label: node.label });
    }
  }
  return list;
}

function getAllLeafIds(nodes: FieldNode[]): string[] {
  return getLeafNodes(nodes).map(n => n.id);
}

export default function ImportPreviewPage() {
  // Initial state: selectedObject is null until user selects an object
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [objectSearchTerm, setObjectSearchTerm] = useState("");
  const [fieldSearchTerm, setFieldSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shopName, setShopName] = useState<string>("di-insights");

  // 100% Dynamic Schema & Records State
  const [dynamicSchemaTree, setDynamicSchemaTree] = useState<FieldNode[]>([]);
  const [dynamicStoreRows, setDynamicStoreRows] = useState<Record<string, string>[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

  // Coefficient postMessage Payload Protocol (`get:import-preview-payload:request` & `response`)
  useEffect(() => {
    const messageId = Math.random().toString(36).substring(2, 9);
    
    const handleParentMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "get:import-preview-payload:response") {
        console.log("RECEIVED MESSAGE", event.data);
        const payload = event.data.result || event.data.payload;
        if (payload && payload.shop) {
          setShopName(payload.shop);
        }
      }
    };

    window.addEventListener("message", handleParentMessage);

    // Send payload request to parent Google Apps Script container
    console.log("SENDING MESSAGE", { id: messageId, type: "get:import-preview-payload:request" });
    try {
      window.parent.postMessage({ id: messageId, type: "get:import-preview-payload:request" }, "*");
    } catch (e) {
      console.error(e);
    }

    return () => {
      window.removeEventListener("message", handleParentMessage);
    };
  }, []);

  // Fetch live schema and records when user selects an object
  useEffect(() => {
    if (!selectedObject) return;

    let isMounted = true;
    setIsLoading(true);

    const fetchDynamicShopifyData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const shop = urlParams.get("shop") || shopName || "di-insights";

        // 1. Fetch Live Store Records for selected category
        const dataRes = await fetch("/api/shopify/fetch-live-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shop, object: selectedObject })
        });
        const dataJson = await dataRes.json();
        const rawRecords = dataJson.data || [];

        // 2. Pass Raw Records to Pure Dynamic Runtime Inspection Engine
        const inspectRes = await fetch("/api/shopify/inspect-dynamic-json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawRecords })
        });
        const inspectJson = await inspectRes.json();

        if (isMounted && inspectJson.success) {
          const schemaTree: FieldNode[] = inspectJson.schemaTree || [];
          const flatRows: Record<string, string>[] = inspectJson.flatRows || [];
          const leafIds = inspectJson.allKeys || [];

          setDynamicSchemaTree(schemaTree);
          setDynamicStoreRows(flatRows);
          setSelectedFieldIds(leafIds);

          // Automatically expand top-level groups
          const groupIds = schemaTree.filter(n => n.isGroup).map(n => n.id);
          setExpandedGroupIds(groupIds);
        }
      } catch (e) {
        console.error("Dynamic sync error:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDynamicShopifyData();

    return () => {
      isMounted = false;
    };
  }, [selectedObject, shopName]);

  const masterLeafNodes = useMemo(() => getLeafNodes(dynamicSchemaTree), [dynamicSchemaTree]);

  const handleSelectObject = (objName: string) => {
    if (objName !== selectedObject) {
      setSelectedObject(objName);
    }
  };

  const toggleGroupExpand = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const toggleFieldSelect = (node: FieldNode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (node.children && node.children.length > 0) {
      const leafIds = getAllLeafIds(node.children);
      const allSelected = leafIds.every(id => selectedFieldIds.includes(id));
      if (allSelected) {
        setSelectedFieldIds(prev => prev.filter(id => !leafIds.includes(id)));
      } else {
        setSelectedFieldIds(prev => Array.from(new Set([...prev, ...leafIds])));
      }
    } else {
      setSelectedFieldIds(prev => 
        prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]
      );
    }
  };

  const toggleSelectAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const allLeafs = masterLeafNodes.map(n => n.id);
    if (selectedFieldIds.length === allLeafs.length) {
      setSelectedFieldIds([]);
    } else {
      setSelectedFieldIds(allLeafs);
    }
  };

  const filteredObjects = ALL_SHOPIFY_OBJECTS.filter(o => 
    objectSearchTerm === "" || o.toLowerCase().includes(objectSearchTerm.toLowerCase())
  );

  const isAllSelected = selectedFieldIds.length === masterLeafNodes.length && masterLeafNodes.length > 0;

  const activeTableColumns = useMemo(() => {
    return masterLeafNodes.filter(node => selectedFieldIds.includes(node.id));
  }, [masterLeafNodes, selectedFieldIds]);

  const handleDoneClick = () => {
    try {
      localStorage.setItem("dv_import_preview_done", JSON.stringify({
        object: selectedObject || "Products",
        fields: selectedFieldIds,
        timestamp: Date.now()
      }));
      if (window.opener) {
        window.opener.postMessage({ type: "dv_import_preview_done", object: selectedObject, fields: selectedFieldIds }, "*");
      }
    } catch (e) {
      console.error(e);
    }
    if ((window as any).google?.script?.host?.close) {
      (window as any).google.script.host.close();
    } else {
      window.close();
    }
  };

  const renderTreeNode = (node: FieldNode, depth = 0) => {
    const isGroup = node.isGroup && node.children && node.children.length > 0;
    const isExpanded = expandedGroupIds.includes(node.id);
    
    let isChecked = false;
    let selectedCount = 0;

    if (isGroup) {
      const leafIds = getAllLeafIds(node.children!);
      selectedCount = leafIds.filter(id => selectedFieldIds.includes(id)).length;
      isChecked = selectedCount === leafIds.length && leafIds.length > 0;
    } else {
      isChecked = selectedFieldIds.includes(node.id);
    }

    if (fieldSearchTerm !== "" && !node.label.toLowerCase().includes(fieldSearchTerm.toLowerCase())) {
      if (!isGroup) return null;
      const childMatch = node.children?.some(c => c.label.toLowerCase().includes(fieldSearchTerm.toLowerCase()));
      if (!childMatch) return null;
    }

    return (
      <div key={node.id} className="select-none">
        <div 
          onClick={(e) => isGroup ? toggleGroupExpand(node.id, e) : toggleFieldSelect(node, e)}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          className={`flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer text-xs font-medium transition-colors hover:bg-gray-100/80 ${
            isChecked ? "text-[#1d4ed8] font-bold" : "text-gray-700"
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {isGroup ? (
              <button 
                onClick={(e) => toggleGroupExpand(node.id, e)}
                className="p-0.5 hover:bg-gray-200 rounded text-gray-500 transition-transform cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-700 font-bold" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 font-bold" />
                )}
              </button>
            ) : (
              <input 
                type="checkbox" 
                checked={isChecked}
                onChange={(e) => toggleFieldSelect(node, e as any)}
                className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] accent-[#2563eb] cursor-pointer shrink-0"
              />
            )}
            
            <span className="truncate">{node.label}</span>
          </div>

          {isGroup && selectedCount > 0 && (
            <span className="text-[10px] text-[#2563eb] font-bold shrink-0 bg-[#e8f0fe] px-1.5 py-0.5 rounded-full">
              {selectedCount} selected
            </span>
          )}
        </div>

        {/* Render Subchildren if Group is Expanded */}
        {isGroup && isExpanded && (
          <div className="space-y-0.5">
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-white text-[#13322b] font-sans select-none antialiased flex flex-col justify-between">
      
      {/* 100% EXACT MATCH FOR COEFFICIENT MODAL WINDOW */}
      <div className="w-full h-screen bg-white flex flex-col overflow-hidden">
        
        {/* Modal Header Bar */}
        <div className="px-6 py-3.5 border-b border-[#e5e2db] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#13322b]">Import Preview</h2>
            <div className="flex items-center gap-2 pl-3 border-l border-[#e5e2db]">
              <OfficialBrandLogo id="shopify" />
              <span className="font-bold text-sm text-[#13322b]">Shopify</span>
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedObject && (
              <>
                <button className="px-3.5 py-1.5 bg-white border border-[#e5e2db] rounded-lg text-xs font-semibold text-[#13322b] flex items-center gap-1.5 hover:bg-[#f3f0e8] shadow-2xs">
                  <Filter className="w-3.5 h-3.5 text-gray-600" />
                  <span>Filter</span>
                </button>
                <button className="px-3.5 py-1.5 bg-white border border-[#e5e2db] rounded-lg text-xs font-semibold text-[#13322b] flex items-center gap-1.5 hover:bg-[#f3f0e8] shadow-2xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-600" />
                  <span>Sort</span>
                </button>
                
                {/* Real-time Selected Fields Count Badge */}
                <span className="text-xs text-gray-500 font-semibold px-2">
                  {selectedFieldIds.length} fields selected
                </span>

                <button 
                  onClick={handleDoneClick}
                  className="px-7 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Import</span>
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

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* COLUMN 1: All 38 Shopify Objects Selector Pane */}
          <div className="w-64 border-r border-[#e5e2db] p-3.5 space-y-3 bg-[#faf9f6] flex flex-col shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search"
                value={objectSearchTerm}
                onChange={(e) => setObjectSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#e5e2db] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#13322b] text-[#13322b] font-medium"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredObjects.map((objName) => {
                const isSelected = selectedObject === objName;
                return (
                  <button
                    key={objName}
                    onClick={() => handleSelectObject(objName)}
                    className={`w-full px-3 py-2 text-left rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-[#13322b] text-white font-bold shadow-xs" 
                        : "text-[#635f54] hover:bg-white hover:text-[#13322b]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Table className="w-4 h-4 shrink-0 opacity-70" />
                      <span className="truncate">{objName}</span>
                    </div>
                    {isSelected && (
                      isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#c59b43] animate-spin shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 text-[#c59b43] shrink-0" />
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT CONTAINER: Initial Empty State OR Dynamic 2-Pane Tree & Preview Table */}
          {selectedObject === null ? (
            <div className="flex-1 flex items-center justify-center bg-white">
              <EmptyObjectSelectionGraphic />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden relative bg-[#faf9f6]">
              
              {/* Coefficient Loader Overlay when switching category section */}
              {isLoading ? (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 bg-white/95 backdrop-blur-xs space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#13322b] text-[#c59b43] flex items-center justify-center shadow-lg animate-bounce">
                    <OfficialBrandLogo id="shopify" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <h3 className="text-sm font-bold text-[#13322b] animate-pulse">
                      Loading {selectedObject}...
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      Fetching 100% Dynamic Schema & Store Records Live
                    </p>
                  </div>
                  <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-[#13322b] animate-pulse" />
                  </div>
                </div>
              ) : null}

              {/* COLUMN 2: Nested Dynamic Field Tree Pane */}
              <div className="w-80 border-r border-[#e5e2db] p-3.5 space-y-3 bg-white flex flex-col shrink-0">
                <div className="flex items-center justify-between px-1">
                  <span className="font-bold text-xs text-[#13322b]">{selectedObject}</span>
                  <span className="text-xs text-blue-600 font-semibold cursor-pointer">edit</span>
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

                <div className="flex-1 overflow-y-auto space-y-1 pr-1 border-t border-[#f0ede6] pt-2">
                  {/* Fully Interactive Select All Button */}
                  <div 
                    onClick={(e) => toggleSelectAll(e)}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs font-bold text-[#1d4ed8] cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      onChange={(e) => toggleSelectAll(e as any)}
                      className="w-4 h-4 rounded text-[#2563eb] accent-[#2563eb] cursor-pointer" 
                    />
                    <span>Select All</span>
                  </div>
                  {dynamicSchemaTree.map(node => renderTreeNode(node, 0))}
                </div>
              </div>

              {/* COLUMN 3: Right Dynamic Table Preview Pane */}
              <div className="flex-1 p-4 flex flex-col overflow-hidden bg-[#faf9f6]">
                {activeTableColumns.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-[#e5e2db]">
                    <FileText className="w-12 h-12 text-gray-300 mb-3" />
                    <h3 className="text-sm font-medium text-gray-600">No fields selected for preview</h3>
                    <p className="text-xs text-gray-400 mt-1">Check one or more fields on the left to add columns to the table.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-x-auto overflow-y-auto border border-[#e5e2db] rounded-2xl shadow-2xs bg-white scrollbar-thin scrollbar-thumb-gray-400">
                    <table className="min-w-full text-left border-collapse text-xs border-spacing-0">
                      <thead>
                        <tr className="bg-[#f8fafc] border-b border-[#e5e2db] text-[#1a73e8] sticky top-0 z-10">
                          {activeTableColumns.map((col, idx) => (
                            <th 
                              key={col.id} 
                              className={`p-3 font-bold border-r border-[#e5e2db] whitespace-nowrap bg-[#f1f5f9] text-[#1a73e8] ${
                                idx === 0 ? "sticky left-0 z-20 bg-[#e2e8f0]" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span>{col.label}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e5e2db]">
                        {dynamicStoreRows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-[#f8fafc] text-gray-700 font-mono text-xs">
                            {activeTableColumns.map((col, idx) => (
                              <td 
                                key={col.id} 
                                className={`p-3 border-r border-[#e5e2db] whitespace-nowrap font-medium text-gray-800 ${
                                  idx === 0 ? "sticky left-0 z-10 bg-white font-bold text-[#1d4ed8]" : ""
                                }`}
                              >
                                {row[col.id] || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
