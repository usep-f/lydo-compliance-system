import React, { useState } from 'react';
import { Modal, Button, Form, ProgressBar, Alert, Card, Row, Col, Badge } from 'react-bootstrap';
import { db, storage } from '../../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { 
  ACCREDITATION_CLASSIFICATIONS, 
  ACCREDITATION_DOC_REQUIREMENTS, 
  type AccreditationClassification, 
  type AccreditationDocType,
  type AccreditationDocMeta
} from '../../constants/submissionTypes';
import { BARANGAYS } from '../../constants/barangays';
import FileDropZone from '../common/FileDropZone';
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

export const AccreditationModal: React.FC<AccreditationModalProps> = ({ show, onHide }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<OrgFormData>(INITIAL_FORM);
  const [files, setFiles] = useState<Partial<Record<AccreditationDocType, File>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<AccreditationDocType, string>>>({});
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  const resetModalState = () => {
    setStep(1);
    setFormData(INITIAL_FORM);
    setFiles({});
    setFileErrors({});
    setPrivacyAgreed(false);
    setSubmitting(false);
    setUploadProgress(0);
    setSubmitError(null);
    setSubmittedAppId(null);
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
    const screening = await screenPdfFile(file);
    if (!screening.isValid) {
      setFileErrors((prev) => ({ ...prev, [docType]: screening.error || 'Invalid PDF file' }));
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

  const isStep2Valid = ACCREDITATION_DOC_REQUIREMENTS.every((req) => Boolean(files[req.id]));

  const handleSubmit = async () => {
    if (!isStep1Valid || !isStep2Valid || !privacyAgreed) return;

    setSubmitting(true);
    setSubmitError(null);
    setUploadProgress(10);

    try {
      const appId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const docEntries: Partial<Record<AccreditationDocType, AccreditationDocMeta>> = {};

      const totalFiles = ACCREDITATION_DOC_REQUIREMENTS.length;
      let uploadedCount = 0;

      for (const req of ACCREDITATION_DOC_REQUIREMENTS) {
        const file = files[req.id];
        if (!file) throw new Error(`Missing document: ${req.label}`);

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

        uploadedCount++;
        setUploadProgress(10 + Math.round((uploadedCount / totalFiles) * 75));
      }

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
              Your accreditation application has been placed under <strong>Pending Review</strong>. The LYDO staff will inspect your documents and send an official deliberation and orientation schedule to your email.
            </p>

            <Card className="bg-light border-0 p-3 mb-4 text-start">
              <Row className="g-2 small">
                <Col sm={6}>
                  <div className="text-muted">Application Reference ID:</div>
                  <div className="fw-bold text-dark font-monospace">{submittedAppId}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted">Notification Email:</div>
                  <div className="fw-bold text-dark">{formData.contactEmail}</div>
                </Col>
                <Col sm={12} className="mt-2 pt-2 border-top">
                  <div className="text-muted">Organization Name:</div>
                  <div className="fw-bold text-primary">{formData.orgName}</div>
                </Col>
              </Row>
            </Card>

            <Alert variant="info" className="text-start small mb-4">
              <div className="fw-bold mb-1 d-flex align-items-center gap-1">
                <span className="material-symbols-outlined fs-6">info</span>
                Next Steps for Your Organization:
              </div>
              <ul className="mb-0 ps-3">
                <li>Check your inbox regularly for the official invitation letter.</li>
                <li>Prepare printed, physical copies of the 5 submitted PDFs for the on-site panel deliberation.</li>
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
                <Alert variant="info" className="py-2 px-3 small mb-2 d-flex align-items-center gap-2">
                  <span className="material-symbols-outlined fs-5">upload_file</span>
                  <div>Please upload all <strong>5 required accreditation documents</strong> in PDF format (Max 15MB each).</div>
                </Alert>

                <div className="d-flex flex-column gap-3" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {ACCREDITATION_DOC_REQUIREMENTS.map((req, idx) => {
                    const selected = files[req.id];
                    const err = fileErrors[req.id];

                    return (
                      <Card key={req.id} className={`border ${selected ? 'border-success bg-light' : 'border-light-subtle shadow-sm'}`}>
                        <Card.Body className="p-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-primary-subtle text-primary rounded-pill px-2 py-1 small fw-bold">
                                {idx + 1}
                              </span>
                              <span className="fw-semibold text-navy">{req.label}</span>
                            </div>
                            {selected ? (
                              <Badge bg="success" className="d-flex align-items-center gap-1">
                                <span className="material-symbols-outlined fs-6">check</span>
                                Ready ({formatFileSize(selected.size)})
                              </Badge>
                            ) : (
                              <Badge bg="secondary">Required</Badge>
                            )}
                          </div>
                          <p className="text-muted small mb-2">{req.description}</p>

                          <FileDropZone
                            accept=".pdf"
                            maxSizeMB={15}
                            onFileSelect={(file) => handleFileSelect(req.id, file)}
                            onError={(msg) => setFileErrors((prev) => ({ ...prev, [req.id]: msg }))}
                            selectedFile={selected || null}
                            onClear={() => handleClearFile(req.id)}
                            label={`Upload ${req.label} (PDF)`}
                            helpText="Drag & drop or browse PDF file (Max 15MB)"
                          />

                          {err && (
                            <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                              <span className="material-symbols-outlined fs-6">error</span>
                              {err}
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    );
                  })}
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
                  <h6 className="fw-bold text-navy mb-2">Attached Documents (5/5)</h6>
                  <ul className="list-unstyled mb-0 small">
                    {ACCREDITATION_DOC_REQUIREMENTS.map((req) => (
                      <li key={req.id} className="d-flex align-items-center justify-content-between py-1 border-bottom border-light">
                        <span className="d-flex align-items-center gap-2">
                          <span className="material-symbols-outlined text-danger fs-6">picture_as_pdf</span>
                          {req.label}
                        </span>
                        <span className="text-muted font-monospace">{files[req.id]?.name} ({formatFileSize(files[req.id]?.size || 0)})</span>
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
                  <div className="mb-3">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Uploading documents and registering application...</span>
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

            {step < 3 ? (
              <Button
                variant="primary"
                disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
                onClick={() => setStep((prev) => (prev + 1) as 2 | 3)}
              >
                Next Step
              </Button>
            ) : (
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
