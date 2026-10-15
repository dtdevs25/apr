import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { dataCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

const CITY_NORM_MAP: Record<string, string> = {
  // SPC
  'SAO PAULO': 'SÃO PAULO',
  'MAUA': 'MAUÁ',
  'PRAIA GRANDE': 'PRAIA GRANDE',
  'SANTOS': 'SANTOS',
  'MOGI DAS CRUZES': 'MOGI DAS CRUZES',
  'BARUERI': 'BARUERI',
  'GUARULHOS': 'GUARULHOS',
  'SANTO ANDRE': 'SANTO ANDRÉ',
  'SAO VICENTE': 'SÃO VICENTE',
  'SAO CAETANO DO SUL': 'SÃO CAETANO DO SUL',
  'SAO BERNARDO DO CAMPO': 'SÃO BERNARDO DO CAMPO',
  'GUARUJA': 'GUARUJÁ',
  'TABOAO DA SERRA': 'TABOÃO DA SERRA',
  'CARAGUATATUBA': 'CARAGUATATUBA',
  'CUBATAO': 'CUBATÃO',

  // SPI
  'CAMPINAS': 'CAMPINAS',
  'SAO JOSE DO RIO PRETO': 'SÃO JOSÉ DO RIO PRETO',
  'BAURU': 'BAURU',
  'ARARAQUARA': 'ARARAQUARA',
  'RIBEIRAO PRETO': 'RIBEIRÃO PRETO',
  'PIRACICABA': 'PIRACICABA',
  'MARILIA': 'MARÍLIA',
  'SAO JOSE DOS CAMPOS': 'SÃO JOSÉ DOS CAMPOS',
  'JUNDIAI': 'JUNDIAÍ',
  'VOTORANTIM': 'VOTORANTIM',
  'SOROCABA': 'SOROCABA',
  'OURINHOS': 'OURINHOS',
  'ARACATUBA': 'ARAÇATUBA',
  'SAO PEDRO': 'SÃO PEDRO',
  'OSASCO': 'OSASCO',
  'ATIBAIA': 'ATIBAIA',
  'PRESIDENTE PRUDENTE': 'PRESIDENTE PRUDENTE',
  'JAU': 'JAÚ',
  'CAJAMAR': 'CAJAMAR',
  'INDAIATUBA': 'INDAIATUBA',
  'SAO CARLOS': 'SÃO CARLOS',
  'FRANCA': 'FRANCA',
  'TAUBATE': 'TAUBATÉ',
  'SAO ROQUE': 'SÃO ROQUE',
  'BOTUCATU': 'BOTUCATU',
};

const CITY_TO_REGIONAL: Record<string, 'SPC' | 'SPI'> = {
  // SPC (Capital, Grande SP, Baixada Santista, Litoral Norte)
  'SAO PAULO': 'SPC',
  'MAUA': 'SPC',
  'PRAIA GRANDE': 'SPC',
  'SANTOS': 'SPC',
  'MOGI DAS CRUZES': 'SPC',
  'BARUERI': 'SPC',
  'GUARULHOS': 'SPC',
  'SANTO ANDRE': 'SPC',
  'SAO VICENTE': 'SPC',
  'SAO CAETANO DO SUL': 'SPC',
  'SAO BERNARDO DO CAMPO': 'SPC',
  'GUARUJA': 'SPC',
  'TABOAO DA SERRA': 'SPC',
  'CARAGUATATUBA': 'SPC',
  'CUBATAO': 'SPC',

  // SPI (Interior + Osasco conforme regra de negócio)
  'CAMPINAS': 'SPI',
  'SAO JOSE DO RIO PRETO': 'SPI',
  'BAURU': 'SPI',
  'ARARAQUARA': 'SPI',
  'RIBEIRAO PRETO': 'SPI',
  'PIRACICABA': 'SPI',
  'MARILIA': 'SPI',
  'SAO JOSE DOS CAMPOS': 'SPI',
  'JUNDIAI': 'SPI',
  'VOTORANTIM': 'SPI',
  'SOROCABA': 'SPI',
  'OURINHOS': 'SPI',
  'ARACATUBA': 'SPI',
  'SAO PEDRO': 'SPI',
  'OSASCO': 'SPI',
  'ATIBAIA': 'SPI',
  'PRESIDENTE PRUDENTE': 'SPI',
  'JAU': 'SPI',
  'CAJAMAR': 'SPI',
  'INDAIATUBA': 'SPI',
  'SAO CARLOS': 'SPI',
  'FRANCA': 'SPI',
  'TAUBATE': 'SPI',
  'SAO ROQUE': 'SPI',
  'BOTUCATU': 'SPI',
};

const CITY_TO_FILIAL_CNPJ: Record<string, { filial: string, cnpj: string }> = {
  'SAO PAULO': { filial: 'SP MTZ ECOBERRI', cnpj: '02558157000162' },
  'CAMPINAS': { filial: 'SP CAMBUI', cnpj: '02558157082703' },
  'SAO JOSE DO RIO PRETO': { filial: 'SP CCC SJRPRETO', cnpj: '02558157011954' },
  'BAURU': { filial: 'SP CCC BAURU', cnpj: '02558157009623' },
  'ARARAQUARA': { filial: 'SP ARARAQUARA C', cnpj: '02558157059485' },
  'RIBEIRAO PRETO': { filial: 'SP', cnpj: '02558157087772' },
  'PIRACICABA': { filial: 'SP PIRACICABA A', cnpj: '02558157059302' },
  'MAUA': { filial: 'SP CD MAUA', cnpj: '02558157053878' },
  'PRAIA GRANDE': { filial: 'SP LJ LITOR P S', cnpj: '02558157005121' },
  'MARILIA': { filial: 'SP LJ MARILIA S', cnpj: '02558157080093' },
  'SAO JOSE DOS CAMPOS': { filial: 'SP CC SJ CAMPOS', cnpj: '02558157049846' },
  'JUNDIAI': { filial: 'SP LJ JUND MA S', cnpj: '02558157009119' },
  'VOTORANTIM': { filial: 'SP LJ ESPLANADA', cnpj: '02558157005202' },
  'SOROCABA': { filial: 'SP SOROCABA BOA', cnpj: '02558157058322' },
  'OURINHOS': { filial: 'SP LJ OURINHOS', cnpj: '02558157010206' },
  'ARACATUBA': { filial: 'SP LJ MULTISHOP', cnpj: '02558157012411' },
  'SANTOS': { filial: 'SP SANTOS', cnpj: '02558157076657' },
  'MOGI DAS CRUZES': { filial: 'SP LJ MOGI S CE', cnpj: '02558157008732' },
  'BARUERI': { filial: 'SP LJ IGUA ALPH', cnpj: '02558157009542' },
  'SAO PEDRO': { filial: 'SP_LJ BERRINI', cnpj: '02558157052391' },
  'GUARULHOS': { filial: 'SP LJ S INTERNA', cnpj: '02558157015003' },
  'OSASCO': { filial: 'SP LJ OSASCO', cnpj: '02558157007680' },
  'SANTO ANDRE': { filial: 'SP LJ ABC PLA S', cnpj: '02558157007256' },
  'SAO VICENTE': { filial: 'SP LJ S BRISAM', cnpj: '02558157011016' },
  'SAO CAETANO DO SUL': { filial: 'SP LJ PSCAETANO', cnpj: '02558157051239' },
  'SAO BERNARDO DO CAMPO': { filial: 'SP LJ S METROPO', cnpj: '02558157007094' },
  'ATIBAIA': { filial: 'LJ VIVO ATIBAIA', cnpj: '02558157092423' },
  'GUARUJA': { filial: 'SP LJ S GUAR LP', cnpj: '02558157010710' },
  'PRESIDENTE PRUDENTE': { filial: 'SP LJ PQ S PRUD', cnpj: '02558157076223' },
  'JAU': { filial: 'SP LOJA JAU', cnpj: '02558157009895' },
  'TABOAO DA SERRA': { filial: 'SP LJ SH TABOAO', cnpj: '02558157013817' },
  'CAJAMAR': { filial: 'SP_CD_CAJAMAR_GALPAO100-PARTE', cnpj: '02558157091613' },
  'INDAIATUBA': { filial: 'SP INDAIATUBA C', cnpj: '02558157058837' },
  'SAO CARLOS': { filial: 'SP LJ SS CARLOS', cnpj: '02558157013736' },
  'FRANCA': { filial: 'SP LJ FRANCA', cnpj: '02558157010397' },
  'CARAGUATATUBA': { filial: 'SP ALTINO ARANTES', cnpj: '02558157081146' },
  'TAUBATE': { filial: 'SP CCC TAUBATE', cnpj: '02558157009038' },
  'SAO ROQUE': { filial: 'SP_LOJA OUTLET CATARINA SP', cnpj: '2558157088744' },
  'BOTUCATU': { filial: 'SP JOAO PASSOS', cnpj: '02558157075332' }
};

function getFilialCnpj(cidade: string | null): { filial: string, cnpj: string } | null {
  if (!cidade) return null;
  const unaccented = String(cidade).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return CITY_TO_FILIAL_CNPJ[unaccented] || null;
}

function cleanCidade(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const withoutPrefix = s.replace(/^[A-Z]{2}(\s+[-–—]?\s*|\s*[-–—]\s*)/i, '').replace(/\s+/g, ' ').trim();
  const upper = (withoutPrefix || s).toUpperCase();
  const unaccented = upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CITY_NORM_MAP[unaccented] || upper;
}

function getRegional(cidade: string | null): 'SPC' | 'SPI' | null {
  if (!cidade) return null;
  const unaccented = String(cidade).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return CITY_TO_REGIONAL[unaccented] || null;
}

const ALLOWED_DIRETORIAS = [
  'DIR ENGENHARIA TRANSPORTE E INFRA',
  'DIR EXPERIENCIA COLABORADOR',
  'DIR SERVICOS AO CLIENTE SP CAPITAL',
  'DIR SERVICOS AO CLIENTE SP INTERIOR'
];

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
          spi_part AS (
            SELECT DISTINCT ON (${normNome('matricula')})
              ${normNome('matricula')} AS mat_n,
              ativo
            FROM po_spi_override
            ORDER BY ${normNome('matricula')}, id DESC
          ),
          d_norm AS (
            SELECT dss.*,
              ${normNome('lider')} AS lider_n,
              ${normNome('matricula')} AS mat_n,
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
            COALESCE(d.localidade, spi_g.cidade_comercial, p3.cidade_comercial, pc.cidade_comercial) AS "CIDADE COMERCIAL",
            COALESCE(spi_p.ativo, 1) AS "ATIVO_SPI",
            CASE WHEN spi_g.gestor_n IS NOT NULL OR spi_p.mat_n IS NOT NULL THEN true ELSE false END AS "IS_SPI"
          FROM d_norm d
          LEFT JOIN po_by_nome p3 ON p3.nome_n = d.lider_n
          LEFT JOIN po_by_cidade pc ON pc.cidade_norm = d.localidade_norm
          LEFT JOIN spi_gestores spi_g ON spi_g.gestor_n = d.lider_n
          LEFT JOIN spi_part spi_p ON spi_p.mat_n = d.mat_n
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
          pool.query(`
            SELECT user_id_ssff, nome, diretoria_3, gerencia, gestor, cidade_comercial, uf_comercial,
                   COALESCE(to_jsonb(po)->>'cnpj', '') AS cnpj,
                   COALESCE(to_jsonb(po)->>'filial', '') AS filial
            FROM po ORDER BY id ASC
          `).catch(() => ({ rows: [] as any[] })),
          pool.query(`SELECT matricula, gestor_atual, gerencia, cidade_comercial, ativo FROM po_spi_override ORDER BY id ASC`).catch(() => ({ rows: [] as any[] })),
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
        const CAPITAL = 'DIR SERVICOS AO CLIENTE SP CAPITAL';
        const seenNumbers = new Set<string>();
        rows = aprRes.rows
          .filter((a: any) => {
            const num = String(a.numero || '').trim().replace(/\.0+$/, '');
            if (!num || seenNumbers.has(num)) return false;
            seenNumbers.add(num);
            return true;
          })
          .map((a: any) => {
          const idMat = normId(a.matricula_auditor);
          const idRe = normId(a.re);
          const p = (idMat && poById.get(idMat)) || (idRe && poById.get(idRe)) || poByNome.get(normNome(a.nome_auditor) || '') || null;
          const spi = (idMat && spiByMat.get(idMat)) || (idRe && spiByMat.get(idRe)) || null;

          const cidade = cleanCidade(a.localidade_objeto) || cleanCidade(a.cidade_comercial) || cleanCidade(spi?.cidade_comercial) || cleanCidade(p?.cidade_comercial) || null;
          const regional = getRegional(cidade);
          const fc = getFilialCnpj(cidade);

          let diretoria = p?.diretoria_3 || a.diretoria_3 || null;
          let gestor = p?.gestor || a.gestor || null;

          if (spi) {
            diretoria = INTERIOR;
            gestor = (spi.gestor_atual || '').toString().trim().toUpperCase() || gestor;
          } else if (regional === 'SPI') {
            // Correção inteligente: cidade comprovadamente de SPI corrige diretoria para INTERIOR
            if (diretoria === CAPITAL || !diretoria || diretoria === INTERIOR) {
              diretoria = INTERIOR;
            }
          } else if (regional === 'SPC') {
            // Correção inteligente: cidade comprovadamente de SPC corrige diretoria para CAPITAL
            if (diretoria === INTERIOR || !diretoria || diretoria === CAPITAL) {
              diretoria = CAPITAL;
            }
          }

          const filial = (p?.filial && p.filial.trim()) || fc?.filial || spi?.gerencia || p?.gerencia || a.gerencia || (regional ? `FILIAL ${regional}` : 'SÃO PAULO');
          const cnpj = (p?.cnpj && p.cnpj.trim()) || fc?.cnpj || '-';

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
            "CIDADE COMERCIAL": cidade,
            "REGIONAL": regional || (diretoria === INTERIOR ? 'SPI' : diretoria === CAPITAL ? 'SPC' : null),
            "UF COMERCIAL": p?.uf_comercial || a.uf_comercial || null,
            "DIRETORIA 3": diretoria,
            "GERÊNCIA": spi?.gerencia || p?.gerencia || a.gerencia || null,
            "FILIAL": filial,
            "CNPJ": cnpj,
            "GESTOR": gestor,
            "Supervisor": gestor,
            "Mês": a.mes,
            "Ano": a.ano,
            "ATIVO_SPI": spi ? spi.ativo : null,
            "IS_SPI": !!spi || regional === 'SPI',
          };
        });

        // Montar a lista canônica de colaboradores do PO em SP
        const colaboradoresPO: any[] = [];
        const seenMatriculas = new Set<string>();

        for (const p of poRes.rows) {
          const mat = normId(p.user_id_ssff);
          if (!mat || seenMatriculas.has(mat)) continue;
          seenMatriculas.add(mat);

          const spi = spiByMat.get(mat);
          const cidade = cleanCidade(spi?.cidade_comercial) || cleanCidade(p.cidade_comercial) || null;
          const regional = getRegional(cidade);
          const fc = getFilialCnpj(cidade);

          let diretoria = p.diretoria_3 || null;
          let gestor = p.gestor || null;

          if (spi) {
            diretoria = INTERIOR;
            gestor = (spi.gestor_atual || '').toString().trim().toUpperCase() || gestor;
          } else if (regional === 'SPI') {
            if (diretoria === CAPITAL || !diretoria || diretoria === INTERIOR) {
              diretoria = INTERIOR;
            }
          } else if (regional === 'SPC') {
            if (diretoria === INTERIOR || !diretoria || diretoria === CAPITAL) {
              diretoria = CAPITAL;
            }
          }

          // Se não encontrou o gestor/supervisor, enquadra na regional pelo menos
          if (!gestor) {
            gestor = regional ? `SUPERVISÃO ${regional}` : 'SUPERVISÃO NÃO IDENTIFICADA';
          }

          const dirUpper = (diretoria || '').toString().trim().toUpperCase();
          const filial = (p.filial && p.filial.trim()) || fc?.filial || (spi?.gerencia || p.gerencia || (regional ? `FILIAL ${regional}` : 'SÃO PAULO'));
          const cnpj = (p.cnpj && p.cnpj.trim()) || fc?.cnpj || '-';

          if (ALLOWED_DIRETORIAS.includes(dirUpper)) {
            colaboradoresPO.push({
              matricula: mat,
              nome: (p.nome || mat).toString().trim().toUpperCase(),
              cargo: (p.cargo || 'COLABORADOR').toString().trim().toUpperCase(),
              diretoria: dirUpper,
              gerencia: (spi?.gerencia || p.gerencia || '').toString().trim().toUpperCase(),
              filial: filial,
              cnpj: cnpj,
              supervisor: (gestor || '').toString().trim().toUpperCase(),
              cidade: cidade,
              regional: regional || (dirUpper === INTERIOR ? 'SPI' : dirUpper === CAPITAL ? 'SPC' : null),
              ativo_spi: spi ? spi.ativo : 1,
              is_spi: !!spi || regional === 'SPI'
            });
          }
        }

        (rows as any)._colaboradoresPO = colaboradoresPO;
      } catch (err: any) {
        if (err.code === '42P01') {
          return NextResponse.json([]);
        }
        throw err;
      }
    }
    // Converte datas para string no formato padrão brasileiro DD/MM/AAAA HH:mm:ss sem desvio de fuso
    const formattedData = rows.map(r => {
      const formatData = (d: any) => {
        if (!d) return null;
        const s = String(d).trim();
        if (!s) return null;
        // Se já está no formato DD/MM/AAAA HH:mm:ss
        if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;
        // Se está no formato ISO YYYY-MM-DD HH:mm:ss (ou com T)
        const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
        if (isoMatch) {
          const [, yyyy, mm, dd, hh = '00', mi = '00', ss = '00'] = isoMatch;
          const p = (v: string) => v.padStart(2, '0');
          return `${p(dd)}/${p(mm)}/${yyyy} ${p(hh)}:${p(mi)}:${p(ss)}`;
        }
        if (d instanceof Date && !isNaN(d.getTime())) {
          const p = (n: number) => n.toString().padStart(2, '0');
          return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
        }
        return s;
      };
      
      if (type === 'DSS') {
        const cid = cleanCidade(r["CIDADE COMERCIAL"]);
        const reg = getRegional(cid);
        let dir = r["DIRETORIA 3"];
        if (r["IS_SPI"] || reg === 'SPI') {
          if (dir === 'DIR SERVICOS AO CLIENTE SP CAPITAL' || !dir) {
            dir = 'DIR SERVICOS AO CLIENTE SP INTERIOR';
          }
        } else if (reg === 'SPC') {
          if (dir === 'DIR SERVICOS AO CLIENTE SP INTERIOR' || !dir) {
            dir = 'DIR SERVICOS AO CLIENTE SP CAPITAL';
          }
        }
        return {
          ...r,
          "CIDADE COMERCIAL": cid,
          "DIRETORIA 3": dir,
          "REGIONAL": reg || (dir === 'DIR SERVICOS AO CLIENTE SP INTERIOR' ? 'SPI' : dir === 'DIR SERVICOS AO CLIENTE SP CAPITAL' ? 'SPC' : null),
          "Data Fechamento": formatData(r["Data Fechamento"])
        };
      }

      return {
        ...r,
        "CIDADE COMERCIAL": cleanCidade(r["CIDADE COMERCIAL"]),
        "Data Checklist": formatData(r["Data Checklist"]),
        "Data Início": formatData(r["Data Início"]),
        "Data Fim": formatData(r["Data Fim"])
      };
    });

    const finalData = formattedData.filter(r => {
      const dir = (r["DIRETORIA 3"] || '').toString().trim().toUpperCase();
      return ALLOWED_DIRETORIAS.includes(dir);
    });

    if (type === 'APR') {
      const payload = {
        data: finalData,
        colaboradoresPO: (rows as any)._colaboradoresPO || []
      };
      dataCache[type] = { data: payload, timestamp: Date.now() };
      return NextResponse.json(payload);
    }

    dataCache[type] = { data: finalData, timestamp: Date.now() };
    return NextResponse.json(finalData);
  } catch (error) {
    console.error("Erro ao carregar dados do banco:", error);
    return NextResponse.json([], { status: 500 });
  }
}
