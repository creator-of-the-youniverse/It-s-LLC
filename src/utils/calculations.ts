import {
  BudgetBucket,
  CampaignState,
  DeliveryStatus,
  FinancialTransaction,
  PipelineStage,
  ProposalStatus,
  ScenarioConfig,
  TaskPriority,
  TaskStatus,
  TransactionType,
} from '../types';

export interface FinancialSummary {
  startingWorkingCapital: number;
  grossClearedRevenue: number;
  depositsCollected: number;
  milestonePaymentsCollected: number;
  fullPaymentsCollected: number;
  totalExpensesPaid: number;
  totalRefundsPaid: number;
  netClearedRevenue: number; // Gross Cleared Revenue - Refunds
  currentRecordedCashBalance: number; // Starting Capital + Gross Cleared Revenue - Expenses - Refunds
  protectedReserve: number;
  essentialLivingProtected: number;
  unreleasedContingency: number;
  totalRestrictedFunds: number; // Protected Reserve + Essential Living + Unreleased Contingency
  unearnedDepositObligations: number; // Cash collected on projects that are not yet Delivered/Accepted/Complete
  estimatedTaxReserve: number; // Configurable % of Net Operating Result if positive
  availableDiscretionaryCash: number; // Current Cash Balance - Total Restricted Funds - Unearned Deposit Obligations
  estimatedNetOperatingResult: number; // Net Cleared Revenue - Total Expenses Paid
  proposedRevenueUnaccepted: number; // Sent proposals not yet accepted
  signedContractValueTotal: number; // Accepted, Deposit Paid, or Paid in Full proposals
  outstandingContractReceivables: number; // Signed Contract Value - Cleared Cash on those contracts
  revenueRemainingToTarget: number; // Max(0, Target - Net Cleared Revenue)
  spendByBucket: Record<BudgetBucket, number>;
}

