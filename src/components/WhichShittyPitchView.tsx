import React, { useState } from 'react';
import {
  WhichShittyPitchState,
  AccountMap,
  AccountMapPerson,
  WhichShittyPitchCall,
  TeamMember,
  Prospect,
  PipelineStage,
} from '../types';
import {
  Sparkles,
  PhoneForwarded,
  ShieldAlert,
  Users,
  CheckCircle2,
  Calendar,
  Send,
  Building2,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  FileText,
  AlertCircle,
  Copy,
  Check,
  Flame,
  ArrowRight,
  Clock,
  BookOpen,
  Bell,
} from 'lucide-react';
import { NotificationPresetTarget } from './CreateNotificationModal';

interface WhichShittyPitchViewProps {
  wspState: WhichShittyPitchState;
  onUpdateWspState: (next: WhichShittyPitchState) => void;
  activeMember: TeamMember;
  teamMembers: TeamMember[];
  onAddCrmProspect: (prospect: Prospect) => void;
  onApplyNotificationPreset?: (preset: NotificationPresetTarget) => void;
}

export const WhichShittyPitchView: React.FC<WhichShittyPitchViewProps> = ({
  wspState,
  onUpdateWspState,
  activeMember,
  teamMembers,
  onAddCrmProspect,
  onApplyNotificationPreset,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'assistant' | 'account-maps' | 'yes-list-calls' | 'dnc-registry' | 'pitch-rules'
  >('assistant');

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals for assistant actions
  const [addAccountMapModalOpen, setAddAccountMapModalOpen] = useState(false);
  const [newMapCompanyName, setNewMapCompanyName] = useState('');
  const [newMapIndustry, setNewMapIndustry] = useState('');
  const [newMapWebsite, setNewMapWebsite] = useState('');
  const [newMapHeadquarters, setNewMapHeadquarters] = useState('');
  const [newMapFriction, setNewMapFriction] = useState('');

  const [addPersonModalOpen, setAddPersonModalOpen] = useState(false);
  const [selectedMapIdForPerson, setSelectedMapIdForPerson] = useState<string>(
    wspState.accountMaps[0]?.id || ''
  );
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonTitle, setNewPersonTitle] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<AccountMapPerson['roleCategory']>('Decision Maker');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');

  // Add note modal
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [selectedCallIdForNote, setSelectedCallIdForNote] = useState<string>(
    wspState.callLogs[0]?.id || ''
  );
  const [newNoteContent, setNewNoteContent] = useState('');

  // Follow-up modal
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedCallIdForFollowUp, setSelectedCallIdForFollowUp] = useState<string>(
    wspState.callLogs[0]?.id || ''
  );
  const [followUpAssigneeId, setFollowUpAssigneeId] = useState<string>(activeMember.id);
  const [followUpDate, setFollowUpDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [followUpTask, setFollowUpTask] = useState('');

  // DNC modal
  const [dncModalOpen, setDncModalOpen] = useState(false);
  const [selectedPersonForDnc, setSelectedPersonForDnc] = useState<{
    mapId: string;
    personId: string;
    name: string;
  } | null>(null);
  const [dncScope, setDncScope] = useState<'individual' | 'multiple' | 'team'>('team');
  const [dncReason, setDncReason] = useState('Prospect requested no unsolicited contact.');

  // Notification banner
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 5000);
  };

  const QUICK_PROMPTS = [
    {
      label: "What's due today in WhichShittyPitch ?",
      query: "What's due today in WhichShittyPitch ?",
      icon: Clock,
      category: 'Daily Tasks & Follow-ups',
    },
    {
      label: 'Draft a 27-second cold-call opener for a prospect with a broken mobile quote form.',
      query: 'Draft a 27-second cold-call opener for a prospect with a broken mobile quote form.',
      icon: Flame,
      category: 'Script & Opener Generator',
    },
    {
      label: "List the contacts I've revealed this week, with their titles.",
      query: "List the contacts I've revealed this week, with their titles.",
      icon: Eye,
      category: 'Sidecar Reveal Audit',
    },
    {
      label: 'Provide the teams yes list, scheduled for a 10 min demo, next week.',
      query: 'Provide the teams yes list, scheduled for a 10 min demo, next week.',
      icon: Calendar,
      category: 'Team 10-Min Demo Pipeline',
    },
  ];

  const handleSendPrompt = async (promptToSend: string) => {
    if (!promptToSend.trim() || isLoading) return;
    const userText = promptToSend.trim();
    setInputQuery('');

    const userMsg = {
      id: `msg-u-${Date.now()}`,
      role: 'user' as const,
      content: userText,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...wspState.chatHistory, userMsg];
    onUpdateWspState({
      ...wspState,
      chatHistory: nextHistory,
    });

    setIsLoading(true);
    try {
      const res = await fetch('/api/whichshittypitch/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          wspState,
          activeMemberName: activeMember.name,
          activeMemberId: activeMember.id,
        }),
      });

      const data = await res.json();
      const assistantReply =
        data.reply ||
        'WhichShittyPitch received your command and synchronized with your Sidecar seat.';

      const asstMsg = {
        id: `msg-a-${Date.now()}`,
        role: 'assistant' as const,
        content: assistantReply,
        timestamp: new Date().toISOString(),
        actionPerformed: data.actionExecuted?.type,
      };

      onUpdateWspState({
        ...wspState,
        chatHistory: [...nextHistory, asstMsg],
      });
    } catch {
      const fallbackMsg = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant' as const,
        content:
          'WhichShittyPitch offline fallback: Connected to local Sidecar cache. Your team rules, account maps, and 60/hr seat limits are enforced.',
        timestamp: new Date().toISOString(),
      };
      onUpdateWspState({
        ...wspState,
        chatHistory: [...nextHistory, fallbackMsg],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Reveal contact detail with 60/hr rate-limit enforcement
  const handleRevealContact = (mapId: string, personId: string) => {
    const config = wspState.sidecarConfig;
    if (config.revealsUsedThisHour >= config.seatLimitPerHour) {
      showNotification(
        `Rate Limit Enforced: Your seat has used all ${config.seatLimitPerHour} contact reveals for this hour window. Resets at the top of the hour.`
      );
      return;
    }

    const map = wspState.accountMaps.find((m) => m.id === mapId);
    const person = map?.people.find((p) => p.id === personId);
    if (!person) return;

    if (person.isRemovedBySubject) {
      showNotification(
        'Compliance Block: This person requested WhichShittyPitch to remove their details. Under our privacy rules, they remain permanently removed.'
      );
      return;
    }

    const updatedMaps = wspState.accountMaps.map((m) => {
      if (m.id !== mapId) return m;
      return {
        ...m,
        people: m.people.map((p) => {
          if (p.id !== personId) return p;
          return {
            ...p,
            revealed: true,
            revealedAt: new Date().toISOString().slice(0, 10),
            revealedByMemberId: activeMember.id,
            revealedByMemberName: activeMember.name,
          };
        }),
      };
    });

    onUpdateWspState({
      ...wspState,
      sidecarConfig: {
        ...config,
        revealsUsedThisHour: config.revealsUsedThisHour + 1,
      },
      accountMaps: updatedMaps,
    });

    showNotification(
      `Revealed ${person.name} (${person.title}). Hourly seat quota: ${config.revealsUsedThisHour + 1} of ${config.seatLimitPerHour} used.`
    );
  };

  const handleCreateAccountMap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapCompanyName.trim()) return;
    const createdMap: AccountMap = {
      id: `map-${Date.now()}`,
      companyName: newMapCompanyName.trim(),
      industry: newMapIndustry.trim() || 'Local Trade & Service',
      website: newMapWebsite.trim() || '',
      headquarters: newMapHeadquarters.trim() || '',
      observableFrictionPoint:
        newMapFriction.trim() || 'Observable mobile contact or quote request bottleneck.',
      people: [],
    };
    const nextMaps = [createdMap, ...wspState.accountMaps];
    onUpdateWspState({
      ...wspState,
      accountMaps: nextMaps,
    });
    setSelectedMapIdForPerson(createdMap.id);
    setAddAccountMapModalOpen(false);
    setNewMapCompanyName('');
    setNewMapIndustry('');
    setNewMapWebsite('');
    setNewMapHeadquarters('');
    setNewMapFriction('');
    showNotification(`Created account map for ${createdMap.companyName}.`);
  };

  // Add person to account map
  const handleAddPersonToMap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    const newPerson: AccountMapPerson = {
      id: `p-manual-${Date.now()}`,
      name: newPersonName.trim(),
      title: newPersonTitle.trim() || 'Role Specialist',
      roleCategory: newPersonRole,
      email: newPersonEmail.trim() || 'unrevealed@company.com',
      phone: newPersonPhone.trim() || '(555) 000-0000',
      revealed: false,
      isDoNotContact: false,
      isRemovedBySubject: false,
      syncedToCrm: false,
      notes: `Added by ${activeMember.name} via WhichShittyPitch Account Mapping.`,
    };

    const nextMaps = wspState.accountMaps.map((m) => {
      if (m.id !== selectedMapIdForPerson) return m;
      return {
        ...m,
        people: [...m.people, newPerson],
      };
    });

    onUpdateWspState({
      ...wspState,
      accountMaps: nextMaps,
    });

    setAddPersonModalOpen(false);
    setNewPersonName('');
    setNewPersonTitle('');
    setNewPersonEmail('');
    setNewPersonPhone('');
    showNotification(`Added ${newPerson.name} to account map.`);
  };

  // Mark someone DNC
  const handleConfirmDnc = () => {
    if (!selectedPersonForDnc) return;
    const { mapId, personId } = selectedPersonForDnc;

    const nextMaps = wspState.accountMaps.map((m) => {
      if (m.id !== mapId) return m;
      return {
        ...m,
        people: m.people.map((p) => {
          if (p.id !== personId) return p;
          return {
            ...p,
            isDoNotContact: true,
            dncScope,
            dncMemberIds: dncScope === 'individual' ? [activeMember.id] : undefined,
            dncReason,
          };
        }),
      };
    });

    onUpdateWspState({
      ...wspState,
      accountMaps: nextMaps,
    });

    setDncModalOpen(false);
    setSelectedPersonForDnc(null);
    showNotification(
      `Marked ${selectedPersonForDnc.name} as Do-Not-Contact (${dncScope.toUpperCase()}). Cold outreach blocked.`
    );
  };

  // Add note to call
  const handleAddNoteToCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    const noteItem = {
      id: `cn-${Date.now()}`,
      authorMemberId: activeMember.id,
      authorName: activeMember.name,
      timestamp: new Date().toISOString(),
      content: newNoteContent.trim(),
    };

    const nextCalls = wspState.callLogs.map((c) => {
      if (c.id !== selectedCallIdForNote) return c;
      return {
        ...c,
        notes: [...c.notes, noteItem],
      };
    });

    onUpdateWspState({
      ...wspState,
      callLogs: nextCalls,
    });

    setAddNoteModalOpen(false);
    setNewNoteContent('');
    showNotification('Note added to call log.');
  };

  // Set follow-up for someone on the team
  const handleSetFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTask.trim()) return;

    const assignee = teamMembers.find((m) => m.id === followUpAssigneeId) || activeMember;

    const nextCalls = wspState.callLogs.map((c) => {
      if (c.id !== selectedCallIdForFollowUp) return c;
      return {
        ...c,
        followUpDate,
        followUpAssigneeId: assignee.id,
        followUpAssigneeName: assignee.name,
        followUpTask: followUpTask.trim(),
        outcome: 'FOLLOW_UP_REQUESTED' as const,
      };
    });

    onUpdateWspState({
      ...wspState,
      callLogs: nextCalls,
    });

    setFollowUpModalOpen(false);
    setFollowUpTask('');
    showNotification(`Follow-up assigned to ${assignee.name} for ${followUpDate}.`);
  };

  // Send mapped person or call to Shared CRM
  const handleSendToCrm = (map: AccountMap, person: AccountMapPerson) => {
    if (person.syncedToCrm) {
      showNotification(`${person.name} is already synced to the Shared CRM.`);
      return;
    }

    const crmProspect: Prospect = {
      id: `crm-from-wsp-${Date.now()}`,
      businessName: map.companyName,
      contactName: person.name,
      contactRole: person.title,
      phone: person.phone,
      email: person.email,
      website: map.website,
      category: map.industry,
      location: map.headquarters || 'Texas',
      problemObserved: map.observableFrictionPoint,
      leadSource: 'WhichShittyPitch Sidecar Account Map',
      dateAdded: new Date().toISOString().slice(0, 10),
      stage: PipelineStage.QUALIFIED,
      estimatedValue: 2500,
      offerInterest: 'OFFER_A_AND_B',
      nextAction: 'Deliver 10-minute mobile friction demo',
      nextActionDate: new Date().toISOString().slice(0, 10),
      notes: `Synced from WhichShittyPitch Account Map by ${activeMember.name}. Verified friction point: ${map.observableFrictionPoint}`,
      consentNotes: 'Public business contact, verified role, DNC checked',
      claimedByMemberId: activeMember.id,
      claimedByName: activeMember.name,
      stepClaims: {
        researchAndCall: {
          memberId: activeMember.id,
          memberName: activeMember.name,
          claimedAt: new Date().toISOString().slice(0, 10),
        },
      },
    };

    onAddCrmProspect(crmProspect);

    // Mark as synced in account map
    const nextMaps = wspState.accountMaps.map((m) => {
      if (m.id !== map.id) return m;
      return {
        ...m,
        people: m.people.map((p) => (p.id === person.id ? { ...p, syncedToCrm: true } : p)),
      };
    });

    onUpdateWspState({
      ...wspState,
      accountMaps: nextMaps,
    });

    showNotification(`Sent ${person.name} (${map.companyName}) to Shared CRM pipeline!`);
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden" data-testid="which-shitty-pitch-view">
      {/* Top Banner: Sidecar Account Connection & Seat Quota */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
              WSP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">
                  WhichShittyPitch Sidecar Plugin
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SIDECAR CONNECTED
                </span>
              </div>
              <p className="text-xs text-slate-300">
                B2B Cold-Calling Assistant &amp; Intelligence Sidecar for Sales Teams. Account: <span className="font-mono text-sky-400">{wspState.sidecarConfig.accountSeatName}</span>
              </p>
            </div>
          </div>

          {/* Seat Rate Limit Meter */}
          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl">
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-slate-400">
                Hourly Reveals Quota
              </div>
              <div className="text-xs font-mono font-bold text-white">
                <span className="text-sky-400">{wspState.sidecarConfig.revealsUsedThisHour}</span>
                <span className="text-slate-500"> / </span>
                <span>{wspState.sidecarConfig.seatLimitPerHour} / hr</span>
              </div>
            </div>
            <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden shrink-0">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-emerald-400"
                style={{
                  width: `${Math.min(
                    100,
                    (wspState.sidecarConfig.revealsUsedThisHour /
                      wspState.sidecarConfig.seatLimitPerHour) *
                      100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Hard Compliance Notice Bar: NO DELETE, NO CALLING */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Strict Rule: Zero Delete Tools</span>
          </div>
          <div className="flex items-center gap-1.5">
            <PhoneForwarded className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>No Phone Dialer: Manual Calls Only</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Opt-Outs &amp; DNC Permanently Honoured</span>
          </div>
        </div>
      </div>

      {statusNotification && (
        <div className="p-3 rounded-xl bg-sky-950/80 border border-sky-500/50 text-xs text-sky-200 flex items-center justify-between gap-2 shadow-lg animate-fade-in">
          <span>{statusNotification}</span>
          <button
            type="button"
            onClick={() => setStatusNotification(null)}
            className="text-sky-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs (Responsive Wrap, Zero Overhanging Buttons) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('assistant')}
          data-testid="wsp-tab-assistant"
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
            activeSubTab === 'assistant'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Assistant &amp; Quick Queries</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('account-maps')}
          data-testid="wsp-tab-account-maps"
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
            activeSubTab === 'account-maps'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Account Maps ({wspState.accountMaps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('yes-list-calls')}
          data-testid="wsp-tab-yes-list"
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
            activeSubTab === 'yes-list-calls'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>10-Min Demo Yes List &amp; Logs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('dnc-registry')}
          data-testid="wsp-tab-dnc"
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
            activeSubTab === 'dnc-registry'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>DNC &amp; Permanent Removals</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pitch-rules')}
          data-testid="wsp-tab-rules"
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
            activeSubTab === 'pitch-rules'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Saved Pitch &amp; Call Rules</span>
        </button>
      </div>

      {/* SUB-TAB 1: ASSISTANT & QUICK QUERIES */}
      {activeSubTab === 'assistant' && (
        <div className="space-y-6">
          {/* The 4 Core Quick Query Cards */}
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              WhichShittyPitch Quick Intelligence Queries
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {QUICK_PROMPTS.map((qp, idx) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendPrompt(qp.query)}
                    data-testid={`quick-prompt-btn-${idx}`}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-400/50 hover:bg-slate-850 text-left transition-all group cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400">
                        {qp.category}
                      </span>
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-sky-400 transition-colors" />
                    </div>
                    <div className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                      {qp.label}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span>Execute with WhichShittyPitch</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assistant Chat Stream & History */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  WhichShittyPitch Cold-Calling Assistant Console
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Acting as: {activeMember.name}
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {wspState.chatHistory.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      isUser
                        ? 'bg-sky-500/10 border-sky-500/30 text-white ml-6'
                        : 'bg-slate-950/80 border-slate-800 text-slate-200 mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-800/60 text-[10px] font-mono text-slate-400">
                      <span>{isUser ? activeMember.name : 'WhichShittyPitch Sidecar'}</span>
                      <div className="flex items-center gap-2">
                        {msg.actionPerformed && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                            {msg.actionPerformed}
                          </span>
                        )}
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="text-slate-400 hover:text-white p-0.5"
                            title="Copy text"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap font-sans text-xs">
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-sky-400 animate-pulse flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>WhichShittyPitch is formulating response and auditing team rules...</span>
                </div>
              )}
            </div>

            {/* Prompt Input Form (Responsive flex-wrap, no side-scroll) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt(inputQuery);
              }}
              className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask what's due, draft a 27-second opener, or request the team's 10-min demo yes list..."
                data-testid="wsp-query-input"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                disabled={isLoading || !inputQuery.trim()}
                data-testid="wsp-query-submit-btn"
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask WhichShittyPitch</span>
              </button>
            </form>
          </div>

          {/* Assistant Action Buttons Toolbar (Wrap safe for mobile) */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Gemini Team Assistant Actions
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAddPersonModalOpen(true)}
                data-testid="action-add-person-btn"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                <span>Add Person to Account Map</span>
              </button>

              <button
                type="button"
                onClick={() => setAddNoteModalOpen(true)}
                data-testid="action-add-note-btn"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Note to Call</span>
              </button>

              <button
                type="button"
                onClick={() => setFollowUpModalOpen(true)}
                data-testid="action-set-followup-btn"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Set Follow-up for Team Member</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ACCOUNT MAPS */}
      {activeSubTab === 'account-maps' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">
                B2B Account Maps &amp; Organizational Hierarchies
              </h2>
              <p className="text-xs text-slate-400">
                Team shared maps with people, roles, verified friction points, and revealed contact details. Rate limit: 60 reveals/hr.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAddAccountMapModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                <span>+ New Account Map</span>
              </button>
              <button
                type="button"
                onClick={() => setAddPersonModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Person to Map</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {wspState.accountMaps.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <p className="text-sm font-bold text-slate-200">No Account Maps Created Yet</p>
                <p className="text-xs text-slate-400">
                  Click &ldquo;+ New Account Map&rdquo; above to map target B2B companies, observable website friction points, and decision makers.
                </p>
              </div>
            ) : (
              wspState.accountMaps.map((map) => (
              <div
                key={map.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl"
              >
                {/* Account Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-sky-400" />
                      <h3 className="text-base font-bold text-white">{map.companyName}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {map.industry}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                      <span>HQ: {map.headquarters || 'Texas'}</span>
                      {map.annualRevenueEst && <span>Est. Rev: {map.annualRevenueEst}</span>}
                      <span>Website: {map.website}</span>
                    </div>
                  </div>
                </div>

                {/* Observable Friction Point Box */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase font-mono tracking-wider text-amber-300">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Observable Friction Point (For Cold-Call Opener)</span>
                  </div>
                  <p className="leading-relaxed">{map.observableFrictionPoint}</p>
                </div>

                {/* People List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Mapped People &amp; Roles ({map.people.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {map.people.map((person) => {
                      const isRemoved = person.isRemovedBySubject;
                      const isDnc = person.isDoNotContact;
                      return (
                        <div
                          key={person.id}
                          className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                            isRemoved
                              ? 'bg-rose-950/20 border-rose-900/40 text-slate-500 opacity-60'
                              : isDnc
                              ? 'bg-amber-950/20 border-amber-900/40'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{person.name}</span>
                                {isRemoved && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    PERMANENTLY REMOVED
                                  </span>
                                )}
                                {isDnc && !isRemoved && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    DNC ({person.dncScope?.toUpperCase()})
                                  </span>
                                )}
                                {person.syncedToCrm && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    SYNCED TO CRM
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-sky-400 font-medium">
                                {person.title} •{' '}
                                <span className="text-slate-400 font-mono">
                                  {person.roleCategory}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Contact Details (Revealed or Masked) */}
                          <div className="text-xs space-y-1 pt-1 border-t border-slate-800/80 font-mono">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-[11px]">Direct Phone:</span>
                              {isRemoved ? (
                                <span className="text-rose-400 text-[11px]">
                                  [Purged by Subject Request]
                                </span>
                              ) : person.revealed ? (
                                <span className="text-emerald-300 font-bold">{person.phone}</span>
                              ) : (
                                <span className="text-slate-500">•••••••••• (Hidden)</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-[11px]">Email:</span>
                              {isRemoved ? (
                                <span className="text-rose-400 text-[11px]">
                                  [Purged by Subject Request]
                                </span>
                              ) : person.revealed ? (
                                <span className="text-sky-300 truncate max-w-[180px]">
                                  {person.email}
                                </span>
                              ) : (
                                <span className="text-slate-500">•••••••••• (Hidden)</span>
                              )}
                            </div>
                          </div>

                          {person.notes && (
                            <p className="text-[11px] text-slate-400 italic">{person.notes}</p>
                          )}

                          {/* Action Buttons for this person (No Delete Tools!) */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
                            {!person.revealed && !isRemoved && (
                              <button
                                type="button"
                                onClick={() => handleRevealContact(map.id, person.id)}
                                data-testid={`reveal-btn-${person.id}`}
                                className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Reveal Contact (1 Seat Credit)</span>
                              </button>
                            )}

                            {!isDnc && !isRemoved && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPersonForDnc({
                                    mapId: map.id,
                                    personId: person.id,
                                    name: person.name,
                                  });
                                  setDncModalOpen(true);
                                }}
                                data-testid={`dnc-btn-${person.id}`}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-950/60 hover:text-amber-300 text-slate-300 text-[10px] font-medium flex items-center gap-1 cursor-pointer"
                              >
                                <ShieldAlert className="w-3 h-3 text-amber-400" />
                                <span>Mark DNC</span>
                              </button>
                            )}

                            {!person.syncedToCrm && !isRemoved && (
                              <button
                                type="button"
                                onClick={() => handleSendToCrm(map, person)}
                                data-testid={`crm-sync-btn-${person.id}`}
                                className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Send to Shared CRM</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: 10-MIN DEMO YES LIST & CALL LOGS */}
      {activeSubTab === 'yes-list-calls' && (
        <div className="space-y-6">
          {/* Confirmed 10-Min Demo YES List Section */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Team&apos;s YES List — Scheduled 10-Minute Demos Next Week
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {wspState.callLogs.filter((c) => c.outcome === 'YES_SCHEDULED_10MIN_DEMO').length} Demos Locked In
              </span>
            </div>

            {wspState.callLogs.filter((c) => c.outcome === 'YES_SCHEDULED_10MIN_DEMO').length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                No 10-minute demos booked in Sidecar yet. Log outbound calls that convert to a 10-minute demo to populate the team&apos;s YES list.
              </p>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {wspState.callLogs
                .filter((c) => c.outcome === 'YES_SCHEDULED_10MIN_DEMO')
                .map((demoCall) => (
                  <div
                    key={demoCall.id}
                    className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                        {demoCall.scheduledDemoDate} • {demoCall.scheduledDemoTime}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300">
                        10-MIN DEMO
                      </span>
                    </div>

                    <div className="text-xs font-bold text-white">{demoCall.companyName}</div>
                    <div className="text-[11px] text-slate-300">
                      Contact: {demoCall.contactName} ({demoCall.contactTitle})
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Outbound Source: {demoCall.operatorName}
                    </div>

                    {demoCall.notes[0] && (
                      <p className="text-[10px] text-slate-400 line-clamp-3 italic pt-1 border-t border-slate-800">
                        &quot;{demoCall.notes[0].content}&quot;
                      </p>
                    )}
                  </div>
                ))}
            </div>
            )}
          </div>

          {/* Full Call Log History Across Team */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Team Call Logs &amp; Follow-up Activity
              </h3>
              <button
                type="button"
                onClick={() => setFollowUpModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Schedule Follow-up</span>
              </button>
            </div>

            <div className="space-y-3">
              {wspState.callLogs.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{c.companyName}</span>
                      <span className="text-xs text-slate-400">• {c.contactName} ({c.contactTitle})</span>
                      {onApplyNotificationPreset && (
                        <button
                          type="button"
                          onClick={() =>
                            onApplyNotificationPreset({
                              category: 'WSP',
                              title: `Sidecar: ${c.companyName} (${c.contactName})`,
                              message: `${c.followUpTask || c.outcome.replace(/_/g, ' ')} (Assigned: ${c.followUpAssigneeName || c.operatorName})`,
                              targetEntityId: c.id,
                              targetEntityType: 'wsp-call',
                              targetTab: 'whichshittypitch',
                              defaultPriority: c.outcome === 'YES_SCHEDULED_10MIN_DEMO' ? 'URGENT' : 'HIGH',
                              suggestedDue: c.followUpDate ? `${c.followUpDate}T09:30` : undefined,
                            })
                          }
                          title="Apply reminder notification"
                          className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        c.outcome === 'YES_SCHEDULED_10MIN_DEMO'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : c.outcome === 'FOLLOW_UP_REQUESTED'
                          ? 'bg-amber-500/20 text-amber-300'
                          : c.outcome === 'DNC_REQUESTED'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {c.outcome.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 font-mono">
                    <span>Logged by: {c.operatorName}</span>
                    <span>Date: {c.callDate} {c.callTime}</span>
                    <span>Duration: {c.durationSeconds}s</span>
                  </div>

                  {c.followUpDate && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Follow-up due: <strong>{c.followUpDate}</strong> assigned to{' '}
                        <strong>{c.followUpAssigneeName}</strong>: {c.followUpTask}
                      </span>
                    </div>
                  )}

                  {/* Notes List */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    {c.notes.map((n) => (
                      <div key={n.id} className="text-[11px] text-slate-300 pl-2 border-l-2 border-sky-400/50">
                        <span className="text-[10px] text-slate-500 font-mono mr-1.5">
                          [{n.authorName}]:
                        </span>
                        {n.content}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCallIdForNote(c.id);
                        setAddNoteModalOpen(true);
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <FileText className="w-3 h-3" />
                      <span>+ Add Note to this Call</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DNC & PERMANENT REMOVAL REGISTRY */}
      {activeSubTab === 'dnc-registry' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
              <div>
                <h2 className="text-base font-bold text-white">
                  Compliance Registry: Do-Not-Contact &amp; Permanent Removals
                </h2>
                <p className="text-xs text-slate-400">
                  Strict WhichShittyPitch rule: People who asked to remove their details stay permanently removed across all seats.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category A: Permanent Removals by Subject Request */}
              <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-rose-300 font-bold">
                    Permanently Removed (Subject Opt-Out)
                  </h3>
                  <span className="text-[10px] font-mono text-rose-400 font-bold">IRREVERSIBLE</span>
                </div>
                <p className="text-xs text-slate-400">
                  These individuals exercised their privacy rights. Contact details are permanently masked and scrubbed.
                </p>

                <div className="space-y-2">
                  {wspState.accountMaps
                    .flatMap((m) =>
                      m.people
                        .filter((p) => p.isRemovedBySubject)
                        .map((p) => ({ map: m, person: p }))
                    )
                    .map(({ map, person }) => (
                      <div
                        key={person.id}
                        className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 text-xs space-y-1"
                      >
                        <div className="font-bold text-white">{person.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {person.title}, {map.companyName}
                        </div>
                        <div className="text-[10px] text-rose-300 font-mono">
                          Reason: {person.dncReason || 'Subject requested permanent removal.'}
                        </div>
                      </div>
                    ))}
                  {wspState.accountMaps.every((m) => m.people.every((p) => !p.isRemovedBySubject)) && (
                    <p className="text-xs text-slate-500 italic">
                      No subject removal requests recorded.
                    </p>
                  )}
                </div>
              </div>

              {/* Category B: Team & Individual DNC Flags */}
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                    Team &amp; Individual DNC Flags
                  </h3>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">ACTIVE ENFORCEMENT</span>
                </div>
                <p className="text-xs text-slate-400">
                  Contacts flagged during calls or research. Outreach is strictly blocked.
                </p>

                <div className="space-y-2">
                  {wspState.accountMaps
                    .flatMap((m) =>
                      m.people
                        .filter((p) => p.isDoNotContact && !p.isRemovedBySubject)
                        .map((p) => ({ map: m, person: p }))
                    )
                    .map(({ map, person }) => (
                      <div
                        key={person.id}
                        className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/50 text-xs space-y-1"
                      >
                        <div className="font-bold text-white">{person.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {person.title}, {map.companyName}
                        </div>
                        <div className="text-[10px] text-amber-300 font-mono">
                          Scope: {person.dncScope || 'team'} • Reason: {person.dncReason || 'Requested no contact.'}
                        </div>
                      </div>
                    ))}
                  {wspState.accountMaps.every((m) =>
                    m.people.every((p) => !p.isDoNotContact || p.isRemovedBySubject)
                  ) && (
                    <p className="text-xs text-slate-500 italic">
                      No active DNC flags recorded.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: SAVED PITCH & CALL RULES */}
      {activeSubTab === 'pitch-rules' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div>
              <h2 className="text-base font-bold text-white">
                WhichShittyPitch Saved Pitch &amp; Call Rules Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Shared across all seats on your WhichShittyPitch Sidecar subscription.
              </p>
            </div>

            {/* Saved Pitch Box */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-sky-400 block">
                Saved Core Pitch (Used in Cold-Call Script Generation)
              </label>
              <textarea
                rows={3}
                value={wspState.sidecarConfig.savedPitch}
                onChange={(e) =>
                  onUpdateWspState({
                    ...wspState,
                    sidecarConfig: { ...wspState.sidecarConfig, savedPitch: e.target.value },
                  })
                }
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white leading-relaxed focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* Rules List */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
                WhichShittyPitch Calling Protocol Rules
              </label>
              <div className="space-y-2">
                {wspState.sidecarConfig.callRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 0: CREATE NEW ACCOUNT MAP */}
      {addAccountMapModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>Create B2B Account Map</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddAccountMapModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAccountMap} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newMapCompanyName}
                  onChange={(e) => setNewMapCompanyName(e.target.value)}
                  placeholder="e.g. Lone Star Commercial HVAC"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Industry / Trade</label>
                <input
                  type="text"
                  value={newMapIndustry}
                  onChange={(e) => setNewMapIndustry(e.target.value)}
                  placeholder="e.g. Commercial HVAC & Mechanical"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Website URL</label>
                <input
                  type="text"
                  value={newMapWebsite}
                  onChange={(e) => setNewMapWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">City / Headquarters</label>
                <input
                  type="text"
                  value={newMapHeadquarters}
                  onChange={(e) => setNewMapHeadquarters(e.target.value)}
                  placeholder="e.g. Austin, TX"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Observable Friction Point *</label>
                <textarea
                  rows={2}
                  required
                  value={newMapFriction}
                  onChange={(e) => setNewMapFriction(e.target.value)}
                  placeholder="Specific website or mobile quote problem observed..."
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddAccountMapModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
                >
                  Create Account Map
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD PERSON TO ACCOUNT MAP */}
      {addPersonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-sky-400" />
                <span>Add Person to Account Map</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddPersonModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPersonToMap} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Target Account *</label>
                <select
                  value={selectedMapIdForPerson}
                  onChange={(e) => setSelectedMapIdForPerson(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  {wspState.accountMaps.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Richard Hendricks"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  data-testid="input-new-person-name"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operations Director"
                  value={newPersonTitle}
                  onChange={(e) => setNewPersonTitle(e.target.value)}
                  data-testid="input-new-person-title"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Role Category</label>
                <select
                  value={newPersonRole}
                  onChange={(e) =>
                    setNewPersonRole(e.target.value as AccountMapPerson['roleCategory'])
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="Decision Maker">Decision Maker</option>
                  <option value="Influencer">Influencer</option>
                  <option value="Operations">Operations</option>
                  <option value="Gatekeeper">Gatekeeper</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Direct Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="(555) 123-4567"
                  value={newPersonPhone}
                  onChange={(e) => setNewPersonPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Direct Email (Optional)</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={newPersonEmail}
                  onChange={(e) => setNewPersonEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddPersonModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-new-person-btn"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
                >
                  Save Person to Map
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NOTE TO CALL */}
      {addNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Add Note to Call</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddNoteModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNoteToCall} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Select Call *</label>
                <select
                  value={selectedCallIdForNote}
                  onChange={(e) => setSelectedCallIdForNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  {wspState.callLogs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.contactName}) — {c.callDate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Note Content *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail what buyer said, objections raised, or agreed demo scope..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  data-testid="input-new-note-content"
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddNoteModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-new-note-btn"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Save Call Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SCHEDULE FOLLOW-UP FOR TEAM MEMBER */}
      {followUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Set Follow-up for Team Member</span>
              </h3>
              <button
                type="button"
                onClick={() => setFollowUpModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSetFollowUp} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Account &amp; Contact *</label>
                <select
                  value={selectedCallIdForFollowUp}
                  onChange={(e) => setSelectedCallIdForFollowUp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  {wspState.callLogs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} — {c.contactName} ({c.contactTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Assign Follow-Up To *</label>
                <select
                  value={followUpAssigneeId}
                  onChange={(e) => setFollowUpAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Due Date *</label>
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Follow-Up Action *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call direct line after lunch or send mobile fix loom video"
                  value={followUpTask}
                  onChange={(e) => setFollowUpTask(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFollowUpModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-followup-btn"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Schedule Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM DNC (INDIVIDUAL, MULTIPLE, OR TEAM) */}
      {dncModalOpen && selectedPersonForDnc && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Mark Contact as Do-Not-Contact (DNC)</span>
              </h3>
              <button
                type="button"
                onClick={() => setDncModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Set DNC enforcement for <strong>{selectedPersonForDnc.name}</strong>. WhichShittyPitch will block cold outreach and highlight compliance flags.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">DNC Enforcement Scope *</label>
                <select
                  value={dncScope}
                  onChange={(e) => setDncScope(e.target.value as 'individual' | 'multiple' | 'team')}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="team">Whole Team (All Reps &amp; Seats)</option>
                  <option value="multiple">Multiple Campaign Operators</option>
                  <option value="individual">Individual Member Only ({activeMember.name})</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Reason for DNC *</label>
                <input
                  type="text"
                  value={dncReason}
                  onChange={(e) => setDncReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDncModalOpen(false)}
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDnc}
                data-testid="confirm-dnc-btn"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Confirm DNC Restriction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
