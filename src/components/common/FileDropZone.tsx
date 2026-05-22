import React, { useRef, useState, useCallback } from 'react';
import { formatFileSize, ALLOWED_EXTENSION, MAX_FILE_SIZE_BYTES } from '../../utils/pdfScreening';

interface FileDropZoneProps {
  /** Accepted file extensions, e.g., ".pdf" */
  accept?: string;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Called when a valid file is selected */
  onFileSelect: (file: File) => void;
  /** Called when validation fails */
  onError: (message: string) => void;
  /** Disables the drop zone */
  disabled?: boolean;
  /** Label displayed inside the drop zone */
  label?: string;
  /** Help text displayed below the label */
  helpText?: string;
  /** Currently selected file (controlled) */
  selectedFile?: File | null;
  /** Called when the user clears the selection */
  onClear?: () => void;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  accept = ALLOWED_EXTENSION,
  maxSizeMB = MAX_FILE_SIZE_BYTES / (1024 * 1024),
  onFileSelect,
  onError,
  disabled = false,
  label = 'Drop your PDF file here',
  helpText,
  selectedFile = null,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSelect = useCallback(
    (file: File) => {
      // Extension check
      if (!file.name.toLowerCase().endsWith(accept)) {
        onError(`Only ${accept.toUpperCase().replace('.', '')} files are accepted.`);
        return;
      }

      // Size check
      if (file.size > maxSizeMB * 1024 * 1024) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        onError(`File is too large (${sizeMB} MB). Maximum is ${maxSizeMB} MB.`);
        return;
      }

      if (file.size === 0) {
        onError('File is empty. Please select a valid file.');
        return;
      }

      onFileSelect(file);
    },
    [accept, maxSizeMB, onFileSelect, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        validateAndSelect(files[0]);
      }
    },
    [disabled, validateAndSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSelect(files[0]);
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear?.();
  };

  return (
    <div
      className={`file-drop-zone rounded-3 border-2 text-center p-4 position-relative transition-all ${
        isDragging
          ? 'border-primary bg-primary bg-opacity-10'
          : selectedFile
          ? 'border-success bg-success bg-opacity-10'
          : 'border-secondary border-opacity-25 bg-light'
      } ${disabled ? 'opacity-50' : ''}`}
      style={{
        borderStyle: 'dashed',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        minHeight: '140px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {selectedFile ? (
        <>
          <span
            className="material-symbols-outlined text-success mb-2"
            style={{ fontSize: '32px' }}
          >
            description
          </span>
          <div className="fw-semibold text-dark mb-1" style={{ fontSize: '14px' }}>
            {selectedFile.name}
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            {formatFileSize(selectedFile.size)}
          </div>
          {onClear && !disabled && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger mt-2 px-3"
              onClick={handleClear}
              style={{ fontSize: '12px' }}
            >
              <span className="material-symbols-outlined me-1" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                close
              </span>
              Remove
            </button>
          )}
        </>
      ) : (
        <>
          <span
            className={`material-symbols-outlined mb-2 ${
              isDragging ? 'text-primary' : 'text-secondary'
            }`}
            style={{ fontSize: '36px', opacity: isDragging ? 1 : 0.6 }}
          >
            cloud_upload
          </span>
          <div
            className={`fw-semibold mb-1 ${isDragging ? 'text-primary' : 'text-secondary'}`}
            style={{ fontSize: '14px' }}
          >
            {isDragging ? 'Drop file here' : label}
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            {helpText || `or click to browse • PDF only • Max ${maxSizeMB} MB`}
          </div>
        </>
      )}
    </div>
  );
};

export default FileDropZone;
