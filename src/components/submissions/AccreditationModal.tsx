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
      className={`border transition-all ${
        selectedFile
          ? 'border-success-subtle bg-success-subtle bg-opacity-10 shadow-sm'
          : isDragging
          ? 'border-primary bg-primary-subtle bg-opacity-25 shadow-sm'
          : 'border-light-subtle bg-white shadow-xs'
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
          <div className="d-flex align-items-start gap-2 min-w-0">
            <span
              className={`badge rounded-circle mt-0.5 d-inline-flex align-items-center justify-content-center flex-shrink-0 ${
                selectedFile ? 'bg-success text-white' : 'bg-primary text-white'
              }`}
              style={{ width: '24px', height: '24px', fontSize: '12px', fontWeight: 600 }}
            >
              {selectedFile ? '✓' : index + 1}
            </span>
            <div className="min-w-0">
              <div className="fw-bold text-navy" style={{ fontSize: '14.5px' }}>
                {req.label}
              </div>
              <p className="text-muted small mb-0 mt-0.5" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                {req.description}
              </p>
            </div>
          </div>

          {selectedFile ? (
            <Badge bg="success" className="d-inline-flex align-items-center gap-1 px-2.5 py-1 flex-shrink-0 fw-semibold">
              <span className="material-symbols-outlined fs-6">task_alt</span>
              <span>Attached</span>
            </Badge>
          ) : (
            <Badge bg="warning-subtle" className="text-warning-emphasis border border-warning-subtle px-2.5 py-1 flex-shrink-0 fw-semibold">
              Required
            </Badge>
          )}
        </div>

        {/* Action / Attachment Area */}
        {selectedFile ? (
          <div className="bg-white rounded-2 border border-success-subtle p-2.5 mt-2 d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2 min-w-0">
              <span className="badge rounded-2 bg-danger-subtle text-danger d-inline-flex align-items-center justify-content-center p-1.5 flex-shrink-0">
                <span className="material-symbols-outlined fs-5">picture_as_pdf</span>
              </span>
              <div className="min-w-0">
                <div className="fw-bold text-dark text-truncate small" title={selectedFile.name}>
                  {selectedFile.name}
                </div>
                <div className="text-success small fw-medium" style={{ fontSize: '11.5px' }}>
                  ✓ {formatFileSize(selectedFile.size)} • PDF Verified
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-shrink-0 align-self-end align-self-sm-center">
              <Button
                variant="outline-secondary"
                size="sm"
                className="py-1 px-2.5 small d-inline-flex align-items-center gap-1"
                onClick={openPicker}
                disabled={disabled}
                style={{ fontSize: '12px' }}
              >
                <span className="material-symbols-outlined fs-6">sync</span>
                <span>Replace</span>
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                className="py-1 px-2.5 small d-inline-flex align-items-center"
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
            className="rounded-2 p-2.5 mt-2 text-center border-2 border-primary border-opacity-50"
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
                className="d-inline-flex align-items-center gap-1 fw-semibold px-3 py-1 shadow-xs"
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
          <div className="text-danger small mt-2 d-flex align-items-center gap-1.5 bg-danger-subtle p-2 rounded-2 border border-danger-subtle">
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
          <Badge bg="primary" className="mb-2 px-2.5 py-1 fw-semibold text-uppercase letter-spacing-1 shadow-xs">
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
        {/* Step Progress Stepper Bar */}
        {!submittedAppId && (
          <div className="bg-light bg-opacity-75 p-3 rounded-3 border mb-4">
            <div className="d-flex align-items-center justify-content-between position-relative">
              {/* Step 1 */}
              <div 
                className={`d-flex align-items-center gap-2 ${
                  step === 1 ? 'text-primary fw-bold' : step > 1 ? 'text-dark fw-semibold' : 'text-muted'
                }`}
                style={{ cursor: step > 1 && !submitting ? 'pointer' : 'default', zIndex: 2 }}
                onClick={() => step > 1 && !submitting && setStep(1)}
              >
                <span 
                  className={`badge rounded-circle d-inline-flex align-items-center justify-content-center ${
                    step > 1 ? 'bg-success text-white' : step === 1 ? 'bg-primary text-white shadow-xs' : 'bg-white text-muted border'
                  }`}
                  style={{ width: '28px', height: '28px', fontSize: '13px', fontWeight: 600 }}
                >
                  {step > 1 ? <span className="material-symbols-outlined fs-6">check</span> : '1'}
                </span>
                <span className="small d-none d-sm-inline">Organization Details</span>
                <span className="small d-inline d-sm-none">Details</span>
              </div>

              {/* Connector 1 */}
              <div 
                className={`flex-grow-1 mx-2 mx-md-3 border-top ${step >= 2 ? 'border-primary border-2' : 'border-secondary-subtle'}`} 
                style={{ zIndex: 1 }} 
              />

              {/* Step 2 */}
              <div 
                className={`d-flex align-items-center gap-2 ${
                  step === 2 ? 'text-primary fw-bold' : step > 2 ? 'text-dark fw-semibold' : 'text-muted'
                }`}
                style={{ cursor: step > 2 && !submitting ? 'pointer' : 'default', zIndex: 2 }}
                onClick={() => step > 2 && !submitting && setStep(2)}
              >
                <span 
                  className={`badge rounded-circle d-inline-flex align-items-center justify-content-center ${
                    step > 2 ? 'bg-success text-white' : step === 2 ? 'bg-primary text-white shadow-xs' : 'bg-white text-muted border'
                  }`}
                  style={{ width: '28px', height: '28px', fontSize: '13px', fontWeight: 600 }}
                >
                  {step > 2 ? <span className="material-symbols-outlined fs-6">check</span> : '2'}
                </span>
                <span className="small d-none d-sm-inline">Upload 5 PDFs</span>
                <span className="small d-inline d-sm-none">Documents</span>
              </div>

              {/* Connector 2 */}
              <div 
                className={`flex-grow-1 mx-2 mx-md-3 border-top ${step === 3 ? 'border-primary border-2' : 'border-secondary-subtle'}`} 
                style={{ zIndex: 1 }} 
              />

              {/* Step 3 */}
              <div 
                className={`d-flex align-items-center gap-2 ${
                  step === 3 ? 'text-primary fw-bold' : 'text-muted'
                }`}
                style={{ zIndex: 2 }}
              >
                <span 
                  className={`badge rounded-circle d-inline-flex align-items-center justify-content-center ${
                    step === 3 ? 'bg-primary text-white shadow-xs' : 'bg-white text-muted border'
                  }`}
                  style={{ width: '28px', height: '28px', fontSize: '13px', fontWeight: 600 }}
                >
                  3
                </span>
                <span className="small d-none d-sm-inline">Review & Submit</span>
                <span className="small d-inline d-sm-none">Review</span>
              </div>
            </div>
          </div>
        )}

        {submitError && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-4 rounded-3 shadow-xs">
            <span className="material-symbols-outlined fs-5">error</span>
            <div className="small">{submitError}</div>
          </Alert>
        )}

        {/* Success Confirmation State */}
        {submittedAppId ? (
          <div className="text-center py-2">
            <div 
              className="bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center p-3 mb-3 shadow-xs" 
              style={{ width: '68px', height: '68px' }}
            >
              <span className="material-symbols-outlined fs-1">verified</span>
            </div>
            <h4 className="fw-bold text-navy mb-2">Application Successfully Submitted!</h4>
            <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: '540px', lineHeight: '1.6' }}>
              Your accreditation credentials have been registered and are currently <strong>Pending Review</strong>. The LYDO administrators will verify your 5 documents and dispatch your official deliberation invitation via email.
            </p>

            {/* Application Reference ID Hero Card */}
            <div 
              className="border border-primary-subtle bg-primary-subtle bg-opacity-10 rounded-3 text-start mb-4 shadow-xs"
              style={{ padding: '20px 24px' }}
            >
              <div className="text-primary text-uppercase fw-bold mb-2" style={{ fontSize: '11px', letterSpacing: '0.8px' }}>
                Official Application Reference ID
              </div>
              <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-navy font-monospace fs-5 bg-white px-3 py-2 rounded-2 border shadow-xs" style={{ letterSpacing: '0.5px' }}>
                    {submittedAppId}
                  </span>
                  <Button
                    variant={copiedId ? 'success' : 'primary'}
                    size="sm"
                    className="py-2 px-3 d-inline-flex align-items-center gap-1.5 fw-semibold shadow-xs"
                    onClick={handleCopyAppId}
                  >
                    <span className="material-symbols-outlined fs-6">
                      {copiedId ? 'done' : 'content_copy'}
                    </span>
                    <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
                  </Button>
                </div>
                <div className="text-muted small align-self-start align-self-sm-center" style={{ maxWidth: '240px', fontSize: '11.5px', lineHeight: '1.4' }}>
                  <span className="material-symbols-outlined fs-6 text-primary align-middle me-1">bookmark</span>
                  Keep this Reference ID to track application status with the LYDO office.
                </div>
              </div>
            </div>

            {/* Submission Metadata Overview Card */}
            <div 
              className="border rounded-3 text-start bg-light bg-opacity-50 mb-4 shadow-xs"
              style={{ padding: '22px 24px' }}
            >
              <Row className="g-4">
                <Col sm={6}>
                  <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                    Organization Name
                  </div>
                  <div className="fw-bold text-dark fs-6">{formData.orgName}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                    Classification & Jurisdiction
                  </div>
                  <div className="fw-semibold text-dark fs-6">
                    {formData.classification} · {formData.barangay}
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                    Primary Contact Person
                  </div>
                  <div className="fw-semibold text-dark">{formData.contactPerson} ({formData.contactPhone})</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                    Notification Email
                  </div>
                  <div className="fw-semibold text-primary font-monospace">{formData.contactEmail}</div>
                </Col>
              </Row>
            </div>

            {/* Next Steps Card */}
            <Alert variant="info" className="text-start small mb-4 border-info-subtle bg-info-subtle bg-opacity-25 rounded-3" style={{ padding: '18px 22px' }}>
              <div className="fw-bold text-navy mb-2 d-flex align-items-center gap-1.5">
                <span className="material-symbols-outlined text-primary fs-5">fact_check</span>
                Next Steps for Your Organization:
              </div>
              <ul className="mb-0 ps-3 text-secondary d-flex flex-column gap-1.5">
                <li>
                  Watch your inbox (<strong className="text-dark">{formData.contactEmail}</strong>) for the official deliberation invitation, panel schedule, and venue details.
                </li>
                <li>
                  Prepare <strong>one (1) printed set</strong> of the original, signed hard copies of the 5 submitted PDF documents to present during the panel session.
                </li>
              </ul>
            </Alert>

            <Button variant="primary" className="px-4 py-2 fw-semibold shadow-xs" onClick={handleClose}>
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
                      <Form.Label className="fw-semibold small text-secondary">
                        Organization Name <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. Samahan ng Kabataang Makabayan"
                        value={formData.orgName}
                        onChange={(e) => handleInputChange('orgName', e.target.value)}
                        required
                        className="py-2"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="accred-classification">
                      <Form.Label className="fw-semibold small text-secondary">
                        Classification <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={formData.classification}
                        onChange={(e) => handleInputChange('classification', e.target.value as AccreditationClassification)}
                        className="py-2"
                      >
                        {ACCREDITATION_CLASSIFICATIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="accred-barangay">
                      <Form.Label className="fw-semibold small text-secondary">
                        Barangay / Jurisdiction <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={formData.barangay}
                        onChange={(e) => handleInputChange('barangay', e.target.value)}
                        className="py-2"
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
                      <Form.Label className="fw-semibold small text-secondary">
                        President / Primary Contact Person <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. Juan D. Dela Cruz"
                        value={formData.contactPerson}
                        onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                        required
                        className="py-2"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="accred-contactEmail">
                      <Form.Label className="fw-semibold small text-secondary">
                        Official Contact Email <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="org@example.com"
                        value={formData.contactEmail}
                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                        required
                        className="py-2"
                      />
                      <Form.Text className="text-muted small" style={{ fontSize: '11.5px' }}>
                        The official deliberation schedule will be sent to this email.
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="accred-contactPhone">
                      <Form.Label className="fw-semibold small text-secondary">
                        Contact Mobile / Phone <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="tel"
                        placeholder="0912 345 6789"
                        value={formData.contactPhone}
                        onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                        required
                        className="py-2"
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
                <div className="bg-light p-3 rounded-3 border shadow-xs">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-bold text-navy small">
                      Upload Requirements Progress:
                    </span>
                    <span className={`badge ${isStep2Valid ? 'bg-success' : 'bg-primary'} px-2.5 py-1 fw-semibold`}>
                      {uploadedCount} of 5 Attached
                    </span>
                  </div>
                  <ProgressBar
                    now={(uploadedCount / 5) * 100}
                    variant={isStep2Valid ? 'success' : 'primary'}
                    style={{ height: '8px' }}
                    className="mb-2 rounded-pill"
                  />
                  {isStep2Valid ? (
                    <div className="text-success small fw-semibold d-flex align-items-center gap-1.5">
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
                <div className="d-flex flex-column gap-3" style={{ maxHeight: '430px', overflowY: 'auto', paddingRight: '4px' }}>
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
                {/* Card 1: Application Summary */}
                <Card className="border rounded-3 shadow-xs bg-white mb-4">
                  <Card.Header 
                    className="bg-light bg-opacity-75 border-bottom d-flex align-items-center justify-content-between"
                    style={{ padding: '14px 20px' }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined text-primary fs-5">corporate_fare</span>
                      <span className="fw-bold text-navy small text-uppercase" style={{ letterSpacing: '0.6px' }}>
                        Organization Profile Summary
                      </span>
                    </div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="py-1 px-2.5 small d-inline-flex align-items-center gap-1 fw-semibold"
                      style={{ fontSize: '12px' }}
                      onClick={() => setStep(1)}
                      disabled={submitting}
                    >
                      <span className="material-symbols-outlined fs-6">edit</span>
                      <span>Edit Details</span>
                    </Button>
                  </Card.Header>
                  <Card.Body style={{ padding: '22px 24px' }}>
                    <Row className="g-4">
                      <Col md={6}>
                        <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                          Organization Name
                        </div>
                        <div className="fw-bold text-dark fs-6 text-break">
                          {formData.orgName}
                        </div>
                      </Col>
                      <Col md={3} sm={6}>
                        <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                          Classification
                        </div>
                        <div>
                          <Badge bg="primary-subtle" className="text-primary border border-primary-subtle px-2 py-1 fw-semibold">
                            {formData.classification}
                          </Badge>
                        </div>
                      </Col>
                      <Col md={3} sm={6}>
                        <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                          Jurisdiction
                        </div>
                        <div className="fw-semibold text-dark">
                          {formData.barangay}
                        </div>
                      </Col>

                      <Col md={6}>
                        <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                          President / Primary Contact
                        </div>
                        <div className="fw-semibold text-dark d-flex align-items-center gap-1.5">
                          <span className="material-symbols-outlined text-secondary fs-5">person</span>
                          <span>{formData.contactPerson}</span>
                        </div>
                      </Col>
                      <Col md={3} sm={6}>
                        <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                          Official Email
                        </div>
                        <div className="fw-semibold text-dark text-truncate" title={formData.contactEmail}>
                          <span className="font-monospace small">{formData.contactEmail}</span>
                        </div>
                      </Col>
                      <Col md={3} sm={6}>
                        <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                          Contact Phone
                        </div>
                        <div className="fw-semibold text-dark">
                          {formData.contactPhone}
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* Card 2: Attached Documents Card (Pill-Free & Spacious) */}
                <Card className="border rounded-3 shadow-xs bg-white mb-4">
                  <Card.Header 
                    className="bg-light bg-opacity-75 border-bottom d-flex align-items-center justify-content-between"
                    style={{ padding: '14px 20px' }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined text-success fs-5">folder_zip</span>
                      <span className="fw-bold text-navy small text-uppercase" style={{ letterSpacing: '0.6px' }}>
                        Attached Documents (5/5)
                      </span>
                      <Badge bg="success-subtle" className="text-success border border-success-subtle px-2 py-0.5 fw-semibold">
                        Ready for Submission
                      </Badge>
                    </div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="py-1 px-2.5 small d-inline-flex align-items-center gap-1 fw-semibold"
                      style={{ fontSize: '12px' }}
                      onClick={() => setStep(2)}
                      disabled={submitting}
                    >
                      <span className="material-symbols-outlined fs-6">sync</span>
                      <span>Manage Files</span>
                    </Button>
                  </Card.Header>
                  <Card.Body style={{ padding: '20px' }}>
                    <div className="d-flex flex-column gap-2">
                      {ACCREDITATION_DOC_REQUIREMENTS.map((req, idx) => {
                        const file = files[req.id];
                        return (
                          <div
                            key={req.id}
                            className="p-3 rounded-3 border bg-light bg-opacity-25 d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2"
                            style={{ transition: 'background-color 0.2s ease' }}
                          >
                            <div className="d-flex align-items-center gap-2.5 min-w-0">
                              <span className="material-symbols-outlined text-danger fs-5 flex-shrink-0">
                                picture_as_pdf
                              </span>
                              <div className="fw-semibold text-dark small text-truncate">
                                {idx + 1}. {req.label}
                              </div>
                            </div>

                            {/* Clean, pill-free metadata */}
                            <div className="d-flex align-items-center gap-2 flex-shrink-0 text-muted small ps-sm-2">
                              <span className="text-secondary text-truncate" style={{ maxWidth: '260px' }} title={file?.name}>
                                {file?.name || 'Attached PDF'}
                              </span>
                              <span>•</span>
                              <span className="text-success fw-medium">
                                {file ? formatFileSize(file.size) : 'Verified PDF'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card.Body>
                </Card>

                {/* Card 3: Data Privacy & Certification Card */}
                <div
                  className={`rounded-3 border transition-all mb-4 ${
                    privacyAgreed 
                      ? 'border-primary bg-primary-subtle bg-opacity-10 shadow-xs' 
                      : 'border-light-subtle bg-light bg-opacity-50'
                  }`}
                  style={{ 
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    padding: '18px 20px'
                  }}
                  onClick={() => !submitting && setPrivacyAgreed(!privacyAgreed)}
                >
                  <Form.Check
                    type="checkbox"
                    id="privacy-consent"
                    className="d-flex align-items-start gap-2.5 mb-0"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    disabled={submitting}
                    onClick={(e) => e.stopPropagation()}
                    label={
                      <span className="small text-secondary" style={{ lineHeight: '1.55' }}>
                        I hereby certify that all information and documents submitted are true and correct. I consent to the collection and processing of our organization's data by the Local Youth Development Office in compliance with the <strong className="text-dark">Data Privacy Act of 2012 (RA 10173)</strong>.
                      </span>
                    }
                  />
                </div>

                {submitting && (
                  <div className="p-3 bg-light rounded-3 border shadow-xs mb-3">
                    <div className="d-flex justify-content-between small text-muted mb-1.5">
                      <span className="fw-semibold text-primary d-flex align-items-center gap-1.5">
                        <span className="spinner-border spinner-border-sm" role="status" />
                        <span>{submitStatusText}</span>
                      </span>
                      <span className="fw-bold">{uploadProgress}%</span>
                    </div>
                    <ProgressBar now={uploadProgress} animated variant="primary" className="rounded-pill" style={{ height: '8px' }} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Modal.Body>

      {!submittedAppId && (
        <Modal.Footer className="border-top pt-3 px-4 pb-4 d-flex justify-content-between">
          {step > 1 ? (
            <Button
              variant="outline-secondary"
              disabled={submitting}
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2)}
              className="d-inline-flex align-items-center gap-1 px-3 py-2 fw-semibold"
            >
              <span className="material-symbols-outlined fs-6">arrow_back</span>
              <span>Back</span>
            </Button>
          ) : (
            <div />
          )}

          <div className="d-flex gap-2">
            <Button 
              variant="light" 
              disabled={submitting} 
              onClick={handleClose}
              className="px-3 py-2 fw-semibold border"
            >
              Cancel
            </Button>

            {step === 1 && (
              <Button
                variant="primary"
                disabled={!isStep1Valid}
                onClick={() => setStep(2)}
                className="d-inline-flex align-items-center gap-1 px-4 py-2 fw-semibold shadow-xs"
              >
                <span>Next Step</span>
                <span className="material-symbols-outlined fs-6">arrow_forward</span>
              </Button>
            )}

            {step === 2 && (
              <Button
                variant="primary"
                disabled={!isStep2Valid}
                onClick={() => setStep(3)}
                className="d-inline-flex align-items-center gap-1 px-4 py-2 fw-semibold shadow-xs"
              >
                <span>Review & Submit ({uploadedCount}/5)</span>
                {isStep2Valid && <span className="material-symbols-outlined fs-6">arrow_forward</span>}
              </Button>
            )}

            {step === 3 && (
              <Button
                variant="primary"
                disabled={!privacyAgreed || submitting}
                onClick={handleSubmit}
                className="d-inline-flex align-items-center gap-2 px-4 py-2 fw-semibold shadow-xs"
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
