import React from 'react';
import { Modal, Row, Col, Spinner, Button } from 'react-bootstrap';

interface DocumentReviewModalProps {
  /** Whether the modal is visible */
  show: boolean;
  /** Called when the modal is dismissed */
  onHide: () => void;
  /** Modal title */
  title: string;
  /** Content rendered in the left info panel */
  infoPanel: React.ReactNode;
  /** URL of the document to preview in the right panel */
  fileUrl: string;
  /** Whether the document is still loading */
  fileLoading?: boolean;
  /** Optional actions rendered at the bottom of the left panel */
  actions?: React.ReactNode;
  /** If true, prevents closing the modal */
  locked?: boolean;
  /** Called when download button is clicked */
  onDownload?: () => void;
  /** Whether to completely hide the document preview panel */
  hidePreview?: boolean;
}

/**
 * Reusable split-panel review modal.
 * Left panel: metadata/info + action buttons.
 * Right panel: PDF or image preview.
 *
 * Extracted from the existing applicant review modal pattern
 * to be shared between application review and submission review.
 */
const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  show,
  onHide,
  title,
  infoPanel,
  fileUrl,
  fileLoading = false,
  actions,
  locked = false,
  onDownload,
  hidePreview = false,
}) => {
  return (
    <Modal show={show} onHide={onHide} size={hidePreview ? undefined : 'xl'} backdrop="static" centered>
      <Modal.Header closeButton={!locked}>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        <Row className="g-0 h-100" style={hidePreview ? {} : { minHeight: '60vh' }}>
          {/* Left Panel: Info & Actions */}
          <Col
            md={hidePreview ? 12 : 4}
            className={`bg-light p-4 d-flex flex-column ${!hidePreview && 'border-end'}`}
            style={!hidePreview ? { borderRight: '1px solid #E4E4E7 !important' } : {}}
          >
            <div className="flex-grow-1">{infoPanel}</div>

            {actions && (
              <>
                <hr className="my-4" style={{ borderColor: '#E4E4E7' }} />
                {actions}
              </>
            )}
          </Col>

          {/* Right Panel: Document Preview */}
          {!hidePreview && (
            <Col md={8} className="bg-dark d-flex flex-column">
            <div className="p-2 bg-secondary text-white small fw-bold d-flex align-items-center justify-content-between">
              <span>Document Preview</span>
              {onDownload && fileUrl && (
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={onDownload}
                  className="py-0 px-2 d-flex align-items-center gap-1"
                  style={{ fontSize: '12px', height: '28px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    download
                  </span>
                  Download
                </Button>
              )}
            </div>
            <div
              className="flex-grow-1 d-flex align-items-center justify-content-center p-3"
              style={{ minHeight: '500px' }}
            >
              {fileUrl && !fileLoading ? (
                // PDF files — render in iframe
                fileUrl.toLowerCase().includes('.pdf') ||
                fileUrl.toLowerCase().includes('%2fpdf') ||
                fileUrl.toLowerCase().includes('application/pdf') ? (
                  <iframe
                    src={fileUrl}
                    width="100%"
                    height="100%"
                    style={{
                      border: 'none',
                      minHeight: '60vh',
                      backgroundColor: 'white',
                    }}
                    title="PDF Viewer"
                  />
                ) : (
                  // Image files — render as img
                  <img
                    src={fileUrl}
                    alt="Document Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      objectFit: 'contain',
                    }}
                  />
                )
              ) : fileLoading ? (
                <div className="text-white d-flex align-items-center gap-2">
                  <Spinner animation="border" size="sm" />
                  <span>Loading document securely...</span>
                </div>
              ) : (
                <div className="text-muted">No document available</div>
              )}
            </div>
          </Col>
          )}
        </Row>
      </Modal.Body>
    </Modal>
  );
};

export default DocumentReviewModal;