export function getActiveCampaignDay(startDateStr: string, overrideDay: number | null, nowDateStr?: string): number {
  if (overrideDay !== null && overrideDay >= 1 && overrideDay <= 30) {
    return overrideDay;
  }
  const todayStr = nowDateStr || new Date().toISOString().slice(0, 10);
  const start = new Date(`${startDateStr}T00:00:00`);
  const current = new Date(`${todayStr}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(current.getTime())) {
    return 1;
  }
  const diffDays = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(30, diffDays));
}

export function calculateFinancialSummary(state: CampaignState): FinancialSummary {
  const { settings, transactions, proposals, projects } = state;

  let depositsCollected = 0;
  let milestonePaymentsCollected = 0;
  let fullPaymentsCollected = 0;
  let totalExpensesPaid = 0;
  let totalRefundsPaid = 0;

  const spendByBucket: Record<BudgetBucket, number> = {
    [BudgetBucket.PROTECTED_RESERVE]: 0,
    [BudgetBucket.OPERATING_DELIVERY]: 0,
    [BudgetBucket.SALES_PROSPECTING]: 0,
    [BudgetBucket.AD_TEST]: 0,
    [BudgetBucket.CONTINGENCY]: 0,
    [BudgetBucket.REVENUE_INFLOW]: 0,
  };

  for (const tx of transactions) {
    const amt = Math.max(0, Number(tx.amount) || 0);
    switch (tx.type) {
      case TransactionType.REVENUE_DEPOSIT:
        depositsCollected += amt;
        spendByBucket[BudgetBucket.REVENUE_INFLOW] += amt;
        break;
      case TransactionType.REVENUE_MILESTONE:
        milestonePaymentsCollected += amt;
        spendByBucket[BudgetBucket.REVENUE_INFLOW] += amt;
        break;
      case TransactionType.REVENUE_FULL:
        fullPaymentsCollected += amt;
        spendByBucket[BudgetBucket.REVENUE_INFLOW] += amt;
        break;
      case TransactionType.EXPENSE:
        totalExpensesPaid += amt;
        if (spendByBucket[tx.bucket] !== undefined) {
          spendByBucket[tx.bucket] += amt;
        }
        break;
      case TransactionType.REFUND:
        totalRefundsPaid += amt;
        break;
    }
  }

  const grossClearedRevenue = depositsCollected + milestonePaymentsCollected + fullPaymentsCollected;
  const netClearedRevenue = Math.max(0, grossClearedRevenue - totalRefundsPaid);
  const currentRecordedCashBalance =
    settings.startingWorkingCapital + grossClearedRevenue - totalExpensesPaid - totalRefundsPaid;

  const protectedReserve = Math.max(0, settings.protectedReserve);
  const essentialLivingProtected = Math.max(0, settings.essentialLivingProtectedAmount);
  const unreleasedContingency = settings.contingencyReleased ? 0 : Math.max(0, settings.contingencyBudget);
  const totalRestrictedFunds = protectedReserve + essentialLivingProtected + unreleasedContingency;

  // PDF Cash rule: "a deposit is collected cash, but it is not all profit. You still have delivery obligations."
  // Any cleared cash on projects not yet DELIVERED, ACCEPTED, or COMPLETE is tracked as an active delivery obligation.
  let unearnedDepositObligations = 0;
  for (const proj of projects) {
    if (
      proj.status === DeliveryStatus.NOT_STARTED ||
      proj.status === DeliveryStatus.IN_PROGRESS ||
      proj.status === DeliveryStatus.MILESTONE_REACHED
    ) {
      unearnedDepositObligations += Math.max(0, proj.clearedCashCollected);
    }
  }

  const estimatedNetOperatingResult = netClearedRevenue - totalExpensesPaid;
  const estimatedTaxReserve =
    estimatedNetOperatingResult > 0
      ? Math.round(estimatedNetOperatingResult * (Math.max(0, settings.estimatedTaxRatePercent) / 100))
      : 0;

  const availableDiscretionaryCash =
    currentRecordedCashBalance - totalRestrictedFunds - unearnedDepositObligations;

  let proposedRevenueUnaccepted = 0;
  let signedContractValueTotal = 0;
  let outstandingContractReceivables = 0;

  for (const prop of proposals) {
    if (prop.status === ProposalStatus.SENT || prop.status === ProposalStatus.DRAFT) {
      if (prop.status === ProposalStatus.SENT) {
        proposedRevenueUnaccepted += prop.totalPrice;
      }
    } else if (
      prop.status === ProposalStatus.ACCEPTED ||
      prop.status === ProposalStatus.DEPOSIT_PAID ||
      prop.status === ProposalStatus.PAID_IN_FULL
    ) {
      signedContractValueTotal += prop.totalPrice;
      const paidOnProposal = prop.milestones
        .filter((m) => m.isPaid)
        .reduce((acc, m) => acc + m.amount, 0);
      outstandingContractReceivables += Math.max(0, prop.totalPrice - paidOnProposal);
    }
  }

  const revenueRemainingToTarget = Math.max(0, settings.revenueTarget - netClearedRevenue);

  return {
    startingWorkingCapital: settings.startingWorkingCapital,
    grossClearedRevenue,
    depositsCollected,
    milestonePaymentsCollected,
    fullPaymentsCollected,
    totalExpensesPaid,
    totalRefundsPaid,
    netClearedRevenue,
    currentRecordedCashBalance,
    protectedReserve,
    essentialLivingProtected,
    unreleasedContingency,
    totalRestrictedFunds,
    unearnedDepositObligations,
    estimatedTaxReserve,
    availableDiscretionaryCash,
    estimatedNetOperatingResult,
    proposedRevenueUnaccepted,
    signedContractValueTotal,
    outstandingContractReceivables,
    revenueRemainingToTarget,
    spendByBucket,
  };
}

export function canRecordMilestonePayment(
  transactions: FinancialTransaction[],
  proposalId: string,
  milestoneId: string
): { allowed: boolean; reason?: string } {
  const duplicate = transactions.find(
    (t) => t.relatedProposalId === proposalId && t.relatedMilestoneId === milestoneId
  );
  if (duplicate) {
    return {
      allowed: false,
      reason: `Payment for milestone (${milestoneId}) on proposal (${proposalId}) has already been recorded in transaction ${duplicate.id}. Duplicate payment recording is blocked.`,
    };
  }
  return { allowed: true };
}

export function checkExpenseReserveWarning(
  state: CampaignState,
  proposedExpenseAmount: number,
  bucket: BudgetBucket
): { hasWarning: boolean; warnings: string[] } {
  const fin = calculateFinancialSummary(state);
  const warnings: string[] = [];

  if (proposedExpenseAmount <= 0) {
    return { hasWarning: false, warnings };
  }

  const cashAfterExpense = fin.currentRecordedCashBalance - proposedExpenseAmount;

  if (cashAfterExpense < fin.protectedReserve + fin.essentialLivingProtected) {
    warnings.push(
      `RESERVE VIOLATION WARNING: This $${proposedExpenseAmount.toLocaleString()} expense would drop your cash balance ($${cashAfterExpense.toLocaleString()}) below your Protected Reserve ($${(fin.protectedReserve + fin.essentialLivingProtected).toLocaleString()}).`
    );
  }

  if (proposedExpenseAmount > fin.availableDiscretionaryCash) {
    warnings.push(
      `DISCRETIONARY CASH WARNING: This expense ($${proposedExpenseAmount.toLocaleString()}) exceeds your available discretionary cash ($${fin.availableDiscretionaryCash.toLocaleString()}) after accounting for reserves, contingency, and unearned client deposits.`
    );
  }

  if (bucket === BudgetBucket.CONTINGENCY && !state.settings.contingencyReleased) {
    warnings.push(
      'CONTINGENCY LOCKED: The $1,000 contingency allocation is only released when justified by verified sales evidence.'
    );
  }

  const activeDay = getActiveCampaignDay(state.settings.startDate, state.settings.currentDayOverride);
  if (bucket === BudgetBucket.AD_TEST && activeDay <= 2) {
    warnings.push(
      'DAY 2 CHECKPOINT RULE: The PDF plan mandates "No major ad spend" during Days 1–2 while verifying the prospect list and demonstration site.'
    );
  }

  const paidClientsCount = state.proposals.filter(
    (p) => p.status === ProposalStatus.DEPOSIT_PAID || p.status === ProposalStatus.PAID_IN_FULL
  ).length;
  if (bucket === BudgetBucket.AD_TEST && paidClientsCount === 0 && state.callLogs.length >= 20) {
    warnings.push(
      'PDF SPEND RULE: "Do not spend more to compensate for weak sales. If none buy, diagnose the offer and sales conversations before increasing spending."'
    );
  }

  return {
    hasWarning: warnings.length > 0,
    warnings,
  };
}

export interface DeliveryCapacityAssessment {
  activeProjectCount: number;
  maxConcurrentAllowed: number;
  totalRemainingHours: number;
  isCapacityExhausted: boolean;
  isNearCapacity: boolean;
  statusMessage: string;
}

export function evaluateDeliveryCapacity(state: CampaignState): DeliveryCapacityAssessment {
  const activeProjects = state.projects.filter(
    (p) =>
      p.status === DeliveryStatus.NOT_STARTED ||
      p.status === DeliveryStatus.IN_PROGRESS ||
      p.status === DeliveryStatus.MILESTONE_REACHED
  );

  const activeProjectCount = activeProjects.length;
  const maxConcurrentAllowed = Math.max(1, state.settings.maxConcurrentActiveProjects);
  const totalRemainingHours = activeProjects.reduce(
    (acc, p) => acc + Math.max(0, p.estimatedHours - p.actualHoursLogged),
    0
  );

  const isCapacityExhausted = activeProjectCount >= maxConcurrentAllowed || totalRemainingHours >= 35;
  const isNearCapacity = !isCapacityExhausted && (activeProjectCount >= maxConcurrentAllowed - 1 || totalRemainingHours >= 24);

  let statusMessage = `Active workload: ${activeProjectCount}/${maxConcurrentAllowed} concurrent projects (${totalRemainingHours.toFixed(1)} hrs remaining). Capacity is healthy for new deposits.`;
  if (isCapacityExhausted) {
    statusMessage = `CAPACITY WARNING: ${activeProjectCount}/${maxConcurrentAllowed} active projects (${totalRemainingHours.toFixed(1)} hrs remaining). PDF Rule: "Do not take deposits for work you lack the capacity or intention to deliver." Prioritize completing current milestones before taking new deposits.`;
  } else if (isNearCapacity) {
    statusMessage = `APPROACHING CAPACITY: ${activeProjectCount}/${maxConcurrentAllowed} active projects (${totalRemainingHours.toFixed(1)} hrs remaining). Schedule new project start dates carefully.`;
  }

  return {
    activeProjectCount,
    maxConcurrentAllowed,
    totalRemainingHours,
    isCapacityExhausted,
    isNearCapacity,
    statusMessage,
  };
}

export interface NextBestActionRecommendation {
  id: string;
  title: string;
  actionType: 'DELIVERY_GUARD' | 'COLLECT_MILESTONE' | 'OVERDUE_FOLLOWUP' | 'CLOSE_PROPOSAL' | 'BOOKED_DEMO' | 'DAILY_OUTBOUND' | 'CRITICAL_TASK';
  targetTab: string;
  explanation: string;
  pdfRuleCitation: string;
  urgency: 'CRITICAL' | 'HIGH' | 'STANDARD';
}

export function computeNextBestActions(state: CampaignState, todayDateStr?: string): NextBestActionRecommendation[] {
  const recommendations: NextBestActionRecommendation[] = [];
  const activeDay = getActiveCampaignDay(state.settings.startDate, state.settings.currentDayOverride, todayDateStr);
  const currentDate = todayDateStr || new Date().toISOString().slice(0, 10);
  const capacity = evaluateDeliveryCapacity(state);

  // 1. Check if any project is at MILESTONE_REACHED or DELIVERED with unpaid balance (fastest path to next dollar!)
  const collectibleProjects = state.projects.filter(
    (p) =>
      (p.status === DeliveryStatus.MILESTONE_REACHED ||
        p.status === DeliveryStatus.DELIVERED ||
        p.status === DeliveryStatus.ACCEPTED) &&
      p.remainingBalance > 0
  );
  if (collectibleProjects.length > 0) {
    const first = collectibleProjects[0];
    recommendations.push({
      id: `nba-collect-${first.id}`,
      title: `Collect $${first.remainingBalance.toLocaleString()} milestone balance from ${first.customerName}`,
      actionType: 'COLLECT_MILESTONE',
      targetTab: 'delivery',
      explanation: `${first.projectTitle} has reached "${first.status}" with $${first.remainingBalance.toLocaleString()} outstanding. Completing sign-off and collecting this milestone is the highest-probability immediate cash inflow.`,
      pdfRuleCitation: 'PDF Section 5 & 6: "Prioritize completing contracted milestones and collecting payments due."',
      urgency: 'CRITICAL',
    });
  }

  // 2. Check if delivery capacity is exhausted
  if (capacity.isCapacityExhausted) {
    recommendations.push({
      id: 'nba-capacity-guard',
      title: `Fulfill active client milestones (${capacity.activeProjectCount} active builds in queue)`,
      actionType: 'DELIVERY_GUARD',
      targetTab: 'delivery',
      explanation: capacity.statusMessage,
      pdfRuleCitation: 'PDF Section 6: "Do not take deposits for work you lack the capacity or intention to deliver."',
      urgency: 'CRITICAL',
    });
  }

  // 3. Check open SENT proposals awaiting decision and 50% deposit
  const sentProposals = state.proposals.filter((p) => p.status === ProposalStatus.SENT);
  if (sentProposals.length > 0 && !capacity.isCapacityExhausted) {
    const topProp = sentProposals[0];
    const depositAmt = topProp.milestones[0]?.amount || topProp.totalPrice * 0.5;
    recommendations.push({
      id: `nba-proposal-${topProp.id}`,
      title: `Follow up on $${topProp.totalPrice.toLocaleString()} proposal for ${topProp.customerName} ($${depositAmt.toLocaleString()} deposit)`,
      actionType: 'CLOSE_PROPOSAL',
      targetTab: 'proposals',
      explanation: `Written proposal is already in ${topProp.contactName}'s hands. Confirm scope and request the 50% upfront deposit ($${depositAmt.toLocaleString()}) before the conversation goes cold.`,
      pdfRuleCitation: 'PDF Section 4 (11:00–12:00): "Send clear scopes and prices. Schedule next steps before conversations go cold."',
      urgency: 'HIGH',
    });
  }

  // 4. Check prospects with DEMO_BOOKED stage
  const bookedDemos = state.prospects.filter((p) => p.stage === PipelineStage.DEMO_BOOKED);
  if (bookedDemos.length > 0) {
    const demoProspect = bookedDemos[0];
    recommendations.push({
      id: `nba-demo-${demoProspect.id}`,
      title: `Conduct 10-minute mobile demo for ${demoProspect.businessName}`,
      actionType: 'BOOKED_DEMO',
      targetTab: 'calls',
      explanation: `${demoProspect.contactName} has a booked demonstration (observed problem: "${demoProspect.problemObserved}"). Show your mobile build, confirm fixed scope, and offer the one-page proposal.`,
      pdfRuleCitation: 'PDF Section 4 (1:00–3:00): "Show prospects a relevant example. Ask what they need, confirm scope, and request a decision or an agreed follow-up."',
      urgency: 'HIGH',
    });
  }

  // 5. Check overdue or due-today follow-ups in CRM
  const dueFollowUps = state.prospects.filter(
    (p) =>
      p.stage !== PipelineStage.WON &&
      p.stage !== PipelineStage.LOST &&
      p.stage !== PipelineStage.ARCHIVED &&
      p.nextActionDate &&
      p.nextActionDate <= currentDate
  );
  if (dueFollowUps.length > 0) {
    const firstDue = dueFollowUps[0];
    recommendations.push({
      id: `nba-followup-${firstDue.id}`,
      title: `Execute due follow-up with ${firstDue.businessName} (${firstDue.contactName})`,
      actionType: 'OVERDUE_FOLLOWUP',
      targetTab: 'pipeline',
      explanation: `Scheduled next action "${firstDue.nextAction}" is due (${firstDue.nextActionDate}). You have ${dueFollowUps.length} prospect(s) requiring follow-up today.`,
      pdfRuleCitation: 'PDF Section 2: "5–10 follow-ups: Follow up with prospects who have shown interest or agreed to another contact."',
      urgency: 'HIGH',
    });
  }

  // 6. Check today's outbound call target (20–25 targeted calls)
  const callsToday = state.callLogs.filter((c) => c.dayNumber === activeDay && !c.isFollowUpCall).length;
  if (callsToday < state.settings.dailyCallTarget) {
    const remainingCalls = state.settings.dailyCallTarget - callsToday;
    recommendations.push({
      id: `nba-outbound-day-${activeDay}`,
      title: `Make ${remainingCalls} more targeted outbound calls today (${callsToday}/${state.settings.dailyCallTarget} logged)`,
      actionType: 'DAILY_OUTBOUND',
      targetTab: 'calls',
      explanation: `The 30-day pipeline model requires 400–500 targeted attempts (20–25 calls/day). You have logged ${callsToday} outbound calls on Day ${activeDay}.`,
      pdfRuleCitation: 'PDF Section 14: "The $20,000 goal is the ambition. The next qualified conversation is the work."',
      urgency: callsToday < 10 ? 'CRITICAL' : 'STANDARD',
    });
  }

  // 7. Check uncompleted critical tasks for today's roadmap day
  const todayTasks = state.tasks.filter(
    (t) => t.dayNumber === activeDay && t.status !== TaskStatus.COMPLETED
  );
  const criticalTask = todayTasks.find((t) => t.priority === TaskPriority.CRITICAL) || todayTasks[0];
  if (criticalTask) {
    recommendations.push({
      id: `nba-task-${criticalTask.id}`,
      title: `Complete Day ${activeDay} Mission Task: ${criticalTask.title}`,
      actionType: 'CRITICAL_TASK',
      targetTab: 'mission',
      explanation: criticalTask.instructions,
      pdfRuleCitation: `PDF Section 5 & 7 — ${criticalTask.phaseName}`,
      urgency: 'STANDARD',
    });
  }

  return recommendations;
}

