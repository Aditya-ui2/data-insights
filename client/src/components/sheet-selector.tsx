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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { 
  FileSpreadsheet, 
  ChevronRight, 
  Loader2, 
  Sparkles, 
  Check,
  ExternalLink,
  AlertCircle,
  Upload,
  ShoppingCart,
  Store,
  CreditCard,
  Receipt,
  Wallet,
  Megaphone,
  Facebook,
  BarChart3,
  Database
} from "lucide-react";
import type { GoogleSheet } from "@shared/schema";

interface SheetSelectorProps {
  onDashboardCreated: (dashboardId: string) => void;
  onDatasetCreated?: (datasetId: string) => void;
}

// Max file size will be checked server-side based on plan
// Client-side allows up to enterprise limit, server validates based on user's plan
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (Enterprise max)
const UPLOAD_TIMEOUT = 300000; // 5 minutes for large files

const INTEGRATION_APPS = [
  { id: "shopify", name: "Shopify Store", type: "shopify", description: "Sync orders, customers, and product metrics.", defaultName: "Shopify Store", defaultHost: "sandbox-store.myshopify.com", defaultDb: "shpat_mocktoken123", icon: ShoppingCart, color: "from-green-500/10 to-emerald-500/10", border: "border-green-200" },
  { id: "woocommerce", name: "WooCommerce", type: "woocommerce", description: "Connect e-commerce sales, stock, and checkouts.", defaultName: "WooCommerce Shop", defaultHost: "sandbox-woo.com", defaultDb: "woo_mockkey123", icon: Store, color: "from-purple-500/10 to-indigo-500/10", border: "border-purple-200" },
  { id: "stripe", name: "Stripe Payments", type: "stripe", description: "Pull payment logs, refunds, and collections.", defaultName: "Stripe Live", defaultHost: "sk_test_mock5123", defaultDb: "stripe_gateway", icon: CreditCard, color: "from-blue-500/10 to-sky-500/10", border: "border-blue-200" },
  { id: "zoho_books", name: "Zoho Books", type: "zoho_books", description: "Import accounting books, invoices, and expenses.", defaultName: "Zoho Books India", defaultHost: "api.zoho.in", defaultDb: "auth_mockzoho123", icon: Receipt, color: "from-red-500/10 to-orange-500/10", border: "border-red-200" },
  { id: "razorpay", name: "Razorpay API", type: "razorpay", description: "Capture UPI, cards, and payment gateway logs.", defaultName: "Razorpay Sandbox", defaultHost: "rzp_test_mock5123", defaultDb: "razorpay_gateway", icon: Wallet, color: "from-cyan-500/10 to-blue-500/10", border: "border-cyan-200" },
  { id: "google_ads", name: "Google Ads", type: "google_ads", description: "Monitor ad campaigns spend, reach, and ROI.", defaultName: "Google PPC Ads", defaultHost: "client_id_mock_123", defaultDb: "google_ads_network", icon: Megaphone, color: "from-yellow-500/10 to-amber-500/10", border: "border-yellow-200" },
  { id: "meta_ads", name: "Meta Ads", type: "meta_ads", description: "Track Facebook/Instagram budgets and conversions.", defaultName: "Meta Social Ads", defaultHost: "act_100200300400", defaultDb: "meta_ads_network", icon: Facebook, color: "from-blue-600/10 to-indigo-600/10", border: "border-blue-300" },
  { id: "ga4", name: "Google Analytics (GA4)", type: "ga4", description: "Analyze web traffic, purchases, and sessions.", defaultName: "GA4 Stream", defaultHost: "property_id_100200", defaultDb: "ga4_web", icon: BarChart3, color: "from-orange-500/10 to-yellow-500/10", border: "border-orange-200" },
  { id: "postgres", name: "PostgreSQL", type: "postgres", description: "Sync database customer logs and custom tables.", defaultName: "Postgres Database", defaultHost: "localhost", defaultDb: "postgres_db", icon: Database, color: "from-slate-500/10 to-gray-500/10", border: "border-slate-200" },
  { id: "mysql", name: "MySQL Database", type: "mysql", description: "Pull operational order tables and SQL data.", defaultName: "MySQL Production", defaultHost: "localhost", defaultDb: "mysql_db", icon: Database, color: "from-teal-500/10 to-emerald-500/10", border: "border-teal-200" }
];

