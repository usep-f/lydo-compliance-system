/**
 * Standalone High-DPI Executive PDF Chart Rendering Engine
 * Renders publication-grade 300+ DPI visualizations directly to memory via Canvas2D.
 */

import type { ComplianceData } from '../hooks/useComplianceData';

/* ─────────────────────────────────────────────
   Color Tokens (Modern Minimalist Slate & Neon Accents)
───────────────────────────────────────────── */
export const CHART_THEME = {
  navy: '#00426E',
  cobalt: '#2563EB',
  mint: '#10B981',
  amber: '#F59E0B',
  coral: '#F43F5E',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  pink: '#EC4899',
  orange: '#F97316',
  slate900: '#0F172A',
  slate700: '#334155',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
};

/** Helper to create an offscreen canvas at high pixel density (2x–3x) */
const createHiDpiCanvas = (width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
};

/** Helper to draw rounded rectangle in Canvas2D */
const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  strokeWidth = 1
) => {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
  ctx.restore();
};

/* ─────────────────────────────────────────────
   1. Compliance Status Radial Gauge & Metric Breakdown
───────────────────────────────────────────── */
export const renderComplianceRadialGauge = (
  compliance: ComplianceData,
  scope: string,
  width = 1600,
  height = 1100
): string => {
  const { canvas, ctx } = createHiDpiCanvas(width, height);
  const isAll = scope === 'all' || !scope;
  const bData = !isAll ? compliance.barangayRanking.find((b) => b.barangay === scope) : null;
  const rate = isAll ? compliance.overallRate : (bData?.rate ?? 0);
  const totalExpected = isAll
    ? compliance.barangayRanking.reduce((s, b) => s + b.expected, 0)
    : (bData?.expected ?? 1);
  const approvedCount = isAll
    ? compliance.barangayRanking.reduce((s, b) => s + b.approved, 0)
    : (bData?.approved ?? 0);
  const pendingCount = compliance.pendingReviewCount;
  const overdueCount = compliance.overdueCount;
  const deniedCount = compliance.denialReasonShare.reduce((s, d) => s + d.count, 0);

  // Background Fill
  ctx.fillStyle = CHART_THEME.white;
  ctx.fillRect(0, 0, width, height);

  // Split view: Left Gauge (42%), Right Metric Cards (58%)
  const gaugeCenterX = width * 0.22;
  const gaugeCenterY = height * 0.5;
  const outerRadius = 240;
  const ringThickness = 38;

  // 1. Draw Background Track Arc
  ctx.beginPath();
  ctx.arc(gaugeCenterX, gaugeCenterY, outerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = CHART_THEME.slate100;
  ctx.lineWidth = ringThickness;
  ctx.stroke();

  // 2. Draw Active Compliance Arc (Mint/Cobalt/Amber)
  if (rate > 0) {
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * (rate / 100));
    ctx.beginPath();
    ctx.arc(gaugeCenterX, gaugeCenterY, outerRadius, startAngle, endAngle);
    ctx.strokeStyle = rate >= 80 ? CHART_THEME.mint : rate >= 50 ? CHART_THEME.amber : CHART_THEME.cobalt;
    ctx.lineWidth = ringThickness;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // 3. Center Metric Text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CHART_THEME.slate900;
  ctx.font = 'bold 96px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${rate}%`, gaugeCenterX, gaugeCenterY - 24);

  // Center Badge
  const badgeText = rate >= 80 ? 'HIGH COMPLIANCE' : rate >= 50 ? 'MODERATE' : 'STATUTORY AUDIT';
  const badgeW = 270;
  const badgeH = 46;
  const badgeX = gaugeCenterX - badgeW / 2;
  const badgeY = gaugeCenterY + 48;
  const badgeColor = rate >= 80 ? '#DCFCE7' : rate >= 50 ? '#FEF3C7' : '#EFF6FF';
  const badgeTextColor = rate >= 80 ? '#15803D' : rate >= 50 ? '#B45309' : '#1D4ED8';

  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 12, badgeColor);
  ctx.fillStyle = badgeTextColor;
  ctx.font = 'bold 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(badgeText, gaugeCenterX, badgeY + badgeH / 2 + 1);

  // 4. Right Side Metric Cards Grid (4 items)
  const rightStartX = width * 0.44;
  const cardW = width - rightStartX - 50;
  const cardH = 205;
  const cardGap = 28;

  const metrics = [
    {
      label: 'Approved Submissions',
      count: `${approvedCount} Filings`,
      share: `${Math.round((approvedCount / Math.max(1, totalExpected)) * 100)}% of annual statutory requirement`,
      color: CHART_THEME.mint,
      bgColor: '#F0FDF4',
      borderColor: '#DCFCE7',
      pct: Math.min(100, Math.round((approvedCount / Math.max(1, totalExpected)) * 100)),
    },
    {
      label: 'Pending Validation',
      count: `${pendingCount} Filings`,
      share: 'Awaiting LYDO administrative review & endorsement',
      color: CHART_THEME.amber,
      bgColor: '#FFFBEB',
      borderColor: '#FEF3C7',
      pct: Math.min(100, Math.round((pendingCount / Math.max(1, totalExpected)) * 100)),
    },
    {
      label: 'Missing / Overdue Requirements',
      count: `${overdueCount} Filings`,
      share: 'Statutory deadline passed or unsubmitted by barangay',
      color: CHART_THEME.coral,
      bgColor: '#FFF1F2',
      borderColor: '#FFE4E6',
      pct: Math.min(100, Math.round((overdueCount / Math.max(1, totalExpected)) * 100)),
    },
    {
      label: 'Returned / Denied for Correction',
      count: `${deniedCount} Filings`,
      share: 'Deficiencies logged; action required by SK officials',
      color: '#64748B',
      bgColor: '#F8FAFC',
      borderColor: '#E2E8F0',
      pct: Math.min(100, Math.round((deniedCount / Math.max(1, totalExpected)) * 100)),
    },
  ];

  let currentY = 70;
  metrics.forEach((m) => {
    drawRoundedRect(ctx, rightStartX, currentY, cardW, cardH, 16, m.bgColor, m.borderColor, 2);

    // Left accent pill
    drawRoundedRect(ctx, rightStartX, currentY, 8, cardH, 4, m.color);

    // Label
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = CHART_THEME.slate700;
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(m.label, rightStartX + 28, currentY + 28);

    // Metric Count
    ctx.textAlign = 'right';
    ctx.fillStyle = CHART_THEME.slate900;
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(m.count, rightStartX + cardW - 28, currentY + 24);

    // Subtitle
    ctx.textAlign = 'left';
    ctx.fillStyle = CHART_THEME.slate500;
    ctx.font = '500 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(m.share, rightStartX + 28, currentY + 84);

    // Mini Progress Bar
    const progX = rightStartX + 28;
    const progY = currentY + 144;
    const progW = cardW - 56;
    const progH = 18;
    drawRoundedRect(ctx, progX, progY, progW, progH, 9, CHART_THEME.slate200);
    if (m.pct > 0) {
      const fillW = Math.max(18, (progW * m.pct) / 100);
      drawRoundedRect(ctx, progX, progY, fillW, progH, 9, m.color);
    }

    currentY += cardH + cardGap;
  });

  return canvas.toDataURL('image/png');
};

