import { useState, useEffect, useCallback } from 'react';
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
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * All valid notification types. Mirror of the NotificationType union in
 * functions/src/notifications.ts.
 *
 * To add a new type: update this union AND the NotificationType in functions.
 */
export type NotificationType =
  | 'submission_received'
  | 'submission_approved'
  | 'submission_denied'
  | 'account_approved'
  | 'account_denied'
  | 'profile_updated'
  | 'new_application'
  | 'new_submission';

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
 * Returns: notifications, unreadCount, markAsRead, markAllAsRead.
 *
 * @param uid - The current user's UID, or null if not authenticated.
 */
export function useNotifications(uid: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      let active = true;
      Promise.resolve().then(() => {
        if (active) {
          setNotifications([]);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }

    const itemsRef = collection(db, 'notifications', uid, 'items');
    const q = query(itemsRef, orderBy('createdAt', 'desc'), limit(MAX_NOTIFICATIONS));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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
        setNotifications(items);
        setLoading(false);
      },
      (err) => {
        console.error('useNotifications: listener error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /**
   * Marks a single notification as read.
   * Only updates the `isRead` field — all other fields are immutable by clients.
   */
  const markAsRead = useCallback(
    async (notifId: string) => {
      if (!uid) return;
      try {
        const notifRef = doc(db, 'notifications', uid, 'items', notifId);
        await updateDoc(notifRef, { isRead: true });
      } catch (err) {
        console.error('markAsRead error:', err);
      }
    },
    [uid]
  );

  /**
   * Marks all unread notifications as read using a batched write.
   * Firestore batch limit is 500; the notifications cap is 20, so this is safe.
   */
  const markAllAsRead = useCallback(async () => {
    if (!uid) return;
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        const notifRef = doc(db, 'notifications', uid, 'items', n.id);
        batch.update(notifRef, { isRead: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('markAllAsRead error:', err);
    }
  }, [uid, notifications]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
