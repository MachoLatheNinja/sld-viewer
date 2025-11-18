// test-direct.js (use the "Connection string" from Supabase dashboard)
const { Client } = require('pg');

(async () => {
  const c = new Client({
    connectionString: 'postgresql://postgres:L1z2n%24us3CRfB@db.ldphjeanlyhhntlcwrtt.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: true } // prefer true
  });
  try {
    await c.connect();
    const r = await c.query('SELECT version()');
    console.log('ok', r.rows);
    await c.end();
  } catch (e) {
    console.error('err', e);
    process.exit(1);
  }
})();
