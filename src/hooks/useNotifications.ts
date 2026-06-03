import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { useSubmissions } from './useSubmissions';
import { SCHEDULED_TYPES } from '../constants/submissionTypes';
import {
  getSubmittablePeriods,
  getGracePeriodEndDate,
  isPeriodOverdue,
  isPeriodCurrent,
  getPeriodStartDate,
} from '../utils/periodUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * All valid notification types. Mirror of the NotificationType union in
 * functions/src/notifications.ts.
 */
export type NotificationType =
  | 'submission_received'
  | 'submission_approved'
  | 'submission_denied'
  | 'account_approved'
  | 'account_denied'
  | 'profile_updated'
  | 'new_application'
  | 'new_submission'
  | 'submission_open'
  | 'submission_overdue';

export interface NotificationMetadata {
  submissionId?: string;
  documentLabel?: string;
  period?: string;
  reason?: string;
  barangay?: string;
  applicantName?: string;
  [key: string]: string | undefined;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  expiresAt: Date;
  metadata?: NotificationMetadata;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notifId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_NOTIFICATIONS = 20;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Real-time listener for the current user's notifications.
 *
 * Subscribes to `notifications/{uid}/items` ordered by `createdAt DESC`,
 * limited to MAX_NOTIFICATIONS documents.
 *
 * Also dynamically computes and injects client-side reminders for submission
 * openings and overdue deadlines, without writing to the database.
 *
 * @param uid - The current user's UID, or null if not authenticated.
 */
export function useNotifications(uid: string | null): UseNotificationsReturn {
  const [dbNotifications, setDbNotifications] = useState<Notification[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [userProfile, setUserProfile] = useState<{ role: string; approvedAt: Date | null } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>([]);

  // 1. Fetch user profile (role & approvedAt)
  useEffect(() => {
    if (!uid) {
      let active = true;
      Promise.resolve().then(() => {
        if (active) {
          setUserProfile(null);
          setLoadingProfile(false);
        }
      });
      return () => {
        active = false;
      };
    }

    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setLoadingProfile(true);
      }
    });

    const userRef = doc(db, 'users', uid);
    getDoc(userRef)
      .then((snap) => {
        if (!active) return;
        const data = snap.data();
        if (snap.exists() && data) {
          const approvedAtVal = data.approvedAt;
          let approvedAtDate: Date | null = null;
          if (approvedAtVal) {
            approvedAtDate = approvedAtVal.toDate ? approvedAtVal.toDate() : new Date(approvedAtVal);
          }
          setUserProfile({
            role: data.role || 'user',
            approvedAt: approvedAtDate,
          });
        } else {
          setUserProfile({ role: 'user', approvedAt: null });
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('useNotifications: failed to fetch user profile:', err);
        setUserProfile({ role: 'user', approvedAt: null });
      })
      .finally(() => {
        if (active) {
          setLoadingProfile(false);
        }
      });

    return () => {
      active = false;
    };
  }, [uid]);

  // 2. Fetch the user's submissions in real-time if they are a standard user
  const isUser = userProfile?.role === 'user';
  const { pending: userPending, history: userHistory, fetchHistory } = useSubmissions(
    null,
    false,
    isUser ? uid : null
  );

  useEffect(() => {
    if (isUser) {
      fetchHistory();
    }
  }, [isUser, fetchHistory]);

