export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
}

export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
}

export enum PipelineStage {
  IDENTIFIED = 'Identified',
  CONTACTED = 'Contacted',
  CONVERSATION = 'Two-Way Conversation',
  QUALIFIED = 'Qualified Prospect',
  DEMO_BOOKED = 'Demo Booked',
  DEMO_COMPLETED = 'Demo Completed',
  PROPOSAL_SENT = 'Proposal Sent',
  WON = 'Paid Client (Won)',
  LOST = 'Declined / Lost',
  ARCHIVED = 'Archived',
}

export enum CallOutcome {
  NO_ANSWER = 'No answer',
  VOICEMAIL = 'Voicemail left',
  GATEKEEPER = 'Gatekeeper / Callback',
  DECLINED = 'Declined',
  HAS_DEVELOPER = 'Already has developer',
  INTERESTED = 'Interested / Follow-up',
  DEMO_BOOKED = 'Demo booked',
}

export enum ProposalStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  ACCEPTED = 'Accepted (Signed)',
  DEPOSIT_PAID = 'Deposit Paid',
  PAID_IN_FULL = 'Paid in Full',
  DECLINED = 'Declined',
  EXPIRED = 'Expired',
}

export enum DeliveryStatus {
  NOT_STARTED = 'Not started',
  IN_PROGRESS = 'In progress',
  MILESTONE_REACHED = 'Milestone reached',
  DELIVERED = 'Delivered',
  ACCEPTED = 'Accepted by client',
  COMPLETE = 'Complete (Final payment collected)',
}

export enum TransactionType {
  REVENUE_DEPOSIT = 'Deposit Received (50%)',
  REVENUE_MILESTONE = 'Milestone / Final Payment',
  REVENUE_FULL = 'Full Payment Received',
  EXPENSE = 'Business Expense',
  REFUND = 'Customer Refund',
}

export enum BudgetBucket {
  PROTECTED_RESERVE = 'Protected reserve',
  OPERATING_DELIVERY = 'Necessary delivery and operating costs',
  SALES_PROSPECTING = 'Sales assets and prospecting',
  AD_TEST = 'Initial advertising test',
  CONTINGENCY = 'Contingency, released only when justified',
  REVENUE_INFLOW = 'Revenue Inflow',
}

export interface CampaignSettings {
  companyName: string;
  operatorName: string;
  campaignTitle: string;
  startDate: string; // YYYY-MM-DD
  currentDayOverride: number | null; // Optional manual day inspector, otherwise derived or set
  revenueTarget: number; // $20,000 stretch target
  startingWorkingCapital: number; // $5,000
  protectedReserve: number; // $2,500 default
  operatingBudget: number; // $750 default
  salesAssetsBudget: number; // $250 default
  adTestBudget: number; // $500 default
  contingencyBudget: number; // $1,000 default
  contingencyReleased: boolean;
  essentialLivingProtectedAmount: number; // Additional or part of protected reserve for housing/food/transport
  estimatedTaxRatePercent: number; // Configurable tax obligation assumption (default 0 or user-configured)
  maxConcurrentActiveProjects: number; // Delivery capacity limit for 1 person (e.g. 4 concurrent active builds)
  selectedNiche: string;
  demoSiteUrl: string;
  onboardingCompleted: boolean;
  dailyCallTarget: number; // 20-25
  dailyFollowUpTarget: number; // 5-10
  dailyDemoTarget: number; // 1-3
}

export interface OfferDefinition {
  id: string;
  code: 'OFFER_A' | 'OFFER_B' | 'OFFER_C';
  name: string;
  subtitle: string;
  targetCustomer: string;
  problemSolved: string;
  deliverables: string[];
  exclusions: string[];
  price: number;
  paymentStructure: string;
  depositPercent: number;
  estimatedDeliveryDays: number;
  estimatedDeliveryHours: number;
  directCostEstimate: number;
  validationStatus: 'Primary Engine (Validated Format)' | 'Targeted Upsell (Problem-Dependent)' | 'Unproven Upside (Alpha — Do Not Rely On)';
  targetUnitSales: number;
  countTowardCoreTarget: boolean;
  scriptOpening: string;
  objectionHandlers: { objection: string; response: string }[];
}

