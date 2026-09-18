import { useState, useEffect, useMemo } from 'react';
import { db, functions } from '../firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { 
  AccreditationApplication, 
  AccreditationDocType, 
  DeliberationSchedule 
} from '../constants/submissionTypes';

export function useAccreditations() {
  const [applications, setApplications] = useState<AccreditationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'accreditation_applications'),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: AccreditationApplication[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...docSnap.data() } as AccreditationApplication);
        });
        setApplications(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching accreditation applications:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const counts = useMemo(() => {
    const res = {
      total: applications.length,
      pending: 0,
      verified: 0,
      revision_requested: 0,
      disapproved: 0,
    };

    applications.forEach((app) => {
      if (app.status === 'pending') res.pending++;
      else if (app.status === 'verified') res.verified++;
      else if (app.status === 'revision_requested') res.revision_requested++;
      else if (app.status === 'disapproved') res.disapproved++;
    });

    return res;
  }, [applications]);

  // Cloud Function callable triggers
  const verifyAndSchedule = async (
    applicationId: string, 
    schedule: Omit<DeliberationSchedule, 'scheduledBy' | 'scheduledAt'>
  ) => {
    const fn = httpsCallable(functions, 'verifyAndScheduleAccreditation');
    const result = await fn({ applicationId, schedule });
    return result.data;
  };

  const requestRevision = async (
    applicationId: string, 
    flaggedDocs: AccreditationDocType[], 
    remarks: string
  ) => {
    const fn = httpsCallable(functions, 'requestAccreditationRevision');
    const result = await fn({ applicationId, flaggedDocs, remarks });
    return result.data;
  };

  const disapprove = async (applicationId: string, reason: string) => {
    const fn = httpsCallable(functions, 'disapproveAccreditation');
    const result = await fn({ applicationId, reason });
    return result.data;
  };

  return {
    applications,
    loading,
    error,
    counts,
    verifyAndSchedule,
    requestRevision,
    disapprove,
  };
}
