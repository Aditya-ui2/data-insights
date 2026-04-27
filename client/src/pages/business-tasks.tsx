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
    color: "bg-white/10",
    textColor: "text-white/70",
    icon: <ClipboardList className="w-4 h-4" />,
    borderColor: "border-white/10",
    bgColor: "bg-black",
  },
  {
    id: "in_progress",
    label: "In Progress",
    color: "bg-amber-500/20",
    textColor: "text-amber-300",
    icon: <Clock className="w-4 h-4" />,
    borderColor: "border-amber-500/30",
    bgColor: "bg-black",
  },
  {
    id: "in_review",
    label: "In Review",
    color: "bg-violet-500/20",
    textColor: "text-violet-300",
    icon: <AlertCircle className="w-4 h-4" />,
    borderColor: "border-violet-500/30",
    bgColor: "bg-black",
  },
  {
    id: "done",
    label: "Done",
    color: "bg-emerald-500/20",
    textColor: "text-emerald-300",
    icon: <CheckCircle2 className="w-4 h-4" />,
    borderColor: "border-emerald-500/30",
    bgColor: "bg-black",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    color: "bg-red-500/20",
    textColor: "text-red-300",
    icon: <XCircle className="w-4 h-4" />,
    borderColor: "border-red-500/30",
    bgColor: "bg-black",
  },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  low: { label: "Low", color: "bg-white/10 text-white/50", dot: "bg-white/40" },
  medium: { label: "Medium", color: "bg-amber-500/20 text-amber-300", dot: "bg-amber-400" },
  high: { label: "High", color: "bg-orange-500/20 text-orange-300", dot: "bg-orange-400" },
  urgent: { label: "Urgent", color: "bg-red-500/20 text-red-300 border border-red-500/40", dot: "bg-red-400 animate-pulse" },
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
      className="group relative bg-black border border-white/10 hover:border-amber-500/40 rounded-xl p-4 shadow-lg hover:shadow-amber-500/10 cursor-grab active:cursor-grabbing transition-all duration-200"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", prio.color)}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", prio.dot)} />
          {prio.label}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-black border-white/10 text-white w-48">
            {COLUMNS.filter((c) => c.id !== task.status).map((col) => (
              <DropdownMenuItem
                key={col.id}
                className="cursor-pointer hover:bg-white/5"
                onClick={() => onStatusChange(task.id, col.id)}
              >
                <ChevronRight className="w-3 h-3 mr-2" />
                Move to {col.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className="cursor-pointer hover:bg-white/5"
              onClick={() => onEdit(task)}
            >
              <Edit3 className="w-3 h-3 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-red-400 hover:bg-red-950 hover:text-red-300"
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
          "font-semibold text-sm leading-snug",
          task.status === "done" ? "line-through text-white/30" : "text-white"
        )}
      >
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="mt-1.5 text-xs text-white/40 line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      {(task.tags as string[])?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {(task.tags as string[]).map((tag) => (
            <span key={tag} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/8">
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-bold text-amber-300">
              {(assignee.name ?? assignee.email)[0].toUpperCase()}
            </div>
            <span className="text-xs text-white/50 truncate max-w-[80px]">
              {assignee.name ?? assignee.email.split("@")[0]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-white/25 flex items-center gap-1">
            <User className="w-3 h-3" /> Unassigned
          </span>
        )}

        {due && (
          <span
            className={cn(
              "flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
              due.isOverdue
                ? "bg-red-500/15 text-red-300"
                : due.isToday
                ? "bg-amber-500/15 text-amber-300"
                : "bg-white/8 text-white/40"
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
      <DialogContent className="bg-black border-amber-500/20 text-white max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-400" />
            {initial ? "Edit Task" : "Assign New Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Task Title <span className="text-red-400">*</span>
            </label>
            <Input
              className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-400 focus:ring-amber-400/20"
              placeholder="e.g. Follow up with client on proposal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Description
            </label>
            <Textarea
              className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-400 min-h-[90px] resize-none"
              placeholder="Task details, context, acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Assign + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                Assign To <span className="text-red-400">*</span>
              </label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-1.5 bg-white/5 border-white/10 text-white focus:border-amber-400">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10 text-white">
                  <SelectItem value="unassigned">
                    <span className="text-white/40">Unassigned</span>
                  </SelectItem>
                  {members
                    .filter((m) => m.status === "active")
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-300">
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
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1.5 bg-white/5 border-white/10 text-white focus:border-amber-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10 text-white">
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", v.dot)} />
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
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Due Date
            </label>
            <Input
              type="date"
              className="mt-1.5 bg-white/5 border-white/10 text-white focus:border-amber-400 [color-scheme:dark]"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags
            </label>
            <div className="mt-1.5 flex gap-2">
              <Input
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-400"
                placeholder="Add a tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
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
                    className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full"
                  >
                    {t}
                    <button
                      className="hover:text-red-400 transition-colors"
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
            className="text-white/40 hover:text-white hover:bg-white/5"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || loading}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold min-w-[120px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
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
  const { data: membersData } = useQuery<{ members: BusinessMember[] }>({
    queryKey: ["/api/business/members"],
    enabled: !!profile?.id,
    queryFn: () => authFetch("/api/business/members"),
  });
  const members = membersData?.members ?? [];

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
    <div className="flex h-screen bg-black overflow-hidden">
      <BusinessSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Top Bar ────────────────────────────────────────────────── */}
        <div className="flex-none px-6 py-4 border-b border-amber-500/15 bg-black/80 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-amber-400" />
                Task Board
              </h1>
              <p className="text-sm text-white/40 mt-0.5">
                {allTasks.length} total · {byStatus("in_progress").length} in progress · {byStatus("done").length} done
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Input
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-400 w-48 pl-3"
                  placeholder="Search tasks…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Priority filter */}
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-36 focus:border-amber-400">
                  <Flag className="w-3.5 h-3.5 mr-1.5 text-white/30" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10 text-white">
                  <SelectItem value="all">All Priorities</SelectItem>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Member filter */}
              <Select value={filterMember} onValueChange={setFilterMember}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-40 focus:border-amber-400">
                  <User className="w-3.5 h-3.5 mr-1.5 text-white/30" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10 text-white">
                  <SelectItem value="all">All Members</SelectItem>
                  {members.filter((m) => m.status === "active").map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name ?? m.email.split("@")[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* New Task button */}
              {isManager && (
                <Button
                  onClick={() => { setEditingTask(null); setModalOpen(true); }}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2 px-5"
                >
                  <Plus className="w-4 h-4" />
                  New Task
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Kanban Board ───────────────────────────────────────────── */}
        {tasksLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
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
                      "flex flex-col w-72 shrink-0 rounded-xl border transition-colors",
                      col.borderColor,
                      col.bgColor
                    )}
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                      <div className="flex items-center gap-2">
                        <span className={cn("p-1 rounded-md", col.color.replace("bg-", "bg-").replace("500", "500/20"))}>
                          <span className={col.textColor}>{col.icon}</span>
                        </span>
                        <span className={cn("font-semibold text-sm", col.textColor)}>{col.label}</span>
                      </div>
                      <span className="bg-white/10 text-white/60 text-xs font-bold px-2 py-0.5 rounded-full">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
                        <div className="flex flex-col items-center justify-center py-10 text-white/20 gap-2">
                          <div className="w-10 h-10 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center">
                            {col.icon}
                          </div>
                          <span className="text-xs">No tasks here</span>
                        </div>
                      )}
                    </div>

                    {/* Quick-add button */}
                    {isManager && col.id === "todo" && (
                      <div className="px-3 pb-3">
                        <button
                          onClick={() => { setEditingTask(null); setModalOpen(true); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/30 hover:text-amber-300 hover:bg-amber-500/10 transition-colors text-sm"
                        >
                          <Plus className="w-4 h-4" />
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
