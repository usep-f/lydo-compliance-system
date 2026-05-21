import { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import DashboardShell from '../components/layout/DashboardShell';
import UnifiedSubmissionForm from '../components/submissions/UnifiedSubmissionForm';
import ConfirmSubmissionModal from '../components/submissions/ConfirmSubmissionModal';
import UserSubmissionHistory from '../components/submissions/UserSubmissionHistory';
import { useSubmissions } from '../hooks/useSubmissions';
import type { SubmissionTypeDefinition } from '../constants/submissionTypes';
import type { PdfScreeningResult } from '../utils/pdfScreening';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const USER_SECTIONS = [
  { id: 'home', label: 'Home', isImplemented: true, icon: 'home' },
  { id: 'submissions', label: 'Submissions', isImplemented: true, icon: 'upload_file' },
  { id: 'history', label: 'History', isImplemented: true, icon: 'history' },
  { id: 'settings', label: 'User Settings', isImplemented: true, icon: 'settings' },
];

export default function UserDashboard() {
  const [activeSection, setActiveSection] = useState('home');
  const [userInfo, setUserInfo] = useState<{
    uid: string;
    barangay: string;
    fullName: string;
  } | null>(null);

  // Upload modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    documentType: SubmissionTypeDefinition;
    period: string;
    screening: PdfScreeningResult;
  } | null>(null);

  const currentYear = new Date().getFullYear();

  // Fetch user profile info
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserInfo({
              uid: user.uid,
              barangay: data.barangay || '',
              fullName: data.fullName || '',
            });
          }
        } catch (err) {
          console.error('Error loading user profile:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to this user's submissions
  const { approved } = useSubmissions(userInfo?.uid);

  const handleUploadSuccess = () => {
    setShowConfirmModal(false);
    setPendingUpload(null);
    // Switch to history tab to see the pending submission
    setActiveSection('history');
  };

  if (!userInfo) {
    return (
      <DashboardShell
        title="SK Dashboard"
        activeSection={activeSection}
        onSectionSelect={setActiveSection}
        sections={USER_SECTIONS}
      >
        <Card className="border-0 shadow-sm text-center p-5">
          <Card.Body className="py-5 text-muted">Loading your dashboard...</Card.Body>
        </Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="SK Dashboard"
      activeSection={activeSection}
      onSectionSelect={setActiveSection}
      sections={USER_SECTIONS}
    >
      {/* ====== HOME SECTION ====== */}
      {activeSection === 'home' && (
        <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5">
          <span className="material-symbols-outlined text-primary mb-3" style={{ fontSize: '64px' }}>
            construction
          </span>
          <h3 className="fw-bold mb-2">Welcome, {userInfo.fullName}!</h3>
          <p className="text-muted text-center" style={{ maxWidth: '400px' }}>
            The personalized dashboard overview for {userInfo.barangay} is currently under construction.
            <br /><br />
            Please navigate to the <strong>Submissions</strong> tab to upload your documents.
          </p>
        </div>
      )}

      {/* ====== SUBMISSIONS SECTION ====== */}
      {activeSection === 'submissions' && (
        <div className="mb-5">
          <UnifiedSubmissionForm 
            currentYear={currentYear}
            onSubmitReady={(payload) => {
              setPendingUpload(payload);
              setShowConfirmModal(true);
            }}
          />
        </div>
      )}

      {/* ====== HISTORY SECTION ====== */}
      {activeSection === 'history' && (
        <UserSubmissionHistory approved={approved} />
      )}

      {/* ====== SETTINGS SECTION ====== */}
      {activeSection === 'settings' && (
        <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5">
          <span className="material-symbols-outlined text-muted mb-3" style={{ fontSize: '64px' }}>
            settings_heart
          </span>
          <h4 className="fw-bold text-dark mb-2">User Settings</h4>
          <p className="text-muted text-center" style={{ maxWidth: '300px' }}>
            Account management and settings will be available in a future update.
          </p>
        </div>
      )}

      {/* Upload Confirmation Modal */}
      {pendingUpload && (
        <ConfirmSubmissionModal
          show={showConfirmModal}
          onHide={() => setShowConfirmModal(false)}
          onSuccess={handleUploadSuccess}
          file={pendingUpload.file}
          screening={pendingUpload.screening}
          documentType={pendingUpload.documentType}
          period={pendingUpload.period}
          year={currentYear}
          userId={userInfo.uid}
          barangay={userInfo.barangay}
          fullName={userInfo.fullName}
        />
      )}
    </DashboardShell>
  );
}
