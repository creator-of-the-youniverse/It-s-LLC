import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  CampaignState,
  Prospect,
  CallLog,
  Proposal,
  FulfillmentProject,
  FinancialTransaction,
  RoadmapTask,
  TeamActivityEvent,
  TeamMember,
} from '../types';
import { createInitialRealState } from '../data/pdfPlanData';

export const CAMPAIGN_ID = 'main';

/**
 * Saves or updates user profile in /users/{userId}
 */
export async function syncUserProfile(user: User, role: string = 'Campaign Lead'): Promise<void> {
  const userPath = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const profileData = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Operator',
      email: user.email || '',
      photoURL: user.photoURL || '',
      role,
      lastActiveAt: new Date().toISOString(),
    };
    await setDoc(userRef, profileData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

/**
 * Subscribes to real-time changes on the campaign root document and subcollections
 */
export function subscribeToCampaign(
  campaignId: string,
  onUpdate: (data: {
    campaignDoc?: Record<string, unknown>;
    prospects?: Prospect[];
    calls?: CallLog[];
    proposals?: Proposal[];
    projects?: FulfillmentProject[];
    tasks?: RoadmapTask[];
    transactions?: FinancialTransaction[];
    activity?: TeamActivityEvent[];
  }) => void,
  onError?: (error: unknown) => void
): () => void {
  // CRITICAL CONSTRAINT from skill: Only attach onSnapshot listeners if auth is ready and user is authenticated
  if (!auth.currentUser) {
    return () => {};
  }

  const unsubscribers: (() => void)[] = [];

  // Root document listener
  const rootPath = `campaigns/${campaignId}`;
  try {
    const rootRef = doc(db, 'campaigns', campaignId);
    const unsubRoot = onSnapshot(
      rootRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate({ campaignDoc: snapshot.data() });
        }
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, rootPath);
      }
    );
    unsubscribers.push(unsubRoot);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, rootPath);
  }

  // Prospects collection
  const prospectsPath = `campaigns/${campaignId}/prospects`;
  try {
    const unsubProspects = onSnapshot(
      collection(db, 'campaigns', campaignId, 'prospects'),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as Prospect);
        onUpdate({ prospects: items });
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, prospectsPath);
      }
    );
    unsubscribers.push(unsubProspects);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, prospectsPath);
  }

  // Calls collection
  const callsPath = `campaigns/${campaignId}/calls`;
  try {
    const unsubCalls = onSnapshot(
      collection(db, 'campaigns', campaignId, 'calls'),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as CallLog);
        onUpdate({ calls: items });
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, callsPath);
      }
    );
    unsubscribers.push(unsubCalls);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, callsPath);
  }

  // Proposals collection
  const proposalsPath = `campaigns/${campaignId}/proposals`;
  try {
    const unsubProposals = onSnapshot(
      collection(db, 'campaigns', campaignId, 'proposals'),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as Proposal);
        onUpdate({ proposals: items });
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, proposalsPath);
      }
    );
    unsubscribers.push(unsubProposals);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, proposalsPath);
  }

  // Projects collection
  const projectsPath = `campaigns/${campaignId}/projects`;
  try {
    const unsubProjects = onSnapshot(
      collection(db, 'campaigns', campaignId, 'projects'),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as FulfillmentProject);
        onUpdate({ projects: items });
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, projectsPath);
      }
    );
    unsubscribers.push(unsubProjects);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, projectsPath);
  }

  // Tasks collection
  const tasksPath = `campaigns/${campaignId}/tasks`;
  try {
    const unsubTasks = onSnapshot(
      collection(db, 'campaigns', campaignId, 'tasks'),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as RoadmapTask);
        onUpdate({ tasks: items });
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, tasksPath);
      }
    );
    unsubscribers.push(unsubTasks);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, tasksPath);
  }

  // Transactions collection
  const txPath = `campaigns/${campaignId}/transactions`;
  try {
    const unsubTx = onSnapshot(
      collection(db, 'campaigns', campaignId, 'transactions'),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as FinancialTransaction);
        onUpdate({ transactions: items });
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, txPath);
      }
    );
    unsubscribers.push(unsubTx);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, txPath);
  }

  // Activity collection
  const actPath = `campaigns/${campaignId}/activity`;
  try {
    const unsubAct = onSnapshot(
      collection(db, 'campaigns', campaignId, 'activity'),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as TeamActivityEvent);
        onUpdate({ activity: items });
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, actPath);
      }
    );
    unsubscribers.push(unsubAct);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, actPath);
  }

  return () => {
    unsubscribers.forEach((u) => u());
  };
}

/**
 * Initializes the cloud campaign document if not already existing
 */
