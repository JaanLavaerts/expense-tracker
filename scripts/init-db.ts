
import { execSync } from 'child_process';
import fs from 'fs';

const dbFile = 'sqlite.db';

if (fs.existsSync(dbFile)) {
    console.log(`Database file ${dbFile} already exists.`);
    // Optional: backup or delete? For init script usually we might want to start fresh or just push.
    // Let's just push schema.
} else {
    console.log(`Creating database file ${dbFile}...`);
    fs.writeFileSync(dbFile, '');
}

console.log('Pushing schema to database...');
try {
    execSync('npx drizzle-kit push', { stdio: 'inherit' });
    console.log('Database initialized successfully.');
} catch (error) {
    console.error('Failed to initialize database.', error);
    process.exit(1);
}
