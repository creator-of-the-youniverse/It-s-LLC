import {
  CampaignSettings,
  CampaignState,
  OfferDefinition,
  PlaybookScript,
  RoadmapTask,
  ScenarioConfig,
  TaskPriority,
  TaskStatus,
  TeamMember,
} from '../types';
import { createInitialWhichShittyPitchState } from './whichShittyPitchData';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../utils/notifications';

export const DEFAULT_SETTINGS: CampaignSettings = {
  companyName: "It's LLC",
  operatorName: 'Founder',
  campaignTitle: '$5K TO $20K IN 30 DAYS',
  startDate: '2026-10-27',
  currentDayOverride: null,
  revenueTarget: 20000,
  startingWorkingCapital: 5000,
  protectedReserve: 2500,
  operatingBudget: 750,
  salesAssetsBudget: 250,
  adTestBudget: 500,
  contingencyBudget: 1000,
  contingencyReleased: false,
  essentialLivingProtectedAmount: 0,
  estimatedTaxRatePercent: 15,
  maxConcurrentActiveProjects: 4,
  selectedNiche: 'Local Home & Trade Services (HVAC, Plumbing, Roofing, Landscaping)',
  demoSiteUrl: '',
  onboardingCompleted: false,
  dailyCallTarget: 22, // PDF: 20-25 targeted calls
  dailyFollowUpTarget: 8, // PDF: 5-10 follow-ups
  dailyDemoTarget: 2, // PDF: Aim for 1-3 demonstrations
};

