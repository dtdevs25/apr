import * as XLSX from 'xlsx-js-style';

const CITY_TO_FILIAL_CNPJ: Record<string, { filial: string, cnpj: string }> = {
  'SAO PAULO': { filial: 'SP MTZ ECOBERRI', cnpj: '02558157000162' },
  'CAMPINAS': { filial: 'SP CAMBUI', cnpj: '02558157082703' },
  'SAO JOSE DO RIO PRETO': { filial: 'SP CCC SJRPRETO', cnpj: '02558157011954' },
  'BAURU': { filial: 'SP CCC BAURU', cnpj: '02558157009623' },
  'ARARAQUARA': { filial: 'SP ARARAQUARA C', cnpj: '02558157059485' },
  'RIBEIRAO PRETO': { filial: 'SP', cnpj: '02558157087772' },
  'PIRACICABA': { filial: 'SP PIRACICABA A', cnpj: '02558157059302' },
  'MAUA': { filial: 'SP CD MAUA', cnpj: '02558157053878' },
  'PRAIA GRANDE': { filial: 'SP LJ LITOR P S', cnpj: '02558157005121' },
  'MARILIA': { filial: 'SP LJ MARILIA S', cnpj: '02558157080093' },
  'SAO JOSE DOS CAMPOS': { filial: 'SP CC SJ CAMPOS', cnpj: '02558157049846' },
  'JUNDIAI': { filial: 'SP LJ JUND MA S', cnpj: '02558157009119' },
  'VOTORANTIM': { filial: 'SP LJ ESPLANADA', cnpj: '02558157005202' },
  'SOROCABA': { filial: 'SP SOROCABA BOA', cnpj: '02558157058322' },
  'OURINHOS': { filial: 'SP LJ OURINHOS', cnpj: '02558157010206' },
  'ARACATUBA': { filial: 'SP LJ MULTISHOP', cnpj: '02558157012411' },
  'SANTOS': { filial: 'SP SANTOS', cnpj: '02558157076657' },
  'MOGI DAS CRUZES': { filial: 'SP LJ MOGI S CE', cnpj: '02558157008732' },
  'BARUERI': { filial: 'SP LJ IGUA ALPH', cnpj: '02558157009542' },
  'SAO PEDRO': { filial: 'SP_LJ BERRINI', cnpj: '02558157052391' },
  'GUARULHOS': { filial: 'SP LJ S INTERNA', cnpj: '02558157015003' },
  'OSASCO': { filial: 'SP LJ OSASCO', cnpj: '02558157007680' },
  'SANTO ANDRE': { filial: 'SP LJ ABC PLA S', cnpj: '02558157007256' },
  'SAO VICENTE': { filial: 'SP LJ S BRISAM', cnpj: '02558157011016' },
  'SAO CAETANO DO SUL': { filial: 'SP LJ PSCAETANO', cnpj: '02558157051239' },
  'SAO BERNARDO DO CAMPO': { filial: 'SP LJ S METROPO', cnpj: '02558157007094' },
  'ATIBAIA': { filial: 'LJ VIVO ATIBAIA', cnpj: '02558157092423' },
  'GUARUJA': { filial: 'SP LJ S GUAR LP', cnpj: '02558157010710' },
  'PRESIDENTE PRUDENTE': { filial: 'SP LJ PQ S PRUD', cnpj: '02558157076223' },
  'JAU': { filial: 'SP LOJA JAU', cnpj: '02558157009895' },
  'TABOAO DA SERRA': { filial: 'SP LJ SH TABOAO', cnpj: '02558157013817' },
  'CAJAMAR': { filial: 'SP_CD_CAJAMAR_GALPAO100-PARTE', cnpj: '02558157091613' },
  'INDAIATUBA': { filial: 'SP INDAIATUBA C', cnpj: '02558157058837' },
  'SAO CARLOS': { filial: 'SP LJ SS CARLOS', cnpj: '02558157013736' },
  'FRANCA': { filial: 'SP LJ FRANCA', cnpj: '02558157010397' },
  'CARAGUATATUBA': { filial: 'SP ALTINO ARANTES', cnpj: '02558157081146' },
  'TAUBATE': { filial: 'SP CCC TAUBATE', cnpj: '02558157009038' },
  'SAO ROQUE': { filial: 'SP_LOJA OUTLET CATARINA SP', cnpj: '2558157088744' },
  'BOTUCATU': { filial: 'SP JOAO PASSOS', cnpj: '02558157075332' }
};

