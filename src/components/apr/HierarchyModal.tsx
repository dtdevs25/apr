"use client";
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, UserCheck, AlertTriangle, FileText,
  Search, ChevronDown, ChevronRight, Building, MapPin, CheckCircle2,
  Briefcase, Award, ShieldCheck, User, Compass
} from 'lucide-react';

interface ColabItem {
  name: string;
  matricula: string;
  cargo: string;
  cidade: string;
  count: number;
  semApr: boolean;
  avgDuration: string;
}

interface SupNode {
  supervisor: string;
  cidade?: string;
  colaboradores: ColabItem[];
  totalAprs: number;
  comApr: number;
  semApr: number;
}

interface CoordNode {
  coordenador: string;
  cargo?: string;
  cidade?: string;
  supervisores: Record<string, SupNode>;
  supervisoresList: SupNode[];
  totalSupervisores: number;
  totalColaboradores: number;
  totalAprs: number;
  comApr: number;
  semApr: number;
}

interface GerNode {
  gerente: string;
  cargo?: string;
  cidade?: string;
  diretor?: string;
  coordenadores: Record<string, CoordNode>;
  coordenadoresList: CoordNode[];
  totalCoordenadores: number;
  totalSupervisores: number;
  totalColaboradores: number;
  totalAprs: number;
  comApr: number;
  semApr: number;
}

interface DirNode {
  diretoria: string;
  diretor: string;
  gerencias: Record<string, GerNode>;
  gerenciasList: GerNode[];
  totalGerencias: number;
  totalCoordenadores: number;
  totalSupervisores: number;
  totalColaboradores: number;
  totalAprs: number;
  comApr: number;
  semApr: number;
}

interface LeaderInfo {
  nome: string;
  cargo: string;
  tipo: 'DIRETOR' | 'GERENTE' | 'COORDENADOR' | 'SUPERVISOR';
  diretoria: string;
  diretor?: string;
  gerente?: string;
  coordenador?: string;
  cidade: string;
  regional: string;
}

interface HierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeaders?: string[];
  selectedGerentes?: string[];
  selectedCoordenadores?: string[];
  selectedSupervisores?: string[];
  selectedDiretorias: string[];
  selectedCities: string[];
  rankAgg: Array<{
    name: string;
    count: number;
    supervisor?: string;
    coordenador?: string | null;
    gerente?: string | null;
    diretor?: string | null;
    cargo?: string | null;
    cidade?: string;
    cidadeBase?: string;
    semApr?: boolean;
    uniquePeople: Set<string>;
    totalSecs: number;
    validCount: number;
  }>;
  liderancas?: LeaderInfo[];
}

