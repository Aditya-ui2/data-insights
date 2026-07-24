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
    <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#c59b43]/40 shadow-md flex items-center justify-center bg-[#0b1d19] shrink-0">
      <img 
        src={DV_LOGO_BASE64} 
        alt="DigitValues Logo" 
        className="w-full h-full object-cover"
      />
    </div>
  );
}

// Exact Official Brand Logos in Round Circular Badges (Matching Real Logos)
function OfficialBrandLogo({ id }: { id: string }) {
  switch (id) {
    case "shopify":
      return (
        <div className="w-9 h-9 rounded-full bg-[#eaf4e0] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
          <img 
            src="https://cdn.simpleicons.org/shopify/95BF47" 
            alt="Shopify" 
            className="w-5 h-5 object-contain"
            onError={(e) => {
              e.currentTarget.src = "https://cdn.worldvectorlogo.com/logos/shopify.svg";
            }}
          />
        </div>
      );
    case "stripe":
      return (
        <div className="w-9 h-9 rounded-full bg-[#f0efff] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
          <img 
            src="https://cdn.simpleicons.org/stripe/635BFF" 
            alt="Stripe" 
            className="w-5 h-5 object-contain"
          />
        </div>
      );
    case "salesforce":
      return (
        <div className="w-9 h-9 rounded-full bg-[#e6f4fb] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
          <img 
            src="https://cdn.simpleicons.org/salesforce/00A1E0" 
            alt="Salesforce" 
            className="w-5 h-5 object-contain"
          />
        </div>
      );
    case "postgres":
      return (
        <div className="w-9 h-9 rounded-full bg-[#e8f1f7] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
          <img 
            src="https://cdn.simpleicons.org/postgresql/4169E1" 
            alt="PostgreSQL" 
            className="w-5 h-5 object-contain"
          />
        </div>
      );
    case "ga4":
      return (
        <div className="w-9 h-9 rounded-full bg-[#fff4e5] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
          <img 
            src="https://cdn.simpleicons.org/googleanalytics/E37400" 
            alt="GA4" 
            className="w-5 h-5 object-contain"
          />
        </div>
      );
    case "hubspot":
      return (
        <div className="w-9 h-9 rounded-full bg-[#fff0eb] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
          <img 
            src="https://cdn.simpleicons.org/hubspot/FF7A59" 
            alt="HubSpot" 
            className="w-5 h-5 object-contain"
          />
        </div>
      );
    case "meta_ads":
      return (
        <div className="w-9 h-9 rounded-full bg-[#e7f0ff] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
          <img 
            src="https://cdn.simpleicons.org/meta/0668E1" 
            alt="Meta Ads" 
            className="w-5 h-5 object-contain"
          />
        </div>
      );
    case "google_ads":
      return (
        <div className="w-9 h-9 rounded-full bg-[#e8f0fe] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
          <img 
            src="https://cdn.simpleicons.org/googleads/4285F4" 
            alt="Google Ads" 
            className="w-5 h-5 object-contain"
          />
        </div>
      );
    case "mysql":
      return (
        <div className="w-9 h-9 rounded-full bg-[#f0f4f7] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
          <img 
            src="https://cdn.simpleicons.org/mysql/4479A1" 
            alt="MySQL" 
            className="w-5 h-5 object-contain"
          />
        </div>
      );
    case "csv_upload":
      return (
        <div className="w-9 h-9 rounded-full bg-[#eaf4e0] flex items-center justify-center shrink-0 p-1.5 shadow-2xs text-[#107c41]">
          <FileSpreadsheet className="w-5 h-5 stroke-[2]" />
        </div>
      );
    default:
      return (
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-600">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
      );
  }
}

interface Connector {
  id: string;
  name: string;
  category: "E-Commerce" | "Payments" | "CRM" | "Databases" | "Marketing" | "Files";
  description: string;
  status: "Connected" | "Available";
}

