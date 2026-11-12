"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, ShieldAlert, Search, Download, Copy, Check, 
  ArrowLeft, Sun, Moon, Users, Award, Clock, MapPin, 
  UserCheck, AlertTriangle, ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

export type RankingViewKey = 'apr-interior' | 'dss-interior' | 'apr-capital' | 'dss-capital';

interface RankingPresentationViewProps {
  initialView?: RankingViewKey;
  onBack?: () => void;
  isDark?: boolean;
  toggleTheme?: () => void;
}

const formatNum = (n: number) => n.toLocaleString('pt-BR');

const normNome = (str: any): string => {
  if (!str) return '';
  return String(str).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const parseDurationSecs = (dur: any): number => {
  if (!dur || typeof dur !== 'string') return 0;
  const parts = dur.split(':');
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
      const secs = h * 3600 + m * 60 + s;
      return (secs > 0 && secs <= 600) ? secs : 0;
    }
  }
  return 0;
};

const formatDuration = (avgSecs: number) => {
  if (avgSecs === 0) return '-';
  if (avgSecs < 60) return `${avgSecs}s`;
  if (avgSecs < 3600) return `${Math.floor(avgSecs / 60)}m ${avgSecs % 60}s`;
  return `${Math.floor(avgSecs / 3600)}h ${Math.floor((avgSecs % 3600) / 60)}m`;
};

// Dias úteis de Outubro = 22 dias úteis
const META_APR_MES = 22 * 2; // 44 APRs no mês
const META_DSS_MES = 4;      // 4 Diálogos no mês (1 por semana)

