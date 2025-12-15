
import { db } from '../src/lib/server/db';
import { categories, keywords } from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
    try {
        console.log('Setting up test data...');
        const uniqueSuffix = Date.now();
        const catName = `DeleteTest${uniqueSuffix}`;
        const keyName = `Key${uniqueSuffix}`;

        // Create Category
        await db.insert(categories).values({ name: catName }).onConflictDoNothing();
        const [cat] = await db.select().from(categories).where(eq(categories.name, catName));

        if (!cat) throw new Error('Failed to create test category');
        console.log('Created category ID:', cat.id);

        // Create Keyword
        await db.insert(keywords).values({ categoryId: cat.id, keyword: keyName }).onConflictDoNothing();
        const [key] = await db.select().from(keywords).where(eq(keywords.keyword, keyName));

        if (!key) throw new Error('Failed to create test keyword');
        console.log('Created keyword ID:', key.id);

        // Verify Deletion of Keyword
        console.log('Deleting keyword...');
        await db.delete(keywords).where(eq(keywords.id, key.id));
        const checkKey = await db.select().from(keywords).where(eq(keywords.id, key.id));
        if (checkKey.length === 0) {
            console.log('✅ Keyword deletion successful.');
        } else {
            console.error('❌ Keyword deletion failed.');
        }

        // Verify Deletion of Category
        console.log('Deleting category...');
        await db.delete(categories).where(eq(categories.id, cat.id));
        const checkCat = await db.select().from(categories).where(eq(categories.id, cat.id));
        if (checkCat.length === 0) {
            console.log('✅ Category deletion successful.');
        } else {
            console.error('❌ Category deletion failed.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