export async function ensureCampaignExistsInFirestore(
  campaignId: string,
  initialState: CampaignState,
  currentUser?: User | null
): Promise<void> {
  if (!auth.currentUser) return;
  const rootPath = `campaigns/${campaignId}`;
  try {
    const rootRef = doc(db, 'campaigns', campaignId);
    const snap = await getDoc(rootRef);
    if (!snap.exists()) {
      const payload = {
        id: campaignId,
        startDate: initialState.settings.startDate,
        operatorName:
          currentUser?.displayName || initialState.settings.operatorName || 'Lead Operator',
        selectedNiche: initialState.settings.selectedNiche || 'Local Businesses',
        demoSiteUrl: initialState.settings.demoSiteUrl || '',
        startingWorkingCapital: initialState.settings.startingWorkingCapital,
        protectedReserve: initialState.settings.protectedReserve,
        operatingBudget: initialState.settings.operatingBudget,
        salesAssetsBudget: initialState.settings.salesAssetsBudget,
        adTestBudget: initialState.settings.adTestBudget,
        contingencyBudget: initialState.settings.contingencyBudget,
        essentialLivingProtectedAmount: initialState.settings.essentialLivingProtectedAmount,
        dailyCallTarget: initialState.settings.dailyCallTarget,
        dailyFollowUpTarget: initialState.settings.dailyFollowUpTarget,
        maxConcurrentActiveProjects: initialState.settings.maxConcurrentActiveProjects,
        onboardingCompleted: true,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'operator',
      };
      await setDoc(rootRef, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, rootPath);
  }
}

/**
 * Persists updated root campaign settings to Firestore
 */
export async function persistCampaignSettingsToFirestore(
  campaignId: string,
  state: CampaignState,
  userEmail?: string
): Promise<void> {
  if (!auth.currentUser) return;
  const rootPath = `campaigns/${campaignId}`;
  try {
    const rootRef = doc(db, 'campaigns', campaignId);
    await setDoc(
      rootRef,
      {
        id: campaignId,
        startDate: state.settings.startDate,
        operatorName: state.settings.operatorName,
        selectedNiche: state.settings.selectedNiche,
        demoSiteUrl: state.settings.demoSiteUrl,
        startingWorkingCapital: state.settings.startingWorkingCapital,
        protectedReserve: state.settings.protectedReserve,
        operatingBudget: state.settings.operatingBudget,
        salesAssetsBudget: state.settings.salesAssetsBudget,
        adTestBudget: state.settings.adTestBudget,
        contingencyBudget: state.settings.contingencyBudget,
        essentialLivingProtectedAmount: state.settings.essentialLivingProtectedAmount,
        dailyCallTarget: state.settings.dailyCallTarget,
        dailyFollowUpTarget: state.settings.dailyFollowUpTarget,
        maxConcurrentActiveProjects: state.settings.maxConcurrentActiveProjects,
        onboardingCompleted: state.settings.onboardingCompleted,
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail || 'operator',
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, rootPath);
  }
}

/**
 * Upserts a prospect into Firestore
 */
export async function persistProspectToFirestore(
  campaignId: string,
  prospect: Prospect
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `campaigns/${campaignId}/prospects/${prospect.id}`;
  try {
    await setDoc(
      doc(db, 'campaigns', campaignId, 'prospects', prospect.id),
      {
        ...prospect,
        campaignId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a prospect from Firestore
 */
export async function deleteProspectFromFirestore(
  campaignId: string,
  prospectId: string
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `campaigns/${campaignId}/prospects/${prospectId}`;
  try {
    await deleteDoc(doc(db, 'campaigns', campaignId, 'prospects', prospectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Logs a call into Firestore
 */
export async function persistCallLogToFirestore(
  campaignId: string,
  callLog: CallLog
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `campaigns/${campaignId}/calls/${callLog.id}`;
  try {
    await setDoc(
      doc(db, 'campaigns', campaignId, 'calls', callLog.id),
      {
        ...callLog,
        campaignId,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves a proposal into Firestore
 */
export async function persistProposalToFirestore(
  campaignId: string,
  proposal: Proposal
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `campaigns/${campaignId}/proposals/${proposal.id}`;
  try {
    await setDoc(
      doc(db, 'campaigns', campaignId, 'proposals', proposal.id),
      {
        ...proposal,
        campaignId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves a fulfillment project into Firestore
 */
export async function persistProjectToFirestore(
  campaignId: string,
  project: FulfillmentProject
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `campaigns/${campaignId}/projects/${project.id}`;
  try {
    await setDoc(
      doc(db, 'campaigns', campaignId, 'projects', project.id),
      {
        ...project,
        campaignId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves a roadmap or mission task into Firestore
 */
export async function persistTaskToFirestore(
  campaignId: string,
  task: RoadmapTask
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `campaigns/${campaignId}/tasks/${task.id}`;
  try {
    await setDoc(
      doc(db, 'campaigns', campaignId, 'tasks', task.id),
      {
        ...task,
        campaignId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves a financial transaction into Firestore
 */
export async function persistTransactionToFirestore(
  campaignId: string,
  tx: FinancialTransaction
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `campaigns/${campaignId}/transactions/${tx.id}`;
  try {
    await setDoc(
      doc(db, 'campaigns', campaignId, 'transactions', tx.id),
      {
        ...tx,
        campaignId,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Logs an activity feed event into Firestore
 */
export async function persistActivityEventToFirestore(
  campaignId: string,
  event: TeamActivityEvent
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `campaigns/${campaignId}/activity/${event.id}`;
  try {
    await setDoc(
      doc(db, 'campaigns', campaignId, 'activity', event.id),
      {
        ...event,
        campaignId,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
