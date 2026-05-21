import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { PendingSubmission, ApprovedSubmission } from '../constants/submissionTypes';

interface UseSubmissionsResult {
  pending: PendingSubmission[];
  approved: ApprovedSubmission[];
  loading: boolean;
}

/**
 * Real-time listener for submissions data.
 * - If userId is provided: returns only that user's submissions (User Dashboard).
 * - If userId is omitted: returns ALL submissions (Admin Dashboard).
 */
export function useSubmissions(userId?: string): UseSubmissionsResult {
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [approved, setApproved] = useState<ApprovedSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Build queries — filter by userId if provided
    const pendingQuery = userId
      ? query(
          collection(db, 'pending_submissions'),
          where('userId', '==', userId),
          orderBy('submittedAt', 'desc')
        )
      : query(collection(db, 'pending_submissions'), orderBy('submittedAt', 'desc'));

    const approvedQuery = userId
      ? query(
          collection(db, 'submissions'),
          where('userId', '==', userId),
          orderBy('submittedAt', 'desc')
        )
      : query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));

    let pendingLoaded = false;
    let approvedLoaded = false;

    const checkLoaded = () => {
      if (pendingLoaded && approvedLoaded) setLoading(false);
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

    // Listen to approved submissions
    const unsubApproved = onSnapshot(
      approvedQuery,
      (snapshot) => {
        const docs: ApprovedSubmission[] = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as ApprovedSubmission);
        });
        setApproved(docs);
        approvedLoaded = true;
        checkLoaded();
      },
      (error) => {
        console.warn('submissions listener error:', error.message);
        approvedLoaded = true;
        checkLoaded();
      }
    );

    return () => {
      unsubPending();
      unsubApproved();
    };
  }, [userId]);

  return { pending, approved, loading };
}
