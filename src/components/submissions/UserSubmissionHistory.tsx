import React, { useState } from 'react';
import { Card, Form, Button, Badge } from 'react-bootstrap';
import { ALL_UPLOAD_TYPES } from '../../constants/submissionTypes';
import type { HistoricalSubmission } from '../../constants/submissionTypes';
import { formatPeriodLabel } from '../../utils/periodUtils';
import { formatFileSize } from '../../utils/pdfScreening';
import { DataTable } from '../common/DataTable';
import type { Column } from '../common/DataTable';
import DocumentReviewModal from '../common/DocumentReviewModal';

interface UserSubmissionHistoryProps {
  history: HistoricalSubmission[];
  loading?: boolean;
}

/**
 * User Submission History Section
 * Read-only view for the active user's historically approved and denied submissions.
 */
const UserSubmissionHistory: React.FC<UserSubmissionHistoryProps> = ({ history = [], loading = false }) => {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDocType, setFilterDocType] = useState('');

  // Details modal state
  const [selectedSub, setSelectedSub] = useState<HistoricalSubmission | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filter submissions
  const filteredHistory = history.filter((s) => {
    const matchesSearch =
      (s.documentLabel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.fileName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDocType = filterDocType === '' || s.documentType === filterDocType;
    return matchesSearch && matchesDocType;
  });

  const openDetails = (sub: HistoricalSubmission) => {
    setSelectedSub(sub);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedSub(null);
  };

  const [fileUrl, setFileUrl] = useState('');
  const [fileLoading, setFileLoading] = useState(false);

  React.useEffect(() => {
    if (selectedSub?.fileStoragePath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFileUrl('');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFileLoading(true);
      import('firebase/storage').then(({ ref, getDownloadURL }) => {
        import('../../firebase').then(({ storage }) => {
          const storageRef = ref(storage, selectedSub.fileStoragePath!);
          getDownloadURL(storageRef)
            .then((url) => setFileUrl(url))
            .catch((err) => console.error('Error loading file URL:', err))
            .finally(() => setFileLoading(false));
        });
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFileUrl('');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFileLoading(false);
    }
  }, [selectedSub]);

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  // Table columns
  const columns: Column<HistoricalSubmission>[] = [
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
        <div className="fw-semibold text-truncate" style={{ maxWidth: '150px' }} title={sub.fullName}>
          {sub.fullName}
        </div>
      ),
    },
    {
      header: 'File Name',
      render: (sub) => (
        <div>
          <div className="fw-semibold text-truncate" style={{ maxWidth: '200px' }} title={sub.fileName}>
            {sub.fileName}
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            {formatFileSize(sub.fileSize)} • {sub.pageCount} page{sub.pageCount !== 1 ? 's' : ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (sub) => {
        const computedStatus = sub.status || (sub.approvedAt ? 'approved' : 'denied');
        return (
          <Badge bg={computedStatus === 'approved' ? 'success' : 'danger'} text="white" className="px-2 py-1">
            {computedStatus.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      header: 'Date Processed',
      render: (sub) => {
        const ts = sub.status === 'approved' ? sub.approvedAt : sub.deniedAt;
        const date = ts?.toDate ? ts.toDate() : null;
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
      render: (sub) => {
        const computedStatus = sub.status || (sub.approvedAt ? 'approved' : 'denied');
        return (
          <Button 
            variant={computedStatus === 'approved' ? 'outline-primary' : 'outline-danger'} 
            size="sm" 
            onClick={() => openDetails(sub)}
          >
            {computedStatus === 'approved' ? 'View / Download' : 'View Feedback'}
          </Button>
        );
      },
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
          Browse your past approved and denied submissions.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="d-flex flex-wrap gap-3">
          <Form.Control
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <Form.Select
            value={filterDocType}
            onChange={(e) => setFilterDocType(e.target.value)}
            style={{ maxWidth: '300px' }}
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
            data={filteredHistory}
            columns={columns}
            pageSize={10}
            emptyMessage={loading ? 'Loading history...' : 'No past submissions found.'}
          />
        </Card.Body>
      </Card>

      {/* Read-Only Document Modal */}
      <DocumentReviewModal
        show={showDetails}
        onHide={() => setShowDetails(false)}
        title={`History: ${selectedSub?.documentLabel || ''}`}
        fileUrl={fileUrl}
        fileLoading={fileLoading}
        locked={false}
        hidePreview={selectedSub?.status === 'denied'}
        onDownload={handleDownload}
        infoPanel={
          <>
            <h3 className="h5 fw-bold mb-4" style={{ fontFamily: 'var(--font-headline)' }}>
              Submission Details
            </h3>

            <div className="mb-3">
              <div className="overline-text text-muted mb-1">Submitted By</div>
              <div className="body-text text-dark fw-semibold">{selectedSub?.fullName}</div>
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
              <div className="overline-text text-muted mb-1">
                {selectedSub?.status === 'approved' ? 'Date Approved' : 'Date Denied'}
              </div>
              <div className="body-text text-dark fw-semibold">
                {selectedSub?.status === 'approved' && selectedSub?.approvedAt?.toDate
                  ? selectedSub.approvedAt.toDate().toLocaleString()
                  : selectedSub?.status === 'denied' && selectedSub?.deniedAt?.toDate
                  ? selectedSub.deniedAt.toDate().toLocaleString()
                  : 'Unknown'}
              </div>
            </div>

            {selectedSub?.status === 'denied' && selectedSub.reviewNotes && (
              <div className="mb-3">
                <div className="overline-text text-danger mb-1">Denial Reason</div>
                <div className="body-text text-dark p-2 bg-danger bg-opacity-10 rounded border border-danger border-opacity-25">
                  {selectedSub.reviewNotes}
                </div>
              </div>
            )}

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
                {selectedSub?.status === 'denied' && (
                  <div className="text-danger mt-1 fst-italic">
                    File was deleted to save space.
                  </div>
                )}
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

export default UserSubmissionHistory;
