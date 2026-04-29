import Link from 'next/link';
import {
  getPublishedRegularProducts,
  getPublishedScholarshipProducts,
  getRegularProductsByCategory,
} from '@/features/products/queries';
import { getCategories } from '@/features/categories/queries';
import { ProductGrid } from '@/features/products/components/ProductGrid';
import { ProductsStatusTabs } from '@/features/products/components/ProductsStatusTabs';
import { PublicNav } from './components/PublicNav';
import { PublicFooter } from './components/PublicFooter';
import type { products as productsTable } from '@/lib/db/schema';

type Product = typeof productsTable.$inferSelect & {
  productCategories: Array<{
    categories: { id: string; name: string };
  }>;
};

interface CatalogPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { category: categoryId } = await searchParams;

  const [categories, regularProducts, scholarshipProducts] = await Promise.all([
    getCategories(),
    categoryId
      ? getRegularProductsByCategory(categoryId)
      : getPublishedRegularProducts(),
    getPublishedScholarshipProducts(),
  ]);

  const isGoalReached = (p: Product) =>
    p.isFulfilled || (p.targetAmount != null && p.currentAmount >= p.targetAmount);

  const splitByStatus = (items: Product[]) => {
    const pending: Product[] = [];
    const achieved: Product[] = [];
    for (const p of items) {
      (isGoalReached(p) ? achieved : pending).push(p);
    }
    return { pending, achieved };
  };

  const regular = splitByStatus(regularProducts);
  const scholarship = splitByStatus(scholarshipProducts);

  return (
    <>
      <PublicNav />

      <main className="max-w-[960px] mx-auto px-4 md:px-8 pb-20">

        {/* ── Mensagem ─────────────────────────────── */}
        <section
          id="mensagem"
          className="relative scroll-mt-[188px] pt-9 pb-10 border-b border-[#D4C4A8] overflow-hidden"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[510px] opacity-[0.06] pointer-events-none" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-fsspx.png" alt="" className="w-full h-full object-contain" />
          </div>

          <h2 className="font-serif font-bold text-[28px] leading-[34px] text-[#B8952E] mb-5">
            Mensagem
          </h2>

          <div className="relative flex flex-col gap-[14px]">
            <p className="text-[16px] leading-[1.7] text-[#3D4F5F] m-0">
              O nosso Colégio São José, finalmente nasceu e recorre à sua generosidade.
            </p>

            <p className="text-[16px] leading-[1.7] text-[#3D4F5F] m-0">
              Somos como uma grande família: &ldquo;em seus inícios, enfrenta muitos desafios, com
              grandes esforços e gastos, até alcançar a estabilidade, quando os irmãos mais velhos
              já podem ajudar os mais novos.&rdquo; Desde já, agradecemos sua liberalidade, pois dela
              depende o futuro de nossas crianças, o crescimento de nossa Fraternidade e a esperança
              do nosso Brasil.
            </p>

            <div className="rounded-tr-[8px] rounded-br-[8px] py-3 px-5 bg-[#E8EEF4] border-l-[3px] border-l-[#B8952E]">
              <p className="font-serif font-normal italic text-[15px] leading-[1.65] text-[#1E3D59] m-0">
                &ldquo;Há quem dá liberalmente e se torna mais rico; há quem retém mais do que é justo e
                acaba na pobreza.&rdquo;
              </p>
              <cite className="block mt-2 text-[13px] text-[#6B7D8E] not-italic leading-[16px]">
                Provérbios 11:24
              </cite>
            </div>

            <p className="text-[16px] leading-[1.7] text-[#3D4F5F] m-0">
              Aqui encontrarão gastos e objetos concretos que necessitamos. Podem ajudar em
              dinheiro ou com o bem físico.
            </p>

            <div className="pt-[6px]">
              <p className="text-[15px] leading-[18px] text-[#3D4F5F] m-0">
                Muito obrigado — Que Deus os abençoe
              </p>
              <p className="font-serif font-semibold text-[15px] leading-[18px] text-[#1E3D59] mt-1">
                Pe. João Maria Ferreira da Costa, FSSPX
              </p>
              <p className="font-serif font-semibold text-[15px] leading-[18px] text-[#1E3D59] mt-0">
                Diretor do Colégio
              </p>
            </div>
          </div>
        </section>

        {/* ── Bolsas de Estudo ─────────────────────────────── */}
        {scholarshipProducts.length > 0 && (
          <section
            id="bolsas"
            className="scroll-mt-[188px] pt-10 pb-2"
          >
            <div className="rounded-[14px] border border-[#C5A572] bg-gradient-to-br from-[#FBF6EC] to-[#F5EDDB] p-7 md:p-8">
              <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-2 px-3 py-[3px] rounded-full bg-[#1E3D59] text-[#F8F6F1] text-[11px] uppercase tracking-[1.4px]">
                  Destaque
                </span>
                <h2 className="font-serif font-bold text-[28px] leading-[34px] text-[#1E3D59]">
                  Bolsas de Estudo
                </h2>
                <span className="text-[13px] text-[#6B7D8E]">
                  {scholarshipProducts.length}{' '}
                  {scholarshipProducts.length === 1 ? 'bolsa' : 'bolsas'} disponível(is)
                </span>
              </div>
              <p className="text-[15px] leading-[1.6] text-[#3D4F5F] mb-6 max-w-3xl">
                Sua contribuição garante a permanência de alunos no colégio. Apoie diretamente a
                formação de uma criança.
              </p>

              {scholarship.pending.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[12px] uppercase tracking-[1.4px] text-[#8A6A1A] mb-3">
                    Em campanha
                  </h3>
                  <ProductGrid
                    products={scholarship.pending}
                    emptyMessage="Nenhuma bolsa em campanha."
                  />
                </div>
              )}

              {scholarship.achieved.length > 0 && (
                <div>
                  <h3 className="text-[12px] uppercase tracking-[1.4px] text-[#2D6A3F] mb-3">
                    Bolsas já contempladas
                  </h3>
                  <ProductGrid
                    products={scholarship.achieved}
                    emptyMessage=""
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Produtos ─────────────────────────────── */}
        <section id="doacoes" className="scroll-mt-[188px] pt-10">
          <div className="flex items-baseline gap-[14px] mb-5 flex-wrap">
            <h2 className="font-serif font-bold text-[28px] leading-[34px] text-[#B8952E]">
              Itens para doação
            </h2>
            <span className="text-[13px] text-[#6B7D8E]">
              {regularProducts.length}{' '}
              {regularProducts.length === 1 ? 'item disponível' : 'itens disponíveis'}
            </span>
          </div>

          {categories.length > 0 && (
            <div className="mb-7">
              <span className="block text-[11px] uppercase tracking-[1.4px] text-[#8A7A5C] mb-3">
                Filtrar por categoria
              </span>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/#doacoes"
                  className={`rounded-full py-2 px-5 text-[14px] transition-colors cursor-pointer ${
                    !categoryId
                      ? 'bg-[#1E3D59] text-[#F8F6F1]'
                      : 'bg-[#E5DFD4] border border-[#C5A572] text-[#3D4F5F] hover:bg-[#D4C4A8]'
                  }`}
                >
                  Todas
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/?category=${cat.id}#doacoes`}
                    className={`rounded-full py-2 px-5 text-[14px] transition-colors cursor-pointer ${
                      categoryId === cat.id
                        ? 'bg-[#1E3D59] text-[#F8F6F1]'
                        : 'bg-[#E5DFD4] border border-[#C5A572] text-[#3D4F5F] hover:bg-[#D4C4A8]'
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {regularProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {categoryId
                  ? 'Nenhum produto encontrado nesta categoria.'
                  : 'Nenhum produto disponível no momento.'}
              </p>
            </div>
          ) : (
            <ProductsStatusTabs
              pending={regular.pending}
              achieved={regular.achieved}
              emptyMessageBase={
                categoryId
                  ? 'Nenhum produto nesta categoria'
                  : 'Nenhum produto'
              }
            />
          )}
        </section>

      </main>

      <PublicFooter />
    </>
  );
}