export interface ScenarioProjectionResult {
  expectedConversations: number;
  expectedQualified: number;
  expectedDemos: number;
  expectedProposals: number;
  expectedWebsiteClientsFromFunnel: number;
  projectedOfferARevenue: number;
  projectedOfferBRevenue: number;
  projectedOfferCRevenue: number;
  totalProjectedGrossRevenue: number;
  totalEstimatedDeliveryHours: number;
  monthlyAvailableHours: number;
  capacityUtilizationPercent: number;
  isOverCapacity: boolean;
}

export function calculateScenarioProjection(scenario: ScenarioConfig): ScenarioProjectionResult {
  const expectedConversations = Math.round(
    scenario.outboundAttempts * (scenario.conversationRatePercent / 100)
  );
  const expectedQualified = Math.round(
    expectedConversations * (scenario.qualifiedRatePercent / 100)
  );
  const expectedDemos = Math.round(
    expectedQualified * (scenario.demoBookingRatePercent / 100)
  );
  const expectedProposals = Math.round(
    expectedDemos * (scenario.proposalRatePercent / 100)
  );
  const expectedWebsiteClientsFromFunnel = Math.round(
    expectedProposals * (scenario.closeRatePercent / 100)
  );

  const projectedOfferARevenue = scenario.offerAVolume * scenario.offerAPrice;
  const projectedOfferBRevenue = scenario.offerBVolume * scenario.offerBPrice;
  const projectedOfferCRevenue = scenario.includeOfferCInTotal
    ? scenario.offerCVolume * scenario.offerCPrice
    : 0;

  const totalProjectedGrossRevenue =
    projectedOfferARevenue + projectedOfferBRevenue + projectedOfferCRevenue;

  // Estimate delivery hours: 10 hrs per website, 6 hrs per automation, 1 hr per alpha package
  const totalEstimatedDeliveryHours =
    scenario.offerAVolume * 10 +
    scenario.offerBVolume * 6 +
    (scenario.includeOfferCInTotal ? scenario.offerCVolume * 1 : 0);

  const monthlyAvailableHours = Math.max(1, scenario.availableWeeklyDeliveryHours * 4.2);
  const capacityUtilizationPercent = Math.round(
    (totalEstimatedDeliveryHours / monthlyAvailableHours) * 100
  );

  return {
    expectedConversations,
    expectedQualified,
    expectedDemos,
    expectedProposals,
    expectedWebsiteClientsFromFunnel,
    projectedOfferARevenue,
    projectedOfferBRevenue,
    projectedOfferCRevenue,
    totalProjectedGrossRevenue,
    totalEstimatedDeliveryHours,
    monthlyAvailableHours: Math.round(monthlyAvailableHours),
    capacityUtilizationPercent,
    isOverCapacity: totalEstimatedDeliveryHours > monthlyAvailableHours,
  };
}

