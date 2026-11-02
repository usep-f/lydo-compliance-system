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
  /** Optional file name for format detection and display */
  fileName?: string;
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

type DocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'image' | 'unknown';

function detectDocumentFormat(url: string, fileName?: string): DocumentFormat {
  const target = `${fileName || ''} ${decodeURIComponent(url)}`.toLowerCase();
  if (target.includes('.docx') || target.includes('wordprocessingml')) {
    return 'docx';
  }
  if (target.includes('.xlsx') || target.includes('spreadsheetml')) {
    return 'xlsx';
  }
  if (
    target.includes('.pdf') ||
    target.includes('%2fpdf') ||
    target.includes('application/pdf')
  ) {
    return 'pdf';
  }
  if (
    target.includes('.png') ||
    target.includes('.jpg') ||
    target.includes('.jpeg') ||
    target.includes('.webp') ||
    target.includes('.gif') ||
    target.includes('image/')
  ) {
    return 'image';
  }
  // All standard statutory documents default to PDF viewer unless explicitly an Office/Image format
  return 'pdf';
}

function renderOfficePreview(
  format: 'docx' | 'xlsx',
  fileUrl: string,
  onDownload?: () => void
): React.ReactNode {
  const isDocx = format === 'docx';
  const brandColor = isDocx ? '#2B579A' : '#107C41';
  const brandIcon = isDocx ? 'description' : 'table_view';
  const brandTitle = isDocx
    ? 'Microsoft Word Document (.docx)'
    : 'Microsoft Excel Spreadsheet (.xlsx)';

  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

  return (
    <div className="w-100 h-100 d-flex flex-column" style={{ minHeight: '60vh' }}>
      <div className="bg-light p-2 px-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: brandColor }}>
            {brandIcon}
          </span>
          <span className="fw-semibold text-dark small">{brandTitle}</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          {onDownload && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={onDownload}
              className="d-flex align-items-center gap-1 py-1"
              style={{ fontSize: '12px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                download
              </span>
              Download
            </Button>
          )}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 py-1"
            style={{ fontSize: '12px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              open_in_new
            </span>
            Direct Link
          </a>
        </div>
      </div>
      <div className="flex-grow-1 bg-white position-relative" style={{ minHeight: '52vh' }}>
        <iframe
          src={officeViewerUrl}
          width="100%"
          height="100%"
          style={{
            border: 'none',
            minHeight: '52vh',
            backgroundColor: 'white',
          }}
          title={brandTitle}
        />
      </div>
    </div>
  );
}

function renderFallbackPreview(fileUrl: string, onDownload?: () => void): React.ReactNode {
  return (
    <div className="text-center p-4 bg-white rounded shadow-sm text-dark" style={{ maxWidth: '400px' }}>
      <span className="material-symbols-outlined text-primary mb-2" style={{ fontSize: '48px' }}>
        draft
      </span>
      <h6 className="fw-bold mb-1">Document File Ready</h6>
      <p className="text-muted small mb-3">
        This document format can be downloaded and viewed directly in your local reader.
      </p>
      {onDownload ? (
        <Button variant="primary" size="sm" onClick={onDownload} className="px-3">
          Download Document
        </Button>
      ) : (
        <a href={fileUrl} download className="btn btn-primary btn-sm px-3">
          Download Document
        </a>
      )}
    </div>
  );
}

function renderDocumentPreview(
  format: DocumentFormat,
  fileUrl: string,
  onDownload?: () => void
): React.ReactNode {
  if (format === 'pdf') {
    return (
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
    );
  }

  if (format === 'docx' || format === 'xlsx') {
    return renderOfficePreview(format, fileUrl, onDownload);
  }

  if (format === 'image') {
    return (
      <img
        src={fileUrl}
        alt="Document Preview"
        style={{
          maxWidth: '100%',
          maxHeight: '70vh',
          objectFit: 'contain',
        }}
      />
    );
  }

  return renderFallbackPreview(fileUrl, onDownload);
}

/**
 * Reusable split-panel review modal.
 * Left panel: metadata/info + action buttons.
 * Right panel: PDF, Office (Word/Excel), or image preview.
 */
const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  show,
  onHide,
  title,
  infoPanel,
  fileUrl,
  fileName,
  fileLoading = false,
  actions,
  locked = false,
  onDownload,
  hidePreview = false,
}) => {
  const format = detectDocumentFormat(fileUrl, fileName);

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
                className={`flex-grow-1 d-flex align-items-center justify-content-center ${
                  format === 'docx' || format === 'xlsx' || format === 'pdf' ? 'p-0' : 'p-3'
                }`}
                style={{ minHeight: '500px' }}
              >
                {fileUrl && !fileLoading ? (
                  renderDocumentPreview(format, fileUrl, onDownload)
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
