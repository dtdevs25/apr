import * as XLSX from 'xlsx-js-style';
import { formatSecondsToHMS } from '@/lib/domain/apr';

interface ExportAprParams {
  filteredData: any[];
  colaboradoresPO: any[];
  targetAprs: number;
  rankingGroup: 'colaborador' | 'cidade';
  rankAgg: any[];
  onlySpiActive: boolean;
  selectedDiretorias: string[];
  selectedSupervisors: string[];
  selectedCities: string[];
  selectedAuditores: string[];
  selectedCargos?: string[];
}

export function exportAprToExcel({
  filteredData,
  colaboradoresPO,
  targetAprs,
  rankingGroup,
  rankAgg,
  onlySpiActive,
  selectedDiretorias,
  selectedSupervisors,
  selectedCities,
  selectedAuditores,
  selectedCargos,
}: ExportAprParams) {
  // 1. Aba Dados Filtrados
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

  // 2. Mapeamento auxiliar do PO
  const poMapByMat = new Map<string, any>();
  const poMapByNome = new Map<string, any>();
  colaboradoresPO.forEach(p => {
    const mat = String(p.matricula || '').trim();
    const nome = String(p.nome || '').trim().toUpperCase();
    if (mat) poMapByMat.set(mat, p);
    if (nome) poMapByNome.set(nome, p);
  });

  // 3. Aba Dedicada: Ranking por Técnicos
  const tecnicosAgg: Record<string, {
    name: string;
    matricula: string;
    diretoria: string;
    filial: string;
    cnpj: string;
    cidadeBase: string;
    cidadesExecucao: Set<string>;
    supervisor: string;
    count: number;
    totalSecs: number;
    validCount: number;
  }> = {};

  filteredData.forEach(item => {
    const mat = String(item['Matrícula Auditor'] || item['RE'] || '').trim();
    const nome = String(item['Nome Auditor'] || mat || 'Não Identificado').trim().toUpperCase();
    const key = mat || nome;

    const pInfo = (mat && poMapByMat.get(mat)) || poMapByNome.get(nome) || null;
    const filialVal = item['FILIAL'] || pInfo?.filial || pInfo?.cnpj || item['CNPJ'] || item['GERÊNCIA'] || 'São Paulo';
    const cnpjVal = item['CNPJ'] || pInfo?.cnpj || '-';
    const cidBase = item['CIDADE_BASE'] || item['CIDADE COMERCIAL'] || pInfo?.cidade || 'São Paulo';
    const cidExec = item['CIDADE_EXECUCAO'] || item['Localidade Objeto'] || item['CIDADE COMERCIAL'] || cidBase;

    if (!tecnicosAgg[key]) {
      tecnicosAgg[key] = {
        name: nome,
        matricula: mat || pInfo?.matricula || '-',
        diretoria: item['DIRETORIA 3'] || pInfo?.diretoria || 'N/A',
        filial: filialVal,
        cnpj: cnpjVal,
        cidadeBase: cidBase,
        cidadesExecucao: new Set<string>(),
        supervisor: item['Supervisor'] || item['GESTOR'] || pInfo?.supervisor || 'N/A',
        count: 0,
        totalSecs: 0,
        validCount: 0
      };
    }

    if (cidExec) {
      tecnicosAgg[key].cidadesExecucao.add(cidExec);
    }

    tecnicosAgg[key].count += 1;

    const durKey = Object.keys(item).find(k => k.toLowerCase().includes('dura') && k.toLowerCase().includes('o'));
    if (durKey && typeof item[durKey] === 'string') {
      const parts = item[durKey].split(':');
      if (parts.length === 3) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const s = parseInt(parts[2], 10);
        if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
          const secs = h * 3600 + m * 60 + s;
          if (secs > 0 && secs <= 600) {
            tecnicosAgg[key].totalSecs += secs;
            tecnicosAgg[key].validCount++;
          }
        }
      }
    }
  });

  // Cruzar colaboradores ativos do PO para identificar quem não fez APR no escopo filtrado
  colaboradoresPO.forEach(p => {
    if (onlySpiActive && p.diretoria === 'DIR SERVICOS AO CLIENTE SP INTERIOR' && p.ativo_spi === 0) return;
    if (selectedDiretorias.length > 0 && !selectedDiretorias.includes(p.diretoria)) return;
    if (selectedSupervisors.length > 0 && !selectedSupervisors.includes(p.supervisor)) return;
    if (selectedCities.length > 0 && !selectedCities.includes(p.cidade)) return;
    if (selectedAuditores.length > 0 && !selectedAuditores.includes(p.nome) && !selectedAuditores.includes(p.matricula)) return;
    if (selectedCargos && selectedCargos.length > 0 && !selectedCargos.includes(p.cargo)) return;

    const pMat = String(p.matricula || '').trim();
    const pNome = String(p.nome || pMat).trim().toUpperCase();
    const key = pMat || pNome;

    if (!tecnicosAgg[key]) {
      tecnicosAgg[key] = {
        name: pNome,
        matricula: pMat,
        diretoria: p.diretoria,
        filial: p.filial || p.cnpj || p.gerencia || 'São Paulo',
        cnpj: p.cnpj || '-',
        cidadeBase: p.cidade || 'São Paulo',
        cidadesExecucao: new Set<string>(),
        supervisor: p.supervisor || 'N/A',
        count: 0,
        totalSecs: 0,
        validCount: 0
      };
    }
  });

  const tecnicosList = Object.values(tecnicosAgg).sort((a, b) => b.count - a.count);

  const rankingTecnicosData = tecnicosList.map((item, idx) => {
    const expected = targetAprs;
    const perc = expected > 0 ? ((item.count / expected) * 100).toFixed(1) + '%' : '0.0%';
    const avgSecs = item.validCount > 0 ? Math.round(item.totalSecs / item.validCount) : 0;
    const execLocs = Array.from(item.cidadesExecucao).join(', ');

    return {
      "Posição": `${idx + 1}º`,
      "Técnico": item.name,
      "Matrícula": item.matricula,
      "Diretoria": item.diretoria,
      "Filial": item.filial,
      "CNPJ": item.cnpj,
      "Cidade Base (PO)": item.cidadeBase,
      "Cidade Execução (APR)": execLocs || item.cidadeBase || '-',
      "Supervisor": item.supervisor,
      "Realizado (APRs)": item.count,
      "Esperado": expected,
      "Meta (%)": perc,
      "Tempo Médio (HH:MM:SS)": formatSecondsToHMS(avgSecs),
      "Tempo Total Gasto no Mês (HH:MM:SS)": formatSecondsToHMS(item.totalSecs),
      "Situação": item.count === 0 ? "Sem APR" : item.count >= expected ? "Meta Atingida" : "Abaixo da Meta"
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
    { wch: 25 }, { wch: 32 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 24 },
    { wch: 34 }, { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws_dados, "Dados Filtrados APR");
  XLSX.utils.book_append_sheet(wb, ws_tecnicos, "Ranking Técnicos APR");

  if (rankingGroup === 'cidade') {
    const rankingCidadesData = rankAgg.map((item, idx) => {
      const multiplier = item.uniquePeople?.size || 1;
      const expected = Math.round(targetAprs * multiplier);
      const perc = expected > 0 ? ((item.count / expected) * 100).toFixed(1) + '%' : '0.0%';
      const avgSecs = item.validCount > 0 ? Math.round(item.totalSecs / item.validCount) : 0;

      return {
        "Posição": `${idx + 1}º`,
        "Cidade": item.name,
        "Técnicos Ativos": multiplier,
        "Realizado (APRs)": item.count,
        "Esperado": expected,
        "Meta (%)": perc,
        "Tempo Médio (HH:MM:SS)": formatSecondsToHMS(avgSecs),
        "Tempo Total Gasto no Mês (HH:MM:SS)": formatSecondsToHMS(item.totalSecs)
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
      { wch: 10 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 24 }, { wch: 34 }
    ];
    XLSX.utils.book_append_sheet(wb, ws_cidades, "Ranking Cidades APR");
  }

  XLSX.writeFile(wb, `vivo_painel_apr.xlsx`);
}

