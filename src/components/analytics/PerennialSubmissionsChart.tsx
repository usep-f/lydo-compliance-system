import React, { useState, useMemo } from 'react';
import { Row, Col } from 'react-bootstrap';
import type { OverallPerennialSummary, OverallPerennialItem } from '../../hooks/useComplianceData';

/* ─────────────────────────────────────────────
   Types & Category Icon Map
───────────────────────────────────────────── */
export type PerennialStatusView = 'all' | 'approved' | 'pending';

interface PerennialSubmissionsChartProps {
  summary: OverallPerennialSummary;
  selectedBarangay?: string;
}

const CATEGORY_ICON_MAP: Record<string, string> = {
  resolutions: 'gavel',
  activeCitizenship: 'volunteer_activism',
  agriculture: 'agriculture',
  economicEmpowerment: 'payments',
  education: 'school',
  environment: 'eco',
  globalMobility: 'travel_explore',
  governance: 'account_balance',
  health: 'health_and_safety',
  peaceBuildingAndSecurity: 'shield',
  socialInclusionAndEquity: 'groups',
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  resolutions: '#7C3AED',
  activeCitizenship: '#2563EB',
  agriculture: '#16A34A',
  economicEmpowerment: '#D97706',
  education: '#0284C7',
  environment: '#059669',
  globalMobility: '#4F46E5',
  governance: '#475569',
  health: '#DC2626',
  peaceBuildingAndSecurity: '#0D9488',
  socialInclusionAndEquity: '#9333EA',
};

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

