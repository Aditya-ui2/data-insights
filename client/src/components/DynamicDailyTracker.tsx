/**
 * DynamicDailyTracker – Employee component to fill dynamic tracking templates
 * Renders forms based on admin-configured templates and submits data to tracking logs.
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getIdToken } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  ClipboardList,
  Check,
  Star,
  Calendar,
  Clock,
  Hash,
  Type,
  DollarSign,
  FileText,
  List,
  CheckSquare,
  AlertCircle,
  ChevronRight,
  Send,
  Edit,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { TrackingTemplate, TrackingLog, TrackingFieldConfig } from "@shared/schema";

// ── Types ────────────────────────────────────────────────────────────────────
interface BusinessProfile {
  id: string;
  name: string;
  memberRole: string;
  currencySymbol?: string;
}

interface TemplateWithLog extends TrackingTemplate {
  todayLog?: TrackingLog;
}

// ── Helper ───────────────────────────────────────────────────────────────────
async function authFetch(url: string, options: RequestInit = {}) {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { ...options, headers, credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json();
}

const FIELD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  number: Hash,
  text: Type,
  textarea: FileText,
  currency: DollarSign,
  select: List,
  date: Calendar,
  time: Clock,
  checkbox: CheckSquare,
  rating: Star,
};

// ── Star Rating Component ────────────────────────────────────────────────────
function StarRating({ value, onChange, max = 5 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className="focus:outline-none"
        >
          <Star
            className={cn(
              "w-6 h-6 transition-colors",
              i < value ? "text-amber-400 fill-amber-400" : "text-gray-200 hover:text-amber-400/50"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ── Dynamic Field Renderer ───────────────────────────────────────────────────
function DynamicField({
  field,
  value,
  onChange,
  currencySymbol = "₹",
}: {
  field: TrackingFieldConfig;
  value: any;
  onChange: (value: any) => void;
  currencySymbol?: string;
}) {
  const Icon = FIELD_ICONS[field.type] || Hash;

  switch (field.type) {
    case "number":
      return (
        <div className="space-y-1.5">
          <Label className="text-primary/80 text-sm font-semibold flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-accent" />
            {field.name}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
          <div className="relative">
            <Input
              type="number"
              value={value ?? field.defaultValue ?? ""}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground rounded-none pr-12 font-sans"
            />
            {field.unit && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {field.unit}
              </span>
            )}
          </div>
          {field.description && (
            <p className="text-xs text-muted-foreground font-sans">{field.description}</p>
          )}
        </div>
      );

    case "currency":
      return (
        <div className="space-y-1.5">
          <Label className="text-primary/80 text-sm font-semibold flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-accent" />
            {field.name}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {currencySymbol}
            </span>
            <Input
              type="number"
              value={value ?? field.defaultValue ?? ""}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground rounded-none pl-8 font-sans"
            />
          </div>
          {field.description && (
            <p className="text-xs text-muted-foreground font-sans">{field.description}</p>
          )}
        </div>
      );

    case "text":
      return (
        <div className="space-y-1.5">
          <Label className="text-primary/80 text-sm font-semibold flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-accent" />
            {field.name}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            value={value ?? field.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground rounded-none font-sans"
          />
          {field.description && (
            <p className="text-xs text-muted-foreground font-sans">{field.description}</p>
          )}
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-1.5">
          <Label className="text-primary/80 text-sm font-semibold flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-accent" />
            {field.name}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            value={value ?? field.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground rounded-none resize-none font-sans"
            rows={3}
          />
          {field.description && (
            <p className="text-xs text-muted-foreground font-sans">{field.description}</p>
          )}
        </div>
      );

    case "select":
      return (
        <div className="space-y-1.5">
          <Label className="text-primary/80 text-sm font-semibold flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-accent" />
            {field.name}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Select value={value ?? field.defaultValue ?? ""} onValueChange={onChange}>
            <SelectTrigger className="bg-white border-gray-200 text-primary rounded-none shadow-none focus:outline-none font-sans">
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-250 shadow-lg rounded-none">
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt} className="text-primary hover:bg-gray-50 focus:bg-gray-50 rounded-none cursor-pointer font-sans">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description && (
            <p className="text-xs text-muted-foreground font-sans">{field.description}</p>
          )}
        </div>
      );

    case "date":
      return (
        <div className="space-y-1.5">
          <Label className="text-primary/80 text-sm font-semibold flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-accent" />
            {field.name}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            type="date"
            value={value ?? field.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="bg-white border-gray-200 text-primary rounded-none font-sans"
          />
          {field.description && (
            <p className="text-xs text-muted-foreground font-sans">{field.description}</p>
          )}
        </div>
      );

    case "time":
      return (
        <div className="space-y-1.5">
          <Label className="text-primary/80 text-sm font-semibold flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-accent" />
            {field.name}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            type="time"
            value={value ?? field.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="bg-white border-gray-200 text-primary rounded-none font-sans"
          />
          {field.description && (
            <p className="text-xs text-muted-foreground font-sans">{field.description}</p>
          )}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex items-center gap-3 py-2">
          <Switch
            checked={value ?? (field.defaultValue === true || field.defaultValue === "true") ?? false}
            onCheckedChange={onChange}
          />
          <Label className="text-primary/80 text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
            <Icon className="w-3.5 h-3.5 text-accent" />
            {field.name}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
          {field.description && (
            <span className="text-xs text-muted-foreground ml-2 font-sans">({field.description})</span>
          )}
        </div>
      );

    case "rating":
      return (
        <div className="space-y-1.5">
          <Label className="text-primary/80 text-sm font-semibold flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-accent" />
            {field.name}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
          <StarRating value={value ?? 0} onChange={onChange} max={field.max || 5} />
          {field.description && (
            <p className="text-xs text-muted-foreground font-sans">{field.description}</p>
          )}
        </div>
      );

    default:
      return (
        <div className="text-muted-foreground text-sm font-sans">
          Unknown field type: {field.type}
        </div>
      );
  }
}

// ── Tracking Form Dialog ─────────────────────────────────────────────────────
function TrackingFormDialog({
  template,
  existingLog,
  businessId,
  currencySymbol,
  open,
  onClose,
  onSuccess,
}: {
  template: TrackingTemplate;
  existingLog?: TrackingLog;
  businessId: string;
  currencySymbol: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const fields = (template.fieldsConfig as TrackingFieldConfig[]) || [];
  const today = new Date().toISOString().slice(0, 10);

  // Initialize form data from existing log or defaults
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      initial[f.key] = existingLog?.submittedData?.[f.key] ?? f.defaultValue ?? null;
    });
    return initial;
  });
  const [notes, setNotes] = useState(existingLog?.notes ?? "");

  // Reset form when template/log changes
  useEffect(() => {
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      initial[f.key] = existingLog?.submittedData?.[f.key] ?? f.defaultValue ?? null;
    });
    setFormData(initial);
    setNotes(existingLog?.notes ?? "");
  }, [template.id, existingLog?.id]);

  const submitMutation = useMutation({
    mutationFn: (data: any) => authFetch("/api/tracking/logs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({
        title: existingLog ? "Updated!" : "Submitted!",
        description: `Your ${template.name} data has been ${existingLog ? "updated" : "submitted"}.`,
      });
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    // Validate required fields
    const missingRequired = fields
      .filter((f) => f.required && (formData[f.key] === null || formData[f.key] === "" || formData[f.key] === undefined))
      .map((f) => f.name);

    if (missingRequired.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingRequired.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate({
      businessId,
      templateId: template.id,
      logDate: today,
      submittedData: formData,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-white border border-gray-250 text-primary max-w-lg max-h-[85vh] overflow-y-auto rounded-none shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent" />
        <DialogHeader>
          <DialogTitle className="text-xl font-sans font-semibold text-primary flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-accent" />
            {template.name}
          </DialogTitle>
          {template.description && (
            <p className="text-muted-foreground text-sm font-sans mt-1">{template.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-4">
          {fields.map((field) => (
            <DynamicField
              key={field.key}
              field={field}
              value={formData[field.key]}
              onChange={(v) => setFormData({ ...formData, [field.key]: v })}
              currencySymbol={currencySymbol}
            />
          ))}

          {/* Notes field */}
          <div className="space-y-1.5 pt-4 border-t border-gray-200">
            <Label className="text-muted-foreground text-sm font-sans">Additional Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other details to add..."
              className="bg-white border border-gray-200 text-primary placeholder:text-muted-foreground rounded-none resize-none font-sans"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-gray-200 text-muted-foreground hover:bg-gray-50 rounded-none h-10 shadow-none">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none h-10 shadow-none gap-2"
          >
            {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {existingLog ? (
              <>
                <Save className="w-4 h-4" /> Update
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function DynamicDailyTracker({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithLog | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  // Queries
  const { data: profile, isLoading: profileLoading } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
    queryFn: () => authFetch("/api/business/profile"),
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<TrackingTemplate[]>({
    queryKey: ["/api/tracking/templates", profile?.id, "my"],
    queryFn: () => authFetch(`/api/tracking/templates/${profile?.id}/my`),
    enabled: !!profile?.id,
  });

  const { data: myLogs = [], isLoading: logsLoading } = useQuery<TrackingLog[]>({
    queryKey: ["/api/tracking/logs", profile?.id, "my", today],
    queryFn: () => authFetch(`/api/tracking/logs/${profile?.id}/my?date=${today}`),
    enabled: !!profile?.id,
  });

  // Combine templates with their today's log
  const safeTemplates = Array.isArray(templates) ? templates : [];
  const safeMyLogs = Array.isArray(myLogs) ? myLogs : [];
  const templatesWithLogs: TemplateWithLog[] = useMemo(() => {
    return safeTemplates.map((t) => ({
      ...t,
      todayLog: safeMyLogs.find((l) => l.templateId === t.id),
    }));
  }, [safeTemplates, safeMyLogs]);

  const pendingCount = templatesWithLogs.filter((t) => !t.todayLog).length;
  const completedCount = templatesWithLogs.filter((t) => t.todayLog).length;

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tracking/logs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tracking/templates"] });
  };

  const isLoading = profileLoading || templatesLoading || logsLoading;

  // ── No Templates State ─────────────────────────────────────────────────────
  if (!isLoading && safeTemplates.length === 0) {
    if (compact) return null;
    return (
      <Card className="bg-white border border-gray-200 rounded-none shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <ClipboardList className="w-12 h-12 text-accent/40 mb-3" />
          <h3 className="text-lg font-sans font-bold text-primary mb-1">No Tracking Forms</h3>
          <p className="text-muted-foreground text-sm font-sans max-w-xs leading-relaxed">
            Your admin hasn't created any tracking templates for you yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Compact View (for dashboard widget) ────────────────────────────────────
  if (compact) {
    return (
      <Card className="bg-white border border-gray-250 rounded-none shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-primary flex items-center gap-2 text-base font-sans font-semibold">
            <ClipboardList className="w-4 h-4 text-accent" />
            Daily Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex items-center gap-4 text-xs font-semibold mb-3">
                {pendingCount > 0 && (
                  <span className="text-accent flex items-center gap-1 uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {pendingCount} pending
                  </span>
                )}
                {completedCount > 0 && (
                  <span className="text-green-700 flex items-center gap-1 uppercase tracking-wider">
                    <Check className="w-3.5 h-3.5" />
                    {completedCount} done
                  </span>
                )}
              </div>

              {/* Template List */}
              {templatesWithLogs.slice(0, 3).map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-none border transition-all text-left group/item",
                    template.todayLog
                      ? "bg-green-500/5 border-green-500/20 hover:border-green-500/40"
                      : "bg-white border border-gray-200 hover:border-accent hover:shadow-sm"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-none flex items-center justify-center shrink-0 border",
                      template.todayLog ? "bg-green-500/10 border-green-500/20" : "bg-accent/5 border-accent/25"
                    )}
                  >
                    {template.todayLog ? (
                      <Check className="w-4 h-4 text-green-700" />
                    ) : (
                      <ClipboardList className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-primary text-sm font-sans font-semibold truncate">{template.name}</p>
                    <p className="text-muted-foreground text-xs font-sans truncate">
                      {template.todayLog ? "Submitted" : "Pending"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/45 group-hover/item:translate-x-0.5 transition-transform" />
                </button>
              ))}

              {templatesWithLogs.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-1 font-sans">
                  +{templatesWithLogs.length - 3} more forms
                </p>
              )}
            </div>
          )}
        </CardContent>

        {/* Form Dialog */}
        {selectedTemplate && profile && (
          <TrackingFormDialog
            template={selectedTemplate}
            existingLog={selectedTemplate.todayLog}
            businessId={profile.id}
            currencySymbol={profile.currencySymbol || "₹"}
            open={!!selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onSuccess={handleSuccess}
          />
        )}
      </Card>
    );
  }

  // ── Full View ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-150 pb-4">
        <div>
          <h2 className="text-2xl font-sans font-bold text-primary flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-accent" />
            Daily Tracking
          </h2>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mt-1.5 font-sans">
            Fill in your daily metrics for {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge variant="outline" className="border-accent/40 text-accent bg-accent/5 rounded-none font-semibold uppercase tracking-wider text-[10px]">
              {pendingCount} pending
            </Badge>
          )}
          {completedCount > 0 && (
            <Badge variant="outline" className="border-green-500/20 text-green-700 bg-green-500/5 rounded-none font-semibold uppercase tracking-wider text-[10px]">
              {completedCount} done
            </Badge>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      )}

      {/* Templates Grid */}
      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {templatesWithLogs.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md rounded-none relative group",
                    template.todayLog
                      ? "bg-green-500/5 border-green-500/20 hover:border-green-500/40 shadow-sm"
                      : "bg-white border-gray-200 hover:border-accent hover:shadow-md"
                  )}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/40 group-hover:bg-accent transition-colors" />
                  <CardHeader className="pb-2 pt-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 border rounded-none flex items-center justify-center shrink-0",
                          template.todayLog ? "bg-green-500/10 border-green-500/20" : "bg-accent/5 border-accent/25"
                        )}
                      >
                        {template.todayLog ? (
                          <Check className="w-5 h-5 text-green-700" />
                        ) : (
                          <ClipboardList className="w-5 h-5 text-accent" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-primary font-sans font-semibold text-lg">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="text-muted-foreground text-xs line-clamp-1 mt-0.5">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {/* Fields Preview */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {((template.fieldsConfig as TrackingFieldConfig[]) || []).slice(0, 3).map((field, i) => {
                        const Icon = FIELD_ICONS[field.type] || Hash;
                        return (
                          <Badge key={i} variant="outline" className="text-[10px] uppercase font-semibold tracking-wider border-gray-200 text-muted-foreground bg-gray-50 rounded-none gap-1 py-0.5">
                            <Icon className="w-3 h-3" />
                            {field.name}
                          </Badge>
                        );
                      })}
                      {((template.fieldsConfig as TrackingFieldConfig[]) || []).length > 3 && (
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider border-gray-200 text-muted-foreground/60 rounded-none py-0.5">
                          +{((template.fieldsConfig as TrackingFieldConfig[]) || []).length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      {template.todayLog ? (
                        <span className="text-green-700 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Submitted
                        </span>
                      ) : (
                        <span className="text-accent text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 text-xs font-semibold uppercase tracking-wider rounded-none border px-3",
                          template.todayLog
                            ? "text-muted-foreground border-gray-200 hover:text-primary hover:bg-gray-50"
                            : "text-accent border-accent/25 hover:text-accent hover:bg-accent/5"
                        )}
                      >
                        {template.todayLog ? (
                          <>
                            <Edit className="w-3 h-3 mr-1" /> Edit
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3 mr-1" /> Fill
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form Dialog */}
      {selectedTemplate && profile && (
        <TrackingFormDialog
          template={selectedTemplate}
          existingLog={selectedTemplate.todayLog}
          businessId={profile.id}
          currencySymbol={profile.currencySymbol || "₹"}
          open={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
