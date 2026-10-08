import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || 'APR';

    if (type === 'DSS') {
      const { rows } = await pool.query(`
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
          d.ano AS "Ano"
        FROM dss d
        ORDER BY d.data_fechamento DESC
      `);
      return NextResponse.json(rows);
    }

    // Para APR:
    const { rows } = await pool.query(`
      SELECT * FROM mv_apr_data ORDER BY "Data Início" DESC
    `);
    
    // Converte datas para string no formato correto
    const formattedData = rows.map(r => {
      const formatData = (d: Date | null) => {
        if (!d) return null;
        // Se já for string (dependendo de como o pg retorna), usa direto
        if (typeof d === 'string') return d;
        // Retorna YYYY-MM-DD HH:mm:ss
        const p = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      };
      
      return {
        ...r,
        "Data Checklist": formatData(r["Data Checklist"]),
        "Data Início": formatData(r["Data Início"]),
        "Data Fim": formatData(r["Data Fim"])
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Erro ao carregar dados do banco:", error);
    return NextResponse.json({ error: 'Failed to load data from db' }, { status: 500 });
  }
}
