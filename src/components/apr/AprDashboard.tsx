"use client";
import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, ChevronDown, Building, Users, MapPin, 
  FileText, UserCheck, Clock, X, Settings, ArrowLeft, Sun, Moon, HelpCircle
} from 'lucide-react';
import { PremiumMultiSelect } from '@/components/common/PremiumMultiSelect';
import { AdminModal } from '@/components/common/AdminModal';

interface AprDashboardProps {
  onBack: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const formatNum = (n: number) => n.toLocaleString('pt-BR');

const monthMap: Record<string, string> = {
  '1': 'Jan', '2': 'Fev', '3': 'Mar', '4': 'Abr', '5': 'Mai', '6': 'Jun',
  '7': 'Jul', '8': 'Ago', '9': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set'
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const [datePart] = dateStr.split(' ');
    if (datePart.includes('/')) return datePart;
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
};

const cleanTipo = (str: string) => {
  if (!str) return 'Não Identificado';
  const parts = String(str).split('|');
  const last = parts[parts.length - 1]
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
  if (last.includes('POSTE')) return 'POSTE';
  if (last.includes('CAIXA') || last.includes('SUBTERR')) return 'CAIXA SUBTERRÂNEA';
  if (last.includes('TRAVESSIA')) return 'TRAVESSIA';
  return 'OUTRAS ATIVIDADES';
};

export const AprDashboard: React.FC<AprDashboardProps> = ({ onBack, isDark, toggleTheme }) => {
  const [data, setData] = useState<any[]>([]);
  const [colaboradoresPO, setColaboradoresPO] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [rankingGroup, setRankingGroup] = useState<'colaborador' | 'cidade'>('colaborador');
  const [rankingFilter, setRankingFilter] = useState<'todos' | 'mais' | 'menos' | 'sem_apr'>('todos');
  const [selectedAuditorDetails, setSelectedAuditorDetails] = useState<any | null>(null);

  // Filtros
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedDiretorias, setSelectedDiretorias] = useState<string[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedAuditores, setSelectedAuditores] = useState<string[]>([]);
  const [onlySpiActive, setOnlySpiActive] = useState<boolean>(true);

