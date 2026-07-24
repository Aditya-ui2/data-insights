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
  FileSpreadsheet
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

// Pure Inline HD Vector SVG Brand Logos (0 External Network Calls - 100% Reliable)
function OfficialBrandLogo({ id }: { id: string }) {
  switch (id) {
    case "shopify":
      return (
        <div className="w-10 h-10 rounded-full bg-[#95bf47]/15 flex items-center justify-center shrink-0 p-2 shadow-2xs">
          <svg viewBox="0 0 100 100" fill="none" className="w-6 h-6">
            <path d="M78 28H66C66 18 58 10 48 10C38 10 30 18 30 28H18C15 28 13 30 13 33L22 85C22 88 25 90 28 90H68C71 90 74 88 74 85L83 33C83 30 81 28 78 28Z" fill="#95BF47" />
            <path d="M48 16C53 16 58 21 59 28H37C38 21 43 16 48 16Z" fill="#5E8E3E" />
            <path d="M44 42L35 60H43L41 78L58 52H48L53 42H44Z" fill="white" />
          </svg>
        </div>
      );
    case "stripe":
      return (
        <div className="w-10 h-10 rounded-full bg-[#635bff]/15 flex items-center justify-center shrink-0 p-2 shadow-2xs">
          <svg viewBox="0 0 100 100" fill="none" className="w-6 h-6">
            <path d="M85 41C85 24 72 15 52 15H15V85H52C75 85 85 71 85 55C85 46 80 43 85 41ZM52 35C60 35 64 38 64 43C64 48 58 50 49 53L35 57V35H52ZM52 65H35V45L49 41C61 38 67 43 67 52C67 60 61 65 52 65Z" fill="#635BFF" />
          </svg>
        </div>
      );
    case "salesforce":
      return (
        <div className="w-10 h-10 rounded-full bg-[#00a1e0]/15 flex items-center justify-center shrink-0 p-2 shadow-2xs">
          <svg viewBox="0 0 100 100" fill="none" className="w-6 h-6">
            <path d="M38 32C41 23 49 16 60 16C72 16 82 25 84 37C90 38 95 44 95 52C95 61 88 68 79 68H24C14 68 6 60 6 50C6 41 12 34 21 33C25 24 33 19 43 19" fill="#00A1E0" />
            <path d="M43 40C43 38 45 36 48 36H52C54 36 56 38 56 40V60C56 62 54 64 52 64H48C45 64 43 62 43 60V40Z" fill="white" />
          </svg>
        </div>
      );
    case "postgres":
      return (
        <div className="w-10 h-10 rounded-full bg-[#336791]/15 flex items-center justify-center shrink-0 p-2 shadow-2xs">
          <svg viewBox="0 0 100 100" fill="none" className="w-6 h-6">
            <path d="M50 10C27 10 10 27 10 50C10 72 27 90 50 90C72 90 90 72 90 50C90 27 72 10 50 10Z" fill="#336791" />
            <path d="M35 35C35 30 42 25 52 25C65 25 72 32 72 45C72 58 62 65 52 65H42V75H32V35H35ZM42 35V55H50C58 55 62 50 62 45C62 39 57 35 50 35H42Z" fill="white" />
          </svg>
        </div>
      );
    case "ga4":
      return (
        <div className="w-10 h-10 rounded-full bg-[#f9ab00]/15 flex items-center justify-center shrink-0 p-2 shadow-2xs">
          <svg viewBox="0 0 100 100" fill="none" className="w-6 h-6">
            <rect x="15" y="55" width="20" height="30" rx="5" fill="#F9AB00" />
            <rect x="40" y="35" width="20" height="50" rx="5" fill="#E37400" />
            <rect x="65" y="15" width="20" height="70" rx="5" fill="#E37400" />
            <circle cx="75" cy="25" r="10" fill="#EA4335" />
          </svg>
        </div>
      );
    case "hubspot":
      return (
        <div className="w-10 h-10 rounded-full bg-[#ff7a59]/15 flex items-center justify-center shrink-0 p-2 shadow-2xs">
          <svg viewBox="0 0 100 100" fill="none" className="w-6 h-6">
            <path d="M50 10L85 30V70L50 90L15 70V30L50 10Z" fill="#FF7A59" />
            <circle cx="50" cy="50" r="16" fill="white" />
            <circle cx="50" cy="50" r="8" fill="#FF7A59" />
          </svg>
        </div>
      );
    case "meta_ads":
      return (
        <div className="w-10 h-10 rounded-full bg-[#0668e1]/15 flex items-center justify-center shrink-0 p-2 shadow-2xs">
          <svg viewBox="0 0 100 100" fill="none" className="w-6 h-6">
            <path d="M30 30C18 30 10 40 10 50C10 60 18 70 30 70C40 70 47 62 50 55C53 62 60 70 70 70C82 70 90 60 90 50C90 40 82 30 70 30C60 30 53 38 50 45C47 38 40 30 30 30Z" fill="#0668E1" />
          </svg>
        </div>
      );
    case "google_ads":
      return (
        <div className="w-10 h-10 rounded-full bg-[#4285f4]/15 flex items-center justify-center shrink-0 p-2 shadow-2xs">
          <svg viewBox="0 0 100 100" fill="none" className="w-6 h-6">
            <polygon points="30,85 10,50 45,15 65,50" fill="#FBBC04" />
            <polygon points="70,85 90,50 55,15 35,50" fill="#4285F4" />
            <circle cx="75" cy="75" r="12" fill="#34A853" />
          </svg>
        </div>
      );
    case "mysql":
      return (
        <div className="w-10 h-10 rounded-full bg-[#00758f]/15 flex items-center justify-center shrink-0 p-2 shadow-2xs">
          <svg viewBox="0 0 100 100" fill="none" className="w-6 h-6">
            <path d="M20 70C30 40 50 20 85 20C75 40 60 65 30 80C25 82 20 75 20 70Z" fill="#00758F" />
            <path d="M40 75C55 60 70 45 80 30C75 45 60 65 45 78" fill="#F29111" />
          </svg>
        </div>
      );
    case "csv_upload":
      return (
        <div className="w-10 h-10 rounded-full bg-[#107c41]/15 flex items-center justify-center shrink-0 p-2 shadow-2xs text-[#107c41]">
          <FileSpreadsheet className="w-6 h-6 stroke-[2]" />
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-600">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
      );
  }
}

