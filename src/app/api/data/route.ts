import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || 'APR';
    let rows;
    
    if (type === 'DSS') {
      try {
        const ACC_FROM = 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ';
        const ACC_TO   = 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn';
        const normNome = (col: string) =>
          `NULLIF(UPPER(TRIM(REGEXP_REPLACE(TRANSLATE(${col}::text, '${ACC_FROM}', '${ACC_TO}'), '\\s+', ' ', 'g'))), '')`;
        const normId = (col: string) =>
          `NULLIF(LTRIM(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(${col}::text), '\\.0+$', ''), '[^0-9]', '', 'g'), '0'), '')`;

        const res = await pool.query(`
          WITH po_norm AS (
            SELECT id,
              ${normNome('nome')} AS nome_n,
              diretoria_3, gerencia, gestor, cidade_comercial, uf_comercial
            FROM po
          ),
          po_by_nome AS (
            SELECT DISTINCT ON (nome_n) * FROM po_norm WHERE nome_n IS NOT NULL ORDER BY nome_n, id DESC
          ),
          po_by_cidade AS (
            SELECT DISTINCT ON (cidade_norm) *,
              TRIM(REGEXP_REPLACE(${normNome('cidade_comercial')}, '^SP\\s+', '')) AS cidade_norm
            FROM po_norm WHERE cidade_comercial IS NOT NULL ORDER BY cidade_norm, id DESC
          ),
          d_norm AS (
            SELECT dss.*,
              ${normNome('lider')} AS lider_n,
              TRIM(REGEXP_REPLACE(${normNome('localidade')}, '^SP\\s+', '')) AS localidade_norm
            FROM dss
          )
          SELECT 
            d.assunto AS "Assunto",
            d.numero_dialogo AS "Número do Diálogo",
            d.lider AS "Líder",
            d.base AS "Base",
            d.uf AS "UF",
            d.localidade AS "Localidade",
            d.data_fechamento AS "Data Fechamento",
            d.matricula AS "Matrícula",
            d.nome AS "Nome",
            d.tipo AS "Tipo",
            d.status AS "Status",
            d.assinado AS "Assinado",
            d.justificativa AS "Justificativa",
            d.mes AS "Mês",
            d.ano AS "Ano",
            COALESCE(p3.diretoria_3, pc.diretoria_3, d.base) AS "DIRETORIA 3",
            p3.gestor AS "Gestor",
            d.lider AS "Lider",
            COALESCE(p3.cidade_comercial, pc.cidade_comercial, d.localidade) AS "CIDADE COMERCIAL"
          FROM d_norm d
          LEFT JOIN po_by_nome p3 ON p3.nome_n = d.lider_n
          LEFT JOIN po_by_cidade pc ON pc.cidade_norm = d.localidade_norm
          ORDER BY d.data_fechamento DESC
        `);
        rows = res.rows;
      } catch (err: any) {
        if (err.code === '42P01') {
          // Tabela não existe ainda
          return NextResponse.json([]);
        }
        throw err;
      }
    } else {
      // Para APR:
    try {
      const res = await pool.query(`SELECT * FROM mv_apr_data ORDER BY "Data Início" DESC`);
      rows = res.rows;
    } catch (err: any) {
      if (err.code === '42P01') {
        // Fallback caso a Materialized View não exista
        const ACC_FROM = 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ';
        const ACC_TO   = 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn';
        const normNome = (col: string) =>
          `NULLIF(UPPER(TRIM(REGEXP_REPLACE(TRANSLATE(${col}::text, '${ACC_FROM}', '${ACC_TO}'), '\\s+', ' ', 'g'))), '')`;
        const normId = (col: string) =>
          `NULLIF(LTRIM(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(${col}::text), '\\.0+$', ''), '[^0-9]', '', 'g'), '0'), '')`;

        const res = await pool.query(`
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
        rows = res.rows;
      } else {
        throw err;
      }
    }
    }
    // Converte datas para string no formato correto
    const formattedData = rows.map(r => {
      const formatData = (d: Date | null) => {
        if (!d) return null;
        if (typeof d === 'string') return d;
        const p = (n: number) => n.toString().padStart(2, '0');
        return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      };
      
      if (type === 'DSS') {
        return {
          ...r,
          "Data Fechamento": formatData(r["Data Fechamento"])
        };
      }

      return {
        ...r,
        "Data Checklist": formatData(r["Data Checklist"]),
        "Data Início": formatData(r["Data Início"]),
        "Data Fim": formatData(r["Data Fim"])
      };
    });

    const ALLOWED_DIRETORIAS = [
      'DIR ENGENHARIA TRANSPORTE E INFRA',
      'DIR EXPERIENCIA COLABORADOR',
      'DIR SERVICOS AO CLIENTE SP CAPITAL',
      'DIR SERVICOS AO CLIENTE SP INTERIOR'
    ];

    const finalData = formattedData.filter(r => {
      const dir = (r["DIRETORIA 3"] || '').toString().trim().toUpperCase();
      return ALLOWED_DIRETORIAS.includes(dir);
    });

    return NextResponse.json(finalData);
  } catch (error) {
    console.error("Erro ao carregar dados do banco:", error);
    return NextResponse.json([], { status: 500 });
  }
}
