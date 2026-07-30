import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteBroadcastDraft,
  deleteTemporaryBroadcastImage,
  resendFailedBroadcastEmails,
  saveBroadcastDraft,
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
import {
  getAllBroadcastDraftImagePaths,
  getBroadcastDraftImagePaths,
  getBroadcastRecipientEmails,
} from './queries';
import type { BroadcastContentV1 } from './content';

const { resendSend, resendBatchSend } = vi.hoisted(() => ({
  resendSend: vi.fn(),
  resendBatchSend: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: resendSend },
    batch: { send: resendBatchSend },
  })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
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
  getAllBroadcastDraftImagePaths: vi.fn(),
  getBroadcastDraftImagePaths: vi.fn(),
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
    vi.mocked(getAllBroadcastDraftImagePaths).mockResolvedValue([]);
    vi.mocked(getBroadcastDraftImagePaths).mockResolvedValue([]);
    resendSend.mockResolvedValue({
      data: { id: 'email-id' },
      error: null,
    });
    resendBatchSend.mockImplementation(
      async (emails: { to: string[] }[]) => ({
        data: { data: emails.map(() => ({ id: 'email-id' })) },
        error: null,
      })
    );
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
    vi.mocked(db.delete).mockImplementation(
      () =>
        ({
          where: () => Promise.resolve(),
        }) as never
    );
    vi.mocked(db.update).mockImplementation(
      () =>
        ({
          set: () => ({ where: () => Promise.resolve() }),
        }) as never
    );
    vi.mocked(db.select).mockImplementation(
      () =>
        ({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([]) }),
          }),
        }) as never
    );
  });

  function mockStoredBroadcast(overrides: Record<string, unknown> = {}) {
    const row = {
      id: '33333333-3333-4333-8333-333333333333',
      subject: 'Agradecimento',
      message: 'Mensagem aos benfeitores.',
      recipientCount: 3,
      sentSuccessCount: 1,
      sentFailureCount: 2,
      sentBy: 'admin',
      senderName: 'Pe. João Maria',
      signatureText: 'Com gratidão,',
      bccEmail: null,
      failedRecipients: ['falhou1@example.com', 'falhou2@example.com'],
      content,
      createdAt: new Date('2026-07-20T12:00:00Z'),
      ...overrides,
    };
    vi.mocked(db.select).mockImplementation(
      () =>
        ({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([row]) }),
          }),
        }) as never
    );
    return row;
  }

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
      expect.any(Date),
      []
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

  it('upserts an incomplete draft and removes images no longer referenced', async () => {
    const removedPath =
      'temporary/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg';
    let insertedValues: Record<string, unknown> | undefined;
    vi.mocked(getBroadcastDraftImagePaths).mockResolvedValueOnce([
      removedPath,
    ]);
    vi.mocked(db.insert).mockImplementationOnce(
      () =>
        ({
          values: (values: Record<string, unknown>) => {
            insertedValues = values;
            return {
              onConflictDoUpdate: () => ({
                returning: () =>
                  Promise.resolve([
                    { updatedAt: new Date('2026-07-30T02:15:00Z') },
                  ]),
              }),
            };
          },
        }) as never
    );

    const result = await saveBroadcastDraft({
      composerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      subject: '',
      senderName: '',
      signatureText: 'Com gratidão,',
      bccEmail: '',
      testEmail: '',
      content: {
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
      },
    });

    expect(result).toEqual({
      success: true,
      data: { updatedAt: '2026-07-30T02:15:00.000Z' },
    });
    expect(insertedValues).toEqual(
      expect.objectContaining({
        adminUsername: 'admin',
        subject: '',
        signatureText: 'Com gratidão,',
      })
    );
    expect(deleteStorageObject).toHaveBeenCalledWith(
      'broadcast-images',
      removedPath
    );
  });

  it('deletes the saved draft and its temporary images', async () => {
    vi.mocked(getBroadcastDraftImagePaths).mockResolvedValueOnce([
      temporaryPath,
    ]);

    const result = await deleteBroadcastDraft();

    expect(result).toEqual({ success: true, data: null });
    expect(db.delete).toHaveBeenCalled();
    expect(deleteStorageObject).toHaveBeenCalledWith(
      'broadcast-images',
      temporaryPath
    );
  });

  it('sends a test with matching HTML and plain-text alternatives', async () => {
    const result = await sendTestBroadcastEmail({
      subject: 'Agradecimento',
      senderName: 'Pe. João Maria',
      signatureText: 'Com gratidão,',
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
        html: expect.stringContaining('Com gratidão,'),
        text: expect.stringContaining('Com gratidão,'),
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
      signatureText: 'Com gratidão,',
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
    expect(insertedValues?.signatureText).toBe('Com gratidão,');
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

  it('delivers recipients through a single batch request instead of one per email', async () => {
    vi.mocked(getBroadcastRecipientEmails).mockResolvedValue([
      'a@example.com',
      'b@example.com',
      'c@example.com',
    ]);

    const result = await sendBroadcastEmail({
      subject: 'Agradecimento',
      senderName: 'Pe. João Maria',
      signatureText: 'Com gratidão,',
      bccEmail: 'copia@example.com',
      content,
    });

    expect(result.success).toBe(true);
    expect(resendSend).not.toHaveBeenCalled();
    expect(resendBatchSend).toHaveBeenCalledTimes(1);
    const [emails, options] = resendBatchSend.mock.calls[0];
    expect(emails).toHaveLength(3);
    expect(emails[0]).toEqual(
      expect.objectContaining({
        to: ['a@example.com'],
        bcc: ['copia@example.com'],
        subject: 'Agradecimento',
      })
    );
    expect(options).toEqual(
      expect.objectContaining({ batchValidation: 'permissive' })
    );
    expect(result.data).toEqual(
      expect.objectContaining({ successCount: 3, failureCount: 0 })
    );
  });

  it('persists the recipients that failed so they can be resent later', async () => {
    vi.mocked(getBroadcastRecipientEmails).mockResolvedValue([
      'a@example.com',
      'b@example.com',
    ]);
    resendBatchSend.mockResolvedValue({
      data: {
        data: [{ id: 'email-id' }],
        errors: [{ index: 1, message: 'Invalid `to` field' }],
      },
      error: null,
    });
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
      signatureText: 'Com gratidão,',
      content,
    });

    expect(result.data).toEqual(
      expect.objectContaining({ successCount: 1, failureCount: 1 })
    );
    expect(insertedValues?.failedRecipients).toEqual(['b@example.com']);
    expect(insertedValues?.sentFailureCount).toBe(1);
  });

  it('resends only the pending recipients and clears them on success', async () => {
    const stored = mockStoredBroadcast();
    let updatedValues: Record<string, unknown> | undefined;
    vi.mocked(db.update).mockImplementation(
      () =>
        ({
          set: (values: Record<string, unknown>) => {
            updatedValues = values;
            return { where: () => Promise.resolve() };
          },
        }) as never
    );

    const result = await resendFailedBroadcastEmails({
      broadcastId: stored.id,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      broadcastId: stored.id,
      retriedCount: 2,
      successCount: 2,
      failureCount: 0,
    });
    const [emails] = resendBatchSend.mock.calls[0];
    expect(emails.map((e: { to: string[] }) => e.to)).toEqual([
      ['falhou1@example.com'],
      ['falhou2@example.com'],
    ]);
    // Original letter date is preserved on the retry.
    expect(emails[0].html).toContain('Itatiba, 20 de julho de 2026');
    expect(updatedValues).toEqual({
      sentSuccessCount: 3,
      sentFailureCount: 0,
      failedRecipients: [],
    });
    expect(getBroadcastRecipientEmails).not.toHaveBeenCalled();
  });

  it('keeps the still-failing recipients after a partial resend', async () => {
    const stored = mockStoredBroadcast();
    resendBatchSend.mockResolvedValue({
      data: {
        data: [{ id: 'email-id' }],
        errors: [{ index: 0, message: 'Invalid `to` field' }],
      },
      error: null,
    });
    let updatedValues: Record<string, unknown> | undefined;
    vi.mocked(db.update).mockImplementation(
      () =>
        ({
          set: (values: Record<string, unknown>) => {
            updatedValues = values;
            return { where: () => Promise.resolve() };
          },
        }) as never
    );

    const result = await resendFailedBroadcastEmails({
      broadcastId: stored.id,
    });

    expect(result.data).toEqual(
      expect.objectContaining({ successCount: 1, failureCount: 1 })
    );
    expect(updatedValues).toEqual({
      sentSuccessCount: 2,
      sentFailureCount: 1,
      failedRecipients: ['falhou1@example.com'],
    });
  });

  it('refuses to resend without an admin session', async () => {
    mockStoredBroadcast();
    vi.mocked(getSession).mockResolvedValueOnce({ isAdmin: false } as never);

    const result = await resendFailedBroadcastEmails({
      broadcastId: '33333333-3333-4333-8333-333333333333',
    });

    expect(result).toEqual({ success: false, error: 'UNAUTHORIZED' });
    expect(resendBatchSend).not.toHaveBeenCalled();
  });

  it('reports when a broadcast has no pending recipients', async () => {
    const stored = mockStoredBroadcast({ failedRecipients: [] });

    const result = await resendFailedBroadcastEmails({
      broadcastId: stored.id,
    });

    expect(result).toEqual({ success: false, error: 'NO_FAILED_RECIPIENTS' });
    expect(resendBatchSend).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('reports a missing broadcast', async () => {
    const result = await resendFailedBroadcastEmails({
      broadcastId: '33333333-3333-4333-8333-333333333333',
    });

    expect(result).toEqual({ success: false, error: 'NOT_FOUND' });
  });

  it('refuses to resend a broadcast stored without structured content', async () => {
    const stored = mockStoredBroadcast({ content: null });

    const result = await resendFailedBroadcastEmails({
      broadcastId: stored.id,
    });

    expect(result.error).toBe('MISSING_CONTENT');
    expect(resendBatchSend).not.toHaveBeenCalled();
  });
});
