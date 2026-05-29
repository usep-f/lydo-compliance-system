import { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Card, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { db, storage, functions } from '../firebase';
import { collection, onSnapshot, query, Timestamp, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, getDownloadURL } from 'firebase/storage';
import { BARANGAYS } from '../constants/barangays';
import DashboardShell from '../components/layout/DashboardShell';
import StatCard from '../components/common/StatCard';
import FormField from '../components/common/FormField';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { DataTable } from '../components/common/DataTable';
import type { Column } from '../components/common/DataTable';
import { useToast } from '../context/ToastContext';
import AdminSubmissionsSection from '../components/submissions/AdminSubmissionsSection';
import AdminSubmissionHistory from '../components/submissions/AdminSubmissionHistory';
import AdminAnalyticsSection from '../components/analytics/AdminAnalyticsSection';
import ComplianceMatrix from '../components/analytics/ComplianceMatrix';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useSubmissions } from '../hooks/useSubmissions';
import { useComplianceData } from '../hooks/useComplianceData';
import { formatPeriodLabel } from '../utils/periodUtils';

// Register Chart.js modules needed for the doughnut
ChartJS.register(ArcElement, ChartTooltip, ChartLegend);

interface PendingUser {
  id: string;
  fullName: string;
  email: string;
  barangay: string;
  proofStoragePath: string;
  submittedAt: Timestamp;
}

