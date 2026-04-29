const REPLY_EMAIL = 'colegiosaojose.acipec@gmail.com';

function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface RenderEmailOptions {
  subject: string;
  bodyText: string;
}

export function renderEmailHtml({ subject, bodyText }: RenderEmailOptions): string {
  const logoUrl = `${getSiteUrl()}/logo.png`;
  const safeSubject = escapeHtml(subject);
  const safeBody = escapeHtml(bodyText);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;padding:0;background:#F5F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F5F2EA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E5DFD4;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#1E3D59;padding:24px;text-align:center;">
                <img src="${logoUrl}" alt="Colégio São José" width="72" height="72" style="display:inline-block;border:0;outline:none;text-decoration:none;height:72px;width:72px;object-fit:contain;" />
                <div style="margin-top:10px;color:#FAF8F5;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Colégio São José</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 16px 0;color:#1E3D59;font-size:22px;line-height:1.3;font-weight:600;font-family:Georgia,'Times New Roman',serif;">${safeSubject}</h1>
                <div style="color:#3D4F5F;font-size:16px;line-height:1.65;white-space:pre-wrap;">${safeBody}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <div style="border-top:1px solid #E5DFD4;padding-top:16px;color:#9B7B5A;font-size:13px;line-height:1.55;">
                  Este email foi enviado de uma caixa de saída automática e <strong>não pode ser respondido</strong>.<br />
                  Para entrar em contato com o colégio, escreva para
                  <a href="mailto:${REPLY_EMAIL}" style="color:#1E3D59;text-decoration:underline;">${REPLY_EMAIL}</a>.
                </div>
              </td>
            </tr>
          </table>
          <div style="max-width:600px;margin:16px auto 0 auto;color:#9B7B5A;font-size:12px;text-align:center;">
            © ${new Date().getFullYear()} Colégio São José — Fraternidade Sacerdotal São Pio X
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
