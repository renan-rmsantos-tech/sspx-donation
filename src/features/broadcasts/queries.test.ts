import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import {
  getAllBroadcastDraftImagePaths,
  getBroadcastDraft,
} from './queries';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

const emptyContent = {
  version: 1,
  blocks: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      type: 'text',
      richText: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
    },
  ],
} as const;

describe('broadcast draft queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({
      isAdmin: true,
      username: 'admin',
    } as never);
  });

  it('restores the current admin draft as a serializable snapshot', async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      {
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                  adminUsername: 'admin',
                  composerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                  subject: 'Notícias',
                  senderName: 'Pe. João',
                  signatureText: 'Com gratidão,',
                  bccEmail: null,
                  testEmail: 'teste@example.com',
                  content: emptyContent,
                  createdAt: new Date('2026-07-30T02:00:00Z'),
                  updatedAt: new Date('2026-07-30T02:15:00Z'),
                },
              ]),
          }),
        }),
      } as never
    );

    await expect(getBroadcastDraft()).resolves.toEqual({
      composerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      subject: 'Notícias',
      senderName: 'Pe. João',
      signatureText: 'Com gratidão,',
      bccEmail: '',
      testEmail: 'teste@example.com',
      content: emptyContent,
      updatedAt: '2026-07-30T02:15:00.000Z',
    });
  });

  it('protects every unique temporary image referenced by saved drafts', async () => {
    const path =
      'temporary/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg';
    vi.mocked(db.select).mockReturnValueOnce(
      {
        from: () =>
          Promise.resolve([
            {
              content: {
                version: 1,
                blocks: [
                  {
                    id: '11111111-1111-4111-8111-111111111111',
                    type: 'image',
                    image: { path, alt: 'Fotografia do colégio' },
                  },
                  {
                    id: '22222222-2222-4222-8222-222222222222',
                    type: 'image',
                    image: { path, alt: 'A mesma fotografia' },
                  },
                ],
              },
            },
          ]),
      } as never
    );

    await expect(getAllBroadcastDraftImagePaths()).resolves.toEqual([path]);
  });
});
