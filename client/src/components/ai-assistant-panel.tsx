import { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send,
  Loader2,
  Lock,
  CornerDownLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  sender: "user" | "bot";
  text: string;
}

interface AiAssistantPanelProps {
  datasetId: string;
  activeTab: string;
  gridData: Record<string, any[]>;
  headers: string[];
  selectedCell: { rowIdx: number; colKey: string } | null;
  activeAiMode: string;
  setActiveAiMode: (mode: string) => void;
  onInsertFormula: (formula: string) => void;
  onAddChart: (chart: any) => void;
  onAddPivot: (pivot: any) => void;
  onGenerateFullDashboard: () => void;
  onApplyFormatting: (config: { zebra: boolean; boldHeaders: boolean; highlightNumbers: boolean }) => void;
  onCleanData: (config: { removeDuplicates: boolean; trim: boolean; fillNulls: boolean }) => void;
  onSortByRevenue: () => void;
  onFilterPaidOrders: () => void;
  onExportCSV: () => void;
  onSummaryStats: () => void;
  onTopCustomers: () => void;
}

export default function AiAssistantPanel({
  datasetId,
  activeTab,
  gridData,
  headers,
  selectedCell,
  activeAiMode,
  setActiveAiMode,
  onInsertFormula,
  onAddChart,
  onAddPivot,
  onGenerateFullDashboard,
  onApplyFormatting,
  onCleanData,
  onSortByRevenue,
  onFilterPaidOrders,
  onExportCSV,
  onSummaryStats,
  onTopCustomers
}: AiAssistantPanelProps) {
  const { toast } = useToast();
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Unified Copilot Chat History
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Hi! I am your AI Spreadsheet Copilot. Ask me to do anything (e.g. generate dashboards, format alternating row styles, clean duplicates, or calculate formulas) or click a suggestion below!"
    }
  ]);

  // Suggestions chips list
  const suggestions = [
    { label: "📊 BI Dashboard",        query: "generate dashboard" },
    { label: "🎨 Zebra Stripes",        query: "format zebra stripe" },
    { label: "🧼 Clean Data",           query: "clean duplicate null" },
    { label: "🧮 Profit Formula",      query: "calculate formula" },
    { label: "📈 Add Bar Chart",       query: "create bar chart" },
    { label: "🔽 Sort by Revenue",     query: "sort revenue high low" },
    { label: "✅ Filter Paid",          query: "filter paid orders only" },
    { label: "💻 Export CSV",          query: "export csv download" },
    { label: "📋 Summary Stats",      query: "summary statistics" },
    { label: "🏆 Top Customers",      query: "top customers revenue" },
  ];

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleCommand = async (text: string) => {
    if (!text.trim()) return;

    // 1. Add User Message
    const nextMessages = [...messages, { sender: "user", text } as Message];
    setMessages(nextMessages);
    setInputText("");
    setLoading(true);

    const query = text.toLowerCase();

    // 2. Dispatch operations based on queries
    if (activeTab === "📊 Dashboard" && (
      query.includes("format") || query.includes("color") || query.includes("stripe") || query.includes("zebra") || query.includes("bold") ||
      query.includes("clean") || query.includes("duplicate") || query.includes("trim") || query.includes("null") ||
      query.includes("formula") || query.includes("calculate") || query.includes("sum") || query.includes("math")
    )) {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            sender: "bot",
            text: "⚠️ You are currently on the Dashboard tab. Please click on a data spreadsheet tab at the bottom (like 'CUSTOMERS' or 'ORDERS') and select a cell first to run this cell operation!"
          }
        ]);
        setLoading(false);
      }, 500);
      return;
    }

    setTimeout(async () => {
      try {
        if (query.includes("dashboard") || query.includes("report")) {
          // Generate BI Dashboard
          onGenerateFullDashboard();
          setMessages(prev => [
            ...prev,
            {
              sender: "bot",
              text: "📊 Perfect! I have created a live BI Dashboard tab containing KPI summaries, Sales Trends, and Volume Distribution charts!"
            }
          ]);
          toast({ title: "BI Dashboard Tab Generated", description: "Created and switched to 📊 Dashboard tab." });

        } else if (query.includes("format") || query.includes("color") || query.includes("stripe") || query.includes("zebra") || query.includes("bold")) {
          // Apply formatting
          onApplyFormatting({ zebra: true, boldHeaders: true, highlightNumbers: true });
          setMessages(prev => [
            ...prev,
            {
              sender: "bot",
              text: "🎨 Styles applied! I've updated the sheet formatting: alternating zebra stripes on rows, bold headers, and color-coded green/red indicators for numbers."
            }
          ]);
          toast({ title: "Sheet Styles Applied", description: "Zebra striping and bold headers updated." });

        } else if (query.includes("clean") || query.includes("duplicate") || query.includes("trim") || query.includes("null")) {
          // Clean data
          onCleanData({ removeDuplicates: true, trim: true, fillNulls: true });
          setMessages(prev => [
            ...prev,
            {
              sender: "bot",
              text: "🧼 Data cleaner complete! Duplicate rows were removed, whitespace was trimmed, and blank values have been cleaned."
            }
          ]);
          toast({ title: "Data Clean Completed", description: "De-duplicated and trimmed active rows." });

        } else if (query.includes("formula") || query.includes("calculate") || query.includes("sum") || query.includes("math")) {
          // Generate formula via backend API or fallback
          try {
            const res = await apiRequest("POST", "/api/copilot/ai/generate-formula", {
              prompt: text,
              headers,
              selectedCell
            });
            const data = await res.json();
            
            if (data && data.formula) {
              onInsertFormula(data.formula);
              setMessages(prev => [
                ...prev,
                {
                  sender: "bot",
                  text: `🧮 Formula generated: \`${data.formula}\` (${data.explanation}). I have inserted it into your selected cell.`
                }
              ]);
              toast({ title: "Formula Inserted", description: `Added ${data.formula} to active cell.` });
            } else {
              throw new Error();
            }
          } catch {
            // Fallback insert formula
            onInsertFormula("=C2-D2");
            setMessages(prev => [
              ...prev,
              {
                sender: "bot",
                text: "🧮 I've generated a fallback profit calculation formula: `=C2-D2` and inserted it into your selected cell."
              }
            ]);
          }

        } else if (query.includes("chart") || query.includes("bar") || query.includes("line")) {
          // Generate a custom chart
          const priceCol = headers.find(h => /price|total|amount/i.test(h)) || "total_amount";
          const labelCol = headers.find(h => /name|id|email|city/i.test(h)) || "id";

          onAddChart({
            title: `Custom Sales Distribution`,
            type: "bar",
            xAxis: labelCol,
            yAxis: priceCol
          });

          setMessages(prev => [
            ...prev,
            {
              sender: "bot",
              text: `📈 Added a custom bar chart for \`${priceCol}\` grouped by \`${labelCol}\` to the BI Dashboard Tab!`
            }
          ]);
          toast({ title: "Chart Created", description: "Created bar chart visual report." });

        } else if (query.includes("sort") || query.includes("high") || query.includes("ranking")) {
          // Sort by revenue
          onSortByRevenue();
          setMessages(prev => [
            ...prev,
            { sender: "bot", text: "🔽 Done! I've sorted the active sheet by revenue from highest to lowest. The rows are now re-ordered!" }
          ]);

        } else if (query.includes("filter") || query.includes("paid")) {
          // Filter paid orders
          onFilterPaidOrders();
          setMessages(prev => [
            ...prev,
            { sender: "bot", text: "✅ Done! I've created a new '✅ Paid Orders' tab showing only successfully paid transactions. You can now see it in the bottom tab bar!" }
          ]);

        } else if (query.includes("export") || query.includes("csv") || query.includes("download")) {
          // Export CSV
          onExportCSV();
          setMessages(prev => [
            ...prev,
            { sender: "bot", text: "💻 Your CSV file is downloading now! It contains all rows from the active tab with all columns included." }
          ]);

        } else if (query.includes("summary") || query.includes("stat") || query.includes("average") || query.includes("min") || query.includes("max")) {
          // Summary Stats tab
          onSummaryStats();
          setMessages(prev => [
            ...prev,
            { sender: "bot", text: "📋 Done! I've created a '📋 Stats' tab showing Count, Sum, Average, Min, and Max for every numeric column in your dataset." }
          ]);

        } else if (query.includes("top") || query.includes("customer") || query.includes("best")) {
          // Top customers
          onTopCustomers();
          setMessages(prev => [
            ...prev,
            { sender: "bot", text: "🏆 Done! I've created a '🏆 Top Customers' tab showing your top 10 customers ranked by total revenue spent!" }
          ]);

        } else {
          // General message fallback using simple response
          setMessages(prev => [
            ...prev,
            {
              sender: "bot",
              text: "I can help you: generate dashboard, format stripes, clean data, add charts, sort by revenue, filter paid orders, export CSV, view stats, or find top customers. Just type a command or click a suggestion!"
            }
          ]);
        }
      } catch (e) {
        setMessages(prev => [
          ...prev,
          { sender: "bot", text: "Sorry, I ran into an issue executing that command. Please select a cell and try again." }
        ]);
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 border-l border-slate-800 font-sans">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          <span className="font-bold text-xs bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider">
            AI Copilot Agent
          </span>
        </div>
        <div className="bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 text-[9px] font-bold text-indigo-400 flex items-center gap-1 select-none">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
          Active
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Suggestion Chips at the Top */}
        <div className="p-3 border-b border-slate-900 bg-slate-950/80 flex flex-wrap gap-1.5 shrink-0">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleCommand(s.query)}
              disabled={loading}
              className="text-[9px] font-bold text-slate-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/30 px-2.5 py-1.5 rounded-sm transition-all select-none text-left shrink-0 active:scale-95 disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Conversation Stream Scroll Container */}
        <ScrollArea className="flex-1 p-4 bg-slate-950/20">
          <div className="space-y-4 pb-4">
            {messages.map((m, idx) => {
              const isBot = m.sender === "bot";
              return (
                <div 
                  key={idx} 
                  className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-sm text-xs leading-relaxed ${
                    isBot 
                      ? "bg-slate-900 border border-slate-800 text-slate-200" 
                      : "bg-indigo-600 text-white font-medium"
                  }`}>
                    {/* Bot Avatar Icon */}
                    {isBot && (
                      <div className="flex items-center gap-1.5 mb-1.5 select-none">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">AI Copilot</span>
                      </div>
                    )}
                    <p>{m.text}</p>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-sm bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>AI Copilot is processing tasks...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Chat input box at the bottom */}
        <div className="p-3 border-t border-slate-900 bg-slate-950 shrink-0">
          <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-sm focus-within:border-indigo-500/50 transition-colors">
            <Input
              placeholder={selectedCell ? "Tell the AI Copilot what to do..." : "Select a cell or write query..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading && inputText.trim()) {
                  handleCommand(inputText);
                }
              }}
              className="bg-transparent border-0 focus-visible:ring-0 text-xs text-white placeholder-slate-500 h-10 pr-10 rounded-none w-full"
            />
            <Button
              onClick={() => handleCommand(inputText)}
              disabled={loading || !inputText.trim()}
              className="absolute right-1 w-8 h-8 p-0 bg-transparent hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-sm shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
