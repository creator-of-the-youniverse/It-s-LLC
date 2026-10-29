import React, { useState } from 'react';
import {
  BudgetBucket,
  CampaignSettings,
  CampaignState,
  FinancialTransaction,
  TransactionType,
} from '../types';
import {
  calculateFinancialSummary,
  checkExpenseReserveWarning,
  getActiveCampaignDay,
} from '../utils/calculations';
import { ShieldAlert, Plus, DollarSign, Lock, Unlock } from 'lucide-react';

interface CashAndCapitalViewProps {
  state: CampaignState;
  onAddTransaction: (tx: FinancialTransaction) => void;
  onUpdateSettings: (settings: CampaignSettings) => void;
}

export const CashAndCapitalView: React.FC<CashAndCapitalViewProps> = ({
  state,
  onAddTransaction,
  onUpdateSettings,
}) => {
  const activeDay = getActiveCampaignDay(
    state.settings.startDate,
    state.settings.currentDayOverride
  );
  const todayStr = new Date().toISOString().slice(0, 10);
  const fin = calculateFinancialSummary(state);

  const [txType, setTxType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [bucket, setBucket] = useState<BudgetBucket>(BudgetBucket.OPERATING_DELIVERY);
  const [amount, setAmount] = useState<number>(50);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Operating / Delivery Costs');
  const [notes, setNotes] = useState('');

  const reserveWarningCheck =
    txType === TransactionType.EXPENSE
      ? checkExpenseReserveWarning(state, amount, bucket)
      : { hasWarning: false, warnings: [] };

  const handleRecordTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    const newTx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      date: todayStr,
      dayNumber: activeDay,
      type: txType,
      bucket:
        txType === TransactionType.EXPENSE || txType === TransactionType.REFUND
          ? bucket
          : BudgetBucket.REVENUE_INFLOW,
      amount: Number(amount),
      description: description.trim(),
      category: category.trim(),
      notes: notes.trim(),
    };

    onAddTransaction(newTx);
    setDescription('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-sky-400">
            PDF SECTION 6 · CASH-FLOW CHECKPOINTS FOR THE $5,000 WORKING CAPITAL
          </p>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            Cash &amp; Capital Allocation, Protected Reserves &amp; Auditable Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            PDF Capital Rule: &ldquo;The reserve ($2,500) and contingency ($1,000) together account for $3,500 that should not be casually spent. You do not need to use the entire allocation. If your housing or essential expenses depend on this money, protect those obligations first.&rdquo;
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onUpdateSettings({
              ...state.settings,
              contingencyReleased: !state.settings.contingencyReleased,
            })
          }
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
            state.settings.contingencyReleased
              ? 'bg-amber-950/60 border-amber-700 text-amber-300'
              : 'bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          {state.settings.contingencyReleased ? (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span>$1,000 Contingency Released (Lock Again)</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>$1,000 Contingency Locked (Release When Justified)</span>
            </>
          )}
        </button>
      </div>

      {/* Explicit Auditable Balance Formula Strip */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-100">
            Auditable Cash &amp; Discretionary Balance Formula
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Every transaction recorded once · Derived directly from ledger
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 font-mono tabular-nums">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 font-sans">1. Starting Cash</p>
            <p className="text-base font-bold text-slate-100 mt-1">
              ${fin.startingWorkingCapital.toLocaleString()}
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 font-sans">2. + Cleared Inflows</p>
            <p className="text-base font-bold text-emerald-400 mt-1">
              +${fin.grossClearedRevenue.toLocaleString()}
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 font-sans">3. − Outflows &amp; Refunds</p>
            <p className="text-base font-bold text-rose-400 mt-1">
              −${(fin.totalExpensesPaid + fin.totalRefundsPaid).toLocaleString()}
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-sky-800/80 rounded-lg">
            <p className="text-xs text-sky-300 font-sans">= Recorded Cash Balance</p>
            <p className="text-base font-bold text-slate-100 mt-1">
              ${fin.currentRecordedCashBalance.toLocaleString()}
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 font-sans">4. − Protected &amp; Contingency</p>
            <p className="text-base font-bold text-amber-300 mt-1">
              −${fin.totalRestrictedFunds.toLocaleString()}
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 font-sans">5. − Unearned Deposits</p>
            <p className="text-base font-bold text-amber-400 mt-1">
              −${fin.unearnedDepositObligations.toLocaleString()}
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-emerald-800/80 rounded-lg">
            <p className="text-xs text-emerald-300 font-sans">= Discretionary Business Cash</p>
            <p className="text-base font-bold text-emerald-400 mt-1">
              ${fin.availableDiscretionaryCash.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* PDF Section 6 Starting $5,000 Allocation Table vs Actual Spend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <h2 className="text-base font-bold text-slate-100">
            PDF Section 6 Capital Allocation Buckets ($5,000 Total)
          </h2>

          <div className="space-y-3">
            {[
              {
                name: 'Protected reserve',
                bucketKey: BudgetBucket.PROTECTED_RESERVE,
                allocated: state.settings.protectedReserve,
                note: 'Strictly protected capital floor ($2,500 PDF default)',
              },
              {
                name: 'Necessary delivery and operating costs',
                bucketKey: BudgetBucket.OPERATING_DELIVERY,
                allocated: state.settings.operatingBudget,
                note: 'Hosting, domains, and essential fulfillment tools ($750 PDF)',
              },
              {
                name: 'Sales assets and prospecting',
                bucketKey: BudgetBucket.SALES_PROSPECTING,
                allocated: state.settings.salesAssetsBudget,
                note: 'Prospect lists, phone/dialer, demo assets ($250 PDF)',
              },
              {
                name: 'Initial advertising test',
                bucketKey: BudgetBucket.AD_TEST,
                allocated: state.settings.adTestBudget,
                note: 'Hold on Day 1–2 ("No major ad spend" until offer converts) ($500 PDF)',
              },
              {
                name: 'Contingency, released only when justified',
                bucketKey: BudgetBucket.CONTINGENCY,
                allocated: state.settings.contingencyBudget,
                note: state.settings.contingencyReleased
                  ? 'Currently unlocked for validated channel expansion'
                  : 'Currently locked ($1,000 PDF)',
              },
            ].map((b) => {
              const spent = fin.spendByBucket[b.bucketKey] || 0;
              const remaining = Math.max(0, b.allocated - spent);
              return (
                <div
                  key={b.name}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-100">{b.name}</span>
                    <span className="font-mono tabular-nums text-slate-300">
                      Spent: <strong className="text-rose-400">${spent.toLocaleString()}</strong> /
                      Allocated: ${b.allocated.toLocaleString()} (Rem: ${remaining.toLocaleString()})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{b.note}</p>
                </div>
              );
            })}
          </div>

          {/* Essential Living Protection Control */}
          <div className="p-3.5 bg-slate-950 border border-amber-800/70 rounded-lg flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs">
              <p className="font-semibold text-amber-300">
                Essential Living Obligations Protection (Housing, Food, Transport)
              </p>
              <p className="text-slate-400">
                PDF Rule: &ldquo;If your housing or essential expenses depend on this money, protect those obligations first.&rdquo;
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">$</span>
              <input
                aria-label="Essential living protected amount"
                type="number"
                value={state.settings.essentialLivingProtectedAmount}
                onChange={(e) =>
                  onUpdateSettings({
                    ...state.settings,
                    essentialLivingProtectedAmount: Number(e.target.value) || 0,
                  })
                }
                className="w-28 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Record Expense, Refund, or Revenue Transaction Form */}
        <form
          onSubmit={handleRecordTransaction}
          className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 h-fit"
        >
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Record Financial Transaction (Single Authoritative Ledger)
            </h2>
            <p className="text-xs text-slate-400">
              Record business expenses, refunds, or direct revenue inflows. Milestone payments on proposals should be recorded in the Proposals tab so they automatically link to client milestones.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="tx-type" className="block text-xs text-slate-300 mb-1">
                Transaction Type
              </label>
              <select
                id="tx-type"
                value={txType}
                onChange={(e) => setTxType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              >
                <option value={TransactionType.EXPENSE}>Business Expense (Outflow)</option>
                <option value={TransactionType.REVENUE_DEPOSIT}>Deposit Received (50% Inflow)</option>
                <option value={TransactionType.REVENUE_MILESTONE}>Milestone / Final Payment (Inflow)</option>
                <option value={TransactionType.REVENUE_FULL}>Full Package Payment (Inflow)</option>
                <option value={TransactionType.REFUND}>Customer Refund (Outflow)</option>
              </select>
            </div>

            <div>
              <label htmlFor="tx-amount" className="block text-xs text-slate-300 mb-1">
                Amount ($)
              </label>
              <input
                id="tx-amount"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
              />
            </div>

            {txType === TransactionType.EXPENSE && (
              <div>
                <label htmlFor="tx-bucket" className="block text-xs text-slate-300 mb-1">
                  Capital Allocation Bucket
                </label>
                <select
                  id="tx-bucket"
                  value={bucket}
                  onChange={(e) => setBucket(e.target.value as BudgetBucket)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                >
                  <option value={BudgetBucket.OPERATING_DELIVERY}>
                    Necessary delivery &amp; operating ($750)
                  </option>
                  <option value={BudgetBucket.SALES_PROSPECTING}>
                    Sales assets &amp; prospecting ($250)
                  </option>
                  <option value={BudgetBucket.AD_TEST}>Initial advertising test ($500)</option>
                  <option value={BudgetBucket.CONTINGENCY}>Contingency ($1,000)</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="tx-cat" className="block text-xs text-slate-300 mb-1">
                Category / Offer Tag
              </label>
              <input
                id="tx-cat"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Offer A: Small-business website, Hosting..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="tx-desc" className="block text-xs text-slate-300 mb-1">
                Description *
              </label>
              <input
                id="tx-desc"
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Domain & form infrastructure for client build"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>
          </div>

          {/* Real-Time Reserve Violation Guard */}
          {reserveWarningCheck.hasWarning && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-700 rounded-lg space-y-1.5 text-xs text-rose-200">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Capital Reserve &amp; PDF Spend Guardrail Warning:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1">
                {reserveWarningCheck.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300"
          >
            <Plus className="w-4 h-4" />
            <span>Record Transaction in Ledger</span>
          </button>
        </form>
      </div>

      {/* Authoritative Financial Ledger Table */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-100">
            Authoritative Financial Transaction Ledger ({state.transactions.length} Entries)
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Est. Tax Reserve ({state.settings.estimatedTaxRatePercent}% of net operating result): $
            {fin.estimatedTaxReserve.toLocaleString()}
          </span>
        </div>

        {state.transactions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No transactions recorded yet. Starting working capital of ${fin.startingWorkingCapital.toLocaleString()} is intact.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3 font-medium">Date (Day)</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Bucket / Category</th>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {[...state.transactions].reverse().map((tx) => {
                const isOutflow =
                  tx.type === TransactionType.EXPENSE || tx.type === TransactionType.REFUND;
                return (
                  <tr key={tx.id}>
                    <td className="py-2.5 pr-3 font-mono whitespace-nowrap">
                      {tx.date} (Day {tx.dayNumber})
                    </td>
                    <td className="py-2.5 pr-3 font-mono">
                      <span className={isOutflow ? 'text-rose-400' : 'text-emerald-400'}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-300">
                      {tx.bucket} · {tx.category}
                    </td>
                    <td className="py-2.5 pr-3">{tx.description}</td>
                    <td
                      className={`py-2.5 text-right font-mono tabular-nums font-semibold ${
                        isOutflow ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {isOutflow ? '−' : '+'}${tx.amount.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
