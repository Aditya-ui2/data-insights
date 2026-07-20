import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import LimitReachedModal from "./limit-reached-modal";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  Info,
  Mic,
  MicOff,
  RefreshCw,
  Upload,
  Link,
  Plus,
  ChevronRight,
  ArrowLeft,
  Download,
} from "lucide-react";
import { getIdToken } from "@/lib/firebase";
import type { Dataset, ChatMessage, Conversation, GoogleSheet } from "@shared/schema";

interface ChatInterfaceProps {
  conversationId?: string | null;
  onConversationCreated?: (id: string) => void;
  businessMode?: boolean;
  initialDatasetId?: string;
  sidebarMode?: boolean;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const UPLOAD_TIMEOUT = 300000; // 5 minutes

function getDatasetSuggestions(dataset?: Dataset) {
  if (!dataset) {
    return [
      "What are the key trends in this dataset?",
      "Show me the top categories by count",
      "Which columns have the most variation?",
      "Give me a quick summary of this dataset",
      "What insights can you find in the data?",
      "Show me the distribution across main categories",
    ];
  }

  const headers = dataset.headers || [];
  const lowerHeaders = headers.map((header) => header.toLowerCase());
  
  // Enhanced header detection
  const findHeader = (keywords: string[]) =>
    headers.find((header, index) => keywords.some((keyword) => lowerHeaders[index].includes(keyword)));

  // Find all relevant columns for advanced suggestions
  const dateHeader = findHeader(["date", "month", "year", "time", "day", "quarter"]);
  const primaryMetric = findHeader(["sales", "revenue", "amount", "price", "total", "value", "cost", "income"]);
  const secondaryMetric = headers.find((h, i) => {
    const lower = lowerHeaders[i];
    return ["units", "quantity", "count", "number", "volume", "orders"].some(k => lower.includes(k)) &&
           h !== primaryMetric;
  });
  const entityHeader = findHeader(["product", "item", "service", "client", "customer", "name", "vendor"]);
  const categoryHeader = findHeader(["category", "segment", "status", "type", "region", "department", "channel"]);
  const locationHeader = findHeader(["city", "country", "state", "location", "region"]);
  const performanceMetric = findHeader(["margin", "profit", "roi", "ctr", "rate", "score"]);

  const suggestions: string[] = [];

  // 1. Time-series trend suggestion
  if (dateHeader && primaryMetric) {
    suggestions.push(
      `What was the trend in ${primaryMetric.toLowerCase()} over ${dateHeader.toLowerCase()}?`
    );
  } else if (dateHeader) {
    suggestions.push(`Show me the timeline of events in this dataset`);
  }

  // 2. Top performers / ranking suggestion
  if (entityHeader && primaryMetric) {
    suggestions.push(
      `Rank the top 10 ${entityHeader.toLowerCase()} by ${primaryMetric.toLowerCase()}`
    );
  } else if (categoryHeader && primaryMetric) {
    suggestions.push(
      `Which ${categoryHeader.toLowerCase()} generates the most ${primaryMetric.toLowerCase()}?`
    );
  } else if (categoryHeader) {
    suggestions.push(`Show me the distribution across ${categoryHeader.toLowerCase()}`);
  }

  // 3. Comparative analysis suggestion
  if (categoryHeader && dateHeader && primaryMetric) {
    suggestions.push(
      `Compare ${primaryMetric.toLowerCase()} across different ${categoryHeader.toLowerCase()} over time`
    );
  } else if (locationHeader && primaryMetric) {
    suggestions.push(
      `Which ${locationHeader.toLowerCase()} has the highest ${primaryMetric.toLowerCase()}?`
    );
  } else if (categoryHeader && primaryMetric) {
    suggestions.push(
      `Compare performance across ${categoryHeader.toLowerCase()}`
    );
  }

  // 4. Statistical insights suggestion
  if (primaryMetric && secondaryMetric) {
    suggestions.push(
      `Is there a correlation between ${primaryMetric.toLowerCase()} and ${secondaryMetric.toLowerCase()}?`
    );
  } else if (performanceMetric && primaryMetric) {
    suggestions.push(
      `Analyze the relationship between ${performanceMetric.toLowerCase()} and ${primaryMetric.toLowerCase()}`
    );
  } else if (primaryMetric) {
    suggestions.push(`Show me statistical summary of ${primaryMetric.toLowerCase()}`);
  }

  // 5. Growth/change analysis suggestion
  if (dateHeader && primaryMetric) {
    suggestions.push(
      `What was the month-over-month growth in ${primaryMetric.toLowerCase()}?`
    );
  } else if (primaryMetric) {
    suggestions.push(`What are the outliers or anomalies in ${primaryMetric.toLowerCase()}?`);
  }

  // 6. Deep dive suggestion
  if (categoryHeader && entityHeader && primaryMetric) {
    suggestions.push(
      `Show me the breakdown of ${primaryMetric.toLowerCase()} by both ${categoryHeader.toLowerCase()} and ${entityHeader.toLowerCase()}`
    );
  } else if (entityHeader && categoryHeader) {
    suggestions.push(
      `Give me a detailed analysis of ${entityHeader.toLowerCase()} across ${categoryHeader.toLowerCase()}`
    );
  } else if (headers.length > 2) {
    suggestions.push(`Show me a comprehensive analysis of all fields`);
  }

  // 7. Performance insights suggestion
  if (performanceMetric && dateHeader) {
    suggestions.push(
      `How has ${performanceMetric.toLowerCase()} evolved over ${dateHeader.toLowerCase()}?`
    );
  } else if (primaryMetric && secondaryMetric) {
    suggestions.push(`What's the ${primaryMetric.toLowerCase()} to ${secondaryMetric.toLowerCase()} ratio trend?`);
  }

  // 8. General insights fallback
  if (suggestions.length < 5) {
    suggestions.push(`Generate key insights and patterns from this dataset`);
  }

  // Return top 6-8 suggestions
  return suggestions.slice(0, 8);
}

export default function ChatInterface({ 
  conversationId, 
  onConversationCreated, 
  businessMode = false,
  initialDatasetId,
  sidebarMode = false
}: ChatInterfaceProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(initialDatasetId || "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showColumns, setShowColumns] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const [showDataSourceOptions, setShowDataSourceOptions] = useState(false);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [sheetSelectorStep, setSheetSelectorStep] = useState<"spreadsheets" | "sheets">("spreadsheets");
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<GoogleSheet | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + (prev ? " " : "") + transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({ title: "Voice recognition failed", variant: "destructive" });
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [toast]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({ title: "Voice input not supported in this browser", variant: "destructive" });
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const { data: datasets, isLoading: loadingDatasets } = useQuery<Dataset[]>({
    queryKey: ["/api/datasets"],
  });

  const { data: usage } = useQuery<{ used: number; limit: number }>({
    queryKey: ["/api/usage"],
  });

  // Check Google connection status
  const { data: connectionStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/google/status"],
  });

  // Get spreadsheets when connected
  const { data: spreadsheets, isLoading: loadingSpreadsheets } = useQuery<GoogleSheet[]>({
    queryKey: ["/api/spreadsheets"],
    enabled: connectionStatus?.connected === true,
  });

  // Import sheet mutation
  const importSheetMutation = useMutation({
    mutationFn: async ({ spreadsheetId, sheetId, sheetTitle }: { spreadsheetId: string; sheetId: number; sheetTitle: string }) => {
      const spreadsheet = spreadsheets?.find(s => s.id === spreadsheetId);
      const res = await apiRequest("POST", "/api/datasets", {
        spreadsheetId,
        spreadsheetName: spreadsheet?.name || "Spreadsheet",
        sheetId,
        sheetName: sheetTitle,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      // Close dialog immediately
      setShowSheetSelector(false);
      setSheetSelectorStep("spreadsheets");
      setSelectedSpreadsheet(null);
      
      // Immediately add the new dataset to the cache so UI can display it
      queryClient.setQueryData<Dataset[]>(["/api/datasets"], (prev = []) => {
        // Remove if exists (shouldn't, but safe), then add new dataset
        return [...prev.filter(d => d.id !== data.id), data];
      });
      
      // Set selected dataset ID (now the dataset is in cache, so selectedDataset will be found)
      setSelectedDatasetId(String(data.id));
      
      // Also trigger a background refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      
      toast({ 
        title: "Sheet imported successfully!", 
        description: `Imported ${data.rowCount} rows from Google Sheets` 
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);
      
      try {
        const res = await fetch('/api/datasets/upload', {
          method: 'POST',
          body: formData,
          headers,
          credentials: 'include',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          try {
            const err = await res.json();
            throw new Error(err.message || 'Upload failed');
          } catch {
            throw new Error(`Upload failed with status ${res.status}`);
          }
        }
        
        return await res.json();
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Upload timed out. Please try a smaller file.');
        }
        throw error;
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      setSelectedDatasetId(data.id);
      setShowDataSourceOptions(false);
      toast({ 
        title: "File uploaded successfully!", 
        description: `Imported ${data.rowCount} rows with ${data.headers?.length || 0} columns` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  // Connect to Google Sheets
  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/google/auth-url");
      const { url } = await res.json();
      window.location.href = url;
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_FILE_SIZE) {
      toast({ 
        title: "File too large", 
        description: "Maximum file size is 100MB", 
        variant: "destructive" 
      });
      return;
    }
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload .xlsx, .xls, or .csv files", 
        variant: "destructive" 
      });
      return;
    }
    
    uploadMutation.mutate(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Load conversation if we have an ID
  const { data: conversationData } = useQuery<{ conversation: Conversation; dataset: Dataset | null }>({
    queryKey: ["/api/conversations", currentConversationId],
    enabled: !!currentConversationId,
  });

  // When conversation loads, restore messages and dataset
  useEffect(() => {
    if (conversationData?.conversation) {
      setMessages(conversationData.conversation.messages || []);
      if (conversationData.conversation.datasetId) {
        setSelectedDatasetId(conversationData.conversation.datasetId);
      }
    }
  }, [conversationData]);

  // Reset when conversationId prop changes (new chat selected)
  useEffect(() => {
    if (conversationId !== currentConversationId) {
      setCurrentConversationId(conversationId || null);
      if (!conversationId) {
        // Starting a new chat
        setMessages([]);
        setSelectedDatasetId(initialDatasetId || "");
      }
    }
  }, [conversationId, initialDatasetId]);

  useEffect(() => {
    if (initialDatasetId) {
      setSelectedDatasetId(initialDatasetId);
    }
  }, [initialDatasetId]);

  // Refresh Google Sheets data
  const syncMutation = useMutation({
    mutationFn: async (datasetId: string) => {
      const res = await apiRequest("POST", `/api/datasets/${datasetId}/sync`, {});
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({ title: "Data refreshed successfully!", description: "Your dataset now has the latest data from Google Sheets." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to refresh data", description: error.message, variant: "destructive" });
    },
  });

  // Replace Excel file data (like Power BI refresh)
  const replaceExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/datasets/${selectedDatasetId}/replace`, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Replace failed');
      }
      
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({ 
        title: "Data updated successfully!", 
        description: data.message || `Updated with ${data.rowCount} rows` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const handleReplaceFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload .xlsx, .xls, or .csv files", 
        variant: "destructive" 
      });
      return;
    }
    
    replaceExcelMutation.mutate(file);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
    }
  };

  // Save conversation mutation
  const saveConversationMutation = useMutation({
    mutationFn: async ({ id, messages, datasetId, title }: { id?: string; messages: ChatMessage[]; datasetId: string | null; title?: string }) => {
      if (id) {
        await apiRequest("PATCH", `/api/conversations/${id}`, { messages, datasetId });
        return { id };
      } else {
        const res = await apiRequest("POST", "/api/conversations", { 
          datasetId, 
          title: title || "New Chat",
          messages 
        });
        return await res.json();
      }
    },
    onSuccess: (data: any) => {
      if (!currentConversationId && data.id) {
        setCurrentConversationId(data.id);
        onConversationCreated?.(data.id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", "/api/chat", {
        datasetId: selectedDatasetId,
        question,
        conversationHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        businessMode,
        useRag,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      const assistantMessage: ChatMessage = {
        role: "assistant" as const,
        content: data.response,
        timestamp: new Date(),
        context_source: data.context_source ?? undefined,
        aiProvider: data.aiProvider ?? undefined,
        rag_used: data.rag_used ?? undefined,
      };
      const newMessages = [...messages, assistantMessage];
      setMessages(newMessages);
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      
      // Save conversation - use the first question as the title
      const isFirstMessage = messages.length === 1; // Only the user message we just added
      const title = isFirstMessage ? pendingQuestionRef.current.slice(0, 50) : undefined;
      saveConversationMutation.mutate({ 
        id: currentConversationId || undefined, 
        messages: newMessages, 
        datasetId: selectedDatasetId || null,
        title
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
      // Remove the pending user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const pendingQuestionRef = useRef<string>("");

  const handleSend = () => {
    if (!input.trim()) return;
    if (!businessMode && !selectedDatasetId) {
      toast({ title: "Please select a dataset first", variant: "destructive" });
      return;
    }
    if ((usage?.used ?? 0) >= (usage?.limit ?? 5)) {
      setShowLimitModal(true);
      return;
    }

    const question = input.trim();
    pendingQuestionRef.current = question;
    
    const userMessage: ChatMessage = {
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    chatMutation.mutate(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const exportChatPdf = async () => {
    if (messages.length === 0) {
      toast({ title: "No messages to export", variant: "destructive" });
      return;
    }
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers,
        body: JSON.stringify({ chatSession: { messages, datasetName: selectedDataset?.spreadsheetName || "Chat Session" } }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-session-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Chat exported", description: "PDF downloaded successfully" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const selectedDataset = datasets?.find((d) => d.id === selectedDatasetId);
  const actionsRemaining = (usage?.limit ?? 5) - (usage?.used ?? 0);
  const datasetSuggestions = getDatasetSuggestions(selectedDataset);

  return (
    <div className={cn("h-full flex flex-col w-full", sidebarMode ? "p-0" : "px-4 md:px-8 lg:px-12")}>
      {/* Header */}
      {!sidebarMode && (
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h1 className="font-sans text-2xl font-bold">Chat with Your Data</h1>
            <p className="text-muted-foreground">Ask questions about your datasets in natural language</p>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportChatPdf} data-testid="button-export-chat-pdf">
                <Download className="w-4 h-4 mr-2" />Export Chat
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              Unlimited actions remaining today
            </span>
          </div>
        </div>
      )}

      {/* Hidden file input for Excel upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        data-testid="input-file-upload"
      />
      
      {/* Hidden file input for Excel replacement/update */}
      <input
        type="file"
        ref={replaceFileInputRef}
        className="hidden"
        accept=".xlsx,.xls,.csv"
        onChange={handleReplaceFileUpload}
        data-testid="input-replace-file"
      />

      {/* Dataset Selector — hidden in business mode or sidebar mode */}
      <Card className={`p-4 mb-4 ${businessMode || sidebarMode ? 'hidden' : ''}`}>
        <div className="flex items-center gap-4 flex-wrap">
          <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1 min-w-[200px]">
            {loadingDatasets ? (
              <Skeleton className="h-10 w-full" />
            ) : datasets && datasets.length > 0 ? (
              <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                <SelectTrigger data-testid="select-dataset">
                  <SelectValue placeholder="Select a dataset to chat with" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      {dataset.spreadsheetName} - {dataset.sheetName} ({dataset.rowCount} rows)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No datasets available. Upload a file or connect Google Sheets.
              </p>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Upload Excel button */}
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-background text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40 disabled:bg-background disabled:text-muted-foreground/60"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              data-testid="button-upload-excel"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Excel
            </Button>
            
            {/* Connect or Import Google Sheets button */}
            {!connectionStatus?.connected ? (
              <Button
                variant="outline"
                size="sm"
                className="border-border bg-background text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40 disabled:bg-background disabled:text-muted-foreground/60"
                onClick={() => connectGoogleMutation.mutate()}
                disabled={connectGoogleMutation.isPending}
                data-testid="button-connect-google"
              >
                {connectGoogleMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link className="w-4 h-4 mr-2" />
                )}
                Connect Sheets
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="border-border bg-background text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40"
                onClick={() => setShowSheetSelector(true)}
                data-testid="button-import-sheet"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Import Sheet
              </Button>
            )}
            
            {/* Refresh button for Google Sheets datasets - always visible when dataset selected */}
            {selectedDataset && selectedDataset.source !== 'excel' && (
              <Button
                variant="outline"
                size="sm"
                className="border-border bg-background text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40 disabled:bg-background disabled:text-muted-foreground/60"
                onClick={() => syncMutation.mutate(selectedDatasetId)}
                disabled={syncMutation.isPending}
                data-testid="button-refresh-dataset"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            )}
            
            {/* Update button for Excel datasets */}
            {selectedDataset && selectedDataset.source === 'excel' && (
              <Button
                variant="outline"
                size="sm"
                className="border-border bg-background text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40 disabled:bg-background disabled:text-muted-foreground/60"
                onClick={() => replaceFileInputRef.current?.click()}
                disabled={replaceExcelMutation.isPending}
                data-testid="button-update-excel"
              >
                {replaceExcelMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Update Data
              </Button>
            )}
          </div>
        </div>
        
        {/* Selected dataset info banner */}
        {selectedDataset && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{selectedDataset.sheetName}</span>
              <span className="text-xs text-muted-foreground">({selectedDataset.rowCount} rows)</span>
            </div>
            <span className="text-xs text-muted-foreground">
              from {selectedDataset.spreadsheetName}
            </span>
            {selectedDataset.source === 'excel' && (
              <span className="text-xs px-2 py-0.5 bg-muted rounded">Excel</span>
            )}
            {selectedDataset.source !== 'excel' && (
              <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-600 rounded">Google Sheets</span>
            )}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-4">
          <button
            onClick={() => setUseRag(!useRag)}
            className={`text-xs px-3 py-1.5 rounded-md font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              useRag
                ? 'bg-blue-500/15 text-blue-600 border border-blue-200'
                : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
            }`}
            data-testid="button-toggle-rag"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {useRag ? 'RAG Mode' : 'SQL Mode'}
          </button>
        </div>
        {selectedDataset && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{selectedDataset.rowCount} rows</span>
                {selectedDataset.source !== 'excel' && selectedDataset.lastSyncedAt && (
                  <>
                    <span>|</span>
                    <span>Last synced: {new Date(selectedDataset.lastSyncedAt).toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>
            <div 
              onMouseEnter={() => {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                hoverTimeoutRef.current = setTimeout(() => {
                  setShowColumns(true);
                  hideTimeoutRef.current = setTimeout(() => {
                    setShowColumns(false);
                  }, 3000);
                }, 3000);
              }}
              onMouseLeave={() => {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                setShowColumns(false);
              }}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Info className="w-3 h-3" />
                <span>Hover here for 3 seconds to view columns</span>
              </div>
              <AnimatePresence>
                {showColumns && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-muted-foreground mt-2 overflow-hidden"
                  >
                    <span className="font-medium">Columns:</span> {selectedDataset.headers.join(", ")}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </Card>

      {/* Chat Area */}
      <Card className={cn("flex-1 flex flex-col overflow-hidden", sidebarMode ? "border-none shadow-none rounded-none bg-transparent min-h-0 h-full" : "min-h-[500px]")}>
        <ScrollArea className={cn("flex-1", sidebarMode ? "p-3" : "p-6")} ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center py-12">
              <div>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Start a Conversation</h3>
                <p className="text-muted-foreground max-w-md">
                  Select a dataset above and ask questions like:
                </p>
                <div className="mt-4 space-y-2">
                  {datasetSuggestions.map((example) => (
                    <button
                      key={example}
                      onClick={() => setInput(example)}
                      className="block w-full text-sm text-left px-4 py-2 rounded-lg bg-muted/50 hover-elevate"
                      data-testid={`button-example-${example.slice(0, 10)}`}
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((message, i) => {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-amber-500" />
                        </div>
                      )}
                      <div
                        className={`max-w-[90%] px-5 py-4 rounded-2xl ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                        data-testid={`message-${message.role}-${i}`}
                      >
                        <p className="text-base whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <p className="text-xs opacity-60">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                          {message.role === "assistant" && message.context_source && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              message.context_source === 'rag_document' && message.rag_used ? 'bg-blue-500/15 text-blue-500' :
                              message.context_source === 'rag_document' ? 'bg-indigo-500/15 text-indigo-500' :
                              message.context_source === 'live_business_data' ? 'bg-amber-500/15 text-amber-600' :
                              'bg-muted-foreground/15 text-muted-foreground'
                            }`} data-testid="badge-context-source">
                              {message.context_source === 'rag_document' && message.rag_used ? 'RAG Enhanced' :
                               message.context_source === 'rag_document' ? 'Uploaded Data' :
                               message.context_source === 'live_business_data' ? 'Live Business Data' :
                               'General'}
                            </span>
                          )}
                          {message.role === "assistant" && message.aiProvider && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              message.aiProvider === 'groq' ? 'bg-green-500/15 text-green-600' : 'bg-muted-foreground/10 text-muted-foreground'
                            }`} data-testid="badge-ai-provider">
                              {message.aiProvider === 'groq' ? '⚡ Groq' : 'Gemini'}
                            </span>
                          )}
                        </div>
                      </div>
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {chatMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Analyzing your data...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className={cn("border-t border-border", sidebarMode ? "p-3 bg-white" : "p-6")}>
          {actionsRemaining <= 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted rounded-xl">
              <AlertCircle className="w-4 h-4" />
              <span>Daily limit reached. Come back tomorrow for more AI actions!</span>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <Button
                onClick={toggleVoiceInput}
                variant={isListening ? "default" : "outline"}
                size="icon"
                className={cn("rounded-xl flex-shrink-0", sidebarMode ? "h-10 w-10" : "h-[56px] w-[56px]", isListening ? "animate-pulse" : "")}
                data-testid="button-voice-input"
              >
                {isListening ? <MicOff className={sidebarMode ? "w-4 h-4" : "w-5 h-5"} /> : <Mic className={sidebarMode ? "w-4 h-4" : "w-5 h-5"} />}
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={businessMode ? "Ask about your business performance..." : selectedDatasetId ? "Ask anything about your data..." : "Select a dataset first..."}
                disabled={(!businessMode && !selectedDatasetId) || chatMutation.isPending}
                className={cn("resize-none rounded-xl", sidebarMode ? "min-h-10 h-10 py-2.5 text-xs" : "min-h-[56px] max-h-40 text-base")}
                rows={1}
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || (!businessMode && !selectedDatasetId) || chatMutation.isPending}
                size="icon"
                className={cn("rounded-xl flex-shrink-0", sidebarMode ? "h-10 w-10" : "h-[56px] w-[56px]")}
                data-testid="button-send-message"
              >
                <Send className={sidebarMode ? "w-4 h-4" : "w-5 h-5"} />
              </Button>
            </div>
          )}
        </div>
      </Card>
      
      <LimitReachedModal open={showLimitModal} onOpenChange={setShowLimitModal} />
      
      {/* Google Sheets Selector Dialog */}
      <Dialog open={showSheetSelector} onOpenChange={(open) => {
        setShowSheetSelector(open);
        if (!open) {
          setSheetSelectorStep("spreadsheets");
          setSelectedSpreadsheet(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {sheetSelectorStep === "sheets" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSheetSelectorStep("spreadsheets");
                    setSelectedSpreadsheet(null);
                  }}
                  data-testid="button-back-to-spreadsheets"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              {sheetSelectorStep === "spreadsheets" ? "Select a Spreadsheet" : `Select a Sheet`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto">
            {sheetSelectorStep === "spreadsheets" && (
              <>
                {loadingSpreadsheets ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : spreadsheets && spreadsheets.length > 0 ? (
                  <div className="space-y-2">
                    {spreadsheets.map((spreadsheet) => (
                      <button
                        key={spreadsheet.id}
                        onClick={() => {
                          setSelectedSpreadsheet(spreadsheet);
                          setSheetSelectorStep("sheets");
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover-elevate text-left"
                        data-testid={`spreadsheet-${spreadsheet.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className="w-5 h-5 text-green-600" />
                          <span className="font-medium truncate max-w-[280px]">{spreadsheet.name}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No spreadsheets found in your Google account.
                  </p>
                )}
              </>
            )}
            
            {sheetSelectorStep === "sheets" && selectedSpreadsheet && (
              <>
                {selectedSpreadsheet.sheets && selectedSpreadsheet.sheets.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSpreadsheet.sheets.map((sheet) => (
                      <button
                        key={sheet.sheetId}
                        onClick={() => {
                          importSheetMutation.mutate({
                            spreadsheetId: selectedSpreadsheet.id,
                            sheetId: sheet.sheetId,
                            sheetTitle: sheet.title,
                          });
                        }}
                        disabled={importSheetMutation.isPending}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover-elevate text-left disabled:opacity-50"
                        data-testid={`sheet-${sheet.sheetId}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{sheet.title}</span>
                        </div>
                        {importSheetMutation.isPending && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No sheets found in this spreadsheet.
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
