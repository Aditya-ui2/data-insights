import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function BusinessJoin() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  // Parse the ?token= query parameter from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
  }, [location]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No invite token provided");
      await apiRequest("POST", "/api/business/members/accept-invite", { token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/profile"] });
      toast({
        title: "Welcome to the team!",
        description: "You have successfully joined the business.",
      });
      navigate("/business");
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to accept invite",
        description: err?.message || "The invite link may be expired or invalid.",
        variant: "destructive",
      });
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Invalid Invite Link</h2>
          <p className="text-muted-foreground mb-6">
            This invite link is missing a token. Please use the link from your invitation email.
          </p>
          <Button variant="outline" onClick={() => navigate("/")} data-testid="button-go-home">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-8 h-8 text-amber-500" />
        </div>

        <h2 className="text-2xl font-bold mb-2">You've Been Invited</h2>
        <p className="text-muted-foreground mb-8">
          You have been invited to join a business on DataInsights. Click below to accept the
          invitation and access the Business Suite.
        </p>

        {acceptMutation.isSuccess ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <p className="text-green-600 font-medium">Invitation accepted!</p>
            <p className="text-sm text-muted-foreground">Redirecting you to the Business Suite…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              data-testid="button-accept-invite"
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting…
                </>
              ) : (
                "Accept Invitation"
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              disabled={acceptMutation.isPending}
              data-testid="button-decline-invite"
            >
              Decline
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
