import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFundTransfer } from './actions';

const mockFindMany = vi.fn();
const mockUpdateReturning = vi.fn();
const mockInsertReturning = vi.fn();
const mockTransaction = vi.fn();
const mockGetSession = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getSession: () => mockGetSession(),
  validateSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

type MockTx = {
  query: {
    products: {
      findMany: typeof mockFindMany;
    };
  };
  update: () => {
    set: () => {
      where: () => {
        returning: typeof mockUpdateReturning;
      };
    };
  };
  insert: () => {
    values: () => {
      returning: typeof mockInsertReturning;
    };
  };
};

function createMockTx(): MockTx {
  return {
    query: {
      products: {
        findMany: mockFindMany,
      },
    },
    update: () => ({
      set: () => ({
        where: () => ({
          returning: mockUpdateReturning,
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: mockInsertReturning,
      }),
    }),
  };
}

describe('createFundTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ isAdmin: true, username: 'admin' });
    mockTransaction.mockImplementation(async (callback: (tx: MockTx) => Promise<string>) => {
      return callback(createMockTx());
    });
  });

  it('returns UNAUTHORIZED when session is not admin', async () => {
    mockGetSession.mockResolvedValueOnce({ isAdmin: false, username: null });

    const result = await createFundTransfer({
      sourceProductId: '123e4567-e89b-12d3-a456-426614174000',
      targetProductId: '123e4567-e89b-12d3-a456-426614174001',
      amount: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('UNAUTHORIZED');
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns PRODUCT_NOT_FOUND when source or target product does not exist', async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: '123e4567-e89b-12d3-a456-426614174000', currentAmount: 1000 },
    ]);

    const result = await createFundTransfer({
      sourceProductId: '123e4567-e89b-12d3-a456-426614174000',
      targetProductId: '123e4567-e89b-12d3-a456-426614174001',
      amount: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns INSUFFICIENT_BALANCE when amount exceeds source balance', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        currentAmount: 99,
        targetAmount: null,
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        currentAmount: 0,
        targetAmount: null,
      },
    ]);

    const result = await createFundTransfer({
      sourceProductId: '123e4567-e89b-12d3-a456-426614174000',
      targetProductId: '123e4567-e89b-12d3-a456-426614174001',
      amount: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_BALANCE');
    expect(mockUpdateReturning).not.toHaveBeenCalled();
  });

  it('returns INSUFFICIENT_BALANCE when guarded concurrent decrement affects source row', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        currentAmount: 1000,
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        currentAmount: 0,
      },
    ]);
    mockUpdateReturning.mockResolvedValueOnce([]);

    const result = await createFundTransfer({
      sourceProductId: '123e4567-e89b-12d3-a456-426614174000',
      targetProductId: '123e4567-e89b-12d3-a456-426614174001',
      amount: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_BALANCE');
  });

  it('updates source/target balances and inserts one audit transfer on success', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        currentAmount: 1000,
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        currentAmount: 500,
      },
    ]);
    mockUpdateReturning
      .mockResolvedValueOnce([{ id: '123e4567-e89b-12d3-a456-426614174000' }])
      .mockResolvedValueOnce([{ id: '123e4567-e89b-12d3-a456-426614174001' }]);
    mockInsertReturning.mockResolvedValueOnce([{ id: 'transfer-uuid-123' }]);

    const result = await createFundTransfer({
      sourceProductId: '123e4567-e89b-12d3-a456-426614174000',
      targetProductId: '123e4567-e89b-12d3-a456-426614174001',
      amount: 200,
    });

    expect(result.success).toBe(true);
    expect(result.data?.transferId).toBe('transfer-uuid-123');
    expect(mockUpdateReturning).toHaveBeenCalledTimes(2);
    expect(mockInsertReturning).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/transfers');
  });

});
