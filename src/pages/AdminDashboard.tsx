import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { db, storage } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, getDownloadURL } from 'firebase/storage';
import { BARANGAYS } from '../constants/barangays';
import DashboardShell from '../components/layout/DashboardShell';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingButton from '../components/common/LoadingButton';
import FormField from '../components/common/FormField';
import { DataTable } from '../components/common/DataTable';
import type { Column } from '../components/common/DataTable';

interface PendingUser {
  id: string;
  fullName: string;
  email: string;
  barangay: string;
  proofStoragePath: string;
  submittedAt: any;
}

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('applicants');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBarangay, setFilterBarangay] = useState('');
  
  const [selectedApp, setSelectedApp] = useState<PendingUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showDenyPrompt, setShowDenyPrompt] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [proofUrl, setProofUrl] = useState<string>('');
  
  const functions = getFunctions();

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

    const qApproved = query(collection(db, 'users'), where('status', '==', 'approved'));
    const unsubApproved = onSnapshot(qApproved, (snapshot) => {
      setApprovedCount(snapshot.size);
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
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setIsProcessing(true);
    try {
      const approveUserFn = httpsCallable(functions, 'approveUser');
      await approveUserFn({ applicationId: selectedApp.id });
      alert('User successfully approved!');
      closeReviewModal();
    } catch (error: any) {
      console.error(error);
      alert(`Approval failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedApp) return;
    if (!denyReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    setIsProcessing(true);
    try {
      const denyUserFn = httpsCallable(functions, 'denyUser');
      await denyUserFn({ applicationId: selectedApp.id, reason: denyReason });
      alert('User successfully denied.');
      closeReviewModal();
    } catch (error: any) {
      console.error(error);
      alert(`Denial failed: ${error.message}`);
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
      header: 'Status',
      render: () => <StatusBadge status="pending" />
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
            pageSize={5}
            emptyMessage="No pending applications found."
          />

          <Modal show={showModal} onHide={closeReviewModal} size="xl" backdrop="static" centered>
            <Modal.Header closeButton={!isProcessing}>
              <Modal.Title>Application Review: {selectedApp?.fullName}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
              <Row className="g-0 h-100" style={{ minHeight: '60vh' }}>
                <Col md={4} className="bg-light p-4 border-end">
                  <h5 className="fw-bold mb-4">Applicant Profile</h5>
                  
                  <div className="mb-3">
                    <label className="text-muted small text-uppercase fw-bold">Full Name</label>
                    <div className="fs-5">{selectedApp?.fullName}</div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="text-muted small text-uppercase fw-bold">Email Address</label>
                    <div><a href={`mailto:${selectedApp?.email}`}>{selectedApp?.email}</a></div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="text-muted small text-uppercase fw-bold">Barangay</label>
                    <div className="fs-5">{selectedApp?.barangay}</div>
                  </div>

                  <hr className="my-4" />

                  {!showDenyPrompt ? (
                    <div className="d-grid gap-2">
                      <LoadingButton 
                        variant="success" 
                        size="lg" 
                        onClick={handleApprove} 
                        loading={isProcessing}
                      >
                        Approve & Create Account
                      </LoadingButton>
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
                        <LoadingButton 
                          variant="danger" 
                          onClick={handleDeny} 
                          loading={isProcessing} 
                          className="flex-fill"
                        >
                          Confirm Deny
                        </LoadingButton>
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
        </>
      ) : (
        <Card className="border-0 shadow-sm text-center p-5">
          <Card.Body className="py-5">
            <div className="text-primary mb-4">
              <span className="fs-1">✨</span>
            </div>
            <h2 className="text-primary fw-bold mb-3">
              {activeSection === 'home' && 'Home'}
              {activeSection === 'users' && 'Users'}
              {activeSection === 'submissions' && 'Submissions'}
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
