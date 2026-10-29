import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialRealState } from '../data/pdfPlanData';
import {
  buildRevenueTrajectorySeries,
  calculateFinancialSummary,
  calculateScenarioProjection,
  canRecordMilestonePayment,
  checkExpenseReserveWarning,
  computeFunnelAnalytics,
  evaluateDeliveryCapacity,
  sanitizeAndDeduplicateImportState,
} from './calculations';
import { BudgetBucket, DeliveryStatus, TransactionType } from '../types';

test('Initial real campaign starts with zero fabricated activity and $5,000 working capital', () => {
  const realState = createInitialRealState();
  const fin = calculateFinancialSummary(realState);

  assert.equal(realState.isDemoMode, false);
  assert.equal(fin.startingWorkingCapital, 5000);
  assert.equal(fin.grossClearedRevenue, 0);
  assert.equal(fin.totalExpensesPaid, 0);
  assert.equal(fin.currentRecordedCashBalance, 5000);
  assert.equal(fin.protectedReserve, 2500);
  assert.equal(fin.unreleasedContingency, 1000);
  // $2,500 protected + $1,000 unreleased contingency = $3,500 restricted -> $1,500 available discretionary
  assert.equal(fin.totalRestrictedFunds, 3500);
  assert.equal(fin.availableDiscretionaryCash, 1500);
  assert.equal(fin.revenueRemainingToTarget, 20000);
});

test('Duplicate milestone payment guard prevents counting the same milestone twice', () => {
  const realState = createInitialRealState();
  realState.transactions.push({
    id: 'tx-1',
    date: '2026-10-28',
    dayNumber: 2,
    type: TransactionType.REVENUE_DEPOSIT,
    bucket: BudgetBucket.REVENUE_INFLOW,
    amount: 750,
    description: '50% Upfront Website Deposit',
    category: 'Offer A: Small-business website',
    relatedProposalId: 'prop-1',
    relatedMilestoneId: 'ms-1a',
  });

  const checkExisting = canRecordMilestonePayment(realState.transactions, 'prop-1', 'ms-1a');
  assert.equal(checkExisting.allowed, false);

  const checkUnpaid = canRecordMilestonePayment(realState.transactions, 'prop-1', 'ms-1b');
  assert.equal(checkUnpaid.allowed, true);
});

test('Expense reserve warning flags expenses that breach protected reserve or Day 2 ad spend rule', () => {
  const realState = createInitialRealState();
  realState.settings.currentDayOverride = 1;
  const adWarning = checkExpenseReserveWarning(realState, 400, BudgetBucket.AD_TEST);
  assert.equal(adWarning.hasWarning, true);
  assert.ok(adWarning.warnings.some((w) => w.includes('DAY 2 CHECKPOINT RULE')));

  const reserveBreach = checkExpenseReserveWarning(realState, 3000, BudgetBucket.OPERATING_DELIVERY);
  assert.equal(reserveBreach.hasWarning, true);
  assert.ok(reserveBreach.warnings.some((w) => w.includes('RESERVE VIOLATION WARNING')));
});

test('Delivery capacity guard triggers when active concurrent projects reach maximum threshold', () => {
  const state = createInitialRealState();
  state.settings.maxConcurrentActiveProjects = 1;
  state.projects.push({
    id: 'proj-1',
    proposalId: 'prop-1',
    prospectId: 'pros-1',
    customerName: 'Test Client',
    offerCode: 'OFFER_A',
    projectTitle: '5-Page Website',
    agreedScope: '5-page build',
    contractedValue: 1500,
    clearedCashCollected: 750,
    remainingBalance: 750,
    status: DeliveryStatus.IN_PROGRESS,
    milestones: [],
    customerDependencies: 'None',
    revisionsAllowed: 2,
    revisionsUsed: 0,
    estimatedHours: 10,
    actualHoursLogged: 2,
    directCostsIncurred: 0,
    startDate: '2026-10-28',
    targetDeliveryDate: '2026-11-02',
    supportObligations: 'Standard launch check',
  });
  const cap = evaluateDeliveryCapacity(state);
  assert.equal(cap.activeProjectCount, 1);
  assert.equal(cap.isCapacityExhausted, true);
});

test('Scenario projection distinguishes Conservative, Base (excluding Offer C), and $20,000 Stretch cases', () => {
  const realState = createInitialRealState();
  const conservative = calculateScenarioProjection(realState.scenarios[0]);
  const base = calculateScenarioProjection(realState.scenarios[1]);
  const stretch = calculateScenarioProjection(realState.scenarios[2]);

  assert.equal(conservative.totalProjectedGrossRevenue, 4 * 1500 + 2 * 1000); // $8,000
  assert.equal(base.totalProjectedGrossRevenue, 6 * 1500 + 3 * 1000); // $12,000 (Offer C excluded)
  assert.equal(stretch.totalProjectedGrossRevenue, 8 * 1500 + 4 * 1000 + 20 * 200); // $20,000
});

test('Funnel analytics flags small sample size accurately', () => {
  const realState = createInitialRealState();
  const analytics = computeFunnelAnalytics(realState);
  assert.equal(analytics.isStatisticallyReliable, false);
  assert.ok(analytics.sampleSizeWarning.includes('LOW SAMPLE SIZE NOTICE'));
  assert.equal(analytics.dealsWon, 0);
});

test('Import sanitization deduplicates financial records', () => {
  const realState = createInitialRealState();
  const sampleTx = {
    id: 'tx-100',
    date: '2026-10-27',
    dayNumber: 1,
    type: TransactionType.REVENUE_DEPOSIT,
    bucket: BudgetBucket.REVENUE_INFLOW,
    amount: 750,
    description: 'Deposit',
    category: 'Offer A: Small-business website',
    relatedProposalId: 'prop-1',
    relatedMilestoneId: 'ms-1',
  };
  const dupMilestoneTx = {
    ...sampleTx,
    id: 'tx-101-dup-milestone',
  };
  const stateWithDups = {
    ...realState,
    transactions: [sampleTx, sampleTx, dupMilestoneTx],
  };

  const cleanRes = sanitizeAndDeduplicateImportState(stateWithDups, false);
  assert.equal(cleanRes.allowed, true);
  assert.equal(cleanRes.deduplicatedTransactionsCount, 2);
  assert.equal(cleanRes.sanitizedState?.transactions.length, 1);
  const fin = calculateFinancialSummary(cleanRes.sanitizedState!);
  assert.equal(fin.grossClearedRevenue, 750);
  assert.equal(fin.currentRecordedCashBalance, 5750);
});

test('buildRevenueTrajectorySeries generates 30 days comparing cumulative Revenue Collected vs 30-Day Target baseline', () => {
  const realState = createInitialRealState();
  const series = buildRevenueTrajectorySeries(realState);
  assert.equal(series.length, 30);
  assert.equal(series[0].day, 1);
  assert.equal(series[0].revenueCollected, 0);
  assert.equal(series[29].targetBaseline, 20000);
});
