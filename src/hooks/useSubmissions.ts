import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import type { Query } from 'firebase/firestore';
import type { PendingSubmission, HistoricalSubmission } from '../constants/submissionTypes';

export interface UseSubmissionsResult {
  pending: PendingSubmission[];
  history: HistoricalSubmission[];
  loadingPending: boolean;
  loadingHistory: boolean;
  loading: boolean;
  fetchHistory: () => Promise<void>;
}

/**
 * Builds the Firestore query for pending submissions.
 */
function buildPendingQuery(barangay: string | null | undefined, userId?: string | null): Query {
  const collRef = collection(db, 'pending_submissions');
  if (userId) {
    return query(collRef, where('userId', '==', userId), orderBy('submittedAt', 'desc'));
  }
  if (barangay) {
    return query(collRef, where('barangay', '==', barangay), orderBy('submittedAt', 'desc'));
  }
  return query(collRef, orderBy('submittedAt', 'desc'));
}

/**
 * Builds the Firestore query for historical submissions.
 */
function buildHistoryQuery(barangay: string | null | undefined, userId?: string | null): Query {
  const collRef = collection(db, 'submissions');
  if (userId) {
    return query(collRef, where('userId', '==', userId), orderBy('submittedAt', 'desc'));
  }
  if (barangay) {
    return query(collRef, where('barangay', '==', barangay), orderBy('submittedAt', 'desc'));
  }
  return query(collRef, orderBy('submittedAt', 'desc'));
}

/**
 * Real-time listener for pending submissions and on-demand fetch for history.
 * - If userId is provided: returns data strictly for that user (User Dashboard, personal view).
 * - If barangay is provided (and no userId): returns data for that barangay (User Dashboard, shared view).
 * - If barangay and userId are omitted: returns data globally (Admin Dashboard).
 */
export function useSubmissions(
  barangay?: string | null,
  isAdmin: boolean = false,
  userId?: string | null
): UseSubmissionsResult {
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [history, setHistory] = useState<HistoricalSubmission[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Lazy on-demand fetch for historical submissions
  const fetchHistory = useCallback(async () => {
    if (!isAdmin && !barangay && !userId) return;

    setLoadingHistory(true);
    try {
      const q = buildHistoryQuery(barangay, userId);
      const snapshot = await getDocs(q);
      const docs: HistoricalSubmission[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as HistoricalSubmission);
      });
      setHistory(docs);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('submissions fetch error:', message);
    } finally {
      setLoadingHistory(false);
    }
  }, [barangay, isAdmin, userId]);

  // Real-time listener for pending submissions
  useEffect(() => {
    if (!isAdmin && !barangay && !userId) {
      let active = true;
      Promise.resolve().then(() => {
        if (active) setLoadingPending(false);
      });
      return () => {
        active = false;
      };
    }

    let active = true;
    Promise.resolve().then(() => {
      if (active) setLoadingPending(true);
    });

    const q = buildPendingQuery(barangay, userId);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: PendingSubmission[] = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as PendingSubmission);
        });
        setPending(docs);
        if (active) setLoadingPending(false);
      },
      (error) => {
        console.warn('pending_submissions listener error:', error.message);
        if (active) setLoadingPending(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [barangay, isAdmin, userId]);

  const loading = loadingPending || loadingHistory;

  return {
    pending,
    history,
    loadingPending,
    loadingHistory,
    loading,
    fetchHistory,
  };
}

