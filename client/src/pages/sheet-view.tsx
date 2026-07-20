import { useRoute, useLocation } from "wouter";
import GoogleSheetsSimulator from "@/components/google-sheets-simulator";

export default function SheetViewPage() {
  const [, params] = useRoute("/sheet/:id");
  const [, navigate] = useLocation();
  const datasetId = params ? params.id : undefined;

  if (!datasetId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-6 text-center font-sans">
        <h1 className="text-lg font-bold text-red-500">Invalid Sheet ID</h1>
        <p className="text-sm text-muted-foreground mt-2">No sheet identifier was provided.</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-white">
      <div className="flex-1">
        <GoogleSheetsSimulator 
          datasetId={datasetId} 
          onClose={() => {
            // First try to close the tab, otherwise navigate
            if (window.opener || window.history.length === 1) {
              window.close();
            } else {
              navigate("/home?view=datasets");
            }
          }} 
          fullHeight={true}
        />
      </div>
    </div>
  );
}
