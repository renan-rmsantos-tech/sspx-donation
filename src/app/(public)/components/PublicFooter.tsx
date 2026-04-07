import Image from 'next/image';

export function PublicFooter() {
  return (
    <footer className="flex flex-col items-center gap-[14px] w-full bg-[#1E3D59] py-8 px-12">
      <Image
        src="/logo-fsspx.png"
        alt="Logo FSSPX"
        width={46}
        height={60}
        className="object-contain brightness-0 invert opacity-60"
      />

      <span className="text-[13px] uppercase tracking-[2px] text-[#9B7B5A] font-normal">
        Fraternidade Sacerdotal São Pio X
      </span>

      <span className="flex items-center gap-3 text-[13px] text-white/55">
        <span>colegiosaojose.acipec@gmail.com</span>
        <span className="text-white/35">|</span>
        <span>(11) 91518-1075</span>
      </span>

      <span className="text-[13px] text-white/50">
        © 2026 Colégio São José — Fraternidade Sacerdotal São Pio X. Todos os direitos reservados.
      </span>
    </footer>
  );
}
