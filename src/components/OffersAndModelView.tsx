import React, { useState } from 'react';
import {
  CampaignState,
  OfferDefinition,
  ProposalStatus,
  ScenarioConfig,
} from '../types';
import {
  calculateFinancialSummary,
  calculateScenarioProjection,
} from '../utils/calculations';
import { AlertTriangle, Check, Sliders } from 'lucide-react';

interface OffersAndModelViewProps {
  state: CampaignState;
  onUpdateOffer: (offer: OfferDefinition) => void;
  onUpdateScenario: (scenario: ScenarioConfig) => void;
}

export const OffersAndModelView: React.FC<OffersAndModelViewProps> = ({
  state,
  onUpdateOffer,
  onUpdateScenario,
}) => {
  const [activeScenarioId, setActiveScenarioId] = useState<'conservative' | 'base' | 'stretch'>('stretch');

  const fin = calculateFinancialSummary(state);
  const activeScenario =
    state.scenarios.find((s) => s.id === activeScenarioId) || state.scenarios[2];
  const projection = calculateScenarioProjection(activeScenario);

  // Compute actual sold, collected, and remaining contracted per offer
  const getOfferActuals = (code: 'OFFER_A' | 'OFFER_B' | 'OFFER_C') => {
    const matchingProposals = state.proposals.filter(
      (p) =>
        (p.offerCode === code || (code !== 'OFFER_C' && p.offerCode === 'OFFER_A_AND_B')) &&
        (p.status === ProposalStatus.ACCEPTED ||
          p.status === ProposalStatus.DEPOSIT_PAID ||
          p.status === ProposalStatus.PAID_IN_FULL)
    );
    const unitsSold = matchingProposals.length;

    const labelMatch =
      code === 'OFFER_A' ? 'Offer A' : code === 'OFFER_B' ? 'Offer B' : 'Offer C';
    const cashCollected = state.transactions
      .filter((tx) => tx.category.includes(labelMatch) && tx.type !== 'Business Expense')
      .reduce((a, b) => a + b.amount, 0);

    const matchingProjects = state.projects.filter(
      (proj) =>
        proj.offerCode === code || (code !== 'OFFER_C' && proj.offerCode === 'OFFER_A_AND_B')
    );
    const remainingContracted = matchingProjects.reduce(
      (a, b) => a + b.remainingBalance,
      0
    );

    return {
      unitsSold,
      cashCollected,
      remainingContracted,
      activeFulfillmentCount: matchingProjects.length,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-sky-400">
              PDF SECTION 1 &amp; SECTION 3 · OFFERS &amp; REVENUE MODEL
            </p>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">
              What You Actually Sell &amp; 30-Day Scenario Planner
            </h1>
          </div>
          <div className="text-right font-mono">
            <p className="text-xs text-slate-400">30-Day Stretch Gross Revenue Target</p>
            <p className="text-xl font-bold text-slate-100 tabular-nums">
              ${state.settings.revenueTarget.toLocaleString()}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
          <strong>PDF Core Strategy:</strong> &ldquo;Make small-business websites the primary revenue engine ($1,500 × 8 = $12,000), AI automation the upsell ($1,000 × 4 = $4,000), and The Youniverse the flagship alpha launch ($200 × 20 = $4,000). The website and automation targets require selling and delivering 12 client projects in a month. Standardized templates, strict scope, deposits, and a carefully controlled delivery queue are essential.&rdquo;
        </p>
      </div>

      {/* Strict 9-Way Financial Distinction Matrix */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">
            Strict Accounting Separation (Never Confuse Proposals or Deposits With Profit)
          </h2>
          <span className="text-xs font-mono text-slate-400">Live Ledger Totals</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
          {[
            { label: 'Target Revenue', val: state.settings.revenueTarget, tone: 'text-slate-200' },
            { label: 'Proposed (Unaccepted)', val: fin.proposedRevenueUnaccepted, tone: 'text-slate-400' },
            { label: 'Signed Contract Value', val: fin.signedContractValueTotal, tone: 'text-sky-400' },
            { label: 'Outstanding Receivables', val: fin.outstandingContractReceivables, tone: 'text-amber-300' },
            { label: 'Cleared Cash Received', val: fin.grossClearedRevenue, tone: 'text-emerald-400' },
            { label: 'Refunds Issued', val: fin.totalRefundsPaid, tone: 'text-rose-400' },
            { label: 'Business Expenses', val: fin.totalExpensesPaid, tone: 'text-rose-300' },
            { label: 'Est. Operating Profit', val: fin.estimatedNetOperatingResult, tone: 'text-slate-100' },
            {
              label: 'Reserved for Obligations',
              val: fin.totalRestrictedFunds + fin.unearnedDepositObligations,
              tone: 'text-amber-400',
            },
          ].map((item) => (
            <div key={item.label} className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <p className="text-xs text-slate-400 leading-tight">{item.label}</p>
              <p className={`text-sm font-bold font-mono tabular-nums mt-1.5 ${item.tone}`}>
                ${item.val.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* The 3 Offers From PDF Section 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {state.offers.map((offer) => {
          const actuals = getOfferActuals(offer.code);
          const stretchTotal = offer.price * offer.targetUnitSales;

          return (
            <div
              key={offer.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-sky-400">{offer.validationStatus}</p>
                    <h3 className="text-base font-bold text-slate-100 mt-0.5">{offer.name}</h3>
                  </div>
                  <span className="text-lg font-bold font-mono tabular-nums text-emerald-400">
                    ${offer.price.toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{offer.subtitle}</p>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-xs">
                  <p className="text-slate-300">
                    <strong className="text-slate-100">Target Buyer:</strong> {offer.targetCustomer}
                  </p>
                  <p className="text-slate-300">
                    <strong className="text-slate-100">Problem Solved:</strong> {offer.problemSolved}
                  </p>
                  <p className="text-slate-300">
                    <strong className="text-slate-100">Payment Rule:</strong> {offer.paymentStructure}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-200 mb-1">
                    Included Deliverables &amp; Scope:
                  </p>
                  <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                    {offer.deliverables.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold text-rose-300 mb-1">
                    Strict Scope Exclusions (PDF Guardrails):
                  </p>
                  <ul className="space-y-1 text-xs text-slate-400 list-disc pl-4">
                    {offer.exclusions.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <label className="text-slate-400">
                    Unit Price ($):
                    <input
                      type="number"
                      value={offer.price}
                      onChange={(e) =>
                        onUpdateOffer({ ...offer, price: Number(e.target.value) || 0 })
                      }
                      className="mt-1 w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100"
                    />
                  </label>
                  <label className="text-slate-400">
                    Target Units:
                    <input
                      type="number"
                      value={offer.targetUnitSales}
                      onChange={(e) =>
                        onUpdateOffer({
                          ...offer,
                          targetUnitSales: Number(e.target.value) || 0,
                        })
                      }
                      className="mt-1 w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100"
                    />
                  </label>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1 text-xs font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stretch Model Target:</span>
                    <span className="text-slate-100">
                      {offer.targetUnitSales} units (${stretchTotal.toLocaleString()})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Actual Units Sold:</span>
                    <span className="text-sky-400">{actuals.unitsSold} sold</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cleared Cash Collected:</span>
                    <span className="text-emerald-400">${actuals.cashCollected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Remaining Contracted:</span>
                    <span className="text-amber-300">
                      ${actuals.remainingContracted.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Scenario Planner: Conservative vs. Base vs. Stretch */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
              <Sliders className="w-4 h-4" />
              <span>INTERACTIVE SCENARIO &amp; CAPACITY MODELER</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-1">
              Test Pipeline Volume, Conversion Assumptions, and Solo Delivery Capacity
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            {state.scenarios.map((scen) => (
              <button
                key={scen.id}
                type="button"
                onClick={() => setActiveScenarioId(scen.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeScenarioId === scen.id
                    ? 'bg-sky-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                {scen.id === 'conservative'
                  ? 'Conservative ($8k)'
                  : scen.id === 'base'
                    ? 'Base Case ($12k)'
                    : 'Stretch Target ($20k)'}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-300">{activeScenario.description}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editable Inputs */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                30-Day Outbound Attempts (PDF: 400–500)
              </label>
              <input
                type="number"
                value={activeScenario.outboundAttempts}
                onChange={(e) =>
                  onUpdateScenario({
                    ...activeScenario,
                    outboundAttempts: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Attempt → Conversation % (PDF: ~20–24%)
              </label>
              <input
                type="number"
                step="0.5"
                value={activeScenario.conversationRatePercent}
                onChange={(e) =>
                  onUpdateScenario({
                    ...activeScenario,
                    conversationRatePercent: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Proposal → Close % (PDF: 33–40%)
              </label>
              <input
                type="number"
                step="0.5"
                value={activeScenario.closeRatePercent}
                onChange={(e) =>
                  onUpdateScenario({
                    ...activeScenario,
                    closeRatePercent: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Offer A Website Units Sold
              </label>
              <input
                type="number"
                value={activeScenario.offerAVolume}
                onChange={(e) =>
                  onUpdateScenario({
                    ...activeScenario,
                    offerAVolume: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Offer B Automation Upsell Units
              </label>
              <input
                type="number"
                value={activeScenario.offerBVolume}
                onChange={(e) =>
                  onUpdateScenario({
                    ...activeScenario,
                    offerBVolume: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Weekly Delivery Hours Available
              </label>
              <input
                type="number"
                value={activeScenario.availableWeeklyDeliveryHours}
                onChange={(e) =>
                  onUpdateScenario({
                    ...activeScenario,
                    availableWeeklyDeliveryHours: Number(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-100"
              />
            </div>

            <div className="sm:col-span-3 pt-2 border-t border-slate-800 flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeScenario.includeOfferCInTotal}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...activeScenario,
                      includeOfferCInTotal: e.target.checked,
                    })
                  }
                  className="rounded border-slate-700 bg-slate-900"
                />
                <span>
                  Include Offer C ($200 × {activeScenario.offerCVolume} Youniverse Alpha Packages = $
                  {(activeScenario.offerCVolume * activeScenario.offerCPrice).toLocaleString()}) in Scenario Revenue Total
                </span>
              </label>
            </div>
          </div>

          {/* Scenario Output Summary */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
            <h3 className="text-sm font-sans font-bold text-slate-100">
              Scenario Output &amp; Capacity Check
            </h3>
            <div className="space-y-1.5 pt-2 border-t border-slate-800 tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Expected Conversations:</span>
                <span className="text-slate-200">{projection.expectedConversations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expected Qualified:</span>
                <span className="text-slate-200">{projection.expectedQualified}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expected 10-Min Demos:</span>
                <span className="text-slate-200">{projection.expectedDemos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expected Written Proposals:</span>
                <span className="text-slate-200">{projection.expectedProposals}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Offer A Revenue:</span>
                <span className="text-sky-400">${projection.projectedOfferARevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Offer B Revenue:</span>
                <span className="text-emerald-400">${projection.projectedOfferBRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Offer C Alpha Included:</span>
                <span className="text-amber-300">${projection.projectedOfferCRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold">
                <span className="text-slate-100">Scenario Gross Total:</span>
                <span className="text-emerald-400">
                  ${projection.totalProjectedGrossRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Est. Fulfillment Workload:</span>
                <span
                  className={
                    projection.isOverCapacity ? 'text-rose-400 font-bold' : 'text-slate-200'
                  }
                >
                  {projection.totalEstimatedDeliveryHours}h / {projection.monthlyAvailableHours}h (
                  {projection.capacityUtilizationPercent}%)
                </span>
              </div>
            </div>

            {projection.isOverCapacity && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-800 rounded text-rose-200 font-sans text-xs">
                <strong>Delivery Overload Warning:</strong> This volume requires{' '}
                {projection.totalEstimatedDeliveryHours} delivery hours, exceeding your{' '}
                {projection.monthlyAvailableHours}h monthly capacity. Use standardized templates or reduce custom scope.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