  const loadData = () => {
    setLoading(true);
    fetch('/api/data?type=APR')
      .then(res => res.json())
      .then(json => {
        const rows = Array.isArray(json) ? json : (json.data || []);
        const poList = Array.isArray(json) ? [] : (json.colaboradoresPO || []);
        setData(rows);
        setColaboradoresPO(poList);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao carregar dados de APR:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const allMonths = useMemo(() => Array.from(new Set(data.map(i => String(i['Mês'])))).filter(Boolean).sort(), [data]);

  const matchSpiFilter = (i: any) => {
    if (!onlySpiActive) return true;
    if (i['DIRETORIA 3'] === 'DIR SERVICOS AO CLIENTE SP INTERIOR') {
      return i['ATIVO_SPI'] !== 0;
    }
    return true;
  };

  // Filtros Cruzados (Cross-filtering)
  const allTipos = useMemo(() => {
    const base = data.filter(i => 
      matchSpiFilter(i) &&
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['GESTOR'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => cleanTipo(i['Questionário'])))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedDiretorias, selectedSupervisors, selectedCities, onlySpiActive]);

  const allDiretorias = useMemo(() => {
    const base = data.filter(i => 
      matchSpiFilter(i) &&
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['GESTOR'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => i['DIRETORIA 3']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedSupervisors, selectedCities, onlySpiActive]);

  const allSupervisors = useMemo(() => {
    const fromData = data.filter(i => 
      matchSpiFilter(i) &&
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    ).map(i => i['Supervisor'] || i['GESTOR']);

    const fromPO = colaboradoresPO.filter(p => 
      (!onlySpiActive || p.diretoria !== 'DIR SERVICOS AO CLIENTE SP INTERIOR' || p.ativo_spi !== 0) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(p.diretoria)) &&
      (selectedCities.length === 0 || selectedCities.includes(p.cidade))
    ).map(p => p.supervisor);

    return Array.from(new Set([...fromData, ...fromPO])).filter(Boolean).sort();
  }, [data, colaboradoresPO, selectedMonths, selectedTipos, selectedDiretorias, selectedCities, onlySpiActive]);

  const allCities = useMemo(() => {
    const base = data.filter(i => 
      matchSpiFilter(i) &&
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['GESTOR']))
    );
    return Array.from(new Set(base.map(i => i['CIDADE COMERCIAL']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, onlySpiActive]);

  const allAuditores = useMemo(() => {
    const fromData = data.filter(i => 
      matchSpiFilter(i) &&
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['GESTOR'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    ).map(i => i['Nome Auditor'] || i['Matrícula Auditor']);

    const fromPO = colaboradoresPO.filter(p => 
      (!onlySpiActive || p.diretoria !== 'DIR SERVICOS AO CLIENTE SP INTERIOR' || p.ativo_spi !== 0) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(p.diretoria)) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(p.supervisor)) &&
      (selectedCities.length === 0 || selectedCities.includes(p.cidade))
    ).map(p => p.nome || p.matricula);

    return Array.from(new Set([...fromData, ...fromPO])).filter(Boolean).sort();
  }, [data, colaboradoresPO, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities, onlySpiActive]);

  const toggleMonth = (m: string) => setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const handleMultiSelect = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (val: string) => {
    if (val === 'ALL') { setter([]); return; }
    setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const clearFilters = () => {
    setSelectedMonths([]);
    setSelectedTipos([]);
    setSelectedDiretorias([]);
    setSelectedSupervisors([]);
    setSelectedCities([]);
    setSelectedAuditores([]);
    setRankingGroup('colaborador');
    setRankingFilter('todos');
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchAuditor = selectedAuditores.length === 0 || 
        selectedAuditores.includes(item['Nome Auditor']) || 
        selectedAuditores.includes(item['Matrícula Auditor']);
      return matchSpiFilter(item) &&
             matchAuditor &&
             (selectedMonths.length === 0 || selectedMonths.includes(String(item['Mês']))) &&
             (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(item['Questionário']))) &&
             (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 3'])) &&
             (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'] || item['GESTOR'])) &&
             (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL']));
    });
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities, selectedAuditores, onlySpiActive]);

  // KPIs
  const totalAprs = filteredData.length;
  const auditoresSet = new Set(filteredData.map(i => i['Matrícula Auditor'] || i['Nome Auditor']));
  const totalAuditores = auditoresSet.size;
  const diretoriasUnicas = new Set(filteredData.map(i => i['DIRETORIA 3']).filter(Boolean)).size;
  const cidadesUnicas = new Set(filteredData.map(i => i['CIDADE COMERCIAL']).filter(Boolean)).size;
  const supervisoresUnicos = new Set(filteredData.map(i => i['Supervisor'] || i['GESTOR']).filter(Boolean)).size;

  const getAvgTimeStr = (totalSecs: number, validCount: number) => {
    const avgSecs = validCount > 0 ? Math.round(totalSecs / validCount) : 0;
    if (avgSecs === 0) return '0s';
    if (avgSecs < 60) return `${avgSecs}s`;
    if (avgSecs < 3600) return `${Math.floor(avgSecs/60)}m ${avgSecs%60}s`;
    return `${Math.floor(avgSecs/3600)}h ${Math.floor((avgSecs%3600)/60)}m`;
  };

  const getWorkingDays = (m: number) => {
    const wd: Record<number, number> = { 1:22, 2:20, 3:22, 4:21, 5:21, 6:22, 7:23, 8:21, 9:22, 10:22, 11:21, 12:23 };
    return wd[m] || 22;
  };

  const targetAprs = useMemo(() => {
    const monthsToConsider = selectedMonths.length > 0 ? selectedMonths : allMonths;
    let totalWd = 0;
    monthsToConsider.forEach(m => totalWd += getWorkingDays(parseInt(m, 10)));
    return totalWd * 2; // ~2 APRs por dia útil por colaborador
  }, [selectedMonths, allMonths]);

  // Ranking
  const allRankAgg = useMemo(() => {
    const agg: Record<string, { count: number, name: string, data: any[], totalSecs: number, validCount: number, uniquePeople: Set<string>, semApr?: boolean, supervisor?: string, cidade?: string }> = {};
    
    filteredData.forEach(item => {
      const name = rankingGroup === 'cidade' 
        ? (item['CIDADE COMERCIAL'] || 'Não Identificada') 
        : (item['Nome Auditor'] || item['Matrícula Auditor'] || 'Não Identificado');
      
      const mat = item['Matrícula Auditor'] || 'N/A';
      const auditorName = item['Nome Auditor'] || mat;
      
      if (selectedAuditores.length > 0 && !selectedAuditores.includes(auditorName) && !selectedAuditores.includes(mat)) return;
      
      if (!agg[name]) {
        agg[name] = { 
          count: 0, 
          name, 
          data: [], 
          totalSecs: 0, 
          validCount: 0, 
          uniquePeople: new Set(),
          semApr: false,
          supervisor: item['Supervisor'] || item['GESTOR'],
          cidade: item['CIDADE COMERCIAL']
        };
      }
      agg[name].count += 1; 
      agg[name].data.push(item);
      agg[name].uniquePeople.add(mat);
      
      const durKey = Object.keys(item).find(k => k.toLowerCase().includes('dura') && k.toLowerCase().includes('o'));
      if (durKey && typeof item[durKey] === 'string') {
        const parts = item[durKey].split(':');
        if (parts.length === 3) {
          const h = parseInt(parts[0], 10); const m = parseInt(parts[1], 10); const s = parseInt(parts[2], 10);
          if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
            const secs = h * 3600 + m * 60 + s;
            // Regra de Negócio: Desconsidera durações maiores que 10 minutos (600s) para o cálculo da média
            if (secs > 0 && secs <= 600) {
              agg[name].totalSecs += secs;
              agg[name].validCount++;
            }
          }
        }
      }
    });

    // Se o agrupamento for por colaborador, cruzamos com os colaboradores ativos do PO para identificar quem NÃO fez APR
    if (rankingGroup === 'colaborador' && colaboradoresPO.length > 0) {
      const seenNames = new Set(Object.keys(agg));
      const seenMats = new Set<string>();
      filteredData.forEach(i => {
        if (i['Matrícula Auditor']) seenMats.add(String(i['Matrícula Auditor']).trim());
        if (i['RE']) seenMats.add(String(i['RE']).trim());
      });

      colaboradoresPO.forEach(p => {
        if (onlySpiActive && p.diretoria === 'DIR SERVICOS AO CLIENTE SP INTERIOR' && p.ativo_spi === 0) return;
        if (selectedDiretorias.length > 0 && !selectedDiretorias.includes(p.diretoria)) return;
        if (selectedSupervisors.length > 0 && !selectedSupervisors.includes(p.supervisor)) return;
        if (selectedCities.length > 0 && !selectedCities.includes(p.cidade)) return;
        if (selectedAuditores.length > 0 && !selectedAuditores.includes(p.nome) && !selectedAuditores.includes(p.matricula)) return;

        const pMat = String(p.matricula || '').trim();
        const pNome = String(p.nome || pMat).trim();

        if (seenNames.has(pNome) || (pMat && seenMats.has(pMat))) return;

        agg[pNome] = {
          count: 0,
          name: pNome,
          data: [],
          totalSecs: 0,
          validCount: 0,
          uniquePeople: new Set([pMat]),
          semApr: true,
          supervisor: p.supervisor,
          cidade: p.cidade
        };
      });
    }

    return Object.values(agg);
  }, [filteredData, colaboradoresPO, selectedAuditores, selectedDiretorias, selectedSupervisors, selectedCities, onlySpiActive, rankingGroup]);

  // Ranking ordenado e filtrado
  const rankAgg = useMemo(() => {
    let list = [...allRankAgg];
    if (rankingGroup === 'colaborador') {
      if (rankingFilter === 'mais') {
        list = list.filter(i => i.count > 0).sort((a, b) => b.count - a.count);
      } else if (rankingFilter === 'menos') {
        list = list.filter(i => i.count > 0).sort((a, b) => a.count - b.count);
      } else if (rankingFilter === 'sem_apr') {
        list = list.filter(i => i.count === 0).sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // 'todos': quem mais fez no topo, quem não fez no final
        list = list.sort((a, b) => b.count - a.count);
      }
    } else {
      list = list.sort((a, b) => b.count - a.count);
    }
    return list;
  }, [allRankAgg, rankingFilter, rankingGroup]);

  const semAprCount = useMemo(() => allRankAgg.filter(i => i.count === 0).length, [allRankAgg]);
  const maxRank = Math.max(1, ...rankAgg.map(i => i.count));

  // Rank Atividade
  const rankAtividade = useMemo(() => {
    const agg: Record<string, { count: number, name: string, data: any[] }> = {};
    filteredData.forEach(item => {
      const q = item['Questionário'];
      const name = cleanTipo(q);
      if (selectedTipos.length > 0 && !selectedTipos.includes(name)) return;
      if (!agg[name]) agg[name] = { count: 0, name, data: [] };
      agg[name].count += 1;
      agg[name].data.push(item);
    });
    return Object.values(agg).sort((a, b) => b.count - a.count);
  }, [filteredData, selectedTipos]);

  const maxAtiv = rankAtividade.length > 0 ? rankAtividade[0].count : 1;

  // Meses - Evolução Histórica no Gráfico respeitando filtros (Supervisor, Cidade, etc.)
  const monthAgg = useMemo(() => {
    const baseWithoutMonthFilter = data.filter(item => {
      const matchAuditor = selectedAuditores.length === 0 || 
        selectedAuditores.includes(item['Nome Auditor']) || 
        selectedAuditores.includes(item['Matrícula Auditor']);
      return matchSpiFilter(item) &&
             matchAuditor &&
             (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(item['Questionário']))) &&
             (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 3'])) &&
             (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'] || item['GESTOR'])) &&
             (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL']));
    });

    const agg: Record<string, number> = {};
    baseWithoutMonthFilter.forEach(item => { 
      const m = String(item['Mês']); 
      agg[m] = (agg[m] || 0) + 1; 
    });
    return allMonths.map(m => ({ month: m, count: agg[m] || 0 }));
  }, [data, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities, selectedAuditores, allMonths, onlySpiActive]);

  const maxMonth = Math.max(1, ...monthAgg.map(m => m.count));

  const exportToExcel = () => {
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

    const rankingData = rankAgg.map((item, idx) => {
      const multiplier = rankingGroup === 'cidade' ? (item.uniquePeople?.size || 1) : 1;
      const expected = Math.round(targetAprs * multiplier);
      const perc = expected > 0 ? ((item.count / expected) * 100).toFixed(1) + '%' : '0%';
      const rankColHeader = rankingGroup === 'cidade' ? 'Cidade' : 'Colaborador';

      return {
        "Posição": `${idx + 1}º`,
        [rankColHeader]: item.name,
        "Realizado": item.count,
        "Esperado": expected,
        "Meta (%)": perc,
        "Duração Total (Segundos)": item.totalSecs,
        "Tempo Médio": getAvgTimeStr(item.totalSecs, item.validCount)
      };
    });
    
    const ws_ranking = XLSX.utils.json_to_sheet(rankingData);
    const rangeRanking = XLSX.utils.decode_range(ws_ranking['!ref'] || 'A1:A1');
    for (let C = rangeRanking.s.c; C <= rangeRanking.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws_ranking[cellAddress]) continue;
      ws_ranking[cellAddress].s = {
        fill: { fgColor: { rgb: "660099" } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    ws_ranking['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws_dados, "Dados Filtrados APR");
    XLSX.utils.book_append_sheet(wb, ws_ranking, "Ranking APR");
    XLSX.writeFile(wb, `vivo_painel_apr.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-[#0b0f19] transition-colors duration-200">
        <div className="relative flex items-center justify-center w-20 h-20 mb-4">
          <div className="absolute inset-0 border-4 border-purple-200 dark:border-purple-950 border-t-[#660099] dark:border-t-purple-400 rounded-full animate-spin"></div>
          <img src="/icone.png" alt="Logo Vivo" className="w-10 h-10 object-contain animate-pulse z-10" />
        </div>
        <p className="text-sm font-semibold text-[#660099] dark:text-purple-400 animate-pulse">Carregando Painel de APR...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 pb-20 transition-colors duration-200">
      
      {/* Header Premium APR */}
      <header className="bg-white dark:bg-[#151d2f] border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-[#660099] dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-700 transition-all shadow-sm"
              title="Voltar aos Módulos"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <img src="/icone.png" alt="Vivo" className="h-7 object-contain" />
              <span className="h-5 w-px bg-gray-300 dark:bg-gray-700 ml-1"></span>
              Painel de APR (Análise Preliminar de Riscos)
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 text-gray-600 dark:text-amber-400 transition-all shadow-sm"
              title={isDark ? "Modo Claro" : "Modo Escuro"}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#660099] dark:hover:border-purple-400 hover:text-[#660099] dark:hover:text-purple-400 hover:shadow-md transition-all font-medium text-xs text-gray-700 dark:text-gray-200"
            >
              <Download size={14} /> Exportar XLSX
            </button>
            <button 
              onClick={() => setIsAdminOpen(true)}
              className="flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white transition-all text-gray-500 dark:text-gray-400 shadow-sm"
              title="Administração"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-gray-50/50 dark:bg-[#0f172a]/70 backdrop-blur-md border-t border-gray-100 dark:border-gray-800/80">
          <div className="max-w-[1600px] mx-auto px-6 py-2 flex flex-wrap items-center gap-4">
            
            <div className="relative">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agrupamento</span>
                <div className="relative">
                  <select
                    value={rankingGroup}
                    onChange={(e) => setRankingGroup(e.target.value as any)}
                    className="appearance-none flex items-center justify-between px-3 py-1.5 w-44 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-purple-300 dark:focus:border-purple-500 cursor-pointer pr-8"
                  >
                    <option value="colaborador">Por Colaborador</option>
                    <option value="cidade">Por Cidade</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="w-px h-12 bg-gray-200 dark:bg-gray-800 hidden md:block"></div>

            <PremiumMultiSelect label="Tipo de Atividade" options={allTipos} selected={selectedTipos} onChange={handleMultiSelect(setSelectedTipos)} icon={FileText} widthClass="w-[220px]" />
            <PremiumMultiSelect label="Diretoria" options={allDiretorias} selected={selectedDiretorias} onChange={handleMultiSelect(setSelectedDiretorias)} icon={Building} widthClass="w-[320px]" />
            <PremiumMultiSelect label="Supervisor" options={allSupervisors} selected={selectedSupervisors} onChange={handleMultiSelect(setSelectedSupervisors)} icon={Users} />
            <PremiumMultiSelect label="Cidade" options={allCities} selected={selectedCities} onChange={handleMultiSelect(setSelectedCities)} icon={MapPin} />

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Interior (SPI)</span>
              <label 
                className={`flex items-center gap-2 px-3 py-1.5 h-[34px] rounded-xl border text-xs font-semibold cursor-pointer transition-all shadow-sm select-none ${
                  onlySpiActive 
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-[#660099] dark:text-purple-300' 
                    : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                }`}
                title="Quando ativo, considera apenas colaboradores ativos em campo da DIR Interior (desconsidera treinamento e administrativo)"
              >
                <input 
                  type="checkbox" 
                  checked={onlySpiActive} 
                  onChange={e => setOnlySpiActive(e.target.checked)} 
                  className="w-4 h-4 text-[#660099] rounded border-gray-300 dark:border-gray-600 focus:ring-[#660099] cursor-pointer"
                />
                <span className="whitespace-nowrap">Ativos em Campo</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  onlySpiActive 
                    ? 'bg-[#660099] text-white dark:bg-purple-600' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>
                  {onlySpiActive ? 'SPI' : 'Todos'}
                </span>
              </label>
            </div>

            {(selectedMonths.length > 0 || selectedTipos.length > 0 || selectedDiretorias.length > 0 || selectedSupervisors.length > 0 || selectedCities.length > 0 || selectedAuditores.length > 0 || !onlySpiActive) && (
              <div className="flex flex-col gap-1.5 ml-auto">
                <span className="text-[10px] font-semibold opacity-0">Limpar</span>
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-1.5 px-4 py-1.5 h-[34px] text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-100 dark:border-red-900/50 rounded-xl transition-all shadow-sm"
                >
                  <X size={14} strokeWidth={2.5} /> Limpar Filtros
                </button>
              </div>
            )}

          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        
        {/* KPIs APR */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { v: formatNum(totalAprs), l: 'APRs no Filtro', icon: FileText, c: 'border-l-pink-500', t: 'text-pink-500' },
            { v: formatNum(diretoriasUnicas), l: 'Diretorias', icon: Building, c: 'border-l-blue-500', t: 'text-blue-500' },
            { v: formatNum(supervisoresUnicos), l: 'Supervisores', icon: Users, c: 'border-l-orange-500', t: 'text-orange-500' },
            { v: formatNum(cidadesUnicas), l: 'Cidades', icon: MapPin, c: 'border-l-teal-500', t: 'text-teal-500' },
            { v: formatNum(totalAuditores), l: 'Auditores Ativos', icon: UserCheck, c: 'border-l-purple-500', t: 'text-purple-500' }
          ].map((kpi, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              key={kpi.l} 
              className={`bg-white dark:bg-[#151d2f] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 border-l-4 ${kpi.c} shadow-sm hover:shadow-md transition-all group flex justify-between items-center`}
            >
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 group-hover:scale-105 transform origin-left transition-transform">
                  {kpi.v}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {kpi.l}
                </div>
              </div>
              <div className={`opacity-20 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 ${kpi.t}`}>
                <kpi.icon size={36} strokeWidth={1.5} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Gráfico de Evolução por Mês */}
        <div className="bg-white dark:bg-[#151d2f] rounded-2xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm mb-6 transition-colors duration-200">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Evolução de APRs por Mês</h2>
          <div className="flex items-end gap-3 h-48 pt-4">
            {monthAgg.map((m, i) => {
              const pct = (m.count / maxMonth) * 100;
              const isSelected = selectedMonths.length === 0 || selectedMonths.includes(m.month);
              return (
                <div 
                  key={m.month} 
                  onClick={() => toggleMonth(m.month)}
                  className={`flex-1 flex flex-col justify-end items-center h-full cursor-pointer group ${isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                >
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 group-hover:text-[#660099] dark:group-hover:text-purple-400 transition-colors">{m.count}</span>
                  <motion.div 
                    initial={{ height: 0 }} animate={{ height: `${pct}%` }} transition={{ delay: i * 0.1, type: 'spring' }}
                    className="w-full bg-[#660099] rounded-t-lg transition-all shadow-[0_0_15px_rgba(102,0,153,0.1)] group-hover:bg-[#9933cc]"
                  />
                  <span className="mt-3 text-sm font-semibold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">{monthMap[m.month] || m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dashboard Grid APR */}
        <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-6">

          {/* Ranking List */}
          <div className="bg-white dark:bg-[#151d2f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-[600px] transition-colors duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Ranking por {rankingGroup === 'cidade' ? 'Cidade' : 'Colaborador'}
              </h2>
              <div className="z-20">
                <PremiumMultiSelect 
                  label="Filtrar Colaborador" 
                  options={allAuditores} 
                  selected={selectedAuditores} 
                  onChange={handleMultiSelect(setSelectedAuditores)} 
                  icon={UserCheck} 
                  widthClass="w-[280px]" 
                />
              </div>
            </div>

            {rankingGroup === 'colaborador' && (
              <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setRankingFilter('todos')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    rankingFilter === 'todos'
                      ? 'bg-[#660099] text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Todos ({allRankAgg.length})
                </button>
                <button
                  onClick={() => setRankingFilter('mais')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    rankingFilter === 'mais'
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-[#660099] dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Mais APRs
                </button>
                <button
                  onClick={() => setRankingFilter('menos')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    rankingFilter === 'menos'
                      ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Menos APRs
                </button>
                <button
                  onClick={() => setRankingFilter('sem_apr')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    rankingFilter === 'sem_apr'
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>Sem APR</span>
                  {semAprCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold">
                      {semAprCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Table Header */}
            <div className="grid grid-cols-[30px_1fr_80px_80px_80px_110px] items-center gap-4 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 mb-2">
              <div>#</div>
              <div>
                {rankingGroup === 'cidade' ? 'Cidade' : 'Colaborador'}
              </div>
              <div className="text-center">Realizado</div>
              <div className="flex items-center justify-center gap-1">
                Esperado
                <button 
                  onClick={() => setIsMetaModalOpen(true)} 
                  className="focus:outline-none rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 p-0.5 transition-colors"
                  title="Ver como a meta é calculada"
                >
                  <HelpCircle size={14} className="text-gray-400 cursor-pointer hover:text-[#660099] dark:hover:text-purple-400" />
                </button>
              </div>
              <div className="text-center">Meta (%)</div>
              <div className="text-center">Duração</div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {rankAgg.length === 0 ? (
                <div className="text-center py-20 text-gray-400 dark:text-gray-500">Nenhum registro encontrado no filtro selecionado.</div>
              ) : (
                rankAgg.map((item, idx) => {
                  const pct = (item.count / maxRank) * 100;
                  const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-teal-500', 'bg-yellow-500'];
                  const barColor = colors[idx % colors.length];
                  const multiplier = rankingGroup === 'cidade' ? (item.uniquePeople?.size || 1) : 1;
                  const expected = Math.round(targetAprs * multiplier);
                  const perc = expected > 0 ? Math.round((item.count / expected) * 100) : 0;

                  return (
                    <div key={`${item.name}-${idx}`}>
                      <div 
                        onClick={() => rankingGroup === 'colaborador' && item.count > 0 && setSelectedAuditorDetails(item)}
                        className={`grid grid-cols-[30px_1fr_80px_80px_80px_110px] items-center gap-4 py-2 px-3 rounded-xl mb-1.5 border border-transparent bg-white dark:bg-[#151d2f] hover:bg-purple-50/50 dark:hover:bg-purple-950/20 hover:border-purple-200 dark:hover:border-purple-800/40 transition-all ${rankingGroup === 'colaborador' && item.count > 0 ? 'cursor-pointer' : ''}`}
                      >
                        <div className={`text-xs font-bold ${item.count === 0 ? 'text-red-500' : idx < 3 ? 'text-[#660099] dark:text-purple-400 font-extrabold text-sm' : 'text-gray-400 dark:text-gray-500'}`}>
                          {idx + 1}º
                        </div>
                        
                        <div className="overflow-hidden pr-2">
                          <div className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200" title={item.name}>
                            {item.name}
                          </div>
                          {(item.supervisor || item.cidade) && (
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {item.supervisor ? `Sup: ${item.supervisor}` : ''} {item.cidade ? `• ${item.cidade}` : ''}
                            </div>
                          )}
                          <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={`h-full ${item.count === 0 ? 'bg-transparent' : barColor} rounded-full opacity-80`} />
                          </div>
                        </div>
                        
                        <div className="flex justify-center items-center">
                          <div className={`text-sm font-bold ${item.count === 0 ? 'text-red-500 font-extrabold' : 'text-gray-900 dark:text-white'}`}>
                            {formatNum(item.count)}
                          </div>
                        </div>

                        <div className="flex justify-center items-center">
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{formatNum(expected)}</div>
                        </div>

                        <div className="flex justify-center items-center">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            item.count === 0 ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400' :
                            perc >= 100 ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' :
                            perc >= 70 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' :
                            perc > 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' :
                            'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                          }`}>
                            {perc}%
                          </span>
                        </div>

                        <div className="flex justify-center items-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {item.validCount > 0 ? getAvgTimeStr(item.totalSecs, item.validCount) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Ranking por Atividade */}
          <div className="bg-white dark:bg-[#151d2f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-[600px] transition-colors duration-200">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Atividades de APR
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {rankAtividade.map((item, idx) => {
                const pct = Math.min(100, Math.round((item.count / maxAtiv) * 100));
                return (
                  <div key={item.name} className="p-3 rounded-xl mb-3 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{item.name}</span>
                      <span className="text-xs font-bold text-[#660099] dark:text-purple-400">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </main>

      {/* Detalhes do Auditor Modal */}
      <AnimatePresence>
        {selectedAuditorDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#151d2f] rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800"
            >
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedAuditorDetails.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total de {selectedAuditorDetails.count} APRs registradas</p>
                </div>
                <button onClick={() => setSelectedAuditorDetails(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-semibold uppercase">
                    <tr>
                      <th className="py-2">Número</th>
                      <th className="py-2">Data Início</th>
                      <th className="py-2">Duração</th>
                      <th className="py-2">Questionário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                    {selectedAuditorDetails.data.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 font-mono font-medium">{r['Número']}</td>
                        <td className="py-2">{r['Data Início'] || '-'}</td>
                        <td className="py-2">{r['Duração'] || '-'}</td>
                        <td className="py-2 max-w-[200px] truncate" title={r['Questionário']}>{cleanTipo(r['Questionário'])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Entendendo a Meta */}
      <AnimatePresence>
        {isMetaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#151d2f] rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f172a]/50">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="text-[#660099] dark:text-purple-400" size={20} />
                  Entendendo a Meta de APR
                </h3>
                <button onClick={() => setIsMetaModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  A meta individual esperada de APRs é calculada com base na seguinte regra:
                </p>
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-800/60">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-center">
                    2 APRs por dia × Dias úteis do mês selecionado
                  </p>
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  Cada colaborador tem como objetivo realizar ao menos 2 Análises Preliminares de Riscos para cada dia útil trabalhado nos meses filtrados. Para o agrupamento por cidade, a meta é multiplicada pela quantidade de colaboradores daquela localidade.
                </p>
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={() => setIsMetaModalOpen(false)}
                    className="px-6 py-2 bg-[#660099] dark:bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-[#8000bf] dark:hover:bg-purple-500 transition-colors shadow-sm"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} onSuccessUpload={loadData} />

    </div>
  );
};
