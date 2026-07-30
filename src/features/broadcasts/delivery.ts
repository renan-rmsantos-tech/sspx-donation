/**
 * Broadcast delivery with Resend rate-limit protection.
 *
 * Resend allows 10 requests per second. Sending one request per recipient blows
 * through that budget, so recipients are grouped into batch requests (up to 100
 * emails per request) that are issued sequentially with a minimum interval
 * between them. Rate-limited or transient failures are retried with backoff and
 * a stable idempotency key, so a retry never duplicates an already sent email.
 */

export const BROADCAST_BATCH_SIZE = 100;
export const BROADCAST_REQUEST_INTERVAL_MS = 250;
export const BROADCAST_MAX_SEND_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 1000;

const RETRYABLE_ERROR_NAMES = new Set([
  'rate_limit_exceeded',
  'application_error',
  'internal_server_error',
]);

export interface BroadcastBatchEmail {
  from: string;
  to: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
}

interface BroadcastBatchError {
  message?: string;
  name?: string;
  statusCode?: number | null;
}

export interface BroadcastBatchResponse {
  data?: {
    data?: { id: string }[];
    errors?: { index: number; message: string }[];
  } | null;
  error?: BroadcastBatchError | null;
}

export type BroadcastBatchSend = (
  emails: BroadcastBatchEmail[],
  options: { batchValidation: 'permissive'; idempotencyKey: string }
) => Promise<BroadcastBatchResponse>;

export interface DeliverBroadcastEmailsOptions {
  sendBatch: BroadcastBatchSend;
  recipients: string[];
  /** Shared envelope for every recipient; `to` is filled in per recipient. */
  email: Omit<BroadcastBatchEmail, 'to'>;
  /** Stable prefix for the per-batch idempotency keys of this delivery run. */
  idempotencyPrefix: string;
  sleep?: (ms: number) => Promise<void>;
}

export interface BroadcastDeliveryResult {
  successCount: number;
  failedRecipients: string[];
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function isRetryableBroadcastError(
  error: BroadcastBatchError | null | undefined
): boolean {
  if (!error) return false;
  const statusCode = error.statusCode ?? 0;
  if (statusCode === 429 || statusCode >= 500) return true;
  if (error.name && RETRYABLE_ERROR_NAMES.has(error.name)) return true;
  return /too many requests|rate limit/i.test(error.message ?? '');
}

function toBatchError(reason: unknown): BroadcastBatchError {
  if (reason instanceof Error) {
    return { message: reason.message, name: reason.name };
  }
  return { message: String(reason) };
}

/**
 * Sends a single batch, retrying rate-limited and transient failures.
 * Returns the recipients of that batch that could not be delivered.
 */
async function sendBatchWithRetry(
  batch: string[],
  batchIndex: number,
  {
    sendBatch,
    email,
    idempotencyPrefix,
    sleep,
  }: Required<Omit<DeliverBroadcastEmailsOptions, 'recipients'>>
): Promise<string[]> {
  const emails: BroadcastBatchEmail[] = batch.map((to) => ({
    ...email,
    to: [to],
  }));
  const idempotencyKey = `${idempotencyPrefix}-${batchIndex}`;

  for (let attempt = 1; attempt <= BROADCAST_MAX_SEND_ATTEMPTS; attempt += 1) {
    let response: BroadcastBatchResponse;
    // A thrown error is a transport failure (timeout, socket reset); the
    // idempotency key makes retrying it safe even if the request did land.
    let thrown = false;
    try {
      response = await sendBatch(emails, {
        batchValidation: 'permissive',
        idempotencyKey,
      });
    } catch (reason) {
      response = { error: toBatchError(reason) };
      thrown = true;
    }

    if (!response.error) {
      const failedIndexes = new Set(
        (response.data?.errors ?? []).map((e) => e.index)
      );
      for (const failure of response.data?.errors ?? []) {
        console.error(
          `broadcast send error for ${batch[failure.index] ?? 'unknown'}:`,
          failure.message
        );
      }
      return batch.filter((_, index) => failedIndexes.has(index));
    }

    const retryable = thrown || isRetryableBroadcastError(response.error);
    if (!retryable || attempt === BROADCAST_MAX_SEND_ATTEMPTS) {
      console.error(
        `broadcast batch ${batchIndex} failed after ${attempt} attempt(s):`,
        response.error
      );
      return batch;
    }

    console.warn(
      `broadcast batch ${batchIndex} retry ${attempt}/${
        BROADCAST_MAX_SEND_ATTEMPTS - 1
      }:`,
      response.error.message
    );
    await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
  }

  return batch;
}

/**
 * Delivers the broadcast to every recipient while staying within Resend's
 * request rate limit. Recipients that could not be delivered are returned so
 * they can be retried later.
 */
export async function deliverBroadcastEmails({
  sendBatch,
  recipients,
  email,
  idempotencyPrefix,
  sleep = defaultSleep,
}: DeliverBroadcastEmailsOptions): Promise<BroadcastDeliveryResult> {
  const batches = chunk(recipients, BROADCAST_BATCH_SIZE);
  const failedRecipients: string[] = [];

  for (const [batchIndex, batch] of batches.entries()) {
    if (batchIndex > 0) await sleep(BROADCAST_REQUEST_INTERVAL_MS);
    const failed = await sendBatchWithRetry(batch, batchIndex, {
      sendBatch,
      email,
      idempotencyPrefix,
      sleep,
    });
    failedRecipients.push(...failed);
  }

  return {
    successCount: recipients.length - failedRecipients.length,
    failedRecipients,
  };
}