export const INITIAL_OFFERS: OfferDefinition[] = [
  {
    id: 'offer-a',
    code: 'OFFER_A',
    name: 'Offer A: Small-business website',
    subtitle: 'Primary revenue engine — narrow enough to quote, deliver, and repeat',
    targetCustomer: 'Local small businesses with slow, outdated, non-mobile, or hard-to-contact websites',
    problemSolved: 'Customers struggle to contact the business or request quotes on mobile, resulting in lost local inquiries.',
    deliverables: [
      'Defined number of pages (up to 5 core pages: Home, Services, About, Reviews/Gallery, Contact/Quote)',
      'Mobile-responsive design tested across mobile and desktop',
      'Direct contact or quote-request functionality',
      'Basic on-page SEO (titles, meta descriptions, local headings)',
      'Analytics setup and conversion tracking',
      'Agreed revision allowance (2 structured revision rounds)',
    ],
    exclusions: [
      'No unlimited revisions',
      'No custom software development',
      'No complex third-party integrations without separate scope evaluation',
    ],
    price: 1500,
    paymentStructure: '50% deposit ($750) upfront before work begins; 50% ($750) at agreed completion milestone.',
    depositPercent: 50,
    estimatedDeliveryDays: 5,
    estimatedDeliveryHours: 10,
    directCostEstimate: 35,
    validationStatus: 'Primary Engine (Validated Format)',
    targetUnitSales: 8,
    countTowardCoreTarget: true,
    scriptOpening:
      "Hi, is this the owner? My name is [your name]. I build websites for small businesses, with a focus on making it easier for customers to contact you and request work. I noticed [specific, truthful observation about their website]. I have an idea for improving that, and I can show you an example. I'm not asking you to buy anything on this call. Would you be open to a 10-minute demonstration?",
    objectionHandlers: [
      {
        objection: 'How much does it cost?',
        response:
          "My defined website projects start at $1,500. I'd want to understand what you need before recommending a scope or giving you a final quote.",
      },
      {
        objection: 'We already have a web developer / agency.',
        response:
          "Understood. I'm not assuming you need to replace them. If there's no useful gap to fill, I'll say so. Thanks for your time.",
      },
      {
        objection: 'Just send me an email with some information.',
        response:
          'Happy to send a link to our live demonstration build. So I send the right example, are you more focused on getting more quote requests from mobile visitors or speeding up how you reply to leads?',
      },
    ],
  },
  {
    id: 'offer-b',
    code: 'OFFER_B',
    name: 'Offer B: Lead follow-up automation',
    subtitle: 'Targeted upsell for missed inquiries, slow follow-up, or manual lead handling',
    targetCustomer: 'Website buyers or prospects losing leads due to missed calls, slow response times, or manual intake',
    problemSolved: 'Eliminates missed customer inquiries and slow manual follow-ups via automated instant SMS/email intake and routing.',
    deliverables: [
      'Defined lead capture and instant response workflow',
      'Missed-call or web-form instant notification & auto-reply sequence',
      'Lead tracking sheet or lightweight CRM pipeline connection',
      'Upfront disclosure of any third-party messaging/software costs',
      'Handoff walkthrough and 14-day workflow verification',
    ],
    exclusions: [
      'Do not pitch when the business does not have a real lead-handling problem',
      'Ongoing third-party API/SMS usage fees billed directly to client',
      'Custom enterprise ERP integrations excluded',
    ],
    price: 1000,
    paymentStructure: '50% deposit ($500) upfront; 50% ($500) upon workflow verification and handoff.',
    depositPercent: 50,
    estimatedDeliveryDays: 3,
    estimatedDeliveryHours: 6,
    directCostEstimate: 25,
    validationStatus: 'Targeted Upsell (Problem-Dependent)',
    targetUnitSales: 4,
    countTowardCoreTarget: true,
    scriptOpening:
      'While looking at how inquiries come through your site, how quickly does someone usually get a reply when they submit a request while you are out on a job? We set up a $1,000 fixed-scope lead follow-up automation so no inquiry sits unanswered.',
    objectionHandlers: [
      {
        objection: 'Will this require expensive monthly software?',
        response:
          'We define the exact workflow and any third-party messaging costs upfront before quoting so you only pay for tools you actually use.',
      },
    ],
  },
  {
    id: 'offer-c',
    code: 'OFFER_C',
    name: 'Offer C: The Youniverse alpha (Founding Packages)',
    subtitle: 'Flagship alpha launch — treat as upside until demand and fulfillment are proven',
    targetCustomer: 'Early adopters invited to claim a free Youniverse first and upgrade to defined founding packages',
    problemSolved: 'Showcases the broader Portals OS / Youniverse vision with tangible, supportable early-adopter deliverables.',
    deliverables: [
      'Verified free Youniverse claim & onboarding entry flow',
      'Founding member alpha package with defined, supportable deliverables',
      'Direct onboarding check and safe payment processing verification',
    ],
    exclusions: [
      'Immediate sales must NOT depend on every component of Portals OS being finished',
      'Do not count toward reliable core target until paid offer is understood and fulfillment is reliable',
    ],
    price: 200,
    paymentStructure: '100% upfront ($200 per founding package) after testing the claim and purchase path.',
    depositPercent: 100,
    estimatedDeliveryDays: 1,
    estimatedDeliveryHours: 1,
    directCostEstimate: 10,
    validationStatus: 'Unproven Upside (Alpha — Do Not Rely On)',
    targetUnitSales: 20,
    countTowardCoreTarget: false, // PDF: "Do not count it toward the target until you have a paid offer that people understand and a reliable fulfillment process."
    scriptOpening:
      'We are inviting a small group of early adopters to claim a free Youniverse build and test the real product. For founding supporters who want [defined deliverable], we offer a $200 founding package.',
    objectionHandlers: [
      {
        objection: 'Is Portals OS completely finished?',
        response:
          'This is our flagship alpha launch. You can test the live build today for free, and our founding package only covers deliverables that are already live and supportable right now.',
      },
    ],
  },
];

