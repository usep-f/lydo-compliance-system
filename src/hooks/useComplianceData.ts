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
  count: number; // for backwards compatibility, count = approved
  approved: number;
  pending: number;
  total: number;
}

export interface BarangayPerennialSummary {
  barangay: string;
  resolutions: number; // approved
  resolutionsPending: number;
  resolutionsTotal: number;
  accomplishmentsTotal: number; // approved
  accomplishmentsPending: number;
  accomplishmentsGrandTotal: number;
  categoryData: PerennialCategoryCount[];
}

export interface OverallPerennialItem {
  id: string;
  label: string;
  category: 'resolutions' | 'accomplishment';
  icon: string;
  approved: number;
  pending: number;
  total: number;
}

export interface OverallPerennialSummary {
  totalResolutions: number;
  totalResolutionsApproved: number;
  totalResolutionsPending: number;
  totalAccomplishments: number;
  totalAccomplishmentsApproved: number;
  totalAccomplishmentsPending: number;
  grandTotal: number;
  items: OverallPerennialItem[];
}

export type TrendTimeframe = '7d' | '30d' | 'year';
export type TrendDocFilter = 'all' | 'perennial' | 'compliance';

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
  overallPerennialSummary: OverallPerennialSummary;
}

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

function isPerennialDoc(s: { category?: string; documentType?: string }): boolean {
  return (
    s.category === 'perennial' ||
    s.documentType === 'resolutions' ||
    Boolean(s.documentType?.startsWith('acc_'))
  );
}

function matchesDocFilter(s: PendingSubmission | HistoricalSubmission, filter: TrendDocFilter): boolean {
  if (filter === 'all') return true;
  const isP = isPerennialDoc(s);
  return filter === 'perennial' ? isP : !isP;
}

function matchesYear(s: PendingSubmission | HistoricalSubmission, targetYear: number, dateMs: number | null): boolean {
  if (s.year) return Number(s.year) === targetYear;
  if (dateMs) return new Date(dateMs).getFullYear() === targetYear;
  return false;
}

function computeDailyTrend(
  daysCount: number,
  pending: PendingSubmission[],
  approved: HistoricalSubmission[],
  barangays: string[],
  now: Date,
  denied: HistoricalSubmission[] = [],
  docFilter: TrendDocFilter = 'all',
): MonthlyTrend[] {
  const barangaySet = new Set(barangays.map((b) => b.trim()));
  const filteredApproved = approved.filter(
    (s) => barangaySet.has(s.barangay?.trim()) && matchesDocFilter(s, docFilter)
  );
  const filteredDenied = denied.filter(
    (s) => barangaySet.has(s.barangay?.trim()) && matchesDocFilter(s, docFilter)
  );
  const filteredSubmitted = [...pending, ...approved, ...denied].filter(
    (s) => barangaySet.has(s.barangay?.trim()) && matchesDocFilter(s, docFilter)
  );

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

    const monthDenied = filteredDenied.filter((s) => {
      const ms = getTimestampMs(s.deniedAt);
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
      denied: monthDenied,
    });
  }

  return result;
}

