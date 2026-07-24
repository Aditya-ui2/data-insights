import { useState } from "react";
import { 
  Sparkles, 
  Download, 
  Upload, 
  Bell, 
  Bot, 
  Camera, 
  BarChart3, 
  MessageSquare, 
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Search,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  ArrowLeft,
  Check,
  FileSpreadsheet,
  HelpCircle,
  Lock,
  X,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Zap,
  Layers,
  Trash2,
  Key,
  ShieldCheck,
  Mail,
  UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DV_LOGO_BASE64 } from "./logo-base64";

function CustomDVLogo() {
  return (
    <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#c59b43]/50 shadow-sm flex items-center justify-center bg-[#0d221e] shrink-0 p-1">
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
        {/* Dark Background */}
        <rect width="100" height="100" rx="18" fill="#0d221e" />
        {/* Outer Gold D */}
        <path d="M 22 22 H 48 C 66 22 66 56 48 56 H 22 V 22 Z" stroke="#eab308" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Inner Gold D */}
        <path d="M 32 32 H 46 C 54 32 54 46 46 46 H 32 V 32 Z" stroke="#eab308" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Interconnected Green V */}
        <path d="M 44 48 L 60 78 L 78 34" stroke="#10b981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M 50 48 L 60 69 L 72 38" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}

// Circular Brand Logos SVG Component
function OfficialBrandLogo({ id, size = "w-10 h-10" }: { id: string; size?: string }) {
  switch (id) {
    case "shopify":
      return (
        <div className={`${size} rounded-full bg-[#eaf4e0] flex items-center justify-center shrink-0 p-2 shadow-2xs`}>
          <img 
            src="https://cdn.simpleicons.org/shopify/95BF47" 
            alt="Shopify" 
            className="w-full h-full object-contain"
          />
        </div>
      );
    case "stripe":
      return (
        <div className={`${size} rounded-full bg-[#f0efff] flex items-center justify-center shrink-0 p-2 shadow-2xs`}>
          <img 
            src="https://cdn.simpleicons.org/stripe/635BFF" 
            alt="Stripe" 
            className="w-full h-full object-contain"
          />
        </div>
      );
    case "salesforce":
      return (
        <div className={`${size} rounded-full bg-[#e6f4fb] flex items-center justify-center shrink-0 p-2 shadow-2xs`}>
          <img 
            src="https://cdn.simpleicons.org/salesforce/00A1E0" 
            alt="Salesforce" 
            className="w-full h-full object-contain"
          />
        </div>
      );
    case "postgres":
      return (
        <div className={`${size} rounded-full bg-[#e8f1f7] flex items-center justify-center shrink-0 p-2 shadow-2xs`}>
          <img 
            src="https://cdn.simpleicons.org/postgresql/4169E1" 
            alt="PostgreSQL" 
            className="w-full h-full object-contain"
          />
        </div>
      );
    case "ga4":
      return (
        <div className={`${size} rounded-full bg-[#fff4e5] flex items-center justify-center shrink-0 p-2 shadow-2xs`}>
          <img 
            src="https://cdn.simpleicons.org/googleanalytics/E37400" 
            alt="GA4" 
            className="w-full h-full object-contain"
          />
        </div>
      );
    case "hubspot":
      return (
        <div className={`${size} rounded-full bg-[#fff0eb] flex items-center justify-center shrink-0 p-2 shadow-2xs`}>
          <img 
            src="https://cdn.simpleicons.org/hubspot/FF7A59" 
            alt="HubSpot" 
            className="w-full h-full object-contain"
          />
        </div>
      );
    case "meta_ads":
      return (
        <div className={`${size} rounded-full bg-[#e7f0ff] flex items-center justify-center shrink-0 p-2 shadow-2xs`}>
          <img 
            src="https://cdn.simpleicons.org/meta/0668E1" 
            alt="Meta Ads" 
            className="w-full h-full object-contain"
          />
        </div>
      );
    case "google_ads":
      return (
        <div className={`${size} rounded-full bg-[#e8f0fe] flex items-center justify-center shrink-0 p-2 shadow-2xs`}>
          <img 
            src="https://cdn.simpleicons.org/googleads/4285F4" 
            alt="Google Ads" 
            className="w-full h-full object-contain"
          />
        </div>
      );
    case "mysql":
      return (
        <div className={`${size} rounded-full bg-[#f0f4f7] flex items-center justify-center shrink-0 p-2 shadow-2xs`}>
          <img 
            src="https://cdn.simpleicons.org/mysql/4479A1" 
            alt="MySQL" 
            className="w-full h-full object-contain"
          />
        </div>
      );
    case "csv_upload":
      return (
        <div className={`${size} rounded-full bg-[#eaf4e0] flex items-center justify-center shrink-0 p-2 shadow-2xs text-[#107c41]`}>
          <FileSpreadsheet className="w-full h-full stroke-[2]" />
        </div>
      );
    default:
      return (
        <div className={`${size} rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-600`}>
          <FileSpreadsheet className="w-full h-full" />
        </div>
      );
  }
}