interface ApprovedUser {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  barangay: string;
  role: string;
  approvedAt: Timestamp;
}

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('home');
  const [submissionsSearch, setSubmissionsSearch] = useState('');
  const [submissionsBarangay, setSubmissionsBarangay] = useState('');

  const currentYear = new Date().getFullYear();
  const { pending: pendingSubs = [], history: historySubs = [], loadingHistory, fetchHistory } = useSubmissions(undefined, true);
  const approvedSubs = useMemo(
    () => historySubs.filter((s) => s.status === 'approved' || (!s.status && s.approvedAt)),
    [historySubs]
  );
  const compliance = useComplianceData(currentYear, pendingSubs, approvedSubs, BARANGAYS);

  useEffect(() => {
    if (activeSection === 'home' || activeSection === 'history' || activeSection === 'analytics' || activeSection === 'submissions' || activeSection === 'matrix') {
      fetchHistory();
    }
  }, [activeSection, fetchHistory]);
  
  // ── Recent Submissions Feed Helper ─────────────────────────────────────────
  const recentSubmissionsFeed = useMemo(() => {
    const all = [...pendingSubs, ...historySubs];
    return all.sort((a, b) => {
      const timeA = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : new Date(a.submittedAt as unknown as string | number).getTime();
      const timeB = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : new Date(b.submittedAt as unknown as string | number).getTime();
      return timeB - timeA;
    });
  }, [pendingSubs, historySubs]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBarangay, setFilterBarangay] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterBarangay, setUserFilterBarangay] = useState('');
  
  const [selectedApp, setSelectedApp] = useState<PendingUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showDenyPrompt, setShowDenyPrompt] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDenyConfirm, setShowDenyConfirm] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [proofUrl, setProofUrl] = useState<string>('');

  // ---- User management state ----
  const [selectedUser, setSelectedUser] = useState<ApprovedUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUserProcessing, setIsUserProcessing] = useState(false);
  const [editForm, setEditForm] = useState({ email: '', password: '', fullName: '', barangay: '' });
  
  const { addToast } = useToast();



  const fetchApprovedUsers = useCallback(async () => {
    try {
      const qApproved = query(collection(db, 'users'));
      const snapshot = await getDocs(qApproved);
      const users: ApprovedUser[] = [];
      snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() } as ApprovedUser);
      });
      users.sort((a, b) => {
        const timeA = a.approvedAt?.toMillis() || 0;
        const timeB = b.approvedAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setApprovedUsers(users);
      setApprovedCount(users.length);
    } catch (err) {
      console.error("Error loading approved users:", err);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'users' || activeSection === 'applicants') {
      let active = true;
      Promise.resolve().then(() => {
        if (active) fetchApprovedUsers();
      });
      return () => {
        active = false;
      };
    }
  }, [activeSection, fetchApprovedUsers]);

  useEffect(() => {
    const qPending = query(collection(db, 'pending_users'));
    const unsubPending = onSnapshot(qPending, (snapshot) => {
      const users: PendingUser[] = [];
      snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() } as PendingUser);
      });
      users.sort((a, b) => {
        const timeA = a.submittedAt?.toMillis() || 0;
        const timeB = b.submittedAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setPendingUsers(users);
    });

    return () => {
      unsubPending();
    };
  }, []);

  const openReviewModal = (user: PendingUser) => {
    setSelectedApp(user);
    setShowModal(true);
    setShowDenyPrompt(false);
    setDenyReason('');

    if (user.proofStoragePath) {
      setProofUrl('');
      const storageRef = ref(storage, user.proofStoragePath);
      getDownloadURL(storageRef)
        .then(url => setProofUrl(url))
        .catch(err => console.error("Error loading proof URL:", err));
    } else {
      setProofUrl('');
    }
  };

  const closeReviewModal = () => {
    if (isProcessing) return;
    setShowModal(false);
    setSelectedApp(null);
    setShowDenyPrompt(false);
    setShowApproveConfirm(false);
    setShowDenyConfirm(false);
    setDenyReason('');
    setProofUrl('');
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setIsProcessing(true);
    try {
      const approveUserFn = httpsCallable(functions, 'approveUser');
      await approveUserFn({ applicationId: selectedApp.id });
      addToast('User approved successfully! A setup email has been sent.', 'success');
      await fetchApprovedUsers();
      setShowApproveConfirm(false);
      setShowModal(false);
      setSelectedApp(null);
    } catch (error: unknown) {
      console.error(error);
      addToast(`Approval failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedApp) return;
    if (!denyReason.trim()) {
      addToast('Please provide a reason for rejection.', 'warning');
      return;
    }
    setIsProcessing(true);
    try {
      const denyUserFn = httpsCallable(functions, 'denyUser');
      await denyUserFn({ applicationId: selectedApp.id, reason: denyReason });
      addToast('Application denied and notification sent.', 'info');
      setShowDenyConfirm(false);
      setShowModal(false);
      setSelectedApp(null);
      setShowDenyPrompt(false);
      setDenyReason('');
    } catch (error: unknown) {
      console.error(error);
      addToast(`Denial failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = pendingUsers.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBarangay = filterBarangay === '' || u.barangay === filterBarangay;
    return matchesSearch && matchesBarangay;
  });

  const columns: Column<PendingUser>[] = [
    {
      header: 'Applicant Name',
      accessor: 'fullName',
      className: 'fw-bold'
    },
    {
      header: 'Email Address',
      accessor: 'email',
      className: 'text-muted'
    },
    {
      header: 'Barangay',
      accessor: 'barangay'
    },

    {
      header: 'Action',
      className: 'text-end',
      render: (user) => (
        <Button variant="primary" size="sm" onClick={() => openReviewModal(user)}>
          Review Application
        </Button>
      )
    }
  ];

  const filteredApprovedUsers = approvedUsers.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesBarangay = userFilterBarangay === '' || u.barangay === userFilterBarangay;
    return matchesSearch && matchesBarangay;
  });

  // ---- User management handlers ----
  const openEditModal = (user: ApprovedUser) => {
    setSelectedUser(user);
    setEditForm({ email: user.email, password: '', fullName: user.fullName, barangay: user.barangay });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (isUserProcessing) return;
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const openDeleteConfirm = (user: ApprovedUser) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (isUserProcessing) return;
    setShowDeleteConfirm(false);
    setSelectedUser(null);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setIsUserProcessing(true);
    try {
      const updateUserFn = httpsCallable(functions, 'updateUser');
      await updateUserFn({
        uid: selectedUser.uid,
        email: editForm.email !== selectedUser.email ? editForm.email : undefined,
        password: editForm.password.trim() !== '' ? editForm.password : undefined,
        fullName: editForm.fullName !== selectedUser.fullName ? editForm.fullName : undefined,
        barangay: editForm.barangay !== selectedUser.barangay ? editForm.barangay : undefined,
      });
      addToast('User updated successfully.', 'success');
      await fetchApprovedUsers();
      setShowEditConfirm(false);
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error: unknown) {
      console.error(error);
      addToast(`Update failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsUserProcessing(false);
    }
  };

  /** Builds a human-readable list of what the admin is about to change. */
  const getChangedFields = () => {
    if (!selectedUser) return [];
    const changes: { label: string; from?: string; to: string; sensitive?: boolean }[] = [];
    if (editForm.fullName !== selectedUser.fullName)
      changes.push({ label: 'Full Name', from: selectedUser.fullName, to: editForm.fullName });
    if (editForm.barangay !== selectedUser.barangay)
      changes.push({ label: 'Barangay', from: selectedUser.barangay, to: editForm.barangay });
    if (editForm.email !== selectedUser.email)
      changes.push({ label: 'Email', from: selectedUser.email, to: editForm.email, sensitive: true });
    if (editForm.password.trim() !== '')
      changes.push({ label: 'Password', to: '(new password set)', sensitive: true });
    return changes;
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsUserProcessing(true);
    try {
      const deleteUserFn = httpsCallable(functions, 'deleteUser');
      await deleteUserFn({ uid: selectedUser.uid });
      addToast('User deleted successfully.', 'success');
      await fetchApprovedUsers();
      closeDeleteConfirm();
    } catch (error: unknown) {
      console.error(error);
      addToast(`Deletion failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsUserProcessing(false);
    }
  };

  const approvedColumns: Column<ApprovedUser>[] = [
    {
      header: 'Full Name',
      accessor: 'fullName',
      className: 'fw-bold'
    },
    {
      header: 'Email Address',
      accessor: 'email',
      className: 'text-muted'
    },
    {
      header: 'Barangay',
      accessor: 'barangay'
    },
    {
      header: 'Role',
      render: (user) => (
        <span className="badge bg-info text-dark text-capitalize">
          {user.role === 'admin' ? 'Admin' : 'SK Official'}
        </span>
      )
    },
    {
      header: 'Date Approved',
      render: (user) => {
        if (!user.approvedAt) return 'N/A';
        const date = user.approvedAt.toDate ? user.approvedAt.toDate() : new Date(user.approvedAt as unknown as string | number);
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },
    {
      header: 'Actions',
      className: 'text-end',
      render: (user) => {
        const isAdmin = user.role === 'admin';
        return (
          <div className="d-flex gap-2 justify-content-end">
            <Button
              variant={isAdmin ? 'outline-secondary' : 'outline-primary'}
              size="sm"
              disabled={isAdmin}
              title={isAdmin ? 'Admin accounts cannot be edited' : 'Edit user'}
              onClick={() => openEditModal(user)}
            >
              Edit
            </Button>
            <Button
              variant={isAdmin ? 'outline-secondary' : 'outline-danger'}
              size="sm"
              disabled={isAdmin}
              title={isAdmin ? 'Admin accounts cannot be deleted' : 'Delete user'}
              onClick={() => openDeleteConfirm(user)}
            >
              Delete
            </Button>
          </div>
        );
      }
    }
  ];

  // ── Section page header config ──
  const sectionHeaders: Record<string, { title: string; subtitle: string; icon?: string }> = {
    home: {
      title: 'Compliance Control Center',
      subtitle: 'System-wide compliance rates, pending actions, and recent activity overview',
      icon: 'home',
    },
    applicants: {
      title: 'Pending Applications',
      subtitle: 'Review and manage incoming SK Official registration requests',
      icon: 'badge',
    },
    users: {
      title: 'Registered SK Officials',
      subtitle: 'Manage approved accounts, edit details, and control access',
      icon: 'group',
    },
    submissions: {
      title: 'Submission Review',
      subtitle: 'Review, approve, or deny document submissions from barangays',
      icon: 'description',
    },
    history: {
      title: 'Submission History',
      subtitle: 'Browse the full archive of all processed document submissions',
      icon: 'history',
    },
    analytics: {
      title: 'Compliance Analytics',
      subtitle: 'Real-time overview of barangay compliance across all document types',
      icon: 'bar_chart',
    },
    matrix: {
      title: 'Compliance Matrix',
      subtitle: 'Detailed Barangay × Period submission status across all document types',
      icon: 'grid_on',
    },
  };

  return (
    <DashboardShell
      title="LYDO Admin Portal"
      activeSection={activeSection}
      onSectionSelect={setActiveSection}
      pageHeader={sectionHeaders[activeSection]}
    >
      {activeSection === 'home' ? (
        <div className="py-2">
          {/* Welcome Banner */}
          <div className="welcome-card mb-4">
            <div className="welcome-card-banner" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
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
                      textTransform: 'uppercase',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#86EFAC', display: 'inline-block' }} />
                    LYDO Administrator Portal
                  </span>
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontSize: '26px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    margin: '0 0 8px',
                    lineHeight: 1.2,
                  }}
                >
                  Compliance Control Center
                </h2>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: '0 0 16px' }}>
                  Real-time compliance monitoring across all barangays. Take quick actions on submissions and applicants.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
                    System Status
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
                    {compliance.overallRate}% Compliance Rate
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
                    {compliance.fullyCompliantCount} Fully Compliant
                  </span>
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
                onClick={() => {
                  setSubmissionsSearch('');
                  setSubmissionsBarangay('');
                  setActiveSection('submissions');
                }}
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
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
                Review Submissions ({pendingSubs.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setActiveSection('applicants');
                }}
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
                <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>badge</span>
                Review Applications ({pendingUsers.length})
              </button>
            </div>
          </div>

          {/* KPI Row */}
          <Row className="mb-4 g-3">
            {[
              { title: 'Overall Compliance', value: `${compliance.overallRate}%`, variant: 'primary' as const, icon: 'check_circle' },
              { title: 'Fully Compliant', value: `${compliance.fullyCompliantCount} / ${compliance.totalBarangays}`, variant: 'success' as const, icon: 'verified' },
              { title: 'Pending Submissions', value: pendingSubs.length, variant: 'warning' as const, icon: 'pending_actions' },
              { title: 'Pending Applications', value: pendingUsers.length, variant: 'info' as const, icon: 'badge' },
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

          {/* Middle Analytics Row */}
          <Row className="mb-4 g-3">
            {/* Doughnut Chart */}
            <Col md={4}>
              <div className="analytics-card h-100" style={{ background: '#fff' }}>
                <div className="chart-card-header chart-header-primary">
                  <p className="chart-card-title">
                    <span className="material-symbols-outlined icon-primary" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                      donut_large
                    </span>
                    Compliance Status
                  </p>
                  <p className="chart-card-subtitle">Distribution of all required documents</p>
                </div>
                <div className="p-4 d-flex align-items-center justify-content-center">
                  <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                    <Doughnut
                      data={{
                        labels: ['Approved', 'Pending Review', 'Missing/Overdue'],
                        datasets: [{
                          data: [
                            compliance.overallRate,
                            Math.round((pendingSubs.length / Math.max(1, compliance.barangayRanking.reduce((s, b) => s + b.expected, 0))) * 100),
                            Math.max(0, 100 - compliance.overallRate - Math.round((pendingSubs.length / Math.max(1, compliance.barangayRanking.reduce((s, b) => s + b.expected, 0))) * 100)),
                          ],
                          backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'],
                          borderWidth: 0,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '72%',
                        plugins: {
                          legend: {
                            display: true,
                            position: 'bottom',
                            labels: { boxWidth: 10, padding: 12, font: { size: 11, family: 'Inter' } },
                          },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.label}: ${ctx.raw}%`,
                            },
                          },
                        },
                      }}
                    />
                    {/* Centered label */}
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
                      <div style={{ fontFamily: 'var(--font-headline)', fontSize: '28px', fontWeight: 800, color: '#18181B', lineHeight: 1 }}>
                        {compliance.overallRate}%
                      </div>
                      <div style={{ fontSize: '10px', color: '#71717A', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: '3px' }}>
                        Compliant
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Pending Registration Requests (Styled like Missing Documents) */}
            <Col md={8}>
              <div className="analytics-card h-100" style={{ background: '#fff' }}>
                <div className="chart-card-header chart-header-info">
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <div>
                      <p className="chart-card-title">
                        <span className="material-symbols-outlined icon-info" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                          badge
                        </span>
                        Pending Registration Requests
                      </p>
                      <p className="chart-card-subtitle">
                        {pendingUsers.length === 0
                          ? 'All registration requests have been reviewed'
                          : `${pendingUsers.length} account${pendingUsers.length !== 1 ? 's' : ''} awaiting approval`}
                      </p>
                    </div>
                    {pendingUsers.length > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '28px',
                          height: '28px',
                          borderRadius: '9999px',
                          background: '#E0E7FF',
                          color: '#4F46E5',
                          border: '1px solid #C7D2FE',
                          fontSize: '13px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {pendingUsers.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-4 pt-2 pb-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {pendingUsers.length === 0 ? (
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
                        style={{ fontSize: '44px', color: '#93C5FD', fontVariationSettings: "'FILL' 1" }}
                      >
                        verified_user
                      </span>
                      <p
                        style={{
                          fontFamily: 'var(--font-headline)',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#2563EB',
                          margin: 0,
                        }}
                      >
                        All Caught Up!
                      </p>
                      <p style={{ fontSize: '13px', color: '#71717A', margin: 0, textAlign: 'center' }}>
                        No pending registration requests to review.
                      </p>
                    </div>
                  ) : (
                    pendingUsers.map((user) => (
                      <div
                        key={user.id}
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
                              color: '#F59E0B',
                              fontVariationSettings: "'FILL' 1",
                              flexShrink: 0,
                            }}
                          >
                            pending
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
                              {user.fullName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#71717A', marginTop: '1px' }}>
                              {user.barangay} • {user.email}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span className="matrix-chip matrix-chip-pending">Pending</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm(user.fullName);
                              setActiveSection('applicants');
                            }}
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
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
                            Review
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Col>
          </Row>

          {/* Bottom Row - Recent Submissions Feed */}
          <Row className="mb-4 g-3">
            <Col md={12}>
              <div className="analytics-card" style={{ background: '#fff' }}>
                <div className="chart-card-header chart-header-info">
                  <p className="chart-card-title">
                    <span
                      className="material-symbols-outlined icon-info"
                      style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                    >
                      history
                    </span>
                    Recent Submissions Activity
                  </p>
                  <p className="chart-card-subtitle">Latest compliance updates across all barangays</p>
                </div>

                <div className="px-4 py-2">
                  {recentSubmissionsFeed.length === 0 ? (
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
                        No submissions yet. Activity will appear here.
                      </p>
                    </div>
                  ) : (
                    recentSubmissionsFeed.slice(0, 5).map((item, idx) => {
                      const periodLabel = item.period === 'ASAP' ? 'ASAP' : item.period ? formatPeriodLabel(item.period) : '—';
                      const dateStr = item.submittedAt
                        ? (item.submittedAt.toDate ? item.submittedAt.toDate() : new Date(item.submittedAt as unknown as string | number)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—';

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '12px 0',
                            borderBottom: idx < Math.min(5, recentSubmissionsFeed.length) - 1 ? '1px solid #F4F4F5' : 'none',
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
                              {item.barangay} • {periodLabel}
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

                          {/* Action Button */}
                          <div style={{ flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {item.status === 'pending' || !item.status ? (
                               <span className="matrix-chip matrix-chip-pending">Pending Review</span>
                            ) : item.status === 'approved' ? (
                               <span className="matrix-chip matrix-chip-compliant">Approved</span>
                            ) : (
                               <span className="matrix-chip matrix-chip-missing">Denied</span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSubmissionsSearch(item.documentLabel);
                                setSubmissionsBarangay(item.barangay);
                                setActiveSection(item.status && item.status !== 'pending' ? 'history' : 'submissions');
                              }}
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
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {recentSubmissionsFeed.length > 5 && (
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
                      View all {recentSubmissionsFeed.length} submissions
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                    </button>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </div>
      ) : activeSection === 'applicants' ? (
        <>
          <Row className="mb-4 g-3">
            <Col md={6} className="kpi-animate">
              <StatCard
                title="Pending Applications"
                value={pendingUsers.length}
                variant="warning"
                icon="pending_actions"
              />
            </Col>
            <Col md={6} className="kpi-animate" style={{ animationDelay: '75ms' }}>
              <StatCard
                title="Total Approved SK Officials"
                value={approvedCount}
                variant="success"
                icon="group_add"
              />
            </Col>
          </Row>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="d-flex flex-wrap gap-3">
              <Form.Control 
                type="text" 
                placeholder="Search by name or email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ maxWidth: '300px' }}
              />
              <Form.Select 
                value={filterBarangay} 
                onChange={(e) => setFilterBarangay(e.target.value)}
                style={{ maxWidth: '250px' }}
              >
                <option value="">All Barangays</option>
                {BARANGAYS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Form.Select>
            </Card.Body>
          </Card>

          <DataTable
            data={filteredUsers}
            columns={columns}
            pageSize={6}
            emptyMessage="No pending applications found."
          />

          <Modal show={showModal} onHide={closeReviewModal} size="xl" backdrop="static" centered>
            <Modal.Header closeButton={!isProcessing}>
              <Modal.Title>Application Review: {selectedApp?.fullName}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
              <Row className="g-0 h-100" style={{ minHeight: '60vh' }}>
                <Col md={4} className="bg-light p-4 border-end" style={{ borderRight: '1px solid #E4E4E7 !important' }}>
                  <h3 className="h5 fw-bold mb-4" style={{ fontFamily: 'var(--font-headline)' }}>Applicant Profile</h3>
                  
                  <div className="mb-3">
                    <div className="overline-text text-muted mb-1">Full Name</div>
                    <div className="body-large text-dark fw-semibold">{selectedApp?.fullName}</div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="overline-text text-muted mb-1">Email Address</div>
                    <div className="body-text"><a href={`mailto:${selectedApp?.email}`} className="text-secondary text-decoration-none fw-semibold">{selectedApp?.email}</a></div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="overline-text text-muted mb-1">Barangay</div>
                    <div className="body-large text-dark fw-semibold">{selectedApp?.barangay}</div>
                  </div>

                  <hr className="my-4" style={{ borderColor: '#E4E4E7' }} />

                  {!showDenyPrompt ? (
                    <div className="d-grid gap-2">
                      <Button
                        variant="success"
                        size="lg"
                        onClick={() => setShowApproveConfirm(true)}
                        disabled={isProcessing}
                      >
                        Approve &amp; Create Account
                      </Button>
                      <Button variant="outline-danger" size="lg" onClick={() => setShowDenyPrompt(true)} disabled={isProcessing}>
                        Deny Application
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded shadow-sm border border-danger">
                      <h6 className="text-danger fw-bold mb-3">Rejection Reason</h6>
                      <FormField
                        label="" // Header is already there
                        as="textarea"
                        rows={3}
                        placeholder="e.g., The uploaded ID is blurred, or the barangay does not match."
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                      />
                      <div className="d-flex gap-2">
                        <Button variant="secondary" onClick={() => setShowDenyPrompt(false)} disabled={isProcessing} className="flex-fill">
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          disabled={isProcessing || !denyReason.trim()}
                          className="flex-fill"
                          onClick={() => {
                            if (!denyReason.trim()) {
                              addToast('Please provide a reason for rejection.', 'warning');
                              return;
                            }
                            setShowDenyConfirm(true);
                          }}
                        >
                          Confirm Deny
                        </Button>
                      </div>
                    </div>
                  )}
                </Col>
                
                <Col md={8} className="bg-dark d-flex flex-column">
                  <div className="p-2 bg-secondary text-white small fw-bold">SK Validation Document</div>
                  <div className="flex-grow-1 d-flex align-items-center justify-content-center p-3" style={{ minHeight: '500px' }}>
                    {proofUrl ? (
                      proofUrl.includes('.pdf') || proofUrl.toLowerCase().includes('%2fpdf') || proofUrl.toLowerCase().includes('.pdf?') ? (
                        <iframe 
                          src={proofUrl} 
                          width="100%" 
                          height="100%" 
                          style={{ border: 'none', minHeight: '60vh', backgroundColor: 'white' }}
                          title="PDF Viewer"
                        />
                      ) : (
                        <img 
                          src={proofUrl} 
                          alt="SK ID Proof" 
                          style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} 
                        />
                      )
                    ) : selectedApp ? (
                      <div className="text-white d-flex align-items-center gap-2">
                        <Spinner animation="border" size="sm" />
                        <span>Loading document securely...</span>
                      </div>
                    ) : (
                      <div className="text-muted">No document available</div>
                    )}
                  </div>
                </Col>
              </Row>
            </Modal.Body>
          </Modal>

          {/* ---- Approve Confirmation Dialog ---- */}
          <ConfirmDialog
            show={showApproveConfirm}
            onCancel={() => setShowApproveConfirm(false)}
            onConfirm={handleApprove}
            title="Approve Application"
            message={<>Are you sure you want to approve <strong>{selectedApp?.fullName}</strong>'s application?</>}
            detail={
              <>
                <div className="fw-bold">{selectedApp?.fullName}</div>
                <div className="text-muted small">{selectedApp?.email}</div>
                <div className="text-muted small">{selectedApp?.barangay}</div>
              </>
            }
            warning="A Firebase account will be created and a setup email will be sent to the applicant."
            confirmLabel="Approve & Create Account"
            confirmVariant="success"
            loading={isProcessing}
          />

          {/* ---- Deny Confirmation Dialog ---- */}
          <ConfirmDialog
            show={showDenyConfirm}
            onCancel={() => setShowDenyConfirm(false)}
            onConfirm={handleDeny}
            title="Deny Application"
            message={<>You are about to deny <strong>{selectedApp?.fullName}</strong>'s application with the following reason:</>}
            detail={
              <>
                <div className="fw-bold mb-1">{selectedApp?.fullName}</div>
                <div className="text-muted small mb-2">{selectedApp?.email}</div>
                <div className="border-top pt-2 mt-1" style={{ fontSize: '13px', color: '#18181B' }}>
                  <span className="text-muted" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rejection Reason</span>
                  <div className="mt-1">{denyReason}</div>
                </div>
              </>
            }
            warning="This will notify the applicant by email with the reason above."
            confirmLabel="Confirm Deny"
            confirmVariant="danger"
            loading={isProcessing}
          />
        </>
      ) : activeSection === 'users' ? (
        <>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="d-flex flex-wrap gap-3">
              <Form.Control 
                type="text" 
                placeholder="Search by name or email..." 
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                style={{ maxWidth: '300px' }}
              />
              <Form.Select 
                value={userFilterBarangay} 
                onChange={(e) => setUserFilterBarangay(e.target.value)}
                style={{ maxWidth: '250px' }}
              >
                <option value="">All Barangays</option>
                {BARANGAYS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Form.Select>
            </Card.Body>
          </Card>

          <DataTable
            data={filteredApprovedUsers}
            columns={approvedColumns}
            pageSize={6}
            emptyMessage="No approved users found."
          />

          {/* ---- Edit User Modal ---- */}
          <Modal show={showEditModal} onHide={closeEditModal} backdrop="static" centered>
            <Modal.Header closeButton={!isUserProcessing}>
              <Modal.Title>Edit User: {selectedUser?.fullName}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p className="text-muted small mb-3">
                Leave <strong>Password</strong> blank to keep the current password unchanged.
              </p>
              <FormField
                label="Full Name"
                type="text"
                value={editForm.fullName}
                onChange={(e) => setEditForm(f => ({ ...f, fullName: e.target.value }))}
              />
              <FormField
                label="Email Address"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
              />
              <Form.Group className="mb-3">
                <Form.Label>Barangay</Form.Label>
                <Form.Select
                  value={editForm.barangay}
                  onChange={(e) => setEditForm(f => ({ ...f, barangay: e.target.value }))}
                >
                  {BARANGAYS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <FormField
                label="New Password"
                type="password"
                placeholder="Leave blank to keep unchanged"
                value={editForm.password}
                onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeEditModal} disabled={isUserProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (getChangedFields().length === 0) {
                    addToast('No changes detected.', 'warning');
                    return;
                  }
                  setShowEditConfirm(true);
                }}
                disabled={isUserProcessing}
              >
                Save Changes
              </Button>
            </Modal.Footer>
          </Modal>

          {/* ---- Edit Confirmation Dialog ---- */}
          <ConfirmDialog
            show={showEditConfirm}
            onCancel={() => setShowEditConfirm(false)}
            onConfirm={handleUpdateUser}
            title="Confirm Changes"
            message={<>You are about to update <strong>{selectedUser?.fullName}</strong>'s account with the following changes:</>}
            detail={
              <>
                {getChangedFields().map(change => (
                  <div key={change.label} className="mb-1">
                    <span className="text-muted" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {change.label}
                    </span>
                    <div style={{ fontSize: '13px', color: '#18181B' }}>
                      {change.from && (
                        <>
                          <span style={{ textDecoration: 'line-through', color: '#71717A' }}>{change.from}</span>
                          {' → '}
                        </>
                      )}
                      <span className="fw-semibold">{change.to}</span>
                    </div>
                  </div>
                ))}
              </>
            }
            warning={
              getChangedFields().some(c => c.sensitive)
                ? 'Email or password changes will affect this user’s login credentials immediately.'
                : undefined
            }
            confirmLabel="Confirm Changes"
            confirmVariant="primary"
            loading={isUserProcessing}
          />

          {/* ---- Delete Confirmation Modal ---- */}
          <ConfirmDialog
            show={showDeleteConfirm}
            onCancel={closeDeleteConfirm}
            onConfirm={handleDeleteUser}
            title="Delete User"
            message="Are you sure you want to permanently delete this user?"
            detail={
              <>
                <div className="fw-bold">{selectedUser?.fullName}</div>
                <div className="text-muted small">{selectedUser?.email}</div>
                <div className="text-muted small">{selectedUser?.barangay}</div>
              </>
            }
            warning={<>This will remove their account from Firebase Auth and all profile data. This action is <strong>irreversible</strong>.</>}
            confirmLabel="Confirm Delete"
            loading={isUserProcessing}
          />
        </>
      ) : activeSection === 'submissions' ? (
        <AdminSubmissionsSection
          defaultSearch={submissionsSearch}
          defaultBarangay={submissionsBarangay}
          pending={pendingSubs}
          history={historySubs}
          loading={loadingHistory}
          refreshHistory={fetchHistory}
        />
      ) : activeSection === 'history' ? (
        <AdminSubmissionHistory
          history={historySubs}
          loading={loadingHistory}
        />
      ) : activeSection === 'analytics' ? (
        <AdminAnalyticsSection
          pending={pendingSubs}
          history={historySubs}
        />
      ) : activeSection === 'matrix' ? (
        <ComplianceMatrix
          pending={pendingSubs}
          history={historySubs}
        />
      ) : (
        <Card className="border-0 shadow-sm text-center p-5">
          <Card.Body className="py-5">
            <div className="text-primary mb-4">
              <span className="fs-1">✨</span>
            </div>
            <h2 className="text-primary fw-bold mb-3">
              {activeSection === 'home' && 'Home'}
              {activeSection === 'settings' && 'User Settings'}
              {' '}Section
            </h2>
            <p className="text-muted mb-4 fs-5">
              This section is currently under development.
            </p>
            <div className="d-flex justify-content-center">
              <Button 
                variant="primary" 
                onClick={() => setActiveSection('applicants')}
                className="px-4 py-2 shadow-sm rounded-pill fw-bold"
              >
                Go to Applicants Section
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </DashboardShell>
  );
}
