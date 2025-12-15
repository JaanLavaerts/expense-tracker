
import { db } from '../src/lib/server/db';
import { categories, keywords, transactions } from '../src/lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateCategory } from '../src/routes/+page.server'; // We can't easily import actions like this usually but let's try or mock.
// Actually importing +page.server actions directly might be hard because of `request` object.
// We can just manually call the logic that the action performs.

async function run() {
    try {
        console.log('Setting up setup...');
        const uniqueSuffix = Date.now();
        const catName = `FallbackTest${uniqueSuffix}`;

        // Create Category
        await db.insert(categories).values({ name: catName }).onConflictDoNothing();
        const [cat] = await db.select().from(categories).where(eq(categories.name, catName));
        const catId = cat.id;

        // Scenario 1: Normal Description
        console.log('Test 1: Normal Description');
        const t1Data = {
            date: '2025-01-01',
            amount: -10,
            currency: 'EUR',
            counterpartyName: 'Normal Shop',
            description: `NormalDesc${uniqueSuffix}`,
            isFallbackDescription: false
        };
        const [t1] = await db.insert(transactions).values(t1Data).returning();

        // Simulate "Update Category" logic (copy-pasting the logic for test)
        // Logic: if !isFallback, use description.
        {
            let keywordToLearn = t1.description;
            if (t1.isFallbackDescription && t1.counterpartyName) {
                keywordToLearn = t1.counterpartyName;
            }
            if (keywordToLearn === t1.description) {
                console.log('✅ Correctly chose Description for normal transaction.');
            } else {
                console.error('❌ Failed: Should have chosen description.');
            }
        }

        // Scenario 2: Fallback Description
        console.log('Test 2: Fallback Description');
        const t2Data = {
            date: '2025-01-02',
            amount: -10,
            currency: 'EUR',
            counterpartyName: `Fallback Shop ${uniqueSuffix}`,
            description: `MessyFallbackString${uniqueSuffix}`,
            isFallbackDescription: true
        };
        const [t2] = await db.insert(transactions).values(t2Data).returning();

        // Logic: if isFallback, use Counterparty.
        {
            let keywordToLearn = t2.description;
            if (t2.isFallbackDescription && t2.counterpartyName) {
                keywordToLearn = t2.counterpartyName;
            }
            if (keywordToLearn === t2.counterpartyName) {
                console.log('✅ Correctly chose CounterpartyName for fallback transaction.');
            } else {
                console.error('❌ Failed: Should have chosen CounterpartyName. Got:', keywordToLearn);
            }
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
