import { useMemo } from 'react';
import { SCHEDULED_TYPES, ASAP_TYPES, ACCOMPLISHMENT_CATEGORIES, DENIAL_CATEGORIES } from '../constants/submissionTypes';
import type { PendingSubmission, HistoricalSubmission, DenialCategory } from '../constants/submissionTypes';
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
  submitted?: number;
  denied?: number;
}

export interface AccomplishmentShare {
  id: string;
  label: string;
  approved: number;
  percentage: number;
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
  denied?: number;
  submitted?: number;
  total: number;
}

export interface BarangayPerennialSummary {
  barangay: string;
  resolutions: number;
  resolutionsPending: number;
  resolutionsDenied?: number;
  resolutionsTotal: number;
  accomplishmentsTotal: number;
  accomplishmentsPending: number;
  accomplishmentsDenied?: number;
  accomplishmentsGrandTotal: number;
  categoryData: PerennialCategoryCount[];
}

export interface OverallPerennialItem {
  id: string;
  label: string;
  category: 'resolutions' | 'accomplishment';
  approved: number;
  pending: number;
  denied?: number;
  submitted?: number;
  total: number;
}

export interface OverallPerennialSummary {
  totalResolutions: number;
  totalResolutionsApproved: number;
  totalResolutionsPending: number;
  totalResolutionsDenied?: number;
  totalAccomplishments: number;
  totalAccomplishmentsApproved: number;
  totalAccomplishmentsPending: number;
  totalAccomplishmentsDenied?: number;
  grandTotal: number;
  items: OverallPerennialItem[];
}

