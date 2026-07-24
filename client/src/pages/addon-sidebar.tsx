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
  ArrowUpRight
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

export default function AddonSidebarPage() {
  const [isAgentExpanded, setIsAgentExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const integrations = [
    { name: "Shopify", category: "E-Commerce", status: "Connected", color: "bg-emerald-600" },
    { name: "Stripe", category: "Payments", status: "Connected", color: "bg-[#c59b43]" },
    { name: "Salesforce", category: "CRM", status: "Available", color: "bg-[#13322b]" },
    { name: "PostgreSQL", category: "Database", status: "Available", color: "bg-sky-700" },
    { name: "Google Analytics 4", category: "Analytics", status: "Connected", color: "bg-amber-600" },
  ];

  return (
    <div className="w-full min-h-screen bg-[#faf9f6] text-[#13322b] font-sans flex flex-col justify-between select-none antialiased">
      {/* Top Header Bar with Custom DV Logo */}
      <div className="bg-white/90 backdrop-blur-md border-b border-[#e5e2db] px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2.5">
          <CustomDVLogo />
          <div className="flex flex-col">
            <span className="font-semibold text-[#13322b] text-sm tracking-tight leading-none">DigitValues</span>
            <span className="text-[10px] text-[#8a8579] font-medium tracking-wide uppercase mt-0.5">Spreadsheet AI</span>
          </div>
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

      {/* Main Content Area */}
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

          {/* 6 Features List nested inside Create Agent Dropdown */}
          {isAgentExpanded && (
            <div className="divide-y divide-[#f0ede6] bg-white transition-all">
              
              {/* Item 1: Import Data */}
              <div>
                <button 
                  onClick={() => setActiveTab(activeTab === "import" ? null : "import")}
                  className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#faf9f6] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#13322b]/5 text-[#13322b] border border-[#13322b]/10 flex items-center justify-center">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#13322b]">Import Data</div>
                      <div className="text-[10px] text-[#8a8579]">Shopify, Stripe, Postgres, CRM</div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-[#a39e92] transition-transform ${activeTab === "import" ? "rotate-90 text-[#13322b]" : ""}`} />
                </button>

                {activeTab === "import" && (
                  <div className="p-3 bg-[#fbfaf7] border-t border-[#e5e2db] space-y-2.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8a8579]" />
                      <input 
                        type="text" 
                        placeholder="Filter data sources..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-white border border-[#e5e2db] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#13322b] text-[#13322b] placeholder-[#a39e92]"
                      />
                    </div>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {integrations.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-white rounded-lg border border-[#e5e2db] flex items-center justify-between hover:border-[#c59b43] transition-all cursor-pointer shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                            <div>
                              <div className="text-[11px] font-semibold text-[#13322b]">{item.name}</div>
                              <div className="text-[9px] text-[#8a8579]">{item.category}</div>
                            </div>
                          </div>
                          <Badge className={`text-[9px] px-2 py-0.5 font-medium border-0 ${item.status === "Connected" ? "bg-[#13322b]/10 text-[#13322b]" : "bg-gray-100 text-gray-600"}`}>
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Item 2: Export Data */}
              <div>
                <button 
                  onClick={() => setActiveTab(activeTab === "export" ? null : "export")}
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
                  <ChevronRight className={`w-4 h-4 text-[#a39e92] transition-transform ${activeTab === "export" ? "rotate-90 text-[#13322b]" : ""}`} />
                </button>
              </div>

              {/* Item 3: Monitor & Alerts */}
              <div>
                <button 
                  onClick={() => setActiveTab(activeTab === "monitor" ? null : "monitor")}
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
                  <ChevronRight className={`w-4 h-4 text-[#a39e92] transition-transform ${activeTab === "monitor" ? "rotate-90 text-[#13322b]" : ""}`} />
                </button>
              </div>

              {/* Item 4: Sheet Assistant */}
              <div>
                <button 
                  onClick={() => setActiveTab(activeTab === "assistant" ? null : "assistant")}
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
                  <ChevronRight className={`w-4 h-4 text-[#a39e92] transition-transform ${activeTab === "assistant" ? "rotate-90 text-[#13322b]" : ""}`} />
                </button>
              </div>

              {/* Item 5: Snapshots */}
              <div>
                <button 
                  onClick={() => setActiveTab(activeTab === "snapshot" ? null : "snapshot")}
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
                  <ChevronRight className={`w-4 h-4 text-[#a39e92] transition-transform ${activeTab === "snapshot" ? "rotate-90 text-[#13322b]" : ""}`} />
                </button>
              </div>

              {/* Item 6: Web Dashboards */}
              <div>
                <button 
                  onClick={() => setActiveTab(activeTab === "dashboards" ? null : "dashboards")}
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
                  <ChevronRight className={`w-4 h-4 text-[#a39e92] transition-transform ${activeTab === "dashboards" ? "rotate-90 text-[#13322b]" : ""}`} />
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