interface Connector {
  id: string;
  name: string;
  category: "E-Commerce" | "Payments" | "CRM" | "Databases" | "Marketing" | "Files";
  status: "Connected" | "Available";
  domainSuffix?: string;
}

const INITIAL_CONNECTORS: Connector[] = [
  { id: "shopify", name: "Shopify", category: "E-Commerce", status: "Connected", domainSuffix: ".myshopify.com" },
  { id: "stripe", name: "Stripe", category: "Payments", status: "Connected" },
  { id: "ga4", name: "Google Analytics 4", category: "Marketing", status: "Connected" },
  { id: "csv_upload", name: "Files (CSV & Excel)", category: "Files", status: "Connected" },
  { id: "salesforce", name: "Salesforce", category: "CRM", status: "Available" },
  { id: "postgres", name: "PostgreSQL", category: "Databases", status: "Available" },
  { id: "hubspot", name: "HubSpot", category: "CRM", status: "Available" },
  { id: "meta_ads", name: "Meta Ads (Facebook)", category: "Marketing", status: "Available" },
  { id: "google_ads", name: "Google Ads", category: "Marketing", status: "Available" },
  { id: "mysql", name: "MySQL", category: "Databases", status: "Available" },
];

export default function AddonSidebarPage() {
  const [connectorsList, setConnectorsList] = useState<Connector[]>(INITIAL_CONNECTORS);
  const [currentView, setCurrentView] = useState<"home" | "import-connectors" | "connector-connect" | "oauth-redirect" | "importing-active">("home");
  const [selectedConnector, setSelectedConnector] = useState<Connector>(INITIAL_CONNECTORS[0]);
  const [deleteTargetConnector, setDeleteTargetConnector] = useState<Connector | null>(null);
  const [storeNameInput, setStoreNameInput] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedObject, setSelectedObject] = useState("Customers");
  const [isAgentExpanded, setIsAgentExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);
  const [isImportingProgress, setIsImportingProgress] = useState(false);

  const connectedSources = connectorsList.filter((c) => c.status === "Connected");
  const availableSources = connectorsList.filter((c) => c.status === "Available" && (searchTerm === "" || c.name.toLowerCase().includes(searchTerm.toLowerCase())));

  const objectsList = [
    "Automatic Discount Nodes",
    "Automatic Discount Saved Searches",
    "Code Discount Nodes",
    "Code Discount Saved Searches",
    "Collection Saved Searches",
    "Collections",
    "Customers",
    "Deletion Events",
    "Delivery Profiles",
    "Draft Order Saved Searches",
    "Draft Orders",
    "Files",
    "Gift Cards",
    "Inventory Items",
    "Line Items",
    "Locations",
    "Market Catalogs",
    "Order Saved Searches"
  ];

  const customerSampleData = [
    { id: "gid://shopify/Customer/9494632", name: "Ayumu Hirano", email: "ayumu.hirano@example.com", created: "2026-07-07 01:31:18", amount: "$140.00" },
    { id: "gid://shopify/Customer/9494633", name: "Russell Winfield", email: "russel.winfield@example.com", created: "2026-07-07 01:31:19", amount: "$290.50" },
    { id: "gid://shopify/Customer/9494634", name: "Karine Ruby", email: "karine.ruby@example.com", created: "2026-07-07 01:31:19", amount: "$85.00" },
    { id: "gid://shopify/Customer/9494635", name: "Shaun White", email: "shaun.white@example.com", created: "2026-07-07 01:31:20", amount: "$420.00" },
    { id: "gid://shopify/Customer/9494636", name: "Chloe Kim", email: "chloe.kim@example.com", created: "2026-07-07 01:31:22", amount: "$310.00" },
  ];

  // Listen for OAuth completion signal from the new tab
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "dv_shopify_authorized") {
        setIsAuthorizing(false);
        setShowPreviewModal(true);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "dv_shopify_auth_status" && event.newValue?.startsWith("approved")) {
        setIsAuthorizing(false);
        setShowPreviewModal(true);
      }
    };
    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleOpenConnector = (connector: Connector) => {
    setSelectedConnector(connector);
    setStoreNameInput("");
    setCurrentView("connector-connect");
  };

  // STEP 1 Authorize Click -> Opens Shopify Security OAuth in NEW BROWSER TAB
  const handleAuthorizeClick = () => {
    setIsAuthorizing(true);
    // Open Shopify OAuth page in a NEW TAB
    window.open("/shopify-auth", "_blank");

    // Fallback simulation timer in case popups are blocked or user manually clicks confirm
    setTimeout(() => {
      setIsAuthorizing(false);
      setShowPreviewModal(true);
    }, 4000);
  };

  const handleConfirmImport = () => {
    setShowPreviewModal(false);
    setCurrentView("importing-active");
    setIsImportingProgress(true);
    setTimeout(() => {
      setIsImportingProgress(false);
    }, 3000);
  };

  const confirmDisconnect = (connectorId: string) => {
    setConnectorsList(prev => prev.map(c => c.id === connectorId ? { ...c, status: "Available" } : c));
    setDeleteTargetConnector(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#faf9f6] text-[#13322b] font-sans flex flex-col justify-between select-none antialiased relative">
      
      {/* Top Header Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-[#e5e2db] px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2.5">
          {currentView !== "home" ? (
            <button 
              onClick={() => setCurrentView(currentView === "connector-connect" ? "import-connectors" : "home")}
              className="p-1.5 hover:bg-[#f3f0e8] rounded-lg text-[#13322b] transition-all flex items-center gap-2 font-bold text-sm"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-[#13322b]" />
              <span>{currentView === "connector-connect" ? `Connect ${selectedConnector.name}` : "Import Data"}</span>
            </button>
          ) : (
            <>
              <CustomDVLogo />
              <div className="flex flex-col">
                <span className="font-semibold text-[#13322b] text-sm tracking-tight leading-none">DigitValues</span>
                <span className="text-[10px] text-[#8a8579] font-medium tracking-wide uppercase mt-0.5">Spreadsheet AI</span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button className="p-1.5 hover:bg-[#f3f0e8] rounded-lg text-[#13322b]/70 hover:text-[#13322b] transition-all" title="Help">
            <HelpCircle className="w-4 h-4 text-[#8a8579]" />
          </button>
        </div>
      </div>

      {/* VIEW 1: HOME MAIN MENU */}
      {currentView === "home" && (
        <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto">
          
          {/* Create Agent Master Dropdown Header Button */}
          <div className="bg-white rounded-xl border border-[#e5e2db] shadow-sm overflow-hidden transition-all">
            <button 
              onClick={() => setIsAgentExpanded(!isAgentExpanded)}
              className="w-full py-3.5 px-4 bg-[#13322b] hover:bg-[#1a473d] active:bg-[#0d221e] text-white font-medium text-xs flex items-center justify-between transition-all shadow-sm border-b border-[#1a473d] group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#c59b43] text-[#13322b] flex items-center justify-center shadow-inner">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="font-semibold tracking-wide text-xs">Create Agent</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#c59b43] font-semibold text-[11px]">
                <span className="bg-[#c59b43]/20 text-[#c59b43] px-2 py-0.5 rounded-full text-[10px]">6 Tools</span>
                <ChevronDown className={`w-4 h-4 text-[#c59b43] transition-transform duration-200 ${isAgentExpanded ? "rotate-180" : ""}`} />
              </div>
            </button>

            {/* 6 Features List inside Create Agent Dropdown */}
            {isAgentExpanded && (
              <div className="divide-y divide-[#f0ede6] bg-white transition-all">
                
                {/* Item 1: Import Data */}
                <div>
                  <button 
                    onClick={() => setCurrentView("import-connectors")}
                    className="w-full px-3.5 py-3.5 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#13322b]/5 text-[#13322b] border border-[#13322b]/10 flex items-center justify-center">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-[#13322b]">
                        <span>Import Data</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* Item 2: Export Data */}
                <div>
                  <button 
                    className="w-full px-3.5 py-3.5 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#c59b43]/10 text-[#a37b2c] border border-[#c59b43]/20 flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-[#13322b]">Export Data</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92]" />
                  </button>
                </div>

                {/* Item 3: Monitor & Alerts */}
                <div>
                  <button 
                    className="w-full px-3.5 py-3.5 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-700 border border-pink-100 flex items-center justify-center">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#13322b]">Monitor & Alerts</span>
                        <span className="text-[9px] font-bold bg-[#c59b43]/15 text-[#a37b2c] px-1.5 py-0.2 rounded uppercase tracking-wider">New</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92]" />
                  </button>
                </div>

                {/* Item 4: Sheet Assistant */}
                <div>
                  <button 
                    className="w-full px-3.5 py-3.5 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-[#13322b]">Sheet Assistant</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92]" />
                  </button>
                </div>

                {/* Item 5: Snapshots */}
                <div>
                  <button 
                    className="w-full px-3.5 py-3.5 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-[#13322b]">Snapshots</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92]" />
                  </button>
                </div>

                {/* Item 6: Web Dashboards */}
                <div>
                  <button 
                    className="w-full px-3.5 py-3.5 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 border border-violet-100 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#13322b]">Web Dashboards</span>
                        <span className="text-[9px] font-bold bg-[#13322b]/10 text-[#13322b] px-1.5 py-0.2 rounded uppercase tracking-wider">New</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92]" />
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Deep Forest Luxury Card */}
          <div className="p-3.5 bg-gradient-to-br from-[#13322b] via-[#1a473d] to-[#0d221e] text-white rounded-xl border border-[#1a473d] shadow-md relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                  <span>Connect 500+ Data Sources</span>
                  <Sparkles className="w-3 h-3 text-[#c59b43]" />
                </div>
                <div className="text-[10px] text-white/70 mt-0.5">Shopify, Stripe, Salesforce, Postgres</div>
              </div>
              <span className="bg-[#c59b43] text-[#13322b] text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs uppercase">
                Live Sync
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/10 text-[10px] text-white/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#c59b43] shrink-0" />
              <span>Automated hourly spreadsheet refresh</span>
            </div>
          </div>

          {/* Welcome Collapsible Box */}
          {showWelcome && (
            <div className="bg-white border border-[#e5e2db] rounded-xl p-3.5 text-xs text-[#13322b] shadow-2xs">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowWelcome(!showWelcome)}>
                <div className="flex items-center gap-2 font-semibold text-[#13322b]">
                  <span className="text-sm">👋</span>
                  <span>Welcome to DigitValues!</span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#8a8579]" />
              </div>
              <p className="text-[10px] text-[#635f54] mt-2 leading-relaxed font-sans">
                Transform your Google Sheets™ data into beautiful AI-powered dashboards and get instant insights in seconds.
              </p>
              <a href="/support" target="_blank" className="inline-flex items-center gap-1 mt-2.5 text-[10px] font-semibold text-[#13322b] hover:text-[#c59b43] transition-colors">
                <span>Learn how to get started</span>
                <ArrowUpRight className="w-3 h-3 text-[#c59b43]" />
              </a>
            </div>
          )}

        </div>
      )}

      {/* VIEW 2: DEDICATED IMPORT CONNECTORS SUB-PAGE */}
      {currentView === "import-connectors" && (
        <div className="p-4 space-y-4 flex-1 overflow-y-auto bg-[#faf9f6]">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#8a8579]" />
            <input 
              type="text" 
              placeholder="Search data sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-[#e5e2db] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#13322b] text-[#13322b] placeholder-[#a39e92] shadow-2xs font-medium"
            />
          </div>

          {/* SECTION 1: CONNECTED SOURCES */}
          {searchTerm === "" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#13322b] tracking-wider uppercase">Connected Sources</span>
                <button className="text-[11px] font-bold text-[#13322b] hover:text-[#c59b43] transition-colors">
                  Add +
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {connectedSources.map((connector) => (
                  <div 
                    key={connector.id}
                    onClick={() => handleOpenConnector(connector)}
                    className="p-3.5 bg-white rounded-2xl border border-[#e5e2db] hover:border-[#c59b43] transition-all cursor-pointer shadow-2xs hover:shadow-md flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <OfficialBrandLogo id={connector.id} />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#13322b] group-hover:text-[#c59b43] transition-colors">
                          {connector.name}
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
                      </div>
                    </div>
                    
                    {/* Trash Delete Action Button */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetConnector(connector);
                        }}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-[#8a8579] hover:text-rose-600 transition-all"
                        title={`Disconnect ${connector.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-[#a39e92] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: SUGGESTED SOURCES */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#13322b] tracking-wider uppercase">Suggested Sources</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {availableSources.map((connector) => (
                <div 
                  key={connector.id}
                  onClick={() => handleOpenConnector(connector)}
                  className="p-3.5 bg-white rounded-2xl border border-[#e5e2db] hover:border-[#c59b43] transition-all cursor-pointer shadow-2xs hover:shadow-md flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5">
                    <OfficialBrandLogo id={connector.id} />
                    <span className="text-sm font-bold text-[#13322b] group-hover:text-[#c59b43] transition-colors">
                      {connector.name}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#a39e92] group-hover:translate-x-0.5 transition-transform" />
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* VIEW 3: STEP 1 - CONNECT SCREEN */}
      {currentView === "connector-connect" && (
        <div className="p-4 space-y-5 flex-1 overflow-y-auto bg-[#faf9f6] flex flex-col justify-between">
          
          <div className="space-y-6 pt-2">
            
            {/* Plug Connector Illustration */}
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="w-14 h-14 rounded-full bg-[#13322b] text-[#c59b43] flex items-center justify-center shadow-md">
                <Zap className="w-7 h-7 fill-[#c59b43]" />
              </div>
              <div className="w-6 border-b-2 border-dashed border-[#8a8579]" />
              <OfficialBrandLogo id={selectedConnector.id} size="w-14 h-14" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-[#13322b]">Let's connect to {selectedConnector.name}</h2>
              <p className="text-xs text-[#8a8579]">Sign in to authorize your store data sync</p>
            </div>

            {/* Input Form */}
            <div className="bg-white rounded-2xl border border-[#e5e2db] p-4 space-y-3 shadow-2xs">
              <label className="text-xs font-bold text-[#13322b] block">
                {selectedConnector.name} Store Name
              </label>
              
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="shop-name"
                  value={storeNameInput}
                  onChange={(e) => setStoreNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#faf9f6] border border-[#e5e2db] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#13322b] text-[#13322b] font-medium"
                />
              </div>

              <p className="text-[11px] text-[#8a8579] leading-relaxed">
                You can find your {selectedConnector.name} store name in your browser's address bar when you are logged in to {selectedConnector.name}.
              </p>

              {/* Domain Preview Box */}
              <div className="p-2.5 bg-[#f5f3ee] rounded-xl border border-[#e5e2db] text-[11px] text-[#8a8579] flex items-center gap-1.5 font-mono">
                <span>https://</span>
                <span className="bg-[#c59b43]/30 text-[#13322b] px-1 py-0.5 rounded font-bold">{storeNameInput || "store-name"}</span>
                <span>{selectedConnector.domainSuffix || ".com"}</span>
              </div>

              {/* Authorize Action Button */}
              <button 
                onClick={handleAuthorizeClick}
                disabled={isAuthorizing}
                className="w-full py-3 bg-[#13322b] hover:bg-[#1a473d] active:bg-[#0d221e] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isAuthorizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#c59b43]" />
                    <span>Redirecting to {selectedConnector.name}...</span>
                  </>
                ) : (
                  <span>Authorize</span>
                )}
              </button>
            </div>

          </div>

          {/* Footnote Security Notice */}
          <div className="p-3 bg-white/80 rounded-xl border border-[#e5e2db] flex items-start gap-2.5 text-[10px] text-[#8a8579]">
            <Lock className="w-3.5 h-3.5 text-[#13322b] shrink-0 mt-0.5" />
            <span>DigitValues encrypts your credentials and never stores raw data when importing.</span>
          </div>

        </div>
      )}

      {/* VIEW 4: STEP 2 - SHOPIFY OAUTH SECURITY CONFIRMATION PAGE (EXACT MATCH FOR IMAGE 2) */}
      {currentView === "oauth-redirect" && (
        <div className="p-4 flex-1 overflow-y-auto bg-[#181818] text-white flex flex-col items-center justify-center relative">
          
          <div className="w-full max-w-sm space-y-6 animate-in fade-in zoom-in duration-200 py-4">
            
            {/* Shopify Brand Logo Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#95bf47]/20 flex items-center justify-center p-3 border border-[#95bf47]/40 shadow-lg">
                <img 
                  src="https://cdn.simpleicons.org/shopify/95BF47" 
                  alt="Shopify" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* White Security Card */}
            <div className="bg-white text-[#13322b] rounded-3xl p-6 shadow-2xl space-y-5 border border-[#e5e2db]">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-gray-900">Review your security settings</h2>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Keep your account safe by making sure your security settings are up-to-date.
                </p>
              </div>

              {/* Passkeys Block */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400">Passkeys</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Recommended</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Log in with your fingerprint, face recognition, or PIN instead of a password.
                </p>
                <button className="w-full py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 shadow-2xs hover:bg-gray-50">
                  <Key className="w-3.5 h-3.5 text-gray-500" />
                  <span>Create a passkey</span>
                </button>
              </div>

              {/* 2FA Block */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5">
                <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400">Two-Step Authentication</span>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  You don't have two-step turned on. Add an extra layer of security for your store data.
                </p>
              </div>

              {/* Recovery Options */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between text-xs">
                <span className="font-medium text-gray-600">Secondary Email</span>
                <span className="text-xs font-bold text-gray-400">Off</span>
              </div>

              {/* CONFIRM BUTTON -> AUTHORIZES & OPENS IMPORT PREVIEW MODAL */}
              <button 
                onClick={handleOAuthConfirm}
                className="w-full py-3 bg-[#13322b] hover:bg-[#1a473d] active:bg-[#0d221e] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#c59b43]" />
                <span>Confirm & Authorize</span>
              </button>

              <div className="text-center">
                <button onClick={handleOAuthConfirm} className="text-[11px] font-medium text-gray-500 hover:text-gray-900 underline">
                  Remind me next time
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* VIEW 5: STEP 4 - IMPORTING ACTIVE SYNC CARD */}
      {currentView === "importing-active" && (
        <div className="p-4 space-y-4 flex-1 overflow-y-auto bg-[#faf9f6]">
          
          <div className="bg-white rounded-2xl border border-[#e5e2db] p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0ede6] pb-3">
              <div className="flex items-center gap-2.5">
                <OfficialBrandLogo id={selectedConnector.id} size="w-8 h-8" />
                <span className="font-bold text-sm text-[#13322b]">Import {selectedConnector.name}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </span>
            </div>

            {/* Selected Config Summary */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#8a8579]">
                <span>Objects:</span>
                <span className="font-bold text-[#13322b]">{selectedObject}</span>
              </div>
              <div className="flex items-center justify-between text-[#8a8579]">
                <span>Fields:</span>
                <span className="font-medium text-[#13322b]">Id, Display Name, Email, Created At...</span>
              </div>
            </div>

            {/* Live Sync Graphic Animation */}
            <div className="p-4 bg-[#fcfbf9] rounded-xl border border-[#e5e2db] text-center space-y-3">
              <div className="flex items-center justify-center gap-3">
                <OfficialBrandLogo id={selectedConnector.id} size="w-9 h-9" />
                <div className="flex items-center gap-1 text-[#c59b43]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c59b43] animate-ping" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c59b43] animate-ping delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c59b43] animate-ping delay-200" />
                </div>
                <CustomDVLogo />
                <div className="flex items-center gap-1 text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping delay-100" />
                </div>
                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold shadow-2xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              </div>

              <div className="text-xs font-bold text-[#13322b]">
                {isImportingProgress ? `Importing data from ${selectedConnector.name}...` : `Live Data Synced to Sheet1!`}
              </div>
              <p className="text-[10px] text-[#8a8579]">Auto-refresh set to hourly</p>
            </div>
          </div>

        </div>
      )}

      {/* CONFIRMATION POPUP DIALOG FOR DISCONNECTING CONNECTED SOURCE */}
      {deleteTargetConnector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-[#e5e2db] space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-[#13322b]">Disconnect {deleteTargetConnector.name}?</h3>
              <p className="text-[11px] text-[#8a8579] leading-relaxed">
                Are you sure you want to disconnect this data source? Active auto-refresh schedules for this sheet will be paused.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button 
                onClick={() => setDeleteTargetConnector(null)}
                className="flex-1 py-2.5 bg-[#faf9f6] hover:bg-[#f3f0e8] text-[#13322b] text-xs font-bold rounded-xl border border-[#e5e2db] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => confirmDisconnect(deleteTargetConnector.id)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 & 4 OVERLAY MODAL: IMPORT PREVIEW MODAL DIALOG */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-[#e5e2db] animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header Bar */}
            <div className="px-6 py-4 border-b border-[#e5e2db] flex items-center justify-between bg-[#faf9f6]">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-[#13322b]">Import Preview</h2>
                <div className="flex items-center gap-2 pl-3 border-l border-[#e5e2db]">
                  <OfficialBrandLogo id={selectedConnector.id} size="w-7 h-7" />
                  <span className="font-bold text-sm text-[#13322b]">{selectedConnector.name}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-[#e5e2db]/50 rounded-full text-[#8a8579] hover:text-[#13322b] transition-all"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Left Sidebar + Right Preview Table */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Object Tree Selector Pane */}
              <div className="w-64 border-r border-[#e5e2db] p-3 space-y-3 bg-[#faf9f6] flex flex-col">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8a8579]" />
                  <input 
                    type="text" 
                    placeholder="Search objects..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#e5e2db] rounded-lg focus:outline-none text-[#13322b]"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1">
                  {objectsList.map((obj) => (
                    <button
                      key={obj}
                      onClick={() => setSelectedObject(obj)}
                      className={`w-full px-3 py-2 text-left rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                        selectedObject === obj 
                          ? "bg-[#13322b] text-white font-bold shadow-xs" 
                          : "text-[#635f54] hover:bg-white hover:text-[#13322b]"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{obj}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Live Table Preview Pane */}
              <div className="flex-1 p-5 flex flex-col justify-between overflow-hidden bg-white">
                
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {/* Actions Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 bg-[#faf9f6] border border-[#e5e2db] rounded-lg text-xs font-semibold text-[#13322b] flex items-center gap-1.5 hover:bg-[#f3f0e8]">
                        <Filter className="w-3.5 h-3.5" />
                        <span>Filter</span>
                      </button>
                      <button className="px-3 py-1.5 bg-[#faf9f6] border border-[#e5e2db] rounded-lg text-xs font-semibold text-[#13322b] flex items-center gap-1.5 hover:bg-[#f3f0e8]">
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>Sort</span>
                      </button>
                    </div>

                    <button 
                      onClick={handleConfirmImport}
                      className="px-5 py-2 bg-[#13322b] hover:bg-[#1a473d] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-[#c59b43]" />
                      <span>Import Data</span>
                    </button>
                  </div>

                  {/* Live Sample Data Table */}
                  <div className="border border-[#e5e2db] rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#faf9f6] border-b border-[#e5e2db] text-[#13322b]">
                          <th className="p-3 font-bold">Id</th>
                          <th className="p-3 font-bold">Display Name</th>
                          <th className="p-3 font-bold">Email</th>
                          <th className="p-3 font-bold">Created At</th>
                          <th className="p-3 font-bold">Amount Spent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0ede6]">
                        {customerSampleData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#fcfbf9] transition-colors text-[#635f54] font-mono text-[11px]">
                            <td className="p-3 font-semibold text-[#13322b]">{row.id}</td>
                            <td className="p-3 font-sans font-medium text-[#13322b]">{row.name}</td>
                            <td className="p-3">{row.email}</td>
                            <td className="p-3">{row.created}</td>
                            <td className="p-3 font-semibold text-emerald-700">{row.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Footer Status Bar */}
      <div className="px-4 py-2.5 bg-white border-t border-[#e5e2db] text-[10px] text-[#8a8579] flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          DigitValues v2.4 Active
        </span>
        <a href="/support" target="_blank" className="hover:text-[#13322b] transition-colors font-medium">Documentation</a>
      </div>
    </div>
  );
}
