import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status.toLowerCase();

  let bg = '#F4F4F5';
  let color = '#71717A';
  let border = '#E4E4E7';
  let dot = '#A1A1AA';
  let label = status;

  if (s === 'approved') {
    bg = '#F0FDF4'; color = '#16A34A'; border = '#BBF7D0'; dot = '#22C55E'; label = 'Approved';
  } else if (s === 'pending') {
    bg = '#FFF7ED'; color = '#EA580C'; border = '#FED7AA'; dot = '#F97316'; label = 'Pending';
  } else if (s === 'denied' || s === 'rejected') {
    bg = '#FEF2F2'; color = '#DC2626'; border = '#FECACA'; dot = '#EF4444'; label = 'Denied';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dot,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
};

export default StatusBadge;