/* ─────────────────────────────────────────────
   2. 12-Month Submission Velocity & Activity Waveform
───────────────────────────────────────────── */
export const renderSubmissionActivityWave = (
  monthlyTrend: { month: string; submitted: number; approved: number; denied: number }[],
  width = 1600,
  height = 1100
): string => {
  const { canvas, ctx } = createHiDpiCanvas(width, height);

  ctx.fillStyle = CHART_THEME.white;
  ctx.fillRect(0, 0, width, height);

  const padLeft = 95;
  const padRight = 60;
  const padTop = 130;
  const padBottom = 130;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(
    5,
    ...monthlyTrend.map((m) => Math.max(m.submitted, m.approved, m.denied))
  );
  const stepCount = 5;
  const yMax = Math.ceil(maxVal / stepCount) * stepCount;

  // Horizontal Gridlines & Y-Axis Labels
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  for (let i = 0; i <= stepCount; i++) {
    const val = (yMax / stepCount) * i;
    const yPos = padTop + plotH - (plotH * (i / stepCount));

    ctx.strokeStyle = CHART_THEME.slate100;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.moveTo(padLeft, yPos);
    ctx.lineTo(padLeft + plotW, yPos);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = CHART_THEME.slate400;
    ctx.fillText(String(val), padLeft - 22, yPos);
  }

  // Calculate Points for Each Series
  const numPoints = monthlyTrend.length;
  const xStep = plotW / Math.max(1, numPoints - 1);

  const getPoints = (key: 'submitted' | 'approved' | 'denied') =>
    monthlyTrend.map((m, idx) => ({
      x: padLeft + idx * xStep,
      y: padTop + plotH - (plotH * (m[key] / yMax)),
      val: m[key],
      month: m.month,
    }));

  const subPoints = getPoints('submitted');
  const appPoints = getPoints('approved');
  const denPoints = getPoints('denied');

  // Find Peak Month for Callout
  let peakPoint = subPoints[0];
  subPoints.forEach((p) => {
    if (p.val > peakPoint.val) peakPoint = p;
  });

  // 1. Draw Submitted Gradient Area Fill
  ctx.beginPath();
  ctx.moveTo(subPoints[0].x, padTop + plotH);
  subPoints.forEach((p, idx) => {
    if (idx === 0) {
      ctx.lineTo(p.x, p.y);
    } else {
      const prev = subPoints[idx - 1];
      const cx = (prev.x + p.x) / 2;
      ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y);
    }
  });
  ctx.lineTo(subPoints[subPoints.length - 1].x, padTop + plotH);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
  areaGrad.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
  areaGrad.addColorStop(1, 'rgba(37, 99, 235, 0.02)');
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Helper to draw smooth bezier line
  const drawSmoothCurve = (points: typeof subPoints, color: string, lineWidth: number, dash: number[] = []) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    points.forEach((p, idx) => {
      if (idx === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        const prev = points[idx - 1];
        const cx = (prev.x + p.x) / 2;
        ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Data Point Circles
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = CHART_THEME.white;
      ctx.fill();
    });
  };

  // Draw Lines: Submitted (Cobalt), Approved (Mint), Denied (Coral)
  drawSmoothCurve(subPoints, CHART_THEME.cobalt, 7);
  drawSmoothCurve(appPoints, CHART_THEME.mint, 6, [10, 6]);
  drawSmoothCurve(denPoints, CHART_THEME.coral, 5, [6, 6]);

  // X-Axis Month Labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = CHART_THEME.slate700;

  subPoints.forEach((p) => {
    ctx.fillText(p.month, p.x, padTop + plotH + 28);
  });

  // Floating Peak Callout Badge
  if (peakPoint.val > 0) {
    const calloutW = 380;
    const calloutH = 56;
    const calloutX = Math.max(padLeft, Math.min(width - padRight - calloutW, peakPoint.x - calloutW / 2));
    const calloutY = Math.max(20, peakPoint.y - calloutH - 22);

    drawRoundedRect(ctx, calloutX, calloutY, calloutW, calloutH, 14, CHART_THEME.navy, CHART_THEME.cobalt, 2);
    ctx.fillStyle = CHART_THEME.white;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`★ Peak: ${peakPoint.month} (${peakPoint.val} Submissions)`, calloutX + calloutW / 2, calloutY + calloutH / 2);
  }

  // Top Legend
  const legY = 50;
  const legItems = [
    { label: 'Submitted Filings', color: CHART_THEME.cobalt, dash: false },
    { label: 'Approved by LYDO', color: CHART_THEME.mint, dash: true },
    { label: 'Denied / Returned', color: CHART_THEME.coral, dash: true },
  ];

  let legX = padLeft;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  legItems.forEach((item) => {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 6;
    ctx.setLineDash(item.dash ? [6, 4] : []);
    ctx.beginPath();
    ctx.moveTo(legX, legY);
    ctx.lineTo(legX + 40, legY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legX + 20, legY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = CHART_THEME.slate700;
    ctx.fillText(item.label, legX + 52, legY);
    legX += 370;
  });

  return canvas.toDataURL('image/png');
};

