type VerificationEmailInput = {
  verifyUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

export function buildVerificationEmail({ verifyUrl }: VerificationEmailInput) {
  const subject = "Verify your HyperOptimal account";
  const safeVerifyUrl = escapeHtml(verifyUrl);
  const text = [
    "Verify your HyperOptimal account.",
    "",
    verifyUrl,
    "",
    "If you did not create this account, you can ignore this email.",
  ].join("\n");

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#eef4ff;color:#111827;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef4ff;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe3ef;border-radius:16px;padding:32px;box-shadow:0 18px 42px rgba(31,54,94,0.12);">
            <tr>
              <td>
                <p style="margin:0 0 12px;color:#2563eb;font-size:14px;font-weight:700;">HyperOptimal</p>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#111827;">Verify your account</h1>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#64748b;">Click the secure link below to finish creating your account.</p>
                <p style="margin:0 0 28px;">
                  <a href="${safeVerifyUrl}" style="display:inline-block;background:#1f5bff;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-weight:700;">Verify Email</a>
                </p>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#8a94a6;">If the button does not open, paste this link into your browser:</p>
                <p style="margin:0 0 20px;font-size:13px;line-height:1.6;word-break:break-all;color:#475569;">${safeVerifyUrl}</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#8a94a6;">If you did not create this account, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();

  return { subject, text, html };
}
