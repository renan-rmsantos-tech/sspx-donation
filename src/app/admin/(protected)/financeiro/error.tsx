'use client';

import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="font-bold text-lg text-[#1E3D59]">
        Erro ao carregar dados
      </h2>
      <p className="text-[#666] text-center max-w-md">
        Ocorreu um erro ao carregar as informações financeiras. Tente novamente.
      </p>
      <Button onClick={reset} className="mt-4">
        Tentar Novamente
      </Button>
    </div>
  );
}
