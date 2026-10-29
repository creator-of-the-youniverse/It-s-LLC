import React, { useState } from 'react';
import { CampaignState, PipelineStage, RoadmapTask, TaskStatus, TeamMember } from '../types';
import { getActiveCampaignDay } from '../utils/calculations';
import { Clock, AlertCircle, Bell } from 'lucide-react';
import { NotificationPresetTarget } from './CreateNotificationModal';
import { MissionChecklistSection } from './MissionChecklistSection';

interface RoadmapAndMissionProps {
  state: CampaignState;
  mode: 'roadmap' | 'mission';
  activeMember?: TeamMember;
  onClaimTask?: (taskId: string) => void;
  onToggleTask?: (taskId: string) => void;
  onUpdateTask: (updated: RoadmapTask) => void;
  onAddTask: (newTask: RoadmapTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onSelectDayOverride: (day: number | null) => void;
  onNavigate: (tab: string) => void;
  onApplyNotificationPreset?: (preset: NotificationPresetTarget) => void;
  onResetDayTasksToPdf?: (dayNumber: number) => void;
  onBatchToggleTasks?: (taskIds: string[], completed: boolean) => void;
}

const DAILY_SCHEDULE_BLOCKS = [
  {
    time: '8:00–9:00',
    title: 'Prospect research',
    description:
      'Identify businesses with a specific, observable problem. Prepare a personalized opening for each.',
  },
  {
    time: '9:00–11:00',
    title: 'Outbound sales block',
    description:
      'Make calls (20–25/day), ask for the owner, qualify prospects, and book demonstrations.',
  },
  {
    time: '11:00–12:00',
    title: 'Follow-ups and proposals',
    description:
      'Send clear scopes and prices (5–10 follow-ups). Schedule next steps before conversations go cold.',
  },
  {
    time: '12:00–1:00',
    title: 'Break and reset',
    description: 'Eat, step away from the screen, and prepare for the afternoon.',
  },
  {
    time: '1:00–3:00',
    title: 'Demonstrations and closing',
    description:
      'Show prospects a relevant example. Ask what they need, confirm scope, and request a decision or an agreed follow-up.',
  },
  {
    time: '3:00–5:00',
    title: 'Delivery and product work',
    description:
      'Work on paid projects first. Use remaining time for only the alpha issues that block a real user or purchase.',
  },
  {
    time: '5:00–5:30',
    title: 'Financial and pipeline review',
    description:
      'Count calls, conversations, demos, proposals, payments, delivery obligations, and cash remaining. Set tomorrow’s top three priorities.',
  },
];

export const RoadmapAndMissionView: React.FC<RoadmapAndMissionProps> = ({
  state,
  mode,
  activeMember,
  onClaimTask,
  onToggleTask,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onSelectDayOverride,
  onNavigate,
  onApplyNotificationPreset,
  onResetDayTasksToPdf,
  onBatchToggleTasks,
}) => {
  const activeDay = getActiveCampaignDay(
    state.settings.startDate,
    state.settings.currentDayOverride
  );
  const [selectedDay, setSelectedDay] = useState<number>(activeDay);

  const displayDay = mode === 'mission' ? activeDay : selectedDay;
  const dayTasks = state.tasks.filter((t) => t.dayNumber === displayDay);
  const completedDayTasks = dayTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
  const dayCompletionPct =
    dayTasks.length > 0 ? Math.round((completedDayTasks / dayTasks.length) * 100) : 0;

  // Overall campaign completion
  const totalTasks = state.tasks.length;
  const totalCompleted = state.tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
  const campaignCompletionPct =
    totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  // Current Week completion (Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4+: 22-30)
  const weekBounds =
    displayDay <= 7
      ? { label: 'Week 1 (Days 1–7)', start: 1, end: 7 }
      : displayDay <= 14
        ? { label: 'Week 2 (Days 8–14)', start: 8, end: 14 }
        : displayDay <= 21
          ? { label: 'Week 3 (Days 15–21)', start: 15, end: 21 }
          : { label: 'Week 4+ (Days 22–30)', start: 22, end: 30 };
  const weekTasks = state.tasks.filter(
    (t) => t.dayNumber >= weekBounds.start && t.dayNumber <= weekBounds.end
  );
  const completedWeekTasks = weekTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
  const weekCompletionPct =
    weekTasks.length > 0 ? Math.round((completedWeekTasks / weekTasks.length) * 100) : 0;

  // Top 3 actions for today (prioritizing uncompleted tasks first)
  const topThreeTodayTasks = [
    ...dayTasks.filter((t) => t.status !== TaskStatus.COMPLETED),
    ...dayTasks.filter((t) => t.status === TaskStatus.COMPLETED),
  ].slice(0, 3);

  // Required follow-ups from CRM
  const requiredFollowUpsList = state.prospects.filter(
    (p) =>
      p.nextAction &&
      p.stage !== PipelineStage.WON &&
      p.stage !== PipelineStage.LOST &&
      p.stage !== PipelineStage.ARCHIVED
  );

  // Overdue or blocked tasks from earlier days
  const overdueTasks = state.tasks.filter(
    (t) => t.dayNumber < activeDay && t.status !== TaskStatus.COMPLETED
  );

  // Today's logged activity vs PDF targets
  const callsToday = state.callLogs.filter(
    (c) => c.dayNumber === displayDay && !c.isFollowUpCall
  ).length;
  const followUpsToday = state.callLogs.filter(
    (c) => c.dayNumber === displayDay && c.isFollowUpCall
  ).length;
  const demosToday = state.callLogs.filter(
    (c) => c.dayNumber === displayDay && c.demoConducted
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-sky-400">
            <span>{mode === 'mission' ? "TODAY'S MISSION BRIEF" : '30-DAY EXECUTION CALENDAR'}</span>
            <span aria-hidden="true">·</span>
            <span>Day {displayDay} Completion: {dayCompletionPct}%</span>
            <span aria-hidden="true">·</span>
            <span>{weekBounds.label}: {weekCompletionPct}% ({completedWeekTasks}/{weekTasks.length})</span>
            <span aria-hidden="true">·</span>
            <span>Campaign: {campaignCompletionPct}% ({totalCompleted}/{totalTasks})</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            {mode === 'mission'
              ? `Day ${displayDay} Daily Mission — ${dayTasks[0]?.phaseName || ''}`
              : '30-Day Execution Roadmap & Phase Checkpoints'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="text-xs text-slate-400 flex items-center gap-2">
            <span>Active Day Inspector:</span>
            <select
              aria-label="Inspect Campaign Day"
              value={displayDay}
              onChange={(e) => {
                const d = Number(e.target.value);
                setSelectedDay(d);
                if (mode === 'mission') {
                  onSelectDayOverride(d);
                }
              }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d} {d <= 2 ? '(First 48h)' : d === 7 || d === 14 || d === 21 || d === 30 ? '(Checkpoint)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => onNavigate('reviews')}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
          >
            5:00 PM Daily Review
          </button>
        </div>
      </div>

      {/* Today's Mission Executive Summary (For Mission View — Section 6 Requirement) */}
      {mode === 'mission' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
            <p className="text-xs font-mono text-sky-400">PRINCIPAL OBJECTIVE &amp; DELIVERABLE</p>
            <p className="text-sm font-bold text-slate-100">
              {dayTasks[0]?.phaseName || `Day ${displayDay} Revenue Execution`}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {displayDay <= 2
                ? 'Expected Deliverable: Locked $1,500 website offer, mobile-verified demo build, 1-page proposal template, 30–50 researched prospects, and first 25–30 outbound calls logged.'
                : displayDay <= 7
                  ? 'Expected Deliverable: Reach 100–125 cumulative outbound attempts, conduct booked 10-minute demonstrations, send 1-page proposals, and collect the first 1–2 upfront deposits ($750 each).'
                  : displayDay <= 14
                    ? 'Expected Deliverable: Sustain 20–25 daily calls, use early work as proof, test the $1,000 lead automation upsell, and review conversion rates at Day 14.'
                    : displayDay <= 21
                      ? 'Expected Deliverable: Concentrate on the strongest niche, deliver active contracts within scope, and compare collected revenue against the $20,000 pace.'
                      : 'Expected Deliverable: Complete contracted milestones, collect remaining 50% balances due, avoid over-capacity deposits, and reconcile final net cash.'}
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
            <p className="text-xs font-mono text-emerald-400">THREE MOST IMPORTANT ACTIONS TODAY</p>
            <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-200">
              {topThreeTodayTasks.map((t) => (
                <li key={t.id} className={t.status === TaskStatus.COMPLETED ? 'line-through text-slate-500' : ''}>
                  {t.title}
                </li>
              ))}
            </ol>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-mono text-amber-300">
                REQUIRED FOLLOW-UPS ({requiredFollowUpsList.length})
              </p>
              {requiredFollowUpsList.length === 0 ? (
                <p className="text-xs text-slate-400 mt-1">
                  No pending CRM follow-ups recorded yet. Add prospects and log calls to populate follow-up actions.
                </p>
              ) : (
                <ul className="space-y-1 mt-1 text-xs text-slate-300">
                  {requiredFollowUpsList.slice(0, 3).map((pr) => (
                    <li key={pr.id} className="truncate">
                      <strong>{pr.businessName}:</strong> {pr.nextAction} ({pr.nextActionDate || 'ASAP'})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('pipeline')}
              className="mt-2 text-xs text-sky-400 hover:underline text-left font-medium"
            >
              Open Follow-Up Pipeline →
            </button>
          </div>
        </div>
      )}

      {/* Phase Summary Strip (For Roadmap View) */}
      {mode === 'roadmap' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { label: 'Days 1–2', sub: 'Build the sales machine', start: 1, end: 2 },
            { label: 'Days 3–7', sub: 'First sales (100–125 calls)', start: 3, end: 7 },
            { label: 'Days 8–14', sub: 'Repeat and refine', start: 8, end: 14 },
            { label: 'Days 15–21', sub: 'Scale what works', start: 15, end: 21 },
            { label: 'Days 22–30', sub: 'Collect and fulfill', start: 22, end: 30 },
          ].map((phase) => {
            const pTasks = state.tasks.filter(
              (t) => t.dayNumber >= phase.start && t.dayNumber <= phase.end
            );
            const pDone = pTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
            const pct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
            const isSelected = displayDay >= phase.start && displayDay <= phase.end;

            return (
              <button
                key={phase.label}
                type="button"
                onClick={() => setSelectedDay(phase.start)}
                className={`p-3.5 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'bg-slate-900 border-sky-500/80'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-sky-400 font-semibold">{phase.label}</span>
                  <span className="text-slate-300">{pct}%</span>
                </div>
                <p className="text-xs font-semibold text-slate-100 mt-1">{phase.sub}</p>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  {pDone}/{pTasks.length} tasks done
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* 30-Day Quick Day Selector Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">
            Select Any Day (1–30) to Inspect or Update Tasks Without Losing History:
          </span>
          <span className="text-xs font-mono text-slate-400">
            Day {displayDay} Completion: {dayCompletionPct}% ({completedDayTasks}/{dayTasks.length})
          </span>
        </div>
        <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1.5">
          {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => {
            const dTasks = state.tasks.filter((t) => t.dayNumber === d);
            const dDone = dTasks.length > 0 && dTasks.every((t) => t.status === TaskStatus.COMPLETED);
            const isCurr = d === displayDay;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setSelectedDay(d);
                  if (mode === 'mission') onSelectDayOverride(d);
                }}
                className={`py-1.5 rounded text-xs font-mono transition-colors border ${
                  isCurr
                    ? 'bg-sky-400 text-slate-950 font-bold border-sky-300'
                    : dDone
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overdue Actions Alert */}
      {overdueTasks.length > 0 && (
        <div className="p-4 bg-amber-950/30 border border-amber-800/70 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{overdueTasks.length} Uncompleted Task(s) from Earlier Days:</strong> Review previous days or postpone unresolved tasks to today so nothing falls through the cracks.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const earliestDay = overdueTasks[0].dayNumber;
              setSelectedDay(earliestDay);
              if (mode === 'mission') onSelectDayOverride(earliestDay);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-amber-200 bg-amber-900/50 border border-amber-700 rounded-lg hover:bg-amber-900"
          >
            Jump to Day {overdueTasks[0].dayNumber}
          </button>
        </div>
      )}

      {/* Daily Activity Targets vs Recorded Today (PDF Section 2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Targeted Calls (PDF: 20–25/day)</p>
            <p className="text-xl font-bold text-slate-100 font-mono tabular-nums mt-1">
              {callsToday} / {state.settings.dailyCallTarget}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Calls to relevant businesses, not random numbers
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('calls')}
            className="px-3 py-1.5 text-xs font-medium text-sky-400 bg-slate-950 border border-slate-800 rounded-lg hover:border-sky-500"
          >
            Log Call
          </button>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Follow-Ups (PDF: 5–10/day)</p>
            <p className="text-xl font-bold text-slate-100 font-mono tabular-nums mt-1">
              {followUpsToday} / {state.settings.dailyFollowUpTarget}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Prospects who showed interest or agreed to contact
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('pipeline')}
            className="px-3 py-1.5 text-xs font-medium text-sky-400 bg-slate-950 border border-slate-800 rounded-lg hover:border-sky-500"
          >
            Pipeline
          </button>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Demonstrations (PDF: Aim for 1–3/day)</p>
            <p className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
              {demosToday} / {state.settings.dailyDemoTarget}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Outcome to work toward, not a guaranteed result
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('proposals')}
            className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-slate-950 border border-slate-800 rounded-lg hover:border-emerald-500"
          >
            Proposals
          </button>
        </div>
      </div>

      {/* Main Split: Day's Actionable Tasks & PDF 8-10 Hour Schedule Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Interactive Configurable Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <MissionChecklistSection
            tasks={dayTasks}
            allTasks={state.tasks}
            displayDay={displayDay}
            activeMember={activeMember}
            onToggleTask={(taskId) => {
              if (onToggleTask) {
                onToggleTask(taskId);
              } else {
                const target = state.tasks.find((t) => t.id === taskId);
                if (target) {
                  onUpdateTask({
                    ...target,
                    status:
                      target.status === TaskStatus.COMPLETED
                        ? TaskStatus.PENDING
                        : TaskStatus.COMPLETED,
                    completedAt:
                      target.status === TaskStatus.COMPLETED
                        ? undefined
                        : new Date().toISOString(),
                  });
                }
              }
            }}
            onUpdateTask={onUpdateTask}
            onAddTask={onAddTask}
            onDeleteTask={onDeleteTask}
            onClaimTask={onClaimTask}
            onApplyNotificationPreset={onApplyNotificationPreset}
            onResetDayTasksToPdf={onResetDayTasksToPdf}
            onBatchToggleTasks={onBatchToggleTasks}
          />
        </div>

        {/* Right Column: PDF Section 4 Daily Schedule (8-10 Hours) */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 h-fit">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
              <Clock className="w-4 h-4" />
              <span>PDF SECTION 4 SCHEDULE</span>
            </div>
            <h2 className="text-base font-bold text-slate-100 mt-1">
              Daily Operating Schedule (8–10 Hours)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              &ldquo;Use a consistent schedule that protects selling time. Development should support sales and fulfill commitments—not become a way to avoid contacting buyers.&rdquo;
            </p>
          </div>

          <div className="space-y-2.5">
            {DAILY_SCHEDULE_BLOCKS.map((block) => (
              <div
                key={block.time}
                className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-sky-400">{block.time}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-100">{block.title}</span>
                    {onApplyNotificationPreset && (
                      <button
                        type="button"
                        onClick={() =>
                          onApplyNotificationPreset({
                            category: 'TASK',
                            title: `Focus Block: ${block.title} (${block.time})`,
                            message: block.description,
                            targetEntityType: 'schedule-block',
                            targetTab: 'mission',
                            defaultPriority: 'HIGH',
                          })
                        }
                        title="Set reminder for this time block"
                        className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Bell className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{block.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
