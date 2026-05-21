import { useState, useEffect } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import DashboardShell from '../components/layout/DashboardShell';
import StatCard from '../components/common/StatCard';
import SubmissionCard from '../components/submissions/SubmissionCard';
import type { SubmissionStatus } from '../components/submissions/SubmissionCard';
import FileUploadModal from '../components/submissions/FileUploadModal';
import { useSubmissions } from '../hooks/useSubmissions';
import {
  SCHEDULED_TYPES,
  ASAP_TYPES,
  PERENNIAL_TYPES,
  ALL_UPLOAD_TYPES,
} from '../constants/submissionTypes';
import type { SubmissionTypeDefinition, PendingSubmission, ApprovedSubmission } from '../constants/submissionTypes';
import {
  getCurrentPeriod,
  getElapsedPeriods,
  getSubmittablePeriods,
  formatPeriodLabel,
} from '../utils/periodUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Determine the status for a given document type + period based on submissions. */
function getSubmissionStatus(
  docType: string,
  period: string,
  pending: PendingSubmission[],
  approved: ApprovedSubmission[]
): SubmissionStatus {
  // Check if there's an approved submission for this doc+period
  const isApproved = approved.some(
    (s) => s.documentType === docType && s.period === period
  );
  if (isApproved) return 'approved';

  // Check if there's a pending submission for this doc+period
  const isPending = pending.some(
    (s) => s.documentType === docType && s.period === period
  );
  if (isPending) return 'pending';

  return 'not_submitted';
}

