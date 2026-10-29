import React, { useState } from 'react';
import {
  RoadmapTask,
  TaskPriority,
  TaskStatus,
  TeamMember,
} from '../types';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  ArrowRight,
  Hand,
  Bell,
  Check,
  RotateCcw,
  Settings2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  BookOpen,
  X,
} from 'lucide-react';
import { NotificationPresetTarget } from './CreateNotificationModal';
import { playNotificationChime } from '../utils/notificationSound';

export interface MissionChecklistSectionProps {
  tasks: RoadmapTask[];
  allTasks: RoadmapTask[];
  displayDay: number;
  activeMember?: TeamMember;
  onToggleTask: (taskId: string) => void;
  onUpdateTask: (task: RoadmapTask) => void;
  onAddTask: (task: RoadmapTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onClaimTask?: (taskId: string) => void;
  onApplyNotificationPreset?: (preset: NotificationPresetTarget) => void;
  onResetDayTasksToPdf?: (dayNumber: number) => void;
  onBatchToggleTasks?: (taskIds: string[], completed: boolean) => void;
}

const SCHEDULE_BLOCK_LABELS: Record<string, { label: string; period: string }> = {
  '8:00–9:00': { label: 'Prospect Research & Verification', period: 'Morning (8–9 AM)' },
  '9:00–11:00': { label: 'Outbound Sales Sprint (20–25 Calls)', period: 'Prime Calling (9–11 AM)' },
  '11:00–12:00': { label: 'Follow-ups & Written Proposals', period: 'Midday (11 AM–12 PM)' },
  '12:00–1:00': { label: 'Break & Reset Block', period: 'Lunch (12–1 PM)' },
  '1:00–3:00': { label: '10-Min Demos & Closing', period: 'Afternoon (1–3 PM)' },
  '3:00–5:00': { label: 'Client Delivery & Alpha Work', period: 'Fulfillment (3–5 PM)' },
  '5:00–5:30': { label: 'Financial & Pipeline Review', period: 'EOD Review (5–5:30 PM)' },
};

const STANDARD_BLOCKS = [
  '8:00–9:00',
  '9:00–11:00',
  '11:00–12:00',
  '1:00–3:00',
  '3:00–5:00',
  '5:00–5:30',
];

export const MissionChecklistSection: React.FC<MissionChecklistSectionProps> = ({
  tasks,
  allTasks,
  displayDay,
  activeMember,
  onToggleTask,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onClaimTask,
  onApplyNotificationPreset,
  onResetDayTasksToPdf,
  onBatchToggleTasks,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CRITICAL'>('ALL');
  const [selectedBlockFilter, setSelectedBlockFilter] = useState<string>('ALL');
  const [groupByBlock, setGroupByBlock] = useState<boolean>(true);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});

  // Editing / Configuration state
  const [configuringTaskId, setConfiguringTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editTimeBlock, setEditTimeBlock] = useState('9:00–11:00');
  const [editPriority, setEditPriority] = useState<TaskPriority>(TaskPriority.HIGH);
  const [editDependsOn, setEditDependsOn] = useState<string>('');
  const [editNotes, setEditNotes] = useState('');

