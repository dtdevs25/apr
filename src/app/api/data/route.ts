import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { dataCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || 'APR';
    
    if (dataCache[type] && (Date.now() - dataCache[type].timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(dataCache[type].data);
    }

    let rows;

    if (type === 'DSS') {
      try {
        const ACC_FROM = 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ';
        const ACC_TO   = 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn';
        const normNome = (col: string) =>
          `NULLIF(UPPER(TRIM(REGEXP_REPLACE(TRANSLATE(${col}::text, '${ACC_FROM}', '${ACC_TO}'), '\\s+', ' ', 'g'))), '')`;

        const res = await pool.query(`
          WITH po_norm AS (
            SELECT id,
              ${normNome('nome')} AS nome_n,
              diretoria_3, gerencia, gestor, cidade_comercial, uf_comercial, cargo
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
          spi_gestores AS (
            SELECT DISTINCT 
              ${normNome('gestor_atual')} AS gestor_n,
              MAX(cidade_comercial) AS cidade_comercial,
              MAX(gerencia) AS gerencia
            FROM po_spi_override
            GROUP BY ${normNome('gestor_atual')}
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
            CASE 
              WHEN spi_g.gestor_n IS NOT NULL THEN 'DIR SERVICOS AO CLIENTE SP INTERIOR'
              ELSE COALESCE(p3.diretoria_3, pc.diretoria_3, d.base)
            END AS "DIRETORIA 3",
            CASE 
              WHEN spi_g.gestor_n IS NOT NULL THEN d.lider
              WHEN p3.cargo ILIKE '%SUPERVISOR%' OR p3.cargo ILIKE '%COORDENADOR%' OR p3.cargo ILIKE '%COORD%' THEN d.lider
              ELSE d.lider || ' (Líder)'
            END AS "Supervisor",
            COALESCE(spi_g.cidade_comercial, p3.cidade_comercial, pc.cidade_comercial, d.localidade) AS "CIDADE COMERCIAL"
          FROM d_norm d
          LEFT JOIN po_by_nome p3 ON p3.nome_n = d.lider_n
          LEFT JOIN po_by_cidade pc ON pc.cidade_norm = d.localidade_norm
          LEFT JOIN spi_gestores spi_g ON spi_g.gestor_n = d.lider_n
          ORDER BY d.data_fechamento DESC
        `);
        rows = res.rows;
      } catch (err: any) {
        if (err.code === '42P01') {
          return NextResponse.json([]);
        }
        throw err;
      }
    } else {
      // Para APR: 3 consultas simples + cruzamento em memória (rápido e imune a diferenças de tipo)
      try {
        const normId = (v: any): string | null => {
          if (v === null || v === undefined) return null;
          const s = String(v).trim().replace(/\.0+$/, '').replace(/[^0-9]/g, '').replace(/^0+/, '');
          return s || null;
        };
        const normNome = (v: any): string | null => {
          if (!v) return null;
          const s = String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
          return s || null;
        };

        const [aprRes, poRes, spiRes] = await Promise.all([
          pool.query(`SELECT * FROM aprs ORDER BY data_inicio DESC`),
          pool.query(`SELECT user_id_ssff, nome, diretoria_3, gerencia, gestor, cidade_comercial, uf_comercial FROM po ORDER BY id ASC`).catch(() => ({ rows: [] as any[] })),
          pool.query(`SELECT matricula, gestor_atual, gerencia, cidade_comercial FROM po_spi_override ORDER BY id ASC`).catch(() => ({ rows: [] as any[] })),
        ]);

        // Ordem ASC por id: o último sobrescreve -> fica o registro mais recente
        const poById = new Map<string, any>();
        const poByNome = new Map<string, any>();
        for (const p of poRes.rows) {
          const id = normId(p.user_id_ssff);
          if (id) poById.set(id, p);
          const nm = normNome(p.nome);
          if (nm) poByNome.set(nm, p);
        }
        const spiByMat = new Map<string, any>();
        for (const s of spiRes.rows) {
          const m = normId(s.matricula);
          if (m) spiByMat.set(m, s);
        }

        const INTERIOR = 'DIR SERVICOS AO CLIENTE SP INTERIOR';
        rows = aprRes.rows.map((a: any) => {
          const idMat = normId(a.matricula_auditor);
          const idRe = normId(a.re);
          const p = (idMat && poById.get(idMat)) || (idRe && poById.get(idRe)) || poByNome.get(normNome(a.nome_auditor) || '') || null;
          const spi = (idMat && spiByMat.get(idMat)) || (idRe && spiByMat.get(idRe)) || null;

          // Diretoria: se está na planilha de correção do Interior, é estritamente INTERIOR com override.
          // Se o PO geral indicava Interior mas a pessoa NÃO está na planilha oficial do Interior, não entra em DIR SERVICOS AO CLIENTE SP INTERIOR.
          let diretoria = p?.diretoria_3 || a.diretoria_3 || null;
          let gestor = p?.gestor || a.gestor || null;

          if (spi) {
            diretoria = INTERIOR;
            gestor = (spi.gestor_atual || '').toString().trim().toUpperCase() || gestor;
          } else if (diretoria === INTERIOR) {
            // Colaboradores que não constam na planilha de líderes/técnicos do Interior são desconsiderados da DIR SERVICOS AO CLIENTE SP INTERIOR
            diretoria = 'OUTROS';
          }

          return {
            "Número": a.numero,
            "Data Checklist": a.data_checklist,
            "Data Início": a.data_inicio,
            "Data Fim": a.data_fim,
            "Duração": a.duracao,
            "Situação": a.situacao,
            "Matrícula Auditor": a.matricula_auditor,
            "Nome Auditor": a.nome_auditor,
            "Localidade Objeto": a.localidade_objeto,
            "Questionário": a.questionario,
            "RE": a.re,
            "CIDADE COMERCIAL": spi?.cidade_comercial || p?.cidade_comercial || a.cidade_comercial || null,
            "UF COMERCIAL": p?.uf_comercial || a.uf_comercial || null,
            "DIRETORIA 3": diretoria,
            "GERÊNCIA": spi?.gerencia || p?.gerencia || a.gerencia || null,
            "GESTOR": gestor,
            "Supervisor": gestor,
            "Mês": a.mes,
            "Ano": a.ano,
          };
        });
      } catch (err: any) {
        if (err.code === '42P01') {
          return NextResponse.json([]);
        }
        throw err;
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

    dataCache[type] = { data: finalData, timestamp: Date.now() };
    return NextResponse.json(finalData);
  } catch (error) {
    console.error("Erro ao carregar dados do banco:", error);
    return NextResponse.json([], { status: 500 });
  }
}
