import { z } from 'zod';

export const BROADCAST_CONTENT_VERSION = 1 as const;
export const BROADCAST_MAX_BLOCKS = 20;
export const BROADCAST_MAX_IMAGES = 5;
export const BROADCAST_MAX_TEXT_LENGTH = 5000;
export const BROADCAST_SIGNATURE_MAX_LENGTH = 300;
export const DEFAULT_BROADCAST_SIGNATURE = 'Nos Corações de Jesus e Maria,';

export type RichTextAlignment = 'left' | 'center' | 'right';

export interface RichTextMark {
  type: 'bold' | 'italic' | 'link';
  attrs?: {
    href?: string;
    target?: string | null;
    rel?: string | null;
    class?: string | null;
  };
}

export interface RichTextNode {
  type:
    | 'doc'
    | 'paragraph'
    | 'text'
    | 'bulletList'
    | 'orderedList'
    | 'listItem'
    | 'hardBreak';
  attrs?: {
    textAlign?: RichTextAlignment | null;
    start?: number | null;
    type?: '1' | 'a' | 'A' | 'i' | 'I' | null;
  };
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
}

export interface RichTextDocument extends RichTextNode {
  type: 'doc';
}

export interface BroadcastImage {
  path: string;
  alt: string;
  caption?: string;
}

export type BroadcastBlock =
  | {
      id: string;
      type: 'text';
      richText: RichTextDocument;
    }
  | {
      id: string;
      type: 'image';
      image: BroadcastImage;
    }
  | {
      id: string;
      type: 'imageText';
      imagePosition: 'left' | 'right';
      image: BroadcastImage;
      richText: RichTextDocument;
    };

export interface BroadcastContentV1 {
  version: typeof BROADCAST_CONTENT_VERSION;
  blocks: BroadcastBlock[];
}

export interface BroadcastDraftState {
  composerId: string;
  subject: string;
  senderName: string;
  signatureText: string;
  bccEmail: string;
  testEmail: string;
  content: BroadcastContentV1;
}

export interface BroadcastDraftSnapshot extends BroadcastDraftState {
  updatedAt: string;
}

const ALLOWED_NODE_TYPES = new Set<RichTextNode['type']>([
  'doc',
  'paragraph',
  'text',
  'bulletList',
  'orderedList',
  'listItem',
  'hardBreak',
]);
const ALLOWED_MARK_TYPES = new Set<RichTextMark['type']>([
  'bold',
  'italic',
  'link',
]);
const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const IMAGE_PATH_PATTERN =
  /^(temporary|broadcasts)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/i;

export function isAllowedBroadcastLink(value: string): boolean {
  try {
    const url = new URL(value);
    return ALLOWED_LINK_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * TipTap/ProseMirror emits `attrs` via `Object.create(null)`. Next.js Server
 * Actions cannot serialize null-prototype objects in production — they become
 * the placeholder string `"$T"`. Always convert editor JSON before storing it
 * in React state or sending it across the server-action boundary.
 */
export function toPlainJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function validateRichTextNode(
  value: unknown,
  issues: string[],
  depth = 0
): value is RichTextNode {
  if (depth > 20) {
    issues.push('O texto possui níveis de formatação demais.');
    return false;
  }
  if (!isPlainRecord(value) || typeof value.type !== 'string') {
    issues.push('O conteúdo formatado é inválido.');
    return false;
  }
  if (!ALLOWED_NODE_TYPES.has(value.type as RichTextNode['type'])) {
    issues.push(`O tipo de conteúdo "${value.type}" não é permitido.`);
    return false;
  }

  const type = value.type as RichTextNode['type'];
  if (type === 'text') {
    if (typeof value.text !== 'string') {
      issues.push('Um trecho de texto está vazio ou inválido.');
      return false;
    }
    if (value.content !== undefined) {
      issues.push('Um trecho de texto não pode conter outros blocos.');
      return false;
    }
  } else if (
    value.text !== undefined ||
    (value.content !== undefined && !Array.isArray(value.content))
  ) {
    issues.push('A estrutura do conteúdo formatado é inválida.');
    return false;
  }

  // Attrs may be omitted, null, a plain object, or (if a null-prototype TipTap
  // object crossed a Server Action) the Flight placeholder "$T". The sanitizer
  // only reads an allowlisted plain-object shape, so non-objects are ignored.

  if (value.marks !== undefined) {
    if (!Array.isArray(value.marks)) {
      issues.push('A formatação do texto é inválida.');
      return false;
    }
    for (const mark of value.marks) {
      if (
        !isPlainRecord(mark) ||
        typeof mark.type !== 'string' ||
        !ALLOWED_MARK_TYPES.has(mark.type as RichTextMark['type'])
      ) {
        issues.push('Uma formatação de texto não é permitida.');
        return false;
      }
      if (mark.type === 'link') {
        if (
          !isPlainRecord(mark.attrs) ||
          typeof mark.attrs.href !== 'string' ||
          !isAllowedBroadcastLink(mark.attrs.href)
        ) {
          issues.push('Um dos links informados não é seguro ou válido.');
          return false;
        }
      }
    }
  }

  if (Array.isArray(value.content)) {
    for (const child of value.content) {
      if (!validateRichTextNode(child, issues, depth + 1)) return false;
    }
  }

  return true;
}

function sanitizeRichTextNode(node: RichTextNode): RichTextNode {
  const sanitized: RichTextNode = { type: node.type };
  const sourceAttrs = isPlainRecord(node.attrs) ? node.attrs : undefined;

  if (node.type === 'text') {
    sanitized.text = node.text ?? '';
  }

  if (node.type === 'paragraph') {
    const textAlign = sourceAttrs?.textAlign;
    if (
      textAlign === 'left' ||
      textAlign === 'center' ||
      textAlign === 'right'
    ) {
      sanitized.attrs = { textAlign };
    }
  }

  if (node.type === 'orderedList') {
    const attrs: NonNullable<RichTextNode['attrs']> = {};
    if (
      typeof sourceAttrs?.start === 'number' &&
      Number.isInteger(sourceAttrs.start) &&
      sourceAttrs.start >= 1 &&
      sourceAttrs.start <= 9999
    ) {
      attrs.start = sourceAttrs.start;
    }
    if (
      sourceAttrs?.type === '1' ||
      sourceAttrs?.type === 'a' ||
      sourceAttrs?.type === 'A' ||
      sourceAttrs?.type === 'i' ||
      sourceAttrs?.type === 'I'
    ) {
      attrs.type = sourceAttrs.type;
    }
    if (Object.keys(attrs).length > 0) sanitized.attrs = attrs;
  }

  if (node.marks) {
    sanitized.marks = node.marks.map((mark) => {
      if (mark.type === 'link') {
        return {
          type: 'link',
          attrs: {
            href: isPlainRecord(mark.attrs)
              ? (mark.attrs.href as string | undefined)
              : undefined,
          },
        };
      }
      return { type: mark.type };
    });
  }

  if (node.content) {
    sanitized.content = node.content.map(sanitizeRichTextNode);
  }

  return sanitized;
}

const richTextDocumentSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    const issues: string[] = [];
    if (!validateRichTextNode(value, issues) || value.type !== 'doc') {
      for (const message of issues.length
        ? issues
        : ['O documento de texto é inválido.']) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      }
    }
  })
  .transform(
    (value) => sanitizeRichTextNode(value as RichTextNode) as RichTextDocument
  );

