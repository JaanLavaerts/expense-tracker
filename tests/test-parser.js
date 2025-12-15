
import { parseBankCSV } from '../src/lib/server/parser.js';
import fs from 'fs';

const csvPath = '/Users/jaan/dev/expense-tracker/data/BE63 0635 8184 2108 2025-12-15 21-24-56 1.csv';

try {
    const content = fs.readFileSync(csvPath, 'utf-8');
    console.log('File read successfully. Length:', content.length);

    const transactions = parseBankCSV(content);
    console.log('Parsed Transactions Count:', transactions.length);

    if (transactions.length > 0) {
        console.log('First Transaction:', JSON.stringify(transactions[0], null, 2));
    } else {
        console.error('No transactions found!');
    }
} catch (err) {
    console.error('Error:', err);
}
