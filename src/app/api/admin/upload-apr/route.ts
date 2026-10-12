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

        const numeroRaw = getVal(['Número', 'Numero']);
        if (!numeroRaw) continue;
        const numero = String(numeroRaw).trim();

        if (seenNumeros.has(numero)) continue;
        seenNumeros.add(numero);

        const dataAberturaStr = getVal(['Data Abertura', 'Data Início', 'Data Inicio', 'Data Checklist']);
        const dataFechamentoStr = getVal(['Data Fechamento', 'Data Fim', 'Data_Fim']);

        const dataInicio = parseDateFlexible(dataAberturaStr);
        const dataFim = parseDateFlexible(dataFechamentoStr);
        const dataChecklist = dataInicio || dataFim;

        // Duração calculada ou extraída
        let duracao = getVal(['Duração', 'Duracao']);
        if (!duracao && dataInicio && dataFim) {
          const diffSec = Math.max(0, Math.floor((dataFim.getTime() - dataInicio.getTime()) / 1000));
          const h = Math.floor(diffSec / 3600);
          const m = Math.floor((diffSec % 3600) / 60);
          const s = diffSec % 60;
          duracao = [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
        }

        const situacao = getVal(['Situação', 'Situacao']) || (dataFim ? 'FECHADO' : 'ABERTO');

        const matriculaAuditorRaw = getVal(['Matrícula Auditor', 'Matricula Auditor', 'Matrícula', 'Matricula', 'RE']) || '';
        let matriculaAuditor: string | null = String(matriculaAuditorRaw).trim().replace(/\.0+$/, '').replace(/[^0-9]/g, '');
        matriculaAuditor = matriculaAuditor.replace(/^0+/, '') || null;

        const nomeAuditor = getVal(['Nome Auditor', 'Identificador Objeto']) || null;
        const localidadeObjeto = localidadeRaw || null;
        const questionario = questionarioRaw || null;
        const re = getVal(['RE']) || matriculaAuditor;

        let mes: number | null = null;
        let ano: number | null = null;
        const mesRaw = getVal(['Mês', 'Mes']);
        const anoRaw = getVal(['Ano']);
        if (mesRaw) mes = parseInt(mesRaw);
        if (anoRaw) ano = parseInt(anoRaw);

        if (!mes && dataInicio) mes = dataInicio.getMonth() + 1;
        if (!ano && dataInicio) ano = dataInicio.getFullYear();

        const cidadeComercial = getVal(['CIDADE COMERCIAL']) || null;
        const ufComercial = getVal(['UF COMERCIAL']) || 'SP';
        const diretoria3 = getVal(['DIRETORIA 3', 'DIRETORIA3']) || null;
        const gerencia = getVal(['GERÊNCIA', 'GERENCIA']) || null;
        const gestor = getVal(['GESTOR', 'Supervisor']) || null;

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

        const numeroRaw = getVal(['Número', 'Numero']);
        if (!numeroRaw) continue;

        const numero = String(numeroRaw).trim();
        if (seenNumeros.has(numero)) continue;
        seenNumeros.add(numero);

        const dataChecklist = parseDateFlexible(getVal(['Data Checklist', 'Data_Checklist', 'Data Abertura']));
        const dataInicio = parseDateFlexible(getVal(['Data Início', 'Data Inicio', 'Data Abertura']));
        const dataFim = parseDateFlexible(getVal(['Data Fim', 'Data_Fim', 'Data Fechamento']));
        
        let duracao = getVal(['Duração', 'Duracao']);
        if (!duracao && dataInicio && dataFim) {
          const diffSec = Math.max(0, Math.floor((dataFim.getTime() - dataInicio.getTime()) / 1000));
          const h = Math.floor(diffSec / 3600);
          const m = Math.floor((diffSec % 3600) / 60);
          const s = diffSec % 60;
          duracao = [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
        }
        
        const situacao = getVal(['Situação', 'Situacao']) || (dataFim ? 'FECHADO' : 'ABERTO');
        const matriculaAuditorRaw = getVal(['Matrícula Auditor', 'Matricula Auditor', 'Matrícula', 'Matricula', 'RE']) || '';
        let matriculaAuditor: string | null = String(matriculaAuditorRaw).trim().replace(/\.0+$/, '').replace(/[^0-9]/g, '');
        matriculaAuditor = matriculaAuditor.replace(/^0+/, '') || null;

        const nomeAuditor = getVal(['Nome Auditor', 'Identificador Objeto']) || null;
        const localidadeObjeto = localidadeRaw || null;
        const questionario = questionarioRaw || null;
        const re = getVal(['RE']) || matriculaAuditor;
        
        const mesRaw = getVal(['Mês', 'Mes']);
        const anoRaw = getVal(['Ano']);
        let mes = mesRaw ? parseInt(mesRaw) : null;
        let ano = anoRaw ? parseInt(anoRaw) : null;

        if (!mes && dataInicio) mes = dataInicio.getMonth() + 1;
        if (!ano && dataInicio) ano = dataInicio.getFullYear();

        const cidadeComercial = getVal(['CIDADE COMERCIAL']) || null;
        const ufComercial = getVal(['UF COMERCIAL']) || 'SP';
        const diretoria3 = getVal(['DIRETORIA 3', 'DIRETORIA3']) || null;
        const gerencia = getVal(['GERÊNCIA', 'GERENCIA']) || null;
        const gestor = getVal(['GESTOR', 'Supervisor']) || null;

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
      await client.query('BEGIN');

      let updated = 0;

      // Apagar registros existentes da lista para atualizar sem sobrepor/duplicar
      for (let i = 0; i < numerosNaPlanilha.length; i += 5000) {
        const chunk = numerosNaPlanilha.slice(i, i + 5000);
        const delRes = await client.query('DELETE FROM aprs WHERE numero::text = ANY($1::text[])', [chunk]);
        if (delRes.rowCount) updated += delRes.rowCount;
      }

      // Bulk insert dos dados tratados
      const BATCH_SIZE = 500;
      for (let i = 0; i < rowsToProcess.length; i += BATCH_SIZE) {
        const batch = rowsToProcess.slice(i, i + BATCH_SIZE);
        
        const query = `
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

        await client.query(query + placeholders, values);
      }

      await client.query('COMMIT');
      clearDataCache('APR');
      
      const totalProcessed = rowsToProcess.length;
      const imported = totalProcessed - updated;

      return NextResponse.json({ 
        success: true, 
        message: `Importação concluída com sucesso! ${imported} novas APRs inseridas e ${updated} atualizadas (Total processado: ${totalProcessed}).` 
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

// Função flexível para conversão de datas (formato brasileiro DD/MM/AAAA, ISO ou Excel serial)
function parseDateFlexible(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    return new Date((val - (25567 + 2)) * 86400 * 1000);
  }
  if (typeof val === 'string') {
    const s = val.trim();
    // Formato brasileiro: DD/MM/AAAA [HH:mm[:ss]]
    const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (br) {
      const [, dd, mm, yyyy, hh = '0', mi = '0', ss = '0'] = br;
      const d = new Date(+yyyy, +mm - 1, +dd, +hh, +mi, +ss);
      return isNaN(d.getTime()) ? null : d;
    }
    // Formato ISO: AAAA-MM-DD [HH:mm:ss]
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (iso) {
      const [, yyyy, mm, dd, hh = '0', mi = '0', ss = '0'] = iso;
      const d = new Date(+yyyy, +mm - 1, +dd, +hh, +mi, +ss);
      return isNaN(d.getTime()) ? null : d;
    }
    const standard = new Date(s);
    if (!isNaN(standard.getTime())) return standard;
  }
  return null;
}
