import React, { useState } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../../firebase';
import LoadingButton from '../common/LoadingButton';
import { formatFileSize } from '../../utils/pdfScreening';
import type { PdfScreeningResult } from '../../utils/pdfScreening';
import type { SubmissionTypeDefinition } from '../../constants/submissionTypes';
import { formatPeriodLabel } from '../../utils/periodUtils';
import { useToast } from '../../context/ToastContext';

interface ConfirmSubmissionModalProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
  file: File;
  screening: PdfScreeningResult;
  documentType: SubmissionTypeDefinition;
  period: string;
  year: number;
  userId: string;
  barangay: string;
  fullName: string;
}

const ConfirmSubmissionModal: React.FC<ConfirmSubmissionModalProps> = ({
  show,
  onHide,
  onSuccess,
  file,
  screening,
  documentType,
  period,
  year,
  userId,
  barangay,
  fullName,
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const handleClose = () => {
    if (isUploading) return;
    setError(null);
    setUploadProgress(0);
    onHide();
  };

  const handleConfirmUpload = async () => {
    setIsUploading(true);
    setError(null);

    // 1. Upload file to Storage
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storagePath = `submission_files/${userId}/${year}/${barangay}/${documentType.id}/${Date.now()}_${safeName}`;
    const fileRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(fileRef, file, {
      contentType: 'application/pdf',
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      },
      (err) => {
        setError('Failed to upload file: ' + err.message);
        setIsUploading(false);
      },
      async () => {
        try {
          // 2. Save to Firestore

          // Determine if we need to store accomplishmentCategory
          let accomplishmentCategory = null;
          if (documentType.id.startsWith('acc_')) {
            accomplishmentCategory = documentType.id.replace('acc_', '');
          }

          const payload: any = {
            userId,
            barangay,
            fullName,
            documentType: documentType.id,
            documentLabel: documentType.label,
            category: documentType.category,
            period,
            year,
            fileName: file.name,
            fileSize: file.size,
            fileStoragePath: storagePath,
            pageCount: screening.pageCount,
            pdfMetadata: screening.metadata,
            submittedAt: serverTimestamp(),
          };

          if (accomplishmentCategory) {
            payload.accomplishmentCategory = accomplishmentCategory;
          }

          await addDoc(collection(db, 'pending_submissions'), payload);

          addToast(`Document submitted successfully. Your ${documentType.label} is now pending review.`, 'success');
          setIsUploading(false);
          onSuccess();
        } catch (err: any) {
          setError('Failed to save submission record: ' + err.message);
          setIsUploading(false);
        }
      }
    );
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop={isUploading ? 'static' : true} keyboard={!isUploading} centered>
      <Modal.Header closeButton={!isUploading} className="border-0 pb-0">
        <Modal.Title className="fw-bold">Confirm Submission</Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-3">
        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

        <p className="text-muted mb-4" style={{ fontSize: '14px' }}>
          Please review the details below before finalizing your submission. Once submitted, it will be marked as "Pending Review" by the administration.
        </p>

        <div className="bg-light rounded p-4 mb-4">
          <div className="mb-3">
            <div className="text-muted small fw-semibold text-uppercase">Document Type</div>
            <div className="fw-bold text-dark">{documentType.label}</div>
          </div>
          <div className="mb-3">
            <div className="text-muted small fw-semibold text-uppercase">Target Period</div>
            <div className="fw-bold text-dark">
              {period === 'ASAP' ? 'ASAP (No deadline)' : formatPeriodLabel(period)}
            </div>
          </div>
          <div>
            <div className="text-muted small fw-semibold text-uppercase">File Information</div>
            <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '400px' }}>
              {file.name}
            </div>
            <div className="text-muted small">
              {formatFileSize(file.size)} • {screening.pageCount} page{screening.pageCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {isUploading && (
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <span className="small fw-semibold text-muted">Uploading document...</span>
              <span className="small fw-bold text-primary">{uploadProgress}%</span>
            </div>
            <div className="progress" style={{ height: '6px' }}>
              <div
                className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0 pb-4 px-4 d-flex gap-2">
        <Button
          variant="outline-secondary"
          onClick={handleClose}
          disabled={isUploading}
          className="flex-grow-1"
        >
          Cancel
        </Button>
        <LoadingButton
          variant="primary"
          onClick={handleConfirmUpload}
          loading={isUploading}
          className="flex-grow-2"
        >
          Confirm & Upload
        </LoadingButton>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmSubmissionModal;