export const HierarchyModal: React.FC<HierarchyModalProps> = ({
  isOpen,
  onClose,
  selectedLeaders = [],
  selectedGerentes = [],
  selectedCoordenadores = [],
  selectedSupervisores = [],
  selectedDiretorias = [],
  selectedCities = [],
  rankAgg = [],
  liderancas = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDiretorias, setExpandedDiretorias] = useState<Record<string, boolean>>({});
  const [expandedGerentes, setExpandedGerentes] = useState<Record<string, boolean>>({});
  const [expandedCoords, setExpandedCoords] = useState<Record<string, boolean>>({});
  const [expandedSups, setExpandedSups] = useState<Record<string, boolean>>({});

  // Construir a árvore hierárquica estrita de 5 níveis:
  // DIRETORIA (Diretor) -> GERÊNCIA (Gerente) -> COORDENAÇÃO (Coordenador) -> SUPERVISÃO (Supervisor) -> COLABORADORES
  const hierarchyTree = useMemo(() => {
    const dirMap: Record<string, DirNode> = {};

    const SPC_CITIES = new Set([
      'SAO PAULO', 'SÃO PAULO', 'MAUA', 'MAUÁ', 'PRAIA GRANDE', 'SANTOS',
      'MOGI DAS CRUZES', 'BARUERI', 'GUARULHOS', 'SANTO ANDRE', 'SANTO ANDRÉ',
      'SAO VICENTE', 'SÃO VICENTE', 'SAO CAETANO DO SUL', 'SÃO CAETANO DO SUL',
      'SAO BERNARDO DO CAMPO', 'SÃO BERNARDO DO CAMPO', 'GUARUJA', 'GUARUJÁ',
      'TABOAO DA SERRA', 'TABOÃO DA SERRA', 'CARAGUATATUBA', 'CUBATAO', 'CUBATÃO'
    ]);

    const getDiretoriaKey = (dir?: string | null, diretor?: string | null, cidade?: string | null): string => {
      if (diretor && (diretor.includes('SAMUEL') || diretor.includes('ROSSI'))) {
        return 'DIR SERVICOS AO CLIENTE SP INTERIOR';
      }
      if (diretor && (diretor.includes('ELISEU') || diretor.includes('OLIVEIRA'))) {
        return 'DIR SERVICOS AO CLIENTE SP CAPITAL';
      }
      if (dir && dir.includes('CAPITAL')) return 'DIR SERVICOS AO CLIENTE SP CAPITAL';
      if (dir && dir.includes('INTERIOR')) return 'DIR SERVICOS AO CLIENTE SP INTERIOR';
      if (cidade && SPC_CITIES.has(cidade.toUpperCase())) return 'DIR SERVICOS AO CLIENTE SP CAPITAL';
      return 'DIR SERVICOS AO CLIENTE SP INTERIOR';
    };

    const getDiretorName = (dirKey: string): string => {
      if (dirKey.includes('CAPITAL')) return 'ELISEU ROBERTO OLIVEIRA';
      return 'SAMUEL ROSSI DO NASCIMENTO';
    };

    const activeLeaderSet = new Set([
      ...selectedLeaders.map(s => s.trim().toUpperCase()),
      ...selectedGerentes.map(s => s.trim().toUpperCase()),
      ...selectedCoordenadores.map(s => s.trim().toUpperCase()),
      ...selectedSupervisores.map(s => s.trim().toUpperCase()),
    ]);
    const hasLeaderFilter = activeLeaderSet.size > 0;

    // Descobrir toda a sub-árvore e caminho de ancestrais
    const relevantLeaderNames = new Set<string>();
    if (hasLeaderFilter) {
      activeLeaderSet.forEach(n => relevantLeaderNames.add(n));

      // Descendentes (subordinados em qualquer nível)
      let added = true;
      while (added) {
        added = false;
        liderancas.forEach(l => {
          const nome = l.nome.trim().toUpperCase();
          if (!relevantLeaderNames.has(nome)) {
            const dir = l.diretor?.trim().toUpperCase();
            const ger = l.gerente?.trim().toUpperCase();
            const coord = l.coordenador?.trim().toUpperCase();
            if ((dir && relevantLeaderNames.has(dir)) || (ger && relevantLeaderNames.has(ger)) || (coord && relevantLeaderNames.has(coord))) {
              relevantLeaderNames.add(nome);
              added = true;
            }
          }
        });
      }

      // Ancestrais (diretor, gerente, coordenador acima dos selecionados)
      liderancas.forEach(l => {
        const nome = l.nome.trim().toUpperCase();
        if (activeLeaderSet.has(nome)) {
          if (l.diretor) relevantLeaderNames.add(l.diretor.trim().toUpperCase());
          if (l.gerente) relevantLeaderNames.add(l.gerente.trim().toUpperCase());
          if (l.coordenador) relevantLeaderNames.add(l.coordenador.trim().toUpperCase());
        }
      });
    }

    // 1. Pré-popular a partir das lideranças registradas no PO corporativo
    // Isso garante que coordenadores (como Ricardo Garone) e supervisores estejam sempre visíveis na gestão,
    // mesmo quando não tiverem subordinados com APR emitida no mês selecionado.
    liderancas.forEach(l => {
      const isSamuel = l.nome.includes('SAMUEL') || l.nome.includes('ROSSI');
      const isEliseu = l.nome.includes('ELISEU') || l.nome.includes('OLIVEIRA');

      let dirKey: string;
      if (isSamuel) {
        dirKey = 'DIR SERVICOS AO CLIENTE SP INTERIOR';
      } else if (isEliseu) {
        dirKey = 'DIR SERVICOS AO CLIENTE SP CAPITAL';
      } else {
        dirKey = getDiretoriaKey(l.diretoria, l.diretor, l.cidade);
      }

      // Filtro de Diretoria ativa
      if (selectedDiretorias.length > 0 && !selectedDiretorias.includes(dirKey)) return;

      // Se houver filtro de liderança ativo, só inclui líderes que estão na árvore relevante
      if (hasLeaderFilter && !relevantLeaderNames.has(l.nome.trim().toUpperCase())) return;

      if (!dirMap[dirKey]) {
        dirMap[dirKey] = {
          diretoria: dirKey,
          diretor: getDiretorName(dirKey),
          gerencias: {},
          gerenciasList: [],
          totalGerencias: 0,
          totalCoordenadores: 0,
          totalSupervisores: 0,
          totalColaboradores: 0,
          totalAprs: 0,
          comApr: 0,
          semApr: 0,
        };
      }

      const dirObj = dirMap[dirKey];
      dirObj.diretor = getDiretorName(dirKey);

      if (l.tipo === 'DIRETOR' || isSamuel || isEliseu) {
        return;
      }

      // Se for Gerente
      if (l.tipo === 'GERENTE') {
        if (!dirObj.gerencias[l.nome]) {
          dirObj.gerencias[l.nome] = {
            gerente: l.nome,
            cargo: l.cargo,
            cidade: l.cidade,
            diretor: dirObj.diretor,
            coordenadores: {},
            coordenadoresList: [],
            totalCoordenadores: 0,
            totalSupervisores: 0,
            totalColaboradores: 0,
            totalAprs: 0,
            comApr: 0,
            semApr: 0,
          };
        }
        return;
      }

      // Se for Coordenador (ex: Ricardo Alexandre Garone Henriques)
      if (l.tipo === 'COORDENADOR') {
        const gerName = (l.gerente && l.gerente.trim()) ? l.gerente.trim().toUpperCase() : 'GERÊNCIA GERAL / DIRETORIA';

        if (!dirObj.gerencias[gerName]) {
          dirObj.gerencias[gerName] = {
            gerente: gerName,
            diretor: dirObj.diretor,
            cidade: l.cidade,
            coordenadores: {},
            coordenadoresList: [],
            totalCoordenadores: 0,
            totalSupervisores: 0,
            totalColaboradores: 0,
            totalAprs: 0,
            comApr: 0,
            semApr: 0,
          };
        }

        const gerObj = dirObj.gerencias[gerName];
        if (!gerObj.coordenadores[l.nome]) {
          gerObj.coordenadores[l.nome] = {
            coordenador: l.nome,
            cargo: l.cargo,
            cidade: l.cidade,
            supervisores: {},
            supervisoresList: [],
            totalSupervisores: 0,
            totalColaboradores: 0,
            totalAprs: 0,
            comApr: 0,
            semApr: 0,
          };
        }
        return;
      }

      // Se for Supervisor
      if (l.tipo === 'SUPERVISOR') {
        const gerName = (l.gerente && l.gerente.trim()) ? l.gerente.trim().toUpperCase() : 'GERÊNCIA GERAL / DIRETORIA';
        const coordName = (l.coordenador && l.coordenador.trim()) ? l.coordenador.trim().toUpperCase() : 'COORDENAÇÃO GERAL';

        if (!dirObj.gerencias[gerName]) {
          dirObj.gerencias[gerName] = {
            gerente: gerName,
            diretor: dirObj.diretor,
            cidade: l.cidade,
            coordenadores: {},
            coordenadoresList: [],
            totalCoordenadores: 0,
            totalSupervisores: 0,
            totalColaboradores: 0,
            totalAprs: 0,
            comApr: 0,
            semApr: 0,
          };
        }

        const gerObj = dirObj.gerencias[gerName];
        if (!gerObj.coordenadores[coordName]) {
          gerObj.coordenadores[coordName] = {
            coordenador: coordName,
            supervisores: {},
            supervisoresList: [],
            totalSupervisores: 0,
            totalColaboradores: 0,
            totalAprs: 0,
            comApr: 0,
            semApr: 0,
          };
        }

        const coordObj = gerObj.coordenadores[coordName];
        if (!coordObj.supervisores[l.nome]) {
          coordObj.supervisores[l.nome] = {
            supervisor: l.nome,
            cidade: l.cidade,
            colaboradores: [],
            totalAprs: 0,
            comApr: 0,
            semApr: 0,
          };
        }
      }
    });

    // 2. Anexar os colaboradores (com ou sem APR) nas suas respectivas supervisões
    rankAgg.forEach(item => {
      const colabCity = item.cidadeBase || item.cidade;
      const dirKey = getDiretoriaKey(null, item.diretor, colabCity);
      if (selectedDiretorias.length > 0 && !selectedDiretorias.includes(dirKey)) return;

      if (hasLeaderFilter) {
        const itemDir = item.diretor?.trim().toUpperCase();
        const itemGer = item.gerente?.trim().toUpperCase();
        const itemCoord = item.coordenador?.trim().toUpperCase();
        const itemSup = item.supervisor?.trim().toUpperCase();
        const colabName = item.name.trim().toUpperCase();

        const matches = (itemDir && activeLeaderSet.has(itemDir)) ||
                        (itemGer && activeLeaderSet.has(itemGer)) ||
                        (itemCoord && activeLeaderSet.has(itemCoord)) ||
                        (itemSup && activeLeaderSet.has(itemSup)) ||
                        activeLeaderSet.has(colabName);

        if (!matches) return;
      }

      const gerName = (item.gerente && item.gerente.trim())
        ? item.gerente.trim().toUpperCase()
        : 'GERÊNCIA GERAL / DIRETORIA';

      const coordName = (item.coordenador && item.coordenador.trim() && item.coordenador !== gerName)
        ? item.coordenador.trim().toUpperCase()
        : 'COORDENAÇÃO DIRETA COM GERÊNCIA';

      const supName = (item.supervisor && item.supervisor.trim() && item.supervisor !== coordName && item.supervisor !== gerName)
        ? item.supervisor.trim().toUpperCase()
        : 'SUPERVISÃO OPERACIONAL DE CAMPO';

      if (selectedCities.length > 0 && colabCity && !selectedCities.includes(colabCity)) return;

      if (!dirMap[dirKey]) {
        dirMap[dirKey] = {
          diretoria: dirKey,
          diretor: getDiretorName(dirKey),
          gerencias: {},
          gerenciasList: [],
          totalGerencias: 0,
          totalCoordenadores: 0,
          totalSupervisores: 0,
          totalColaboradores: 0,
          totalAprs: 0,
          comApr: 0,
          semApr: 0,
        };
      }

      const dirObj = dirMap[dirKey];
      dirObj.diretor = getDiretorName(dirKey);

      if (!dirObj.gerencias[gerName]) {
        dirObj.gerencias[gerName] = {
          gerente: gerName,
          diretor: dirObj.diretor,
          cidade: colabCity,
          coordenadores: {},
          coordenadoresList: [],
          totalCoordenadores: 0,
          totalSupervisores: 0,
          totalColaboradores: 0,
          totalAprs: 0,
          comApr: 0,
          semApr: 0,
        };
      }

      const gerObj = dirObj.gerencias[gerName];

      if (!gerObj.coordenadores[coordName]) {
        gerObj.coordenadores[coordName] = {
          coordenador: coordName,
          supervisores: {},
          supervisoresList: [],
          totalSupervisores: 0,
          totalColaboradores: 0,
          totalAprs: 0,
          comApr: 0,
          semApr: 0,
        };
      }

      const coordObj = gerObj.coordenadores[coordName];

      if (!coordObj.supervisores[supName]) {
        coordObj.supervisores[supName] = {
          supervisor: supName,
          cidade: colabCity,
          colaboradores: [],
          totalAprs: 0,
          comApr: 0,
          semApr: 0,
        };
      }

      const supObj = coordObj.supervisores[supName];
      const mat = Array.from(item.uniquePeople)[0] || '-';

      const avgSecs = item.validCount > 0 ? Math.round(item.totalSecs / item.validCount) : 0;
      let avgDur = '-';
      if (avgSecs > 0) {
        if (avgSecs < 60) avgDur = `${avgSecs}s`;
        else if (avgSecs < 3600) avgDur = `${Math.floor(avgSecs / 60)}m ${avgSecs % 60}s`;
        else avgDur = `${Math.floor(avgSecs / 3600)}h ${Math.floor((avgSecs % 3600) / 60)}m`;
      }

      const colabItem: ColabItem = {
        name: item.name,
        matricula: mat,
        cargo: item.cargo || 'TÉCNICO DE CAMPO',
        cidade: colabCity || 'NÃO INFORMADA',
        count: item.count,
        semApr: item.semApr || item.count === 0,
        avgDuration: avgDur,
      };

      supObj.colaboradores.push(colabItem);
      supObj.totalAprs += item.count;
      coordObj.totalAprs += item.count;
      gerObj.totalAprs += item.count;
      dirObj.totalAprs += item.count;

      coordObj.totalColaboradores += 1;
      gerObj.totalColaboradores += 1;
      dirObj.totalColaboradores += 1;

      if (item.count > 0) {
        supObj.comApr += 1;
        coordObj.comApr += 1;
        gerObj.comApr += 1;
        dirObj.comApr += 1;
      } else {
        supObj.semApr += 1;
        coordObj.semApr += 1;
        gerObj.semApr += 1;
        dirObj.semApr += 1;
      }
    });

    // 3. Converter para listas ordenadas por relevância e contagem
    const diretoriasList = Object.values(dirMap).map(dir => {
      const gerList = Object.values(dir.gerencias)
        .filter(ger => !hasLeaderFilter || relevantLeaderNames.has(ger.gerente.trim().toUpperCase()) || ger.totalColaboradores > 0)
        .map(ger => {
          const coordList = Object.values(ger.coordenadores)
            .filter(coord => !hasLeaderFilter || relevantLeaderNames.has(coord.coordenador.trim().toUpperCase()) || coord.totalColaboradores > 0)
            .map(coord => {
              const supList = Object.values(coord.supervisores)
                .filter(sup => !hasLeaderFilter || relevantLeaderNames.has(sup.supervisor.trim().toUpperCase()) || sup.colaboradores.length > 0)
                .map(sup => {
                  sup.colaboradores.sort((a, b) => {
                    if (b.count !== a.count) return b.count - a.count;
                    return a.name.localeCompare(b.name);
                  });
                  return sup;
                });

              supList.sort((a, b) => b.colaboradores.length - a.colaboradores.length);

              return {
                ...coord,
                supervisoresList: supList,
                totalSupervisores: supList.length,
              };
            });

          coordList.sort((a, b) => b.totalColaboradores - a.totalColaboradores);

          const allSupsInGer = new Set<string>();
          coordList.forEach(c => c.supervisoresList.forEach(s => allSupsInGer.add(s.supervisor)));

          return {
            ...ger,
            coordenadoresList: coordList,
            totalCoordenadores: coordList.length,
            totalSupervisores: allSupsInGer.size,
          };
        });

      gerList.sort((a, b) => b.totalColaboradores - a.totalColaboradores);

      const allCoordsInDir = new Set<string>();
      const allSupsInDir = new Set<string>();
      gerList.forEach(g => {
        g.coordenadoresList.forEach(c => {
          allCoordsInDir.add(c.coordenador);
          c.supervisoresList.forEach(s => allSupsInDir.add(s.supervisor));
        });
      });

      return {
        ...dir,
        gerenciasList: gerList,
        totalGerencias: gerList.length,
        totalCoordenadores: allCoordsInDir.size,
        totalSupervisores: allSupsInDir.size,
      };
    }).filter(dir => dir.gerenciasList.length > 0 || dir.totalColaboradores > 0);

    diretoriasList.sort((a, b) => b.totalColaboradores - a.totalColaboradores);
    return diretoriasList;
  }, [rankAgg, liderancas, selectedDiretorias, selectedLeaders, selectedGerentes, selectedCoordenadores, selectedSupervisores, selectedCities]);

  // Filtragem da busca textual por Diretor, Gerente, Coordenador, Supervisor, Técnico, Matrícula ou Cidade
  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return hierarchyTree;
    const term = searchTerm.trim().toUpperCase();

    return hierarchyTree
      .map(dir => {
        const dirMatches = dir.diretoria.includes(term) || dir.diretor.includes(term);

        const matchingGerencias = dir.gerenciasList
          .map(ger => {
            const gerMatches = ger.gerente.includes(term) || (ger.cargo && ger.cargo.toUpperCase().includes(term));

            const matchingCoords = ger.coordenadoresList
              .map(coord => {
                const coordMatches = coord.coordenador.includes(term) || (coord.cargo && coord.cargo.toUpperCase().includes(term));

                const matchingSups = coord.supervisoresList
                  .map(sup => {
                    const supMatches = sup.supervisor.includes(term);
                    const matchingColabs = sup.colaboradores.filter(c =>
                      c.name.toUpperCase().includes(term) ||
                      c.matricula.toUpperCase().includes(term) ||
                      c.cargo.toUpperCase().includes(term) ||
                      c.cidade.toUpperCase().includes(term)
                    );

                    if (supMatches || coordMatches || gerMatches || dirMatches) return sup;
                    if (matchingColabs.length > 0) {
                      return {
                        ...sup,
                        colaboradores: matchingColabs,
                      };
                    }
                    return null;
                  })
                  .filter(Boolean) as typeof coord.supervisoresList;

                if (coordMatches || gerMatches || dirMatches) return coord;
                if (matchingSups.length > 0) {
                  return {
                    ...coord,
                    supervisoresList: matchingSups,
                  };
                }
                return null;
              })
              .filter(Boolean) as typeof ger.coordenadoresList;

            if (gerMatches || dirMatches) return ger;
            if (matchingCoords.length > 0) {
              return {
                ...ger,
                coordenadoresList: matchingCoords,
              };
            }
            return null;
          })
          .filter(Boolean) as typeof dir.gerenciasList;

        if (dirMatches) return dir;
        if (matchingGerencias.length > 0) {
          return {
            ...dir,
            gerenciasList: matchingGerencias,
          };
        }
        return null;
      })
      .filter(Boolean) as typeof hierarchyTree;
  }, [hierarchyTree, searchTerm]);

  // Contagens consolidadas para os cards do topo
  const totalDiretorias = hierarchyTree.length;
  const totalGerentes = useMemo(() => {
    const set = new Set<string>();
    hierarchyTree.forEach(d => d.gerenciasList.forEach(g => {
      if (g.gerente && !g.gerente.includes('GERÊNCIA GERAL')) set.add(g.gerente);
    }));
    return set.size;
  }, [hierarchyTree]);

  const totalCoordenadores = useMemo(() => {
    const set = new Set<string>();
    hierarchyTree.forEach(d => d.gerenciasList.forEach(g => {
      g.coordenadoresList.forEach(c => {
        if (c.coordenador && !c.coordenador.includes('DIRETA')) set.add(c.coordenador);
      });
    }));
    return set.size;
  }, [hierarchyTree]);

  const totalSupervisores = useMemo(() => {
    const set = new Set<string>();
    hierarchyTree.forEach(d => d.gerenciasList.forEach(g => {
      g.coordenadoresList.forEach(c => {
        c.supervisoresList.forEach(s => {
          if (s.supervisor) set.add(s.supervisor);
        });
      });
    }));
    return set.size;
  }, [hierarchyTree]);

  const totalColaboradores = rankAgg.length;
  const totalComApr = rankAgg.filter(i => i.count > 0).length;
  const totalSemApr = rankAgg.filter(i => i.count === 0).length;
  const totalAprs = rankAgg.reduce((acc, i) => acc + i.count, 0);

  const toggleDiretoria = (dirKey: string) => {
    setExpandedDiretorias(prev => ({
      ...prev,
      [dirKey]: prev[dirKey] === undefined ? false : !prev[dirKey]
    }));
  };

  const toggleGerente = (gerKey: string) => {
    setExpandedGerentes(prev => ({
      ...prev,
      [gerKey]: prev[gerKey] === undefined ? false : !prev[gerKey]
    }));
  };

  const toggleCoord = (coordKey: string) => {
    setExpandedCoords(prev => ({
      ...prev,
      [coordKey]: prev[coordKey] === undefined ? false : !prev[coordKey]
    }));
  };

  const toggleSup = (supKey: string) => {
    setExpandedSups(prev => ({
      ...prev,
      [supKey]: prev[supKey] === undefined ? true : !prev[supKey] // Padrão fechado para supervisores
    }));
  };

  const expandAll = () => {
    const allD: Record<string, boolean> = {};
    const allG: Record<string, boolean> = {};
    const allC: Record<string, boolean> = {};
    const allS: Record<string, boolean> = {};
    hierarchyTree.forEach(d => {
      allD[d.diretoria] = true;
      d.gerenciasList.forEach(g => {
        allG[`${d.diretoria}__${g.gerente}`] = true;
        g.coordenadoresList.forEach(c => {
          allC[`${d.diretoria}__${g.gerente}__${c.coordenador}`] = true;
          c.supervisoresList.forEach(s => {
            allS[`${d.diretoria}__${g.gerente}__${c.coordenador}__${s.supervisor}`] = true;
          });
        });
      });
    });
    setExpandedDiretorias(allD);
    setExpandedGerentes(allG);
    setExpandedCoords(allC);
    setExpandedSups(allS);
  };

  const collapseAll = () => {
    const noneD: Record<string, boolean> = {};
    const noneG: Record<string, boolean> = {};
    const noneC: Record<string, boolean> = {};
    const noneS: Record<string, boolean> = {};
    hierarchyTree.forEach(d => {
      noneD[d.diretoria] = false;
      d.gerenciasList.forEach(g => {
        noneG[`${d.diretoria}__${g.gerente}`] = false;
        g.coordenadoresList.forEach(c => {
          noneC[`${d.diretoria}__${g.gerente}__${c.coordenador}`] = false;
          c.supervisoresList.forEach(s => {
            noneS[`${d.diretoria}__${g.gerente}__${c.coordenador}__${s.supervisor}`] = false;
          });
        });
      });
    });
    setExpandedDiretorias(noneD);
    setExpandedGerentes(noneG);
    setExpandedCoords(noneC);
    setExpandedSups(noneS);
  };

  if (!isOpen) return null;

  const leaderFiltersActive = [
    ...selectedDiretorias.map(d => `Diretoria: ${d}`),
    ...selectedLeaders.map(l => `Gestão: ${l}`),
    ...selectedGerentes.map(g => `Gerente: ${g}`),
    ...selectedCoordenadores.map(c => `Coord: ${c}`),
    ...selectedSupervisores.map(s => `Sup: ${s}`),
  ];

  const leaderTitle = leaderFiltersActive.length > 0
    ? leaderFiltersActive.join(' • ')
    : 'Estrutura Completa da Organização';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
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
          className="relative w-full max-w-6xl bg-white dark:bg-[#151d2f] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[92vh] z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white dark:from-[#0f172a] dark:via-[#1e1b4b]/30 dark:to-[#0f172a]">
            <div>
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-[#660099] text-white rounded-xl shadow-md">
                  <Compass size={22} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Estrutura Organizacional e Hierarquia
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-[#660099] dark:text-purple-300">
                      Diretoria ➔ Gerência ➔ Coordenação ➔ Supervisão ➔ Campo
                    </span>
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 flex items-center gap-1.5">
                    Foco Ativo: <strong className="text-gray-900 dark:text-white font-semibold">{leaderTitle}</strong>
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

          {/* Quick Metrics Cards (5 Níveis) */}
          <div className="p-6 pb-2 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase">Diretorias</span>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-0.5">{totalDiretorias}</div>
            </div>
            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase">Gerências</span>
              <div className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">{totalGerentes}</div>
            </div>
            <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-400 uppercase">Coordenações</span>
              <div className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-0.5">{totalCoordenadores}</div>
            </div>
            <div className="bg-orange-50/70 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-400 uppercase">Supervisões</span>
              <div className="text-xl font-bold text-orange-700 dark:text-orange-400 mt-0.5">{totalSupervisores}</div>
            </div>
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Colaboradores</span>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-baseline gap-1.5">
                <span>{totalColaboradores}</span>
                <span className="text-[11px] font-normal text-emerald-600">({totalComApr} com APR)</span>
              </div>
            </div>
          </div>

          {/* Search Bar & Action Buttons */}
          <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800">
            <div className="relative flex-1 min-w-[260px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por diretor, gerente, coordenador (ex: Garone), supervisor, técnico, matrícula ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={expandAll}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all font-medium"
              >
                Expandir Todos
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all font-medium"
              >
                Recolher Todos
              </button>
            </div>
          </div>

          {/* Body: Hierarchical Accordion List */}
          {/* NÍVEL 0: DIRETORIA (Diretor) -> NÍVEL 1: GERÊNCIA -> NÍVEL 2: COORDENAÇÃO -> NÍVEL 3: SUPERVISÃO -> NÍVEL 4: COLABORADORES */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
            {filteredTree.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                Nenhum membro da hierarquia encontrado para os critérios selecionados.
              </div>
            ) : (
              filteredTree.map(dir => {
                const isDirExpanded = expandedDiretorias[dir.diretoria] !== false; // Padrão aberto

                return (
                  <div
                    key={dir.diretoria}
                    className="border-2 border-blue-200 dark:border-blue-900/60 rounded-2xl overflow-hidden bg-white dark:bg-gray-900/80 shadow-md"
                  >
                    {/* NÍVEL 0: DIRETORIA & DIRETOR HEADER */}
                    <button
                      type="button"
                      onClick={() => toggleDiretoria(dir.diretoria)}
                      className="w-full px-5 py-4 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-white dark:from-blue-950/50 dark:via-indigo-950/30 dark:to-gray-900 flex items-center justify-between text-left transition-colors border-b border-blue-100 dark:border-blue-900/40"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-blue-600 dark:text-blue-400">
                          {isDirExpanded ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
                        </span>
                        <div>
                          <div className="text-base font-extrabold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
                            <span>Diretoria: {dir.diretoria}</span>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-700 text-white shadow-xs tracking-wider">
                              DIRETORIA
                            </span>
                          </div>
                          <div className="text-xs text-blue-900 dark:text-blue-300 font-semibold mt-0.5 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-blue-600 dark:text-blue-400" />
                            Diretor Regional: <strong className="text-gray-900 dark:text-white">{dir.diretor}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-gray-700 dark:text-gray-300 font-semibold bg-indigo-100/70 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md">
                          {dir.totalGerencias} {dir.totalGerencias === 1 ? 'gerência' : 'gerências'}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 font-semibold bg-purple-100/70 dark:bg-purple-950/70 px-2 py-0.5 rounded-md">
                          {dir.totalCoordenadores} {dir.totalCoordenadores === 1 ? 'coordenação' : 'coordenações'}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 font-semibold bg-orange-100/70 dark:bg-orange-950/70 px-2 py-0.5 rounded-md">
                          {dir.totalSupervisores} {dir.totalSupervisores === 1 ? 'supervisão' : 'supervisões'}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 font-semibold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                          {dir.totalColaboradores} colaboradores
                        </span>
                        <span className="text-white font-bold bg-[#660099] px-2.5 py-0.5 rounded-md shadow-xs">
                          {dir.totalAprs} APRs
                        </span>
                      </div>
                    </button>

                    {/* NÍVEL 1: GERÊNCIAS DESTA DIRETORIA */}
                    {isDirExpanded && (
                      <div className="p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/40">
                        {dir.gerenciasList.map(ger => {
                          const gerKey = `${dir.diretoria}__${ger.gerente}`;
                          const isGerExpanded = expandedGerentes[gerKey] !== false; // Padrão aberto

                          return (
                            <div
                              key={gerKey}
                              className="border border-indigo-200 dark:border-indigo-900/60 rounded-xl overflow-hidden bg-white dark:bg-[#151d2f] shadow-xs"
                            >
                              {/* GERENTE HEADER */}
                              <button
                                type="button"
                                onClick={() => toggleGerente(gerKey)}
                                className="w-full px-4 py-3.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/30 dark:from-indigo-950/40 dark:to-purple-950/20 hover:from-indigo-100/60 dark:hover:from-indigo-950/60 flex items-center justify-between text-left transition-colors border-b border-indigo-100 dark:border-indigo-900/30"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="text-indigo-600 dark:text-indigo-400">
                                    {isGerExpanded ? <ChevronDown size={19} /> : <ChevronRight size={19} />}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                                      <span>{ger.gerente}</span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                                        GERÊNCIA
                                      </span>
                                      {ger.cidade && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                          ({ger.cidade})
                                        </span>
                                      )}
                                    </div>
                                    {ger.cargo && ger.cargo !== 'GERENTE' && (
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{ger.cargo}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2.5 text-xs">
                                  <span className="text-gray-600 dark:text-gray-300 font-medium">
                                    <strong>{ger.totalCoordenadores}</strong> {ger.totalCoordenadores === 1 ? 'coordenação' : 'coordenações'}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-300 font-medium">
                                    <strong>{ger.totalSupervisores}</strong> {ger.totalSupervisores === 1 ? 'supervisão' : 'supervisões'}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-300 font-medium">
                                    <strong>{ger.totalColaboradores}</strong> colab.
                                  </span>
                                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                                    {ger.comApr} com APR
                                  </span>
                                  <span className="text-purple-700 dark:text-purple-300 font-bold bg-purple-100/80 dark:bg-purple-950/80 px-2 py-0.5 rounded-md">
                                    {ger.totalAprs} APRs
                                  </span>
                                </div>
                              </button>

                              {/* NÍVEL 2: COORDENAÇÕES DESTA GERÊNCIA */}
                              {isGerExpanded && (
                                <div className="p-3.5 space-y-3 bg-gray-50/30 dark:bg-gray-900/30">
                                  {ger.coordenadoresList.map(coord => {
                                    const coordKey = `${dir.diretoria}__${ger.gerente}__${coord.coordenador}`;
                                    const isCoordExpanded = expandedCoords[coordKey] !== false; // Padrão aberto
                                    const isGarone = coord.coordenador.includes('GARONE');

                                    return (
                                      <div
                                        key={coordKey}
                                        className={`border rounded-xl overflow-hidden bg-white dark:bg-[#111827] shadow-xs ${
                                          isGarone ? 'border-purple-400 dark:border-purple-600 ring-2 ring-purple-400/20' : 'border-purple-200 dark:border-purple-900/60'
                                        }`}
                                      >
                                        {/* COORDENADOR HEADER */}
                                        <button
                                          type="button"
                                          onClick={() => toggleCoord(coordKey)}
                                          className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-50/70 to-white dark:from-purple-950/30 dark:to-gray-900 hover:from-purple-100/60 flex items-center justify-between text-left transition-colors border-b border-purple-100 dark:border-purple-900/30"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="text-purple-600 dark:text-purple-400">
                                              {isCoordExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </span>
                                            <div>
                                              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
                                                <span>{coord.coordenador}</span>
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white shadow-xs">
                                                  COORDENAÇÃO
                                                </span>
                                                {coord.cidade && (
                                                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                                                    ({coord.cidade})
                                                  </span>
                                                )}
                                              </div>
                                              {coord.cargo && (
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{coord.cargo}</p>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 text-xs">
                                            <span className="text-gray-600 dark:text-gray-300 text-[11px]">
                                              <strong>{coord.supervisoresList.length}</strong> {coord.supervisoresList.length === 1 ? 'supervisão' : 'supervisões'}
                                            </span>
                                            <span className="text-gray-600 dark:text-gray-300 text-[11px]">
                                              <strong>{coord.totalColaboradores}</strong> colab.
                                            </span>
                                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-100/80 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded text-[11px]">
                                              {coord.comApr} com APR
                                            </span>
                                            <span className="text-purple-700 dark:text-purple-300 font-bold bg-purple-100/80 dark:bg-purple-950/80 px-2 py-0.5 rounded text-[11px]">
                                              {coord.totalAprs} APRs
                                            </span>
                                          </div>
                                        </button>

                                        {/* NÍVEL 3: SUPERVISÕES DESTA COORDENAÇÃO */}
                                        {isCoordExpanded && (
                                          <div className="p-3 space-y-2.5 bg-gray-50/50 dark:bg-gray-950/30">
                                            {coord.supervisoresList.length === 0 ? (
                                              <div className="py-2.5 px-3 text-xs text-gray-400 dark:text-gray-500 italic bg-gray-100/60 dark:bg-gray-800/40 rounded-lg flex items-center gap-2">
                                                <User size={13} className="text-gray-400" />
                                                Coordenação cadastrada sem supervisões diretas / técnicos de campo ativos com emissão no período.
                                              </div>
                                            ) : (
                                              coord.supervisoresList.map(sup => {
                                                const supKey = `${dir.diretoria}__${ger.gerente}__${coord.coordenador}__${sup.supervisor}`;
                                                const isSupExpanded = expandedSups[supKey] === true;

                                                return (
                                                  <div
                                                    key={supKey}
                                                    className="border border-orange-200 dark:border-orange-900/50 rounded-lg overflow-hidden bg-white dark:bg-[#1a2333]"
                                                  >
                                                    {/* SUPERVISOR HEADER */}
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleSup(supKey)}
                                                      className="w-full px-3.5 py-2 bg-gradient-to-r from-orange-50/60 to-white dark:from-orange-950/20 dark:to-transparent hover:from-orange-100/50 flex items-center justify-between text-left transition-colors border-b border-orange-100 dark:border-orange-900/20"
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-orange-600 dark:text-orange-400">
                                                          {isSupExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white">
                                                          <span>{sup.supervisor}</span>
                                                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-500 text-white">
                                                            SUPERVISÃO
                                                          </span>
                                                          {sup.cidade && (
                                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
                                                              • {sup.cidade}
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>

                                                      <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                                                          {sup.colaboradores.length} {sup.colaboradores.length === 1 ? 'técnico' : 'técnicos'}
                                                        </span>
                                                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded text-[10px]">
                                                          {sup.comApr} com APR
                                                        </span>
                                                        {sup.semApr > 0 && (
                                                          <span className="text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded text-[10px]">
                                                            {sup.semApr} sem APR
                                                          </span>
                                                        )}
                                                        <span className="text-white font-bold bg-[#660099] px-2 py-0.5 rounded text-[10px]">
                                                          {sup.totalAprs} APRs
                                                        </span>
                                                      </div>
                                                    </button>

                                                    {/* NÍVEL 4: TÉCNICOS / COLABORADORES SOB ESTA SUPERVISÃO */}
                                                    {isSupExpanded && (
                                                      <div className="p-2.5 overflow-x-auto">
                                                        <table className="w-full text-left text-xs">
                                                          <thead>
                                                            <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                                              <th className="py-1 px-2">Colaborador</th>
                                                              <th className="py-1 px-2">Matrícula</th>
                                                              <th className="py-1 px-2">Cargo</th>
                                                              <th className="py-1 px-2">Cidade</th>
                                                              <th className="py-1 px-2 text-center">APRs</th>
                                                              <th className="py-1 px-2 text-center">Tempo Médio</th>
                                                              <th className="py-1 px-2 text-right">Status</th>
                                                            </tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                                                            {sup.colaboradores.map(c => (
                                                              <tr key={c.name + c.matricula} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="py-1.5 px-2 font-medium text-gray-900 dark:text-white">
                                                                  {c.name}
                                                                </td>
                                                                <td className="py-1.5 px-2 text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                                                                  {c.matricula}
                                                                </td>
                                                                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-300 text-[11px]">
                                                                  {c.cargo}
                                                                </td>
                                                                <td className="py-1.5 px-2 text-gray-500 dark:text-gray-400">
                                                                  {c.cidade}
                                                                </td>
                                                                <td className="py-1.5 px-2 text-center font-bold text-gray-900 dark:text-white">
                                                                  {c.count}
                                                                </td>
                                                                <td className="py-1.5 px-2 text-center text-gray-500 dark:text-gray-400">
                                                                  {c.avgDuration}
                                                                </td>
                                                                <td className="py-1.5 px-2 text-right">
                                                                  {c.count > 0 ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                      <CheckCircle2 size={10} /> Ativo
                                                                    </span>
                                                                  ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                                                                      <AlertTriangle size={10} /> Sem APR
                                                                    </span>
                                                                  )}
                                                                </td>
                                                               </tr>
                                                            ))}
                                                          </tbody>
                                                        </table>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-[#0f172a] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div>
              Total auditado na visualização: <strong>{totalColaboradores}</strong> colaboradores ({totalComApr} ativos / {totalSemApr} sem APR) • <strong>{totalAprs}</strong> APRs consolidadas.
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl transition-all"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
