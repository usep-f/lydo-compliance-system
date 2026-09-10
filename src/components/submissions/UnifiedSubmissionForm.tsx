import React, { useState, useCallback, useMemo } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import {
  SCHEDULED_TYPES,
  ASAP_TYPES,
  ACCOMPLISHMENT_CATEGORIES,
  ALL_UPLOAD_TYPES,
} from '../../constants/submissionTypes';
import type { 
  SubmissionTypeDefinition, 
  PendingSubmission, 
  HistoricalSubmission, 
  Frequency 
} from '../../constants/submissionTypes';
import { getSubmittablePeriods, formatPeriodLabel } from '../../utils/periodUtils';
import FileDropZone from '../common/FileDropZone';
import { screenPdfFile, formatFileSize } from '../../utils/pdfScreening';
import type { PdfScreeningResult } from '../../utils/pdfScreening';

interface UnifiedSubmissionFormProps {
  currentYear: number;
  existingSubmissions?: Array<PendingSubmission | HistoricalSubmission>;
  initialDocumentTypeId?: string;
  initialPeriod?: string;
  onSubmitReady: (payload: {
    file: File;
    documentType: SubmissionTypeDefinition;
    period: string;
    screening: PdfScreeningResult;
  }) => void;
}

// Generate the high-level document types for the first dropdown
const BASE_DOCUMENT_TYPES = [
  ...SCHEDULED_TYPES,
  ...ASAP_TYPES,
  { id: 'resolutions', label: 'Resolutions', category: 'perennial' as const },
  { id: 'accomplishment_report', label: 'Accomplishment Report', category: 'perennial' as const },
];

