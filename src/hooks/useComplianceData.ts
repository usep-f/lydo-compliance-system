import { useMemo } from 'react';
import { SCHEDULED_TYPES, ASAP_TYPES, ACCOMPLISHMENT_CATEGORIES } from '../constants/submissionTypes';
import type { PendingSubmission, HistoricalSubmission } from '../constants/submissionTypes';
import { getElapsedPeriods, getAllPeriods, getSubmittablePeriods, isPeriodOverdue, isPeriodCurrent } from '../utils/periodUtils';
import type { Frequency } from '../constants/submissionTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BarangayCompliance {
  barangay: string;
  approved: number;
  expected: number;
  rate: number; // 0-100
}

export interface DocTypeCompliance {
  docType: string;
  label: string;
  approved: number;
  expected: number;
  rate: number;
}

export interface MonthlyTrend {
  month: string;   // "Jan", "Feb", etc.
  submitted: number;
  approved: number;
  denied: number;
}

export interface MatrixCell {
  barangay: string;
  docType: string;
  period: string;
  status: 'approved' | 'pending' | 'missing' | 'not_due';
}

export interface AsapStatus {
  barangay: string;
  docType: string;
  label: string;
  status: 'approved' | 'pending' | 'missing';
}

export interface PerennialCategoryCount {
  id: string;
  label: string;
  count: number;
}

export interface BarangayPerennialSummary {
  barangay: string;
  resolutions: number;
  accomplishmentsTotal: number;
  categoryData: PerennialCategoryCount[];
}

export interface ComplianceData {
  overallRate: number;
  fullyCompliantCount: number;
  totalBarangays: number;
  overdueCount: number;
  pendingReviewCount: number;
  barangayRanking: BarangayCompliance[];
  docTypeCompliance: DocTypeCompliance[];
  monthlyTrend: MonthlyTrend[];
  matrixData: MatrixCell[];
  asapStatus: AsapStatus[];
  barangayPerennialSummary: BarangayPerennialSummary[];
}

export type TrendTimeframe = '7d' | '30d' | 'year';

