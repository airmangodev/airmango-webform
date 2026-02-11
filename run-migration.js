const { Client } = require('pg');
const fs = require('fs');

const POSTGRES_URL = 'postgresql://postgres.fjzrixjgqdpyplkgqvyp:Airmango0202!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString: POSTGRES_URL,
});

async function run() {
    try {
        await client.connect();
        const sql = fs.readFileSync('update-schema-dashboard.sql', 'utf8');
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
