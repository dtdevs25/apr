import pandas as pd
import json

def process_data():
    apr_path = r"c:\Users\Daniel\Desktop\Lider-em-Acao\VIVO_APR_2026-10-01.xlsx"
    plano_path = r"c:\Users\Daniel\Desktop\Lider-em-Acao\08 - Plano de ocup. Ago26 (1).xlsx"

    print("Loading APR...")
    df_apr = pd.read_excel(apr_path, skiprows=5)
    
    print("Loading Plano...")
    df_plano = pd.read_excel(plano_path)

    print("Cleaning Data...")
    # Clean Matrícula
    df_apr['Matrícula Auditor'] = pd.to_numeric(df_apr['Matrícula Auditor'], errors='coerce')
    df_plano['RE'] = pd.to_numeric(df_plano['RE'], errors='coerce')

    print("Merging Data...")
    df_merged = pd.merge(df_apr, df_plano, left_on='Matrícula Auditor', right_on='RE', how='left')

    print("Selecting and formatting columns...")
    # Fill NA for cities and directorships just in case
    df_merged['CIDADE COMERCIAL'] = df_merged['CIDADE COMERCIAL'].fillna('Não Identificada')
    df_merged['DIRETORIA 1'] = df_merged['DIRETORIA 1'].fillna('Não Identificada')
    df_merged['GESTOR'] = df_merged['GESTOR'].fillna('Não Identificado')
    df_merged['Mês'] = pd.to_datetime(df_merged['Data Início']).dt.month.fillna(0).astype(int)
    df_merged['Ano'] = pd.to_datetime(df_merged['Data Início']).dt.year.fillna(0).astype(int)

    # Transform to list of dicts to save as JSON
    # Replace NaNs with None for JSON compatibility
    df_cleaned = df_merged.where(pd.notnull(df_merged), None)
    
    # We only need a subset of columns for the dashboard to keep it light
    cols_to_keep = [
        'Número', 'Data Checklist', 'Data Início', 'Data Fim', 'Duração', 'Situação',
        'Matrícula Auditor', 'Nome Auditor', 'Localidade Objeto', 'Questionário',
        'RE', 'CIDADE COMERCIAL', 'UF COMERCIAL', 'DIRETORIA 1', 'GERÊNCIA', 'GESTOR',
        'Mês', 'Ano'
    ]
    df_final = df_cleaned[cols_to_keep]

    print("Saving to data.json...")
    records = df_final.to_dict(orient='records')
    
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print("Done! Data saved to data.json")

if __name__ == "__main__":
    process_data()
