const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const dbUrl = env.match(/DATABASE_URL=([^\n]+)/)[1].trim();

const { Pool } = require('pg');
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  try {
    const res1 = await pool.query("SELECT lider, base, localidade FROM dss WHERE lider ILIKE '%Robson%' LIMIT 5");
    console.log('DSS Robson:', res1.rows);
    
    const res2 = await pool.query("SELECT nome, diretoria_3, cidade_comercial FROM po WHERE nome ILIKE '%Robson%' LIMIT 5");
    console.log('PO Robson:', res2.rows);

    const res3 = await pool.query("SELECT DISTINCT cidade_comercial FROM po WHERE cidade_comercial ILIKE '%Campinas%' LIMIT 5");
    console.log('PO Campinas:', res3.rows);

  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
