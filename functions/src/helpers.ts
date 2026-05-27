/* eslint-disable @typescript-eslint/no-explicit-any */
import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Only files under these prefixes are eligible for deletion. */
export const ALLOWED_STORAGE_PREFIXES = ['temp_proofs/', 'submission_files/'];

/** Maximum allowed length for a denial reason string. */
export const MAX_REASON_LENGTH = 1000;

/** Maximum allowed length for an application ID. */
export const MAX_ID_LENGTH = 128;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escapes user-controlled strings before embedding them in HTML email bodies.
 * Prevents HTML/script injection in outbound emails.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates that an application ID is a safe, non-empty string of reasonable length.
 * Rejects slashes to prevent path traversal into nested Firestore sub-collections.
 */
export function validateApplicationId(id: unknown): asserts id is string {
  if (
    typeof id !== 'string' ||
    id.trim().length === 0 ||
    id.length > MAX_ID_LENGTH ||
    id.includes('/')
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid Application ID is required.'
    );
  }
}

/**
 * Validates that a denial reason is a non-empty string within the allowed length.
 */
export function validateReason(reason: unknown): asserts reason is string {
  if (
    typeof reason !== 'string' ||
    reason.trim().length === 0 ||
    reason.length > MAX_REASON_LENGTH
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Reason must be a non-empty string of at most ${MAX_REASON_LENGTH} characters.`
    );
  }
}

/**
 * Sends a transactional email using Brevo's v3 SMTP API.
 * Uses native fetch (available in Node.js 18+) so no extra SDK is needed.
 */
export async function sendEmailViaBrevo(
  toEmail: string,
  toName: string,
  subject: string,
  htmlContent: string
) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    console.warn(
      'Brevo credentials (BREVO_API_KEY or BREVO_SENDER_EMAIL) are not set in the environment. Skipping email.'
    );
    return { success: false, error: 'Credentials not set' };
  }

  try {
    console.log(`Sending email to ${toEmail} using Brevo...`);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Lydo Compliance',
          email: senderEmail,
        },
        to: [{ email: toEmail, name: toName }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Brevo API returned error status ${response.status}:`, errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    console.log('Brevo email sent successfully:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to send email via Brevo:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Safely deletes a proof file from Cloud Storage.
 * Skips deletion if the path does not start with the expected prefix,
 * preventing an attacker-controlled path from deleting arbitrary files.
 */
export async function safeDeleteStorageFile(storagePath: unknown): Promise<void> {
  if (
    typeof storagePath !== 'string' ||
    !ALLOWED_STORAGE_PREFIXES.some((prefix) => storagePath.startsWith(prefix))
  ) {
    console.warn('Skipping storage deletion — path is missing or outside allowed prefix:', storagePath);
    return;
  }

  try {
    const bucket = admin.storage().bucket();
    await bucket.file(storagePath).delete();
  } catch (e) {
    console.error('Failed to delete storage file:', e);
  }
}
