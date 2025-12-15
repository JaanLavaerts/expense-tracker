
import { parseBankCSV } from '../src/lib/server/parser';
import fs from 'fs';

// Mock CSV content with empty Mededelingen but filled Transactie
const mockCsv = `Rekening;Boekingsdatum;Rekeninguittrekselnummer;Transactienummer;Rekening tegenpartij;Naam tegenpartij bevat;Straat en nummer;Postcode en plaats;Transactie;Valutadatum;Bedrag;Devies;BIC;Landcode;Mededelingen
BE63 0635 8184 2108;28/11/2025;;;;Counterparty;;3001  LEUVEN;FallbackDescription;28/11/2025;-6,80;EUR;;BE;
BE63 0635 8184 2108;28/11/2025;;;;Counterparty2;;3001  LEUVEN;FallbackDescription2;28/11/2025;-6,80;EUR;;BE;OriginalDescription`;

try {
    const transactions = parseBankCSV(mockCsv);
    console.log('Parsed Transactions Count:', transactions.length);

    if (transactions[0].description === 'FallbackDescription') {
        console.log('✅ Test Passed: Empty Mededelingen fell back to Transactie');
    } else {
        console.error('❌ Test Failed: Expected "FallbackDescription", got', transactions[0].description);
    }

    if (transactions[1].description === 'OriginalDescription') {
        console.log('✅ Test Passed: Non-empty Mededelingen was preserved');
    } else {
        console.error('❌ Test Failed: Expected "OriginalDescription", got', transactions[1].description);
    }

} catch (err) {
    console.error('Error:', err);
}
