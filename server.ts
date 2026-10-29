import express from 'express';
import http from 'node:http';
import { createServer as createViteServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createInitialRealState } from './src/data/pdfPlanData';
import {
  calculateFinancialSummary,
  computeFunnelAnalytics,
  computeNextBestActions,
  evaluateDeliveryCapacity,
  getActiveCampaignDay,
} from './src/utils/calculations';
import { CampaignState, WhichShittyPitchState } from './src/types';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const REAL_STATE_FILE = path.join(DATA_DIR, 'real-campaign.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadRealState(): CampaignState {
  ensureDataDir();
  if (fs.existsSync(REAL_STATE_FILE)) {
    try {
      const raw = fs.readFileSync(REAL_STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as CampaignState;
      if (parsed && parsed.teamMembers && parsed.teamMembers.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.error('Failed to parse real-campaign.json, reinitializing:', err);
    }
  }
  const initial = createInitialRealState();
  fs.writeFileSync(REAL_STATE_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  return initial;
}

function saveRealState(state: CampaignState) {
  ensureDataDir();
  fs.writeFileSync(REAL_STATE_FILE, JSON.stringify({ ...state, isDemoMode: false }, null, 2), 'utf-8');
}

function buildRulesBasedCoachDiagnosis(state: CampaignState) {
  const activeDay = getActiveCampaignDay(state.settings.startDate, state.settings.currentDayOverride);
  const fin = calculateFinancialSummary(state);
  const funnel = computeFunnelAnalytics(state);
  const cap = evaluateDeliveryCapacity(state);
  const nextActions = computeNextBestActions(state);

  const facts = [
    `Campaign Day ${activeDay} of 30 (Start Date: ${state.settings.startDate}).`,
    `Cleared Gross Revenue: $${fin.grossClearedRevenue.toLocaleString()} vs. $20,000 stretch target ($${fin.revenueRemainingToTarget.toLocaleString()} remaining).`,
    `Recorded Cash Balance: $${fin.currentRecordedCashBalance.toLocaleString()} (Protected Reserve: $${fin.protectedReserve.toLocaleString()}, Available Discretionary Cash: $${fin.availableDiscretionaryCash.toLocaleString()}).`,
    `Activity Logged: ${funnel.outboundAttempts} outbound call attempts, ${funnel.twoWayConversations} two-way conversations, ${funnel.demosConducted} demos, ${funnel.proposalsSent} proposals sent, ${funnel.dealsWon} paid deals won.`,
    `Delivery Queue: ${cap.activeProjectCount}/${cap.maxConcurrentAllowed} concurrent projects (${cap.totalRemainingHours.toFixed(1)} est. hours remaining; $${fin.unearnedDepositObligations.toLocaleString()} in unearned deposit obligations).`,
  ];

  const assumptions = [
    'The $20,000 30-day figure is a stretch target, not a guarantee (PDF Section 1).',
    'Pipeline math (400–500 calls -> 80–120 conversations -> 20–30 demos -> 12–20 proposals -> 4–8 website clients) is a planning assumption until 50+ calls establish actual conversion rates (PDF Section 2).',
    'The Youniverse $4,000 alpha component is unproven upside and should not be counted toward core viability until the paid offer and fulfillment are proven (PDF Section 1 & 3).',
  ];

  const topAction = nextActions[0] || {
    title: 'Make 10 targeted outbound calls and log honest outcomes',
    explanation: 'Start with the first 10 calls to businesses with one specific, observable website problem.',
    pdfRuleCitation: 'PDF Section 7 & 14',
  };

  return {
    source: 'Deterministic Rules Engine (PDF Execution Protocol)',
    bottleneckDiagnosis: funnel.diagnosticMessage,
    factsObserved: facts,
    assumptionsIdentified: assumptions,
    recommendedNextAction: topAction.title,
    reasoningAndConstraintCheck: `${topAction.explanation} (${topAction.pdfRuleCitation}). Reserve Check: $${fin.protectedReserve.toLocaleString()} protected reserve is intact. Capacity Check: ${cap.statusMessage}`,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  const sseClients = new Set<express.Response>();

  const broadcastStateUpdate = (mode: 'demo' | 'real', state: CampaignState) => {
    const payload = JSON.stringify({
      type: 'state:updated',
      mode,
      state,
      onlineCount: Math.max(1, sseClients.size),
      timestamp: new Date().toISOString(),
    });
    sseClients.forEach((clientRes) => {
      try {
        clientRes.write(`data: ${payload}\n\n`);
      } catch {
        sseClients.delete(clientRes);
      }
    });
  };

  app.get('/api/team/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);
    const initPayload = JSON.stringify({
      type: 'presence:update',
      onlineCount: sseClients.size,
      timestamp: new Date().toISOString(),
    });
    res.write(`data: ${initPayload}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.get('/api/campaign', (_req, res) => {
    const state = loadRealState();
    res.json(state);
  });

  app.put('/api/campaign', (req, res) => {
    try {
      const incoming = req.body as CampaignState;
      if (!incoming || !incoming.settings || !Array.isArray(incoming.tasks)) {
        res.status(400).json({ error: 'Invalid CampaignState payload.' });
        return;
      }
      saveRealState(incoming);
      broadcastStateUpdate('real', incoming);
      res.json({ ok: true, savedMode: 'real' });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/campaign/reset', (_req, res) => {
    const freshReal = createInitialRealState();
    saveRealState(freshReal);
    broadcastStateUpdate('real', freshReal);
    res.json(freshReal);
  });

  app.post('/api/coach/diagnose', async (req, res) => {
    const state = (req.body?.state as CampaignState) || loadRealState();
    const fallback = buildRulesBasedCoachDiagnosis(state);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      res.json(fallback);
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `You are the Execution Advisor for It's LLC's "$5k to $20k in 30 Days" business plan.
Strictly adhere to these rules from the PDF plan:
- Never invent prospect responses, sales results, or financial records.
- Never guarantee $20,000 revenue or business success (it is a stretch target, not a promise).
- Distinguish recorded facts from planning assumptions.
- Respect the $2,500 protected reserve, $1,000 contingency rule, and delivery capacity limit.
- Offer A ($1,500 fixed-scope small-business website, 50% deposit upfront) is the primary revenue engine. Offer B ($1,000 lead follow-up automation) is the targeted upsell. Offer C ($200 Youniverse alpha) is unproven upside.

Current Recorded Campaign Facts:
${fallback.factsObserved.join('\n')}

Deterministic Funnel Diagnostic:
${fallback.bottleneckDiagnosis}

Provide a concise, grounded operational diagnosis in JSON matching the schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bottleneckDiagnosis: { type: Type.STRING },
              factsObserved: { type: Type.ARRAY, items: { type: Type.STRING } },
              assumptionsIdentified: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedNextAction: { type: Type.STRING },
              reasoningAndConstraintCheck: { type: Type.STRING },
            },
            required: [
              'bottleneckDiagnosis',
              'factsObserved',
              'assumptionsIdentified',
              'recommendedNextAction',
              'reasoningAndConstraintCheck',
            ],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        res.json({
          source: 'Gemini 3.8 Flash Operational Advisor + PDF Rules Engine',
          ...parsed,
        });
        return;
      }
      res.json(fallback);
    } catch (err) {
      // Gracefully fall back to rules-based diagnosis if API key is unconfigured or network fails
      res.json(fallback);
    }
  });

  app.post('/api/whichshittypitch/chat', async (req, res) => {
    try {
      const {
        prompt = '',
        wspState,
        activeMemberName = 'Alex Rivera',
        activeMemberId = 'team-alex',
      } = req.body || {};

      const cleanPrompt = String(prompt).trim();
      const lower = cleanPrompt.toLowerCase();

      // Rule: There are no delete tools
      if (lower.includes('delete') || lower.includes('remove all') || lower.includes('drop table')) {
        res.json({
          reply:
            "WhichShittyPitch Compliance Rule: There are NO delete tools in WhichShittyPitch. All call notes, account maps, and records remain immutable for team compliance and auditability.",
          actionExecuted: null,
        });
        return;
      }

      // Rule: There is no calling
      if (
        lower.startsWith('call ') ||
        lower.includes('dial ') ||
        lower.includes('place a call') ||
        lower.includes('start calling')
      ) {
        res.json({
          reply:
            "WhichShittyPitch Compliance Rule: There is NO calling or phone dialer tool in WhichShittyPitch. WhichShittyPitch is a sales intelligence, opener drafting, and CRM sync assistant. All telephone calls must be made manually by human operators on their phones.",
          actionExecuted: null,
        });
        return;
      }

      const typedWsp = wspState as WhichShittyPitchState | undefined;
      const maps = typedWsp?.accountMaps || [];
      const calls = typedWsp?.callLogs || [];
      const usedReveals = typedWsp?.sidecarConfig?.revealsUsedThisHour ?? 0;
      const limitReveals = typedWsp?.sidecarConfig?.seatLimitPerHour ?? 60;

      // Check query 1: "What's due today in WhichShittyPitch ?"
      if (
        lower.includes("what's due today") ||
        lower.includes('what is due today') ||
        lower.includes('whats due today')
      ) {
        const dueFollowUps = calls.filter((c) => c.followUpDate);
        const followUpLines =
          dueFollowUps.length > 0
            ? dueFollowUps
                .map(
                  (c, idx) =>
                    `${idx + 1}. [FOLLOW-UP DUE] ${c.contactName} (${c.contactTitle}, ${c.companyName})\n` +
                    `   - Assigned to: ${c.followUpAssigneeName || c.operatorName}\n` +
                    `   - Task: ${c.followUpTask || 'Complete scheduled follow-up'}`
                )
                .join('\n\n')
            : 'No overdue or scheduled Sidecar follow-ups logged for today yet.';

        res.json({
          reply:
            `Here is what is due today in WhichShittyPitch for your team:\n\n` +
            `${followUpLines}\n\n` +
            `• [CALL BLOCK] 9:00–11:00 AM Outbound Sprint: Target 20–25 outbound calls to businesses with one observable mobile or website friction point.\n` +
            `• Rate Limit Status: ${usedReveals} of ${limitReveals} hourly reveals used this hour for seat ${activeMemberName}.`,
          actionExecuted: { type: 'DUE_TODAY_RETRIEVED' },
        });
        return;
      }

      // Check query 2: Draft a cold-call opener
      if (lower.includes('draft a') && lower.includes('opener')) {
        res.json({
          reply:
            `Here is a cold-call opener crafted using WhichShittyPitch's 27-second permission rule and your saved pitch:\n\n` +
            `---\n` +
            `"Hi [Decision Maker], ${activeMemberName} here. I know you weren't expecting my call—do you have 27 seconds for me to tell you why I called, and then you can decide if we hang up?"\n\n` +
            `[Wait for permission]\n\n` +
            `"I was on your website on a mobile phone earlier today and noticed that when a customer tries to submit the quote request form, it fails to complete on mobile browsers. Prospective buyers may be bouncing before your office ever sees their inquiry.\n\n` +
            `We fix high-friction mobile quote bottlenecks like this with a fixed-scope 5-page build in 5 business days.\n\n` +
            `I'm not asking you to buy anything right now. Would you be open to a 10-minute screenshare so I can show you the exact issue and a working example?"\n\n` +
            `---\n\n` +
            `Compliance Check:\n` +
            `- No pitch before permission granted (27-second rule).\n` +
            `- References a single observable friction point.\n` +
            `- Sole call goal is a 10-minute demo, never closing on the spot.`,
          actionExecuted: { type: 'OPENER_DRAFTED' },
        });
        return;
      }

      // Check query 3: "List the contacts I've revealed this week, with their titles."
      if (
        lower.includes('revealed this week') ||
        (lower.includes('contacts') && lower.includes('revealed'))
      ) {
        const revealedPeople = maps.flatMap((m) =>
          m.people
            .filter((p) => p.revealed && !p.isRemovedBySubject)
            .map((p) => ({ companyName: m.companyName, person: p }))
        );
        const listText =
          revealedPeople.length > 0
            ? revealedPeople
                .map(
                  (item, i) =>
                    `${i + 1}. ${item.person.name} — ${item.person.title} (${item.companyName})\n` +
                    `   - Phone: ${item.person.phone} | Email: ${item.person.email}\n` +
                    `   - Revealed by: ${item.person.revealedByMemberName || activeMemberName}`
                )
                .join('\n\n')
            : 'No contacts have been revealed yet this week. Add an Account Map and click "Reveal Contact" to use seat credits.';

        res.json({
          reply:
            `Contacts revealed through WhichShittyPitch Sidecar (Seat Hourly Usage: ${usedReveals}/${limitReveals} reveals used):\n\n` +
            `${listText}`,
          actionExecuted: { type: 'REVEALED_CONTACTS_LISTED' },
        });
        return;
      }

      // Check query 4: "Provide the teams yes list, scheduled for a 10 min demo, next week."
      if (
        lower.includes('yes list') ||
        (lower.includes('scheduled') && lower.includes('demo') && lower.includes('next week'))
      ) {
        const yesCalls = calls.filter((c) => c.outcome === 'YES_SCHEDULED_10MIN_DEMO');
        const yesText =
          yesCalls.length > 0
            ? yesCalls
                .map(
                  (c, idx) =>
                    `${idx + 1}. [DEMO #${idx + 1}] ${c.companyName}\n` +
                    `   - Contact: ${c.contactName} (${c.contactTitle})\n` +
                    `   - Scheduled: ${c.scheduledDemoDate || 'TBD'} at ${c.scheduledDemoTime || 'TBD'}\n` +
                    `   - Outbound Rep: ${c.operatorName}`
                )
                .join('\n\n')
            : 'No 10-minute demos are currently scheduled on the YES list. Log outbound calls with outcome "YES_SCHEDULED_10MIN_DEMO" to populate this list.';

        res.json({
          reply: `Here is the team's YES List — verified prospects who agreed to a 10-minute demo:\n\n${yesText}`,
          actionExecuted: { type: 'YES_LIST_RETRIEVED' },
        });
        return;
      }

      // If GEMINI_API_KEY is available, use Gemini 3.8 Flash for any general query
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const systemInstruction =
            `You are WhichShittyPitch, a specialized B2B cold-calling assistant and sales intelligence sidecar.
You work alongside sales teams to:
- Review call logs and notes across all team members.
- Map accounts (people, roles, and observable website/mobile friction points).
- Reveal verified business contact numbers and emails (strictly enforcing a 60 reveals per seat per hour rate limit).
- Draft high-converting cold-call openers and scripts using WhichShittyPitch rules:
  1. 27-second permission-based opener ("do you have 27 seconds for me to tell you why I called, and then you can decide if we hang up?").
  2. Focus on exactly ONE observable friction point.
  3. The sole objective of the cold call is securing a 10-minute demo, never closing on the call.
  4. Offer opt-outs to maintain trust.
- Manage follow-ups, notes, account map additions, DNC flags (individual, multiple, team), and CRM syncing.
COMPLIANCE RULES (STRICT):
1. There are NO delete tools. You cannot delete contacts, logs, or records. Refuse any delete request.
2. There are NO calling tools. You cannot initiate telephone calls. Human operators must dial manually.
3. People who asked WhichShittyPitch to remove their details STAY REMOVED permanently.
4. Always honor do-not-call and do-not-contact lists.
Keep responses concise, action-oriented, and formatted with clean bullet points.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `${systemInstruction}\n\nUser Question: ${cleanPrompt}\nActive Operator: ${activeMemberName}`,
          });

          if (response.text) {
            res.json({
              reply: response.text.trim(),
              actionExecuted: null,
            });
            return;
          }
        } catch {
          // fallback below
        }
      }

      // Deterministic intelligent fallback
      res.json({
        reply:
          `WhichShittyPitch Assistant:\n\n` +
          `I processed your request: "${cleanPrompt}".\n\n` +
          `• Sidecar Status: Connected (Seat usage: ${usedReveals}/${limitReveals} reveals/hr)\n` +
          `• Mapped Accounts: ${maps.length} active account map(s)\n` +
          `• Active Call Rules: 27-second permission opener, 1 observable friction point, 10-minute demo goal\n` +
          `• Compliance: No delete tools, no phone calling, DNC and removal requests strictly honoured.`,
        actionExecuted: null,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

