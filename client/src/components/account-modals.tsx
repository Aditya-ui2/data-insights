import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Mail, BarChart3, Shield, Moon, Sun } from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserType | null;
}

export function ProfileModal({ open, onOpenChange, user }: ModalProps) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/auth/user", { firstName, lastName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated successfully!" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </DialogTitle>
          <DialogDescription>
            Manage your personal information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.profileImageUrl ?? undefined} />
              <AvatarFallback className="text-xl">
                {user?.firstName?.[0] ?? user?.email?.[0] ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "User"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                data-testid="input-profile-firstname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                data-testid="input-profile-lastname"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{user?.email}</span>
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
          </div>
          
          <Button 
            onClick={() => updateMutation.mutate()} 
            className="w-full"
            disabled={updateMutation.isPending}
            data-testid="button-save-profile"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsModal({ open, onOpenChange, user }: ModalProps) {
  const { data: googleStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/google/status"],
    enabled: open,
  });

  const { data: datasets } = useQuery<{ id: string; source?: string }[]>({
    queryKey: ["/api/datasets"],
    enabled: open,
  });

  const excelCount = datasets?.filter(d => d.source === "excel").length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your account settings and connections
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="font-medium">Connected Accounts</h3>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">Google Sheets</p>
                  <p className="text-xs text-muted-foreground">
                    {googleStatus?.connected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${googleStatus?.connected ? "bg-green-500" : "bg-muted"}`} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Usage Limits</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily AI Actions</span>
                <span>5 per day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Excel Uploads</span>
                <span>{excelCount} / 2</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Data & Privacy</h3>
            <p className="text-sm text-muted-foreground">
              Your data is stored securely and never shared with third parties.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppearanceModal({ open, onOpenChange }: ModalProps) {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sun className="w-5 h-5" />
            Appearance
          </DialogTitle>
          <DialogDescription>
            Customize how DataInsights looks on your device
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="font-medium">Theme</h3>
            <div className="grid grid-cols-3 gap-2">
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-md border transition-colors ${
                    theme === value 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover-elevate"
                  }`}
                  data-testid={`button-theme-${value}`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AboutModal({ open, onOpenChange }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            About DataInsights
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="font-serif text-xl font-bold">DataInsights</h2>
            <p className="text-sm text-muted-foreground">Version 1.0.0</p>
          </div>
          
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              DataInsights is an AI-powered analytics platform that transforms your Google Sheets 
              and Excel data into beautiful, interactive dashboards.
            </p>
            <div className="space-y-2">
              <p className="font-medium">Features:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Connect Google Sheets or upload Excel files</li>
                <li>AI-generated dashboards with charts and KPIs</li>
                <li>Natural language chat with your data</li>
                <li>Shareable dashboard links</li>
                <li>Auto-refresh for Google Sheets data</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Support: </span>
              <a href="mailto:sarthakjhalani8@gmail.com" className="text-primary underline">
                sarthakjhalani8@gmail.com
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by Google Gemini AI
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
