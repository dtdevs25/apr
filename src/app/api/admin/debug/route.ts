import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1
  });

  try {
    const client = await pool.connect();
    
    // Sample PO entries with non-null user_id_ssff
    const { rows: poSample } = await client.query('SELECT user_id_ssff, nome, diretoria_3, gerencia FROM po WHERE user_id_ssff IS NOT NULL LIMIT 10');
    
    // Sample APR entries with non-null matricula_auditor
    const { rows: aprSample } = await client.query('SELECT numero, matricula_auditor, nome_auditor, diretoria, supervisor FROM aprs WHERE matricula_auditor IS NOT NULL LIMIT 10');
    
    // How many total PO rows
    const { rows: poCount } = await client.query('SELECT COUNT(*) FROM po');
    
    // How many total APR rows
    const { rows: aprCount } = await client.query('SELECT COUNT(*) FROM aprs');

    // How many APR rows have non-null diretoria (meaning they successfully matched in the JS layer)
    const { rows: aprMatchedCount } = await client.query('SELECT COUNT(*) FROM aprs WHERE diretoria IS NOT NULL OR supervisor IS NOT NULL');
    
    client.release();

    return NextResponse.json({
      po_total_count: poCount[0].count,
      apr_total_count: aprCount[0].count,
      apr_matched_count: aprMatchedCount[0].count,
      po_samples: poSample,
      apr_samples: aprSample
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}
