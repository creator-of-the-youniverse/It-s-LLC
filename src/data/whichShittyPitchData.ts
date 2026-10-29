import { WhichShittyPitchState } from '../types';

export const INITIAL_WHICH_SHITTY_PITCH_SAVED_PITCH =
  'We help B2B trade, service, and manufacturing firms fix their single highest-friction website or mobile bottleneck with zero downtime, guaranteeing a measurable 20%+ increase in qualified inbound quote requests before proposing any full redesign.';

export const INITIAL_WHICH_SHITTY_PITCH_CALL_RULES = [
  'Rule 1: Never pitch on the opener. Ask for 27 seconds to explain why you called.',
  'Rule 2: Point to exactly one observable friction point (e.g., broken mobile form, 9s load time).',
  'Rule 3: The sole goal of the cold call is securing a 10-minute screenshare demo, never closing on the phone.',
  'Rule 4: Never push through hard objections; offer an opt-out to protect credibility.',
  'Rule 5: Team rule: If someone requests DNC or removal, honour it immediately across all seats.',
  'Rule 6: Maximum 60 contact detail reveals per seat per hour enforced by Sidecar.',
];

export function createInitialWhichShittyPitchState(): WhichShittyPitchState {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  return {
    sidecarConfig: {
      connected: true,
      seatId: 'wsp-seat-live-01',
      accountSeatName: 'Campaign Operator (Primary Outbound Seat)',
      seatLimitPerHour: 60,
      revealsUsedThisHour: 0,
      hourWindowStart: now.toISOString(),
      savedPitch: INITIAL_WHICH_SHITTY_PITCH_SAVED_PITCH,
      callRules: INITIAL_WHICH_SHITTY_PITCH_CALL_RULES,
    },
    accountMaps: [],
    callLogs: [],
    chatHistory: [
      {
        id: 'msg-sys-1',
        role: 'system',
        content:
          "WhichShittyPitch Sidecar connected in Production Mode. Ready to check what is due today, draft cold-call openers, map accounts, track contact reveals, and manage your team's 10-minute demo YES list.",
        timestamp: `${todayStr}T08:00:00Z`,
      },
    ],
  };
}
