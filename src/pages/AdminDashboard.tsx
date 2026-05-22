import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { db, storage } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
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

interface PendingUser {
  id: string;
  fullName: string;
  email: string;
  barangay: string;
  proofStoragePath: string;
  submittedAt: any;
}

interface ApprovedUser {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  barangay: string;
  role: string;
  approvedAt: any;
}

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('applicants');
  
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
  
  const functions = getFunctions();
  const { addToast } = useToast();

  useEffect(() => {
    if (selectedApp?.proofStoragePath) {
      setProofUrl('');
      const storageRef = ref(storage, selectedApp.proofStoragePath);
      getDownloadURL(storageRef)
        .then(url => setProofUrl(url))
        .catch(err => console.error("Error loading proof URL:", err));
    } else {
      setProofUrl('');
    }
  }, [selectedApp]);

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

    const qApproved = query(collection(db, 'users'));
    const unsubApproved = onSnapshot(qApproved, (snapshot) => {
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
    });

    return () => {
      unsubPending();
      unsubApproved();
    };
  }, []);

  const openReviewModal = (user: PendingUser) => {
    setSelectedApp(user);
    setShowModal(true);
    setShowDenyPrompt(false);
    setDenyReason('');
  };

  const closeReviewModal = () => {
    if (isProcessing) return;
    setShowModal(false);
    setSelectedApp(null);
    setShowDenyPrompt(false);
    setShowApproveConfirm(false);
    setShowDenyConfirm(false);
    setDenyReason('');
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setIsProcessing(true);
    try {
      const approveUserFn = httpsCallable(functions, 'approveUser');
      await approveUserFn({ applicationId: selectedApp.id });
      addToast('User approved successfully! A setup email has been sent.', 'success');
      setShowApproveConfirm(false);
      setShowModal(false);
      setSelectedApp(null);
    } catch (error: any) {
      console.error(error);
      addToast(`Approval failed: ${error.message}`, 'error');
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
    } catch (error: any) {
      console.error(error);
      addToast(`Denial failed: ${error.message}`, 'error');
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
      setShowEditConfirm(false);
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error(error);
      addToast(`Update failed: ${error.message}`, 'error');
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
      closeDeleteConfirm();
    } catch (error: any) {
      console.error(error);
      addToast(`Deletion failed: ${error.message}`, 'error');
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
        const date = user.approvedAt.toDate ? user.approvedAt.toDate() : new Date(user.approvedAt);
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

  return (
    <DashboardShell 
      title="LYDO Admin Portal"
      activeSection={activeSection}
      onSectionSelect={setActiveSection}
    >
      {activeSection === 'applicants' ? (
        <>
          <Row className="mb-4">
            <Col md={6} className="mb-3 mb-md-0">
              <StatCard 
                title="Pending Applications" 
                value={pendingUsers.length} 
                variant="warning" 
              />
            </Col>
            <Col md={6}>
              <StatCard 
                title="Total Approved SK Officials" 
                value={approvedCount} 
                variant="success" 
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
        <AdminSubmissionsSection />
      ) : activeSection === 'history' ? (
        <AdminSubmissionHistory />
      ) : activeSection === 'analytics' ? (
        <AdminAnalyticsSection />
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
