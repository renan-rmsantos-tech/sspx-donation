import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BROADCAST_BATCH_SIZE,
  BROADCAST_MAX_SEND_ATTEMPTS,
  deliverBroadcastEmails,
  isRetryableBroadcastError,
  type BroadcastBatchEmail,
} from './delivery';

const email = {
  from: 'comunicados@example.com',
  subject: 'Agradecimento',
  html: '<p>Obrigado</p>',
  text: 'Obrigado',
};

function recipients(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `doador${i}@example.com`);
}

describe('deliverBroadcastEmails', () => {
  const sleep = vi.fn(async () => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('groups recipients into batch requests instead of one request per email', async () => {
    const sent: BroadcastBatchEmail[][] = [];
    const sendBatch = vi.fn(async (emails: BroadcastBatchEmail[]) => {
      sent.push(emails);
      return { data: { data: emails.map(() => ({ id: 'email-id' })) } };
    });

    const result = await deliverBroadcastEmails({
      sendBatch,
      recipients: recipients(250),
      email,
      idempotencyPrefix: 'broadcast-1',
      sleep,
    });

    expect(sendBatch).toHaveBeenCalledTimes(3);
    expect(sent.map((batch) => batch.length)).toEqual([
      BROADCAST_BATCH_SIZE,
      BROADCAST_BATCH_SIZE,
      50,
    ]);
    expect(sent[0][0]).toEqual(
      expect.objectContaining({ to: ['doador0@example.com'], ...email })
    );
    expect(result).toEqual({ successCount: 250, failedRecipients: [] });
  });

  it('waits between batch requests to stay under the rate limit', async () => {
    const sendBatch = vi.fn(async () => ({ data: { data: [] } }));

    await deliverBroadcastEmails({
      sendBatch,
      recipients: recipients(300),
      email,
      idempotencyPrefix: 'broadcast-1',
      sleep,
    });

    // One pause before each request except the first.
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(expect.any(Number));
  });

  it('retries a rate-limited batch with the same idempotency key', async () => {
    const sendBatch = vi
      .fn()
      .mockResolvedValueOnce({
        error: {
          name: 'rate_limit_exceeded',
          statusCode: 429,
          message:
            'Too many requests: You have exceeded the rate limit, which is 10 requests per second.',
        },
      })
      .mockResolvedValueOnce({ data: { data: [{ id: 'email-id' }] } });

    const result = await deliverBroadcastEmails({
      sendBatch,
      recipients: ['doador@example.com'],
      email,
      idempotencyPrefix: 'broadcast-1',
      sleep,
    });

    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect(sendBatch.mock.calls[0][1]).toEqual({
      batchValidation: 'permissive',
      idempotencyKey: 'broadcast-1-0',
    });
    expect(sendBatch.mock.calls[1][1]).toEqual(sendBatch.mock.calls[0][1]);
    expect(result).toEqual({ successCount: 1, failedRecipients: [] });
  });

  it('gives up on a batch after the retry budget and reports its recipients', async () => {
    const sendBatch = vi.fn(async () => ({
      error: { name: 'rate_limit_exceeded', statusCode: 429, message: 'Too many requests' },
    }));

    const result = await deliverBroadcastEmails({
      sendBatch,
      recipients: ['a@example.com', 'b@example.com'],
      email,
      idempotencyPrefix: 'broadcast-1',
      sleep,
    });

    expect(sendBatch).toHaveBeenCalledTimes(BROADCAST_MAX_SEND_ATTEMPTS);
    expect(result).toEqual({
      successCount: 0,
      failedRecipients: ['a@example.com', 'b@example.com'],
    });
  });

  it('does not retry a permanent error', async () => {
    const sendBatch = vi.fn(async () => ({
      error: { name: 'validation_error', statusCode: 422, message: 'Invalid from address' },
    }));

    const result = await deliverBroadcastEmails({
      sendBatch,
      recipients: ['a@example.com'],
      email,
      idempotencyPrefix: 'broadcast-1',
      sleep,
    });

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect(result.failedRecipients).toEqual(['a@example.com']);
  });

  it('reports only the recipients rejected inside a partially valid batch', async () => {
    const sendBatch = vi.fn(async () => ({
      data: {
        data: [{ id: 'email-id' }],
        errors: [{ index: 1, message: 'Invalid `to` field' }],
      },
    }));

    const result = await deliverBroadcastEmails({
      sendBatch,
      recipients: ['a@example.com', 'invalido@', 'c@example.com'],
      email,
      idempotencyPrefix: 'broadcast-1',
      sleep,
    });

    expect(result).toEqual({
      successCount: 2,
      failedRecipients: ['invalido@'],
    });
  });

  it('treats a thrown network error as a retryable failure', async () => {
    const sendBatch = vi
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({ data: { data: [{ id: 'email-id' }] } });

    const result = await deliverBroadcastEmails({
      sendBatch,
      recipients: ['a@example.com'],
      email,
      idempotencyPrefix: 'broadcast-1',
      sleep,
    });

    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect(result.successCount).toBe(1);
  });

  it('sends nothing when there are no recipients', async () => {
    const sendBatch = vi.fn();

    const result = await deliverBroadcastEmails({
      sendBatch,
      recipients: [],
      email,
      idempotencyPrefix: 'broadcast-1',
      sleep,
    });

    expect(sendBatch).not.toHaveBeenCalled();
    expect(result).toEqual({ successCount: 0, failedRecipients: [] });
  });
});

describe('isRetryableBroadcastError', () => {
  it('classifies rate limit, server and transport failures as retryable', () => {
    expect(
      isRetryableBroadcastError({ statusCode: 429, message: 'Too many requests' })
    ).toBe(true);
    expect(isRetryableBroadcastError({ statusCode: 503, message: 'oops' })).toBe(
      true
    );
    expect(
      isRetryableBroadcastError({ name: 'rate_limit_exceeded', message: '' })
    ).toBe(true);
    expect(isRetryableBroadcastError({ message: 'fetch failed' })).toBe(false);
    expect(
      isRetryableBroadcastError({ statusCode: 422, message: 'Invalid field' })
    ).toBe(false);
    expect(isRetryableBroadcastError(null)).toBe(false);
  });
});
