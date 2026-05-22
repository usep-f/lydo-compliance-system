import { useMemo } from 'react';
import {
  SCHEDULED_TYPES,
  ASAP_TYPES,
} from '../constants/submissionTypes';
import type { PendingSubmission, HistoricalSubmission } from '../constants/submissionTypes';
import { getElapsedPeriods, isPeriodOverdue } from '../utils/periodUtils';
import type { Frequency } from '../constants/submissionTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MissingDoc {
  id: string;
  label: string;
  period: string;
  isOverdue: boolean;
}

export interface RecentItem {
  id: string;
  documentLabel: string;
  period: string;
  status: 'pending' | 'approved' | 'denied';
  date: Date | null;
}

export interface UserAnalytics {
  totalSubmitted: number;
  pendingCount: number;
  approvedCount: number;
  deniedCount: number;
  complianceRate: number;       // 0-100, approved / (approved + missing) * 100
  missingDocs: MissingDoc[];
  recentActivity: RecentItem[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Computes user-scoped analytics from the barangay's pending + history arrays.
 * No additional Firestore reads — purely derived from props passed by useSubmissions().
 */
export function useUserAnalytics(
  pending: PendingSubmission[],
  history: HistoricalSubmission[],
  year: number,
): UserAnalytics {
  return useMemo(() => {
    const now = new Date();

    const approvedList = history.filter(
      (s) => s.status === 'approved' || (!s.status && s.approvedAt),
    );
    const deniedList = history.filter(
      (s) => s.status === 'denied',
    );

    const approvedCount = approvedList.length;
    const deniedCount   = deniedList.length;
    const pendingCount  = pending.length;
    const totalSubmitted = pendingCount + history.length;

    // ── Missing Documents ──────────────────────────────────────────────────
    const missingDocs: MissingDoc[] = [];

    // Scheduled types — check each elapsed period
    SCHEDULED_TYPES.forEach((dt) => {
      const elapsed = getElapsedPeriods(dt.frequency as Frequency, year, now);
      elapsed.forEach((period) => {
        const isApproved = approvedList.some(
          (s) => s.documentType === dt.id && s.period === period,
        );
        const isPending = pending.some(
          (s) => s.documentType === dt.id && s.period === period,
        );
        if (!isApproved && !isPending) {
          missingDocs.push({
            id: dt.id,
            label: dt.label,
            period,
            isOverdue: isPeriodOverdue(period, now),
          });
        }
      });
    });

    // ASAP types — always expected
    ASAP_TYPES.forEach((dt) => {
      const isApproved = approvedList.some(
        (s) => s.documentType === dt.id && s.period === 'ASAP',
      );
      const isPending = pending.some(
        (s) => s.documentType === dt.id && s.period === 'ASAP',
      );
      if (!isApproved && !isPending) {
        missingDocs.push({
          id: dt.id,
          label: dt.label,
          period: 'ASAP',
          isOverdue: true, // ASAP docs are always expected
        });
      }
    });

    // ── Compliance Rate ────────────────────────────────────────────────────
    const totalExpected = approvedCount + missingDocs.length;
    const complianceRate =
      totalExpected > 0 ? Math.round((approvedCount / totalExpected) * 100) : 100;

    // ── Recent Activity ────────────────────────────────────────────────────
    const allItems: RecentItem[] = [
      ...pending.map((s) => ({
        id: s.id,
        documentLabel: s.documentLabel || '',
        period: s.period || '',
        status: 'pending' as const,
        date: s.submittedAt?.toDate ? s.submittedAt.toDate() : null,
      })),
      ...history.map((s) => ({
        id: s.id,
        documentLabel: s.documentLabel || '',
        period: s.period || '',
        status: (s.status === 'denied' ? 'denied' : 'approved') as 'approved' | 'denied',
        date: s.submittedAt?.toDate ? s.submittedAt.toDate() : null,
      })),
    ];

    // Sort by date descending, take latest 5
    allItems.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    });

    const recentActivity = allItems.slice(0, 5);

    return {
      totalSubmitted,
      pendingCount,
      approvedCount,
      deniedCount,
      complianceRate,
      missingDocs,
      recentActivity,
    };
  }, [pending, history, year]);
}
