type PasswordResetEmailInput = {
  resetUrl: string;
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

export function buildPasswordResetEmail({ resetUrl }: PasswordResetEmailInput) {
  const subject = "Reset your HyperOptimal password";
  const safeResetUrl = escapeHtml(resetUrl);
  const text = [
    "Use this link to reset your HyperOptimal password.",
    "",
    resetUrl,
    "",
    "If you did not request a password reset, you can ignore this email.",
  ].join("\n");

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#f8f4ee;color:#2b2118;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f4ee;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf9;border:1px solid #eadfd3;border-radius:8px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 12px;color:#2563eb;font-size:14px;font-weight:700;">HyperOptimal</p>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#2b2118;">Reset your password</h1>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#6f6358;">Use this secure link to choose a new password.</p>
                <p style="margin:0 0 28px;">
                  <a href="${safeResetUrl}" style="display:inline-block;background:#1f5bff;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-weight:700;">Reset password</a>
                </p>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#8a7f73;">If the button does not open, paste this link into your browser:</p>
                <p style="margin:0 0 20px;font-size:13px;line-height:1.6;word-break:break-all;color:#4b5563;">${safeResetUrl}</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#8a7f73;">If you did not request a password reset, you can ignore this email.</p>
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
