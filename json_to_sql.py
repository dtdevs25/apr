import json
import io

with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sql = """DROP TABLE IF EXISTS aprs;
CREATE TABLE aprs (
  id SERIAL PRIMARY KEY,
  numero BIGINT,
  data_checklist TIMESTAMP,
  data_inicio TIMESTAMP,
  data_fim TIMESTAMP,
  duracao VARCHAR(50),
  situacao VARCHAR(50),
  matricula_auditor BIGINT,
  nome_auditor VARCHAR(255),
  localidade_objeto VARCHAR(255),
  questionario VARCHAR(255),
  re VARCHAR(50),
  cidade_comercial VARCHAR(100),
  uf_comercial VARCHAR(10),
  diretoria_3 VARCHAR(100),
  gerencia VARCHAR(100),
  gestor VARCHAR(255),
  mes INT,
  ano INT
);

TRUNCATE TABLE aprs RESTART IDENTITY;

INSERT INTO aprs (numero, data_checklist, data_inicio, data_fim, duracao, situacao, matricula_auditor, nome_auditor, localidade_objeto, questionario, re, cidade_comercial, uf_comercial, diretoria_3, gerencia, gestor, mes, ano) VALUES 
"""

def format_val(v):
    if v is None or v == "":
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return f"'{str(v).replace(chr(39), chr(39)+chr(39))}'"

values = []
for row in data:
    vals = [
        format_val(row.get('Número')),
        format_val(row.get('Data Checklist')),
        format_val(row.get('Data Início')),
        format_val(row.get('Data Fim')),
        format_val(row.get('Duração')),
        format_val(row.get('Situação')),
        format_val(row.get('Matrícula Auditor')),
        format_val(row.get('Nome Auditor')),
        format_val(row.get('Localidade Objeto')),
        format_val(row.get('Questionário')),
        format_val(row.get('RE')),
        format_val(row.get('CIDADE COMERCIAL')),
        format_val(row.get('UF COMERCIAL')),
        format_val(row.get('DIRETORIA 3')),
        format_val(row.get('GERÊNCIA')),
        format_val(row.get('GESTOR')),
        format_val(row.get('Mês')),
        format_val(row.get('Ano'))
    ]
    values.append(f"({', '.join(vals)})")

sql += ",\n".join(values) + ";"

with open('init.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print('init.sql generated')
