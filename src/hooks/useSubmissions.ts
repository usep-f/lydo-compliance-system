import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { Query } from 'firebase/firestore';
import type { PendingSubmission, HistoricalSubmission } from '../constants/submissionTypes';

export interface UseSubmissionsResult {
  pending: PendingSubmission[];
  history: HistoricalSubmission[];
  loadingPending: boolean;
  loadingHistory: boolean;
  loading: boolean;
  fetchHistory: () => void;
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
  const [shouldListenToHistory, setShouldListenToHistory] = useState(false);

  // Lazy on-demand trigger to start listening to history
  const fetchHistory = useCallback(() => {
    setShouldListenToHistory(true);
  }, []);

  // Real-time listener for historical submissions (only active after fetchHistory is triggered)
  useEffect(() => {
    if (!shouldListenToHistory) return;

    setLoadingHistory(true);

    const q = buildHistoryQuery(barangay, userId);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: HistoricalSubmission[] = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as HistoricalSubmission);
        });
        setHistory(docs);
        setLoadingHistory(false);
      },
      (error) => {
        console.warn('history submissions listener error:', error.message);
        setLoadingHistory(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [shouldListenToHistory, barangay, isAdmin, userId]);

  // Real-time listener for pending submissions
  useEffect(() => {
    let active = true;

    if (!isAdmin && !barangay && !userId) {
      setPending([]);
      setLoadingPending(false);
      return;
    }

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