function getTimestampMs(val: unknown): number | null {
  if (!val) return null;
  const anyVal = val as { toDate?: () => Date };
  if (typeof anyVal.toDate === 'function') {
    return anyVal.toDate().getTime();
  }
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function computeDailyTrend(
  daysCount: number,
  pending: PendingSubmission[],
  approved: HistoricalSubmission[],
  barangays: string[],
  now: Date,
): MonthlyTrend[] {
  const barangaySet = new Set(barangays);
  const filteredApproved = approved.filter((s) => barangaySet.has(s.barangay));
  const filteredSubmitted = [...pending, ...approved].filter((s) => barangaySet.has(s.barangay));

  const result: MonthlyTrend[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const monthApproved = filteredApproved.filter((s) => {
      const ms = getTimestampMs(s.approvedAt);
      return ms !== null && ms >= dayStart && ms <= dayEnd;
    }).length;

    const monthSubmitted = filteredSubmitted.filter((s) => {
      const ms = getTimestampMs(s.submittedAt);
      return ms !== null && ms >= dayStart && ms <= dayEnd;
    }).length;

    result.push({
      month: label,
      submitted: monthSubmitted,
      approved: monthApproved,
      denied: 0,
    });
  }

  return result;
}

function computeYearlyTrend(
  year: number,
  pending: PendingSubmission[],
  approved: HistoricalSubmission[],
  barangays: string[],
): MonthlyTrend[] {
  const barangaySet = new Set(barangays);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const filteredApproved = approved.filter((s) => barangaySet.has(s.barangay));
  const filteredSubmitted = [...pending, ...approved].filter((s) => barangaySet.has(s.barangay));

  return monthNames.map((month, i) => {
    const monthApproved = filteredApproved.filter((s) => {
      if (s.year !== year) return false;
      const ms = getTimestampMs(s.approvedAt);
      if (ms) {
        const d = new Date(ms);
        return d.getFullYear() === year && d.getMonth() === i;
      }
      return false;
    }).length;

    const monthSubmitted = filteredSubmitted.filter((s) => {
      if (s.year !== year) return false;
      const ms = getTimestampMs(s.submittedAt);
      if (ms) {
        const d = new Date(ms);
        return d.getFullYear() === year && d.getMonth() === i;
      }
      return false;
    }).length;

    return {
      month,
      submitted: monthSubmitted,
      approved: monthApproved,
      denied: 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Computes compliance analytics from raw submission data.
 * All computation happens client-side — no extra Firestore reads.
 */
export function useComplianceData(
  year: number,
  pending: PendingSubmission[],
  approved: HistoricalSubmission[],
  barangays: string[],
  timeframe: TrendTimeframe = 'year',
): ComplianceData {
  return useMemo(() => {
    const now = new Date();

    // -----------------------------------------------------------------------
    // Per-Barangay Compliance (Scheduled docs only)
    // -----------------------------------------------------------------------
    const barangayRanking: BarangayCompliance[] = barangays.map((brgy) => {
      let totalExpected = 0;
      let totalApproved = 0;

      SCHEDULED_TYPES.forEach((dt) => {
        const elapsed = getElapsedPeriods(dt.frequency as Frequency, year, now);
        totalExpected += elapsed.length;

        elapsed.forEach((period) => {
          const isApproved = approved.some(
            (s) => s.barangay === brgy && s.documentType === dt.id && s.period === period
          );
          if (isApproved) totalApproved++;
        });
      });

      return {
        barangay: brgy,
        approved: totalApproved,
        expected: totalExpected,
        rate: totalExpected > 0 ? Math.round((totalApproved / totalExpected) * 100) : 100,
      };
    });

    barangayRanking.sort((a, b) => b.rate - a.rate);

    // -----------------------------------------------------------------------
    // Overall Compliance
    // -----------------------------------------------------------------------
    const totalExpected = barangayRanking.reduce((s, b) => s + b.expected, 0);
    const totalApproved = barangayRanking.reduce((s, b) => s + b.approved, 0);
    const overallRate = totalExpected > 0 ? Math.round((totalApproved / totalExpected) * 100) : 100;
    const fullyCompliantCount = barangayRanking.filter((b) => b.rate === 100).length;
    const overdueCount = totalExpected - totalApproved;

    // -----------------------------------------------------------------------
    // Doc Type Compliance
    // -----------------------------------------------------------------------
    const docTypeCompliance: DocTypeCompliance[] = [
      // Scheduled types — period-based expected count
      ...SCHEDULED_TYPES.map((dt) => {
        const elapsed = getSubmittablePeriods(dt.frequency as Frequency, year, now);
        const expected = elapsed.length * barangays.length;

        let approvedCount = 0;
        barangays.forEach((brgy) => {
          elapsed.forEach((period) => {
            const isApproved = approved.some(
              (s) => s.barangay === brgy && s.documentType === dt.id && s.period === period
            );
            if (isApproved) approvedCount++;
          });
        });

        return {
          docType: dt.id,
          label: dt.label,
          approved: approvedCount,
          expected,
          rate: expected > 0 ? Math.round((approvedCount / expected) * 100) : 100,
        };
      }),
      // ASAP types — always 1 expected per barangay (one-time, no periods)
      ...ASAP_TYPES.map((dt) => {
        const expected = barangays.length;
        const approvedCount = barangays.filter((brgy) =>
          approved.some(
            (s) => s.barangay === brgy && s.documentType === dt.id && s.period === 'ASAP'
          )
        ).length;

        return {
          docType: dt.id,
          label: dt.label,
          approved: approvedCount,
          expected,
          rate: expected > 0 ? Math.round((approvedCount / expected) * 100) : 100,
        };
      }),
    ];

    // -----------------------------------------------------------------------
    // Submission Trend (submissions per time range: 7d, 30d, year)
    // -----------------------------------------------------------------------
    const monthlyTrend: MonthlyTrend[] =
      timeframe === '7d'
        ? computeDailyTrend(7, pending, approved, barangays, now)
        : timeframe === '30d'
        ? computeDailyTrend(30, pending, approved, barangays, now)
        : computeYearlyTrend(year, pending, approved, barangays);

    // -----------------------------------------------------------------------
    // Compliance Matrix
    // -----------------------------------------------------------------------
    const matrixData: MatrixCell[] = [];

    // Scheduled document types — period-based
    SCHEDULED_TYPES.forEach((dt) => {
      const allPeriods = getAllPeriods(dt.frequency as Frequency, year);
      barangays.forEach((brgy) => {
        allPeriods.forEach((period) => {
          const isApproved = approved.some(
            (s) => s.barangay === brgy && s.documentType === dt.id && s.period === period
          );
          const isPending = pending.some(
            (s) => s.barangay === brgy && s.documentType === dt.id && s.period === period
          );

          let status: MatrixCell['status'];
          if (isApproved) {
            status = 'approved';
          } else if (isPending) {
            status = 'pending';
          } else if (isPeriodOverdue(period, now)) {
            status = 'missing';
          } else if (isPeriodCurrent(period, now)) {
            status = 'not_due'; // Current period — not overdue yet
          } else {
            status = 'not_due';
          }

          matrixData.push({ barangay: brgy, docType: dt.id, period, status });
        });
      });
    });

    // ASAP document types — single "ASAP" period, always expected (no not_due)
    ASAP_TYPES.forEach((dt) => {
      barangays.forEach((brgy) => {
        const isApproved = approved.some(
          (s) => s.barangay === brgy && s.documentType === dt.id && s.period === 'ASAP'
        );
        const isPending = pending.some(
          (s) => s.barangay === brgy && s.documentType === dt.id && s.period === 'ASAP'
        );

        let status: MatrixCell['status'];
        if (isApproved) status = 'approved';
        else if (isPending) status = 'pending';
        else status = 'missing'; // ASAP = always expected, never "not_due"

        matrixData.push({ barangay: brgy, docType: dt.id, period: 'ASAP', status });
      });
    });

    // -----------------------------------------------------------------------
    // ASAP Status
    // -----------------------------------------------------------------------
    const asapStatus: AsapStatus[] = [];
    ASAP_TYPES.forEach((dt) => {
      barangays.forEach((brgy) => {
        const isApproved = approved.some(
          (s) => s.barangay === brgy && s.documentType === dt.id && s.period === 'ASAP'
        );
        const isPending = pending.some(
          (s) => s.barangay === brgy && s.documentType === dt.id && s.period === 'ASAP'
        );

        let status: AsapStatus['status'];
        if (isApproved) status = 'approved';
        else if (isPending) status = 'pending';
        else status = 'missing';

        asapStatus.push({ barangay: brgy, docType: dt.id, label: dt.label, status });
      });
    });

    // -----------------------------------------------------------------------
    // Perennial Data Aggregation
    // -----------------------------------------------------------------------
    const barangayPerennialSummary: BarangayPerennialSummary[] = barangays.map((brgy) => {
      const brgyApproved = approved.filter((s) => s.barangay === brgy && s.year === year);

      const resolutionsCount = brgyApproved.filter((s) => s.documentType === 'resolutions').length;

      let accomplishmentsTotal = 0;
      const categoryData: PerennialCategoryCount[] = ACCOMPLISHMENT_CATEGORIES.map((cat) => {
        const count = brgyApproved.filter((s) => s.documentType === `acc_${cat.id}`).length;
        accomplishmentsTotal += count;
        return {
          id: cat.id,
          label: cat.label,
          count,
        };
      });

      return {
        barangay: brgy,
        resolutions: resolutionsCount,
        accomplishmentsTotal,
        categoryData,
      };
    });

    return {
      overallRate,
      fullyCompliantCount,
      totalBarangays: barangays.length,
      overdueCount,
      pendingReviewCount: pending.length,
      barangayRanking,
      docTypeCompliance,
      monthlyTrend,
      matrixData,
      asapStatus,
      barangayPerennialSummary,
    };
  }, [year, pending, approved, barangays, timeframe]);
}