export interface FunnelAnalyticsReport {
  outboundAttempts: number;
  decisionMakersReached: number;
  twoWayConversations: number;
  qualifiedProspects: number;
  demosConducted: number;
  proposalsSent: number;
  dealsWon: number;
  averageDealSize: number;
  attemptToConversationRate: number;
  conversationToDemoRate: number;
  demoToProposalRate: number;
  proposalToCloseRate: number;
  avgDaysFirstContactToPayment: number | null;
  followUpCompletionRatePercent: number;
  dailyExecutionConsistencyPercent: number;
  isStatisticallyReliable: boolean;
  sampleSizeWarning: string;
  diagnosticMessage: string;
}

export function computeFunnelAnalytics(state: CampaignState): FunnelAnalyticsReport {
  const outboundAttempts = state.callLogs.filter((c) => !c.isFollowUpCall).length;
  const decisionMakersReached = state.callLogs.filter((c) => c.decisionMakerReached).length;
  const twoWayConversations = state.callLogs.filter((c) => c.twoWayConversation).length;

  const qualifiedStages = new Set([
    PipelineStage.QUALIFIED,
    PipelineStage.DEMO_BOOKED,
    PipelineStage.DEMO_COMPLETED,
    PipelineStage.PROPOSAL_SENT,
    PipelineStage.WON,
  ]);
  const qualifiedProspects = state.prospects.filter((p) => qualifiedStages.has(p.stage)).length;

  const demosConducted = state.callLogs.filter((c) => c.demoConducted).length;
  const proposalsSent = state.proposals.filter((p) => p.status !== ProposalStatus.DRAFT).length;
  const wonProposals = state.proposals.filter(
    (p) =>
      p.status === ProposalStatus.ACCEPTED ||
      p.status === ProposalStatus.DEPOSIT_PAID ||
      p.status === ProposalStatus.PAID_IN_FULL
  );
  const dealsWon = wonProposals.length;
  const averageDealSize =
    dealsWon > 0
      ? Math.round(wonProposals.reduce((acc, p) => acc + p.totalPrice, 0) / dealsWon)
      : 0;

  const attemptToConversationRate =
    outboundAttempts > 0 ? Number(((twoWayConversations / outboundAttempts) * 100).toFixed(1)) : 0;
  const conversationToDemoRate =
    twoWayConversations > 0 ? Number(((demosConducted / twoWayConversations) * 100).toFixed(1)) : 0;
  const demoToProposalRate =
    demosConducted > 0 ? Number(((proposalsSent / demosConducted) * 100).toFixed(1)) : 0;
  const proposalToCloseRate =
    proposalsSent > 0 ? Number(((dealsWon / proposalsSent) * 100).toFixed(1)) : 0;

  // Time from first contact to payment (in days)
  const paymentTxs = state.transactions.filter(
    (tx) =>
      tx.type === TransactionType.REVENUE_DEPOSIT ||
      tx.type === TransactionType.REVENUE_MILESTONE ||
      tx.type === TransactionType.REVENUE_FULL
  );
  let totalDaysToPay = 0;
  let matchedPaidCount = 0;
  for (const tx of paymentTxs) {
    if (!tx.relatedProposalId) continue;
    const prop = state.proposals.find((p) => p.id === tx.relatedProposalId);
    const prospect = prop ? state.prospects.find((pr) => pr.id === prop.prospectId) : undefined;
    const firstDateStr = prospect?.lastContactDate || prospect?.dateAdded || prop?.createdAt;
    if (firstDateStr && tx.date) {
      const d1 = new Date(`${firstDateStr}T00:00:00`).getTime();
      const d2 = new Date(`${tx.date}T00:00:00`).getTime();
      if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
        totalDaysToPay += Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        matchedPaidCount += 1;
      }
    }
  }
  const avgDaysFirstContactToPayment =
    matchedPaidCount > 0 ? Number((totalDaysToPay / matchedPaidCount).toFixed(1)) : null;

  // Follow-up completion rate
  const followUpCallsLogged = state.callLogs.filter((c) => c.isFollowUpCall).length;
  const activeProspectsWithFollowUp = state.prospects.filter((p) => Boolean(p.nextActionDate)).length;
  const totalFollowUpDenominator = Math.max(1, followUpCallsLogged + activeProspectsWithFollowUp);
  const followUpCompletionRatePercent =
    followUpCallsLogged === 0 && activeProspectsWithFollowUp === 0
      ? 0
      : Math.min(100, Math.round((followUpCallsLogged / totalFollowUpDenominator) * 100));

  // Daily execution consistency (completed tasks thru activeDay / total tasks thru activeDay)
  const activeDay = getActiveCampaignDay(
    state.settings.startDate,
    state.settings.currentDayOverride
  );
  const tasksThruToday = state.tasks.filter((t) => t.dayNumber <= activeDay);
  const completedThruToday = tasksThruToday.filter((t) => t.status === TaskStatus.COMPLETED).length;
  const dailyExecutionConsistencyPercent =
    tasksThruToday.length > 0 ? Math.round((completedThruToday / tasksThruToday.length) * 100) : 0;

  const isStatisticallyReliable = outboundAttempts >= 50 && twoWayConversations >= 15;
  const sampleSizeWarning = isStatisticallyReliable
    ? `Sample size (${outboundAttempts} outbound attempts, ${twoWayConversations} conversations) is sufficient to compare against the 30-day planning model.`
    : `LOW SAMPLE SIZE NOTICE: Only ${outboundAttempts} outbound attempts and ${twoWayConversations} conversations recorded so far. Conversion percentages based on small observations are NOT statistically reliable; rely on PDF planning assumptions until at least 3 days of full call volume (50+ calls) are logged.`;

  // PDF Section 6 Diagnostic Rules:
  let diagnosticMessage =
    'Execute the daily 20–25 call rhythm and log outcomes to unlock automated funnel bottleneck diagnostics.';
  if (outboundAttempts >= 50 && twoWayConversations < 5) {
    diagnosticMessage =
      'BOTTLENECK DIAGNOSIS (PDF Rule): 50+ calls have produced very few meaningful conversations. Investigate your prospect list quality and cold-call opening line before making more blind dials.';
  } else if (twoWayConversations >= 10 && demosConducted === 0) {
    diagnosticMessage =
      'BOTTLENECK DIAGNOSIS (PDF Rule): Conversations are happening with decision-makers, but nobody is booking a 10-minute demonstration. Improve the relevance of your specific website observation and offer hook.';
  } else if (demosConducted >= 4 && dealsWon === 0) {
    diagnosticMessage =
      'BOTTLENECK DIAGNOSIS (PDF Rule): Demonstrations are occurring, but proposals are stalling before deposit. Examine price framing ($750 deposit / $750 milestone), trust proof, scope clarity, and timing.';
  } else if (dealsWon > 0) {
    diagnosticMessage =
      'POSITIVE SIGNAL: Your sales process has produced paid client commitments. Protect delivery capacity, capture client proof, and ask satisfied clients for introductions.';
  }

  return {
    outboundAttempts,
    decisionMakersReached,
    twoWayConversations,
    qualifiedProspects,
    demosConducted,
    proposalsSent,
    dealsWon,
    averageDealSize,
    attemptToConversationRate,
    conversationToDemoRate,
    demoToProposalRate,
    proposalToCloseRate,
    avgDaysFirstContactToPayment,
    followUpCompletionRatePercent,
    dailyExecutionConsistencyPercent,
    isStatisticallyReliable,
    sampleSizeWarning,
    diagnosticMessage,
  };
}

