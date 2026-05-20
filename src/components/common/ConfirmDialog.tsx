import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import LoadingButton from './LoadingButton';

interface ConfirmDialogProps {
  /** Whether the modal is visible */
  show: boolean;
  /** Called when the user dismisses or cancels */
  onCancel: () => void;
  /** Called when the user confirms */
  onConfirm: () => void;
  /** Modal title */
  title?: string;
  /** Main question or message shown above the detail card */
  message?: React.ReactNode;
  /** Optional detail card rendered between the message and the warning */
  detail?: React.ReactNode;
  /** Optional warning line shown in red below the detail card */
  warning?: React.ReactNode;
  /** Label for the confirm button. Defaults to "Confirm" */
  confirmLabel?: string;
  /** Bootstrap variant for the confirm button. Defaults to "danger" */
  confirmVariant?: string;
  /** Whether an async action is in progress — disables buttons and shows spinner */
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  show,
  onCancel,
  onConfirm,
  title = 'Are you sure?',
  message,
  detail,
  warning,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  loading = false,
}) => {
  return (
    <Modal show={show} onHide={onCancel} backdrop="static" centered>
      <Modal.Header closeButton={!loading}>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {message && <p>{message}</p>}

        {detail && (
          <div className="bg-light rounded p-3 border mb-3">
            {detail}
          </div>
        )}

        {warning && (
          <p className="text-danger small mt-2 mb-0">
            ⚠️ {warning}
          </p>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <LoadingButton
          variant={confirmVariant}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </LoadingButton>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmDialog;
