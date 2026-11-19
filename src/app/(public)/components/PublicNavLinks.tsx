'use client';

import type { MouseEvent } from 'react';

const LINK_CLASS =
  'px-4 py-2 rounded-full text-[13px] text-[#5A6D7E] hover:text-[#1E3D59] hover:bg-[#1E3D5914] transition-colors cursor-pointer';

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.pushState(null, '', `#${id}`);
}

function handleNavClick(e: MouseEvent<HTMLAnchorElement>, id: string) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return;
  }
  e.preventDefault();
  scrollToSection(id);
}

export function PublicNavLinks() {
  return (
    <>
      <a href="#mensagem" className={LINK_CLASS} onClick={(e) => handleNavClick(e, 'mensagem')}>
        Mensagem
      </a>
      <a href="#doacoes" className={LINK_CLASS} onClick={(e) => handleNavClick(e, 'doacoes')}>
        Doações
      </a>
    </>
  );
}
