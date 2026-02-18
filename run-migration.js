const { Client } = require('pg');
const fs = require('fs');

// Try Direct Connection (Port 5432) to avoid Pooler issues
const POSTGRES_URL = 'postgresql://postgres.fjzrixjgqdpyplkgqvyp:Airmango0202!@db.fjzrixjgqdpyplkgqvyp.supabase.co:5432/postgres';

const client = new Client({
    connectionString: POSTGRES_URL,
});

async function run() {
    try {
        const fileName = process.argv[2] || 'update-schema-dashboard.sql';
        console.log(`Reading migration file: ${fileName}`);

        await client.connect();
        const sql = fs.readFileSync(fileName, 'utf8');
        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
