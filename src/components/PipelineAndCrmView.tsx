import React, { useState } from 'react';
import {
  CampaignState,
  DeliveryStatus,
  PipelineStage,
  ProposalStatus,
  Prospect,
  ProspectStepClaims,
  TeamMember,
} from '../types';
import { exportProspectsToCsv, importProspectsFromCsv } from '../utils/csvAndExport';
import { Plus, Search, Download, Upload, FileText, PhoneCall, Hand, Bell } from 'lucide-react';
import { NotificationPresetTarget } from './CreateNotificationModal';

interface PipelineAndCrmViewProps {
  state: CampaignState;
  mode: 'pipeline' | 'contacts';
  activeMember?: TeamMember;
  onClaimProspectStep?: (prospectId: string, stepKey: keyof ProspectStepClaims) => void;
  onAddProspect: (prospect: Prospect) => void;
  onUpdateProspect: (prospect: Prospect) => void;
  onImportProspects: (prospects: Prospect[]) => void;
  onCreateProposalFromProspect: (prospect: Prospect) => void;
  onNavigateToCallWithProspect: (prospectId: string) => void;
  onApplyNotificationPreset?: (preset: NotificationPresetTarget) => void;
}

const BOARD_STAGES: PipelineStage[] = [
  PipelineStage.IDENTIFIED,
  PipelineStage.CONTACTED,
  PipelineStage.CONVERSATION,
  PipelineStage.QUALIFIED,
  PipelineStage.DEMO_BOOKED,
  PipelineStage.DEMO_COMPLETED,
  PipelineStage.PROPOSAL_SENT,
  PipelineStage.WON,
  PipelineStage.LOST,
];

