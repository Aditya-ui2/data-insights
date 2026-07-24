import { useState } from "react";
import { Key, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function ShopifyAuthPage() {
  const [isDone, setIsDone] = useState(false);

  const handleConfirm = () => {
    // Redirect to Coefficient style OAuth attempt success callback page
    window.location.href = "/oauth_attempt?status=success&error_message=None&from=addon";
  };

  return (
    <div className="w-full min-h-screen bg-[#181818] text-white flex flex-col items-center justify-center p-4 font-sans select-none antialiased">
      
      {/* Top Header Logo */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[#95bf47]/20 flex items-center justify-center p-3.5 border border-[#95bf47]/40 shadow-xl">
          <img 
            src="https://cdn.simpleicons.org/shopify/95BF47" 
            alt="Shopify" 
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-xs text-gray-400 font-mono tracking-wider">accounts.shopify.com/confirm_security_settings</span>
      </div>

      {/* Main Security Card */}
      <div className="bg-white text-[#13322b] rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {isDone ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Authorization Successful!</h2>
            <p className="text-xs text-gray-500">Connecting your store data to DigitValues Google Sheets Addon...</p>
            <p className="text-[11px] text-gray-400 italic">This window will close automatically.</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-gray-900">Review your security settings</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Keep your account safe by making sure your security settings are up-to-date before granting spreadsheet access.
              </p>
            </div>

            {/* Passkeys Block */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-gray-400">Passkeys</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full">Recommended</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Log in with your fingerprint, face recognition, or PIN instead of a password across devices.
              </p>
              <button className="w-full py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 flex items-center justify-center gap-2 shadow-2xs hover:bg-gray-50">
                <Key className="w-4 h-4 text-gray-500" />
                <span>Create a passkey</span>
              </button>
            </div>

            {/* 2FA Block */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-gray-400">Two-Step Authentication</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                You don't have two-step turned on. Add an extra layer of security so only you can access your store data.
              </p>
            </div>

            {/* Recovery Options */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-600">Secondary Email</span>
              <span className="text-xs font-bold text-gray-400">Off</span>
            </div>

            {/* Confirm & Authorize Action Button */}
            <button 
              onClick={handleConfirm}
              className="w-full py-3.5 bg-[#13322b] hover:bg-[#1a473d] active:bg-[#0d221e] text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#c59b43]" />
              <span>Confirm & Authorize</span>
            </button>

            <div className="text-center">
              <button onClick={handleConfirm} className="text-xs font-medium text-gray-500 hover:text-gray-900 underline">
                Remind me next time
              </button>
            </div>
          </>
        )}

      </div>

    </div>
  );
}
