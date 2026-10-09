"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown, CheckSquare, Square, Building, Users, MapPin, Calendar, Search, FileText, UserCheck, Clock, HelpCircle, X, Settings, UploadCloud, Lock, Eye, EyeOff, ArrowLeft, ShieldAlert, FileCheck, Activity } from 'lucide-react';

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

// Tipos oficiais de APR. Qualquer variação (acento, caixa, espaços, textos extras) é agrupada nestes 4.
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
  const [selectedModule, setSelectedModule] = useState<'APR' | 'DSS' | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [adminAction, setAdminAction] = useState<'apr' | 'plano' | 'dss' | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminAuthStatus, setAdminAuthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [uploadStatus, setUploadStatus] = useState('');
  const [rankingGroup, setRankingGroup] = useState<'supervisor' | 'cidade'>('supervisor');

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
      let endpoint = '/api/admin/upload-apr';
      if (adminAction === 'plano') endpoint = '/api/admin/upload-plano';
      if (adminAction === 'dss') endpoint = '/api/admin/upload-dss';
      
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      if (res.ok) {
        const dataRes = await res.json();
        setUploadStatus(dataRes.message || 'Upload e importação concluídos com sucesso!');
        // Atualiza os dados do dashboard em seguida
        fetch('/api/data').then(r => r.json()).then(json => setData(json));
      } else {
        const dataRes = await res.json().catch(() => ({}));
        setUploadStatus(dataRes.message || 'Erro na importação.');
      }
    } catch {
      setUploadStatus('Erro na requisição.');
    }
  };

  // Expand state
  const [selectedAuditorDetails, setSelectedAuditorDetails] = useState<any | null>(null);

  useEffect(() => {
    if (!selectedModule) return;
    setLoading(true);
    fetch(`/api/data?type=${selectedModule}`).then(res => res.json()).then(json => { setData(json); setLoading(false); });
  }, [selectedModule]);

  const baseData = useMemo(() => selectedModule === 'DSS' ? data.filter(i => i['Status'] === 'PRESENTE') : data, [data, selectedModule]);

  const allMonths = useMemo(() => Array.from(new Set(baseData.map(i => String(i['Mês'])))).filter(Boolean).sort(), [baseData]);

  // Filtros Cruzados (Cross-filtering)
  const allTipos = useMemo(() => {
    if (selectedModule === 'DSS') {
      const base = baseData.filter(i => 
        (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
        (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
        (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'])) &&
        (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
      );
      return Array.from(new Set(base.map(i => i['Assunto']))).filter(Boolean).sort();
    }
    const base = baseData.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => cleanTipo(i['Questionário'])))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedDiretorias, selectedSupervisors, selectedCities, selectedModule]);

  const allDiretorias = useMemo(() => {
    if (selectedModule === 'DSS') {
      const base = baseData.filter(i => 
        (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
        (selectedTipos.length === 0 || selectedTipos.includes(i['Assunto'])) &&
        (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'])) &&
        (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
      );
      return Array.from(new Set(base.map(i => i['DIRETORIA 3']))).filter(Boolean).sort();
    }
    const base = baseData.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => i['DIRETORIA 3']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedSupervisors, selectedCities, selectedModule]);

  const allSupervisors = useMemo(() => {
    if (selectedModule === 'DSS') {
      const base = baseData.filter(i => 
        (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
        (selectedTipos.length === 0 || selectedTipos.includes(i['Assunto'])) &&
        (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
        (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
      );
      return Array.from(new Set(base.map(i => i['Supervisor']))).filter(Boolean).sort();
    }
    const base = baseData.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedCities, selectedModule]);

  const allCities = useMemo(() => {
    if (selectedModule === 'DSS') {
      const base = baseData.filter(i => 
        (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
        (selectedTipos.length === 0 || selectedTipos.includes(i['Assunto'])) &&
        (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
        (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor']))
      );
      return Array.from(new Set(base.map(i => i['CIDADE COMERCIAL']))).filter(Boolean).sort();
    }
    const base = baseData.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR']))
    );
    return Array.from(new Set(base.map(i => i['CIDADE COMERCIAL']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedModule]);

  const allAuditores = useMemo(() => {
    if (selectedModule === 'DSS') {
      const base = baseData.filter(i => 
        (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
        (selectedTipos.length === 0 || selectedTipos.includes(i['Assunto'])) &&
        (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
        (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'])) &&
        (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
      );
      return Array.from(new Set(base.map(i => i['Nome'] || i['Matrícula']))).filter(Boolean).sort();
    }
    const base = baseData.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => i['Nome Auditor'] || i['Matrícula Auditor']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities, selectedModule]);

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
    return baseData.filter(item => {
      if (selectedModule === 'DSS') {
        return (selectedMonths.length === 0 || selectedMonths.includes(String(item['Mês']))) &&
               (selectedTipos.length === 0 || selectedTipos.includes(item['Assunto'])) &&
               (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 3'])) &&
               (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'])) &&
               (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL']));
      }
      return (selectedMonths.length === 0 || selectedMonths.includes(String(item['Mês']))) &&
             (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(item['Questionário']))) &&
             (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 3'])) &&
             (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'] || item['SUPERVISOR'] || item['GESTOR'])) &&
             (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL']));
    });
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities, selectedModule]);

  // KPIs
  const totalAprs = selectedModule === 'DSS' ? new Set(filteredData.map(i => i['Número do Diálogo'])).size : filteredData.length;
  const auditoresSet = new Set(filteredData.map(i => selectedModule === 'DSS' ? (i['Matrícula'] || i['Nome']) : (i['Matrícula Auditor'] || i['Nome Auditor'])));
  const totalAuditores = selectedModule === 'DSS' ? filteredData.length : auditoresSet.size;
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

  const getWorkingWeeks = (m: number) => {
    const ww: Record<number, number> = { 1:4.4, 2:4, 3:4.4, 4:4.2, 5:4.2, 6:4.4, 7:4.6, 8:4.2, 9:4.4, 10:4.4, 11:4.2, 12:4.6 };
    return Math.floor(ww[m] || 4);
  };

  const targetAprs = useMemo(() => {
    const monthsToConsider = selectedMonths.length > 0 ? selectedMonths : allMonths;
    if (selectedModule === 'DSS') {
      let totalWw = 0;
      monthsToConsider.forEach(m => totalWw += getWorkingWeeks(parseInt(m, 10)));
      return totalWw * 1; // 1 DSS por semana por líder
    }
    let totalWd = 0;
    monthsToConsider.forEach(m => totalWd += getWorkingDays(parseInt(m, 10)));
    return totalWd * 2;
  }, [selectedMonths, allMonths, selectedModule]);

  // Rank list
  const rankAgg = useMemo(() => {
    const agg: Record<string, { count: number, name: string, data: any[], totalSecs: number, validCount: number, dssSet: Set<string>, uniquePeople: Set<string> }> = {};
    
    if (selectedModule === 'DSS') {
      filteredData.forEach(item => {
        const name = rankingGroup === 'cidade' ? (item['CIDADE COMERCIAL'] || 'Não Identificada') : (item['Supervisor'] || item['Líder'] || 'Não Identificado');
        
        if (selectedAuditores.length > 0 && !selectedAuditores.includes(item['Nome']) && !selectedAuditores.includes(item['Matrícula'])) return;
        
        if (!agg[name]) agg[name] = { count: 0, name, data: [], totalSecs: 0, validCount: 0, dssSet: new Set(), uniquePeople: new Set() };
        agg[name].data.push(item);
        agg[name].uniquePeople.add(item['Supervisor'] || item['Líder'] || 'N/A');
        
        const dssId = item['Número do Diálogo'];
        if (dssId && !agg[name].dssSet.has(dssId)) {
          agg[name].dssSet.add(dssId);
          agg[name].count += 1;
        }
      });
    } else {
      filteredData.forEach(item => {
        const name = rankingGroup === 'cidade' ? (item['CIDADE COMERCIAL'] || 'Não Identificada') : (item['Supervisor'] || item['SUPERVISOR'] || item['GESTOR'] || 'Não Identificado');
        
        const mat = item['Matrícula Auditor'] || 'N/A';
        const auditorName = item['Nome Auditor'] || mat;
        
        if (selectedAuditores.length > 0 && !selectedAuditores.includes(auditorName) && !selectedAuditores.includes(mat)) return;
        
        if (!agg[name]) agg[name] = { count: 0, name, data: [], totalSecs: 0, validCount: 0, dssSet: new Set(), uniquePeople: new Set() };
        agg[name].count += 1; 
        agg[name].data.push(item);
        agg[name].uniquePeople.add(mat);
        
        const durKey = Object.keys(item).find(k => k.toLowerCase().includes('dura') && k.toLowerCase().includes('o'));
        if (durKey && typeof item[durKey] === 'string') {
          const parts = item[durKey].split(':');
          if (parts.length === 3) {
            const h = parseInt(parts[0], 10); const m = parseInt(parts[1], 10); const s = parseInt(parts[2], 10);
            if (!isNaN(h) && !isNaN(m) && !isNaN(s)) { agg[name].totalSecs += h * 3600 + m * 60 + s; agg[name].validCount++; }
          }
        }
      });
    }
    return Object.values(agg).sort((a, b) => b.count - a.count);
  }, [filteredData, selectedModule, selectedAuditores, rankingGroup]);
  const maxRank = rankAgg.length > 0 ? rankAgg[0].count : 1;

  // Month cols
  const monthAgg = useMemo(() => {
    const agg: Record<string, number> = {};
    if (selectedModule === 'DSS') {
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
    } else {
      filteredData.forEach(item => { const m = String(item['Mês']); agg[m] = (agg[m] || 0) + 1; });
    }
    return allMonths.map(m => ({ month: m, count: agg[m] || 0 }));
  }, [filteredData, allMonths, selectedModule]);
  const maxMonth = Math.max(1, ...monthAgg.map(m => m.count));

  const exportToExcel = () => {
    // Planilha 1: Dados Brutos (Filtro Atual)
    const ws_dados = XLSX.utils.json_to_sheet(filteredData);
    
    // Formatar Cabeçalhos da Planilha de Dados
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

    // Planilha 2: Ranking
    const rankingData = rankAgg.map((item, idx) => {
      const expected = Math.round(targetAprs * (item.uniquePeople?.size || 1));
      const perc = expected > 0 ? ((item.count / expected) * 100).toFixed(1) + '%' : '0%';
      return {
        "Posição": `${idx + 1}º`,
        [selectedModule === 'DSS' ? (rankingGroup === 'supervisor' ? 'Líder' : 'Cidade') : (rankingGroup === 'supervisor' ? 'Supervisor' : 'Cidade')]: item.name,
        "Realizado": item.count,
        "Esperado": expected,
        "Meta (%)": perc,
        [selectedModule === 'DSS' ? "Participantes" : "Duração Total (Segundos)"]: selectedModule === 'DSS' ? item.data.length : item.totalSecs
      };
    });
    
    const ws_ranking = XLSX.utils.json_to_sheet(rankingData);

    // Formatar Cabeçalhos da Planilha de Ranking
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

    // Ajustar a largura das colunas do ranking
    ws_ranking['!cols'] = [
      { wch: 10 },  // Posição
      { wch: 40 },  // Nome / Cidade
      { wch: 15 },  // Realizado
      { wch: 15 },  // Esperado
      { wch: 15 },  // Meta %
      { wch: 20 },  // Participantes / Duração
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws_dados, `Dados ${selectedModule}`);
    XLSX.utils.book_append_sheet(wb, ws_ranking, `Ranking por ${rankingGroup === 'supervisor' ? 'Supervisor' : 'Cidade'}`);
    
    XLSX.writeFile(wb, `vivo_painel_${selectedModule?.toLowerCase()}.xlsx`);
  };

  if (!selectedModule) return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorativo Premium */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/30 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12 z-10">
        <img src="/icone.png" alt="Vivo" className="h-14 object-contain mx-auto mb-6 drop-shadow-sm" />
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Painel de Liderança</h1>
        <p className="text-gray-500 font-medium">Selecione o módulo que deseja visualizar e gerenciar</p>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedModule('APR')}
          className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(102,0,153,0.1)] border border-white/40 hover:border-purple-300 cursor-pointer transition-all flex flex-col items-center text-center group"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-purple-50 to-purple-100 text-[#660099] rounded-2xl flex items-center justify-center mb-5 group-hover:from-[#660099] group-hover:to-[#8000bf] group-hover:text-white transition-all duration-300 shadow-sm">
            <FileText size={40} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">APR</h2>
          <p className="text-sm text-gray-500">Análise Preliminar de Riscos</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedModule('DSS')}
          className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.1)] border border-white/40 hover:border-blue-300 cursor-pointer transition-all flex flex-col items-center text-center group"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-5 group-hover:from-blue-500 group-hover:to-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
            <ShieldAlert size={40} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">DSS</h2>
          <p className="text-sm text-gray-500">Diálogo Semanal de Segurança</p>
        </motion.div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#f8f9fa]">
      <div className="w-12 h-12 border-4 border-purple-200 border-t-[#660099] rounded-full animate-spin"></div>
      <p className="text-sm font-semibold text-gray-500 animate-pulse">Carregando dados de {selectedModule}...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      
      {/* Header Premium - Light Theme */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setSelectedModule(null); setData([]); }}
              className="flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg hover:bg-purple-50 hover:text-[#660099] hover:border-purple-200 transition-all shadow-sm"
              title="Voltar aos Módulos"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <img src="/icone.png" alt="Vivo" className="h-7 object-contain" />
              <span className="h-5 w-px bg-gray-300 ml-1"></span>
              Painel de {selectedModule === 'APR' ? 'APRs' : 'DSS'}
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
            
            {selectedModule === 'DSS' ? (
              <div className="relative">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Tipo de Ranking</span>
                  <div className="relative">
                    <select
                      value={rankingGroup}
                      onChange={(e) => setRankingGroup(e.target.value as any)}
                      className="appearance-none flex items-center justify-between px-3 py-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-sm text-xs font-medium text-gray-700 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200 cursor-pointer transition-all pr-8"
                    >
                      <option value="supervisor">Por Supervisor</option>
                      <option value="cidade">Por Cidade</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            ) : (
              <PremiumMultiSelect label="Tipo de APR" options={allTipos} selected={selectedTipos} onChange={handleMultiSelect(setSelectedTipos)} icon={FileText} />
            )}

            <div className="w-px h-12 bg-gray-200 hidden md:block"></div>

            <PremiumMultiSelect label="Diretoria" options={allDiretorias} selected={selectedDiretorias} onChange={handleMultiSelect(setSelectedDiretorias)} icon={Building} widthClass="w-[340px]" />
            <PremiumMultiSelect label="Supervisor/Líder" options={allSupervisors} selected={selectedSupervisors} onChange={handleMultiSelect(setSelectedSupervisors)} icon={Users} />
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
        {(() => {
          const totalEsperadoDss = Math.round(targetAprs * supervisoresUnicos);
          const percAtendimento = totalEsperadoDss > 0 ? ((totalAprs / totalEsperadoDss) * 100).toFixed(1) : '0.0';
          const kpisToRender = selectedModule === 'DSS' ? [
            { v: formatNum(totalAuditores), l: 'Participantes', icon: Users, c: 'border-l-purple-500', t: 'text-purple-500' },
            { v: formatNum(supervisoresUnicos), l: 'Supervisores', icon: UserCheck, c: 'border-l-teal-500', t: 'text-teal-500' },
            { v: formatNum(totalEsperadoDss), l: 'DSS Esperados', icon: FileCheck, c: 'border-l-blue-500', t: 'text-blue-500' },
            { v: formatNum(totalAprs), l: 'DSS Realizados', icon: FileText, c: 'border-l-pink-500', t: 'text-pink-500' },
            { v: `${percAtendimento}%`, l: 'Atendimento', icon: Activity, c: 'border-l-orange-500', t: 'text-orange-500' }
          ] : [
            { v: formatNum(totalAprs), l: `${selectedModule}s no filtro`, icon: FileText, c: 'border-l-pink-500', t: 'text-pink-500' },
            { v: formatNum(diretoriasUnicas), l: 'diretorias', icon: Building, c: 'border-l-blue-500', t: 'text-blue-500' },
            { v: formatNum(supervisoresUnicos), l: 'supervisores', icon: Users, c: 'border-l-orange-500', t: 'text-orange-500' },
            { v: formatNum(cidadesUnicas), l: 'cidades', icon: MapPin, c: 'border-l-teal-500', t: 'text-teal-500' },
            { v: formatNum(totalAuditores), l: 'colaboradores', icon: UserCheck, c: 'border-l-purple-500', t: 'text-purple-500' }
          ];

          return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {kpisToRender.map((kpi, i) => (
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
          );
        })()}

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
        <div className="grid grid-cols-1 gap-6">

          {/* Ranking List (Full width) */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col h-[600px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Ranking por {rankingGroup === 'supervisor' ? 'Supervisor' : 'Cidade'}</h2>
              <div className="z-20">
                <PremiumMultiSelect label={selectedModule === 'DSS' ? 'Filtrar Líder' : 'Filtrar Colaborador'} options={allAuditores} selected={selectedAuditores} onChange={handleMultiSelect(setSelectedAuditores)} icon={UserCheck} widthClass="w-[280px]" />
              </div>
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-[30px_1fr_80px_80px_80px_110px] items-center gap-4 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-2">
              <div>#</div>
              <div>{selectedModule === 'DSS' ? (rankingGroup === 'supervisor' ? 'Líder' : 'Cidade') : (rankingGroup === 'supervisor' ? 'Supervisor' : 'Cidade')}</div>
              <div className="text-center">Realizado</div>
              <div className="flex items-center justify-center gap-1">
                Esperado
                <button onClick={() => setIsMetaModalOpen(true)} className="focus:outline-none rounded-full hover:bg-gray-100 p-0.5 transition-colors">
                  <HelpCircle size={14} className="text-gray-400 cursor-pointer hover:text-purple-600" />
                </button>
              </div>
              <div className="text-center">Meta (%)</div>
              <div className="text-center">{selectedModule === 'DSS' ? 'Participantes' : 'Duração'}</div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
              {rankAgg.map((item, idx) => {
                const pct = (item.count / maxRank) * 100;
                const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-teal-500', 'bg-yellow-500'];
                const barColor = colors[idx % colors.length];
                const expected = Math.round(targetAprs * (item.uniquePeople?.size || 1));

                return (
                  <div key={`${item.name}-${idx}`} className="mb-1">
                    <div 
                      onClick={() => setSelectedAuditorDetails(item)}
                      className="grid grid-cols-[30px_1fr_80px_80px_80px_110px] items-center gap-4 py-1.5 px-3 rounded-xl cursor-pointer transition-all border bg-white border-transparent hover:bg-purple-50/50 hover:border-purple-100"
                    >
                      <div className="text-sm font-bold text-gray-400">{idx + 1}º</div>
                      
                      <div className="overflow-hidden pr-2">
                        <div className="text-sm font-semibold truncate text-gray-800" title={item.name}>{item.name}</div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={`h-full ${barColor} rounded-full opacity-80`} />
                        </div>
                      </div>
                      
                      <div className="flex justify-center items-center">
                        <div className="text-sm font-bold text-gray-900">{formatNum(item.count)}</div>
                      </div>

                      <div className="flex justify-center items-center">
                        <div className="text-xs font-semibold text-gray-500">{formatNum(expected)}</div>
                      </div>

                      <div className="flex justify-center items-center">
                        <div className={`text-xs font-bold ${((item.count/expected)*100) >= 100 ? 'text-green-600' : 'text-gray-600'}`}>
                          {expected > 0 ? ((item.count/expected)*100).toFixed(1) : 0}%
                        </div>
                      </div>

                      <div className="flex justify-center items-center">
                        <div className="text-[11px] text-gray-600 font-medium flex items-center justify-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-gray-100">
                          {selectedModule === 'DSS' ? (
                            <><Users size={12} className="text-blue-500"/> {item.data.length}</>
                          ) : (
                            <><Clock size={12} className="text-[#660099]"/> {getAvgTimeStr(item.totalSecs, item.validCount)}</>
                          )}
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
                  A meta de {selectedModule}s é calculada com base na seguinte regra:
                </p>
                <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="font-bold text-purple-900 text-center">
                    {selectedModule === 'APR' ? '2 APRs por dia × Dias úteis do mês' : '1 DSS por semana × Semanas úteis do mês'}
                  </p>
                </div>
                <p className="mt-4 text-gray-600 text-sm leading-relaxed">
                  {selectedModule === 'APR' 
                    ? 'Isso significa que cada colaborador tem o objetivo de realizar ao menos 2 Análises Preliminares de Riscos para cada dia útil trabalhado nos meses selecionados no filtro.'
                    : 'Isso significa que cada Líder tem o objetivo de aplicar 1 Diálogo Semanal de Segurança por semana nas bases filtradas.'
                  }
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
                  {selectedModule}s de {selectedAuditorDetails.name}
                </h3>
                <button onClick={() => setSelectedAuditorDetails(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-0 scrollbar-thin">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 sticky top-0 border-b border-gray-100 z-10 shadow-sm">
                    {selectedModule === 'DSS' ? (
                      <tr>
                        <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs">Data</th>
                        <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs">Diálogo</th>
                        <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs">Cidade</th>
                        <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs">Assunto</th>
                        <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs w-full">Participante</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs">Data Início</th>
                        <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs">Duração</th>
                        <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs">Cidade</th>
                        <th className="px-6 py-3.5 font-semibold text-gray-500 uppercase text-xs w-full">Questionário / Situação</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedAuditorDetails.data.map((apr: any, i: number) => (
                      selectedModule === 'DSS' ? (
                        <tr key={i} className="hover:bg-purple-50/30 transition-colors">
                          <td className="px-6 py-3 text-gray-700">{formatDate(apr['Data Fechamento'])}</td>
                          <td className="px-6 py-3 text-gray-700 font-medium">
                            <span className="flex items-center gap-1.5"><FileText size={14} className="text-blue-600" />{apr['Número do Diálogo'] || '-'}</span>
                          </td>
                          <td className="px-6 py-3 text-gray-700">{apr['CIDADE COMERCIAL'] || '-'}</td>
                          <td className="px-6 py-3 text-gray-800 font-medium truncate max-w-xs" title={apr['Assunto']}>
                            {apr['Assunto'] || '-'}
                          </td>
                          <td className="px-6 py-3 text-gray-700 text-sm truncate max-w-xs" title={apr['Nome']}>
                            {apr['Nome'] || apr['Matrícula'] || '-'}
                          </td>
                        </tr>
                      ) : (
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
                      )
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
                  onClick={() => { setIsAdminOpen(false); setAdminAction(null); setAdminAuthStatus('idle'); setAdminPassword(''); setUploadStatus(''); setShowPassword(false); }} 
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                {adminAuthStatus !== 'success' ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-2"><Lock size={24} /></div>
                    <h4 className="font-bold text-gray-900">Acesso Restrito</h4>
                    <p className="text-sm text-gray-500 text-center mb-2">Digite a senha de administrador para prosseguir.</p>
                    <div className="relative w-full">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={adminPassword} 
                        onChange={e => setAdminPassword(e.target.value)}
                        placeholder="Senha" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#660099] focus:outline-none pr-10"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {adminAuthStatus === 'error' && <p className="text-xs text-red-500 font-semibold">Senha incorreta.</p>}
                    <div className="flex w-full mt-2">
                      <button onClick={handleAdminAuth} className="w-full py-2 bg-[#660099] text-white font-semibold rounded-xl hover:bg-[#8000bf] transition-colors">
                        {adminAuthStatus === 'loading' ? 'Verificando...' : 'Autenticar'}
                      </button>
                    </div>
                  </div>
                ) : !adminAction ? (
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setAdminAction('apr')} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#660099] hover:bg-purple-50 transition-all group">
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-[#660099] text-[#660099] group-hover:text-white transition-colors"><UploadCloud size={20} /></div>
                      <div className="text-left"><p className="font-bold text-gray-900">Importar APRs</p><p className="text-xs text-gray-500">Subir nova planilha XLSX de APRs</p></div>
                    </button>
                    <button onClick={() => setAdminAction('dss')} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all group">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-600 text-blue-600 group-hover:text-white transition-colors"><ShieldAlert size={20} /></div>
                      <div className="text-left"><p className="font-bold text-gray-900">Importar DSS</p><p className="text-xs text-gray-500">Subir nova planilha CSV de DSS</p></div>
                    </button>
                    <button onClick={() => setAdminAction('plano')} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-teal-600 hover:bg-teal-50 transition-all group">
                      <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-600 text-teal-600 group-hover:text-white transition-colors"><Users size={20} /></div>
                      <div className="text-left"><p className="font-bold text-gray-900">Importar Plano de Ocupações</p><p className="text-xs text-gray-500">Atualizar lista de colaboradores e diretorias</p></div>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2"><UploadCloud size={24} /></div>
                    <h4 className="font-bold text-gray-900">
                      {adminAction === 'apr' ? 'Upload de APRs' : adminAction === 'dss' ? 'Upload de DSS' : 'Upload do Plano'}
                    </h4>
                    <p className="text-sm text-gray-500 text-center mb-2">
                      Selecione o arquivo {adminAction === 'dss' ? 'CSV' : 'XLSX'} para importar os dados para o banco.
                    </p>
                    
                    <label className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#660099] hover:bg-purple-50 transition-all">
                      <UploadCloud className="text-gray-400 mb-2" size={32} />
                      <span className="text-sm font-semibold text-gray-600">Clique para selecionar o arquivo</span>
                      <input type="file" accept={adminAction === 'dss' ? ".csv" : ".xlsx, .xls"} className="hidden" onChange={handleFileUpload} />
                    </label>

                    {uploadStatus && (
                      <div className={`w-full p-3 rounded-lg text-sm font-semibold text-center ${uploadStatus.includes('sucesso') || uploadStatus.includes('concluíd') ? 'bg-green-50 text-green-700 border border-green-200' : uploadStatus.includes('Erro') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {uploadStatus}
                      </div>
                    )}
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
