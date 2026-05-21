import React, { useState } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { BARANGAYS } from '../../constants/barangays';
import { ALL_UPLOAD_TYPES } from '../../constants/submissionTypes';
import type { ApprovedSubmission } from '../../constants/submissionTypes';
import { formatPeriodLabel } from '../../utils/periodUtils';
import { formatFileSize } from '../../utils/pdfScreening';
import { DataTable } from '../common/DataTable';
import type { Column } from '../common/DataTable';
import DocumentReviewModal from '../common/DocumentReviewModal';
import { useSubmissions } from '../../hooks/useSubmissions';

/**
 * Admin Submission History Section
 * Read-only view for all historically approved submissions.
 */
const AdminSubmissionHistory: React.FC = () => {
  const { approved, loading } = useSubmissions(); // Only use approved submissions

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBarangay, setFilterBarangay] = useState('');
  const [filterDocType, setFilterDocType] = useState('');

  // Details modal state
  const [selectedSub, setSelectedSub] = useState<ApprovedSubmission | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filter approved submissions
  const filteredApproved = approved.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.documentLabel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBarangay = filterBarangay === '' || s.barangay === filterBarangay;
    const matchesDocType = filterDocType === '' || s.documentType === filterDocType;
    return matchesSearch && matchesBarangay && matchesDocType;
  });

  const openDetails = (sub: ApprovedSubmission) => {
    setSelectedSub(sub);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedSub(null);
  };

  // Download handler (gets URL via getDownloadURL inside the DocumentReviewModal logic, or we can just open if we fetch it. Wait, the modal fetches it.)
  // Actually, wait, DocumentReviewModal handles downloading internally if we pass `fileUrl`. Wait, we need to fetch `fileUrl` here first, or the modal does it?
  // Let's copy the url fetching logic from AdminSubmissionsSection.

  const [fileUrl, setFileUrl] = useState('');
  const [fileLoading, setFileLoading] = useState(false);

  React.useEffect(() => {
    if (selectedSub?.fileStoragePath) {
      setFileUrl('');
      setFileLoading(true);
      import('firebase/storage').then(({ ref, getDownloadURL }) => {
        import('../../firebase').then(({ storage }) => {
          const storageRef = ref(storage, selectedSub.fileStoragePath);
          getDownloadURL(storageRef)
            .then((url) => setFileUrl(url))
            .catch((err) => console.error('Error loading file URL:', err))
            .finally(() => setFileLoading(false));
        });
      });
    } else {
      setFileUrl('');
      setFileLoading(false);
    }
  }, [selectedSub]);

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  // Table columns
  const columns: Column<ApprovedSubmission>[] = [
    {
      header: 'Document',
      render: (sub) => (
        <div>
          <div className="fw-bold">{sub.documentLabel}</div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            {sub.category === 'asap' ? 'ASAP' : formatPeriodLabel(sub.period)}
          </div>
        </div>
      ),
    },
    {
      header: 'Submitted By',
      render: (sub) => (
        <div>
          <div className="fw-semibold">{sub.fullName}</div>
          <div className="text-muted" style={{ fontSize: '12px' }}>{sub.barangay}</div>
        </div>
      ),
    },
    {
      header: 'Date Approved',
      render: (sub) => {
        const date = sub.approvedAt?.toDate ? sub.approvedAt.toDate() : null;
        return (
          <div style={{ fontSize: '13px' }}>
            {date ? date.toLocaleDateString() : 'Unknown'}
          </div>
        );
      },
    },
    {
      header: 'Action',
      className: 'text-end',
      render: (sub) => (
        <Button variant="outline-primary" size="sm" onClick={() => openDetails(sub)}>
          View / Download
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">
          <span className="material-symbols-outlined me-2 text-primary" style={{ verticalAlign: 'middle' }}>
            history
          </span>
          Submission History
        </h4>
        <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
          Browse and download all historically approved submissions.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="d-flex flex-wrap gap-3">
          <Form.Control
            type="text"
            placeholder="Search by name or document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '250px' }}
          />
          <Form.Select
            value={filterBarangay}
            onChange={(e) => setFilterBarangay(e.target.value)}
            style={{ maxWidth: '220px' }}
          >
            <option value="">All Barangays</option>
            {BARANGAYS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Form.Select>
          <Form.Select
            value={filterDocType}
            onChange={(e) => setFilterDocType(e.target.value)}
            style={{ maxWidth: '250px' }}
          >
            <option value="">All Document Types</option>
            {ALL_UPLOAD_TYPES.map((dt) => (
              <option key={dt.id} value={dt.id}>{dt.label}</option>
            ))}
          </Form.Select>
        </Card.Body>
      </Card>

      {/* History Table */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-0">
          <DataTable
            data={filteredApproved}
            columns={columns}
            pageSize={10}
            emptyMessage={loading ? 'Loading history...' : 'No approved submissions found.'}
          />
        </Card.Body>
      </Card>

      {/* Read-Only Document Modal */}
      <DocumentReviewModal
        show={showDetails}
        onHide={closeDetails}
        title={`History: ${selectedSub?.documentLabel || ''}`}
        fileUrl={fileUrl}
        fileLoading={fileLoading}
        locked={false}
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
              <div className="overline-text text-muted mb-1">Date Approved</div>
              <div className="body-text text-dark fw-semibold">
                {selectedSub?.approvedAt?.toDate
                  ? selectedSub.approvedAt.toDate().toLocaleString()
                  : 'Unknown'}
              </div>
            </div>

            <div className="mb-3">
              <div className="overline-text text-muted mb-1">File Info</div>
              <div style={{ fontSize: '13px' }}>
                <div className="text-truncate" style={{ maxWidth: '200px' }} title={selectedSub?.fileName}>
                  {selectedSub?.fileName}
                </div>
                <div className="text-muted mt-1">
                  {selectedSub?.pageCount} page{selectedSub?.pageCount !== 1 ? 's' : ''} •{' '}
                  {selectedSub ? formatFileSize(selectedSub.fileSize) : ''}
                </div>
              </div>
            </div>
          </>
        }
        actions={
          <div className="d-grid gap-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleDownload}
              disabled={!fileUrl}
            >
              <span className="material-symbols-outlined me-2" style={{ verticalAlign: 'middle' }}>
                download
              </span>
              Download PDF
            </Button>
            <Button variant="outline-secondary" size="lg" onClick={closeDetails}>
              Close
            </Button>
          </div>
        }
      />
    </>
  );
};

export default AdminSubmissionHistory;
