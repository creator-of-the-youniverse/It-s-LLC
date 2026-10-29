import React, { useMemo, useState } from 'react';
import {
  CampaignSettings,
  CampaignState,
  DailyReviewEntry,
  TaskStatus,
  TransactionType,
} from '../types';
import {
  calculateFinancialSummary,
  computeFunnelAnalytics,
  evaluateDeliveryCapacity,
  formatCampaignDayDate,
  getActiveCampaignDay,
  RevenueTrajectoryPoint,
  sanitizeAndDeduplicateImportState,
} from '../utils/calculations';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { PWAInstallCard } from './PWAInstallCard';

interface AnalyticsReviewsSettingsProps {
  state: CampaignState;
  mode: 'analytics' | 'reviews' | 'settings';
  onSaveDailyReview: (review: DailyReviewEntry) => void;
  onUpdateSettings: (settings: CampaignSettings) => void;
  onExportFullJson: () => void;
  onImportFullJson: (state: CampaignState) => void;
  onResetCampaign: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: RevenueTrajectoryPoint;
  }>;
  label?: string;
}

export const CustomTrajectoryTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  const isAhead = point.variance > 0;
  const isOnTrack = point.variance === 0;
  const varianceLabel = isOnTrack
    ? 'On Target ($0 variance)'
    : isAhead
    ? `+$${point.variance.toLocaleString()} Ahead of Target`
    : `-$${Math.abs(point.variance).toLocaleString()} Behind Target`;

  return (
    <div
      data-testid="revenue-trajectory-tooltip"
      className="p-3.5 bg-slate-950/95 border border-slate-700 rounded-xl shadow-xl text-xs space-y-2 min-w-[260px]"
    >
      <div className="pb-2 border-b border-slate-800 flex items-center justify-between gap-3">
        <span className="font-bold text-slate-100">{point.dayLabel}</span>
        <span className="font-mono text-sky-400">
          {point.formattedDate} ({point.date})
        </span>
      </div>

      <div className="space-y-1.5 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 font-sans">Revenue Collected:</span>
          <strong className="text-emerald-400">
            ${point.revenueCollected.toLocaleString()}
          </strong>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 font-sans">Target (Baseline Milestone):</span>
          <strong className="text-sky-400">
            ${point.targetBaseline.toLocaleString()}
          </strong>
        </div>

        {point.dailyRevenueAdded !== 0 && (
          <div className="flex items-center justify-between gap-4 text-[11px]">
            <span className="text-slate-400 font-sans">Net Cleared on {point.formattedDate}:</span>
            <span
              className={
                point.dailyRevenueAdded > 0 ? 'text-emerald-300' : 'text-rose-400'
              }
            >
              {point.dailyRevenueAdded > 0 ? '+' : '-'}$
              {Math.abs(point.dailyRevenueAdded).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 font-mono tabular-nums">
        <span className="text-slate-400 font-sans">Status vs. Target:</span>
        <strong
          className={
            isAhead || isOnTrack ? 'text-emerald-400' : 'text-amber-400'
          }
        >
          {varianceLabel}
        </strong>
      </div>
    </div>
  );
};

export const AnalyticsReviewsSettingsView: React.FC<AnalyticsReviewsSettingsProps> = ({
  state,
  mode,
  onSaveDailyReview,
  onUpdateSettings,
  onExportFullJson,
  onImportFullJson,
  onResetCampaign,
  onNavigateTab,
}) => {
  const activeState = state;
  const [chartWindow, setChartWindow] = useState<'all' | 'first14' | 'last16'>('all');
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);
  const activeDay = getActiveCampaignDay(
    activeState.settings.startDate,
    activeState.settings.currentDayOverride
  );
  const todayStr = new Date().toISOString().slice(0, 10);
  const fin = calculateFinancialSummary(activeState);
  const funnel = computeFunnelAnalytics(activeState);
  const cap = evaluateDeliveryCapacity(activeState);

  // Build 30-day trajectory series comparing daily cumulative 'Revenue Collected'
  // from activeState.transactions against the $20,000 30-day target trajectory
  const revenueTrajectorySeries = useMemo(() => {
    const targetGoal = Math.max(0, activeState.settings.revenueTarget || 20000);
    return Array.from({ length: 30 }, (_, index) => {
      const day = index + 1;
      const targetBaseline = Math.round((targetGoal / 30) * day);
      const { isoDate, formattedDate } = formatCampaignDayDate(
        activeState.settings.startDate,
        day
      );

      let cumulativeRevenueCollected = 0;
      let dailyRevenueAdded = 0;
      for (const tx of activeState.transactions) {
        const amount = Math.max(0, Number(tx.amount) || 0);
        if (tx.dayNumber <= day) {
          if (
            tx.type === TransactionType.REVENUE_DEPOSIT ||
            tx.type === TransactionType.REVENUE_MILESTONE ||
            tx.type === TransactionType.REVENUE_FULL
          ) {
            cumulativeRevenueCollected += amount;
            if (tx.dayNumber === day) dailyRevenueAdded += amount;
          } else if (tx.type === TransactionType.REFUND) {
            cumulativeRevenueCollected -= amount;
            if (tx.dayNumber === day) dailyRevenueAdded -= amount;
          }
        }
      }

      const revenueCollected = Math.max(0, cumulativeRevenueCollected);

      return {
        day,
        dayLabel: `Day ${day}`,
        date: isoDate,
        formattedDate,
        revenueCollected,
        dailyRevenueAdded,
        targetBaseline,
        variance: revenueCollected - targetBaseline,
      };
    });
  }, [
    activeState.transactions,
    activeState.settings.revenueTarget,
    activeState.settings.startDate,
  ]);

  const visibleTrajectorySeries = useMemo(() => {
    if (chartWindow === 'first14') return revenueTrajectorySeries.slice(0, 14);
    if (chartWindow === 'last16') return revenueTrajectorySeries.slice(14, 30);
    return revenueTrajectorySeries;
  }, [revenueTrajectorySeries, chartWindow]);

  const pipelineChartData = useMemo(
    () => [
      {
        stage: 'Outbound Calls',
        paceTarget: Math.round((450 / 30) * activeDay),
        actualRecorded: funnel.outboundAttempts,
      },
      {
        stage: 'Conversations',
        paceTarget: Math.round((100 / 30) * activeDay),
        actualRecorded: funnel.twoWayConversations,
      },
      {
        stage: 'Qualified',
        paceTarget: Math.round((38 / 30) * activeDay),
        actualRecorded: funnel.qualifiedProspects,
      },
      {
        stage: '10-Min Demos',
        paceTarget: Math.round((25 / 30) * activeDay),
        actualRecorded: funnel.demosConducted,
      },
      {
        stage: 'Proposals Sent',
        paceTarget: Math.round((16 / 30) * activeDay),
        actualRecorded: funnel.proposalsSent,
      },
      {
        stage: 'Paid Clients',
        paceTarget: Math.max(1, Math.round((6 / 30) * activeDay)),
        actualRecorded: funnel.dealsWon,
      },
    ],
    [activeDay, funnel]
  );

  const handleCopyAnalyticsSnapshot = async () => {
    const summaryText = [
      `IT'S LLC — $5K TO $20K IN 30 DAYS ANALYTICS SNAPSHOT (Day ${activeDay}/30)`,
      `Revenue Collected: $${fin.netClearedRevenue.toLocaleString()} / $${activeState.settings.revenueTarget.toLocaleString()}`,
      `Amount Remaining: $${fin.revenueRemainingToTarget.toLocaleString()}`,
      `Day ${activeDay} Target Milestone: $${Math.round((activeState.settings.revenueTarget / 30) * activeDay).toLocaleString()}`,
      `Pipeline: ${funnel.outboundAttempts} calls -> ${funnel.twoWayConversations} conversations -> ${funnel.demosConducted} demos -> ${funnel.proposalsSent} proposals -> ${funnel.dealsWon} won`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedSnapshot(true);
      setTimeout(() => setCopiedSnapshot(false), 2000);
    } catch {
      setCopiedSnapshot(true);
      setTimeout(() => setCopiedSnapshot(false), 2000);
    }
  };

  // Daily Review Form State
  const todayCalls = activeState.callLogs.filter((c) => c.dayNumber === activeDay && !c.isFollowUpCall).length;
  const todayFollowUps = activeState.callLogs.filter((c) => c.dayNumber === activeDay && c.isFollowUpCall).length;
  const todayReached = activeState.callLogs.filter((c) => c.dayNumber === activeDay && c.decisionMakerReached).length;
  const todayDemos = activeState.callLogs.filter((c) => c.dayNumber === activeDay && c.demoConducted).length;

  const [whatBuyersSaid, setWhatBuyersSaid] = useState('');
  const [biggestObstacle, setBiggestObstacle] = useState('');
  const [completedSummary, setCompletedSummary] = useState('');
  const [priority1, setPriority1] = useState('Make 20–25 targeted calls to businesses with verified website issues');
  const [priority2, setPriority2] = useState('Conduct booked 10-minute demonstrations & send 1-page proposals');
  const [priority3, setPriority3] = useState('Deliver active client milestones & protect $2,500 reserve');

  // Coach / Advisor Diagnosis State
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachDiagnosis, setCoachDiagnosis] = useState<{
    source: string;
    bottleneckDiagnosis: string;
    factsObserved: string[];
    assumptionsIdentified: string[];
    recommendedNextAction: string;
    reasoningAndConstraintCheck: string;
  } | null>(null);

  // Settings & Reset Confirmation State
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonSuccess, setJsonSuccess] = useState<string | null>(null);

  const handleRequestCoachDiagnosis = async () => {
    setCoachLoading(true);
    try {
      const res = await fetch('/api/coach/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: activeState }),
      });
      const data = await res.json();
      setCoachDiagnosis(data);
    } catch (err) {
      setCoachDiagnosis({
        source: 'Local Rules Engine Fallback',
        bottleneckDiagnosis: funnel.diagnosticMessage,
        factsObserved: [
          `Cleared Revenue: $${fin.netClearedRevenue.toLocaleString()}`,
          `Outbound Calls: ${funnel.outboundAttempts}, Conversations: ${funnel.twoWayConversations}, Demos: ${funnel.demosConducted}`,
        ],
        assumptionsIdentified: [
          '$20,000 is a stretch target, not a promise.',
          'Pipeline conversion assumptions require 50+ calls to validate.',
        ],
        recommendedNextAction: 'Execute daily 20–25 targeted calls and follow up on open proposals.',
        reasoningAndConstraintCheck: cap.statusMessage,
      });
    } finally {
      setCoachLoading(false);
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatBuyersSaid.trim() || !biggestObstacle.trim()) return;

    const entry: DailyReviewEntry = {
      id: `review-d${activeDay}-${Date.now()}`,
      dayNumber: activeDay,
      date: todayStr,
      callsMade: todayCalls,
      followUpsMade: todayFollowUps,
      decisionMakersReached: todayReached,
      demosConducted: todayDemos,
      proposalsSent: activeState.proposals.length,
      cashClearedToday: fin.grossClearedRevenue,
      expensesSpentToday: fin.totalExpensesPaid,
      whatBuyersSaid: whatBuyersSaid.trim(),
      biggestObstacleToNextDollar: biggestObstacle.trim(),
      completedSummary: completedSummary.trim() || `Completed Day ${activeDay} review.`,
      tomorrowTopThreePriorities: [priority1, priority2, priority3],
    };

    onSaveDailyReview(entry);
    setWhatBuyersSaid('');
    setBiggestObstacle('');
    setCompletedSummary('');
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (!parsed.settings || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.offers)) {
          setJsonError('Invalid backup file: missing required campaign settings, tasks, or offers arrays.');
          setJsonSuccess(null);
          return;
        }
        const check = sanitizeAndDeduplicateImportState(parsed as CampaignState, activeState.isDemoMode);
        if (!check.allowed || !check.sanitizedState) {
          setJsonError(check.reason || 'Import blocked.');
          setJsonSuccess(null);
          return;
        }
        setJsonError(null);
        setJsonSuccess(
          `Backup imported cleanly (${check.sanitizedState.transactions.length} unique financial transactions loaded; ${check.deduplicatedTransactionsCount} duplicates filtered).`
        );
        onImportFullJson(check.sanitizedState);
      } catch (err) {
        setJsonError('Failed to parse JSON file. Please select a valid exported campaign backup JSON.');
        setJsonSuccess(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (mode === 'analytics') {
    return (
      <div className="space-y-6">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-sky-400">
              PDF SECTION 2 &amp; 12 · PERFORMANCE ANALYTICS &amp; PIPELINE MATH
            </p>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">
              <span className="animated-copy-shimmer">
                Planned 30-Day Funnel Assumptions vs. Actual Recorded Performance
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              PDF Rule: &ldquo;We&apos;ll start with assumptions, measure your actual conversion rates, and update the numbers after the first three days. Notice the implication: eight website clients are not a safe forecast.&rdquo;
            </p>
          </div>

          <button
            type="button"
            data-testid="copy-analytics-snapshot-btn"
            onClick={handleCopyAnalyticsSnapshot}
            className="embossed-button inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg whitespace-nowrap shrink-0"
          >
            {copiedSnapshot ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 animate-copy-pop">Copied Performance Snapshot!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span>Copy Performance Snapshot</span>
              </>
            )}
          </button>
        </div>

        {/* Statistical Sample Size & Bottleneck Notice */}
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 ${
            funnel.isStatisticallyReliable
              ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
              : 'bg-amber-950/30 border-amber-800 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Statistical Sample Size &amp; Reliability Check</span>
          </div>
          <p>{funnel.sampleSizeWarning}</p>
          <p className="pt-1 border-t border-amber-800/50 text-slate-200">
            <strong>PDF Bottleneck Diagnostic:</strong> {funnel.diagnosticMessage}
          </p>
        </div>

        {/* Section 12 Velocity, Revenue Target & Consistency KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div
            data-testid="amount-remaining-card"
            className="p-4 bg-slate-900 border border-slate-800 rounded-xl"
          >
            <p className="text-xs text-slate-400">Amount Remaining</p>
            <p className="text-xl font-bold text-amber-400 font-mono tabular-nums mt-1">
              ${fin.revenueRemainingToTarget.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              To reach ${activeState.settings.revenueTarget.toLocaleString()} target (${fin.netClearedRevenue.toLocaleString()} collected)
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">Average Deal Size (Won)</p>
            <p className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
              ${funnel.averageDealSize.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Across {funnel.dealsWon} accepted client deal(s)
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">Time from First Contact to Payment</p>
            <p className="text-xl font-bold text-slate-100 font-mono tabular-nums mt-1">
              {funnel.avgDaysFirstContactToPayment !== null
                ? `${funnel.avgDaysFirstContactToPayment} Days`
                : 'N/A (No Paid Deals)'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Measured from first contact date to cleared deposit
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">Follow-Up Completion Rate</p>
            <p className="text-xl font-bold text-sky-400 font-mono tabular-nums mt-1">
              {funnel.followUpCompletionRatePercent}%
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Logged follow-ups vs scheduled CRM follow-ups
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">Daily Execution Consistency</p>
            <p className="text-xl font-bold text-amber-300 font-mono tabular-nums mt-1">
              {funnel.dailyExecutionConsistencyPercent}%
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tasks completed through Day {activeDay}
            </p>
          </div>
        </div>

        {/* Recharts Line Chart: Daily Cumulative Revenue Collected vs $20,000 30-Day Target Trajectory */}
        <div
          data-testid="revenue-trajectory-chart-card"
          className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-sky-400">
                30-DAY REVENUE TRAJECTORY · RECHARTS LINE VISUALIZATION
              </p>
              <h2 className="text-base font-bold text-slate-100 mt-0.5">
                Daily Cumulative Revenue Collected vs. ${activeState.settings.revenueTarget.toLocaleString()} 30-Day Target Trajectory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily cumulative net cleared revenue computed from recorded transactions compared against the linear 30-day target trajectory toward ${activeState.settings.revenueTarget.toLocaleString()}. Unaccepted proposals and unpaid contract balances are excluded.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-slate-400">Revenue Collected: </span>
                <strong className="text-emerald-400">${fin.netClearedRevenue.toLocaleString()}</strong>
              </div>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-slate-400">Amount Remaining: </span>
                <strong className="text-amber-400">${fin.revenueRemainingToTarget.toLocaleString()}</strong>
              </div>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-slate-400">Day {activeDay} Target Pace: </span>
                <strong className="text-sky-400">
                  ${Math.round((activeState.settings.revenueTarget / 30) * activeDay).toLocaleString()}
                </strong>
              </div>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-slate-400">30-Day Target: </span>
                <strong className="text-slate-100">${activeState.settings.revenueTarget.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setChartWindow('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  chartWindow === 'all'
                    ? 'bg-slate-800 text-sky-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All 30 Days
              </button>
              <button
                type="button"
                onClick={() => setChartWindow('first14')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  chartWindow === 'first14'
                    ? 'bg-slate-800 text-sky-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Days 1–14 (Launch &amp; Refine)
              </button>
              <button
                type="button"
                onClick={() => setChartWindow('last16')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  chartWindow === 'last16'
                    ? 'bg-slate-800 text-sky-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Days 15–30 (Scale &amp; Collect)
              </button>
            </div>

            <span className="text-xs font-mono text-slate-400">
              Hover any day node for specific calendar date, Revenue Collected &amp; Target milestone
            </span>
          </div>

          <div className="h-[320px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={visibleTrajectorySeries}
                margin={{ top: 12, right: 20, left: 10, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="dayLabel"
                  stroke="#94A3B8"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  interval={chartWindow === 'all' ? 2 : 0}
                />
                <YAxis
                  stroke="#94A3B8"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  domain={[0, Math.max(20000, activeState.settings.revenueTarget)]}
                  tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={<CustomTrajectoryTooltip />}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '12px',
                    paddingTop: '8px',
                  }}
                />
                <ReferenceLine
                  y={activeState.settings.revenueTarget}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{
                    value: `$${activeState.settings.revenueTarget.toLocaleString()} Target`,
                    position: 'insideTopLeft',
                    fill: '#FCD34D',
                    fontSize: 11,
                  }}
                />
                <ReferenceLine
                  x={`Day ${activeDay}`}
                  stroke="#38BDF8"
                  strokeDasharray="3 3"
                  label={{
                    value: `Active Day ${activeDay}`,
                    position: 'insideTopRight',
                    fill: '#38BDF8',
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="targetBaseline"
                  name="30-Day Target ($20,000)"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="revenueCollected"
                  name="Revenue Collected"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#34D399', stroke: '#020617', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Optimized Recharts Pipeline Stage Comparison Chart */}
        <div
          data-testid="pipeline-funnel-chart-card"
          className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-mono text-sky-400">
                PIPELINE VELOCITY BENCHMARK · DAY {activeDay} PACE VS. RECORDED ACTIVITY
              </p>
              <h2 className="text-base font-bold text-slate-100 mt-0.5">
                Day {activeDay} Planned Stage Pace vs. Actual Logged Funnel Volume
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              PDF Section 2: 400–500 Calls &rarr; 80–120 Conversations &rarr; 20–30 Demos &rarr; 4–8 Clients
            </span>
          </div>

          <div className="h-[240px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pipelineChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="stage"
                  stroke="#94A3B8"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                />
                <YAxis stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                <Bar
                  dataKey="paceTarget"
                  name={`Day ${activeDay} Planned Pace`}
                  fill="#38BDF8"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="actualRecorded"
                  name="Actual Recorded"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PDF Section 2 Pipeline Math Comparison Table */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          <h2 className="text-base font-bold text-slate-100 mb-3">
            PDF Section 2 Pipeline Math vs. Actual Recorded Counts
          </h2>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Sales Stage (PDF Section 2)</th>
                <th className="py-2.5 pr-4 font-medium">30-Day Planning Assumption</th>
                <th className="py-2.5 pr-4 font-medium text-right">Day {activeDay} Pace Target</th>
                <th className="py-2.5 pr-4 font-medium text-right">Actual Recorded</th>
                <th className="py-2.5 font-medium">Conversion Formula &amp; Observed Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200 font-mono tabular-nums">
              <tr>
                <td className="py-3 pr-4 font-sans font-semibold">1. Targeted outbound attempts</td>
                <td className="py-3 pr-4">400–500 attempts</td>
                <td className="py-3 pr-4 text-right">{Math.round((450 / 30) * activeDay)}</td>
                <td className="py-3 pr-4 text-right text-sky-400 font-bold">
                  {funnel.outboundAttempts}
                </td>
                <td className="py-3 font-sans text-slate-400">
                  Base input (20–25 targeted calls/day)
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-sans font-semibold">
                  2. Two-way conversations with decision-makers
                </td>
                <td className="py-3 pr-4">80–120 conversations</td>
                <td className="py-3 pr-4 text-right">{Math.round((100 / 30) * activeDay)}</td>
                <td className="py-3 pr-4 text-right text-sky-400 font-bold">
                  {funnel.twoWayConversations}
                </td>
                <td className="py-3 font-sans text-slate-300">
                  Conversations / Outbound Attempts ={' '}
                  <strong className="font-mono">{funnel.attemptToConversationRate}%</strong> (Plan: ~20–24%)
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-sans font-semibold">3. Qualified prospects</td>
                <td className="py-3 pr-4">30–45 qualified</td>
                <td className="py-3 pr-4 text-right">{Math.round((38 / 30) * activeDay)}</td>
                <td className="py-3 pr-4 text-right text-sky-400 font-bold">
                  {funnel.qualifiedProspects}
                </td>
                <td className="py-3 font-sans text-slate-300">
                  Prospects in Qualified+ stages (n={funnel.qualifiedProspects})
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-sans font-semibold">
                  4. Demonstrations or discovery calls
                </td>
                <td className="py-3 pr-4">20–30 demonstrations</td>
                <td className="py-3 pr-4 text-right">{Math.round((25 / 30) * activeDay)}</td>
                <td className="py-3 pr-4 text-right text-emerald-400 font-bold">
                  {funnel.demosConducted}
                </td>
                <td className="py-3 font-sans text-slate-300">
                  Demos / Conversations ={' '}
                  <strong className="font-mono">{funnel.conversationToDemoRate}%</strong> (Plan: ~25%)
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-sans font-semibold">5. Written proposals</td>
                <td className="py-3 pr-4">12–20 proposals</td>
                <td className="py-3 pr-4 text-right">{Math.round((16 / 30) * activeDay)}</td>
                <td className="py-3 pr-4 text-right text-amber-300 font-bold">
                  {funnel.proposalsSent}
                </td>
                <td className="py-3 font-sans text-slate-300">
                  Proposals / Demos ={' '}
                  <strong className="font-mono">{funnel.demoToProposalRate}%</strong> (Plan: ~60%)
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-sans font-semibold">6. Paid website clients (Won)</td>
                <td className="py-3 pr-4">4–8 paid clients</td>
                <td className="py-3 pr-4 text-right">{Math.max(1, Math.round((6 / 30) * activeDay))}</td>
                <td className="py-3 pr-4 text-right text-emerald-400 font-bold">
                  {funnel.dealsWon}
                </td>
                <td className="py-3 font-sans text-slate-300">
                  Deals Won / Proposals ={' '}
                  <strong className="font-mono">{funnel.proposalToCloseRate}%</strong> (Avg Deal: $
                  {funnel.averageDealSize.toLocaleString()})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (mode === 'reviews') {
    return (
      <div className="space-y-6">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-sky-400">
              PDF SECTION 4 (5:00–5:30 PM) &amp; SECTION 9 · END-OF-DAY REVIEW &amp; AI COACH
            </p>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">
              Daily Review, Three Core Questions &amp; Operational Bottleneck Advisor
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              PDF Rule: &ldquo;At the end of each day, answer three questions: 1. How many decision-makers did I actually reach? 2. What did buyers say that changed my understanding of the offer? 3. What is the single biggest obstacle to collecting the next dollar? That last question determines tomorrow&apos;s priorities.&rdquo;
            </p>
          </div>

          <button
            type="button"
            disabled={coachLoading}
            onClick={handleRequestCoachDiagnosis}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {coachLoading ? 'Analyzing Campaign Records...' : 'Run Grounded Operational Diagnosis'}
            </span>
          </button>
        </div>

        {/* Grounded AI / Rules Operational Coach Output */}
        {coachDiagnosis && (
          <div className="p-5 bg-slate-900 border border-sky-700/80 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-sky-400">{coachDiagnosis.source}</span>
                <h2 className="text-base font-bold text-slate-100 mt-0.5">
                  Data-Grounded Campaign Diagnosis (Facts vs. Planning Assumptions)
                </h2>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-amber-200">
              <strong>Primary Bottleneck Diagnosis:</strong> {coachDiagnosis.bottleneckDiagnosis}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                <p className="font-semibold text-emerald-400">Recorded Campaign Facts:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  {coachDiagnosis.factsObserved.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                <p className="font-semibold text-sky-400">Explicit Planning Assumptions:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  {coachDiagnosis.assumptionsIdentified.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 border border-emerald-800/70 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-emerald-400">
                Recommended Next Practical Action: {coachDiagnosis.recommendedNextAction}
              </p>
              <p className="text-slate-300">{coachDiagnosis.reasoningAndConstraintCheck}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* End of Day Review Form */}
          <form
            onSubmit={handleSubmitReview}
            className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4"
          >
            <h2 className="text-base font-bold text-slate-100">
              Log Day {activeDay} End-of-Day Review (5:00–5:30 PM Block)
            </h2>

            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
              <div>
                <p className="text-slate-400">1. Owners Reached</p>
                <p className="text-base font-bold text-sky-400">{todayReached}</p>
              </div>
              <div>
                <p className="text-slate-400">Calls / Follow-Ups</p>
                <p className="text-base font-bold text-slate-100">
                  {todayCalls} / {todayFollowUps}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Cleared Cash Total</p>
                <p className="text-base font-bold text-emerald-400">
                  ${fin.netClearedRevenue.toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="rev-q2" className="block text-xs font-semibold text-slate-200 mb-1">
                PDF Question 2: What did buyers say that changed my understanding of the offer? *
              </label>
              <textarea
                id="rev-q2"
                required
                rows={2}
                value={whatBuyersSaid}
                onChange={(e) => setWhatBuyersSaid(e.target.value)}
                placeholder="Record actual buyer feedback, objections, or reactions from today's calls and demos..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="rev-q3" className="block text-xs font-semibold text-amber-300 mb-1">
                PDF Question 3: What is the single biggest obstacle to collecting the next dollar? *
              </label>
              <textarea
                id="rev-q3"
                required
                rows={2}
                value={biggestObstacle}
                onChange={(e) => setBiggestObstacle(e.target.value)}
                placeholder="That last question determines tomorrow's priorities..."
                className="w-full px-3 py-2 bg-slate-950 border border-amber-700/80 rounded-lg text-xs text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-200">
                Tomorrow&apos;s Top Three Priorities (Determined by Question 3):
              </p>
              <input
                type="text"
                value={priority1}
                onChange={(e) => setPriority1(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100"
              />
              <input
                type="text"
                value={priority2}
                onChange={(e) => setPriority2(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100"
              />
              <input
                type="text"
                value={priority3}
                onChange={(e) => setPriority3(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="w-full px-5 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300"
            >
              Save Day {activeDay} Structured Review
            </button>
          </form>

          {/* Past Reviews Archive */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <h2 className="text-base font-bold text-slate-100">
              Recorded Daily Reviews ({state.dailyReviews.length})
            </h2>

            {state.dailyReviews.length === 0 ? (
              <div className="p-8 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs text-slate-400">
                No daily reviews recorded yet. Complete your first 5:00 PM review on the left.
              </div>
            ) : (
              <div className="space-y-3">
                {[...state.dailyReviews].reverse().map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs"
                  >
                    <div className="flex justify-between font-mono text-sky-400">
                      <span>Day {rev.dayNumber} Review</span>
                      <span>{rev.date}</span>
                    </div>
                    <p className="text-slate-300">
                      <strong>Q1 (Owners Reached):</strong> {rev.decisionMakersReached} (Calls:{' '}
                      {rev.callsMade}, Demos: {rev.demosConducted})
                    </p>
                    <p className="text-slate-300">
                      <strong>Q2 (What Buyers Said):</strong> {rev.whatBuyersSaid}
                    </p>
                    <p className="text-amber-300">
                      <strong>Q3 (Biggest Obstacle to Next Dollar):</strong>{' '}
                      {rev.biggestObstacleToNextDollar}
                    </p>
                    <div className="pt-2 border-t border-slate-900">
                      <p className="font-semibold text-slate-200 mb-1">Next Day Top 3 Priorities:</p>
                      <ol className="list-decimal pl-4 space-y-0.5 text-slate-400">
                        {rev.tomorrowTopThreePriorities.map((pr, idx) => (
                          <li key={idx}>{pr}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // SETTINGS & DATA MANAGEMENT VIEW
  return (
    <div className="space-y-6">
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-sky-400">
            SECTION 14 &amp; 15 · SETTINGS, PERSISTENCE &amp; DATA MANAGEMENT
          </p>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            Campaign Settings &amp; JSON Backup Export/Import
          </h1>
        </div>
      </div>

      {/* Integrated PWA Install & Home Screen Quick-Select Card */}
      <PWAInstallCard
        onSelectShortcut={(tab) => {
          if (onNavigateTab) onNavigateTab(tab);
        }}
      />

      {/* 4-Color Theme Selector (Dark, Light, Morning, Night) */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
        <ThemeSelector variant="expanded" />
      </div>

      {/* Persistence Disclosure */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1.5">
        <p className="font-semibold text-slate-100">
          Persistence Architecture &amp; Limitations Disclosure:
        </p>
        <p>
          Your campaign records are saved to both the local Express server disk (<code>data/real-campaign.json</code>) and synchronized to your browser&apos;s <code>localStorage</code>. Because container/browser storage is local to this environment, use the JSON Export button below regularly to keep an external backup of your production records.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurable Campaign Settings */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <h2 className="text-base font-bold text-slate-100">
            Campaign Parameters &amp; Configurable Assumptions
          </h2>
          <p className="text-xs text-slate-400">
            Changing the campaign start date updates the active day calculation without rewriting or deleting any completed task timestamps or historical transactions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label htmlFor="set-start-date" className="block text-slate-300 mb-1">
                Campaign Start Date
              </label>
              <input
                id="set-start-date"
                type="date"
                value={state.settings.startDate}
                onChange={(e) =>
                  onUpdateSettings({ ...state.settings, startDate: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="set-operator" className="block text-slate-300 mb-1">
                Operator Name (For Scripts)
              </label>
              <input
                id="set-operator"
                type="text"
                value={state.settings.operatorName}
                onChange={(e) =>
                  onUpdateSettings({ ...state.settings, operatorName: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="set-niche" className="block text-slate-300 mb-1">
                Target Niche
              </label>
              <input
                id="set-niche"
                type="text"
                value={state.settings.selectedNiche}
                onChange={(e) =>
                  onUpdateSettings({ ...state.settings, selectedNiche: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="set-demo-url" className="block text-slate-300 mb-1">
                Live Mobile Demo Build URL
              </label>
              <input
                id="set-demo-url"
                type="text"
                value={state.settings.demoSiteUrl}
                onChange={(e) =>
                  onUpdateSettings({ ...state.settings, demoSiteUrl: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="set-reserve" className="block text-slate-300 mb-1">
                Protected Capital Reserve ($)
              </label>
              <input
                id="set-reserve"
                type="number"
                value={state.settings.protectedReserve}
                onChange={(e) =>
                  onUpdateSettings({
                    ...state.settings,
                    protectedReserve: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="set-tax" className="block text-slate-300 mb-1">
                Estimated Tax Obligation Rate (%)
              </label>
              <input
                id="set-tax"
                type="number"
                value={state.settings.estimatedTaxRatePercent}
                onChange={(e) =>
                  onUpdateSettings({
                    ...state.settings,
                    estimatedTaxRatePercent: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Full JSON Backup Export/Import & Safe Reset */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <h2 className="text-base font-bold text-slate-100">
            Backup Export, Restore &amp; Safe Campaign Reset
          </h2>

          {jsonError && (
            <div className="p-3 bg-rose-950/60 border border-rose-700 rounded-lg text-xs text-rose-200">
              {jsonError}
            </div>
          )}

          {jsonSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-700 rounded-lg text-xs text-emerald-200">
              {jsonSuccess}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={onExportFullJson}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300"
            >
              <Download className="w-4 h-4" />
              <span>Export Complete Campaign State (.JSON Backup)</span>
            </button>

            <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Restore / Import Campaign State (.JSON File)</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleJsonUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <p className="text-xs text-slate-400">
              Need to reset your campaign back to its clean Day 1 initial state?
            </p>
            {!confirmResetOpen ? (
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-rose-300 bg-rose-950/40 border border-rose-800 rounded-lg hover:bg-rose-900/50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Current Campaign Data...</span>
              </button>
            ) : (
              <div className="p-3.5 bg-rose-950/50 border border-rose-700 rounded-lg space-y-2.5 text-xs">
                <p className="text-rose-200 font-semibold">
                  Confirm Destructive Reset: Export a backup first if you want to keep current records.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onExportFullJson();
                      onResetCampaign();
                      setConfirmResetOpen(false);
                    }}
                    className="px-3 py-1.5 font-semibold text-slate-950 bg-rose-400 rounded hover:bg-rose-300"
                  >
                    Export Backup &amp; Reset Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(false)}
                    className="px-3 py-1.5 text-slate-300 bg-slate-800 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
