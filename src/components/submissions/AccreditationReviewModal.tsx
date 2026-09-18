import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Card, Badge, Alert, Tab, Nav, Spinner } from 'react-bootstrap';
import { storage } from '../../firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { 
  ACCREDITATION_DOC_REQUIREMENTS, 
  type AccreditationApplication, 
  type AccreditationDocType,
  type DeliberationSchedule 
} from '../../constants/submissionTypes';
import StatusBadge from '../common/StatusBadge';
import { formatFileSize } from '../../utils/pdfScreening';

interface AccreditationReviewModalProps {
  show: boolean;
  onHide: () => void;
  application: AccreditationApplication | null;
  onVerifyAndSchedule: (
    applicationId: string, 
    schedule: Omit<DeliberationSchedule, 'scheduledBy' | 'scheduledAt'>
  ) => Promise<unknown>;
  onRequestRevision: (
    applicationId: string, 
    flaggedDocs: AccreditationDocType[], 
    remarks: string
  ) => Promise<unknown>;
  onDisapprove: (applicationId: string, reason: string) => Promise<unknown>;
}

export const AccreditationReviewModal: React.FC<AccreditationReviewModalProps> = ({
  show,
  onHide,
  application,
  onVerifyAndSchedule,
  onRequestRevision,
  onDisapprove,
}) => {
  const [activeActionTab, setActiveActionTab] = useState<'schedule' | 'revision' | 'disapprove'>('schedule');
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Schedule form state
  const [delibDate, setDelibDate] = useState('');
  const [delibTime, setDelibTime] = useState('09:00 AM');
  const [delibVenue, setDelibVenue] = useState('LYDO Session Hall, 2nd Floor');
  const [delibInstructions, setDelibInstructions] = useState(
    'Please bring one (1) printed set of original signed hard copies of the 5 submitted PDF documents for the panel deliberation and orientation.'
  );

  // Revision form state
  const [selectedFlaggedDocs, setSelectedFlaggedDocs] = useState<AccreditationDocType[]>([]);
  const [revisionRemarks, setRevisionRemarks] = useState('');

  // Disapprove form state
  const [disapproveReason, setDisapproveReason] = useState('');

  // PDF Preview state
  const [loadingDocUrl, setLoadingDocUrl] = useState<string | null>(null);

  if (!application) return null;

  const handleOpenPdf = async (docType: AccreditationDocType, storagePath: string) => {
    try {
      setLoadingDocUrl(docType);
      const storageRef = ref(storage, storagePath);
      const downloadUrl = await getDownloadURL(storageRef);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to get download URL for PDF:', err);
      alert('Could not open PDF file. The file may have been moved or removed.');
    } finally {
      setLoadingDocUrl(null);
    }
  };

  const handleVerifyScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delibDate || !delibTime || !delibVenue) {
      setActionError('Please complete the date, time, and venue fields.');
      return;
    }

    setLoadingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await onVerifyAndSchedule(application.id, {
        date: delibDate,
        time: delibTime,
        venue: delibVenue,
        instructions: delibInstructions.trim(),
      });
      setActionSuccess('Documents verified successfully! Official deliberation invitation email dispatched.');
      setTimeout(() => onHide(), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify and schedule deliberation.';
      setActionError(msg);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFlaggedDocs.length === 0 || !revisionRemarks.trim()) {
      setActionError('Please select at least one document to flag and provide revision remarks.');
      return;
    }

    setLoadingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await onRequestRevision(application.id, selectedFlaggedDocs, revisionRemarks.trim());
      setActionSuccess('Revision notice and notes sent to organization email.');
      setTimeout(() => onHide(), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request document revision.';
      setActionError(msg);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDisapproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disapproveReason.trim()) {
      setActionError('Please provide a reason for disapproval.');
      return;
    }

    if (!window.confirm('Are you sure you want to disapprove this application? This will safely delete uploaded documents.')) {
      return;
    }

    setLoadingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await onDisapprove(application.id, disapproveReason.trim());
      setActionSuccess('Application marked as disapproved.');
      setTimeout(() => onHide(), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disapprove application.';
      setActionError(msg);
    } finally {
      setLoadingAction(false);
    }
  };

  const toggleFlagDoc = (docId: AccreditationDocType) => {
    setSelectedFlaggedDocs((prev) => 
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const formattedDate = application.submittedAt?.toDate ? 
    application.submittedAt.toDate().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Just now';

  return (
    <Modal show={show} onHide={onHide} size="xl" centered className="accreditation-review-modal">
      <Modal.Header closeButton className="border-0 pb-0 pt-4 px-4">
        <div className="d-flex align-items-center justify-content-between w-100 pe-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <Badge bg="primary-subtle" className="text-primary fw-bold">
                {application.classification}
              </Badge>
              <StatusBadge status={application.status} />
            </div>
            <Modal.Title className="fw-bold text-navy h4 mb-0">
              {application.orgName}
            </Modal.Title>
            <p className="text-muted small mb-0 mt-1">
              Ref ID: <span className="font-monospace fw-semibold">{application.id}</span> · Submitted: {formattedDate}
            </p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        {actionSuccess && (
          <Alert variant="success" className="d-flex align-items-center gap-2 mb-3">
            <span className="material-symbols-outlined">check_circle</span>
            <div>{actionSuccess}</div>
          </Alert>
        )}

        {actionError && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <span className="material-symbols-outlined">error</span>
            <div>{actionError}</div>
          </Alert>
        )}

        <Row className="g-4">
          {/* Left Column: Organization Details & Document Tray */}
          <Col lg={6}>
            {/* Organization Metadata Card */}
            <Card className="border-0 shadow-sm bg-light mb-3">
              <Card.Body className="p-3">
                <h6 className="fw-bold text-navy mb-3 d-flex align-items-center gap-2">
                  <span className="material-symbols-outlined text-primary fs-5">corporate_fare</span>
                  Organization Profile
                </h6>
                <Row className="g-2 small">
                  <Col sm={6}>
                    <div className="text-muted">Barangay / Jurisdiction:</div>
                    <div className="fw-semibold text-dark">{application.barangay}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted">Classification:</div>
                    <div className="fw-semibold text-dark">{application.classification}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted">Contact Person:</div>
                    <div className="fw-semibold text-dark">{application.contactPerson}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted">Contact Mobile:</div>
                    <div className="fw-semibold text-dark">{application.contactPhone}</div>
                  </Col>
                  <Col sm={12}>
                    <div className="text-muted">Notification Email:</div>
                    <div className="fw-bold text-primary font-monospace">{application.contactEmail}</div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Existing Deliberation Card if Verified */}
            {application.deliberationSchedule && (
              <Card className="border-success bg-success-subtle mb-3">
                <Card.Body className="p-3">
                  <div className="d-flex align-items-center gap-2 text-success fw-bold mb-2">
                    <span className="material-symbols-outlined">event_available</span>
                    Scheduled Deliberation & Orientation
                  </div>
                  <Row className="g-2 small text-dark">
                    <Col sm={6}><strong>Date:</strong> {application.deliberationSchedule.date}</Col>
                    <Col sm={6}><strong>Time:</strong> {application.deliberationSchedule.time}</Col>
                    <Col sm={12}><strong>Venue:</strong> {application.deliberationSchedule.venue}</Col>
                    {application.deliberationSchedule.instructions && (
                      <Col sm={12} className="mt-1">
                        <strong>Instructions:</strong> {application.deliberationSchedule.instructions}
                      </Col>
                    )}
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* 5x Submitted PDF Document Cards */}
            <h6 className="fw-bold text-navy mb-2 d-flex align-items-center gap-2">
              <span className="material-symbols-outlined text-danger fs-5">folder_open</span>
              Submitted Documents (5 Requirements)
            </h6>

            <div className="d-flex flex-column gap-2">
              {ACCREDITATION_DOC_REQUIREMENTS.map((req) => {
                const docMeta = application.documents?.[req.id];
                const isLoadingThis = loadingDocUrl === req.id;

                return (
                  <Card key={req.id} className="border shadow-none">
                    <Card.Body className="p-2 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2 overflow-hidden">
                        <span className="material-symbols-outlined text-danger fs-4">picture_as_pdf</span>
                        <div className="overflow-hidden">
                          <div className="fw-semibold text-dark small text-truncate" title={req.label}>
                            {req.label}
                          </div>
                          {docMeta ? (
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              {docMeta.fileName} ({formatFileSize(docMeta.fileSize)})
                            </div>
                          ) : (
                            <div className="text-danger" style={{ fontSize: '11px' }}>Document missing</div>
                          )}
                        </div>
                      </div>

                      {docMeta && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          disabled={isLoadingThis}
                          onClick={() => handleOpenPdf(req.id, docMeta.storagePath)}
                          className="d-flex align-items-center gap-1 flex-shrink-0"
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                        >
                          {isLoadingThis ? (
                            <Spinner size="sm" animation="border" />
                          ) : (
                            <>
                              <span className="material-symbols-outlined fs-6">visibility</span>
                              View PDF
                            </>
                          )}
                        </Button>
                      )}
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          </Col>

          {/* Right Column: Admin Actions Suite */}
          <Col lg={6}>
            <Card className="border shadow-sm h-100">
              <Card.Header className="bg-white border-bottom-0 pt-3 px-3 pb-0">
                <Tab.Container
                  activeKey={activeActionTab}
                  onSelect={(k) => setActiveActionTab((k as 'schedule' | 'revision' | 'disapprove') || 'schedule')}
                >
                  <Nav variant="pills" className="nav-fill bg-light p-1 rounded-3">
                    <Nav.Item>
                      <Nav.Link eventKey="schedule" className="py-2 small fw-semibold">
                        <span className="d-flex align-items-center justify-content-center gap-1">
                          <span className="material-symbols-outlined fs-6">verified</span>
                          Verify & Call-in
                        </span>
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="revision" className="py-2 small fw-semibold">
                        <span className="d-flex align-items-center justify-content-center gap-1">
                          <span className="material-symbols-outlined fs-6">rate_review</span>
                          Request Revision
                        </span>
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="disapprove" className="py-2 small fw-semibold text-danger">
                        <span className="d-flex align-items-center justify-content-center gap-1">
                          <span className="material-symbols-outlined fs-6">cancel</span>
                          Disapprove
                        </span>
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                </Tab.Container>
              </Card.Header>

              <Card.Body className="p-3">
                {activeActionTab === 'schedule' && (
                  <Form onSubmit={handleVerifyScheduleSubmit}>
                    <p className="text-muted small mb-3">
                      Verify all 5 documents and issue the official <strong>Deliberation & Orientation Call-in Schedule</strong>. The system will automatically email the invitation to <strong>{application.contactEmail}</strong>.
                    </p>

                    <Row className="g-3">
                      <Col sm={6}>
                        <Form.Group controlId="delib-date">
                          <Form.Label className="small fw-semibold">Orientation Date <span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="date"
                            value={delibDate}
                            onChange={(e) => setDelibDate(e.target.value)}
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col sm={6}>
                        <Form.Group controlId="delib-time">
                          <Form.Label className="small fw-semibold">Time Slot <span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="e.g. 09:30 AM"
                            value={delibTime}
                            onChange={(e) => setDelibTime(e.target.value)}
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col sm={12}>
                        <Form.Group controlId="delib-venue">
                          <Form.Label className="small fw-semibold">Venue / Office Room <span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="text"
                            value={delibVenue}
                            onChange={(e) => setDelibVenue(e.target.value)}
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col sm={12}>
                        <Form.Group controlId="delib-instructions">
                          <Form.Label className="small fw-semibold">Instructions & Checklist</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={delibInstructions}
                            onChange={(e) => setDelibInstructions(e.target.value)}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="mt-4 pt-2 border-top d-flex justify-content-end">
                      <Button
                        type="submit"
                        variant="success"
                        disabled={loadingAction}
                        className="d-flex align-items-center gap-2 px-4 py-2"
                      >
                        {loadingAction ? <Spinner size="sm" animation="border" /> : <span className="material-symbols-outlined fs-6">send</span>}
                        <span>{loadingAction ? 'Processing & Sending Email...' : 'Verify & Send Call-in Email'}</span>
                      </Button>
                    </div>
                  </Form>
                )}

                {activeActionTab === 'revision' && (
                  <Form onSubmit={handleRevisionSubmit}>
                    <p className="text-muted small mb-3">
                      Select which documents need correction or signatures. An email notification will be dispatched to the organization.
                    </p>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold">Flag Documents for Revision:</Form.Label>
                      {ACCREDITATION_DOC_REQUIREMENTS.map((req) => (
                        <Form.Check
                          key={req.id}
                          type="checkbox"
                          id={`flag-${req.id}`}
                          label={req.label}
                          className="small mb-1"
                          checked={selectedFlaggedDocs.includes(req.id)}
                          onChange={() => toggleFlagDoc(req.id)}
                        />
                      ))}
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="revision-remarks">
                      <Form.Label className="small fw-semibold">Revision Instructions / Findings <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="e.g. Please ensure Constitution and By-Laws are signed by all founding officers."
                        value={revisionRemarks}
                        onChange={(e) => setRevisionRemarks(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <div className="mt-4 pt-2 border-top d-flex justify-content-end">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={loadingAction || selectedFlaggedDocs.length === 0}
                        className="d-flex align-items-center gap-2 px-4 py-2"
                      >
                        {loadingAction ? <Spinner size="sm" animation="border" /> : <span className="material-symbols-outlined fs-6">send</span>}
                        <span>{loadingAction ? 'Sending...' : 'Send Revision Notice'}</span>
                      </Button>
                    </div>
                  </Form>
                )}

                {activeActionTab === 'disapprove' && (
                  <Form onSubmit={handleDisapproveSubmit}>
                    <Alert variant="warning" className="small py-2 px-3 mb-3">
                      Disapproving this application will notify the organization and purge the uploaded PDF documents from cloud storage.
                    </Alert>

                    <Form.Group className="mb-3" controlId="disapprove-reason">
                      <Form.Label className="small fw-semibold">Reason for Disapproval <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        placeholder="State the formal grounds for disapproval..."
                        value={disapproveReason}
                        onChange={(e) => setDisapproveReason(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <div className="mt-4 pt-2 border-top d-flex justify-content-end">
                      <Button
                        type="submit"
                        variant="danger"
                        disabled={loadingAction}
                        className="d-flex align-items-center gap-2 px-4 py-2"
                      >
                        {loadingAction ? <Spinner size="sm" animation="border" /> : <span className="material-symbols-outlined fs-6">delete</span>}
                        <span>{loadingAction ? 'Processing...' : 'Disapprove & Purge Files'}</span>
                      </Button>
                    </div>
                  </Form>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
};

export default AccreditationReviewModal;
