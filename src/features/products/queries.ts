'use server';

import { db } from '@/lib/db';
import { products, productCategories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getPublishedProducts() {
  try {
    const result = await db.query.products.findMany({
      where: eq(products.isPublished, true),
      with: {
        productCategories: {
          with: {
            categories: true,
          },
        },
      },
    });
    return result;
  } catch (error) {
    console.error('getPublishedProducts error:', error);
    return [];
  }
}

export async function getPublishedRegularProducts() {
  try {
    return await db.query.products.findMany({
      where: and(
        eq(products.isPublished, true),
        eq(products.productType, 'regular')
      ),
      with: {
        productCategories: {
          with: { categories: true },
        },
      },
    });
  } catch (error) {
    console.error('getPublishedRegularProducts error:', error);
    return [];
  }
}

export async function getPublishedScholarshipProducts() {
  try {
    return await db.query.products.findMany({
      where: and(
        eq(products.isPublished, true),
        eq(products.productType, 'scholarship')
      ),
      with: {
        productCategories: {
          with: { categories: true },
        },
      },
    });
  } catch (error) {
    console.error('getPublishedScholarshipProducts error:', error);
    return [];
  }
}

export async function getAllProducts() {
  try {
    const result = await db.query.products.findMany({
      with: {
        productCategories: {
          with: {
            categories: true,
          },
        },
      },
    });
    return result;
  } catch (error) {
    console.error('getAllProducts error:', error);
    return [];
  }
}

export async function getProductById(id: string) {
  try {
    const result = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        productCategories: {
          with: {
            categories: true,
          },
        },
      },
    });
    return result;
  } catch (error) {
    console.error('getProductById error:', error);
    return null;
  }
}

export async function getPublishedProductById(id: string) {
  try {
    const result = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.isPublished, true)),
      with: {
        productCategories: {
          with: {
            categories: true,
          },
        },
      },
    });
    return result;
  } catch (error) {
    console.error('getPublishedProductById error:', error);
    return null;
  }
}

export async function getRegularProductsByCategory(categoryId: string) {
  try {
    const result = await db.query.productCategories.findMany({
      where: eq(productCategories.categoryId, categoryId),
      with: {
        products: {
          with: {
            productCategories: {
              with: { categories: true },
            },
          },
        },
      },
    });

    return result
      .map((pc) => pc.products)
      .filter((p) => p.isPublished && p.productType === 'regular');
  } catch (error) {
    console.error('getRegularProductsByCategory error:', error);
    return [];
  }
}

export async function getProductsByCategory(categoryId: string) {
  try {
    const result = await db.query.productCategories.findMany({
      where: eq(productCategories.categoryId, categoryId),
      with: {
        products: {
          with: {
            productCategories: {
              with: {
                categories: true,
              },
            },
          },
        },
      },
    });

    return result
      .map((pc) => pc.products)
      .filter((p) => p.isPublished);
  } catch (error) {
    console.error('getProductsByCategory error:', error);
    return [];
  }
}

