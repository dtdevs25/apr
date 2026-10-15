import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import * as xlsx from 'xlsx';
import { clearDataCache } from '@/lib/cache';

const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const normalizeKey = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

function normalizeMes(raw: any): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toUpperCase();
  if (!s) return null;
  const n = parseInt(s, 10);
  if (!isNaN(n) && n >= 1 && n <= 12 && /^\d+$/.test(s)) return MONTHS[n - 1];
  if (s === 'MARCO') return 'MARÇO';
  return s;
}

const toUpper = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/\s+/g, ' ').toUpperCase();
  return s || null;
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    // Localizar com precisão a aba que contenha os dados operacionais (GESTOR_ATUAL e MATRÍCULA)
    let targetSheetName = workbook.SheetNames[0];
    let foundMatchingSheet = false;
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      for (const row of (rows || []).slice(0, 10)) {
        if (Array.isArray(row)) {
          const normalized = row.map(c => normalizeKey(String(c || '')));
          if (normalized.some(k => k.includes('gestoratual')) && normalized.some(k => k.includes('matricula') || k.includes('re'))) {
            targetSheetName = name;
            foundMatchingSheet = true;
            break;
          }
        }
      }
      if (foundMatchingSheet) break;
    }

    const sheet = workbook.Sheets[targetSheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null }) as any[];

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ success: false, message: "A planilha está vazia ou no formato incorreto." }, { status: 400 });
    }

    const headers = Object.keys(data[0] || {});
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
      matricula: findHeader(['MATRÍCULA', 'MATRICULA', 'RE', 'USER ID SSFF']),
      nome: findHeader(['NOME']),
      gestorOriginal: findHeader(['GESTOR']),
      gestorAtual: findHeader(['GESTOR_ATUAL', 'GESTOR ATUAL', 'SUPERVISOR_ATUAL', 'LIDER_ATUAL']),
      ativoSet: findHeader(['ATIVO_SET_26', 'ATIVO_SET', 'ATIVO', 'STATUS_ATIVO', 'ATIVO SET 26', 'ATIVO_SET_']),
      diretoria3: findHeader(['DIRETORIA 3', 'DIRETORIA3']),
      gerencia: findHeader(['GERÊNCIA', 'GERENCIA']),
      cidade: findHeader(['CIDADE COMERCIAL']),
      cargo: findHeader(['CARGO'])
    };

    if (!H.matricula || (!H.gestorAtual && !H.gestorOriginal)) {
      return NextResponse.json({
        success: false,
        message: `Colunas obrigatórias não encontradas (MATRÍCULA e GESTOR_ATUAL/GESTOR) na aba "${targetSheetName}". Cabeçalhos lidos: ${headers.join(', ')}`
      }, { status: 400 });
    }

    const get = (row: any, h: string | null) => (h ? row[h] : null);

    // Conectar no banco e garantir a tabela
    const client = await pool.connect();

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS po_spi_override (
          id SERIAL PRIMARY KEY,
          ano INT,
          mes VARCHAR(50),
          matricula VARCHAR(50) NOT NULL,
          nome VARCHAR(255),
          gestor_original VARCHAR(255),
          gestor_atual VARCHAR(255) NOT NULL,
          ativo INT DEFAULT 1,
          diretoria_3 VARCHAR(255) DEFAULT 'DIR SERVICOS AO CLIENTE SP INTERIOR',
          gerencia VARCHAR(255),
          cidade_comercial VARCHAR(255),
          cargo VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT po_spi_override_uniq UNIQUE (ano, mes, matricula)
        );
      `);

      await client.query('BEGIN');

      let insertedCount = 0;
      let updatedCount = 0;
      let ativosEmCampoCount = 0;
      let emTreinamentoCount = 0;

      for (const row of data) {
        const rawMat = get(row, H.matricula);
        let mat = rawMat !== null && rawMat !== undefined
          ? String(rawMat).trim().replace(/\.0+$/, '').replace(/[^0-9]/g, '').replace(/^0+/, '')
          : '';
        if (!mat) continue;

        const gestorAtualVal = toUpper(get(row, H.gestorAtual) || get(row, H.gestorOriginal));
        if (!gestorAtualVal) continue;

        const anoVal = parseInt(get(row, H.ano), 10) || new Date().getFullYear();
        const mesVal = normalizeMes(get(row, H.mes)) || 'OUTUBRO';
        const nomeVal = toUpper(get(row, H.nome));
        const gestorOrigVal = toUpper(get(row, H.gestorOriginal));
        
        let ativoVal = 1;
        const rawAtivo = get(row, H.ativoSet);
        if (rawAtivo !== null && rawAtivo !== undefined) {
          const sAtivo = String(rawAtivo).trim().toLowerCase();
          if (sAtivo === '0' || sAtivo === 'inativo' || sAtivo === 'nao' || sAtivo === 'não' || sAtivo === 'treinamento') {
            ativoVal = 0;
            emTreinamentoCount++;
          } else {
            ativoVal = 1;
            ativosEmCampoCount++;
          }
        } else {
          ativosEmCampoCount++;
        }

        const dirVal = toUpper(get(row, H.diretoria3)) || 'DIR SERVICOS AO CLIENTE SP INTERIOR';
        const gerVal = toUpper(get(row, H.gerencia));
        const cidVal = toUpper(get(row, H.cidade));
        const cargoVal = toUpper(get(row, H.cargo));

        const res = await client.query(`
          INSERT INTO po_spi_override (
            ano, mes, matricula, nome, gestor_original, gestor_atual, ativo, diretoria_3, gerencia, cidade_comercial, cargo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (ano, mes, matricula) DO UPDATE SET
            nome = EXCLUDED.nome,
            gestor_original = EXCLUDED.gestor_original,
            gestor_atual = EXCLUDED.gestor_atual,
            ativo = EXCLUDED.ativo,
            diretoria_3 = EXCLUDED.diretoria_3,
            gerencia = EXCLUDED.gerencia,
            cidade_comercial = EXCLUDED.cidade_comercial,
            cargo = EXCLUDED.cargo,
            created_at = CURRENT_TIMESTAMP
          RETURNING (xmax = 0) AS is_insert;
        `, [anoVal, mesVal, mat, nomeVal, gestorOrigVal, gestorAtualVal, ativoVal, dirVal, gerVal, cidVal, cargoVal]);

        if (res.rows[0]?.is_insert) {
          insertedCount++;
        } else {
          updatedCount++;
        }
      }

      await client.query('COMMIT');

      // Limpa cache para refletir imediatamente nos dashboards APR e DSS
      clearDataCache();

      return NextResponse.json({
        success: true,
        message: `Ajuste SP Interior importado com sucesso da aba "${targetSheetName}"! ${insertedCount + updatedCount} colaboradores processados (${ativosEmCampoCount} ativos em campo, ${emTreinamentoCount} em treinamento/administrativo).`
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error("Erro no processamento de po_spi_override:", err);
      return NextResponse.json({ success: false, message: `Erro ao processar: ${err.message}` }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Erro no upload do plano SP Interior:", error);
    return NextResponse.json({ success: false, message: `Erro no servidor: ${error.message}` }, { status: 500 });
  }
}