export const INITIAL_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'conservative',
    name: 'Conservative Validation Case',
    description: 'Lower end of PDF pipeline assumptions (4 website clients, 2 automation upsells, 0 alpha counted). Focuses on proving repeatable sales and preserving cash.',
    outboundAttempts: 400,
    conversationRatePercent: 20, // 80 conversations
    qualifiedRatePercent: 37.5, // 30 qualified
    demoBookingRatePercent: 66.7, // 20 demos
    proposalRatePercent: 60, // 12 proposals
    closeRatePercent: 33.3, // 4 paid website clients
    offerAVolume: 4,
    offerAPrice: 1500,
    offerBVolume: 2,
    offerBPrice: 1000,
    offerCVolume: 0,
    offerCPrice: 200,
    includeOfferCInTotal: false,
    availableWeeklyDeliveryHours: 15,
  },
  {
    id: 'base',
    name: 'Base Execution Case (Excluding Unproven Alpha)',
    description: 'Strong execution on core service offers (6 websites + 3 automations = $12,000), treating Youniverse alpha strictly as uncounted upside per PDF Section 1 & 3.',
    outboundAttempts: 450,
    conversationRatePercent: 22.2, // 100 conversations
    qualifiedRatePercent: 38, // 38 qualified
    demoBookingRatePercent: 65.8, // 25 demos
    proposalRatePercent: 64, // 16 proposals
    closeRatePercent: 37.5, // 6 paid website clients
    offerAVolume: 6,
    offerAPrice: 1500,
    offerBVolume: 3,
    offerBPrice: 1000,
    offerCVolume: 5,
    offerCPrice: 200,
    includeOfferCInTotal: false,
    availableWeeklyDeliveryHours: 20,
  },
  {
    id: 'stretch',
    name: 'Full $20,000 Stretch Target (PDF Model)',
    description: 'Upper end of PDF planning assumptions: 8 websites ($12k) + 4 automations ($4k) + 20 Youniverse founding packages ($4k) = $20,000 gross revenue.',
    outboundAttempts: 500,
    conversationRatePercent: 24, // 120 conversations
    qualifiedRatePercent: 37.5, // 45 qualified
    demoBookingRatePercent: 66.7, // 30 demos
    proposalRatePercent: 66.7, // 20 proposals
    closeRatePercent: 40, // 8 paid website clients
    offerAVolume: 8,
    offerAPrice: 1500,
    offerBVolume: 4,
    offerBPrice: 1000,
    offerCVolume: 20,
    offerCPrice: 200,
    includeOfferCInTotal: true,
    availableWeeklyDeliveryHours: 25,
  },
];

