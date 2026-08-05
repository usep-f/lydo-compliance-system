import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';

/**
 * purgeSystemData
 * 
 * Callable function restricted to admins.
 * Recursively deletes all data from:
 * - pending_submissions
 * - submissions
 * - perennial_counts
 * 
 * Completely wipes all files in the Firebase Cloud Storage bucket.
 */
export const purgeSystemData = functions.https.onCall(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    // 1. Authorization
    if (!request.auth || !request.auth.token || request.auth.token.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only administrators can perform a system purge.');
    }

    const db = admin.firestore();
    
    try {
      console.log(`System purge initiated by Admin UID: ${request.auth.uid}`);

      // 2. Recursive Delete of Firestore Collections
      // Note: recursiveDelete is highly optimized and handles subcollections as well
      await Promise.all([
        db.recursiveDelete(db.collection('pending_submissions')),
        db.recursiveDelete(db.collection('submissions')),
        db.recursiveDelete(db.collection('perennial_counts')),
      ]);
      console.log('Successfully purged target Firestore collections.');

      // 3. Wipe Cloud Storage Bucket
      const bucket = getStorage().bucket();
      // Use deleteFiles with prefix '' to delete all files in the bucket
      await bucket.deleteFiles();
      console.log('Successfully wiped Cloud Storage bucket.');

      return { 
        success: true, 
        message: 'System data and files purged successfully.' 
      };

    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error during system data purge:', err);
      throw new functions.https.HttpsError('internal', `Failed to purge system data: ${err.message}`);
    }
  }
);
