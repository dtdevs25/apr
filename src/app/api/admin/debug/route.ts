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
    
    // Simplest queries to avoid hanging
    const { rows: poSample } = await client.query('SELECT user_id_ssff, nome, diretoria_3, gerencia FROM po LIMIT 10');
    const { rows: aprSample } = await client.query('SELECT numero, matricula_auditor, nome_auditor, diretoria, supervisor FROM aprs LIMIT 10');
    
    client.release();

    return NextResponse.json({
      po_samples: poSample,
      apr_samples: aprSample
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}
