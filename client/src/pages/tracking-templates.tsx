/**
 * Tracking Templates – Admin page to configure dynamic field tracking templates
 * Allows admins to create/edit custom field templates that employees fill daily.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getIdToken } from "@/lib/firebase";
import BusinessSidebar from "@/components/business-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Trash2,
  Edit3,
  Loader2,
  ClipboardList,
  Settings,
  GripVertical,
  Type,
  Hash,
  DollarSign,
  Calendar,
  Clock,
  CheckSquare,
  List,
  Star,
  FileText,
  Users,
  UserCheck,
  Eye,
  EyeOff,
  Copy,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { TrackingTemplate, TrackingFieldConfig, BusinessMember, BusinessVertical } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ── Types ────────────────────────────────────────────────────────────────────
interface BusinessProfile {
  id: string;
  name: string;
  memberRole: string;
}

const FIELD_TYPES = [
  { value: "number", label: "Number", icon: Hash, description: "Numeric values (quantity, count)" },
  { value: "text", label: "Text", icon: Type, description: "Short text input" },
  { value: "textarea", label: "Long Text", icon: FileText, description: "Multi-line text" },
  { value: "currency", label: "Currency", icon: DollarSign, description: "Money amounts" },
  { value: "select", label: "Dropdown", icon: List, description: "Choose from options" },
  { value: "date", label: "Date", icon: Calendar, description: "Date picker" },
  { value: "time", label: "Time", icon: Clock, description: "Time picker" },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare, description: "Yes/No toggle" },
  { value: "rating", label: "Rating", icon: Star, description: "1-5 star rating" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const APPLIES_TO_OPTIONS = [
  { value: "all", label: "All Members", icon: Users },
  { value: "vertical", label: "Specific Vertical", icon: UserCheck },
  { value: "members", label: "Specific Members", icon: UserCheck },
];

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

// ── Empty Field Template ─────────────────────────────────────────────────────
const createEmptyField = (): TrackingFieldConfig => ({
  name: "",
  key: "",
  type: "number",
  required: false,
  placeholder: "",
  description: "",
});

// ── Main Component ───────────────────────────────────────────────────────────
export default function TrackingTemplatesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TrackingTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [appliesTo, setAppliesTo] = useState("all");
  const [targetVerticalId, setTargetVerticalId] = useState<string>("");
  const [targetMemberIds, setTargetMemberIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<TrackingFieldConfig[]>([createEmptyField()]);
  const [expandedField, setExpandedField] = useState<number | null>(0);

  // Queries
  const { data: profile, isLoading: profileLoading } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
    queryFn: () => authFetch("/api/business/profile"),
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<TrackingTemplate[]>({
    queryKey: ["/api/tracking/templates", profile?.id],
    queryFn: () => authFetch(`/api/tracking/templates/${profile?.id}`),
    enabled: !!profile?.id,
  });

  const { data: members = [] } = useQuery<BusinessMember[]>({
    queryKey: ["/api/business/members", profile?.id],
    queryFn: () => authFetch(`/api/business/members/${profile?.id}`),
    enabled: !!profile?.id,
  });

  const { data: verticals = [] } = useQuery<BusinessVertical[]>({
    queryKey: ["/api/business/verticals", profile?.id],
    queryFn: () => authFetch(`/api/business/verticals/${profile?.id}`),
    enabled: !!profile?.id,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => authFetch("/api/tracking/templates", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/templates"] });
      toast({ title: "Template created", description: "Your tracking template has been created successfully." });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => authFetch(`/api/tracking/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/templates"] });
      toast({ title: "Template updated", description: "Your tracking template has been updated." });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/tracking/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/templates"] });
      toast({ title: "Template deleted", description: "The template has been removed." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      authFetch(`/api/tracking/templates/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/templates"] });
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setFrequency("daily");
    setAppliesTo("all");
    setTargetVerticalId("");
    setTargetMemberIds([]);
    setIsActive(true);
    setFields([createEmptyField()]);
    setExpandedField(0);
    setEditingTemplate(null);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: TrackingTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description ?? "");
    setFrequency(template.frequency ?? "daily");
    setAppliesTo(template.appliesTo ?? "all");
    setTargetVerticalId(template.targetVerticalId?.toString() ?? "");
    setTargetMemberIds(template.targetMemberIds ?? []);
    setIsActive(template.isActive ?? true);
    setFields((template.fieldsConfig as TrackingFieldConfig[]) ?? [createEmptyField()]);
    setExpandedField(0);
    setIsDialogOpen(true);
  };

  const duplicateTemplate = (template: TrackingTemplate) => {
    setEditingTemplate(null);
    setTemplateName(`${template.name} (Copy)`);
    setTemplateDescription(template.description ?? "");
    setFrequency(template.frequency ?? "daily");
    setAppliesTo(template.appliesTo ?? "all");
    setTargetVerticalId(template.targetVerticalId?.toString() ?? "");
    setTargetMemberIds(template.targetMemberIds ?? []);
    setIsActive(true);
    setFields((template.fieldsConfig as TrackingFieldConfig[]) ?? [createEmptyField()]);
    setExpandedField(0);
    setIsDialogOpen(true);
  };

  // ── Field Management ──────────────────────────────────────────────────────
  const addField = () => {
    setFields([...fields, createEmptyField()]);
    setExpandedField(fields.length);
  };

  const removeField = (index: number) => {
    if (fields.length <= 1) return;
    setFields(fields.filter((_, i) => i !== index));
    setExpandedField(null);
  };

  const updateField = (index: number, updates: Partial<TrackingFieldConfig>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const generateKey = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  };

  // ── Submit Handler ────────────────────────────────────────────────────────
  const handleSubmit = () => {
    // Validate
    if (!templateName.trim()) {
      toast({ title: "Error", description: "Template name is required", variant: "destructive" });
      return;
    }

    const validFields = fields.filter(f => f.name.trim() && f.key.trim());
    if (validFields.length === 0) {
      toast({ title: "Error", description: "At least one field is required", variant: "destructive" });
      return;
    }

    const payload = {
      businessId: profile!.id,
      name: templateName.trim(),
      description: templateDescription.trim() || null,
      fieldsConfig: validFields,
      isActive,
      appliesTo,
      targetVerticalId: appliesTo === "vertical" ? parseInt(targetVerticalId) : null,
      targetMemberIds: appliesTo === "members" ? targetMemberIds : [],
      frequency,
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── Access Control ─────────────────────────────────────────────────────────
  const isAdmin = profile?.memberRole === "owner" || profile?.memberRole === "manager";

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen bg-black text-white">
        <BusinessSidebar />
        <main className="flex-1 p-6">
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <AlertCircle className="w-16 h-16 text-amber-500" />
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-white/60">Only owners and managers can access tracking templates.</p>
            <Button onClick={() => navigate("/business")} className="bg-amber-500 text-black hover:bg-amber-400">
              Go to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-black text-white">
      <BusinessSidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-amber-400" />
              Tracking Templates
            </h1>
            <p className="text-white/60 mt-1">Create custom field templates for daily employee tracking</p>
          </div>
          <Button onClick={openCreateDialog} className="bg-amber-500 text-black hover:bg-amber-400 font-semibold gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>

        {/* Templates Grid */}
        {templatesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : templates.length === 0 ? (
          <Card className="bg-white/5 border-amber-500/20">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="w-16 h-16 text-amber-500/40 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Templates Yet</h3>
              <p className="text-white/60 max-w-md mb-6">
                Create your first tracking template to start collecting daily metrics from your team.
              </p>
              <Button onClick={openCreateDialog} className="bg-amber-500 text-black hover:bg-amber-400 font-semibold gap-2">
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {templates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className={cn(
                    "bg-white/5 border-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer group",
                    !template.isActive && "opacity-60"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white flex items-center gap-2">
                            {template.name}
                            {!template.isActive && (
                              <Badge variant="outline" className="text-xs border-white/20 text-white/50">Inactive</Badge>
                            )}
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="text-white/50 mt-1 line-clamp-2">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-amber-500/30">
                            <DropdownMenuItem onClick={() => openEditDialog(template)} className="text-white hover:bg-white/10">
                              <Edit3 className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateTemplate(template)} className="text-white hover:bg-white/10">
                              <Copy className="w-4 h-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleActiveMutation.mutate({ id: template.id, isActive: !template.isActive })}
                              className="text-white hover:bg-white/10"
                            >
                              {template.isActive ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                              {template.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm("Delete this template? This action cannot be undone.")) {
                                  deleteMutation.mutate(template.id);
                                }
                              }}
                              className="text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent onClick={() => openEditDialog(template)}>
                      <div className="space-y-3">
                        {/* Fields Preview */}
                        <div className="flex flex-wrap gap-1.5">
                          {((template.fieldsConfig as TrackingFieldConfig[]) || []).slice(0, 4).map((field, i) => {
                            const fieldType = FIELD_TYPES.find(t => t.value === field.type);
                            const Icon = fieldType?.icon || Hash;
                            return (
                              <Badge key={i} variant="outline" className="text-xs border-white/20 text-white/70 gap-1">
                                <Icon className="w-3 h-3" />
                                {field.name}
                              </Badge>
                            );
                          })}
                          {((template.fieldsConfig as TrackingFieldConfig[]) || []).length > 4 && (
                            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                              +{((template.fieldsConfig as TrackingFieldConfig[]) || []).length - 4} more
                            </Badge>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-white/50 pt-2 border-t border-white/10">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {FREQUENCY_OPTIONS.find(f => f.value === template.frequency)?.label || "Daily"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {template.appliesTo === "all" ? "All Members" :
                              template.appliesTo === "vertical" ? "Vertical" : "Selected Members"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-zinc-900 border-amber-500/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-400" />
                {editingTemplate ? "Edit Template" : "Create Template"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Template Name *</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Daily Sales Report"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Description</Label>
                  <Textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Brief description of what this template tracks..."
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-none"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-amber-500/30">
                        {FREQUENCY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-white/10">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Applies To</Label>
                    <Select value={appliesTo} onValueChange={setAppliesTo}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-amber-500/30">
                        {APPLIES_TO_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-white/10">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Conditional selects based on appliesTo */}
                {appliesTo === "vertical" && (
                  <div className="space-y-2">
                    <Label className="text-white/80">Select Vertical</Label>
                    <Select value={targetVerticalId} onValueChange={setTargetVerticalId}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Choose a vertical..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-amber-500/30">
                        {verticals.map(v => (
                          <SelectItem key={v.id} value={v.id.toString()} className="text-white hover:bg-white/10">
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {appliesTo === "members" && (
                  <div className="space-y-2">
                    <Label className="text-white/80">Select Members</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-white/5 rounded-md border border-white/20">
                      {members.map(m => (
                        <label key={m.id} className="flex items-center gap-2 cursor-pointer text-sm text-white/80 hover:text-white">
                          <input
                            type="checkbox"
                            checked={targetMemberIds.includes(m.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTargetMemberIds([...targetMemberIds, m.id]);
                              } else {
                                setTargetMemberIds(targetMemberIds.filter(id => id !== m.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-white/30 bg-white/10 text-amber-500 focus:ring-amber-500"
                          />
                          {m.name || m.email}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label className="text-white/80">Active (visible to employees)</Label>
                </div>
              </div>

              {/* Fields Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-white text-base font-semibold">Fields</Label>
                  <Button onClick={addField} variant="outline" size="sm" className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1">
                    <Plus className="w-3 h-3" /> Add Field
                  </Button>
                </div>

                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className={cn(
                        "border rounded-lg transition-colors",
                        expandedField === index ? "border-amber-500/40 bg-white/5" : "border-white/10 bg-white/[0.02]"
                      )}
                    >
                      {/* Field Header */}
                      <div
                        onClick={() => setExpandedField(expandedField === index ? null : index)}
                        className="flex items-center gap-2 p-3 cursor-pointer"
                      >
                        <GripVertical className="w-4 h-4 text-white/30" />
                        {(() => {
                          const fieldType = FIELD_TYPES.find(t => t.value === field.type);
                          const Icon = fieldType?.icon || Hash;
                          return <Icon className="w-4 h-4 text-amber-400" />;
                        })()}
                        <span className="flex-1 text-sm text-white/80">
                          {field.name || `Field ${index + 1}`}
                        </span>
                        <Badge variant="outline" className="text-xs border-white/20 text-white/50">
                          {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                        </Badge>
                        {fields.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={(e) => { e.stopPropagation(); removeField(index); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                        {expandedField === index ? (
                          <ChevronUp className="w-4 h-4 text-white/50" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-white/50" />
                        )}
                      </div>

                      {/* Field Details (Expanded) */}
                      {expandedField === index && (
                        <div className="p-4 pt-0 space-y-4 border-t border-white/10">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-white/60 text-xs">Field Name *</Label>
                              <Input
                                value={field.name}
                                onChange={(e) => {
                                  updateField(index, { name: e.target.value });
                                  if (!field.key || field.key === generateKey(field.name)) {
                                    updateField(index, { key: generateKey(e.target.value) });
                                  }
                                }}
                                placeholder="e.g., Deals Closed"
                                className="bg-white/5 border-white/20 text-white text-sm placeholder:text-white/40"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-white/60 text-xs">Field Key *</Label>
                              <Input
                                value={field.key}
                                onChange={(e) => updateField(index, { key: generateKey(e.target.value) })}
                                placeholder="deals_closed"
                                className="bg-white/5 border-white/20 text-white text-sm placeholder:text-white/40 font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-white/60 text-xs">Field Type</Label>
                            <Select value={field.type} onValueChange={(v) => updateField(index, { type: v as any })}>
                              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-amber-500/30">
                                {FIELD_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/10">
                                    <div className="flex items-center gap-2">
                                      <type.icon className="w-4 h-4 text-amber-400" />
                                      <span>{type.label}</span>
                                      <span className="text-white/40 text-xs">— {type.description}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Type-specific fields */}
                          {(field.type === "number" || field.type === "currency") && (
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label className="text-white/60 text-xs">Min</Label>
                                <Input
                                  type="number"
                                  value={field.min ?? ""}
                                  onChange={(e) => updateField(index, { min: e.target.value ? Number(e.target.value) : undefined })}
                                  className="bg-white/5 border-white/20 text-white text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white/60 text-xs">Max</Label>
                                <Input
                                  type="number"
                                  value={field.max ?? ""}
                                  onChange={(e) => updateField(index, { max: e.target.value ? Number(e.target.value) : undefined })}
                                  className="bg-white/5 border-white/20 text-white text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white/60 text-xs">Unit</Label>
                                <Input
                                  value={field.unit ?? ""}
                                  onChange={(e) => updateField(index, { unit: e.target.value || undefined })}
                                  placeholder="e.g., km, hrs"
                                  className="bg-white/5 border-white/20 text-white text-sm placeholder:text-white/40"
                                />
                              </div>
                            </div>
                          )}

                          {field.type === "select" && (
                            <div className="space-y-2">
                              <Label className="text-white/60 text-xs">Options (one per line)</Label>
                              <Textarea
                                value={(field.options || []).join("\n")}
                                onChange={(e) => updateField(index, { options: e.target.value.split("\n").filter(Boolean) })}
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                className="bg-white/5 border-white/20 text-white text-sm placeholder:text-white/40 resize-none font-mono"
                                rows={3}
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-white/60 text-xs">Placeholder</Label>
                              <Input
                                value={field.placeholder ?? ""}
                                onChange={(e) => updateField(index, { placeholder: e.target.value || undefined })}
                                placeholder="Placeholder text..."
                                className="bg-white/5 border-white/20 text-white text-sm placeholder:text-white/40"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-white/60 text-xs">Default Value</Label>
                              <Input
                                value={field.defaultValue != null ? String(field.defaultValue) : ""}
                                onChange={(e) => updateField(index, { defaultValue: e.target.value || undefined })}
                                placeholder="Default..."
                                className="bg-white/5 border-white/20 text-white text-sm placeholder:text-white/40"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-white/60 text-xs">Description / Help Text</Label>
                            <Input
                              value={field.description ?? ""}
                              onChange={(e) => updateField(index, { description: e.target.value || undefined })}
                              placeholder="Help text shown below the field..."
                              className="bg-white/5 border-white/20 text-white text-sm placeholder:text-white/40"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.required ?? false}
                              onCheckedChange={(checked) => updateField(index, { required: checked })}
                            />
                            <Label className="text-white/60 text-xs">Required field</Label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeDialog} className="border-white/20 text-white hover:bg-white/10">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-amber-500 text-black hover:bg-amber-400 font-semibold gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingTemplate ? "Save Changes" : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
