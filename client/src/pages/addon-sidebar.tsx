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
  HelpCircle,
  Database,
  Search,
  CheckCircle2,
  RefreshCw,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AddonSidebarPage() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const integrations = [
    { name: "Shopify", category: "E-Commerce", status: "Connected", color: "bg-emerald-500" },
    { name: "Stripe", category: "Payments", status: "Connected", color: "bg-indigo-500" },
    { name: "Salesforce", category: "CRM", status: "Available", color: "bg-blue-500" },
    { name: "PostgreSQL", category: "Database", status: "Available", color: "bg-sky-600" },
    { name: "Google Analytics 4", category: "Analytics", status: "Connected", color: "bg-amber-500" },
  ];

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col justify-between select-none">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-sm">
            DV
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight">DigitValues</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors" title="AI Chat Assistant">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors" title="Settings">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-3.5 space-y-3 flex-1 overflow-y-auto">
        
        {/* Create Agent Blue Button */}
        <button 
          onClick={() => setActiveTab(activeTab === "agent" ? null : "agent")}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium text-xs flex items-center justify-between transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold">Create AI Agent</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Feature List Menu items */}
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
          
          {/* Item 1: Import */}
          <div className="transition-colors">
            <button 
              onClick={() => setActiveTab(activeTab === "import" ? null : "import")}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">Import Data</div>
                  <div className="text-[10px] text-slate-400">Connect Shopify, Stripe, SQL & CRM</div>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeTab === "import" ? "rotate-90 text-slate-700" : ""}`} />
            </button>

            {activeTab === "import" && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search integrations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {integrations.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200/60 flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <div>
                          <div className="text-[11px] font-medium text-slate-700">{item.name}</div>
                          <div className="text-[9px] text-slate-400">{item.category}</div>
                        </div>
                      </div>
                      <Badge variant={item.status === "Connected" ? "secondary" : "outline"} className="text-[9px] px-1.5 py-0 h-4 font-normal">
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Item 2: Export */}
          <div className="transition-colors">
            <button 
              onClick={() => setActiveTab(activeTab === "export" ? null : "export")}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">Export Data</div>
                  <div className="text-[10px] text-slate-400">Push Sheet rows back to DB or CRM</div>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeTab === "export" ? "rotate-90 text-slate-700" : ""}`} />
            </button>
          </div>

          {/* Item 3: Monitor */}
          <div className="transition-colors">
            <button 
              onClick={() => setActiveTab(activeTab === "monitor" ? null : "monitor")}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800">Monitor & Alerts</span>
                    <span className="text-[9px] font-bold bg-pink-100 text-pink-700 px-1.5 py-0.2 rounded uppercase">New</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Slack & Email notification triggers</div>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeTab === "monitor" ? "rotate-90 text-slate-700" : ""}`} />
            </button>
          </div>

          {/* Item 4: Sheet Assistant */}
          <div className="transition-colors">
            <button 
              onClick={() => setActiveTab(activeTab === "assistant" ? null : "assistant")}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">Sheet Assistant</div>
                  <div className="text-[10px] text-slate-400">Ask AI questions in plain English</div>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeTab === "assistant" ? "rotate-90 text-slate-700" : ""}`} />
            </button>
          </div>

          {/* Item 5: Snapshot */}
          <div className="transition-colors">
            <button 
              onClick={() => setActiveTab(activeTab === "snapshot" ? null : "snapshot")}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">Snapshots</div>
                  <div className="text-[10px] text-slate-400">Save historical spreadsheet versions</div>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeTab === "snapshot" ? "rotate-90 text-slate-700" : ""}`} />
            </button>
          </div>

          {/* Item 6: Web Dashboards */}
          <div className="transition-colors">
            <button 
              onClick={() => setActiveTab(activeTab === "dashboards" ? null : "dashboards")}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800">Web Dashboards</span>
                    <span className="text-[9px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.2 rounded uppercase">New</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Generate shareable visual reports</div>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeTab === "dashboards" ? "rotate-90 text-slate-700" : ""}`} />
            </button>
          </div>
        </div>

        {/* Integration Graphic Card */}
        <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl border border-slate-700/50 shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-100">Connect 500+ Data Sources</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Shopify, Stripe, Salesforce, Postgres & more</div>
            </div>
            <Badge className="bg-blue-600 text-white text-[9px] border-none px-2">Live</Badge>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700/60 text-[10px] text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Automated hourly spreadsheet sync</span>
          </div>
        </div>

        {/* Welcome Collapsible Box */}
        {showWelcome && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 transition-all">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowWelcome(!showWelcome)}>
              <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                <span>👋 Welcome to DigitValues!</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <p className="text-[10px] text-amber-800/90 mt-1.5 leading-relaxed">
              Connect your database or API to Google Sheets™ and build real-time visual dashboards in seconds.
            </p>
            <a href="/support" target="_blank" className="inline-block mt-2 text-[10px] font-semibold text-blue-600 hover:underline">
              Learn how to get started →
            </a>
          </div>
        )}

      </div>

      {/* Footer Status */}
      <div className="px-4 py-2 bg-white border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          DigitValues v2.4 Active
        </span>
        <a href="/support" target="_blank" className="hover:text-slate-600 transition-colors">Help</a>
      </div>
    </div>
  );
}
