import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const ACC_FROM = 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ';
const ACC_TO   = 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn';
const normNome = (col: string) =>
  `NULLIF(UPPER(TRIM(REGEXP_REPLACE(TRANSLATE(${col}::text, '${ACC_FROM}', '${ACC_TO}'), '\\s+', ' ', 'g'))), '')`;
const normId = (col: string) =>
  `NULLIF(LTRIM(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(${col}::text), '\\.0+$', ''), '[^0-9]', '', 'g'), '0'), '')`;

export async function GET() {
  const client = await pool.connect();
  try {
    await client.query("SET statement_timeout = '25s'");

    const { rows: poDiretorias } = await client.query(
      'SELECT diretoria_3, COUNT(*)::int AS qtd FROM po GROUP BY diretoria_3 ORDER BY qtd DESC LIMIT 30'
    );

    const { rows: match } = await client.query(`
      WITH p AS (
        SELECT ${normId('user_id_ssff')} AS uid, ${normNome('nome')} AS nome_n FROM po
      ),
      a AS (
        SELECT DISTINCT ${normId('matricula_auditor')} AS uid_mat, ${normId('re')} AS uid_re, ${normNome('nome_auditor')} AS nome_n FROM aprs
      )
      SELECT
        (SELECT COUNT(*)::int FROM a) AS pessoas_na_apr,
        (SELECT COUNT(*)::int FROM a WHERE uid_mat IN (SELECT uid FROM p)) AS achadas_por_matricula,
        (SELECT COUNT(*)::int FROM a WHERE uid_re IN (SELECT uid FROM p)) AS achadas_por_re,
        (SELECT COUNT(*)::int FROM a WHERE nome_n IN (SELECT nome_n FROM p)) AS achadas_por_nome,
        (SELECT json_agg(x) FROM (
           SELECT uid_mat, nome_n FROM a
           WHERE uid_mat NOT IN (SELECT uid FROM p WHERE uid IS NOT NULL)
             AND nome_n NOT IN (SELECT nome_n FROM p WHERE nome_n IS NOT NULL)
           LIMIT 15) x) AS exemplos_nao_achados
    `);

    const { rows: poSample } = await client.query(
      'SELECT user_id_ssff, nome, diretoria_3, gestor FROM po ORDER BY id DESC LIMIT 5'
    );
    const { rows: aprSample } = await client.query(
      'SELECT matricula_auditor, re, nome_auditor FROM aprs ORDER BY id DESC LIMIT 5'
    );

    return NextResponse.json({ match: match[0], po_diretorias: poDiretorias, po_sample: poSample, apr_sample: aprSample });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
