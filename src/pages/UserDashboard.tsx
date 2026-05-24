import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import DashboardShell from '../components/layout/DashboardShell';
import UnifiedSubmissionForm from '../components/submissions/UnifiedSubmissionForm';
import UserPendingSubmissions from '../components/submissions/UserPendingSubmissions';
import ConfirmSubmissionModal from '../components/submissions/ConfirmSubmissionModal';
import UserSubmissionHistory from '../components/submissions/UserSubmissionHistory';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { useSubmissions } from '../hooks/useSubmissions';
import { useUserAnalytics } from '../hooks/useUserAnalytics';
import { formatPeriodLabel } from '../utils/periodUtils';
import UserSettings from '../components/settings/UserSettings';
import type { SubmissionTypeDefinition } from '../constants/submissionTypes';
import type { PdfScreeningResult } from '../utils/pdfScreening';

// Register Chart.js modules needed for the doughnut
ChartJS.register(ArcElement, Tooltip, Legend);

// ---------------------------------------------------------------------------
// Section nav config
// ---------------------------------------------------------------------------
const USER_SECTIONS = [
  { id: 'home',        label: 'Home',          isImplemented: true, icon: 'home'        },
  { id: 'submissions', label: 'Submissions',   isImplemented: true, icon: 'upload_file' },
  { id: 'history',     label: 'History',       isImplemented: true, icon: 'history'     },
  { id: 'settings',    label: 'User Settings', isImplemented: true, icon: 'settings'    },
];

