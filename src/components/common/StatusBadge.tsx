import React from 'react';
import { Badge } from 'react-bootstrap';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let bg = 'secondary';
  let text = 'white';
  let label = status;

  switch (status.toLowerCase()) {
    case 'approved':
      bg = 'success';
      label = 'Approved';
      break;
    case 'pending':
      bg = 'warning';
      text = 'dark';
      label = 'Pending';
      break;
    case 'denied':
    case 'rejected':
      bg = 'danger';
      label = 'Denied';
      break;
  }

  return (
    <Badge bg={bg} text={text}>
      {label}
    </Badge>
  );
};

export default StatusBadge;