export const INITIAL_SCRIPTS: PlaybookScript[] = [
  {
    id: 'script-cold-call-pdf',
    category: 'Cold Call',
    title: 'Primary Small-Business Website Cold Call Script',
    sourceNote: 'PDF Section 8: Your first call script (Verbatim)',
    isPdfOriginal: true,
    content: `Hi, is this the owner?

My name is [your name]. I build websites for small businesses, with a focus on making it easier for customers to contact you and request work.

I noticed [specific, truthful observation about their website]. I have an idea for improving that, and I can show you an example.

I'm not asking you to buy anything on this call. Would you be open to a 10-minute demonstration?

If yes:
Great. Is [time option one] or [time option two] better?

If they ask about price:
My defined website projects start at $1,500. I'd want to understand what you need before recommending a scope or giving you a final quote.

If they already have a developer:
Understood. I'm not assuming you need to replace them. If there's no useful gap to fill, I'll say so. Thanks for your time.`,
  },
  {
    id: 'script-opening-voicemail',
    category: 'Opening Line',
    title: 'Concise Voicemail / Gatekeeper Message',
    sourceNote: 'PDF Section 2: Leave concise messages where appropriate (Optional Recommendation)',
    isPdfOriginal: false,
    content: `Hi [contact name], this is [your name] with It's LLC. I was looking at [business name]'s website and noticed [specific, truthful observation about their website]. I put together a quick example showing how to make it much easier for mobile visitors to request work from you. You can reach me at [your phone], or I'll try you again briefly tomorrow.`,
  },
  {
    id: 'script-discovery-questions',
    category: 'Discovery',
    title: 'Website & Lead-Handling Discovery Questions',
    sourceNote: 'PDF Section 3 & 4: Qualify prospects and check for missed-inquiry problems',
    isPdfOriginal: true,
    content: `1. When a new customer looks you up on their phone today, what is the main job or service you want them to request?
2. How are inquiries currently coming in—phone calls, contact forms, or text messages—and do any slip through when you're busy on a job?
3. When someone fills out a request or calls after hours, how quickly do they usually hear back? (Checks qualification for Offer B: $1,000 Lead Follow-up Automation)
4. If we built a clean, mobile-ready site with a direct quote-request flow in 5 days for a fixed $1,500 scope, what would you need to see to feel confident moving forward?`,
  },
  {
    id: 'script-qualification-criteria',
    category: 'Qualification',
    title: 'Prospect Qualification Checklist (PDF Rules)',
    sourceNote: 'PDF Section 2, 3, and 7',
    isPdfOriginal: true,
    content: `A prospect is genuinely qualified when:
1. Specific, observable problem verified: Their current website or lead-handling has a real, visible friction point (not a fabricated compliment or generic pitch).
2. Decision-maker engaged: You are speaking with the owner or partner who can approve a $1,500–$2,500 scope.
3. Fit for fixed scope: Their needs fit within a defined page count, mobile-responsive layout, quote-request form, basic SEO, and agreed revision allowance (no custom software or unlimited revisions).
4. Delivery capacity available: You have capacity in the current queue to start immediately upon deposit and deliver on realistic dates.`,
  },
  {
    id: 'script-objection-price',
    category: 'Objection Handling',
    title: 'Objection: "How much is this going to cost?" / "$1,500 is too much"',
    sourceNote: 'PDF Section 8 & Section 6 Payment Rule',
    isPdfOriginal: true,
    content: `Direct Price Response (PDF Section 8):
"My defined website projects start at $1,500. I'd want to understand what you need before recommending a scope or giving you a final quote."

Payment Structure Clarification (PDF Section 6):
"We keep the scope strictly defined so there are no surprise bills. It's $750 upfront as a 50% deposit to start the build, and the remaining $750 is only paid when the agreed milestone is completed and live."`,
  },
  {
    id: 'script-demo-outline',
    category: 'Demo Outline',
    title: '10-Minute Live Demonstration Structure (1:00–3:00 PM Block)',
    sourceNote: 'PDF Section 4: Demonstrations and closing',
    isPdfOriginal: true,
    content: `1. Context (1 min): Re-confirm the specific observation you noted on their existing site ([specific, truthful observation]).
2. Show Relevant Example (4 mins): Share your tested mobile demonstration site ([demo site URL]). Show how fast a customer on a phone can see services, trust signals, and submit a work request in under 30 seconds.
3. Ask What They Need (2 mins): "Looking at this layout for [business name], what specific services or pages matter most for your customers?"
4. Confirm Fixed Scope (2 mins): State clearly what is included ($1,500: defined pages, mobile design, quote form, basic SEO, analytics, 2 revisions) and what is excluded. If they mention slow lead responses, introduce Offer B ($1,000 Lead Follow-up Automation).
5. Request Decision or Agreed Follow-up (1 min): "Would you like me to send over the one-page written scope and milestones today so we can lock in a start date?"`,
  },
  {
    id: 'script-followup-cadence',
    category: 'Follow-up',
    title: 'Warm Prospect & Proposal Follow-Up Script (11:00 AM–12:00 PM Block)',
    sourceNote: 'PDF Section 4: Send clear scopes and prices. Schedule next steps before conversations go cold.',
    isPdfOriginal: true,
    content: `Hi [contact name], following up on the 10-minute demo / one-page proposal we discussed for [business name].

I have a delivery slot open this week to get the new mobile quote-request site built and live within 5 business days. The scope is locked at $1,500 ($750 deposit to begin, $750 upon completion milestone).

Did you have any questions on the page scope, or are you ready to approve the one-page agreement today?`,
  },
  {
    id: 'script-closing-payment',
    category: 'Closing & Payment',
    title: 'Closing, Written Scope Agreement & 50% Deposit Collection',
    sourceNote: 'PDF Section 6: Critical Payment Rule & Written Agreements',
    isPdfOriginal: true,
    content: `Closing Confirmation:
"Great. To protect both of us, we use a clear one-page written agreement covering the exact page count, revision allowance, acceptance criteria, and delivery date.

Once you confirm the one-page proposal and complete the 50% deposit ($750), we begin delivery immediately and schedule our milestone review for [target delivery date]. The remaining $750 is due only when that agreed milestone is delivered."`,
  },
];