export interface ScenarioConfig {
  id: 'conservative' | 'base' | 'stretch';
  name: string;
  description: string;
  outboundAttempts: number;
  conversationRatePercent: number;
  qualifiedRatePercent: number;
  demoBookingRatePercent: number;
  proposalRatePercent: number;
  closeRatePercent: number;
  offerAVolume: number;
  offerAPrice: number;
  offerBVolume: number;
  offerBPrice: number;
  offerCVolume: number;
  offerCPrice: number;
  includeOfferCInTotal: boolean;
  availableWeeklyDeliveryHours: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
  joinedAt: string;
  lastActiveAt: string;
  authProvider?: 'team' | 'google';
}

export interface StepClaimRecord {
  memberId: string;
  memberName: string;
  claimedAt: string;
}

export interface ProspectStepClaims {
  researchAndCall?: StepClaimRecord;
  demoExecution?: StepClaimRecord;
  proposalFollowUp?: StepClaimRecord;
  closeAndDeposit?: StepClaimRecord;
}

export interface TeamActivityEvent {
  id: string;
  timestamp: string;
  memberId: string;
  memberName: string;
  actionType:
    | 'MEMBER_JOINED'
    | 'STEP_CLAIMED'
    | 'STEP_RELEASED'
    | 'TASK_COMPLETED'
    | 'CALL_LOGGED'
    | 'DEMO_CONDUCTED'
    | 'PROPOSAL_SENT'
    | 'PAYMENT_COLLECTED'
    | 'DELIVERY_MILESTONE'
    | 'REMINDER_SET'
    | 'CUSTOM_LOG';
  targetTitle: string;
  detail: string;
  amount?: number;
}

export interface RoadmapTask {
  id: string;
  dayNumber: number; // 1 to 30
  phaseName: string; // e.g. "Days 1–2: Build the sales machine"
  title: string;
  instructions: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueTimeBlock?: string; // e.g. "8:00–9:00"
  dependsOnTaskId?: string;
  completedAt?: string;
  notes?: string;
  blockerReason?: string;
  isFromPdfChecklist: boolean;
  claimedByMemberId?: string;
  claimedByName?: string;
  completedByMemberId?: string;
  completedByName?: string;
}

export interface Prospect {
  id: string;
  businessName: string;
  contactName: string;
  contactRole: string;
  phone: string;
  email: string;
  website: string;
  category: string;
  location: string;
  problemObserved: string; // "One specific website or lead-handling issue"
  leadSource: string;
  dateAdded: string;
  lastContactDate?: string;
  firstContactMethod?: string;
  stage: PipelineStage;
  estimatedValue: number;
  offerInterest: 'OFFER_A' | 'OFFER_B' | 'OFFER_A_AND_B' | 'OFFER_C';
  nextAction: string;
  nextActionDate: string; // YYYY-MM-DD
  notes: string;
  consentNotes: string;
  winLossReason?: string;
  claimedByMemberId?: string;
  claimedByName?: string;
  stepClaims?: ProspectStepClaims;
}

export interface CallLog {
  id: string;
  prospectId: string;
  businessName: string;
  contactName: string;
  timestamp: string; // ISO string
  dayNumber: number;
  decisionMakerReached: boolean;
  twoWayConversation: boolean;
  outcome: CallOutcome;
  objectionObserved: string;
  buyerFeedback: string;
  nextStep: string;
  followUpDate: string; // YYYY-MM-DD
  isFollowUpCall: boolean;
  demoConducted: boolean;
  operatorId?: string;
  operatorName?: string;
  demoOperatorId?: string;
  demoOperatorName?: string;
}