const CONNECTORS: Connector[] = [
  { id: "shopify", name: "Shopify", category: "E-Commerce", description: "Orders, Inventory & Customer Analytics", status: "Connected" },
  { id: "stripe", name: "Stripe", category: "Payments", description: "MRR, Subscriptions & Invoice Data", status: "Connected" },
  { id: "ga4", name: "Google Analytics 4", category: "Marketing", description: "Traffic, Conversion & Funnels", status: "Connected" },
  { id: "csv_upload", name: "Files (CSV & Excel)", category: "Files", description: "Google Sheets, Excel & CSV files", status: "Connected" },
  { id: "salesforce", name: "Salesforce", category: "CRM", description: "Leads, Opportunities & Accounts", status: "Available" },
  { id: "postgres", name: "PostgreSQL", category: "Databases", description: "Direct SQL Database Connection", status: "Available" },
  { id: "hubspot", name: "HubSpot", category: "CRM", description: "Contacts, Deals & Automation Logs", status: "Available" },
  { id: "meta_ads", name: "Meta Ads (Facebook)", category: "Marketing", description: "Ad Spend, Impressions & ROAS", status: "Available" },
  { id: "google_ads", name: "Google Ads", category: "Marketing", description: "PPC Campaigns & Keyword Metrics", status: "Available" },
  { id: "mysql", name: "MySQL", category: "Databases", description: "Relational DB Sync & Auto-Queries", status: "Available" },
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
              className="p-1.5 hover:bg-[#f3f0e8] rounded-lg text-[#13322b] transition-all flex items-center gap-1.5 font-semibold text-xs"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-[#13322b]" />
              <span>Back to Menu</span>
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
                    className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#13322b]/5 text-[#13322b] border border-[#13322b]/10 flex items-center justify-center">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#13322b] flex items-center gap-1.5">
                          <span>Import Data</span>
                          <span className="text-[9px] bg-[#13322b]/10 text-[#13322b] px-1.5 py-0.2 rounded font-bold uppercase">10+ Sources</span>
                        </div>
                        <div className="text-[10px] text-[#8a8579]">Shopify, Stripe, Postgres, CRM & GA4</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* Item 2: Export Data */}
                <div>
                  <button 
                    className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#c59b43]/10 text-[#a37b2c] border border-[#c59b43]/20 flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#13322b]">Export Data</div>
                        <div className="text-[10px] text-[#8a8579]">Push Sheet rows back to Database</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92]" />
                  </button>
                </div>

                {/* Item 3: Monitor & Alerts */}
                <div>
                  <button 
                    className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-700 border border-pink-100 flex items-center justify-center">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[#13322b]">Monitor & Alerts</span>
                          <span className="text-[9px] font-bold bg-[#c59b43]/15 text-[#a37b2c] px-1.5 py-0.2 rounded uppercase tracking-wider">New</span>
                        </div>
                        <div className="text-[10px] text-[#8a8579]">Slack, Email & WhatsApp Triggers</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92]" />
                  </button>
                </div>

                {/* Item 4: Sheet Assistant */}
                <div>
                  <button 
                    className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#13322b]">Sheet Assistant</div>
                        <div className="text-[10px] text-[#8a8579]">Ask AI questions in plain English</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92]" />
                  </button>
                </div>

                {/* Item 5: Snapshots */}
                <div>
                  <button 
                    className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#13322b]">Snapshots</div>
                        <div className="text-[10px] text-[#8a8579]">Save historical spreadsheet versions</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92]" />
                  </button>
                </div>

                {/* Item 6: Web Dashboards */}
                <div>
                  <button 
                    className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 border border-violet-100 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[#13322b]">Web Dashboards</span>
                          <span className="text-[9px] font-bold bg-[#13322b]/10 text-[#13322b] px-1.5 py-0.2 rounded uppercase tracking-wider">New</span>
                        </div>
                        <div className="text-[10px] text-[#8a8579]">Generate shareable visual KPI reports</div>
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

      {/* VIEW 2: DEDICATED IMPORT CONNECTORS SUB-PAGE (OFFICIAL BRAND LOGOS IN ROUND BADGES) */}
      {currentView === "import-connectors" && (
        <div className="p-3.5 space-y-4 flex-1 overflow-y-auto bg-[#faf9f6]">
          
          {/* Sub-Page Header */}
          <div className="pb-1 border-b border-[#e5e2db]">
            <h2 className="text-sm font-bold text-[#13322b]">Import Data Sources</h2>
            <p className="text-[10px] text-[#8a8579] mt-0.5">Connect live APIs & databases directly to your Google Sheet</p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8a8579]" />
            <input 
              type="text" 
              placeholder="Search data sources (e.g. Shopify, Stripe)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#e5e2db] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#13322b] text-[#13322b] placeholder-[#a39e92] shadow-2xs"
            />
          </div>

          {/* SECTION 1: CONNECTED SOURCES */}
          {searchTerm === "" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#13322b] uppercase tracking-wider">Connected Sources</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  4 Connected
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {connectedSources.map((connector) => (
                  <div 
                    key={connector.id}
                    onClick={() => handleOpenConnector(connector)}
                    className="p-3 bg-white rounded-xl border border-[#e5e2db] hover:border-[#c59b43] transition-all cursor-pointer shadow-2xs hover:shadow-md flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <OfficialBrandLogo id={connector.id} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#13322b] group-hover:text-[#c59b43] transition-colors">
                            {connector.name}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <p className="text-[10px] text-[#8a8579] mt-0.5 line-clamp-1">
                          {connector.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#a39e92] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: AVAILABLE CONNECTORS */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#13322b] uppercase tracking-wider">Suggested Sources</span>
              <span className="text-[10px] text-[#8a8579]">Auto Sync Enabled</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {availableSources.map((connector) => (
                <div 
                  key={connector.id}
                  onClick={() => handleOpenConnector(connector)}
                  className="p-3 bg-white rounded-xl border border-[#e5e2db] hover:border-[#c59b43] transition-all cursor-pointer shadow-2xs hover:shadow-md flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <OfficialBrandLogo id={connector.id} />
                    <div>
                      <span className="text-xs font-bold text-[#13322b] group-hover:text-[#c59b43] transition-colors">
                        {connector.name}
                      </span>
                      <p className="text-[10px] text-[#8a8579] mt-0.5 line-clamp-1">
                        {connector.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#a39e92] group-hover:translate-x-0.5 transition-transform" />
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
              <p className="text-[10px] text-[#8a8579] mt-0.5">{selectedConnector.description}</p>
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