export interface DenialShare {
  id: string;
  label: string;
  count: number;
  percentage: number;
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
  overallPerennialSummary: OverallPerennialSummary;
  accomplishmentApprovalShare: AccomplishmentShare[];
  denialReasonShare: DenialShare[];
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

function matchesYear(s: PendingSubmission | HistoricalSubmission, targetYear: number, dateMs: number | null): boolean {
  if (s.year) return Number(s.year) === targetYear;
  if (dateMs) return new Date(dateMs).getFullYear() === targetYear;
  if (s.period && !isNaN(Number(s.period))) return Number(s.period) === targetYear;
  return false;
}

function computeDailyTrend(
  daysCount: number,
  pending: PendingSubmission[],
  approved: HistoricalSubmission[],
  barangays: string[],
  now: Date,
  denied: HistoricalSubmission[] = [],
): MonthlyTrend[] {
  const barangaySet = new Set(barangays.map((b) => b.trim()));
  const filteredApproved = approved.filter((s) => s.barangay && barangaySet.has(s.barangay.trim()));
  const filteredDenied = denied.filter((s) => s.barangay && barangaySet.has(s.barangay.trim()));
  const filteredSubmitted = [...pending, ...approved, ...denied].filter(
    (s) => s.barangay && barangaySet.has(s.barangay.trim())
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
): MonthlyTrend[] {
  const barangaySet = new Set(barangays.map((b) => b.trim()));
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const filteredApproved = approved.filter((s) => s.barangay && barangaySet.has(s.barangay.trim()));
  const filteredDenied = denied.filter((s) => s.barangay && barangaySet.has(s.barangay.trim()));
  const filteredSubmitted = [...pending, ...approved, ...denied].filter(
    (s) => s.barangay && barangaySet.has(s.barangay.trim())
  );

  return monthNames.map((month, i) => {
    const monthApproved = filteredApproved.filter((s) => {
      const ms = getTimestampMs(s.approvedAt);
      if (!ms || !matchesYear(s, year, ms)) return false;
      const d = new Date(ms);
      return d.getMonth() === i;
    }).length;

    const monthDenied = filteredDenied.filter((s) => {
      const ms = getTimestampMs(s.deniedAt);
      if (!ms || !matchesYear(s, year, ms)) return false;
      const d = new Date(ms);
      return d.getMonth() === i;
    }).length;

    const monthSubmitted = filteredSubmitted.filter((s) => {
      const ms = getTimestampMs(s.submittedAt);
      if (!ms || !matchesYear(s, year, ms)) return false;
      const d = new Date(ms);
      return d.getMonth() === i;
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
    // Submission Trend (submissions per time range: 7d, 30d, year)
    // -----------------------------------------------------------------------
    const monthlyTrend: MonthlyTrend[] =
      timeframe === '7d'
        ? computeDailyTrend(7, pending, approved, barangays, now, denied)
        : timeframe === '30d'
        ? computeDailyTrend(30, pending, approved, barangays, now, denied)
        : computeYearlyTrend(year, pending, approved, barangays, denied);

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
      const ms = getTimestampMs(s.submittedAt || (s as HistoricalSubmission).approvedAt || (s as HistoricalSubmission).deniedAt);
      return ms ? new Date(ms).getFullYear() === year : false;
    };

    const barangayPerennialSummary: BarangayPerennialSummary[] = barangays.map((brgy) => {
      const trimmedBrgy = brgy.trim();
      const brgyApproved = approved.filter(
        (s) => s.barangay?.trim() === trimmedBrgy && matchesSubmissionYear(s)
      );
      const brgyPending = pending.filter(
        (s) => s.barangay?.trim() === trimmedBrgy && matchesSubmissionYear(s)
      );
      const brgyDenied = denied.filter(
        (s) => s.barangay?.trim() === trimmedBrgy && matchesSubmissionYear(s)
      );

      const resApproved = brgyApproved.filter((s) => s.documentType === 'resolutions').length;
      const resPending = brgyPending.filter((s) => s.documentType === 'resolutions').length;
      const resDenied = brgyDenied.filter((s) => s.documentType === 'resolutions').length;

      let accApprovedTotal = 0;
      let accPendingTotal = 0;
      let accDeniedTotal = 0;

      const categoryData: PerennialCategoryCount[] = ACCOMPLISHMENT_CATEGORIES.map((cat) => {
        const catApproved = brgyApproved.filter((s) => s.documentType === `acc_${cat.id}`).length;
        const catPending = brgyPending.filter((s) => s.documentType === `acc_${cat.id}`).length;
        const catDenied = brgyDenied.filter((s) => s.documentType === `acc_${cat.id}`).length;
        accApprovedTotal += catApproved;
        accPendingTotal += catPending;
        accDeniedTotal += catDenied;
        return {
          id: cat.id,
          label: cat.label,
          count: catApproved,
          approved: catApproved,
          pending: catPending,
          denied: catDenied,
          submitted: catApproved + catPending + catDenied,
          total: catApproved + catPending + catDenied,
        };
      });

      return {
        barangay: brgy,
        resolutions: resApproved,
        resolutionsPending: resPending,
        resolutionsDenied: resDenied,
        resolutionsTotal: resApproved + resPending + resDenied,
        accomplishmentsTotal: accApprovedTotal,
        accomplishmentsPending: accPendingTotal,
        accomplishmentsDenied: accDeniedTotal,
        accomplishmentsGrandTotal: accApprovedTotal + accPendingTotal + accDeniedTotal,
        categoryData,
      };
    });

    // Aggregate overall perennial across active barangays
    let overallResApproved = 0;
    let overallResPending = 0;
    let overallResDenied = 0;
    let overallAccApproved = 0;
    let overallAccPending = 0;
    let overallAccDenied = 0;

    const overallCatMap: Record<string, { approved: number; pending: number; denied: number; total: number }> = {};
    ACCOMPLISHMENT_CATEGORIES.forEach((cat) => {
      overallCatMap[cat.id] = { approved: 0, pending: 0, denied: 0, total: 0 };
    });

    barangayPerennialSummary.forEach((bps) => {
      overallResApproved += bps.resolutions;
      overallResPending += bps.resolutionsPending;
      overallResDenied += bps.resolutionsDenied ?? 0;
      overallAccApproved += bps.accomplishmentsTotal;
      overallAccPending += bps.accomplishmentsPending;
      overallAccDenied += bps.accomplishmentsDenied ?? 0;
      bps.categoryData.forEach((cd) => {
        if (overallCatMap[cd.id]) {
          overallCatMap[cd.id].approved += cd.approved;
          overallCatMap[cd.id].pending += cd.pending;
          overallCatMap[cd.id].denied += cd.denied ?? 0;
          overallCatMap[cd.id].total += cd.total;
        }
      });
    });

    const items: OverallPerennialItem[] = [
      {
        id: 'resolutions',
        label: 'Resolutions',
        category: 'resolutions',
        approved: overallResApproved,
        pending: overallResPending,
        denied: overallResDenied,
        submitted: overallResApproved + overallResPending + overallResDenied,
        total: overallResApproved + overallResPending + overallResDenied,
      },
      ...ACCOMPLISHMENT_CATEGORIES.map((cat) => ({
        id: cat.id,
        label: cat.label,
        category: 'accomplishment' as const,
        approved: overallCatMap[cat.id]?.approved ?? 0,
        pending: overallCatMap[cat.id]?.pending ?? 0,
        denied: overallCatMap[cat.id]?.denied ?? 0,
        submitted: overallCatMap[cat.id]?.total ?? 0,
        total: overallCatMap[cat.id]?.total ?? 0,
      })),
    ];

    const overallPerennialSummary: OverallPerennialSummary = {
      totalResolutions: overallResApproved + overallResPending + overallResDenied,
      totalResolutionsApproved: overallResApproved,
      totalResolutionsPending: overallResPending,
      totalResolutionsDenied: overallResDenied,
      totalAccomplishments: overallAccApproved + overallAccPending + overallAccDenied,
      totalAccomplishmentsApproved: overallAccApproved,
      totalAccomplishmentsPending: overallAccPending,
      totalAccomplishmentsDenied: overallAccDenied,
      grandTotal: overallResApproved + overallResPending + overallResDenied + overallAccApproved + overallAccPending + overallAccDenied,
      items,
    };

    // -----------------------------------------------------------------------
    // Doc Type Compliance (Scheduled, ASAP, Resolutions, Aggregated Accomplishments)
    // -----------------------------------------------------------------------
    const docTypeCompliance: DocTypeCompliance[] = [
      // Scheduled types — period-based expected count
      ...SCHEDULED_TYPES.map((dt) => {
        const elapsed = getSubmittablePeriods(dt.frequency as Frequency, year, now);
        const expected = elapsed.length * barangays.length;

        let approvedCount = 0;
        let pendingCount = 0;
        let deniedCount = 0;

        barangays.forEach((brgy) => {
          const trimmed = brgy.trim();
          elapsed.forEach((period) => {
            if (approved.some((s) => s.barangay?.trim() === trimmed && s.documentType === dt.id && s.period === period)) {
              approvedCount++;
            }
            if (pending.some((s) => s.barangay?.trim() === trimmed && s.documentType === dt.id && s.period === period)) {
              pendingCount++;
            }
            if (denied.some((s) => s.barangay?.trim() === trimmed && s.documentType === dt.id && s.period === period)) {
              deniedCount++;
            }
          });
        });

        return {
          docType: dt.id,
          label: dt.label,
          approved: approvedCount,
          expected,
          rate: expected > 0 ? Math.round((approvedCount / expected) * 100) : 100,
          submitted: approvedCount + pendingCount + deniedCount,
          denied: deniedCount,
        };
      }),
      // ASAP types — always 1 expected per barangay (one-time, no periods)
      ...ASAP_TYPES.map((dt) => {
        const expected = barangays.length;
        let approvedCount = 0;
        let pendingCount = 0;
        let deniedCount = 0;

        barangays.forEach((brgy) => {
          const trimmed = brgy.trim();
          if (approved.some((s) => s.barangay?.trim() === trimmed && s.documentType === dt.id && s.period === 'ASAP')) {
            approvedCount++;
          }
          if (pending.some((s) => s.barangay?.trim() === trimmed && s.documentType === dt.id && s.period === 'ASAP')) {
            pendingCount++;
          }
          if (denied.some((s) => s.barangay?.trim() === trimmed && s.documentType === dt.id && s.period === 'ASAP')) {
            deniedCount++;
          }
        });

        return {
          docType: dt.id,
          label: dt.label,
          approved: approvedCount,
          expected,
          rate: expected > 0 ? Math.round((approvedCount / expected) * 100) : 100,
          submitted: approvedCount + pendingCount + deniedCount,
          denied: deniedCount,
        };
      }),
      // Resolutions
      {
        docType: 'resolutions',
        label: 'Resolutions',
        approved: overallResApproved,
        expected: 0,
        rate: 0,
        submitted: overallResApproved + overallResPending + overallResDenied,
        denied: overallResDenied,
      },
      // Aggregated Accomplishment Reports
      {
        docType: 'accomplishment_reports',
        label: 'Accomplishment Reports',
        approved: overallAccApproved,
        expected: 0,
        rate: 0,
        submitted: overallAccApproved + overallAccPending + overallAccDenied,
        denied: overallAccDenied,
      },
    ];

    // -----------------------------------------------------------------------
    // Accomplishment Reports Category Approval Breakdown (for Pie Chart)
    // -----------------------------------------------------------------------
    const accomplishmentApprovalShare: AccomplishmentShare[] = ACCOMPLISHMENT_CATEGORIES.map((cat) => {
      const catApproved = overallCatMap[cat.id]?.approved ?? 0;
      const percentage = overallAccApproved > 0 ? Number(((catApproved / overallAccApproved) * 100).toFixed(1)) : 0;
      return {
        id: cat.id,
        label: cat.label,
        approved: catApproved,
        percentage,
      };
    });

    // -----------------------------------------------------------------------
    // Denial Reasons Breakdown (for Pie Chart)
    // -----------------------------------------------------------------------
    const filteredDeniedForYear = denied.filter((s) => {
      const ms = getTimestampMs(s.deniedAt || s.submittedAt);
      return matchesYear(s, year, ms);
    });

    const totalFilteredDenied = filteredDeniedForYear.length;
    const denialCounts: Record<string, number> = {};
    DENIAL_CATEGORIES.forEach((cat) => {
      denialCounts[cat] = 0;
    });

    filteredDeniedForYear.forEach((s) => {
      const cat = s.denialCategory && DENIAL_CATEGORIES.includes(s.denialCategory as DenialCategory)
        ? s.denialCategory
        : 'Other / Specific Discrepancy';
      denialCounts[cat] = (denialCounts[cat] || 0) + 1;
    });

    const denialReasonShare: DenialShare[] = DENIAL_CATEGORIES.map((cat, idx) => {
      const count = denialCounts[cat] || 0;
      const percentage = totalFilteredDenied > 0
        ? Number(((count / totalFilteredDenied) * 100).toFixed(1))
        : 0;
      return {
        id: `denial_cat_${idx}`,
        label: cat,
        count,
        percentage,
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
      overallPerennialSummary,
      accomplishmentApprovalShare,
      denialReasonShare,
    };
  }, [year, pending, approved, barangays, timeframe, denied]);
}
