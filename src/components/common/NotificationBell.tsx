import React, { useState, useRef, useEffect } from 'react';
import { useNotifications, type NotificationType, type Notification } from '../../hooks/useNotifications';

// ---------------------------------------------------------------------------
// Type config — add one entry for every new NotificationType
// ---------------------------------------------------------------------------

interface TypeConfig {
  icon: string;
  color: string;
  bg: string;
}

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  submission_received: { icon: 'upload_file',    color: '#4F46E5', bg: '#EEF2FF' },
  submission_approved: { icon: 'task_alt',        color: '#16A34A', bg: '#F0FDF4' },
  submission_denied:   { icon: 'cancel',          color: '#DC2626', bg: '#FEF2F2' },
  account_approved:    { icon: 'verified_user',   color: '#16A34A', bg: '#F0FDF4' },
  account_denied:      { icon: 'person_off',      color: '#DC2626', bg: '#FEF2F2' },
  profile_updated:     { icon: 'manage_accounts', color: '#D97706', bg: '#FFFBEB' },
  new_application:     { icon: 'badge',           color: '#4F46E5', bg: '#EEF2FF' },
  new_submission:      { icon: 'description',     color: '#0284C7', bg: '#F0F9FF' },
  submission_open:     { icon: 'calendar_today',  color: '#2563EB', bg: '#EFF6FF' },
  submission_overdue:  { icon: 'warning',         color: '#EF4444', bg: '#FEF2F2' },
};

const DEFAULT_CONFIG: TypeConfig = {
  icon: 'notifications',
  color: '#71717A',
  bg: '#F4F4F5',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeConfig(type: NotificationType): TypeConfig {
  return TYPE_CONFIG[type] ?? DEFAULT_CONFIG;
}

function getRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Sub-component: NotificationItem
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead }) => {
  const cfg = getTypeConfig(notification.type);
  const isRead = notification.isRead;

  return (
    <button
      type="button"
      onClick={() => !isRead && onRead(notification.id)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        width: '100%',
        padding: '10px 14px',
        background: isRead ? 'transparent' : '#F8F8FF',
        border: 'none',
        borderBottom: '1px solid #F4F4F5',
        cursor: isRead ? 'default' : 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s ease',
        opacity: isRead ? 0.55 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isRead) e.currentTarget.style.background = '#F1F5F9';
      }}
      onMouseLeave={(e) => {
        if (!isRead) e.currentTarget.style.background = '#F8F8FF';
      }}
    >
      {/* Type icon */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: cfg.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '1px',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '16px', color: cfg.color, fontVariationSettings: "'FILL' 1" }}
        >
          {cfg.icon}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: isRead ? 500 : 700,
            color: '#18181B',
            lineHeight: 1.3,
            marginBottom: '2px',
          }}
        >
          {notification.title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: '#52525B',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {notification.body}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            color: '#A1A1AA',
            marginTop: '4px',
          }}
        >
          {getRelativeTime(notification.createdAt)}
        </div>
      </div>

      {/* Unread dot */}
      {!isRead && (
        <div
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#4F46E5',
            flexShrink: 0,
            marginTop: '5px',
          }}
        />
      )}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Main Component: NotificationBell
// ---------------------------------------------------------------------------

interface NotificationBellProps {
  uid: string | null;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ uid }) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(uid);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleBellClick = () => setIsOpen((prev) => !prev);

  const handleMarkAsRead = (id: string) => markAsRead(id);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleBellClick}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: isOpen ? '#EEF2FF' : '#FFFFFF',
          border: '1.5px solid',
          borderColor: isOpen ? '#818CF8' : '#E0E7FF',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          flexShrink: 0,
          boxShadow: isOpen
            ? '0 0 0 3px rgba(79,70,229,0.12)'
            : '0 1px 3px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = '#EEF2FF';
            e.currentTarget.style.borderColor = '#C7D2FE';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(79,70,229,0.12)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E0E7FF';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
          }
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '20px',
            color: isOpen ? '#4F46E5' : '#6366F1',
            fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : "'FILL' 0",
            transition: 'color 0.15s ease',
          }}
        >
          notifications
        </span>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              minWidth: '17px',
              height: '17px',
              borderRadius: '9999px',
              background: '#EF4444',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 800,
              fontFamily: 'var(--font-body)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #e0e0e0',
              lineHeight: 1,
              animation: 'notif-badge-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '340px',
            background: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 20px 40px -8px rgba(0,0,0,0.18), 0 4px 12px -4px rgba(0,0,0,0.08)',
            border: '1px solid #E4E4E7',
            zIndex: 10000,
            overflow: 'hidden',
            animation: 'notif-panel-enter 0.18s ease-out',
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px 10px',
              borderBottom: '1px solid #F4F4F5',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '16px', color: '#4F46E5', fontVariationSettings: "'FILL' 1" }}
              >
                notifications
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#18181B',
                }}
              >
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9999px',
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#4F46E5',
                  padding: '2px 6px',
                  borderRadius: '5px',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#EEF2FF')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '32px 0',
                  gap: '10px',
                  color: '#A1A1AA',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}
                >
                  progress_activity
                </span>
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              /* Empty state */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '36px 20px',
                  gap: '10px',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '40px', color: '#D4D4D8', fontVariationSettings: "'FILL' 1" }}
                >
                  notifications_off
                </span>
                <div
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#3F3F46',
                  }}
                >
                  You're all caught up!
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: '#A1A1AA',
                    textAlign: 'center',
                  }}
                >
                  No notifications yet. Activity will appear here.
                </div>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onRead={handleMarkAsRead}
                />
              ))
            )}
          </div>

          {/* Panel Footer */}
          {notifications.length > 0 && (
            <div
              style={{
                padding: '8px 14px',
                borderTop: '1px solid #F4F4F5',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  color: '#A1A1AA',
                }}
              >
                Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
