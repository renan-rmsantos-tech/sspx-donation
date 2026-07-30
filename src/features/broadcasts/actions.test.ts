import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteTemporaryBroadcastImage,
  sendBroadcastEmail,
  sendTestBroadcastEmail,
  uploadBroadcastImage,
} from './actions';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import {
  copyStorageObject,
  deleteStorageObjectsOlderThan,
  deleteStorageObject,
  uploadFileDirect,
} from '@/lib/storage/spaces';
import { getBroadcastRecipientEmails } from './queries';
import type { BroadcastContentV1 } from './content';

const { resendSend } = vi.hoisted(() => ({
  resendSend: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: resendSend },
  })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(),
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/storage/spaces', () => ({
  uploadFileDirect: vi.fn(),
  deleteStorageObjectsOlderThan: vi.fn(),
  copyStorageObject: vi.fn(),
  deleteStorageObject: vi.fn(),
}));

vi.mock('@/lib/storage/public-url', () => ({
  getPublicUrl: vi.fn(
    (_bucket: string, path: string) =>
      `https://broadcast-images.example.com/${path}`
  ),
}));

vi.mock('./queries', () => ({
  getBroadcastRecipientEmails: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const temporaryPath =
  'temporary/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg';

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
            content: [{ type: 'text', text: 'Mensagem aos benfeitores.' }],
          },
        ],
      },
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      type: 'image',
      image: {
        path: temporaryPath,
        alt: 'Alunos utilizando a nova estrutura',
      },
    },
  ],
};

describe('broadcast actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 're_valid_test_key';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    vi.mocked(getSession).mockResolvedValue({
      isAdmin: true,
      username: 'admin',
    } as never);
    vi.mocked(getBroadcastRecipientEmails).mockResolvedValue([
      'doador@example.com',
    ]);
    resendSend.mockResolvedValue({
      data: { id: 'email-id' },
      error: null,
    });
    vi.mocked(uploadFileDirect).mockResolvedValue({ path: temporaryPath });
    vi.mocked(deleteStorageObjectsOlderThan).mockResolvedValue(0);
    vi.mocked(copyStorageObject).mockResolvedValue({
      path: temporaryPath,
    });
    vi.mocked(deleteStorageObject).mockResolvedValue();
    vi.mocked(db.insert).mockImplementation(
      () =>
        ({
          values: () => ({
            returning: () => Promise.resolve([{ id: 'broadcast-id' }]),
          }),
        }) as never
    );
  });

  function imageUploadForm(): FormData {
    const formData = new FormData();
    formData.set(
      'composerId',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    );
    formData.set(
      'file',
      new File(
        [new Uint8Array([0xff, 0xd8, 0xff, 0xd9])],
        'broadcast.jpg',
        { type: 'image/jpeg' }
      )
    );
    return formData;
  }

  it('requires an admin session before uploading a broadcast image', async () => {
    vi.mocked(getSession).mockResolvedValueOnce({
      isAdmin: false,
    } as never);

    const result = await uploadBroadcastImage(imageUploadForm());

    expect(result).toEqual({ success: false, error: 'UNAUTHORIZED' });
    expect(uploadFileDirect).not.toHaveBeenCalled();
  });

  it('uploads a validated JPEG under the temporary composer prefix', async () => {
    const result = await uploadBroadcastImage(imageUploadForm());

    expect(result.success).toBe(true);
    expect(result.data?.path).toMatch(
      /^temporary\/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa\/.+\.jpg$/
    );
    expect(deleteStorageObjectsOlderThan).toHaveBeenCalledWith(
      'broadcast-images',
      'temporary/',
      expect.any(Date)
    );
    expect(uploadFileDirect).toHaveBeenCalledWith(
      'broadcast-images',
      expect.stringMatching(/^temporary\//),
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg' }
    );
  });

  it('rejects a file that only claims to be a JPEG', async () => {
    const formData = new FormData();
    formData.set(
      'composerId',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    );
    formData.set(
      'file',
      new File(['not-an-image'], 'broadcast.jpg', {
        type: 'image/jpeg',
      })
    );

    const result = await uploadBroadcastImage(formData);

    expect(result.error).toBe('VALIDATION_ERROR');
    expect(uploadFileDirect).not.toHaveBeenCalled();
  });

  it('only deletes validated temporary broadcast images', async () => {
    const invalid = await deleteTemporaryBroadcastImage({
      path: 'broadcasts/final/image.jpg',
    });
    const valid = await deleteTemporaryBroadcastImage({
      path: temporaryPath,
    });

    expect(invalid.error).toBe('VALIDATION_ERROR');
    expect(valid.success).toBe(true);
    expect(deleteStorageObject).toHaveBeenCalledWith(
      'broadcast-images',
      temporaryPath
    );
  });

  it('sends a test with matching HTML and plain-text alternatives', async () => {
    const result = await sendTestBroadcastEmail({
      subject: 'Agradecimento',
      senderName: 'Pe. João Maria',
      testEmail: 'teste@example.com',
      content,
    });

    expect(result).toEqual({
      success: true,
      data: { to: 'teste@example.com' },
    });
    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'teste@example.com',
        subject: '[TESTE] Agradecimento',
        html: expect.stringContaining('Mensagem aos benfeitores.'),
        text: expect.stringContaining('Mensagem aos benfeitores.'),
      })
    );
    expect(db.insert).not.toHaveBeenCalled();
    expect(copyStorageObject).not.toHaveBeenCalled();
  });

  it('promotes temporary images and persists the structured sent content', async () => {
    let insertedValues: Record<string, unknown> | undefined;
    vi.mocked(db.insert).mockImplementation(
      () =>
        ({
          values: (values: Record<string, unknown>) => {
            insertedValues = values;
            return {
              returning: () => Promise.resolve([{ id: values.id }]),
            };
          },
        }) as never
    );

    const result = await sendBroadcastEmail({
      subject: 'Agradecimento',
      senderName: 'Pe. João Maria',
      content,
    });

    expect(result.success).toBe(true);
    expect(copyStorageObject).toHaveBeenCalledWith(
      'broadcast-images',
      temporaryPath,
      expect.stringMatching(/^broadcasts\/.+\/.+\.jpg$/),
      { contentType: 'image/jpeg', publicRead: true }
    );
    expect(deleteStorageObject).toHaveBeenCalledWith(
      'broadcast-images',
      temporaryPath
    );
    expect(insertedValues?.message).toBe('Mensagem aos benfeitores.');
    expect(insertedValues?.content).toEqual(
      expect.objectContaining({
        version: 1,
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: 'image',
            image: expect.objectContaining({
              path: expect.stringMatching(/^broadcasts\//),
            }),
          }),
        ]),
      })
    );
  });
});
