import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Cruzamento APR x Plano de Ocupações feito direto no SQL:
    // 1) tenta o PO do mesmo mês/ano da APR; 2) senão, o PO mais recente da matrícula; 3) senão, o que veio na APR.
    const { rows } = await pool.query(`
      WITH po_norm AS (
        SELECT
          id, ano, UPPER(TRIM(mes)) AS mes,
          LTRIM(REGEXP_REPLACE(user_id_ssff::text, '[^0-9]', '', 'g'), '0') AS uid,
          diretoria_3, gerencia, gestor, cidade_comercial, uf_comercial
        FROM po
        WHERE user_id_ssff IS NOT NULL
      ),
      po_mes AS (
        SELECT DISTINCT ON (uid, ano, mes) *
        FROM po_norm
        ORDER BY uid, ano, mes, id DESC
      ),
      po_last AS (
        SELECT DISTINCT ON (uid) *
        FROM po_norm
        ORDER BY uid, ano DESC, id DESC
      ),
      a AS (
        SELECT aprs.*,
          LTRIM(REGEXP_REPLACE(matricula_auditor::text, '[^0-9]', '', 'g'), '0') AS uid,
          (ARRAY['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[aprs.mes] AS mes_nome
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
        COALESCE(pm.cidade_comercial, pl.cidade_comercial, a.cidade_comercial) AS "CIDADE COMERCIAL",
        COALESCE(pm.uf_comercial, pl.uf_comercial, a.uf_comercial) AS "UF COMERCIAL",
        COALESCE(pm.diretoria_3, pl.diretoria_3, a.diretoria_3) AS "DIRETORIA 3",
        COALESCE(pm.gerencia, pl.gerencia, a.gerencia) AS "GERÊNCIA",
        COALESCE(pm.gestor, pl.gestor, a.gestor) AS "GESTOR",
        COALESCE(pm.gestor, pl.gestor, a.gestor) AS "Supervisor",
        a.mes AS "Mês",
        a.ano AS "Ano"
      FROM a
      LEFT JOIN po_mes pm ON pm.uid = a.uid AND pm.ano = a.ano AND pm.mes = a.mes_nome
      LEFT JOIN po_last pl ON pl.uid = a.uid
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
