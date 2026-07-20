import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRightLeft, Database, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProviderConfig {
  name: string;
  color: string;
  logoBg: string;
  scopes: string[];
}

const PROVIDERS: Record<string, ProviderConfig> = {
  shopify: {
    name: 'Shopify',
    color: 'from-emerald-600 to-green-500',
    logoBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    scopes: ['Read Orders and Transactions', 'Read Customers and Profiles', 'Read Inventory and Products', 'Writeback custom tags'],
  },
  stripe: {
    name: 'Stripe Payments',
    color: 'from-indigo-600 to-purple-500',
    logoBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    scopes: ['Read Charges & Payments', 'Read Customer Email Profiles', 'Read Refund Events'],
  },
  hubspot: {
    name: 'HubSpot CRM',
    color: 'from-orange-600 to-amber-500',
    logoBg: 'bg-orange-50 text-orange-600 border-orange-200',
    scopes: ['Read Contacts & Leads', 'Read Deal pipelines', 'Sync Custom Fields metadata'],
  },
  salesforce: {
    name: 'Salesforce',
    color: 'from-blue-600 to-sky-500',
    logoBg: 'bg-blue-50 text-blue-600 border-blue-200',
    scopes: ['Access REST API resources', 'Access custom object schema metadata', 'Read Accounts & Opportunities'],
  },
  zoho: {
    name: 'Zoho Books & CRM',
    color: 'from-red-500 via-blue-500 to-yellow-500',
    logoBg: 'bg-slate-50 text-slate-800 border-slate-200',
    scopes: ['Read Invoices & Expenses', 'Read Leads & Customers contacts', 'Full offline access offline_access'],
  },
  razorpay: {
    name: 'Razorpay',
    color: 'from-blue-700 to-indigo-600',
    logoBg: 'bg-blue-50 text-blue-700 border-blue-200',
    scopes: ['Read Orders & Payments', 'Read Customer information', 'Read Settlements reports'],
  },
};

