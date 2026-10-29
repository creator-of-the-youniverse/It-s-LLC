/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AppNotification,
  BudgetBucket,
  CallLog,
  CampaignSettings,
  CampaignState,
  DailyReviewEntry,
  DeliveryStatus,
  FinancialTransaction,
  FulfillmentProject,
  NotificationPreferences,
  OfferDefinition,
  PipelineStage,
  PlaybookScript,
  Proposal,
  ProposalStatus,
  Prospect,
  ProspectStepClaims,
  RoadmapTask,
  ScenarioConfig,
  TaskStatus,
  TeamActivityEvent,
  TeamMember,
  TransactionType,
  WhichShittyPitchState,
} from './types';
import {
  createInitialRealState,
  generate30DayRoadmap,
} from './data/pdfPlanData';
import {
  canRecordMilestonePayment,
  getActiveCampaignDay,
} from './utils/calculations';
import { OnboardingModal } from './components/OnboardingModal';
import { CommandCenterView } from './components/CommandCenterView';
import { RoadmapAndMissionView } from './components/RoadmapAndMissionView';
import { OffersAndModelView } from './components/OffersAndModelView';
import { PipelineAndCrmView } from './components/PipelineAndCrmView';
import { CallsAndPlaybookView } from './components/CallsAndPlaybookView';
import { ProposalsAndDeliveryView } from './components/ProposalsAndDeliveryView';
import { CashAndCapitalView } from './components/CashAndCapitalView';
import { AnalyticsReviewsSettingsView } from './components/AnalyticsReviewsSettingsView';
import { OfflineIndicator, PWAInstallCard } from './components/PWAInstallCard';
import { GoogleWorkspaceHubView } from './components/GoogleWorkspaceHubView';
import { TeamAuthModal, TeamSidebarTriggerCard } from './components/TeamAuthModalAndBar';
import { TeamWarRoomView } from './components/TeamWarRoomView';
import { WhichShittyPitchView } from './components/WhichShittyPitchView';
import { createInitialWhichShittyPitchState } from './data/whichShittyPitchData';
import { ThemeSelector } from './components/ThemeSelector';
import { useAppTheme } from './utils/theme';
import { NotificationCenter } from './components/NotificationCenter';
import {
  CreateNotificationModal,
  NotificationPresetTarget,
} from './components/CreateNotificationModal';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  deliverNotification,
} from './utils/notifications';
import { playNotificationChime } from './utils/notificationSound';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import {
  CAMPAIGN_ID,
  subscribeToCampaign,
  ensureCampaignExistsInFirestore,
  persistCampaignSettingsToFirestore,
  persistProspectToFirestore,
  deleteProspectFromFirestore,
  persistCallLogToFirestore,
  persistProposalToFirestore,
  persistProjectToFirestore,
  persistTaskToFirestore,
  persistTransactionToFirestore,
  persistActivityEventToFirestore,
} from './services/firestoreSync';
import { UserAuthHeaderWidget } from './components/UserAuthHeaderWidget';
import {
  LayoutDashboard,
  Calendar,
  Target,
  Package,
  Kanban,
  Users,
  PhoneCall,
  FileSignature,
  Truck,
  Wallet,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Settings,
  Globe,
  Trophy,
  Flame,
  Menu,
  X,
} from 'lucide-react';

const REAL_STORAGE_KEY = 'its_llc_real_campaign_v1';
const ACTIVE_OPERATOR_KEY = 'its_llc_active_operator_id_v1';

interface NavItem {
  id: string;
  label: string;
  shortTopLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'command', label: '1. Command Center', shortTopLabel: 'Command', icon: LayoutDashboard },
  { id: 'roadmap', label: '2. 30-Day Roadmap', shortTopLabel: 'Roadmap', icon: Calendar },
  { id: 'mission', label: "3. Today's Mission", shortTopLabel: 'Mission', icon: Target },
  { id: 'offers', label: '4. Offers & Revenue Model', icon: Package },
  { id: 'pipeline', label: '5. Sales Pipeline', shortTopLabel: 'Pipeline', icon: Kanban },
  { id: 'contacts', label: '6. Prospects & Contacts', icon: Users },
  { id: 'calls', label: '7. Calls, Follow-ups & Demos', icon: PhoneCall },
  { id: 'proposals', label: '8. Proposals & Deals', icon: FileSignature },
  { id: 'delivery', label: '9. Delivery & Fulfillment', icon: Truck },
  { id: 'cash', label: '10. Cash & Capital', shortTopLabel: 'Cash', icon: Wallet },
  { id: 'analytics', label: '11. Performance & Analytics', icon: BarChart3 },
  { id: 'playbook', label: '12. Scripts & Sales Playbook', icon: BookOpen },
  { id: 'reviews', label: '13. Daily Reviews', icon: ClipboardCheck },
  { id: 'settings', label: '14. Settings & Data', icon: Settings },
  { id: 'workspace', label: '15. Google Workspace Hub', icon: Globe },
  { id: 'team', label: '16. Team War Room & Charts', shortTopLabel: 'Team', icon: Trophy },
  { id: 'whichshittypitch', label: '17. WhichShittyPitch Plugin', shortTopLabel: 'WhichShittyPitch', icon: Flame },
];

