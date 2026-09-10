import React, { useState, useId } from 'react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface GaugeSlice {
  label: string;
  value: number;        // Absolute value (raw count or percentage — caller controls)
  color: string;        // Hex / CSS colour for the arc
  isStriped?: boolean;  // Render with diagonal-hatch pattern instead of solid fill
}

interface UnifiedGaugeChartProps {
  /** Card header title */
  title?: string;
  /** Card header subtitle */
  subtitle?: string;
  /** Data slices rendered into the arc */
  slices: GaugeSlice[];
  /** Large centre hero text (e.g. "85" or "85%") */
  centerValue: string | number;
  /** Small label beneath the centre value */
  centerLabel: string;
  /** Suffix to append to hover slice values (e.g. "%") */
  valueSuffix?: string;
  /** Custom formatter function for displayed hover value */
  formatValue?: (value: number | string) => string;
  /** Empty-state message when all values are 0 */
  emptyMessage?: string;
  /** Total height of the chart canvas in px */
  // height prop reserved for future use
}

/* ─────────────────────────────────────────────
   Arc geometry helpers
───────────────────────────────────────────── */

const CX = 150;         // SVG viewport centre X
const CY = 135;         // SVG viewport centre Y (pushed up — semi-circle)
const R  = 108;         // Arc radius
const SW = 24;          // Stroke width
const START_ANGLE = -200; // degrees — wide semi-circle opening
const SWEEP_ANGLE = 220;  // degrees — total arc sweep

function polarToXY(angleDeg: number, r: number, cx: number, cy: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function buildArcPath(
  startDeg: number,
  endDeg: number,
  r: number,
  cx: number,
  cy: number,
): string {
  const start = polarToXY(startDeg, r, cx, cy);
  const end   = polarToXY(endDeg,   r, cx, cy);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
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
      height: '200px',
    }}
  >
    <span
      className="material-symbols-outlined"
      style={{ fontSize: '40px', color: '#D4D4D8' }}
    >
      insert_chart
    </span>
    <p
      style={{
        fontSize: '13px',
        margin: 0,
        textAlign: 'center',
        fontFamily: 'var(--font-body)',
      }}
    >
      {message}
    </p>
  </div>
);

/* ─────────────────────────────────────────────
   Legend item
───────────────────────────────────────────── */