const UnifiedSubmissionForm: React.FC<UnifiedSubmissionFormProps> = ({ 
  currentYear, 
  existingSubmissions = [], 
  initialDocumentTypeId = '',
  initialPeriod = '',
  onSubmitReady 
}) => {
  const [selectedBaseTypeId, setSelectedBaseTypeId] = useState<string>(initialDocumentTypeId);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    if (initialPeriod) return initialPeriod;
    if (!initialDocumentTypeId) return '';
    const matched = BASE_DOCUMENT_TYPES.find((t) => t.id === initialDocumentTypeId);
    if (matched?.category === 'asap') return 'ASAP';
    if (matched?.category === 'perennial') return currentYear.toString();
    if (matched?.category === 'scheduled' && matched.frequency) {
      const periods = getSubmittablePeriods(matched.frequency as Frequency, currentYear, new Date());
      const available = periods.find(p => !existingSubmissions.some(
        (s) => s.documentType === initialDocumentTypeId && s.period === p && s.status !== 'denied'
      ));
      return available || '';
    }
    return '';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const selectedYear = currentYear;

  // Synchronize incoming prefilled changes from props during render (React recommended pattern)
  const [prevProps, setPrevProps] = useState({
    initialDocumentTypeId,
    initialPeriod,
  });

  if (
    prevProps.initialDocumentTypeId !== initialDocumentTypeId ||
    prevProps.initialPeriod !== initialPeriod
  ) {
    setPrevProps({
      initialDocumentTypeId,
      initialPeriod,
    });
    if (initialDocumentTypeId) {
      setSelectedBaseTypeId(initialDocumentTypeId);
      setSelectedCategory('');

      const matched = BASE_DOCUMENT_TYPES.find((t) => t.id === initialDocumentTypeId);
      if (initialPeriod) {
        setSelectedPeriod(initialPeriod);
      } else if (matched?.category === 'asap') {
        setSelectedPeriod('ASAP');
      } else if (matched?.category === 'perennial') {
        setSelectedPeriod(selectedYear.toString());
      } else if (matched?.category === 'scheduled' && matched.frequency) {
        const periods = getSubmittablePeriods(matched.frequency as Frequency, selectedYear, new Date());
        const available = periods.find(p => !existingSubmissions.some(
          (s) => s.documentType === initialDocumentTypeId && s.period === p && s.status !== 'denied'
        ));
        setSelectedPeriod(available || '');
      } else {
        setSelectedPeriod('');
      }
    } else {
      setSelectedBaseTypeId('');
      setSelectedCategory('');
      setSelectedPeriod('');
    }
  }

  const [file, setFile] = useState<File | null>(null);
  const [screening, setScreening] = useState<PdfScreeningResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Derived state
  const baseType = BASE_DOCUMENT_TYPES.find((t) => t.id === selectedBaseTypeId);
  const isAccomplishment = baseType?.id === 'accomplishment_report';

  const actualDocTypeId = isAccomplishment 
    ? (selectedCategory ? `acc_${selectedCategory}` : undefined) 
    : baseType?.id;

  // Calculate elapsed periods for scheduled documents
  const elapsedPeriods = useMemo(() => {
    if (baseType?.category === 'scheduled' && baseType.frequency) {
      return getSubmittablePeriods(baseType.frequency as Frequency, selectedYear, new Date());
    }
    return [];
  }, [baseType, selectedYear]);

  // Check if a specific period has already been submitted (and not denied)
  const isPeriodSubmitted = useCallback((period: string) => {
    if (!actualDocTypeId) return false;
    return existingSubmissions.some(
      (s) => s.documentType === actualDocTypeId && s.period === period && s.status !== 'denied'
    );
  }, [actualDocTypeId, existingSubmissions]);

  // Check if the document is fully submitted (only applies to ASAP one-time documents)
  // Perennial documents (resolutions and accomplishment reports) can be submitted as many times as desired.
  const isFullySubmitted = useMemo(() => {
    if (!baseType || !actualDocTypeId) return false;
    if (baseType.category === 'asap') return isPeriodSubmitted('ASAP');
    return false;
  }, [baseType, actualDocTypeId, isPeriodSubmitted]);

  // Handle Base Document Type Change synchronously
  const handleBaseTypeChange = useCallback((newTypeId: string) => {
    setSelectedBaseTypeId(newTypeId);
    setSelectedCategory('');

    const newBaseType = BASE_DOCUMENT_TYPES.find((t) => t.id === newTypeId);
    if (!newBaseType) {
      setSelectedPeriod('');
    } else if (newBaseType.category === 'asap') {
      setSelectedPeriod('ASAP');
    } else if (newBaseType.category === 'perennial') {
      setSelectedPeriod(selectedYear.toString());
    } else if (newBaseType.category === 'scheduled' && newBaseType.frequency) {
      const periods = getSubmittablePeriods(newBaseType.frequency as Frequency, selectedYear, new Date());
      const available = periods.find(p => !existingSubmissions.some(
        (s) => s.documentType === newTypeId && s.period === p && s.status !== 'denied'
      ));
      setSelectedPeriod(available || '');
    }
  }, [selectedYear, existingSubmissions]);

  // Handle Category Change synchronously
  const handleCategoryChange = useCallback((newCategory: string) => {
    setSelectedCategory(newCategory);
    setSelectedPeriod(selectedYear.toString());
  }, [selectedYear]);



  // Handle file selection and screening immediately
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setFileError(null);
    setScreening(null);

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

  const handleClearFile = useCallback(() => {
    setFile(null);
    setScreening(null);
    setFileError(null);
  }, []);

  // Form Validation
  const isValid = () => {
    if (!baseType) return false;
    if (isFullySubmitted) return false;
    if (baseType.category === 'scheduled' && !selectedPeriod) return false;
    if (baseType.category === 'scheduled' && isPeriodSubmitted(selectedPeriod)) return false;
    if (isAccomplishment && !selectedCategory) return false;
    if (!file || !screening?.isValid) return false;
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid()) return;

    // Resolve the actual DocumentType object
    let actualDocType: SubmissionTypeDefinition | undefined;

    if (isAccomplishment) {
      actualDocType = ALL_UPLOAD_TYPES.find((t) => t.id === `acc_${selectedCategory}`);
    } else {
      actualDocType = ALL_UPLOAD_TYPES.find((t) => t.id === baseType!.id);
    }

    if (actualDocType && file && screening) {
      onSubmitReady({
        file,
        documentType: actualDocType,
        period: selectedPeriod,
        screening,
      });
    }
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <Card.Body className="p-4 p-md-5">
        <Form onSubmit={handleSubmit}>
          <div className="row g-3 g-md-4">
            {/* Document Type Selection */}
            <div className="col-12 col-md-6">
              <Form.Group>
                <Form.Label className="fw-semibold text-muted small text-uppercase">Document Type</Form.Label>
                <Form.Select
                  value={selectedBaseTypeId}
                  onChange={(e) => handleBaseTypeChange(e.target.value)}
                  size="lg"
                >
                  <option value="">-- Select Document Type --</option>
                  {BASE_DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.id} value={dt.id}>{dt.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>

            {/* Category Selection (Conditional for Accomplishments) */}
            {isAccomplishment && (
              <div className="col-12 col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold text-muted small text-uppercase">Accomplishment Category</Form.Label>
                  <Form.Select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    size="lg"
                  >
                    <option value="">-- Select Category --</option>
                    {ACCOMPLISHMENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            )}

            {/* Resolutions Target Period / Mode (Conditional for Resolutions) */}
            {baseType?.id === 'resolutions' && (
              <div className="col-12 col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold text-muted small text-uppercase">Target Year / Mode</Form.Label>
                  <Form.Control
                    type="text"
                    value={`${selectedYear} — Year-Round (Multi-submission)`}
                    disabled
                    readOnly
                    size="lg"
                    className="bg-light text-muted"
                  />
                </Form.Group>
              </div>
            )}

            {/* ASAP Target Period (Conditional for ASAP) */}
            {baseType?.category === 'asap' && (
              <div className="col-12 col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold text-muted small text-uppercase">Submission Period</Form.Label>
                  <Form.Control
                    type="text"
                    value="ASAP (One-time Submission)"
                    disabled
                    readOnly
                    size="lg"
                    className="bg-light text-muted"
                  />
                </Form.Group>
              </div>
            )}

            {/* Period Selection (Conditional for Scheduled) */}
            {baseType?.category === 'scheduled' && (
              <div className="col-12 col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold text-muted small text-uppercase">Submission Period</Form.Label>
                  <Form.Select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    size="lg"
                  >
                    <option value="">-- Select Period --</option>
                    {elapsedPeriods.map((p) => {
                      const submitted = isPeriodSubmitted(p);
                      return (
                        <option key={p} value={p} disabled={submitted}>
                          {formatPeriodLabel(p)} {submitted ? '(Already Submitted)' : ''}
                        </option>
                      );
                    })}
                  </Form.Select>
                </Form.Group>
              </div>
            )}
          </div>

          {/* Fully Submitted Alert */}
          {isFullySubmitted && (
            <Alert variant="info" className="mt-4 mb-0">
              <div className="d-flex align-items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                <span><strong>Already Submitted:</strong> You have already submitted the required document(s) for this category.</span>
              </div>
            </Alert>
          )}

          <hr className="my-5" />

          {/* File Upload Zone */}
          <div className="mb-4">
            <h5 className="fw-bold mb-3">Attach File</h5>
            {!file && (
              <FileDropZone
                onFileSelect={handleFileSelect}
                onError={setFileError}
                accept=".pdf"
                disabled={
                  !baseType || 
                  isFullySubmitted || 
                  (baseType.category === 'scheduled' && (!selectedPeriod || isPeriodSubmitted(selectedPeriod)))
                }
              />
            )}
            {fileError && <Alert variant="danger" className="mt-3 py-2">{fileError}</Alert>}

            {/* Selected File Card */}
            {file && (
              <div className="bg-light rounded p-3 d-flex align-items-center justify-content-between border">
                <div className="d-flex align-items-center gap-3 min-w-0">
                  <div className="bg-primary bg-opacity-10 rounded p-2 text-primary d-flex flex-shrink-0">
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                  </div>
                  <div className="min-w-0">
                    <div className="fw-semibold text-truncate" style={{ maxWidth: '300px' }}>{file.name}</div>
                    <div className="text-muted small">
                      {screening?.isValid ? (
                        <>{formatFileSize(file.size)} • {screening.pageCount} page{screening.pageCount !== 1 ? 's' : ''}</>
                      ) : (
                        <>Analyzing document…</>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="link" className="text-danger p-0 ms-2 flex-shrink-0" onClick={handleClearFile}>
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="d-flex justify-content-end pt-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="px-5 fw-bold"
              disabled={!isValid()}
            >
              Continue to Review
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default UnifiedSubmissionForm;
