import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  RefreshCw, 
  CloudUpload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle,
  Database,
  Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SpreadsheetWorkspaceProps {
  datasetId: string;
  onClose: () => void;
}

export default function SpreadsheetWorkspace({ datasetId, onClose }: SpreadsheetWorkspaceProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("");
  const [gridData, setGridData] = useState<Record<string, any[]>>({});
  const [pendingEdits, setPendingEdits] = useState<Record<string, Record<string, Record<string, any>>>>({});
  // Structure: { [entity]: { [rowId]: { [field]: newValue } } }

  const { data: previewRes, isLoading, error, refetch } = useQuery<{
    success: boolean;
    source: string;
    data: Record<string, any[]>;
  }>({
    queryKey: [`/api/datasets/${datasetId}/preview`],
    enabled: !!datasetId,
  });

  // Set default tab and grid data once fetched
  useEffect(() => {
    if (previewRes?.data) {
      setGridData(previewRes.data);
      const tabs = Object.keys(previewRes.data);
      if (tabs.length > 0 && !activeTab) {
        setActiveTab(tabs[0]);
      }
    }
  }, [previewRes, activeTab]);

  // Pull latest updates mutation
  const pullMutation = useMutation({
    mutationFn: async () => {
      const dsRes = await fetch(`/api/datasets`);
      const datasets = await dsRes.json();
      const dataset = datasets.find((d: any) => d.id === datasetId);
      if (!dataset) throw new Error("Dataset not found.");

      const integrationId = dataset.spreadsheetId.substring("conn_".length);
      await apiRequest("POST", `/api/copilot/integrations/${integrationId}/sync`);
    },
    onSuccess: () => {
      toast({
        title: "Sync completed",
        description: "Latest Shopify data pulled and spreadsheet updated successfully.",
      });
      refetch();
      setPendingEdits({});
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
    },
    onError: (err: any) => {
      toast({
        title: "Sync failed",
        description: err.message || "Failed to pull latest Shopify updates.",
        variant: "destructive",
      });
    }
  });

  // Push updates writeback mutation
  const pushMutation = useMutation({
    mutationFn: async ({ entity, rowId, recordData }: { entity: string; rowId: string; recordData: any }) => {
      await apiRequest("POST", `/api/datasets/${datasetId}/writeback`, {
        entity,
        recordData: { id: rowId, ...recordData }
      });
    },
    onSuccess: () => {
      toast({
        title: "Updates pushed successfully",
        description: "Spreadsheet edits synced to Shopify database.",
      });
      setPendingEdits(prev => {
        const next = { ...prev };
        if (next[activeTab]) {
          delete next[activeTab];
        }
        return next;
      });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: "Push failed",
        description: err.message || "Failed to push updates to Shopify store.",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4 bg-white border border-gray-200">
        <RefreshCw className="w-8 h-8 text-accent animate-spin" />
        <p className="text-xs text-muted-foreground font-sans font-semibold uppercase tracking-wider">
          Loading live connected spreadsheet...
        </p>
      </div>
    );
  }

  if (error || !previewRes) {
    return (
      <div className="p-12 text-center bg-white border border-gray-200">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-sans text-base font-bold text-primary uppercase">Failed to load spreadsheet</h3>
        <p className="text-xs text-muted-foreground font-sans mt-2 mb-6">
          {error?.message || "Verify your connection settings and try again."}
        </p>
        <Button onClick={onClose} variant="outline" className="rounded-none font-bold uppercase tracking-wider text-xs shadow-none">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Datasets
        </Button>
      </div>
    );
  }

  const tabs = Object.keys(gridData);
  const activeRows = gridData[activeTab] || [];
  
  // Get active fields headers from actual rows dynamically
  const activeHeaders = activeRows.length > 0 
    ? Object.keys(activeRows[0]).filter(k => k !== "variants" && k !== "customer" && k !== "line_items")
    : [];

  const handleCellChange = (rowId: string, field: string, value: any) => {
    setPendingEdits(prev => {
      const entityEdits = prev[activeTab] || {};
      const rowEdits = entityEdits[rowId] || {};
      const updatedRowEdits = { ...rowEdits, [field]: value };
      return {
        ...prev,
        [activeTab]: {
          ...entityEdits,
          [rowId]: updatedRowEdits
        }
      };
    });
  };

  const hasUnsavedChanges = Object.keys(pendingEdits[activeTab] || {}).length > 0;

  const handlePushUpdates = () => {
    const entityEdits = pendingEdits[activeTab];
    if (!entityEdits) return;

    // Send edits for each edited row (usually inline editing changes a few rows)
    Object.entries(entityEdits).forEach(([rowId, recordData]) => {
      pushMutation.mutate({
        entity: activeTab,
        rowId,
        recordData
      });
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-[#fbfaf7] border border-gray-200">
      {/* Spreadsheet Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8 rounded-none border border-gray-200 hover:bg-gray-50 shrink-0 shadow-none">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-accent shrink-0" />
              <h2 className="text-sm font-bold text-primary uppercase tracking-wide truncate">
                Shopify Live Spreadsheet
              </h2>
              <Badge variant="outline" className="text-[9px] uppercase font-bold text-accent bg-accent/5 border-accent/20 rounded-none shrink-0 tracking-wider">
                {previewRes.source} Connected
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-sans font-semibold">
              Live bi-directional sync enabled &middot; Double-click cells to modify values.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 px-3 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
              Unsaved Changes
            </div>
          )}

          <Button
            onClick={() => pullMutation.mutate()}
            disabled={pullMutation.isPending || pushMutation.isPending}
            className="rounded-none bg-white border border-gray-200 text-primary hover:bg-gray-50 hover:text-accent font-bold uppercase tracking-wider text-xs h-9 px-4 shadow-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${pullMutation.isPending ? "animate-spin" : ""}`} />
            Pull Latest
          </Button>

          <Button
            onClick={handlePushUpdates}
            disabled={!hasUnsavedChanges || pushMutation.isPending || pullMutation.isPending}
            className="rounded-none bg-accent text-white hover:bg-accent-hover font-bold uppercase tracking-wider text-xs h-9 px-4 shadow-none"
          >
            <CloudUpload className="w-3.5 h-3.5 mr-2" />
            Push Updates
          </Button>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="flex-1 overflow-auto bg-white relative">
        {activeRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-24 space-y-3">
            <Database className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground font-sans font-bold uppercase tracking-wider">
              No records found in this sheet.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-auto text-xs font-sans">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <th className="w-10 p-3 text-center border-r border-gray-200 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-gray-50">
                  #
                </th>
                {activeHeaders.map(h => (
                  <th key={h} className="p-3 border-r border-gray-200 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-gray-50">
                    {h.replace("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row, idx) => {
                const rowId = String(row.id);
                const isEdited = pendingEdits[activeTab]?.[rowId] !== undefined;

                return (
                  <tr 
                    key={rowId || idx} 
                    className={`border-b border-gray-150 transition-colors hover:bg-gray-50/50 ${isEdited ? "bg-amber-50/30" : ""}`}
                  >
                    <td className="p-3 text-center border-r border-gray-150 font-semibold text-muted-foreground bg-gray-50/40 select-none">
                      {idx + 1}
                    </td>
                    {activeHeaders.map(field => {
                      const originalValue = row[field];
                      const currentValue = pendingEdits[activeTab]?.[rowId]?.[field] !== undefined
                        ? pendingEdits[activeTab][rowId][field]
                        : originalValue;
                      
                      const isFieldEdited = pendingEdits[activeTab]?.[rowId]?.[field] !== undefined;
                      const isReadOnly = field === "id" || field === "created_at" || field === "status" || field === "customer_id";

                      return (
                        <td 
                          key={field} 
                          className={`p-1.5 border-r border-gray-150 font-sans relative ${
                            isFieldEdited ? "bg-amber-50/50 border-2 border-amber-400" : ""
                          } ${isReadOnly ? "bg-gray-50/20" : ""}`}
                        >
                          {isReadOnly ? (
                            <div className="px-1.5 py-1 text-muted-foreground flex items-center gap-1.5 select-none font-medium">
                              <span>{String(currentValue ?? "")}</span>
                              <Lock className="w-2.5 h-2.5 opacity-40 shrink-0" />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={String(currentValue ?? "")}
                              onChange={(e) => handleCellChange(rowId, field, e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent border border-transparent rounded-none focus:outline-none focus:bg-white focus:border-accent hover:border-gray-200 transition-all font-medium text-primary"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Spreadsheet Bottom Sheet Selector tabs (Coefficient-Style) */}
      <div className="h-10 bg-gray-50 border-t border-gray-200 flex items-center px-4 gap-1.5 overflow-x-auto select-none">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-2 font-sans">
          Tabs:
        </div>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-full px-4 text-[10px] font-bold uppercase tracking-wider font-sans border-t-2 transition-all flex items-center gap-1.5 ${
              activeTab === tab
                ? "bg-white border-t-accent text-accent border-r border-l border-gray-200 font-extrabold"
                : "border-t-transparent text-muted-foreground hover:text-primary hover:bg-gray-100/50"
            }`}
          >
            <Database className="w-3 h-3" />
            {tab}
            {Object.keys(pendingEdits[tab] || {}).length > 0 && (
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