const broadcastImageSchema = z.object({
  path: z
    .string()
    .regex(IMAGE_PATH_PATTERN, 'O caminho da imagem não é permitido.'),
  alt: z
    .string()
    .trim()
    .min(3, 'Descreva a imagem para quem não consegue visualizá-la.')
    .max(180, 'A descrição da imagem deve ter no máximo 180 caracteres.'),
  caption: z
    .string()
    .trim()
    .max(200, 'A legenda deve ter no máximo 200 caracteres.')
    .optional(),
});

const broadcastBlockSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().uuid(),
    type: z.literal('text'),
    richText: richTextDocumentSchema,
  }),
  z.object({
    id: z.string().uuid(),
    type: z.literal('image'),
    image: broadcastImageSchema,
  }),
  z.object({
    id: z.string().uuid(),
    type: z.literal('imageText'),
    imagePosition: z.enum(['left', 'right']),
    image: broadcastImageSchema,
    richText: richTextDocumentSchema,
  }),
]);

const broadcastContentBaseSchema = z.object({
  version: z.literal(BROADCAST_CONTENT_VERSION),
  blocks: z
    .array(broadcastBlockSchema)
    .min(1, 'Adicione pelo menos um bloco ao comunicado.')
    .max(
      BROADCAST_MAX_BLOCKS,
      `O comunicado pode ter no máximo ${BROADCAST_MAX_BLOCKS} blocos.`
    ),
});

function validateBroadcastContent(
  content: BroadcastContentV1,
  ctx: z.RefinementCtx,
  requireMessage: boolean
) {
  const imageCount = content.blocks.filter(
    (block) => block.type === 'image' || block.type === 'imageText'
  ).length;
  if (imageCount > BROADCAST_MAX_IMAGES) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `O comunicado pode ter no máximo ${BROADCAST_MAX_IMAGES} imagens.`,
      path: ['blocks'],
    });
  }

  const text = extractBroadcastPlainText(content);
  if (text.length > BROADCAST_MAX_TEXT_LENGTH) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `O texto deve ter no máximo ${BROADCAST_MAX_TEXT_LENGTH} caracteres.`,
      path: ['blocks'],
    });
  }

  if (
    requireMessage &&
    text.trim().length === 0 &&
    content.blocks.every((block) => block.type === 'text')
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Escreva uma mensagem ou adicione uma imagem.',
      path: ['blocks'],
    });
  }
}

export const broadcastDraftContentSchema =
  broadcastContentBaseSchema.superRefine((content, ctx) =>
    validateBroadcastContent(content, ctx, false)
  );

export const broadcastContentSchema = broadcastContentBaseSchema.superRefine(
  (content, ctx) => validateBroadcastContent(content, ctx, true)
);

export function createEmptyRichTextDocument(): RichTextDocument {
  return {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  };
}

export function extractRichTextPlainText(node: RichTextNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  const value = (node.content ?? [])
    .map((child) => extractRichTextPlainText(child))
    .join('');
  if (
    node.type === 'paragraph' ||
    node.type === 'listItem' ||
    node.type === 'bulletList' ||
    node.type === 'orderedList'
  ) {
    return `${value}\n`;
  }
  return value;
}

export function extractBroadcastPlainText(
  content: Pick<BroadcastContentV1, 'blocks'>
): string {
  return content.blocks
    .flatMap((block) => {
      if (block.type === 'text') {
        return [extractRichTextPlainText(block.richText)];
      }
      if (block.type === 'imageText') {
        return [
          extractRichTextPlainText(block.richText),
          block.image.caption ?? '',
        ];
      }
      return [block.image.caption ?? ''];
    })
    .map((value) => value.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export function countBroadcastImages(content: BroadcastContentV1): number {
  return content.blocks.filter(
    (block) => block.type === 'image' || block.type === 'imageText'
  ).length;
}

export function extractBroadcastImagePaths(
  content: Pick<BroadcastContentV1, 'blocks'>
): string[] {
  return Array.from(
    new Set(
      content.blocks.flatMap((block) =>
        block.type === 'text' ? [] : [block.image.path]
      )
    )
  );
}
