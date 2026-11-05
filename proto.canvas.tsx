import './src/app/globals.css';
import './proto/canvas.css';

import type { CanvasProps, FrameProps } from '@compozy/proto';
import { AdminShell } from '@/app/admin/(protected)/components/AdminShell';
import { ServerActionsProvider } from '@/components/server-actions';
import { Toaster } from '@/components/ui/sonner';
import { PathnameProvider } from './proto/next/navigation';
import { fixtureActions } from './proto/server-actions.fixtures';

const BASELINE_ACTIONS = fixtureActions();

/**
 * Providers de apresentação de `src/app/layout.tsx`, sem sessão nem banco. As
 * views chamam server actions pelo contexto; aqui toda action resolve sem
 * servidor, e o `Toaster` mostra o retorno de um envio feito na galeria.
 */
export function Canvas({ children }: CanvasProps) {
  return (
    <ServerActionsProvider actions={BASELINE_ACTIONS}>
      {children}
      <Toaster richColors position="top-center" duration={4000} />
    </ServerActionsProvider>
  );
}

/**
 * A casca real do painel em volta dos protótipos de componente, como em
 * `src/app/admin/(protected)/layout.tsx`; `route` marca o item ativo e "Sair"
 * não faz nada. Telas públicas usam `standalone: true`.
 */
export function Frame({ route, children }: FrameProps) {
  return (
    <PathnameProvider pathname={route}>
      <AdminShell onLogout={async () => {}}>{children}</AdminShell>
    </PathnameProvider>
  );
}