function getFilialCnpj(cidade: string | null): { filial: string, cnpj: string } | null {
  if (!cidade) return null;
  const unaccented = String(cidade).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return CITY_TO_FILIAL_CNPJ[unaccented] || null;
}

interface ExportDssParams {
  filteredData: any[];
  targetDss: number;
  rankingGroup: 'lider' | 'cidade' | 'colaborador';
  rankAgg: any[];
}

export function exportDssToExcel({
  filteredData,
  targetDss,
  rankingGroup,
  rankAgg,
}: ExportDssParams) {
  // 1. Aba Dados Filtrados DSS
  const ws_dados = XLSX.utils.json_to_sheet(filteredData);
  const rangeDados = XLSX.utils.decode_range(ws_dados['!ref'] || 'A1:A1');
  for (let C = rangeDados.s.c; C <= rangeDados.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws_dados[cellAddress]) continue;
    ws_dados[cellAddress].s = {
      fill: { fgColor: { rgb: "660099" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }

  // 2. Aba Dedicada: Ranking por Técnicos / Colaboradores em DSS
  const tecnicosAgg: Record<string, {
    name: string;
    matricula: string;
    diretoria: string;
    filial: string;
    cnpj: string;
    cidade: string;
    supervisor: string;
    count: number;
  }> = {};

  filteredData.forEach(item => {
    const mat = String(item['Matrícula'] || '').trim();
    const nome = String(item['Nome'] || mat || 'Não Identificado').trim().toUpperCase();
    const key = mat || nome;
    const cidade = item['CIDADE COMERCIAL'] || item['Localidade'] || 'São Paulo';
    const fc = getFilialCnpj(cidade);

    if (!tecnicosAgg[key]) {
      tecnicosAgg[key] = {
        name: nome,
        matricula: mat || '-',
        diretoria: item['DIRETORIA 3'] || 'N/A',
        filial: fc?.filial || item['Base'] || 'São Paulo',
        cnpj: fc?.cnpj || '-',
        cidade: cidade,
        supervisor: item['Supervisor'] || item['Líder'] || 'N/A',
        count: 0
      };
    }
    tecnicosAgg[key].count += 1;
  });

  const tecnicosList = Object.values(tecnicosAgg).sort((a, b) => b.count - a.count);

  const rankingTecnicosData = tecnicosList.map((item, idx) => {
    const expected = targetDss;
    const perc = expected > 0 ? ((item.count / expected) * 100).toFixed(1) + '%' : '0.0%';

    return {
      "Posição": `${idx + 1}º`,
      "Técnico / Colaborador": item.name,
      "Matrícula": item.matricula,
      "Diretoria": item.diretoria,
      "Filial": item.filial,
      "CNPJ": item.cnpj,
      "Cidade": item.cidade,
      "Supervisor / Líder": item.supervisor,
      "Presenças em DSS": item.count,
      "Esperado": expected,
      "Meta (%)": perc,
      "Situação": item.count >= expected ? "Meta Atingida" : "Abaixo da Meta"
    };
  });

  const ws_tecnicos = XLSX.utils.json_to_sheet(rankingTecnicosData);
  const rangeTecnicos = XLSX.utils.decode_range(ws_tecnicos['!ref'] || 'A1:A1');
  for (let C = rangeTecnicos.s.c; C <= rangeTecnicos.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws_tecnicos[cellAddress]) continue;
    ws_tecnicos[cellAddress].s = {
      fill: { fgColor: { rgb: "660099" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
  ws_tecnicos['!cols'] = [
    { wch: 10 }, { wch: 38 }, { wch: 15 }, { wch: 38 }, { wch: 28 }, { wch: 20 },
    { wch: 25 }, { wch: 32 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
  ];

  // 3. Aba Dedicada: Ranking por Líderes DSS
  const lideresAgg: Record<string, {
    name: string;
    diretoria: string;
    filial: string;
    cnpj: string;
    cidade: string;
    dssSet: Set<string>;
    participantesCount: number;
  }> = {};

  filteredData.forEach(item => {
    const lider = String(item['Líder'] || 'Não Identificado').trim();
    const dssId = item['Número do Diálogo'];
    const cidade = item['CIDADE COMERCIAL'] || item['Localidade'] || 'São Paulo';
    const fc = getFilialCnpj(cidade);

    if (!lideresAgg[lider]) {
      lideresAgg[lider] = {
        name: lider,
        diretoria: item['DIRETORIA 3'] || 'N/A',
        filial: fc?.filial || item['Base'] || 'São Paulo',
        cnpj: fc?.cnpj || '-',
        cidade: cidade,
        dssSet: new Set(),
        participantesCount: 0
      };
    }

    if (dssId && !lideresAgg[lider].dssSet.has(dssId)) {
      lideresAgg[lider].dssSet.add(dssId);
    }
    lideresAgg[lider].participantesCount += 1;
  });

  const lideresList = Object.values(lideresAgg)
    .map(i => ({ ...i, count: i.dssSet.size || i.participantesCount }))
    .sort((a, b) => b.count - a.count);

  const rankingLideresData = lideresList.map((item, idx) => {
    const expected = targetDss;
    const perc = expected > 0 ? ((item.count / expected) * 100).toFixed(1) + '%' : '0.0%';

    return {
      "Posição": `${idx + 1}º`,
      "Líder DSS": item.name,
      "Diretoria": item.diretoria,
      "Filial": item.filial,
      "CNPJ": item.cnpj,
      "Cidade": item.cidade,
      "Diálogos Realizados": item.count,
      "Esperado": expected,
      "Meta (%)": perc,
      "Participantes Presentes": item.participantesCount,
      "Situação": item.count >= expected ? "Meta Atingida" : "Abaixo da Meta"
    };
  });

  const ws_lideres = XLSX.utils.json_to_sheet(rankingLideresData);
  const rangeLideres = XLSX.utils.decode_range(ws_lideres['!ref'] || 'A1:A1');
  for (let C = rangeLideres.s.c; C <= rangeLideres.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws_lideres[cellAddress]) continue;
    ws_lideres[cellAddress].s = {
      fill: { fgColor: { rgb: "660099" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
  ws_lideres['!cols'] = [
    { wch: 10 }, { wch: 38 }, { wch: 38 }, { wch: 28 }, { wch: 20 }, { wch: 25 },
    { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws_dados, "Dados Filtrados DSS");
  XLSX.utils.book_append_sheet(wb, ws_tecnicos, "Ranking Técnicos DSS");
  XLSX.utils.book_append_sheet(wb, ws_lideres, "Ranking Líderes DSS");

  if (rankingGroup === 'cidade') {
    const rankingCidadesData = rankAgg.map((item, idx) => {
      const multiplier = item.uniquePeople?.size || 1;
      const expected = Math.round(targetDss * multiplier);
      const perc = expected > 0 ? ((item.count / expected) * 100).toFixed(1) + '%' : '0.0%';

      return {
        "Posição": `${idx + 1}º`,
        "Cidade": item.name,
        "Líderes Ativos": multiplier,
        "Diálogos Realizados": item.count,
        "Esperado": expected,
        "Meta (%)": perc,
        "Participantes Presentes": item.data.length
      };
    });

    const ws_cidades = XLSX.utils.json_to_sheet(rankingCidadesData);
    const rangeCidades = XLSX.utils.decode_range(ws_cidades['!ref'] || 'A1:A1');
    for (let C = rangeCidades.s.c; C <= rangeCidades.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws_cidades[cellAddress]) continue;
      ws_cidades[cellAddress].s = {
        fill: { fgColor: { rgb: "660099" } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
    ws_cidades['!cols'] = [
      { wch: 10 }, { wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 26 }
    ];
    XLSX.utils.book_append_sheet(wb, ws_cidades, "Ranking Cidades DSS");
  }

  XLSX.writeFile(wb, `vivo_painel_dss.xlsx`);
}

