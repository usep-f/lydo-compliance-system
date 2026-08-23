import * as functions from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { 
  SCHEDULED_TYPES, 
  ASAP_TYPES, 
  HistoricalSubmission 
} from './constants/submissionTypes';
import { BARANGAYS } from './constants/barangays';
import { getElapsedPeriods } from './utils/periodUtils';

export interface BarangayCompliance {
  barangay: string;
  expectedCount: number;
  submittedCount: number;
  complianceRate: number; // 0 to 100
  checklist: Record<string, 'compliant' | 'missing' | 'not-due'>;
}

export interface PublicAnalytics {
  overallRate: number; // 0 to 100
  fullyCompliantCount: number;
  activeBarangaysCount: number;
  activeUsersCount: number;
  totalSubmissionsCount: number;
  barangayRanking: BarangayCompliance[];
  barangayBreakdown: Record<string, BarangayCompliance>; // Keyed by barangay name
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Recomputes the public analytics summary and writes it to settings/public_analytics.
 * This runs the dynamic schedule-based compliance logic (Option A) across all approved submissions.
 */
export async function recomputePublicAnalytics(db: admin.firestore.Firestore): Promise<void> {
  const currentYear = new Date().getFullYear();
  const now = new Date();

  // 1. Gather expected checklist items for all active periods
  const expectedChecklistItems: { id: string; type: 'scheduled' | 'asap'; label: string }[] = [];
  
  // Scheduled Types
  SCHEDULED_TYPES.forEach(type => {
    if (type.frequency) {
      const elapsed = getElapsedPeriods(type.frequency, currentYear, now);
      elapsed.forEach(period => {
        expectedChecklistItems.push({ id: `${type.id}_${period}`, type: 'scheduled', label: `${type.label} (${period})` });
      });
    }
  });

  // ASAP Types
  ASAP_TYPES.forEach(type => {
    expectedChecklistItems.push({ id: `${type.id}_ASAP`, type: 'asap', label: type.label });
  });

  // 2. Fetch all approved submissions from Firestore
  const submissionsSnapshot = await db.collection('submissions').get();
  const approvedSubmissions = submissionsSnapshot.docs
    .map(doc => doc.data() as HistoricalSubmission)
    .filter(s => s.status === 'approved' || (!s.status && s.approvedAt) || s.status !== 'denied');
  
  const totalSubmissionsCount = approvedSubmissions.length;

  // 3. Fetch users for active users count (exclude admin)
  const usersSnapshot = await db.collection('users').get();
  const activeUsersCount = usersSnapshot.docs.filter(d => d.data()?.role !== 'admin').length;

  // 4. Compute compliance per barangay (Matches useComplianceData schedule-based calculation)
  const barangayBreakdown: Record<string, BarangayCompliance> = {};
  const barangayRanking: BarangayCompliance[] = [];
  let fullyCompliantCount = 0;
  let activeBarangaysCount = 0;
  let totalComplianceSum = 0;

  BARANGAYS.forEach(brgy => {
    const checklist: Record<string, 'compliant' | 'missing' | 'not-due'> = {};
    expectedChecklistItems.forEach(item => {
      checklist[item.id] = 'missing';
    });

    let totalScheduledExpected = 0;
    let totalScheduledApproved = 0;

    // Check Scheduled submissions
    SCHEDULED_TYPES.forEach(dt => {
      if (dt.frequency) {
        const elapsed = getElapsedPeriods(dt.frequency, currentYear, now);
        totalScheduledExpected += elapsed.length;

        elapsed.forEach(period => {
          const isApproved = approvedSubmissions.some(
            s => s.barangay?.trim() === brgy && s.documentType === dt.id && s.period === period
          );
          if (isApproved) {
            totalScheduledApproved++;
            checklist[`${dt.id}_${period}`] = 'compliant';
          }
        });
      }
    });

    // Check ASAP submissions
    ASAP_TYPES.forEach(dt => {
      const isApproved = approvedSubmissions.some(
        s => s.barangay?.trim() === brgy && s.documentType === dt.id && (s.period === 'ASAP' || !s.period)
      );
      if (isApproved) {
        checklist[`${dt.id}_ASAP`] = 'compliant';
      }
    });

    const complianceRate = totalScheduledExpected > 0
      ? Math.round((totalScheduledApproved / totalScheduledExpected) * 100)
      : 100;

    if (complianceRate === 100) fullyCompliantCount++;
    if (totalScheduledApproved > 0) activeBarangaysCount++;
    totalComplianceSum += complianceRate;

    const data: BarangayCompliance = {
      barangay: brgy,
      expectedCount: totalScheduledExpected,
      submittedCount: totalScheduledApproved,
      complianceRate,
      checklist
    };

    barangayBreakdown[brgy] = data;
    barangayRanking.push(data);
  });

  // Sort: Highest compliance first, then alphabetical
  barangayRanking.sort((a, b) => {
    if (b.complianceRate !== a.complianceRate) {
      return b.complianceRate - a.complianceRate;
    }
    return a.barangay.localeCompare(b.barangay);
  });

  const overallRate = BARANGAYS.length > 0 ? Math.round(totalComplianceSum / BARANGAYS.length) : 0;

  // 5. Construct payload and write to Firestore
  const publicAnalytics: PublicAnalytics = {
    overallRate,
    fullyCompliantCount,
    activeBarangaysCount,
    activeUsersCount,
    totalSubmissionsCount,
    barangayRanking,
    barangayBreakdown,
    updatedAt: admin.firestore.Timestamp.now()
  };

  await db.collection('settings').doc('public_analytics').set(publicAnalytics);
  console.log(`Recomputed public analytics successfully. Overall Rate: ${overallRate}%, Active Barangays: ${activeBarangaysCount}`);
}

/**
 * Scheduled cron job: Runs every 30 minutes to update public analytics.
 * This is crucial because `getElapsedPeriods` changes dynamically as time passes,
 * so compliance rates can drop if a new deadline passes and items become 'missing'.
 */
export const refreshPublicAnalyticsCron = onSchedule('every 30 minutes', async (event) => {
  const db = admin.firestore();
  await recomputePublicAnalytics(db);
});

/**
 * Callable function: Allows the React client to trigger an immediate sync.
 * Used for self-healing (if document is empty) or for Admin forced sync.
 */
export const triggerAnalyticsSync = functions.https.onCall(
  {
    cors: true,
    maxInstances: 1,
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (request) => {
    const db = admin.firestore();
    await recomputePublicAnalytics(db);
    return { success: true, message: 'Public analytics synced.' };
  }
);
