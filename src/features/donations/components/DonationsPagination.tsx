import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DonationsPaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams?: Record<string, string>;
}

export function DonationsPagination({
  currentPage,
  totalPages,
  searchParams = {},
}: DonationsPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const buildHref = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    return `/admin/financeiro?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Anterior
        </Link>
      ) : (
        <span
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'pointer-events-none opacity-50'
          )}
        >
          Anterior
        </span>
      )}

      <span className="text-sm text-[#666]">
        Página {currentPage} de {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Próxima
        </Link>
      ) : (
        <span
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'pointer-events-none opacity-50'
          )}
        >
          Próxima
        </span>
      )}
    </div>
  );
}
