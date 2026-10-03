import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import * as xlsx from 'xlsx';

const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

function getPreviousMonthAndYear(mesStr: string, ano: number) {
  const upperMes = mesStr.toUpperCase();
  const index = MONTHS.indexOf(upperMes);
  if (index === -1) return { prevMes: null, prevAno: null }; // Fallback

  if (index === 0) {
    return { prevMes: 'DEZEMBRO', prevAno: ano - 1 };
  }
  return { prevMes: MONTHS[index - 1], prevAno: ano };
}

const normalizeKey = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

// Normaliza o mês para o nome em maiúsculas (aceita "Junho", "JUNHO", "6", "Marco"...)
function normalizeMes(raw: any): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toUpperCase();
  if (!s) return null;
  const n = parseInt(s, 10);
  if (!isNaN(n) && n >= 1 && n <= 12 && /^\d+$/.test(s)) return MONTHS[n - 1];
  if (s === 'MARCO') return 'MARÇO';
  return s;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ler a planilha
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Obter dados
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null });

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ success: false, message: "A planilha está vazia ou no formato incorreto." }, { status: 400 });
    }

    // Mapear os cabeçalhos uma única vez (ignorando acentos, espaços e caixa), respeitando a prioridade
    const headers = Object.keys(data[0] as any);
    const findHeader = (keys: string[]) => {
      for (const key of keys) {
        const target = normalizeKey(key);
        const found = headers.find(h => normalizeKey(h) === target);
        if (found) return found;
      }
      return null;
    };

    const H = {
      ano: findHeader(['ANO']),
      mes: findHeader(['MÊS', 'MES']),
      // RE (coluna D) tem prioridade: é ele que casa com a "Matrícula Auditor" da APR
      re: findHeader(['RE', 'MATRÍCULA', 'MATRICULA', 'USER ID SSFF']),
      status: findHeader(['STATUS']),
      nome: findHeader(['NOME']),
      cargo: findHeader(['CARGO']),
      diretoria3: findHeader(['DIRETORIA 3', 'DIRETORIA3']),
      gerencia: findHeader(['GERÊNCIA', 'GERENCIA']),
      gestor: findHeader(['GESTOR']),
      cidade: findHeader(['CIDADE COMERCIAL']),
      uf: findHeader(['UF COMERCIAL']),
      admissao: findHeader(['DATA ADMISSÃO', 'DATA ADMISSAO']),
      desligamento: findHeader(['DATA DESLIGAMENTO']),
    };

    if (!H.ano || !H.mes || !H.re) {
      return NextResponse.json({
        success: false,
        message: `Colunas obrigatórias não encontradas (ANO, MÊS, RE). Cabeçalhos lidos: ${headers.join(', ')}`
      }, { status: 400 });
    }

    const get = (row: any, h: string | null) => (h ? row[h] : null);

    // Montar as linhas em memória
    const periods = new Set<string>();
    const processedIdsPerPeriod = new Set<string>();
    const rowsToInsert: any[][] = [];

    for (const row of data as any[]) {
      const rowAno = parseInt(get(row, H.ano), 10);
      const rowMes = normalizeMes(get(row, H.mes));
      if (!rowAno || !rowMes) continue;

      const userIdRaw = get(row, H.re);
      let userId = userIdRaw !== null && userIdRaw !== undefined
        ? String(userIdRaw).trim().replace(/\.0+$/, '').replace(/[^0-9]/g, '').replace(/^0+/, '')
        : '';
      if (!userId) continue;

      // Evitar duplicidade de matrícula no MESMO mês/ano na própria planilha
      const uniqueKey = `${rowAno}-${rowMes}-${userId}`;
      if (processedIdsPerPeriod.has(uniqueKey)) continue;
      processedIdsPerPeriod.add(uniqueKey);
      periods.add(`${rowAno}|${rowMes}`);

      rowsToInsert.push([
        rowAno, rowMes, get(row, H.status) || 'ATIVO', userId,
        get(row, H.nome) || null, get(row, H.cargo) || null, get(row, H.diretoria3) || null,
        get(row, H.gerencia) || null, get(row, H.gestor) || null,
        get(row, H.cidade) || null, get(row, H.uf) || null,
        parseExcelDate(get(row, H.admissao)), parseExcelDate(get(row, H.desligamento))
      ]);
    }

    if (periods.size === 0) {
      return NextResponse.json({ success: false, message: "A planilha não possui as colunas ANO e MÊS ou elas estão vazias." }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Limpar dados existentes apenas para os meses/anos que estão sendo enviados agora
      for (const period of Array.from(periods)) {
        const [anoStr, mes] = period.split('|');
        await client.query('DELETE FROM po WHERE ano = $1 AND UPPER(TRIM(mes)) = $2', [parseInt(anoStr, 10), mes]);
      }

      // 2. Inserção em lote
      const COLS = 13;
      const BATCH_SIZE = 1000;
      for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
        const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
        const values: any[] = [];
        const placeholders = batch.map((r, bi) => {
          values.push(...r);
          const base = bi * COLS;
          return `(${Array.from({ length: COLS }, (_, c) => `$${base + c + 1}`).join(', ')})`;
        }).join(', ');

        await client.query(`
          INSERT INTO po (
            ano, mes, status, user_id_ssff, nome, cargo, diretoria_3,
            gerencia, gestor, cidade_comercial, uf_comercial, data_admissao, data_desligamento
          ) VALUES ${placeholders}
        `, values);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ 
      success: true, 
      message: `Upload do Plano concluído! ${rowsToInsert.length} registros importados (chave: coluna "${H.re}") nos ${periods.size} meses identificados.` 
    });
  } catch (error: any) {
    console.error("Erro no upload do PO:", error);
    return NextResponse.json({ success: false, message: "Erro ao processar o arquivo no banco de dados: " + (error?.message || String(error)) }, { status: 500 });
  }
}

function parseExcelDate(val: any) {
  if (!val) return null;
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    return null;
  }
  if (typeof val === 'number') {
    return new Date((val - (25567 + 2)) * 86400 * 1000);
  }
  return null;
}