export default function App() {
  useAppTheme();
  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialTabParam = searchParams?.get('tab');
  const isAutostart = searchParams?.get('autostart') === '1' || Boolean(initialTabParam);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (initialTabParam && NAV_ITEMS.some((item) => item.id === initialTabParam)) {
      return initialTabParam;
    }
    return 'command';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [preselectedCallProspectId, setPreselectedCallProspectId] = useState<string | null>(null);
  const [teamAuthModalOpen, setTeamAuthModalOpen] = useState<boolean>(false);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [activeMemberId, setActiveMemberId] = useState<string>(
    () => localStorage.getItem(ACTIVE_OPERATOR_KEY) || ''
  );
  const [createNotificationModalOpen, setCreateNotificationModalOpen] = useState<boolean>(false);
  const [activeNotificationPreset, setActiveNotificationPreset] = useState<NotificationPresetTarget | null>(null);

  const [realState, setRealState] = useState<CampaignState>(() => {
    const cached = localStorage.getItem(REAL_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CampaignState;
        if (isAutostart) {
          parsed.settings.onboardingCompleted = true;
        }
        return { ...parsed, isDemoMode: false };
      } catch (e) {
        // fallback
      }
    }
    const init = createInitialRealState();
    if (isAutostart) {
      init.settings.onboardingCompleted = true;
    }
    return init;
  });

  const activeState = realState;

  const teamMembersList: TeamMember[] =
    activeState.teamMembers && activeState.teamMembers.length > 0
      ? activeState.teamMembers
      : [
          {
            id: 'member-lead',
            name: activeState.settings.operatorName || 'Founder',
            email: 'itsyouonlinedotcom@gmail.com',
            role: 'Campaign Lead & Closer',
            avatarColor: '#38bdf8',
            joinedAt: activeState.settings.startDate,
            lastActiveAt: new Date().toISOString(),
            authProvider: 'team',
          },
        ];

  const activeMember: TeamMember =
    teamMembersList.find((m) => m.id === activeMemberId) || teamMembersList[0];

  // Sync with backend Express server on initial load + subscribe to SSE live team stream
  useEffect(() => {
    fetch('/api/campaign')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverState: CampaignState | null) => {
        if (!serverState || !serverState.settings) return;
        if (!localStorage.getItem(REAL_STORAGE_KEY)) {
          if (isAutostart) {
            serverState.settings.onboardingCompleted = true;
          }
          setRealState({ ...serverState, isDemoMode: false });
        }
      })
      .catch(() => {
        // Offline / localStorage fallback remains active
      });
  }, [isAutostart]);

  // Real-time Firestore sync & persistent cloud memory (attached only when authenticated)
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      if (user) {
        try {
          unsubFirestore = subscribeToCampaign(
            CAMPAIGN_ID,
            (cloudData) => {
              setRealState((prevState) => {
                let hasChanges = false;
                const updated = { ...prevState };

                if (cloudData.prospects && cloudData.prospects.length > 0) {
                  updated.prospects = cloudData.prospects;
                  hasChanges = true;
                }
                if (cloudData.calls && cloudData.calls.length > 0) {
                  updated.callLogs = cloudData.calls;
                  hasChanges = true;
                }
                if (cloudData.proposals && cloudData.proposals.length > 0) {
                  updated.proposals = cloudData.proposals;
                  hasChanges = true;
                }
                if (cloudData.projects && cloudData.projects.length > 0) {
                  updated.projects = cloudData.projects;
                  hasChanges = true;
                }
                if (cloudData.tasks && cloudData.tasks.length > 0) {
                  const cloudTaskMap = new Map(cloudData.tasks.map((t) => [t.id, t]));
                  updated.tasks = prevState.tasks.map((t) => cloudTaskMap.get(t.id) || t);
                  hasChanges = true;
                }
                if (cloudData.transactions && cloudData.transactions.length > 0) {
                  updated.transactions = cloudData.transactions;
                  hasChanges = true;
                }
                if (cloudData.activity && cloudData.activity.length > 0) {
                  updated.teamActivityFeed = cloudData.activity;
                  hasChanges = true;
                }
                if (cloudData.campaignDoc) {
                  const doc = cloudData.campaignDoc as Record<string, unknown>;
                  if (doc.startDate) {
                    updated.settings = {
                      ...updated.settings,
                      startDate: (doc.startDate as string) || updated.settings.startDate,
                      operatorName: (doc.operatorName as string) || updated.settings.operatorName,
                      selectedNiche: (doc.selectedNiche as string) || updated.settings.selectedNiche,
                      demoSiteUrl: (doc.demoSiteUrl as string) || updated.settings.demoSiteUrl,
                      startingWorkingCapital:
                        typeof doc.startingWorkingCapital === 'number'
                          ? doc.startingWorkingCapital
                          : updated.settings.startingWorkingCapital,
                      protectedReserve:
                        typeof doc.protectedReserve === 'number'
                          ? doc.protectedReserve
                          : updated.settings.protectedReserve,
                      onboardingCompleted: true,
                    };
                    hasChanges = true;
                  }
                }

                if (hasChanges) {
                  localStorage.setItem(REAL_STORAGE_KEY, JSON.stringify(updated));
                  return updated;
                }
                return prevState;
              });
            },
            (err) => {
              console.warn('Firestore subscription status:', err);
            }
          );
        } catch (e) {
          console.warn('Firestore subscription not available:', e);
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  }, []);

  const handleUserChanged = (u: User | null) => {
    if (u) {
      const realName = u.displayName || u.email?.split('@')[0] || 'Operator';
      const realEmail = u.email || 'operator@gmail.com';
      const existing = teamMembersList.find(
        (m) => m.email.toLowerCase() === realEmail.toLowerCase()
      );
      if (!existing) {
        const newMember: TeamMember = {
          id: `member-${u.uid}`,
          name: realName,
          email: realEmail,
          role: 'Campaign Lead',
          avatarColor: '#38bdf8',
          joinedAt: new Date().toISOString().slice(0, 10),
          lastActiveAt: new Date().toISOString(),
          authProvider: 'google',
        };
        const nextList = [newMember, ...teamMembersList];
        setActiveMemberId(newMember.id);
        localStorage.setItem(ACTIVE_OPERATOR_KEY, newMember.id);
        persistUpdatedState({
          ...activeState,
          teamMembers: nextList,
          settings: {
            ...activeState.settings,
            operatorName:
              activeState.settings.operatorName === 'Founder' || !activeState.settings.operatorName
                ? realName
                : activeState.settings.operatorName,
          },
        });
      } else {
        setActiveMemberId(existing.id);
        localStorage.setItem(ACTIVE_OPERATOR_KEY, existing.id);
      }
      ensureCampaignExistsInFirestore(CAMPAIGN_ID, activeState, u).catch(() => {});
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/team/stream');
      es.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data);
          if (typeof parsed.onlineCount === 'number') {
            setOnlineCount(Math.max(1, parsed.onlineCount));
          }
          if (parsed.type === 'state:updated' && parsed.state) {
            setRealState({ ...parsed.state, isDemoMode: false });
            localStorage.setItem(REAL_STORAGE_KEY, JSON.stringify({ ...parsed.state, isDemoMode: false }));
          }
        } catch {
          // ignore malformed event
        }
      };
    } catch {
      // ignore offline
    }
    return () => {
      es?.close();
    };
  }, []);

  const persistUpdatedState = (nextState: CampaignState) => {
    const cleanState = { ...nextState, isDemoMode: false };
    setRealState(cleanState);
    localStorage.setItem(REAL_STORAGE_KEY, JSON.stringify(cleanState));
    fetch('/api/campaign', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanState),
    }).catch(() => {
      // Saved in localStorage
    });
    // Persist to Cloud Firestore persistent memory
    persistCampaignSettingsToFirestore(
      CAMPAIGN_ID,
      cleanState,
      auth.currentUser?.email || undefined
    ).catch(() => {});
  };

  const activeNotifications: AppNotification[] =
    activeState.notifications && activeState.notifications.length > 0
      ? activeState.notifications
      : [];

  const activeNotificationPrefs: NotificationPreferences =
    activeState.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;

  const handleOpenNotificationModal = (preset?: NotificationPresetTarget) => {
    setActiveNotificationPreset(preset || null);
    setCreateNotificationModalOpen(true);
  };

  const handleUpdateNotifications = (nextNotifs: AppNotification[]) => {
    persistUpdatedState({
      ...activeState,
      notifications: nextNotifs,
    });
  };

  const handleUpdateNotificationPreferences = (nextPrefs: NotificationPreferences) => {
    persistUpdatedState({
      ...activeState,
      notificationPreferences: nextPrefs,
    });
  };

  const handleSaveNotification = (newNotif: AppNotification) => {
    const currentNotifs = activeNotifications;
    const nextNotifs = [newNotif, ...currentNotifs];

    const ev: TeamActivityEvent = {
      id: `act-notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      memberId: activeMember.id,
      memberName: activeMember.name,
      actionType: 'CUSTOM_LOG',
      targetTitle: `Reminder Scheduled: ${newNotif.title}`,
      detail: `[${newNotif.category}] ${newNotif.message.slice(0, 80)}`,
    };

    persistUpdatedState({
      ...activeState,
      notifications: nextNotifs,
      teamActivityFeed: [ev, ...(activeState.teamActivityFeed || [])],
    });

    if (activeNotificationPrefs.soundEnabled) {
      playNotificationChime(newNotif.priority);
    }
  };

  // Check due notifications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const currentNotifs = activeState.notifications;
      if (!currentNotifs || currentNotifs.length === 0) return;
      const now = Date.now();
      let hasDueUpdates = false;

      const nextNotifs = currentNotifs.map((n) => {
        if (!n.delivered && n.dueDateTime) {
          const dueTime = new Date(n.dueDateTime).getTime();
          if (now >= dueTime) {
            deliverNotification(n, activeNotificationPrefs);
            hasDueUpdates = true;
            return { ...n, delivered: true, read: false };
          }
        }
        return n;
      });

      if (hasDueUpdates) {
        persistUpdatedState({
          ...activeState,
          notifications: nextNotifs,
        });
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [activeState, activeNotificationPrefs]);

  const handleSelectActiveMember = (member: TeamMember) => {
    setActiveMemberId(member.id);
    localStorage.setItem(ACTIVE_OPERATOR_KEY, member.id);
  };

  const handleAddOrSignInTeamMember = (member: TeamMember) => {
    const existingList = [...teamMembersList];
    const idx = existingList.findIndex((m) => m.id === member.id);
    if (idx >= 0) {
      existingList[idx] = member;
    } else {
      existingList.push(member);
    }
    const newEvent: TeamActivityEvent = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      memberId: member.id,
      memberName: member.name,
      actionType: 'MEMBER_JOINED',
      targetTitle: `${member.name} signed in (${member.role})`,
      detail: 'Joined the shared $20,000 30-day campaign squad',
    };
    handleSelectActiveMember(member);
    persistUpdatedState({
      ...activeState,
      teamMembers: existingList,
      teamActivityFeed: [newEvent, ...(activeState.teamActivityFeed || [])],
    });
  };

  const handleSendInFullSquad = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const specialistSquad: TeamMember[] = [
      {
        id: 'team-alex',
        name: 'Alex Rivera',
        email: 'alex@itsllc.team',
        role: 'Outbound Caller (9–11 AM Block)',
        avatarColor: '#38bdf8',
        joinedAt: todayStr,
        lastActiveAt: new Date().toISOString(),
        authProvider: 'team',
      },
      {
        id: 'team-jordan',
        name: 'Jordan Vance',
        email: 'jordan@itsllc.team',
        role: '10-Min Demo Specialist',
        avatarColor: '#10b981',
        joinedAt: todayStr,
        lastActiveAt: new Date().toISOString(),
        authProvider: 'team',
      },
      {
        id: 'team-morgan',
        name: 'Morgan Chen',
        email: 'morgan@itsllc.team',
        role: 'Proposals & Deposit Closer',
        avatarColor: '#f59e0b',
        joinedAt: todayStr,
        lastActiveAt: new Date().toISOString(),
        authProvider: 'team',
      },
      {
        id: 'team-sam',
        name: 'Sam Taylor',
        email: 'sam@itsllc.team',
        role: '5-Page Build & Automation Delivery',
        avatarColor: '#a855f7',
        joinedAt: todayStr,
        lastActiveAt: new Date().toISOString(),
        authProvider: 'team',
      },
    ];

    const mergedRoster = [...teamMembersList];
    specialistSquad.forEach((sp) => {
      if (
        !mergedRoster.some(
          (m) => m.id === sp.id || m.name.toLowerCase() === sp.name.toLowerCase()
        )
      ) {
        mergedRoster.push(sp);
      }
    });

    const activeDay = getActiveCampaignDay(
      activeState.settings.startDate,
      activeState.settings.currentDayOverride
    );

    // Automatically assign unclaimed tasks on the active day across the squad so they hit the ground running
    const updatedTasks = activeState.tasks.map((t, i) => {
      if (t.dayNumber === activeDay && !t.claimedByMemberId) {
        const assigned = mergedRoster[i % mergedRoster.length];
        return {
          ...t,
          claimedByMemberId: assigned.id,
          claimedByName: assigned.name,
        };
      }
      return t;
    });

    const callerMember =
      mergedRoster.find((m) => m.id === 'team-alex') || mergedRoster[0];
    const demoMember =
      mergedRoster.find((m) => m.id === 'team-jordan') ||
      mergedRoster[1 % mergedRoster.length];
    const closerMember =
      mergedRoster.find((m) => m.id === 'team-morgan') ||
      mergedRoster[2 % mergedRoster.length];
    const builderMember =
      mergedRoster.find((m) => m.id === 'team-sam') ||
      mergedRoster[3 % mergedRoster.length];

    const updatedProspects = activeState.prospects.map((p) => {
      const nextStepClaims: ProspectStepClaims = { ...(p.stepClaims || {}) };
      if (!nextStepClaims.researchAndCall) {
        nextStepClaims.researchAndCall = {
          memberId: callerMember.id,
          memberName: callerMember.name,
          claimedAt: todayStr,
        };
      }
      if (!nextStepClaims.demoExecution) {
        nextStepClaims.demoExecution = {
          memberId: demoMember.id,
          memberName: demoMember.name,
          claimedAt: todayStr,
        };
      }
      if (!nextStepClaims.proposalFollowUp) {
        nextStepClaims.proposalFollowUp = {
          memberId: closerMember.id,
          memberName: closerMember.name,
          claimedAt: todayStr,
        };
      }
      return {
        ...p,
        claimedByMemberId: p.claimedByMemberId || callerMember.id,
        claimedByName: p.claimedByName || callerMember.name,
        stepClaims: nextStepClaims,
      };
    });

    const updatedProposals = activeState.proposals.map((prop) => ({
      ...prop,
      claimedByMemberId: prop.claimedByMemberId || closerMember.id,
      claimedByName: prop.claimedByName || closerMember.name,
    }));

    const updatedProjects = activeState.projects.map((proj) => ({
      ...proj,
      claimedByMemberId: proj.claimedByMemberId || builderMember.id,
      claimedByName: proj.claimedByName || builderMember.name,
      milestones: proj.milestones.map((ms) => ({
        ...ms,
        claimedByMemberId: ms.claimedByMemberId || builderMember.id,
        claimedByName: ms.claimedByName || builderMember.name,
      })),
    }));

    const squadEvent: TeamActivityEvent = {
      id: `act-squad-${Date.now()}`,
      timestamp: new Date().toISOString(),
      memberId: activeMember.id,
      memberName: activeMember.name,
      actionType: 'MEMBER_JOINED',
      targetTitle: 'Full 4-Specialist Squad Deployed ("Send in the Team")',
      detail:
        'Deployed Outbound Caller, 10-Min Demo Specialist, Deposit Closer, and Delivery Builder to the shared $20,000 campaign.',
    };

    persistUpdatedState({
      ...activeState,
      teamMembers: mergedRoster,
      tasks: updatedTasks,
      prospects: updatedProspects,
      proposals: updatedProposals,
      projects: updatedProjects,
      teamActivityFeed: [squadEvent, ...(activeState.teamActivityFeed || [])],
    });
    setActiveTab('team');
  };

  const handleClaimTask = (taskId: string) => {
    const target = activeState.tasks.find((t) => t.id === taskId);
    if (!target) return;
    const isReleasing = target.claimedByMemberId === activeMember.id;
    const nextTasks = activeState.tasks.map((t) => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        claimedByMemberId: isReleasing ? undefined : activeMember.id,
        claimedByName: isReleasing ? undefined : activeMember.name,
      };
    });

    const ev: TeamActivityEvent = {
      id: `act-task-${Date.now()}`,
      timestamp: new Date().toISOString(),
      memberId: activeMember.id,
      memberName: activeMember.name,
      actionType: isReleasing ? 'STEP_RELEASED' : 'STEP_CLAIMED',
      targetTitle: target.title,
      detail: isReleasing
        ? `Released Day ${target.dayNumber} task back to open queue`
        : `Claimed Day ${target.dayNumber} task (${target.dueTimeBlock || 'Scheduled'})`,
    };

    persistUpdatedState({
      ...activeState,
      tasks: nextTasks,
      teamActivityFeed: [ev, ...(activeState.teamActivityFeed || [])],
    });
  };

  const handleClaimProspectStep = (
    prospectId: string,
    stepKey: keyof ProspectStepClaims
  ) => {
    const target = activeState.prospects.find((p) => p.id === prospectId);
    if (!target) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const existingClaim = target.stepClaims?.[stepKey];
    const isReleasing = existingClaim?.memberId === activeMember.id;

    const stepLabels: Record<keyof ProspectStepClaims, string> = {
      researchAndCall: 'Step 1: Outbound Call',
      demoExecution: 'Step 2: 10-Min Demo',
      proposalFollowUp: 'Step 3: Written Proposal',
      closeAndDeposit: 'Step 4: Close & 50% Deposit',
    };

    const nextProspects = activeState.prospects.map((p) => {
      if (p.id !== prospectId) return p;
      const nextStepClaims: ProspectStepClaims = { ...(p.stepClaims || {}) };
      if (isReleasing) {
        delete nextStepClaims[stepKey];
      } else {
        nextStepClaims[stepKey] = {
          memberId: activeMember.id,
          memberName: activeMember.name,
          claimedAt: todayStr,
        };
      }
      return {
        ...p,
        claimedByMemberId: isReleasing ? p.claimedByMemberId : activeMember.id,
        claimedByName: isReleasing ? p.claimedByName : activeMember.name,
        stepClaims: nextStepClaims,
      };
    });

    const ev: TeamActivityEvent = {
      id: `act-pstep-${Date.now()}`,
      timestamp: new Date().toISOString(),
      memberId: activeMember.id,
      memberName: activeMember.name,
      actionType: isReleasing ? 'STEP_RELEASED' : 'STEP_CLAIMED',
      targetTitle: `${target.businessName} — ${stepLabels[stepKey]}`,
      detail: isReleasing
        ? `Released ${stepLabels[stepKey]} for another operator to take`
        : `Claimed ${stepLabels[stepKey]} ($${target.estimatedValue.toLocaleString()} pipeline value)`,
    };

    persistUpdatedState({
      ...activeState,
      prospects: nextProspects,
      teamActivityFeed: [ev, ...(activeState.teamActivityFeed || [])],
    });
  };

  const handleClaimProposal = (proposalId: string) => {
    const prop = activeState.proposals.find((p) => p.id === proposalId);
    if (!prop) return;
    const isReleasing = prop.claimedByMemberId === activeMember.id;
    const nextProposals = activeState.proposals.map((p) =>
      p.id === proposalId
        ? {
            ...p,
            claimedByMemberId: isReleasing ? undefined : activeMember.id,
            claimedByName: isReleasing ? undefined : activeMember.name,
          }
        : p
    );

    const ev: TeamActivityEvent = {
      id: `act-prop-${Date.now()}`,
      timestamp: new Date().toISOString(),
      memberId: activeMember.id,
      memberName: activeMember.name,
      actionType: isReleasing ? 'STEP_RELEASED' : 'STEP_CLAIMED',
      targetTitle: `${prop.customerName} Proposal ($${prop.totalPrice.toLocaleString()})`,
      detail: isReleasing
        ? 'Released proposal ownership'
        : `Claimed proposal follow-up & deposit closing`,
    };

    persistUpdatedState({
      ...activeState,
      proposals: nextProposals,
      teamActivityFeed: [ev, ...(activeState.teamActivityFeed || [])],
    });
  };

  const handleClaimDeliveryMilestone = (projectId: string, milestoneId: string) => {
    const proj = activeState.projects.find((p) => p.id === projectId);
    if (!proj) return;
    const ms = proj.milestones.find((m) => m.id === milestoneId);
    if (!ms) return;
    const isReleasing = ms.claimedByMemberId === activeMember.id;

    const nextProjects = activeState.projects.map((p) => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        claimedByMemberId: isReleasing ? p.claimedByMemberId : activeMember.id,
        claimedByName: isReleasing ? p.claimedByName : activeMember.name,
        milestones: p.milestones.map((m) =>
          m.id === milestoneId
            ? {
                ...m,
                claimedByMemberId: isReleasing ? undefined : activeMember.id,
                claimedByName: isReleasing ? undefined : activeMember.name,
              }
            : m
        ),
      };
    });

    const ev: TeamActivityEvent = {
      id: `act-deliv-${Date.now()}`,
      timestamp: new Date().toISOString(),
      memberId: activeMember.id,
      memberName: activeMember.name,
      actionType: isReleasing ? 'STEP_RELEASED' : 'STEP_CLAIMED',
      targetTitle: `${proj.customerName} — ${ms.title}`,
      detail: isReleasing
        ? 'Released delivery milestone'
        : 'Claimed client fulfillment milestone',
    };

    persistUpdatedState({
      ...activeState,
      projects: nextProjects,
      teamActivityFeed: [ev, ...(activeState.teamActivityFeed || [])],
    });
  };

  const handleUpdateWspState = (nextWsp: WhichShittyPitchState) => {
    persistUpdatedState({
      ...activeState,
      whichShittyPitch: nextWsp,
    });
  };

  const handleSyncCampaignState = (freshState: CampaignState) => {
    const cleanState = { ...freshState, isDemoMode: false };
    setRealState(cleanState);
    localStorage.setItem(REAL_STORAGE_KEY, JSON.stringify(cleanState));
  };

  // Handlers for updating state slices
  const handleToggleTaskStatus = (taskId: string) => {
    const target = activeState.tasks.find((t) => t.id === taskId);
    let updatedTask: RoadmapTask | null = null;
    const nextTasks = activeState.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const nextStatus =
        t.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED;
      const res: RoadmapTask = {
        ...t,
        status: nextStatus,
        completedAt: nextStatus === TaskStatus.COMPLETED ? new Date().toISOString() : undefined,
        claimedByMemberId: t.claimedByMemberId || activeMember.id,
        claimedByName: t.claimedByName || activeMember.name,
        completedByMemberId: nextStatus === TaskStatus.COMPLETED ? activeMember.id : undefined,
        completedByName: nextStatus === TaskStatus.COMPLETED ? activeMember.name : undefined,
      };
      updatedTask = res;
      return res;
    });
    const nextFeed = [...(activeState.teamActivityFeed || [])];
    if (target && target.status !== TaskStatus.COMPLETED) {
      nextFeed.unshift({
        id: `act-tcomp-${Date.now()}`,
        timestamp: new Date().toISOString(),
        memberId: activeMember.id,
        memberName: activeMember.name,
        actionType: 'TASK_COMPLETED',
        targetTitle: target.title,
        detail: `Completed Day ${target.dayNumber} checklist item`,
      });
    }
    persistUpdatedState({
      ...activeState,
      tasks: nextTasks,
      teamActivityFeed: nextFeed,
    });
    if (updatedTask) {
      persistTaskToFirestore(CAMPAIGN_ID, updatedTask).catch(() => {});
    }
  };

  const handleUpdateTask = (updated: RoadmapTask) => {
    const nextTasks = activeState.tasks.map((t) => (t.id === updated.id ? updated : t));
    persistUpdatedState({ ...activeState, tasks: nextTasks });
    persistTaskToFirestore(CAMPAIGN_ID, updated).catch(() => {});
  };

  const handleAddTask = (newTask: RoadmapTask) => {
    persistUpdatedState({
      ...activeState,
      tasks: [...activeState.tasks, newTask],
    });
    persistTaskToFirestore(CAMPAIGN_ID, newTask).catch(() => {});
  };

  const handleDeleteTask = (taskId: string) => {
    const nextTasks = activeState.tasks.filter((t) => t.id !== taskId);
    persistUpdatedState({ ...activeState, tasks: nextTasks });
  };

  const handleBatchToggleTasks = (taskIds: string[], completed: boolean) => {
    const now = new Date().toISOString();
    const nextTasks = activeState.tasks.map((t) => {
      if (!taskIds.includes(t.id)) return t;
      return {
        ...t,
        status: completed ? TaskStatus.COMPLETED : TaskStatus.PENDING,
        completedAt: completed ? now : undefined,
        completedByMemberId: completed ? activeMember.id : undefined,
        completedByName: completed ? activeMember.name : undefined,
      };
    });
    persistUpdatedState({ ...activeState, tasks: nextTasks });
  };

  const handleResetDayTasksToPdf = (dayNumber: number) => {
    const allPdfTasks = generate30DayRoadmap();
    const originalDayPdfTasks = allPdfTasks.filter((t) => t.dayNumber === dayNumber);
    const nonDayTasks = activeState.tasks.filter((t) => t.dayNumber !== dayNumber);
    persistUpdatedState({
      ...activeState,
      tasks: [...nonDayTasks, ...originalDayPdfTasks],
    });
  };

  const handleUpdateOffer = (updatedOffer: OfferDefinition) => {
    const nextOffers = activeState.offers.map((o) =>
      o.id === updatedOffer.id ? updatedOffer : o
    );
    persistUpdatedState({ ...activeState, offers: nextOffers });
  };

  const handleUpdateScenario = (updatedScenario: ScenarioConfig) => {
    const nextScenarios = activeState.scenarios.map((s) =>
      s.id === updatedScenario.id ? updatedScenario : s
    );
    persistUpdatedState({ ...activeState, scenarios: nextScenarios });
  };

  const handleAddProspect = (prospect: Prospect) => {
    persistUpdatedState({
      ...activeState,
      prospects: [prospect, ...activeState.prospects],
    });
    persistProspectToFirestore(CAMPAIGN_ID, prospect).catch(() => {});
  };

  const handleUpdateProspect = (updated: Prospect) => {
    const nextProspects = activeState.prospects.map((p) =>
      p.id === updated.id ? updated : p
    );
    persistUpdatedState({ ...activeState, prospects: nextProspects });
    persistProspectToFirestore(CAMPAIGN_ID, updated).catch(() => {});
  };

  const handleImportProspects = (imported: Prospect[]) => {
    const existingNames = new Set(
      activeState.prospects.map((p) => p.businessName.trim().toLowerCase())
    );
    const uniqueNew = imported.filter(
      (p) => !existingNames.has(p.businessName.trim().toLowerCase())
    );
    persistUpdatedState({
      ...activeState,
      prospects: [...uniqueNew, ...activeState.prospects],
    });
    uniqueNew.forEach((p) => {
      persistProspectToFirestore(CAMPAIGN_ID, p).catch(() => {});
    });
  };

  const handleCreateProposalFromProspect = (prospect: Prospect) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const price = prospect.estimatedValue || 1500;
    const half = Math.round(price * 0.5);
    const rem = price - half;

    const newProp: Proposal = {
      id: `prop-${Date.now()}`,
      prospectId: prospect.id,
      customerName: prospect.businessName,
      contactName: prospect.contactName,
      offerCode: prospect.offerInterest,
      title:
        price >= 2500
          ? 'Fixed-Scope Website + Lead Follow-Up Automation ($2,500)'
          : 'Fixed-Scope Small-Business Website ($1,500)',
      scopeSummary: `Address observed issue ("${prospect.problemObserved}") with a 5-page mobile-responsive website, direct quote-request functionality, basic on-page SEO, analytics, and 2 revision rounds.`,
      deliverables: [
        'Defined 5-page mobile-responsive website',
        'Direct customer contact & quote-request flow',
        'Basic on-page SEO & analytics',
        '2 structured revision rounds',
      ],
      exclusions: [
        'No unlimited revisions',
        'No custom software or complex third-party integrations',
      ],
      revisionAllowance: '2 structured revision rounds',
      totalPrice: price,
      milestones: [
        {
          id: `ms-${Date.now()}-1`,
          label: `50% Upfront Deposit ($${half.toLocaleString()})`,
          amount: half,
          dueDescription: 'Upon proposal acceptance prior to build kickoff',
          isPaid: false,
        },
        {
          id: `ms-${Date.now()}-2`,
          label: `50% Final Milestone ($${rem.toLocaleString()})`,
          amount: rem,
          dueDescription: 'Upon agreed milestone completion and live review',
          isPaid: false,
        },
      ],
      estimatedDeliveryTimeline: '5 business days',
      expirationDate: todayStr,
      createdAt: todayStr,
      status: ProposalStatus.SENT,
      notes: `Generated from CRM record for ${prospect.businessName}.`,
    };

    const nextProspects = activeState.prospects.map((p) =>
      p.id === prospect.id ? { ...p, stage: PipelineStage.PROPOSAL_SENT } : p
    );

    persistUpdatedState({
      ...activeState,
      prospects: nextProspects,
      proposals: [newProp, ...activeState.proposals],
    });
    persistProposalToFirestore(CAMPAIGN_ID, newProp).catch(() => {});
    const updatedP = nextProspects.find((p) => p.id === prospect.id);
    if (updatedP) {
      persistProspectToFirestore(CAMPAIGN_ID, updatedP).catch(() => {});
    }
    setActiveTab('proposals');
  };

  const handleLogCall = (call: CallLog, updatedProspect?: Prospect) => {
    const nextProspects = updatedProspect
      ? activeState.prospects.map((p) => (p.id === updatedProspect.id ? updatedProspect : p))
      : activeState.prospects;

    persistUpdatedState({
      ...activeState,
      callLogs: [...activeState.callLogs, call],
      prospects: nextProspects,
    });
    persistCallLogToFirestore(CAMPAIGN_ID, call).catch(() => {});
    if (updatedProspect) {
      persistProspectToFirestore(CAMPAIGN_ID, updatedProspect).catch(() => {});
    }
  };

  const handleUpdateScript = (updated: PlaybookScript) => {
    const nextScripts = activeState.scripts.map((s) =>
      s.id === updated.id ? updated : s
    );
    persistUpdatedState({ ...activeState, scripts: nextScripts });
  };

  const handleAddScript = (newScript: PlaybookScript) => {
    persistUpdatedState({
      ...activeState,
      scripts: [...activeState.scripts, newScript],
    });
  };

  const handleAddProposal = (proposal: Proposal) => {
    persistUpdatedState({
      ...activeState,
      proposals: [proposal, ...activeState.proposals],
    });
  };

  const handleUpdateProposalStatus = (proposalId: string, newStatus: ProposalStatus) => {
    const targetProp = activeState.proposals.find((p) => p.id === proposalId);
    if (!targetProp) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const nextProposals = activeState.proposals.map((p) =>
      p.id === proposalId
        ? {
            ...p,
            status: newStatus,
            acceptedAt:
              newStatus === ProposalStatus.ACCEPTED ||
              newStatus === ProposalStatus.DEPOSIT_PAID ||
              newStatus === ProposalStatus.PAID_IN_FULL
                ? p.acceptedAt || todayStr
                : p.acceptedAt,
          }
        : p
    );

    // Ensure a FulfillmentProject exists if accepted
    let nextProjects = [...activeState.projects];
    const existingProj = nextProjects.find((pr) => pr.proposalId === proposalId);
    if (
      !existingProj &&
      (newStatus === ProposalStatus.ACCEPTED ||
        newStatus === ProposalStatus.DEPOSIT_PAID ||
        newStatus === ProposalStatus.PAID_IN_FULL)
    ) {
      nextProjects.unshift({
        id: `proj-${Date.now()}`,
        proposalId: targetProp.id,
        prospectId: targetProp.prospectId,
        customerName: targetProp.customerName,
        offerCode: targetProp.offerCode,
        projectTitle: `${targetProp.customerName} — ${targetProp.title}`,
        agreedScope: targetProp.scopeSummary,
        contractedValue: targetProp.totalPrice,
        clearedCashCollected: 0,
        remainingBalance: targetProp.totalPrice,
        status: DeliveryStatus.NOT_STARTED,
        milestones: [
          {
            id: `pm-${Date.now()}-1`,
            title: 'Lock 5-page mobile wireframe & quote form',
            completed: false,
            dueDate: todayStr,
          },
          {
            id: `pm-${Date.now()}-2`,
            title: 'Complete on-page SEO, analytics & revision round',
            completed: false,
            dueDate: todayStr,
          },
          {
            id: `pm-${Date.now()}-3`,
            title: 'Final milestone review & collect remaining 50% balance',
            completed: false,
            dueDate: todayStr,
          },
        ],
        customerDependencies: 'Confirm logo, phone number, and service list.',
        revisionsAllowed: 2,
        revisionsUsed: 0,
        estimatedHours: targetProp.offerCode === 'OFFER_A_AND_B' ? 16 : 10,
        actualHoursLogged: 0,
        directCostsIncurred: 0,
        startDate: todayStr,
        targetDeliveryDate: todayStr,
        supportObligations: 'Standard launch verification.',
      });
    }

    persistUpdatedState({
      ...activeState,
      proposals: nextProposals,
      projects: nextProjects,
    });
  };

  // Single authoritative payment recorder for proposal milestones (prevents double counting!)
  const handleCollectMilestonePayment = (proposalId: string, milestoneId: string) => {
    const check = canRecordMilestonePayment(
      activeState.transactions,
      proposalId,
      milestoneId
    );
    if (!check.allowed) return;

    const prop = activeState.proposals.find((p) => p.id === proposalId);
    if (!prop) return;
    const ms = prop.milestones.find((m) => m.id === milestoneId);
    if (!ms || ms.isPaid) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const activeDay = getActiveCampaignDay(
      activeState.settings.startDate,
      activeState.settings.currentDayOverride
    );
    const txId = `tx-${Date.now()}`;

    const isDeposit = ms.label.toLowerCase().includes('deposit');
    const offerCat =
      prop.offerCode === 'OFFER_A'
        ? 'Offer A: Small-business website'
        : prop.offerCode === 'OFFER_B'
          ? 'Offer B: Lead follow-up automation'
          : prop.offerCode === 'OFFER_A_AND_B'
            ? 'Offer A + Offer B'
            : 'Offer C: The Youniverse alpha';

    const newTx: FinancialTransaction = {
      id: txId,
      date: todayStr,
      dayNumber: activeDay,
      type: isDeposit ? TransactionType.REVENUE_DEPOSIT : TransactionType.REVENUE_MILESTONE,
      bucket: BudgetBucket.REVENUE_INFLOW,
      amount: ms.amount,
      description: `${prop.customerName} — ${ms.label}`,
      category: offerCat,
      relatedProposalId: prop.id,
      relatedMilestoneId: ms.id,
      notes: 'Recorded via Proposal Milestone Payment collector.',
      recordedByMemberId: activeMember.id,
      recordedByName: activeMember.name,
    };

    const updatedMilestones = prop.milestones.map((m) =>
      m.id === milestoneId ? { ...m, isPaid: true, paidTransactionId: txId } : m
    );
    const allPaid = updatedMilestones.every((m) => m.isPaid);
    const nextStatus = allPaid ? ProposalStatus.PAID_IN_FULL : ProposalStatus.DEPOSIT_PAID;

    const nextProposals = activeState.proposals.map((p) =>
      p.id === proposalId
        ? {
            ...p,
            milestones: updatedMilestones,
            status: nextStatus,
            acceptedAt: p.acceptedAt || todayStr,
          }
        : p
    );

    const totalClearedOnProp = updatedMilestones
      .filter((m) => m.isPaid)
      .reduce((a, b) => a + b.amount, 0);

    let nextProjects = [...activeState.projects];
    const existingProjIdx = nextProjects.findIndex((pr) => pr.proposalId === proposalId);

    if (existingProjIdx >= 0) {
      const existing = nextProjects[existingProjIdx];
      nextProjects[existingProjIdx] = {
        ...existing,
        clearedCashCollected: totalClearedOnProp,
        remainingBalance: Math.max(0, existing.contractedValue - totalClearedOnProp),
        status: allPaid
          ? DeliveryStatus.COMPLETE
          : existing.status === DeliveryStatus.NOT_STARTED
            ? DeliveryStatus.IN_PROGRESS
            : existing.status,
      };
    } else {
      nextProjects.unshift({
        id: `proj-${Date.now()}`,
        proposalId: prop.id,
        prospectId: prop.prospectId,
        customerName: prop.customerName,
        offerCode: prop.offerCode,
        projectTitle: `${prop.customerName} — ${prop.title}`,
        agreedScope: prop.scopeSummary,
        contractedValue: prop.totalPrice,
        clearedCashCollected: totalClearedOnProp,
        remainingBalance: Math.max(0, prop.totalPrice - totalClearedOnProp),
        status: allPaid ? DeliveryStatus.COMPLETE : DeliveryStatus.IN_PROGRESS,
        milestones: [
          {
            id: `pm-${Date.now()}-1`,
            title: 'Build 5-page mobile layout & quote form',
            completed: false,
            dueDate: todayStr,
          },
          {
            id: `pm-${Date.now()}-2`,
            title: 'Complete on-page SEO, analytics & revision round',
            completed: false,
            dueDate: todayStr,
          },
          {
            id: `pm-${Date.now()}-3`,
            title: 'Final milestone review & collect remaining balance',
            completed: allPaid,
            dueDate: todayStr,
          },
        ],
        customerDependencies: 'Confirm service photos and contact details.',
        revisionsAllowed: 2,
        revisionsUsed: 0,
        estimatedHours: prop.offerCode === 'OFFER_A_AND_B' ? 16 : 10,
        actualHoursLogged: 0,
        directCostsIncurred: 0,
        startDate: todayStr,
        targetDeliveryDate: todayStr,
        supportObligations: 'Immediate delivery kickoff after deposit.',
      });
    }

    const nextProspects = activeState.prospects.map((p) =>
      p.id === prop.prospectId ? { ...p, stage: PipelineStage.WON } : p
    );

    persistUpdatedState({
      ...activeState,
      proposals: nextProposals,
      projects: nextProjects,
      prospects: nextProspects,
      transactions: [...activeState.transactions, newTx],
    });
    persistTransactionToFirestore(CAMPAIGN_ID, newTx).catch(() => {});
  };

  const handleUpdateProject = (updated: FulfillmentProject) => {
    const nextProjects = activeState.projects.map((p) =>
      p.id === updated.id ? updated : p
    );
    persistUpdatedState({ ...activeState, projects: nextProjects });
    persistProjectToFirestore(CAMPAIGN_ID, updated).catch(() => {});
  };

  const handleAddTransaction = (tx: FinancialTransaction) => {
    persistUpdatedState({
      ...activeState,
      transactions: [...activeState.transactions, tx],
    });
    persistTransactionToFirestore(CAMPAIGN_ID, tx).catch(() => {});
  };

  const handleUpdateSettings = (settings: CampaignSettings) => {
    persistUpdatedState({ ...activeState, settings });
  };

  const handleSaveDailyReview = (review: DailyReviewEntry) => {
    persistUpdatedState({
      ...activeState,
      dailyReviews: [...activeState.dailyReviews, review],
    });
  };

  const handleExportFullJson = () => {
    const json = JSON.stringify(activeState, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'its-llc-5k-to-20k-campaign-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetCampaign = () => {
    localStorage.removeItem(REAL_STORAGE_KEY);
    const freshReal = createInitialRealState();
    freshReal.settings.onboardingCompleted = true;
    if (auth.currentUser) {
      const realName =
        auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Founder';
      freshReal.settings.operatorName = realName;
      if (freshReal.teamMembers && freshReal.teamMembers[0]) {
        freshReal.teamMembers[0].name = realName;
        freshReal.teamMembers[0].email = auth.currentUser.email || freshReal.teamMembers[0].email;
      }
    }
    persistUpdatedState(freshReal);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col overflow-x-hidden">
      {/* First-Run Onboarding Wizard (Shown on First Launch unless ?autostart=1) */}
      {!realState.settings.onboardingCompleted && (
        <OnboardingModal
          settings={realState.settings}
          offers={realState.offers}
          onConfirmRealStart={(updatedSettings, updatedOffers) => {
            persistUpdatedState({
              ...realState,
              settings: updatedSettings,
              offers: updatedOffers,
            });
          }}
        />
      )}

      {/* Top Navigation Bar — Strictly adheres to the 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-2 sm:gap-8 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-slate-900 border-b border-slate-800 sticky top-0 z-30 no-print min-w-0">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#command"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('command');
          }}
          className="text-sm sm:text-base font-bold tracking-tight text-slate-100 whitespace-nowrap truncate min-w-0 shrink"
        >
          $5K TO $20K IN 30 DAYS
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Top Navigation"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300"
        >
          {[
            { id: 'command', label: 'Command' },
            { id: 'roadmap', label: 'Roadmap' },
            { id: 'mission', label: 'Mission' },
            { id: 'pipeline', label: 'Pipeline' },
            { id: 'cash', label: 'Cash' },
          ].map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(link.id);
              }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === link.id ? 'text-sky-400 underline underline-offset-4' : ''
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: User Auth & Cloud Sync + Notification Center & 4-Theme Selector */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <UserAuthHeaderWidget
            onUserChanged={handleUserChanged}
            onOpenSquadModal={() => setTeamAuthModalOpen(true)}
          />
          <NotificationCenter
            notifications={activeNotifications}
            preferences={activeNotificationPrefs}
            onUpdateNotifications={handleUpdateNotifications}
            onUpdatePreferences={handleUpdateNotificationPreferences}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenCreateModal={() => handleOpenNotificationModal()}
            activeMember={activeMember}
          />
          <ThemeSelector variant="compact" />
        </div>
      </header>

      {/* Main Workspace Container: Sidebar (14 Primary Sections) + Main Content Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* Mobile Navigation Toggle */}
        <div className="lg:hidden px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between no-print">
          <span className="text-xs font-mono text-sky-400 truncate pr-2">
            Active Section: {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 text-slate-200 bg-slate-800 rounded-lg shrink-0"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Left Sidebar Navigation (All Sections + Team Auth Card) */}
        <aside
          aria-label="Full Command Navigation"
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:block w-full lg:w-64 bg-slate-900/80 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 shrink-0 no-print`}
        >
          <div className="mb-3 px-2 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>It&apos;s LLC OS</span>
            <span className="text-emerald-400">LIVE CAMPAIGN</span>
          </div>

          <div className="mb-3">
            <TeamSidebarTriggerCard
              activeMember={activeMember}
              teamCount={teamMembersList.length}
              onlineCount={onlineCount}
              onOpenAuthModal={() => setTeamAuthModalOpen(true)}
              onOpenTeamWarRoom={() => {
                setActiveTab('team');
                setMobileMenuOpen(false);
              }}
            />
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <PWAInstallCard
              compact
              onSelectShortcut={(tab) => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }}
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'command' && (
            <CommandCenterView
              state={activeState}
              activeMember={activeMember}
              onClaimTask={handleClaimTask}
              onOpenAuthModal={() => setTeamAuthModalOpen(true)}
              onSendInFullSquad={handleSendInFullSquad}
              onNavigate={(tab) => setActiveTab(tab)}
              onToggleTaskStatus={handleToggleTaskStatus}
              onApplyNotificationPreset={handleOpenNotificationModal}
            />
          )}

          {(activeTab === 'roadmap' || activeTab === 'mission') && (
            <RoadmapAndMissionView
              state={activeState}
              mode={activeTab === 'mission' ? 'mission' : 'roadmap'}
              activeMember={activeMember}
              onClaimTask={handleClaimTask}
              onToggleTask={handleToggleTaskStatus}
              onUpdateTask={handleUpdateTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onBatchToggleTasks={handleBatchToggleTasks}
              onResetDayTasksToPdf={handleResetDayTasksToPdf}
              onSelectDayOverride={(day) =>
                handleUpdateSettings({ ...activeState.settings, currentDayOverride: day })
              }
              onNavigate={(tab) => setActiveTab(tab)}
              onApplyNotificationPreset={handleOpenNotificationModal}
            />
          )}

          {activeTab === 'offers' && (
            <OffersAndModelView
              state={activeState}
              onUpdateOffer={handleUpdateOffer}
              onUpdateScenario={handleUpdateScenario}
            />
          )}

          {(activeTab === 'pipeline' || activeTab === 'contacts') && (
            <PipelineAndCrmView
              state={activeState}
              mode={activeTab === 'pipeline' ? 'pipeline' : 'contacts'}
              activeMember={activeMember}
              onClaimProspectStep={handleClaimProspectStep}
              onAddProspect={handleAddProspect}
              onUpdateProspect={handleUpdateProspect}
              onImportProspects={handleImportProspects}
              onCreateProposalFromProspect={handleCreateProposalFromProspect}
              onNavigateToCallWithProspect={(prospectId) => {
                setPreselectedCallProspectId(prospectId);
                setActiveTab('calls');
              }}
              onApplyNotificationPreset={handleOpenNotificationModal}
            />
          )}

          {(activeTab === 'calls' || activeTab === 'playbook') && (
            <CallsAndPlaybookView
              state={activeState}
              mode={activeTab === 'calls' ? 'calls' : 'playbook'}
              activeMember={activeMember}
              preselectedProspectId={preselectedCallProspectId}
              onLogCall={handleLogCall}
              onUpdateScript={handleUpdateScript}
              onAddScript={handleAddScript}
              onApplyNotificationPreset={handleOpenNotificationModal}
            />
          )}

          {(activeTab === 'proposals' || activeTab === 'delivery') && (
            <ProposalsAndDeliveryView
              state={activeState}
              mode={activeTab === 'proposals' ? 'proposals' : 'delivery'}
              activeMember={activeMember}
              onClaimProposal={handleClaimProposal}
              onClaimDeliveryMilestone={handleClaimDeliveryMilestone}
              onAddProposal={handleAddProposal}
              onUpdateProposalStatus={handleUpdateProposalStatus}
              onCollectMilestonePayment={handleCollectMilestonePayment}
              onUpdateProject={handleUpdateProject}
              onApplyNotificationPreset={handleOpenNotificationModal}
            />
          )}

          {activeTab === 'cash' && (
            <CashAndCapitalView
              state={activeState}
              onAddTransaction={handleAddTransaction}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {(activeTab === 'analytics' ||
            activeTab === 'reviews' ||
            activeTab === 'settings') && (
            <AnalyticsReviewsSettingsView
              state={activeState}
              mode={
                activeTab === 'analytics'
                  ? 'analytics'
                  : activeTab === 'reviews'
                    ? 'reviews'
                    : 'settings'
              }
              onSaveDailyReview={handleSaveDailyReview}
              onUpdateSettings={handleUpdateSettings}
              onExportFullJson={handleExportFullJson}
              onImportFullJson={(importedState) => persistUpdatedState(importedState)}
              onResetCampaign={handleResetCampaign}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'workspace' && (
            <GoogleWorkspaceHubView
              state={activeState}
              onImportProspects={handleImportProspects}
            />
          )}

          {activeTab === 'team' && (
            <TeamWarRoomView
              state={activeState}
              activeMember={activeMember}
              onlineCount={onlineCount}
              onOpenAuthModal={() => setTeamAuthModalOpen(true)}
              onSelectActiveMember={handleSelectActiveMember}
              onSendInFullSquad={handleSendInFullSquad}
              onClaimTask={handleClaimTask}
              onClaimProspectStep={handleClaimProspectStep}
              onClaimDeliveryMilestone={handleClaimDeliveryMilestone}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSyncCampaignState={handleSyncCampaignState}
            />
          )}

          {activeTab === 'whichshittypitch' && (
            <WhichShittyPitchView
              wspState={
                activeState.whichShittyPitch || createInitialWhichShittyPitchState()
              }
              onUpdateWspState={handleUpdateWspState}
              activeMember={activeMember}
              teamMembers={teamMembersList}
              onAddCrmProspect={handleAddProspect}
              onApplyNotificationPreset={handleOpenNotificationModal}
            />
          )}
        </main>
      </div>
      <CreateNotificationModal
        isOpen={createNotificationModalOpen}
        onClose={() => {
          setCreateNotificationModalOpen(false);
          setActiveNotificationPreset(null);
        }}
        presetTarget={activeNotificationPreset}
        activeMember={activeMember}
        onSaveNotification={handleSaveNotification}
      />
      <TeamAuthModal
        isOpen={teamAuthModalOpen}
        onClose={() => setTeamAuthModalOpen(false)}
        teamMembers={teamMembersList}
        activeMember={activeMember}
        onSelectActiveMember={handleSelectActiveMember}
        onAddOrSignInMember={handleAddOrSignInTeamMember}
      />
      <OfflineIndicator />
    </div>
  );
}
