import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { dataCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de cache em memória (invalidado automaticamente em novos uploads)

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

function cleanStr(s: any): string {
  if (!s) return '';
  return String(s)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isPersonName(name: string | null | undefined): boolean {
  if (!name || typeof name !== 'string') return false;
  const s = cleanStr(name);
  if (!s || s.length < 3) return false;

  const invalidPatterns = [
    'GERENCIA', 'GER ', 'COORDENACAO', 'COORD ', 'DIRETORIA', 'DIR ',
    'SUPERVISAO', 'SUPERVISÃO', 'DIVISAO', 'SETOR', 'DEPARTAMENTO',
    'AREA', 'OPERACAO', 'OPERACOES', 'SERVICO', 'SERVICOS', 'VAGO',
    'NAO IDENTIFICADO', 'INDEFINIDO', 'SUP '
  ];

  for (const p of invalidPatterns) {
    if (s.startsWith(p) || s.includes('SUPERVISAO') || s.includes('SUPERVISÃO') || s.includes('GERENCIA DE') || s.includes('COORDENACAO DE')) {
      return false;
    }
  }

  const singleWordRoles = [
    'COORDENADOR', 'GERENTE', 'SUPERVISOR', 'DIRETOR', 'GESTOR',
    'TECNICO', 'AUDITOR', 'ANALISTA', 'ESPECIALISTA', 'CONSULTOR',
    'LIDER', 'ADMINISTRATIVO', 'CAMPO', 'OPERACIONAL', 'DESCONHECIDO'
  ];
  if (singleWordRoles.includes(s)) return false;

  return true;
}

const ALLOWED_DIRETORIAS = [
  'DIR SERVICOS AO CLIENTE SP CAPITAL',
  'DIR SERVICOS AO CLIENTE SP INTERIOR',
  'DIR ENGENHARIA TRANSPORTE E INFRA - CAPITAL',
  'DIR ENGENHARIA TRANSPORTE E INFRA - INTERIOR'
];

function normalizeDiretoria(dir: string | null, regional: 'SPC' | 'SPI' | null): string | null {
  if (!dir) return null;
  const d = cleanStr(dir);

  // Engenharia, Transporte e Infraestrutura
  if (d.includes('ENGENHARIA') || d.includes('TRANSPORTE') || d.includes('INFRA') || (d.includes('ENG') && !d.includes('ENGENHEIRO'))) {
    return regional === 'SPI'
      ? 'DIR ENGENHARIA TRANSPORTE E INFRA - INTERIOR'
      : 'DIR ENGENHARIA TRANSPORTE E INFRA - CAPITAL';
  }

  // Serviços ao Cliente
  if (d.includes('CLIENTE') || d.includes('SERVICO') || d.includes('SERVICOS')) {
    if (d.includes('INTERIOR') || regional === 'SPI') {
      return 'DIR SERVICOS AO CLIENTE SP INTERIOR';
    }
    if (d.includes('CAPITAL') || regional === 'SPC') {
      return 'DIR SERVICOS AO CLIENTE SP CAPITAL';
    }
    return regional === 'SPI'
      ? 'DIR SERVICOS AO CLIENTE SP INTERIOR'
      : 'DIR SERVICOS AO CLIENTE SP CAPITAL';
  }

  return d;
}

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || 'APR';

    if (dataCache[type] && (Date.now() - dataCache[type].timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(dataCache[type].data, {
        headers: {
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
        }
      });
    }

    let rows;

    if (type === 'DSS') {
      try {
        const ACC_FROM = 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ';
        const ACC_TO = 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn';
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
            CASE 
              WHEN spi_g.gestor_n IS NOT NULL OR d.base = 'DIR SERVICOS AO CLIENTE SP INTERIOR' THEN spi_p.ativo
              ELSE 1
            END AS "ATIVO_SPI",
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
          let s = String(v)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .trim();
          s = s.replace(/^\d+\s*[-–—/]\s*/, '').replace(/\s*[-–—/]\s*\d+$/, '').replace(/\s*\(\d+\)$/, '').trim();
          s = s.replace(/\s+/g, ' ');
          return s || null;
        };

        const isTecnico = (cargo: string | null | undefined): boolean => {
          if (!cargo) return false;
          return cleanStr(cargo).includes('TECNICO');
        };

        const isCampoRole = (grupo2: string | null | undefined): boolean => {
          if (!grupo2) return false;
          const g = cleanStr(grupo2);
          return g.includes('CAMPO');
        };

        const isNonFieldRole = (cargo: string | null | undefined): boolean => {
          if (!cargo) return false;
          const c = cleanStr(cargo);
          return c.includes('LOJA') || c.includes('LOJAS') || c.includes('VAREJO') ||
            c.includes('COMERCIAL') || c.includes('VENDAS') || c.includes('CALL CENTER') ||
            c.includes('TELEVENDAS') || c.includes('SAC') || c.includes('FINANCEIRO') ||
            c.includes('JURIDICO') || c.includes('RECURSOS HUMANOS') || c.includes('RH');
        };

        const [aprRes, poRes, spiRes] = await Promise.all([
          pool.query(`
            SELECT numero, data_fim, data_inicio, duracao, matricula_auditor, nome_auditor,
                   localidade_objeto, questionario, re, cidade_comercial, diretoria_3,
                   gestor, supervisor, mes
            FROM aprs
          `),
          pool.query(`
            SELECT user_id_ssff, nome, cargo,
                   COALESCE(to_jsonb(po)->>'grupo_2', to_jsonb(po)->>'grupo 2', to_jsonb(po)->>'GRUPO 2', to_jsonb(po)->>'GRUPO_2', '') AS grupo_2,
                   COALESCE(to_jsonb(po)->>'categoria', '') AS categoria,
                   COALESCE(to_jsonb(po)->>'subgrupo', '') AS subgrupo,
                   COALESCE(to_jsonb(po)->>'diretoria_2', po.diretoria_3, '') AS diretoria_2,
                   diretoria_3, gerencia, gestor, cidade_comercial, uf_comercial,
                   COALESCE(to_jsonb(po)->>'cnpj', '') AS cnpj,
                   COALESCE(to_jsonb(po)->>'filial', '') AS filial
            FROM po ORDER BY id ASC
          `).catch(() => ({ rows: [] as any[] })),
          pool.query(`SELECT matricula, nome, gestor_atual, gerencia, cidade_comercial, ativo, cargo, COALESCE(to_jsonb(po_spi_override)->>'diretoria_2', 'DIR SERVICOS AO CLIENTE SP INTERIOR') AS diretoria_2 FROM po_spi_override ORDER BY id ASC`).catch(() => ({ rows: [] as any[] })),
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
        const spiByNome = new Map<string, any>();
        for (const s of spiRes.rows) {
          const m = normId(s.matricula);
          if (m) spiByMat.set(m, s);
          const nm = normNome(s.nome);
          if (nm) spiByNome.set(nm, s);
        }

        // Mapeamento de hierarquia e lideranças
        const allPoByName = new Map<string, any>();
        const allPoById = new Map<string, any>();
        for (const p of poRes.rows) {
          const id = normId(p.user_id_ssff);
          if (id) allPoById.set(id, p);
          const nm = normNome(p.nome);
          if (nm) allPoByName.set(nm, p);
        }
        for (const s of spiRes.rows) {
          const m = normId(s.matricula);
          if (m && !allPoById.has(m)) allPoById.set(m, s);
          const nm = normNome(s.nome);
          if (nm && !allPoByName.has(nm)) allPoByName.set(nm, s);
        }

        const findPoPerson = (nameOrId: string | null | undefined): any | null => {
          if (!nameOrId) return null;
          const str = String(nameOrId).trim();
          const id = normId(str);
          if (id && allPoById.has(id)) return allPoById.get(id);
          const nm = normNome(str);
          if (nm && allPoByName.has(nm)) return allPoByName.get(nm);
          if (nm && nm.length > 5) {
            for (const [key, val] of allPoByName.entries()) {
              if (key === nm || key.includes(nm) || nm.includes(key)) {
                return val;
              }
            }
          }
          return null;
        };

        const DIRECTOR_SPI = 'SAMUEL ROSSI DO NASCIMENTO';
        const DIRECTOR_SPC = 'ELISEU ROBERTO OLIVEIRA';

        const isDirectorSpi = (name?: string | null) => {
          if (!name) return false;
          const n = normNome(name);
          if (!n) return false;
          return (n.includes('SAMUEL') && n.includes('ROSSI')) || n === DIRECTOR_SPI;
        };

        const isDirectorSpc = (name?: string | null) => {
          if (!name) return false;
          const n = normNome(name);
          if (!n) return false;
          return (n.includes('ELISEU') && n.includes('OLIVEIRA')) || n === DIRECTOR_SPC;
        };

        const classifyLeaderRole = (cargo: string | null | undefined): 'DIRETOR' | 'GERENTE' | 'COORDENADOR' | 'SUPERVISOR' | null => {
          if (!cargo) return null;
          if (isNonFieldRole(cargo)) return null;
          const c = cleanStr(cargo);
          if (
            c.startsWith('DIR ') ||
            c.startsWith('DIR.') ||
            c.includes('DIRETOR') ||
            c.includes('DIRETORIA')
          ) {
            return 'DIRETOR';
          }
          if (
            c.startsWith('GER ') ||
            c.startsWith('GER.') ||
            c.includes('GERENTE') ||
            c.includes('GERENCIA') ||
            c.includes('GERÊNCIA') ||
            c.includes('GER SR') ||
            c.includes('GER.SR')
          ) {
            return 'GERENTE';
          }
          if (
            c.startsWith('COORD') ||
            c.includes('COORDENADOR') ||
            c.includes('COORDENACAO') ||
            c.includes('COORDENAÇÃO')
          ) {
            return 'COORDENADOR';
          }
          if (
            c.startsWith('SUP ') ||
            c.startsWith('SUP.') ||
            c.includes('SUPERVISOR') ||
            c.includes('SUPERVISAO') ||
            c.includes('SUPERVISÃO')
          ) {
            return 'SUPERVISOR';
          }
          return null;
        };

        const liderancasMap = new Map<string, {
          nome: string;
          cargo: string;
          tipo: 'DIRETOR' | 'GERENTE' | 'COORDENADOR' | 'SUPERVISOR';
          diretoria: string;
          gerente?: string;
          coordenador?: string;
          diretor?: string;
          cidade: string;
          regional: string;
        }>();

        interface HierarquiaChain {
          diretor: string | null;
          gerente: string | null;
          coordenador: string | null;
          supervisor: string | null;
          chain: string[];
        }

        // Rastreamento hierárquico rigoroso:
        // Colaborador -> Supervisor -> Coordenador -> Gerente -> Diretor
        const buildHierarquia = (
          initialGestor: string | null | undefined,
          colabDir: string | null | undefined,
          colabCidade: string | null | undefined,
          colabRegional: 'SPC' | 'SPI' | null | undefined
        ): HierarquiaChain => {
          const colabDirClean = cleanStr(colabDir);
          const isInteriorHint = colabDirClean.includes('INTERIOR') || colabRegional === 'SPI';
          const isCapitalHint = colabDirClean.includes('CAPITAL') || colabRegional === 'SPC';

          const result: HierarquiaChain = {
            diretor: null,
            gerente: null,
            coordenador: null,
            supervisor: null,
            chain: []
          };

          const visited = new Set<string>();
          let currentRaw = initialGestor ? String(initialGestor).trim() : null;
          const chainNodes: Array<{
            nome: string;
            cargo: string;
            tipo: 'DIRETOR' | 'GERENTE' | 'COORDENADOR' | 'SUPERVISOR';
            personPO: any;
          }> = [];

          while (currentRaw && visited.size < 7) {
            const cleanName = normNome(currentRaw);
            if (!cleanName || !isPersonName(cleanName) || visited.has(cleanName)) break;
            visited.add(cleanName);

            const personPO = findPoPerson(currentRaw);
            const cargoUpper = cleanStr(personPO?.cargo);

            // Se for de loja/varejo/comercial, interrompe subida imediatamente
            if (isNonFieldRole(cargoUpper)) {
              break;
            }

            const isSamuel = isDirectorSpi(cleanName) || (cargoUpper.includes('INTERIOR') && (cargoUpper.startsWith('DIR ') || cargoUpper.includes('DIRETOR')));
            const isEliseu = isDirectorSpc(cleanName) || (cargoUpper.includes('CAPITAL') && (cargoUpper.startsWith('DIR ') || cargoUpper.includes('DIRETOR')));
            const isKnownDirector = isSamuel || isEliseu;
            const detected = classifyLeaderRole(cargoUpper);
            const tipo: 'DIRETOR' | 'GERENTE' | 'COORDENADOR' | 'SUPERVISOR' = isKnownDirector ? 'DIRETOR' : (detected || 'SUPERVISOR');

            chainNodes.push({
              nome: cleanName,
              cargo: personPO?.cargo || (isKnownDirector ? (isSamuel ? 'DIR SERVICOS AO CLIENTE SP INTERIOR' : 'DIR SERVICOS AO CLIENTE SP CAPITAL') : tipo),
              tipo,
              personPO
            });
            result.chain.push(cleanName);

            // PARADA ESTRITA NO DIRETOR: Não sobe para VP/Presidência!
            if (isKnownDirector || tipo === 'DIRETOR') {
              if (isSamuel) result.diretor = DIRECTOR_SPI;
              if (isEliseu) result.diretor = DIRECTOR_SPC;
              break;
            }

            currentRaw = personPO?.gestor_atual || personPO?.gestor ? String(personPO.gestor_atual || personPO.gestor).trim() : null;
          }

          if (chainNodes.length > 0) {
            // Se algum nó da cadeia for o diretor, fixa o diretor correto
            const samuelFound = chainNodes.some(n => isDirectorSpi(n.nome));
            const eliseuFound = chainNodes.some(n => isDirectorSpc(n.nome));
            if (samuelFound) {
              result.diretor = DIRECTOR_SPI;
            } else if (eliseuFound) {
              result.diretor = DIRECTOR_SPC;
            } else if (isInteriorHint && !isCapitalHint) {
              result.diretor = DIRECTOR_SPI;
            } else if (isCapitalHint && !isInteriorHint) {
              result.diretor = DIRECTOR_SPC;
            } else {
              result.diretor = (colabRegional === 'SPI') ? DIRECTOR_SPI : DIRECTOR_SPC;
            }

            // Gerente: pessoa estritamente com cargo de gerência
            const gerNode = chainNodes.find(n => n.tipo === 'GERENTE');
            if (gerNode) {
              result.gerente = gerNode.nome;
            }

            // Coordenador: pessoa estritamente com cargo de coordenação
            const coordNode = chainNodes.find(n => n.tipo === 'COORDENADOR');
            if (coordNode) {
              result.coordenador = coordNode.nome;
            }

            // Supervisor: pessoa com cargo de supervisão
            const supNode = chainNodes.find(n => n.tipo === 'SUPERVISOR');
            if (supNode) {
              result.supervisor = supNode.nome;
            } else if (chainNodes[0] && chainNodes[0].tipo !== 'DIRETOR' && chainNodes[0].tipo !== 'GERENTE' && chainNodes[0].tipo !== 'COORDENADOR') {
              result.supervisor = chainNodes[0].nome;
            }

            if (!result.supervisor && chainNodes[0]) {
              if (chainNodes[0].tipo === 'COORDENADOR') {
                result.supervisor = `${chainNodes[0].nome} (Coord. Direta)`;
              } else if (chainNodes[0].tipo === 'GERENTE') {
                result.supervisor = `${chainNodes[0].nome} (Gerência Direta)`;
              }
            }

            const targetDir = (result.diretor === DIRECTOR_SPI) ? INTERIOR : CAPITAL;
            const targetReg = (result.diretor === DIRECTOR_SPI) ? 'SPI' : 'SPC';

            // Registrar cada líder no liderancasMap APENAS se não for de loja e associado à sua regional correta
            chainNodes.forEach(node => {
              if (isNonFieldRole(node.cargo)) return;
              const nodeIsSamuel = isDirectorSpi(node.nome);
              const nodeIsEliseu = isDirectorSpc(node.nome);

              let nodeDir = targetDir;
              let nodeReg = targetReg;
              let nodeDiretor = result.diretor || (targetReg === 'SPI' ? DIRECTOR_SPI : DIRECTOR_SPC);

              if (nodeIsSamuel) {
                nodeDir = INTERIOR;
                nodeReg = 'SPI';
                nodeDiretor = DIRECTOR_SPI;
              } else if (nodeIsEliseu) {
                nodeDir = CAPITAL;
                nodeReg = 'SPC';
                nodeDiretor = DIRECTOR_SPC;
              }

              const mapKey = `${node.nome}__${nodeDir}`;
              if (!liderancasMap.has(mapKey)) {
                liderancasMap.set(mapKey, {
                  nome: node.nome,
                  cargo: (nodeIsSamuel || nodeIsEliseu) ? `DIRETOR REGIONAL ${nodeReg}` : node.cargo,
                  tipo: (nodeIsSamuel || nodeIsEliseu) ? 'DIRETOR' : node.tipo,
                  diretoria: nodeDir,
                  diretor: nodeDiretor,
                  gerente: node.tipo !== 'DIRETOR' && node.tipo !== 'GERENTE' ? (result.gerente || undefined) : undefined,
                  coordenador: node.tipo === 'SUPERVISOR' ? (result.coordenador || undefined) : undefined,
                  cidade: colabCidade || cleanCidade(node.personPO?.cidade_comercial) || (nodeDir.includes('INTERIOR') ? 'CAMPINAS' : 'SÃO PAULO'),
                  regional: nodeReg
                });
              }
            });
          }

          return result;
        };

        const hierarquiaCache = new Map<string, HierarquiaChain>();
        const getHierarquiaCached = (
          initialGestor: string | null | undefined,
          colabDir: string | null | undefined,
          colabCidade: string | null | undefined,
          colabRegional: 'SPC' | 'SPI' | null | undefined
        ): HierarquiaChain => {
          const k = `${initialGestor || ''}__${colabDir || ''}__${colabCidade || ''}__${colabRegional || ''}`;
          const existing = hierarquiaCache.get(k);
          if (existing) return existing;
          const val = buildHierarquia(initialGestor, colabDir, colabCidade, colabRegional);
          hierarquiaCache.set(k, val);
          return val;
        };

        const INTERIOR = 'DIR SERVICOS AO CLIENTE SP INTERIOR';
        const CAPITAL = 'DIR SERVICOS AO CLIENTE SP CAPITAL';

        // Pré-indexar lideranças corporativas do PO estritamente da Diretoria de Serviços ao Cliente
        // Exclui cargos de lojas, varejo e comercial
        for (const p of poRes.rows) {
          const nomeClean = normNome(p.nome);
          if (!nomeClean || !isPersonName(nomeClean)) continue;

          const cargoClean = cleanStr(p.cargo);
          if (isNonFieldRole(cargoClean)) continue; // descarta gerentes/coordenadores de loja

          const isSamuel = isDirectorSpi(nomeClean);
          const isEliseu = isDirectorSpc(nomeClean);
          const isKnownDirector = isSamuel || isEliseu || cargoClean.startsWith('DIR SERVICOS AO CLIENTE');
          const role = isKnownDirector ? 'DIRETOR' : classifyLeaderRole(cargoClean);
          if (!role || (role !== 'DIRETOR' && role !== 'GERENTE' && role !== 'COORDENADOR' && role !== 'SUPERVISOR')) {
            continue;
          }

          const rawDir = p.diretoria_2 || p.diretoria_3 || null;
          const rawDirClean = cleanStr(rawDir);

          // Apenas quem pertence a Serviços ao Cliente ou Engenharia, Transporte e Infraestrutura
          const isInfra = rawDirClean.includes('ENGENHARIA') || rawDirClean.includes('TRANSPORTE') || rawDirClean.includes('INFRA');
          const isServCliente = rawDirClean.includes('SERVICOS AO CLIENTE') || rawDirClean.includes('CLIENTE');
          if (!isInfra && !isServCliente && !isSamuel && !isEliseu) {
            continue;
          }
          if (rawDirClean.includes('LOJA') || rawDirClean.includes('VAREJO') || rawDirClean.includes('COMERCIAL')) {
            continue;
          }

          let reg: 'SPC' | 'SPI';
          let dir: string;
          let diretor: string;
          let cidade = cleanCidade(p.cidade_comercial) || null;

          if (isSamuel) {
            dir = INTERIOR;
            reg = 'SPI';
            diretor = DIRECTOR_SPI;
            cidade = cidade || 'CAMPINAS';
          } else if (isEliseu) {
            dir = CAPITAL;
            reg = 'SPC';
            diretor = DIRECTOR_SPC;
            cidade = cidade || 'SÃO PAULO';
          } else {
            reg = getRegional(cidade) || (rawDirClean.includes('INTERIOR') ? 'SPI' : 'SPC');
            dir = normalizeDiretoria(rawDir, reg) || (reg === 'SPI' ? INTERIOR : CAPITAL);
            diretor = (reg === 'SPI') ? DIRECTOR_SPI : DIRECTOR_SPC;
          }

          let gerente: string | undefined = undefined;
          let coordenador: string | undefined = undefined;

          if (role !== 'DIRETOR' && p.gestor) {
            const hLeader = getHierarquiaCached(p.gestor, dir, cidade, reg);
            if (hLeader.diretor) diretor = hLeader.diretor;
            gerente = hLeader.gerente || (role === 'COORDENADOR' && hLeader.chain[0] ? hLeader.chain[0] : undefined);
            coordenador = hLeader.coordenador || undefined;
          }

          const mapKey = `${nomeClean}__${dir}`;
          if (!liderancasMap.has(mapKey)) {
            liderancasMap.set(mapKey, {
              nome: nomeClean,
              cargo: (isSamuel || isEliseu) ? `DIRETOR REGIONAL ${reg}` : (p.cargo || role),
              tipo: role,
              diretoria: dir,
              diretor,
              gerente: role === 'DIRETOR' || role === 'GERENTE' ? undefined : gerente,
              coordenador: role === 'SUPERVISOR' ? coordenador : undefined,
              cidade: cidade || (dir.includes('INTERIOR') ? 'CAMPINAS' : 'SÃO PAULO'),
              regional: reg,
            });
          }
        }

        // Garantir que os diretores regionais canônicos estão sempre presentes com suas respectivas diretorias
        liderancasMap.set(`${DIRECTOR_SPI}__${INTERIOR}`, {
          nome: DIRECTOR_SPI,
          cargo: 'DIRETOR REGIONAL SP INTERIOR',
          tipo: 'DIRETOR',
          diretoria: INTERIOR,
          diretor: DIRECTOR_SPI,
          cidade: 'CAMPINAS',
          regional: 'SPI',
        });
        liderancasMap.set(`${DIRECTOR_SPC}__${CAPITAL}`, {
          nome: DIRECTOR_SPC,
          cargo: 'DIRETOR REGIONAL SP CAPITAL',
          tipo: 'DIRETOR',
          diretoria: CAPITAL,
          diretor: DIRECTOR_SPC,
          cidade: 'SÃO PAULO',
          regional: 'SPC',
        });

        const formatDataFast = (d: any): string | null => {
          if (!d) return null;
          const s = String(d).trim();
          if (!s) return null;
          if (s.length >= 10 && s[2] === '/' && s[5] === '/') return s;
          if (s.length >= 10 && s[4] === '-' && s[7] === '-') {
            const yyyy = s.substring(0, 4);
            const mm = s.substring(5, 7);
            const dd = s.substring(8, 10);
            const time = s.length > 10 ? s.substring(10).trim() : '00:00:00';
            return `${dd}/${mm}/${yyyy} ${time.padEnd(8, ':00')}`;
          }
          return s;
        };

        const seenNumbers = new Set<string>();
        const formattedAprs: any[] = [];
        for (let i = 0; i < aprRes.rows.length; i++) {
          const a = aprRes.rows[i];
          const num = String(a.numero || '').trim().replace(/\.0+$/, '');
          if (!num || seenNumbers.has(num)) continue;
          seenNumbers.add(num);

          const idMat = normId(a.matricula_auditor);
          const idRe = normId(a.re);
          const p = (idMat && poById.get(idMat)) || (idRe && poById.get(idRe)) || poByNome.get(normNome(a.nome_auditor) || '') || null;
          const spi = (idMat && spiByMat.get(idMat)) || (idRe && spiByMat.get(idRe)) || (normNome(a.nome_auditor) && spiByNome.get(normNome(a.nome_auditor)!)) || null;

          // Cidade Base (Lotação oficial conforme PO / SPI) vs Cidade de Execução (Local onde o checklist foi preenchido)
          const cidadeBase = cleanCidade(spi?.cidade_comercial) || cleanCidade(p?.cidade_comercial) || cleanCidade(a.cidade_comercial) || null;
          const cidadeExecucao = cleanCidade(a.localidade_objeto) || cleanCidade(a.cidade_comercial) || cidadeBase || null;
          const cidadePrincipal = cidadeBase || cidadeExecucao;

          // Regional e Diretoria são determinadas pela Cidade Base (Lotação do Colaborador) para não distorcer equipe/liderança em mutirões
          const regional = getRegional(cidadePrincipal);
          const fc = getFilialCnpj(cidadePrincipal);

          let rawDir = (spi ? INTERIOR : null) || p?.diretoria_2 || p?.diretoria_3 || a.diretoria_3 || null;
          let diretoria = normalizeDiretoria(rawDir, regional);
          if (!diretoria) {
            diretoria = (regional === 'SPI') ? INTERIOR : CAPITAL;
          }

          if (!ALLOWED_DIRETORIAS.includes(diretoria)) continue;

          let gestor = spi?.gestor_atual || p?.gestor || a.gestor || a.supervisor || null;
          if (gestor) {
            gestor = gestor.toString().trim().toUpperCase();
          } else {
            gestor = regional ? `SUPERVISÃO ${regional}` : 'SUPERVISÃO NÃO IDENTIFICADA';
          }

          const filial = (p?.filial && p.filial.trim()) || fc?.filial || spi?.gerencia || p?.gerencia || a.gerencia || (regional ? `FILIAL ${regional}` : 'SÃO PAULO');
          const cnpj = (p?.cnpj && p.cnpj.trim()) || fc?.cnpj || '-';
          const h = getHierarquiaCached(gestor, diretoria, cidadePrincipal, regional);
          const dataFmt = formatDataFast(a.data_fim || a.data_inicio);

          formattedAprs.push({
            "Número": a.numero,
            "Data Fechamento": dataFmt,
            "Data Checklist": dataFmt,
            "Duração": a.duracao,
            "Matrícula Auditor": a.matricula_auditor,
            "Nome Auditor": a.nome_auditor,
            "Localidade Objeto": a.localidade_objeto,
            "Questionário": a.questionario,
            "CIDADE COMERCIAL": cidadePrincipal,
            "CIDADE_BASE": cidadeBase || cidadePrincipal,
            "CIDADE_EXECUCAO": cidadeExecucao,
            "DIRETORIA 2": diretoria,
            "DIRETORIA 3": diretoria,
            "Supervisor": h.supervisor || gestor,
            "COORDENADOR": h.coordenador,
            "GERENTE": h.gerente,
            "DIRETOR": h.diretor,
            "LIDERES": h.chain,
            "Mês": a.mes,
            "ATIVO_SPI": spi ? spi.ativo : 1,
            "IS_SPI": !!spi,
          });
        }
        rows = formattedAprs;

        // Montar a lista canônica de colaboradores do PO em SP filtrada estritamente por cargo TÉCNICO
        const colaboradoresPO: any[] = [];
        const seenMatriculas = new Set<string>();

        // 1. Colaboradores da Diretoria do Interior (SPI):
        // Base oficial exclusiva: Planilha de Correção do Interior (po_spi_override)
        for (const s of spiRes.rows) {
          const mat = normId(s.matricula);
          if (!mat || seenMatriculas.has(mat)) continue;
          seenMatriculas.add(mat);

          const poMatch = poById.get(mat) || (normNome(s.nome) && poByNome.get(normNome(s.nome)!));
          const cargo = s.cargo || poMatch?.cargo || 'TECNICO SERVICO AO CLIENTE';
          if (isNonFieldRole(cargo)) continue;

          const cidade = cleanCidade(s.cidade_comercial) || cleanCidade(poMatch?.cidade_comercial) || null;
          const fc = getFilialCnpj(cidade);
          const gestor = (s.gestor_atual || '').toString().trim().toUpperCase() || 'SUPERVISÃO SPI';
          const filial = fc?.filial || s.gerencia || poMatch?.filial || 'FILIAL SPI';
          const cnpj = fc?.cnpj || poMatch?.cnpj || '-';

          const h = getHierarquiaCached(gestor, INTERIOR, cidade, 'SPI');

          colaboradoresPO.push({
            matricula: mat,
            nome: (s.nome || poMatch?.nome || mat).toString().trim().toUpperCase(),
            cargo: cargo.toString().trim().toUpperCase(),
            diretoria: INTERIOR,
            diretoria_2: INTERIOR,
            gerencia: (s.gerencia || poMatch?.gerencia || '').toString().trim().toUpperCase(),
            filial: filial,
            cnpj: cnpj,
            supervisor: h.supervisor || gestor,
            coordenador: h.coordenador,
            gerente: h.gerente,
            diretor: DIRECTOR_SPI,
            lideres: h.chain,
            cidade: cidade,
            regional: 'SPI',
            ativo_spi: s.ativo, // 1 = Ativo em campo (menos de 500!), 0 = Afastado / Treinamento
            is_spi: true
          });
        }

        // 2. Colaboradores de Serviços ao Cliente Capital e de Engenharia, Transporte e Infraestrutura (Capital e Interior):
        for (const p of poRes.rows) {
          const mat = normId(p.user_id_ssff);
          if (!mat || seenMatriculas.has(mat)) continue;

          const rawDir = p.diretoria_2 || p.diretoria_3 || null;
          const rawDirClean = cleanStr(rawDir);

          const isInfra = rawDirClean.includes('ENGENHARIA') || rawDirClean.includes('TRANSPORTE') || rawDirClean.includes('INFRA');
          const isServCliente = rawDirClean.includes('SERVICOS AO CLIENTE') || rawDirClean.includes('CLIENTE');

          // Aceita apenas quem pertence a Serviços ao Cliente ou Infraestrutura
          if (!isInfra && !isServCliente) continue;

          // Se for Serviços ao Cliente do Interior, já foi tratado com precisão via planilha oficial de correção SPI
          if (isServCliente && (rawDirClean.includes('INTERIOR') || rawDirClean.includes('SPI'))) {
            continue;
          }

          // Apenas técnicos de campo
          if (!isTecnico(p.cargo)) continue;
          if (isNonFieldRole(p.cargo)) continue;
          if (rawDirClean.includes('LOJA') || rawDirClean.includes('VAREJO') || rawDirClean.includes('COMERCIAL')) {
            continue;
          }

          // FILTRO DA COLUNA GRUPO 2: Exclusivo pessoal de Campo (elimina Administrativo e Callcenter)
          if (p.grupo_2 && !isCampoRole(p.grupo_2)) {
            continue;
          }

          const cidade = cleanCidade(p.cidade_comercial) || null;
          const regional = getRegional(cidade) || (rawDirClean.includes('INTERIOR') ? 'SPI' : 'SPC');

          // Se for Serviços ao Cliente e lotação for do Interior, não entra aqui (já no bloco 1)
          if (!isInfra && regional === 'SPI') continue;

          const fc = getFilialCnpj(cidade);
          let diretoria = normalizeDiretoria(rawDir, regional);
          if (!diretoria) {
            diretoria = isInfra
              ? (regional === 'SPI' ? 'DIR ENGENHARIA TRANSPORTE E INFRA - INTERIOR' : 'DIR ENGENHARIA TRANSPORTE E INFRA - CAPITAL')
              : CAPITAL;
          }

          let gestor = p.gestor ? p.gestor.toString().trim().toUpperCase() : `SUPERVISÃO ${regional}`;
          const h = getHierarquiaCached(gestor, diretoria, cidade, regional);

          // Se for Serviços ao Cliente e hierarquia apontar para Samuel Rossi, pertencia ao Interior
          if (!isInfra && h.diretor === DIRECTOR_SPI) continue;

          const filial = (p.filial && p.filial.trim()) || fc?.filial || p.gerencia || `FILIAL ${regional}`;
          const cnpj = (p.cnpj && p.cnpj.trim()) || fc?.cnpj || '-';

          seenMatriculas.add(mat);
          colaboradoresPO.push({
            matricula: mat,
            nome: (p.nome || mat).toString().trim().toUpperCase(),
            cargo: (p.cargo || 'TECNICO').toString().trim().toUpperCase(),
            diretoria: diretoria,
            diretoria_2: diretoria,
            gerencia: (p.gerencia || '').toString().trim().toUpperCase(),
            filial: filial,
            cnpj: cnpj,
            supervisor: h.supervisor || gestor,
            coordenador: h.coordenador,
            gerente: h.gerente,
            diretor: h.diretor || (regional === 'SPI' ? DIRECTOR_SPI : DIRECTOR_SPC),
            lideres: h.chain,
            cidade: cidade,
            regional: regional,
            ativo_spi: 1,
            is_spi: false
          });
        }

        const liderancas = Array.from(liderancasMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
        (rows as any)._colaboradoresPO = colaboradoresPO;
        (rows as any)._liderancas = liderancas;
      } catch (err: any) {
        if (err.code === '42P01') {
          return NextResponse.json([]);
        }
        throw err;
      }
    }

    if (type === 'APR') {
      const payload = {
        data: rows,
        colaboradoresPO: (rows as any)._colaboradoresPO || [],
        liderancas: (rows as any)._liderancas || []
      };
      dataCache[type] = { data: payload, timestamp: Date.now() };
      return NextResponse.json(payload, {
        headers: {
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
        }
      });
    }

    // Converte datas para string no formato padrão brasileiro DD/MM/AAAA HH:mm:ss sem desvio de fuso (para outros tipos como DSS)
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
          return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
        }
        return s;
      };

      if (type === 'DSS') {
        const cid = cleanCidade(r["CIDADE COMERCIAL"]);
        const reg = getRegional(cid);
        let dir = normalizeDiretoria(r["DIRETORIA 3"], reg);
        if (r["IS_SPI"] || reg === 'SPI') {
          if (!dir || dir === 'DIR SERVICOS AO CLIENTE SP CAPITAL') {
            dir = 'DIR SERVICOS AO CLIENTE SP INTERIOR';
          }
        } else if (reg === 'SPC') {
          if (!dir || dir === 'DIR SERVICOS AO CLIENTE SP INTERIOR') {
            dir = 'DIR SERVICOS AO CLIENTE SP CAPITAL';
          }
        }
        return {
          ...r,
          "CIDADE COMERCIAL": cid,
          "DIRETORIA 3": dir,
          "REGIONAL": reg || (dir?.includes('INTERIOR') ? 'SPI' : 'SPC'),
          "Data Fechamento": formatData(r["Data Fechamento"])
        };
      }

      return {
        ...r,
        "CIDADE COMERCIAL": cleanCidade(r["CIDADE COMERCIAL"]),
        "CIDADE_BASE": cleanCidade(r["CIDADE_BASE"]) || cleanCidade(r["CIDADE COMERCIAL"]),
        "CIDADE_EXECUCAO": cleanCidade(r["CIDADE_EXECUCAO"]) || cleanCidade(r["Localidade Objeto"]) || cleanCidade(r["CIDADE COMERCIAL"]),
        "Data Checklist": formatData(r["Data Checklist"]),
        "Data Início": formatData(r["Data Início"]),
        "Data Fim": formatData(r["Data Fim"])
      };
    });

    const finalData = formattedData.filter(r => {
      const dir = (r["DIRETORIA 2"] || r["DIRETORIA 3"] || '').toString().trim().toUpperCase();
      return ALLOWED_DIRETORIAS.includes(dir);
    });

    if (type === 'APR') {
      const payload = {
        data: finalData,
        colaboradoresPO: (rows as any)._colaboradoresPO || [],
        liderancas: (rows as any)._liderancas || []
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
