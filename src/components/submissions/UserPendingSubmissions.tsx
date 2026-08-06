import React from 'react';
import { Badge } from 'react-bootstrap';
import type { PendingSubmission } from '../../constants/submissionTypes';
import { formatPeriodLabel } from '../../utils/periodUtils';
import { DataTable } from '../common/DataTable';
import type { Column } from '../common/DataTable';

interface UserPendingSubmissionsProps {
  pending: PendingSubmission[];
}

/**
 * Displays a list of the user's submissions that are currently pending review.
 */
const UserPendingSubmissions: React.FC<UserPendingSubmissionsProps> = ({ pending = [] }) => {
  const columns: Column<PendingSubmission>[] = [
    {
      header: 'Document Type',
      render: (sub) => <span className="fw-semibold text-dark">{sub.documentLabel}</span>,
    },
    {
      header: 'Submitted By',
      render: (sub) => <span className="text-muted">{sub.fullName}</span>,
    },
    {
      header: 'Period',
      render: (sub) => (
        <span className="text-muted">
          {sub.period === 'ASAP'
            ? 'ASAP'
            : sub.period
            ? formatPeriodLabel(sub.period)
            : '—'}
        </span>
      ),
    },
    {
      header: 'Date Submitted',
      render: (sub) => (
        <span className="text-muted">
          {sub.submittedAt?.toDate ? sub.submittedAt.toDate().toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: () => (
        <Badge bg="warning" text="dark" className="px-2 py-1">
          PENDING REVIEW
        </Badge>
      ),
    },
  ];

  if (pending.length === 0) {
    return null; // Don't show the table if there are no pending submissions
  }

  return (
    <div className="mt-5">
      <h5 className="fw-bold text-dark mb-3" style={{ fontFamily: 'var(--font-headline)' }}>
        Currently Pending Review
      </h5>
      <DataTable
        data={pending}
        columns={columns}
        pageSize={5}
        emptyMessage="No pending submissions."
      />
    </div>
  );
};

export default UserPendingSubmissions;
