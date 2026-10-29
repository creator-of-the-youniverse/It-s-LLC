import React, { useState } from 'react';
import {
  CallLog,
  CallOutcome,
  CampaignState,
  PipelineStage,
  PlaybookScript,
  Prospect,
  TeamMember,
} from '../types';
import { getActiveCampaignDay } from '../utils/calculations';
import { buildCustomizedScriptDraft } from '../utils/csvAndExport';
import { PhoneCall, Copy, Check, AlertTriangle, Plus, Edit3, Bell } from 'lucide-react';
import { NotificationPresetTarget } from './CreateNotificationModal';

interface CallsAndPlaybookViewProps {
  state: CampaignState;
  mode: 'calls' | 'playbook';
  activeMember?: TeamMember;
  preselectedProspectId?: string | null;
  onLogCall: (call: CallLog, updatedProspect?: Prospect) => void;
  onUpdateScript: (script: PlaybookScript) => void;
  onAddScript: (script: PlaybookScript) => void;
  onApplyNotificationPreset?: (preset: NotificationPresetTarget) => void;
}

export const CallsAndPlaybookView: React.FC<CallsAndPlaybookViewProps> = ({
  state,
  mode,
  activeMember,
  preselectedProspectId,
  onLogCall,
  onUpdateScript,
  onAddScript,
  onApplyNotificationPreset,
}) => {
  const activeDay = getActiveCampaignDay(
    state.settings.startDate,
    state.settings.currentDayOverride
  );
  const todayStr = new Date().toISOString().slice(0, 10);

  const [selectedProspectId, setSelectedProspectId] = useState<string>(
    preselectedProspectId || state.prospects[0]?.id || ''
  );
  const [selectedScriptId, setSelectedScriptId] = useState<string>(
    state.scripts[0]?.id || ''
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Call Logger State
  const [customBusinessName, setCustomBusinessName] = useState('');
  const [customContactName, setCustomContactName] = useState('');
  const [decisionMakerReached, setDecisionMakerReached] = useState(true);
  const [twoWayConversation, setTwoWayConversation] = useState(true);
  const [outcome, setOutcome] = useState<CallOutcome>(CallOutcome.DEMO_BOOKED);
  const [objectionObserved, setObjectionObserved] = useState('');
  const [buyerFeedback, setBuyerFeedback] = useState('');
  const [nextStep, setNextStep] = useState('Conduct 10-minute demonstration & send 1-page scope');
  const [followUpDate, setFollowUpDate] = useState(todayStr);
  const [isFollowUpCall, setIsFollowUpCall] = useState(false);
  const [demoConducted, setDemoConducted] = useState(false);

  // Script Editor State
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');

  const selectedProspect = state.prospects.find((p) => p.id === selectedProspectId);
  const selectedScript =
    state.scripts.find((s) => s.id === selectedScriptId) || state.scripts[0];

  const { draft, unverifiedFlags } = buildCustomizedScriptDraft(
    selectedScript?.content || '',
    state.settings.operatorName,
    state.settings.demoSiteUrl,
    selectedProspect
  );

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSubmitCallLog = (e: React.FormEvent) => {
    e.preventDefault();
    const targetBus =
      selectedProspect?.businessName || customBusinessName.trim() || 'Outbound Prospect';
    const targetContact =
      selectedProspect?.contactName || customContactName.trim() || 'Owner';

    const newLog: CallLog = {
      id: `call-${Date.now()}`,
      prospectId: selectedProspect?.id || `adhoc-${Date.now()}`,
      businessName: targetBus,
      contactName: targetContact,
      timestamp: new Date().toISOString(),
      dayNumber: activeDay,
      decisionMakerReached,
      twoWayConversation,
      outcome,
      objectionObserved: objectionObserved.trim() || 'None',
      buyerFeedback: buyerFeedback.trim(),
      nextStep: nextStep.trim() || 'Follow up',
      followUpDate: followUpDate || todayStr,
      isFollowUpCall,
      demoConducted,
      operatorId: activeMember?.id,
      operatorName: activeMember?.name || state.settings.operatorName,
      demoOperatorId: demoConducted ? activeMember?.id : undefined,
      demoOperatorName: demoConducted ? activeMember?.name || state.settings.operatorName : undefined,
    };

    let updatedProspect: Prospect | undefined;
    if (selectedProspect) {
      let nextStage = selectedProspect.stage;
      if (outcome === CallOutcome.DEMO_BOOKED) {
        nextStage = demoConducted ? PipelineStage.DEMO_COMPLETED : PipelineStage.DEMO_BOOKED;
      } else if (outcome === CallOutcome.INTERESTED) {
        nextStage = PipelineStage.QUALIFIED;
      } else if (outcome === CallOutcome.DECLINED) {
        nextStage = PipelineStage.LOST;
      } else if (twoWayConversation) {
        nextStage = PipelineStage.CONVERSATION;
      } else {
        nextStage = PipelineStage.CONTACTED;
      }

      const prevClaims = selectedProspect.stepClaims || {};
      const nextClaims = { ...prevClaims };
      if (activeMember) {
        if (!nextClaims.researchAndCall) {
          nextClaims.researchAndCall = {
            memberId: activeMember.id,
            memberName: activeMember.name,
            claimedAt: todayStr,
          };
        }
        if (demoConducted) {
          nextClaims.demoExecution = {
            memberId: activeMember.id,
            memberName: activeMember.name,
            claimedAt: todayStr,
          };
        }
      }

      updatedProspect = {
        ...selectedProspect,
        lastContactDate: todayStr,
        stage: nextStage,
        nextAction: nextStep.trim() || selectedProspect.nextAction,
        nextActionDate: followUpDate || selectedProspect.nextActionDate,
        stepClaims: nextClaims,
      };
    }

    onLogCall(newLog, updatedProspect);
    setObjectionObserved('');
    setBuyerFeedback('');
  };

  const todayCallsCount = state.callLogs.filter(
    (c) => c.dayNumber === activeDay && !c.isFollowUpCall
  ).length;
  const todayFollowUpsCount = state.callLogs.filter(
    (c) => c.dayNumber === activeDay && c.isFollowUpCall
  ).length;
  const todayDemosCount = state.callLogs.filter(
    (c) => c.dayNumber === activeDay && c.demoConducted
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-sky-400">
            PDF SECTION 2, 4 &amp; 8 · {mode === 'calls' ? 'CALLS, FOLLOW-UPS & DEMOS WORKSPACE' : 'SCRIPTS & SALES PLAYBOOK'}
          </p>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            {mode === 'calls'
              ? 'Outbound Call Logger, 10-Min Demo Tracker & Live Script Customizer'
              : 'Interactive Sales Playbook, Cold Call Scripts & Objection Handlers'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            PDF Goal: &ldquo;Your goal on these first calls is to learn what business owners care about and book demonstrations. You do not need to sound like a veteran salesperson. You need to be prepared, truthful, and consistent.&rdquo;
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-slate-400">Day {activeDay} Calls: </span>
            <strong className="text-sky-400">
              {todayCallsCount}/{state.settings.dailyCallTarget}
            </strong>
          </div>
          <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-slate-400">Follow-Ups: </span>
            <strong className="text-amber-300">
              {todayFollowUpsCount}/{state.settings.dailyFollowUpTarget}
            </strong>
          </div>
          <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-slate-400">Demos: </span>
            <strong className="text-emerald-400">
              {todayDemosCount}/{state.settings.dailyDemoTarget}
            </strong>
          </div>
        </div>
      </div>

      {/* Main Split: Customized Script Teleprompter & Call Outcome Logger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Prospect-Aware Script Customizer */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Live Prospect Script Customizer
              </h2>
              <p className="text-xs text-slate-400">
                Select a prospect and script template. Never invent observations—unverified fields are flagged.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyText(draft, 'custom-draft')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300"
            >
              {copiedId === 'custom-draft' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied Draft</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Customized Script</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="call-prospect-select" className="block text-xs text-slate-300 mb-1">
                Select Prospect From CRM
              </label>
              <select
                id="call-prospect-select"
                value={selectedProspectId}
                onChange={(e) => setSelectedProspectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              >
                <option value="">-- Ad-Hoc / Unlisted Business --</option>
                {state.prospects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.businessName} ({p.contactName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="call-script-select" className="block text-xs text-slate-300 mb-1">
                Select Playbook Script
              </label>
              <select
                id="call-script-select"
                value={selectedScriptId}
                onChange={(e) => setSelectedScriptId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              >
                {state.scripts.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.category}] {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {unverifiedFlags.length > 0 && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg space-y-1 text-xs text-amber-200">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Verification Required Before Calling:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {unverifiedFlags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedProspect && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Website:</span>
                <span className="font-mono text-sky-400">{selectedProspect.website || 'Not recorded'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="font-mono text-slate-100">{selectedProspect.phone || 'Not recorded'}</span>
              </div>
              <p className="text-slate-300 pt-1">
                <strong className="text-amber-300">Recorded Observation:</strong>{' '}
                {selectedProspect.problemObserved}
              </p>
            </div>
          )}

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-sans text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
            {draft}
          </div>
        </div>

        {/* Right Column: Call, Follow-Up & Demo Outcome Logger */}
        <form
          onSubmit={handleSubmitCallLog}
          className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Record Call / Demonstration Outcome (Updates Pipeline &amp; Analytics)
            </h2>
            <p className="text-xs text-slate-400">
              PDF Rule: &ldquo;Start with the first 10 calls. Record the results honestly. We will use those results to improve the next 10.&rdquo;
            </p>
          </div>

          {!selectedProspect && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Business Name</label>
                <input
                  type="text"
                  value={customBusinessName}
                  onChange={(e) => setCustomBusinessName(e.target.value)}
                  placeholder="Business called..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Owner / Contact</label>
                <input
                  type="text"
                  value={customContactName}
                  onChange={(e) => setCustomContactName(e.target.value)}
                  placeholder="Owner name..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="call-outcome-select" className="block text-xs text-slate-300 mb-1">
                Call Outcome (PDF Section 9)
              </label>
              <select
                id="call-outcome-select"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as CallOutcome)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              >
                {Object.values(CallOutcome).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="call-followup-date" className="block text-xs text-slate-300 mb-1">
                Scheduled Follow-Up Date
              </label>
              <input
                id="call-followup-date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-200">
              <input
                type="checkbox"
                checked={decisionMakerReached}
                onChange={(e) => setDecisionMakerReached(e.target.checked)}
                className="rounded border-slate-700"
              />
              <span>Owner Reached</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-200">
              <input
                type="checkbox"
                checked={twoWayConversation}
                onChange={(e) => setTwoWayConversation(e.target.checked)}
                className="rounded border-slate-700"
              />
              <span>2-Way Convo</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-amber-300">
              <input
                type="checkbox"
                checked={isFollowUpCall}
                onChange={(e) => setIsFollowUpCall(e.target.checked)}
                className="rounded border-slate-700"
              />
              <span>Follow-Up Call</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-emerald-400">
              <input
                type="checkbox"
                checked={demoConducted}
                onChange={(e) => setDemoConducted(e.target.checked)}
                className="rounded border-slate-700"
              />
              <span>10m Demo Run</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="call-objection" className="block text-xs text-slate-300 mb-1">
                Objection Raised (If Any)
              </label>
              <input
                id="call-objection"
                type="text"
                value={objectionObserved}
                onChange={(e) => setObjectionObserved(e.target.value)}
                placeholder="e.g. Asked about price, already has developer, busy..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="call-next-step" className="block text-xs text-slate-300 mb-1">
                Agreed Next Step
              </label>
              <input
                id="call-next-step"
                type="text"
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="e.g. Send 1-page $1,500 scope & follow up Friday"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="call-feedback" className="block text-xs text-slate-300 mb-1">
              What Did the Buyer Say? (Feeds Daily Review Q2)
            </label>
            <textarea
              id="call-feedback"
              rows={2}
              value={buyerFeedback}
              onChange={(e) => setBuyerFeedback(e.target.value)}
              placeholder="Record honest customer language, pain points, or feedback on the $1,500 offer..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Save Call / Demo Outcome &amp; Update Pipeline</span>
          </button>
        </form>
      </div>

      {/* Playbook Library & Call History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editable Script Library */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-100">
            Complete Sales Script &amp; Objection Playbook (Editable &amp; Copyable)
          </h2>

          <div className="space-y-3">
            {state.scripts.map((scr) => (
              <div
                key={scr.id}
                className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono text-sky-400">{scr.category}</span>
                    <span aria-hidden="true" className="mx-1.5 text-slate-600">
                      ·
                    </span>
                    <span className="text-xs text-slate-400">{scr.sourceNote}</span>
                    <h3 className="text-sm font-semibold text-slate-100 mt-0.5">{scr.title}</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingScriptId === scr.id) {
                          setEditingScriptId(null);
                        } else {
                          setEditingScriptId(scr.id);
                          setEditedContent(scr.content);
                        }
                      }}
                      className="px-2.5 py-1 text-xs text-slate-300 bg-slate-900 border border-slate-700 rounded hover:bg-slate-800"
                    >
                      {editingScriptId === scr.id ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyText(scr.content, scr.id)}
                      className="px-2.5 py-1 text-xs font-medium text-sky-400 bg-slate-900 border border-slate-800 rounded hover:border-sky-500"
                    >
                      {copiedId === scr.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {editingScriptId === scr.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={5}
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateScript({ ...scr, content: editedContent });
                        setEditingScriptId(null);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 rounded"
                    >
                      Save Script Changes
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {scr.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recorded Call & Demo Log Table */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100">
              Recorded Call &amp; Demonstration Log ({state.callLogs.length} Total)
            </h2>
          </div>

          {state.callLogs.length === 0 ? (
            <div className="p-8 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs text-slate-400">
              No calls logged yet. Use the Call Outcome form above to record your first 10 outbound calls.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {[...state.callLogs].reverse().map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-100">
                        {log.businessName} ({log.contactName})
                      </span>
                      {onApplyNotificationPreset && (
                        <button
                          type="button"
                          onClick={() =>
                            onApplyNotificationPreset({
                              category: 'CALL',
                              title: `Call Follow-Up: ${log.businessName}`,
                              message: `${log.nextStep || 'Follow-up on call'} (Contact: ${log.contactName})`,
                              targetEntityId: log.id,
                              targetEntityType: 'call-log',
                              targetTab: 'calls',
                              defaultPriority: log.demoConducted ? 'URGENT' : 'HIGH',
                              suggestedDue: log.followUpDate ? `${log.followUpDate}T10:00` : undefined,
                            })
                          }
                          title="Apply reminder notification for this call"
                          className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <span className="font-mono text-sky-400">
                      Day {log.dayNumber} · {log.outcome}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-slate-400 font-mono">
                    <span>Owner Reached: {log.decisionMakerReached ? 'Yes' : 'No'}</span>
                    <span aria-hidden="true">·</span>
                    <span>2-Way: {log.twoWayConversation ? 'Yes' : 'No'}</span>
                    {log.demoConducted && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400">10-Min Demo Conducted</span>
                      </>
                    )}
                  </div>
                  {log.objectionObserved && log.objectionObserved !== 'None' && (
                    <p className="text-amber-300">
                      <strong>Objection:</strong> {log.objectionObserved}
                    </p>
                  )}
                  {log.buyerFeedback && (
                    <p className="text-slate-300">
                      <strong>Buyer Feedback:</strong> {log.buyerFeedback}
                    </p>
                  )}
                  <p className="text-slate-400">
                    <strong>Next Step ({log.followUpDate}):</strong> {log.nextStep}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
