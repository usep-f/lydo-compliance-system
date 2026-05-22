import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { PendingSubmission, HistoricalSubmission } from '../constants/submissionTypes';

interface UseSubmissionsResult {
  pending: PendingSubmission[];
  history: HistoricalSubmission[];
  loading: boolean;
}

/**
 * Real-time listener for submissions data.
 * - If userId is provided: returns only that user's submissions (User Dashboard).
 * - If userId is omitted: returns ALL submissions (Admin Dashboard).
 */
export function useSubmissions(userId?: string | null, isAdmin: boolean = false): UseSubmissionsResult {
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [history, setHistory] = useState<HistoricalSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If not an admin and no userId is provided yet, wait for the user ID to load
    if (!isAdmin && !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Build queries — filter by userId if provided
    const pendingQuery = userId
      ? query(
          collection(db, 'pending_submissions'),
          where('userId', '==', userId),
          orderBy('submittedAt', 'desc')
        )
      : query(collection(db, 'pending_submissions'), orderBy('submittedAt', 'desc'));

    const historyQuery = userId
      ? query(
          collection(db, 'submissions'),
          where('userId', '==', userId),
          orderBy('submittedAt', 'desc')
        )
      : query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));

    let pendingLoaded = false;
    let historyLoaded = false;

    const checkLoaded = () => {
      if (pendingLoaded && historyLoaded) setLoading(false);
    };

    // Listen to pending submissions
    const unsubPending = onSnapshot(
      pendingQuery,
      (snapshot) => {
        const docs: PendingSubmission[] = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as PendingSubmission);
        });
        setPending(docs);
        pendingLoaded = true;
        checkLoaded();
      },
      (error) => {
        console.warn('pending_submissions listener error:', error.message);
        pendingLoaded = true;
        checkLoaded();
      }
    );

    // Listen to historical submissions
    const unsubHistory = onSnapshot(
      historyQuery,
      (snapshot) => {
        const docs: HistoricalSubmission[] = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as HistoricalSubmission);
        });
        setHistory(docs);
        historyLoaded = true;
        checkLoaded();
      },
      (error) => {
        console.warn('submissions listener error:', error.message);
        historyLoaded = true;
        checkLoaded();
      }
    );

    return () => {
      unsubPending();
      unsubHistory();
    };
  }, [userId, isAdmin]);

  return { pending, history, loading };
}