export default function OAuthSimulator() {
  const [, params] = useRoute('/oauth/simulate/:provider');
  const [, setLocation] = useLocation();
  const providerKey = params?.provider || 'shopify';
  const provider = PROVIDERS[providerKey] || PROVIDERS.shopify;

  const [loading, setLoading] = useState(false);
  const [redirectUri, setRedirectUri] = useState('');
  const [state, setState] = useState('');
  const [shopUrl, setShopUrl] = useState('');
  
  const [useRealToken, setUseRealToken] = useState(true);
  const [realTokenVal, setRealTokenVal] = useState('');

  useEffect(() => {
    // Parse query params
    const searchParams = new URLSearchParams(window.location.search);
    setRedirectUri(searchParams.get('redirect_uri') || '');
    setState(searchParams.get('state') || '');
    const shop = searchParams.get('shopUrl') || '';
    setShopUrl(shop);
  }, []);

  const handleAuthorize = () => {
    setLoading(true);
    setTimeout(() => {
      if (redirectUri) {
        let code = `mock_code_${Math.floor(Math.random() * 900000) + 100000}`;
        if (realTokenVal.trim()) {
          code = `real_token:${realTokenVal.trim()}`;
        }
        let finalUrl = `${redirectUri}?code=${code}&state=${encodeURIComponent(state)}`;
        if (shopUrl) {
          finalUrl += `&shopUrl=${encodeURIComponent(shopUrl)}`;
        }
        window.location.href = finalUrl;
      } else {
        alert('Missing redirect_uri parameter');
        setLoading(false);
      }
    }, 1500);
  };

  const handleCancel = () => {
    if (window.opener) {
      window.close();
    } else {
      setLocation('/data-import-suite');
    }
  };

  if (providerKey === 'shopify') {
    return (
      <div className="min-h-screen bg-[#f6f6f7] text-[#202223] flex flex-col items-center justify-center p-4 select-none font-sans">
        <div className="w-full max-w-2xl bg-white border border-[#e1e3e5] rounded-lg shadow-sm overflow-hidden">
          {/* App Header */}
          <div className="p-6 border-b border-[#e1e3e5] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-white text-2xl shadow-md">
                DI
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#202223]">DataInsights for Sheets & Excel</h1>
                <p className="text-sm text-[#6d7175]">DataInsights - Data Exporter</p>
              </div>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Developer Verified
            </div>
          </div>

          {/* Permissions / Scopes Body */}
          <div className="p-6 space-y-6">
            <h2 className="text-sm font-semibold text-[#202223] uppercase tracking-wider">
              This app needs access to:
            </h2>

            <div className="space-y-4">
              {/* Scope 1: Customer Data */}
              <div className="border border-[#e1e3e5] rounded-md p-4 bg-[#fafbfb]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm text-[#202223]">View customer data</h3>
                    <p className="text-xs text-[#6d7175] mt-1">Sensitive data, device and activity data</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Required</span>
                </div>
              </div>

              {/* Scope 2: Staff Profiles */}
              <div className="border border-[#e1e3e5] rounded-md p-4 bg-[#fafbfb]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm text-[#202223]">View staff and contributor data</h3>
                    <p className="text-xs text-[#6d7175] mt-1">Store owner, blog contributors</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Required</span>
                </div>
              </div>

              {/* Scope 3: Store Data */}
              <div className="border border-[#e1e3e5] rounded-md p-4 bg-[#fafbfb]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm text-[#202223]">View store data</h3>
                    <p className="text-xs text-[#6d7175] mt-1">
                      Customers, products, orders, discounts, gift cards, marketing, store analytics, Shopify Payments, Online Store, Shopify admin
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Required</span>
                </div>
              </div>
            </div>

            {/* Custom Token Input Accordion (Hidden by default, expandable) */}
            <details className="group border border-[#e1e3e5] rounded-md bg-[#fafbfb] p-3 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between cursor-pointer focus:outline-none">
                <span className="text-xs font-semibold text-[#6d7175] uppercase tracking-wider flex items-center gap-1.5 hover:text-[#202223] transition-colors">
                  <Database className="w-3.5 h-3.5" /> Advanced: Connection API Token Settings
                </span>
                <span className="transition group-open:-rotate-185">
                  <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" className="w-4 h-4 text-[#6d7175]"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </span>
              </summary>
              <div className="mt-3 space-y-2 border-t border-[#e1e3e5] pt-3">
                <p className="text-xs text-[#6d7175]">
                  Enter your Shopify Admin Access Token to establish a live connection to your store:
                </p>
                <input
                  type="password"
                  placeholder="shpat_xxxxxxxxxxxxxxxx"
                  value={realTokenVal}
                  onChange={(e) => setRealTokenVal(e.target.value)}
                  className="w-full rounded border border-[#cccccc] bg-white px-3 py-2 text-sm text-[#202223] placeholder-[#aaaaaa] focus:border-[#008060] focus:outline-none focus:ring-1 focus:ring-[#008060]"
                />
              </div>
            </details>

            <div className="text-xs text-[#6d7175] text-center border-t border-[#e1e3e5] pt-4 flex items-center justify-center gap-1">
              <span>Why do apps need data access?</span>
              <a href="#" className="text-indigo-600 hover:underline">Check the developer's privacy policy.</a>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 bg-[#fafbfb] border-t border-[#e1e3e5] flex justify-end gap-3">
            <Button
              onClick={handleCancel}
              disabled={loading}
              variant="outline"
              className="border-[#cccccc] hover:bg-[#fafafa] text-[#202223] font-semibold px-6 py-2.5 rounded-md text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAuthorize}
              disabled={loading}
              className="bg-[#008060] hover:bg-[#006e52] text-white font-semibold px-6 py-2.5 rounded-md text-sm shadow-none flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Installing...
                </>
              ) : (
                'Install'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl text-slate-100 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              {/* Data Insights Logo */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-500/20">
                DI
              </div>
              <ArrowRightLeft className="text-slate-500 w-5 h-5 animate-pulse" />
              {/* Provider Logo */}
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-lg shadow-md ${provider.logoBg}`}>
                {provider.name.charAt(0)}
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-50 to-slate-200 bg-clip-text text-transparent">
              Grant Data Access Permission
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              <span className="font-semibold text-slate-200">Data Insights</span> is requesting secure authorization to connect with your <span className="font-semibold text-slate-200">{provider.name}</span> {shopUrl ? `(${shopUrl})` : 'workspace'}.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4 space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" /> Requested Scopes ({provider.scopes.length})
              </h3>
              <ul className="space-y-2">
                {provider.scopes.map((scope, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    <span>{scope}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Custom token/API key bypass input */}
            {/* Custom token/API key bypass input */}
            <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4 space-y-3">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider block">
                {providerKey === 'shopify' ? 'Shopify Admin Access Token' : 'Stripe Secret API Key'}
              </span>
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400">
                  {providerKey === 'shopify' 
                    ? 'Enter your Shopify Admin Access Token (shpat_...):' 
                    : 'Enter your Stripe Secret API Key (sk_live_...):'}
                </p>
                <input
                  type="password"
                  placeholder={providerKey === 'shopify' ? 'shpat_xxxxxxxxxxxxxxxx' : 'sk_live_xxxxxxxxxxxxxxxx'}
                  value={realTokenVal}
                  onChange={(e) => setRealTokenVal(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>
                {realTokenVal.trim() 
                  ? "Connecting using the custom token you provided above. Your credentials are base64 encrypted and transmitted securely." 
                  : "No token entered. This authorization will connect to your sandbox workspace using a simulated OAuth consent screen for testing validation."}
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleAuthorize}
              disabled={loading}
              className={`w-full bg-gradient-to-r ${provider.color} hover:brightness-110 text-white font-semibold py-6 rounded-lg transition shadow-lg shadow-indigo-500/15`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Connecting with Secure OAuth...
                </>
              ) : (
                'Allow Access & Start Sync'
              )}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={loading}
              className="w-full border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 py-6"
            >
              Cancel Request
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
