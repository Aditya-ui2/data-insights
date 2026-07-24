import { useLocation } from "wouter";

export default function ShopifyStoreErrorPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const shopName = searchParams.get("shop") || "store-name";

  return (
    <div className="w-full min-h-screen bg-[#0b0f17] text-white font-sans flex flex-col items-center justify-between p-6 select-none antialiased">
      
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl py-6 flex items-center justify-start">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white font-medium transition-colors"
        >
          <span>← Shopify</span>
        </button>
      </div>

      {/* Main Center Hero Message */}
      <div className="text-center space-y-6 max-w-xl mx-auto my-auto py-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          This store will be right back
        </h1>
        
        <p className="text-sm md:text-base text-gray-300 font-normal leading-relaxed">
          Shopify is working to bring it back online as soon as possible.
        </p>

        <div className="flex items-center justify-center gap-6 pt-4">
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-transparent border border-gray-400 hover:border-white text-white font-semibold text-sm rounded-full transition-all"
          >
            Refresh the page
          </button>
          
          <a 
            href="https://www.shopify.com/free-trial" 
            target="_blank" 
            rel="noreferrer"
            className="text-sm font-semibold text-white underline underline-offset-4 hover:text-gray-200 transition-colors"
          >
            Start a free trial
          </a>
        </div>
      </div>

      {/* Bottom Help Card Box */}
      <div className="w-full max-w-3xl mb-8 bg-[#121824] rounded-2xl border border-gray-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            Help for store owners
          </span>
          <h2 className="text-xl font-bold text-white">
            Check Shopify's status
          </h2>
          <p className="text-xs text-gray-400">
            Find out if there's an outage affecting more than just this store on Shopify.
          </p>
        </div>

        <a 
          href="https://www.shopify-status.com" 
          target="_blank" 
          rel="noreferrer"
          className="px-5 py-2.5 bg-transparent border border-gray-600 hover:border-white text-white font-semibold text-xs rounded-full transition-all shrink-0"
        >
          View Shopify systems status
        </a>
      </div>

    </div>
  );
}
