import { PipelineStage, Prospect } from '../types';

const CSV_HEADERS = [
  'businessName',
  'contactName',
  'contactRole',
  'phone',
  'email',
  'website',
  'category',
  'location',
  'problemObserved',
  'leadSource',
  'stage',
  'estimatedValue',
  'nextAction',
  'nextActionDate',
  'notes',
];

function escapeCsvCell(value: string | number | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportProspectsToCsv(prospects: Prospect[]): string {
  const headerRow = CSV_HEADERS.join(',');
  const rows = prospects.map((p) =>
    [
      p.businessName,
      p.contactName,
      p.contactRole,
      p.phone,
      p.email,
      p.website,
      p.category,
      p.location,
      p.problemObserved,
      p.leadSource,
      p.stage,
      p.estimatedValue,
      p.nextAction,
      p.nextActionDate,
      p.notes,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  return [headerRow, ...rows].join('\n');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function importProspectsFromCsv(
  csvText: string,
  todayStr: string
): { prospects: Prospect[]; errors: string[] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      prospects: [],
      errors: ['CSV file must contain a header row and at least one prospect row.'],
    };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const busIdx = headers.findIndex((h) => h.includes('business') || h === 'name');
  if (busIdx === -1) {
    return {
      prospects: [],
      errors: ['Missing required column "businessName" or "Business" in CSV header.'],
    };
  }

  const imported: Prospect[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const businessName = cols[busIdx] || '';
    if (!businessName) {
      errors.push(`Row ${i + 1}: Skipped because businessName is empty.`);
      continue;
    }

    const getVal = (keyPart: string, fallback = '') => {
      const idx = headers.findIndex((h) => h.includes(keyPart));
      return idx >= 0 && cols[idx] !== undefined ? cols[idx] : fallback;
    };

    const rawStage = getVal('stage', PipelineStage.IDENTIFIED);
    const validStages = Object.values(PipelineStage) as string[];
    const stage = validStages.includes(rawStage)
      ? (rawStage as PipelineStage)
      : PipelineStage.IDENTIFIED;

    const rawVal = Number(getVal('value', '1500').replace(/[^0-9.]/g, ''));

    imported.push({
      id: `prospect-csv-${Date.now()}-${i}`,
      businessName,
      contactName: getVal('contact', 'Owner / Decision-Maker'),
      contactRole: getVal('role', 'Owner'),
      phone: getVal('phone', ''),
      email: getVal('email', ''),
      website: getVal('website', ''),
      category: getVal('category', 'Small Business'),
      location: getVal('location', ''),
      problemObserved: getVal('problem', '[VERIFY: Note one specific website or lead-handling issue]'),
      leadSource: getVal('source', 'CSV Import'),
      dateAdded: todayStr,
      stage,
      estimatedValue: isNaN(rawVal) || rawVal <= 0 ? 1500 : rawVal,
      offerInterest: 'OFFER_A',
      nextAction: getVal('nextaction', 'Research website & make first targeted call'),
      nextActionDate: getVal('nextactiondate', todayStr),
      notes: getVal('notes', ''),
      consentNotes: 'Imported via CSV',
    });
  }

  return { prospects: imported, errors };
}

export function buildCustomizedScriptDraft(
  templateContent: string,
  operatorName: string,
  demoSiteUrl: string,
  prospect?: Prospect
): { draft: string; unverifiedFlags: string[] } {
  const unverifiedFlags: string[] = [];
  let draft = templateContent;

  const repName = operatorName.trim() || '[VERIFY: Your Name]';
  if (!operatorName.trim()) {
    unverifiedFlags.push('Operator name is not set in Settings.');
  }

  draft = draft.replace(/\[your name\]/gi, repName);
  draft = draft.replace(/\[demo site URL\]/gi, demoSiteUrl || '[VERIFY: Demo Site URL]');

  if (prospect) {
    draft = draft.replace(/\[business name\]/gi, prospect.businessName || '[VERIFY: Business Name]');
    draft = draft.replace(/\[contact name\]/gi, prospect.contactName || '[VERIFY: Owner Name]');

    const obs = prospect.problemObserved?.trim();
    if (!obs || obs.includes('[VERIFY')) {
      unverifiedFlags.push(
        `No verified website/lead-handling observation recorded for ${prospect.businessName}. Never invent observations—inspect their site first.`
      );
      draft = draft.replace(
        /\[specific, truthful observation about their website\]/gi,
        '[VERIFY BEFORE CALLING: Inspect prospect website and enter one truthful observation]'
      );
      draft = draft.replace(
        /\[specific, truthful observation\]/gi,
        '[VERIFY BEFORE CALLING: Inspect prospect website and enter one truthful observation]'
      );
    } else {
      draft = draft.replace(/\[specific, truthful observation about their website\]/gi, obs);
      draft = draft.replace(/\[specific, truthful observation\]/gi, obs);
    }
  } else {
    unverifiedFlags.push('Select a prospect from your CRM to populate business name and verified website observation.');
  }

  draft = draft.replace(/\[time option one\]/gi, 'today at 1:30 PM');
  draft = draft.replace(/\[time option two\]/gi, 'tomorrow at 1:15 PM');

  return { draft, unverifiedFlags };
}