export interface ProposalMilestone {
  id: string;
  label: string; // e.g., "50% Upfront Deposit", "50% Upon Final Milestone Delivery"
  amount: number;
  dueDescription: string;
  isPaid: boolean;
  paidTransactionId?: string;
  claimedByMemberId?: string;
  claimedByName?: string;
  collectedByName?: string;
}

export interface Proposal {
  id: string;
  prospectId: string;
  customerName: string;
  contactName: string;
  offerCode: 'OFFER_A' | 'OFFER_B' | 'OFFER_A_AND_B' | 'OFFER_C';
  title: string;
  scopeSummary: string;
  deliverables: string[];
  exclusions: string[];
  revisionAllowance: string;
  totalPrice: number;
  milestones: ProposalMilestone[];
  estimatedDeliveryTimeline: string;
  expirationDate: string;
  createdAt: string;
  status: ProposalStatus;
  acceptedAt?: string;
  notes: string;
  claimedByMemberId?: string;
  claimedByName?: string;
  createdByName?: string;
}

export interface DeliveryMilestoneItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  claimedByMemberId?: string;
  claimedByName?: string;
  completedByName?: string;
}

export interface FulfillmentProject {
  id: string;
  proposalId: string;
  prospectId: string;
  customerName: string;
  offerCode: 'OFFER_A' | 'OFFER_B' | 'OFFER_A_AND_B' | 'OFFER_C';
  projectTitle: string;
  agreedScope: string;
  contractedValue: number;
  clearedCashCollected: number;
  remainingBalance: number;
  status: DeliveryStatus;
  milestones: DeliveryMilestoneItem[];
  customerDependencies: string;
  revisionsAllowed: number;
  revisionsUsed: number;
  estimatedHours: number;
  actualHoursLogged: number;
  directCostsIncurred: number;
  startDate: string;
  targetDeliveryDate: string;
  completedDate?: string;
  supportObligations: string;
  claimedByMemberId?: string;
  claimedByName?: string;
}

export interface FinancialTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  dayNumber: number;
  type: TransactionType;
  bucket: BudgetBucket;
  amount: number; // Always positive number; inflow/outflow determined by type
  description: string;
  category: string;
  relatedProposalId?: string;
  relatedMilestoneId?: string; // Prevents duplicate recording of the same milestone payment
  relatedProjectId?: string;
  notes?: string;
  recordedByMemberId?: string;
  recordedByName?: string;
}

export interface PlaybookScript {
  id: string;
  category: 'Cold Call' | 'Opening Line' | 'Discovery' | 'Qualification' | 'Objection Handling' | 'Demo Outline' | 'Follow-up' | 'Closing & Payment';
  title: string;
  content: string;
  sourceNote: string; // e.g., "PDF Section 8: Your first call script" or "Optional Recommendation"
  isPdfOriginal: boolean;
}

export interface DailyReviewEntry {
  id: string;
  dayNumber: number;
  date: string;
  callsMade: number;
  followUpsMade: number;
  decisionMakersReached: number; // PDF Q1: "How many decision-makers did I actually reach?"
  demosConducted: number;
  proposalsSent: number;
  cashClearedToday: number;
  expensesSpentToday: number;
  whatBuyersSaid: string; // PDF Q2: "What did buyers say that changed my understanding of the offer?"
  biggestObstacleToNextDollar: string; // PDF Q3: "What is the single biggest obstacle to collecting the next dollar?"
  completedSummary: string;
  tomorrowTopThreePriorities: [string, string, string];
}

export type AppTheme = 'dark' | 'light' | 'morning' | 'night';

export interface AccountMapPerson {
  id: string;
  name: string;
  title: string;
  roleCategory: 'Decision Maker' | 'Influencer' | 'Gatekeeper' | 'Operations' | 'Finance';
  email: string;
  phone: string;
  revealed: boolean;
  revealedAt?: string;
  revealedByMemberId?: string;
  revealedByMemberName?: string;
  isDoNotContact: boolean;
  dncScope?: 'individual' | 'multiple' | 'team';
  dncMemberIds?: string[];
  dncReason?: string;
  isRemovedBySubject: boolean; // Subject requested removal - permanently removed
  notes?: string;
  syncedToCrm: boolean;
  crmLeadId?: string;
}

