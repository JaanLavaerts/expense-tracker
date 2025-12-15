
import { db } from '../src/lib/server/db/index.ts';
import { categories, transactions, keywords } from '../src/lib/server/db/schema.ts';
import { eq, and } from 'drizzle-orm';

async function testKeywordLogic() {
    console.log('--- Starting Keyword Logic Test ---');

    // 1. Setup: Create a transaction with a fallback description
    // Simulating a case where "Mededeling" was empty, so "Transactie" (e.g. "Overschrijving") was used.
    const TEST_DESC = "Specific Transaction Type";
    const TEST_COUNTERPARTY = "Test Counterparty";

    // Cleanup previous test runs
    await db.delete(transactions).where(eq(transactions.description, TEST_DESC));
    await db.delete(categories).where(eq(categories.name, "Test Category"));

    const [cat] = await db.insert(categories).values({ name: "Test Category" }).returning();
    const [insertedTx] = await db.insert(transactions).values({
        date: '2025-01-01',
        amount: -10.00,
        currency: 'EUR',
        counterpartyName: TEST_COUNTERPARTY,
        description: TEST_DESC,
        isFallbackDescription: true, // This flag triggers the special logic we want to change
        categoryId: null
    }).returning();

    console.log('Inserted Transaction:', insertedTx);

    // 2. Simulate "Update Category" action
    // We will replicate the logic inside the updateCategory action to test it, 
    // or we could just run the code if we extracted it. 
    // Since we can't easily call the action directly without a Request object, 
    // I will primarily use this script to verify the DB state AFTER I make the code changes and use the UI,
    // OR I can copy-paste the logic here to "unit test" it before applying.

    // Let's implement the "Old Logic" simulation to confirm it behaves as expected (using Counterparty)
    // vs "New Logic" (using Description).

    // OLD LOGIC (Mental Check):
    // if (isFallbackDescription && counterpartyName) -> Use counterpartyName

    // NEW LOGIC (Goal):
    // ALWAYS use Counterparty Name (Title) if available.
    // So for the transaction with "Specific Transaction Type" (Description) and "Test Counterparty",
    // we expect "Test Counterparty" to be added as the keyword.

    console.log('--- Please perform the validation via the UI or by checking the code logic directly. ---');
    console.log('Setup complete. Please verify in UI:');
    console.log('1. Transaction "Test Counterparty" should show "Test Counterparty" as Title/Counterparty in popup.');
    console.log('2. Assigning category should add "Test Counterparty" as keyword, NOT "Specific Transaction Type".');
}

testKeywordLogic().catch(console.error);
