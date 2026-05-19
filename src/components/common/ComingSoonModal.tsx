import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface ComingSoonModalProps {
  show: boolean;
  onHide: () => void;
  sectionName: string;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  show,
  onHide,
  sectionName
}) => {
  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered
      backdrop="static"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="text-primary fw-bold w-100 text-center mt-3">
          ✨ Coming Soon!
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center px-4 pb-4 pt-2">
        <div className="fs-5 mb-3">
          We are currently building the <strong className="text-dark">{sectionName}</strong> section.
        </div>
        <p className="text-muted small mb-4">
          Our team is working hard to bring this feature to the LYDO Compliance System. Stay tuned!
        </p>
        <Button 
          variant="primary" 
          onClick={onHide}
          className="px-4 py-2 shadow-sm rounded-pill fw-bold"
        >
          Got it, thanks!
        </Button>
      </Modal.Body>
    </Modal>
  );
};

export default ComingSoonModal;
