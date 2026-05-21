import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import {
  SCHEDULED_TYPES,
  ASAP_TYPES,
  ACCOMPLISHMENT_CATEGORIES,
  ALL_UPLOAD_TYPES,
} from '../../constants/submissionTypes';
import type { SubmissionTypeDefinition } from '../../constants/submissionTypes';
import { formatPeriodLabel, getCurrentPeriod } from '../../utils/periodUtils';
import FileDropZone from '../common/FileDropZone';
import { screenPdfFile, formatFileSize } from '../../utils/pdfScreening';
import type { PdfScreeningResult } from '../../utils/pdfScreening';

interface UnifiedSubmissionFormProps {
  currentYear: number;
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
  { id: 'resolutions', label: 'Resolutions', category: 'perennial', frequency: 'annual' },
  { id: 'accomplishment_report', label: 'Accomplishment Report', category: 'perennial', frequency: 'annual' },
];

const UnifiedSubmissionForm: React.FC<UnifiedSubmissionFormProps> = ({ currentYear, onSubmitReady }) => {
  const [selectedBaseTypeId, setSelectedBaseTypeId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const selectedYear = currentYear;

  const [file, setFile] = useState<File | null>(null);
  const [screening, setScreening] = useState<PdfScreeningResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Derived state
  const baseType = BASE_DOCUMENT_TYPES.find((t) => t.id === selectedBaseTypeId);
  const isAccomplishment = baseType?.id === 'accomplishment_report';

  // Reset dependent fields when parent fields change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCategory('');
    
    // Auto-compute the period since it's hidden from UI
    if (!baseType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPeriod('');
    } else if (baseType.category === 'asap') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPeriod('ASAP');
    } else if (baseType.category === 'perennial') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPeriod(selectedYear.toString());
    } else if (baseType.frequency) {
      const current = getCurrentPeriod(baseType.frequency as any);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPeriod(current);
    }
  }, [selectedBaseTypeId, baseType, selectedYear]);

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
    } catch (err: any) {
      setFileError(err.message || 'Failed to screen PDF file.');
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
    if (!selectedPeriod) return false;
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
      <div className="bg-primary text-white p-4">
        <h4 className="fw-bold mb-1">Submit a Document</h4>
        <p className="mb-0 text-white-50" style={{ fontSize: '14px' }}>
          Follow the steps below to upload and submit your required compliance files.
        </p>
      </div>
      <Card.Body className="p-4 p-md-5">
        <Form onSubmit={handleSubmit}>
          <div className="row g-4">
            {/* Document Type Selection */}
            <div className="col-md-12">
              <Form.Group>
                <Form.Label className="fw-semibold text-muted small text-uppercase">Document Type</Form.Label>
                <Form.Select
                  value={selectedBaseTypeId}
                  onChange={(e) => setSelectedBaseTypeId(e.target.value)}
                  size="lg"
                >
                  <option value="">-- Select Document Type --</option>
                  {BASE_DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.id} value={dt.id}>{dt.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>

            {/* Category Selection (Conditional) */}
            {isAccomplishment && (
              <div className="col-md-12">
                <Form.Group>
                  <Form.Label className="fw-semibold text-muted small text-uppercase">Accomplishment Category</Form.Label>
                  <Form.Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
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
          </div>

          <hr className="my-5" />

          {/* File Upload Zone */}
          <div className="mb-4">
            <h5 className="fw-bold mb-3">Attach File</h5>
            <FileDropZone
              onFileSelect={handleFileSelect}
              onError={setFileError}
              accept=".pdf"
              disabled={!baseType}
            />
            {fileError && <Alert variant="danger" className="mt-3 py-2">{fileError}</Alert>}

            {/* Selected File Card */}
            {file && screening?.isValid && (
              <div className="mt-3 bg-light rounded p-3 d-flex align-items-center justify-content-between border">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-primary bg-opacity-10 rounded p-2 text-primary d-flex">
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                  </div>
                  <div>
                    <div className="fw-semibold text-truncate" style={{ maxWidth: '300px' }}>{file.name}</div>
                    <div className="text-muted small">
                      {formatFileSize(file.size)} • {screening.pageCount} page{screening.pageCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <Button variant="link" className="text-danger p-0" onClick={handleClearFile}>
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
