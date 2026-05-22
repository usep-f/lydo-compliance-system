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
 * - If barangay is provided: returns all submissions for that barangay (User Dashboard).
 * - If barangay is omitted: returns ALL submissions globally (Admin Dashboard).
 */
export function useSubmissions(barangay?: string | null, isAdmin: boolean = false): UseSubmissionsResult {
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [history, setHistory] = useState<HistoricalSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If not an admin and no barangay is provided yet, wait for the barangay to load
    if (!isAdmin && !barangay) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Build queries — filter by barangay if provided
    const pendingQuery = barangay
      ? query(
          collection(db, 'pending_submissions'),
          where('barangay', '==', barangay),
          orderBy('submittedAt', 'desc')
        )
      : query(collection(db, 'pending_submissions'), orderBy('submittedAt', 'desc'));

    const historyQuery = barangay
      ? query(
          collection(db, 'submissions'),
          where('barangay', '==', barangay),
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
  }, [barangay, isAdmin]);

  return { pending, history, loading };
}