function computeYearlyTrend(
  year: number,
  pending: PendingSubmission[],
  approved: HistoricalSubmission[],
  barangays: string[],
  denied: HistoricalSubmission[] = [],
  docFilter: TrendDocFilter = 'all',
): MonthlyTrend[] {
  const barangaySet = new Set(barangays.map((b) => b.trim()));
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const filteredApproved = approved.filter(
    (s) => barangaySet.has(s.barangay?.trim()) && matchesDocFilter(s, docFilter)
  );
  const filteredDenied = denied.filter(
    (s) => barangaySet.has(s.barangay?.trim()) && matchesDocFilter(s, docFilter)
  );
  const filteredSubmitted = [...pending, ...approved, ...denied].filter(
    (s) => barangaySet.has(s.barangay?.trim()) && matchesDocFilter(s, docFilter)
  );

  return monthNames.map((month, i) => {
    const monthApproved = filteredApproved.filter((s) => {
      const ms = getTimestampMs(s.approvedAt);
      if (!ms || !matchesYear(s, year, ms)) return false;
      const d = new Date(ms);
      return d.getFullYear() === year && d.getMonth() === i;
    }).length;

    const monthDenied = filteredDenied.filter((s) => {
      const ms = getTimestampMs(s.deniedAt);
      if (!ms || !matchesYear(s, year, ms)) return false;
      const d = new Date(ms);
      return d.getFullYear() === year && d.getMonth() === i;
    }).length;

    const monthSubmitted = filteredSubmitted.filter((s) => {
      const ms = getTimestampMs(s.submittedAt);
      if (!ms || !matchesYear(s, year, ms)) return false;
      const d = new Date(ms);
      return d.getFullYear() === year && d.getMonth() === i;
    }).length;

    return {
      month,
      submitted: monthSubmitted,
      approved: monthApproved,
      denied: monthDenied,
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
  denied: HistoricalSubmission[] = [],
  trendDocFilter: TrendDocFilter = 'all',
): ComplianceData {
  return useMemo(() => {
    const now = new Date();

    // -----------------------------------------------------------------------
    // Per-Barangay Compliance (Scheduled + ASAP docs)
    // -----------------------------------------------------------------------
    const barangayRanking: BarangayCompliance[] = barangays.map((brgy) => {
      let totalExpected = 0;
      let totalApproved = 0;

      // 1. Scheduled types — elapsed periods
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

      // 2. ASAP types — required for current or past years (1 expected per doc type per barangay)
      if (year <= now.getFullYear()) {
        ASAP_TYPES.forEach((dt) => {
          totalExpected += 1;
          const isApproved = approved.some(
            (s) => s.barangay === brgy && s.documentType === dt.id && s.period === 'ASAP'
          );
          if (isApproved) totalApproved++;
        });
      }

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
        ? computeDailyTrend(7, pending, approved, barangays, now, denied, trendDocFilter)
        : timeframe === '30d'
        ? computeDailyTrend(30, pending, approved, barangays, now, denied, trendDocFilter)
        : computeYearlyTrend(year, pending, approved, barangays, denied, trendDocFilter);

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
    const matchesSubmissionYear = (s: PendingSubmission | HistoricalSubmission) => {
      if (s.year) return Number(s.year) === year;
      const ms = getTimestampMs(s.submittedAt || (s as HistoricalSubmission).approvedAt);
      return ms ? new Date(ms).getFullYear() === year : false;
    };

    const barangayPerennialSummary: BarangayPerennialSummary[] = barangays.map((brgy) => {
      const brgyApproved = approved.filter(
        (s) => s.barangay?.trim() === brgy.trim() && matchesSubmissionYear(s)
      );
      const brgyPending = pending.filter(
        (s) => s.barangay?.trim() === brgy.trim() && matchesSubmissionYear(s)
      );

      const resApproved = brgyApproved.filter((s) => s.documentType === 'resolutions').length;
      const resPending = brgyPending.filter((s) => s.documentType === 'resolutions').length;

      let accApprovedTotal = 0;
      let accPendingTotal = 0;

      const categoryData: PerennialCategoryCount[] = ACCOMPLISHMENT_CATEGORIES.map((cat) => {
        const catApproved = brgyApproved.filter((s) => s.documentType === `acc_${cat.id}`).length;
        const catPending = brgyPending.filter((s) => s.documentType === `acc_${cat.id}`).length;
        accApprovedTotal += catApproved;
        accPendingTotal += catPending;
        return {
          id: cat.id,
          label: cat.label,
          count: catApproved,
          approved: catApproved,
          pending: catPending,
          total: catApproved + catPending,
        };
      });

      return {
        barangay: brgy,
        resolutions: resApproved,
        resolutionsPending: resPending,
        resolutionsTotal: resApproved + resPending,
        accomplishmentsTotal: accApprovedTotal,
        accomplishmentsPending: accPendingTotal,
        accomplishmentsGrandTotal: accApprovedTotal + accPendingTotal,
        categoryData,
      };
    });

    // Aggregate overall perennial across active barangays
    let overallResApproved = 0;
    let overallResPending = 0;
    let overallAccApproved = 0;
    let overallAccPending = 0;

    const overallCatMap: Record<string, { approved: number; pending: number; total: number }> = {};
    ACCOMPLISHMENT_CATEGORIES.forEach((cat) => {
      overallCatMap[cat.id] = { approved: 0, pending: 0, total: 0 };
    });

    barangayPerennialSummary.forEach((bps) => {
      overallResApproved += bps.resolutions;
      overallResPending += bps.resolutionsPending;
      overallAccApproved += bps.accomplishmentsTotal;
      overallAccPending += bps.accomplishmentsPending;
      bps.categoryData.forEach((cd) => {
        if (overallCatMap[cd.id]) {
          overallCatMap[cd.id].approved += cd.approved;
          overallCatMap[cd.id].pending += cd.pending;
          overallCatMap[cd.id].total += cd.total;
        }
      });
    });

    const items: OverallPerennialItem[] = [
      {
        id: 'resolutions',
        label: 'Resolutions',
        category: 'resolutions',
        icon: 'gavel',
        approved: overallResApproved,
        pending: overallResPending,
        total: overallResApproved + overallResPending,
      },
      ...ACCOMPLISHMENT_CATEGORIES.map((cat) => ({
        id: cat.id,
        label: cat.label,
        category: 'accomplishment' as const,
        icon: 'assessment',
        approved: overallCatMap[cat.id]?.approved ?? 0,
        pending: overallCatMap[cat.id]?.pending ?? 0,
        total: overallCatMap[cat.id]?.total ?? 0,
      })),
    ];

    const overallPerennialSummary: OverallPerennialSummary = {
      totalResolutions: overallResApproved + overallResPending,
      totalResolutionsApproved: overallResApproved,
      totalResolutionsPending: overallResPending,
      totalAccomplishments: overallAccApproved + overallAccPending,
      totalAccomplishmentsApproved: overallAccApproved,
      totalAccomplishmentsPending: overallAccPending,
      grandTotal: overallResApproved + overallResPending + overallAccApproved + overallAccPending,
      items,
    };

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
      overallPerennialSummary,
    };
  }, [year, pending, approved, barangays, timeframe, denied, trendDocFilter]);
}
