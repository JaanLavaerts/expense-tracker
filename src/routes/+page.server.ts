import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { categories, transactions, keywords } from '$lib/server/db/schema';
import { parseBankCSV } from '$lib/server/parser';
import { fail } from '@sveltejs/kit';
import { desc, eq, like, and, or, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
    const allTransactions = await db.select().from(transactions).orderBy(desc(transactions.date));
    const allCategories = await db.select().from(categories);
    const allKeywords = await db.select().from(keywords);

    // Attach keywords to categories
    const categoriesWithKeywords = allCategories.map(c => ({
        ...c,
        keywords: allKeywords.filter(k => k.categoryId === c.id)
    }));

    return {
        transactions: allTransactions,
        categories: categoriesWithKeywords
    };
};

export const actions: Actions = {
    upload: async ({ request }) => {
        const data = await request.formData();
        const file = data.get('file') as File;

        if (!file || file.name === 'undefined') {
            return fail(400, { missing: true });
        }

        try {
            const text = await file.text();
            const parsed = parseBankCSV(text);

            // Fetch all keywords for matching
            const allKeywords = await db.select().from(keywords);

            const transactionsToInsert = parsed.map(t => {
                // Find matching category
                // Simple case-insensitive match
                const searchStr = (t.counterpartyName + ' ' + t.description).toLowerCase();
                const match = allKeywords.find(k => searchStr.includes(k.keyword.toLowerCase()));

                return {
                    date: t.date,
                    amount: t.amount,
                    currency: t.currency,
                    counterpartyName: t.counterpartyName,
                    description: t.description,
                    isFallbackDescription: t.isFallbackDescription,
                    categoryId: match ? match.categoryId : null
                };
            });

            // Ingest
            // TODO: optimization - batch insert
            // Check for duplicates? For now just insert.
            for (const t of transactionsToInsert) {
                await db.insert(transactions).values(t).onConflictDoNothing();
            }

            return { success: true, count: parsed.length };
        } catch (err) {
            console.error(err);
            return fail(500, { error: 'Failed to parse or ingest file' });
        }
    },

    createCategory: async ({ request }) => {
        const data = await request.formData();
        const name = data.get('name') as string;

        if (!name) return fail(400, { missing: true });

        try {
            await db.insert(categories).values({ name });
            return { success: true };
        } catch (e) {
            return fail(500, { error: 'Failed to create category' });
        }
    },

    addKeyword: async ({ request }) => {
        const data = await request.formData();
        const keyword = data.get('keyword') as string;
        const categoryIdRaw = data.get('categoryId');
        const categoryId = categoryIdRaw ? parseInt(categoryIdRaw.toString()) : 0;

        if (!keyword || !categoryId) return fail(400, { missing: true });

        try {
            // Check if keyword exists? Drizzle might error on constraint if we had one.
            await db.insert(keywords).values({ keyword, categoryId }).onConflictDoNothing();

            // Retroactive: Apply to existing uncategorized transactions
            await db.update(transactions)
                .set({ categoryId })
                .where(and(
                    isNull(transactions.categoryId),
                    or(
                        like(transactions.description, `%${keyword}%`),
                        like(transactions.counterpartyName, `%${keyword}%`)
                    )
                ));

            return { success: true };
        } catch (e) {
            console.error('Add keyword failed:', e);
            return fail(500, { error: 'Failed to add keyword' });
        }
    },

    updateCategory: async ({ request }) => {
        const data = await request.formData();
        const transactionIdRaw = data.get('transactionId');
        const categoryIdRaw = data.get('categoryId');

        const transactionId = transactionIdRaw ? parseInt(transactionIdRaw.toString()) : 0;
        // If categoryId is empty string, we treat it as null (Uncategorized)
        const categoryId = (categoryIdRaw && categoryIdRaw.toString() !== "")
            ? parseInt(categoryIdRaw.toString())
            : null;

        console.log('Update Category:', { transactionId, categoryId, raw: categoryIdRaw });

        if (!transactionId) return fail(400, { missing: true });

        try {
            // Auto-learn: Add description as keyword if new category is assigned
            if (categoryId) {
                const [transaction] = await db.select().from(transactions).where(eq(transactions.id, transactionId));

                // Determine keyword source: prefer Counterparty Name (Title) as it's cleaner
                // Fallback to description only if counterparty is missing
                const keywordToLearn = transaction?.counterpartyName || transaction?.description;

                if (keywordToLearn) {
                    const [existing] = await db.select()
                        .from(keywords)
                        .where(and(
                            eq(keywords.categoryId, categoryId),
                            eq(keywords.keyword, keywordToLearn)
                        ));

                    if (!existing) {
                        await db.insert(keywords).values({
                            categoryId,
                            keyword: keywordToLearn
                        }).onConflictDoNothing();

                        // Retroactive: Apply to OTHER existing uncategorized transactions
                        await db.update(transactions)
                            .set({ categoryId })
                            .where(and(
                                isNull(transactions.categoryId),
                                or(
                                    like(transactions.description, `%${keywordToLearn}%`),
                                    like(transactions.counterpartyName, `%${keywordToLearn}%`)
                                )
                            ));
                    }
                }
            }

            await db.update(transactions)
                .set({ categoryId })
                .where(eq(transactions.id, transactionId));
            return { success: true };
        } catch (e) {
            console.error('Update failed:', e);
            return fail(500, { error: 'Failed to update category' });
        }
    },

    deleteCategory: async ({ request }) => {
        const data = await request.formData();
        const idRaw = data.get('id');
        const id = idRaw ? parseInt(idRaw.toString()) : 0;

        if (!id) return fail(400, { missing: true });

        try {
            await db.delete(categories).where(eq(categories.id, id));
            return { success: true };
        } catch (e) {
            console.error('Delete category failed:', e);
            return fail(500, { error: 'Failed to delete category' });
        }
    },

    deleteKeyword: async ({ request }) => {
        const data = await request.formData();
        const idRaw = data.get('id');
        const id = idRaw ? parseInt(idRaw.toString()) : 0;

        if (!id) return fail(400, { missing: true });

        try {
            await db.delete(keywords).where(eq(keywords.id, id));
            return { success: true };
        } catch (e) {
            console.error('Delete keyword failed:', e);
            return fail(500, { error: 'Failed to delete keyword' });
        }
    }
};
