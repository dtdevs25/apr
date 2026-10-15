import { Pool, types } from 'pg';

// Força o PostgreSQL a retornar tipos TIMESTAMP (sem timezone, OID 1114) e DATE (OID 1082)
// diretamente como strings literais, prevenindo qualquer deslocamento ou conversão indevida de fuso horário
types.setTypeParser(1114, (str: string) => str);
types.setTypeParser(1082, (str: string) => str);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  statement_timeout: 60000,
  connectionTimeoutMillis: 10000,
});

export default pool;
