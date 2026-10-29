import React, { useMemo, useState } from 'react';
import { CampaignState, DeliveryStatus, PipelineStage, ProposalStatus, TaskPriority, TaskStatus, TeamMember } from '../types';
import {
  calculateFinancialSummary,
  computeFunnelAnalytics,
  computeNextBestActions,
  evaluateDeliveryCapacity,
  getActiveCampaignDay,
} from '../utils/calculations';
import { ArrowRight, Check, CheckCircle2, Copy, AlertTriangle, HelpCircle, RefreshCw, Hand, Users, Sparkles, Bell } from 'lucide-react';
import { PWAInstallCard } from './PWAInstallCard';
import { NotificationPresetTarget } from './CreateNotificationModal';

interface CommandCenterViewProps {
  state: CampaignState;
  activeMember?: TeamMember;
  onClaimTask?: (taskId: string) => void;
  onOpenAuthModal?: () => void;
  onSendInFullSquad?: () => void;
  onNavigate: (tab: string) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onApplyNotificationPreset?: (preset: NotificationPresetTarget) => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  state,
  activeMember,
  onClaimTask,
  onOpenAuthModal,
  onSendInFullSquad,
  onNavigate,
  onToggleTaskStatus,
  onApplyNotificationPreset,
}) => {
  const [overriddenActionIndex, setOverriddenActionIndex] = useState<number>(0);
  const [copiedExecSummary, setCopiedExecSummary] = useState<boolean>(false);

  const activeDay = getActiveCampaignDay(
    state.settings.startDate,
    state.settings.currentDayOverride
  );
  const daysRemaining = Math.max(0, 30 - activeDay);
  const fin = useMemo(() => calculateFinancialSummary(state), [state]);
  const funnel = useMemo(() => computeFunnelAnalytics(state), [state]);
  const capacity = useMemo(() => evaluateDeliveryCapacity(state), [state]);
  const nextActions = useMemo(() => computeNextBestActions(state), [state]);

  const selectedAction =
    nextActions[overriddenActionIndex] ||
    nextActions[0] || {
      id: 'default-action',
      title: 'Make 10 targeted calls and log outcomes',
      actionType: 'DAILY_OUTBOUND',
      targetTab: 'calls',
      explanation: 'Start with the first 10 calls to businesses with an observable website issue.',
      pdfRuleCitation: 'PDF Section 7 & 14',
      urgency: 'CRITICAL',
    };

  const todayTasks = state.tasks.filter((t) => t.dayNumber === activeDay);
  const completedTodayCount = todayTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;

  const openProposals = state.proposals.filter((p) => p.status === ProposalStatus.SENT);
  const activeProspectsCount = state.prospects.filter(
    (p) =>
      p.stage !== PipelineStage.WON &&
      p.stage !== PipelineStage.LOST &&
      p.stage !== PipelineStage.ARCHIVED
  ).length;

  const qualifiedOpportunitiesCount = state.prospects.filter(
    (p) =>
      p.stage === PipelineStage.QUALIFIED ||
      p.stage === PipelineStage.DEMO_BOOKED ||
      p.stage === PipelineStage.DEMO_COMPLETED ||
      p.stage === PipelineStage.PROPOSAL_SENT
  ).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingFollowUps = state.prospects.filter(
    (p) =>
      p.stage !== PipelineStage.WON &&
      p.stage !== PipelineStage.LOST &&
      p.stage !== PipelineStage.ARCHIVED &&
      p.nextActionDate
  );

  // Build cumulative trajectory points across 6 checkpoints (Day 1, 5, 10, 15, 20, 25, 30)
  const cumulativeByDay = useMemo(() => {
    const trajectoryDays = [1, 5, 10, 15, 20, 25, 30];
    return trajectoryDays.map((d) => {
      const actualThruDay = state.transactions
        .filter(
          (tx) =>
            tx.dayNumber <= d &&
            tx.type !== 'Business Expense' &&
            tx.type !== 'Customer Refund'
        )
        .reduce((acc, tx) => acc + tx.amount, 0);
      const targetPace = Math.round((state.settings.revenueTarget / 30) * d);
      return { day: d, actual: d <= activeDay ? actualThruDay : null, targetPace };
    });
  }, [state.transactions, state.settings.revenueTarget, activeDay]);

  // Revenue by Offer breakdown
  const offerACleared = state.transactions
    .filter((tx) => tx.category.includes('Offer A') && tx.type !== 'Business Expense')
    .reduce((a, b) => a + b.amount, 0);
  const offerBCleared = state.transactions
    .filter((tx) => tx.category.includes('Offer B') && tx.type !== 'Business Expense')
    .reduce((a, b) => a + b.amount, 0);
  const offerCCleared = state.transactions
    .filter((tx) => tx.category.includes('Offer C') && tx.type !== 'Business Expense')
    .reduce((a, b) => a + b.amount, 0);

  // Weekly Collections & Cash Balance Over Time (4 Weekly Checkpoints + Day 30)
  const weeklyData = useMemo(
    () =>
      [
        { label: 'Week 1 (Days 1–7)', start: 1, end: 7 },
        { label: 'Week 2 (Days 8–14)', start: 8, end: 14 },
        { label: 'Week 3 (Days 15–21)', start: 15, end: 21 },
        { label: 'Week 4+ (Days 22–30)', start: 22, end: 30 },
      ].map((wk) => {
        const collectedInWeek = state.transactions
          .filter(
            (tx) =>
              tx.dayNumber >= wk.start &&
              tx.dayNumber <= wk.end &&
              tx.type !== 'Business Expense' &&
              tx.type !== 'Customer Refund'
          )
          .reduce((acc, tx) => acc + tx.amount, 0);

        const cumulativeInflowThruWeek = state.transactions
          .filter(
            (tx) =>
              tx.dayNumber <= wk.end &&
              tx.type !== 'Business Expense' &&
              tx.type !== 'Customer Refund'
          )
          .reduce((acc, tx) => acc + tx.amount, 0);

        const cumulativeOutflowThruWeek = state.transactions
          .filter(
            (tx) =>
              tx.dayNumber <= wk.end &&
              (tx.type === 'Business Expense' || tx.type === 'Customer Refund')
          )
          .reduce((acc, tx) => acc + tx.amount, 0);

        const cashAtEndOfWeek =
          state.settings.startingWorkingCapital +
          cumulativeInflowThruWeek -
          cumulativeOutflowThruWeek;

        return {
          ...wk,
          collectedInWeek,
          cashAtEndOfWeek,
          isReached: activeDay >= wk.start,
        };
      }),
    [state.transactions, state.settings.startingWorkingCapital, activeDay]
  );

  // Sales Pipeline by Stage Breakdown
  const pipelineStagesBreakdown = [
    { stage: PipelineStage.IDENTIFIED, label: 'Identified' },
    { stage: PipelineStage.CONTACTED, label: 'Contacted' },
    { stage: PipelineStage.QUALIFIED, label: 'Qualified' },
    { stage: PipelineStage.DEMO_BOOKED, label: 'Demo Booked' },
    { stage: PipelineStage.PROPOSAL_SENT, label: 'Proposal Sent' },
    { stage: PipelineStage.WON, label: 'Won / Paid' },
  ].map((st) => ({
    ...st,
    count: state.prospects.filter((p) => p.stage === st.stage).length,
  }));

  // Payments Expected vs Overdue
  const overdueReceivables = state.projects
    .filter(
      (pr) =>
        pr.remainingBalance > 0 &&
        (pr.status === DeliveryStatus.DELIVERED ||
          pr.status === DeliveryStatus.ACCEPTED ||
          (pr.targetDeliveryDate && pr.targetDeliveryDate < todayStr))
    )
    .reduce((acc, pr) => acc + pr.remainingBalance, 0);

  const handleCopyExecutiveBrief = async () => {
    const text = [
      `IT'S LLC — $5K TO $20K IN 30 DAYS (Day ${activeDay}/30)`,
      `Cleared Revenue: $${fin.netClearedRevenue.toLocaleString()} / $${state.settings.revenueTarget.toLocaleString()} ($${fin.revenueRemainingToTarget.toLocaleString()} remaining)`,
      `Recorded Cash: $${fin.currentRecordedCashBalance.toLocaleString()} (Protected Reserve: $${fin.protectedReserve.toLocaleString()})`,
      `Next Dollar Action: ${selectedAction.title}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedExecSummary(true);
      setTimeout(() => setCopiedExecSummary(false), 2000);
    } catch {
      setCopiedExecSummary(true);
      setTimeout(() => setCopiedExecSummary(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Status Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Day {activeDay} of 30</span>
              <span aria-hidden="true">·</span>
              <span>{daysRemaining} Days Remaining</span>
              <span aria-hidden="true">·</span>
              <span>Start Date: {state.settings.startDate}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300">Stretch Target (Not a Guarantee)</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">
              <span className="animated-copy-shimmer">
                Executive Command Center — It&apos;s LLC
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="copy-executive-status-btn"
              onClick={handleCopyExecutiveBrief}
              className="embossed-button inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              {copiedExecSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 animate-copy-pop">Copied Brief!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                  <span>Copy Brief</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('mission')}
              className="embossed-button px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0"
            >
              Open Day {activeDay} Mission ({completedTodayCount}/{todayTasks.length})
            </button>
            <button
              type="button"
              onClick={() => onNavigate('calls')}
              className="embossed-button px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              Log Call / Demo
            </button>
          </div>
        </div>

        {/* The 5 Immediate Questions Bar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-800">
          <div className="p-3.5 bg-slate-950 border border-slate-800/90 rounded-lg">
            <p className="text-xs text-slate-400">1. Accomplish Today</p>
            <p className="text-sm font-semibold text-slate-100 mt-1">
              {todayTasks.length - completedTodayCount} tasks &amp; {state.settings.dailyCallTarget} calls
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {completedTodayCount} of {todayTasks.length} Day {activeDay} items done
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800/90 rounded-lg">
            <p className="text-xs text-slate-400">2. Next Dollar Action</p>
            <p className="text-sm font-semibold text-emerald-400 mt-1 line-clamp-2">
              {selectedAction.title}
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800/90 rounded-lg">
            <p className="text-xs text-slate-400">3. Standing vs $20k Target</p>
            <p className="text-sm font-semibold text-slate-100 font-mono tabular-nums mt-1">
              ${fin.netClearedRevenue.toLocaleString()} / ${state.settings.revenueTarget.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 font-mono tabular-nums mt-1">
              ${fin.revenueRemainingToTarget.toLocaleString()} remaining
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800/90 rounded-lg">
            <p className="text-xs text-slate-400">4. Primary Blocker</p>
            <p className="text-xs font-medium text-amber-300 mt-1 line-clamp-3">
              {capacity.isCapacityExhausted
                ? 'Delivery capacity full — complete active milestones first'
                : funnel.dealsWon === 0
                  ? 'Need more qualified 10-min demos & written scopes sent'
                  : 'Complete active client milestones to unlock remaining 50% payments'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800/90 rounded-lg flex flex-col justify-between">
            <div>
              <p className="text-xs text-slate-400">5. Immediate Next Step</p>
              <p className="text-xs font-medium text-sky-400 mt-1">
                Go to {selectedAction.targetTab.toUpperCase()} workspace
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(selectedAction.targetTab)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-100 hover:text-sky-400 transition-colors"
            >
              <span>Execute Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Explainable Next Best Action Engine */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-sky-400">
              <span>NEXT BEST ACTION ENGINE</span>
              <span aria-hidden="true">·</span>
              <span>Urgency: {selectedAction.urgency}</span>
              <span aria-hidden="true">·</span>
              <span>Option {overriddenActionIndex + 1} of {Math.max(1, nextActions.length)}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">{selectedAction.title}</h2>
            <p className="text-sm text-slate-300">{selectedAction.explanation}</p>
            <p className="text-xs text-slate-400 font-mono pt-1">{selectedAction.pdfRuleCitation}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {nextActions.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setOverriddenActionIndex((prev) => (prev + 1) % nextActions.length)
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Override / Cycle Next Action</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate(selectedAction.targetTab)}
              className="embossed-button inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors"
            >
              <span>Open Action Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Integrated PWA Install Prompt Card & Home Screen App Icon Quick-Select Menu */}
      <PWAInstallCard onSelectShortcut={onNavigate} />

      {/* Strictly Separated Financial & Operational Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">Cleared Gross Revenue Collected</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
            ${fin.netClearedRevenue.toLocaleString()}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1 font-mono tabular-nums">
            <div className="flex justify-between">
              <span>30-Day Stretch Target:</span>
              <span className="text-slate-200">${state.settings.revenueTarget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Still Required:</span>
              <span className="text-amber-300">${fin.revenueRemainingToTarget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Unearned Deposits Held:</span>
              <span className="text-sky-300">${fin.unearnedDepositObligations.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">Recorded Cash &amp; Discretionary Fuel</p>
          <p className="text-2xl font-bold text-slate-100 font-mono tabular-nums mt-1">
            ${fin.currentRecordedCashBalance.toLocaleString()}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1 font-mono tabular-nums">
            <div className="flex justify-between">
              <span>Protected + Contingency:</span>
              <span className="text-emerald-400">${fin.totalRestrictedFunds.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Expenses Paid:</span>
              <span className="text-rose-400">${fin.totalExpensesPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Discretionary Available:</span>
              <span className="text-sky-400">${fin.availableDiscretionaryCash.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">Est. Net Operating Result (Pre-Tax)</p>
          <p
            className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
              fin.estimatedNetOperatingResult >= 0 ? 'text-slate-100' : 'text-rose-400'
            }`}
          >
            ${fin.estimatedNetOperatingResult.toLocaleString()}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1 font-mono tabular-nums">
            <div className="flex justify-between">
              <span>Payments Expected (Due):</span>
              <span className="text-amber-300">${fin.outstandingContractReceivables.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Payments Overdue:</span>
              <span className={overdueReceivables > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                ${overdueReceivables.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Open Sent Proposals:</span>
              <span className="text-slate-300">
                {openProposals.length} (${fin.proposedRevenueUnaccepted.toLocaleString()})
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">Pipeline &amp; Delivery Queue</p>
          <p className="text-2xl font-bold text-slate-100 font-mono tabular-nums mt-1">
            {capacity.activeProjectCount} / {capacity.maxConcurrentAllowed} Builds
          </p>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1 font-mono tabular-nums">
            <div className="flex justify-between">
              <span>Active Prospects:</span>
              <span className="text-slate-200">{activeProspectsCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Qualified Opportunities:</span>
              <span className="text-sky-400">{qualifiedOpportunitiesCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Scheduled Follow-Ups:</span>
              <span className="text-amber-300">{upcomingFollowUps.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Explicit Financial Accounting Disclosure Banner */}
      <div className="px-4 py-3 bg-slate-900/70 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          <strong>Accounting Disclosure (PDF Section 1 &amp; 6):</strong> Proposals sent (${fin.proposedRevenueUnaccepted.toLocaleString()}) and unpaid contract balances (${fin.outstandingContractReceivables.toLocaleString()}) are NEVER counted in Cleared Revenue (${fin.netClearedRevenue.toLocaleString()}). Upfront 50% deposits (${fin.unearnedDepositObligations.toLocaleString()} currently in active delivery) carry delivery obligations and are excluded from discretionary cash. Estimated Net Operating Result excludes unentered payment processor fees and est. tax reserve (${fin.estimatedTaxReserve.toLocaleString()}).
        </span>
      </div>

      {/* Charts & Visual Trajectory Grid (Row 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Cumulative Collected Revenue vs. Target Trajectory */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Cumulative Cleared Revenue vs. $20,000 Stretch Trajectory
              </h2>
              <p className="text-xs text-slate-400">
                Actual recorded inflows through Day {activeDay} compared with linear 30-day target pace
              </p>
            </div>
            <span className="text-xs font-mono text-sky-400">Actual vs. Plan</span>
          </div>

          <div className="space-y-3">
            {cumulativeByDay.map((pt) => {
              const targetPct = Math.min(100, Math.round((pt.targetPace / 20000) * 100));
              const actualPct =
                pt.actual !== null ? Math.min(100, Math.round((pt.actual / 20000) * 100)) : 0;
              return (
                <div key={pt.day} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono tabular-nums">
                    <span className="text-slate-300">Day {pt.day}</span>
                    <span className="text-slate-400">
                      Actual:{' '}
                      <strong className="text-emerald-400">
                        {pt.actual !== null ? `$${pt.actual.toLocaleString()}` : 'Future'}
                      </strong>{' '}
                      / Target Pace: ${pt.targetPace.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-950 rounded overflow-hidden relative border border-slate-800">
                    <div
                      className="h-full bg-slate-700/60 absolute left-0 top-0"
                      style={{ width: `${targetPct}%` }}
                      title={`Target Pace: $${pt.targetPace.toLocaleString()}`}
                    />
                    {pt.actual !== null && (
                      <div
                        className="h-full bg-emerald-500 relative z-10"
                        style={{ width: `${actualPct}%` }}
                        title={`Actual Cleared: $${pt.actual.toLocaleString()}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Revenue Collected by Offer Type vs PDF Model */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Cleared Revenue by Offer vs. PDF Model
                </h2>
                <p className="text-xs text-slate-400">
                  Offer A ($12k) + Offer B ($4k) + Offer C Alpha Upside ($4k)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('offers')}
                className="text-xs text-sky-400 hover:underline font-medium"
              >
                Configure Offers
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-200 font-medium">
                    Offer A: Small-business website ($1,500 × 8)
                  </span>
                  <span className="font-mono tabular-nums text-slate-300">
                    ${offerACleared.toLocaleString()} / $12,000
                  </span>
                </div>
                <div className="h-2.5 bg-slate-950 rounded border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-500"
                    style={{ width: `${Math.min(100, Math.round((offerACleared / 12000) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-200 font-medium">
                    Offer B: Lead follow-up automation ($1,000 × 4)
                  </span>
                  <span className="font-mono tabular-nums text-slate-300">
                    ${offerBCleared.toLocaleString()} / $4,000
                  </span>
                </div>
                <div className="h-2.5 bg-slate-950 rounded border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min(100, Math.round((offerBCleared / 4000) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-200 font-medium">
                    Offer C: The Youniverse alpha ($200 × 20 — Unproven Upside)
                  </span>
                  <span className="font-mono tabular-nums text-amber-300">
                    ${offerCCleared.toLocaleString()} / $4,000
                  </span>
                </div>
                <div className="h-2.5 bg-slate-950 rounded border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${Math.min(100, Math.round((offerCCleared / 4000) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Outbound Calls</p>
              <p className="text-base font-bold text-slate-100 font-mono tabular-nums mt-0.5">
                {funnel.outboundAttempts} / 450
              </p>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Demos Conducted</p>
              <p className="text-base font-bold text-slate-100 font-mono tabular-nums mt-0.5">
                {funnel.demosConducted} / 25
              </p>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Deals Won</p>
              <p className="text-base font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
                {funnel.dealsWon} / 8
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Visual Trajectory Grid (Row 2: Weekly Collections, Cash Balance Over Time, Pipeline by Stage) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Weekly Collections & Cash Balance Over Time */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Weekly Collections &amp; Cash Balance Over Time
              </h2>
              <p className="text-xs text-slate-400">
                Weekly cleared inflows and end-of-week cash balance vs. $2,500 protected reserve floor
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('cash')}
              className="text-xs text-sky-400 hover:underline font-medium"
            >
              Cash Ledger
            </button>
          </div>

          <div className="space-y-3">
            {weeklyData.map((wk) => (
              <div key={wk.label} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="flex justify-between text-xs font-mono tabular-nums mb-1.5">
                  <span className="text-slate-200 font-sans font-medium">{wk.label}</span>
                  <span>
                    Collected: <strong className="text-emerald-400">${wk.collectedInWeek.toLocaleString()}</strong>
                    {' · '}
                    Cash Balance:{' '}
                    <strong className="text-sky-300">
                      {wk.isReached ? `$${wk.cashAtEndOfWeek.toLocaleString()}` : 'Future'}
                    </strong>
                  </span>
                </div>
                <div className="h-2 bg-slate-900 rounded overflow-hidden">
                  <div
                    className="h-full bg-sky-500"
                    style={{
                      width: `${wk.isReached ? Math.min(100, Math.round((wk.cashAtEndOfWeek / 25000) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Sales Pipeline by Stage & Prospecting Conversion */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Sales Pipeline by Stage &amp; Conversion Activity
                </h2>
                <p className="text-xs text-slate-400">
                  Active distribution across CRM stages and live conversion ratios
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('pipeline')}
                className="text-xs text-sky-400 hover:underline font-medium"
              >
                Open Pipeline
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {pipelineStagesBreakdown.map((item) => (
                <div
                  key={item.stage}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between"
                >
                  <span className="text-xs text-slate-300">{item.label}</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-sky-400">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-2.5 text-center font-mono tabular-nums text-xs">
            <div className="p-2 bg-slate-950 border border-slate-800 rounded">
              <p className="text-slate-400 font-sans">Call → Conv</p>
              <p className="text-sm font-bold text-slate-100 mt-0.5">
                {funnel.attemptToConversationRate}%
              </p>
            </div>
            <div className="p-2 bg-slate-950 border border-slate-800 rounded">
              <p className="text-slate-400 font-sans">Conv → Demo</p>
              <p className="text-sm font-bold text-slate-100 mt-0.5">
                {funnel.conversationToDemoRate}%
              </p>
            </div>
            <div className="p-2 bg-slate-950 border border-slate-800 rounded">
              <p className="text-slate-400 font-sans">Prop → Close</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">
                {funnel.proposalToCloseRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Split: Day's Tasks & PDF Checkpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Day {activeDay} Execution Tasks ({completedTodayCount}/{todayTasks.length} Completed)
              </h2>
              <p className="text-xs text-slate-400">
                Check off tasks as you complete them today
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('mission')}
              className="text-xs text-sky-400 hover:underline font-medium"
            >
              Full Daily Mission
            </button>
          </div>

          <div className="space-y-2.5">
            {todayTasks.map((task) => {
              const isDone = task.status === TaskStatus.COMPLETED;
              return (
                <div
                  key={task.id}
                  className="flex items-start justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleTaskStatus(task.id)}
                      aria-label={`Toggle task ${task.title}`}
                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                          : 'border-slate-600 hover:border-sky-400'
                      }`}
                    >
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <p
                        className={`text-xs font-medium ${
                          isDone ? 'line-through text-slate-500' : 'text-slate-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                        {task.instructions}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {task.dueTimeBlock && (
                        <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
                          {task.dueTimeBlock}
                        </span>
                      )}
                      {onApplyNotificationPreset && (
                        <button
                          type="button"
                          onClick={() =>
                            onApplyNotificationPreset({
                              category: 'TASK',
                              title: `Task: ${task.title}`,
                              message: task.instructions || `Focus block for Day ${task.dayNumber}: ${task.title}`,
                              targetEntityId: task.id,
                              targetEntityType: 'task',
                              targetTab: 'mission',
                              defaultPriority: task.priority === TaskPriority.CRITICAL ? 'URGENT' : 'HIGH',
                            })
                          }
                          title="Apply notification reminder for this task"
                          className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {onClaimTask && (
                      <button
                        type="button"
                        onClick={() => onClaimTask(task.id)}
                        data-testid={`command-claim-task-${task.id}`}
                        className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer ${
                          task.claimedByName
                            ? task.claimedByMemberId === activeMember?.id
                              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                              : 'bg-sky-500/15 border border-sky-500/40 text-sky-300'
                            : 'bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 text-slate-300'
                        }`}
                      >
                        <Hand className="w-2.5 h-2.5" />
                        <span>
                          {task.claimedByName
                            ? task.claimedByName.split(' ')[0]
                            : 'Claim Step'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PDF Checkpoint Schedule & Capacity Guard */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              PDF Section 6 Checkpoint Schedule &amp; Capacity Status
            </h2>
            <p className="text-xs text-slate-400">
              Mandatory verification gates for the $5,000 capital and sales funnel
            </p>
          </div>

          <div
            className={`p-3.5 rounded-lg border text-xs ${
              capacity.isCapacityExhausted
                ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Delivery Queue Monitor</span>
            </div>
            <p>{capacity.statusMessage}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">What to Verify</th>
                  <th className="py-2 font-medium">PDF Decision Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                <tr className={activeDay <= 2 ? 'bg-sky-950/20' : ''}>
                  <td className="py-2.5 pr-3 font-mono whitespace-nowrap">Day 2</td>
                  <td className="py-2.5 pr-3">Prospect list (30–50), demo ready, actual cash</td>
                  <td className="py-2.5 text-amber-300">No major ad spend</td>
                </tr>
                <tr className={activeDay >= 3 && activeDay <= 7 ? 'bg-sky-950/20' : ''}>
                  <td className="py-2.5 pr-3 font-mono whitespace-nowrap">Day 7</td>
                  <td className="py-2.5 pr-3">Conversations, proposals, first 1–2 deposits</td>
                  <td className="py-2.5">Fix targeting or pitch if buyers aren&apos;t engaging</td>
                </tr>
                <tr className={activeDay >= 8 && activeDay <= 14 ? 'bg-sky-950/20' : ''}>
                  <td className="py-2.5 pr-3 font-mono whitespace-nowrap">Day 14</td>
                  <td className="py-2.5 pr-3">Cleared payments, delivery workload, cash left</td>
                  <td className="py-2.5">Expand only the channel showing evidence</td>
                </tr>
                <tr className={activeDay >= 15 && activeDay <= 21 ? 'bg-sky-950/20' : ''}>
                  <td className="py-2.5 pr-3 font-mono whitespace-nowrap">Day 21</td>
                  <td className="py-2.5 pr-3">Collected revenue versus $20,000 target pace</td>
                  <td className="py-2.5">Reforecast the remaining nine days honestly</td>
                </tr>
                <tr className={activeDay >= 22 ? 'bg-sky-950/20' : ''}>
                  <td className="py-2.5 pr-3 font-mono whitespace-nowrap">Day 30</td>
                  <td className="py-2.5 pr-3">Gross receipts, expenses, refunds, obligations</td>
                  <td className="py-2.5 text-emerald-400">Determine actual net cash generated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Team War Room & Multi-Operator Relay Card */}
      <div
        className="embossed-card rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        data-testid="command-team-war-room-card"
      >
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>
              MULTI-OPERATOR SQUAD COMMAND ({state.teamMembers?.length || 1} OPERATORS • SHARED $20,000 GOAL)
            </span>
          </div>
          <h3 className="text-sm font-bold text-white">
            Every Step Is Claimable: One Person Calls, Another Runs the 10-Min Demo, Another Closes &amp; Delivers
          </h3>
          <p className="text-xs text-slate-400">
            Currently signed in as <strong className="text-sky-300">{activeMember?.name || 'Lead Operator'}</strong>. View team performance charts, per-operator numbers, and claim open steps across the pipeline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
            >
              Sign In / Switch Operator
            </button>
          )}
          {onSendInFullSquad && (
            <button
              type="button"
              onClick={onSendInFullSquad}
              className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Send In the Team</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('team')}
            data-testid="open-team-war-room-command-btn"
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>Open Team Charts &amp; War Room</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Google Workspace Integration Card (Calendar, Gmail, Sheets, Forms) */}
      <div
        className="embossed-card rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        data-testid="command-workspace-card"
      >
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-sky-400">
            GOOGLE WORKSPACE COMMAND SUITE (CALENDAR • GMAIL • SHEETS • FORMS)
          </div>
          <h3 className="text-sm font-bold text-white">
            Sync 8–10h Schedule Blocks, Send $1,500 Proposals via Gmail, Export Section 9 Tracker to Sheets &amp; Collect Intake Forms
          </h3>
          <p className="text-xs text-slate-400">
            Connect your Google account with permission to schedule 10-minute demos on Google Calendar, email written scopes via Gmail, sync your daily tracker to Google Sheets, and manage client intake on Google Forms.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('workspace')}
            data-testid="open-workspace-hub-btn"
            className="px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>Open Google Workspace Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

