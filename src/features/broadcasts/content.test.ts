import { describe, expect, it } from 'vitest';
import {
  BroadcastContentV1,
  broadcastContentSchema,
  createEmptyRichTextDocument,
  extractBroadcastPlainText,
} from './content';

const ids = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
];

function imagePath(index: number): string {
  return `temporary/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/${ids[index]}.jpg`;
}

describe('broadcast content schema', () => {
  it('accepts the supported text and image blocks', () => {
    const content: BroadcastContentV1 = {
      version: 1,
      blocks: [
        {
          id: ids[0],
          type: 'text',
          richText: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                attrs: { textAlign: 'center' },
                content: [
                  {
                    type: 'text',
                    text: 'Visite o colégio',
                    marks: [
                      { type: 'bold' },
                      {
                        type: 'link',
                        attrs: { href: 'https://example.com' },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
        {
          id: ids[1],
          type: 'imageText',
          imagePosition: 'left',
          image: {
            path: imagePath(1),
            alt: 'Aluno utilizando o novo bebedouro',
            caption: 'Melhorias realizadas com as doações.',
          },
          richText: createEmptyRichTextDocument(),
        },
      ],
    };

    expect(broadcastContentSchema.safeParse(content).success).toBe(true);
  });

  it('rejects unsafe link protocols', () => {
    const result = broadcastContentSchema.safeParse({
      version: 1,
      blocks: [
        {
          id: ids[0],
          type: 'text',
          richText: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Clique',
                    marks: [
                      {
                        type: 'link',
                        attrs: { href: 'javascript:alert(1)' },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/link/i);
    }
  });

  it('rejects more than five images', () => {
    const result = broadcastContentSchema.safeParse({
      version: 1,
      blocks: ids.map((id, index) => ({
        id,
        type: 'image',
        image: {
          path: imagePath(index),
          alt: `Descrição da imagem ${index + 1}`,
        },
      })),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => /5 imagens/.test(issue.message))).toBe(
        true
      );
    }
  });

  it('rejects paths outside the broadcast image prefixes', () => {
    const result = broadcastContentSchema.safeParse({
      version: 1,
      blocks: [
        {
          id: ids[0],
          type: 'image',
          image: {
            path: 'product-photos/private.jpg',
            alt: 'Descrição válida da imagem',
          },
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('extracts a stable plain-text summary for history and fallback email', () => {
    const content: BroadcastContentV1 = {
      version: 1,
      blocks: [
        {
          id: ids[0],
          type: 'text',
          richText: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Primeiro parágrafo.' }],
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Segundo parágrafo.' }],
              },
            ],
          },
        },
        {
          id: ids[1],
          type: 'image',
          image: {
            path: imagePath(1),
            alt: 'Descrição acessível',
            caption: 'Legenda da foto.',
          },
        },
      ],
    };

    expect(extractBroadcastPlainText(content)).toBe(
      'Primeiro parágrafo.\nSegundo parágrafo.\n\nLegenda da foto.'
    );
  });
});

