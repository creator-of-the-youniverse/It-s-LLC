import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  CampaignState,
  ProspectStepClaims,
  TeamMember,
} from '../types';
import {
  calculateFinancialSummary,
  computeTeamAnalytics,
  UnclaimedStepItem,
} from '../utils/calculations';
import {
  Users,
  UserPlus,
  Trophy,
  CheckCircle2,
  Hand,
  ArrowRightLeft,
  Flame,
  DollarSign,
  PhoneCall,
  FileSignature,
  Sparkles,
  Activity,
  Radio,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface TeamWarRoomViewProps {
  state: CampaignState;
  activeMember: TeamMember;
  onlineCount: number;
  onOpenAuthModal: () => void;
  onSelectActiveMember: (member: TeamMember) => void;
  onSendInFullSquad: () => void;
  onClaimTask: (taskId: string) => void;
  onClaimProspectStep: (
    prospectId: string,
    stepKey: keyof ProspectStepClaims
  ) => void;
  onClaimDeliveryMilestone: (projectId: string, milestoneId: string) => void;
  onNavigateTab: (tab: string) => void;
  onSyncCampaignState?: (freshState: CampaignState) => void;
}

export const TeamWarRoomView: React.FC<TeamWarRoomViewProps> = ({
  state,
  activeMember,
  onlineCount,
  onOpenAuthModal,
  onSelectActiveMember,
  onSendInFullSquad,
  onClaimTask,
  onClaimProspectStep,
  onClaimDeliveryMilestone,
  onNavigateTab,
  onSyncCampaignState,
}) => {
  const [stepFilter, setStepFilter] = useState<string>('ALL');

  // Live Mode 30-second polling state to ensure members stay synced without manual page refreshes
  const [isLiveMode, setIsLiveMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('war_room_live_mode_enabled');
    return saved !== 'false';
  });
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const pollLatestCampaignState = async () => {
    try {
      setIsPolling(true);
      const res = await fetch(`/api/campaign?mode=${state.isDemoMode ? 'demo' : 'real'}`);
      if (res.ok) {
        const fresh = await res.json();
        if (fresh && fresh.settings) {
          if (onSyncCampaignState) {
            onSyncCampaignState(fresh);
          }
          setLastSyncedTime(
            new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setIsPolling(false);
      setSecondsRemaining(30);
    }
  };

  const handleToggleLiveMode = () => {
    const nextMode = !isLiveMode;
    setIsLiveMode(nextMode);
    localStorage.setItem('war_room_live_mode_enabled', String(nextMode));
    if (nextMode) {
      setSecondsRemaining(30);
      pollLatestCampaignState();
    }
  };

  const handleManualPoll = () => {
    pollLatestCampaignState();
  };

  // 30-second interval polling effect
  React.useEffect(() => {
    if (!isLiveMode) return;

    // 1-second countdown ticker
    const countdownTicker = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);

    // 30-second poll interval
    const pollInterval = setInterval(() => {
      pollLatestCampaignState();
    }, 30000);

    return () => {
      clearInterval(countdownTicker);
      clearInterval(pollInterval);
    };
  }, [isLiveMode, state.isDemoMode]);

  const fin = useMemo(() => calculateFinancialSummary(state), [state]);
  const teamAnalytics = useMemo(() => computeTeamAnalytics(state), [state]);
  const teamMembers = state.teamMembers || [activeMember];

  const revenueChartData = useMemo(
    () =>
      teamAnalytics.memberStats.map((m) => ({
        name: m.name,
        directCash: m.clearedCashCollected,
        assistedRevenue: m.assistedRevenue,
        dealsClosed: m.dealsClosed,
      })),
    [teamAnalytics.memberStats]
  );

  const activityChartData = useMemo(
    () =>
      teamAnalytics.memberStats.map((m) => ({
        name: m.name,
        calls: m.callsMade,
        conversations: m.twoWayConversations,
        demos: m.demosConducted,
        proposals: m.proposalsClaimedOrSent,
        tasksDone: m.tasksCompleted,
        stepsClaimed: m.totalClaimedSteps,
      })),
    [teamAnalytics.memberStats]
  );

  const filteredUnclaimed = useMemo(() => {
    if (stepFilter === 'ALL') return teamAnalytics.unclaimedQueue;
    return teamAnalytics.unclaimedQueue.filter((item) => item.category === stepFilter);
  }, [teamAnalytics.unclaimedQueue, stepFilter]);

  const handleClaimUnclaimedItem = (item: UnclaimedStepItem) => {
    if (item.category === 'TASK') {
      onClaimTask(item.targetId);
    } else if (
      (item.category === 'PROSPECT_CALL' ||
        item.category === 'PROSPECT_DEMO' ||
        item.category === 'PROSPECT_PROPOSAL' ||
        item.category === 'PROSPECT_CLOSE') &&
      item.stepKey
    ) {
      onClaimProspectStep(item.targetId, item.stepKey);
    } else if (item.category === 'DELIVERY_MILESTONE' && item.subTargetId) {
      onClaimDeliveryMilestone(item.targetId, item.subTargetId);
    }
  };

  return (
    <div className="space-y-6" data-testid="team-war-room-view">
      {/* Top Banner: Shared $20,000 Team Goal & Squad Controls */}
      <div className="embossed-card rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-400">
              <Users className="w-4 h-4" />
              <span>
                MULTI-OPERATOR TEAM COMMAND &amp; ATTRIBUTION • {teamMembers.length} OPERATORS ({onlineCount} LIVE)
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Team War Room, Step Claiming &amp; Performance Charts
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl">
              Every operator on the team works toward the shared{' '}
              <strong className="text-white">$20,000</strong> 30-day revenue target. It does not matter who makes the outbound call, who runs the 10-minute demo, who sends the proposal, or who fulfills the build — every step is claimable and tracked in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Live Mode 30-Second Polling Toggle Button */}
            <div
              className={`p-1.5 rounded-xl border flex items-center gap-2 transition-all ${
                isLiveMode
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400'
              }`}
              data-testid="live-mode-container"
            >
              <button
                type="button"
                onClick={handleToggleLiveMode}
                data-testid="live-mode-toggle"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isLiveMode
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Toggle 30-second polling interval to keep team updates in sync without manual page refreshes"
              >
                <span className="relative flex h-2 w-2">
                  {isLiveMode && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isLiveMode ? 'bg-slate-950' : 'bg-slate-500'
                    }`}
                  />
                </span>
                <Radio className="w-3.5 h-3.5" />
                <span>{isLiveMode ? 'Live Mode: ON' : 'Live Mode: OFF'}</span>
              </button>

              {isLiveMode && (
                <div className="flex items-center gap-2 pr-1.5 text-[11px] font-mono">
                  <span className="text-emerald-400 hidden sm:inline" data-testid="live-mode-countdown">
                    {isPolling ? 'Syncing...' : `Poll: ${secondsRemaining}s`}
                  </span>
                  <button
                    type="button"
                    onClick={handleManualPoll}
                    disabled={isPolling}
                    data-testid="live-mode-refresh-btn"
                    title="Force immediate sync"
                    className="p-1 rounded hover:bg-emerald-500/20 text-emerald-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPolling ? 'animate-spin' : ''}`} />
                  </button>
                  {lastSyncedTime && (
                    <span className="text-[10px] text-slate-400 hidden xl:inline" data-testid="live-mode-synced-time">
                      ({lastSyncedTime})
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenAuthModal}
              data-testid="war-room-add-member-btn"
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Sign In / Add Team Member</span>
            </button>
            <button
              type="button"
              onClick={onSendInFullSquad}
              data-testid="send-in-the-team-btn"
              className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Send In Full Squad (+4 Specialists)</span>
            </button>
          </div>
        </div>

        {/* 5-Card Team KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[11px] font-mono uppercase text-slate-400">
              Shared Team Cleared Cash
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
              ${fin.grossClearedRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              ${fin.revenueRemainingToTarget.toLocaleString()} left to $20,000 goal
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[11px] font-mono uppercase text-slate-400">
              Active Squad Size
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1" data-testid="team-roster-count">
              {teamAnalytics.memberStats.length} Operators
            </div>
            <div className="text-[11px] text-sky-400 mt-1">
              Signed in as: {activeMember.name}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[11px] font-mono uppercase text-slate-400">
              Total Steps Claimed
            </div>
            <div className="text-xl font-bold text-sky-400 font-mono mt-1" data-testid="total-claimed-steps">
              {teamAnalytics.totalClaimedSteps} Steps
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {teamAnalytics.claimCoveragePercent}% of active steps claimed
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[11px] font-mono uppercase text-slate-400">
              Steps Up For Grabs
            </div>
            <div className="text-xl font-bold text-amber-400 font-mono mt-1">
              {teamAnalytics.totalUnclaimedSteps} Open
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Ready for any operator to claim
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[11px] font-mono uppercase text-slate-400">
              Multi-Operator Handoffs
            </div>
            <div className="text-xl font-bold text-purple-400 font-mono mt-1">
              {teamAnalytics.multiOperatorHandoffCount} Deals
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Caller → Demoer → Closer relay
            </div>
          </div>
        </div>
      </div>

      {/* =======================================================================
          TEAM PERFORMANCE CHARTS (RECHARTS)
      ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Direct Cash Collected vs Assisted Deal Revenue by Team Member */}
        <div
          className="lg:col-span-6 embossed-card rounded-2xl p-5 space-y-4"
          data-testid="team-revenue-chart-card"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Team Revenue Contribution (Direct Cash vs. Assisted Deals)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Tracks who collected the deposit AND who assisted by making the call, running the demo, or sending the proposal.
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueChartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    `$${Number(value || 0).toLocaleString()}`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="directCash"
                  name="Direct Cleared Cash ($)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="assistedRevenue"
                  name="Assisted Deal Revenue ($)"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Team Execution Volume by Operator */}
        <div
          className="lg:col-span-6 embossed-card rounded-2xl p-5 space-y-4"
          data-testid="team-activity-chart-card"
        >
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Team Activity &amp; Claimed Steps Breakdown by Operator</span>
            </h2>
            <p className="text-xs text-slate-400">
              Compares Outbound Calls, 2-Way Conversations, 10-Min Demos, Proposals, Completed Tasks, and Claimed Steps per person.
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activityChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="calls" name="Calls Made" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="demos" name="10-Min Demos" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="proposals" name="Proposals" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="tasksDone" name="Tasks Done" fill="#a855f7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="stepsClaimed" name="Claimed Steps" fill="#f43f5e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 3: Claimed vs. Unclaimed Step Coverage Across the Funnel */}
      <div className="embossed-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-sky-400" />
              <span>Step Claim Coverage Across Every Campaign Stage</span>
            </h2>
            <p className="text-xs text-slate-400">
              Shows how many steps at each stage of the campaign are claimed by a team member versus open for grabs.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400">
            {teamAnalytics.claimCoveragePercent}% Total Funnel Coverage
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={teamAnalytics.stepDistributionByStage}
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="stage"
                stroke="#94a3b8"
                tick={{ fill: '#cbd5e1', fontSize: 11 }}
              />
              <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar
                dataKey="claimed"
                name="Claimed by Team Member"
                stackId="a"
                fill="#10b981"
              />
              <Bar
                dataKey="unclaimed"
                name="Unclaimed (Up For Grabs)"
                stackId="a"
                fill="#f59e0b"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =======================================================================
          FULL TEAM LEADERBOARD & OPERATOR SCORECARD TABLE
      ======================================================================= */}
      <div className="embossed-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Full Team Leaderboard &amp; Per-Operator Numbers</span>
            </h2>
            <p className="text-xs text-slate-400">
              Complete breakdown of calls, conversations, demos, proposals, closed deals, completed tasks, delivery milestones, and revenue per operator.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-300">
            Active Operator: <strong className="text-sky-400">{activeMember.name}</strong>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="p-3">Operator</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-right">Calls</th>
                <th className="p-3 text-right">2-Way Conv.</th>
                <th className="p-3 text-right">Demos</th>
                <th className="p-3 text-right">Proposals</th>
                <th className="p-3 text-right">Deals Won</th>
                <th className="p-3 text-right">Tasks Done</th>
                <th className="p-3 text-right">Build Milestones</th>
                <th className="p-3 text-right">Claimed Steps</th>
                <th className="p-3 text-right">Direct Cash</th>
                <th className="p-3 text-right">Assisted Rev.</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {teamAnalytics.memberStats.map((stat, idx) => {
                const isCurrent = stat.memberId === activeMember.id;
                const matchedMember = teamMembers.find((m) => m.id === stat.memberId);
                return (
                  <tr
                    key={stat.memberId}
                    className={
                      isCurrent ? 'bg-sky-950/25' : 'hover:bg-slate-900/60'
                    }
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-slate-500 text-[11px]">
                          #{idx + 1}
                        </span>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0"
                          style={{ backgroundColor: stat.avatarColor }}
                        >
                          {stat.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="font-bold text-white whitespace-nowrap">
                          {stat.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {stat.role}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-200">
                      {stat.callsMade}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-200">
                      {stat.twoWayConversations}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-300 font-semibold">
                      {stat.demosConducted}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-300">
                      {stat.proposalsClaimedOrSent}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400 font-bold">
                      {stat.dealsClosed}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-200">
                      {stat.tasksCompleted}
                    </td>
                    <td className="p-3 text-right font-mono text-purple-300">
                      {stat.deliveryMilestonesCompleted}
                    </td>
                    <td className="p-3 text-right font-mono text-sky-300 font-bold">
                      {stat.totalClaimedSteps}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400 font-bold">
                      ${stat.clearedCashCollected.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-sky-400">
                      ${stat.assistedRevenue.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      {isCurrent ? (
                        <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                          SIGNED IN
                        </span>
                      ) : (
                        matchedMember && (
                          <button
                            type="button"
                            onClick={() => onSelectActiveMember(matchedMember)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                          >
                            Switch To
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =======================================================================
          MULTI-OPERATOR PROSPECT HANDOFF MATRIX (CALL -> DEMO -> PROPOSAL -> CLOSE)
      ======================================================================= */}
      <div className="embossed-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-sky-400" />
              <span>
                Prospect 4-Step Relay Matrix (Any Person Can Claim Call, Demo, Proposal, or Close)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Click any step button below to claim or hand off that specific step to{' '}
              <strong className="text-white">{activeMember.name}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('pipeline')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 self-start"
          >
            Open Full Sales Pipeline
          </button>
        </div>

        {state.prospects.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
            No prospects in pipeline yet. Add prospects in Section 6 (Prospects &amp; Contacts) or switch to Demo Mode to explore multi-operator relay claims.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="p-3">Business &amp; Stage</th>
                  <th className="p-3">Step 1: Outbound Call</th>
                  <th className="p-3">Step 2: 10-Min Demo</th>
                  <th className="p-3">Step 3: Written Proposal</th>
                  <th className="p-3">Step 4: Close &amp; 50% Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {state.prospects.map((p) => {
                  const sc = p.stepClaims || {};
                  const steps: {
                    key: keyof ProspectStepClaims;
                    label: string;
                  }[] = [
                    { key: 'researchAndCall', label: 'Call' },
                    { key: 'demoExecution', label: 'Demo' },
                    { key: 'proposalFollowUp', label: 'Proposal' },
                    { key: 'closeAndDeposit', label: 'Close' },
                  ];

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/50">
                      <td className="p-3">
                        <div className="font-bold text-white">{p.businessName}</div>
                        <div className="text-[11px] text-slate-400">
                          {p.stage} • ${p.estimatedValue.toLocaleString()}
                        </div>
                      </td>
                      {steps.map((st) => {
                        const claim = sc[st.key];
                        const isMine = claim?.memberId === activeMember.id;
                        return (
                          <td key={st.key} className="p-3">
                            <button
                              type="button"
                              onClick={() => onClaimProspectStep(p.id, st.key)}
                              data-testid={`matrix-claim-${p.id}-${st.key}`}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                claim
                                  ? isMine
                                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                                    : 'bg-sky-500/15 border border-sky-500/40 text-sky-300'
                                  : 'bg-slate-800/90 hover:bg-slate-700 border border-dashed border-slate-600 text-slate-300'
                              }`}
                            >
                              <Hand className="w-3 h-3 shrink-0" />
                              <span>
                                {claim
                                  ? `${claim.memberName}${isMine ? ' (Click to Release)' : ''}`
                                  : `Claim ${st.label}`}
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =======================================================================
          UNCLAIMED STEPS QUEUE ("UP FOR GRABS") & LIVE TEAM ACTIVITY FEED
      ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Unclaimed Steps Queue */}
        <div className="lg:col-span-7 embossed-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-amber-400" />
                <span>
                  Unclaimed Steps Queue (&ldquo;Up For Grabs&rdquo; — {filteredUnclaimed.length})
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Any signed-in team member can claim any open step below in 1 click.
              </p>
            </div>
            <select
              value={stepFilter}
              onChange={(e) => setStepFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            >
              <option value="ALL">All Open Steps ({teamAnalytics.unclaimedQueue.length})</option>
              <option value="TASK">Today&apos;s Mission Tasks</option>
              <option value="PROSPECT_CALL">Step 1: Outbound Calls</option>
              <option value="PROSPECT_DEMO">Step 2: 10-Min Demos</option>
              <option value="PROSPECT_PROPOSAL">Step 3: Written Proposals</option>
              <option value="PROSPECT_CLOSE">Step 4: Close &amp; Deposit</option>
              <option value="DELIVERY_MILESTONE">Client Delivery Milestones</option>
            </select>
          </div>

          {filteredUnclaimed.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-emerald-400 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              <span>Every active step in this category has been claimed by the team!</span>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredUnclaimed.slice(0, 25).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950/85 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClaimUnclaimedItem(item)}
                    className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>Claim as {activeMember.name.split(' ')[0]}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Team Activity Feed */}
        <div className="lg:col-span-5 embossed-card rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Live Squad Activity &amp; Handoff Feed</span>
            </h2>
            <p className="text-xs text-slate-400">
              Real-time log of step claims, calls, demos, proposals, and collected cash across the team.
            </p>
          </div>

          {!state.teamActivityFeed || state.teamActivityFeed.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
              Claim a step, log a call, or collect a milestone payment to see live squad events here.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {state.teamActivityFeed.slice(0, 20).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-sky-400">{ev.memberName}</span>
                    <span className="font-mono text-slate-500">
                      {new Date(ev.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {ev.targetTitle}
                  </div>
                  <div className="text-[11px] text-slate-400">{ev.detail}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
