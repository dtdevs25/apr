"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown, CheckSquare, Square, Building, Users, MapPin, Calendar, Search, FileText, UserCheck, Clock } from 'lucide-react';

const formatNum = (n: number) => n.toLocaleString('pt-BR');

const monthMap: Record<string, string> = {
  '1': 'Jan', '2': 'Fev', '3': 'Mar', '4': 'Abr', '5': 'Mai', '6': 'Jun',
  '7': 'Jul', '8': 'Ago', '9': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set'
};

// Componente Premium de Multi-seleção
const PremiumMultiSelect = ({ 
  label, 
  options, 
  selected, 
  onChange,
  icon: Icon
}: { 
  label: string, 
  options: string[], 
  selected: string[], 
  onChange: (val: string) => void,
  icon: any
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const isActive = selected.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between px-3 py-1.5 w-48 bg-white border rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-200 ${isActive ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Icon size={14} className={isActive ? 'text-[#660099]' : 'text-gray-400'} />
            <span className={`text-xs truncate font-medium ${isActive ? 'text-purple-900' : 'text-gray-700'}`}>
              {selected.length === 0 ? 'Todas opções...' : selected.length === 1 ? selected[0] : `${selected.length} selecionadas`}
            </span>
          </div>
          <ChevronDown size={14} className={isActive ? 'text-[#660099]' : 'text-gray-400'} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }}
            className="absolute z-50 top-[105%] left-0 w-64 bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5"
          >
            <div className="p-3 border-b border-gray-100 bg-white/50">
              <div className="flex items-center bg-gray-100/80 rounded-lg px-3 py-2 border border-gray-200 focus-within:border-purple-300 focus-within:bg-white transition-all">
                <Search size={14} className="text-gray-400 mr-2" />
                <input 
                  type="text" placeholder="Buscar..." 
                  className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin bg-white">
              <div 
                onClick={() => onChange('ALL')}
                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors mb-1"
              >
                {selected.length === 0 ? <CheckSquare size={16} className="text-[#660099]" /> : <Square size={16} className="text-gray-300" />}
                <span className="text-sm font-semibold text-gray-700">Selecionar Todas</span>
              </div>
              <div className="h-px bg-gray-100 mb-1 mx-2"></div>
              {filteredOptions.length === 0 && <div className="text-center py-4 text-xs text-gray-400">Nenhuma opção encontrada</div>}
              {filteredOptions.map(opt => {
                const isSel = selected.includes(opt);
                return (
                  <div 
                    key={opt} onClick={() => onChange(opt)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSel ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                  >
                    {isSel ? <CheckSquare size={16} className="text-[#660099]" /> : <Square size={16} className="text-gray-300" />}
                    <span className={`text-sm truncate ${isSel ? 'text-purple-900 font-medium' : 'text-gray-600'}`}>{opt}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [visao, setVisao] = useState('c'); // c: cidade, d: diretoria, t: supervisor
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedDiretorias, setSelectedDiretorias] = useState<string[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  // Expand state
  const [expandedAuditor, setExpandedAuditor] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data').then(res => res.json()).then(json => { setData(json); setLoading(false); });
  }, []);

  const allMonths = useMemo(() => Array.from(new Set(data.map(i => String(i['Mês'])))).filter(Boolean).sort(), [data]);
  const allDiretorias = useMemo(() => Array.from(new Set(data.map(i => i['DIRETORIA 1']))).filter(Boolean).sort(), [data]);
  const allSupervisors = useMemo(() => Array.from(new Set(data.map(i => i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR']))).filter(Boolean).sort(), [data]);
  const allCities = useMemo(() => Array.from(new Set(data.map(i => i['CIDADE COMERCIAL']))).filter(Boolean).sort(), [data]);

  const toggleMonth = (m: string) => setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const handleMultiSelect = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (val: string) => {
    if (val === 'ALL') { setter([]); return; }
    setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      return (selectedMonths.length === 0 || selectedMonths.includes(String(item['Mês']))) &&
             (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 1'])) &&
             (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'] || item['SUPERVISOR'] || item['GESTOR'])) &&
             (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL']));
    });
  }, [data, selectedMonths, selectedDiretorias, selectedSupervisors, selectedCities]);

  // KPIs
  const totalAprs = filteredData.length;
  const auditoresSet = new Set(filteredData.map(i => i['Matrícula Auditor'] || i['Nome Auditor']));
  const totalAuditores = auditoresSet.size;
  const diretoriasUnicas = new Set(filteredData.map(i => i['DIRETORIA 1']).filter(Boolean)).size;
  const cidadesUnicas = new Set(filteredData.map(i => i['CIDADE COMERCIAL']).filter(Boolean)).size;
  const supervisoresUnicos = new Set(filteredData.map(i => i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR']).filter(Boolean)).size;

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
    return totalWd * 2;
  }, [selectedMonths, allMonths]);

  // Main list
  const mainAgg = useMemo(() => {
    const agg: Record<string, number> = {};
    const field = visao === 'c' ? 'CIDADE COMERCIAL' : visao === 'd' ? 'DIRETORIA 1' : 'GESTOR';
    filteredData.forEach(item => {
      let val = item[field] || item['SUPERVISOR'] || item['Supervisor'] || 'Não Identificado';
      if (visao === 't') {
        val = item['Supervisor'] || item['SUPERVISOR'] || item['GESTOR'] || 'Não Identificado';
      }
      agg[val] = (agg[val] || 0) + 1;
    });
    return Object.entries(agg).sort((a, b) => b[1] - a[1]);
  }, [filteredData, visao]);
  const maxMain = mainAgg.length > 0 ? mainAgg[0][1] : 1;

  // Rank list
  const rankAgg = useMemo(() => {
    const agg: Record<string, { count: number, name: string, data: any[], totalSecs: number, validCount: number }> = {};
    filteredData.forEach(item => {
      const mat = item['Matrícula Auditor'] || 'N/A';
      const name = item['Nome Auditor'] || mat;
      if (!agg[mat]) agg[mat] = { count: 0, name, data: [], totalSecs: 0, validCount: 0 };
      agg[mat].count += 1; agg[mat].data.push(item);
      const durKey = Object.keys(item).find(k => k.toLowerCase().includes('dura') && k.toLowerCase().includes('o'));
      if (durKey && typeof item[durKey] === 'string') {
        const parts = item[durKey].split(':');
        if (parts.length === 3) {
          const h = parseInt(parts[0], 10); const m = parseInt(parts[1], 10); const s = parseInt(parts[2], 10);
          if (!isNaN(h) && !isNaN(m) && !isNaN(s)) { agg[mat].totalSecs += h * 3600 + m * 60 + s; agg[mat].validCount++; }
        }
      }
    });
    return Object.values(agg).sort((a, b) => b.count - a.count);
  }, [filteredData]);
  const maxRank = rankAgg.length > 0 ? rankAgg[0].count : 1;

  // Month cols
  const monthAgg = useMemo(() => {
    const agg: Record<string, number> = {};
    filteredData.forEach(item => { const m = String(item['Mês']); agg[m] = (agg[m] || 0) + 1; });
    return allMonths.map(m => ({ month: m, count: agg[m] || 0 }));
  }, [filteredData, allMonths]);
  const maxMonth = Math.max(1, ...monthAgg.map(m => m.count));

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "APRs");
    XLSX.writeFile(wb, "vivo_aprs.xlsx");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="w-10 h-10 border-4 border-purple-200 border-t-[#660099] rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      
      {/* Header Premium - Light Theme */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <img src="/icone.png" alt="Vivo" className="h-7 object-contain" />
              <span className="h-5 w-px bg-gray-300 ml-1"></span>
              Painel de APRs
            </h1>
          </div>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-[#660099] hover:text-[#660099] hover:shadow-md transition-all font-medium text-xs text-gray-700"
          >
            <Download size={14} /> Exportar XLSX
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-gray-50/50 backdrop-blur-md border-t border-gray-100">
          <div className="max-w-[1600px] mx-auto px-6 py-2 flex flex-wrap items-center gap-4">
            
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Visão Principal</span>
              <div className="relative">
                <select 
                  value={visao} onChange={e => setVisao(e.target.value)}
                  className="appearance-none px-3 py-1.5 w-40 bg-white border border-gray-200 rounded-xl shadow-sm text-xs font-medium text-gray-700 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all cursor-pointer"
                >
                  <option value="c">Por Cidade</option>
                  <option value="d">Por Diretoria</option>
                  <option value="t">Por Supervisor</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="w-px h-12 bg-gray-200 hidden md:block"></div>

            <PremiumMultiSelect label="Diretoria" options={allDiretorias} selected={selectedDiretorias} onChange={handleMultiSelect(setSelectedDiretorias)} icon={Building} />
            <PremiumMultiSelect label="Supervisor" options={allSupervisors} selected={selectedSupervisors} onChange={handleMultiSelect(setSelectedSupervisors)} icon={Users} />
            <PremiumMultiSelect label="Cidade" options={allCities} selected={selectedCities} onChange={handleMultiSelect(setSelectedCities)} icon={MapPin} />

            <div className="w-px h-8 bg-gray-200 hidden xl:block"></div>

            <div className="flex flex-col gap-1 ml-auto">
              <div className="flex gap-1 items-center bg-white p-1 rounded-xl border border-gray-100">
                {['1','2','3','4','5','6','7','8','9','10','11','12'].map(m => (
                  <button 
                    key={m} onClick={() => toggleMonth(m)}
                    className={`px-2 py-1 rounded-md text-[10px] min-w-[32px] text-center font-bold transition-all border ${selectedMonths.includes(m) ? 'bg-[#660099] text-white border-[#660099] shadow-md' : 'bg-gray-50 border-gray-100 text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
                  >
                    {monthMap[m]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        
        {/* KPIs (Premium Cards - matching requested layout exactly) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { v: formatNum(totalAprs), l: 'APRs no filtro', icon: FileText, c: 'border-l-pink-500', t: 'text-pink-500' },
            { v: formatNum(diretoriasUnicas), l: 'diretorias', icon: Building, c: 'border-l-blue-500', t: 'text-blue-500' },
            { v: formatNum(supervisoresUnicos), l: 'supervisores', icon: Users, c: 'border-l-orange-500', t: 'text-orange-500' },
            { v: formatNum(cidadesUnicas), l: 'cidades', icon: MapPin, c: 'border-l-teal-500', t: 'text-teal-500' },
            { v: formatNum(totalAuditores), l: 'colaboradores', icon: UserCheck, c: 'border-l-purple-500', t: 'text-purple-500' }
          ].map((kpi, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              key={kpi.l} 
              className={`bg-white rounded-2xl p-5 border border-gray-100 border-l-4 ${kpi.c} shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all group flex justify-between items-center`}
            >
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1 group-hover:scale-105 transform origin-left transition-transform">
                  {kpi.v}
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {kpi.l}
                </div>
              </div>
              <div className={`opacity-20 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 ${kpi.t}`}>
                <kpi.icon size={36} strokeWidth={1.5} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chart Card (Moved to top) */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Evolução por Mês</h2>
          
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
                  <span className="text-xs font-semibold text-gray-400 mb-2 group-hover:text-[#660099] transition-colors">{m.count}</span>
                  <motion.div 
                    initial={{ height: 0 }} animate={{ height: `${pct}%` }} transition={{ delay: i * 0.1, type: 'spring' }}
                    className="w-full bg-[#660099] rounded-t-lg transition-all shadow-[0_0_15px_rgba(102,0,153,0.1)] group-hover:bg-[#9933cc]"
                  />
                  <span className="mt-3 text-sm font-semibold text-gray-600 group-hover:text-gray-900">{monthMap[m.month] || m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main List (Width decreased to col-span-1) */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm col-span-1 flex flex-col h-[600px]">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {visao === 'c' && "Distribuição por Cidade"}
              {visao === 'd' && "Distribuição por Diretoria"}
              {visao === 't' && "Distribuição por Supervisor"}
            </h2>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
              {mainAgg.map(([name, count], idx) => {
                const pct = (count / maxMain) * 100;
                const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-teal-500', 'bg-yellow-500'];
                const barColor = colors[idx % colors.length];
                return (
                  <div 
                    key={`${name}-${idx}`} 
                    onClick={() => {
                      if (visao === 'c') handleMultiSelect(setSelectedCities)(name);
                      if (visao === 'd') handleMultiSelect(setSelectedDiretorias)(name);
                      if (visao === 't') handleMultiSelect(setSelectedSupervisors)(name);
                    }}
                    className="group flex flex-col justify-center gap-2 py-3 px-4 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors mb-2"
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="text-sm font-semibold text-gray-700 group-hover:text-black truncate" title={name}>{name}</div>
                      <div className="text-lg font-bold text-gray-900">{formatNum(count)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={`h-full ${barColor} rounded-full`} />
                      </div>
                      <div className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">{((count/totalAprs)*100 || 0).toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ranking List (Width increased to col-span-2) */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm col-span-1 lg:col-span-2 flex flex-col h-[600px]">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ranking de Colaboradores</h2>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
              {rankAgg.map((item, idx) => {
                const isExp = expandedAuditor === item.name;
                const pct = (item.count / maxRank) * 100;
                const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-teal-500', 'bg-yellow-500'];
                const barColor = colors[idx % colors.length];
                const cityAgg = Object.entries(item.data.reduce((acc: any, curr: any) => {
                  const c = curr['CIDADE COMERCIAL'] || 'N/A';
                  acc[c] = (acc[c] || 0) + 1; return acc;
                }, {})).sort((a: any, b: any) => b[1] - a[1]);

                return (
                  <div key={`${item.name}-${idx}`} className="mb-2">
                    <div 
                      onClick={() => setExpandedAuditor(isExp ? null : item.name)}
                      className={`grid grid-cols-[30px_1fr_auto] items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${isExp ? 'bg-gray-50 border-gray-200 shadow-sm' : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
                    >
                      <div className="text-sm font-bold text-gray-400">{idx + 1}º</div>
                      <div className="overflow-hidden">
                        <div className={`text-base font-semibold truncate ${isExp ? 'text-black' : 'text-gray-700'}`} title={item.name}>{item.name}</div>
                        {!isExp && (
                          <div className="h-1.5 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={`h-full ${barColor} rounded-full opacity-70`} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end pl-4 border-l border-gray-100">
                        <div className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-full border border-gray-100"><Clock size={12} className="text-[#660099]"/> {getAvgTimeStr(item.totalSecs, item.validCount)}</div>
                        <div className="flex items-baseline gap-2">
                          <div className={`text-xl font-bold ${isExp ? 'text-black' : 'text-gray-900'}`}>{formatNum(item.count)}</div>
                          <div className="text-[11px] text-gray-400 font-bold tracking-wide uppercase">{targetAprs > 0 ? ((item.count/targetAprs)*100).toFixed(1) : 0}% da meta</div>
                        </div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isExp && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden ml-10 mr-2">
                          <div className="py-4 px-4 mt-2 mb-4 bg-gray-50 border border-gray-100 rounded-xl">
                            <div className="text-xs uppercase font-bold text-gray-400 mb-3 tracking-wider">Distribuição por Cidades</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                              {cityAgg.map(([cid, val]: any) => (
                                <div key={cid} className="flex justify-between items-center text-sm py-1 border-b border-gray-100/50">
                                  <span className="text-gray-600 font-medium truncate mr-3">↳ {cid}</span>
                                  <div className="flex gap-4 text-gray-500 w-20 justify-end">
                                    <span className="font-bold text-gray-700">{val}</span>
                                    <span className="text-xs w-8 text-right">{((val/item.count)*100).toFixed(0)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
