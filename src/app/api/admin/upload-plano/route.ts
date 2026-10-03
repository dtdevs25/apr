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

    // Extrair o Ano e Mês da primeira linha válida
    let currentAno: number | null = null;
    let currentMes: string | null = null;

    for (const row of data as any[]) {
      if (row['ANO'] && row['MÊS']) {
        currentAno = parseInt(row['ANO'], 10);
        currentMes = String(row['MÊS']).toUpperCase();
        break;
      }
    }

    if (!currentAno || !currentMes) {
      return NextResponse.json({ success: false, message: "A planilha não possui as colunas ANO e MÊS ou elas estão vazias." }, { status: 400 });
    }

    const { prevMes, prevAno } = getPreviousMonthAndYear(currentMes, currentAno);

    let inseridosArquivo = 0;
    let inseridosDesligados = 0;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Limpar dados existentes para o mesmo ano e mês (para evitar duplicação caso faça upload novamente)
      await client.query('DELETE FROM po WHERE ano = $1 AND mes = $2', [currentAno, currentMes]);

      // Array para guardar os IDs de quem está neste arquivo
      const activeIds = new Set<string>();

      // 2. Inserir dados do arquivo
      for (const row of data as any[]) {
        const userIdRaw = row['USER ID SSFF'] || row['RE'] || row['MATRÍCULA'] || null;
        const userId = userIdRaw ? String(userIdRaw).replace(/[^0-9]/g, '') : null;
        if (!userId) continue;

        activeIds.add(userId);

        const status = row['STATUS'] || 'ATIVO';
        const nome = row['NOME'] || null;
        const cargo = row['CARGO'] || null;
        const diretoria3 = row['DIRETORIA 3'] || null;
        const gerencia = row['GERÊNCIA'] || null;
        const gestor = row['GESTOR'] || null;
        const cidade = row['CIDADE COMERCIAL'] || null;
        const uf = row['UF COMERCIAL'] || null;
        const dataAdmissao = parseExcelDate(row['DATA ADMISSÃO']);
        const dataDesligamento = parseExcelDate(row['DATA DESLIGAMENTO']);

        await client.query(`
          INSERT INTO po (
            ano, mes, status, user_id_ssff, nome, cargo, diretoria_3,
            gerencia, gestor, cidade_comercial, uf_comercial, data_admissao, data_desligamento
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
        `, [
          currentAno, currentMes, status, userId, nome, cargo, diretoria3,
          gerencia, gestor, cidade, uf, dataAdmissao, dataDesligamento
        ]);
        inseridosArquivo++;
      }

      // 3. Lógica de Histórico (Desligados)
      if (prevAno && prevMes) {
        // Buscar todos do mês anterior
        const { rows: previousUsers } = await client.query(`
          SELECT * FROM po 
          WHERE ano = $1 AND mes = $2 AND status != 'DESLIGADO/DEMITIDO'
        `, [prevAno, prevMes]);

        for (const oldUser of previousUsers) {
          const uIdStr = String(oldUser.user_id_ssff);
          
          // Se o cara estava no mês anterior mas NÃO está no arquivo atual
          if (!activeIds.has(uIdStr)) {
            await client.query(`
              INSERT INTO po (
                ano, mes, status, user_id_ssff, nome, cargo, diretoria_3,
                gerencia, gestor, cidade_comercial, uf_comercial, data_admissao, data_desligamento
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
              )
            `, [
              currentAno, currentMes, 'DESLIGADO/DEMITIDO', oldUser.user_id_ssff, oldUser.nome,
              oldUser.cargo, oldUser.diretoria_3, oldUser.gerencia, oldUser.gestor,
              oldUser.cidade_comercial, oldUser.uf_comercial, oldUser.data_admissao, oldUser.data_desligamento
            ]);
            inseridosDesligados++;
          }
        }
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
      message: `Upload do Plano concluído (${currentMes}/${currentAno})! ${inseridosArquivo} ativos importados. ${inseridosDesligados} identificados como desligados/ausentes na nova planilha.` 
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
