import React from "react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      <header className="border-b border-gray-200 bg-white/95 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-sans font-bold text-xl text-primary tracking-wide">DigitValues</span>
          </div>
          <Button variant="ghost" asChild className="text-xs uppercase tracking-wider font-semibold">
            <a href="/">Back to Home</a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-3">Terms of Service</h1>
        <p className="text-xs text-gray-500 mb-8">Last Updated: July 20, 2026</p>

        <section className="space-y-6">
          <p className="leading-relaxed">
            Welcome to DigitValues! By using our website (https://digitvalues.vercel.app), our Google Sheets™ extension, or any of our related services, you agree to comply with and be bound by the following Terms of Service. Please read them carefully.
          </p>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">1. Description of Service</h2>
            <p className="leading-relaxed">
              DigitValues provides AI-powered analytics and automation data connectors designed to integrate live Shopify, Stripe, and Salesforce databases directly inside your Google Sheets™ spreadsheets.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">2. User Accounts and Data Privacy</h2>
            <p className="leading-relaxed">
              To utilize certain features, you must authorize DigitValues to connect to third-party APIs. Your sync configurations and credentials are encrypted and securely stored. We do not access, share, or sell your personal business databases.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">3. Use of Google Services and Trademarks</h2>
            <p className="leading-relaxed">
              DigitValues integrates with Google Workspace APIs. Google Sheets™ is a trademark of Google LLC. DigitValues is an independent software solution and is not officially endorsed or sponsored by Google LLC.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">4. Limitation of Liability</h2>
            <p className="leading-relaxed">
              DigitValues is provided "as is" without warranty of any kind. Under no circumstances shall DigitValues be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our platform or data synchronizers.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">5. Contact Information</h2>
            <p className="leading-relaxed">
              If you have any questions or require support regarding these Terms, please contact us at: support@digitvalues.com.
            </p>
          </div>
        </section>

        <footer className="mt-16 pt-6 border-t border-gray-150 text-xs text-gray-400 text-center">
          <p>© 2026 DigitValues. Google Sheets™ is a trademark of Google LLC.</p>
        </footer>
      </main>
    </div>
  );
}