/* ─────────────────────────────────────────────
   3. Document Type Compliance Horizontal Capability Progress Matrix
───────────────────────────────────────────── */
export const renderDocTypeHorizontalMatrix = (
  docTypeCompliance: ComplianceData['docTypeCompliance'],
  width = 1600,
  height = 1000
): string => {
  const { canvas, ctx } = createHiDpiCanvas(width, height);

  ctx.fillStyle = CHART_THEME.white;
  ctx.fillRect(0, 0, width, height);

  const cleanDocNames: Record<string, string> = {
    'CBYDP': 'CBYDP (Comprehensive 3-Year Plan)',
    'ABYIP': 'ABYIP (Annual Barangay Investment Plan)',
    'FDP': 'Full Disclosure Policy (FDP)',
    'Regular Session Minutes': 'Regular Session Minutes & Resolutions',
    'Katipunan ng Kabataan Profile': 'Katipunan ng Kabataan (KK) Youth Profile',
    'Directory of SK Officials': 'Directory of SK Officials & Oath of Office',
    'List of Youth Organizations': 'Registry of Youth Organizations (PYOR)',
    'Resolutions': 'Adopted Resolutions & SK Ordinances',
    'Accomplishment Reports': 'Quarterly Accomplishment Reports',
  };

  const rows = docTypeCompliance.slice(0, 8);
  const rowCount = rows.length;
  const startY = 40;
  const availH = height - startY - 30;
  const rowH = availH / Math.max(1, rowCount);

  const labelW = 540;
  const barStartX = labelW + 40;
  const badgeW = 280;
  const barW = width - barStartX - badgeW - 50;

  rows.forEach((doc, idx) => {
    const y = startY + idx * rowH;
    const centerY = y + rowH / 2;
    const name = cleanDocNames[doc.docType] || cleanDocNames[doc.label] || doc.label;

    // Zebra striping background
    if (idx % 2 === 0) {
      drawRoundedRect(ctx, 20, y + 4, width - 40, rowH - 8, 12, CHART_THEME.slate50);
    }

    // 1. Full Readable Document Title
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CHART_THEME.slate900;
    ctx.font = 'bold 27px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(name, 36, centerY);

    // 2. Multi-Segment Capability Bar
    const submitted = doc.submitted ?? (doc.approved + (doc.denied ?? 0));
    const approved = doc.approved;
    const denied = doc.denied ?? 0;
    const totalMax = Math.max(1, submitted, approved + denied);

    const trackH = 34;
    const trackY = centerY - trackH / 2;

    // Background Track
    drawRoundedRect(ctx, barStartX, trackY, barW, trackH, 17, CHART_THEME.slate200);

    // Segment 1: Approved (Mint)
    const appW = (barW * (approved / totalMax));
    if (appW > 0) {
      drawRoundedRect(ctx, barStartX, trackY, appW, trackH, 17, CHART_THEME.mint);
    }

    // Segment 2: Denied (Coral)
    const denW = (barW * (denied / totalMax));
    if (denW > 0) {
      drawRoundedRect(ctx, barStartX + appW, trackY, denW, trackH, 17, CHART_THEME.coral);
    }

    // 3. Right Status Pill Badge
    const rate = Math.round((approved / Math.max(1, submitted)) * 100);
    const pillColor = rate >= 80 ? '#DCFCE7' : rate > 0 ? '#FEF3C7' : '#FEE2E2';
    const pillTextColor = rate >= 80 ? '#15803D' : rate > 0 ? '#B45309' : '#B91C1C';
    const pillText = `${approved} of ${submitted} Approved (${rate}%)`;

    const pillX = width - badgeW - 30;
    const pillY = centerY - 25;
    drawRoundedRect(ctx, pillX, pillY, badgeW, 50, 12, pillColor);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pillTextColor;
    ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(pillText, pillX + badgeW / 2, centerY);
  });

  return canvas.toDataURL('image/png');
};

