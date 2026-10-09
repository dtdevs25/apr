import pool from './src/lib/db.ts';

async function run() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'po';");
  console.log(res.rows);
  
  const res2 = await pool.query("SELECT cargo FROM po LIMIT 5;");
  console.log(res2.rows);
  
  process.exit(0);
}

run();
