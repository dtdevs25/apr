"use client";
import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, ChevronDown, Building, Users, MapPin, 
  FileText, UserCheck, X, Settings, ArrowLeft, Sun, Moon, ShieldAlert, FileCheck, Activity, HelpCircle
} from 'lucide-react';
import { PremiumMultiSelect } from '@/components/common/PremiumMultiSelect';
import { AdminModal } from '@/components/common/AdminModal';

interface DssDashboardProps {
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

export const DssDashboard: React.FC<DssDashboardProps> = ({ onBack, isDark, toggleTheme }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [rankingGroup, setRankingGroup] = useState<'lider' | 'cidade' | 'colaborador'>('lider');

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
    fetch('/api/data?type=DSS')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao carregar dados de DSS:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // No DSS, a base padrão considera os registros com Status PRESENTE
  const baseData = useMemo(() => data.filter(i => i['Status'] === 'PRESENTE'), [data]);

  const allMonths = useMemo(() => Array.from(new Set(baseData.map(i => String(i['Mês'])))).filter(Boolean).sort(), [baseData]);

  const matchSpiFilter = (i: any) => {
    if (!onlySpiActive) return true;
    if (i['DIRETORIA 3'] === 'DIR SERVICOS AO CLIENTE SP INTERIOR') {
      return i['ATIVO_SPI'] !== 0;
    }
    return true;
  };

  // Filtros Cruzados (Cross-filtering)
  const allTipos = useMemo(() => {
    const base = baseData.filter(i => 
      matchSpiFilter(i) &&
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => i['Assunto']))).filter(Boolean).sort();
  }, [baseData, selectedMonths, selectedDiretorias, selectedSupervisors, selectedCities, onlySpiActive]);

  const allDiretorias = useMemo(() => {
    const base = baseData.filter(i => 
      matchSpiFilter(i) &&
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(i['Assunto'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => i['DIRETORIA 3']))).filter(Boolean).sort();
  }, [baseData, selectedMonths, selectedTipos, selectedSupervisors, selectedCities, onlySpiActive]);

  const allSupervisors = useMemo(() => {
    const base = baseData.filter(i => 
      matchSpiFilter(i) &&
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(i['Assunto'])) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => i['Supervisor']))).filter(Boolean).sort();
  }, [baseData, selectedMonths, selectedTipos, selectedDiretorias, selectedCities, onlySpiActive]);

  const allCities = useMemo(() => {
    const base = baseData.filter(i => 
      matchSpiFilter(i) &&
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(i['Assunto'])) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor']))
    );
    return Array.from(new Set(base.map(i => i['CIDADE COMERCIAL']))).filter(Boolean).sort();
  }, [baseData, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, onlySpiActive]);

  const allAuditores = useMemo(() => {
    const base = baseData.filter(i => 
      matchSpiFilter(i) &&
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(i['Assunto'])) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => i['Nome'] || i['Matrícula']))).filter(Boolean).sort();
  }, [baseData, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities, onlySpiActive]);

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
    setRankingGroup('lider');
  };

  const filteredData = useMemo(() => {
    return baseData.filter(item => {
      const matchAuditor = selectedAuditores.length === 0 || 
        selectedAuditores.includes(item['Nome']) || 
        selectedAuditores.includes(item['Matrícula']);
      return matchSpiFilter(item) &&
             matchAuditor &&
             (selectedMonths.length === 0 || selectedMonths.includes(String(item['Mês']))) &&
             (selectedTipos.length === 0 || selectedTipos.includes(item['Assunto'])) &&
             (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 3'])) &&
             (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'])) &&
             (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL']));
    });
  }, [baseData, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities, selectedAuditores, onlySpiActive]);

  // KPIs
  const totalAprs = new Set(filteredData.map(i => i['Número do Diálogo'])).size; // Diálogos únicos
  const auditoresSet = new Set(filteredData.map(i => i['Matrícula'] || i['Nome']));
  const totalAuditores = filteredData.length; // Total presenças registradas
  const supervisoresUnicos = new Set(filteredData.map(i => i['Supervisor']).filter(Boolean)).size;

  const getWorkingWeeks = (m: number) => {
    const ww: Record<number, number> = { 1:4.4, 2:4, 3:4.4, 4:4.2, 5:4.2, 6:4.4, 7:4.6, 8:4.2, 9:4.4, 10:4.4, 11:4.2, 12:4.6 };
    return Math.floor(ww[m] || 4);
  };

  const targetAprs = useMemo(() => {
    const monthsToConsider = selectedMonths.length > 0 ? selectedMonths : allMonths;
    let totalWw = 0;
    monthsToConsider.forEach(m => totalWw += getWorkingWeeks(parseInt(m, 10)));
    return totalWw * 1; // 1 DSS por semana por líder
  }, [selectedMonths, allMonths]);

  // Ranking
  const rankAgg = useMemo(() => {
    const agg: Record<string, { count: number, name: string, data: any[], totalSecs: number, validCount: number, dssSet: Set<string>, uniquePeople: Set<string> }> = {};
    
    filteredData.forEach(item => {
      let name = item['Supervisor'] || item['Líder'] || 'Não Identificado';
      if (rankingGroup === 'cidade') {
        name = item['CIDADE COMERCIAL'] || 'Não Identificada';
      } else if (rankingGroup === 'colaborador') {
        name = item['Nome'] || item['Matrícula'] || 'Não Identificado';
      }
      
      if (selectedAuditores.length > 0 && !selectedAuditores.includes(item['Nome']) && !selectedAuditores.includes(item['Matrícula'])) return;
      
      if (!agg[name]) agg[name] = { count: 0, name, data: [], totalSecs: 0, validCount: 0, dssSet: new Set(), uniquePeople: new Set() };
      agg[name].data.push(item);
      if (rankingGroup === 'cidade') {
        agg[name].uniquePeople.add(item['Supervisor'] || item['Líder'] || item['Nome'] || 'N/A');
      } else {
        agg[name].uniquePeople.add(name);
      }
      
      const dssId = item['Número do Diálogo'];
      if (dssId && !agg[name].dssSet.has(dssId)) {
        agg[name].dssSet.add(dssId);
        agg[name].count += 1;
      }
    });

    return Object.values(agg).sort((a, b) => b.count - a.count);
  }, [filteredData, selectedAuditores, rankingGroup]);

  const maxRank = rankAgg.length > 0 ? rankAgg[0].count : 1;

  // Evolução mensal (diálogos únicos por mês)
  const monthAgg = useMemo(() => {
    const agg: Record<string, number> = {};
    const uniqueDSS = new Set<string>();
    filteredData.forEach(item => {
      const m = String(item['Mês']);
      const dssId = item['Número do Diálogo'];
      if (dssId) {
        const key = `${m}-${dssId}`;
        if (!uniqueDSS.has(key)) {
          uniqueDSS.add(key);
          agg[m] = (agg[m] || 0) + 1;
        }
      }
    });
    return allMonths.map(m => ({ month: m, count: agg[m] || 0 }));
  }, [filteredData, allMonths]);

  const maxMonth = Math.max(1, ...monthAgg.map(m => m.count));

  const exportToExcel = () => {
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
      cidade: string;
      supervisor: string;
      count: number;
    }> = {};

    filteredData.forEach(item => {
      const mat = String(item['Matrícula'] || '').trim();
      const nome = String(item['Nome'] || mat || 'Não Identificado').trim().toUpperCase();
      const key = mat || nome;

      if (!tecnicosAgg[key]) {
        tecnicosAgg[key] = {
          name: nome,
          matricula: mat || '-',
          diretoria: item['DIRETORIA 3'] || 'N/A',
          filial: item['Base'] || 'São Paulo',
          cidade: item['CIDADE COMERCIAL'] || item['Localidade'] || 'São Paulo',
          supervisor: item['Supervisor'] || item['Líder'] || 'N/A',
          count: 0
        };
      }
      tecnicosAgg[key].count += 1;
    });

    const tecnicosList = Object.values(tecnicosAgg).sort((a, b) => b.count - a.count);

    const rankingTecnicosData = tecnicosList.map((item, idx) => {
      const expected = targetAprs;
      const perc = expected > 0 ? ((item.count / expected) * 100).toFixed(1) + '%' : '0.0%';

      return {
        "Posição": `${idx + 1}º`,
        "Técnico / Colaborador": item.name,
        "Matrícula": item.matricula,
        "Diretoria": item.diretoria,
        "Filial": item.filial,
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
      { wch: 10 }, { wch: 38 }, { wch: 15 }, { wch: 38 }, { wch: 25 }, { wch: 25 }, { wch: 32 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
    ];

    // 3. Aba Dedicada: Ranking por Líderes DSS
    const lideresAgg: Record<string, {
      name: string;
      diretoria: string;
      filial: string;
      cidade: string;
      dssSet: Set<string>;
      participantesCount: number;
    }> = {};

    filteredData.forEach(item => {
      const lider = String(item['Líder'] || 'Não Identificado').trim();
      const dssId = item['Número do Diálogo'];

      if (!lideresAgg[lider]) {
        lideresAgg[lider] = {
          name: lider,
          diretoria: item['DIRETORIA 3'] || 'N/A',
          filial: item['Base'] || 'São Paulo',
          cidade: item['CIDADE COMERCIAL'] || item['Localidade'] || 'São Paulo',
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
      const expected = targetAprs;
      const perc = expected > 0 ? ((item.count / expected) * 100).toFixed(1) + '%' : '0.0%';

      return {
        "Posição": `${idx + 1}º`,
        "Líder DSS": item.name,
        "Diretoria": item.diretoria,
        "Filial": item.filial,
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
      { wch: 10 }, { wch: 38 }, { wch: 38 }, { wch: 25 }, { wch: 25 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws_dados, "Dados Filtrados DSS");
    XLSX.utils.book_append_sheet(wb, ws_tecnicos, "Ranking Técnicos DSS");
    XLSX.utils.book_append_sheet(wb, ws_lideres, "Ranking Líderes DSS");

    if (rankingGroup === 'cidade') {
      const rankingCidadesData = rankAgg.map((item, idx) => {
        const multiplier = item.uniquePeople?.size || 1;
        const expected = Math.round(targetAprs * multiplier);
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
        { wch: 10 }, { wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 25 }
      ];
      XLSX.utils.book_append_sheet(wb, ws_cidades, "Ranking Cidades DSS");
    }

    XLSX.writeFile(wb, `vivo_painel_dss.xlsx`);
  };

  const basePessoasDss = selectedAuditores.length > 0 
    ? auditoresSet.size 
    : (rankingGroup === 'colaborador' ? auditoresSet.size : supervisoresUnicos);
  const totalEsperadoDss = Math.round(targetAprs * basePessoasDss);
  const percAtendimento = totalEsperadoDss > 0 ? ((totalAprs / totalEsperadoDss) * 100).toFixed(1) : '0.0';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-[#0b0f19] transition-colors duration-200">
        <div className="relative flex items-center justify-center w-20 h-20 mb-4">
          <div className="absolute inset-0 border-4 border-purple-200 dark:border-purple-950 border-t-[#660099] dark:border-t-purple-400 rounded-full animate-spin"></div>
          <img src="/icone.png" alt="Logo Vivo" className="w-10 h-10 object-contain animate-pulse z-10" />
        </div>
        <p className="text-sm font-semibold text-[#660099] dark:text-purple-400 animate-pulse">Carregando Painel de DSS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 pb-20 transition-colors duration-200">
      
      {/* Header Premium DSS */}
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
              Painel de DSS (Diálogo Semanal de Segurança)
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

        {/* Filter Bar DSS */}
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
                    <option value="lider">Por Líder DSS</option>
                    <option value="cidade">Por Cidade</option>
                    <option value="colaborador">Por Colaborador</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="w-px h-12 bg-gray-200 dark:bg-gray-800 hidden md:block"></div>

            <PremiumMultiSelect label="Assunto do DSS" options={allTipos} selected={selectedTipos} onChange={handleMultiSelect(setSelectedTipos)} icon={FileText} widthClass="w-[240px]" />
            <PremiumMultiSelect label="Diretoria" options={allDiretorias} selected={selectedDiretorias} onChange={handleMultiSelect(setSelectedDiretorias)} icon={Building} widthClass="w-[320px]" />
            <PremiumMultiSelect label="Líder DSS" options={allSupervisors} selected={selectedSupervisors} onChange={handleMultiSelect(setSelectedSupervisors)} icon={Users} />
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
        
        {/* KPIs DSS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { v: formatNum(totalAuditores), l: 'Participantes Presentes', icon: Users, c: 'border-l-purple-500', t: 'text-purple-500' },
            { v: formatNum(supervisoresUnicos), l: 'Líderes Ativos', icon: UserCheck, c: 'border-l-teal-500', t: 'text-teal-500' },
            { v: formatNum(totalEsperadoDss), l: 'DSS Esperados', icon: FileCheck, c: 'border-l-blue-500', t: 'text-blue-500' },
            { v: formatNum(totalAprs), l: 'DSS Realizados', icon: FileText, c: 'border-l-pink-500', t: 'text-pink-500' },
            { v: `${percAtendimento}%`, l: 'Atendimento Meta', icon: Activity, c: 'border-l-orange-500', t: 'text-orange-500' }
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
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Evolução de Diálogos por Mês</h2>
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
                    className="w-full bg-[#660099] rounded-t-lg transition-all shadow-sm group-hover:bg-[#8000bf]"
                  />
                  <span className="mt-3 text-sm font-semibold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">{monthMap[m.month] || m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking List DSS (Full Width) */}
        <div className="bg-white dark:bg-[#151d2f] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col min-h-[600px] transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Ranking por {
                rankingGroup === 'cidade' ? 'Cidade' : rankingGroup === 'colaborador' ? 'Colaborador' : 'Líder DSS'
              }
            </h2>
            <div className="z-20">
              <PremiumMultiSelect 
                label="Filtrar Participante" 
                options={allAuditores} 
                selected={selectedAuditores} 
                onChange={handleMultiSelect(setSelectedAuditores)} 
                icon={UserCheck} 
                widthClass="w-[280px]" 
              />
            </div>
          </div>

            {/* Table Header */}
            <div className="grid grid-cols-[30px_1fr_80px_80px_80px_110px] items-center gap-4 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 mb-2">
              <div>#</div>
              <div>
                {rankingGroup === 'cidade' ? 'Cidade' : rankingGroup === 'colaborador' ? 'Colaborador' : 'Líder DSS'}
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
              <div className="text-center">Participantes</div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {rankAgg.length === 0 ? (
                <div className="text-center py-20 text-gray-400 dark:text-gray-500">Nenhum registro de DSS encontrado no filtro selecionado.</div>
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
                        className="grid grid-cols-[30px_1fr_80px_80px_80px_110px] items-center gap-4 py-2 px-3 rounded-xl mb-1.5 border border-transparent bg-white dark:bg-[#151d2f] hover:bg-purple-50/50 dark:hover:bg-purple-950/20 hover:border-purple-200 dark:hover:border-purple-800/40 transition-all"
                      >
                        <div className={`text-xs font-bold ${idx < 3 ? 'text-[#660099] dark:text-purple-400 font-extrabold text-sm' : 'text-gray-400 dark:text-gray-500'}`}>
                          {idx + 1}º
                        </div>
                        
                        <div className="overflow-hidden pr-2">
                          <div className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200" title={item.name}>
                            {item.name}
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={`h-full ${barColor} rounded-full opacity-80`} />
                          </div>
                        </div>
                        
                        <div className="flex justify-center items-center">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatNum(item.count)}
                          </div>
                        </div>

                        <div className="flex justify-center items-center">
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{formatNum(expected)}</div>
                        </div>

                        <div className="flex justify-center items-center">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
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
                            <Users size={12} className="text-blue-500" /> {item.data.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </main>

        {/* Modal Entendendo a Meta DSS */}
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
                    Entendendo a Meta de DSS
                  </h3>
                  <button onClick={() => setIsMetaModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    A meta de Diálogos Semanais de Segurança (DSS) é calculada com base na seguinte regra:
                  </p>
                  <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-800/60">
                    <p className="font-bold text-purple-900 dark:text-purple-300 text-center">
                      1 DSS por semana × Semanas úteis do mês selecionado
                    </p>
                  </div>
                  <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Isso significa que cada Líder tem como objetivo aplicar ao menos 1 Diálogo Semanal de Segurança por semana nas bases filtradas. Para o agrupamento por cidade, a meta é multiplicada pela quantidade de líderes únicos daquela localidade.
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
