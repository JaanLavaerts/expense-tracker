export interface ParsedTransaction {
    date: string;
    amount: number;
    currency: string;
    counterpartyName: string;
    description: string;
    isFallbackDescription: boolean;
    raw: any;
}

/**
 * Parses the Belgian bank CSV format.
 * Format quirks:
 * - Header is not on line 1. Line 13 starts with "Rekening;Boekingsdatum;..."
 * - Columns: 
 *   - Boekingsdatum (DD/MM/YYYY)
 *   - Naam tegenpartij bevat
 *   - Bedrag (comma decimal "4.507,21" or "-6,80")
 *   - Mededelingen (includes transaction type usually)
 */
export function parseBankCSV(fileContent: string): ParsedTransaction[] {
    const lines = fileContent.split('\n');
    const transactions: ParsedTransaction[] = [];

    let headerIndex = -1;
    // Find header line
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Rekening;Boekingsdatum;Rekeninguittrekselnummer')) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
        throw new Error('Could not find CSV header row starting with "Rekening;Boekingsdatum"');
    }

    const header = lines[headerIndex].split(';');
    // Indices mapping
    const idxDate = header.indexOf('Boekingsdatum');
    const idxAmount = header.indexOf('Bedrag');
    const idxCurrency = header.indexOf('Devies');
    const idxName = header.indexOf('Naam tegenpartij bevat');
    const idxDesc = header.indexOf('Mededelingen'); // Or 'Transactie'? Mededelingen seems more detailed but Transactie has type.
    const idxTransaction = header.indexOf('Transactie');

    // Let's look at the sample:
    // 13: Rekening;Boekingsdatum;...;Transactie;...;Bedrag;Devies;...;Mededelingen
    // date: 28/11/2025
    // amount: -6,80

    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(';');
        if (cols.length < header.length) continue; // Skip malformed lines

        const dateStr = cols[idxDate];
        if (!dateStr) continue;

        // Parse Date DD/MM/YYYY -> YYYY-MM-DD
        const [day, month, year] = dateStr.split('/');
        const isoDate = `${year}-${month}-${day}`;

        // Parse Amount "-6,80" -> -6.80
        // Remove dots (thousands), replace comma with dot
        let amountStr = cols[idxAmount];
        // Example "4.507,21" -> "4507.21"
        // Example "-6,80" -> "-6.80"
        amountStr = amountStr.replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(amountStr);

        const currency = cols[idxCurrency] || 'EUR';
        const counterpartyName = cols[idxName] || '';
        let description = cols[idxDesc] || '';
        let isFallbackDescription = false;

        // Fallback to Transactie if description is empty
        if (!description && idxTransaction !== -1) {
            description = cols[idxTransaction] || '';
            if (description) {
                isFallbackDescription = true;
            }
        }

        transactions.push({
            date: isoDate,
            amount,
            currency,
            counterpartyName,
            description,
            isFallbackDescription,
            raw: cols
        });
    }

    return transactions;
}
