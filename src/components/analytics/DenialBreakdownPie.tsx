import React, { useMemo } from 'react';
import UnifiedGaugeChart, { type GaugeSlice } from './UnifiedGaugeChart';
import type { DenialShare } from '../../hooks/useComplianceData';
import type { DenialCategory } from '../../constants/submissionTypes';

const DENIAL_COLOR_MAP: Record<DenialCategory, string> = {
  'Missing Signatures / Endorsements': '#EF4444',
  'Incomplete Content / Missing Attachments': '#F59E0B',
  'Non-compliant with Official Template / Format': '#6366F1',
  'Invalid or Incorrect Period / Year': '#8B5CF6',
  'Content Inaccuracies / Data Discrepancies': '#EC4899',
  'Other / Specific Discrepancy': '#71717A',
};

interface DenialBreakdownPieProps {
  shares: DenialShare[];
  totalDenied: number;
  title?: string;
  subtitle?: string;
}

const DenialBreakdownPie: React.FC<DenialBreakdownPieProps> = ({
  shares,
  totalDenied,
  title = 'Denial Breakdown',
  subtitle = 'Category share of denied submissions',
}) => {
  const slices: GaugeSlice[] = useMemo(() => {
    return shares
      .filter((s) => s.count > 0)
      .map((s) => ({
        label: s.label,
        value: s.count,
        color: DENIAL_COLOR_MAP[s.label as DenialCategory] || '#71717A',
      }));
  }, [shares]);

  return (
    <div className="analytics-card h-100" style={{ background: '#fff' }}>
      <UnifiedGaugeChart
        title={title}
        subtitle={subtitle}
        slices={slices}
        centerValue={totalDenied}
        centerLabel="Denied"
        formatValue={(val) => {
          const num = Number(val);
          const pct = totalDenied > 0 ? Math.round((num / totalDenied) * 100) : 0;
          return `${num} (${pct}%)`;
        }}
        emptyMessage="No denied submissions recorded for this period."
        headerClass="chart-header-primary"
        icon="donut_large"
        iconClass="icon-primary"
      />
    </div>
  );
};

export default DenialBreakdownPie;