/* ─────────────────────────────────────────────
   4. Categorical Denial & Deficiency Audit Infographic
───────────────────────────────────────────── */
export const renderDenialInfographic = (
  denialShares: ComplianceData['denialReasonShare'],
  totalDenied: number,
  width = 1600,
  height = 1000
): string => {
  const { canvas, ctx } = createHiDpiCanvas(width, height);

  ctx.fillStyle = CHART_THEME.white;
  ctx.fillRect(0, 0, width, height);

  // Left Donut Ring (38%), Right Deficiency Meters (62%)
  const donutCenterX = width * 0.21;
  const donutCenterY = height * 0.5;
  const donutRadius = 220;
  const ringThickness = 44;

  const activeShares = denialShares.filter((d) => d.count > 0);
  const palette = [CHART_THEME.coral, CHART_THEME.amber, CHART_THEME.cobalt, CHART_THEME.purple, CHART_THEME.cyan];

  if (activeShares.length === 0 || totalDenied === 0) {
    // Zero Denials 100% Compliant State
    ctx.beginPath();
    ctx.arc(donutCenterX, donutCenterY, donutRadius, 0, Math.PI * 2);
    ctx.strokeStyle = CHART_THEME.mint;
    ctx.lineWidth = ringThickness;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CHART_THEME.mint;
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('100%', donutCenterX, donutCenterY - 16);
    ctx.fillStyle = CHART_THEME.slate700;
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ZERO REJECTIONS', donutCenterX, donutCenterY + 32);
  } else {
    // Draw Segmented Arcs
    let currentAngle = -Math.PI / 2;
    activeShares.forEach((share, idx) => {
      const sliceAngle = (Math.PI * 2 * (share.count / totalDenied));
      ctx.beginPath();
      ctx.arc(donutCenterX, donutCenterY, donutRadius, currentAngle, currentAngle + sliceAngle);
      ctx.strokeStyle = palette[idx % palette.length];
      ctx.lineWidth = ringThickness;
      ctx.lineCap = 'butt';
      ctx.stroke();
      currentAngle += sliceAngle;
    });

    // Center Badge
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CHART_THEME.slate900;
    ctx.font = 'bold 88px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(String(totalDenied), donutCenterX, donutCenterY - 20);

    const pillW = 220;
    const pillH = 44;
    const pillX = donutCenterX - pillW / 2;
    const pillY = donutCenterY + 48;
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 10, '#FFE4E6');

    ctx.fillStyle = '#BE123C';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('DENIAL AUDIT', donutCenterX, pillY + pillH / 2 + 1);
  }

  // Right Side Deficiency Meters
  const rightStartX = width * 0.42;
  const rightW = width - rightStartX - 50;
  const startY = 50;
  const availH = height - startY - 40;
  const rowCount = Math.max(1, denialShares.length);
  const rowH = availH / rowCount;

  denialShares.forEach((share, idx) => {
    const y = startY + idx * rowH;
    const centerY = y + rowH / 2;
    const color = palette[idx % palette.length];

    // Card Box
    drawRoundedRect(ctx, rightStartX, y + 6, rightW, rowH - 12, 14, CHART_THEME.slate50, CHART_THEME.slate200, 2);

    // Left Colored Pill
    drawRoundedRect(ctx, rightStartX, y + 6, 8, rowH - 12, 4, color);

    // Reason Label
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CHART_THEME.slate900;
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(share.label, rightStartX + 28, centerY - 18);

    // Share Text
    ctx.fillStyle = CHART_THEME.slate500;
    ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${share.count} denials (${share.percentage}%)`, rightStartX + 28, centerY + 20);

    // Meter Bar
    const meterX = rightStartX + rightW - 340;
    const meterW = 300;
    const meterH = 18;
    const meterY = centerY - meterH / 2;
    drawRoundedRect(ctx, meterX, meterY, meterW, meterH, 9, CHART_THEME.slate200);

    const fillW = Math.max(8, (meterW * share.percentage) / 100);
    if (share.count > 0) {
      drawRoundedRect(ctx, meterX, meterY, fillW, meterH, 9, color);
    }
  });

  return canvas.toDataURL('image/png');
};

/* ─────────────────────────────────────────────
   5. 10 Statutory Youth Development Pillars (Horizontal Capability Tracks)
───────────────────────────────────────────── */
export const renderYouthAccomplishmentTracks = (
  items: { label: string; submitted: number; approved: number; denied: number }[],
  width = 1600,
  height = 1050
): string => {
  const { canvas, ctx } = createHiDpiCanvas(width, height);

  ctx.fillStyle = CHART_THEME.white;
  ctx.fillRect(0, 0, width, height);

  const startY = 35;
  const availH = height - startY - 25;
  const rowCount = items.length;
  const rowH = availH / Math.max(1, rowCount);

  const labelW = 540;
  const barStartX = labelW + 40;
  const badgeW = 270;
  const barW = width - barStartX - badgeW - 50;

  items.forEach((item, idx) => {
    const y = startY + idx * rowH;
    const centerY = y + rowH / 2;

    if (idx % 2 === 0) {
      drawRoundedRect(ctx, 20, y + 4, width - 40, rowH - 8, 12, CHART_THEME.slate50);
    }

    // Label
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CHART_THEME.slate900;
    ctx.font = 'bold 27px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(item.label, 36, centerY);

    // Capability Bar
    const maxVal = Math.max(1, item.submitted, item.approved + item.denied);
    const trackH = 32;
    const trackY = centerY - trackH / 2;

    drawRoundedRect(ctx, barStartX, trackY, barW, trackH, 16, CHART_THEME.slate200);

    // Approved segment (Mint)
    const appW = (barW * (item.approved / maxVal));
    if (appW > 0) {
      drawRoundedRect(ctx, barStartX, trackY, appW, trackH, 16, CHART_THEME.mint);
    }

    // Denied segment (Coral)
    const denW = (barW * (item.denied / maxVal));
    if (denW > 0) {
      drawRoundedRect(ctx, barStartX + appW, trackY, denW, trackH, 16, CHART_THEME.coral);
    }

    // Badge
    const rate = Math.round((item.approved / Math.max(1, item.submitted)) * 100);
    const pillColor = rate > 0 ? '#DCFCE7' : '#F1F5F9';
    const pillTextColor = rate > 0 ? '#15803D' : '#64748B';
    const pillText = `${item.approved} Approved (${rate}%)`;

    const pillX = width - badgeW - 30;
    const pillY = centerY - 24;
    drawRoundedRect(ctx, pillX, pillY, badgeW, 48, 12, pillColor);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pillTextColor;
    ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(pillText, pillX + badgeW / 2, centerY);
  });

  return canvas.toDataURL('image/png');
};

/* ─────────────────────────────────────────────
   6. Approved Accomplishment Area Distribution Ring
───────────────────────────────────────────── */
export const renderAccomplishmentShareDonut = (
  approvalShares: { id: string; label: string; approved: number }[],
  width = 1600,
  height = 1050
): string => {
  const { canvas, ctx } = createHiDpiCanvas(width, height);

  ctx.fillStyle = CHART_THEME.white;
  ctx.fillRect(0, 0, width, height);

  const totalApproved = approvalShares.reduce((s, a) => s + a.approved, 0);
  const activeShares = approvalShares.filter((a) => a.approved > 0);

  const donutCenterX = width * 0.22;
  const donutCenterY = height * 0.5;
  const donutRadius = 240;
  const ringThickness = 48;

  const palette = [
    CHART_THEME.cobalt, CHART_THEME.mint, CHART_THEME.amber, CHART_THEME.purple,
    CHART_THEME.cyan, CHART_THEME.pink, CHART_THEME.coral, CHART_THEME.orange, '#14B8A6', '#64748B',
  ];

  if (activeShares.length === 0 || totalApproved === 0) {
    ctx.beginPath();
    ctx.arc(donutCenterX, donutCenterY, donutRadius, 0, Math.PI * 2);
    ctx.strokeStyle = CHART_THEME.slate200;
    ctx.lineWidth = ringThickness;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CHART_THEME.slate400;
    ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('NO FILINGS', donutCenterX, donutCenterY);
  } else {
    let currentAngle = -Math.PI / 2;
    activeShares.forEach((share, idx) => {
      const sliceAngle = (Math.PI * 2 * (share.approved / totalApproved));
      ctx.beginPath();
      ctx.arc(donutCenterX, donutCenterY, donutRadius, currentAngle, currentAngle + sliceAngle);
      ctx.strokeStyle = palette[idx % palette.length];
      ctx.lineWidth = ringThickness;
      ctx.stroke();
      currentAngle += sliceAngle;
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CHART_THEME.slate900;
    ctx.font = 'bold 92px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(String(totalApproved), donutCenterX, donutCenterY - 22);

    const pillW = 240;
    const pillH = 48;
    const pillX = donutCenterX - pillW / 2;
    const pillY = donutCenterY + 52;
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 12, '#DCFCE7');

    ctx.fillStyle = '#15803D';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('APPROVED', donutCenterX, pillY + pillH / 2 + 1);
  }

  // Right Side 2-Column Category Grid
  const rightStartX = width * 0.44;
  const colW = (width - rightStartX - 50) / 2;
  const rowCount = 5;
  const rowH = (height - 80) / rowCount;

  approvalShares.forEach((cat, idx) => {
    const col = Math.floor(idx / rowCount);
    const row = idx % rowCount;
    const x = rightStartX + col * colW;
    const y = 40 + row * rowH;
    const color = palette[idx % palette.length];

    drawRoundedRect(ctx, x, y + 4, colW - 16, rowH - 8, 14, CHART_THEME.slate50, CHART_THEME.slate200, 2);
    drawRoundedRect(ctx, x, y + 4, 8, rowH - 8, 4, color);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CHART_THEME.slate900;
    ctx.font = 'bold 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(cat.label, x + 24, y + rowH / 2);

    ctx.textAlign = 'right';
    ctx.fillStyle = cat.approved > 0 ? CHART_THEME.mint : CHART_THEME.slate400;
    ctx.font = 'bold 27px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${cat.approved} docs`, x + colW - 32, y + rowH / 2);
  });

  return canvas.toDataURL('image/png');
};

