import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    // Evita travar o endpoint se o banco estiver ocupado
    await client.query("SET statement_timeout = '20s'");

    const { rows: aprSample } = await client.query(
      'SELECT numero, matricula_auditor, nome_auditor, mes, ano, diretoria_3, gestor FROM aprs ORDER BY id DESC LIMIT 5'
    );
    const { rows: poSample } = await client.query(
      'SELECT user_id_ssff, nome, ano, mes, diretoria_3, gestor FROM po ORDER BY id DESC LIMIT 5'
    );
    const { rows: match } = await client.query(`
      WITH p AS (
        SELECT DISTINCT LTRIM(REGEXP_REPLACE(user_id_ssff::text, '[^0-9]', '', 'g'), '0') AS uid FROM po
      ),
      a AS (
        SELECT DISTINCT LTRIM(REGEXP_REPLACE(matricula_auditor::text, '[^0-9]', '', 'g'), '0') AS uid FROM aprs
      )
      SELECT
        (SELECT COUNT(*) FROM a) AS matriculas_apr,
        (SELECT COUNT(*) FROM a JOIN p USING (uid)) AS matriculas_encontradas_no_po,
        (SELECT json_agg(uid) FROM (SELECT uid FROM a EXCEPT SELECT uid FROM p LIMIT 15) x) AS exemplos_nao_encontrados
    `);

    return NextResponse.json({ match: match[0], apr_sample: aprSample, po_sample: poSample });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
