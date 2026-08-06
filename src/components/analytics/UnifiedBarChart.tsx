import React, { useState, useId } from 'react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface BarSeries {
  key: string;
  label: string;
  color: string;
  isBackgroundCap?: boolean; // Renders as a faint background pill behind/above main values
}

export interface BarCategory {
  label: string;
  shortLabel?: string;
  values: Record<string, number>; // e.g. { expected: 10, approved: 8 }
  tooltipSubtext?: string;
  color?: string; // Optional dynamic color override for single-series horizontal bars
}

export interface UnifiedBarChartProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  categories: BarCategory[];
  series: BarSeries[];
  orientation?: 'vertical' | 'horizontal';
  stacked?: boolean;
  valueSuffix?: string;
  maxValue?: number;
  emptyMessage?: string;
  chartHeight?: number;
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      color: '#A1A1AA',
      height: '220px',
    }}
  >
    <span
      className="material-symbols-outlined"
      style={{ fontSize: '40px', color: '#D4D4D8' }}
    >
      bar_chart
    </span>
    <p style={{ fontSize: '13px', margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)' }}>
      {message}
    </p>
  </div>
);

const LegendRow: React.FC<{ series: BarSeries[] }> = ({ series }) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px 20px',
      justifyContent: 'center',
      marginTop: '12px',
      paddingTop: '8px',
    }}
  >
    {series.map((s) => (
      <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: s.isBackgroundCap ? '3px' : '50%',
            background: s.color,
            display: 'inline-block',
            flexShrink: 0,
            boxShadow: `0 0 0 2px ${s.color}33`,
          }}
        />
        <span style={{ fontSize: '11.5px', color: '#52525B', fontWeight: 500, fontFamily: 'var(--font-body)' }}>
          {s.label}
        </span>
      </div>
    ))}
  </div>
);

/* ─────────────────────────────────────────────
   Vertical Chart Component (Stacked & Pill Caps)
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Label formatting helper (2-line word wrapping)
───────────────────────────────────────────── */

function formatLabelLines(label: string): string[] {
  // 1. Manual line break control using \n or |
  if (label.includes('\n')) return label.split('\n');
  if (label.includes('|')) return label.split('|');

  // 2. Specific phrase splitting for document type compliance labels
  if (label.includes('Minutes of the Meeting')) {
    const prefix = label.replace('Minutes of the Meeting', '').trim();
    return [prefix, 'Minutes of the Meeting'];
  }
  if (label.includes('Policy Board')) {
    const prefix = label.replace('Policy Board', '').trim();
    return [prefix, 'Policy Board'];
  }

  // 3. Fallback word splitting
  if (label.length <= 11) return [label];
  const words = label.split(' ');
  if (words.length > 1) {
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');
    return [line1, line2];
  }
  return [label];
}

