"use client";
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, UserCheck, AlertTriangle, FileText,
  Search, ChevronDown, ChevronRight, Building, MapPin, CheckCircle2
} from 'lucide-react';

interface HierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeaders: string[];
  selectedDiretorias: string[];
  selectedCities: string[];
  rankAgg: Array<{
    name: string;
    count: number;
    supervisor?: string;
    cidade?: string;
    cidadeBase?: string;
    semApr?: boolean;
    uniquePeople: Set<string>;
    totalSecs: number;
    validCount: number;
  }>;
}

export const HierarchyModal: React.FC<HierarchyModalProps> = ({
  isOpen,
  onClose,
  selectedLeaders,
  selectedDiretorias,
  selectedCities,
  rankAgg,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSups, setExpandedSups] = useState<Record<string, boolean>>({});

  // Agrupar os colaboradores por Supervisor
  const groupedBySupervisor = useMemo(() => {
    const map: Record<string, {
      supervisor: string;
      cidade?: string;
      colaboradores: Array<{
        name: string;
        matricula: string;
        cidade?: string;
        count: number;
        semApr?: boolean;
        avgDuration?: string;
      }>;
      totalAprs: number;
      comApr: number;
      semApr: number;
    }> = {};

    rankAgg.forEach(item => {
      const sup = (item.supervisor || 'SUPERVISÃO NÃO IDENTIFICADA').trim().toUpperCase();
      if (!map[sup]) {
        map[sup] = {
          supervisor: sup,
          cidade: item.cidadeBase || item.cidade,
          colaboradores: [],
          totalAprs: 0,
          comApr: 0,
          semApr: 0,
        };
      }

      const mat = Array.from(item.uniquePeople)[0] || '-';
      const avgSecs = item.validCount > 0 ? Math.round(item.totalSecs / item.validCount) : 0;
      let avgDur = '-';
      if (avgSecs > 0) {
        if (avgSecs < 60) avgDur = `${avgSecs}s`;
        else if (avgSecs < 3600) avgDur = `${Math.floor(avgSecs / 60)}m ${avgSecs % 60}s`;
        else avgDur = `${Math.floor(avgSecs / 3600)}h ${Math.floor((avgSecs % 3600) / 60)}m`;
      }

      map[sup].colaboradores.push({
        name: item.name,
        matricula: mat,
        cidade: item.cidadeBase || item.cidade,
        count: item.count,
        semApr: item.semApr,
        avgDuration: avgDur,
      });

      map[sup].totalAprs += item.count;
      if (item.count > 0) {
        map[sup].comApr += 1;
      } else {
        map[sup].semApr += 1;
      }
    });

    // Ordenar colaboradores de cada supervisor: quem tem APR primeiro, depois alfabético
    Object.values(map).forEach(g => {
      g.colaboradores.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });
    });

    // Ordenar supervisores por maior equipe
    return Object.values(map).sort((a, b) => b.colaboradores.length - a.colaboradores.length);
  }, [rankAgg]);

  // Filtragem pela busca interna
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groupedBySupervisor;
    const term = searchTerm.trim().toUpperCase();

    return groupedBySupervisor
      .map(group => {
        const supMatch = group.supervisor.includes(term);
        const matchingColabs = group.colaboradores.filter(c =>
          c.name.toUpperCase().includes(term) ||
          c.matricula.toUpperCase().includes(term) ||
          (c.cidade && c.cidade.toUpperCase().includes(term))
        );

        if (supMatch) return group;
        if (matchingColabs.length > 0) {
          return {
            ...group,
            colaboradores: matchingColabs,
          };
        }
        return null;
      })
      .filter(Boolean) as typeof groupedBySupervisor;
  }, [groupedBySupervisor, searchTerm]);

  // Totais gerais para os cards do topo
  const totalSupervisores = groupedBySupervisor.length;
  const totalColaboradores = rankAgg.length;
  const totalComApr = rankAgg.filter(i => i.count > 0).length;
  const totalSemApr = rankAgg.filter(i => i.count === 0).length;
  const totalAprs = rankAgg.reduce((acc, i) => acc + i.count, 0);

  const toggleSup = (sup: string) => {
    setExpandedSups(prev => ({
      ...prev,
      [sup]: prev[sup] === undefined ? false : !prev[sup]
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    groupedBySupervisor.forEach(g => { all[g.supervisor] = true; });
    setExpandedSups(all);
  };

  const collapseAll = () => {
    const none: Record<string, boolean> = {};
    groupedBySupervisor.forEach(g => { none[g.supervisor] = false; });
    setExpandedSups(none);
  };

  if (!isOpen) return null;

  const leaderTitle = selectedLeaders.length > 0
    ? selectedLeaders.join(', ')
    : 'Todas as Lideranças';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-5xl bg-white dark:bg-[#151d2f] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh] z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between bg-gray-50/50 dark:bg-[#0f172a]/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-100 dark:bg-purple-950/60 text-[#660099] dark:text-purple-400 rounded-xl">
                  <Users size={20} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Estrutura da Hierarquia
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-[#660099] dark:text-purple-300">
                      {totalSupervisores} {totalSupervisores === 1 ? 'supervisor' : 'supervisores'}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Liderança Selecionada: <strong className="text-gray-800 dark:text-gray-200">{leaderTitle}</strong>
                  </p>
                </div>
              </div>

              {/* Context Tags */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-gray-600 dark:text-gray-300">
                {selectedDiretorias.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-medium">
                    <Building size={12} /> {selectedDiretorias.join(', ')}
                  </span>
                )}
                {selectedCities.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 font-medium">
                    <MapPin size={12} /> {selectedCities.join(', ')}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="p-6 pb-2 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Supervisores</span>
              <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{totalSupervisores}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Total Equipe</span>
              <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{totalColaboradores}</div>
            </div>
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Com APR</span>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{totalComApr}</div>
            </div>
            <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase">Sem APR</span>
              <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">{totalSemApr}</div>
            </div>
            <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-xl p-3 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-400 uppercase">Total APRs</span>
              <div className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-0.5">{totalAprs}</div>
            </div>
          </div>

          {/* Search and Expand/Collapse Bar */}
          <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por colaborador, supervisor, matrícula ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              >
                Expandir Todos
              </button>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              >
                Recolher Todos
              </button>
            </div>
          </div>

          {/* Body: Hierarchical Accordion List */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
            {filteredGroups.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                Nenhum colaborador ou supervisor encontrado para os critérios.
              </div>
            ) : (
              filteredGroups.map(group => {
                const isExpanded = expandedSups[group.supervisor] !== false; // Padrão expandido
                return (
                  <div
                    key={group.supervisor}
                    className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900/60 transition-all shadow-sm"
                  >
                    {/* Supervisor Header */}
                    <button
                      type="button"
                      onClick={() => toggleSup(group.supervisor)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100/80 dark:hover:bg-gray-800 flex items-center justify-between text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span>{group.supervisor}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900">
                              Supervisor
                            </span>
                            {group.cidade && (
                              <span className="text-[10px] text-gray-500 font-normal">
                                • {group.cidade}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          <strong>{group.colaboradores.length}</strong> {group.colaboradores.length === 1 ? 'colaborador' : 'colaboradores'}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          {group.comApr} com APR
                        </span>
                        {group.semApr > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                            {group.semApr} sem APR
                          </span>
                        )}
                        <span className="text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                          {group.totalAprs} APRs
                        </span>
                      </div>
                    </button>

                    {/* Colaboradores Table */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 uppercase text-[10px] border-t border-b border-gray-100 dark:border-gray-800">
                            <tr>
                              <th className="px-4 py-2 font-semibold">Colaborador</th>
                              <th className="px-4 py-2 font-semibold">Matrícula</th>
                              <th className="px-4 py-2 font-semibold">Cidade</th>
                              <th className="px-4 py-2 font-semibold text-center">Status APR</th>
                              <th className="px-4 py-2 font-semibold text-right">APRs Realizadas</th>
                              <th className="px-4 py-2 font-semibold text-right">Duração Média</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                            {group.colaboradores.map(c => {
                              const hasApr = c.count > 0;
                              return (
                                <tr
                                  key={c.matricula + c.name}
                                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                                >
                                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                                    {hasApr ? (
                                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                    ) : (
                                      <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                                    )}
                                    <span>{c.name}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                                    {c.matricula}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                                    {c.cidade || '-'}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    {hasApr ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400">
                                        Ativo com APR
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400">
                                        Sem APR
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-bold text-gray-900 dark:text-white">
                                    {c.count}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                                    {c.avgDuration}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#0f172a]/50 text-xs">
            <span className="text-gray-500">
              Total listado: <strong>{totalColaboradores} colaboradores</strong> em <strong>{totalSupervisores} supervisões</strong>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
