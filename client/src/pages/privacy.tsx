import React from "react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-3">Privacy Policy</h1>
        <p className="text-xs text-gray-500 mb-8">Last Updated: July 20, 2026</p>

        <section className="space-y-6">
          <p className="leading-relaxed">
            At DigitValues, your privacy is our utmost priority. This Privacy Policy describes how we collect, use, and protect your information when you access our platform, use our Google Sheets™ extension, or connect Shopify, Stripe, and Salesforce data sources.
          </p>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">1. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li><strong>Authentication Data:</strong> When you connect through Google OAuth or third-party platforms (Shopify, Stripe, Salesforce), we store encrypted tokens. We do not store your passwords.</li>
              <li><strong>Spreadsheet Data Access:</strong> Our Google Sheets™ extension accesses spreadsheets only to write the imported data rows. We do not store, copy, or monitor the contents of your unrelated sheets.</li>
              <li><strong>Usage Data:</strong> We collect anonymous telemetry data to optimize system performance and diagnose API exceptions.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">2. How We Use Information</h2>
            <p className="leading-relaxed">
              We use collected tokens and parameters solely to run the automated synchronization tasks requested by you. We do not share, sell, or disclose your integration parameters or database schemas to any third parties.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">3. Google API Scopes Disclosure</h2>
            <p className="leading-relaxed">
              DigitValues' use and transfer to any other app of information received from Google APIs will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">4. Security</h2>
            <p className="leading-relaxed">
              All data transfers between your Google Sheets™ spreadsheets, our backend synchronizers, and Shopify/Stripe/Salesforce endpoints are fully encrypted in transit using industry-standard TLS 1.3 encryption protocols.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">5. Contact Information</h2>
            <p className="leading-relaxed">
              If you have any questions or require support regarding our privacy practices, please contact us at: privacy@digitvalues.com.
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
