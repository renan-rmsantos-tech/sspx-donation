import {
  BroadcastContentV1,
  RichTextMark,
  RichTextNode,
  extractBroadcastPlainText,
  isAllowedBroadcastLink,
} from './content';
import { getPublicUrl } from '@/lib/storage/public-url';

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

function renderMarks(value: string, marks: RichTextMark[] = []): string {
  return marks.reduce((html, mark) => {
    if (mark.type === 'bold') return `<strong>${html}</strong>`;
    if (mark.type === 'italic') return `<em>${html}</em>`;
    if (
      mark.type === 'link' &&
      mark.attrs?.href &&
      isAllowedBroadcastLink(mark.attrs.href)
    ) {
      const href = escapeHtml(mark.attrs.href);
      return `<a href="${href}" style="color:#1E5A7A;text-decoration:underline;">${html}</a>`;
    }
    return html;
  }, value);
}

function renderRichTextNode(node: RichTextNode): string {
  if (node.type === 'text') {
    return renderMarks(escapeHtml(node.text ?? ''), node.marks);
  }
  if (node.type === 'hardBreak') return '<br />';

  const children = (node.content ?? []).map(renderRichTextNode).join('');
  if (node.type === 'doc') return children;
  if (node.type === 'paragraph') {
    const alignment = node.attrs?.textAlign ?? 'left';
    return `<p style="margin:0 0 14px;text-align:${alignment};">${children || '&nbsp;'}</p>`;
  }
  if (node.type === 'bulletList') {
    return `<ul style="margin:0 0 14px;padding-left:24px;">${children}</ul>`;
  }
  if (node.type === 'orderedList') {
    const start =
      typeof node.attrs?.start === 'number' && node.attrs.start !== 1
        ? ` start="${node.attrs.start}"`
        : '';
    const type =
      node.attrs?.type && ['1', 'a', 'A', 'i', 'I'].includes(node.attrs.type)
        ? ` type="${node.attrs.type}"`
        : '';
    return `<ol${start}${type} style="margin:0 0 14px;padding-left:24px;">${children}</ol>`;
  }
  if (node.type === 'listItem') {
    return `<li style="margin:0 0 6px;">${children}</li>`;
  }
  return '';
}

function renderCaption(caption?: string): string {
  if (!caption) return '';
  return `<div style="margin-top:8px;color:#6F6257;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.45;text-align:center;">${escapeHtml(caption)}</div>`;
}

function renderImage(path: string, alt: string, caption?: string): string {
  const url = getPublicUrl('broadcast-images', path);
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;outline:none;text-decoration:none;" />${renderCaption(caption)}`;
}

function renderBlock(block: BroadcastContentV1['blocks'][number]): string {
  if (block.type === 'text') {
    return `<tr><td class="letter-padding" style="padding:4px 32px 10px;color:#23201D;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.58;">${renderRichTextNode(block.richText)}</td></tr>`;
  }
  if (block.type === 'image') {
    return `<tr><td class="letter-padding" style="padding:8px 32px 24px;">${renderImage(block.image.path, block.image.alt, block.image.caption)}</td></tr>`;
  }

  const imageCell = `<td class="stack-column" width="44%" valign="top" style="width:44%;padding:0 12px 0 0;">${renderImage(block.image.path, block.image.alt, block.image.caption)}</td>`;
  const textCell = `<td class="stack-column stack-text" width="56%" valign="top" style="width:56%;padding:0 0 0 12px;color:#23201D;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.58;">${renderRichTextNode(block.richText)}</td>`;

  return `<tr><td class="letter-padding" style="padding:8px 32px 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>${block.imagePosition === 'left' ? `${imageCell}${textCell}` : `${textCell}${imageCell}`}</tr></table></td></tr>`;
}

function formatLetterDate(value: Date): string {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(value);
  return `Itatiba, ${formatted}`;
}

interface RenderBroadcastEmailOptions {
  subject: string;
  content: BroadcastContentV1;
  senderName: string;
  date?: Date;
}

export function renderBroadcastEmailHtml({
  subject,
  content,
  senderName,
  date = new Date(),
}: RenderBroadcastEmailOptions): string {
  const safeSubject = escapeHtml(subject);
  const safeSender = escapeHtml(senderName.trim());
  const logoUrl = `${getSiteUrl()}/logo.png`;
  const blocks = content.blocks.map(renderBlock).join('');

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeSubject}</title>
    <style>
      @media only screen and (max-width:620px) {
        .email-shell { width:100% !important; }
        .letter-padding { padding-left:20px !important; padding-right:20px !important; }
        .stack-column { display:block !important; width:100% !important; padding-left:0 !important; padding-right:0 !important; }
        .stack-text { padding-top:16px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#F0EBE3;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#F0EBE3;padding:24px 12px;">
      <tr>
        <td align="center">
          <table class="email-shell" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #D4C4A8;">
            <tr>
              <td align="center" style="padding:28px 32px 8px;">
                <img src="${escapeHtml(logoUrl)}" alt="Colégio São José" width="52" height="52" style="display:block;width:52px;height:52px;border:0;object-fit:contain;" />
                <div style="margin-top:8px;color:#1E3D59;font-family:Georgia,'Times New Roman',serif;font-size:14px;font-weight:bold;">Colégio São José</div>
              </td>
            </tr>
            <tr>
              <td class="letter-padding" align="right" style="padding:12px 32px 24px;color:#3D4F5F;font-family:Georgia,'Times New Roman',serif;font-size:14px;">
                ${escapeHtml(formatLetterDate(date))}
              </td>
            </tr>
            ${blocks}
            <tr>
              <td class="letter-padding" style="padding:8px 32px 28px;color:#23201D;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;">
                <div style="padding-top:16px;border-top:1px solid #E5DFD4;">
                  Nos Corações de Jesus e Maria,<br />
                  <strong>${safeSender}</strong>
                </div>
              </td>
            </tr>
            <tr>
              <td class="letter-padding" style="padding:20px 32px 28px;background:#F8F6F1;color:#6F6257;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.55;">
                Este email foi enviado de uma caixa de saída automática e <strong>não pode ser respondido</strong>.<br />
                Para entrar em contato com o colégio, escreva para
                <a href="mailto:${REPLY_EMAIL}" style="color:#1E3D59;text-decoration:underline;">${REPLY_EMAIL}</a>.
              </td>
            </tr>
          </table>
          <div style="max-width:600px;margin:14px auto 0;color:#7D6D5D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;text-align:center;">
            © ${date.getFullYear()} Colégio São José — Fraternidade Sacerdotal São Pio X
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderBroadcastEmailText(
  content: BroadcastContentV1,
  senderName: string,
  date = new Date()
): string {
  const body = extractBroadcastPlainText(content);
  return `${formatLetterDate(date)}\n\n${body}\n\nNos Corações de Jesus e Maria,\n${senderName.trim()}\n\nPara entrar em contato: ${REPLY_EMAIL}`;
}
