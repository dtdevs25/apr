import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ message: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('windows-1252');
    const text = decoder.decode(arrayBuffer);
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ message: 'Arquivo vazio ou formato inválido.' }, { status: 400 });
    }

    // Assunto;Número do Diálogo;Líder;Base;UF;Localidade;Data Fechamento;Matrícula;Nome;Tipo;Status;Assinado;Justificativa;

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
    `);

    // Ensure the unique constraint exists for UPSERT
    await pool.query(`
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
      `;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(';');
        if (parts.length < 10) continue;

        const assunto = parts[0]?.trim();
        const num = parts[1]?.trim();
        const lider = parts[2]?.trim();
        const base = parts[3]?.trim();
        const uf = parts[4]?.trim();
        const local = parts[5]?.trim();
        
        // Filtrar apenas o que for de SP
        if (!uf || uf.toUpperCase() !== 'SP') continue;

        const dtStr = parts[6]?.trim(); // ex: 30/09/2026 06:13:07 or 01/10/2026
        const mat = parts[7]?.trim();
        const nome = parts[8]?.trim();
        const tipo = parts[9]?.trim();
        const status = parts[10]?.trim();
        const assinado = parts[11]?.trim();
        const just = parts[12]?.trim();

        // Parse date
        let dt = null;
        let mes = '';
        let ano = '';
        if (dtStr) {
          const [d, t] = dtStr.split(' ');
          if (d) {
            let [p1, p2, yyyy] = d.split('/');
            if (p1 && p2 && yyyy) {
              let dd = p1;
              let mm = p2;
              // A planilha SEMPRE manda no formato DD/MM/YYYY. 
              // Se invertermos quando ambos são <= 12, Janeiro (10/01) vira Outubro (01/10).
              // Então apenas assumimos p1 = DD, p2 = MM, yyyy = YYYY.
              dt = `${yyyy}-${mm}-${dd} ${t || '00:00:00'}`;
              mes = mm.replace(/^0+/, '');
              ano = yyyy;
            }
          }
        }

        await client.query(insertQuery, [assunto, num, lider, base, uf, local, dt, mat, nome, tipo, status, assinado, just, mes, ano]);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ message: 'Upload de DSS concluído com sucesso!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Erro na importação: ' + String(error) }, { status: 500 });
  }
}
