import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';

// ---------------------------------------------------------------------------
// 1. Initialize Firebase Admin globally FIRST before module loads
// ---------------------------------------------------------------------------
admin.initializeApp();

// ---------------------------------------------------------------------------
// 2. Set global configurations targeting Singapore region
// ---------------------------------------------------------------------------
functions.setGlobalOptions({ region: 'asia-southeast1' });

// ---------------------------------------------------------------------------
// 3. Re-export Callable & Triggered Functions (Adhering to Flat Folder Model)
// ---------------------------------------------------------------------------

export { 
  checkEmailAvailability, 
  approveUser, 
  denyUser, 
  updateUser, 
  deleteUser,
  updateOwnProfile,
  deleteOwnAccount,
  onApplicationCreated 
} from './users';

export { 
  approveSubmission, 
  denySubmission, 
  onSubmissionCreated 
} from './submissions';

export { 
  pruneExpiredNotifications 
} from './notifications';

export {
  purgeSystemData
} from './maintenance';
