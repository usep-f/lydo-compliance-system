import React, { useState, useId, useRef, useEffect } from 'react';

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
  icon?: string;
  iconClass?: string;
  headerClass?: string;
  categories: BarCategory[];
  series: BarSeries[];
  orientation?: 'vertical' | 'horizontal';
  stacked?: boolean;
  valueSuffix?: string;
  maxValue?: number;
  emptyMessage?: string;
  chartHeight?: number;
  maxScrollHeight?: number | string;
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
      gap: '12px 24px',
      justifyContent: 'center',
      marginTop: '14px',
      paddingTop: '12px',
      borderTop: '1px solid #F1F5F9',
    }}
  >
    {series.map((s) => (
      <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            width: '12px',
            height: '12px',
            borderRadius: s.isBackgroundCap ? '3px' : '4px',
            background: s.color,
            display: 'inline-block',
            flexShrink: 0,
            boxShadow: `0 0 0 2px ${s.color}33`,
          }}
        />
        <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
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
  const width = 1000;
  const height = chartHeight;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 45;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const steps = 4;
  const gridTicks = Array.from({ length: steps + 1 }, (_, i) => Math.round((maxVal / steps) * i));

  const n = categories.length;
  const colStep = n > 0 ? chartW / n : chartW;
  const barWidth = Math.min(52, Math.max(18, colStep * 0.38));

  // Determine non-background series
  const mainSeries = series.filter((s) => !s.isBackgroundCap);
  const bgSeries = series.find((s) => s.isBackgroundCap);

  const minWidth = Math.max(650, categories.length * 110);

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
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
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
                  y={height - padBottom + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fill={isHovered ? '#1E293B' : '#64748B'}
                  fontWeight={isHovered ? 700 : 500}
                  fontFamily="var(--font-body)"
                >
                  {labelLines.map((line, lIdx) => (
                    <tspan key={lIdx} x={centerX} dy={lIdx === 0 ? 0 : 13}>
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
   Label formatting helper (Horizontal Charts)
───────────────────────────────────────────── */

function formatHorizontalLabelLines(label: string, maxCharsPerLine = 24): string[] {
  if (label.includes('\n')) return label.split('\n');
  if (label.includes('|')) return label.split('|');

  if (label.length <= maxCharsPerLine) return [label];

  // Tailored multi-line splits for official document types
  if (label.includes('Comprehensive Barangay Youth Development Plan')) {
    return ['Comprehensive Barangay Youth', 'Dev. Plan (CBYDP)'];
  }
  if (label.includes('Annual Barangay Youth Investment Program')) {
    return ['Annual Barangay Youth', 'Investment Program (ABYIP)'];
  }
  if (label.includes('Katipunan ng Kabataan Directory')) {
    return ['Katipunan ng Kabataan', 'Directory (KK Directory)'];
  }
  if (label.includes('Local Youth Development Council Directory')) {
    return ['Local Youth Development', 'Council Directory (LYDC)'];
  }
  if (label.includes('Internal Rules of Procedure')) {
    return ['Internal Rules of', 'Procedure (IRP)'];
  }
  if (label.includes('SK Chairperson and Kagawad Oath')) {
    return ['SK Chairperson and', 'Kagawad Oath'];
  }
  if (label.includes('Peace-Building and Security')) {
    return ['Peace-Building and', 'Security'];
  }
  if (label.includes('Social Inclusion and Equity')) {
    return ['Social Inclusion and', 'Equity'];
  }

  // General word wrap
  const words = label.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current ? current + ' ' + w : w).length <= maxCharsPerLine) {
      current = current ? current + ' ' + w : w;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [label];
}

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
  maxScrollHeight?: number | string;
}> = ({ categories, series, maxVal, valueSuffix, hoveredIndex, setHoveredIndex, uid, maxScrollHeight }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      if (el) {
        const w = el.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mainSeries = series.filter((s) => !s.isBackgroundCap);
  const bgSeries = series.find((s) => s.isBackgroundCap);

  const isMultiSeries = mainSeries.length > 1;

  // Sizing tuned for high readability and utilizing container + scroll space
  const singleBarH = isMultiSeries ? 16 : 22;
  const barGap = isMultiSeries ? 5 : 0;
  const barGroupH = isMultiSeries
    ? mainSeries.length * singleBarH + (mainSeries.length - 1) * barGap
    : singleBarH;
  const rowHeight = isMultiSeries ? 92 : 52;

  // Strict left-alignment margin
  const labelX = 20;
  const padLeft = isMultiSeries ? 260 : 180;
  const padRight = 75;
  const padTop = 34;
  const padBottom = 34;

  const minChartWidth = isMultiSeries ? 700 : 560;
  const width = Math.max(containerWidth || 800, minChartWidth);
  const chartW = Math.max(100, width - padLeft - padRight);

  const height = padTop + categories.length * rowHeight + padBottom;

  const steps = 4;
  const gridTicks = Array.from({ length: steps + 1 }, (_, i) => Math.round((maxVal / steps) * i));

  const scrollHeightStyle = maxScrollHeight
    ? typeof maxScrollHeight === 'number'
      ? `${maxScrollHeight}px`
      : maxScrollHeight
    : undefined;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxHeight: scrollHeightStyle,
        overflowY: scrollHeightStyle ? 'auto' : 'visible',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingRight: scrollHeightStyle ? '6px' : undefined,
        scrollbarWidth: 'thin',
        scrollbarColor: '#CBD5E1 #F4F4F5',
      }}
    >
      <div style={{ position: 'relative', width: `${width}px`, minWidth: '100%', height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <filter id={`hBarGlow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="0" stdDeviation="3" floodColor="#000" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* Grid lines & Top/Bottom Scale Ticks */}
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
                {/* Top Scale Tick */}
                <text
                  x={x}
                  y={padTop - 10}
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight="600"
                  fill="#64748B"
                  fontFamily="var(--font-body)"
                >
                  {tick}{valueSuffix}
                </text>
                {/* Bottom Scale Tick */}
                <text
                  x={x}
                  y={height - padBottom + 18}
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight="600"
                  fill="#64748B"
                  fontFamily="var(--font-body)"
                >
                  {tick}{valueSuffix}
                </text>
              </g>
            );
          })}

          {/* Rows */}
          {categories.map((cat, i) => {
            const rowTop = padTop + i * rowHeight;
            const barGroupTop = rowTop + (rowHeight - barGroupH) / 2;
            const isHovered = hoveredIndex === i;

            // Background Cap length
            const bgVal = bgSeries ? cat.values[bgSeries.key] || 0 : 0;
            const bgW = maxVal > 0 ? (bgVal / maxVal) * chartW : 0;

            const lines = formatHorizontalLabelLines(cat.shortLabel || cat.label);
            const groupCenterY = rowTop + rowHeight / 2;
            const startLabelY = lines.length === 1 ? groupCenterY + 5 : groupCenterY - 4;

            return (
              <g
                key={i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Subtle Hover Highlight Card */}
                <rect
                  x={labelX - 10}
                  y={rowTop + 3}
                  width={width - labelX - padRight + 20}
                  height={rowHeight - 6}
                  rx="8"
                  ry="8"
                  fill="#F8FAFC"
                  opacity={isHovered ? 1 : 0}
                  style={{ transition: 'opacity 0.15s ease' }}
                />

                {/* Left-Aligned Category Header Label */}
                <text
                  x={labelX}
                  y={startLabelY}
                  textAnchor="start"
                  fontSize="13.5"
                  fill={isHovered ? '#0F172A' : '#1E293B'}
                  fontWeight={isHovered ? 800 : 600}
                  fontFamily="var(--font-body)"
                >
                  {lines.map((line, lIdx) => (
                    <tspan key={lIdx} x={labelX} dy={lIdx === 0 ? 0 : 17}>
                      {line}
                    </tspan>
                  ))}
                </text>

                {/* Single-Series Background Cap or Track */}
                {!isMultiSeries && (
                  bgSeries && bgW > 0 ? (
                    <rect
                      x={padLeft}
                      y={barGroupTop}
                      width={bgW}
                      height={barGroupH}
                      rx="6"
                      ry="6"
                      fill={bgSeries.color}
                      opacity={isHovered ? 0.9 : 0.6}
                      style={{ transition: 'all 0.2s ease' }}
                    />
                  ) : (
                    <rect
                      x={padLeft}
                      y={barGroupTop}
                      width={chartW}
                      height={barGroupH}
                      rx="6"
                      ry="6"
                      fill="#F1F5F9"
                    />
                  )
                )}

                {/* Series Bars */}
                {mainSeries.map((s, sIdx) => {
                  const val = cat.values[s.key] || 0;
                  const w = maxVal > 0 ? (val / maxVal) * chartW : 0;
                  const fillColor = isMultiSeries ? s.color : (cat.color || s.color);
                  const barY = barGroupTop + (isMultiSeries ? sIdx * (singleBarH + barGap) : 0);
                  const actualH = singleBarH;

                  return (
                    <g key={s.key}>
                      {/* Subtle Track for Multi-Series Bars */}
                      {isMultiSeries && (
                        <rect
                          x={padLeft}
                          y={barY}
                          width={chartW}
                          height={actualH}
                          rx="4"
                          ry="4"
                          fill="#F8FAFC"
                          stroke="#F1F5F9"
                          strokeWidth="1"
                        />
                      )}
                      {/* Filled Bar */}
                      <rect
                        x={padLeft}
                        y={barY}
                        width={Math.max(val > 0 ? 4 : 0, w)}
                        height={actualH}
                        rx={isMultiSeries ? 4 : 6}
                        ry={isMultiSeries ? 4 : 6}
                        fill={fillColor}
                        opacity={isHovered ? 1 : 0.9}
                        filter={isHovered ? `url(#hBarGlow-${uid})` : undefined}
                        style={{ transition: 'all 0.2s ease' }}
                      />
                      {/* High-Contrast Value Label Next to Bar */}
                      <text
                        x={padLeft + w + 8}
                        y={barY + actualH / 2 + 4}
                        fontSize={isMultiSeries ? '12.5' : '13'}
                        fontWeight="700"
                        fill={fillColor}
                        fontFamily="var(--font-body)"
                      >
                        {val}{valueSuffix}
                      </text>
                    </g>
                  );
                })}

                {/* Row Separator Line (except last row) */}
                {i < categories.length - 1 && (
                  <line
                    x1={labelX}
                    y1={rowTop + rowHeight}
                    x2={width - padRight + 10}
                    y2={rowTop + rowHeight}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip Overlay (Sticky so it stays visible while scrolling) */}
        {hoveredIndex !== null && categories[hoveredIndex] && (
          <div
            style={{
              position: 'sticky',
              top: '8px',
              float: 'right',
              marginRight: '15px',
              marginTop: '-30px',
              background: '#1E293B',
              color: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: 'var(--dashboard-shadow-global)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 30,
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
  icon = 'bar_chart',
  iconClass = 'icon-info',
  headerClass = 'chart-header-info',
  categories,
  series,
  orientation = 'vertical',
  stacked = false,
  valueSuffix = '',
  maxValue,
  emptyMessage = 'No chart data available.',
  chartHeight,
  maxScrollHeight,
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
        <div className={`chart-card-header ${headerClass}`}>
          <div className="d-flex align-items-center justify-content-between gap-2">
            <div>
              {title && (
                <p className="chart-card-title">
                  <span
                    className={`material-symbols-outlined ${iconClass}`}
                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                  >
                    {icon}
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
                maxScrollHeight={maxScrollHeight}
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
