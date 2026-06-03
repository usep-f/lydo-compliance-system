import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// ---------------------------------------------------------------------------
// Document configuration matching submissionTypes
// ---------------------------------------------------------------------------
const DOCUMENT_TYPES = [
  { id: 'full_disclosure', label: 'Full Disclosure Policy Board', frequency: 'quarterly' as const },
  { id: 'regular_session_minutes', label: 'Regular Session Minutes of the Meeting', frequency: 'monthly' as const },
  { id: 'kk_minutes', label: 'Katipunan ng Kabataan Minutes of the Meeting', frequency: 'semestral' as const }
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface PeriodBoundaries {
  start: Date;
  end: Date;
}

interface PeriodTrigger {
  todayStr: string;
  period: string;
  docType: string;
  docLabel: string;
  boundaries: PeriodBoundaries;
}

// ---------------------------------------------------------------------------
// Date utility helpers
// ---------------------------------------------------------------------------

function getAllPeriods(frequency: 'monthly' | 'quarterly' | 'semestral', year: number): string[] {
  if (frequency === 'monthly') {
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  }
  if (frequency === 'quarterly') {
    return [`${year}-Q1`, `${year}-Q2`, `${year}-Q3`, `${year}-Q4`];
  }
  return [`${year}-S1`, `${year}-S2`];
}

function getPeriodBoundaries(period: string): PeriodBoundaries {
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const y = parseInt(monthMatch[1]);
    const m = parseInt(monthMatch[2]);
    return {
      start: new Date(Date.UTC(y, m - 1, 1)),
      end: new Date(Date.UTC(y, m, 0))
    };
  }
  const qMatch = period.match(/^(\d{4})-Q(\d)$/);
  if (qMatch) {
    const y = parseInt(qMatch[1]);
    const q = parseInt(qMatch[2]);
    return {
      start: new Date(Date.UTC(y, (q - 1) * 3, 1)),
      end: new Date(Date.UTC(y, q * 3, 0))
    };
  }
  const y = parseInt(period.split('-')[0]) || new Date().getFullYear();
  const s = parseInt(period.slice(-1)) || 1;
  return {
    start: new Date(Date.UTC(y, s === 1 ? 0 : 6, 1)),
    end: new Date(Date.UTC(y, s === 1 ? 6 : 12, 0))
  };
}

function toISODateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayManilaString(): string {
  const now = new Date();
  const manilaNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return toISODateString(manilaNow);
}

function formatPeriodLabel(period: string): string {
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    return `${MONTH_NAMES[parseInt(monthMatch[2]) - 1]} ${monthMatch[1]}`;
  }
  const qMatch = period.match(/^(\d{4})-Q(\d)$/);
  if (qMatch) {
    return `Q${qMatch[2]} ${qMatch[1]}`;
  }
  const sMatch = period.match(/^(\d{4})-S(\d)$/);
  if (sMatch) {
    return `${sMatch[2] === '1' ? '1st Semester' : '2nd Semester'} ${sMatch[1]}`;
  }
  return period;
}

function formatMonthDayYear(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// ---------------------------------------------------------------------------
// Trigger checks and publishing
// ---------------------------------------------------------------------------

async function publishBulletin(db: admin.firestore.Firestore, data: {
  eventKey: string;
  title: string;
  desc: string;
  tag: string;
  tagColor: string;
}) {
  const docRef = db.collection('cms_bulletins').doc(data.eventKey);
  const snap = await docRef.get();
  if (snap.exists) return;

  const now = admin.firestore.Timestamp.now();
  await docRef.set({
    ...data,
    date: now,
    createdAt: now
  });
  console.log(`bulletinScheduler: Published bulletin with eventKey ${data.eventKey}`);
}

async function checkPeriodTrigger(db: admin.firestore.Firestore, trigger: PeriodTrigger) {
  const { todayStr, period, docType, docLabel, boundaries } = trigger;
  const periodLabel = formatPeriodLabel(period);
  const endDateLabel = formatMonthDayYear(boundaries.end);

  // 1. Opening Warning: start + 1 day
  const openDate = new Date(boundaries.start.getTime() + 1 * 24 * 60 * 60 * 1000);
  if (toISODateString(openDate) === todayStr) {
    await publishBulletin(db, {
      eventKey: `auto_${docType}_${period}_open`,
      title: `${docLabel} Submissions Open`,
      desc: `Submissions for the ${periodLabel} ${docLabel} are now open. Please submit your PDF reports through the portal.`,
      tag: 'System Update',
      tagColor: 'bg-primary-subtle text-primary border-primary-subtle'
    });
    return;
  }

  // 2. Reminder Warning: end - 7 days
  const reminderDate = new Date(boundaries.end.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (toISODateString(reminderDate) === todayStr) {
    await publishBulletin(db, {
      eventKey: `auto_${docType}_${period}_reminder`,
      title: `Compliance Reminder: ${docLabel} (${periodLabel})`,
      desc: `This is a reminder that the submission period for ${periodLabel} ${docLabel} closes in 7 days on ${endDateLabel}. Please ensure files are uploaded timely.`,
      tag: 'Guidelines',
      tagColor: 'bg-warning-subtle text-warning border-warning-subtle'
    });
    return;
  }

  // 3. Final Warning: end - 3 days
  const finalWarningDate = new Date(boundaries.end.getTime() - 3 * 24 * 60 * 60 * 1000);
  if (toISODateString(finalWarningDate) === todayStr) {
    await publishBulletin(db, {
      eventKey: `auto_${docType}_${period}_final`,
      title: `URGENT: ${docLabel} Deadline in 3 Days`,
      desc: `Critical Warning: Only 3 days remaining to submit your ${periodLabel} ${docLabel}. The deadline is ${endDateLabel}. Late submissions will dynamically affect compliance ratings.`,
      tag: 'Deadlines',
      tagColor: 'bg-danger-subtle text-danger border-danger-subtle'
    });
    return;
  }
}

async function checkDocTypeYear(db: admin.firestore.Firestore, todayStr: string, docType: typeof DOCUMENT_TYPES[number], year: number) {
  const periods = getAllPeriods(docType.frequency, year);
  for (const period of periods) {
    const boundaries = getPeriodBoundaries(period);
    await checkPeriodTrigger(db, {
      todayStr,
      period,
      docType: docType.id,
      docLabel: docType.label,
      boundaries
    });
  }
}

// ---------------------------------------------------------------------------
// Scheduled trigger export
// ---------------------------------------------------------------------------

export const runBulletinScheduler = async (db: admin.firestore.Firestore, todayStr: string) => {
  const currentYear = new Date(todayStr).getFullYear() || new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  for (const docType of DOCUMENT_TYPES) {
    for (const year of years) {
      await checkDocTypeYear(db, todayStr, docType, year);
    }
  }
};

export const publishDeadlineBulletins = onSchedule(
  {
    schedule: '0 2 * * *', // Daily at 2 AM PHT (UTC+8 is 18:00 UTC, but standard scheduler uses timezone block)
    timeZone: 'Asia/Manila',
    region: 'asia-southeast1',
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async () => {
    const db = admin.firestore();
    const todayStr = getTodayManilaString();
    console.log(`bulletinScheduler: starting check for Manila date ${todayStr}`);
    try {
      await runBulletinScheduler(db, todayStr);
      console.log('bulletinScheduler: run complete');
    } catch (err) {
      console.error('bulletinScheduler: run failed:', err);
    }
  }
);
