"use client";
import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, ChevronDown, Building, Users, MapPin, 
  FileText, UserCheck, X, Settings, ArrowLeft, Sun, Moon, ShieldAlert, FileCheck, Activity
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
    const ws_dados = XLSX.utils.json_to_sheet(filteredData);
    const rangeDados = XLSX.utils.decode_range(ws_dados['!ref'] || 'A1:A1');
    for (let C = rangeDados.s.c; C <= rangeDados.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws_dados[cellAddress]) continue;
      ws_dados[cellAddress].s = {
        fill: { fgColor: { rgb: "0284c7" } }, // Azul para DSS
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    const rankingData = rankAgg.map((item, idx) => {
      const multiplier = rankingGroup === 'cidade' ? (item.uniquePeople?.size || 1) : 1;
      const expected = Math.round(targetAprs * multiplier);
      const perc = expected > 0 ? ((item.count / expected) * 100).toFixed(1) + '%' : '0%';
      const rankColHeader = rankingGroup === 'cidade' ? 'Cidade' : rankingGroup === 'colaborador' ? 'Colaborador' : 'Líder DSS';

      return {
        "Posição": `${idx + 1}º`,
        [rankColHeader]: item.name,
        "Realizado (DSS)": item.count,
        "Esperado": expected,
        "Meta (%)": perc,
        "Participantes Presentes": item.data.length
      };
    });
    
    const ws_ranking = XLSX.utils.json_to_sheet(rankingData);
    const rangeRanking = XLSX.utils.decode_range(ws_ranking['!ref'] || 'A1:A1');
    for (let C = rangeRanking.s.c; C <= rangeRanking.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws_ranking[cellAddress]) continue;
      ws_ranking[cellAddress].s = {
        fill: { fgColor: { rgb: "0284c7" } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    ws_ranking['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws_dados, "Dados Filtrados DSS");
    XLSX.utils.book_append_sheet(wb, ws_ranking, "Ranking DSS");
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
          <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-950 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
          <img src="/icone.png" alt="Logo Vivo" className="w-10 h-10 object-contain animate-pulse z-10" />
        </div>
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 animate-pulse">Carregando Painel de DSS...</p>
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
              className="flex items-center justify-center w-8 h-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-700 transition-all shadow-sm"
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
              className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md transition-all font-medium text-xs text-gray-700 dark:text-gray-200"
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
                    className="appearance-none flex items-center justify-between px-3 py-1.5 w-44 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-blue-300 dark:focus:border-blue-500 cursor-pointer pr-8"
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
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-300' 
                    : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                }`}
                title="Quando ativo, considera apenas colaboradores ativos em campo da DIR Interior (desconsidera treinamento e administrativo)"
              >
                <input 
                  type="checkbox" 
                  checked={onlySpiActive} 
                  onChange={e => setOnlySpiActive(e.target.checked)} 
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-600 cursor-pointer"
                />
                <span className="whitespace-nowrap">Ativos em Campo</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  onlySpiActive 
                    ? 'bg-blue-600 text-white dark:bg-blue-500' 
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
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{m.count}</span>
                  <motion.div 
                    initial={{ height: 0 }} animate={{ height: `${pct}%` }} transition={{ delay: i * 0.1, type: 'spring' }}
                    className="w-full bg-blue-600 rounded-t-lg transition-all shadow-sm group-hover:bg-blue-700"
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

          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
            {rankAgg.length === 0 ? (
              <div className="text-center py-20 text-gray-400 dark:text-gray-500">Nenhum registro de DSS encontrado no filtro selecionado.</div>
            ) : (
              rankAgg.map((item, idx) => {
                const pct = Math.min(100, Math.round((item.count / maxRank) * 100));
                const multiplier = rankingGroup === 'cidade' ? (item.uniquePeople?.size || 1) : 1;
                const expected = Math.round(targetAprs * multiplier);
                const isMetaAtingida = expected > 0 && item.count >= expected;

                return (
                  <motion.div 
                    key={item.name}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(idx * 0.02, 0.4) }}
                    className="group p-3.5 rounded-xl mb-2.5 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 text-center text-xs font-bold ${idx < 3 ? 'text-blue-600 dark:text-blue-400 font-extrabold text-sm' : 'text-gray-400 dark:text-gray-500'}`}>
                          {idx + 1}º
                        </span>
                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate max-w-[340px]">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium">
                          <Users size={12} /> {item.data.length} participantes
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isMetaAtingida ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {item.count} / {expected} DSS
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isMetaAtingida ? 'bg-green-500' : 'bg-blue-600 dark:bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

      </main>

      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} onSuccessUpload={loadData} />

    </div>
  );
};
