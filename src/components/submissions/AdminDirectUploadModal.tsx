import React, { useState, useMemo, useCallback } from 'react';
import { Modal, Form, Button, Alert, ProgressBar, Row, Col } from 'react-bootstrap';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, storage, functions } from '../../firebase';
import { BARANGAYS } from '../../constants/barangays';
import { 
  BASE_DOCUMENT_TYPES, 
  ACCOMPLISHMENT_CATEGORIES,
  type Frequency 
} from '../../constants/submissionTypes';
import { screenPdfFile, formatFileSize, type PdfScreeningResult } from '../../utils/pdfScreening';
import { getSubmittablePeriods, formatPeriodLabel } from '../../utils/periodUtils';
import FileDropZone from '../common/FileDropZone';
import LoadingButton from '../common/LoadingButton';
import { useToast } from '../../context/ToastContext';

interface AdminDirectUploadModalProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
}

const AdminDirectUploadModal: React.FC<AdminDirectUploadModalProps> = ({
  show,
  onHide,
  onSuccess,
}) => {
  const currentYear = new Date().getFullYear();
  const { addToast } = useToast();

  // Form states
  const [selectedBarangay, setSelectedBarangay] = useState<string>('');
  const [selectedBaseTypeId, setSelectedBaseTypeId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');

  // File and screening state
  const [file, setFile] = useState<File | null>(null);
  const [screening, setScreening] = useState<PdfScreeningResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Uploading state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const baseType = useMemo(
    () => BASE_DOCUMENT_TYPES.find((t) => t.id === selectedBaseTypeId),
    [selectedBaseTypeId]
  );
  const isAccomplishment = baseType?.id === 'accomplishment_report';

  // Submittable periods for scheduled documents
  const availablePeriods = useMemo(() => {
    if (baseType?.category === 'scheduled' && baseType.frequency) {
      return getSubmittablePeriods(baseType.frequency as Frequency, currentYear, new Date());
    }
    return [];
  }, [baseType, currentYear]);

  // Handle Base Document Type change
  const handleBaseTypeChange = useCallback(
    (newTypeId: string) => {
      setSelectedBaseTypeId(newTypeId);
      setSelectedCategory('');
      const matched = BASE_DOCUMENT_TYPES.find((t) => t.id === newTypeId);
      if (!matched) {
        setSelectedPeriod('');
      } else if (matched.category === 'asap') {
        setSelectedPeriod('ASAP');
      } else if (matched.category === 'perennial') {
        setSelectedPeriod(currentYear.toString());
      } else if (matched.category === 'scheduled' && matched.frequency) {
        const periods = getSubmittablePeriods(matched.frequency as Frequency, currentYear, new Date());
        setSelectedPeriod(periods[0] || '');
      }
    },
    [currentYear]
  );

  // File selection and screening
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setFileError(null);
    setScreening(null);
    setSubmitError(null);

    try {
      const result = await screenPdfFile(selectedFile);
      if (result.isValid) {
        setScreening(result);
      } else {
        setFileError(result.error || 'Invalid PDF file.');
        setFile(null);
      }
    } catch (err: unknown) {
      setFileError((err as Error).message || 'Failed to screen PDF file.');
      setFile(null);
    }
  }, []);

  const resetForm = useCallback(() => {
    setSelectedBarangay('');
    setSelectedBaseTypeId('');
    setSelectedCategory('');
    setSelectedPeriod('');
    setAdminNotes('');
    setFile(null);
    setScreening(null);
    setFileError(null);
    setSubmitError(null);
    setUploadProgress(0);
    setIsUploading(false);
  }, []);

  const handleClose = () => {
    if (isUploading) return;
    resetForm();
    onHide();
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarangay) {
      setSubmitError('Please select a target barangay.');
      return;
    }
    if (!baseType || !selectedPeriod) {
      setSubmitError('Please select a document type and submission period.');
      return;
    }
    if (isAccomplishment && !selectedCategory) {
      setSubmitError('Please select an accomplishment category.');
      return;
    }
    if (!file || !screening || !screening.isValid) {
      setSubmitError('Please attach a verified PDF document.');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setSubmitError('You must be signed in as an administrator to upload.');
      return;
    }

    setIsUploading(true);
    setSubmitError(null);

    const actualDocTypeId = isAccomplishment ? `acc_${selectedCategory}` : baseType.id;
    const actualDocLabel = isAccomplishment
      ? `Accomplishment: ${ACCOMPLISHMENT_CATEGORIES.find((c) => c.id === selectedCategory)?.label || selectedCategory}`
      : baseType.label;

    try {
      // 1. Upload PDF to Storage under admin path
      const safeBarangay = selectedBarangay.replace(/[^a-zA-Z0-9]/g, '_');
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const storagePath = `submission_files/${currentUser.uid}/${currentYear}/${safeBarangay}/${actualDocTypeId}/${Date.now()}_${safeName}`;

      const fileRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(fileRef, file, {
        contentType: 'application/pdf',
      });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          },
          (error) => reject(error),
          () => resolve()
        );
      });

      // 2. Call backend Cloud Function to record directly as approved
      const adminDirectUploadFn = httpsCallable(functions, 'adminDirectUpload');
      await adminDirectUploadFn({
        barangay: selectedBarangay,
        documentType: actualDocTypeId,
        documentLabel: actualDocLabel,
        category: baseType.category,
        period: selectedPeriod,
        year: currentYear,
        accomplishmentCategory: isAccomplishment ? selectedCategory : null,
        fileName: file.name,
        fileSize: file.size,
        fileStoragePath: storagePath,
        pageCount: screening.pageCount,
        pdfMetadata: screening.metadata,
        adminNotes: adminNotes.trim() || undefined,
      });

      addToast(`Direct submission for ${selectedBarangay} logged and approved successfully!`, 'success');
      resetForm();
      onSuccess();
      onHide();
    } catch (err: unknown) {
      console.error('Direct upload error:', err);
      setSubmitError((err as Error).message || 'Failed to complete direct upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      backdrop={isUploading ? 'static' : true}
      keyboard={!isUploading}
      size="lg"
      centered
    >
      <Modal.Header closeButton={!isUploading} className="border-0 pb-0">
        <div className="d-flex align-items-center gap-2">
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              post_add
            </span>
          </div>
          <div>
            <Modal.Title className="fw-bold fs-5">Direct Submission Intake</Modal.Title>
            <div className="text-muted small">
              Record physical hard copies or offline submissions on behalf of a barangay
            </div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="pt-3">
        {submitError && (
          <Alert variant="danger" className="py-2 small">
            {submitError}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* Target Barangay */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-muted small text-uppercase">
              Target Barangay <span className="text-danger">*</span>
            </Form.Label>
            <Form.Select
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              disabled={isUploading}
              required
            >
              <option value="">-- Choose Barangay --</option>
              {BARANGAYS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Row className="g-3 mb-3">
            {/* Base Document Type */}
            <Col xs={12} md={isAccomplishment ? 6 : 6}>
              <Form.Group>
                <Form.Label className="fw-semibold text-muted small text-uppercase">
                  Document Type <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={selectedBaseTypeId}
                  onChange={(e) => handleBaseTypeChange(e.target.value)}
                  disabled={isUploading}
                  required
                >
                  <option value="">-- Choose Type --</option>
                  {BASE_DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Accomplishment Subcategory */}
            {isAccomplishment && (
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold text-muted small text-uppercase">
                    Category <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    disabled={isUploading}
                    required
                  >
                    <option value="">-- Choose Category --</option>
                    {ACCOMPLISHMENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}

            {/* Submission Period */}
            <Col xs={12} md={isAccomplishment ? 12 : 6}>
              <Form.Group>
                <Form.Label className="fw-semibold text-muted small text-uppercase">
                  Submission Period <span className="text-danger">*</span>
                </Form.Label>
                {baseType?.category === 'scheduled' ? (
                  <Form.Select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    disabled={isUploading}
                    required
                  >
                    <option value="">-- Select Period --</option>
                    {availablePeriods.map((p) => (
                      <option key={p} value={p}>
                        {formatPeriodLabel(p)}
                      </option>
                    ))}
                  </Form.Select>
                ) : baseType?.category === 'asap' ? (
                  <Form.Control
                    type="text"
                    value="ASAP (One-time Submission)"
                    disabled
                    readOnly
                    className="bg-light text-muted"
                  />
                ) : baseType?.category === 'perennial' ? (
                  <Form.Control
                    type="text"
                    value={`${currentYear} (Year-Round Submission)`}
                    disabled
                    readOnly
                    className="bg-light text-muted"
                  />
                ) : (
                  <Form.Control
                    type="text"
                    placeholder="Select document type first"
                    disabled
                    readOnly
                    className="bg-light text-muted"
                  />
                )}
              </Form.Group>
            </Col>
          </Row>

          {/* Admin Notes / Remarks */}
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-muted small text-uppercase">
              Admin Intake Notes / Remarks <span className="text-muted fw-normal">(Optional)</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="e.g., Physical hard copy received and stamped at LYDO desk."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              disabled={isUploading}
            />
          </Form.Group>

          {/* File Upload Zone */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-muted small text-uppercase">
              Attach Scanned PDF <span className="text-danger">*</span>
            </Form.Label>
            {!file && (
              <FileDropZone
                onFileSelect={handleFileSelect}
                onError={setFileError}
                accept=".pdf"
                disabled={isUploading || !selectedBarangay || !selectedBaseTypeId}
              />
            )}
            {fileError && <Alert variant="danger" className="mt-2 py-2 small">{fileError}</Alert>}

            {/* Screened File Summary Card */}
            {file && (
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-danger" style={{ fontSize: '28px' }}>
                      picture_as_pdf
                    </span>
                    <div className="min-w-0">
                      <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '320px' }}>
                        {file.name}
                      </div>
                      <div className="text-muted small">
                        {formatFileSize(file.size)} • {screening?.pageCount || 0} page
                        {(screening?.pageCount || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  {!isUploading && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        setScreening(null);
                        setFileError(null);
                      }}
                    >
                      Change
                    </Button>
                  )}
                </div>

                {screening?.isValid && (
                  <div className="d-flex align-items-center gap-1 text-success small fw-semibold mt-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      verified
                    </span>
                    <span>PDF structure verified and screened</span>
                  </div>
                )}
              </div>
            )}
          </Form.Group>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="mb-3">
              <div className="d-flex justify-content-between small text-muted mb-1">
                <span>Uploading & Processing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <ProgressBar now={uploadProgress} animated variant="primary" style={{ height: '8px' }} />
            </div>
          )}

          <div className="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
            <Button variant="outline-secondary" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              variant="primary"
              loading={isUploading}
              disabled={!file || !screening?.isValid || !selectedBarangay || !selectedBaseTypeId}
            >
              Upload &amp; Approve Submission
            </LoadingButton>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AdminDirectUploadModal;