export function sanitizeAndDeduplicateImportState(
  incomingState: CampaignState,
  targetIsDemoMode: boolean
): {
  allowed: boolean;
  reason?: string;
  sanitizedState?: CampaignState;
  deduplicatedTransactionsCount: number;
} {
  // Guard 1: Prevent fictional demo state from ever being imported into Real Campaign mode
  if (!targetIsDemoMode && incomingState.isDemoMode) {
    return {
      allowed: false,
      reason:
        'CONTAMINATION BLOCKED: You cannot import a fictional Demonstration Mode backup into your Live Real Campaign. Switch to Demo Mode if you wish to inspect demo backups.',
      deduplicatedTransactionsCount: 0,
    };
  }

  // Guard 2: Deduplicate transactions by id AND by (relatedProposalId + relatedMilestoneId) so financial records can never be duplicated
  const seenTxIds = new Set<string>();
  const seenMilestoneKeys = new Set<string>();
  const dedupedTransactions: FinancialTransaction[] = [];
  let deduplicatedTransactionsCount = 0;

  for (const tx of incomingState.transactions || []) {
    if (seenTxIds.has(tx.id)) {
      deduplicatedTransactionsCount += 1;
      continue;
    }
    if (tx.relatedProposalId && tx.relatedMilestoneId) {
      const mKey = `${tx.relatedProposalId}::${tx.relatedMilestoneId}`;
      if (seenMilestoneKeys.has(mKey)) {
        deduplicatedTransactionsCount += 1;
        continue;
      }
      seenMilestoneKeys.add(mKey);
    }
    seenTxIds.add(tx.id);
    dedupedTransactions.push(tx);
  }

  // Guard 3: Deduplicate proposals, projects, prospects, tasks, and callLogs by id
  const dedupeById = <T extends { id: string }>(arr: T[] = []): T[] => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of arr) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        out.push(item);
      }
    }
    return out;
  };

  const sanitizedState: CampaignState = {
    ...incomingState,
    isDemoMode: targetIsDemoMode,
    transactions: dedupedTransactions,
    proposals: dedupeById(incomingState.proposals),
    projects: dedupeById(incomingState.projects),
    prospects: dedupeById(incomingState.prospects),
    callLogs: dedupeById(incomingState.callLogs),
    tasks: dedupeById(incomingState.tasks),
    dailyReviews: dedupeById(incomingState.dailyReviews),
  };

  return {
    allowed: true,
    sanitizedState,
    deduplicatedTransactionsCount,
  };
}