const VerticalBarChart: React.FC<{
  categories: BarCategory[];
  series: BarSeries[];
  stacked: boolean;
  maxVal: number;
  valueSuffix: string;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
  uid: string;
  chartHeight?: number;
}> = ({ categories, series, stacked, maxVal, valueSuffix, hoveredIndex, setHoveredIndex, uid, chartHeight = 190 }) => {
  const width = 500;
  const height = chartHeight;
  const padLeft = 32;
  const padRight = 15;
  const padTop = 18;
  const padBottom = 46;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const steps = 4;
  const gridTicks = Array.from({ length: steps + 1 }, (_, i) => Math.round((maxVal / steps) * i));

  const n = categories.length;
  const colStep = n > 0 ? chartW / n : chartW;
  const barWidth = Math.min(28, Math.max(12, colStep * 0.55));

  // Determine non-background series
  const mainSeries = series.filter((s) => !s.isBackgroundCap);
  const bgSeries = series.find((s) => s.isBackgroundCap);

  const minWidth = Math.max(500, categories.length * 75);

  return (
    <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ position: 'relative', minWidth: `${minWidth}px` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <filter id={`barGlow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Grid lines */}
          {gridTicks.map((tick, i) => {
            const y = padTop + chartH - (maxVal > 0 ? (tick / maxVal) * chartH : 0);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9.5"
                  fill="#94A3B8"
                  fontFamily="var(--font-body)"
                >
                  {tick}{valueSuffix}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {categories.map((cat, i) => {
            const centerX = padLeft + (i + 0.5) * colStep;
            const x = centerX - barWidth / 2;
            const isHovered = hoveredIndex === i;

            // Background Cap (e.g. Total Expected Target height)
            const bgVal = bgSeries ? cat.values[bgSeries.key] || 0 : 0;
            const bgH = maxVal > 0 ? (bgVal / maxVal) * chartH : 0;
            const bgY = padTop + chartH - bgH;

            const labelLines = formatLabelLines(cat.shortLabel || cat.label);

            return (
              <g
                key={i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Background pill cap */}
                {bgSeries && bgVal > 0 && (
                  <rect
                    x={x}
                    y={bgY}
                    width={barWidth}
                    height={bgH}
                    rx="6"
                    ry="6"
                    fill={bgSeries.color}
                    opacity={isHovered ? 0.9 : 0.6}
                    style={{ transition: 'all 0.2s ease' }}
                  />
                )}

                {/* Main value bars */}
                {stacked ? (
                  (() => {
                    let cursorY = padTop + chartH;
                    const segmentGap = 3;
                    const nonZeroCount = mainSeries.filter((s) => (cat.values[s.key] || 0) > 0).length;

                    return mainSeries.map((s) => {
                      const val = cat.values[s.key] || 0;
                      if (val <= 0) return null;

                      const rawH = maxVal > 0 ? (val / maxVal) * chartH : 0;
                      const h = Math.max(3, rawH - (nonZeroCount > 1 ? segmentGap : 0));
                      cursorY -= (h + (nonZeroCount > 1 ? segmentGap : 0));

                      return (
                        <rect
                          key={s.key}
                          x={x}
                          y={cursorY + (nonZeroCount > 1 ? segmentGap / 2 : 0)}
                          width={barWidth}
                          height={h}
                          rx="5"
                          ry="5"
                          fill={s.color}
                          opacity={isHovered ? 1 : 0.88}
                          filter={isHovered ? `url(#barGlow-${uid})` : undefined}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                      );
                    });
                  })()
                ) : (
                  mainSeries.map((s, sIdx) => {
                    const val = cat.values[s.key] || 0;
                    if (val <= 0) return null;
                    const rawH = maxVal > 0 ? (val / maxVal) * chartH : 0;
                    const h = Math.max(4, rawH);
                    const y = padTop + chartH - h;
                    const groupWidth = barWidth / mainSeries.length;
                    const gx = x + sIdx * groupWidth;

                    return (
                      <rect
                        key={s.key}
                        x={gx}
                        y={y}
                        width={Math.max(4, groupWidth - (mainSeries.length > 1 ? 2 : 0))}
                        height={h}
                        rx="5"
                        ry="5"
                        fill={s.color}
                        opacity={isHovered ? 1 : 0.88}
                        filter={isHovered ? `url(#barGlow-${uid})` : undefined}
                        style={{ transition: 'all 0.2s ease' }}
                      />
                    );
                  })
                )}

                {/* X-axis multi-line label */}
                <text
                  x={centerX}
                  y={height - padBottom + 14}
                  textAnchor="middle"
                  fontSize="5.6"
                  fill={isHovered ? '#1E293B' : '#64748B'}
                  fontWeight={isHovered ? 700 : 500}
                  fontFamily="var(--font-body)"
                >
                  {labelLines.map((line, lIdx) => (
                    <tspan key={lIdx} x={centerX} dy={lIdx === 0 ? 0 : 11}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip Overlay */}
        {hoveredIndex !== null && categories[hoveredIndex] && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1E293B',
            color: '#FFFFFF',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: 'var(--dashboard-shadow-global)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          <span>{categories[hoveredIndex].label}: </span>
          {series.map((s) => (
            <span key={s.key} style={{ marginLeft: '6px', color: s.color }}>
              {s.label}: {categories[hoveredIndex].values[s.key] || 0}{valueSuffix}
            </span>
          ))}
          {categories[hoveredIndex].tooltipSubtext && (
            <span style={{ color: '#94A3B8', marginLeft: '6px' }}>
              ({categories[hoveredIndex].tooltipSubtext})
            </span>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Horizontal Chart Component (Ranking & Breakdown)
───────────────────────────────────────────── */

const HorizontalBarChart: React.FC<{
  categories: BarCategory[];
  series: BarSeries[];
  maxVal: number;
  valueSuffix: string;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
  uid: string;
}> = ({ categories, series, maxVal, valueSuffix, hoveredIndex, setHoveredIndex, uid }) => {
  const rowHeight = 28;
  const padLeft = 135;
  const padRight = 35;
  const padTop = 10;
  const padBottom = 22;

  const height = padTop + categories.length * rowHeight + padBottom;
  const width = 500;
  const chartW = width - padLeft - padRight;

  const steps = 4;
  const gridTicks = Array.from({ length: steps + 1 }, (_, i) => Math.round((maxVal / steps) * i));

  const mainSeries = series.filter((s) => !s.isBackgroundCap);
  const bgSeries = series.find((s) => s.isBackgroundCap);

  return (
    <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ position: 'relative', minWidth: '480px' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <filter id={`hBarGlow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="0" stdDeviation="3" floodColor="#000" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Grid lines */}
          {gridTicks.map((tick, i) => {
            const x = padLeft + (maxVal > 0 ? (tick / maxVal) * chartW : 0);
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={height - padBottom}
                  stroke="#F1F5F9"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={height - padBottom + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#94A3B8"
                  fontFamily="var(--font-body)"
                >
                  {tick}{valueSuffix}
                </text>
              </g>
            );
          })}

          {/* Rows */}
          {categories.map((cat, i) => {
            const y = padTop + i * rowHeight + 4;
            const barH = 14;
            const isHovered = hoveredIndex === i;

            // Background Cap length
            const bgVal = bgSeries ? cat.values[bgSeries.key] || 0 : 0;
            const bgW = maxVal > 0 ? (bgVal / maxVal) * chartW : 0;

            return (
              <g
                key={i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Row label */}
                <text
                  x={padLeft - 8}
                  y={y + barH / 2 + 3.5}
                  textAnchor="end"
                  fontSize="9.5"
                  fill={isHovered ? '#1E293B' : '#475569'}
                  fontWeight={isHovered ? 700 : 500}
                  fontFamily="var(--font-body)"
                >
                  {cat.shortLabel || (cat.label.length > 22 ? cat.label.slice(0, 20) + '…' : cat.label)}
                </text>

                {/* Background Cap */}
                {bgSeries && bgW > 0 && (
                  <rect
                    x={padLeft}
                    y={y}
                    width={bgW}
                    height={barH}
                    rx="5"
                    ry="5"
                    fill={bgSeries.color}
                    opacity={isHovered ? 0.9 : 0.6}
                    style={{ transition: 'all 0.2s ease' }}
                  />
                )}

                {/* Series Bars */}
                {mainSeries.map((s, sIdx) => {
                  const val = cat.values[s.key] || 0;
                  const w = maxVal > 0 ? (val / maxVal) * chartW : 0;
                  const fillColor = cat.color || s.color;
                  const barY = y + (mainSeries.length > 1 ? (sIdx * (barH / mainSeries.length)) : 0);
                  const actualH = mainSeries.length > 1 ? barH / mainSeries.length - 2 : barH;

                  return (
                    <g key={s.key}>
                      <rect
                        x={padLeft}
                        y={barY}
                        width={Math.max(0, w)}
                        height={actualH}
                        rx="5"
                        ry="5"
                        fill={fillColor}
                        opacity={isHovered ? 1 : 0.88}
                        filter={isHovered ? `url(#hBarGlow-${uid})` : undefined}
                        style={{ transition: 'all 0.2s ease' }}
                      />
                      {/* Value label next to bar */}
                      <text
                        x={padLeft + w + 6}
                        y={barY + actualH / 2 + 3.5}
                        fontSize="10"
                        fontWeight="700"
                        fill={fillColor}
                        fontFamily="var(--font-body)"
                      >
                        {val}{valueSuffix}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Tooltip Overlay */}
        {hoveredIndex !== null && categories[hoveredIndex] && (
          <div
            style={{
              position: 'absolute',
              top: '0px',
              right: '15px',
              background: '#1E293B',
              color: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: 'var(--dashboard-shadow-global)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}
          >
            <span>{categories[hoveredIndex].label}: </span>
            {series.map((s) => (
              <span key={s.key} style={{ marginLeft: '6px', color: s.color }}>
                {s.label}: {categories[hoveredIndex].values[s.key] || 0}{valueSuffix}
              </span>
            ))}
            {categories[hoveredIndex].tooltipSubtext && (
              <span style={{ color: '#94A3B8', marginLeft: '6px' }}>
                ({categories[hoveredIndex].tooltipSubtext})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */

const UnifiedBarChart: React.FC<UnifiedBarChartProps> = ({
  title,
  subtitle,
  headerRight,
  categories,
  series,
  orientation = 'vertical',
  stacked = false,
  valueSuffix = '',
  maxValue,
  emptyMessage = 'No chart data available.',
  chartHeight,
}) => {
  const uid = useId().replace(/:/g, '');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isEmpty = categories.length === 0;

  // Compute maximum value for Y/X axis scale
  const computedMax = maxValue ?? Math.max(
    1,
    ...categories.map((cat) => {
      if (stacked) {
        return series
          .filter((s) => !s.isBackgroundCap)
          .reduce((sum, s) => sum + (cat.values[s.key] || 0), 0);
      }
      return Math.max(
        ...series.map((s) => cat.values[s.key] || 0),
        0
      );
    })
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Card Header Strip */}
      {(title || subtitle || headerRight) && (
        <div className="chart-card-header chart-header-primary">
          <div className="d-flex align-items-center justify-content-between gap-2">
            <div>
              {title && (
                <p className="chart-card-title">
                  <span
                    className="material-symbols-outlined icon-primary"
                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                  >
                    bar_chart
                  </span>
                  {title}
                </p>
              )}
              {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
            </div>
            {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
          </div>
        </div>
      )}

      {/* Chart Body */}
      <div className="p-3" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {isEmpty ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <>
            {orientation === 'vertical' ? (
              <VerticalBarChart
                categories={categories}
                series={series}
                stacked={stacked}
                maxVal={computedMax}
                valueSuffix={valueSuffix}
                hoveredIndex={hoveredIndex}
                setHoveredIndex={setHoveredIndex}
                uid={uid}
                chartHeight={chartHeight}
              />
            ) : (
              <HorizontalBarChart
                categories={categories}
                series={series}
                maxVal={computedMax}
                valueSuffix={valueSuffix}
                hoveredIndex={hoveredIndex}
                setHoveredIndex={setHoveredIndex}
                uid={uid}
              />
            )}

            {/* Bottom Legend */}
            <LegendRow series={series} />
          </>
        )}
      </div>
    </div>
  );
};

export default UnifiedBarChart;
