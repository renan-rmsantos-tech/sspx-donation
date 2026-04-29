'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin/dashboard', label: 'Painel' },
  { href: '/admin/products', label: 'Produtos' },
  { href: '/admin/categories', label: 'Categorias' },
  { href: '/admin/pix', label: 'PIX' },
  { href: '/admin/transfers', label: 'Transferências' },
  { href: '/admin/financeiro', label: 'Doações' },
  { href: '/admin/comunicacoes', label: 'Comunicações' },
];

export function AdminNavLinks() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item, i) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <span key={item.href} className="flex items-center">
            {i > 0 && (
              <span className="w-px h-5 bg-[#FAF8F540] flex-shrink-0 mx-1" />
            )}
            <Link
              href={item.href}
              className={`py-1.5 px-3.5 rounded-md text-[14px] leading-[18px] transition-colors ${
                isActive
                  ? 'bg-[#FAF8F526] text-[#FAF8F5]'
                  : 'text-[#FAF8F5CC] hover:text-[#FAF8F5] hover:bg-[#FAF8F526]'
              }`}
            >
              {item.label}
            </Link>
          </span>
        );
      })}
    </>
  );
}
