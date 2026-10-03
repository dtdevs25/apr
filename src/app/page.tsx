"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown, CheckSquare, Square, Building, Users, MapPin, Calendar, Search, FileText, UserCheck, Clock, HelpCircle, X, Settings, UploadCloud, Lock } from 'lucide-react';

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
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
};

const cleanTipo = (str: string) => {
  if (!str) return 'Não Identificado';
  const parts = str.split('|');
  return parts[parts.length - 1].trim();
};

// Componente Premium de Multi-seleção
const PremiumMultiSelect = ({ 
  label, 
  options, 
  selected, 
  onChange,
  icon: Icon,
  widthClass = 'w-72'
}: { 
  label: string, 
  options: string[], 
  selected: string[], 
  onChange: (val: string) => void,
  icon: any,
  widthClass?: string
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
          className={`flex items-center justify-between px-3 py-1.5 ${widthClass} bg-white border rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-200 ${isActive ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
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
            className={`absolute z-50 top-[105%] left-0 ${widthClass} bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5`}
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
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

  // Filters
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedDiretorias, setSelectedDiretorias] = useState<string[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedAuditores, setSelectedAuditores] = useState<string[]>([]);

  // Admin Modal
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminAction, setAdminAction] = useState<'apr' | 'plano' | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthStatus, setAdminAuthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [uploadStatus, setUploadStatus] = useState('');

  const handleAdminAuth = async () => {
    setAdminAuthStatus('loading');
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      if (res.ok) setAdminAuthStatus('success');
      else setAdminAuthStatus('error');
    } catch {
      setAdminAuthStatus('error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadStatus('Enviando...');
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const endpoint = adminAction === 'apr' ? '/api/admin/upload-apr' : '/api/admin/upload-plano';
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      if (res.ok) setUploadStatus('Upload e importação concluídos com sucesso!');
      else setUploadStatus('Erro na importação.');
    } catch {
      setUploadStatus('Erro na requisição.');
    }
  };

  // Expand state
  const [selectedAuditorDetails, setSelectedAuditorDetails] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/data').then(res => res.json()).then(json => { setData(json); setLoading(false); });
  }, []);

  const allMonths = useMemo(() => Array.from(new Set(data.map(i => String(i['Mês'])))).filter(Boolean).sort(), [data]);

  // Filtros em Cascata
  const allTipos = useMemo(() => {
    const base = data.filter(i => selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês'])));
    return Array.from(new Set(base.map(i => cleanTipo(i['Questionário'])))).filter(Boolean).sort();
  }, [data, selectedMonths]);

  const allDiretorias = useMemo(() => {
    const base = data.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário'])))
    );
    return Array.from(new Set(base.map(i => i['DIRETORIA 3']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos]);

  const allSupervisors = useMemo(() => {
    const base = data.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3']))
    );
    return Array.from(new Set(base.map(i => i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedDiretorias]);

  const allCities = useMemo(() => {
    const base = data.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR']))
    );
    return Array.from(new Set(base.map(i => i['CIDADE COMERCIAL']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors]);

  const allAuditores = useMemo(() => {
    const base = data.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => i['Nome Auditor'] || i['Matrícula Auditor']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities]);

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
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      return (selectedMonths.length === 0 || selectedMonths.includes(String(item['Mês']))) &&
             (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(item['Questionário']))) &&
             (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 3'])) &&
             (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'] || item['SUPERVISOR'] || item['GESTOR'])) &&
             (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL']));
    });
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities]);

  // KPIs
  const totalAprs = filteredData.length;
  const auditoresSet = new Set(filteredData.map(i => i['Matrícula Auditor'] || i['Nome Auditor']));
  const totalAuditores = auditoresSet.size;
  const diretoriasUnicas = new Set(filteredData.map(i => i['DIRETORIA 3']).filter(Boolean)).size;
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
    filteredData.forEach(item => {
      let val = cleanTipo(item['Questionário']);
      agg[val] = (agg[val] || 0) + 1;
    });
    return Object.entries(agg).sort((a, b) => b[1] - a[1]);
  }, [filteredData]);
  const maxMain = mainAgg.length > 0 ? mainAgg[0][1] : 1;

  // Rank list
  const rankAgg = useMemo(() => {
    const agg: Record<string, { count: number, name: string, data: any[], totalSecs: number, validCount: number }> = {};
    filteredData.forEach(item => {
      const mat = item['Matrícula Auditor'] || 'N/A';
      const name = item['Nome Auditor'] || mat;
      if (selectedAuditores.length > 0 && !selectedAuditores.includes(name) && !selectedAuditores.includes(mat)) return;
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
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-[#660099] hover:text-[#660099] hover:shadow-md transition-all font-medium text-xs text-gray-700"
            >
              <Download size={14} /> Exportar XLSX
            </button>
            <button 
              onClick={() => setIsAdminOpen(true)}
              className="flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-all text-gray-500 shadow-sm"
              title="Administração"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-gray-50/50 backdrop-blur-md border-t border-gray-100">
          <div className="max-w-[1600px] mx-auto px-6 py-2 flex flex-wrap items-center gap-4">
            
            <PremiumMultiSelect label="Tipo de APR" options={allTipos} selected={selectedTipos} onChange={handleMultiSelect(setSelectedTipos)} icon={FileText} />

            <div className="w-px h-12 bg-gray-200 hidden md:block"></div>

            <PremiumMultiSelect label="Diretoria" options={allDiretorias} selected={selectedDiretorias} onChange={handleMultiSelect(setSelectedDiretorias)} icon={Building} widthClass="w-[340px]" />
            <PremiumMultiSelect label="Supervisor" options={allSupervisors} selected={selectedSupervisors} onChange={handleMultiSelect(setSelectedSupervisors)} icon={Users} />
            <PremiumMultiSelect label="Cidade" options={allCities} selected={selectedCities} onChange={handleMultiSelect(setSelectedCities)} icon={MapPin} />

            {(selectedMonths.length > 0 || selectedTipos.length > 0 || selectedDiretorias.length > 0 || selectedSupervisors.length > 0 || selectedCities.length > 0 || selectedAuditores.length > 0) && (
              <div className="flex flex-col gap-1.5 ml-auto">
                <span className="text-[10px] font-semibold opacity-0">Limpar</span>
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-1.5 px-4 py-1.5 h-[34px] text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-xl transition-all shadow-sm"
                >
                  <X size={14} strokeWidth={2.5} /> Limpar Filtros
                </button>
              </div>
            )}

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
              Distribuição por Tipo
            </h2>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
              {mainAgg.map(([name, count], idx) => {
                const pct = (count / maxMain) * 100;
                const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-teal-500', 'bg-yellow-500'];
                const barColor = colors[idx % colors.length];
                return (
                  <div 
                    key={`${name}-${idx}`} 
                    onClick={() => handleMultiSelect(setSelectedTipos)(name)}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Ranking de Colaboradores</h2>
              <div className="z-20">
                <PremiumMultiSelect label="Filtrar Nome" options={allAuditores} selected={selectedAuditores} onChange={handleMultiSelect(setSelectedAuditores)} icon={UserCheck} widthClass="w-[280px]" />
              </div>
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-[30px_1fr_80px_100px_110px] items-center gap-4 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-3">
              <div>#</div>
              <div>Colaborador</div>
              <div className="text-center">APR</div>
              <div className="flex items-center justify-center gap-1">
                Meta
                <button onClick={() => setIsMetaModalOpen(true)} className="focus:outline-none rounded-full hover:bg-gray-100 p-0.5 transition-colors">
                  <HelpCircle size={14} className="text-gray-400 cursor-pointer hover:text-purple-600" />
                </button>
              </div>
              <div className="text-center">Duração</div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
              {rankAgg.map((item, idx) => {
                const pct = (item.count / maxRank) * 100;
                const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-teal-500', 'bg-yellow-500'];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={`${item.name}-${idx}`} className="mb-2">
                    <div 
                      onClick={() => setSelectedAuditorDetails(item)}
                      className="grid grid-cols-[30px_1fr_80px_100px_110px] items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border bg-white border-transparent hover:bg-purple-50/50 hover:border-purple-100"
                    >
                      <div className="text-sm font-bold text-gray-400">{idx + 1}º</div>
                      
                      <div className="overflow-hidden pr-2">
                        <div className="text-sm font-semibold truncate text-gray-800" title={item.name}>{item.name}</div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={`h-full ${barColor} rounded-full opacity-80`} />
                        </div>
                      </div>
                      
                      <div className="flex justify-center items-center">
                        <div className="text-base font-bold text-gray-900">{formatNum(item.count)}</div>
                      </div>

                      <div className="flex justify-center items-center">
                        <div className={`text-sm font-bold ${((item.count/targetAprs)*100) >= 100 ? 'text-green-600' : 'text-gray-600'}`}>
                          {targetAprs > 0 ? ((item.count/targetAprs)*100).toFixed(1) : 0}%
                        </div>
                      </div>

                      <div className="flex justify-center items-center">
                        <div className="text-xs text-gray-600 font-medium flex items-center justify-center gap-1.5 bg-white px-2 py-1 rounded-md border border-gray-100">
                          <Clock size={12} className="text-[#660099]"/> 
                          {getAvgTimeStr(item.totalSecs, item.validCount)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </main>

      <AnimatePresence>
        {isMetaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <HelpCircle className="text-[#660099]" size={20} />
                  Entendendo a Meta
                </h3>
                <button onClick={() => setIsMetaModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-600 text-sm leading-relaxed">
                  A meta de APRs é calculada com base na seguinte regra:
                </p>
                <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="font-bold text-purple-900 text-center">2 APRs por dia × Dias úteis do mês</p>
                </div>
                <p className="mt-4 text-gray-600 text-sm leading-relaxed">
                  Isso significa que cada colaborador tem o objetivo de realizar ao menos 2 Análises Preliminares de Riscos para cada dia útil trabalhado nos meses selecionados no filtro.
                </p>
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={() => setIsMetaModalOpen(false)}
                    className="px-6 py-2 bg-[#660099] text-white text-sm font-semibold rounded-xl hover:bg-[#8000bf] transition-colors shadow-sm"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAuditorDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UserCheck className="text-[#660099]" size={20} />
                  APRs de {selectedAuditorDetails.name}
                </h3>
                <button onClick={() => setSelectedAuditorDetails(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-0 scrollbar-thin">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 sticky top-0 border-b border-gray-100 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs">Data Início</th>
                      <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs">Duração</th>
                      <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs">Cidade</th>
                      <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs w-full">Questionário / Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedAuditorDetails.data.map((apr: any, i: number) => (
                      <tr key={i} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-6 py-3 text-gray-700">{formatDate(apr['Data Início'])}</td>
                        <td className="px-6 py-3 text-gray-700 font-medium">
                          <span className="flex items-center gap-1.5"><Clock size={14} className="text-[#660099]" />{apr['Duração'] || '-'}</span>
                        </td>
                        <td className="px-6 py-3 text-gray-700">{apr['CIDADE COMERCIAL'] || '-'}</td>
                        <td className="px-6 py-3">
                          <div className="text-gray-800 font-medium truncate max-w-lg" title={apr['Questionário']}>{cleanTipo(apr['Questionário'])}</div>
                          <div className={`text-xs mt-1 ${apr['Situação'] === 'FECHADO' ? 'text-green-600' : 'text-orange-500'}`}>{apr['Situação'] || '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
                <button 
                  onClick={() => setSelectedAuditorDetails(null)}
                  className="px-6 py-2 bg-[#660099] text-white text-sm font-semibold rounded-xl hover:bg-[#8000bf] transition-colors shadow-sm"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Modal */}
      <AnimatePresence>
        {isAdminOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="text-gray-600" size={20} />
                  Administração
                </h3>
                <button 
                  onClick={() => { setIsAdminOpen(false); setAdminAction(null); setAdminAuthStatus('idle'); setAdminPassword(''); setUploadStatus(''); }} 
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                {!adminAction ? (
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setAdminAction('apr')} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#660099] hover:bg-purple-50 transition-all group">
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-[#660099] text-[#660099] group-hover:text-white transition-colors"><UploadCloud size={20} /></div>
                      <div className="text-left"><p className="font-bold text-gray-900">Importar APRs</p><p className="text-xs text-gray-500">Subir nova planilha XLSX de APRs</p></div>
                    </button>
                    <button onClick={() => setAdminAction('plano')} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all group">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-600 text-blue-600 group-hover:text-white transition-colors"><Users size={20} /></div>
                      <div className="text-left"><p className="font-bold text-gray-900">Importar Plano de Ocupações</p><p className="text-xs text-gray-500">Atualizar lista de colaboradores e diretorias</p></div>
                    </button>
                  </div>
                ) : adminAuthStatus !== 'success' ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-2"><Lock size={24} /></div>
                    <h4 className="font-bold text-gray-900">Acesso Restrito</h4>
                    <p className="text-sm text-gray-500 text-center mb-2">Digite a senha de administrador para prosseguir com a importação.</p>
                    <input 
                      type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                      placeholder="Senha" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#660099] focus:outline-none"
                    />
                    {adminAuthStatus === 'error' && <p className="text-xs text-red-500 font-semibold">Senha incorreta.</p>}
                    <div className="flex gap-3 w-full mt-2">
                      <button onClick={() => setAdminAction(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">Voltar</button>
                      <button onClick={handleAdminAuth} className="flex-1 py-2 bg-[#660099] text-white font-semibold rounded-xl hover:bg-[#8000bf] transition-colors">
                        {adminAuthStatus === 'loading' ? 'Verificando...' : 'Autenticar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2"><UploadCloud size={24} /></div>
                    <h4 className="font-bold text-gray-900">
                      {adminAction === 'apr' ? 'Upload de APRs' : 'Upload do Plano'}
                    </h4>
                    <p className="text-sm text-gray-500 text-center mb-2">Selecione o arquivo XLSX para importar os dados para o banco.</p>
                    
                    <label className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#660099] hover:bg-purple-50 transition-all">
                      <UploadCloud className="text-gray-400 mb-2" size={32} />
                      <span className="text-sm font-semibold text-gray-600">Clique para selecionar o arquivo</span>
                      <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                    </label>

                    {uploadStatus && (
                      <div className={`w-full p-3 rounded-lg text-sm font-semibold text-center ${uploadStatus.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : uploadStatus.includes('Erro') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {uploadStatus}
                      </div>
                    )}

                    <button onClick={() => setAdminAction(null)} className="w-full py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors mt-2">
                      Voltar
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
