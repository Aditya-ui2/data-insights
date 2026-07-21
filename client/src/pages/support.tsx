import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, ShieldCheck, ArrowLeft } from "lucide-react";

export default function SupportPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast({
        title: "Message Sent Successfully",
        description: "Our support team will contact you at " + email + " within 24 hours.",
      });
      setName("");
      setEmail("");
      setMessage("");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/95 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-sans font-bold text-xl text-primary tracking-wide">DigitValues</span>
          </div>
          <Button variant="ghost" asChild className="text-xs uppercase tracking-wider font-semibold">
            <a href="/" className="flex items-center gap-1.5"><ArrowLeft className="w-3.5 h-3.5" /> Back to Home</a>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">DigitValues Support Center</h1>
          <p className="text-lg text-gray-600">
            Have questions about Shopify, Stripe or Salesforce integrations? Our technical experts are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-start">
          {/* Support Info */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-gray-50 border border-gray-150 p-6 rounded-none space-y-4">
              <h3 className="font-sans font-bold text-gray-900 text-base uppercase tracking-wider">Contact Information</h3>
              
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Direct Support Email</p>
                  <a href="mailto:support@digitvalues.com" className="text-blue-600 underline">support@digitvalues.com</a>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-gray-600">
                <MessageSquare className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Response Time Guarantee</p>
                  <p>All support requests are reviewed and answered within 24 hours.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-4 bg-green-50/50 border border-green-150 rounded-none text-xs text-green-800">
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
              <span>Your security token details and API configurations remain completely private.</span>
            </div>
          </div>

          {/* Support Form */}
          <div className="md:col-span-3 bg-white border border-gray-200 p-8 shadow-xl rounded-none">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Submit a Support Ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name" className="text-xs uppercase font-bold tracking-wider text-gray-700">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="rounded-none mt-1 border-gray-300 focus:border-accent"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-xs uppercase font-bold tracking-wider text-gray-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="rounded-none mt-1 border-gray-300 focus:border-accent"
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-xs uppercase font-bold tracking-wider text-gray-700">Message / Issue Details</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or custom sync requirements..."
                  rows={5}
                  required
                  className="rounded-none mt-1 border-gray-300 focus:border-accent"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 uppercase tracking-wider text-xs rounded-none border border-primary"
              >
                {submitting ? "Sending Ticket..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>

        <footer className="mt-20 pt-6 border-t border-gray-150 text-xs text-gray-400 text-center">
          <p>© 2026 DigitValues. Google Sheets™ is a trademark of Google LLC.</p>
        </footer>
      </main>
    </div>
  );
}
