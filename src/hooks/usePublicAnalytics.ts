import { useState, useEffect } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

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
  updatedAt: Timestamp | { toDate: () => Date } | null;
}

/**
 * Hook to fetch and listen to public analytics from Firestore.
 * Features a self-healing mechanism that triggers a recompute if the document is empty.
 */
export function usePublicAnalytics() {
  const [analytics, setAnalytics] = useState<PublicAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'public_analytics');
    
    const unsubscribe = onSnapshot(
      docRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          setAnalytics(snapshot.data() as PublicAnalytics);
          setLoading(false);
          setError(null);
        } else {
          // Document does not exist yet (self-healing)
          setLoading(true);
          try {
            console.log('Public analytics document not found. Triggering sync...');
            const triggerSync = httpsCallable(functions, 'triggerAnalyticsSync');
            await triggerSync();
            // Once the callable finishes, the onSnapshot will naturally fire again
            // with the newly created document.
          } catch (err) {
            console.error('Failed to auto-initialize public analytics:', err);
            setError(err instanceof Error ? err : new Error('Failed to init analytics'));
            setLoading(false);
          }
        }
      },
      (err) => {
        console.error('Error fetching public analytics:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { analytics, loading, error };
}
