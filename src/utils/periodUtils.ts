// ---------------------------------------------------------------------------
// Period Utilities — Calculate current, elapsed, and future periods
// ---------------------------------------------------------------------------

import type { Frequency } from '../constants/submissionTypes';

// ---------------------------------------------------------------------------
// Period Generation
// ---------------------------------------------------------------------------

/** Returns all period strings for a given frequency in a given year. */
export function getAllPeriods(frequency: Frequency, year: number): string[] {
  switch (frequency) {
    case 'monthly':
      return Array.from({ length: 12 }, (_, i) => {
        const month = String(i + 1).padStart(2, '0');
        return `${year}-${month}`;
      });
    case 'quarterly':
      return [`${year}-Q1`, `${year}-Q2`, `${year}-Q3`, `${year}-Q4`];
    case 'semestral':
      return [`${year}-S1`, `${year}-S2`];
    case 'annual':
      return [`${year}`];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Period Boundary Dates
// ---------------------------------------------------------------------------

/** Returns the start date (inclusive) of a period. */
export function getPeriodStartDate(period: string): Date {
  // Monthly: "2026-04" → Apr 1
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    return new Date(parseInt(monthMatch[1]), parseInt(monthMatch[2]) - 1, 1);
  }

  // Quarterly: "2026-Q2" → Apr 1
  const qMatch = period.match(/^(\d{4})-Q(\d)$/);
  if (qMatch) {
    const quarter = parseInt(qMatch[2]);
    const startMonth = (quarter - 1) * 3; // 0-indexed: Q1=0, Q2=3, Q3=6, Q4=9
    return new Date(parseInt(qMatch[1]), startMonth, 1);
  }

  // Semestral: "2026-S2" → Jul 1
  const sMatch = period.match(/^(\d{4})-S(\d)$/);
  if (sMatch) {
    const semester = parseInt(sMatch[2]);
    const startMonth = semester === 1 ? 0 : 6;
    return new Date(parseInt(sMatch[1]), startMonth, 1);
  }

  // Annual: "2026" → Jan 1
  const yearMatch = period.match(/^(\d{4})$/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1]), 0, 1);
  }

  return new Date(); // Fallback
}

/** Returns the end date (inclusive, last day) of a period. */
export function getPeriodEndDate(period: string): Date {
  // Monthly: "2026-04" → Apr 30
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = parseInt(monthMatch[1]);
    const month = parseInt(monthMatch[2]); // 1-indexed
    // Day 0 of next month = last day of current month
    return new Date(year, month, 0);
  }

  // Quarterly: "2026-Q2" → Jun 30
  const qMatch = period.match(/^(\d{4})-Q(\d)$/);
  if (qMatch) {
    const year = parseInt(qMatch[1]);
    const quarter = parseInt(qMatch[2]);
    const endMonth = quarter * 3; // Q1=3, Q2=6, Q3=9, Q4=12
    return new Date(year, endMonth, 0);
  }

  // Semestral: "2026-S1" → Jun 30
  const sMatch = period.match(/^(\d{4})-S(\d)$/);
  if (sMatch) {
    const year = parseInt(sMatch[1]);
    const semester = parseInt(sMatch[2]);
    const endMonth = semester === 1 ? 6 : 12;
    return new Date(year, endMonth, 0);
  }

  // Annual: "2026" → Dec 31
  const yearMatch = period.match(/^(\d{4})$/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1]), 11, 31);
  }

  return new Date(); // Fallback
}

// ---------------------------------------------------------------------------
// Current Period & Due Date
// ---------------------------------------------------------------------------

/** Returns the current submittable period for a frequency as of the given date. */
export function getCurrentPeriod(frequency: Frequency, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  switch (frequency) {
    case 'monthly':
      return `${year}-${String(month + 1).padStart(2, '0')}`;
    case 'quarterly': {
      const quarter = Math.floor(month / 3) + 1;
      return `${year}-Q${quarter}`;
    }
    case 'semestral': {
      const semester = month < 6 ? 1 : 2;
      return `${year}-S${semester}`;
    }
    case 'annual':
      return `${year}`;
    default:
      return `${year}`;
  }
}

/** Returns the due date string for display: the last day of the period. */
export function getDueDateLabel(period: string): string {
  const endDate = getPeriodEndDate(period);
  return endDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Period Status Checks
// ---------------------------------------------------------------------------

/** Returns true if the period has fully elapsed (overdue if not submitted). */
export function isPeriodOverdue(period: string, date: Date = new Date()): boolean {
  const endDate = getPeriodEndDate(period);
  // Set end of day for fair comparison
  endDate.setHours(23, 59, 59, 999);
  return date > endDate;
}

/** Returns true if the period is currently in progress (submittable, not yet overdue). */
export function isPeriodCurrent(period: string, date: Date = new Date()): boolean {
  const startDate = getPeriodStartDate(period);
  const endDate = getPeriodEndDate(period);
  endDate.setHours(23, 59, 59, 999);
  return date >= startDate && date <= endDate;
}

/** Returns true if the period hasn't started yet. */
export function isPeriodFuture(period: string, date: Date = new Date()): boolean {
  const startDate = getPeriodStartDate(period);
  return date < startDate;
}

// ---------------------------------------------------------------------------
// Elapsed Periods (for compliance calculation)
// ---------------------------------------------------------------------------

/**
 * Returns all periods that have fully elapsed for a given frequency and year,
 * relative to the provided date. These are the periods where a submission
 * should have been made — they count toward compliance.
 */
export function getElapsedPeriods(
  frequency: Frequency,
  year: number,
  date: Date = new Date()
): string[] {
  const allPeriods = getAllPeriods(frequency, year);
  return allPeriods.filter((p) => isPeriodOverdue(p, date));
}

/**
 * Returns periods that are submittable (elapsed + current).
 * The user can submit for any of these.
 */
export function getSubmittablePeriods(
  frequency: Frequency,
  year: number,
  date: Date = new Date()
): string[] {
  const allPeriods = getAllPeriods(frequency, year);
  return allPeriods.filter((p) => !isPeriodFuture(p, date));
}

// ---------------------------------------------------------------------------
// Period Formatting
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Formats a period string for human display. */
export function formatPeriodLabel(period: string): string {
  // Monthly: "2026-04" → "April 2026"
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const monthIndex = parseInt(monthMatch[2]) - 1;
    return `${MONTH_NAMES[monthIndex]} ${monthMatch[1]}`;
  }

  // Quarterly: "2026-Q2" → "Q2 2026"
  const qMatch = period.match(/^(\d{4})-Q(\d)$/);
  if (qMatch) {
    return `Q${qMatch[2]} ${qMatch[1]}`;
  }

  // Semestral: "2026-S1" → "1st Semester 2026"
  const sMatch = period.match(/^(\d{4})-S(\d)$/);
  if (sMatch) {
    const label = sMatch[2] === '1' ? '1st Semester' : '2nd Semester';
    return `${label} ${sMatch[1]}`;
  }

  // Annual: "2026" → "2026"
  return period;
}

/** Returns a short frequency label for badges. */
export function getFrequencyLabel(frequency: Frequency): string {
  switch (frequency) {
    case 'monthly': return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'semestral': return 'Semestral';
    case 'annual': return 'Annual';
    default: return frequency;
  }
}

/** Extracts the year from a period string. */
export function getYearFromPeriod(period: string): number {
  const match = period.match(/^(\d{4})/);
  return match ? parseInt(match[1]) : new Date().getFullYear();
}
