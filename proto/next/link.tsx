import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string | { pathname?: string; search?: string };
  children?: ReactNode;
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
};

/** Props do `next/link` sem equivalente na `<a>`; são descartadas. */
const NEXT_ONLY = ['prefetch', 'replace', 'scroll'] as const;

/** `next/link` na galeria: âncora comum que não sai do protótipo ao clicar. */
export default function Link({ href, onClick, ...rest }: LinkProps) {
  const props: AnchorHTMLAttributes<HTMLAnchorElement> = { ...rest };
  for (const key of NEXT_ONLY) delete (props as Record<string, unknown>)[key];
  const target = typeof href === 'string' ? href : `${href.pathname ?? ''}${href.search ?? ''}`;
  return (
    <a
      {...props}
      href={target}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        event.preventDefault();
      }}
    />
  );
}
