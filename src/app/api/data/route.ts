import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Cruzamento APR x Plano de Ocupações, SEM considerar data:
    // acha a pessoa no PO pela Matrícula Auditor, pelo RE ou pelo nome. Achou -> usa diretoria, supervisor etc. do PO.
    const ACC_FROM = 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ';
    const ACC_TO   = 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn';
    const normNome = (col: string) =>
      `NULLIF(UPPER(TRIM(REGEXP_REPLACE(TRANSLATE(${col}::text, '${ACC_FROM}', '${ACC_TO}'), '\\s+', ' ', 'g'))), '')`;
    const normId = (col: string) =>
      `NULLIF(LTRIM(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(${col}::text), '\\.0+$', ''), '[^0-9]', '', 'g'), '0'), '')`;

    const { rows } = await pool.query(`
      WITH po_norm AS (
        SELECT id,
          ${normId('user_id_ssff')} AS uid,
          ${normNome('nome')} AS nome_n,
          diretoria_3, gerencia, gestor, cidade_comercial, uf_comercial
        FROM po
      ),
      po_by_id AS (
        SELECT DISTINCT ON (uid) * FROM po_norm WHERE uid IS NOT NULL ORDER BY uid, id DESC
      ),
      po_by_nome AS (
        SELECT DISTINCT ON (nome_n) * FROM po_norm WHERE nome_n IS NOT NULL ORDER BY nome_n, id DESC
      ),
      a AS (
        SELECT aprs.*,
          ${normId('matricula_auditor')} AS uid_mat,
          ${normId('re')} AS uid_re,
          ${normNome('nome_auditor')} AS nome_n
        FROM aprs
      )
      SELECT 
        a.numero AS "Número",
        a.data_checklist AS "Data Checklist",
        a.data_inicio AS "Data Início",
        a.data_fim AS "Data Fim",
        a.duracao AS "Duração",
        a.situacao AS "Situação",
        a.matricula_auditor AS "Matrícula Auditor",
        a.nome_auditor AS "Nome Auditor",
        a.localidade_objeto AS "Localidade Objeto",
        a.questionario AS "Questionário",
        a.re AS "RE",
        COALESCE(p1.cidade_comercial, p2.cidade_comercial, p3.cidade_comercial, a.cidade_comercial) AS "CIDADE COMERCIAL",
        COALESCE(p1.uf_comercial, p2.uf_comercial, p3.uf_comercial, a.uf_comercial) AS "UF COMERCIAL",
        COALESCE(p1.diretoria_3, p2.diretoria_3, p3.diretoria_3, a.diretoria_3) AS "DIRETORIA 3",
        COALESCE(p1.gerencia, p2.gerencia, p3.gerencia, a.gerencia) AS "GERÊNCIA",
        COALESCE(p1.gestor, p2.gestor, p3.gestor, a.gestor) AS "GESTOR",
        COALESCE(p1.gestor, p2.gestor, p3.gestor, a.gestor) AS "Supervisor",
        a.mes AS "Mês",
        a.ano AS "Ano"
      FROM a
      LEFT JOIN po_by_id   p1 ON p1.uid = a.uid_mat
      LEFT JOIN po_by_id   p2 ON p2.uid = a.uid_re
      LEFT JOIN po_by_nome p3 ON p3.nome_n = a.nome_n
      ORDER BY a.data_inicio DESC
    `);
    
    // Converte datas para string no formato correto
    const formattedData = rows.map(r => {
      const formatData = (d: Date | null) => {
        if (!d) return null;
        // Se já for string (dependendo de como o pg retorna), usa direto
        if (typeof d === 'string') return d;
        // Retorna YYYY-MM-DD HH:mm:ss
        const p = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      };
      
      return {
        ...r,
        "Data Checklist": formatData(r["Data Checklist"]),
        "Data Início": formatData(r["Data Início"]),
        "Data Fim": formatData(r["Data Fim"])
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Erro ao carregar dados do banco:", error);
    return NextResponse.json({ error: 'Failed to load data from db' }, { status: 500 });
  }
}
