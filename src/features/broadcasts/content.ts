import { z } from 'zod';

export const BROADCAST_CONTENT_VERSION = 1 as const;
export const BROADCAST_MAX_BLOCKS = 20;
export const BROADCAST_MAX_IMAGES = 5;
export const BROADCAST_MAX_TEXT_LENGTH = 5000;

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

  if (value.attrs !== undefined) {
    if (!isPlainRecord(value.attrs)) {
      issues.push('Os atributos do texto são inválidos.');
      return false;
    }
    const keys = Object.keys(value.attrs);
    if (
      keys.some((key) => key !== 'textAlign') ||
      (value.attrs.textAlign !== undefined &&
        value.attrs.textAlign !== null &&
        !['left', 'center', 'right'].includes(String(value.attrs.textAlign)))
    ) {
      issues.push('O alinhamento do texto é inválido.');
      return false;
    }
  }

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
  .transform((value) => value as RichTextDocument);

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

export const broadcastContentSchema = z
  .object({
    version: z.literal(BROADCAST_CONTENT_VERSION),
    blocks: z
      .array(broadcastBlockSchema)
      .min(1, 'Adicione pelo menos um bloco ao comunicado.')
      .max(
        BROADCAST_MAX_BLOCKS,
        `O comunicado pode ter no máximo ${BROADCAST_MAX_BLOCKS} blocos.`
      ),
  })
  .superRefine((content, ctx) => {
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
      text.trim().length === 0 &&
      content.blocks.every((block) => block.type === 'text')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escreva uma mensagem ou adicione uma imagem.',
        path: ['blocks'],
      });
    }
  });

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