export const RankingPresentationView: React.FC<RankingPresentationViewProps> = ({
  initialView = 'apr-interior',
  onBack,
  isDark: propDark,
  toggleTheme: propToggleTheme
}) => {
  const [activeTab, setActiveTab] = useState<RankingViewKey>(initialView);
  const [localDark, setLocalDark] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'mais' | 'menos' | 'zerados'>('mais');
  const [dssGrouping, setDssGrouping] = useState<'lider' | 'colaborador'>('lider');
  const [copiedLink, setCopiedLink] = useState(false);

  // Dados brutos
  const [aprData, setAprData] = useState<any[]>([]);
  const [colaboradoresPO, setColaboradoresPO] = useState<any[]>([]);
  const [dssData, setDssData] = useState<any[]>([]);
  const [loadingApr, setLoadingApr] = useState<boolean>(true);
  const [loadingDss, setLoadingDss] = useState<boolean>(true);

  // Controle de tema
  const isDark = propDark !== undefined ? propDark : localDark;
  const toggleTheme = propToggleTheme || (() => {
    setLocalDark(prev => {
      const next = !prev;
      localStorage.setItem('vivo_theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  });

  useEffect(() => {
    if (propDark === undefined) {
      const saved = localStorage.getItem('vivo_theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const active = saved ? saved === 'dark' : prefersDark;
      setLocalDark(active);
      if (active) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }, [propDark]);

  // Sincroniza activeTab se a prop initialView mudar (ex: navegação de rota)
  useEffect(() => {
    if (initialView) setActiveTab(initialView);
  }, [initialView]);

  // Carrega dados de APR
  useEffect(() => {
    setLoadingApr(true);
    fetch('/api/data?type=APR')
      .then(res => res.json())
      .then(json => {
        const rows = Array.isArray(json) ? json : (json.data || []);
        const poList = Array.isArray(json) ? [] : (json.colaboradoresPO || []);
        setAprData(rows);
        setColaboradoresPO(poList);
        setLoadingApr(false);
      })
      .catch(err => {
        console.error("Erro ao carregar APR:", err);
        setLoadingApr(false);
      });
  }, []);

  // Carrega dados de DSS
  useEffect(() => {
    setLoadingDss(true);
    fetch('/api/data?type=DSS')
      .then(res => res.json())
      .then(json => {
        const rows = Array.isArray(json) ? json : [];
        setDssData(rows);
        setLoadingDss(false);
      })
      .catch(err => {
        console.error("Erro ao carregar DSS:", err);
        setLoadingDss(false);
      });
  }, []);

  // Copia o link direto desta aba
  const handleCopyLink = () => {
    const url = `${window.location.origin}/ranking/${activeTab}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Identificação do tipo atual e diretoria atual
  const isApr = activeTab.startsWith('apr');
  const isInterior = activeTab.endsWith('interior');
  const targetDiretoria = isInterior 
    ? 'DIR SERVICOS AO CLIENTE SP INTERIOR' 
    : 'DIR SERVICOS AO CLIENTE SP CAPITAL';
  const diretoriaLabel = isInterior ? 'Serviços ao Cliente Interior' : 'Serviços ao Cliente Capital';

  // Processamento do Ranking APR (Fixo em Outubro = '10')
  const rankingApr = useMemo(() => {
    if (!isApr) return [];

    const agg: Record<string, {
      matricula: string;
      nome: string;
      dataAdmissao: string | null;
      supervisor: string;
      cidadeBase: string;
      count: number;
      totalSecs: number;
      validCount: number;
    }> = {};

    const poMatMap = new Map<string, any>();
    const poNomeMap = new Map<string, any>();
    const poNormMap = new Map<string, any>();

    // 1. Popula quadro oficial da diretoria
    colaboradoresPO.forEach(p => {
      if (p.diretoria !== targetDiretoria) return;
      if (isInterior && p.ativo_spi === 0) return; // Regra SPI Ativo em Campo

      const pMat = String(p.matricula || '').trim().replace(/^0+/, '');
      const pNome = String(p.nome || pMat).trim();
      const pNorm = normNome(pNome);

      const entry = {
        matricula: pMat,
        nome: pNome,
        dataAdmissao: p.data_admissao || null,
        supervisor: p.supervisor || 'NÃO IDENTIFICADO',
        cidadeBase: p.cidade || 'N/A',
        count: 0,
        totalSecs: 0,
        validCount: 0
      };

      agg[pNome] = entry;
      if (pMat) poMatMap.set(pMat, entry);
      poNomeMap.set(pNome, entry);
      if (pNorm) poNormMap.set(pNorm, entry);
    });

    // 2. Associa APRs de Outubro (Mês 10)
    for (let i = 0; i < aprData.length; i++) {
      const item = aprData[i];
      // Apenas Outubro (Mês 10 ou 'Out')
      const mesStr = String(item['Mês'] || '').trim();
      if (mesStr !== '10' && mesStr.toLowerCase() !== 'out') continue;

      const itemDir = item['DIRETORIA 2'] || item['DIRETORIA 3'] || '';
      if (itemDir !== targetDiretoria) continue;
      if (isInterior && item['ATIVO_SPI'] === 0) continue;

      const mat = String(item['Matrícula Auditor'] || item['RE'] || '').trim().replace(/^0+/, '');
      const auditorName = String(item['Nome Auditor'] || '').trim();

      let target = (mat ? poMatMap.get(mat) : null) || (auditorName ? poNomeMap.get(auditorName) : null);
      if (!target && auditorName) {
        const norm = normNome(auditorName);
        if (norm) target = poNormMap.get(norm) || null;
      }

      if (target) {
        target.count += 1;
        const secs = parseDurationSecs(item['Duração'] || item['duracao']);
        if (secs > 0) {
          target.totalSecs += secs;
          target.validCount++;
        }
      } else if (auditorName) {
        // Fallback caso auditor tenha feito APR mas não esteja no PO filtrado
        if (!agg[auditorName]) {
          agg[auditorName] = {
            matricula: mat || 'N/A',
            nome: auditorName,
            dataAdmissao: null,
            supervisor: item['Supervisor'] || item['GESTOR'] || 'NÃO IDENTIFICADO',
            cidadeBase: item['CIDADE COMERCIAL'] || item['CIDADE_BASE'] || 'N/A',
            count: 0,
            totalSecs: 0,
            validCount: 0
          };
        }
        agg[auditorName].count += 1;
        const secs = parseDurationSecs(item['Duração'] || item['duracao']);
        if (secs > 0) {
          agg[auditorName].totalSecs += secs;
          agg[auditorName].validCount++;
        }
      }
    }

    return Object.values(agg);
  }, [isApr, isInterior, targetDiretoria, colaboradoresPO, aprData]);

  // Processamento do Ranking DSS (Fixo em Outubro = '10')
  const rankingDss = useMemo(() => {
    if (isApr) return [];

    const agg: Record<string, {
      matricula: string;
      nome: string;
      dataAdmissao: string | null;
      supervisor: string;
      cidadeBase: string;
      count: number;
      dialogosUnicos: Set<string>;
      totalSecs: number;
      validCount: number;
    }> = {};

    for (let i = 0; i < dssData.length; i++) {
      const item = dssData[i];
      const mesStr = String(item['Mês'] || '').trim();
      if (mesStr !== '10' && mesStr.toLowerCase() !== 'out') continue;

      const itemDir = item['DIRETORIA 3'] || '';
      if (itemDir !== targetDiretoria) continue;

      const dssId = item['Número do Diálogo'] || item['numero_dialogo'] || `dss_${i}`;
      
      if (dssGrouping === 'lider') {
        const liderNome = (item['Supervisor'] || item['Líder'] || item['lider'] || 'NÃO IDENTIFICADO').toString().trim().toUpperCase();
        if (!agg[liderNome]) {
          agg[liderNome] = {
            matricula: item['Matrícula'] || 'LÍDER',
            nome: liderNome,
            dataAdmissao: null,
            supervisor: 'SUPERVISÃO / GESTÃO',
            cidadeBase: item['CIDADE COMERCIAL'] || item['Localidade'] || 'N/A',
            count: 0,
            dialogosUnicos: new Set(),
            totalSecs: 0,
            validCount: 0
          };
        }
        if (!agg[liderNome].dialogosUnicos.has(dssId)) {
          agg[liderNome].dialogosUnicos.add(dssId);
          agg[liderNome].count += 1;
        }
      } else {
        // Por Colaborador participante
        const colabNome = (item['Nome'] || item['Matrícula'] || 'NÃO IDENTIFICADO').toString().trim().toUpperCase();
        if (!agg[colabNome]) {
          agg[colabNome] = {
            matricula: item['Matrícula'] || 'N/A',
            nome: colabNome,
            dataAdmissao: null,
            supervisor: item['Supervisor'] || item['Líder'] || 'NÃO IDENTIFICADO',
            cidadeBase: item['CIDADE COMERCIAL'] || item['Localidade'] || 'N/A',
            count: 0,
            dialogosUnicos: new Set(),
            totalSecs: 0,
            validCount: 0
          };
        }
        if (!agg[colabNome].dialogosUnicos.has(dssId)) {
          agg[colabNome].dialogosUnicos.add(dssId);
          agg[colabNome].count += 1;
        }
      }
    }

    return Object.values(agg);
  }, [isApr, targetDiretoria, dssData, dssGrouping]);

  // Lista base ativa
  const currentList = isApr ? rankingApr : rankingDss;
  const currentMeta = isApr ? META_APR_MES : META_DSS_MES;

  // Filtro de busca e ordenação
  const filteredAndSortedList = useMemo(() => {
    let list = [...currentList];

    // Busca textual rápida
    if (searchTerm.trim()) {
      const s = normNome(searchTerm);
      list = list.filter(item => 
        normNome(item.nome).includes(s) ||
        normNome(item.matricula).includes(s) ||
        normNome(item.supervisor).includes(s) ||
        normNome(item.cidadeBase).includes(s)
      );
    }

    // Ordenação
    if (sortOrder === 'mais') {
      list.sort((a, b) => b.count === a.count ? a.nome.localeCompare(b.nome) : b.count - a.count);
    } else if (sortOrder === 'menos') {
      list.sort((a, b) => a.count === b.count ? a.nome.localeCompare(b.nome) : a.count - b.count);
    } else if (sortOrder === 'zerados') {
      list = list.filter(i => i.count === 0).sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return list;
  }, [currentList, searchTerm, sortOrder]);

  // KPIs de topo do mês
  const totalRealizadoMes = useMemo(() => currentList.reduce((acc, curr) => acc + curr.count, 0), [currentList]);
  const totalPessoas = currentList.length;
  const comRealizacao = useMemo(() => currentList.filter(i => i.count > 0).length, [currentList]);
  const semRealizacao = totalPessoas - comRealizacao;
  const pctGeralMeta = totalPessoas > 0 ? Math.round((totalRealizadoMes / (totalPessoas * currentMeta)) * 100) : 0;

  // Exportação rápida para Excel
  const handleExportXlsx = () => {
    const wb = XLSX.utils.book_new();
    const rows = filteredAndSortedList.map((item, idx) => ({
      "Posição": `${idx + 1}º`,
      "Colaborador": item.nome,
      "Matrícula": item.matricula,
      "Data Admissão": item.dataAdmissao || '-',
      "Supervisor": item.supervisor,
      "Cidade Base": item.cidadeBase,
      "Realizado (Outubro)": item.count,
      "Meta (Outubro)": currentMeta,
      "% Atingimento": `${Math.round((item.count / currentMeta) * 100)}%`,
      "Duração Média": isApr ? formatDuration(item.validCount > 0 ? Math.round(item.totalSecs / item.validCount) : 0) : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Ranking Outubro");
    XLSX.writeFile(wb, `Ranking_${activeTab}_Outubro_2026.xlsx`);
  };

  const isLoading = isApr ? loadingApr : loadingDss;

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Header Executivo de Apresentação */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo e Título */}
          <div className="flex items-center gap-3">
            {onBack ? (
              <button 
                onClick={onBack} 
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-gray-600 dark:text-gray-300 transition-colors"
                title="Voltar ao Painel Geral"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <a 
                href="/" 
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-gray-600 dark:text-gray-300 transition-colors"
                title="Voltar ao Início"
              >
                <ArrowLeft size={18} />
              </a>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-[#660099] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Apresentação Executiva
                </span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  Mês de Referência: <strong className="text-purple-700 dark:text-purple-400">Outubro / 2026</strong>
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2 mt-0.5">
                Ranking {isApr ? 'APR' : 'DSS'} — {diretoriaLabel}
              </h1>
            </div>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-300 shadow-sm transition-all"
              title="Copiar link exato desta tela para a apresentação"
            >
              {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>

            <button
              onClick={handleExportXlsx}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#660099] hover:bg-[#52007a] text-white shadow-sm transition-all"
              title="Exportar Ranking para XLSX"
            >
              <Download size={14} />
              <span>Exportar</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-amber-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={isDark ? "Modo Claro" : "Modo Escuro"}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* 4 Abas Principais de Navegação com 1 clique */}
        <div className="max-w-7xl mx-auto mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('apr-interior')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'apr-interior'
                ? 'bg-[#660099] text-white shadow-md shadow-purple-600/20'
                : 'bg-white dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-purple-300'
            }`}
          >
            <FileText size={15} />
            <span>APR • Interior</span>
          </button>

          <button
            onClick={() => setActiveTab('dss-interior')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'dss-interior'
                ? 'bg-[#660099] text-white shadow-md shadow-purple-600/20'
                : 'bg-white dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-purple-300'
            }`}
          >
            <ShieldAlert size={15} />
            <span>DSS • Interior</span>
          </button>

          <button
            onClick={() => setActiveTab('apr-capital')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'apr-capital'
                ? 'bg-[#660099] text-white shadow-md shadow-purple-600/20'
                : 'bg-white dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-purple-300'
            }`}
          >
            <FileText size={15} />
            <span>APR • Capital</span>
          </button>

          <button
            onClick={() => setActiveTab('dss-capital')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'dss-capital'
                ? 'bg-[#660099] text-white shadow-md shadow-purple-600/20'
                : 'bg-white dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-purple-300'
            }`}
          >
            <ShieldAlert size={15} />
            <span>DSS • Capital</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col gap-6">

        {/* Resumo Executivo em 4 Cards Mínimos (Sem gráficos pesados) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#131c2e] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950 text-[#660099] dark:text-purple-400 flex items-center justify-center shrink-0">
              <Award size={22} />
            </div>
            <div>
              <div className="text-xl font-black text-gray-900 dark:text-white">{formatNum(totalRealizadoMes)}</div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Realizações em Outubro</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131c2e] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users size={22} />
            </div>
            <div>
              <div className="text-xl font-black text-gray-900 dark:text-white">{formatNum(totalPessoas)}</div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {comRealizacao} ativos • {semRealizacao} zerados
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131c2e] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck size={22} />
            </div>
            <div>
              <div className="text-xl font-black text-gray-900 dark:text-white">{currentMeta} / colab</div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Meta Mensal Esperada</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131c2e] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              pctGeralMeta >= 100 
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' 
                : pctGeralMeta >= 50 
                ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                : 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400'
            }`}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="text-xl font-black text-gray-900 dark:text-white">{pctGeralMeta}%</div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Atingimento da Meta Geral</div>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca Rápida */}
        <div className="bg-white dark:bg-[#131c2e] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Campo de Busca Rápida */}
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar colaborador, matrícula ou supervisor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Opções de Ordenação e Agrupamento */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
            {!isApr && (
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setDssGrouping('lider')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    dssGrouping === 'lider' ? 'bg-white dark:bg-gray-700 text-[#660099] dark:text-purple-400 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Por Líder
                </button>
                <button
                  onClick={() => setDssGrouping('colaborador')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    dssGrouping === 'colaborador' ? 'bg-white dark:bg-gray-700 text-[#660099] dark:text-purple-400 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Por Colaborador
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setSortOrder('mais')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  sortOrder === 'mais' ? 'bg-white dark:bg-gray-700 text-[#660099] dark:text-purple-400 shadow-sm' : 'text-gray-500'
                }`}
              >
                Mais Realizados
              </button>
              <button
                onClick={() => setSortOrder('menos')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  sortOrder === 'menos' ? 'bg-white dark:bg-gray-700 text-[#660099] dark:text-purple-400 shadow-sm' : 'text-gray-500'
                }`}
              >
                Menos Realizados
              </button>
              <button
                onClick={() => setSortOrder('zerados')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  sortOrder === 'zerados' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500'
                }`}
              >
                Zerados ({semRealizacao})
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Ranking Ultra Limpa */}
        <div className="bg-white dark:bg-[#131c2e] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
          
          {/* Cabeçalho da Tabela */}
          <div className="grid grid-cols-[50px_1fr_90px_90px_110px_90px] items-center gap-3 px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-[11px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">
            <div>#</div>
            <div>{isApr || dssGrouping === 'colaborador' ? 'Colaborador / Equipe' : 'Líder / Supervisão'}</div>
            <div className="text-center">Realizado</div>
            <div className="text-center">Meta (Mês)</div>
            <div className="text-center">Atingimento</div>
            <div className="text-center">{isApr ? 'Duração' : 'Status'}</div>
          </div>

          {/* Linhas do Ranking */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800/50 max-h-[680px] overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Carregando dados oficiais de Outubro...</span>
              </div>
            ) : filteredAndSortedList.length === 0 ? (
              <div className="p-16 text-center text-gray-400 font-medium">
                Nenhum colaborador encontrado com os critérios de busca.
              </div>
            ) : (
              filteredAndSortedList.map((item, idx) => {
                const perc = currentMeta > 0 ? Math.round((item.count / currentMeta) * 100) : 0;
                const isZero = item.count === 0;
                const isTop3 = idx < 3 && !isZero && sortOrder === 'mais';

                return (
                  <div
                    key={`${item.nome}-${idx}`}
                    className={`grid grid-cols-[50px_1fr_90px_90px_110px_90px] items-center gap-3 px-5 py-3 transition-colors ${
                      isZero 
                        ? 'bg-red-50/30 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20' 
                        : 'hover:bg-purple-50/40 dark:hover:bg-purple-950/20'
                    }`}
                  >
                    {/* Posição */}
                    <div className="flex items-center">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                        isTop3 
                          ? idx === 0 
                            ? 'bg-amber-400 text-gray-900 shadow-sm' 
                            : idx === 1 
                            ? 'bg-slate-300 text-gray-800 shadow-sm' 
                            : 'bg-amber-700/60 text-white shadow-sm'
                          : isZero 
                          ? 'text-red-500 font-bold' 
                          : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {idx + 1}º
                      </span>
                    </div>

                    {/* Colaborador / Detalhes */}
                    <div className="overflow-hidden pr-2">
                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate" title={item.nome}>
                        {item.nome}
                      </div>

                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-2 flex-wrap mt-0.5">
                        {item.matricula && item.matricula !== 'N/A' && (
                          <span className="font-mono text-gray-400">RE: {item.matricula}</span>
                        )}
                        {item.dataAdmissao && (
                          <span>• Adm: <strong className="text-gray-700 dark:text-gray-300">{item.dataAdmissao}</strong></span>
                        )}
                        {item.supervisor && item.supervisor !== 'NÃO IDENTIFICADO' && (
                          <span>• Sup: {item.supervisor}</span>
                        )}
                        {item.cidadeBase && item.cidadeBase !== 'N/A' && (
                          <span>• Base: <strong className="text-gray-700 dark:text-gray-300">{item.cidadeBase}</strong></span>
                        )}
                      </div>
                    </div>

                    {/* Realizado */}
                    <div className="text-center">
                      <span className={`text-base font-extrabold ${
                        isZero ? 'text-red-500' : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatNum(item.count)}
                      </span>
                    </div>

                    {/* Meta Esperada */}
                    <div className="text-center text-xs font-semibold text-gray-400">
                      {currentMeta}
                    </div>

                    {/* % Atingimento com Barra */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${
                          perc >= 100 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : perc >= 50 
                            ? 'text-amber-600 dark:text-amber-400' 
                            : 'text-red-500'
                        }`}>
                          {perc}%
                        </span>
                      </div>
                      <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            perc >= 100 
                              ? 'bg-emerald-500' 
                              : perc >= 50 
                              ? 'bg-amber-500' 
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, perc)}%` }}
                        />
                      </div>
                    </div>

                    {/* Duração Média ou Status */}
                    <div className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {isApr ? (
                        formatDuration(item.validCount > 0 ? Math.round(item.totalSecs / item.validCount) : 0)
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          perc >= 100 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {perc >= 100 ? 'Atingido' : 'Pendente'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>
    </div>
  );
};