interface Connector {
  id: string;
  name: string;
  category: "E-Commerce" | "Payments" | "CRM" | "Databases" | "Marketing" | "Files";
  status: "Connected" | "Available";
}

const CONNECTORS: Connector[] = [
  { id: "shopify", name: "Shopify", category: "E-Commerce", status: "Connected" },
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
  const [currentView, setCurrentView] = useState<"home" | "import-connectors" | "connector-setup">("home");
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [isAgentExpanded, setIsAgentExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);

  const connectedSources = CONNECTORS.filter((c) => c.status === "Connected");
  const availableSources = CONNECTORS.filter((c) => c.status === "Available" && (searchTerm === "" || c.name.toLowerCase().includes(searchTerm.toLowerCase())));

  const handleOpenConnector = (connector: Connector) => {
    setSelectedConnector(connector);
    setCurrentView("connector-setup");
  };

  return (
    <div className="w-full min-h-screen bg-[#faf9f6] text-[#13322b] font-sans flex flex-col justify-between select-none antialiased">
      
      {/* Top Header Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-[#e5e2db] px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2.5">
          {currentView !== "home" ? (
            <button 
              onClick={() => setCurrentView(currentView === "connector-setup" ? "import-connectors" : "home")}
              className="p-1.5 hover:bg-[#f3f0e8] rounded-lg text-[#13322b] transition-all flex items-center gap-2 font-bold text-sm"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-[#13322b]" />
              <span>Import Data</span>
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
          <button className="p-1.5 hover:bg-[#f3f0e8] rounded-lg text-[#13322b]/70 hover:text-[#13322b] transition-all" title="Assistant Chat">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-[#f3f0e8] rounded-lg text-[#13322b]/70 hover:text-[#13322b] transition-all" title="Settings">
            <SlidersHorizontal className="w-4 h-4" />
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

      {/* VIEW 2: DEDICATED IMPORT CONNECTORS SUB-PAGE (PURE INLINE HD VECTOR BRAND LOGOS) */}
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
                    <ChevronRight className="w-5 h-5 text-[#a39e92] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: SUGGESTED / AVAILABLE CONNECTORS */}
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

      {/* VIEW 3: CONNECTOR SETUP SCREEN */}
      {currentView === "connector-setup" && selectedConnector && (
        <div className="p-3.5 space-y-4 flex-1 overflow-y-auto bg-[#faf9f6]">
          
          {/* Connector Banner */}
          <div className="p-4 bg-white rounded-xl border border-[#e5e2db] shadow-sm flex items-center gap-3.5">
            <OfficialBrandLogo id={selectedConnector.id} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#13322b]">{selectedConnector.name}</h3>
                <Badge className="bg-emerald-100 text-emerald-800 text-[9px] border-0">{selectedConnector.status}</Badge>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="bg-white rounded-xl border border-[#e5e2db] p-4 space-y-3.5 shadow-2xs">
            <h4 className="text-xs font-bold text-[#13322b] uppercase tracking-wider">Connector Settings</h4>
            
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#13322b]">API Key / Store URL</label>
              <input 
                type="text" 
                placeholder={`Enter your ${selectedConnector.name} API Key or URL...`}
                className="w-full px-3 py-2 text-xs bg-[#faf9f6] border border-[#e5e2db] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#13322b]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#13322b]">Target Sheet Range</label>
              <input 
                type="text" 
                defaultValue="Sheet1!A1"
                className="w-full px-3 py-2 text-xs bg-[#faf9f6] border border-[#e5e2db] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#13322b]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#13322b]">Auto-Sync Schedule</label>
              <select className="w-full px-3 py-2 text-xs bg-[#faf9f6] border border-[#e5e2db] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#13322b]">
                <option>Hourly Auto Refresh</option>
                <option>Daily Auto Refresh (Midnight)</option>
                <option>On-Demand Manual Sync</option>
              </select>
            </div>

            <button className="w-full py-2.5 bg-[#13322b] hover:bg-[#1a473d] text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-[#c59b43]" />
              <span>Import Data to Sheet</span>
            </button>
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