/** Build past submission history for a scheduled doc type. */
function buildPastSubmissions(
  docType: string,
  currentPeriod: string,
  frequency: 'monthly' | 'quarterly' | 'semestral',
  year: number,
  pending: PendingSubmission[],
  approved: ApprovedSubmission[]
) {
  const submittable = getSubmittablePeriods(frequency, year);
  // Exclude the current period from "past"
  const pastPeriods = submittable.filter((p) => p !== currentPeriod);

  return pastPeriods
    .map((period) => {
      const status = getSubmissionStatus(docType, period, pending, approved);
      if (status === 'not_submitted') return null;
      const sub = approved.find((s) => s.documentType === docType && s.period === period);
      const date = sub?.approvedAt?.toDate
        ? sub.approvedAt.toDate().toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : undefined;
      return { period, status: status as 'pending' | 'approved', date };
    })
    .filter(Boolean) as { period: string; status: 'pending' | 'approved'; date?: string }[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UserDashboard() {
  const [activeSection, setActiveSection] = useState('home');
  const [userInfo, setUserInfo] = useState<{
    uid: string;
    barangay: string;
    fullName: string;
  } | null>(null);

  // Upload modal state
  const [uploadModal, setUploadModal] = useState<{
    show: boolean;
    docType: SubmissionTypeDefinition | null;
    period: string;
  }>({ show: false, docType: null, period: '' });

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
  const { pending, approved, loading } = useSubmissions(userInfo?.uid);

  // Compute compliance stats
  const scheduledApproved = SCHEDULED_TYPES.reduce((count, dt) => {
    const freq = dt.frequency!;
    const elapsed = getElapsedPeriods(freq, currentYear);
    return (
      count +
      elapsed.filter((p) =>
        approved.some((s) => s.documentType === dt.id && s.period === p)
      ).length
    );
  }, 0);

  const scheduledTotal = SCHEDULED_TYPES.reduce((count, dt) => {
    const freq = dt.frequency!;
    return count + getElapsedPeriods(freq, currentYear).length;
  }, 0);

  const asapApproved = ASAP_TYPES.filter((dt) =>
    approved.some((s) => s.documentType === dt.id)
  ).length;

  const asapPending = ASAP_TYPES.filter((dt) =>
    pending.some((s) => s.documentType === dt.id)
  ).length;

  // Open upload modal
  const openUpload = (docType: SubmissionTypeDefinition) => {
    let period: string;
    if (docType.category === 'asap') {
      period = 'ASAP';
    } else if (docType.category === 'perennial') {
      period = currentYear.toString();
    } else {
      period = getCurrentPeriod(docType.frequency!);
    }
    setUploadModal({ show: true, docType, period });
  };

  const closeUpload = () => {
    setUploadModal({ show: false, docType: null, period: '' });
  };

  if (!userInfo) {
    return (
      <DashboardShell
        title="SK Dashboard"
        activeSection={activeSection}
        onSectionSelect={setActiveSection}
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
    >
      {/* ====== HOME SECTION ====== */}
      {activeSection === 'home' && (
        <>
          <div className="mb-4">
            <h2 className="fw-bold mb-1">Welcome, {userInfo.fullName}!</h2>
            <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
              {userInfo.barangay} • {currentYear} Compliance Overview
            </p>
          </div>

          <Row className="mb-4 g-3">
            <Col md={4}>
              <StatCard
                title="Scheduled Compliance"
                value={
                  scheduledTotal > 0
                    ? `${scheduledApproved} / ${scheduledTotal}`
                    : 'N/A'
                }
                variant={
                  scheduledTotal > 0 && scheduledApproved === scheduledTotal
                    ? 'success'
                    : scheduledApproved > 0
                    ? 'warning'
                    : 'danger'
                }
              />
            </Col>
            <Col md={4}>
              <StatCard
                title="ASAP Documents"
                value={`${asapApproved} / 3`}
                variant={asapApproved === 3 ? 'success' : asapApproved > 0 ? 'warning' : 'info'}
              />
            </Col>
            <Col md={4}>
              <StatCard
                title="Pending Review"
                value={pending.length + asapPending}
                variant={pending.length > 0 ? 'warning' : 'primary'}
              />
            </Col>
          </Row>

          {/* Quick overview of what needs attention */}
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3" style={{ fontFamily: 'var(--font-headline)' }}>
                <span className="material-symbols-outlined me-2 text-primary" style={{ verticalAlign: 'middle' }}>
                  notifications_active
                </span>
                What Needs Your Attention
              </h5>
              <div className="d-flex flex-column gap-2">
                {ALL_UPLOAD_TYPES.map((dt) => {
                  const period = dt.category === 'asap' ? 'ASAP' : getCurrentPeriod(dt.frequency!);
                  const status = getSubmissionStatus(dt.id, period, pending, approved);
                  if (status !== 'not_submitted') return null;
                  return (
                    <div
                      key={dt.id}
                      className="d-flex align-items-center justify-content-between bg-light rounded-3 px-3 py-2"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span className="material-symbols-outlined text-warning" style={{ fontSize: '18px' }}>
                          warning
                        </span>
                        <span style={{ fontSize: '13px' }}>
                          <strong>{dt.label}</strong>
                          {dt.category !== 'asap' && (
                            <span className="text-muted"> — {formatPeriodLabel(period)}</span>
                          )}
                        </span>
                      </div>
                      <button
                        className="btn btn-sm btn-primary py-0 px-2"
                        style={{ fontSize: '12px', height: '28px' }}
                        onClick={() => openUpload(dt)}
                      >
                        Upload
                      </button>
                    </div>
                  );
                })}
                {ALL_UPLOAD_TYPES.every((dt) => {
                  const period = dt.category === 'asap' ? 'ASAP' : getCurrentPeriod(dt.frequency!);
                  return getSubmissionStatus(dt.id, period, pending, approved) !== 'not_submitted';
                }) && (
                  <div className="text-center text-success py-3">
                    <span className="material-symbols-outlined mb-1" style={{ fontSize: '28px' }}>
                      check_circle
                    </span>
                    <div className="fw-semibold" style={{ fontSize: '14px' }}>
                      All current submissions are up to date!
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      {/* ====== SUBMISSIONS SECTION ====== */}
      {activeSection === 'submissions' && (
        <>
          {/* Scheduled Documents */}
          <div className="mb-4">
            <h4 className="fw-bold mb-1">
              <span className="material-symbols-outlined me-2 text-primary" style={{ verticalAlign: 'middle' }}>
                event_note
              </span>
              Scheduled Submissions
            </h4>
            <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
              Documents with recurring deadlines (Monthly, Quarterly, Semestral)
            </p>
          </div>

          <Row className="g-3 mb-5">
            {SCHEDULED_TYPES.map((dt) => {
              const currentP = getCurrentPeriod(dt.frequency!);
              const status = getSubmissionStatus(dt.id, currentP, pending, approved);
              const pastSubs = buildPastSubmissions(
                dt.id,
                currentP,
                dt.frequency! as 'monthly' | 'quarterly' | 'semestral',
                currentYear,
                pending,
                approved
              );
              return (
                <Col md={4} key={dt.id}>
                  <SubmissionCard
                    documentType={dt}
                    currentPeriod={currentP}
                    status={status}
                    onUpload={() => openUpload(dt)}
                    pastSubmissions={pastSubs}
                    disabled={loading}
                  />
                </Col>
              );
            })}
          </Row>

          {/* ASAP Documents */}
          <div className="mb-4">
            <h4 className="fw-bold mb-1">
              <span className="material-symbols-outlined me-2 text-warning" style={{ verticalAlign: 'middle' }}>
                bolt
              </span>
              ASAP Required Documents
            </h4>
            <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
              Submit as soon as possible — no specific deadline
            </p>
          </div>

          <Row className="g-3">
            {ASAP_TYPES.map((dt) => {
              const status = getSubmissionStatus(dt.id, 'ASAP', pending, approved);
              return (
                <Col md={4} key={dt.id}>
                  <SubmissionCard
                    documentType={dt}
                    status={status}
                    onUpload={() => openUpload(dt)}
                    disabled={loading}
                  />
                </Col>
              );
            })}
          </Row>
        </>
      )}

      {/* ====== PERENNIAL DOCUMENTS SECTION ====== */}
      {activeSection === 'year-end' && (
        <>
          <div className="mb-4">
            <h4 className="fw-bold mb-1">
              <span className="material-symbols-outlined me-2 text-primary" style={{ verticalAlign: 'middle' }}>
                analytics
              </span>
              Perennial Documents ({currentYear})
            </h4>
            <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
              Upload resolutions and accomplishment reports individually as they are completed.
            </p>
          </div>

          <Row className="g-3">
            {PERENNIAL_TYPES.map((dt) => {
              // Count how many are approved vs pending for this specific type
              const typeApproved = approved.filter((s) => s.documentType === dt.id).length;
              const typePending = pending.filter((s) => s.documentType === dt.id).length;

              return (
                <Col md={6} lg={4} key={dt.id}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body className="p-4 d-flex flex-column">
                      <div className="d-flex align-items-start gap-3 mb-3">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center bg-primary bg-opacity-10"
                          style={{ width: '48px', height: '48px', flexShrink: 0 }}
                        >
                          <span className="material-symbols-outlined text-primary fs-4">
                            {dt.icon}
                          </span>
                        </div>
                        <div>
                          <h6 className="fw-bold mb-1 text-dark" style={{ lineHeight: '1.4' }}>
                            {dt.label}
                          </h6>
                          <div className="text-muted" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                            {dt.description}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-3 border-top">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="text-center">
                            <div className="fw-bold text-success" style={{ fontSize: '18px' }}>{typeApproved}</div>
                            <div className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved</div>
                          </div>
                          <div className="text-center">
                            <div className="fw-bold text-warning" style={{ fontSize: '18px' }}>{typePending}</div>
                            <div className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</div>
                          </div>
                        </div>
                        <button
                          className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2 fw-semibold"
                          onClick={() => openUpload(dt)}
                          disabled={loading}
                        >
                          <span className="material-symbols-outlined fs-5">upload</span>
                          Upload Document
                        </button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      )}

      {/* Upload Modal */}
      {uploadModal.docType && (
        <FileUploadModal
          show={uploadModal.show}
          onHide={closeUpload}
          documentType={uploadModal.docType}
          period={uploadModal.period}
          year={currentYear}
          userId={userInfo.uid}
          barangay={userInfo.barangay}
          fullName={userInfo.fullName}
        />
      )}
    </DashboardShell>
  );
}