  // Add Item form state
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newBlock, setNewBlock] = useState('9:00–11:00');
  const [newPriority, setNewPriority] = useState<TaskPriority>(TaskPriority.HIGH);

  // PDF context accordion & inline confirmation states
  const [showPdfGuidelines, setShowPdfGuidelines] = useState(false);
  const [confirmResetDay, setConfirmResetDay] = useState(false);

  // Derived metrics for Daily Progress Indicator
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
  const pendingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const criticalTasks = tasks.filter((t) => t.priority === TaskPriority.CRITICAL);
  const criticalCompleted = criticalTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;

  // Filter tasks based on status and block
  const filteredTasks = tasks.filter((t) => {
    if (filterMode === 'PENDING' && t.status === TaskStatus.COMPLETED) return false;
    if (filterMode === 'COMPLETED' && t.status !== TaskStatus.COMPLETED) return false;
    if (filterMode === 'CRITICAL' && t.priority !== TaskPriority.CRITICAL) return false;
    if (selectedBlockFilter !== 'ALL' && t.dueTimeBlock !== selectedBlockFilter) return false;
    return true;
  });

  const handleStartConfiguring = (task: RoadmapTask) => {
    setConfiguringTaskId(task.id);
    setEditTitle(task.title);
    setEditInstructions(task.instructions);
    setEditTimeBlock(task.dueTimeBlock || '9:00–11:00');
    setEditPriority(task.priority);
    setEditDependsOn(task.dependsOnTaskId || '');
    setEditNotes(task.notes || '');
  };

  const handleSaveConfiguration = (taskId: string) => {
    const existing = tasks.find((t) => t.id === taskId);
    if (!existing) return;
    const updated: RoadmapTask = {
      ...existing,
      title: editTitle.trim() || existing.title,
      instructions: editInstructions.trim() || existing.instructions,
      dueTimeBlock: editTimeBlock,
      priority: editPriority,
      dependsOnTaskId: editDependsOn || undefined,
      notes: editNotes.trim() || undefined,
    };
    onUpdateTask(updated);
    setConfiguringTaskId(null);
  };

  const handleToggleBlockCollapse = (blockKey: string) => {
    setCollapsedBlocks((prev) => ({
      ...prev,
      [blockKey]: !prev[blockKey],
    }));
  };

  const handleToggleTaskWithSound = (task: RoadmapTask) => {
    onToggleTask(task.id);
    if (task.status !== TaskStatus.COMPLETED) {
      playNotificationChime(task.priority === TaskPriority.CRITICAL ? 'URGENT' : 'HIGH');
    }
  };

  const handleCreateCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created: RoadmapTask = {
      id: `task-d${displayDay}-custom-${Date.now()}`,
      dayNumber: displayDay,
      phaseName: tasks[0]?.phaseName || `Day ${displayDay} Execution`,
      title: newTitle.trim(),
      instructions: newInstructions.trim() || 'Custom checklist task added to daily mission.',
      priority: newPriority,
      status: TaskStatus.PENDING,
      dueTimeBlock: newBlock,
      isFromPdfChecklist: false,
    };
    onAddTask(created);
    setNewTitle('');
    setNewInstructions('');
    setIsAddFormOpen(false);
  };

  const handleBatchMarkAll = (completed: boolean) => {
    if (onBatchToggleTasks) {
      onBatchToggleTasks(tasks.map((t) => t.id), completed);
    } else {
      tasks.forEach((t) => {
        if ((t.status === TaskStatus.COMPLETED) !== completed) {
          onToggleTask(t.id);
        }
      });
    }
    if (completed) {
      playNotificationChime('HIGH');
    }
  };

  // Group tasks by block for structured schedule checklist
  const groupedTasks: Record<string, RoadmapTask[]> = {};
  STANDARD_BLOCKS.forEach((b) => {
    groupedTasks[b] = [];
  });
  groupedTasks['Other / Flexible'] = [];

  filteredTasks.forEach((t) => {
    const blockKey = t.dueTimeBlock && STANDARD_BLOCKS.includes(t.dueTimeBlock)
      ? t.dueTimeBlock
      : 'Other / Flexible';
    if (!groupedTasks[blockKey]) {
      groupedTasks[blockKey] = [];
    }
    groupedTasks[blockKey].push(t);
  });

  // Calculate phase name and PDF guidance for today
  const phaseTitle =
    displayDay <= 2
      ? 'Days 1–2: Build the sales machine (First 48 Hours)'
      : displayDay <= 7
        ? 'Days 3–7: First sales (100–125 cumulative calls & first 1–2 deposits)'
        : displayDay <= 14
          ? 'Days 8–14: Repeat and refine (Test $1,000 automation upsell)'
          : displayDay <= 21
            ? 'Days 15–21: Scale what works (Concentrate on winning niche)'
            : 'Days 22–30: Collect and fulfill (Fulfill milestones & balance due)';

  return (
    <div className="space-y-6">
      {/* 1. DAILY MISSION PROGRESS DASHBOARD */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden">
        {/* Top Glow Accent Bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-400 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Day Title, Phase, and SVG Circular Progress Ring */}
          <div className="flex items-center gap-5">
            {/* SVG Circular Progress Ring */}
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                {/* Background track */}
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-slate-800"
                  fill="transparent"
                />
                {/* Dynamic colored progress stroke */}
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeDasharray={213.6}
                  strokeDashoffset={213.6 - (213.6 * progressPercent) / 100}
                  strokeLinecap="round"
                  className={`transition-all duration-700 ease-out ${
                    progressPercent === 100
                      ? 'text-emerald-400'
                      : progressPercent >= 50
                        ? 'text-sky-400'
                        : 'text-amber-400'
                  }`}
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-bold font-mono text-slate-100 tabular-nums leading-none">
                  {progressPercent}%
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">
                  Done
                </span>
              </div>
            </div>

            {/* Title and Status Chip */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  DAY {displayDay} CHECKLIST
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                    progressPercent === 100
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : progressPercent >= 50
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : progressPercent > 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {progressPercent === 100 ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Mission Accomplished</span>
                    </>
                  ) : progressPercent >= 50 ? (
                    <>
                      <Sparkles className="w-3 h-3 text-sky-400" />
                      <span>Strong Closing Pace</span>
                    </>
                  ) : progressPercent > 0 ? (
                    <>
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Execution Underway</span>
                    </>
                  ) : (
                    <span>Ready for Morning Sprint</span>
                  )}
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-100">
                {phaseTitle}
              </h2>

              <p className="text-xs text-slate-400">
                Interactive daily action checklist derived from PDF Section 4 &amp; 7. Every item is configurable and tracks real-time execution.
              </p>
            </div>
          </div>

          {/* Right: Key Metric Badges & Batch Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center font-mono">
              <div className="px-2">
                <p className="text-[10px] text-slate-400 uppercase">Completed</p>
                <p className="text-base font-bold text-emerald-400 tabular-nums">
                  {completedCount}
                </p>
              </div>
              <div className="px-2 border-x border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase">Pending</p>
                <p className="text-base font-bold text-amber-300 tabular-nums">
                  {pendingCount}
                </p>
              </div>
              <div className="px-2">
                <p className="text-[10px] text-slate-400 uppercase">Critical</p>
                <p className="text-base font-bold text-rose-400 tabular-nums">
                  {criticalCompleted}/{criticalTasks.length}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchMarkAll(progressPercent !== 100)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  progressPercent === 100
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {progressPercent === 100 ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All to Pending</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark All Complete</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsAddFormOpen(!isAddFormOpen)}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>

              {onResetDayTasksToPdf && (
                confirmResetDay ? (
                  <div className="flex items-center gap-1 bg-rose-950/70 border border-rose-700/80 px-2 py-1 rounded-lg">
                    <span className="text-[11px] text-rose-200 font-medium">Reset to PDF?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onResetDayTasksToPdf(displayDay);
                        setConfirmResetDay(false);
                      }}
                      className="px-2 py-0.5 rounded bg-rose-500 text-slate-950 text-[11px] font-bold hover:bg-rose-400 cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetDay(false)}
                      className="px-1.5 py-0.5 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmResetDay(true)}
                    title="Restore original PDF daily action plan for this day"
                    className="p-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar with Milestones */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>
              Progress: <strong className="text-slate-200">{completedCount} of {totalCount}</strong> action items completed
            </span>
            <span>
              {criticalCompleted === criticalTasks.length
                ? '✅ All Critical Path Items Cleared'
                : `⚠️ ${criticalTasks.length - criticalCompleted} Critical Action(s) Remaining`}
            </span>
          </div>

          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent === 100
                  ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : progressPercent >= 50
                    ? 'bg-gradient-to-r from-sky-500 to-emerald-400'
                    : 'bg-gradient-to-r from-amber-500 to-sky-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Time Block Quick Completion Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-mono mr-1">Time Blocks:</span>
            {STANDARD_BLOCKS.map((block) => {
              const bTasks = tasks.filter((t) => t.dueTimeBlock === block);
              if (bTasks.length === 0) return null;
              const bDone = bTasks.every((t) => t.status === TaskStatus.COMPLETED);
              const bCount = bTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
              const isSelected = selectedBlockFilter === block;

              return (
                <button
                  key={block}
                  type="button"
                  onClick={() =>
                    setSelectedBlockFilter(isSelected ? 'ALL' : block)
                  }
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer border ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400'
                      : bDone
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/70 hover:border-emerald-500'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{block}</span>
                  <span className="text-[10px] opacity-80">
                    ({bCount}/{bTasks.length})
                  </span>
                  {bDone && <Check className="w-2.5 h-2.5 text-emerald-400 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. OPTIONAL PDF ACTION PLAN GUIDANCE ACCORDION */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPdfGuidelines(!showPdfGuidelines)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-xs text-sky-400 font-mono font-semibold">
            <BookOpen className="w-4 h-4" />
            <span>PDF Section 4 &amp; 7 Operating Mandates for Day {displayDay}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{showPdfGuidelines ? 'Hide Rules' : 'Show PDF Rules'}</span>
            {showPdfGuidelines ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </button>

        {showPdfGuidelines && (
          <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>The 8–10 Hour Daily Operating Rule</span>
                </h4>
                <p className="text-slate-400">
                  &ldquo;Use a consistent schedule that protects selling time. Development should support sales and fulfill commitments—not become a way to avoid contacting buyers.&rdquo;
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                  <li>Morning research: 1 observable problem per business (8–9 AM).</li>
                  <li>Outbound sprint: 20–25 targeted calls; ask for the owner (9–11 AM).</li>
                  <li>Follow-ups &amp; 1-page proposals: Lock in next steps before cold (11 AM–12 PM).</li>
                  <li>10-min demonstrations: Show relevant example and request closing (1–3 PM).</li>
                  <li>Fulfillment: Paid projects first; only alpha blockers second (3–5 PM).</li>
                </ul>
              </div>

              <div className="space-y-2 p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Critical Payment &amp; Capital Mandates</span>
                </h4>
                <p className="text-slate-400">
                  &ldquo;Proposals sent and unpaid contracts are NEVER counted in cleared revenue. Collect 50% ($750) upfront before delivery starts.&rdquo;
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                  <li>Keep $2,500 protected reserve untouched for emergencies.</li>
                  <li>Cap monthly operating expenses below $750.</li>
                  <li>Do not release $1,000 contingency without verified need.</li>
                  <li>Deliver within 5 business days to unlock remaining 50% ($750).</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. ADD CUSTOM TASK EXPANDABLE FORM */}
      {isAddFormOpen && (
        <form
          onSubmit={handleCreateCustomItem}
          className="p-5 bg-slate-900 border border-sky-500/50 rounded-xl space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-400" />
              <span>Configure New Checklist Item for Day {displayDay}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAddFormOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Call 10 commercial roofing owners in South Dallas"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Schedule Time Block
              </label>
              <select
                value={newBlock}
                onChange={(e) => setNewBlock(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-400"
              >
                {STANDARD_BLOCKS.map((b) => (
                  <option key={b} value={b}>
                    {b} — {SCHEDULE_BLOCK_LABELS[b]?.label || b}
                  </option>
                ))}
                <option value="Flexible Block">Flexible Block</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Instructions &amp; Specific Deliverable
              </label>
              <input
                type="text"
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
                placeholder="Specific observable issue, script opening, or acceptance criteria..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-400"
              >
                <option value={TaskPriority.CRITICAL}>CRITICAL (Must complete today)</option>
                <option value={TaskPriority.HIGH}>HIGH (Important milestone)</option>
                <option value={TaskPriority.MEDIUM}>MEDIUM (Standard task)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddFormOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
            >
              Save Checklist Item
            </button>
          </div>
        </form>
      )}

      {/* 4. FILTER & GROUPING CONTROLS */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono text-slate-400 mr-1 flex items-center gap-1">
            <Settings2 className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>

          {[
            { id: 'ALL', label: `All (${tasks.length})` },
            { id: 'PENDING', label: `Pending (${pendingCount})` },
            { id: 'COMPLETED', label: `Completed (${completedCount})` },
            { id: 'CRITICAL', label: `Critical (${criticalTasks.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id as typeof filterMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterMode === tab.id
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Schedule Block Grouping Toggle */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs text-slate-400 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={groupByBlock}
              onChange={(e) => setGroupByBlock(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-sky-400 focus:ring-sky-400"
            />
            <span>Group by 8–10h Schedule Block</span>
          </label>

          {selectedBlockFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedBlockFilter('ALL')}
              className="text-xs text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>Clear Block Filter ({selectedBlockFilter})</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 5. CHECKLIST CONTENT: GROUPED BY TIME BLOCK OR FLAT */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-2">
            <p className="text-sm font-semibold text-slate-200">
              No checklist items matching filter &ldquo;{filterMode}&rdquo;
            </p>
            <p className="text-xs text-slate-400">
              Change the filter tabs above, or click &ldquo;Add Task&rdquo; to add custom tasks to Day {displayDay}.
            </p>
          </div>
        ) : groupByBlock ? (
          /* GROUPED BY PDF SCHEDULE BLOCKS */
          Object.keys(groupedTasks).map((blockKey) => {
            const blockTasks = groupedTasks[blockKey];
            if (blockTasks.length === 0) return null;

            const isCollapsed = collapsedBlocks[blockKey];
            const blockCompletedCount = blockTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
            const blockInfo = SCHEDULE_BLOCK_LABELS[blockKey] || {
              label: blockKey,
              period: 'Daily Routine',
            };
            const isBlockAllDone = blockCompletedCount === blockTasks.length;

            return (
              <div
                key={blockKey}
                className={`border rounded-xl overflow-hidden transition-colors ${
                  isBlockAllDone
                    ? 'bg-slate-950/70 border-emerald-900/40'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                {/* Time Block Header */}
                <div
                  onClick={() => handleToggleBlockCollapse(blockKey)}
                  className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 cursor-pointer hover:bg-slate-900/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={isCollapsed ? 'Expand block' : 'Collapse block'}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-sky-400">{blockKey}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-slate-400 font-mono text-[11px]">{blockInfo.period}</span>
                        {isBlockAllDone && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Block Complete
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                        {blockInfo.label}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span
                      className={`tabular-nums ${
                        isBlockAllDone ? 'text-emerald-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {blockCompletedCount}/{blockTasks.length} Done
                    </span>
                    {onApplyNotificationPreset && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyNotificationPreset({
                            category: 'TASK',
                            title: `Schedule Block: ${blockInfo.label} (${blockKey})`,
                            message: `Focus block for Day ${displayDay}: execute tasks for ${blockInfo.label}`,
                            targetEntityType: 'schedule-block',
                            targetTab: 'mission',
                            defaultPriority: 'HIGH',
                          });
                        }}
                        title="Set reminder for this entire schedule block"
                        className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Items in this block */}
                {!isCollapsed && (
                  <div className="p-4 space-y-3">
                    {blockTasks.map((task) => (
                      <ChecklistItemRow
                        key={task.id}
                        task={task}
                        allTasks={allTasks}
                        displayDay={displayDay}
                        activeMember={activeMember}
                        isConfiguring={configuringTaskId === task.id}
                        editTitle={editTitle}
                        editInstructions={editInstructions}
                        editTimeBlock={editTimeBlock}
                        editPriority={editPriority}
                        editDependsOn={editDependsOn}
                        editNotes={editNotes}
                        setEditTitle={setEditTitle}
                        setEditInstructions={setEditInstructions}
                        setEditTimeBlock={setEditTimeBlock}
                        setEditPriority={setEditPriority}
                        setEditDependsOn={setEditDependsOn}
                        setEditNotes={setEditNotes}
                        onToggleTask={() => handleToggleTaskWithSound(task)}
                        onStartConfiguring={() => handleStartConfiguring(task)}
                        onCancelConfiguring={() => setConfiguringTaskId(null)}
                        onSaveConfiguring={() => handleSaveConfiguration(task.id)}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                        onClaimTask={onClaimTask}
                        onApplyNotificationPreset={onApplyNotificationPreset}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* FLAT CHECKLIST LIST */
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            {filteredTasks.map((task) => (
              <ChecklistItemRow
                key={task.id}
                task={task}
                allTasks={allTasks}
                displayDay={displayDay}
                activeMember={activeMember}
                isConfiguring={configuringTaskId === task.id}
                editTitle={editTitle}
                editInstructions={editInstructions}
                editTimeBlock={editTimeBlock}
                editPriority={editPriority}
                editDependsOn={editDependsOn}
                editNotes={editNotes}
                setEditTitle={setEditTitle}
                setEditInstructions={setEditInstructions}
                setEditTimeBlock={setEditTimeBlock}
                setEditPriority={setEditPriority}
                setEditDependsOn={setEditDependsOn}
                setEditNotes={setEditNotes}
                onToggleTask={() => handleToggleTaskWithSound(task)}
                onStartConfiguring={() => handleStartConfiguring(task)}
                onCancelConfiguring={() => setConfiguringTaskId(null)}
                onSaveConfiguring={() => handleSaveConfiguration(task.id)}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onClaimTask={onClaimTask}
                onApplyNotificationPreset={onApplyNotificationPreset}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ChecklistItemRowProps {
  task: RoadmapTask;
  allTasks: RoadmapTask[];
  displayDay: number;
  activeMember?: TeamMember;
  isConfiguring: boolean;
  editTitle: string;
  editInstructions: string;
  editTimeBlock: string;
  editPriority: TaskPriority;
  editDependsOn: string;
  editNotes: string;
  setEditTitle: (val: string) => void;
  setEditInstructions: (val: string) => void;
  setEditTimeBlock: (val: string) => void;
  setEditPriority: (val: TaskPriority) => void;
  setEditDependsOn: (val: string) => void;
  setEditNotes: (val: string) => void;
  onToggleTask: () => void;
  onStartConfiguring: () => void;
  onCancelConfiguring: () => void;
  onSaveConfiguring: () => void;
  onUpdateTask: (task: RoadmapTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onClaimTask?: (taskId: string) => void;
  onApplyNotificationPreset?: (preset: NotificationPresetTarget) => void;
}

const ChecklistItemRow: React.FC<ChecklistItemRowProps> = ({
  task,
  allTasks,
  displayDay,
  activeMember,
  isConfiguring,
  editTitle,
  editInstructions,
  editTimeBlock,
  editPriority,
  editDependsOn,
  editNotes,
  setEditTitle,
  setEditInstructions,
  setEditTimeBlock,
  setEditPriority,
  setEditDependsOn,
  setEditNotes,
  onToggleTask,
  onStartConfiguring,
  onCancelConfiguring,
  onSaveConfiguring,
  onUpdateTask,
  onDeleteTask,
  onClaimTask,
  onApplyNotificationPreset,
}) => {
  const isDone = task.status === TaskStatus.COMPLETED;
  const isBlocked = task.status === TaskStatus.BLOCKED;
  const depTask = task.dependsOnTaskId
    ? allTasks.find((t) => t.id === task.dependsOnTaskId)
    : undefined;
  const depIncomplete = depTask && depTask.status !== TaskStatus.COMPLETED;

  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [quickNoteValue, setQuickNoteValue] = useState(task.notes || '');

  return (
    <div
      data-testid={`mission-checklist-item-${task.id}`}
      className={`p-4 rounded-xl border transition-all duration-200 ${
        isDone
          ? 'bg-slate-950/70 border-emerald-900/40 shadow-sm'
          : isBlocked
            ? 'bg-rose-950/20 border-rose-800/70'
            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* NORMAL VIEW */}
      {!isConfiguring ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* Left: Checkbox + Title + Description */}
            <div className="flex items-start gap-3 flex-1 min-w-[240px]">
              {/* Checkbox Button */}
              <button
                type="button"
                onClick={onToggleTask}
                aria-label={`Mark task ${task.title} as ${isDone ? 'incomplete' : 'complete'}`}
                data-testid={`checkbox-task-${task.id}`}
                className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                  isDone
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    : 'border-slate-600 bg-slate-900 hover:border-sky-400 text-transparent'
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-transparent" />
                )}
              </button>

              <div className="space-y-1 flex-1">
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="text-sky-400 font-semibold">{task.dueTimeBlock || 'Flexible'}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                      task.priority === TaskPriority.CRITICAL
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : task.priority === TaskPriority.HIGH
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {task.priority.toUpperCase()}
                  </span>
                  {task.isFromPdfChecklist && (
                    <>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-sky-300 bg-sky-950/60 px-1.5 py-0.2 rounded text-[10px] border border-sky-800/60">
                        PDF Plan Mandate
                      </span>
                    </>
                  )}
                  {task.completedAt && (
                    <>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-emerald-400 text-[10px]">
                        Done {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {task.completedByName ? ` by ${task.completedByName.split(' ')[0]}` : ''}
                      </span>
                    </>
                  )}
                </div>

                {/* Title */}
                <h4
                  className={`text-sm font-semibold transition-colors ${
                    isDone ? 'line-through text-slate-500 font-normal' : 'text-slate-100'
                  }`}
                >
                  {task.title}
                </h4>

                {/* Instructions */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {task.instructions}
                </p>

                {/* Dependencies Alert */}
                {depIncomplete && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono mt-1 p-1.5 rounded bg-amber-950/30 border border-amber-800/40">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Prerequisite: &ldquo;{depTask?.title}&rdquo; is not yet completed.
                    </span>
                  </div>
                )}

                {/* Execution Note */}
                {task.notes && (
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-emerald-300 mt-2 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                    <div>
                      <strong className="text-slate-200">Execution Note:</strong> {task.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions, Claim, Notification, Configure Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {/* Reminder Bell */}
              {onApplyNotificationPreset && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyNotificationPreset({
                      category: 'TASK',
                      title: `Mission Task: ${task.title}`,
                      message: task.instructions || `Execution checklist for Day ${task.dayNumber}`,
                      targetEntityId: task.id,
                      targetEntityType: 'task',
                      targetTab: 'mission',
                      defaultPriority: task.priority === TaskPriority.CRITICAL ? 'URGENT' : 'HIGH',
                    })
                  }
                  title="Schedule notification reminder for this task"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Claim Task */}
              {onClaimTask && (
                <button
                  type="button"
                  onClick={() => onClaimTask(task.id)}
                  data-testid={`mission-claim-${task.id}`}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    task.claimedByName
                      ? task.claimedByMemberId === activeMember?.id
                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                        : 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                      : 'bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 text-slate-300'
                  }`}
                >
                  <Hand className="w-3 h-3" />
                  <span>
                    {task.claimedByName
                      ? `Claimed: ${task.claimedByName.split(' ')[0]}`
                      : 'Claim Step'}
                  </span>
                </button>
              )}

              {/* Status Select */}
              <select
                aria-label={`Status for ${task.title}`}
                value={task.status}
                onChange={(e) => {
                  const newStat = e.target.value as TaskStatus;
                  onUpdateTask({
                    ...task,
                    status: newStat,
                    completedAt: newStat === TaskStatus.COMPLETED ? new Date().toISOString() : undefined,
                  });
                  if (newStat === TaskStatus.COMPLETED) {
                    playNotificationChime(task.priority === TaskPriority.CRITICAL ? 'URGENT' : 'HIGH');
                  }
                }}
                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
              >
                <option value={TaskStatus.PENDING}>Pending</option>
                <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                <option value={TaskStatus.BLOCKED}>Blocked</option>
                <option value={TaskStatus.COMPLETED}>Completed</option>
              </select>

              {/* Postpone */}
              {displayDay < 30 && !isDone && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTask({
                      ...task,
                      dayNumber: displayDay + 1,
                    })
                  }
                  className="px-2 py-1 text-xs text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                  title={`Move this task to tomorrow (Day ${displayDay + 1})`}
                >
                  Postpone → Day {displayDay + 1}
                </button>
              )}

              {/* Quick Note Toggle */}
              <button
                type="button"
                onClick={() => setIsQuickNoteOpen(!isQuickNoteOpen)}
                className="px-2 py-1 text-xs text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800"
              >
                {task.notes ? 'Edit Note' : '+ Note'}
              </button>

              {/* Configure Button */}
              <button
                type="button"
                onClick={onStartConfiguring}
                data-testid={`configure-task-${task.id}`}
                className="px-2.5 py-1 text-xs font-medium text-sky-400 bg-slate-900 border border-slate-700 rounded-lg hover:border-sky-400 hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                title="Configure task parameters, time block, or requirements"
              >
                <Settings2 className="w-3 h-3" />
                <span>Configure</span>
              </button>

              {/* Delete Custom Task */}
              {!task.isFromPdfChecklist && onDeleteTask && (
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 cursor-pointer"
                  title="Delete custom task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Note Drawer */}
          {isQuickNoteOpen && (
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={quickNoteValue}
                onChange={(e) => setQuickNoteValue(e.target.value)}
                placeholder="Log prospect feedback, blocker reason, or evidence link..."
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={() => {
                  onUpdateTask({ ...task, notes: quickNoteValue.trim() });
                  setIsQuickNoteOpen(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300"
              >
                Save Note
              </button>
              <button
                type="button"
                onClick={() => setIsQuickNoteOpen(false)}
                className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : (
        /* CONFIGURATION / INLINE EDIT MODE */
        <div className="space-y-4 p-2 bg-slate-900/90 rounded-lg border border-sky-500/50">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4" />
              <span>Configure Task: {task.title}</span>
            </span>
            <button
              type="button"
              onClick={onCancelConfiguring}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Task Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Schedule Time Block</label>
              <select
                value={editTimeBlock}
                onChange={(e) => setEditTimeBlock(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
              >
                {STANDARD_BLOCKS.map((b) => (
                  <option key={b} value={b}>
                    {b} ({SCHEDULE_BLOCK_LABELS[b]?.label || b})
                  </option>
                ))}
                <option value="Flexible Block">Flexible Block</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Detailed Instructions / Criteria</label>
              <textarea
                rows={2}
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Priority Level</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
                >
                  <option value={TaskPriority.CRITICAL}>🔴 CRITICAL</option>
                  <option value={TaskPriority.HIGH}>🟡 HIGH</option>
                  <option value={TaskPriority.MEDIUM}>🔵 MEDIUM</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Prerequisite Dependency</label>
                <select
                  value={editDependsOn}
                  onChange={(e) => setEditDependsOn(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 truncate"
                >
                  <option value="">(None — Independent)</option>
                  {allTasks
                    .filter((t) => t.id !== task.id && t.dayNumber === displayDay)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.dueTimeBlock || 'Flexible'})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Execution Notes &amp; Logs</label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Record notes, objection patterns, links, or blocker reasons..."
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancelConfiguring}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveConfiguring}
              data-testid={`save-config-${task.id}`}
              className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
