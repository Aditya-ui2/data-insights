import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getIdToken } from "@/lib/firebase";
import { 
  FileSpreadsheet, 
  ChevronRight, 
  Loader2, 
  Sparkles, 
  Check,
  ExternalLink,
  AlertCircle,
  Upload,
} from "lucide-react";
import type { GoogleSheet } from "@shared/schema";

interface SheetSelectorProps {
  onDashboardCreated: (dashboardId: string) => void;
}

// Max file size will be checked server-side based on plan
// Client-side allows up to enterprise limit, server validates based on user's plan
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (Enterprise max)
const UPLOAD_TIMEOUT = 300000; // 5 minutes for large files

export default function SheetSelector({ onDashboardCreated }: SheetSelectorProps) {
  const [step, setStep] = useState<"connect" | "select-sheet" | "select-tab" | "generating">("connect");
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<GoogleSheet | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<{ sheetId: number; title: string } | null>(null);
  const [dashboardTitle, setDashboardTitle] = useState("");
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string | null>(null);
  const [skipAutoAdvance, setSkipAutoAdvance] = useState(false);
  const [autoAdvanceFromOAuth, setAutoAdvanceFromOAuth] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get("google_connected");
    const googleError = params.get("google_error");

    if (googleConnected === "true") {
      setAutoAdvanceFromOAuth(true);
      toast({ title: "Google connected", description: "You can now select a spreadsheet." });
    }

    if (googleError) {
      const description =
        "If Google shows an unverified app warning, click Advanced and then Continue to Data Insights. If you clicked Back to safety, press Connect Google again.";
      toast({ title: "Google connection not completed", description, variant: "destructive" });
    }

    if (googleConnected || googleError) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [toast]);

  const { data: connectionStatus, isLoading: checkingConnection } = useQuery<{ connected: boolean; configured?: boolean }>({
    queryKey: ["/api/google/status"],
  });

  const { data: spreadsheets, isLoading: loadingSheets, refetch: refetchSheets } = useQuery<GoogleSheet[]>({
    queryKey: ["/api/spreadsheets"],
    enabled: connectionStatus?.connected === true,
  });

  // Check Excel upload limit
  const { data: datasets } = useQuery<{ id: string; source?: string | null }[]>({
    queryKey: ["/api/datasets"],
  });
  const excelCount = datasets?.filter(d => d.source === 'excel').length ?? 0;
  const excelLimitReached = excelCount >= 2;

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/google/auth-url");
      const { url } = await res.json();
      window.location.href = url;
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ 
        title: "Google Sheets not available", 
        description: error.message || "Please use Excel file upload instead.", 
        variant: "destructive" 
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      // Use AbortController for timeout handling on large files
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
          // Try to parse error response, handle case where response is incomplete
          try {
            const err = await res.json();
            throw new Error(err.message || 'Upload failed');
          } catch {
            throw new Error(`Upload failed with status ${res.status}. The file may be too large or server is busy.`);
          }
        }
        
        // Handle potentially large response
        const text = await res.text();
        if (!text) {
          throw new Error('Empty response from server. Please try again.');
        }
        
        try {
          return JSON.parse(text);
        } catch {
          throw new Error('Invalid response from server. Please try again.');
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Upload timed out. Please try a smaller file or try again later.');
        }
        throw error;
      }
    },
    onSuccess: (dataset: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      setUploadedDatasetId(dataset.id);
      setDashboardTitle(dataset.spreadsheetName);
      const message = dataset.wasSampled 
        ? `Uploaded ${dataset.rowCount} rows (sampled from ${dataset.originalRowCount})`
        : `Uploaded ${dataset.rowCount} rows successfully`;
      toast({ title: "File uploaded!", description: message });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const generateFromUploadMutation = useMutation({
    mutationFn: async () => {
      const dashboardRes = await apiRequest("POST", "/api/dashboards/generate", {
        datasetId: uploadedDatasetId,
        title: dashboardTitle,
      });
      return await dashboardRes.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      toast({ title: "Dashboard created successfully!" });
      onDashboardCreated(data.id);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to generate dashboard", variant: "destructive" });
      setStep("connect");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 100MB", variant: "destructive" });
      return;
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast({ title: "Invalid file type", description: "Please upload .xlsx, .xls, or .csv files", variant: "destructive" });
      return;
    }
    
    // Show processing toast for large files
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 5) {
      toast({ 
        title: "Processing large file", 
        description: `Uploading ${fileSizeMB.toFixed(1)}MB file. This may take a moment...` 
      });
    }
    
    uploadMutation.mutate(file);
  };

  const handleGenerateFromUpload = () => {
    setStep("generating");
    generateFromUploadMutation.mutate();
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const datasetRes = await apiRequest("POST", "/api/datasets", {
        spreadsheetId: selectedSpreadsheet!.id,
        spreadsheetName: selectedSpreadsheet!.name,
        sheetId: selectedSheet!.sheetId,
        sheetName: selectedSheet!.title,
      });
      const dataset = await datasetRes.json();
      
      const dashboardRes = await apiRequest("POST", "/api/dashboards/generate", {
        datasetId: dataset.id,
        title: dashboardTitle || `${selectedSpreadsheet!.name} - ${selectedSheet!.title}`,
      });
      return await dashboardRes.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      toast({ title: "Dashboard created successfully!" });
      onDashboardCreated(data.id);
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
        description: error.message || "Failed to generate dashboard",
        variant: "destructive",
      });
      setStep("select-tab");
    },
  });

  const handleConnect = () => {
    if (connectionStatus?.configured === false) {
      toast({
        title: "Google OAuth not configured",
        description: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env, then restart server.",
        variant: "destructive",
      });
      return;
    }
    setSkipAutoAdvance(false);
    connectMutation.mutate();
  };

  const handleBackToConnect = () => {
    setSelectedSpreadsheet(null);
    setSelectedSheet(null);
    setStep("connect");
    setSkipAutoAdvance(true);
  };

  const handleSelectSpreadsheet = (sheet: GoogleSheet) => {
    setSelectedSpreadsheet(sheet);
    setStep("select-tab");
  };

  const handleSelectSheet = (sheet: { sheetId: number; title: string }) => {
    setSelectedSheet(sheet);
    setDashboardTitle(`${selectedSpreadsheet!.name} - ${sheet.title}`);
  };

  const handleGenerate = () => {
    if (!selectedSheet) {
      toast({ title: "Please select a sheet tab", variant: "destructive" });
      return;
    }
    setStep("generating");
    generateMutation.mutate();
  };

  // Check if connected and switch to sheet selection
  useEffect(() => {
    if (!connectionStatus?.connected) {
      setSkipAutoAdvance(false);
      return;
    }
    if (connectionStatus.connected && autoAdvanceFromOAuth && step === "connect" && !skipAutoAdvance) {
      setStep("select-sheet");
      setAutoAdvanceFromOAuth(false);
    }
  }, [connectionStatus?.connected, autoAdvanceFromOAuth, step, skipAutoAdvance]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {["Connect", "Select Sheet", "Generate"].map((label, i) => {
          const stepNum = i + 1;
          const isActive = 
            (step === "connect" && stepNum === 1) ||
            (step === "select-sheet" && stepNum === 2) ||
            (step === "select-tab" && stepNum === 2) ||
            (step === "generating" && stepNum === 3);
          const isComplete = 
            (step !== "connect" && stepNum === 1) ||
            ((step === "generating") && stepNum === 2);

          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isComplete
                    ? "bg-amber-500 text-black"
                    : isActive
                    ? "bg-amber-500/20 text-amber-500 border-2 border-amber-500"
                    : "bg-muted border border-amber-500/30 text-amber-500/80"
                }`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span className={`text-sm ${isActive ? "font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Connect Google */}
        {step === "connect" && (
          <motion.div
            key="connect"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-8 text-center">
              {checkingConnection ? (
                <div className="py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Checking connection status...</p>
                </div>
              ) : uploadedDatasetId ? (
                <div className="space-y-6">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="font-serif text-2xl font-bold">File Uploaded</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="upload-title">Dashboard Title</Label>
                      <Input
                        id="upload-title"
                        value={dashboardTitle}
                        onChange={(e) => setDashboardTitle(e.target.value)}
                        placeholder="Enter dashboard title"
                        data-testid="input-upload-title"
                      />
                    </div>
                    <Button 
                      size="lg" 
                      onClick={handleGenerateFromUpload}
                      disabled={generateFromUploadMutation.isPending}
                      data-testid="button-generate-from-upload"
                    >
                      {generateFromUploadMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Generate Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <FileSpreadsheet className="w-8 h-8 text-amber-500" />
                  </div>
                  <h2 className="font-serif text-2xl font-bold mb-2">Import Your Data</h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Connect Google Sheets or upload an Excel file to create AI-powered dashboards.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button
                      size="lg"
                      onClick={handleConnect}
                      disabled={connectMutation.isPending}
                      className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                      data-testid="button-connect-google"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      {connectMutation.isPending ? "Connecting..." : "Connect Google"}
                    </Button>
                    <span className="text-muted-foreground">or</span>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={() => excelLimitReached ? toast({ title: "Excel limit reached", description: "Maximum 2 Excel files allowed. Delete existing files to upload more.", variant: "destructive" }) : fileInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                      data-testid="button-upload-file"
                    >
                      {uploadMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload Excel File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-file-upload"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    If Google shows "app not verified", choose Advanced and continue to Data Insights.
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    {excelLimitReached 
                      ? `Excel limit: ${excelCount}/2 (delete existing files to upload more)`
                      : `Supports .xlsx, .xls, .csv files up to 10MB (${excelCount}/2 used)`
                    }
                  </p>
                  {connectionStatus?.configured === false && (
                    <p className="text-xs text-amber-500 mt-2">
                      Google API keys missing. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable Google Sheets.
                    </p>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        )}

        {/* Step 2: Select Spreadsheet */}
        {step === "select-sheet" && (
          <motion.div
            key="select-sheet"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Excel Upload Option */}
            {uploadedDatasetId ? (
              <Card className="p-6 mb-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Excel File Uploaded</p>
                      <p className="text-sm text-muted-foreground">{dashboardTitle}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upload-title-sheet">Dashboard Title</Label>
                    <Input
                      id="upload-title-sheet"
                      value={dashboardTitle}
                      onChange={(e) => setDashboardTitle(e.target.value)}
                      placeholder="Enter dashboard title"
                      data-testid="input-upload-title-sheet"
                    />
                  </div>
                  <Button 
                    className="w-full"
                    onClick={handleGenerateFromUpload}
                    disabled={generateFromUploadMutation.isPending}
                    data-testid="button-generate-from-upload-sheet"
                  >
                    {generateFromUploadMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Dashboard from Excel
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-4 mb-4 border-dashed">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {excelLimitReached 
                        ? `Excel limit reached (${excelCount}/2)`
                        : `Or upload an Excel file (${excelCount}/2 used)`
                      }
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => excelLimitReached ? toast({ title: "Excel limit reached", description: "Maximum 2 Excel files allowed.", variant: "destructive" }) : fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending || excelLimitReached}
                    data-testid="button-upload-file-sheet"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Excel
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file-upload-sheet"
                  />
                </div>
              </Card>
            )}

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="sm" onClick={handleBackToConnect} data-testid="button-back-to-connect">
                  Back
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="font-medium">Google Sheets</span>
              </div>

              <h2 className="font-serif text-xl font-bold mb-2">Select a Spreadsheet</h2>
              <p className="text-muted-foreground mb-6">Choose which Google Sheet you want to analyze.</p>

              {loadingSheets ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : spreadsheets && spreadsheets.length > 0 ? (
                <div className="space-y-3">
                  {spreadsheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => handleSelectSpreadsheet(sheet)}
                      className="w-full p-4 rounded-lg border border-border text-left hover-elevate flex items-center gap-4"
                      data-testid={`button-sheet-${sheet.id}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{sheet.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {sheet.sheets.length} sheet{sheet.sheets.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No spreadsheets found in your Google Drive.</p>
                  <Button variant="outline" onClick={() => refetchSheets()} data-testid="button-refresh-sheets">
                    Refresh List
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Step 2b: Select Sheet Tab */}
        {step === "select-tab" && selectedSpreadsheet && (
          <motion.div
            key="select-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="sm" onClick={() => setStep("select-sheet")} data-testid="button-back-to-sheets">
                  Back
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="font-medium">{selectedSpreadsheet.name}</span>
              </div>

              <h2 className="font-serif text-xl font-bold mb-2">Select a Sheet Tab</h2>
              <p className="text-muted-foreground mb-6">Choose which sheet tab contains the data you want to visualize.</p>

              <div className="space-y-3 mb-6">
                {selectedSpreadsheet.sheets.map((sheet) => (
                  <button
                    key={sheet.sheetId}
                    onClick={() => handleSelectSheet(sheet)}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      selectedSheet?.sheetId === sheet.sheetId
                        ? "border-primary bg-primary/10"
                        : "border-border hover-elevate"
                    }`}
                    data-testid={`button-tab-${sheet.sheetId}`}
                  >
                    <div className="flex items-center gap-3">
                      {selectedSheet?.sheetId === sheet.sheetId ? (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted" />
                      )}
                      <span className="font-medium">{sheet.title}</span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedSheet && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label htmlFor="dashboard-title">Dashboard Title</Label>
                    <Input
                      id="dashboard-title"
                      value={dashboardTitle}
                      onChange={(e) => setDashboardTitle(e.target.value)}
                      placeholder="Enter a title for your dashboard"
                      data-testid="input-dashboard-title"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={handleGenerate}
                    data-testid="button-generate-dashboard"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Dashboard with AI
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Step 3: Generating */}
        {step === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-12 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-6"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="font-serif text-2xl font-bold mb-2">Creating Your Dashboard</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                AI is analyzing your data and generating the perfect visualizations. This usually takes about 30 seconds...
              </p>
              <div className="mt-8 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
