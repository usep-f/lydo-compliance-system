import * as admin from 'firebase-admin';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * All valid notification types in the system.
 *
 * To add a new notification type in the future:
 *  1. Add the string literal to this union.
 *  2. Call writeNotification() wherever the event fires.
 *  No other changes are required — the client and rules work automatically.
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
  | 'new_submission';

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
