import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import * as xlsx from 'xlsx';
import { clearDataCache } from '@/lib/cache';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const fileName = (file.name || '').toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const rowsToProcess: any[] = [];
    const numerosNaPlanilha: string[] = [];
    const seenNumeros = new Set<string>();

    const normalizeKey = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    const toUpper = (v: any): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim().replace(/\s+/g, ' ').toUpperCase();
      return s || null;
    };

    const cleanNumero = (v: any): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim().replace(/\.0+$/, '').replace(/[^0-9]/g, '');
      return s || null;
    };

    const CITY_NORM_MAP: Record<string, string> = {
      'SAO PAULO': 'SÃO PAULO',
      'SAO BERNARDO DO CAMPO': 'SÃO BERNARDO DO CAMPO',
      'SAO JOSE DOS CAMPOS': 'SÃO JOSÉ DOS CAMPOS',
      'SAO JOSE DO RIO PRETO': 'SÃO JOSÉ DO RIO PRETO',
      'SAO CARLOS': 'SÃO CARLOS',
      'SAO VICENTE': 'SÃO VICENTE',
      'SANTO ANDRE': 'SANTO ANDRÉ',
      'MAUA': 'MAUÁ',
      'GUARUJA': 'GUARUJÁ',
      'CUBATAO': 'CUBATÃO',
      'RIBEIRAO PRETO': 'RIBEIRÃO PRETO',
      'ARACATUBA': 'ARAÇATUBA',
      'JAU': 'JAÚ',
      'JUNDIAI': 'JUNDIAÍ',
      'MARILIA': 'MARÍLIA',
    };

    const cleanCidade = (v: any): string | null => {
      if (!v) return null;
      const s = String(v).trim();
      if (!s) return null;
      const withoutPrefix = s.replace(/^[A-Z]{2}(\s+[-–—]?\s*|\s*[-–—]\s*)/i, '').replace(/\s+/g, ' ').trim();
      const upper = (withoutPrefix || s).toUpperCase();
      const unaccented = upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return CITY_NORM_MAP[unaccented] || upper;
    };

    const isCsv = fileName.endsWith('.csv') || file.type === 'text/csv';

    if (isCsv) {
      // ----------------------------------------------------
      // Processamento de CSV bruto (auditoria.csv ou export)
      // ----------------------------------------------------
      let text = '';
      try {
        const decUtf8 = new TextDecoder('utf-8', { fatal: true });
        text = decUtf8.decode(buffer);
      } catch {
        const dec1252 = new TextDecoder('windows-1252');
        text = dec1252.decode(buffer);
      }

      const lines = text.split('\n');
      if (lines.length < 2) {
        return NextResponse.json({ success: false, message: "O arquivo CSV está vazio." }, { status: 400 });
      }

      // Detectar delimitador (; ou ,)
      const firstLine = lines[0];
      const sep = firstLine.includes(';') ? ';' : ',';
      const headers = firstLine.split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''));

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
        const rawRow: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rawRow[h] = cols[idx] !== undefined ? cols[idx] : '';
        });

        const getVal = (keys: string[]) => {
          const rowKeys = Object.keys(rawRow);
          for (const key of keys) {
            const target = normalizeKey(key);
            const found = rowKeys.find(k => normalizeKey(k) === target);
            if (found !== undefined && rawRow[found] !== null && rawRow[found] !== '') {
              return rawRow[found];
            }
          }
          return null;
        };

        const questionarioRaw = getVal(['Nome Questionário', 'Questionário', 'Questionario', 'Nome Questionario']) || '';
        const questionarioUpper = questionarioRaw.toUpperCase();

        // Filtro 1: Apenas APR
        if (!questionarioUpper.includes('APR') && !questionarioUpper.includes('ANALISE PRELIMINAR DE RISCOS')) {
          continue;
        }

        const localidadeRaw = getVal(['Localidade Objeto', 'Localidade', 'Base']) || '';
        const localidadeUpper = localidadeRaw.toUpperCase().trim();

        // Filtro 2: Apenas região de São Paulo (SP)
        const isSP = localidadeUpper.startsWith('SP') || localidadeUpper.startsWith('SP ') || localidadeUpper.includes(' SP');
        if (!isSP) {
          continue;
        }

        const numero = cleanNumero(getVal(['Número', 'Numero']));
        if (!numero) continue;

        if (seenNumeros.has(numero)) continue;
        seenNumeros.add(numero);

        const dataAberturaStr = getVal(['Data Abertura', 'Data Início', 'Data Inicio', 'Data Checklist']);
        const dataFechamentoStr = getVal(['Data Fechamento', 'Data Fim', 'Data_Fim']);

        const dataInicioObj = parseDateFlexible(dataAberturaStr);
        const dataFimObj = parseDateFlexible(dataFechamentoStr);
        const dataChecklistObj = dataInicioObj || dataFimObj;

        const dataInicio = dataInicioObj?.sql || null;
        const dataFim = dataFimObj?.sql || null;
        const dataChecklist = dataChecklistObj?.sql || null;

        // Duração calculada ou extraída
        let duracao = getVal(['Duração', 'Duracao']);
        if (!duracao && dataInicioObj && dataFimObj) {
          const diffSec = Math.max(0, Math.floor((dataFimObj.getTime() - dataInicioObj.getTime()) / 1000));
          const h = Math.floor(diffSec / 3600);
          const m = Math.floor((diffSec % 3600) / 60);
          const s = diffSec % 60;
          duracao = [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
        }

        const situacao = toUpper(getVal(['Situação', 'Situacao'])) || (dataFim ? 'FECHADO' : 'ABERTO');

        const matriculaAuditorRaw = getVal(['Matrícula Auditor', 'Matricula Auditor', 'Matrícula', 'Matricula', 'RE']) || '';
        let matriculaAuditor: string | null = String(matriculaAuditorRaw).trim().replace(/\.0+$/, '').replace(/[^0-9]/g, '');
        matriculaAuditor = matriculaAuditor.replace(/^0+/, '') || null;

        const nomeAuditor = toUpper(getVal(['Nome Auditor', 'Identificador Objeto'])) || null;
        const localidadeObjeto = toUpper(localidadeRaw) || null;
        const questionario = toUpper(questionarioRaw) || null;
        const re = getVal(['RE']) ? cleanNumero(getVal(['RE'])) : matriculaAuditor;

        let mes: number | null = null;
        let ano: number | null = null;
        const mesRaw = getVal(['Mês', 'Mes']);
        const anoRaw = getVal(['Ano']);
        if (mesRaw) mes = parseInt(mesRaw);
        if (anoRaw) ano = parseInt(anoRaw);

        if (!mes && dataInicioObj) mes = dataInicioObj.mes;
        if (!ano && dataInicioObj) ano = dataInicioObj.ano;

        const cidadeComercial = toUpper(cleanCidade(getVal(['CIDADE COMERCIAL'])) || cleanCidade(localidadeRaw)) || null;
        const ufComercial = 'SP';
        const diretoria3 = toUpper(getVal(['DIRETORIA 3', 'DIRETORIA3'])) || null;
        const gerencia = toUpper(getVal(['GERÊNCIA', 'GERENCIA'])) || null;
        const gestor = toUpper(getVal(['GESTOR', 'Supervisor'])) || null;

        numerosNaPlanilha.push(numero);
        rowsToProcess.push({
          numero, dataChecklist, dataInicio, dataFim, duracao, situacao,
          matriculaAuditor, nomeAuditor, localidadeObjeto, questionario,
          re, cidadeComercial, ufComercial, diretoria3, gerencia,
          gestor, mes, ano
        });
      }

    } else {
      // ----------------------------------------------------
      // Processamento de XLSX / XLS
      // ----------------------------------------------------
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      let headerIndex = -1;
      
      for (let i = 0; i < Math.min(25, rawData.length); i++) {
        const rowArr = rawData[i] as any[];
        if (rowArr && rowArr.some(v => typeof v === 'string' && (v.trim().toLowerCase().includes('número') || v.trim().toLowerCase().includes('numero')))) {
          headerIndex = i;
          break;
        }
      }

      if (headerIndex === -1) {
        return NextResponse.json({ success: false, message: "Não foi possível encontrar a linha de cabeçalho com a coluna 'Número'." }, { status: 400 });
      }

      const data = xlsx.utils.sheet_to_json(sheet, { range: headerIndex, defval: null });

      if (!Array.isArray(data) || data.length === 0) {
        return NextResponse.json({ success: false, message: "A planilha está vazia ou no formato incorreto." }, { status: 400 });
      }

      for (const rawRow of data as any[]) {
        const getVal = (keys: string[]) => {
          const rowKeys = Object.keys(rawRow);
          for (const key of keys) {
            const target = normalizeKey(key);
            const found = rowKeys.find(k => normalizeKey(k) === target);
            if (found !== undefined && rawRow[found] !== null && rawRow[found] !== '') {
              return rawRow[found];
            }
          }
          return null;
        };

        const questionarioRaw = getVal(['Questionário', 'Questionario', 'Nome Questionário', 'Nome Questionario']) || '';
        const questionarioUpper = questionarioRaw ? questionarioRaw.toUpperCase() : '';

        // Se for planilha bruta de auditoria contendo outros questionários, filtra apenas APR
        if (questionarioUpper && !questionarioUpper.includes('APR') && !questionarioUpper.includes('ANALISE PRELIMINAR DE RISCOS')) {
          continue;
        }

        const localidadeRaw = getVal(['Localidade Objeto', 'Localidade']) || '';
        const localidadeUpper = localidadeRaw ? localidadeRaw.toUpperCase().trim() : '';

        // Se contiver localidade e for planilha com outros estados, filtra SP
        if (localidadeUpper) {
          const isSP = localidadeUpper.startsWith('SP') || localidadeUpper.startsWith('SP ') || localidadeUpper.includes(' SP');
          // Só filtra se tiver formato de estado (ex: RJ ..., MG ..., etc.)
          const hasOtherState = /^[A-Z]{2}\s/.test(localidadeUpper) && !localidadeUpper.startsWith('SP');
          if (hasOtherState) {
            continue;
          }
        }

        const numero = cleanNumero(getVal(['Número', 'Numero']));
        if (!numero) continue;

        if (seenNumeros.has(numero)) continue;
        seenNumeros.add(numero);

        const dataChecklistObj = parseDateFlexible(
          getVal(['Data Checklist', 'Data_Checklist', 'Data Abertura']),
          getVal(['Hora Checklist', 'Hora Início', 'Hora Inicio'])
        );
        const dataInicioObj = parseDateFlexible(
          getVal(['Data Início', 'Data Inicio', 'Data Abertura']),
          getVal(['Hora Início', 'Hora Inicio', 'Hora Abertura'])
        );
        const dataFimObj = parseDateFlexible(
          getVal(['Data Fim', 'Data_Fim', 'Data Fechamento']),
          getVal(['Hora Fim', 'Hora Fechamento'])
        );

        const dataChecklist = dataChecklistObj?.sql || null;
        const dataInicio = dataInicioObj?.sql || null;
        const dataFim = dataFimObj?.sql || null;
        
        let duracao = getVal(['Duração', 'Duracao']);
        if (!duracao && dataInicioObj && dataFimObj) {
          const diffSec = Math.max(0, Math.floor((dataFimObj.getTime() - dataInicioObj.getTime()) / 1000));
          const h = Math.floor(diffSec / 3600);
          const m = Math.floor((diffSec % 3600) / 60);
          const s = diffSec % 60;
          duracao = [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
        }
        
        const situacao = toUpper(getVal(['Situação', 'Situacao'])) || (dataFim ? 'FECHADO' : 'ABERTO');
        const matriculaAuditorRaw = getVal(['Matrícula Auditor', 'Matricula Auditor', 'Matrícula', 'Matricula', 'RE']) || '';
        let matriculaAuditor: string | null = String(matriculaAuditorRaw).trim().replace(/\.0+$/, '').replace(/[^0-9]/g, '');
        matriculaAuditor = matriculaAuditor.replace(/^0+/, '') || null;

        const nomeAuditor = toUpper(getVal(['Nome Auditor', 'Identificador Objeto'])) || null;
        const localidadeObjeto = toUpper(localidadeRaw) || null;
        const questionario = toUpper(questionarioRaw) || null;
        const re = getVal(['RE']) ? cleanNumero(getVal(['RE'])) : matriculaAuditor;
        
        const mesRaw = getVal(['Mês', 'Mes']);
        const anoRaw = getVal(['Ano']);
        let mes = mesRaw ? parseInt(mesRaw) : null;
        let ano = anoRaw ? parseInt(anoRaw) : null;

        if (!mes && dataInicioObj) mes = dataInicioObj.mes;
        if (!ano && dataInicioObj) ano = dataInicioObj.ano;

        const cidadeComercial = toUpper(cleanCidade(getVal(['CIDADE COMERCIAL'])) || cleanCidade(localidadeRaw)) || null;
        const ufComercial = 'SP';
        const diretoria3 = toUpper(getVal(['DIRETORIA 3', 'DIRETORIA3'])) || null;
        const gerencia = toUpper(getVal(['GERÊNCIA', 'GERENCIA'])) || null;
        const gestor = toUpper(getVal(['GESTOR', 'Supervisor'])) || null;

        numerosNaPlanilha.push(numero);
        rowsToProcess.push({
          numero, dataChecklist, dataInicio, dataFim, duracao, situacao,
          matriculaAuditor, nomeAuditor, localidadeObjeto, questionario,
          re, cidadeComercial, ufComercial, diretoria3, gerencia,
          gestor, mes, ano
        });
      }
    }

    if (rowsToProcess.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Nenhuma APR correspondente a São Paulo foi encontrada no arquivo." 
      }, { status: 400 });
    }

    // Conectar ao banco
    const client = await pool.connect();

    try {
      // 1. Garantir que a tabela aprs exista, expurgar duplicatas legadas e cravar constraint UNIQUE em numero
      await client.query(`
        CREATE TABLE IF NOT EXISTS aprs (
          id SERIAL PRIMARY KEY,
          numero BIGINT,
          data_checklist TIMESTAMP,
          data_inicio TIMESTAMP,
          data_fim TIMESTAMP,
          duracao VARCHAR(50),
          situacao VARCHAR(50),
          matricula_auditor BIGINT,
          nome_auditor VARCHAR(255),
          localidade_objeto VARCHAR(255),
          questionario VARCHAR(255),
          re VARCHAR(50),
          cidade_comercial VARCHAR(100),
          uf_comercial VARCHAR(10),
          diretoria_3 VARCHAR(100),
          gerencia VARCHAR(100),
          gestor VARCHAR(255),
          mes INT,
          ano INT
        );

        -- Remove eventuais duplicados legados mantendo o de maior id
        DELETE FROM aprs a
        USING aprs b
        WHERE a.numero = b.numero AND a.id < b.id;

        -- Garante índice único para blindar duplicidade fisicamente
        CREATE UNIQUE INDEX IF NOT EXISTS aprs_numero_uniq_idx ON aprs (numero);
      `);

      await client.query('BEGIN');

      let novasInseridas = 0;
      let atualizadas = 0;

      // Bulk upsert dos dados tratados com ON CONFLICT (numero)
      const BATCH_SIZE = 500;
      for (let i = 0; i < rowsToProcess.length; i += BATCH_SIZE) {
        const batch = rowsToProcess.slice(i, i + BATCH_SIZE);
        
        const baseQuery = `
          INSERT INTO aprs (
            numero, data_checklist, data_inicio, data_fim, duracao, situacao,
            matricula_auditor, nome_auditor, localidade_objeto, questionario,
            re, cidade_comercial, uf_comercial, diretoria_3, gerencia,
            gestor, mes, ano
          ) VALUES 
        `;
        const values: any[] = [];
        let valIndex = 1;
        const placeholders = batch.map(r => {
          const rowStr = Array.from({length: 18}, (_, idx) => `$${valIndex + idx}`).join(', ');
          values.push(
            r.numero, r.dataChecklist, r.dataInicio, r.dataFim, r.duracao, r.situacao,
            r.matriculaAuditor, r.nomeAuditor, r.localidadeObjeto, r.questionario,
            r.re, r.cidadeComercial, r.ufComercial, r.diretoria3, r.gerencia,
            r.gestor, r.mes, r.ano
          );
          valIndex += 18;
          return `(${rowStr})`;
        }).join(', ');

        const conflictClause = `
          ON CONFLICT (numero) DO UPDATE SET
            data_checklist = EXCLUDED.data_checklist,
            data_inicio = EXCLUDED.data_inicio,
            data_fim = EXCLUDED.data_fim,
            duracao = EXCLUDED.duracao,
            situacao = EXCLUDED.situacao,
            matricula_auditor = EXCLUDED.matricula_auditor,
            nome_auditor = EXCLUDED.nome_auditor,
            localidade_objeto = EXCLUDED.localidade_objeto,
            questionario = EXCLUDED.questionario,
            re = EXCLUDED.re,
            cidade_comercial = EXCLUDED.cidade_comercial,
            uf_comercial = EXCLUDED.uf_comercial,
            diretoria_3 = EXCLUDED.diretoria_3,
            gerencia = EXCLUDED.gerencia,
            gestor = EXCLUDED.gestor,
            mes = EXCLUDED.mes,
            ano = EXCLUDED.ano
          RETURNING (xmax = 0) AS is_insert;
        `;

        const res = await client.query(baseQuery + placeholders + conflictClause, values);
        for (const row of res.rows) {
          if (row.is_insert) {
            novasInseridas++;
          } else {
            atualizadas++;
          }
        }
      }

      await client.query('COMMIT');
      clearDataCache('APR');
      
      const totalProcessado = rowsToProcess.length;

      return NextResponse.json({ 
        success: true, 
        message: `Importação de APR concluída com sucesso! ${novasInseridas} novas APRs inseridas, ${atualizadas} atualizadas (0 duplicadas de um total de ${totalProcessado} processadas).` 
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Erro no upload de APR:", error);
    return NextResponse.json({ success: false, message: "Erro ao processar: " + (error.message || String(error)) }, { status: 500 });
  }
}

interface ParsedDateResult {
  sql: string;
  ano: number;
  mes: number;
  dia: number;
  getTime: () => number;
}

// Função flexível e robusta para conversão de datas (imune a distorções de timezone)
function parseDateFlexible(val: any, horaVal?: any): ParsedDateResult | null {
  if (!val) return null;
  const pad = (n: number | string) => String(n).padStart(2, '0');

  let y = 0, m = 0, d = 0, h = 0, min = 0, s = 0;
  let found = false;

  // 1. Número serial do Excel
  if (typeof val === 'number') {
    try {
      const p = (xlsx.SSF as any).parse_date_code(val);
      if (p && p.y && p.m && p.d) {
        y = p.y; m = p.m; d = p.d;
        h = p.H || 0; min = p.M || 0; s = Math.floor(p.S || 0);
        found = true;
      }
    } catch {}
  }

  // 2. String
  if (!found && typeof val === 'string') {
    const str = val.trim();
    // Formato brasileiro: DD/MM/AAAA [HH:mm[:ss]]
    const br = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (br) {
      d = parseInt(br[1], 10);
      m = parseInt(br[2], 10);
      y = parseInt(br[3], 10);
      h = br[4] ? parseInt(br[4], 10) : 0;
      min = br[5] ? parseInt(br[5], 10) : 0;
      s = br[6] ? parseInt(br[6], 10) : 0;
      found = true;
    } else {
      // Formato ISO: AAAA-MM-DD [HH:mm[:ss]]
      const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (iso) {
        y = parseInt(iso[1], 10);
        m = parseInt(iso[2], 10);
        d = parseInt(iso[3], 10);
        h = iso[4] ? parseInt(iso[4], 10) : 0;
        min = iso[5] ? parseInt(iso[5], 10) : 0;
        s = iso[6] ? parseInt(iso[6], 10) : 0;
        found = true;
      }
    }
  }

  if (!found && val instanceof Date && !isNaN(val.getTime())) {
    y = val.getFullYear();
    m = val.getMonth() + 1;
    d = val.getDate();
    h = val.getHours();
    min = val.getMinutes();
    s = val.getSeconds();
    found = true;
  }

  if (!found) return null;

  // Se a hora for zero e houver horaVal específica (ex: coluna 'Hora Início')
  if (h === 0 && min === 0 && s === 0 && horaVal !== null && horaVal !== undefined) {
    if (typeof horaVal === 'string') {
      const hMatch = horaVal.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (hMatch) {
        h = parseInt(hMatch[1], 10);
        min = parseInt(hMatch[2], 10);
        s = hMatch[3] ? parseInt(hMatch[3], 10) : 0;
      }
    } else if (typeof horaVal === 'number') {
      const totalSecs = Math.round(horaVal * 86400);
      h = Math.floor(totalSecs / 3600) % 24;
      min = Math.floor((totalSecs % 3600) / 60);
      s = totalSecs % 60;
    }
  }

  const sql = `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}:${pad(s)}`;
  return {
    sql,
    ano: y,
    mes: m,
    dia: d,
    getTime: () => Date.UTC(y, m - 1, d, h, min, s)
  };
}
