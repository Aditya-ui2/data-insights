/**
 * Business Tasks – Full-screen Kanban Board
 * Drag-free column-based task management for business teams.
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getIdToken } from "@/lib/firebase";
import BusinessSidebar from "@/components/business-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  MoreVertical,
  Calendar,
  User,
  Flag,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  ClipboardList,
  ChevronRight,
  Tag,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BusinessTask, BusinessMember } from "@shared/schema";

// ── Types ─────────────────────────────────────────────────────────────────

interface Column {
  id: string;
  label: string;
  color: string;
  textColor: string;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
}

interface BusinessProfile {
  id: string;
  name: string;
  memberRole: string;
}

const COLUMNS: Column[] = [
  {
    id: "todo",
    label: "To Do",
    color: "bg-gray-100",
    textColor: "text-slate-700",
    icon: <ClipboardList className="w-4 h-4" />,
    borderColor: "border-gray-200",
    bgColor: "bg-white",
  },
  {
    id: "in_progress",
    label: "In Progress",
    color: "bg-amber-500/10",
    textColor: "text-amber-700",
    icon: <Clock className="w-4 h-4" />,
    borderColor: "border-amber-500/20",
    bgColor: "bg-white",
  },
  {
    id: "in_review",
    label: "In Review",
    color: "bg-violet-500/10",
    textColor: "text-violet-700",
    icon: <AlertCircle className="w-4 h-4" />,
    borderColor: "border-violet-500/20",
    bgColor: "bg-white",
  },
  {
    id: "done",
    label: "Done",
    color: "bg-emerald-500/10",
    textColor: "text-emerald-700",
    icon: <CheckCircle2 className="w-4 h-4" />,
    borderColor: "border-emerald-500/20",
    bgColor: "bg-white",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    color: "bg-red-500/10",
    textColor: "text-red-700",
    icon: <XCircle className="w-4 h-4" />,
    borderColor: "border-red-500/20",
    bgColor: "bg-white",
  },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  low: { label: "Low", color: "bg-gray-100 text-muted-foreground border border-gray-200", dot: "bg-gray-400" },
  medium: { label: "Medium", color: "bg-amber-500/10 text-amber-700 border border-amber-500/20", dot: "bg-amber-500" },
  high: { label: "High", color: "bg-orange-500/10 text-orange-700 border border-orange-500/20", dot: "bg-orange-500" },
  urgent: { label: "Urgent", color: "bg-red-500/10 text-red-700 border border-red-500/30", dot: "bg-red-500 animate-pulse" },
};

// ── Helper ─────────────────────────────────────────────────────────────────

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

function formatDueDate(date: string | null | undefined) {
  if (!date) return null;
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = d < today;
  const isToday = d.toDateString() === today.toDateString();
  const label = isToday
    ? "Today"
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return { label, isOverdue, isToday };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TaskCard({
  task,
  members,
  onEdit,
  onDelete,
  onStatusChange,
  onNativeDragStart,
}: {
  task: BusinessTask;
  members: BusinessMember[];
  onEdit: (t: BusinessTask) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onNativeDragStart?: (e: React.DragEvent, id: string) => void;
}) {
  const assignee = members.find((m) => m.id === task.assignedToMemberId);
  const due = formatDueDate(task.dueDate);
  const prio = PRIORITY_CONFIG[task.priority ?? "medium"];

  return (
    <div
      draggable
      onDragStart={(e) => onNativeDragStart?.(e, task.id)}
      className="group relative bg-white border border-gray-200 hover:border-accent rounded-none p-4 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-200"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/20 group-hover:bg-accent transition-colors" />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-none border", prio.color)}
        >
          <span className={cn("w-1.5 h-1.5 rounded-none", prio.dot)} />
          {prio.label}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-none hover:bg-gray-100">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border-gray-200 text-primary w-48 shadow-lg rounded-none">
            {COLUMNS.filter((c) => c.id !== task.status).map((col) => (
              <DropdownMenuItem
                key={col.id}
                className="cursor-pointer hover:bg-gray-50 text-xs font-sans rounded-none"
                onClick={() => onStatusChange(task.id, col.id)}
              >
                <ChevronRight className="w-3 h-3 mr-2 text-accent" />
                Move to {col.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className="cursor-pointer hover:bg-gray-50 text-xs font-sans rounded-none"
              onClick={() => onEdit(task)}
            >
              <Edit3 className="w-3 h-3 mr-2 text-accent" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-sans rounded-none"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <p
        className={cn(
          "font-sans font-semibold text-sm leading-snug",
          task.status === "done" ? "line-through text-muted-foreground/50" : "text-primary"
        )}
      >
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 font-sans">{task.description}</p>
      )}

      {/* Tags */}
      {(task.tags as string[])?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {(task.tags as string[]).map((tag) => (
            <span key={tag} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-none bg-accent/10 text-accent border border-accent/20 font-sans">
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-none bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-bold text-accent font-sans">
              {(assignee.name ?? assignee.email)[0].toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[80px] font-sans">
              {assignee.name ?? assignee.email.split("@")[0]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50 flex items-center gap-1 font-sans">
            <User className="w-3 h-3 text-accent" /> Unassigned
          </span>
        )}

        {due && (
          <span
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-none border font-sans",
              due.isOverdue
                ? "bg-red-50 border-red-200 text-red-700"
                : due.isToday
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-gray-50 border-gray-200 text-muted-foreground"
            )}
          >
            <Calendar className="w-3 h-3" />
            {due.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Assign Modal ───────────────────────────────────────────────────────────

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<BusinessTask> & { title: string }) => void;
  members: BusinessMember[];
  initial?: BusinessTask | null;
  loading?: boolean;
}

function TaskModal({ open, onClose, onSubmit, members, initial, loading }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("unassigned");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setAssignedTo(initial.assignedToMemberId ?? "unassigned");
      setPriority(initial.priority ?? "medium");
      setDueDate(initial.dueDate ?? "");
      setTags((initial.tags as string[]) ?? []);
    } else {
      setTitle(""); setDescription(""); setAssignedTo("unassigned");
      setPriority("medium"); setDueDate(""); setTags([]);
    }
  }, [initial, open]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      assignedToMemberId: assignedTo === "unassigned" ? undefined : assignedTo,
      priority,
      dueDate: dueDate || undefined,
      tags,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white border-gray-250 text-primary max-w-lg w-full rounded-none shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent" />
        <DialogHeader>
          <DialogTitle className="text-xl font-sans font-semibold text-primary flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-accent" />
            {initial ? "Edit Task" : "Assign New Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">
              Task Title <span className="text-red-500">*</span>
            </label>
            <Input
              className="mt-1.5 bg-white border-gray-200 text-primary placeholder:text-muted-foreground focus:border-accent focus:ring-accent/20 rounded-none shadow-none font-sans"
              placeholder="e.g. Follow up with client on proposal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">
              Description
            </label>
            <Textarea
              className="mt-1.5 bg-white border-gray-200 text-primary placeholder:text-muted-foreground focus:border-accent min-h-[90px] resize-none rounded-none shadow-none font-sans"
              placeholder="Task details, context, acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Assign + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">
                Assign To <span className="text-red-500">*</span>
              </label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-1.5 bg-white border-gray-200 text-primary focus:border-accent rounded-none shadow-none font-sans">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-primary rounded-none shadow-md">
                  <SelectItem value="unassigned" className="rounded-none">
                    <span className="text-muted-foreground/60 font-sans">Unassigned</span>
                  </SelectItem>
                  {members
                    .filter((m) => m.status === "active")
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id} className="rounded-none">
                        <div className="flex items-center gap-2 font-sans">
                          <div className="w-5 h-5 rounded-none bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent">
                            {(m.name ?? m.email)[0].toUpperCase()}
                          </div>
                          {m.name ?? m.email.split("@")[0]}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1.5 bg-white border-gray-200 text-primary focus:border-accent rounded-none shadow-none font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-primary rounded-none shadow-md">
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="rounded-none">
                      <div className="flex items-center gap-2 font-sans">
                        <span className={cn("w-2 h-2 rounded-none", v.dot)} />
                        {v.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 font-sans">
              <Calendar className="w-3 h-3 text-accent" /> Due Date
            </label>
            <Input
              type="date"
              className="mt-1.5 bg-white border-gray-200 text-primary focus:border-accent rounded-none shadow-none font-sans"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 font-sans">
              <Tag className="w-3 h-3 text-accent" /> Tags
            </label>
            <div className="mt-1.5 flex gap-2">
              <Input
                className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground focus:border-accent rounded-none shadow-none font-sans"
                placeholder="Add a tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-gray-200 text-muted-foreground hover:bg-gray-50 rounded-none shadow-none font-sans"
                onClick={addTag}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 text-xs bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-none font-sans"
                  >
                    {t}
                    <button
                      className="hover:text-red-600 transition-colors ml-1"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-primary hover:bg-gray-50 rounded-none font-sans"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none min-w-[120px] font-sans shadow-none"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            ) : initial ? (
              "Save Changes"
            ) : (
              "Assign Task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function BusinessTasksPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<BusinessTask | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterMember, setFilterMember] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Auth redirect
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated]);

  // Load business profile
  const { data: profile } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
    enabled: isAuthenticated,
  });

  // Load members
  const { data: members = [] } = useQuery<BusinessMember[]>({
    queryKey: ["/api/business/members"],
    enabled: !!profile?.id,
    queryFn: () => authFetch("/api/business/members"),
  });

  // Load tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery<{ tasks: BusinessTask[] }>({
    queryKey: [`/api/tasks/${profile?.id}`],
    enabled: !!profile?.id,
    queryFn: () => authFetch(`/api/tasks/${profile!.id}`),
    refetchInterval: 30_000,
  });
  const allTasks = tasksData?.tasks ?? [];

  // Filtered tasks
  const filtered = allTasks.filter((t) => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterMember !== "all" && t.assignedToMemberId !== filterMember) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group by column
  const byStatus = (status: string) => filtered.filter((t) => t.status === status);

  // ── Mutations ────────────────────────────────────────────────────────────

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [`/api/tasks/${profile?.id}`] });
  }, [queryClient, profile?.id]);

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      authFetch("/api/tasks", { method: "POST", body: JSON.stringify({ ...data, businessId: profile!.id }) }),
    onSuccess: () => { invalidate(); setModalOpen(false); toast({ title: "Task created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      authFetch(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { invalidate(); setModalOpen(false); setEditingTask(null); toast({ title: "Task updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast({ title: "Task deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isManager = profile?.memberRole === "owner" || profile?.memberRole === "manager";
  const isMutating = createMutation.isPending || updateMutation.isPending;

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-[#fbfaf7] overflow-hidden">
      <BusinessSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#fbfaf7]">
        {/* ── Top Bar ────────────────────────────────────────────────── */}
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10 flex-none">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/business")}
                className="text-muted-foreground hover:text-primary rounded-none"
                data-testid="button-back-business"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-sans font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-accent" />
                  Task Board
                </h1>
                <p className="text-xs text-muted-foreground">
                  {allTasks.length} total · {byStatus("in_progress").length} in progress · {byStatus("done").length} done
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Input
                  className="bg-white border-gray-200 text-primary placeholder:text-muted-foreground focus:border-accent w-48 pl-3 rounded-none shadow-none font-sans text-sm h-10"
                  placeholder="Search tasks…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Priority filter */}
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="bg-white border-gray-200 text-primary w-36 focus:border-accent rounded-none shadow-none font-sans h-10">
                  <Flag className="w-3.5 h-3.5 mr-1.5 text-accent" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-primary rounded-none shadow-md">
                  <SelectItem value="all" className="rounded-none font-sans">All Priorities</SelectItem>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="rounded-none font-sans">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Member filter */}
              <Select value={filterMember} onValueChange={setFilterMember}>
                <SelectTrigger className="bg-white border-gray-200 text-primary w-40 focus:border-accent rounded-none shadow-none font-sans h-10">
                  <User className="w-3.5 h-3.5 mr-1.5 text-accent" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-primary rounded-none shadow-md">
                  <SelectItem value="all" className="rounded-none font-sans">All Members</SelectItem>
                  {members.filter((m) => m.status === "active").map((m) => (
                    <SelectItem key={m.id} value={m.id} className="rounded-none font-sans">
                      {m.name ?? m.email.split("@")[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* New Task button */}
              {isManager && (
                <Button
                  onClick={() => { setEditingTask(null); setModalOpen(true); }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-none gap-2 shadow-none font-sans h-10"
                >
                  <Plus className="w-4 h-4 text-accent" />
                  New Task
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* ── Kanban Board ───────────────────────────────────────────── */}
        {tasksLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-4">
            <div className="flex gap-4 h-full min-w-max">
              {COLUMNS.map((col) => {
                const colTasks = byStatus(col.id);
                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const taskId = e.dataTransfer.getData("taskId");
                      if (taskId) updateMutation.mutate({ id: taskId, data: { status: col.id } });
                    }}
                    className={cn(
                      "flex flex-col w-72 shrink-0 rounded-none border border-gray-200 bg-white shadow-sm relative group",
                      col.borderColor
                    )}
                  >
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/20 group-hover:bg-accent transition-colors" />

                    {/* Column header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#fbfaf7]/50">
                      <div className="flex items-center gap-2">
                        <span className={cn("p-1 rounded-none", col.color)}>
                          <span className={col.textColor}>{col.icon}</span>
                        </span>
                        <span className="font-sans font-semibold text-sm text-primary">{col.label}</span>
                      </div>
                      <span className="bg-gray-100 text-primary text-xs font-bold px-2 py-0.5 rounded-none border border-gray-200 font-sans">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                      <AnimatePresence initial={false}>
                        {colTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            members={members}
                            onEdit={(t) => { setEditingTask(t); setModalOpen(true); }}
                            onDelete={(id) => deleteMutation.mutate(id)}
                            onNativeDragStart={(e, id) => {
                              e.dataTransfer.setData("taskId", id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onStatusChange={(id, status) =>
                              updateMutation.mutate({ id, data: { status } })
                            }
                          />
                        ))}
                      </AnimatePresence>

                      {colTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/30 gap-2">
                          <div className="w-10 h-10 rounded-none border-2 border-dashed border-gray-250 flex items-center justify-center">
                            {col.icon}
                          </div>
                          <span className="text-xs font-sans">No tasks here</span>
                        </div>
                      )}
                    </div>

                    {/* Quick-add button */}
                    {isManager && col.id === "todo" && (
                      <div className="px-3 pb-3">
                        <button
                          onClick={() => { setEditingTask(null); setModalOpen(true); }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-none border border-dashed border-gray-200 text-muted-foreground hover:text-accent hover:border-accent hover:bg-accent/5 transition-colors text-xs uppercase tracking-wider font-semibold font-sans"
                        >
                          <Plus className="w-4 h-4 text-accent" />
                          Add task
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Task Modal ─────────────────────────────────────────────── */}
      <TaskModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
        members={members}
        initial={editingTask}
        loading={isMutating}
        onSubmit={(data) => {
          if (editingTask) {
            updateMutation.mutate({ id: editingTask.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}
