import React from 'react';
import { Card, Button } from 'react-bootstrap';
import StatusBadge from '../common/StatusBadge';
import type { SubmissionTypeDefinition } from '../../constants/submissionTypes';
import { getFrequencyLabel, formatPeriodLabel, getDueDateLabel } from '../../utils/periodUtils';

export type SubmissionStatus = 'not_submitted' | 'pending' | 'approved';

interface PastSubmission {
  period: string;
  status: 'pending' | 'approved';
  date?: string;
}

interface SubmissionCardProps {
  /** Document type definition */
  documentType: SubmissionTypeDefinition;
  /** Current period string (e.g., "2026-Q2") — only for scheduled types */
  currentPeriod?: string;
  /** Status for the current period */
  status: SubmissionStatus;
  /** Called when the user clicks Upload */
  onUpload: () => void;
  /** History of past submissions for this document type */
  pastSubmissions?: PastSubmission[];
  /** Whether the upload button should be disabled */
  disabled?: boolean;
}

const SubmissionCard: React.FC<SubmissionCardProps> = ({
  documentType,
  currentPeriod,
  status,
  onUpload,
  pastSubmissions = [],
  disabled = false,
}) => {
  const isAsap = documentType.category === 'asap';
  const frequency = documentType.frequency;

  return (
    <Card className="border-0 shadow-sm h-100" style={{ transition: 'transform 0.2s ease' }}>
      <Card.Body className="d-flex flex-column p-4">
        {/* Header */}
        <div className="d-flex align-items-start justify-content-between mb-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10"
              style={{ width: '44px', height: '44px', flexShrink: 0 }}
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>
                {documentType.icon}
              </span>
            </div>
            <div>
              <h6
                className="mb-0 fw-bold text-dark"
                style={{ fontSize: '14px', lineHeight: '1.3' }}
              >
                {documentType.label}
              </h6>
              {frequency && (
                <span
                  className="badge bg-secondary mt-1"
                  style={{ fontSize: '10px', padding: '3px 8px' }}
                >
                  {getFrequencyLabel(frequency)}
                </span>
              )}
              {isAsap && (
                <span
                  className="badge bg-warning mt-1"
                  style={{ fontSize: '10px', padding: '3px 8px' }}
                >
                  Submit ASAP
                </span>
              )}
            </div>
          </div>
          <StatusBadge
            status={
              status === 'not_submitted'
                ? 'pending'
                : status === 'pending'
                ? 'pending'
                : 'approved'
            }
          />
        </div>

        {/* Period & Due Date (scheduled only) */}
        {!isAsap && currentPeriod && (
          <div className="bg-light rounded-3 p-3 mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="overline-text text-muted mb-1">Current Period</div>
                <div className="fw-semibold text-dark" style={{ fontSize: '14px' }}>
                  {formatPeriodLabel(currentPeriod)}
                </div>
              </div>
              <div className="text-end">
                <div className="overline-text text-muted mb-1">Due By</div>
                <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                  {getDueDateLabel(currentPeriod)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Message */}
        <div className="mb-3" style={{ fontSize: '13px' }}>
          {status === 'not_submitted' && (
            <div className="text-muted d-flex align-items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#F59E0B' }}>
                schedule
              </span>
              Not yet submitted
            </div>
          )}
          {status === 'pending' && (
            <div className="text-primary d-flex align-items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                hourglass_top
              </span>
              Pending admin review
            </div>
          )}
          {status === 'approved' && (
            <div className="text-success d-flex align-items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                check_circle
              </span>
              Approved
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="mt-auto">
          <Button
            variant={status === 'not_submitted' ? 'primary' : 'outline-primary'}
            size="sm"
            className="w-100"
            onClick={onUpload}
            disabled={disabled || status === 'pending' || status === 'approved'}
          >
            <span
              className="material-symbols-outlined me-1"
              style={{ fontSize: '16px', verticalAlign: 'middle' }}
            >
              upload_file
            </span>
            {status === 'not_submitted' ? 'Upload PDF' : status === 'pending' ? 'Awaiting Review' : 'Submitted'}
          </Button>
        </div>

        {/* Past Submissions History (scheduled only) */}
        {pastSubmissions.length > 0 && (
          <div className="mt-3 pt-3 border-top">
            <div className="overline-text text-muted mb-2">Past Periods</div>
            {pastSubmissions.map((sub) => (
              <div
                key={sub.period}
                className="d-flex align-items-center justify-content-between mb-1"
                style={{ fontSize: '12px' }}
              >
                <span className="text-muted">{formatPeriodLabel(sub.period)}</span>
                <StatusBadge status={sub.status} />
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default SubmissionCard;
