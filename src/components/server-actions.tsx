'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type * as DonationActions from '@/features/donations/actions';

/** Server actions que as views públicas de cliente chamam. */
export type ServerActions = typeof DonationActions;

export type ServerActionName = keyof ServerActions;

type Lookup = (name: ServerActionName) => unknown;

const ServerActionsContext = createContext<Lookup>(() => undefined);

/**
 * Entrega server actions às views de cliente. A página (servidor) passa as
 * actions reais; protótipos e testes passam fixtures. Assim as views não
 * importam `actions.ts` e renderizam na galeria de protótipos.
 * Providers aninhados consultam o mais interno primeiro.
 */
export function ServerActionsProvider({
  actions,
  children,
}: {
  actions: Partial<ServerActions>;
  children: ReactNode;
}) {
  const parent = useContext(ServerActionsContext);
  const lookup = useMemo<Lookup>(
    () => (name) => (actions as Record<string, unknown>)[name] ?? parent(name),
    [actions, parent]
  );
  return (
    <ServerActionsContext.Provider value={lookup}>
      {children}
    </ServerActionsContext.Provider>
  );
}

/**
 * A server action `name` do provider mais próximo. Sem provider, a função
 * devolvida falha ao ser chamada (não ao renderizar), com uma mensagem clara.
 */
export function useServerAction<K extends ServerActionName>(
  name: K
): ServerActions[K] {
  const action = useContext(ServerActionsContext)(name);
  if (typeof action === 'function') return action as ServerActions[K];
  return (async () => {
    throw new Error(
      `Server action "${name}" não foi fornecida por um ServerActionsProvider.`
    );
  }) as unknown as ServerActions[K];
}
