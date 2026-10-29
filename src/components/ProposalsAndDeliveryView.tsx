import React, { useState } from 'react';
import {
  CampaignState,
  DeliveryStatus,
  FulfillmentProject,
  Proposal,
  ProposalStatus,
  TeamMember,
} from '../types';
import {
  canRecordMilestonePayment,
  evaluateDeliveryCapacity,
} from '../utils/calculations';
import { Plus, Printer, DollarSign, AlertTriangle, CheckCircle2, Hand, Bell } from 'lucide-react';
import { NotificationPresetTarget } from './CreateNotificationModal';

interface ProposalsAndDeliveryViewProps {
  state: CampaignState;
  mode: 'proposals' | 'delivery';
  activeMember?: TeamMember;
  onClaimProposal?: (proposalId: string) => void;
  onClaimDeliveryMilestone?: (projectId: string, milestoneId: string) => void;
  onAddProposal: (proposal: Proposal) => void;
  onUpdateProposalStatus: (proposalId: string, newStatus: ProposalStatus) => void;
  onCollectMilestonePayment: (proposalId: string, milestoneId: string) => void;
  onUpdateProject: (project: FulfillmentProject) => void;
  onApplyNotificationPreset?: (preset: NotificationPresetTarget) => void;
}

export const ProposalsAndDeliveryView: React.FC<ProposalsAndDeliveryViewProps> = ({
  state,
  mode,
  activeMember,
  onClaimProposal,
  onClaimDeliveryMilestone,
  onAddProposal,
  onUpdateProposalStatus,
  onCollectMilestonePayment,
  onUpdateProject,
  onApplyNotificationPreset,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const capacity = evaluateDeliveryCapacity(state);

  const [showProposalForm, setShowProposalForm] = useState(false);
  const [previewProposalId, setPreviewProposalId] = useState<string | null>(
    state.proposals[0]?.id || null
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Proposal Builder Form State
  const [selectedProspectId, setSelectedProspectId] = useState<string>(
    state.prospects[0]?.id || ''
  );
  const [offerCode, setOfferCode] = useState<'OFFER_A' | 'OFFER_B' | 'OFFER_A_AND_B' | 'OFFER_C'>('OFFER_A');
  const [title, setTitle] = useState('Fixed-Scope Small-Business Website ($1,500)');
  const [scopeSummary, setScopeSummary] = useState(
    '5-page mobile-responsive business website with direct quote-request functionality, basic on-page SEO, analytics setup, and 2 structured revision rounds.'
  );
  const [totalPrice, setTotalPrice] = useState(1500);
  const [timeline, setTimeline] = useState('5 business days');

  const handleOfferSelectionChange = (code: 'OFFER_A' | 'OFFER_B' | 'OFFER_A_AND_B' | 'OFFER_C') => {
    setOfferCode(code);
    if (code === 'OFFER_A') {
      setTitle('Fixed-Scope Small-Business Website ($1,500)');
      setTotalPrice(1500);
      setTimeline('5 business days');
      setScopeSummary(
        'Defined 5-page mobile-responsive website, quote-request form, basic on-page SEO, analytics, and 2 structured revision rounds.'
      );
    } else if (code === 'OFFER_B') {
      setTitle('Lead Follow-Up Automation Setup ($1,000)');
      setTotalPrice(1000);
      setTimeline('3 business days');
      setScopeSummary(
        'Automated missed-call and web-inquiry instant SMS/email response workflow with lead tracking sheet.'
      );
    } else if (code === 'OFFER_A_AND_B') {
      setTitle('Fixed-Scope Website + Lead Follow-Up Automation ($2,500)');
      setTotalPrice(2500);
      setTimeline('6 business days');
      setScopeSummary(
        'Complete 5-page mobile website ($1,500) plus instant missed-inquiry follow-up automation ($1,000).'
      );
    } else {
      setTitle('The Youniverse Founding Package ($200)');
      setTotalPrice(200);
      setTimeline('1 business day');
      setScopeSummary('Founding early-adopter alpha package with defined, supportable deliverables.');
    }
  };

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    const prospect = state.prospects.find((p) => p.id === selectedProspectId);
    const customerName = prospect?.businessName || 'Prospective Client';
    const contactName = prospect?.contactName || 'Owner';

    const half = Math.round(totalPrice * 0.5);
    const remainder = totalPrice - half;

    const newProp: Proposal = {
      id: `prop-${Date.now()}`,
      prospectId: prospect?.id || `adhoc-${Date.now()}`,
      customerName,
      contactName,
      offerCode,
      title,
      scopeSummary,
      deliverables:
        offerCode === 'OFFER_C'
          ? ['Verified Youniverse Alpha Claim & Onboarding', 'Founding Member Package Deliverables']
          : [
              'Defined page count (up to 5 mobile-responsive pages)',
              'Direct customer contact & quote-request form',
              'Basic on-page SEO & analytics tracking',
              '2 structured revision rounds before launch',
              ...(offerCode.includes('B')
                ? ['Automated missed-inquiry instant follow-up workflow']
                : []),
            ],
      exclusions: [
        'No unlimited revisions',
        'No custom software development or unquoted ERP integrations',
        'Third-party usage fees (e.g. SMS carrier rates) billed directly to client',
      ],
      revisionAllowance: '2 structured revision rounds',
      totalPrice,
      milestones:
        offerCode === 'OFFER_C'
          ? [
              {
                id: `ms-${Date.now()}-1`,
                label: '100% Founding Package Payment',
                amount: totalPrice,
                dueDescription: 'Upon founding package order',
                isPaid: false,
              },
            ]
          : [
              {
                id: `ms-${Date.now()}-1`,
                label: `50% Upfront Deposit ($${half.toLocaleString()})`,
                amount: half,
                dueDescription: 'Upon written proposal acceptance prior to project kickoff',
                isPaid: false,
              },
              {
                id: `ms-${Date.now()}-2`,
                label: `50% Completion Milestone ($${remainder.toLocaleString()})`,
                amount: remainder,
                dueDescription: 'Upon agreed milestone delivery and staging verification',
                isPaid: false,
              },
            ],
      estimatedDeliveryTimeline: timeline,
      expirationDate: todayStr,
      createdAt: todayStr,
      status: ProposalStatus.SENT,
      notes: 'Prepared using PDF Day 1 Checklist #4 one-page proposal format.',
    };

    onAddProposal(newProp);
    setPreviewProposalId(newProp.id);
    setShowProposalForm(false);
  };

  const handleRecordMilestoneClick = (proposalId: string, milestoneId: string) => {
    const check = canRecordMilestonePayment(state.transactions, proposalId, milestoneId);
    if (!check.allowed) {
      setPaymentError(check.reason || 'Duplicate payment blocked.');
      return;
    }
    setPaymentError(null);
    onCollectMilestonePayment(proposalId, milestoneId);
  };

  const previewProposal =
    state.proposals.find((p) => p.id === previewProposalId) || state.proposals[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-sky-400">
            PDF SECTION 3, 6 &amp; 10 ·{' '}
            {mode === 'proposals' ? 'PROPOSALS, DEALS & 50% DEPOSITS' : 'DELIVERY, FULFILLMENT & CAPACITY'}
          </p>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            {mode === 'proposals'
              ? 'One-Page Written Proposals, Milestones & Cleared Deposit Tracking'
              : 'Client Fulfillment Queue, Delivery Milestones & Capacity Guard'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            PDF Payment Rule: &ldquo;For a $1,500 project, a 50% deposit means $750 collected upfront. The remaining $750 is collected at the agreed milestone. Do not take deposits for work you lack the capacity or intention to deliver.&rdquo;
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowProposalForm(!showProposalForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Draft 1-Page Proposal</span>
          </button>
        </div>
      </div>

      {/* Capacity Warning Banner */}
      <div
        className={`p-4 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
          capacity.isCapacityExhausted
            ? 'bg-rose-950/40 border-rose-800 text-rose-200'
            : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle
            className={`w-4 h-4 shrink-0 ${
              capacity.isCapacityExhausted ? 'text-rose-400' : 'text-amber-400'
            }`}
          />
          <span>{capacity.statusMessage}</span>
        </div>
        <span className="font-mono">
          Active Queue: {capacity.activeProjectCount}/{capacity.maxConcurrentAllowed} Projects
        </span>
      </div>

      {paymentError && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-700 rounded-lg text-xs text-rose-200 flex items-center justify-between">
          <span>{paymentError}</span>
          <button
            type="button"
            onClick={() => setPaymentError(null)}
            className="text-rose-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Draft Proposal Form */}
      {showProposalForm && (
        <form
          onSubmit={handleCreateProposal}
          className="p-5 bg-slate-900 border border-sky-800 rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100">
              Create One-Page Fixed-Scope Proposal (Day 1 Checklist #4 Format)
            </h2>
            <button
              type="button"
              onClick={() => setShowProposalForm(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label htmlFor="prop-prospect" className="block text-xs text-slate-300 mb-1">
                Select Customer / Prospect
              </label>
              <select
                id="prop-prospect"
                value={selectedProspectId}
                onChange={(e) => setSelectedProspectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              >
                {state.prospects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.businessName} ({p.contactName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prop-offer" className="block text-xs text-slate-300 mb-1">
                Offer Package
              </label>
              <select
                id="prop-offer"
                value={offerCode}
                onChange={(e) =>
                  handleOfferSelectionChange(
                    e.target.value as 'OFFER_A' | 'OFFER_B' | 'OFFER_A_AND_B' | 'OFFER_C'
                  )
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              >
                <option value="OFFER_A">Offer A: Website ($1,500)</option>
                <option value="OFFER_B">Offer B: Lead Automation ($1,000)</option>
                <option value="OFFER_A_AND_B">Offer A + B Bundle ($2,500)</option>
                <option value="OFFER_C">Offer C: Youniverse Alpha ($200)</option>
              </select>
            </div>

            <div>
              <label htmlFor="prop-price" className="block text-xs text-slate-300 mb-1">
                Total Fixed Price ($)
              </label>
              <input
                id="prop-price"
                type="number"
                value={totalPrice}
                onChange={(e) => setTotalPrice(Number(e.target.value) || 1500)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="prop-timeline" className="block text-xs text-slate-300 mb-1">
                Delivery Timeline
              </label>
              <input
                id="prop-timeline"
                type="text"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="prop-scope" className="block text-xs text-slate-300 mb-1">
                Agreed Fixed Scope Summary
              </label>
              <textarea
                id="prop-scope"
                rows={2}
                value={scopeSummary}
                onChange={(e) => setScopeSummary(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300"
            >
              Generate Written Proposal &amp; Milestones
            </button>
          </div>
        </form>
      )}

      {mode === 'proposals' ? (
        /* PROPOSALS & PRINTABLE ONE-PAGE PREVIEW */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proposals List */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-100">
              All Proposals &amp; Payment Milestones ({state.proposals.length})
            </h2>

            {state.proposals.length === 0 ? (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                No proposals created yet. Click &ldquo;Draft 1-Page Proposal&rdquo; above to create your first fixed-scope quote.
              </div>
            ) : (
              state.proposals.map((prop) => (
                <div
                  key={prop.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    previewProposal?.id === prop.id
                      ? 'bg-slate-900 border-sky-500/80'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono text-sky-400">{prop.status}</span>
                      <h3 className="text-base font-bold text-slate-100">{prop.customerName}</h3>
                      <p className="text-xs text-slate-400">
                        {prop.title} · Contact: {prop.contactName}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewProposalId(prop.id)}
                          className="text-xs text-sky-400 hover:underline"
                        >
                          Preview Scope
                        </button>
                        {onApplyNotificationPreset && (
                          <button
                            type="button"
                            onClick={() =>
                              onApplyNotificationPreset({
                                category: 'PROPOSAL',
                                title: `Proposal: ${prop.customerName}`,
                                message: `${prop.title} ($${prop.totalPrice.toLocaleString()}). Follow up on acceptance & 50% deposit.`,
                                targetEntityId: prop.id,
                                targetEntityType: 'proposal',
                                targetTab: 'proposals',
                                defaultPriority: 'HIGH',
                                suggestedDue: prop.expirationDate ? `${prop.expirationDate}T09:00` : undefined,
                              })
                            }
                            title="Set reminder for this proposal"
                            className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {onClaimProposal && (
                        <div className="mt-1.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onClaimProposal(prop.id)}
                            data-testid={`claim-proposal-${prop.id}`}
                            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                              prop.claimedByName
                                ? prop.claimedByMemberId === activeMember?.id
                                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                                  : 'bg-sky-500/15 border border-sky-500/40 text-sky-300'
                                : 'bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 text-slate-300'
                            }`}
                          >
                            <Hand className="w-3 h-3" />
                            <span>
                              {prop.claimedByName
                                ? `Owner: ${prop.claimedByName}`
                                : `Claim Proposal (${activeMember?.name.split(' ')[0] || 'Me'})`}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Milestones & Single-Record Payment Collection */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <p className="text-xs font-semibold text-slate-300">
                      Payment Milestones (Never Counted Twice):
                    </p>
                    {prop.milestones.map((ms) => (
                      <div
                        key={ms.id}
                        className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-200">
                            {ms.label} —{' '}
                            <span className="font-mono tabular-nums text-emerald-400">
                              ${ms.amount.toLocaleString()}
                            </span>
                          </p>
                          <p className="text-slate-400">{ms.dueDescription}</p>
                        </div>

                        {ms.isPaid ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Cleared ({ms.paidTransactionId})</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={capacity.isCapacityExhausted && !prop.acceptedAt}
                            onClick={() => handleRecordMilestoneClick(prop.id, ms.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 rounded hover:bg-emerald-300 disabled:opacity-40"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Record Cleared Payment</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Update Agreement Status:</span>
                    <select
                      aria-label={`Proposal status for ${prop.customerName}`}
                      value={prop.status}
                      onChange={(e) =>
                        onUpdateProposalStatus(prop.id, e.target.value as ProposalStatus)
                      }
                      className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-200"
                    >
                      {Object.values(ProposalStatus).map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Printable One-Page Proposal Preview */}
          {previewProposal && (
            <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-5 h-fit">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <p className="text-xs font-mono text-sky-400">
                    ONE-PAGE WRITTEN AGREEMENT PREVIEW
                  </p>
                  <h2 className="text-lg font-bold text-slate-100 mt-0.5">
                    {state.settings.companyName} — Fixed-Scope Proposal
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 no-print"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400">Prepared For:</p>
                  <p className="font-semibold text-slate-100">{previewProposal.customerName}</p>
                  <p className="text-slate-300">Attn: {previewProposal.contactName}</p>
                </div>
                <div className="text-right font-mono">
                  <p className="text-slate-400">Date: {previewProposal.createdAt}</p>
                  <p className="text-slate-400">Est. Delivery: {previewProposal.estimatedDeliveryTimeline}</p>
                  <p className="text-emerald-400 font-bold">
                    Total Fixed Investment: ${previewProposal.totalPrice.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-slate-100">1. Scope Summary</p>
                <p className="text-slate-300 leading-relaxed">{previewProposal.scopeSummary}</p>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-slate-100">2. Included Deliverables &amp; Acceptance Criteria</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  {previewProposal.deliverables.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-slate-100">3. Strict Scope Exclusions &amp; Revision Allowance</p>
                <p className="text-slate-300">
                  Revision Allowance: <strong>{previewProposal.revisionAllowance}</strong>
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  {previewProposal.exclusions.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-slate-100">4. Payment Milestones (50% Deposit Rule)</p>
                <div className="space-y-1.5">
                  {previewProposal.milestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 bg-slate-900 border border-slate-800 rounded flex justify-between font-mono"
                    >
                      <span>{m.label}</span>
                      <span className="text-emerald-400">
                        ${m.amount.toLocaleString()} ({m.isPaid ? 'PAID' : 'DUE'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* DELIVERY & FULFILLMENT PROJECTS VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {
                label: '1. Work Sold',
                count: state.projects.length,
              },
              {
                label: '2. Work Started',
                count: state.projects.filter((p) => p.status === DeliveryStatus.IN_PROGRESS).length,
              },
              {
                label: '3. Milestone / Delivered',
                count: state.projects.filter(
                  (p) =>
                    p.status === DeliveryStatus.MILESTONE_REACHED ||
                    p.status === DeliveryStatus.DELIVERED
                ).length,
              },
              {
                label: '4. Client Accepted',
                count: state.projects.filter((p) => p.status === DeliveryStatus.ACCEPTED).length,
              },
              {
                label: '5. Final Payment Collected',
                count: state.projects.filter((p) => p.status === DeliveryStatus.COMPLETE).length,
              },
            ].map((st) => (
              <div
                key={st.label}
                className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl"
              >
                <p className="text-xs text-slate-400">{st.label}</p>
                <p className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1">
                  {st.count}
                </p>
              </div>
            ))}
          </div>

          {state.projects.length === 0 ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
              No active delivery projects yet. When a client accepts a proposal or pays a 50% deposit, a fulfillment project is automatically created here.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {state.projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono text-sky-400">{proj.status}</span>
                      <h3 className="text-base font-bold text-slate-100 mt-0.5">
                        {proj.projectTitle}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Client: {proj.customerName} · Target Delivery: {proj.targetDeliveryDate}
                      </p>
                    </div>

                    <select
                      aria-label={`Delivery status for ${proj.customerName}`}
                      value={proj.status}
                      onChange={(e) =>
                        onUpdateProject({
                          ...proj,
                          status: e.target.value as DeliveryStatus,
                        })
                      }
                      className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-200"
                    >
                      {Object.values(DeliveryStatus).map((ds) => (
                        <option key={ds} value={ds}>
                          {ds}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono tabular-nums">
                    <div>
                      <p className="text-slate-400">Contract Value</p>
                      <p className="font-bold text-slate-100">
                        ${proj.contractedValue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Cleared Cash</p>
                      <p className="font-bold text-emerald-400">
                        ${proj.clearedCashCollected.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Balance Due</p>
                      <p className="font-bold text-amber-300">
                        ${proj.remainingBalance.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-200">
                      Delivery Milestones &amp; Checkpoints:
                    </p>
                    {proj.milestones.map((m, idx) => (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m.completed}
                            onChange={(e) => {
                              const nextM = [...proj.milestones];
                              nextM[idx] = {
                                ...m,
                                completed: e.target.checked,
                                completedByName: e.target.checked
                                  ? activeMember?.name || m.claimedByName
                                  : undefined,
                              };
                              onUpdateProject({ ...proj, milestones: nextM });
                            }}
                            className="rounded border-slate-700"
                          />
                          <span
                            className={
                              m.completed ? 'line-through text-slate-500' : 'text-slate-200'
                            }
                          >
                            {m.title}
                          </span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          {onApplyNotificationPreset && (
                            <button
                              type="button"
                              onClick={() =>
                                onApplyNotificationPreset({
                                  category: 'DELIVERY',
                                  title: `Milestone: ${proj.customerName}`,
                                  message: `${m.title} (Target: ${m.dueDate || proj.targetDeliveryDate})`,
                                  targetEntityId: m.id,
                                  targetEntityType: 'delivery-milestone',
                                  targetTab: 'delivery',
                                  defaultPriority: 'HIGH',
                                  suggestedDue: m.dueDate ? `${m.dueDate}T09:00` : undefined,
                                })
                              }
                              title="Set reminder notification for this milestone"
                              className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Bell className="w-3 h-3" />
                            </button>
                          )}
                          {onClaimDeliveryMilestone && (
                            <button
                              type="button"
                              onClick={() => onClaimDeliveryMilestone(proj.id, m.id)}
                              data-testid={`claim-milestone-${proj.id}-${m.id}`}
                              className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer ${
                                m.claimedByName
                                  ? m.claimedByMemberId === activeMember?.id
                                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                                    : 'bg-sky-500/15 border border-sky-500/40 text-sky-300'
                                  : 'bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 text-slate-300'
                              }`}
                            >
                              <Hand className="w-2.5 h-2.5" />
                              <span>
                                {m.claimedByName
                                  ? m.claimedByName.split(' ')[0]
                                  : 'Claim Step'}
                              </span>
                            </button>
                          )}
                          <span className="font-mono text-slate-400">Due {m.dueDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs font-mono">
                    <label className="text-slate-400">
                      Hours Logged (Est {proj.estimatedHours}h):
                      <input
                        type="number"
                        step="0.5"
                        value={proj.actualHoursLogged}
                        onChange={(e) =>
                          onUpdateProject({
                            ...proj,
                            actualHoursLogged: Number(e.target.value) || 0,
                          })
                        }
                        className="mt-1 w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100"
                      />
                    </label>
                    <label className="text-slate-400">
                      Revisions ({proj.revisionsAllowed} max):
                      <input
                        type="number"
                        value={proj.revisionsUsed}
                        onChange={(e) =>
                          onUpdateProject({
                            ...proj,
                            revisionsUsed: Number(e.target.value) || 0,
                          })
                        }
                        className="mt-1 w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100"
                      />
                    </label>
                    <div className="text-slate-400">
                      <p>Customer Dependency:</p>
                      <p className="font-sans text-slate-300 mt-1 line-clamp-2">
                        {proj.customerDependencies}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
