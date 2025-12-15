import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
});

export const keywords = sqliteTable('keywords', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    keyword: text('keyword').notNull().unique(),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
});

export const transactions = sqliteTable('transactions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(), // ISO YYYY-MM-DD
    amount: real('amount').notNull(), // Amount in EUR
    currency: text('currency').default('EUR'),
    counterpartyName: text('counterparty_name'),
    description: text('description'),
    isFallbackDescription: integer('is_fallback_description', { mode: 'boolean' }).default(false),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
}, (t) => ({
    unq: unique().on(t.date, t.amount, t.currency, t.counterpartyName, t.description)
}));
