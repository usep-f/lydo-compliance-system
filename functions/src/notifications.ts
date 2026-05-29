import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * All valid notification types in the system.
 */
export type NotificationType =
  // User-facing
  | 'submission_received'
  | 'submission_approved'
  | 'submission_denied'
  | 'account_approved'
  | 'account_denied'
  | 'profile_updated'
  // Admin-facing
  | 'new_application'
  | 'new_submission'
  | 'user_deleted';

export interface NotificationMetadata {
  submissionId?: string;
  documentLabel?: string;
  period?: string;
  reason?: string;
  barangay?: string;
  applicantName?: string;
  [key: string]: string | undefined; // allow future metadata fields
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  metadata?: NotificationMetadata;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of notifications to keep per user. Oldest are pruned. */
const MAX_NOTIFICATIONS_PER_USER = 20;

/** Notifications older than this many days are eligible for pruning. */
export const NOTIFICATION_TTL_DAYS = 30;

// ---------------------------------------------------------------------------
// Core write helper
// ---------------------------------------------------------------------------

/**
 * Writes a notification document to `notifications/{uid}/items/{autoId}`.
 *
 * After writing, enforces the per-user cap by batch-deleting the oldest
 * documents if the subcollection exceeds MAX_NOTIFICATIONS_PER_USER.
 *
 * @param uid - The UID of the notification recipient.
 * @param payload - The notification data.
 */
export async function writeNotification(
  uid: string,
  payload: NotificationPayload
): Promise<void> {
  if (!uid || typeof uid !== 'string') {
    console.warn('writeNotification: invalid uid, skipping.', uid);
    return;
  }

  const db = admin.firestore();
  const itemsRef = db.collection('notifications').doc(uid).collection('items');

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(now.toDate().getTime() + NOTIFICATION_TTL_DAYS * 24 * 60 * 60 * 1000)
  );

  // Write the new notification
  await itemsRef.add({
    type: payload.type,
    title: payload.title,
    body: payload.body,
    metadata: payload.metadata ?? {},
    isRead: false,
    createdAt: now,
    expiresAt,
  });

  // Enforce the per-user cap — delete oldest if over the limit
  try {
    const snapshot = await itemsRef
      .orderBy('createdAt', 'asc')
      .get();

    const excess = snapshot.size - MAX_NOTIFICATIONS_PER_USER;
    if (excess > 0) {
      const toDelete = snapshot.docs.slice(0, excess);
      const batch = db.batch();
      toDelete.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch (capErr) {
    // Cap enforcement failure is non-fatal — the notification was already written
    console.error('writeNotification: cap enforcement failed:', capErr);
  }
}

// ---------------------------------------------------------------------------
// Admin fanout helper
// ---------------------------------------------------------------------------

/**
 * Writes a notification to every user with `role === 'admin'`.
 *
 * Queries the `users` collection for all admin accounts and fans out
 * writeNotification() calls. Supports future multi-admin setups automatically.
 *
 * @param payload - The notification data to send to all admins.
 */
export async function writeNotificationToAdmins(
  payload: NotificationPayload
): Promise<void> {
  const db = admin.firestore();

  let adminSnapshot: admin.firestore.QuerySnapshot;
  try {
    adminSnapshot = await db
      .collection('users')
      .where('role', '==', 'admin')
      .get();
  } catch (err) {
    console.error('writeNotificationToAdmins: failed to query admin users:', err);
    return;
  }

  if (adminSnapshot.empty) {
    console.warn('writeNotificationToAdmins: no admin users found, skipping.');
    return;
  }

  // Fan out concurrently — each write is independent
  await Promise.allSettled(
    adminSnapshot.docs.map((adminDoc) =>
      writeNotification(adminDoc.id, payload)
    )
  );
}

// ---------------------------------------------------------------------------
// pruneExpiredNotifications — Scheduled daily at 2 AM (UTC+8 = 18:00 UTC).
// Performs a collection group query on 'items' and bulk-deletes expired docs
// in batches of 500 (Firestore batch write limit).
// ---------------------------------------------------------------------------
export const pruneExpiredNotifications = onSchedule(
  {
    schedule: '0 18 * * *', // Daily at 2 AM PHT (UTC+8)
    timeZone: 'Asia/Manila',
    region: 'asia-southeast1',
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const BATCH_SIZE = 500;

    console.log(`pruneExpiredNotifications: starting prune at ${now.toDate().toISOString()}`);
    console.log(`TTL: ${NOTIFICATION_TTL_DAYS} days`);

    let totalDeleted = 0;

    try {
      // Collection group query across all users' items subcollections
      const query = db
        .collectionGroup('items')
        .where('expiresAt', '<', now)
        .limit(BATCH_SIZE);

      let snapshot = await query.get();

      while (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        totalDeleted += snapshot.size;
        console.log(`pruneExpiredNotifications: deleted batch of ${snapshot.size} (total: ${totalDeleted})`);

        if (snapshot.size < BATCH_SIZE) break; // no more docs
        snapshot = await query.get();
      }

      console.log(`pruneExpiredNotifications: complete. Total deleted: ${totalDeleted}`);
    } catch (err) {
      console.error('pruneExpiredNotifications: error during prune:', err);
    }
  }
);
