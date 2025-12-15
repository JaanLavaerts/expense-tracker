
import { db } from '../src/lib/server/db';
import { transactions, keywords, categories } from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
    try {
        console.log('Cleaning up test data...');
        // Clear tables
        await db.delete(transactions);
        await db.delete(keywords);

        // Ensure a category exists
        await db.insert(categories).values({ name: 'TestCat' }).onConflictDoNothing();
        const cats = await db.select().from(categories).limit(1);
        const catId = cats[0].id;

        console.log('Inserting initial transaction...');
        const t1 = {
            date: '2025-01-01',
            amount: 10.00,
            currency: 'EUR',
            counterpartyName: 'Test CP',
            description: 'Test Desc',
            categoryId: catId
        };
        await db.insert(transactions).values(t1);

        console.log('Attempting duplicate insert...');
        await db.insert(transactions).values(t1).onConflictDoNothing();

        const count = await db.select().from(transactions);
        if (count.length === 1) {
            console.log('✅ Transaction duplication prevented.');
        } else {
            console.error('❌ Transaction duplication prevention failed. Count:', count.length);
        }

        console.log('Inserting initial keyword...');
        await db.insert(keywords).values({ keyword: 'TestKey', categoryId: catId });

        console.log('Attempting duplicate keyword insert...');
        await db.insert(keywords).values({ keyword: 'TestKey', categoryId: catId }).onConflictDoNothing();

        const kCount = await db.select().from(keywords);
        if (kCount.length === 1) {
            console.log('✅ Keyword duplication prevented.');
        } else {
            console.error('❌ Keyword duplication prevention failed. Count:', kCount.length);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
