import React, { useState } from 'react';
import { Row, Col, Card, Button, Form } from 'react-bootstrap';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage, functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { BARANGAYS } from '../../constants/barangays';
import { ALL_UPLOAD_TYPES } from '../../constants/submissionTypes';
import { formatPeriodLabel } from '../../utils/periodUtils';
import { formatFileSize } from '../../utils/pdfScreening';
import StatCard from '../common/StatCard';
import { DataTable } from '../common/DataTable';
import type { Column } from '../common/DataTable';
import DocumentReviewModal from '../common/DocumentReviewModal';
import ConfirmDialog from '../common/ConfirmDialog';
import FormField from '../common/FormField';
import StatusBadge from '../common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import type { HistoricalSubmission, PendingSubmission } from '../../constants/submissionTypes';

interface AdminSubmissionsSectionProps {
  defaultSearch?: string;
  defaultBarangay?: string;
  pending: PendingSubmission[];
  history: HistoricalSubmission[];
  loading: boolean;
  refreshHistory: () => void;
}

/**
 * Admin Submissions Section — review pending submissions, approve/deny.
 * Reuses: DataTable, StatCard, DocumentReviewModal, ConfirmDialog, FormField, StatusBadge
 */
const AdminSubmissionsSection: React.FC<AdminSubmissionsSectionProps> = ({
  defaultSearch = '',
  defaultBarangay = '',
  pending = [],
  history = [],
  loading,
  refreshHistory,
}) => {
  const { addToast } = useToast();

  // Filters
  const [searchTerm, setSearchTerm] = useState(defaultSearch);
  const [prevDefaultSearch, setPrevDefaultSearch] = useState(defaultSearch);
  if (defaultSearch !== prevDefaultSearch) {
    setPrevDefaultSearch(defaultSearch);
    setSearchTerm(defaultSearch);
  }

  const [filterBarangay, setFilterBarangay] = useState(defaultBarangay);
  const [prevDefaultBarangay, setPrevDefaultBarangay] = useState(defaultBarangay);
  if (defaultBarangay !== prevDefaultBarangay) {
    setPrevDefaultBarangay(defaultBarangay);
    setFilterBarangay(defaultBarangay);
  }

  const [filterDocType, setFilterDocType] = useState('');

  // Review modal state
  const [selectedSub, setSelectedSub] = useState<PendingSubmission | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [fileLoading, setFileLoading] = useState(false);

  // Approve/deny state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDenyPrompt, setShowDenyPrompt] = useState(false);
  const [showDenyConfirm, setShowDenyConfirm] = useState(false);
  const [denyReason, setDenyReason] = useState('');



  // Filter pending submissions
  const filteredPending = pending.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.documentLabel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBarangay = filterBarangay === '' || s.barangay === filterBarangay;
    const matchesDocType = filterDocType === '' || s.documentType === filterDocType;
    return matchesSearch && matchesBarangay && matchesDocType;
  });

  // Open review modal
  const openReview = (sub: PendingSubmission) => {
    setSelectedSub(sub);
    setShowReview(true);
    setShowDenyPrompt(false);
    setDenyReason('');

    if (sub.fileStoragePath) {
      setFileUrl('');
      setFileLoading(true);
      const storageRef = ref(storage, sub.fileStoragePath);
      getDownloadURL(storageRef)
        .then((url) => setFileUrl(url))
        .catch((err) => console.error('Error loading file URL:', err))
        .finally(() => setFileLoading(false));
    } else {
      setFileUrl('');
      setFileLoading(false);
    }
  };

  const closeReview = () => {
    if (isProcessing) return;
    setShowReview(false);
    setSelectedSub(null);
    setShowDenyPrompt(false);
    setShowApproveConfirm(false);
    setShowDenyConfirm(false);
    setDenyReason('');
    setFileUrl('');
    setFileLoading(false);
  };

  // Approve handler
  const handleApprove = async () => {
    if (!selectedSub) return;
    setIsProcessing(true);
    try {
      const approveSubmissionFn = httpsCallable(functions, 'approveSubmission');
      await approveSubmissionFn({ submissionId: selectedSub.id });
      addToast('Submission approved successfully!', 'success');
      await refreshHistory();
      setShowApproveConfirm(false);
      closeReview();
    } catch (error: unknown) {
      console.error(error);
      addToast(`Approval failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Deny handler
  const handleDeny = async () => {
    if (!selectedSub) return;
    if (!denyReason.trim()) {
      addToast('Please provide a reason for denial.', 'warning');
      return;
    }
    setIsProcessing(true);
    try {
      const denySubmissionFn = httpsCallable(functions, 'denySubmission');
      await denySubmissionFn({ submissionId: selectedSub.id, reason: denyReason });
      addToast('Submission denied and notification sent.', 'info');
      await refreshHistory();
      setShowDenyConfirm(false);
      closeReview();
    } catch (error: unknown) {
      console.error(error);
      addToast(`Denial failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download handler
  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  // Table columns
  const pendingColumns: Column<PendingSubmission>[] = [
    {
      header: 'Document',
      render: (sub) => (
        <div className="w-100">
          <div className="cell-doc-title" title={sub.documentLabel}>{sub.documentLabel}</div>
          <div className="cell-subtitle">
            {sub.category === 'asap' ? 'ASAP' : formatPeriodLabel(sub.period)}
          </div>
        </div>
      ),
    },
    {
      header: 'Submitted By',
      render: (sub) => (
        <div className="w-100">
          <div className="fw-semibold cell-text-clamp-2" title={sub.fullName}>{sub.fullName}</div>
          <div className="cell-subtitle">{sub.barangay}</div>
        </div>
      ),
    },
    {
      header: 'File',
      render: (sub) => (
        <div className="w-100">
          <div className="fw-semibold cell-text-clamp-2" title={sub.fileName}>{sub.fileName}</div>
          <div className="cell-subtitle">
            {sub.pageCount} page{sub.pageCount !== 1 ? 's' : ''} • {formatFileSize(sub.fileSize)}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: () => <StatusBadge status="pending" />,
    },
    {
      header: 'Action',
      className: 'text-end text-nowrap',
      render: (sub) => (
        <Button variant="primary" size="sm" className="text-nowrap" style={{ whiteSpace: 'nowrap' }} onClick={() => openReview(sub)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <>
      {/* Stat Cards */}
      <Row className="mb-4 g-2 g-sm-3">
        <Col xs={6} sm={6} md={6} className="kpi-animate">
          <StatCard title="Pending Review" value={pending.length} variant="warning" icon="pending_actions" />
        </Col>
        <Col xs={6} sm={6} md={6} className="kpi-animate" style={{ animationDelay: '75ms' }}>
          <StatCard title="Total Approved" value={history.filter(s => s.status === 'approved').length} variant="success" icon="task_alt" />
        </Col>
      </Row>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-3 p-md-4">
          {/* Row 1: Search input goes all the way across */}
          <div className="mb-3">
            <Form.Control
              type="text"
              placeholder="Search by name or document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sfc-input w-100"
            />
          </div>

          {/* Row 2: Barangays & Document Types dropdowns side-by-side */}
          <div className="row g-2 g-md-3">
            <div className="col-6">
              <Form.Select
                value={filterBarangay}
                onChange={(e) => setFilterBarangay(e.target.value)}
                className="sfc-select w-100"
              >
                <option value="">All Barangays</option>
                {BARANGAYS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Form.Select>
            </div>
            <div className="col-6">
              <Form.Select
                value={filterDocType}
                onChange={(e) => setFilterDocType(e.target.value)}
                className="sfc-select w-100"
              >
                <option value="">All Document Types</option>
                {ALL_UPLOAD_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>{dt.label}</option>
                ))}
              </Form.Select>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Pending Submissions Table */}
      <DataTable
        data={filteredPending}
        columns={pendingColumns}
        pageSize={8}
        emptyMessage={loading ? 'Loading submissions...' : 'No pending submissions found.'}
      />

      {/* Document Review Modal */}
      <DocumentReviewModal
        show={showReview}
        onHide={closeReview}
        title={`Review: ${selectedSub?.documentLabel || ''}`}
        fileUrl={fileUrl}
        fileLoading={fileLoading}
        locked={isProcessing}
        onDownload={handleDownload}
        infoPanel={
          <>
            <h3 className="h5 fw-bold mb-4" style={{ fontFamily: 'var(--font-headline)' }}>
              Submission Details
            </h3>

            <div className="mb-3">
              <div className="overline-text text-muted mb-1">Submitted By</div>
              <div className="body-large text-dark fw-semibold">{selectedSub?.fullName}</div>
            </div>

            <div className="mb-3">
              <div className="overline-text text-muted mb-1">Barangay</div>
              <div className="body-large text-dark fw-semibold">{selectedSub?.barangay}</div>
            </div>

            <div className="mb-3">
              <div className="overline-text text-muted mb-1">Document Type</div>
              <div className="body-text text-dark fw-semibold">{selectedSub?.documentLabel}</div>
            </div>

            <div className="mb-3">
              <div className="overline-text text-muted mb-1">Period</div>
              <div className="body-text text-dark fw-semibold">
                {selectedSub?.period === 'ASAP'
                  ? 'ASAP (No deadline)'
                  : selectedSub?.period
                  ? formatPeriodLabel(selectedSub.period)
                  : '—'}
              </div>
            </div>

            <div className="mb-3">
              <div className="overline-text text-muted mb-1">File Info</div>
              <div style={{ fontSize: '13px' }}>
                <div>{selectedSub?.fileName}</div>
                <div className="text-muted">
                  {selectedSub?.pageCount} page{selectedSub?.pageCount !== 1 ? 's' : ''} •{' '}
                  {selectedSub ? formatFileSize(selectedSub.fileSize) : ''}
                </div>
              </div>
            </div>

            {selectedSub?.pdfMetadata?.producer && (
              <div className="mb-3">
                <div className="overline-text text-muted mb-1">PDF Producer</div>
                <div className="text-muted" style={{ fontSize: '12px' }}>
                  {selectedSub.pdfMetadata.producer}
                </div>
              </div>
            )}
          </>
        }
        actions={
          !showDenyPrompt ? (
            <div className="d-grid gap-2">
              <Button
                variant="success"
                size="lg"
                onClick={() => setShowApproveConfirm(true)}
                disabled={isProcessing}
              >
                Approve Submission
              </Button>
              <Button
                variant="outline-danger"
                size="lg"
                onClick={() => setShowDenyPrompt(true)}
                disabled={isProcessing}
              >
                Deny Submission
              </Button>
            </div>
          ) : (
            <div className="bg-white p-3 rounded shadow-sm border border-danger">
              <h6 className="text-danger fw-bold mb-3">Denial Reason</h6>
              <FormField
                label=""
                as="textarea"
                rows={3}
                placeholder="e.g., Wrong document type, file is unreadable, incorrect period."
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
              />
              <div className="d-flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowDenyPrompt(false)}
                  disabled={isProcessing}
                  className="flex-fill"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={isProcessing || !denyReason.trim()}
                  className="flex-fill"
                  onClick={() => {
                    if (!denyReason.trim()) {
                      addToast('Please provide a reason for denial.', 'warning');
                      return;
                    }
                    setShowDenyConfirm(true);
                  }}
                >
                  Confirm Deny
                </Button>
              </div>
            </div>
          )
        }
      />

      {/* Approve Confirmation */}
      <ConfirmDialog
        show={showApproveConfirm}
        onCancel={() => setShowApproveConfirm(false)}
        onConfirm={handleApprove}
        title="Approve Submission"
        message={
          <>
            Are you sure you want to approve <strong>{selectedSub?.fullName}</strong>'s submission?
          </>
        }
        detail={
          <>
            <div className="fw-bold">{selectedSub?.documentLabel}</div>
            <div className="text-muted small">
              {selectedSub?.period === 'ASAP'
                ? 'ASAP'
                : selectedSub?.period
                ? formatPeriodLabel(selectedSub.period)
                : ''}
            </div>
            <div className="text-muted small">{selectedSub?.barangay}</div>
          </>
        }
        warning="This will mark the submission as approved and store the file permanently."
        confirmLabel="Approve Submission"
        confirmVariant="success"
        loading={isProcessing}
      />

      {/* Deny Confirmation */}
      <ConfirmDialog
        show={showDenyConfirm}
        onCancel={() => setShowDenyConfirm(false)}
        onConfirm={handleDeny}
        title="Deny Submission"
        message={
          <>
            You are about to deny <strong>{selectedSub?.fullName}</strong>'s submission with the
            following reason:
          </>
        }
        detail={
          <>
            <div className="fw-bold mb-1">{selectedSub?.documentLabel}</div>
            <div className="text-muted small mb-2">{selectedSub?.barangay}</div>
            <div className="border-top pt-2 mt-1" style={{ fontSize: '13px', color: '#18181B' }}>
              <span
                className="text-muted"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Denial Reason
              </span>
              <div className="mt-1">{denyReason}</div>
            </div>
          </>
        }
        warning="This will delete the submission and notify the user by email."
        confirmLabel="Confirm Deny"
        confirmVariant="danger"
        loading={isProcessing}
      />
    </>
  );
};

export default AdminSubmissionsSection;
