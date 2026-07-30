import { beforeEach, describe, expect, it } from 'vitest';
import type { BroadcastContentV1 } from './content';
import {
  renderBroadcastEmailHtml,
  renderBroadcastEmailText,
} from './email';

const content: BroadcastContentV1 = {
  version: 1,
  blocks: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      type: 'text',
      richText: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Estimados ' },
              {
                type: 'text',
                text: 'benfeitores',
                marks: [{ type: 'bold' }],
              },
              { type: 'text', text: ' do Colégio São José.' },
            ],
          },
        ],
      },
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      type: 'imageText',
      imagePosition: 'left',
      image: {
        path:
          'temporary/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg',
        alt: 'Aluno no trator & ajudando',
        caption: 'Novo equipamento',
      },
      richText: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: 'right' },
            content: [
              {
                type: 'text',
                text: 'Conheça o projeto',
                marks: [
                  {
                    type: 'link',
                    attrs: { href: 'https://example.com/projeto' },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};

describe('broadcast email renderer', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL =
      'https://ajude-o-colegio-sao-jose.com';
    process.env.NEXT_PUBLIC_SPACES_BROADCAST_IMAGES_URL =
      'https://broadcast-images.nyc3.digitaloceanspaces.com';
  });

  it('renders the editorial letter shell and responsive image layout', () => {
    const html = renderBroadcastEmailHtml({
      subject: 'Agradecimento',
      content,
      senderName: 'Pe. João Maria',
      date: new Date('2026-07-29T15:00:00-03:00'),
    });

    expect(html).toContain('<title>Agradecimento</title>');
    expect(html).toContain('Itatiba, 29 de julho de 2026');
    expect(html).toContain('<strong>benfeitores</strong>');
    expect(html).toContain('class="stack-column"');
    expect(html).toContain('@media only screen and (max-width:620px)');
    expect(html).toContain(
      'https://broadcast-images.nyc3.digitaloceanspaces.com/temporary/'
    );
    expect(html).toContain('alt="Aluno no trator &amp; ajudando"');
    expect(html).toContain('Pe. João Maria');
  });

  it('escapes user-authored text and keeps only safe generated markup', () => {
    const malicious: BroadcastContentV1 = {
      version: 1,
      blocks: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          type: 'text',
          richText: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: '<script>alert("x")</script>' },
                ],
              },
            ],
          },
        },
      ],
    };

    const html = renderBroadcastEmailHtml({
      subject: '<Assunto>',
      content: malicious,
      senderName: 'Responsável <teste>',
      date: new Date('2026-07-29T15:00:00-03:00'),
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('<title>&lt;Assunto&gt;</title>');
  });

  it('produces an explicit plain-text alternative', () => {
    const text = renderBroadcastEmailText(
      content,
      'Pe. João Maria',
      new Date('2026-07-29T15:00:00-03:00')
    );

    expect(text).toContain('Estimados benfeitores do Colégio São José.');
    expect(text).toContain('Novo equipamento');
    expect(text).toContain('Nos Corações de Jesus e Maria');
    expect(text).toContain('Pe. João Maria');
  });
});

