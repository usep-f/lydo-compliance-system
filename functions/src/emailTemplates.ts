/**
 * Centralized email template builder for the LYDO Compliance System.
 * Generates email-client compatible, responsive HTML layouts with institutional branding.
 */

export type AlertVariant = 'success' | 'danger' | 'warning' | 'info';

export interface AlertBoxConfig {
  variant: AlertVariant;
  title?: string;
  message: string;
}

export interface DetailItem {
  label: string;
  value: string;
}

export interface EmailLayoutParams {
  headerSubtitle?: string;
  recipientName?: string;
  bodyHtml: string;
  alertBox?: AlertBoxConfig;
  detailsTable?: DetailItem[];
  otpCode?: {
    code: string;
    validityMinutes?: number;
  };
  footerNote?: string;
}

const ALERT_STYLES: Record<AlertVariant, { bg: string; border: string; text: string; title: string }> = {
  success: { bg: '#f0fdf4', border: '#16a34a', text: '#14532d', title: '#166534' },
  danger: { bg: '#fef2f2', border: '#ef4444', text: '#7f1d1d', title: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#f59e0b', text: '#78350f', title: '#92400e' },
  info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a', title: '#1e40af' },
};

/**
 * Renders a color-coded callout alert box.
 */
export function renderAlertBox(config: AlertBoxConfig): string {
  const style = ALERT_STYLES[config.variant] || ALERT_STYLES.info;
  const titleHtml = config.title
    ? `<div style="font-weight: 700; margin-bottom: 6px; color: ${style.title}; font-size: 14px;">${config.title}</div>`
    : '';

  return `
    <div style="background-color: ${style.bg}; border-left: 4px solid ${style.border}; border-radius: 6px; padding: 14px 18px; margin: 20px 0; font-size: 14px; line-height: 1.5; color: ${style.text};">
      ${titleHtml}
      <div style="margin: 0;">${config.message}</div>
    </div>
  `;
}

/**
 * Renders a 2-column key-value data table for schedules or document details.
 */
export function renderDetailsTable(items: DetailItem[]): string {
  if (!items || items.length === 0) return '';
  const rowsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 7px 10px; color: #475569; width: 35%; font-weight: 600; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${item.label}</td>
        <td style="padding: 7px 10px; color: #0f172a; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${item.value}</td>
      </tr>`
    )
    .join('');

  return `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 12px; margin: 18px 0;">
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Renders a high-contrast OTP verification code block.
 */
export function renderOtpBlock(code: string, validityMinutes = 5): string {
  return `
    <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 22px 16px; margin: 24px 0; text-align: center;">
      <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
        Verification Code
      </div>
      <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #003b6d; font-family: 'Courier New', Courier, monospace; margin: 6px 0;">
        ${code}
      </div>
      <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
        Valid for <strong>${validityMinutes} minutes</strong>. Never share this code with anyone.
      </div>
    </div>
  `;
}

/**
 * Renders the full institutional email HTML layout.
 */
export function renderEmailLayout(params: EmailLayoutParams): string {
  const subtitle = params.headerSubtitle || 'Compliance & Management System';
  const salutation = params.recipientName
    ? `<p style="font-size: 15px; margin: 0 0 16px 0; color: #0f172a;">Dear <strong>${params.recipientName}</strong>,</p>`
    : '';
  const alertHtml = params.alertBox ? renderAlertBox(params.alertBox) : '';
  const tableHtml = params.detailsTable ? renderDetailsTable(params.detailsTable) : '';
  const otpHtml = params.otpCode ? renderOtpBlock(params.otpCode.code, params.otpCode.validityMinutes) : '';
  const footerText =
    params.footerNote ||
    'This is an automated institutional notification from the Lucena Youth Development Office (LYDO) Compliance System.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LYDO Notification</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header Banner with Logo -->
    <div style="background: linear-gradient(135deg, #001b2e 0%, #003b6d 100%); color: #ffffff; padding: 26px 20px; text-align: center;">
      <div style="display: inline-block; background-color: #ffffff; border-radius: 50%; padding: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); margin-bottom: 10px;">
        <img src="https://lydo-compliance-system-ce8c3.firebaseapp.com/lydo-logo.png" alt="LYDO Logo" width="50" height="50" style="display: block; border-radius: 50%;" />
      </div>
      <h1 style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff;">LUCENA YOUTH DEVELOPMENT OFFICE</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #93c5fd; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${subtitle}</p>
    </div>

    <!-- Main Content Area -->
    <div style="padding: 28px 24px;">
      ${salutation}
      <div style="font-size: 14px; color: #334155; line-height: 1.6;">
        ${params.bodyHtml}
      </div>
      ${alertHtml}
      ${tableHtml}
      ${otpHtml}
    </div>

    <!-- Official Footer -->
    <div style="background-color: #f1f5f9; padding: 16px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5;">
      <p style="margin: 0 0 4px 0;">${footerText}</p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">Please do not reply directly to this automated email.</p>
    </div>

  </div>
</body>
</html>`;
}
