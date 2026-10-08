import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    console.log("Criando tabela DSS...");
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

    console.log("Criando Materialized View mv_apr_data...");
    await pool.query(`
      DROP MATERIALIZED VIEW IF EXISTS mv_apr_data;
      CREATE MATERIALIZED VIEW mv_apr_data AS
      WITH po_norm AS (
        SELECT id,
          NULLIF(LTRIM(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(user_id_ssff::text), '\\.0+$', ''), '[^0-9]', '', 'g'), '0'), '') AS uid,
          NULLIF(UPPER(TRIM(REGEXP_REPLACE(TRANSLATE(nome::text, 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'), '\\s+', ' ', 'g'))), '') AS nome_n,
          diretoria_3, gerencia, gestor, cidade_comercial, uf_comercial
        FROM po
      ),
      po_by_id AS (
        SELECT DISTINCT ON (uid) * FROM po_norm WHERE uid IS NOT NULL ORDER BY uid, id DESC
      ),
      po_by_nome AS (
        SELECT DISTINCT ON (nome_n) * FROM po_norm WHERE nome_n IS NOT NULL ORDER BY nome_n, id DESC
      ),
      a AS (
        SELECT aprs.*,
          NULLIF(LTRIM(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(matricula_auditor::text), '\\.0+$', ''), '[^0-9]', '', 'g'), '0'), '') AS uid_mat,
          NULLIF(LTRIM(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(re::text), '\\.0+$', ''), '[^0-9]', '', 'g'), '0'), '') AS uid_re,
          NULLIF(UPPER(TRIM(REGEXP_REPLACE(TRANSLATE(nome_auditor::text, 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'), '\\s+', ' ', 'g'))), '') AS nome_n
        FROM aprs
      )
      SELECT 
        a.numero AS "Número",
        a.data_checklist AS "Data Checklist",
        a.data_inicio AS "Data Início",
        a.data_fim AS "Data Fim",
        a.duracao AS "Duração",
        a.situacao AS "Situação",
        a.matricula_auditor AS "Matrícula Auditor",
        a.nome_auditor AS "Nome Auditor",
        a.localidade_objeto AS "Localidade Objeto",
        a.questionario AS "Questionário",
        a.re AS "RE",
        COALESCE(p1.cidade_comercial, p2.cidade_comercial, p3.cidade_comercial, a.cidade_comercial) AS "CIDADE COMERCIAL",
        COALESCE(p1.uf_comercial, p2.uf_comercial, p3.uf_comercial, a.uf_comercial) AS "UF COMERCIAL",
        COALESCE(p1.diretoria_3, p2.diretoria_3, p3.diretoria_3, a.diretoria_3) AS "DIRETORIA 3",
        COALESCE(p1.gerencia, p2.gerencia, p3.gerencia, a.gerencia) AS "GERÊNCIA",
        COALESCE(p1.gestor, p2.gestor, p3.gestor, a.gestor) AS "GESTOR",
        COALESCE(p1.gestor, p2.gestor, p3.gestor, a.gestor) AS "Supervisor",
        a.mes AS "Mês",
        a.ano AS "Ano"
      FROM a
      LEFT JOIN po_by_id   p1 ON p1.uid = a.uid_mat
      LEFT JOIN po_by_id   p2 ON p2.uid = a.uid_re
      LEFT JOIN po_by_nome p3 ON p3.nome_n = a.nome_n
      ORDER BY a.data_inicio DESC;
    `);

    return NextResponse.json({ message: "Setup completed successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
