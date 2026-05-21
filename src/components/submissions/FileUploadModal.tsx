import React, { useState, useCallback } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../../firebase';
import FileDropZone from '../common/FileDropZone';
import LoadingButton from '../common/LoadingButton';
import { screenPdfFile, formatFileSize } from '../../utils/pdfScreening';
import type { PdfScreeningResult } from '../../utils/pdfScreening';
import type { SubmissionTypeDefinition } from '../../constants/submissionTypes';
import { formatPeriodLabel } from '../../utils/periodUtils';
import { useToast } from '../../context/ToastContext';

interface FileUploadModalProps {
  show: boolean;
  onHide: () => void;
  /** The document type being submitted */
  documentType: SubmissionTypeDefinition;
  /** The period for this submission (e.g., "2026-Q1", "ASAP") */
  period: string;
  /** Current year */
  year: number;
  /** User info for denormalizing into the submission doc */
  userId: string;
  barangay: string;
  fullName: string;
}

type UploadStage = 'select' | 'screening' | 'ready' | 'uploading' | 'done';

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  show,
  onHide,
  documentType,
  period,
  year,
  userId,
  barangay,
  fullName,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [screening, setScreening] = useState<PdfScreeningResult | null>(null);
  const [stage, setStage] = useState<UploadStage>('select');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const resetState = useCallback(() => {
    setFile(null);
    setScreening(null);
    setStage('select');
    setUploadProgress(0);
    setError(null);
  }, []);

  const handleClose = () => {
    if (stage === 'uploading') return; // Don't close during upload
    resetState();
    onHide();
  };

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setError(null);
      setStage('screening');

      // Run pdf-lib pre-screening
      try {
        const result = await screenPdfFile(selectedFile);
        setScreening(result);

        if (result.isValid) {
          setStage('ready');
        } else {
          setStage('select');
          setError(result.error || 'Invalid PDF file.');
          setFile(null);
        }
      } catch (err: any) {
        setStage('select');
        setError(err.message || 'Failed to screen PDF file.');
        setFile(null);
      }
    },
    []
  );

  const handleFileError = useCallback((message: string) => {
    setError(message);
    setFile(null);
    setScreening(null);
    setStage('select');
  }, []);

  const handleClearFile = useCallback(() => {
    setFile(null);
    setScreening(null);
    setStage('select');
    setError(null);
  }, []);

  const handleUpload = async () => {
    if (!file || !screening?.isValid) return;

    setStage('uploading');
    setError(null);
    setUploadProgress(0);

    try {
      // Build storage path: submission_files/{userId}/{documentType}/{timestamp}_{filename}
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `submission_files/${userId}/${documentType.id}/${timestamp}_${safeName}`;

      // Upload to Firebase Storage with progress tracking
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: 'application/pdf',
      });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      // Get download URL (for admin preview later)
      await getDownloadURL(storageRef);

      // Create Firestore pending_submissions document
      await addDoc(collection(db, 'pending_submissions'), {
        userId,
        barangay,
        fullName,
        category: documentType.category,
        documentType: documentType.id,
        documentLabel: documentType.label,
        period,
        year,
        fileStoragePath: storagePath,
        fileName: file.name,
        fileSize: file.size,
        pageCount: screening.pageCount,
        pdfMetadata: screening.metadata,
        submittedAt: serverTimestamp(),
      });

      setStage('done');
      addToast(`${documentType.label} submitted successfully!`, 'success');

      // Auto-close after brief delay
      setTimeout(() => {
        resetState();
        onHide();
      }, 1200);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message || 'Please try again.'}`);
      setStage('ready');
    }
  };

  const isAsap = documentType.category === 'asap';

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" centered size="lg">
      <Modal.Header closeButton={stage !== 'uploading'}>
        <Modal.Title>
          <span className="material-symbols-outlined me-2 text-primary" style={{ verticalAlign: 'middle' }}>
            upload_file
          </span>
          Submit Document
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Document Info Header */}
        <div className="bg-light rounded-3 p-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10"
              style={{ width: '40px', height: '40px', flexShrink: 0 }}
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>
                {documentType.icon}
              </span>
            </div>
            <div>
              <div className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                {documentType.label}
              </div>
              <div className="text-muted" style={{ fontSize: '12px' }}>
                {isAsap ? 'Submit as soon as possible' : `Period: ${formatPeriodLabel(period)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
            <span className="material-symbols-outlined me-2" style={{ fontSize: '16px', verticalAlign: 'middle' }}>
              error
            </span>
            {error}
          </Alert>
        )}

        {/* File Drop Zone */}
        {stage !== 'done' && (
          <FileDropZone
            onFileSelect={handleFileSelect}
            onError={handleFileError}
            selectedFile={file}
            onClear={handleClearFile}
            disabled={stage === 'uploading' || stage === 'screening'}
            label="Drop your PDF file here"
            helpText="or click to browse • PDF only • Max 100 MB"
          />
        )}

        {/* Screening Spinner */}
        {stage === 'screening' && (
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" className="me-2" />
            <span className="text-muted" style={{ fontSize: '13px' }}>
              Validating PDF document...
            </span>
          </div>
        )}

        {/* PDF Metadata Display (after successful screening) */}
        {screening?.isValid && (stage === 'ready' || stage === 'uploading') && (
          <div className="mt-3 bg-light rounded-3 p-3">
            <div className="overline-text text-muted mb-2">
              <span className="material-symbols-outlined me-1" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                info
              </span>
              Document Summary
            </div>
            <div className="row g-2" style={{ fontSize: '13px' }}>
              <div className="col-6">
                <span className="text-muted">Pages:</span>{' '}
                <span className="fw-semibold text-dark">{screening.pageCount}</span>
              </div>
              <div className="col-6">
                <span className="text-muted">Size:</span>{' '}
                <span className="fw-semibold text-dark">{formatFileSize(screening.fileSize)}</span>
              </div>
              {screening.metadata.producer && (
                <div className="col-12">
                  <span className="text-muted">Producer:</span>{' '}
                  <span className="fw-semibold text-dark">{screening.metadata.producer}</span>
                </div>
              )}
              {screening.metadata.creationDate && (
                <div className="col-12">
                  <span className="text-muted">Created:</span>{' '}
                  <span className="fw-semibold text-dark">
                    {new Date(screening.metadata.creationDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {!screening.metadata.title && !screening.metadata.author && (
                <div className="col-12 text-muted fst-italic" style={{ fontSize: '12px' }}>
                  Scanned document detected (no extractable text metadata)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {stage === 'uploading' && (
          <div className="mt-3">
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted" style={{ fontSize: '12px' }}>Uploading...</span>
              <span className="fw-semibold text-primary" style={{ fontSize: '12px' }}>
                {uploadProgress}%
              </span>
            </div>
            <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
              <div
                className="progress-bar bg-primary"
                role="progressbar"
                style={{
                  width: `${uploadProgress}%`,
                  transition: 'width 0.3s ease',
                  borderRadius: '3px',
                }}
              />
            </div>
          </div>
        )}

        {/* Success State */}
        {stage === 'done' && (
          <div className="text-center py-4">
            <span
              className="material-symbols-outlined text-success mb-2"
              style={{ fontSize: '48px' }}
            >
              check_circle
            </span>
            <h5 className="text-success fw-bold mb-1">Submitted Successfully</h5>
            <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
              Your document has been submitted for admin review.
            </p>
          </div>
        )}
      </Modal.Body>

      {stage !== 'done' && (
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={stage === 'uploading'}>
            Cancel
          </Button>
          <LoadingButton
            variant="primary"
            onClick={handleUpload}
            loading={stage === 'uploading'}
            disabled={stage !== 'ready'}
            loadingText="Uploading..."
          >
            <span
              className="material-symbols-outlined me-1"
              style={{ fontSize: '16px', verticalAlign: 'middle' }}
            >
              cloud_upload
            </span>
            Submit for Review
          </LoadingButton>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default FileUploadModal;
