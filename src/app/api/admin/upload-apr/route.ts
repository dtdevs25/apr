import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import * as xlsx from 'xlsx';

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
    
    // Obter dados em formato de array puro para encontrar a linha do cabeçalho
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let headerIndex = -1;
    
    // Procurar a linha que contém o cabeçalho "Número" (ou "Numero")
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const rowArr = rawData[i] as any[];
      if (rowArr && rowArr.some(v => typeof v === 'string' && (v.trim().toLowerCase() === 'número' || v.trim().toLowerCase() === 'numero'))) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      return NextResponse.json({ success: false, message: "Não foi possível encontrar a linha de cabeçalho com a coluna 'Número'." }, { status: 400 });
    }

    // Agora sim ler os dados como objetos, começando da linha do cabeçalho correta
    const data = xlsx.utils.sheet_to_json(sheet, { range: headerIndex, defval: null });

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ success: false, message: "A planilha está vazia ou no formato incorreto." }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;

    // Conectar ao banco
    const client = await pool.connect();

    try {
      // Começar transação (opcional, mas bom pra velocidade e segurança)
      await client.query('BEGIN');

      // Buscar números existentes
      const { rows } = await client.query('SELECT numero FROM aprs');
      const existingNumeros = new Set(rows.map(r => String(r.numero)));

      // Buscar todos do Plano de Ocupações para fazer o DE-PARA
      const { rows: poRows } = await client.query('SELECT ano, mes, user_id_ssff, diretoria_3, gerencia, gestor, cidade_comercial, uf_comercial FROM po');
      const poMap = new Map();
      for (const po of poRows) {
        if (po.user_id_ssff) {
          const key = `${po.ano}-${po.mes}-${po.user_id_ssff}`;
          poMap.set(key, po);
        }
      }

      const MONTHS_MAP: Record<number, string> = {
        1: 'JANEIRO', 2: 'FEVEREIRO', 3: 'MARÇO', 4: 'ABRIL', 5: 'MAIO', 6: 'JUNHO',
        7: 'JULHO', 8: 'AGOSTO', 9: 'SETEMBRO', 10: 'OUTUBRO', 11: 'NOVEMBRO', 12: 'DEZEMBRO'
      };

      for (const rawRow of data as any[]) {
        // Função para buscar chave ignorando case
        const getVal = (keys: string[]) => {
          for (const k of Object.keys(rawRow)) {
            if (keys.some(key => k.toLowerCase() === key.toLowerCase())) {
              return rawRow[k];
            }
          }
          return null;
        };

        const numeroRaw = getVal(['Número', 'Numero']);
        if (!numeroRaw) continue;

        const numero = String(numeroRaw);
        const dataChecklist = parseExcelDate(getVal(['Data Checklist', 'Data_Checklist']));
        const dataInicio = parseExcelDate(getVal(['Data Início', 'Data Inicio']));
        const dataFim = parseExcelDate(getVal(['Data Fim', 'Data_Fim']));
        const duracao = getVal(['Duração', 'Duracao']);
        
        const situacao = getVal(['Situação', 'Situacao']) || null;
        const matriculaAuditorRaw = getVal(['Matrícula Auditor', 'Matricula Auditor', 'RE']) || '';
        const matriculaAuditor = String(matriculaAuditorRaw).replace(/[^0-9]/g, '');
        const nomeAuditor = getVal(['Nome Auditor']) || null;
        const localidadeObjeto = getVal(['Localidade Objeto']) || null;
        const questionario = getVal(['Questionário', 'Questionario']) || null;
        const re = getVal(['RE']) || null;
        
        const mesRaw = getVal(['Mês', 'Mes']);
        const anoRaw = getVal(['Ano']);
        const mes = mesRaw ? parseInt(mesRaw) : null;
        const ano = anoRaw ? parseInt(anoRaw) : null;

        let cidadeComercial = getVal(['CIDADE COMERCIAL']) || null;
        let ufComercial = getVal(['UF COMERCIAL']) || null;
        let diretoria3 = getVal(['DIRETORIA 3', 'DIRETORIA3']) || null;
        let gerencia = getVal(['GERÊNCIA', 'GERENCIA']) || null;
        let gestor = getVal(['GESTOR']) || null;

        // Fazer o DE-PARA com o Plano de Ocupações
        if (mes && ano && matriculaAuditor) {
          const mesNome = MONTHS_MAP[mes];
          if (mesNome) {
            const poKey = `${ano}-${mesNome}-${matriculaAuditor}`;
            const poData = poMap.get(poKey);
            
            if (poData) {
              diretoria3 = poData.diretoria_3 || diretoria3;
              gerencia = poData.gerencia || gerencia;
              gestor = poData.gestor || gestor;
              cidadeComercial = poData.cidade_comercial || cidadeComercial;
              ufComercial = poData.uf_comercial || ufComercial;
            }
          }
        }

        if (existingNumeros.has(numero)) {
          // Update
          await client.query(`
            UPDATE aprs SET 
              data_checklist = $1, data_inicio = $2, data_fim = $3, duracao = $4, situacao = $5, 
              matricula_auditor = $6, nome_auditor = $7, localidade_objeto = $8, questionario = $9, 
              re = $10, cidade_comercial = $11, uf_comercial = $12, diretoria_3 = $13, gerencia = $14, 
              gestor = $15, mes = $16, ano = $17
            WHERE numero = $18
          `, [
            dataChecklist, dataInicio, dataFim, duracao, situacao, 
            matriculaAuditor, nomeAuditor, localidadeObjeto, questionario, 
            re, cidadeComercial, ufComercial, diretoria3, gerencia, 
            gestor, mes, ano, numero
          ]);
          updated++;
        } else {
          // Insert
          await client.query(`
            INSERT INTO aprs (
              numero, data_checklist, data_inicio, data_fim, duracao, situacao,
              matricula_auditor, nome_auditor, localidade_objeto, questionario,
              re, cidade_comercial, uf_comercial, diretoria_3, gerencia,
              gestor, mes, ano
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            )
          `, [
            numero, dataChecklist, dataInicio, dataFim, duracao, situacao,
            matriculaAuditor, nomeAuditor, localidadeObjeto, questionario,
            re, cidadeComercial, ufComercial, diretoria3, gerencia,
            gestor, mes, ano
          ]);
          imported++;
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
      message: `Importação concluída. ${imported} novos itens inseridos, ${updated} itens atualizados.` 
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json({ success: false, message: "Erro ao processar o arquivo no banco de dados." }, { status: 500 });
  }
}

// Funções auxiliares
function parseExcelDate(val: any) {
  if (!val) return null;
  // Se for string no formato YYYY-MM-DD HH:mm:ss
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    return null;
  }
  // Se for número (serial date do Excel)
  if (typeof val === 'number') {
    return new Date((val - (25567 + 2)) * 86400 * 1000); // ajuste comum de datas do excel
  }
  return null;
}

function parseDurationToMinutes(val: any) {
  if (!val || typeof val !== 'string') return null;
  const parts = val.split(':');
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    return h * 60 + m + s / 60;
  }
  return null;
}
