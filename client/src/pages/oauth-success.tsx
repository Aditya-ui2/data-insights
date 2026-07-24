import { useEffect, useState } from "react";

function CustomDVLogo() {
  return (
    <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#c59b43]/50 shadow-md flex items-center justify-center bg-[#0d221e] shrink-0 p-1.5 mx-auto">
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Dark Background */}
        <rect width="100" height="100" rx="18" fill="#0d221e" />
        {/* Outer Gold D */}
        <path d="M 22 22 H 48 C 66 22 66 56 48 56 H 22 V 22 Z" stroke="#eab308" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Inner Gold D */}
        <path d="M 32 32 H 46 C 54 32 54 46 46 46 H 32 V 32 Z" stroke="#eab308" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Interconnected Green V */}
        <path d="M 44 48 L 60 78 L 78 34" stroke="#10b981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M 50 48 L 60 69 L 72 38" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}

export default function OAuthSuccessPage() {
  const [countdown, setCountdown] = useState(1);

  useEffect(() => {
    // Notify parent window (Google Sheets sidebar)
    try {
      localStorage.setItem("dv_shopify_auth_status", "approved_" + Date.now());
      if (window.opener) {
        window.opener.postMessage("dv_shopify_authorized", "*");
      }
    } catch (e) {
      console.error(e);
    }

    const timer = setTimeout(() => {
      setCountdown(0);
      window.close();
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full min-h-screen bg-white text-[#13322b] font-sans flex flex-col items-center justify-center p-6 select-none antialiased">
      
      <div className="text-center space-y-4 max-w-sm animate-in fade-in zoom-in duration-200">
        
        {/* DigitValues Logo Icon with Brand Name */}
        <div className="flex items-center justify-center gap-2.5">
          <CustomDVLogo />
          <span className="text-xl font-bold text-[#13322b] tracking-tight">DigitValues</span>
        </div>

        {/* Exact Coefficient Success Text */}
        <div className="space-y-1 pt-2">
          <h1 className="text-base font-bold text-gray-900">Your connection was successful!</h1>
          <p className="text-xs text-gray-500 font-normal">
            This page will automatically close in <span className="font-semibold text-gray-700">{countdown} second</span>.
          </p>
        </div>

      </div>

    </div>
  );
}
