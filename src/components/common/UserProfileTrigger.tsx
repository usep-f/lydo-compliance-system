import React from 'react';
import { useUserProfileModal } from '../../context/UserProfileModalContext';

interface UserProfileTriggerProps {
  userId?: string;
  name?: string;
  fullName?: string;
  subtitle?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

const UserProfileTrigger: React.FC<UserProfileTriggerProps> = ({ 
  userId, 
  name, 
  fullName,
  subtitle,
  className = '',
  style,
  title
}) => {
  const { openUserProfile } = useUserProfileModal();
  const displayName = fullName || name || '';

  if (!displayName) {
    return <span className="text-muted">—</span>;
  }

  // If no userId is provided, fallback to plain text name
  if (!userId) {
    return (
      <div className={`d-inline-block ${className}`} style={style}>
        <div className="fw-semibold cell-text-clamp-2" title={title || displayName} style={{ color: '#18181B' }}>
          {displayName}
        </div>
        {subtitle && <div className="cell-subtitle text-muted mt-0.5">{subtitle}</div>}
      </div>
    );
  }

  return (
    <div className={`user-profile-trigger d-inline-block ${className}`} style={style}>
      <button 
        type="button" 
        className="btn btn-link p-0 text-start text-decoration-none d-inline-flex flex-column align-items-start border-0 bg-transparent" 
        onClick={(e) => {
          e.stopPropagation();
          openUserProfile(userId);
        }}
        title={title || `View profile of ${displayName}`}
        style={{ color: 'inherit', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <span className="d-inline-flex align-items-center gap-1 trigger-name-link">
          <span 
            className="fw-semibold cell-text-clamp-2 trigger-name-text" 
            style={{ 
              color: '#18181B', 
              transition: 'color 0.15s ease, text-decoration-color 0.15s ease'
            }}
          >
            {displayName}
          </span>
          <span 
            className="material-symbols-outlined trigger-icon text-muted" 
            style={{ 
              fontSize: '13px',
              opacity: 0,
              transition: 'opacity 0.15s ease, transform 0.15s ease, color 0.15s ease'
            }}
          >
            open_in_new
          </span>
        </span>
        {subtitle && (
          <div className="cell-subtitle text-muted mt-0.5">{subtitle}</div>
        )}
      </button>

      <style>{`
        .user-profile-trigger button:hover .trigger-name-text {
          color: #4F46E5 !important;
          text-decoration: underline !important;
          text-underline-offset: 3px;
        }
        .user-profile-trigger button:hover .trigger-icon {
          opacity: 1 !important;
          color: #4F46E5 !important;
          transform: translate(1px, -1px);
        }
      `}</style>
    </div>
  );
};

export default UserProfileTrigger;

