const APP_NAME = 'Compliance Readiness';

function baseTemplate(title: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#0f172a;padding:24px 32px;">
            <span style="color:#fff;font-size:18px;font-weight:bold;">${APP_NAME}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${bodyHtml}
            ${
              ctaUrl && ctaLabel
                ? `<p style="margin-top:24px;">
                    <a href="${ctaUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;">${ctaLabel}</a>
                  </p>`
                : ''
            }
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#6b7280;">
              You received this because you are a member of a ${APP_NAME} workspace.
              To manage your notification preferences, visit your account settings.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`.trim();
}

export function controlRegressionTemplate(payload: {
  controlTitle: string;
  controlId: string;
  workspaceName: string;
  workspaceUrl: string;
}): { subject: string; html: string } {
  const subject = `[Action required] Control regression: ${payload.controlTitle}`;
  const html = baseTemplate(
    subject,
    `
    <h2 style="margin-top:0;color:#0f172a;">Control Regression Detected</h2>
    <p style="color:#374151;">A compliance control has changed status from <strong style="color:#16a34a;">PASS</strong> to <strong style="color:#dc2626;">FAIL</strong> in workspace <strong>${payload.workspaceName}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Control</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;">${payload.controlTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Control ID</td><td style="padding:8px 0;font-size:14px;">${payload.controlId}</td></tr>
    </table>
    <p style="color:#374151;margin-top:16px;">Please investigate and remediate this finding promptly to maintain your compliance posture.</p>
    `,
    payload.workspaceUrl,
    'View in Dashboard',
  );
  return { subject, html };
}

export function connectorFailureTemplate(payload: {
  connectorType: string;
  workspaceName: string;
  errorMessage: string;
  workspaceUrl: string;
}): { subject: string; html: string } {
  const subject = `Connector sync failed: ${payload.connectorType}`;
  const html = baseTemplate(
    subject,
    `
    <h2 style="margin-top:0;color:#0f172a;">Connector Sync Failed</h2>
    <p style="color:#374151;">The <strong>${payload.connectorType}</strong> connector in workspace <strong>${payload.workspaceName}</strong> failed to sync.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px;margin-top:16px;">
      <p style="margin:0;color:#991b1b;font-size:14px;font-family:monospace;">${payload.errorMessage}</p>
    </div>
    <p style="color:#374151;margin-top:16px;">Check your connector configuration and credentials. Evidence data may be stale until the connector resumes successfully.</p>
    `,
    payload.workspaceUrl,
    'Check Connectors',
  );
  return { subject, html };
}

export function accessReviewAssignedTemplate(payload: {
  campaignName: string;
  workspaceName: string;
  dueDate: string;
  campaignUrl: string;
}): { subject: string; html: string } {
  const subject = `Access review assigned: ${payload.campaignName}`;
  const html = baseTemplate(
    subject,
    `
    <h2 style="margin-top:0;color:#0f172a;">You Have an Access Review to Complete</h2>
    <p style="color:#374151;">An access review campaign has been created in workspace <strong>${payload.workspaceName}</strong> and requires your attention.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Campaign</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;">${payload.campaignName}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Due Date</td><td style="padding:8px 0;font-size:14px;">${payload.dueDate}</td></tr>
    </table>
    <p style="color:#374151;margin-top:16px;">Please review all assigned user accounts and confirm or revoke their access before the due date.</p>
    `,
    payload.campaignUrl,
    'Start Review',
  );
  return { subject, html };
}

export function accessReviewDueTemplate(payload: {
  campaignName: string;
  workspaceName: string;
  dueDate: string;
  pendingCount: number;
  campaignUrl: string;
}): { subject: string; html: string } {
  const subject = `[Reminder] Access review due soon: ${payload.campaignName}`;
  const html = baseTemplate(
    subject,
    `
    <h2 style="margin-top:0;color:#0f172a;">Access Review Due Soon</h2>
    <p style="color:#374151;">The access review campaign <strong>${payload.campaignName}</strong> in workspace <strong>${payload.workspaceName}</strong> is due on <strong>${payload.dueDate}</strong>.</p>
    <p style="color:#374151;">There are <strong>${payload.pendingCount} items</strong> still awaiting review.</p>
    `,
    payload.campaignUrl,
    'Complete Review',
  );
  return { subject, html };
}