  // 3. Load dismissed reminders from localStorage
  useEffect(() => {
    if (!uid) {
      let active = true;
      Promise.resolve().then(() => {
        if (active) {
          setDismissedReminders([]);
        }
      });
      return () => {
        active = false;
      };
    }

    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const key = `lydo-reminders-dismissed-${uid}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          setDismissedReminders(JSON.parse(stored));
        } else {
          setDismissedReminders([]);
        }
      } catch (e) {
        console.warn('Failed to read dismissed reminders from localStorage:', e);
        setDismissedReminders([]);
      }
    });

    return () => {
      active = false;
    };
  }, [uid]);

  // Helper helper to dismiss a single reminder client-side
  const dismissReminder = useCallback(
    (reminderId: string) => {
      if (!uid) return;
      setDismissedReminders((prev) => {
        const next = [...prev, reminderId];
        try {
          localStorage.setItem(`lydo-reminders-dismissed-${uid}`, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to save dismissed reminders to localStorage:', e);
        }
        return next;
      });
    },
    [uid]
  );

  // Helper helper to dismiss multiple reminders client-side
  const dismissAllReminders = useCallback(
    (reminderIds: string[]) => {
      if (!uid) return;
      setDismissedReminders((prev) => {
        const next = Array.from(new Set([...prev, ...reminderIds]));
        try {
          localStorage.setItem(`lydo-reminders-dismissed-${uid}`, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to save dismissed reminders to localStorage:', e);
        }
        return next;
      });
    },
    [uid]
  );

  // 4. Real-time Firestore notification listener
  useEffect(() => {
    if (!uid) {
      let active = true;
      Promise.resolve().then(() => {
        if (active) {
          setDbNotifications([]);
          setLoadingDb(false);
        }
      });
      return () => {
        active = false;
      };
    }

    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setLoadingDb(true);
      }
    });

    const itemsRef = collection(db, 'notifications', uid, 'items');
    const q = query(itemsRef, orderBy('createdAt', 'desc'), limit(MAX_NOTIFICATIONS));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!active) return;
        const items: Notification[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type as NotificationType,
            title: data.title ?? '',
            body: data.body ?? '',
            isRead: data.isRead ?? false,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            expiresAt: data.expiresAt?.toDate?.() ?? new Date(),
            metadata: data.metadata ?? {},
          };
        });
        setDbNotifications(items);
        setLoadingDb(false);
      },
      (err) => {
        if (!active) return;
        console.error('useNotifications: listener error:', err);
        setLoadingDb(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid]);

  // 5. Generate client-side deadline/opening reminders
  const reminders = useMemo(() => {
    if (!isUser || !userProfile?.approvedAt) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const approvedAt = userProfile.approvedAt;
    const items: Notification[] = [];

    console.log('useNotifications DEBUG:', {
      uid,
      isUser,
      approvedAt: approvedAt.toISOString(),
      dismissedReminders,
    });

    SCHEDULED_TYPES.forEach((dt) => {
      const submittablePeriods = getSubmittablePeriods(dt.frequency || 'monthly', currentYear, now);

      submittablePeriods.forEach((period) => {
        const graceEndDate = getGracePeriodEndDate(period);
        const startDate = getPeriodStartDate(period);

        // Filter out periods that started before the user's account approval date
        if (startDate < approvedAt) {
          return;
        }

        // Check if there is already an approved or pending submission
        const isApproved = userHistory.some(
          (s) => s.documentType === dt.id && s.period === period && s.status === 'approved'
        );
        const isPending = userPending.some(
          (s) => s.documentType === dt.id && s.period === period && s.status === 'pending'
        );

        if (isApproved || isPending) {
          return; // Already submitted
        }

        const isOverdue = isPeriodOverdue(period, now);
        const isOpen = isPeriodCurrent(period, now);

        if (isOverdue) {
          const reminderId = `reminder-overdue-${dt.id}-${period}`;
          const isRead = dismissedReminders.includes(reminderId);

          items.push({
            id: reminderId,
            type: 'submission_overdue',
            title: '⚠️ Submission Overdue',
            body: `The deadline for ${dt.label} (${period}) has passed. Please submit immediately.`,
            isRead,
            createdAt: graceEndDate,
            expiresAt: new Date(graceEndDate.getTime() + 30 * 24 * 60 * 60 * 1000),
            metadata: {
              documentLabel: dt.label,
              period,
            },
          });
        } else if (isOpen) {
          const reminderId = `reminder-open-${dt.id}-${period}`;
          const isRead = dismissedReminders.includes(reminderId);

          items.push({
            id: reminderId,
            type: 'submission_open',
            title: 'Submission Window Open 📂',
            body: `The submission window for ${dt.label} (${period}) is now open.`,
            isRead,
            createdAt: startDate,
            expiresAt: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
            metadata: {
              documentLabel: dt.label,
              period,
            },
          });
        }
      });
    });

    return items;
  }, [isUser, userProfile, userPending, userHistory, dismissedReminders]);

  // 6. Merge database notifications and dynamic reminders
  const mergedNotifications = useMemo(() => {
    const all = [...dbNotifications, ...reminders];
    // Sort descending by date
    return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [dbNotifications, reminders]);

  const unreadCount = useMemo(() => {
    return mergedNotifications.filter((n) => !n.isRead).length;
  }, [mergedNotifications]);

  const loading = loadingDb || loadingProfile;

  // 7. Actions: Mark As Read
  const markAsRead = useCallback(
    async (notifId: string) => {
      if (!uid) return;
      if (notifId.startsWith('reminder-')) {
        dismissReminder(notifId);
        return;
      }
      try {
        const notifRef = doc(db, 'notifications', uid, 'items', notifId);
        await updateDoc(notifRef, { isRead: true });
      } catch (err) {
        console.error('markAsRead error:', err);
      }
    },
    [uid, dismissReminder]
  );

  const markAllAsRead = useCallback(async () => {
    if (!uid) return;

    // Mark database notifications as read
    const unreadDb = dbNotifications.filter((n) => !n.isRead);
    const dbPromise = (async () => {
      if (unreadDb.length === 0) return;
      try {
        const batch = writeBatch(db);
        unreadDb.forEach((n) => {
          const notifRef = doc(db, 'notifications', uid, 'items', n.id);
          batch.update(notifRef, { isRead: true });
        });
        await batch.commit();
      } catch (err) {
        console.error('markAllAsRead error:', err);
      }
    })();

    // Mark reminders as read
    const unreadReminders = reminders.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadReminders.length > 0) {
      dismissAllReminders(unreadReminders);
    }

    await dbPromise;
  }, [uid, dbNotifications, reminders, dismissAllReminders]);

  return {
    notifications: mergedNotifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
