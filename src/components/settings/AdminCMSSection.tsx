import React, { useState } from 'react';
import { Form, Button, Modal, Card, Badge, Table, Spinner } from 'react-bootstrap';
import { Timestamp } from 'firebase/firestore';
import { useCMSData } from '../../hooks/useCMSData';
import type { Bulletin } from '../../hooks/useCMSData';
import { useToast } from '../../context/ToastContext';
import FormField from '../common/FormField';
import ConfirmDialog from '../common/ConfirmDialog';

const TAG_OPTIONS = [
  'Deadlines',
  'System Update',
  'Guidelines',
  'Announcement'
];

const getTagColorClass = (tag: string): string => {
  switch (tag) {
    case 'Deadlines':
      return 'bg-danger-subtle text-danger border-danger-subtle';
    case 'System Update':
      return 'bg-primary-subtle text-primary border-primary-subtle';
    case 'Guidelines':
      return 'bg-warning-subtle text-warning border-warning-subtle';
    default:
      return 'bg-success-subtle text-success border-success-subtle';
  }
};

const formatDateInput = (ts?: Timestamp): string => {
  if (!ts) return new Date().toISOString().split('T')[0];
  const d = ts.toDate();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AdminCMSSection() {
  const {
    bulletins,
    loading,
    addBulletin,
    updateBulletin,
    deleteBulletin
  } = useCMSData();

  const { addToast } = useToast();

  // Modal & Bulletin Form State
  const [showModal, setShowModal] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTag, setFormTag] = useState('Announcement');
  const [formDate, setFormDate] = useState('');
  const [formMemoUrl, setFormMemoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [bulletinToDelete, setBulletinToDelete] = useState<Bulletin | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const openAddModal = () => {
    setSelectedBulletin(null);
    setFormTitle('');
    setFormDesc('');
    setFormTag('Announcement');
    setFormDate(formatDateInput());
    setFormMemoUrl('');
    setShowModal(true);
  };

  const openEditModal = (bulletin: Bulletin) => {
    setSelectedBulletin(bulletin);
    setFormTitle(bulletin.title);
    setFormDesc(bulletin.desc);
    setFormTag(bulletin.tag);
    setFormDate(formatDateInput(bulletin.date));
    setFormMemoUrl(bulletin.memoUrl || '');
    setShowModal(true);
  };

  const handleSaveBulletin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim() || !formDate) {
      addToast('Please fill out all required fields.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse date to mid-day Timestamp to bypass local offset anomalies
      const parsedDate = Timestamp.fromDate(new Date(`${formDate}T12:00:00`));
      const payload = {
        title: formTitle.trim(),
        desc: formDesc.trim(),
        tag: formTag,
        tagColor: getTagColorClass(formTag),
        date: parsedDate,
        memoUrl: formMemoUrl.trim() || ''
      };

      if (selectedBulletin) {
        await updateBulletin(selectedBulletin.id, payload);
        addToast('Advisory updated successfully.', 'success');
      } else {
        await addBulletin(payload);
        addToast('New advisory published.', 'success');
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      addToast('Failed to save advisory.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (bulletin: Bulletin) => {
    setBulletinToDelete(bulletin);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bulletinToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteBulletin(bulletinToDelete.id);
      addToast('Advisory deleted successfully.', 'success');
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error(err);
      addToast('Failed to delete advisory.', 'error');
    } finally {
      setIsSubmitting(false);
      setBulletinToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="py-3">
      {/* ── Bulletins & Advisories Management ── */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
            <div>
              <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2 font-headline" style={{ fontSize: '16px' }}>
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
                Homepage Advisories &amp; Bulletins
              </h5>
              <p className="text-secondary small mb-0">
                Manage circulars, announcements, and timeline warnings displayed on the home page.
              </p>
            </div>
            <Button variant="primary" onClick={openAddModal} className="d-flex align-items-center gap-1.5 rounded-pill px-4">
              <span className="material-symbols-outlined fs-5">add</span>
              <span>Publish Advisory</span>
            </Button>
          </div>

          {bulletins.length === 0 ? (
            <div className="text-center py-5 text-muted border rounded-3 bg-light">
              <span className="material-symbols-outlined fs-1 mb-2 text-secondary">inbox</span>
              <p className="mb-0">No bulletins or announcements found. Click "Publish Advisory" to create one.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle border-top-0 mb-0">
                <thead>
                  <tr className="text-secondary small" style={{ borderBottom: '2px solid #F4F4F5' }}>
                    <th style={{ width: '130px' }}>Date</th>
                    <th style={{ width: '150px' }}>Category</th>
                    <th>Title &amp; Advisory Summary</th>
                    <th style={{ width: '150px' }} className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bulletins.map((item) => {
                    const dateStr = item.date?.toDate
                      ? item.date.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                      : new Date((item.date as unknown as { toMillis?: () => number }).toMillis?.() || (item.date as unknown as string | number)).toLocaleDateString();

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F4F4F5' }}>
                        <td className="small text-secondary">{dateStr}</td>
                        <td>
                          <Badge className={`${item.tagColor} border px-2.5 py-1 text-capitalize`} style={{ fontSize: '10px' }}>
                            {item.tag}
                          </Badge>
                          {item.eventKey && (
                            <Badge bg="secondary" className="ms-1 px-1.5 py-0.5 border" style={{ fontSize: '9px', opacity: 0.8 }} title="Created automatically by compliance scheduler">
                              Auto
                            </Badge>
                          )}
                        </td>
                        <td>
                          <div className="fw-semibold text-dark mb-0.5" style={{ fontSize: '14px' }}>{item.title}</div>
                          <div className="text-secondary small text-truncate" style={{ maxWidth: '500px' }}>{item.desc}</div>
                        </td>
                        <td>
                          <div className="d-flex gap-2 justify-content-end">
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              onClick={() => openEditModal(item)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              onClick={() => openDeleteDialog(item)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ── Create / Edit Modal ── */}
      <Modal show={showModal} onHide={() => !isSubmitting && setShowModal(false)} backdrop="static" centered>
        <Modal.Header closeButton={!isSubmitting}>
          <Modal.Title className="font-headline fs-5 fw-bold">
            {selectedBulletin ? 'Edit Advisory' : 'Publish Homepage Advisory'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveBulletin}>
          <Modal.Body>
            <FormField
              label="Advisory Title"
              type="text"
              required
              placeholder="e.g. FY 2026 Q2 Full Disclosure Board updates"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              disabled={isSubmitting}
            />

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Advisory Content / Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                required
                placeholder="Details of the announcement or guidelines..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                disabled={isSubmitting}
              />
            </Form.Group>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="form-label">Advisory Category Tag</Form.Label>
                  <Form.Select
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {TAG_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <FormField
                  label="Display Date"
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  disabled={isSubmitting}
                  className="mb-0"
                />
              </div>
            </div>

            <FormField
              label="Memo Document Link (Optional)"
              type="url"
              placeholder="https://drive.google.com/..."
              value={formMemoUrl}
              onChange={(e) => setFormMemoUrl(e.target.value)}
              disabled={isSubmitting}
              helpText="Attach a URL to an official directive or pdf file."
              className="mb-0"
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Publish Advisory'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        show={showDeleteConfirm}
        onCancel={() => !isSubmitting && setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Advisory"
        message={<>Are you sure you want to permanently delete the advisory <strong>"{bulletinToDelete?.title}"</strong>?</>}
        detail={
          bulletinToDelete ? (
            <div className="text-secondary small">
              Category: <span className="fw-semibold">{bulletinToDelete.tag}</span><br />
              Description: <span className="text-truncate d-block">{bulletinToDelete.desc}</span>
            </div>
          ) : undefined
        }
        warning="This advisory card will disappear from the homepage immediately."
        confirmLabel="Confirm Delete"
        confirmVariant="danger"
        loading={isSubmitting}
      />
    </div>
  );
}
