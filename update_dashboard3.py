import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update allAuditores
auditores_old = """  const allAuditores = useMemo(() => {
    const base = data.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => i['Nome Auditor'] || i['Matrícula Auditor']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities]);"""

auditores_new = """  const allAuditores = useMemo(() => {
    const base = data.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR'])) &&
      (selectedCities.length === 0 || selectedCities.includes(i['CIDADE COMERCIAL']))
    );
    return Array.from(new Set(base.map(i => i['Nome Auditor'] || i['Matrícula Auditor']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities]);"""
# Wait, actually we can just leave allAuditores as is. It's already filtering properly.
# But filteredData has selectedAuditores logic which I need to remove.

filtered_old = """  const filteredData = useMemo(() => {
    return data.filter(item => {
      return (selectedMonths.length === 0 || selectedMonths.includes(String(item['Mês']))) &&
             (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(item['Questionário']))) &&
             (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 3'])) &&
             (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'] || item['SUPERVISOR'] || item['GESTOR'])) &&
             (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL'])) &&
             (selectedAuditores.length === 0 || selectedAuditores.includes(item['Nome Auditor'] || item['Matrícula Auditor']));
    });
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities, selectedAuditores]);"""

filtered_new = """  const filteredData = useMemo(() => {
    return data.filter(item => {
      return (selectedMonths.length === 0 || selectedMonths.includes(String(item['Mês']))) &&
             (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(item['Questionário']))) &&
             (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 3'])) &&
             (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'] || item['SUPERVISOR'] || item['GESTOR'])) &&
             (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL']));
    });
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities]);"""

content = content.replace(filtered_old, filtered_new)


# 2. Update rankAgg
rank_old = """  // Rank list
  const rankAgg = useMemo(() => {
    const agg: Record<string, { count: number, name: string, data: any[], totalSecs: number, validCount: number }> = {};
    filteredData.forEach(item => {
      const mat = item['Matrícula Auditor'] || 'N/A';
      const name = item['Nome Auditor'] || mat;
      if (!agg[mat]) agg[mat] = { count: 0, name, data: [], totalSecs: 0, validCount: 0 };"""

rank_new = """  // Rank list
  const rankAgg = useMemo(() => {
    const agg: Record<string, { count: number, name: string, data: any[], totalSecs: number, validCount: number }> = {};
    filteredData.forEach(item => {
      const mat = item['Matrícula Auditor'] || 'N/A';
      const name = item['Nome Auditor'] || mat;
      if (selectedAuditores.length > 0 && !selectedAuditores.includes(name) && !selectedAuditores.includes(mat)) return;
      if (!agg[mat]) agg[mat] = { count: 0, name, data: [], totalSecs: 0, validCount: 0 };"""

content = content.replace(rank_old, rank_new)

# Update rankAgg deps
rank_deps_old = """    return Object.entries(agg).sort((a, b) => b[1].count - a[1].count).map(i => i[1]);
  }, [filteredData]);"""
rank_deps_new = """    return Object.entries(agg).sort((a, b) => b[1].count - a[1].count).map(i => i[1]);
  }, [filteredData, selectedAuditores]);"""
content = content.replace(rank_deps_old, rank_deps_new)

# 3. Update UI - remove from top bar
top_select_old = """<PremiumMultiSelect label="Cidade" options={allCities} selected={selectedCities} onChange={handleMultiSelect(setSelectedCities)} icon={MapPin} />
            <PremiumMultiSelect label="Colaborador" options={allAuditores} selected={selectedAuditores} onChange={handleMultiSelect(setSelectedAuditores)} icon={UserCheck} />"""

top_select_new = """<PremiumMultiSelect label="Cidade" options={allCities} selected={selectedCities} onChange={handleMultiSelect(setSelectedCities)} icon={MapPin} />"""
content = content.replace(top_select_old, top_select_new)

# 4. Update UI - add to ranking header
header_old = """<h2 className="text-lg font-bold text-gray-900 mb-4">Ranking de Colaboradores</h2>"""
header_new = """<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Ranking de Colaboradores</h2>
              <div className="z-20">
                <PremiumMultiSelect label="Filtrar Nome" options={allAuditores} selected={selectedAuditores} onChange={handleMultiSelect(setSelectedAuditores)} icon={UserCheck} widthClass="w-[280px]" />
              </div>
            </div>"""
content = content.replace(header_old, header_new)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated page.tsx with Auditor filter inside Ranking")