export interface AccountMap {
  id: string;
  companyName: string;
  industry: string;
  website: string;
  annualRevenueEst?: string;
  headquarters?: string;
  observableFrictionPoint: string;
  people: AccountMapPerson[];
}

export interface WhichShittyPitchCallNote {
  id: string;
  authorMemberId: string;
  authorName: string;
  timestamp: string;
  content: string;
}

export interface WhichShittyPitchCall {
  id: string;
  companyName: string;
  contactName: string;
  contactTitle: string;
  operatorMemberId: string;
  operatorName: string;
  callDate: string; // YYYY-MM-DD
  callTime?: string;
  durationSeconds: number;
  outcome: 'YES_SCHEDULED_10MIN_DEMO' | 'FOLLOW_UP_REQUESTED' | 'NOT_INTERESTED' | 'GATEKEEPER_BLOCKED' | 'DNC_REQUESTED';
  notes: WhichShittyPitchCallNote[];
  followUpDate?: string;
  followUpAssigneeId?: string;
  followUpAssigneeName?: string;
  followUpTask?: string;
  scheduledDemoDate?: string;
  scheduledDemoTime?: string;
  syncedToCrm: boolean;
  isDnc: boolean;
}

export interface WhichShittyPitchSidecarConfig {
  connected: boolean;
  seatId: string;
  accountSeatName: string;
  seatLimitPerHour: number; // 60
  revealsUsedThisHour: number;
  hourWindowStart: string; // ISO timestamp
  savedPitch: string;
  callRules: string[];
}

export interface WhichShittyPitchChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionPerformed?: string;
}

export interface WhichShittyPitchState {
  sidecarConfig: WhichShittyPitchSidecarConfig;
  accountMaps: AccountMap[];
  callLogs: WhichShittyPitchCall[];
  chatHistory: WhichShittyPitchChatMessage[];
}

export type NotificationCategory =
  | 'TASK'
  | 'PROSPECT'
  | 'CALL'
  | 'PROPOSAL'
  | 'DELIVERY'
  | 'FINANCIAL'
  | 'TEAM'
  | 'WSP'
  | 'CUSTOM';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string; // ISO creation time
  scheduledFor?: string; // ISO date-time or YYYY-MM-DD HH:mm
  dueDateTime?: string;
  delivered?: boolean;
  read?: boolean;
  category: NotificationCategory;
  priority: NotificationPriority;
  isRead: boolean;
  isTriggered: boolean;
  targetEntityId?: string;
  targetEntityType?: string;
  targetTab?: string;
  createdByMemberId?: string;
  createdByName?: string;
}

export interface NotificationPreferences {
  browserNotificationsEnabled: boolean;
  soundEnabled: boolean;
  notifyOnTaskDue: boolean;
  notifyOnStepClaimed: boolean;
  notifyOnDepositCollected: boolean;
  notifyOnProposalExpiring: boolean;
  notifyOnDncAdded: boolean;
  notifyOnHourlyQuotaReset: boolean;
}

export interface CampaignState {
  isDemoMode: boolean;
  settings: CampaignSettings;
  offers: OfferDefinition[];
  scenarios: ScenarioConfig[];
  tasks: RoadmapTask[];
  prospects: Prospect[];
  callLogs: CallLog[];
  proposals: Proposal[];
  projects: FulfillmentProject[];
  transactions: FinancialTransaction[];
  scripts: PlaybookScript[];
  dailyReviews: DailyReviewEntry[];
  teamMembers?: TeamMember[];
  teamActivityFeed?: TeamActivityEvent[];
  whichShittyPitch?: WhichShittyPitchState;
  notifications?: AppNotification[];
  notificationPreferences?: NotificationPreferences;
}