export default function SheetSelector({ onDashboardCreated, onDatasetCreated }: SheetSelectorProps) {
  const [step, setStep] = useState<"connect" | "select-sheet" | "select-tab" | "generating">("connect");
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<GoogleSheet | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<{ sheetId: number; title: string } | null>(null);
  const [dashboardTitle, setDashboardTitle] = useState("");
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string | null>(null);
  const [skipAutoAdvance, setSkipAutoAdvance] = useState(false);
  const [autoAdvanceFromOAuth, setAutoAdvanceFromOAuth] = useState(false);
  const [syncSchedule, setSyncSchedule] = useState<string>("manual");
  const [scraperUrl, setScraperUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [connectingAppId, setConnectingAppId] = useState<string | null>(null);
  const [isShopifyModalOpen, setIsShopifyModalOpen] = useState(false);
  const [shopifyStoreName, setShopifyStoreName] = useState("sandbox-store");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIntegrationId, setPreviewIntegrationId] = useState<string | null>(null);
  const [previewDatasetId, setPreviewDatasetId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>("orders");
  const [selectedPreviewObject, setSelectedPreviewObject] = useState<string | null>("customers");
  const [checkedObjects, setCheckedObjects] = useState<string[]>(["customers", "orders", "products"]);
  const [searchQuery, setSearchQuery] = useState("");

  const SHOPIFY_OBJECTS = [
    { id: "customers", name: "Customers" },
    { id: "orders", name: "Orders" },
    { id: "products", name: "Products" },
    { id: "automatic_discount_nodes", name: "Automatic Discount Nodes" },
    { id: "automatic_discount_saved_searches", name: "Automatic Discount Saved Searches" },
    { id: "code_discount_nodes", name: "Code Discount Nodes" },
    { id: "code_discount_saved_searches", name: "Code Discount Saved Searches" },
    { id: "collection_saved_searches", name: "Collection Saved Searches" },
    { id: "collections", name: "Collections" },
    { id: "deletion_events", name: "Deletion Events" },
    { id: "delivery_profiles", name: "Delivery Profiles" },
    { id: "discount_redeem_code_saved_searches", name: "Discount Redeem Code Saved Searches" },
    { id: "draft_order_saved_searches", name: "Draft Order Saved Searches" },
    { id: "draft_orders", name: "Draft Orders" },
    { id: "file_saved_searches", name: "File Saved Searches" },
    { id: "files", name: "Files" },
    { id: "gift_cards", name: "Gift Cards" },
    { id: "inventory_items", name: "Inventory Items" },
    { id: "line_items", name: "Line Items" },
    { id: "locations", name: "Locations" },
    { id: "locations_available_for_delivery_profiles", name: "Locations Available For Delivery Profiles" },
    { id: "market_catalogs", name: "Market Catalogs" },
    { id: "market_catalogs_markets", name: "Market Catalogs Markets" },
    { id: "marketing_activities", name: "Marketing Activities" },
    { id: "order_saved_searches", name: "Order Saved Searches" }
  ];

  const [fieldsSearchQuery, setFieldsSearchQuery] = useState("");
  
  const OBJECT_FIELDS: Record<string, string[]> = {
    customers: [
      "id", "first_name", "last_name", "display_name", "email", "phone", "state", "note", "verified_email", 
      "tax_exempt", "multipass_identifier", "locale", "tags", "created_at", "updated_at",
      "amount_spent_amount", "amount_spent_currency_code",
      "default_address_address1", "default_address_address2", "default_address_city", 
      "default_address_province", "default_address_country", "default_address_zip",
      "last_order_id", "last_order_name", "last_order_created_at",
      "marketing_consent_state", "marketing_consent_opt_in_level",
      "can_delete", "data_sale_opt_out", "legacy_resource_id", "lifetime_duration", "mergeable"
    ],
    orders: [
      "id", "customer_id", "email", "total_price", "subtotal_price", "total_tax", "total_discounts", 
      "financial_status", "fulfillment_status", "currency", "created_at", "updated_at",
      "shipping_address_name", "shipping_address_city", "shipping_address_country", "shipping_address_zip",
      "billing_address_name", "billing_address_city", "billing_address_country", "billing_address_zip",
      "payment_details_credit_card_company", "payment_details_credit_card_number"
    ],
    products: [
      "id", "title", "body_html", "vendor", "product_type", "handle", "status", "published_scope", "tags", 
      "created_at", "updated_at",
      "variant_id", "variant_title", "variant_sku", "variant_price", "variant_inventory_quantity",
      "image_id", "image_src"
    ]
  };

  const [visibleFields, setVisibleFields] = useState<Record<string, string[]>>({
    customers: ["id", "display_name", "email", "phone", "amount_spent_amount", "created_at"],
    orders: ["id", "customer_id", "total_price", "status", "created_at"],
    products: ["id", "title", "variant_sku", "product_type"]
  });
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

  const connectAndSyncAppMutation = useMutation({
    mutationFn: async (app: typeof INTEGRATION_APPS[0]) => {
      setConnectingAppId(app.type);
      const createRes = await apiRequest("POST", "/api/copilot/integrations", {
        sourceName: app.defaultName,
        sourceType: app.type,
        config: {
          host: app.defaultHost,
          database: app.defaultDb,
          username: "demo_user"
        }
      });
      const integration = await createRes.json();
      
      const syncRes = await apiRequest("POST", `/api/copilot/integrations/${integration.id}/sync`);
      const syncResults = await syncRes.json();
      return { integration, syncResults };
    },
    onSuccess: (data) => {
      toast({ title: `${data.integration.sourceName} Connected`, description: "Initial sync complete! Generating dashboard..." });
      setPreviewIntegrationId(data.integration.id);
      setPreviewDatasetId(data.syncResults.datasetId);
      setPreviewData(data.syncResults.previewData || { orders: [], customers: [], products: [] });
      setIsPreviewOpen(true);
    },
    onError: (error: Error) => {
      toast({ title: "Connection Error", description: error.message || "Failed to connect", variant: "destructive" });
    },
    onSettled: () => {
      setConnectingAppId(null);
    }
  });

  const startOAuthFlow = async (appType: string, shopUrlInput?: string) => {
    const app = INTEGRATION_APPS.find(a => a.type === appType);
    if (!app) return;

    setConnectingAppId(app.type);
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const token = await getIdToken();
    const url = `/api/oauth/${app.type}/authorize?token=${encodeURIComponent(token || '')}` + 
      (shopUrlInput ? `&shopUrl=${encodeURIComponent(shopUrlInput)}` : "");

    const popup = window.open(
      url,
      `oauth_${app.type}`,
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      toast({
        title: "Popup Blocked",
        description: "Please enable popups in your browser to complete authorization.",
        variant: "destructive"
      });
      setConnectingAppId(null);
      return;
    }

    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'oauth_success' && event.data?.provider === app.type) {
        const integrationId = event.data.integrationId;
        window.removeEventListener('message', handleOAuthMessage);
        setConnectingAppId(null);
        
        triggerImportPreview(integrationId, app.name);
      } else if (event.data?.type === 'oauth_error') {
        window.removeEventListener('message', handleOAuthMessage);
        setConnectingAppId(null);
        toast({ title: "OAuth Failed", description: event.data.message || "Authorization was cancelled", variant: "destructive" });
      }
    };

    window.addEventListener('message', handleOAuthMessage);
  };

  const triggerImportPreview = async (integrationId: string, appName: string) => {
    setPreviewIntegrationId(integrationId);
    setPreviewLoading(true);
    setIsPreviewOpen(true);
    try {
      const syncRes = await apiRequest("POST", `/api/copilot/integrations/${integrationId}/sync`);
      const syncResults = await syncRes.json();
      setPreviewDatasetId(syncResults.datasetId);
      setPreviewData(syncResults.previewData || { orders: [], customers: [], products: [] });
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err.message || "Failed to retrieve preview schema.",
        variant: "destructive"
      });
      setIsPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAppConnectClick = async (app: typeof INTEGRATION_APPS[0]) => {
    if (app.type === "postgres" || app.type === "mysql") {
      connectAndSyncAppMutation.mutate(app);
    } else {
      if (app.type === "shopify") {
        setShopifyStoreName("sandbox-store");
        setIsShopifyModalOpen(true);
      } else {
        await startOAuthFlow(app.type);
      }
    }
  };

  const handleFinalImport = async () => {
    if (!previewDatasetId) return;
    
    setPreviewLoading(true);
    try {
      if (previewIntegrationId) {
        await apiRequest("PATCH", `/api/copilot/integrations/${previewIntegrationId}`, {
          syncSchedule
        });
      }
      
      const dashboardRes = await apiRequest("POST", "/api/dashboards/generate", {
        datasetId: previewDatasetId,
        title: `${selectedEntity.toUpperCase()} Shopify Dashboard`
      });
      const data = await dashboardRes.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      toast({ title: "Import Successful", description: "Dashboard linked successfully." });
      
      setIsPreviewOpen(false);
      if (onDatasetCreated) {
        onDatasetCreated(previewDatasetId);
      } else {
        onDashboardCreated(data.id);
      }
    } catch (err: any) {
      toast({
        title: "Import Failed",
        description: err.message || "Failed to finalize import.",
        variant: "destructive"
      });
    } finally {
      setPreviewLoading(false);
    }
  };

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

  const handleScrape = async () => {
    if (!scraperUrl) return;
    setScraping(true);
    try {
      const res = await apiRequest("POST", "/api/copilot/scraper", { url: scraperUrl });
      const data = await res.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({ title: "Scrape Successful", description: "Web page scraped and imported successfully." });
      
      if (onDatasetCreated) {
        onDatasetCreated(data.datasetId);
      } else {
        window.open(`/sheet/${data.datasetId}`, '_blank');
      }
    } catch (err: any) {
      toast({
        title: "Scrape Failed",
        description: err.message || "Failed to scrape target web page.",
        variant: "destructive"
      });
    } finally {
      setScraping(false);
    }
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const datasetRes = await apiRequest("POST", "/api/datasets", {
        spreadsheetId: selectedSpreadsheet!.id,
        spreadsheetName: selectedSpreadsheet!.name,
        sheetId: selectedSheet!.sheetId,
        sheetName: selectedSheet!.title,
        syncSchedule
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
            <Card className="relative overflow-hidden bg-white/90 backdrop-blur-lg border border-gray-200/80 p-8 md:p-10 shadow-xl rounded-lg">
              {/* Soft decorative background glows */}
              <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-gradient-to-tr from-amber-300/10 to-orange-400/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 rounded-full bg-gradient-to-tr from-emerald-300/10 to-teal-400/10 blur-3xl pointer-events-none" />

              {checkingConnection ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-emerald-500" />
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Verifying Connection Status...</p>
                </div>
              ) : uploadedDatasetId ? (
                <div className="space-y-6 max-w-md mx-auto text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto shadow-md">
                    <Check className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-black uppercase tracking-wider text-gray-800">File Selected Successfully</h2>
                    <p className="text-xs text-gray-500 font-medium">Define your new dashboard title below to generate views.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="upload-title" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dashboard Title</Label>
                      <Input
                        id="upload-title"
                        value={dashboardTitle}
                        onChange={(e) => setDashboardTitle(e.target.value)}
                        placeholder="e.g. Sales Report Q3"
                        className="rounded-none border-gray-300 focus-visible:ring-emerald-500 h-10 text-sm font-sans"
                        data-testid="input-upload-title"
                      />
                    </div>
                    <Button 
                      size="lg" 
                      onClick={handleGenerateFromUpload}
                      disabled={generateFromUploadMutation.isPending}
                      className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest h-11 shadow-none font-sans"
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
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center mx-auto mb-6 shadow-md shadow-orange-500/10 hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-widest text-gray-800">Import Your Data</h2>
                    <p className="text-xs text-gray-500 font-semibold max-w-sm mx-auto leading-relaxed mt-2">
                      Connect your spreadsheet sources or upload raw sheets files to build AI dashboards.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                      <Button
                        size="lg"
                        onClick={handleConnect}
                        disabled={connectMutation.isPending}
                        className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white font-bold text-xs uppercase tracking-widest h-12 px-6 shadow-md hover:shadow-lg transition-all rounded-none border-0 font-sans"
                        data-testid="button-connect-google"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        {connectMutation.isPending ? "Connecting..." : "Connect Google"}
                      </Button>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">or</span>
                      <Button 
                        size="lg" 
                        variant="outline" 
                        onClick={() => excelLimitReached ? toast({ title: "Excel limit reached", description: "Maximum 2 Excel files allowed. Delete existing files to upload more.", variant: "destructive" }) : fileInputRef.current?.click()}
                        disabled={uploadMutation.isPending}
                        className="rounded-none border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-widest h-12 px-6 transition-all shadow-sm font-sans"
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

                    <p className="text-[10px] text-gray-400 font-medium mt-4">
                      Supports .xlsx, .xls, .csv files up to 10MB ({excelCount}/2 slots occupied)
                    </p>
                    
                    {connectionStatus?.configured === false && (
                      <p className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 font-bold uppercase rounded-sm inline-block mt-4">
                        Notice: Google OAuth credentials missing in configuration (.env). Sheets access offline.
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-150 my-8" />

                  {/* App Store Connectors Grid */}
                  <div className="space-y-4 text-left">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Or Connect Third-Party Apps Directly</p>
                      <p className="text-[9px] text-gray-400 font-semibold mt-1">Click any application connector below to dynamically synchronize raw data into spreadsheets.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                      {INTEGRATION_APPS.map((app) => {
                        const AppIcon = app.icon;
                        const isConnecting = connectingAppId === app.type;
                        return (
                          <Card 
                            key={app.id} 
                            onClick={() => !isConnecting && handleAppConnectClick(app)}
                            className={cn(
                              "bg-white border border-gray-200 rounded-none p-4 shadow-sm flex flex-col justify-between h-36 hover:shadow-md cursor-pointer hover:border-blue-400 transition-all group relative overflow-hidden",
                              isConnecting && "opacity-60 cursor-not-allowed"
                            )}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded-sm bg-gray-50 border border-gray-150 group-hover:border-blue-200 group-hover:bg-blue-50/50 transition-colors shrink-0">
                                  {isConnecting ? (
                                    <Loader2 className="w-3.5 h-3.5 text-blue-650 animate-spin" />
                                  ) : (
                                    <AppIcon className="w-3.5 h-3.5 text-gray-600 group-hover:text-blue-650 transition-colors" />
                                  )}
                                </div>
                                <p className="text-[10px] font-bold text-gray-800 group-hover:text-blue-600 uppercase tracking-wider truncate font-sans transition-colors">{app.name}</p>
                              </div>
                              <p className="text-[9px] text-gray-400 group-hover:text-gray-500 leading-normal font-medium font-sans line-clamp-2 transition-colors">{app.description}</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              disabled={isConnecting}
                              className="w-full h-7 text-[8px] rounded-none font-bold uppercase tracking-widest bg-gray-50 hover:bg-blue-600 group-hover:bg-blue-600 text-gray-700 hover:text-white group-hover:text-white border-gray-200 group-hover:border-blue-600 mt-2 transition-all shadow-none font-sans"
                            >
                              {isConnecting ? "Linking..." : "Link & Sync"}
                            </Button>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
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
                    <Label htmlFor="sync-schedule">Auto Sync Schedule</Label>
                    <select
                      id="sync-schedule"
                      value={syncSchedule}
                      onChange={(e) => setSyncSchedule(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wider focus:outline-none focus:border-accent"
                    >
                      <option value="manual">Manual Sync</option>
                      <option value="hourly">Hourly Auto Sync</option>
                      <option value="daily">Daily Auto Sync</option>
                      <option value="weekly">Weekly Auto Sync</option>
                    </select>
                  </div>
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

      {/* Shopify Connection Dialog */}
      <Dialog open={isShopifyModalOpen} onOpenChange={setIsShopifyModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-none border border-gray-200 bg-white p-6 shadow-xl font-sans">
          <DialogHeader className="pb-4 border-b border-gray-150">
            <DialogTitle className="text-lg font-bold uppercase tracking-wide text-primary flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-accent" /> Connect Shopify
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Enter your Shopify store name to begin authorization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="store-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Shopify Store Name
              </Label>
              <div className="flex items-center">
                <Input
                  id="store-name"
                  value={shopifyStoreName}
                  onChange={(e) => setShopifyStoreName(e.target.value)}
                  placeholder="di-insights"
                  className="rounded-none border-gray-300 focus-visible:ring-accent h-10 text-sm flex-1 font-sans"
                />
                <span className="bg-gray-100 border border-l-0 border-gray-300 h-10 px-3 flex items-center text-xs text-muted-foreground font-semibold font-mono rounded-none">
                  .myshopify.com
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                You can find your Shopify store name in your browser's address bar when logged into Shopify Partners or admin.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150">
            <Button
              variant="outline"
              onClick={() => setIsShopifyModalOpen(false)}
              className="rounded-none border-gray-300 hover:bg-gray-50 text-xs font-bold uppercase tracking-wider h-10 px-5 font-sans"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsShopifyModalOpen(false);
                const fullShopUrl = `${shopifyStoreName.trim()}.myshopify.com`;
                await startOAuthFlow("shopify", fullShopUrl);
              }}
              className="rounded-none bg-[#008060] hover:bg-[#006e52] text-white font-semibold text-xs uppercase tracking-wider h-10 px-5 shadow-none font-sans"
            >
              Authorize
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl w-[90vw] h-[85vh] rounded-none border border-gray-200 bg-white p-0 shadow-2xl flex flex-col font-sans">
          
          {/* Header */}
          <div className="p-5 border-b border-gray-150 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm bg-[#008060] flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  Import Preview: Shopify
                </DialogTitle>
                <DialogDescription className="text-[10px] text-gray-500 font-medium mt-0.5">
                  Select Shopify objects from checklist to populate matching spreadsheet tabs.
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-none border-gray-300 text-[10px] font-bold uppercase tracking-wider h-9 px-4 font-sans"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFinalImport}
                disabled={previewLoading || checkedObjects.length === 0}
                className="rounded-none bg-[#008060] hover:bg-[#006e52] text-white font-bold text-[10px] uppercase tracking-wider h-9 px-5 shadow-none font-sans"
              >
                {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Import ({checkedObjects.length})
              </Button>
            </div>
          </div>

          {/* Split Body */}
          <div className="flex-1 min-h-0 flex bg-gray-50/30">
            {previewLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider animate-pulse">
                  Syncing schema metadata & records...
                </p>
              </div>
            ) : (
              <>
                {/* Left side: Checklist of fields for active object */}
                <div className="w-80 border-r border-gray-150 bg-white p-4 overflow-y-auto flex flex-col gap-4 shrink-0">
                  
                  {/* Category Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shopify Object</label>
                    <select
                      value={selectedPreviewObject || "customers"}
                      onChange={(e) => setSelectedPreviewObject(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-250 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-none focus:outline-none focus:border-blue-600 font-sans cursor-pointer"
                    >
                      {SHOPIFY_OBJECTS.map((obj) => (
                        <option key={obj.id} value={obj.id}>{obj.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-gray-100 my-1" />

                  {/* Active Object Header & Search */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                        {SHOPIFY_OBJECTS.find(o => o.id === selectedPreviewObject)?.name || "Fields"}
                      </span>
                      <button
                        onClick={() => {
                          const currentObj = selectedPreviewObject || "customers";
                          const allFieldsOfObj = OBJECT_FIELDS[currentObj] || ["id", "title"];
                          const isAllSelected = (visibleFields[currentObj] || []).length === allFieldsOfObj.length;
                          
                          setVisibleFields(prev => ({
                            ...prev,
                            [currentObj]: isAllSelected ? [] : [...allFieldsOfObj]
                          }));
                        }}
                        className="text-[9px] font-black text-blue-650 hover:underline uppercase"
                      >
                        Toggle All
                      </button>
                    </div>

                    <div className="relative">
                      <span className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5">🔍</span>
                      <input
                        type="text"
                        placeholder="Search fields..."
                        value={fieldsSearchQuery}
                        onChange={(e) => setFieldsSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-250 pl-8 pr-3 py-2 text-xs rounded-none focus:outline-none focus:border-blue-600 font-sans"
                      />
                    </div>
                  </div>

                  {/* Fields Checklist Tree */}
                  <div className="space-y-1.5 flex-1 min-h-0">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Fields Checklist</span>
                    <div className="space-y-3.5">
                      {(() => {
                        const currentObj = selectedPreviewObject || "customers";
                        const fieldsList = OBJECT_FIELDS[currentObj] || ["id", "title", "status", "created_at"];
                        const filtered = fieldsList.filter(f => f.toLowerCase().replace(/_/g, ' ').includes(fieldsSearchQuery.toLowerCase()));
                        
                        const groups: Record<string, string[]> = {};
                        const standalones: string[] = [];

                        filtered.forEach(f => {
                          let groupName = "";
                          if (f.startsWith("amount_spent_")) groupName = "Amount Spent";
                          else if (f.startsWith("default_address_")) groupName = "Default Address";
                          else if (f.startsWith("last_order_")) groupName = "Last Order";
                          else if (f.startsWith("marketing_consent_")) groupName = "Marketing Consent";
                          else if (f.startsWith("shipping_address_")) groupName = "Shipping Address";
                          else if (f.startsWith("billing_address_")) groupName = "Billing Address";
                          else if (f.startsWith("payment_details_")) groupName = "Payment Details";
                          else if (f.startsWith("variant_")) groupName = "Variant Details";
                          else if (f.startsWith("image_")) groupName = "Image Details";

                          if (groupName) {
                            if (!groups[groupName]) groups[groupName] = [];
                            groups[groupName].push(f);
                          } else {
                            standalones.push(f);
                          }
                        });

                        const isFieldChecked = (fid: string) => (visibleFields[currentObj] || []).includes(fid);
                        const toggleField = (fid: string) => {
                          setVisibleFields(prev => {
                            const current = prev[currentObj] || [];
                            const updated = current.includes(fid) ? current.filter(x => x !== fid) : [...current, fid];
                            return { ...prev, [currentObj]: updated };
                          });
                        };

                        return (
                          <div className="flex flex-col gap-3">
                            {/* Standalone fields first */}
                            {standalones.map(f => (
                              <label key={f} className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isFieldChecked(f)}
                                  onChange={() => toggleField(f)}
                                  className="w-4 h-4 accent-blue-650 rounded-none cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-gray-700 tracking-tight capitalize font-sans">
                                  {f.replace(/_/g, ' ')}
                                </span>
                              </label>
                            ))}

                            {/* Group Accordions */}
                            {Object.entries(groups).map(([groupName, groupFields]) => {
                              const selectedInGroup = groupFields.filter(f => isFieldChecked(f)).length;
                              const isAllGroupSelected = selectedInGroup === groupFields.length;
                              
                              return (
                                <div key={groupName} className="space-y-1.5 border border-gray-100 p-2.5 bg-gray-50/50">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wide">
                                      📂 {groupName} ({selectedInGroup}/{groupFields.length} selected)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setVisibleFields(prev => {
                                          const current = prev[currentObj] || [];
                                          const next = isAllGroupSelected
                                            ? current.filter(x => !groupFields.includes(x))
                                            : [...current, ...groupFields.filter(x => !current.includes(x))];
                                          return { ...prev, [currentObj]: next };
                                        });
                                      }}
                                      className="text-[9px] font-black text-blue-650 hover:underline uppercase"
                                    >
                                      {isAllGroupSelected ? "None" : "All"}
                                    </button>
                                  </div>
                                  
                                  <div className="pl-3.5 space-y-1.5 pt-1 border-l border-gray-200">
                                    {groupFields.map(f => (
                                      <label key={f} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={isFieldChecked(f)}
                                          onChange={() => toggleField(f)}
                                          className="w-3.5 h-3.5 accent-blue-650 rounded-none cursor-pointer"
                                        />
                                        <span className="text-[11px] font-medium text-gray-600 tracking-tight capitalize font-sans">
                                          {f.replace(groupName.toLowerCase().replace(" ", "_") + "_", "").replace("details_", "").replace(/_/g, ' ')}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Right side: Live Preview Grid */}
                <div className="flex-1 min-w-0 bg-gray-50 p-6 overflow-auto">
                  {selectedPreviewObject ? (
                    (() => {
                      const dataKey = Object.keys(previewData || {}).find(k => k.toLowerCase() === selectedPreviewObject.toLowerCase());
                      const sampleRows = dataKey ? previewData[dataKey] : [
                        { Id: `id-${selectedPreviewObject}-1`, Title: `Mock sandbox record 1`, Status: "active", CreatedAt: "2026-07-19" },
                        { Id: `id-${selectedPreviewObject}-2`, Title: `Mock sandbox record 2`, Status: "inactive", CreatedAt: "2026-07-19" }
                      ];
                      
                      const activeObj = selectedPreviewObject || "customers";
                      const availableCols = Object.keys(sampleRows[0] || {}).filter(k => k !== "custom_fields" && k !== "variants");
                      const checkedCols = (visibleFields[activeObj] || []).filter(c => availableCols.includes(c));
                      const displayCols = checkedCols.length > 0 ? checkedCols : availableCols;

                      return (
                        <div className="bg-white border border-gray-200 shadow-sm min-h-full flex flex-col overflow-hidden font-sans">
                          <div className="p-4 border-b border-gray-150 shrink-0 flex items-center justify-between bg-white">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                              Data Preview: {selectedPreviewObject.toUpperCase()}
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase">
                              Sandbox preview ({sampleRows.length} rows, {displayCols.length} columns)
                            </span>
                          </div>
                          
                          <div className="flex-1 overflow-auto bg-white">
                            <table className="w-full border-collapse text-left text-[11px] font-sans">
                              <thead className="bg-gray-50 border-b border-gray-205 sticky top-0 z-10">
                                <tr>
                                  {displayCols.map((col) => (
                                    <th key={col} className="p-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 border-r border-gray-200">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {sampleRows.map((row: any, rIdx: number) => (
                                  <tr key={rIdx} className="hover:bg-gray-50 transition-colors">
                                    {displayCols.map((col) => (
                                      <td key={col} className="p-3 border-r border-gray-150 text-gray-650 truncate max-w-[200px] font-semibold">
                                        {typeof row[col] === "object" ? JSON.stringify(row[col]) : String(row[col] ?? "")}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-full p-12 text-center font-sans">
                      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-2xl text-blue-600">
                        📂
                      </div>
                      <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Select Object to Preview</h3>
                      <p className="text-[10px] text-gray-400 font-medium max-w-sm mt-1 leading-relaxed">
                        Click any Shopify entity in the left checklist to load its sample database records here.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