const LegendItem: React.FC<{
  label: string;
  color: string;
  isStriped?: boolean;
  isHovered: boolean;
  patternId: string;
  onEnter: () => void;
  onLeave: () => void;
}> = ({ label, color, isStriped, isHovered, patternId, onEnter, onLeave }) => (
  <div
    onMouseEnter={onEnter}
    onMouseLeave={onLeave}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      cursor: 'default',
      opacity: isHovered ? 1 : 0.75,
      transition: 'opacity 0.2s ease',
    }}
  >
    {isStriped ? (
      <svg width="14" height="14" style={{ flexShrink: 0, borderRadius: '3px' }}>
        <rect width="14" height="14" fill={`url(#${patternId})`} rx="3" />
      </svg>
    ) : (
      <span
        style={{
          display: 'inline-block',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 0 2px ${color}33`,
        }}
      />
    )}
    <span
      style={{
        fontSize: '11.5px',
        fontFamily: 'var(--font-body)',
        color: '#52525B',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  </div>
);

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */

const UnifiedGaugeChart: React.FC<UnifiedGaugeChartProps> = ({
  title,
  subtitle,
  slices,
  centerValue,
  centerLabel,
  valueSuffix = '',
  formatValue,
  emptyMessage = 'No data available.',
}) => {
  const uid = useId();
  const hatchPatternId = `gaugeHatch-${uid.replace(/:/g, '')}`;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const isEmpty = total === 0;

  // Build arc segments with separation gaps between slices
  const activeCount = slices.filter((s) => s.value > 0).length;
  // Account for strokeLinecap="round" cap extensions (2 * ~6.37° = 12.74°) plus 5° visible gap
  const GAP_DEG = activeCount > 1 ? 18 : 0;
  const totalGapsAngle = activeCount > 1 ? (activeCount - 1) * GAP_DEG : 0;
  const availableSweep = Math.max(0, SWEEP_ANGLE - totalGapsAngle);

  const arcs: Array<{
    path: string;
    slice: GaugeSlice;
    index: number;
    startDeg: number;
    endDeg: number;
  }> = [];

  let cursor = START_ANGLE;
  slices.forEach((slice, i) => {
    if (slice.value <= 0) return;

    const fraction   = total > 0 ? slice.value / total : 0;
    const sliceSweep = fraction * availableSweep;
    const startDeg   = cursor;
    const endDeg     = startDeg + sliceSweep;

    if (sliceSweep > 0.2) {
      arcs.push({
        path:     buildArcPath(startDeg, endDeg, R, CX, CY),
        slice,
        index:    i,
        startDeg,
        endDeg,
      });
    }

    cursor = endDeg + GAP_DEG;
  });

  // Background track arc
  const trackPath = buildArcPath(START_ANGLE, START_ANGLE + SWEEP_ANGLE, R, CX, CY);

  // Resolve what the centre displays (changes on hover)
  const displayValue = hoveredIndex !== null
    ? (formatValue
        ? formatValue(slices[hoveredIndex].value)
        : `${slices[hoveredIndex].value}${valueSuffix}`)
    : centerValue;
  const displayLabel = hoveredIndex !== null
    ? slices[hoveredIndex].label
    : centerLabel;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Card header strip */}
      {(title || subtitle) && (
        <div className="chart-card-header chart-header-primary">
          <p className="chart-card-title">
            <span
              className="material-symbols-outlined icon-primary"
              style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
            >
              donut_large
            </span>
            {title}
          </p>
          {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        </div>
      )}

      {/* Chart body */}
      <div
        className="px-3 pb-3 pt-2"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}
      >
        {isEmpty ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <>
            {/* SVG gauge */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <svg
                viewBox="0 0 300 155"
                width="100%"
                style={{ display: 'block', overflow: 'visible' }}
                aria-label={`Gauge chart: ${centerLabel} ${centerValue}`}
              >
                <defs>
                  {/* Per-slice diagonal hatch pattern for striped slices */}
                  {slices.map((slice, index) =>
                    slice.isStriped ? (
                      <pattern
                        key={index}
                        id={`${hatchPatternId}-slice-${index}`}
                        patternUnits="userSpaceOnUse"
                        width="6"
                        height="6"
                        patternTransform="rotate(45)"
                      >
                        <line
                          x1="0" y1="0" x2="0" y2="6"
                          stroke={slice.color}
                          strokeWidth="2.5"
                          strokeLinecap="square"
                        />
                      </pattern>
                    ) : null
                  )}
                  {/* Drop shadow filter */}
                  <filter id={`gaugeShadow-${uid.replace(/:/g, '')}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.08" />
                  </filter>
                </defs>

                {/* Track (background arc) */}
                <path
                  d={trackPath}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth={SW}
                  strokeLinecap="round"
                />

                {/* Data arcs */}
                {arcs.map(({ path, slice, index }) => {
                  const isHovered = hoveredIndex === index;
                  const strokeColor = slice.isStriped
                    ? `url(#${hatchPatternId}-slice-${index})`
                    : slice.color;

                  return (
                    <path
                      key={index}
                      d={path}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isHovered ? SW + 4 : SW}
                      strokeLinecap="round"
                      style={{
                        cursor: 'pointer',
                        transition: 'stroke-width 0.2s ease',
                        filter: isHovered
                          ? `drop-shadow(0 0 6px ${slice.color}55)`
                          : 'none',
                        willChange: 'stroke-width',
                      }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <title>{`${slice.label}: ${formatValue ? formatValue(slice.value) : `${slice.value}${valueSuffix}`}`}</title>
                    </path>
                  );
                })}
              </svg>

              {/* Hero centre label — overlays SVG */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '0px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  minWidth: '80px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontSize: '30px',
                    fontWeight: 800,
                    color: '#18181B',
                    lineHeight: 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {displayValue}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#71717A',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    marginTop: '3px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {displayLabel}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 16px',
                justifyContent: 'center',
                marginTop: '50px',
              }}
            >
              {/* Hidden SVG for legend hatch icons */}
              <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                  {slices.map((slice, i) =>
                    slice.isStriped ? (
                      <pattern
                        key={i}
                        id={`${hatchPatternId}-legend-${i}`}
                        patternUnits="userSpaceOnUse"
                        width="6"
                        height="6"
                        patternTransform="rotate(45)"
                      >
                        <line
                          x1="0" y1="0" x2="0" y2="6"
                          stroke={slice.color}
                          strokeWidth="2.5"
                          strokeLinecap="square"
                        />
                      </pattern>
                    ) : null
                  )}
                </defs>
              </svg>

              {slices.map((slice, i) => (
                <LegendItem
                  key={i}
                  label={slice.label}
                  color={slice.color}
                  isStriped={slice.isStriped}
                  isHovered={hoveredIndex === i}
                  patternId={`${hatchPatternId}-legend-${i}`}
                  onEnter={() => setHoveredIndex(i)}
                  onLeave={() => setHoveredIndex(null)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UnifiedGaugeChart;
