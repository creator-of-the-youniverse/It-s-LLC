import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CampaignState,
  DeliveryStatus,
  PipelineStage,
  Prospect,
} from '../types';
import {
  calculateFinancialSummary,
  getActiveCampaignDay,
} from '../utils/calculations';
import {
  getAccessToken,
  getCurrentGoogleUser,
  googleSignIn,
  initAuth,
  logout,
} from '../services/googleWorkspaceAuth';
import {
  Calendar,
  Mail,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Send,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  UserPlus,
  Sparkles,
} from 'lucide-react';

interface GoogleWorkspaceHubViewProps {
  state: CampaignState;
  onImportProspects: (prospects: Prospect[]) => void;
}

interface PendingConfirmation {
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void>;
}

interface CalendarEventItem {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
}

interface SheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheetTabs: string[];
}

interface FormDetails {
  formId: string;
  title: string;
  description?: string;
  responderUri?: string;
  questions: { itemId: string; title: string; questionId?: string }[];
}

interface FormResponseItem {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  answers: Record<string, string>;
}

const PDF_DAILY_SCHEDULE_BLOCKS = [
  {
    startHour: 8,
    startMin: 0,
    endHour: 9,
    endMin: 0,
    summary: 'Prospect Research (It’s LLC $5K→$20K Plan)',
    description:
      'PDF Section 4 (8:00–9:00): Identify businesses with a specific, observable problem. Prepare a personalized opening for each.',
  },
  {
    startHour: 9,
    startMin: 0,
    endHour: 11,
    endMin: 0,
    summary: 'Outbound Sales Block — 20–25 Targeted Calls',
    description:
      'PDF Section 4 (9:00–11:00): Make calls, ask for the owner, qualify prospects, and book 10-minute demonstrations.',
  },
  {
    startHour: 11,
    startMin: 0,
    endHour: 12,
    endMin: 0,
    summary: 'Follow-ups & Written Proposals (5–10 Follow-ups)',
    description:
      'PDF Section 4 (11:00–12:00): Send clear scopes and prices ($1,500 Offer A / 50% deposit). Schedule next steps before conversations go cold.',
  },
  {
    startHour: 13,
    startMin: 0,
    endHour: 15,
    endMin: 0,
    summary: 'Demonstrations & Closing (1–3 Demos Target)',
    description:
      'PDF Section 4 (1:00–3:00): Show prospects a relevant example. Ask what they need, confirm scope, and request a decision or agreed follow-up.',
  },
  {
    startHour: 15,
    startMin: 0,
    endHour: 17,
    endMin: 0,
    summary: 'Delivery & Product Work (Paid Projects First)',
    description:
      'PDF Section 4 (3:00–5:00): Work on paid projects first. Use remaining time for only the alpha issues that block a real user or purchase.',
  },
  {
    startHour: 17,
    startMin: 0,
    endHour: 17,
    endMin: 30,
    summary: 'Financial & Pipeline Review (End-of-Day Audit)',
    description:
      'PDF Section 4 (5:00–5:30): Count calls, conversations, demos, proposals, payments, delivery obligations, and cash remaining. Set tomorrow’s top three priorities.',
  },
];

function encodeBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const GoogleSignInButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}> = ({ onClick, disabled, label = 'Sign in with Google' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    data-testid="google-signin-button"
    className="gsi-material-button inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white text-slate-900 font-medium text-xs shadow hover:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer border border-slate-300"
  >
    <div className="gsi-material-button-state" />
    <div className="gsi-material-button-content-wrapper flex items-center gap-2.5">
      <div className="gsi-material-button-icon w-4 h-4 shrink-0">
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          style={{ display: 'block' }}
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
      </div>
      <span className="gsi-material-button-contents font-semibold">{label}</span>
      <span style={{ display: 'none' }}>{label}</span>
    </div>
  </button>
);

export const GoogleWorkspaceHubView: React.FC<GoogleWorkspaceHubViewProps> = ({
  state,
  onImportProspects,
}) => {
  const [activeServiceTab, setActiveServiceTab] = useState<
    'calendar' | 'gmail' | 'sheets' | 'forms'
  >('calendar');
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(() => getCurrentGoogleUser());
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [demoProspectId, setDemoProspectId] = useState<string>(
    state.prospects[0]?.id || ''
  );
  const [demoDate, setDemoDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [demoTime, setDemoTime] = useState<string>('13:30');
  const [demoAttendeeEmail, setDemoAttendeeEmail] = useState<string>('');

  // Gmail state
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>(
    '1-Page Website Scope & Quote ($1,500 Fixed Scope) — It’s LLC'
  );
  const [emailBody, setEmailBody] = useState<string>(() => {
    const firstProspect = state.prospects[0];
    return `Hi ${firstProspect?.contactName || 'there'},\n\nFollowing up on our conversation regarding ${firstProspect?.businessName || 'your business website'}.\n\nHere is our fixed-scope Offer A summary:\n- 5-page mobile-responsive website\n- Direct customer contact & quote-request form\n- Basic on-page SEO & analytics setup\n- 2 structured revision rounds\n- Total Fixed Price: $1,500 ($750 50% deposit upfront to begin delivery, $750 upon agreed milestone completion).\n\nWould you like me to lock in your build slot this week?\n\nBest,\n${state.settings.operatorName || 'It’s LLC'}`;
  });

  // Google Sheets state
  const [sheetMetadata, setSheetMetadata] = useState<SheetMetadata | null>(null);
  const [sheetIdInput, setSheetIdInput] = useState<string>('');
  const [selectedSheetTab, setSelectedSheetTab] = useState<string>('');
  const [sheetRows, setSheetRows] = useState<string[][]>([]);

  // Google Forms state
  const [formIdInput, setFormIdInput] = useState<string>('');
  const [activeForm, setActiveForm] = useState<FormDetails | null>(null);
  const [formResponses, setFormResponses] = useState<FormResponseItem[]>([]);
  const [newFormTemplate, setNewFormTemplate] = useState<'OFFER_A' | 'OFFER_C'>(
    'OFFER_A'
  );

  useEffect(() => {
    const unsub = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsub();
  }, []);

  const ensureValidToken = async (): Promise<string | null> => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      setStatusMessage({
        type: 'info',
        text: 'Please sign in with Google to authorize access to your Google Workspace account.',
      });
      return null;
    }
    return token;
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        setStatusMessage({
          type: 'success',
          text: `Connected to Google Workspace as ${result.user.email || result.user.displayName}.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        type: 'error',
        text: `Google Sign-In could not complete: ${msg}`,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setCalendarEvents([]);
    setGmailMessages([]);
    setSheetMetadata(null);
    setSheetRows([]);
    setActiveForm(null);
    setFormResponses([]);
    setStatusMessage({
      type: 'info',
      text: 'Signed out of Google Workspace and cleared in-memory token.',
    });
  };

  // ============================================================================
  // 1. GOOGLE CALENDAR OPERATIONS
  // ============================================================================
  const fetchCalendarEvents = async () => {
    const token = await ensureValidToken();
    if (!token) return;
    setIsBusy(true);
    setStatusMessage(null);
    try {
      const timeMin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
          timeMin
        )}&maxResults=15&singleEvents=true&orderBy=startTime`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.status === 401) {
        setNeedsAuth(true);
        throw new Error('Session expired. Please sign in with Google again.');
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to load calendar events.');
      }
      setCalendarEvents(data.items || []);
      setStatusMessage({
        type: 'success',
        text: `Loaded ${(data.items || []).length} upcoming events from your primary Google Calendar.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsBusy(false);
    }
  };

  const requestSyncDailyScheduleBlocks = () => {
    setPendingConfirmation({
      title: 'Add 6 Daily Execution Schedule Blocks to Google Calendar?',
      description: `This will create the 6 time blocks from PDF Section 4 (8:00 AM – 5:30 PM) on your primary Google Calendar for ${selectedScheduleDate}.`,
      details: PDF_DAILY_SCHEDULE_BLOCKS.map(
        (b) =>
          `${String(b.startHour).padStart(2, '0')}:${String(b.startMin).padStart(2, '0')}–${String(
            b.endHour
          ).padStart(2, '0')}:${String(b.endMin).padStart(2, '0')} • ${b.summary}`
      ),
      confirmLabel: 'Confirm & Add 6 Schedule Blocks',
      onConfirm: async () => {
        const token = await ensureValidToken();
        if (!token) return;
        setIsBusy(true);
        try {
          const [year, month, day] = selectedScheduleDate.split('-').map(Number);
          for (const block of PDF_DAILY_SCHEDULE_BLOCKS) {
            const startDt = new Date(year, month - 1, day, block.startHour, block.startMin, 0);
            const endDt = new Date(year, month - 1, day, block.endHour, block.endMin, 0);
            const res = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  summary: block.summary,
                  description: block.description,
                  start: { dateTime: startDt.toISOString() },
                  end: { dateTime: endDt.toISOString() },
                }),
              }
            );
            if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData?.error?.message || 'Failed creating schedule block');
            }
          }
          await fetchCalendarEvents();
          setStatusMessage({
            type: 'success',
            text: `Synced all 6 PDF execution blocks (8:00 AM – 5:30 PM) to Google Calendar for ${selectedScheduleDate}.`,
          });
        } catch (err: unknown) {
          setStatusMessage({
            type: 'error',
            text: err instanceof Error ? err.message : String(err),
          });
        } finally {
          setIsBusy(false);
        }
      },
    });
  };

  const requestScheduleProspectDemo = () => {
    const prospect = state.prospects.find((p) => p.id === demoProspectId);
    const businessLabel = prospect?.businessName || 'Prospect';
    const summary = `10-Minute Website Demo: ${businessLabel} ($1,500 Offer A)`;
    setPendingConfirmation({
      title: 'Create 10-Minute Demo Event on Google Calendar?',
      description: `This will create a new calendar appointment on ${demoDate} at ${demoTime} for ${businessLabel}.`,
      details: [
        `Event Title: ${summary}`,
        `Date & Time: ${demoDate} at ${demoTime} (15 mins allocated)`,
        prospect?.problemObserved
          ? `Observed Problem: ${prospect.problemObserved}`
          : 'Standard 10-minute demonstration script (PDF Section 8)',
        demoAttendeeEmail.trim()
          ? `Attendee Invite: ${demoAttendeeEmail.trim()}`
          : 'No external attendee email specified (added to your calendar only)',
      ],
      confirmLabel: 'Confirm & Create Calendar Event',
      onConfirm: async () => {
        const token = await ensureValidToken();
        if (!token) return;
        setIsBusy(true);
        try {
          const [year, month, day] = demoDate.split('-').map(Number);
          const [hour, minute] = demoTime.split(':').map(Number);
          const startDt = new Date(year, month - 1, day, hour || 13, minute || 30, 0);
          const endDt = new Date(startDt.getTime() + 15 * 60 * 1000);
          const payload: Record<string, unknown> = {
            summary,
            description: `10-minute website demonstration for ${businessLabel} (${
              prospect?.contactName || 'Owner'
            }).\nObserved Issue: ${
              prospect?.problemObserved || 'N/A'
            }\nOffer A: Fixed-scope $1,500 website (50% deposit upfront).`,
            start: { dateTime: startDt.toISOString() },
            end: { dateTime: endDt.toISOString() },
          };
          if (demoAttendeeEmail.trim()) {
            payload.attendees = [{ email: demoAttendeeEmail.trim() }];
          }
          const res = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          );
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error?.message || 'Failed to schedule demo event.');
          }
          await fetchCalendarEvents();
          setStatusMessage({
            type: 'success',
            text: `Scheduled "${summary}" on Google Calendar.`,
          });
        } catch (err: unknown) {
          setStatusMessage({
            type: 'error',
            text: err instanceof Error ? err.message : String(err),
          });
        } finally {
          setIsBusy(false);
        }
      },
    });
  };

  const requestDeleteCalendarEvent = (evt: CalendarEventItem) => {
    setPendingConfirmation({
      title: 'Delete Event from Google Calendar?',
      description:
        'Are you sure you want to permanently remove this event from your Google Calendar? This action cannot be undone.',
      details: [
        `Event: ${evt.summary || 'Untitled Event'}`,
        `Start: ${evt.start?.dateTime || evt.start?.date || 'Unknown time'}`,
      ],
      confirmLabel: 'Delete Calendar Event',
      isDestructive: true,
      onConfirm: async () => {
        const token = await ensureValidToken();
        if (!token) return;
        setIsBusy(true);
        try {
          const safeEventId = encodeURIComponent(evt.id);
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${safeEventId}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (!res.ok && res.status !== 204) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error?.message || 'Failed to delete calendar event.');
          }
          setCalendarEvents((prev) => prev.filter((item) => item.id !== evt.id));
          setStatusMessage({
            type: 'success',
            text: `Deleted event "${evt.summary || evt.id}" from Google Calendar.`,
          });
        } catch (err: unknown) {
          setStatusMessage({
            type: 'error',
            text: err instanceof Error ? err.message : String(err),
          });
        } finally {
          setIsBusy(false);
        }
      },
    });
  };

  // ============================================================================
  // 2. GMAIL OPERATIONS
  // ============================================================================
  const fetchGmailMessages = async () => {
    const token = await ensureValidToken();
    if (!token) return;
    setIsBusy(true);
    setStatusMessage(null);
    try {
      const listRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (listRes.status === 401) {
        setNeedsAuth(true);
        throw new Error('Session expired. Please sign in with Google again.');
      }
      const listData = await listRes.json();
      if (!listRes.ok) {
        throw new Error(listData?.error?.message || 'Failed to list Gmail messages.');
      }
      const messageRefs: { id: string; threadId: string }[] = listData.messages || [];
      const details: GmailMessageSummary[] = [];

      for (const ref of messageRefs) {
        const safeId = encodeURIComponent(ref.id);
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${safeId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          const headers: { name: string; value: string }[] =
            msgData?.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
          details.push({
            id: msgData.id,
            threadId: msgData.threadId,
            snippet: msgData.snippet || '',
            subject: getHeader('Subject') || '(No Subject)',
            from: getHeader('From') || '',
            to: getHeader('To') || '',
            date: getHeader('Date') || '',
          });
        }
      }

      setGmailMessages(details);
      setStatusMessage({
        type: 'success',
        text: `Loaded ${details.length} recent messages from your Gmail account.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handlePopulateEmailFromProspect = (prospectId: string) => {
    const p = state.prospects.find((item) => item.id === prospectId);
    if (!p) return;
    if (p.email) setEmailRecipient(p.email);
    setEmailSubject(
      `1-Page Website Scope & Quote ($${p.estimatedValue.toLocaleString()}) — ${p.businessName}`
    );
    const half = Math.round((p.estimatedValue || 1500) * 0.5);
    setEmailBody(
      `Hi ${p.contactName || 'there'},\n\nThank you for speaking with me about ${
        p.businessName
      }. As discussed, I noticed: ${
        p.problemObserved
      }.\n\nHere is the 1-page fixed scope for your project:\n- Defined 5-page mobile-responsive website\n- Direct customer contact & quote-request flow\n- Basic on-page SEO & analytics setup\n- 2 structured revision rounds\n- Total Fixed Price: $${(
        p.estimatedValue || 1500
      ).toLocaleString()} ($${half.toLocaleString()} 50% deposit upfront to begin delivery; $${(
        (p.estimatedValue || 1500) - half
      ).toLocaleString()} upon final milestone completion).\n\nReply to confirm scope and I will send the deposit link to start delivery immediately.\n\nBest regards,\n${
        state.settings.operatorName || 'It’s LLC'
      }`
    );
  };

  const requestSendGmailProposal = () => {
    if (!emailRecipient.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a recipient email address before sending.',
      });
      return;
    }
    setPendingConfirmation({
      title: 'Send Email via Your Gmail Account?',
      description:
        'Please confirm that you want to send this email from your connected Gmail account.',
      details: [
        `To: ${emailRecipient.trim()}`,
        `Subject: ${emailSubject.trim()}`,
        `Preview: ${emailBody.slice(0, 140)}${emailBody.length > 140 ? '...' : ''}`,
      ],
      confirmLabel: 'Confirm & Send Email',
      onConfirm: async () => {
        const token = await ensureValidToken();
        if (!token) return;
        setIsBusy(true);
        try {
          const mimeMessage = [
            `To: ${emailRecipient.trim()}`,
            `Subject: ${emailSubject.trim()}`,
            'Content-Type: text/plain; charset="UTF-8"',
            'MIME-Version: 1.0',
            '',
            emailBody,
          ].join('\r\n');

          const raw = encodeBase64Url(mimeMessage);
          const res = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ raw }),
            }
          );
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error?.message || 'Failed to send email via Gmail.');
          }
          setStatusMessage({
            type: 'success',
            text: `Email sent to ${emailRecipient.trim()} (Message ID: ${data.id}).`,
          });
          await fetchGmailMessages();
        } catch (err: unknown) {
          setStatusMessage({
            type: 'error',
            text: err instanceof Error ? err.message : String(err),
          });
        } finally {
          setIsBusy(false);
        }
      },
    });
  };

  // ============================================================================
  // 3. GOOGLE SHEETS OPERATIONS
  // ============================================================================
  const buildPdfSection9Rows = (): string[][] => {
    const fin = calculateFinancialSummary(state);
    const activeDay = getActiveCampaignDay(
      state.settings.startDate,
      state.settings.currentDayOverride
    );

    const headerRow = [
      'Business (Name & Website)',
      'Contact (Owner / Decision-Maker)',
      'Problem Observed',
      'First Contact (Date & Method)',
      'Outcome',
      'Next Action (What & When)',
      'Proposal Value ($)',
      'Cash Collected (Cleared Only $)',
      'Delivery Status',
    ];

    const prospectRows = state.prospects.map((p) => {
      const prop = state.proposals.find((pr) => pr.prospectId === p.id);
      const proj = state.projects.find((pj) => pj.prospectId === p.id);
      const clearedForProspect = prop
        ? prop.milestones.filter((m) => m.isPaid).reduce((sum, m) => sum + m.amount, 0)
        : 0;
      return [
        `${p.businessName}${p.website ? ` (${p.website})` : ''}`,
        `${p.contactName} (${p.contactRole})${p.phone ? ` • ${p.phone}` : ''}`,
        p.problemObserved,
        `${p.lastContactDate || p.dateAdded} (${p.firstContactMethod || 'Outbound Call'})`,
        p.stage,
        `${p.nextAction} (${p.nextActionDate})`,
        String(prop ? prop.totalPrice : p.estimatedValue),
        String(clearedForProspect),
        proj ? proj.status : DeliveryStatus.NOT_STARTED,
      ];
    });

    const summaryRows = [
      [],
      ['--- CAMPAIGN FINANCIAL CHECKPOINT SUMMARY ---', `Day ${activeDay} of 30`],
      ['30-Day Stretch Revenue Target ($)', String(state.settings.revenueTarget)],
      ['Cleared Gross Revenue Collected ($)', String(fin.grossClearedRevenue)],
      ['Amount Remaining to $20k Target ($)', String(fin.revenueRemainingToTarget)],
      ['Recorded Cash Balance ($)', String(fin.currentRecordedCashBalance)],
      ['Protected Reserve ($)', String(fin.protectedReserve)],
      ['Available Discretionary Cash ($)', String(fin.availableDiscretionaryCash)],
      ['Unearned Deposit Obligations ($)', String(fin.unearnedDepositObligations)],
    ];

    return [headerRow, ...prospectRows, ...summaryRows];
  };

  const requestCreateTrackerSpreadsheet = () => {
    const rows = buildPdfSection9Rows();
    setPendingConfirmation({
      title: 'Create New Google Sheet with Section 9 Daily Tracker?',
      description:
        'This will create a new Google Spreadsheet in your Google Drive and populate it with your PDF Section 9 Daily Tracker rows and Campaign Financial Summary.',
      details: [
        `Spreadsheet Title: It's LLC — $5K to $20K Daily Tracker (${new Date()
          .toISOString()
          .slice(0, 10)})`,
        `Prospect Rows Included: ${state.prospects.length} businesses`,
        'Columns: Business, Contact, Problem Observed, First Contact, Outcome, Next Action, Proposal Value, Cash Collected, Delivery Status',
      ],
      confirmLabel: 'Confirm & Create Google Sheet',
      onConfirm: async () => {
        const token = await ensureValidToken();
        if (!token) return;
        setIsBusy(true);
        try {
          const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              properties: {
                title: `It's LLC — $5K to $20K Daily Tracker (${new Date()
                  .toISOString()
                  .slice(0, 10)})`,
              },
              sheets: [
                {
                  properties: {
                    title: 'Daily Tracker',
                  },
                },
              ],
            }),
          });
          const created = await createRes.json();
          if (!createRes.ok) {
            throw new Error(
              created?.error?.message || 'Failed to create Google Spreadsheet.'
            );
          }

          const spreadsheetId: string = created.spreadsheetId;
          const tabs: string[] = (created.sheets || []).map(
            (s: { properties?: { title?: string } }) => s.properties?.title || 'Daily Tracker'
          );
          const firstTab = tabs[0] || 'Daily Tracker';

          const safeId = encodeURIComponent(spreadsheetId);
          const safeRange = encodeURIComponent(`${firstTab}!A1`);
          const updateRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${safeRange}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                values: rows,
              }),
            }
          );
          if (!updateRes.ok) {
            const errData = await updateRes.json();
            throw new Error(
              errData?.error?.message || 'Failed to populate tracker rows in Google Sheet.'
            );
          }

          setSheetMetadata({
            spreadsheetId,
            title: created.properties?.title || 'Daily Tracker',
            spreadsheetUrl:
              created.spreadsheetUrl ||
              `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
            sheetTabs: tabs,
          });
          setSheetIdInput(spreadsheetId);
          setSelectedSheetTab(firstTab);
          setSheetRows(rows);
          setStatusMessage({
            type: 'success',
            text: `Created and populated Google Sheet "${created.properties?.title}".`,
          });
        } catch (err: unknown) {
          setStatusMessage({
            type: 'error',
            text: err instanceof Error ? err.message : String(err),
          });
        } finally {
          setIsBusy(false);
        }
      },
    });
  };

  const fetchSpreadsheetMetadataAndValues = async (
    targetId?: string,
    explicitTab?: string
  ) => {
    const rawId = (targetId ?? sheetIdInput).trim();
    if (!rawId) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a valid Google Spreadsheet ID.',
      });
      return;
    }
    const token = await ensureValidToken();
    if (!token) return;
    setIsBusy(true);
    setStatusMessage(null);
    try {
      const safeId = encodeURIComponent(rawId);
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${safeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const metaData = await metaRes.json();
      if (!metaRes.ok) {
        throw new Error(metaData?.error?.message || 'Failed to fetch spreadsheet metadata.');
      }

      const tabs: string[] = (metaData.sheets || []).map(
        (s: { properties?: { title?: string } }) => s.properties?.title || ''
      ).filter(Boolean);

      const chosenTab = explicitTab || (tabs.includes(selectedSheetTab) ? selectedSheetTab : tabs[0]);
      setSheetMetadata({
        spreadsheetId: metaData.spreadsheetId,
        title: metaData.properties?.title || rawId,
        spreadsheetUrl:
          metaData.spreadsheetUrl ||
          `https://docs.google.com/spreadsheets/d/${metaData.spreadsheetId}`,
        sheetTabs: tabs,
      });
      setSelectedSheetTab(chosenTab || '');

      if (chosenTab) {
        const safeRange = encodeURIComponent(`${chosenTab}!A1:I50`);
        const valRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${safeRange}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const valData = await valRes.json();
        if (valRes.ok) {
          setSheetRows(valData.values || []);
        }
      }
      setStatusMessage({
        type: 'success',
        text: `Loaded Google Sheet "${metaData.properties?.title}" (${tabs.length} tab(s) detected).`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsBusy(false);
    }
  };

  const requestOverwriteExistingSheet = () => {
    if (!sheetMetadata || !selectedSheetTab) return;
    const rows = buildPdfSection9Rows();
    setPendingConfirmation({
      title: `Update "${selectedSheetTab}" in "${sheetMetadata.title}"?`,
      description:
        'This will overwrite the tracker range in the selected Google Sheet tab with your current CRM prospects and campaign financial summary.',
      details: [
        `Spreadsheet: ${sheetMetadata.title}`,
        `Target Sheet Tab: ${selectedSheetTab}`,
        `Total Rows Written: ${rows.length}`,
      ],
      confirmLabel: 'Confirm & Update Sheet Tab',
      onConfirm: async () => {
        const token = await ensureValidToken();
        if (!token) return;
        setIsBusy(true);
        try {
          const safeId = encodeURIComponent(sheetMetadata.spreadsheetId);
          const safeRange = encodeURIComponent(`${selectedSheetTab}!A1`);
          const res = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${safeRange}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ values: rows }),
            }
          );
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error?.message || 'Failed to update Google Sheet.');
          }
          setSheetRows(rows);
          setStatusMessage({
            type: 'success',
            text: `Updated "${selectedSheetTab}" in "${sheetMetadata.title}".`,
          });
        } catch (err: unknown) {
          setStatusMessage({
            type: 'error',
            text: err instanceof Error ? err.message : String(err),
          });
        } finally {
          setIsBusy(false);
        }
      },
    });
  };

  const handleImportRowsFromSheetToCrm = () => {
    if (sheetRows.length <= 1) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const imported: Prospect[] = [];
    for (let i = 1; i < sheetRows.length; i++) {
      const row = sheetRows[i];
      if (!row || !row[0] || row[0].startsWith('---')) break;
      const businessName = row[0].split(' (')[0].trim();
      if (!businessName) continue;
      imported.push({
        id: `pros-sheet-${Date.now()}-${i}`,
        businessName,
        contactName: (row[1] || 'Owner').split(' (')[0].trim(),
        contactRole: 'Owner',
        phone: '',
        email: '',
        website: '',
        category: state.settings.selectedNiche || 'Local Service Business',
        location: '',
        problemObserved: row[2] || 'Observed website conversion gap (imported from Google Sheets)',
        leadSource: 'Google Sheets Sync',
        dateAdded: todayStr,
        stage: PipelineStage.IDENTIFIED,
        estimatedValue: Number(row[6]) || 1500,
        offerInterest: 'OFFER_A',
        nextAction: row[5] || 'Initial targeted outbound call',
        nextActionDate: todayStr,
        notes: 'Imported from connected Google Sheet tracker.',
        consentNotes: 'Verified business listing.',
      });
    }
    if (imported.length > 0) {
      onImportProspects(imported);
      setStatusMessage({
        type: 'success',
        text: `Imported ${imported.length} prospect record(s) from Google Sheets into your CRM.`,
      });
    }
  };

  // ============================================================================
  // 4. GOOGLE FORMS OPERATIONS
  // ============================================================================
  const requestCreateGoogleForm = () => {
    const isOfferA = newFormTemplate === 'OFFER_A';
    const formTitle = isOfferA
      ? "It's LLC — $1,500 Small-Business Website Scope & Intake Form"
      : "It's LLC — The Youniverse Alpha ($200 Founding Package) Early Adopter Claim";

    setPendingConfirmation({
      title: 'Create New Google Form in Your Workspace Account?',
      description:
        'This will create a new Google Form and configure its intake questions for your 30-day campaign.',
      details: [
        `Form Title: ${formTitle}`,
        isOfferA
          ? 'Questions: Business Name & Website, Owner Name & Contact, Specific Website Problem Observed, 5-Page Scope Priorities'
          : 'Questions: Full Name & Email, Current Use Case for The Youniverse Alpha, Free Claim vs. $200 Paid Founding Package Interest',
      ],
      confirmLabel: 'Confirm & Create Google Form',
      onConfirm: async () => {
        const token = await ensureValidToken();
        if (!token) return;
        setIsBusy(true);
        try {
          const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              info: {
                title: formTitle,
                documentTitle: formTitle,
              },
            }),
          });
          const createdForm = await createRes.json();
          if (!createRes.ok) {
            throw new Error(
              createdForm?.error?.message || 'Failed to create Google Form.'
            );
          }

          const safeFormId = encodeURIComponent(String(createdForm.formId).trim());
          const requests = isOfferA
            ? [
                {
                  updateFormInfo: {
                    info: {
                      description:
                        'Fixed-scope $1,500 small-business website intake (5-page mobile-responsive design, quote-request form, basic on-page SEO, analytics, and 2 revision rounds).',
                    },
                    updateMask: 'description',
                  },
                },
                {
                  createItem: {
                    item: {
                      title: 'Business Name and Current Website URL',
                      questionItem: {
                        question: { required: true, textQuestion: { paragraph: false } },
                      },
                    },
                    location: { index: 0 },
                  },
                },
                {
                  createItem: {
                    item: {
                      title: 'Owner / Decision-Maker Name, Phone & Email',
                      questionItem: {
                        question: { required: true, textQuestion: { paragraph: false } },
                      },
                    },
                    location: { index: 1 },
                  },
                },
                {
                  createItem: {
                    item: {
                      title:
                        'What is the #1 customer contact or quote-request issue on your current website?',
                      questionItem: {
                        question: { required: true, textQuestion: { paragraph: true } },
                      },
                    },
                    location: { index: 2 },
                  },
                },
              ]
            : [
                {
                  updateFormInfo: {
                    info: {
                      description:
                        'Claim a free Youniverse alpha preview or request a $200 Founding Package with defined, supportable deliverables.',
                    },
                    updateMask: 'description',
                  },
                },
                {
                  createItem: {
                    item: {
                      title: 'Your Name / Business Name',
                      questionItem: {
                        question: { required: true, textQuestion: { paragraph: false } },
                      },
                    },
                    location: { index: 0 },
                  },
                },
                {
                  createItem: {
                    item: {
                      title: 'Best Email & Phone Number',
                      questionItem: {
                        question: { required: true, textQuestion: { paragraph: false } },
                      },
                    },
                    location: { index: 1 },
                  },
                },
                {
                  createItem: {
                    item: {
                      title:
                        'What would you like to build or test first inside The Youniverse alpha?',
                      questionItem: {
                        question: { required: true, textQuestion: { paragraph: true } },
                      },
                    },
                    location: { index: 2 },
                  },
                },
              ];

          await fetch(
            `https://forms.googleapis.com/v1/forms/${safeFormId}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ requests }),
            }
          );

          setFormIdInput(createdForm.formId);
          await fetchFormAndResponses(createdForm.formId);
          setStatusMessage({
            type: 'success',
            text: `Created Google Form "${formTitle}".`,
          });
        } catch (err: unknown) {
          setStatusMessage({
            type: 'error',
            text: err instanceof Error ? err.message : String(err),
          });
        } finally {
          setIsBusy(false);
        }
      },
    });
  };

  const fetchFormAndResponses = async (targetFormId?: string) => {
    const rawFormId = (targetFormId ?? formIdInput).trim();
    if (!rawFormId) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a Google Form ID.',
      });
      return;
    }
    const token = await ensureValidToken();
    if (!token) return;
    setIsBusy(true);
    setStatusMessage(null);
    try {
      const safeFormId = encodeURIComponent(rawFormId);
      const formRes = await fetch(
        `https://forms.googleapis.com/v1/forms/${safeFormId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const formData = await formRes.json();
      if (!formRes.ok) {
        throw new Error(formData?.error?.message || 'Failed to load Google Form.');
      }

      const questions: { itemId: string; title: string; questionId?: string }[] = (
        formData.items || []
      ).map(
        (item: {
          itemId?: string;
          title?: string;
          questionItem?: { question?: { questionId?: string } };
        }) => ({
          itemId: item.itemId || '',
          title: item.title || 'Untitled Question',
          questionId: item.questionItem?.question?.questionId,
        })
      );

      setActiveForm({
        formId: formData.formId,
        title: formData.info?.title || rawFormId,
        description: formData.info?.description,
        responderUri: formData.responderUri,
        questions,
      });

      const respRes = await fetch(
        `https://forms.googleapis.com/v1/forms/${safeFormId}/responses`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const respData = await respRes.json();
      if (respRes.ok) {
        const parsedResponses: FormResponseItem[] = (respData.responses || []).map(
          (r: {
            responseId: string;
            createTime: string;
            lastSubmittedTime: string;
            answers?: Record<
              string,
              { textAnswers?: { answers?: { value?: string }[] } }
            >;
          }) => {
            const answerMap: Record<string, string> = {};
            if (r.answers) {
              Object.entries(r.answers).forEach(([qId, ansObj]) => {
                const qTitle =
                  questions.find((q) => q.questionId === qId)?.title || qId;
                const val =
                  ansObj?.textAnswers?.answers
                    ?.map((a) => a.value || '')
                    .join(', ') || '';
                answerMap[qTitle] = val;
              });
            }
            return {
              responseId: r.responseId,
              createTime: r.createTime,
              lastSubmittedTime: r.lastSubmittedTime,
              answers: answerMap,
            };
          }
        );
        setFormResponses(parsedResponses);
      }
      setStatusMessage({
        type: 'success',
        text: `Loaded Google Form "${formData.info?.title || rawFormId}" and its responses.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleConvertResponseToProspect = (resp: FormResponseItem) => {
    const values = Object.values(resp.answers);
    const todayStr = new Date().toISOString().slice(0, 10);
    const newProspect: Prospect = {
      id: `pros-form-${resp.responseId}`,
      businessName: values[0] || `Form Respondent ${resp.responseId.slice(0, 5)}`,
      contactName: values[1] || 'Form Inquiry',
      contactRole: 'Owner / Respondent',
      phone: '',
      email: '',
      website: '',
      category: state.settings.selectedNiche || 'Inbound Form Lead',
      location: '',
      problemObserved:
        values[2] || 'Submitted Google Form intake response',
      leadSource: `Google Form (${activeForm?.title || 'Intake'})`,
      dateAdded: todayStr,
      stage: PipelineStage.QUALIFIED,
      estimatedValue: 1500,
      offerInterest: 'OFFER_A',
      nextAction: 'Review Google Form intake & book 10-minute demo',
      nextActionDate: todayStr,
      notes: `Form Response ID: ${resp.responseId}`,
      consentNotes: 'Inbound Google Form submission.',
    };
    onImportProspects([newProspect]);
    setStatusMessage({
      type: 'success',
      text: `Added "${newProspect.businessName}" from Google Form response into CRM Prospects.`,
    });
  };

  return (
    <div className="space-y-6" data-testid="google-workspace-hub">
      {/* Header & Authentication Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-400">
            <ShieldCheck className="w-4 h-4" />
            <span>1P GOOGLE WORKSPACE COMMAND INTEGRATION</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Google Calendar, Gmail, Google Sheets &amp; Google Forms Hub
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Sync your 8:00 AM–5:30 PM execution blocks and 10-minute demos to Google Calendar, send written $1,500 proposals via Gmail, sync the PDF Section 9 Daily Tracker to Google Sheets, and collect client intake via Google Forms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {needsAuth ? (
            <GoogleSignInButton
              onClick={handleLogin}
              disabled={isLoggingIn}
              label={isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
            />
          ) : (
            <div className="flex items-center gap-3 bg-slate-950/90 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
              <div className="text-xs">
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Workspace Connected</span>
                </div>
                <div className="text-slate-400 font-mono text-[11px]">
                  {user?.email || user?.displayName || 'Authenticated User'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
              : statusMessage.type === 'error'
                ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                : 'bg-sky-950/50 border-sky-500/40 text-sky-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Service Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            id: 'calendar' as const,
            label: 'Google Calendar',
            sub: '8–10h Schedule & 10m Demos',
            icon: Calendar,
          },
          {
            id: 'gmail' as const,
            label: 'Gmail',
            sub: 'Proposals & Buyer Threads',
            icon: Mail,
          },
          {
            id: 'sheets' as const,
            label: 'Google Sheets',
            sub: 'Section 9 Tracker & Ledger',
            icon: FileSpreadsheet,
          },
          {
            id: 'forms' as const,
            label: 'Google Forms',
            sub: 'Offer A & Alpha Intake',
            icon: FileText,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeServiceTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveServiceTab(tab.id)}
              data-testid={`workspace-tab-${tab.id}`}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                active
                  ? 'bg-sky-500/15 border-sky-500/50 text-white'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Icon className={`w-4 h-4 ${active ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">{tab.sub}</div>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: GOOGLE CALENDAR
      ===================================================================== */}
      {activeServiceTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5">
            {/* Sync 8:00 AM - 5:30 PM Daily Execution Schedule */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Sync PDF Section 4 Daily Schedule (8:00 AM – 5:30 PM)</span>
              </h2>
              <p className="text-xs text-slate-300">
                Push all 6 non-negotiable daily execution blocks (Prospect Research, Outbound Sales Block, Follow-ups &amp; Proposals, Demonstrations, Paid Delivery, and 5:00 PM Financial Review) to your primary Google Calendar.
              </p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Target Date for Schedule Blocks
                </label>
                <input
                  type="date"
                  value={selectedScheduleDate}
                  onChange={(e) => setSelectedScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={requestSyncDailyScheduleBlocks}
                className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors"
              >
                Add 6 Execution Schedule Blocks to Google Calendar
              </button>
            </div>

            {/* Book 10-Minute Demonstration */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Book 10-Minute Prospect Demonstration (PDF Section 8)</span>
              </h2>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select CRM Prospect</label>
                <select
                  value={demoProspectId}
                  onChange={(e) => setDemoProspectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {state.prospects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.businessName} ({p.contactName})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Demo Date</label>
                  <input
                    type="date"
                    value={demoDate}
                    onChange={(e) => setDemoDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={demoTime}
                    onChange={(e) => setDemoTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Optional Attendee Email (Invites Prospect)
                </label>
                <input
                  type="email"
                  placeholder="owner@business.com"
                  value={demoAttendeeEmail}
                  onChange={(e) => setDemoAttendeeEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={requestScheduleProspectDemo}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
              >
                Schedule 10-Minute Demo on Google Calendar
              </button>
            </div>
          </div>

          {/* Upcoming Calendar Events List */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Upcoming Events on Primary Google Calendar
                </h2>
                <p className="text-xs text-slate-400">
                  Live events fetched directly from calendar.googleapis.com
                </p>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={fetchCalendarEvents}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                <span>Load Calendar Events</span>
              </button>
            </div>

            {calendarEvents.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                Click &ldquo;Load Calendar Events&rdquo; after signing in with Google to view your upcoming schedule and booked 10-minute demonstrations.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {calendarEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {evt.summary || '(Untitled Event)'}
                      </div>
                      <div className="text-[11px] font-mono text-sky-400">
                        {evt.start?.dateTime
                          ? new Date(evt.start.dateTime).toLocaleString()
                          : evt.start?.date || ''}
                      </div>
                      {evt.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {evt.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {evt.htmlLink && (
                        <a
                          href={evt.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Open in Google Calendar"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => requestDeleteCalendarEvent(evt)}
                        className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900/70 text-rose-300"
                        title="Delete Event (Requires Confirmation)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: GMAIL
      ===================================================================== */}
      {activeServiceTab === 'gmail' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Compose & Send Proposal / Follow-Up Email */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-400" />
              <span>Send Written 1-Page Scope &amp; Proposal via Gmail</span>
            </h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Auto-Fill From CRM Prospect
              </label>
              <select
                onChange={(e) => handlePopulateEmailFromProspect(e.target.value)}
                defaultValue=""
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="" disabled>
                  Select a prospect to populate scope &amp; 50% deposit quote...
                </option>
                {state.prospects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.businessName} — {p.contactName} (${p.estimatedValue.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">To (Recipient Email)</label>
              <input
                type="email"
                placeholder="owner@localbusiness.com"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Message Body (Includes $1,500 Offer A Scope &amp; 50% Deposit Rule)
              </label>
              <textarea
                rows={8}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <button
              type="button"
              disabled={isBusy}
              onClick={requestSendGmailProposal}
              className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Review &amp; Send Email via Gmail</span>
            </button>
          </div>

          {/* Recent Gmail Threads */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">Recent Gmail Messages</h2>
                <p className="text-xs text-slate-400">
                  Check prospect replies and sent proposals from gmail.googleapis.com
                </p>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={fetchGmailMessages}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                <span>Load Recent Emails</span>
              </button>
            </div>

            {gmailMessages.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                Click &ldquo;Load Recent Emails&rdquo; to inspect recent buyer conversations and sent proposals.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[430px] overflow-y-auto pr-1">
                {gmailMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1"
                  >
                    <div className="text-xs font-semibold text-white">{msg.subject}</div>
                    <div className="text-[11px] font-mono text-slate-400">
                      From: {msg.from} • {msg.date}
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">{msg.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: GOOGLE SHEETS
      ===================================================================== */}
      {activeServiceTab === 'sheets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5">
            {/* Create New Tracker Sheet */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export PDF Section 9 Daily Tracker to New Google Sheet</span>
              </h2>
              <p className="text-xs text-slate-300">
                PDF Section 9 (&ldquo;The tracker you use every day&rdquo;) specifies 9 exact columns: Business, Contact, Problem observed, First contact, Outcome, Next action, Proposal value, Cash collected (cleared payments only), and Delivery status.
              </p>
              <button
                type="button"
                disabled={isBusy}
                onClick={requestCreateTrackerSpreadsheet}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
              >
                Create &amp; Populate New Google Sheet Tracker
              </button>
            </div>

            {/* Connect Existing Google Sheet */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white">
                Connect Existing Google Spreadsheet
              </h2>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Spreadsheet ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Spreadsheet ID..."
                    value={sheetIdInput}
                    onChange={(e) => setSheetIdInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => fetchSpreadsheetMetadataAndValues()}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white shrink-0"
                  >
                    Load Sheet
                  </button>
                </div>
              </div>

              {sheetMetadata && (
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {sheetMetadata.title}
                    </span>
                    <a
                      href={sheetMetadata.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>Open in Sheets</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Select Detected Sheet Tab (Fetched from Metadata)
                    </label>
                    <select
                      value={selectedSheetTab}
                      onChange={(e) => {
                        setSelectedSheetTab(e.target.value);
                        fetchSpreadsheetMetadataAndValues(
                          sheetMetadata.spreadsheetId,
                          e.target.value
                        );
                      }}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      {sheetMetadata.sheetTabs.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={requestOverwriteExistingSheet}
                      className="flex-1 py-2 px-3 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30 text-xs font-semibold"
                    >
                      Sync CRM Tracker to This Tab
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || sheetRows.length <= 1}
                      onClick={handleImportRowsFromSheetToCrm}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Import Rows to CRM</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sheet Values Preview */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white">
              Google Sheet Data Preview ({sheetRows.length} rows)
            </h2>
            {sheetRows.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                Create a new Section 9 Daily Tracker sheet or load an existing Spreadsheet ID to inspect live cells.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[440px] border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                      {(sheetRows[0] || []).map((col, idx) => (
                        <th key={idx} className="p-2.5 font-semibold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {sheetRows.slice(1, 25).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40">
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="p-2.5 text-slate-300 whitespace-nowrap max-w-[220px] truncate"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: GOOGLE FORMS
      ===================================================================== */}
      {activeServiceTab === 'forms' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5">
            {/* Create Offer A or Offer C Form */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Generate Campaign Intake Form in Google Forms</span>
              </h2>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Select Campaign Offer Form Template
                </label>
                <select
                  value={newFormTemplate}
                  onChange={(e) =>
                    setNewFormTemplate(e.target.value as 'OFFER_A' | 'OFFER_C')
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="OFFER_A">
                    Offer A ($1,500 Fixed-Scope Website) Client Scope &amp; Intake Form
                  </option>
                  <option value="OFFER_C">
                    Offer C (The Youniverse Alpha — $200 Founding Package) Early Adopter Claim Form
                  </option>
                </select>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={requestCreateGoogleForm}
                className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors"
              >
                Create Intake Form in Google Forms
              </button>
            </div>

            {/* Load Existing Google Form & Responses */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white">
                Inspect Existing Google Form &amp; Responses
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Google Form ID..."
                  value={formIdInput}
                  onChange={(e) => setFormIdInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => fetchFormAndResponses()}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white shrink-0"
                >
                  Load Form
                </button>
              </div>

              {activeForm && (
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">
                      {activeForm.title}
                    </span>
                    {activeForm.responderUri && (
                      <a
                        href={activeForm.responderUri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:underline flex items-center gap-1 shrink-0"
                      >
                        <span>Share Form Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {activeForm.description && (
                    <p className="text-[11px] text-slate-400">{activeForm.description}</p>
                  )}
                  <div className="text-[11px] text-slate-300 pt-1">
                    <strong>Questions ({activeForm.questions.length}):</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-400">
                      {activeForm.questions.map((q) => (
                        <li key={q.itemId}>{q.title}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Responses List */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Google Form Submissions ({formResponses.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Convert client intake or Youniverse alpha responses directly into CRM prospects
                </p>
              </div>
              {activeForm && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => fetchFormAndResponses(activeForm.formId)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                  <span>Refresh Responses</span>
                </button>
              )}
            </div>

            {formResponses.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                No form responses loaded yet. Create or load a Google Form above to view submissions and import leads into your pipeline.
              </div>
            ) : (
              <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
                {formResponses.map((resp) => (
                  <div
                    key={resp.responseId}
                    className="p-4 rounded-lg bg-slate-950/90 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-sky-400">
                        Submitted: {new Date(resp.lastSubmittedTime).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleConvertResponseToProspect(resp)}
                        className="px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Add to CRM Prospects</span>
                      </button>
                    </div>
                    <div className="space-y-1 text-xs">
                      {Object.entries(resp.answers).map(([qTitle, val]) => (
                        <div key={qTitle}>
                          <span className="text-slate-400">{qTitle}: </span>
                          <span className="text-white font-medium">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MANDATORY USER CONFIRMATION MODAL FOR ALL MUTATING WORKSPACE CALLS
      ===================================================================== */}
      {pendingConfirmation && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          data-testid="workspace-confirmation-modal"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  pendingConfirmation.isDestructive
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {pendingConfirmation.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {pendingConfirmation.description}
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5 max-h-48 overflow-y-auto">
              {pendingConfirmation.details.map((line, idx) => (
                <div key={idx} className="text-xs text-slate-300 font-mono">
                  • {line}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingConfirmation(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = pendingConfirmation.onConfirm;
                  setPendingConfirmation(null);
                  await action();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                  pendingConfirmation.isDestructive
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                }`}
              >
                {pendingConfirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
