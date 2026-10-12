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

    console.log("Criando tabela po_spi_override...");
    await pool.query(`
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

    console.log("Criando índices de alta performance...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_po_spi_override_mat ON po_spi_override (matricula);
      CREATE INDEX IF NOT EXISTS idx_po_spi_override_gestor ON po_spi_override (gestor_atual);
      CREATE INDEX IF NOT EXISTS idx_aprs_mat ON aprs (matricula_auditor);
      CREATE INDEX IF NOT EXISTS idx_aprs_re ON aprs (re);
      CREATE INDEX IF NOT EXISTS idx_aprs_data_inicio ON aprs (data_inicio DESC);
      DROP MATERIALIZED VIEW IF EXISTS mv_apr_data CASCADE;
    `);

    return NextResponse.json({ message: "Setup completed successfully and high performance indexes created" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
