import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const donationTypeEnum = pgEnum('donation_type', ['monetary', 'physical']);
export const donationModeEnum = pgEnum('donation_mode', ['monetary', 'physical', 'both']);

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  targetAmount: integer('target_amount'), // BRL cents
  currentAmount: integer('current_amount').default(0).notNull(), // denormalized, BRL cents
  isFulfilled: boolean('is_fulfilled').default(false).notNull(),
  isPublished: boolean('is_published').default(true).notNull(),
  imagePath: text('image_path'), // Supabase Storage path for product photo
  donationMode: donationModeEnum('donation_mode').notNull().default('both'), // 'monetary', 'physical', or 'both'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.categoryId] }),
  })
);

export const donations = pgTable('donations', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  donationType: donationTypeEnum('donation_type').notNull(),
  amount: integer('amount'), // BRL cents, null for physical
  donorName: text('donor_name'), // optional for monetary, required for physical
  donorPhone: text('donor_phone'), // required for physical
  donorEmail: text('donor_email'), // optional
  receiptPath: text('receipt_path'), // Supabase Storage path, monetary only
  isVerified: boolean('is_verified').default(false).notNull(), // financial team verification flag
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pixSettings = pgTable('pix_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  qrCodeImagePath: text('qr_code_image_path'), // Supabase Storage path
  copiaEColaCode: text('copia_e_cola_code'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const fundTransfers = pgTable(
  'fund_transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceProductId: uuid('source_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    targetProductId: uuid('target_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    amount: integer('amount').notNull(), // BRL cents
    adminUsername: text('admin_username').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index('fund_transfers_created_at_idx').on(t.createdAt),
    sourceProductIdIdx: index('fund_transfers_source_product_id_idx').on(
      t.sourceProductId
    ),
    targetProductIdIdx: index('fund_transfers_target_product_id_idx').on(
      t.targetProductId
    ),
  })
);

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  productCategories: many(productCategories),
  donations: many(donations),
  fundTransfersAsSource: many(fundTransfers, {
    relationName: 'sourceProduct',
  }),
  fundTransfersAsTarget: many(fundTransfers, {
    relationName: 'targetProduct',
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  productCategories: many(productCategories),
}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ one }) => ({
    products: one(products, {
      fields: [productCategories.productId],
      references: [products.id],
    }),
    categories: one(categories, {
      fields: [productCategories.categoryId],
      references: [categories.id],
    }),
  })
);

export const donationsRelations = relations(donations, ({ one }) => ({
  products: one(products, {
    fields: [donations.productId],
    references: [products.id],
  }),
}));

export const fundTransfersRelations = relations(fundTransfers, ({ one }) => ({
  sourceProduct: one(products, {
    fields: [fundTransfers.sourceProductId],
    references: [products.id],
    relationName: 'sourceProduct',
  }),
  targetProduct: one(products, {
    fields: [fundTransfers.targetProductId],
    references: [products.id],
    relationName: 'targetProduct',
  }),
}));
