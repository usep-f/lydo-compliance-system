import React, { useMemo } from 'react';
import UnifiedGaugeChart, { type GaugeSlice } from './UnifiedGaugeChart';
import type { AccomplishmentShare } from '../../hooks/useComplianceData';

const ACCOMPLISHMENT_COLOR_MAP: Record<string, string> = {
  activeCitizenship: '#3B82F6',
  agriculture: '#10B981',
  economicEmpowerment: '#F59E0B',
  education: '#6366F1',
  environment: '#14B8A6',
  globalMobility: '#8B5CF6',
  governance: '#EC4899',
  health: '#EF4444',
  peaceBuildingAndSecurity: '#F97316',
  socialInclusionAndEquity: '#06B6D4',
};

interface AccomplishmentBreakdownPieProps {
  shares: AccomplishmentShare[];
  totalApproved: number;
  title?: string;
  subtitle?: string;
}

const AccomplishmentBreakdownPie: React.FC<AccomplishmentBreakdownPieProps> = ({
  shares,
  totalApproved,
  title = 'Acc Report Brk.',
  subtitle = 'Category share of approved accomplishment reports',
}) => {
  const slices: GaugeSlice[] = useMemo(() => {
    return shares
      .filter((s) => s.approved > 0)
      .map((s) => ({
        label: s.label,
        value: s.approved,
        color: ACCOMPLISHMENT_COLOR_MAP[s.id] || '#6366F1',
      }));
  }, [shares]);

  return (
    <div className="analytics-card h-100" style={{ background: '#fff' }}>
      <UnifiedGaugeChart
        title={title}
        subtitle={subtitle}
        slices={slices}
        centerValue={totalApproved}
        centerLabel="Approved"
        formatValue={(val) => {
          const num = Number(val);
          const pct = totalApproved > 0 ? Math.round((num / totalApproved) * 100) : 0;
          return `${num} (${pct}%)`;
        }}
        emptyMessage="No approved accomplishment reports recorded yet."
        headerClass="chart-header-violet"
        icon="donut_large"
        iconClass="icon-violet"
      />
    </div>
  );
};

export default AccomplishmentBreakdownPie;
