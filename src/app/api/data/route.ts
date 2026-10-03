import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        numero AS "Número",
        data_checklist AS "Data Checklist",
        data_inicio AS "Data Início",
        data_fim AS "Data Fim",
        duracao AS "Duração",
        situacao AS "Situação",
        matricula_auditor AS "Matrícula Auditor",
        nome_auditor AS "Nome Auditor",
        localidade_objeto AS "Localidade Objeto",
        questionario AS "Questionário",
        re AS "RE",
        cidade_comercial AS "CIDADE COMERCIAL",
        uf_comercial AS "UF COMERCIAL",
        diretoria_3 AS "DIRETORIA 3",
        gerencia AS "GERÊNCIA",
        gestor AS "GESTOR",
        gestor AS "Supervisor",
        mes AS "Mês",
        ano AS "Ano",
        duracao_minutos AS "duracao_minutos"
      FROM aprs
      ORDER BY data_inicio DESC
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
