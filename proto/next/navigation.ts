import { createContext, createElement, use, type ReactNode } from 'react';

/**
 * `next/navigation` na galeria. A rota vem de `meta.route` do protótipo,
 * entregue pelo `Frame` de `proto.canvas.tsx`; a query é vazia e navegar não
 * faz nada.
 */
const PathnameContext = createContext('/');

export function PathnameProvider({ pathname, children }: { pathname: string; children: ReactNode }) {
  return createElement(PathnameContext, { value: pathname }, children);
}

export function usePathname(): string {
  return use(PathnameContext);
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function useParams<T extends Record<string, string | string[]>>(): T {
  return {} as T;
}

const router = {
  push: () => {},
  replace: () => {},
  refresh: () => {},
  prefetch: () => {},
  back: () => {},
  forward: () => {},
};

export function useRouter() {
  return router;
}

export function redirect(url: string): never {
  throw new Error(`redirect(${url}) não roda em protótipos`);
}

export const permanentRedirect = redirect;

export function notFound(): never {
  throw new Error('notFound() não roda em protótipos');
}
