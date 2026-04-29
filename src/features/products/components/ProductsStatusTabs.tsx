'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProductGrid } from './ProductGrid';
import type { products } from '@/lib/db/schema';

type Product = typeof products.$inferSelect & {
  productCategories: Array<{
    categories: { id: string; name: string };
  }>;
};

interface ProductsStatusTabsProps {
  pending: Product[];
  achieved: Product[];
  emptyMessageBase?: string;
}

export function ProductsStatusTabs({
  pending,
  achieved,
  emptyMessageBase = 'Nenhum produto disponível',
}: ProductsStatusTabsProps) {
  const triggerClass =
    'flex-1 sm:flex-none text-[14px] font-medium data-[state=active]:bg-[#1E3D59] data-[state=active]:text-[#F8F6F1] data-[state=active]:shadow';

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="bg-[#E5DFD4] border border-[#C5A572] h-auto p-1 rounded-full">
        <TabsTrigger value="pending" className={`${triggerClass} rounded-full px-5 py-2`}>
          Pendentes
          <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[20px] rounded-full bg-[#FBF3E2] border border-[#E2C97E] text-[#8A6A1A] text-[11px] font-semibold px-1.5">
            {pending.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="achieved" className={`${triggerClass} rounded-full px-5 py-2`}>
          Atingidos
          <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[20px] rounded-full bg-[#EDF6EE] border border-[#9BC9A4] text-[#2D6A3F] text-[11px] font-semibold px-1.5">
            {achieved.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-6">
        <ProductGrid
          products={pending}
          emptyMessage={`${emptyMessageBase} pendente.`}
        />
      </TabsContent>

      <TabsContent value="achieved" className="mt-6">
        <ProductGrid
          products={achieved}
          emptyMessage={`${emptyMessageBase} atingido.`}
        />
      </TabsContent>
    </Tabs>
  );
}