export interface RevenueTrajectoryPoint {
  day: number;
  dayLabel: string;
  date: string;
  formattedDate: string;
  revenueCollected: number;
  dailyRevenueAdded: number;
  targetBaseline: number;
  variance: number;
}

export function formatCampaignDayDate(startDateStr: string, dayNumber: number): { isoDate: string; formattedDate: string } {
  const baseDate = new Date(`${startDateStr || '2026-10-27'}T00:00:00Z`);
  if (isNaN(baseDate.getTime())) {
    return { isoDate: `Day ${dayNumber}`, formattedDate: `Day ${dayNumber}` };
  }
  const targetDate = new Date(baseDate.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000);
  const isoDate = targetDate.toISOString().slice(0, 10);
  const formattedDate = targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return { isoDate, formattedDate };
}

export function buildRevenueTrajectorySeries(state: CampaignState): RevenueTrajectoryPoint[] {
  const targetTotal = Math.max(0, state.settings.revenueTarget || 20000);

  return Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const targetBaseline = Math.round((targetTotal / 30) * day);
    const { isoDate, formattedDate } = formatCampaignDayDate(state.settings.startDate, day);

    let inflowsThruDay = 0;
    let refundsThruDay = 0;
    let dailyNetAdded = 0;
    for (const tx of state.transactions) {
      const amt = Math.max(0, Number(tx.amount) || 0);
      if (tx.dayNumber <= day) {
        if (
          tx.type === TransactionType.REVENUE_DEPOSIT ||
          tx.type === TransactionType.REVENUE_MILESTONE ||
          tx.type === TransactionType.REVENUE_FULL
        ) {
          inflowsThruDay += amt;
          if (tx.dayNumber === day) dailyNetAdded += amt;
        } else if (tx.type === TransactionType.REFUND) {
          refundsThruDay += amt;
          if (tx.dayNumber === day) dailyNetAdded -= amt;
        }
      }
    }

    const revenueCollected = Math.max(0, inflowsThruDay - refundsThruDay);

    return {
      day,
      dayLabel: `Day ${day}`,
      date: isoDate,
      formattedDate,
      revenueCollected,
      dailyRevenueAdded: dailyNetAdded,
      targetBaseline,
      variance: revenueCollected - targetBaseline,
    };
  });
}

export interface TeamMemberStats {
  memberId: string;
  name: string;
  role: string;
  avatarColor: string;
  callsMade: number;
  twoWayConversations: number;
  decisionMakersReached: number;
  demosConducted: number;
  proposalsClaimedOrSent: number;
  dealsClosed: number;
  clearedCashCollected: number;
  assistedRevenue: number;
  tasksClaimed: number;
  tasksCompleted: number;
  prospectStepsClaimed: number;
  deliveryMilestonesClaimed: number;
  deliveryMilestonesCompleted: number;
  totalClaimedSteps: number;
  totalActivityScore: number;
}

export interface UnclaimedStepItem {
  id: string;
  category: 'TASK' | 'PROSPECT_CALL' | 'PROSPECT_DEMO' | 'PROSPECT_PROPOSAL' | 'PROSPECT_CLOSE' | 'PROPOSAL' | 'DELIVERY_MILESTONE';
  title: string;
  subtitle: string;
  targetId: string;
  subTargetId?: string;
  stepKey?: 'researchAndCall' | 'demoExecution' | 'proposalFollowUp' | 'closeAndDeposit';
  valueAmount?: number;
  targetTab: string;
}

export interface TeamAnalyticsSummary {
  memberStats: TeamMemberStats[];
  totalClaimedSteps: number;
  totalUnclaimedSteps: number;
  claimCoveragePercent: number;
  multiOperatorHandoffCount: number;
  unclaimedQueue: UnclaimedStepItem[];
  stepDistributionByStage: {
    stage: string;
    claimed: number;
    unclaimed: number;
  }[];
}

