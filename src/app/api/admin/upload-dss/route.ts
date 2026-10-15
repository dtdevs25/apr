import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { clearDataCache } from '@/lib/cache';

const toUpper = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/\s+/g, ' ').toUpperCase();
  return s || null;
};

const cleanNumero = (v: any): string => {
  if (v === null || v === undefined) return '';
  return String(v).trim().replace(/\.0+$/, '').replace(/[^0-9]/g, '');
};

const cleanMatricula = (v: any): string => {
  if (v === null || v === undefined) return '';
  return String(v).trim().replace(/\.0+$/, '').replace(/[^0-9]/g, '').replace(/^0+/, '');
};

// Parser robusto de datas brasileiras para SQL ISO sem desvio de timezone
function parseBrDateTime(dtStr: string | null): { sql: string | null, mes: string, ano: string } {
  if (!dtStr) return { sql: null, mes: '', ano: '' };
  const s = dtStr.trim();
  const pad = (n: number | string) => String(n).padStart(2, '0');

  // Formato brasileiro: DD/MM/AAAA [HH:mm[:ss]]
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    const [, dd, mm, yyyy, hh = '00', mi = '00', ss = '00'] = br;
    const sql = `${yyyy}-${pad(mm)}-${pad(dd)} ${pad(hh)}:${pad(mi)}:${pad(ss)}`;
    return { sql, mes: String(parseInt(mm, 10)), ano: yyyy };
  }

  // Formato ISO: AAAA-MM-DD [HH:mm[:ss]]
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    const [, yyyy, mm, dd, hh = '00', mi = '00', ss = '00'] = iso;
    const sql = `${yyyy}-${pad(mm)}-${pad(dd)} ${pad(hh)}:${pad(mi)}:${pad(ss)}`;
    return { sql, mes: String(parseInt(mm, 10)), ano: yyyy };
  }

  return { sql: null, mes: '', ano: '' };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ message: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let text = '';
    try {
      const decUtf8 = new TextDecoder('utf-8', { fatal: true });
      text = decUtf8.decode(arrayBuffer);
    } catch {
      const dec1252 = new TextDecoder('windows-1252');
      text = dec1252.decode(arrayBuffer);
    }

    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return NextResponse.json({ message: 'Arquivo vazio ou formato inválido.' }, { status: 400 });
    }

    // 1. Garantir que a tabela dss exista e expurgar eventuais duplicados legados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dss (
        id SERIAL PRIMARY KEY,
        assunto VARCHAR(255),
        numero_dialogo VARCHAR(100),
        lider VARCHAR(255),
        base VARCHAR(100),
        uf VARCHAR(50),
        localidade VARCHAR(255),
        data_fechamento TIMESTAMP,
        matricula VARCHAR(100),
        nome VARCHAR(255),
        tipo VARCHAR(100),
        status VARCHAR(100),
        assinado VARCHAR(100),
        justificativa TEXT,
        mes VARCHAR(20),
        ano VARCHAR(20)
      );

      -- Remove eventuais duplicatas legadas mantendo a mais recente
      DELETE FROM dss a
      USING dss b
      WHERE a.numero_dialogo = b.numero_dialogo AND a.matricula = b.matricula AND a.id < b.id;

      -- Assegura a constraint única física para evitar duplicidades
      ALTER TABLE dss DROP CONSTRAINT IF EXISTS unique_dss_record;
      ALTER TABLE dss ADD CONSTRAINT unique_dss_record UNIQUE (numero_dialogo, matricula);
    `);

    // Iniciar transação
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO dss (assunto, numero_dialogo, lider, base, uf, localidade, data_fechamento, matricula, nome, tipo, status, assinado, justificativa, mes, ano)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (numero_dialogo, matricula) DO UPDATE SET
          assunto = EXCLUDED.assunto,
          lider = EXCLUDED.lider,
          base = EXCLUDED.base,
          uf = EXCLUDED.uf,
          localidade = EXCLUDED.localidade,
          data_fechamento = EXCLUDED.data_fechamento,
          nome = EXCLUDED.nome,
          tipo = EXCLUDED.tipo,
          status = EXCLUDED.status,
          assinado = EXCLUDED.assinado,
          justificativa = EXCLUDED.justificativa,
          mes = EXCLUDED.mes,
          ano = EXCLUDED.ano
        RETURNING (xmax = 0) AS is_insert;
      `;

      let novasInseridas = 0;
      let atualizadas = 0;
      const seenRecords = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(';');
        if (parts.length < 10) continue;

        const rawUf = toUpper(parts[4]);
        // Filtrar apenas o que for do estado de São Paulo (SP)
        if (!rawUf || rawUf !== 'SP') continue;

        const num = cleanNumero(parts[1]);
        const mat = cleanMatricula(parts[7]);
        if (!num || !mat) continue;

        // Evitar duplicidade de mesmo participante no mesmo diálogo dentro do próprio arquivo
        const dedupeKey = `${num}-${mat}`;
        if (seenRecords.has(dedupeKey)) continue;
        seenRecords.add(dedupeKey);

        // Padronização rigorosa para MAIÚSCULAS
        const assunto = toUpper(parts[0]);
        const lider = toUpper(parts[2]);
        const base = toUpper(parts[3]);
        const uf = 'SP';
        const local = toUpper(parts[5]);
        const nome = toUpper(parts[8]);
        const tipo = toUpper(parts[9]);
        const status = toUpper(parts[10]);
        const assinado = toUpper(parts[11]);
        const just = toUpper(parts[12]);

        // Datas e horas sem desvio de fuso
        const dtStr = parts[6]?.trim() || null;
        const { sql: dt, mes, ano } = parseBrDateTime(dtStr);

        const res = await client.query(insertQuery, [
          assunto, num, lider, base, uf, local, dt, mat, nome, tipo, status, assinado, just, mes, ano
        ]);

        if (res.rows[0]?.is_insert) {
          novasInseridas++;
        } else {
          atualizadas++;
        }
      }

      await client.query('COMMIT');
      clearDataCache('DSS');

      return NextResponse.json({ 
        message: `Upload de DSS concluído com sucesso! ${novasInseridas} novos participantes inseridos, ${atualizadas} atualizados (0 duplicados).` 
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Erro no upload de DSS:", error);
    return NextResponse.json({ message: 'Erro na importação: ' + (error?.message || String(error)) }, { status: 500 });
  }
}
