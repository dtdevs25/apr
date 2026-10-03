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

    // Identificar todos os meses/anos presentes na planilha
    const periods = new Set<string>();
    
    for (const row of data as any[]) {
      const rowAno = parseInt(row['ANO'], 10);
      const rowMes = String(row['MÊS']).toUpperCase();
      if (rowAno && rowMes && rowMes !== 'UNDEFINED') {
        periods.add(`${rowAno}-${rowMes}`);
      }
    }

    if (periods.size === 0) {
      return NextResponse.json({ success: false, message: "A planilha não possui as colunas ANO e MÊS ou elas estão vazias." }, { status: 400 });
    }

    let inseridosArquivo = 0;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Limpar dados existentes apenas para os meses/anos que estão sendo enviados agora
      for (const period of Array.from(periods)) {
        const [anoStr, mes] = period.split('-');
        await client.query('DELETE FROM po WHERE ano = $1 AND mes = $2', [parseInt(anoStr, 10), mes]);
      }

      // Conjunto para evitar duplicidade de matrícula no MESMO mês/ano na própria planilha
      const processedIdsPerPeriod = new Set<string>();

      // 2. Inserir dados do arquivo
      for (const row of data as any[]) {
        const normalizeKey = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

        // Função para buscar chave ignorando case, acentos e espaços extras
        const getVal = (keys: string[]) => {
          for (const k of Object.keys(row)) {
            const cleanK = normalizeKey(k);
            if (keys.some(key => cleanK === normalizeKey(key))) {
              return row[k];
            }
          }
          return null;
        };

        const rowAnoRaw = getVal(['ANO']);
        const rowMesRaw = getVal(['MÊS', 'MES', 'Mês', 'Mes']);
        const rowAno = rowAnoRaw ? parseInt(rowAnoRaw, 10) : null;
        const rowMes = rowMesRaw ? String(rowMesRaw).toUpperCase() : null;
        
        if (!rowAno || !rowMes || rowMes === 'UNDEFINED') continue;

        const userIdRaw = getVal(['USER ID SSFF', 'RE', 'MATRÍCULA', 'MATRICULA']);
        let userId = userIdRaw ? String(userIdRaw).replace(/[^0-9]/g, '') : null;
        if (userId) userId = userId.replace(/^0+/, '');
        if (!userId) continue;

        // Verificar se esse userId já foi processado neste mesmo ano/mês
        const uniqueKey = `${rowAno}-${rowMes}-${userId}`;
        if (processedIdsPerPeriod.has(uniqueKey)) {
          continue; // Pula se já existir, evitando duplicação
        }
        processedIdsPerPeriod.add(uniqueKey);

        const status = getVal(['STATUS']) || 'ATIVO';
        const nome = getVal(['NOME']) || null;
        const cargo = getVal(['CARGO']) || null;
        const diretoria3 = getVal(['DIRETORIA 3', 'DIRETORIA3', 'Diretoria 3']) || null;
        const gerencia = getVal(['GERÊNCIA', 'GERENCIA']) || null;
        const gestor = getVal(['GESTOR']) || null;
        const cidade = getVal(['CIDADE COMERCIAL']) || null;
        const uf = getVal(['UF COMERCIAL']) || null;
        const dataAdmissao = parseExcelDate(getVal(['DATA ADMISSÃO', 'DATA ADMISSAO']));
        const dataDesligamento = parseExcelDate(getVal(['DATA DESLIGAMENTO']));

        await client.query(`
          INSERT INTO po (
            ano, mes, status, user_id_ssff, nome, cargo, diretoria_3,
            gerencia, gestor, cidade_comercial, uf_comercial, data_admissao, data_desligamento
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
        `, [
          rowAno, rowMes, status, userId, nome, cargo, diretoria3,
          gerencia, gestor, cidade, uf, dataAdmissao, dataDesligamento
        ]);
        inseridosArquivo++;
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
      message: `Upload do Plano concluído! ${inseridosArquivo} ativos importados sem duplicações nos ${periods.size} meses identificados.` 
    });
  } catch (error) {
    console.error("Erro no upload do PO:", error);
    return NextResponse.json({ success: false, message: "Erro ao processar o arquivo no banco de dados." }, { status: 500 });
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