export const PipelineAndCrmView: React.FC<PipelineAndCrmViewProps> = ({
  state,
  mode,
  activeMember,
  onClaimProspectStep,
  onAddProspect,
  onUpdateProspect,
  onImportProspects,
  onCreateProposalFromProspect,
  onNavigateToCallWithProspect,
  onApplyNotificationPreset,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);
  const [editingProspectId, setEditingProspectId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // New Prospect Form State
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('Owner');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState('Roofing / Home Services');
  const [location, setLocation] = useState('');
  const [problemObserved, setProblemObserved] = useState('');
  const [estimatedValue, setEstimatedValue] = useState(1500);
  const [nextAction, setNextAction] = useState('Make first targeted call & invite to 10-min demo');
  const [nextActionDate, setNextActionDate] = useState(todayStr);

  const filteredProspects = state.prospects.filter((p) => {
    if (stageFilter !== 'ALL' && p.stage !== stageFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.businessName.toLowerCase().includes(q) ||
      p.contactName.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.problemObserved.toLowerCase().includes(q)
    );
  });

  const handleCreateProspect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !problemObserved.trim()) return;

    const newProspect: Prospect = {
      id: `prospect-${Date.now()}`,
      businessName: businessName.trim(),
      contactName: contactName.trim() || 'Owner / Decision-Maker',
      contactRole: contactRole.trim() || 'Owner',
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim(),
      category: category.trim(),
      location: location.trim(),
      problemObserved: problemObserved.trim(),
      leadSource: 'Direct Outbound Research',
      dateAdded: todayStr,
      stage: PipelineStage.IDENTIFIED,
      estimatedValue: Number(estimatedValue) || 1500,
      offerInterest: Number(estimatedValue) >= 2500 ? 'OFFER_A_AND_B' : 'OFFER_A',
      nextAction: nextAction.trim() || 'Call owner',
      nextActionDate: nextActionDate || todayStr,
      notes: '',
      consentNotes: 'Outbound B2B research',
    };

    onAddProspect(newProspect);
    setBusinessName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setProblemObserved('');
    setShowAddForm(false);
  };

  const handleExportCsv = () => {
    const csv = exportProspectsToCsv(state.prospects);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `its-llc-prospects-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const { prospects, errors } = importProspectsFromCsv(text, todayStr);
      if (prospects.length > 0) {
        onImportProspects(prospects);
      }
      if (errors.length > 0) {
        setCsvFeedback(`Imported ${prospects.length} prospects. Warnings: ${errors.join(' ')}`);
      } else {
        setCsvFeedback(`Successfully imported ${prospects.length} prospect records from CSV.`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper to get PDF Section 9 tracker derived columns for a prospect
  const getProspectFinancials = (prospectId: string) => {
    const props = state.proposals.filter((p) => p.prospectId === prospectId);
    const quotedVal = props.reduce((a, b) => a + b.totalPrice, 0);
    const projs = state.projects.filter((pr) => pr.prospectId === prospectId);
    const clearedCash = projs.reduce((a, b) => a + b.clearedCashCollected, 0);
    const deliveryStatus = projs[0]?.status || DeliveryStatus.NOT_STARTED;
    return { quotedVal, clearedCash, deliveryStatus };
  };

  const overdueFollowUps = state.prospects.filter(
    (p) =>
      p.stage !== PipelineStage.WON &&
      p.stage !== PipelineStage.LOST &&
      p.stage !== PipelineStage.ARCHIVED &&
      p.nextActionDate &&
      p.nextActionDate <= todayStr
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-sky-400">
            PDF SECTION 2, 7 &amp; 9 · {mode === 'pipeline' ? 'VISUAL SALES PIPELINE' : 'DAILY PROSPECT TRACKER & CRM'}
          </p>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            {mode === 'pipeline'
              ? 'Sales Pipeline Board & Stage Progression'
              : 'Prospects, Contacts & Section 9 Daily Tracker'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Target: Research 30–50 businesses in Days 1–2 with one specific, truthful website or lead-handling observation per business.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Prospect</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportCsvFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {csvFeedback && (
        <div className="p-3.5 bg-slate-900 border border-sky-700 rounded-lg flex items-center justify-between text-xs text-sky-300">
          <span>{csvFeedback}</span>
          <button
            type="button"
            onClick={() => setCsvFeedback(null)}
            className="text-slate-400 hover:text-slate-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add Prospect Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateProspect}
          className="p-5 bg-slate-900 border border-sky-800/80 rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100">
              Add Qualified Business to Tracker (Requires Specific Truthful Observation)
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label htmlFor="crm-bus-name" className="block text-xs text-slate-300 mb-1">
                Business Name *
              </label>
              <input
                id="crm-bus-name"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Summit Roofing Co."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="crm-contact" className="block text-xs text-slate-300 mb-1">
                Owner / Decision-Maker
              </label>
              <input
                id="crm-contact"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Dan Miller"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="crm-phone" className="block text-xs text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                id="crm-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 019-2831"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="crm-website" className="block text-xs text-slate-300 mb-1">
                Website URL
              </label>
              <input
                id="crm-website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="crm-problem" className="block text-xs text-amber-300 mb-1">
                Specific Website or Lead-Handling Problem Observed (PDF Section 9) *
              </label>
              <input
                id="crm-problem"
                type="text"
                required
                value={problemObserved}
                onChange={(e) => setProblemObserved(e.target.value)}
                placeholder="e.g. No mobile quote button; contact page form fails on iPhone"
                className="w-full px-3 py-2 bg-slate-950 border border-amber-700/80 rounded-lg text-xs text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="crm-val" className="block text-xs text-slate-300 mb-1">
                Est. Deal Value ($)
              </label>
              <input
                id="crm-val"
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(Number(e.target.value) || 1500)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="crm-next-date" className="block text-xs text-slate-300 mb-1">
                Next Action Date
              </label>
              <input
                id="crm-next-date"
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300"
            >
              Save Prospect to Tracker
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            aria-label="Search prospects"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by business name, owner, category, or observed website problem..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter by pipeline stage"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200"
          >
            <option value="ALL">All Stages ({state.prospects.length})</option>
            {BOARD_STAGES.map((st) => (
              <option key={st} value={st}>
                {st} ({state.prospects.filter((p) => p.stage === st).length})
              </option>
            ))}
          </select>

          <span className="text-xs font-mono text-amber-300">
            Due/Overdue Follow-ups: {overdueFollowUps.length}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {filteredProspects.length === 0 ? (
        <div className="p-10 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-3">
          <p className="text-base font-semibold text-slate-100">
            No Prospects Recorded Matching Current Filter
          </p>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            PDF Day 1 Checklist Item #5: &ldquo;Research the first 30 qualified businesses and note one specific observation for each.&rdquo; Add your first business above or import a CSV list.
          </p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Prospect</span>
          </button>
        </div>
      ) : mode === 'pipeline' ? (
        /* PIPELINE KANBAN / STAGE COLUMNS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              groupTitle: '1. Outbound & Reached',
              stages: [PipelineStage.IDENTIFIED, PipelineStage.CONTACTED, PipelineStage.CONVERSATION],
            },
            {
              groupTitle: '2. Qualified & Demo Booked',
              stages: [PipelineStage.QUALIFIED, PipelineStage.DEMO_BOOKED, PipelineStage.DEMO_COMPLETED],
            },
            {
              groupTitle: '3. Written Proposal Sent',
              stages: [PipelineStage.PROPOSAL_SENT],
            },
            {
              groupTitle: '4. Closed Outcomes',
              stages: [PipelineStage.WON, PipelineStage.LOST],
            },
          ].map((col) => {
            const colProspects = filteredProspects.filter((p) =>
              col.stages.includes(p.stage)
            );
            const colValue = colProspects.reduce((a, b) => a + b.estimatedValue, 0);

            return (
              <div
                key={col.groupTitle}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 flex flex-col"
              >
                <div className="pb-2.5 border-b border-slate-800 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-100">{col.groupTitle}</h2>
                  <span className="text-xs font-mono text-sky-400 tabular-nums">
                    {colProspects.length} · ${colValue.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {colProspects.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">
                            {prospect.businessName}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {prospect.contactName} ({prospect.contactRole}) · {prospect.phone || 'No phone'}
                          </p>
                        </div>
                        <span className="text-xs font-mono font-semibold text-emerald-400 tabular-nums shrink-0">
                          ${prospect.estimatedValue.toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 bg-slate-900 p-2 rounded border border-slate-800/80">
                        <strong className="text-amber-300">Observed Problem:</strong>{' '}
                        {prospect.problemObserved}
                      </p>

                      <div className="text-xs text-slate-400 flex items-center justify-between font-mono">
                        <span>Next: {prospect.nextActionDate}</span>
                        <span className="text-sky-400">{prospect.stage}</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        <strong>Next Step:</strong> {prospect.nextAction}
                      </p>

                      {onClaimProspectStep && (
                        <div className="pt-2 border-t border-slate-900 space-y-1">
                          <div className="text-[10px] font-mono uppercase text-slate-400">
                            Team Relay Steps (Click to Claim as {activeMember?.name.split(' ')[0] || 'Operator'}):
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {(
                              [
                                { key: 'researchAndCall', label: '1. Call' },
                                { key: 'demoExecution', label: '2. Demo' },
                                { key: 'proposalFollowUp', label: '3. Quote' },
                                { key: 'closeAndDeposit', label: '4. Close' },
                              ] as { key: keyof ProspectStepClaims; label: string }[]
                            ).map((st) => {
                              const claim = prospect.stepClaims?.[st.key];
                              const isMine = claim?.memberId === activeMember?.id;
                              return (
                                <button
                                  key={st.key}
                                  type="button"
                                  onClick={() => onClaimProspectStep(prospect.id, st.key)}
                                  data-testid={`claim-prospect-step-${prospect.id}-${st.key}`}
                                  className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center justify-between gap-1 truncate cursor-pointer ${
                                    claim
                                      ? isMine
                                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                                        : 'bg-sky-500/15 border border-sky-500/40 text-sky-300'
                                      : 'bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 text-slate-400'
                                  }`}
                                >
                                  <span className="truncate">
                                    {st.label}: {claim ? claim.memberName.split(' ')[0] : 'Open'}
                                  </span>
                                  <Hand className="w-2.5 h-2.5 shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center gap-1.5">
                        <select
                          aria-label={`Change stage for ${prospect.businessName}`}
                          value={prospect.stage}
                          onChange={(e) =>
                            onUpdateProspect({
                              ...prospect,
                              stage: e.target.value as PipelineStage,
                            })
                          }
                          className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                        >
                          {BOARD_STAGES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => onNavigateToCallWithProspect(prospect.id)}
                          className="px-2 py-1 text-xs font-medium text-sky-400 bg-slate-900 border border-slate-800 rounded hover:border-sky-500"
                          title="Open Call & Script Workspace for this prospect"
                        >
                          Call
                        </button>

                        <button
                          type="button"
                          onClick={() => onCreateProposalFromProspect(prospect)}
                          className="px-2 py-1 text-xs font-medium text-emerald-400 bg-slate-900 border border-slate-800 rounded hover:border-emerald-500"
                          title="Draft 1-Page Proposal"
                        >
                          + Proposal
                        </button>

                        {onApplyNotificationPreset && (
                          <button
                            type="button"
                            onClick={() =>
                              onApplyNotificationPreset({
                                category: 'PROSPECT',
                                title: `Prospect: ${prospect.businessName}`,
                                message: `Follow-up on ${prospect.nextAction} (Contact: ${prospect.contactName}, ${prospect.phone || 'No phone'})`,
                                targetEntityId: prospect.id,
                                targetEntityType: 'prospect',
                                targetTab: 'pipeline',
                                defaultPriority: 'HIGH',
                                suggestedDue: prospect.nextActionDate ? `${prospect.nextActionDate}T09:00` : undefined,
                              })
                            }
                            title="Set reminder notification for this prospect"
                            className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* PDF SECTION 9: THE TRACKER YOU USE EVERY DAY (SPREADSHEET TABLE) */
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100">
              PDF Section 9 Daily Tracker Table (All 9 Required Columns)
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Showing {filteredProspects.length} record(s)
            </span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-2 font-medium">1. Business &amp; Site</th>
                <th className="py-2 pr-2 font-medium">2. Contact</th>
                <th className="py-2 pr-2 font-medium">3. Problem Observed</th>
                <th className="py-2 pr-2 font-medium">4. First Contact</th>
                <th className="py-2 pr-2 font-medium">5. Outcome</th>
                <th className="py-2 pr-2 font-medium">6. Next Action</th>
                <th className="py-2 pr-2 font-medium text-right">7. Quoted</th>
                <th className="py-2 pr-2 font-medium text-right">8. Cleared</th>
                <th className="py-2 pr-2 font-medium">9. Delivery</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {filteredProspects.map((p) => {
                const { quotedVal, clearedCash, deliveryStatus } = getProspectFinancials(p.id);
                return (
                  <tr key={p.id} className="hover:bg-slate-950/60">
                    <td className="py-2.5 pr-2 max-w-[140px]">
                      <p className="font-semibold text-slate-100 truncate">{p.businessName}</p>
                      <p className="text-slate-400 font-mono truncate">
                        {p.website || 'No website'}
                      </p>
                    </td>
                    <td className="py-2.5 pr-2 max-w-[115px]">
                      <p className="truncate">{p.contactName}</p>
                      <p className="text-slate-400 font-mono truncate">{p.phone}</p>
                    </td>
                    <td className="py-2.5 pr-2 max-w-[175px]">
                      <p className="text-amber-200 line-clamp-2">{p.problemObserved}</p>
                    </td>
                    <td className="py-2.5 pr-2 font-mono whitespace-nowrap">
                      <p>{p.lastContactDate || p.dateAdded}</p>
                      <p className="text-slate-400">{p.firstContactMethod || 'Outbound'}</p>
                    </td>
                    <td className="py-2.5 pr-2">
                      <select
                        aria-label={`Stage for ${p.businessName}`}
                        value={p.stage}
                        onChange={(e) =>
                          onUpdateProspect({ ...p, stage: e.target.value as PipelineStage })
                        }
                        className="w-32 px-1.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-sky-300"
                      >
                        {BOARD_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 pr-2 max-w-[155px]">
                      <p className="text-slate-200 line-clamp-2">{p.nextAction}</p>
                      <p className="font-mono text-sky-400">{p.nextActionDate}</p>
                    </td>
                    <td className="py-2.5 pr-2 text-right font-mono tabular-nums whitespace-nowrap">
                      ${(quotedVal || p.estimatedValue).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-2 text-right font-mono tabular-nums text-emerald-400 font-semibold whitespace-nowrap">
                      ${clearedCash.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-2 font-mono text-slate-300 max-w-[100px] truncate">
                      {deliveryStatus}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        onClick={() => onNavigateToCallWithProspect(p.id)}
                        className="px-2 py-1 text-xs font-medium text-sky-400 bg-slate-950 border border-slate-800 rounded hover:border-sky-500"
                      >
                        Call
                      </button>
                      <button
                        type="button"
                        onClick={() => onCreateProposalFromProspect(p)}
                        className="px-2 py-1 text-xs font-medium text-emerald-400 bg-slate-950 border border-slate-800 rounded hover:border-emerald-500"
                      >
                        Quote
                      </button>
                      {onApplyNotificationPreset && (
                        <button
                          type="button"
                          onClick={() =>
                            onApplyNotificationPreset({
                              category: 'PROSPECT',
                              title: `Contact: ${p.businessName}`,
                              message: `Reach out to ${p.contactName} (${p.phone || 'No phone'}). Next: ${p.nextAction}`,
                              targetEntityId: p.id,
                              targetEntityType: 'prospect',
                              targetTab: 'contacts',
                              defaultPriority: 'MEDIUM',
                              suggestedDue: p.nextActionDate ? `${p.nextActionDate}T09:00` : undefined,
                            })
                          }
                          title="Apply notification reminder"
                          className="p-1 inline-flex items-center rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Bell className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