/** Metric Chip */
const SummaryChip: React.FC<{
  title: string;
  count: number;
  approved: number;
  pending: number;
  icon: string;
  color: string;
  bgColor: string;
}> = ({ title, count, approved, pending, icon, color, bgColor }) => (
  <div
    className="p-3 h-100 d-flex align-items-center justify-content-between"
    style={{
      background: '#FAFAFA',
      border: '1px solid #E4E4E7',
      borderRadius: '10px',
    }}
  >
    <div className="d-flex align-items-center gap-3">
      <div
        className="d-flex align-items-center justify-content-center rounded-circle"
        style={{
          width: '38px',
          height: '38px',
          background: bgColor,
          color,
          flexShrink: 0,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
          {icon}
        </span>
      </div>
      <div>
        <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#18181B', lineHeight: 1.2 }}>
          {count}
        </div>
      </div>
    </div>
    <div className="text-end" style={{ fontSize: '11px', color: '#71717A' }}>
      <span className="d-block text-success fw-semibold">{approved} approved</span>
      {pending > 0 ? (
        <span className="d-block text-warning fw-semibold">{pending} pending</span>
      ) : (
        <span className="d-block text-muted">0 pending</span>
      )}
    </div>
  </div>
);

/** Status Filter Toggle */
const StatusFilterToggle: React.FC<{
  value: PerennialStatusView;
  onChange: (val: PerennialStatusView) => void;
}> = ({ value, onChange }) => (
  <div
    style={{
      display: 'inline-flex',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #E4E4E7',
      flexShrink: 0,
      background: '#F4F4F5',
      padding: '2px',
      gap: '2px',
    }}
  >
    {(
      [
        { key: 'all', label: 'All Submissions' },
        { key: 'approved', label: 'Approved Only' },
        { key: 'pending', label: 'Pending Only' },
      ] as const
    ).map((btn) => {
      const isActive = value === btn.key;
      return (
        <button
          key={btn.key}
          type="button"
          onClick={() => onChange(btn.key)}
          style={{
            padding: '3px 10px',
            fontSize: '12px',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '6px',
            background: isActive ? '#fff' : 'transparent',
            color: isActive ? '#18181B' : '#71717A',
            border: 'none',
            boxShadow: isActive ? 'var(--shadow-subtle-token)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {btn.label}
        </button>
      );
    })}
  </div>
);

/** Single Category Row */
const CategoryBarRow: React.FC<{
  item: OverallPerennialItem;
  view: PerennialStatusView;
  maxCount: number;
}> = ({ item, view, maxCount }) => {
  const displayVal = view === 'approved' ? item.approved : view === 'pending' ? item.pending : item.total;
  const barWidthPct = maxCount > 0 ? Math.round((displayVal / maxCount) * 100) : 0;
  const icon = CATEGORY_ICON_MAP[item.id] || 'description';
  const themeColor = CATEGORY_COLOR_MAP[item.id] || '#4F46E5';

  return (
    <div
      className="py-2 px-3 mb-2 rounded transition-all"
      style={{
        background: '#FFFFFF',
        border: '1px solid #F4F4F5',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '18px', color: themeColor, flexShrink: 0 }}
          >
            {icon}
          </span>
          <span
            className="text-truncate fw-semibold"
            style={{ fontSize: '13px', color: '#18181B' }}
            title={item.label}
          >
            {item.label}
          </span>
          {item.category === 'resolutions' && (
            <span
              className="badge"
              style={{
                fontSize: '10px',
                fontWeight: 600,
                background: '#EDE9FE',
                color: '#6D28D9',
                padding: '2px 6px',
              }}
            >
              Resolutions
            </span>
          )}
        </div>

        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {view === 'all' && (
            <>
              <span
                className="badge d-none d-sm-inline-block"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  background: item.approved > 0 ? '#DCFCE7' : '#F4F4F5',
                  color: item.approved > 0 ? '#15803D' : '#A1A1AA',
                }}
              >
                {item.approved} app.
              </span>
              {item.pending > 0 && (
                <span
                  className="badge d-none d-sm-inline-block"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: '#FEF3C7',
                    color: '#B45309',
                  }}
                >
                  {item.pending} pend.
                </span>
              )}
            </>
          )}
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: displayVal > 0 ? '#18181B' : '#A1A1AA',
              minWidth: '28px',
              textAlign: 'right',
            }}
          >
            {displayVal}
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div
        style={{
          height: '8px',
          borderRadius: '4px',
          background: '#F4F4F5',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${barWidthPct}%`,
            borderRadius: '4px',
            background:
              view === 'pending'
                ? '#F59E0B'
                : view === 'approved'
                ? '#16A34A'
                : themeColor,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const PerennialSubmissionsChart: React.FC<PerennialSubmissionsChartProps> = ({
  summary,
  selectedBarangay = '',
}) => {
  const [statusView, setStatusView] = useState<PerennialStatusView>('all');

  const maxCount = useMemo(() => {
    const counts = summary.items.map((it) =>
      statusView === 'approved' ? it.approved : statusView === 'pending' ? it.pending : it.total
    );
    return Math.max(1, ...counts);
  }, [summary.items, statusView]);

  const subtitle = useMemo(() => {
    const base = 'Submissions volume across resolutions and all 10 accomplishment categories';
    return selectedBarangay ? `${base} — ${selectedBarangay}` : `${base} — Municipal Total`;
  }, [selectedBarangay]);

  return (
    <div className="analytics-card h-100" style={{ background: '#fff' }}>
      {/* Header */}
      <div className="chart-card-header chart-header-info">
        <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
          <div>
            <p className="chart-card-title">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px', color: '#7C3AED', fontVariationSettings: "'FILL' 1" }}
              >
                history_edu
              </span>
              Resolutions &amp; Accomplishment Reports
            </p>
            <p className="chart-card-subtitle">{subtitle}</p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <StatusFilterToggle value={statusView} onChange={setStatusView} />
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* KPI Mini-cards */}
        <Row className="mb-4 g-2 g-sm-3">
          <Col xs={12} sm={4}>
            <SummaryChip
              title="Resolutions"
              count={summary.totalResolutions}
              approved={summary.totalResolutionsApproved}
              pending={summary.totalResolutionsPending}
              icon="gavel"
              color="#7C3AED"
              bgColor="#EDE9FE"
            />
          </Col>
          <Col xs={12} sm={4}>
            <SummaryChip
              title="Accomplishments"
              count={summary.totalAccomplishments}
              approved={summary.totalAccomplishmentsApproved}
              pending={summary.totalAccomplishmentsPending}
              icon="assessment"
              color="#0284C7"
              bgColor="#E0F2FE"
            />
          </Col>
          <Col xs={12} sm={4}>
            <SummaryChip
              title="Grand Total"
              count={summary.grandTotal}
              approved={summary.totalResolutionsApproved + summary.totalAccomplishmentsApproved}
              pending={summary.totalResolutionsPending + summary.totalAccomplishmentsPending}
              icon="inventory_2"
              color="#16A34A"
              bgColor="#DCFCE7"
            />
          </Col>
        </Row>

        {/* 11 Horizontal Category Rows */}
        <div
          style={{
            background: '#FAFAFA',
            border: '1px solid #E4E4E7',
            borderRadius: '10px',
            padding: '12px',
          }}
        >
          {summary.items.map((item) => (
            <CategoryBarRow
              key={item.id}
              item={item}
              view={statusView}
              maxCount={maxCount}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerennialSubmissionsChart;