export function generate30DayRoadmap(): RoadmapTask[] {
  const tasks: RoadmapTask[] = [];

  // DAY 1 — Exact 7 items from PDF Section 7 ("Day 1 — Build the minimum sales system / Day 1 checklist 0 of 7")
  const day1Checklist = [
    {
      id: 'task-d1-1',
      title: 'Write the fixed-scope $1,500 website offer',
      instructions:
        'Include a defined number of pages, mobile-responsive design, contact or quote-request functionality, basic on-page SEO, analytics, and an agreed revision allowance. Exclude unlimited revisions, custom software, or complex integrations.',
      priority: TaskPriority.CRITICAL,
      dueTimeBlock: '8:00–9:00',
    },
    {
      id: 'task-d1-2',
      title: 'Choose one niche for the first sales test',
      instructions:
        'Select one clear small-business category where websites frequently have observable contact or mobile issues so examples and scripts stay relevant.',
      priority: TaskPriority.CRITICAL,
      dueTimeBlock: '8:00–9:00',
      dependsOnTaskId: 'task-d1-1',
    },
    {
      id: 'task-d1-3',
      title: 'Select one existing build as a demonstration and test it on mobile',
      instructions:
        'Verify the demonstration site loads fast, looks sharp on a phone viewport, and has a working contact/quote flow.',
      priority: TaskPriority.CRITICAL,
      dueTimeBlock: '8:00–9:00',
    },
    {
      id: 'task-d1-4',
      title: 'Prepare a one-page proposal with scope, timeline, price, and payment milestones',
      instructions:
        'Set standard $1,500 price with 50% upfront deposit ($750) and 50% milestone balance ($750), explicit deliverables, exclusions, and realistic delivery dates.',
      priority: TaskPriority.HIGH,
      dueTimeBlock: '11:00–12:00',
      dependsOnTaskId: 'task-d1-1',
    },
    {
      id: 'task-d1-5',
      title: 'Research the first 30 qualified businesses and note one specific observation for each',
      instructions:
        'Identify 30 businesses in your chosen niche. Record business name, website, owner/contact, and one specific, truthful website or lead-handling issue for each.',
      priority: TaskPriority.CRITICAL,
      dueTimeBlock: '8:00–9:00',
      dependsOnTaskId: 'task-d1-2',
    },
    {
      id: 'task-d1-6',
      title: 'Make the first 10 calls and record the actual outcomes',
      instructions:
        'Use the Section 8 cold-call script. Ask for the owner, share your specific truthful observation, and invite them to a 10-minute demonstration. Log every outcome honestly.',
      priority: TaskPriority.CRITICAL,
      dueTimeBlock: '9:00–11:00',
      dependsOnTaskId: 'task-d1-5',
    },
    {
      id: 'task-d1-7',
      title: 'Record starting capital, protected reserve, and business expenses',
      instructions:
        'Verify the $5,000 working capital allocation ($2,500 protected reserve, $750 operating/delivery, $250 sales assets, $500 ad test, $1,000 contingency) and protect any essential living expenses first.',
      priority: TaskPriority.HIGH,
      dueTimeBlock: '5:00–5:30',
    },
  ];

  for (const item of day1Checklist) {
    tasks.push({
      ...item,
      dayNumber: 1,
      phaseName: 'Days 1–2: Build the sales machine (First 48 Hours)',
      status: TaskStatus.PENDING,
      isFromPdfChecklist: true,
    });
  }

  // DAY 2 — Exact 7 items from PDF Section 7 ("Day 2 — Get into the market / Day 2 checklist 0 of 7")
  const day2Checklist = [
    {
      id: 'task-d2-1',
      title: 'Research another 20 businesses',
      instructions:
        'Bring the initial prospect tracker to 30–50 qualified businesses with one truthful, specific website or lead-handling observation per business.',
      priority: TaskPriority.CRITICAL,
      dueTimeBlock: '8:00–9:00',
      dependsOnTaskId: 'task-d1-5',
    },
    {
      id: 'task-d2-2',
      title: 'Make 15–20 additional targeted calls',
      instructions:
        'Reach 25–30 cumulative calls across Days 1–2. Focus on reaching decision-makers and booking 10-minute demonstrations.',
      priority: TaskPriority.CRITICAL,
      dueTimeBlock: '9:00–11:00',
      dependsOnTaskId: 'task-d2-1',
    },
    {
      id: 'task-d2-3',
      title: 'Follow up with anyone who expressed interest',
      instructions:
        'Contact every warm lead or callback from Day 1 before conversations go cold.',
      priority: TaskPriority.HIGH,
      dueTimeBlock: '11:00–12:00',
    },
    {
      id: 'task-d2-4',
      title: 'Book and conduct the first demonstrations that are available',
      instructions:
        'Show prospects your relevant mobile example, ask what they need, confirm fixed scope, and request a decision or agreed follow-up.',
      priority: TaskPriority.CRITICAL,
      dueTimeBlock: '1:00–3:00',
      dependsOnTaskId: 'task-d1-3',
    },
    {
      id: 'task-d2-5',
      title: 'Send a written proposal to every genuinely qualified buyer who requests one',
      instructions:
        'Include clear page scope, exclusions, $1,500 price ($750 deposit / $750 milestone), and realistic delivery timeline.',
      priority: TaskPriority.HIGH,
      dueTimeBlock: '11:00–12:00',
      dependsOnTaskId: 'task-d1-4',
    },
    {
      id: 'task-d2-6',
      title: 'Test the Youniverse claim and purchase path without risking production data or charging a real customer unintentionally',
      instructions:
        'Verify the alpha onboarding and payment status safely during the 3:00–5:00 PM block without letting Portals OS rewrites consume selling hours.',
      priority: TaskPriority.MEDIUM,
      dueTimeBlock: '3:00–5:00',
    },
    {
      id: 'task-d2-7',
      title: 'Review the first 48 hours and identify the biggest obstacle to a sale',
      instructions:
        'Day 2 Checkpoint: Verify prospect list, demo readiness, first conversations, qualified prospects, clear list of sales objections, and actual cash available. Decision: No major ad spend.',
      priority: TaskPriority.CRITICAL,
      dueTimeBlock: '5:00–5:30',
    },
  ];

  for (const item of day2Checklist) {
    tasks.push({
      ...item,
      dayNumber: 2,
      phaseName: 'Days 1–2: Build the sales machine (First 48 Hours)',
      status: TaskStatus.PENDING,
      isFromPdfChecklist: true,
    });
  }

  // DAYS 3–7: First sales
  for (let day = 3; day <= 7; day++) {
    const phaseName = 'Days 3–7: First sales';
    tasks.push(
      {
        id: `task-d${day}-research`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Prospect research — identify 15–20 businesses with observable problems`,
        instructions:
          '8:00–9:00 AM block: Identify businesses with a specific, observable website or lead-handling problem and prepare a personalized opening for each.',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        dueTimeBlock: '8:00–9:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-calls`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Outbound sales block — 20–25 targeted calls toward 100–125 cumulative attempts`,
        instructions:
          '9:00–11:00 AM block: Make 20–25 targeted calls, ask for the owner, qualify prospects, and book 1–3 demonstrations.',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '9:00–11:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-followups`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Complete 5–10 follow-ups and send written proposals`,
        instructions:
          '11:00 AM–12:00 PM block: Follow up with prospects who showed interest. Send clear scopes and prices before conversations go cold.',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        dueTimeBlock: '11:00–12:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-demos`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Run booked demonstrations and close for first 50% deposit ($750)`,
        instructions:
          '1:00–3:00 PM block: Show relevant example, confirm scope, and close and collect the first deposit if a qualified buyer agrees.',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '1:00–3:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-delivery`,
        dayNumber: day,
        phaseName,
        title:
          day === 5
            ? 'Open the Youniverse alpha to a small group of real users if entry flow is reliable'
            : `Day ${day}: Delivery on signed website projects & critical alpha blockers only`,
        instructions:
          '3:00–5:00 PM block: Begin delivery immediately after scope and payment terms are agreed. Use remaining time only for alpha issues that block a real user or purchase.',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
        dueTimeBlock: '3:00–5:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-review`,
        dayNumber: day,
        phaseName,
        title:
          day === 7
            ? 'Day 7 Checkpoint: Verify 1–2 paying website clients; diagnose offer/pitch before increasing spend'
            : `Day ${day}: Financial and pipeline review (5:00–5:30 PM)`,
        instructions:
          day === 7
            ? 'Checkpoint: Aim for 1–2 paying website clients and 100–125 cumulative outbound attempts. If 50+ calls produce no meaningful conversations, investigate the list and opening. If none buy, diagnose the offer and sales conversations before increasing spending.'
            : 'Count calls, conversations, demos, proposals, payments, delivery obligations, and cash remaining. Answer the 3 daily questions and set tomorrow’s top 3 priorities.',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '5:00–5:30',
        isFromPdfChecklist: true,
      }
    );
  }

  // DAYS 8–14: Repeat and refine
  for (let day = 8; day <= 14; day++) {
    const phaseName = 'Days 8–14: Repeat and refine';
    tasks.push(
      {
        id: `task-d${day}-research`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Prospect research & proof preparation`,
        instructions:
          '8:00–9:00 AM block: Identify businesses with observable website or lead-handling problems. Prepare early demonstrations and completed work as social proof.',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        dueTimeBlock: '8:00–9:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-calls`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Daily outbound sales block (20–25 targeted calls)`,
        instructions:
          '9:00–11:00 AM block: Continue daily outbound. Stop repeating any pitch that produces no qualified interest.',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '9:00–11:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-followups`,
        dayNumber: day,
        phaseName,
        title:
          day === 10
            ? 'Day 10: Ask satisfied early customers for introductions & complete 5–10 follow-ups'
            : `Day ${day}: 5–10 follow-ups, proposals & test $1,000 automation upsell`,
        instructions:
          '11:00 AM–12:00 PM block: Test Offer B ($1,000 Lead follow-up automation) with prospects who have a real problem with missed inquiries or slow follow-up.',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        dueTimeBlock: '11:00–12:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-demos`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Demonstrations and closing using early completed builds as proof`,
        instructions:
          '1:00–3:00 PM block: Conduct 1–3 demonstrations, present clear scope and payment milestones, and collect deposits.',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '1:00–3:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-delivery`,
        dayNumber: day,
        phaseName,
        title:
          day === 12
            ? 'Day 12: Run a small Youniverse alpha campaign (only if purchase path is tested)'
            : `Day ${day}: Fulfill active client milestones & track delivery hours per client`,
        instructions:
          '3:00–5:00 PM block: Work on paid projects first and collect milestone completion payments.',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        dueTimeBlock: '3:00–5:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-review`,
        dayNumber: day,
        phaseName,
        title:
          day === 14
            ? 'Day 14 Checkpoint: Assess actual revenue, conversion rates, delivery hours/client, and remaining cash'
            : `Day ${day}: Financial and pipeline review (5:00–5:30 PM)`,
        instructions:
          day === 14
            ? 'Checkpoint Decision: Expand only the channel showing real evidence of paid conversions. Stop repeating pitches with zero qualified interest.'
            : 'Update pipeline stages, cleared cash, and delivery status. Set tomorrow’s top 3 priorities.',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '5:00–5:30',
        isFromPdfChecklist: true,
      }
    );
  }

  // DAYS 15–21: Scale what works
  for (let day = 15; day <= 21; day++) {
    const phaseName = 'Days 15–21: Scale what works';
    tasks.push(
      {
        id: `task-d${day}-research`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Concentrate research on the niche with the strongest evidence of demand`,
        instructions:
          '8:00–9:00 AM block: Focus prospecting exclusively on the business category where buyers convert fastest.',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        dueTimeBlock: '8:00–9:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-calls`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Outbound sales block (20–25 calls) balanced with current delivery capacity`,
        instructions:
          '9:00–11:00 AM block: Keep selling while reserving enough time to deliver current contracts on time.',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '9:00–11:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-followups`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Offer fixed-scope follow-on work ($1,000 automation) to existing clients & warm leads`,
        instructions:
          '11:00 AM–12:00 PM block: Pitch Offer B lead follow-up automation to satisfied website clients and active pipeline prospects.',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        dueTimeBlock: '11:00–12:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-demos`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Demonstrations, proposals, and deposit collection`,
        instructions:
          '1:00–3:00 PM block: Close qualified buyers with standardized templates and strict scope.',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '1:00–3:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-delivery`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Deliver current client contracts & improve alpha based on actual user behavior`,
        instructions:
          '3:00–5:00 PM block: Complete client milestones to unlock second-half $750 payments. Improve Youniverse alpha based on real user behavior, not guesses.',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        dueTimeBlock: '3:00–5:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-review`,
        dayNumber: day,
        phaseName,
        title:
          day === 21
            ? 'Day 21 Checkpoint: Compare collected revenue against $20,000 pace; reforecast remaining 9 days'
            : `Day ${day}: Financial and pipeline review (5:00–5:30 PM)`,
        instructions:
          day === 21
            ? 'Checkpoint Decision: Compare cleared gross revenue against the pace needed to reach $20,000. Adjust the target or offer mix honestly if the pipeline is behind.'
            : 'Review daily metrics, cash reserves, and delivery queue.',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '5:00–5:30',
        isFromPdfChecklist: true,
      }
    );
  }

  // DAYS 22–30: Collect and fulfill
  for (let day = 22; day <= 30; day++) {
    const phaseName = 'Days 22–30: Collect and fulfill';
    tasks.push(
      {
        id: `task-d${day}-pipeline`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Targeted outreach & follow-up on qualified open proposals`,
        instructions:
          '8:00–11:00 AM block: Focus on closing qualified outstanding proposals that can be delivered or properly onboarded within capacity.',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        dueTimeBlock: '9:00–11:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-collections`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Prioritize completing contracted milestones and collecting final payments due`,
        instructions:
          '11:00 AM–3:00 PM block: Obtain client sign-off on completed websites and automations and collect remaining 50% milestone balances ($750 / $500).',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '1:00–3:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-fulfillment`,
        dayNumber: day,
        phaseName,
        title: `Day ${day}: Strict fulfillment guard — avoid taking on work you cannot fulfill`,
        instructions:
          '3:00–5:00 PM block: Finish every promised client deliverable. Do not take deposits for work you lack the capacity or intention to deliver.',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '3:00–5:00',
        isFromPdfChecklist: true,
      },
      {
        id: `task-d${day}-review`,
        dayNumber: day,
        phaseName,
        title:
          day === 30
            ? 'Day 30 Final Checkpoint: Reconcile receipts, costs, refunds, and unfinished obligations; determine net cash'
            : `Day ${day}: Reconcile receipts, obligations, and daily review`,
        instructions:
          day === 30
            ? 'Final Checkpoint: Calculate collected gross revenue and net cash after expenses and obligations. Decide which offer deserves the next month’s attention. Report the result honestly, even if it falls short of the $20,000 stretch target.'
            : 'Reconcile cleared payments, outstanding milestone receivables, and remaining delivery work.',
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueTimeBlock: '5:00–5:30',
        isFromPdfChecklist: true,
      }
    );
  }

  return tasks;
}

export function createInitialRealState(): CampaignState {
  const initialLead: TeamMember = {
    id: 'member-lead',
    name: DEFAULT_SETTINGS.operatorName || 'Founder',
    email: 'itsyouonlinedotcom@gmail.com',
    role: 'Campaign Lead & Closer',
    avatarColor: '#38bdf8',
    joinedAt: DEFAULT_SETTINGS.startDate,
    lastActiveAt: new Date().toISOString(),
    authProvider: 'team',
  };
  return {
    isDemoMode: false,
    settings: { ...DEFAULT_SETTINGS },
    offers: INITIAL_OFFERS.map((o) => ({ ...o })),
    scenarios: INITIAL_SCENARIOS.map((s) => ({ ...s })),
    tasks: generate30DayRoadmap(),
    prospects: [],
    callLogs: [],
    proposals: [],
    projects: [],
    transactions: [],
    scripts: INITIAL_SCRIPTS.map((s) => ({ ...s })),
    dailyReviews: [],
    teamMembers: [initialLead],
    teamActivityFeed: [],
    whichShittyPitch: createInitialWhichShittyPitchState(),
    notifications: [],
    notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  };
}

