import React from 'react';
import type { PendingSubmission } from '../../constants/submissionTypes';
import { formatPeriodLabel } from '../../utils/periodUtils';
import { DataTable } from '../common/DataTable';
import type { Column } from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';
import UserProfileTrigger from '../common/UserProfileTrigger';

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
      render: (sub) => (
        <div className="w-100">
          <div className="cell-doc-title" title={sub.documentLabel}>{sub.documentLabel}</div>
        </div>
      ),
    },
    {
      header: 'Submitted By',
      render: (sub) => (
        <div className="w-100">
          <UserProfileTrigger
            userId={sub.userId}
            fullName={sub.fullName}
            className="fw-semibold cell-text-clamp-2"
          />
        </div>
      ),
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
      render: () => <StatusBadge status="pending" />,
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
