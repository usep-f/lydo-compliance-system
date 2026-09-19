import React, { useState, useRef } from 'react';
import { Modal, Button, Form, ProgressBar, Alert, Card, Row, Col, Badge } from 'react-bootstrap';
import { db, storage } from '../../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { 
  ACCREDITATION_CLASSIFICATIONS, 
  ACCREDITATION_DOC_REQUIREMENTS, 
  type AccreditationClassification, 
  type AccreditationDocType,
  type AccreditationDocMeta,
  type AccreditationDocRequirement
} from '../../constants/submissionTypes';
import { BARANGAYS } from '../../constants/barangays';
import { screenPdfFile, formatFileSize } from '../../utils/pdfScreening';

interface AccreditationModalProps {
  show: boolean;
  onHide: () => void;
}

interface OrgFormData {
  orgName: string;
  classification: AccreditationClassification;
  barangay: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
}

const INITIAL_FORM: OrgFormData = {
  orgName: '',
  classification: 'Community-Based',
  barangay: 'City-Wide',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
};

interface RequirementCardProps {
  req: AccreditationDocRequirement;
  index: number;
  selectedFile: File | undefined;
  error: string | undefined;
  onSelect: (file: File) => void;
  onClear: () => void;
  disabled: boolean;
}

const RequirementCard: React.FC<RequirementCardProps> = ({
  req,
  index,
  selectedFile,
  error,
  onSelect,
  onClear,
  disabled,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelect(e.target.files[0]);
    }
    e.target.value = '';
  };

  const openPicker = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <Card
      className={`border flex-shrink-0 transition-all ${
        selectedFile
          ? 'border-success bg-success-subtle bg-opacity-10 shadow-sm'
          : isDragging
          ? 'border-primary bg-primary-subtle bg-opacity-25 shadow'
          : 'border-light-subtle bg-white shadow-sm'
      }`}
      style={{
        borderRadius: '12px',
        flexShrink: 0,
        transition: 'all 0.2s ease',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      <Card.Body className="p-3">
        {/* Requirement Header */}
        <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
          <div className="d-flex align-items-start gap-2">
            <span
              className={`badge rounded-circle mt-1 d-inline-flex align-items-center justify-content-center ${
                selectedFile ? 'bg-success text-white' : 'bg-primary text-white'
              }`}
              style={{ width: '24px', height: '24px', fontSize: '12px' }}
            >
              {selectedFile ? '✓' : index + 1}
            </span>
            <div>
              <div className="fw-bold text-navy" style={{ fontSize: '15px' }}>
                {req.label}
              </div>
              <p className="text-muted small mb-0 mt-0" style={{ fontSize: '12px' }}>
                {req.description}
              </p>
            </div>
          </div>

          {selectedFile ? (
            <Badge bg="success" className="d-inline-flex align-items-center gap-1 px-2 py-1 flex-shrink-0">
              <span className="material-symbols-outlined fs-6">task_alt</span>
              Attached
            </Badge>
          ) : (
            <Badge bg="warning" text="dark" className="px-2 py-1 flex-shrink-0">
              Required
            </Badge>
          )}
        </div>

        {/* Action / Attachment Area */}
        {selectedFile ? (
          <div className="bg-white rounded border border-success-subtle p-2 mt-2 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2 min-w-0 me-2">
              <span className="material-symbols-outlined text-danger fs-4 flex-shrink-0">
                picture_as_pdf
              </span>
              <div className="min-w-0">
                <div className="fw-bold text-dark text-truncate small" title={selectedFile.name}>
                  {selectedFile.name}
                </div>
                <div className="text-success small" style={{ fontSize: '11px' }}>
                  ✓ {formatFileSize(selectedFile.size)} • PDF Verified
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1 flex-shrink-0">
              <Button
                variant="outline-secondary"
                size="sm"
                className="py-1 px-2 small d-inline-flex align-items-center gap-1"
                onClick={openPicker}
                disabled={disabled}
                style={{ fontSize: '12px' }}
              >
                <span className="material-symbols-outlined fs-6">sync</span>
                Replace
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                className="py-1 px-2 small d-inline-flex align-items-center"
                onClick={onClear}
                disabled={disabled}
                style={{ fontSize: '12px' }}
                title="Remove file"
              >
                <span className="material-symbols-outlined fs-6">delete</span>
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={openPicker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker()}
            className="rounded p-2 mt-2 text-center border-2 border-primary border-opacity-50"
            style={{
              borderStyle: 'dashed',
              cursor: disabled ? 'not-allowed' : 'pointer',
              backgroundColor: '#F8FAFC',
              transition: 'background-color 0.2s ease',
            }}
          >
            <div className="d-flex flex-wrap align-items-center justify-content-center gap-2 py-1">
              <Button
                variant="primary"
                size="sm"
                className="d-inline-flex align-items-center gap-1 fw-semibold px-3 py-1 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openPicker();
                }}
                disabled={disabled}
              >
                <span className="material-symbols-outlined fs-5">upload_file</span>
                <span>Choose PDF File</span>
              </Button>
              <span className="text-muted small" style={{ fontSize: '12px' }}>
                or drag & drop PDF here (Max 15MB)
              </span>
            </div>
          </div>
        )}

        {/* Error Message if any */}
        {error && (
          <div className="text-danger small mt-2 d-flex align-items-center gap-1 bg-danger-subtle p-2 rounded">
            <span className="material-symbols-outlined fs-6 flex-shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export const AccreditationModal: React.FC<AccreditationModalProps> = ({ show, onHide }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<OrgFormData>(INITIAL_FORM);
  const [files, setFiles] = useState<Partial<Record<AccreditationDocType, File>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<AccreditationDocType, string>>>({});
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitStatusText, setSubmitStatusText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const resetModalState = () => {
    setStep(1);
    setFormData(INITIAL_FORM);
    setFiles({});
    setFileErrors({});
    setPrivacyAgreed(false);
    setSubmitting(false);
    setUploadProgress(0);
    setSubmitStatusText('');
    setSubmitError(null);
    setSubmittedAppId(null);
    setCopiedId(false);
  };

  const handleClose = () => {
    if (!submitting) {
      resetModalState();
      onHide();
    }
  };

  const handleInputChange = (field: keyof OrgFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = async (docType: AccreditationDocType, file: File) => {
    setFileErrors((prev) => ({ ...prev, [docType]: undefined }));
    
    // Check extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileErrors((prev) => ({ ...prev, [docType]: 'Only PDF (.pdf) documents are accepted.' }));
      return;
    }

    // Check size limit (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setFileErrors((prev) => ({ ...prev, [docType]: `File size exceeds 15MB limit (${formatFileSize(file.size)}).` }));
      return;
    }

    // Screen PDF file client-side
    const screening = await screenPdfFile(file);
    if (!screening.isValid) {
      setFileErrors((prev) => ({ ...prev, [docType]: screening.error || 'Invalid or unreadable PDF document.' }));
      return;
    }

    setFiles((prev) => ({ ...prev, [docType]: file }));
  };

  const handleClearFile = (docType: AccreditationDocType) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
    setFileErrors((prev) => ({ ...prev, [docType]: undefined }));
  };

  const isStep1Valid = Boolean(
    formData.orgName.trim() &&
    formData.contactPerson.trim() &&
    formData.contactEmail.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim()) &&
    formData.contactPhone.trim()
  );

  const uploadedCount = ACCREDITATION_DOC_REQUIREMENTS.filter((req) => Boolean(files[req.id])).length;
  const isStep2Valid = uploadedCount === ACCREDITATION_DOC_REQUIREMENTS.length;
  const missingRequirements = ACCREDITATION_DOC_REQUIREMENTS.filter((req) => !files[req.id]);

  const handleCopyAppId = () => {
    if (submittedAppId) {
      navigator.clipboard.writeText(submittedAppId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  const handleSubmit = async () => {
    if (!isStep1Valid || !isStep2Valid || !privacyAgreed) return;

    setSubmitting(true);
    setSubmitError(null);
    setUploadProgress(5);
    setSubmitStatusText('Preparing application package...');

    try {
      const appId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const docEntries: Partial<Record<AccreditationDocType, AccreditationDocMeta>> = {};

      const totalFiles = ACCREDITATION_DOC_REQUIREMENTS.length;
      let uploadedFilesCount = 0;

      for (const req of ACCREDITATION_DOC_REQUIREMENTS) {
        const file = files[req.id];
        if (!file) throw new Error(`Missing required document: ${req.label}`);

        setSubmitStatusText(`Uploading ${req.label}...`);
        const storagePath = `accreditation_docs/${appId}/${req.id}.pdf`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file, {
          contentType: 'application/pdf',
          customMetadata: {
            orgName: formData.orgName,
            docType: req.id,
          },
        });

        docEntries[req.id] = {
          storagePath,
          fileName: file.name,
          fileSize: file.size,
        };

        uploadedFilesCount++;
        setUploadProgress(10 + Math.round((uploadedFilesCount / totalFiles) * 75));
      }

      setSubmitStatusText('Registering application in database...');
      const applicationDocRef = doc(collection(db, 'accreditation_applications'), appId);
      await setDoc(applicationDocRef, {
        id: appId,
        orgName: formData.orgName.trim(),
        classification: formData.classification,
        barangay: formData.barangay,
        contactPerson: formData.contactPerson.trim(),
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        contactPhone: formData.contactPhone.trim(),
        documents: docEntries,
        status: 'pending',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setUploadProgress(100);
      setSubmitStatusText('Application complete!');
      setSubmittedAppId(appId);
    } catch (err: unknown) {
      console.error('Error submitting accreditation application:', err);
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during submission.';
      setSubmitError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      backdrop={submitting ? 'static' : true}
      keyboard={!submitting}
      centered
      className="accreditation-modal"
    >
      <Modal.Header closeButton={!submitting} className="border-0 pb-0 pt-4 px-4">
        <div>
          <Badge bg="primary" className="mb-2 px-3 py-1 fw-semibold text-uppercase letter-spacing-1">
            YORP & Accreditation
          </Badge>
          <Modal.Title className="fw-bold text-navy h4 mb-0">
            Youth Organization Accreditation Application
          </Modal.Title>
          <p className="text-muted small mb-0 mt-1">
            Submit your organization credentials for official recognition and deliberation with the Local Youth Development Office.
          </p>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        {/* Step Indicator */}
        {!submittedAppId && (
          <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom">
            <div className={`d-flex align-items-center gap-2 ${step >= 1 ? 'text-primary fw-bold' : 'text-muted'}`}>
              <span className={`badge rounded-circle ${step >= 1 ? 'bg-primary text-white' : 'bg-light text-muted border'}`}>1</span>
              <span>Organization Details</span>
            </div>
            <div className="flex-grow-1 mx-3 border-top border-2" />
            <div className={`d-flex align-items-center gap-2 ${step >= 2 ? 'text-primary fw-bold' : 'text-muted'}`}>
              <span className={`badge rounded-circle ${step >= 2 ? 'bg-primary text-white' : 'bg-light text-muted border'}`}>2</span>
              <span>Upload 5 PDFs</span>
            </div>
            <div className="flex-grow-1 mx-3 border-top border-2" />
            <div className={`d-flex align-items-center gap-2 ${step === 3 ? 'text-primary fw-bold' : 'text-muted'}`}>
              <span className={`badge rounded-circle ${step === 3 ? 'bg-primary text-white' : 'bg-light text-muted border'}`}>3</span>
              <span>Review & Submit</span>
            </div>
          </div>
        )}

        {submitError && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <span className="material-symbols-outlined">error</span>
            <div>{submitError}</div>
          </Alert>
        )}

        {/* Success Confirmation State */}
        {submittedAppId ? (
          <div className="text-center py-4">
            <div className="bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center p-3 mb-3" style={{ width: '72px', height: '72px' }}>
              <span className="material-symbols-outlined fs-1">verified</span>
            </div>
            <h4 className="fw-bold text-navy mb-2">Application Successfully Submitted!</h4>
            <p className="text-muted mb-4 max-w-md mx-auto">
              Your accreditation application has been submitted and is currently <strong>Pending Review</strong>. The LYDO administrators will verify your 5 documents and email your official deliberation schedule.
            </p>

            <Card className="bg-light border-0 p-3 mb-4 text-start">
              <Row className="g-3 small">
                <Col sm={6}>
                  <div className="text-muted">Application Reference ID:</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span className="fw-bold text-dark font-monospace fs-6 bg-white px-2 py-1 rounded border">
                      {submittedAppId}
                    </span>
                    <Button
                      variant={copiedId ? 'success' : 'outline-primary'}
                      size="sm"
                      className="py-1 px-2 d-inline-flex align-items-center gap-1"
                      onClick={handleCopyAppId}
                    >
                      <span className="material-symbols-outlined fs-6">
                        {copiedId ? 'done' : 'content_copy'}
                      </span>
                      <span>{copiedId ? 'Copied' : 'Copy'}</span>
                    </Button>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted">Notification Email:</div>
                  <div className="fw-bold text-dark mt-1">{formData.contactEmail}</div>
                </Col>
                <Col sm={12} className="pt-2 border-top">
                  <div className="text-muted">Organization Name:</div>
                  <div className="fw-bold text-primary fs-6">{formData.orgName}</div>
                </Col>
              </Row>
            </Card>

            <Alert variant="info" className="text-start small mb-4">
              <div className="fw-bold mb-1 d-flex align-items-center gap-1">
                <span className="material-symbols-outlined fs-6">info</span>
                Next Steps for Your Organization:
              </div>
              <ul className="mb-0 ps-3">
                <li>Watch your inbox ({formData.contactEmail}) for the official deliberation invitation and panel date.</li>
                <li>Prepare <strong>one (1) printed set</strong> of the original, signed hard copies of the 5 submitted PDF documents to present during the panel session.</li>
              </ul>
            </Alert>

            <Button variant="primary" className="px-4 py-2" onClick={handleClose}>
              Done & Return to Homepage
            </Button>
          </div>
        ) : (
          <>
            {/* Step 1: Organization Details Form */}
            {step === 1 && (
              <Form>
                <Row className="g-3">
                  <Col md={12}>
                    <Form.Group controlId="accred-orgName">
                      <Form.Label className="fw-semibold small">Organization Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. Samahan ng Kabataang Makabayan"
                        value={formData.orgName}
                        onChange={(e) => handleInputChange('orgName', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="accred-classification">
                      <Form.Label className="fw-semibold small">Classification <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        value={formData.classification}
                        onChange={(e) => handleInputChange('classification', e.target.value as AccreditationClassification)}
                      >
                        {ACCREDITATION_CLASSIFICATIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="accred-barangay">
                      <Form.Label className="fw-semibold small">Barangay / Jurisdiction <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        value={formData.barangay}
                        onChange={(e) => handleInputChange('barangay', e.target.value)}
                      >
                        <option value="City-Wide">City-Wide / Multi-Barangay</option>
                        {BARANGAYS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={12}>
                    <Form.Group controlId="accred-contactPerson">
                      <Form.Label className="fw-semibold small">President / Primary Contact Person <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. Juan D. Dela Cruz"
                        value={formData.contactPerson}
                        onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="accred-contactEmail">
                      <Form.Label className="fw-semibold small">Official Contact Email <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="org@example.com"
                        value={formData.contactEmail}
                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                        required
                      />
                      <Form.Text className="text-muted small">The deliberation schedule will be sent to this email.</Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="accred-contactPhone">
                      <Form.Label className="fw-semibold small">Contact Mobile / Phone <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="tel"
                        placeholder="0912 345 6789"
                        value={formData.contactPhone}
                        onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            )}

            {/* Step 2: Upload 5 PDF Requirements */}
            {step === 2 && (
              <div className="d-flex flex-column gap-3">
                {/* Progress Status Header */}
                <div className="bg-light p-3 rounded border">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-bold text-navy small">
                      Upload Requirements Progress:
                    </span>
                    <span className={`badge ${isStep2Valid ? 'bg-success' : 'bg-primary'} px-2 py-1`}>
                      {uploadedCount} of 5 Attached
                    </span>
                  </div>
                  <ProgressBar
                    now={(uploadedCount / 5) * 100}
                    variant={isStep2Valid ? 'success' : 'primary'}
                    style={{ height: '8px' }}
                    className="mb-2"
                  />
                  {isStep2Valid ? (
                    <div className="text-success small fw-semibold d-flex align-items-center gap-1">
                      <span className="material-symbols-outlined fs-6">check_circle</span>
                      All 5 required documents attached! You can now proceed to review and submit.
                    </div>
                  ) : (
                    <div className="text-muted small">
                      Please upload the <strong>{5 - uploadedCount} remaining PDF document(s)</strong> below to unlock the Next Step button.
                      {missingRequirements.length > 0 && (
                        <div className="mt-1 text-secondary" style={{ fontSize: '11.5px' }}>
                          Remaining: {missingRequirements.map((m) => m.label).join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 5 Requirements List */}
                <div className="d-flex flex-column gap-3" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {ACCREDITATION_DOC_REQUIREMENTS.map((req, idx) => (
                    <RequirementCard
                      key={req.id}
                      req={req}
                      index={idx}
                      selectedFile={files[req.id]}
                      error={fileErrors[req.id]}
                      onSelect={(file) => handleFileSelect(req.id, file)}
                      onClear={() => handleClearFile(req.id)}
                      disabled={submitting}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Review & Privacy Consent */}
            {step === 3 && (
              <div>
                <Card className="bg-light border-0 p-3 mb-3">
                  <h6 className="fw-bold text-navy mb-2">Application Summary</h6>
                  <Row className="g-2 small">
                    <Col sm={6}><strong className="text-muted">Organization:</strong> <span className="fw-bold">{formData.orgName}</span></Col>
                    <Col sm={6}><strong className="text-muted">Classification:</strong> {formData.classification}</Col>
                    <Col sm={6}><strong className="text-muted">Jurisdiction:</strong> {formData.barangay}</Col>
                    <Col sm={6}><strong className="text-muted">Contact Person:</strong> {formData.contactPerson}</Col>
                    <Col sm={6}><strong className="text-muted">Contact Email:</strong> {formData.contactEmail}</Col>
                    <Col sm={6}><strong className="text-muted">Contact Phone:</strong> {formData.contactPhone}</Col>
                  </Row>
                </Card>

                <Card className="border p-3 mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="fw-bold text-navy mb-0">Attached Documents (5/5)</h6>
                    <Badge bg="success">Ready for Submission</Badge>
                  </div>
                  <ul className="list-unstyled mb-0 small">
                    {ACCREDITATION_DOC_REQUIREMENTS.map((req) => (
                      <li key={req.id} className="d-flex align-items-center justify-content-between py-2 border-bottom border-light">
                        <span className="d-flex align-items-center gap-2">
                          <span className="material-symbols-outlined text-danger fs-5">picture_as_pdf</span>
                          <span className="fw-semibold">{req.label}</span>
                        </span>
                        <span className="text-muted font-monospace small">
                          {files[req.id]?.name} ({formatFileSize(files[req.id]?.size || 0)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Form.Check
                  type="checkbox"
                  id="privacy-consent"
                  className="small text-muted mb-3"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  label={
                    <span>
                      I hereby certify that all information and documents submitted are true and correct. I consent to the collection and processing of our organization's data by the Local Youth Development Office in compliance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>.
                    </span>
                  }
                />

                {submitting && (
                  <div className="mb-3 bg-light p-3 rounded border">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span className="fw-semibold text-primary">{submitStatusText}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <ProgressBar now={uploadProgress} animated variant="primary" />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Modal.Body>

      {!submittedAppId && (
        <Modal.Footer className="border-0 pt-0 px-4 pb-4 d-flex justify-content-between">
          {step > 1 ? (
            <Button
              variant="outline-secondary"
              disabled={submitting}
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2)}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="d-flex gap-2">
            <Button variant="light" disabled={submitting} onClick={handleClose}>
              Cancel
            </Button>

            {step === 1 && (
              <Button
                variant="primary"
                disabled={!isStep1Valid}
                onClick={() => setStep(2)}
              >
                Next Step
              </Button>
            )}

            {step === 2 && (
              <Button
                variant="primary"
                disabled={!isStep2Valid}
                onClick={() => setStep(3)}
                className="d-flex align-items-center gap-1"
              >
                <span>Next Step ({uploadedCount}/5)</span>
                {isStep2Valid && <span className="material-symbols-outlined fs-6">arrow_forward</span>}
              </Button>
            )}

            {step === 3 && (
              <Button
                variant="primary"
                disabled={!privacyAgreed || submitting}
                onClick={handleSubmit}
                className="d-flex align-items-center gap-2"
              >
                {submitting && <span className="spinner-border spinner-border-sm" role="status" />}
                <span>{submitting ? 'Submitting Application...' : 'Submit Application'}</span>
              </Button>
            )}
          </div>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default AccreditationModal;
