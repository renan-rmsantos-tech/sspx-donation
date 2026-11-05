import type { ServerActions } from '@/components/server-actions';

const BASELINE: Partial<ServerActions> = {
  uploadFile: async () => ({
    success: true,
    data: { path: 'receipts/comprovante-fixture.png' },
  }),
};

/**
 * Server actions de fixture para a galeria. As `overrides` definem o que um
 * estado precisa; o envio de comprovante devolve um caminho fictício e
 * qualquer outra action resolve `{ success: true }` sem tocar o servidor.
 */
export function fixtureActions(
  overrides: Partial<ServerActions> = {}
): Partial<ServerActions> {
  const actions: Record<PropertyKey, unknown> = { ...BASELINE, ...overrides };
  return new Proxy(actions, {
    get: (target, name) => target[name] ?? (async () => ({ success: true })),
  }) as Partial<ServerActions>;
}