export function computeTeamAnalytics(state: CampaignState): TeamAnalyticsSummary {
  const activeDay = getActiveCampaignDay(
    state.settings.startDate,
    state.settings.currentDayOverride
  );
  const roster = state.teamMembers && state.teamMembers.length > 0
    ? state.teamMembers
    : [
        {
          id: 'member-lead',
          name: state.settings.operatorName || 'Lead Operator',
          email: 'lead@itsllc.com',
          role: 'Campaign Lead & Closer',
          avatarColor: '#38bdf8',
          joinedAt: state.settings.startDate,
          lastActiveAt: new Date().toISOString(),
        },
      ];

  const statsMap = new Map<string, TeamMemberStats>();

  const getOrCreateStats = (memberId?: string, memberName?: string): TeamMemberStats | null => {
    if (!memberId && !memberName) return null;
    const matched = roster.find(
      (m) =>
        (memberId && m.id === memberId) ||
        (memberName && m.name.trim().toLowerCase() === memberName.trim().toLowerCase())
    );
    const resolvedId = matched ? matched.id : memberId || `member-${memberName}`;
    const resolvedName = matched ? matched.name : memberName || 'Operator';
    if (!statsMap.has(resolvedId)) {
      statsMap.set(resolvedId, {
        memberId: resolvedId,
        name: resolvedName,
        role: matched?.role || 'Team Operator',
        avatarColor: matched?.avatarColor || '#38bdf8',
        callsMade: 0,
        twoWayConversations: 0,
        decisionMakersReached: 0,
        demosConducted: 0,
        proposalsClaimedOrSent: 0,
        dealsClosed: 0,
        clearedCashCollected: 0,
        assistedRevenue: 0,
        tasksClaimed: 0,
        tasksCompleted: 0,
        prospectStepsClaimed: 0,
        deliveryMilestonesClaimed: 0,
        deliveryMilestonesCompleted: 0,
        totalClaimedSteps: 0,
        totalActivityScore: 0,
      });
    }
    return statsMap.get(resolvedId)!;
  };

  for (const m of roster) {
    getOrCreateStats(m.id, m.name);
  }

  // 1. Tasks
  let tasksClaimedCount = 0;
  let tasksUnclaimedCount = 0;
  const unclaimedQueue: UnclaimedStepItem[] = [];

  for (const t of state.tasks) {
    if (t.claimedByMemberId || t.claimedByName) {
      tasksClaimedCount++;
      const st = getOrCreateStats(t.claimedByMemberId, t.claimedByName);
      if (st) {
        st.tasksClaimed++;
        st.totalClaimedSteps++;
      }
    } else if (t.dayNumber <= activeDay && t.status !== TaskStatus.COMPLETED) {
      tasksUnclaimedCount++;
      unclaimedQueue.push({
        id: `unclaimed-task-${t.id}`,
        category: 'TASK',
        title: t.title,
        subtitle: `Day ${t.dayNumber} (${t.dueTimeBlock || 'Scheduled Block'})`,
        targetId: t.id,
        targetTab: 'mission',
      });
    }
    if (t.status === TaskStatus.COMPLETED) {
      const completedOwner = getOrCreateStats(
        t.completedByMemberId || t.claimedByMemberId,
        t.completedByName || t.claimedByName || roster[0]?.name
      );
      if (completedOwner) {
        completedOwner.tasksCompleted++;
      }
    }
  }

  // 2. Call Logs & Demos
  for (const call of state.callLogs) {
    const caller = getOrCreateStats(
      call.operatorId,
      call.operatorName || roster[0]?.name
    );
    if (caller) {
      caller.callsMade++;
      if (call.twoWayConversation) caller.twoWayConversations++;
      if (call.decisionMakerReached) caller.decisionMakersReached++;
    }
    if (call.demoConducted) {
      const demoer = getOrCreateStats(
        call.demoOperatorId || call.operatorId,
        call.demoOperatorName || call.operatorName || roster[0]?.name
      );
      if (demoer) {
        demoer.demosConducted++;
      }
    }
  }

  // 3. Prospect 4-Stage Step Claims & Handoff Tracking
  let prospectCallClaimed = 0;
  let prospectCallUnclaimed = 0;
  let prospectDemoClaimed = 0;
  let prospectDemoUnclaimed = 0;
  let prospectProposalClaimed = 0;
  let prospectProposalUnclaimed = 0;
  let prospectCloseClaimed = 0;
  let prospectCloseUnclaimed = 0;
  let multiOperatorHandoffCount = 0;

  for (const p of state.prospects) {
    if (p.stage === PipelineStage.LOST || p.stage === PipelineStage.ARCHIVED) continue;
    const sc = p.stepClaims || {};
    const distinctOperatorsOnProspect = new Set<string>();

    // Step A: Research & Call
    if (sc.researchAndCall) {
      prospectCallClaimed++;
      distinctOperatorsOnProspect.add(sc.researchAndCall.memberName);
      const st = getOrCreateStats(sc.researchAndCall.memberId, sc.researchAndCall.memberName);
      if (st) {
        st.prospectStepsClaimed++;
        st.totalClaimedSteps++;
      }
    } else {
      prospectCallUnclaimed++;
      unclaimedQueue.push({
        id: `unclaimed-pcall-${p.id}`,
        category: 'PROSPECT_CALL',
        title: `${p.businessName} — Step 1: Outbound Call`,
        subtitle: `Contact: ${p.contactName} • Issue: ${p.problemObserved}`,
        targetId: p.id,
        stepKey: 'researchAndCall',
        valueAmount: p.estimatedValue,
        targetTab: 'pipeline',
      });
    }

    // Step B: 10-Min Demo
    if (sc.demoExecution) {
      prospectDemoClaimed++;
      distinctOperatorsOnProspect.add(sc.demoExecution.memberName);
      const st = getOrCreateStats(sc.demoExecution.memberId, sc.demoExecution.memberName);
      if (st) {
        st.prospectStepsClaimed++;
        st.totalClaimedSteps++;
      }
    } else {
      prospectDemoUnclaimed++;
      unclaimedQueue.push({
        id: `unclaimed-pdemo-${p.id}`,
        category: 'PROSPECT_DEMO',
        title: `${p.businessName} — Step 2: 10-Min Demo`,
        subtitle: `Stage: ${p.stage} • Value: $${p.estimatedValue.toLocaleString()}`,
        targetId: p.id,
        stepKey: 'demoExecution',
        valueAmount: p.estimatedValue,
        targetTab: 'pipeline',
      });
    }

    // Step C: Written Proposal & Follow-Up
    if (sc.proposalFollowUp) {
      prospectProposalClaimed++;
      distinctOperatorsOnProspect.add(sc.proposalFollowUp.memberName);
      const st = getOrCreateStats(sc.proposalFollowUp.memberId, sc.proposalFollowUp.memberName);
      if (st) {
        st.prospectStepsClaimed++;
        st.totalClaimedSteps++;
      }
    } else {
      prospectProposalUnclaimed++;
      unclaimedQueue.push({
        id: `unclaimed-pprop-${p.id}`,
        category: 'PROSPECT_PROPOSAL',
        title: `${p.businessName} — Step 3: Proposal & Follow-Up`,
        subtitle: `Offer: ${p.offerInterest} ($${p.estimatedValue.toLocaleString()})`,
        targetId: p.id,
        stepKey: 'proposalFollowUp',
        valueAmount: p.estimatedValue,
        targetTab: 'pipeline',
      });
    }

    // Step D: Close & Deposit Collection
    if (sc.closeAndDeposit) {
      prospectCloseClaimed++;
      distinctOperatorsOnProspect.add(sc.closeAndDeposit.memberName);
      const st = getOrCreateStats(sc.closeAndDeposit.memberId, sc.closeAndDeposit.memberName);
      if (st) {
        st.prospectStepsClaimed++;
        st.totalClaimedSteps++;
      }
    } else {
      prospectCloseUnclaimed++;
      unclaimedQueue.push({
        id: `unclaimed-pclose-${p.id}`,
        category: 'PROSPECT_CLOSE',
        title: `${p.businessName} — Step 4: Close & Collect 50% Deposit`,
        subtitle: `Next Action: ${p.nextAction}`,
        targetId: p.id,
        stepKey: 'closeAndDeposit',
        valueAmount: p.estimatedValue,
        targetTab: 'pipeline',
      });
    }

    // Also inspect call logs on this prospect for distinct operators
    for (const c of state.callLogs) {
      if (c.prospectId === p.id && c.operatorName) {
        distinctOperatorsOnProspect.add(c.operatorName);
      }
      if (c.prospectId === p.id && c.demoOperatorName) {
        distinctOperatorsOnProspect.add(c.demoOperatorName);
      }
    }

    if (distinctOperatorsOnProspect.size >= 2) {
      multiOperatorHandoffCount++;
    }
  }

  // 4. Proposals & Cleared Cash Attribution (Direct + Assisted)
  for (const prop of state.proposals) {
    const owner = getOrCreateStats(
      prop.claimedByMemberId,
      prop.claimedByName || prop.createdByName || roster[0]?.name
    );
    if (owner) {
      owner.proposalsClaimedOrSent++;
      if (prop.claimedByMemberId || prop.claimedByName) {
        owner.totalClaimedSteps++;
      }
      if (
        prop.status === ProposalStatus.DEPOSIT_PAID ||
        prop.status === ProposalStatus.PAID_IN_FULL ||
        prop.status === ProposalStatus.ACCEPTED
      ) {
        owner.dealsClosed++;
      }
    }
  }

  for (const tx of state.transactions) {
    if (
      tx.type === TransactionType.REVENUE_DEPOSIT ||
      tx.type === TransactionType.REVENUE_MILESTONE ||
      tx.type === TransactionType.REVENUE_FULL
    ) {
      const prop = tx.relatedProposalId
        ? state.proposals.find((p) => p.id === tx.relatedProposalId)
        : undefined;
      const prospect = prop
        ? state.prospects.find((pr) => pr.id === prop.prospectId)
        : undefined;

      const directCollectorName =
        tx.recordedByName ||
        prop?.claimedByName ||
        prospect?.stepClaims?.closeAndDeposit?.memberName ||
        roster[0]?.name;

      const directStat = getOrCreateStats(tx.recordedByMemberId, directCollectorName);
      if (directStat) {
        directStat.clearedCashCollected += tx.amount;
      }

      // Credit assistedRevenue to anyone else who claimed/executed Call, Demo, or Proposal on this prospect!
      if (prospect) {
        const contributors = new Set<string>();
        if (prospect.stepClaims?.researchAndCall?.memberName) {
          contributors.add(prospect.stepClaims.researchAndCall.memberName);
        }
        if (prospect.stepClaims?.demoExecution?.memberName) {
          contributors.add(prospect.stepClaims.demoExecution.memberName);
        }
        if (prospect.stepClaims?.proposalFollowUp?.memberName) {
          contributors.add(prospect.stepClaims.proposalFollowUp.memberName);
        }
        for (const c of state.callLogs) {
          if (c.prospectId === prospect.id && c.operatorName) {
            contributors.add(c.operatorName);
          }
          if (c.prospectId === prospect.id && c.demoOperatorName) {
            contributors.add(c.demoOperatorName);
          }
        }
        contributors.forEach((contribName) => {
          if (
            !directCollectorName ||
            contribName.trim().toLowerCase() !== directCollectorName.trim().toLowerCase()
          ) {
            const assistStat = getOrCreateStats(undefined, contribName);
            if (assistStat) {
              assistStat.assistedRevenue += tx.amount;
            }
          }
        });
      }
    }
  }

  // 5. Delivery Projects & Milestones
  let deliveryClaimed = 0;
  let deliveryUnclaimed = 0;
  for (const proj of state.projects) {
    for (const ms of proj.milestones) {
      if (ms.claimedByMemberId || ms.claimedByName) {
        deliveryClaimed++;
        const st = getOrCreateStats(ms.claimedByMemberId, ms.claimedByName);
        if (st) {
          st.deliveryMilestonesClaimed++;
          st.totalClaimedSteps++;
          if (ms.completed) st.deliveryMilestonesCompleted++;
        }
      } else if (!ms.completed) {
        deliveryUnclaimed++;
        unclaimedQueue.push({
          id: `unclaimed-deliv-${proj.id}-${ms.id}`,
          category: 'DELIVERY_MILESTONE',
          title: `${proj.customerName} — ${ms.title}`,
          subtitle: `Delivery Milestone • Contract Value: $${proj.contractedValue.toLocaleString()}`,
          targetId: proj.id,
          subTargetId: ms.id,
          valueAmount: proj.remainingBalance,
          targetTab: 'delivery',
        });
      }
    }
  }

  const memberStats = Array.from(statsMap.values()).map((st) => ({
    ...st,
    totalActivityScore:
      st.callsMade * 2 +
      st.twoWayConversations * 4 +
      st.demosConducted * 10 +
      st.proposalsClaimedOrSent * 12 +
      st.dealsClosed * 25 +
      st.tasksCompleted * 3 +
      st.deliveryMilestonesCompleted * 8 +
      st.totalClaimedSteps * 2,
  }));

  memberStats.sort(
    (a, b) =>
      b.clearedCashCollected +
      b.assistedRevenue -
      (a.clearedCashCollected + a.assistedRevenue) ||
      b.totalActivityScore - a.totalActivityScore
  );

  const totalClaimedSteps =
    tasksClaimedCount +
    prospectCallClaimed +
    prospectDemoClaimed +
    prospectProposalClaimed +
    prospectCloseClaimed +
    deliveryClaimed;

  const totalUnclaimedSteps =
    tasksUnclaimedCount +
    prospectCallUnclaimed +
    prospectDemoUnclaimed +
    prospectProposalUnclaimed +
    prospectCloseUnclaimed +
    deliveryUnclaimed;

  const totalSteps = totalClaimedSteps + totalUnclaimedSteps;
  const claimCoveragePercent =
    totalSteps > 0 ? Math.round((totalClaimedSteps / totalSteps) * 100) : 100;

  return {
    memberStats,
    totalClaimedSteps,
    totalUnclaimedSteps,
    claimCoveragePercent,
    multiOperatorHandoffCount,
    unclaimedQueue,
    stepDistributionByStage: [
      { stage: "Today's Tasks", claimed: tasksClaimedCount, unclaimed: tasksUnclaimedCount },
      { stage: '1. Outbound Calls', claimed: prospectCallClaimed, unclaimed: prospectCallUnclaimed },
      { stage: '2. 10-Min Demos', claimed: prospectDemoClaimed, unclaimed: prospectDemoUnclaimed },
      { stage: '3. Proposals', claimed: prospectProposalClaimed, unclaimed: prospectProposalUnclaimed },
      { stage: '4. Close & Deposit', claimed: prospectCloseClaimed, unclaimed: prospectCloseUnclaimed },
      { stage: '5. Client Delivery', claimed: deliveryClaimed, unclaimed: deliveryUnclaimed },
    ],
  };
}



