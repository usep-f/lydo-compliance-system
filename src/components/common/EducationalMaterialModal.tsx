import React, { useState, useRef } from 'react';
import { Modal, Button, Form, Alert, Nav, ProgressBar } from 'react-bootstrap';
import {
  EDUCATIONAL_CATEGORIES,
  type EducationalMaterial,
  type EducationalResourceType,
  type MaterialFormData,
} from '../../hooks/useEducationalMaterials';
import { formatFileSize } from '../../utils/pdfScreening';
import LoadingButton from './LoadingButton';

interface EducationalMaterialModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (
    data: MaterialFormData,
    existingMaterialId?: string,
    existingStoragePath?: string
  ) => Promise<void>;
  editingMaterial?: EducationalMaterial | null;
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'];

interface InnerFormProps {
  editingMaterial?: EducationalMaterial | null;
  onHide: () => void;
  onSave: (
    data: MaterialFormData,
    existingMaterialId?: string,
    existingStoragePath?: string
  ) => Promise<void>;
}

const EducationalMaterialInnerForm: React.FC<InnerFormProps> = ({
  editingMaterial,
  onHide,
  onSave,
}) => {
  const initialIsLink =
    editingMaterial?.resourceType === 'video_link' ||
    editingMaterial?.resourceType === 'external_link';

  const [activeTab, setActiveTab] = useState<'upload' | 'link'>(
    initialIsLink ? 'link' : 'upload'
  );
  const [title, setTitle] = useState(editingMaterial?.title || '');
  const [description, setDescription] = useState(editingMaterial?.description || '');
  const [category, setCategory] = useState<string>(
    editingMaterial?.category || EDUCATIONAL_CATEGORIES[0]
  );
  const [resourceType, setResourceType] = useState<EducationalResourceType>(
    editingMaterial?.resourceType || 'pdf'
  );
  const [externalUrl, setExternalUrl] = useState(editingMaterial?.externalUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError('Invalid file type. Allowed formats: PDF, DOCX, XLSX, PPTX.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size (${formatFileSize(file.size)}) exceeds the 20MB limit.`);
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Auto-detect matching resourceType
    if (ext === '.pdf') setResourceType('pdf');
    else if (ext === '.docx' || ext === '.doc') setResourceType('docx');
    else if (ext === '.xlsx' || ext === '.xls') setResourceType('xlsx');
    else if (ext === '.pptx' || ext === '.ppt') setResourceType('pptx');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a title for the educational material.');
      return;
    }

    if (!category) {
      setError('Please select a category.');
      return;
    }

    if (activeTab === 'upload') {
      if (!editingMaterial && !selectedFile) {
        setError('Please select a document file to upload.');
        return;
      }
    } else {
      if (!externalUrl.trim()) {
        setError('Please enter a valid URL for the resource.');
        return;
      }
      try {
        const parsed = new URL(externalUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          setError('URL must begin with http:// or https://');
          return;
        }
      } catch {
        setError('Invalid URL format. Please provide a full link (e.g. https://...)');
        return;
      }
    }

    const payload: MaterialFormData = {
      title: title.trim(),
      description: description.trim(),
      category,
      resourceType:
        activeTab === 'upload'
          ? resourceType
          : resourceType === 'video_link'
          ? 'video_link'
          : 'external_link',
      externalUrl: activeTab === 'link' ? externalUrl.trim() : undefined,
      file: selectedFile,
    };

    try {
      setSaving(true);
      await onSave(
        payload,
        editingMaterial ? editingMaterial.id : undefined,
        editingMaterial?.storagePath
      );
      onHide();
    } catch (err: unknown) {
      console.error('Error saving educational material:', err);
      setError((err as Error).message || 'Failed to save educational material. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Modal.Body className="p-4">
        {error && (
          <Alert variant="danger" className="py-2 px-3 mb-3 d-flex align-items-center gap-2" style={{ fontSize: '13px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
            <span>{error}</span>
          </Alert>
        )}

        {/* Mode Selector Tabs */}
        <Nav
          variant="pills"
          className="mb-4 p-1 bg-light rounded-3 border"
          activeKey={activeTab}
          onSelect={(k) => {
            if (k === 'upload' || k === 'link') {
              setActiveTab(k);
              if (k === 'upload' && (resourceType === 'video_link' || resourceType === 'external_link')) {
                setResourceType('pdf');
              } else if (k === 'link' && !['video_link', 'external_link'].includes(resourceType)) {
                setResourceType('video_link');
              }
            }
          }}
        >
          <Nav.Item className="flex-fill text-center">
            <Nav.Link
              eventKey="upload"
              disabled={saving}
              className="d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
              style={{ fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                upload_file
              </span>
              Document File (PDF / Office)
            </Nav.Link>
          </Nav.Item>
          <Nav.Item className="flex-fill text-center">
            <Nav.Link
              eventKey="link"
              disabled={saving}
              className="d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
              style={{ fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                link
              </span>
              External Link / Video Tutorial
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {/* Title */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
            Material Title <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="text"
            placeholder="e.g. SK Financial Management and Accounting Manual 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
            required
          />
        </Form.Group>

        {/* Category & Type Selection Row */}
        <div className="row g-3 mb-3">
          <div className="col-md-7">
            <Form.Group>
              <Form.Label className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                Governance Category <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={saving}
              >
                {EDUCATIONAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>

          <div className="col-md-5">
            <Form.Group>
              <Form.Label className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                Resource Format <span className="text-danger">*</span>
              </Form.Label>
              {activeTab === 'upload' ? (
                <Form.Select
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value as EducationalResourceType)}
                  disabled={saving}
                >
                  <option value="pdf">PDF Document (.pdf)</option>
                  <option value="docx">Word Document (.docx)</option>
                  <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                  <option value="pptx">PowerPoint Presentation (.pptx)</option>
                </Form.Select>
              ) : (
                <Form.Select
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value as EducationalResourceType)}
                  disabled={saving}
                >
                  <option value="video_link">Video Tutorial (YouTube / Drive)</option>
                  <option value="external_link">Web Resource / External Portal</option>
                </Form.Select>
              )}
            </Form.Group>
          </div>
        </div>

        {/* Description */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
            Description & Purpose <span className="text-muted fw-normal">(Optional guidance for SK officials)</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Briefly explain what this resource contains and how SK officials should utilize it..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </Form.Group>

        {/* File Dropzone or URL Link Input */}
        {activeTab === 'upload' ? (
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
              Upload File <span className="text-muted fw-normal">(PDF, DOCX, XLSX, PPTX — Max 20MB)</span>
            </Form.Label>

            <div
              className={`p-4 rounded-3 border-2 text-center transition-all ${
                isDragging
                  ? 'border-primary bg-primary bg-opacity-10'
                  : selectedFile
                  ? 'border-success bg-success bg-opacity-10'
                  : 'border-secondary border-opacity-25 bg-light'
              }`}
              style={{
                borderStyle: 'dashed',
                cursor: saving ? 'not-allowed' : 'pointer',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!saving) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !saving && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                disabled={saving}
              />

              {selectedFile ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="material-symbols-outlined text-success" style={{ fontSize: '28px' }}>
                    task
                  </span>
                  <div className="text-start">
                    <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                      {selectedFile.name}
                    </div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {formatFileSize(selectedFile.size)} • Click or drop another file to replace
                    </div>
                  </div>
                </div>
              ) : editingMaterial?.fileName ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '28px' }}>
                    description
                  </span>
                  <div className="text-start">
                    <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                      Current File: {editingMaterial.fileName}
                    </div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {editingMaterial.fileSizeBytes ? formatFileSize(editingMaterial.fileSizeBytes) : ''} • Click or drop a file to replace
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <span
                    className="material-symbols-outlined text-secondary mb-1"
                    style={{ fontSize: '32px' }}
                  >
                    cloud_upload
                  </span>
                  <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                    Drag and drop your file here, or click to browse
                  </div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>
                    Supported formats: PDF, Word, Excel, PowerPoint • Max 20MB
                  </div>
                </>
              )}
            </div>
          </Form.Group>
        ) : (
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
              Resource URL <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="url"
              placeholder="https://www.youtube.com/watch?v=... or https://drive.google.com/..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              disabled={saving}
              required
            />
            <Form.Text className="text-muted" style={{ fontSize: '11px' }}>
              Enter full link with https://. SK officials will be able to launch or watch directly.
            </Form.Text>
          </Form.Group>
        )}

        {saving && (
          <div className="mt-3">
            <div className="d-flex justify-content-between text-muted mb-1" style={{ fontSize: '12px' }}>
              <span>Uploading and saving resource...</span>
              <span>Please wait</span>
            </div>
            <ProgressBar animated now={100} style={{ height: '6px' }} />
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top-0 pt-0">
        <Button variant="light" onClick={onHide} disabled={saving} style={{ fontSize: '13px' }}>
          Cancel
        </Button>
        <LoadingButton
          variant="primary"
          type="submit"
          loading={saving}
          style={{ fontSize: '13px' }}
        >
          {editingMaterial ? 'Save Changes' : 'Publish Resource'}
        </LoadingButton>
      </Modal.Footer>
    </Form>
  );
};

const EducationalMaterialModal: React.FC<EducationalMaterialModalProps> = ({
  show,
  onHide,
  onSave,
  editingMaterial,
}) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>
            {editingMaterial ? 'edit_note' : 'upload_file'}
          </span>
          {editingMaterial ? 'Edit Educational Material' : 'Upload Educational Material'}
        </Modal.Title>
      </Modal.Header>

      {show && (
        <EducationalMaterialInnerForm
          key={editingMaterial?.id || 'new_material'}
          editingMaterial={editingMaterial}
          onHide={onHide}
          onSave={onSave}
        />
      )}
    </Modal>
  );
};

export default EducationalMaterialModal;