/* ─────────────────────────────────────────────
   7. Comparative Barangay Compliance League Leaderboard
───────────────────────────────────────────── */
export const renderBarangayRankingLeaderboard = (
  ranking: ComplianceData['barangayRanking'],
  width = 1700,
  height = 540
): string => {
  const { canvas, ctx } = createHiDpiCanvas(width, height);

  ctx.fillStyle = CHART_THEME.white;
  ctx.fillRect(0, 0, width, height);

  const topBarangays = [...ranking].sort((a, b) => b.rate - a.rate).slice(0, 8);
  const count = topBarangays.length;
  const cardW = (width - 40 - (count - 1) * 16) / Math.max(1, count);
  const cardH = height - 40;

  topBarangays.forEach((b, idx) => {
    const x = 20 + idx * (cardW + 16);
    const y = 20;

    const rankColor = idx === 0 ? '#FEF08A' : idx === 1 ? '#E2E8F0' : idx === 2 ? '#FED7AA' : '#F1F5F9';
    const rankTextColor = idx === 0 ? '#854D0E' : idx === 1 ? '#475569' : idx === 2 ? '#9A3412' : '#64748B';

    drawRoundedRect(ctx, x, y, cardW, cardH, 16, CHART_THEME.slate50, CHART_THEME.slate200, 2);

    // Top Accent Bar
    const statusColor = b.rate >= 80 ? CHART_THEME.mint : b.rate >= 50 ? CHART_THEME.amber : CHART_THEME.coral;
    drawRoundedRect(ctx, x, y, cardW, 8, 4, statusColor);

    // Rank Medal Badge
    const medalSize = 46;
    drawRoundedRect(ctx, x + 16, y + 20, medalSize, medalSize, 12, rankColor);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = rankTextColor;
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`#${idx + 1}`, x + 16 + medalSize / 2, y + 20 + medalSize / 2);

    // Barangay Name
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = CHART_THEME.slate900;
    ctx.font = 'bold 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(b.barangay, x + 16, y + 88);

    // Rate
    ctx.textAlign = 'left';
    ctx.fillStyle = statusColor;
    ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${b.rate}%`, x + 16, y + 140);

    // Approved / Expected Caption
    ctx.fillStyle = CHART_THEME.slate500;
    ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${b.approved} of ${b.expected} Approved`, x + 16, y + 210);

    // Mini Progress Capsule
    const progW = cardW - 32;
    const progH = 14;
    drawRoundedRect(ctx, x + 16, y + cardH - 36, progW, progH, 7, CHART_THEME.slate200);
    if (b.rate > 0) {
      const fillW = Math.max(8, (progW * b.rate) / 100);
      drawRoundedRect(ctx, x + 16, y + cardH - 36, fillW, progH, 7, statusColor);
    }
  });

  return canvas.toDataURL('image/png');
};