// ---------------------------------------------------------------------------
// Sub-component: MissingDocRow
// ---------------------------------------------------------------------------
interface MissingDocRowProps {
  label: string;
  period: string;
  isOverdue: boolean;
  onSubmit: () => void;
}
const MissingDocRow: React.FC<MissingDocRowProps> = ({ label, period, isOverdue, onSubmit }) => {
  const periodLabel = period === 'ASAP' ? 'ASAP' : formatPeriodLabel(period);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid #F4F4F5',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '18px',
            color: isOverdue ? '#EF4444' : '#F59E0B',
            fontVariationSettings: "'FILL' 1",
            flexShrink: 0,
          }}
        >
          {isOverdue ? 'error' : 'pending'}
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
              color: '#18181B',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '1px' }}>{periodLabel}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {isOverdue ? (
          <span className="matrix-chip matrix-chip-missing">Overdue</span>
        ) : (
          <span className="matrix-chip matrix-chip-pending">Due Soon</span>
        )}
        <button
          type="button"
          onClick={onSubmit}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: '#4F46E5',
            color: '#FFFFFF',
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#4338CA')}
          onMouseLeave={e => (e.currentTarget.style.background = '#4F46E5')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>upload_file</span>
          Submit
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
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

  // Real-time submissions for this barangay
  const { pending = [], history = [] } = useSubmissions(userInfo?.barangay);

  // Client-side analytics — zero extra Firestore reads
  const analytics = useUserAnalytics(pending, history, currentYear);



  const handleUploadSuccess = () => {
    setShowConfirmModal(false);
    setPendingUpload(null);
    setActiveSection('history');
  };

  // ── Section page header config ────────────────────────────────────────────
  const sectionHeaders: Record<string, { title: string; subtitle: string; icon?: string }> = {
    submissions: {
      title: 'Submit Documents',
      subtitle: `Upload required compliance documents for ${userInfo?.barangay || 'your barangay'}`,
      icon: 'upload_file',
    },
    history: {
      title: 'Submission History',
      subtitle: 'Your past approved and denied document submissions',
      icon: 'history',
    },
    settings: {
      title: 'User Settings',
      subtitle: 'Manage your account preferences and notifications',
      icon: 'settings',
    },
  };

  // ── Doughnut chart data ──────────────────────────────────────────────────
  const doughnutData = {
    labels: ['Approved', 'Pending Review', 'Denied'],
    datasets: [{
      data: [analytics.approvedCount, analytics.pendingCount, analytics.deniedCount],
      backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'],
      borderWidth: 0,
      cutout: '72%',
    }],
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: { boxWidth: 10, padding: 16, font: { size: 12, family: 'Inter' } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; raw: unknown }) =>
            `${ctx.label}: ${ctx.raw}`,
        },
      },
    },
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (!userInfo) {
    return (
      <DashboardShell
        title="SK Dashboard"
        activeSection={activeSection}
        onSectionSelect={setActiveSection}
        sections={USER_SECTIONS}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            gap: '12px',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '40px', color: '#C7D2FE', fontVariationSettings: "'FILL' 1" }}
          >
            hourglass_empty
          </span>
          <p style={{ fontSize: '14px', color: '#71717A', fontFamily: 'var(--font-body)', margin: 0 }}>
            Loading your dashboard…
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="SK Dashboard"
      activeSection={activeSection}
      onSectionSelect={setActiveSection}
      sections={USER_SECTIONS}
      pageHeader={sectionHeaders[activeSection]}
    >
      {/* ====== HOME SECTION ====== */}
      {activeSection === 'home' && (
        <div className="py-2">

          {/* Welcome Banner */}
          <div className="welcome-card mb-4">
            <div className="welcome-card-banner">
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.9)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#86EFAC', display: 'inline-block' }} />
                    SK Compliance Portal
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontSize: '26px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    margin: '0 0 8px',
                    lineHeight: 1.2,
                  }}
                >
                  Welcome back,<br />{userInfo.fullName}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
                    Barangay
                  </span>
                  <span
                    style={{
                      padding: '3px 12px',
                      borderRadius: '9999px',
                      background: 'rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                    }}
                  >
                    {userInfo.barangay}
                  </span>
                  {analytics.complianceRate === 100 ? (
                    <span className="sph-badge sph-badge-live" style={{ marginLeft: '4px' }}>
                      <span className="sph-live-dot" />
                      Fully Compliant
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: 'rgba(245, 158, 11, 0.25)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#FDE68A',
                      }}
                    >
                      {analytics.complianceRate}% Compliant
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Footer */}
            <div
              style={{
                background: '#FFFFFF',
                padding: '16px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                borderTop: '1px solid #F4F4F5',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveSection('history')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'transparent', color: '#4F46E5',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                  border: '1px solid #C7D2FE', cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#EEF2FF')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span>
                View History
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('submissions')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 18px', borderRadius: '8px',
                  background: '#4F46E5', color: '#FFFFFF',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#4338CA')}
                onMouseLeave={e => (e.currentTarget.style.background = '#4F46E5')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>upload_file</span>
                Submit a Document
              </button>
            </div>
          </div>

          {/* ── KPI Stat Cards ─────────────────────────────────────────── */}
          <Row className="mb-4 g-3">
            {[
              { title: 'Total Submitted',  value: analytics.totalSubmitted,  variant: 'primary' as const, icon: 'upload_file'    },
              { title: 'Pending Review',   value: analytics.pendingCount,     variant: 'warning' as const, icon: 'pending_actions' },
              { title: 'Approved',         value: analytics.approvedCount,    variant: 'success' as const, icon: 'task_alt'        },
              { title: 'Denied',           value: analytics.deniedCount,      variant: 'danger'  as const, icon: 'cancel'          },
            ].map((card, i) => (
              <Col md={3} sm={6} key={card.title} className="kpi-animate" style={{ animationDelay: `${i * 75}ms` }}>
                <StatCard
                  title={card.title}
                  value={card.value}
                  variant={card.variant}
                  icon={card.icon}
                />
              </Col>
            ))}
          </Row>

          {/* ── Doughnut + Missing Documents ───────────────────────────── */}
          <Row className="mb-4 g-3">
            {/* Doughnut — Submission Status Distribution */}
            <Col md={4}>
              <div className="analytics-card h-100" style={{ background: '#fff' }}>
                <div className="chart-card-header chart-header-primary">
                  <p className="chart-card-title">
                    <span
                      className="material-symbols-outlined icon-primary"
                      style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                    >
                      donut_large
                    </span>
                    Submission Status
                  </p>
                  <p className="chart-card-subtitle">Distribution of all submissions</p>
                </div>
                <div className="p-4">
                  {analytics.totalSubmitted === 0 ? (
                    <div
                      style={{
                        height: '220px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        color: '#A1A1AA',
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '40px', color: '#D4D4D8' }}
                      >
                        insert_chart
                      </span>
                      <p style={{ fontSize: '13px', margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                        No submissions yet.<br />Start by submitting a document.
                      </p>
                    </div>
                  ) : (
                    <div style={{ height: '220px', position: 'relative' }}>
                      <Doughnut data={doughnutData} options={doughnutOptions} />
                      {/* Centre label */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '40%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-headline)',
                            fontSize: '28px',
                            fontWeight: 800,
                            color: '#18181B',
                            lineHeight: 1,
                          }}
                        >
                          {analytics.complianceRate}%
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: '#71717A',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            textTransform: 'uppercase',
                            marginTop: '3px',
                          }}
                        >
                          Compliant
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Col>

            {/* Missing Documents */}
            <Col md={8}>
              <div className="analytics-card h-100" style={{ background: '#fff' }}>
                <div className="chart-card-header chart-header-danger">
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <div>
                      <p className="chart-card-title">
                        <span
                          className="material-symbols-outlined icon-danger"
                          style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                        >
                          warning
                        </span>
                        Missing Documents
                      </p>
                      <p className="chart-card-subtitle">
                        {analytics.missingDocs.length === 0
                          ? 'All required documents are submitted!'
                          : `${analytics.missingDocs.length} document${analytics.missingDocs.length !== 1 ? 's' : ''} still needed`}
                      </p>
                    </div>
                    {analytics.missingDocs.length > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '28px',
                          height: '28px',
                          borderRadius: '9999px',
                          background: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          fontSize: '13px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {analytics.missingDocs.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-4 pt-2 pb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {analytics.missingDocs.length === 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '32px 0',
                        gap: '10px',
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '44px', color: '#86EFAC', fontVariationSettings: "'FILL' 1" }}
                      >
                        verified
                      </span>
                      <p
                        style={{
                          fontFamily: 'var(--font-headline)',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#16A34A',
                          margin: 0,
                        }}
                      >
                        Fully Compliant!
                      </p>
                      <p style={{ fontSize: '13px', color: '#71717A', margin: 0, textAlign: 'center' }}>
                        All required documents for this period have been submitted.
                      </p>
                    </div>
                  ) : (
                    analytics.missingDocs.map((doc) => (
                      <MissingDocRow
                        key={`${doc.id}-${doc.period}`}
                        label={doc.label}
                        period={doc.period}
                        isOverdue={doc.isOverdue}
                        onSubmit={() => setActiveSection('submissions')}
                      />
                    ))
                  )}
                </div>
              </div>
            </Col>
          </Row>

          {/* ── Recent Activity ─────────────────────────────────────────── */}
          <div className="analytics-card" style={{ background: '#fff' }}>
            <div className="chart-card-header chart-header-info">
              <p className="chart-card-title">
                <span
                  className="material-symbols-outlined icon-info"
                  style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                >
                  history
                </span>
                Recent Activity
              </p>
              <p className="chart-card-subtitle">Your last {Math.min(5, analytics.recentActivity.length)} submission actions</p>
            </div>

            <div className="px-4 py-2">
              {analytics.recentActivity.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '28px 0',
                    gap: '8px',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '36px', color: '#D4D4D8' }}
                  >
                    inbox
                  </span>
                  <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0, fontFamily: 'var(--font-body)' }}>
                    No submissions yet. Your activity will appear here.
                  </p>
                </div>
              ) : (
                analytics.recentActivity.map((item, idx) => {
                  const periodLabel = item.period === 'ASAP' ? 'ASAP' : item.period ? formatPeriodLabel(item.period) : '—';
                  const dateStr = item.date
                    ? item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '12px 0',
                        borderBottom: idx < analytics.recentActivity.length - 1 ? '1px solid #F4F4F5' : 'none',
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '9px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background:
                            item.status === 'approved' ? '#F0FDF4' :
                            item.status === 'denied'   ? '#FEF2F2' :
                                                         '#FFF7ED',
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: '18px',
                            fontVariationSettings: "'FILL' 1",
                            color:
                              item.status === 'approved' ? '#16A34A' :
                              item.status === 'denied'   ? '#DC2626' :
                                                           '#D97706',
                          }}
                        >
                          {item.status === 'approved' ? 'check_circle' :
                           item.status === 'denied'   ? 'cancel'       :
                                                        'pending'}
                        </span>
                      </div>

                      {/* Label + Period */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#18181B',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.documentLabel}
                        </div>
                        <div style={{ fontSize: '11px', color: '#71717A', marginTop: '1px' }}>
                          {periodLabel}
                        </div>
                      </div>

                      {/* Date */}
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#A1A1AA',
                          fontFamily: 'var(--font-body)',
                          flexShrink: 0,
                          display: 'none',
                        }}
                        className="d-none d-sm-block"
                      >
                        {dateStr}
                      </div>

                      {/* Status badge */}
                      <div style={{ flexShrink: 0 }}>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {history.length > 5 && (
              <div
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid #F4F4F5',
                  textAlign: 'right',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveSection('history')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4F46E5',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  View all {history.length} submissions
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== SUBMISSIONS SECTION ====== */}
      {activeSection === 'submissions' && (
        <div className="mb-5">
          <UnifiedSubmissionForm
            currentYear={currentYear}
            existingSubmissions={[...pending, ...history]}
            onSubmitReady={(payload) => {
              setPendingUpload(payload);
              setShowConfirmModal(true);
            }}
          />
          <UserPendingSubmissions pending={pending} />
        </div>
      )}

      {/* ====== HISTORY SECTION ====== */}
      {activeSection === 'history' && (
        <UserSubmissionHistory history={history} />
      )}

      {/* ====== SETTINGS SECTION ====== */}
      {activeSection === 'settings' && (
        <UserSettings />
      )}

      {/* ── Upload Confirmation Modal ─────────────────────────────────── */}
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
