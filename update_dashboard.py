import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add helpers
helpers = """const monthMap: Record<string, string> = {
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
"""
content = re.sub(r'const monthMap: Record<string, string> = \{.*?};\n', helpers, content, flags=re.DOTALL)

# 2. State
content = content.replace("const [visao, setVisao] = useState('c'); // c: cidade, d: diretoria, t: supervisor", "const [selectedTipos, setSelectedTipos] = useState<string[]>([]);")

# 3. Cascading Filters
cascading_old = """  const allDiretorias = useMemo(() => {
    const base = data.filter(i => selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês'])));
    return Array.from(new Set(base.map(i => i['DIRETORIA 3']))).filter(Boolean).sort();
  }, [data, selectedMonths]);

  const allSupervisors = useMemo(() => {
    const base = data.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3']))
    );
    return Array.from(new Set(base.map(i => i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedDiretorias]);

  const allCities = useMemo(() => {
    const base = data.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR']))
    );
    return Array.from(new Set(base.map(i => i['CIDADE COMERCIAL']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedDiretorias, selectedSupervisors]);"""

cascading_new = """  const allTipos = useMemo(() => {
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
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors]);"""
content = content.replace(cascading_old, cascading_new)

# 4. Clear filters
content = content.replace("setSelectedMonths([]);\n    setSelectedDiretorias", "setSelectedMonths([]);\n    setSelectedTipos([]);\n    setSelectedDiretorias")

# 5. Filtered Data
filtered_old = """  const filteredData = useMemo(() => {
    return data.filter(item => {
      return (selectedMonths.length === 0 || selectedMonths.includes(String(item['Mês']))) &&
             (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 3'])) &&
             (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'] || item['SUPERVISOR'] || item['GESTOR'])) &&
             (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL']));
    });
  }, [data, selectedMonths, selectedDiretorias, selectedSupervisors, selectedCities]);"""

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

# 6. Main Agg
main_old = """  const mainAgg = useMemo(() => {
    const agg: Record<string, number> = {};
    const field = visao === 'c' ? 'CIDADE COMERCIAL' : visao === 'd' ? 'DIRETORIA 3' : 'GESTOR';
    filteredData.forEach(item => {
      let val = item[field] || item['SUPERVISOR'] || item['Supervisor'] || 'Não Identificado';
      if (visao === 't') {
        val = item['Supervisor'] || item['SUPERVISOR'] || item['GESTOR'] || 'Não Identificado';
      }
      agg[val] = (agg[val] || 0) + 1;
    });
    return Object.entries(agg).sort((a, b) => b[1] - a[1]);
  }, [filteredData, visao]);"""

main_new = """  const mainAgg = useMemo(() => {
    const agg: Record<string, number> = {};
    filteredData.forEach(item => {
      let val = cleanTipo(item['Questionário']);
      agg[val] = (agg[val] || 0) + 1;
    });
    return Object.entries(agg).sort((a, b) => b[1] - a[1]);
  }, [filteredData]);"""
content = content.replace(main_old, main_new)

# 7. UI Select
select_old = """            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Visão Principal</span>
              <div className="relative">
                <select 
                  value={visao} onChange={e => setVisao(e.target.value)}
                  className="appearance-none px-3 py-1.5 w-60 bg-white border border-gray-200 rounded-xl shadow-sm text-xs font-medium text-gray-700 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all cursor-pointer"
                >
                  <option value="c">Por Cidade</option>
                  <option value="d">Por Diretoria</option>
                  <option value="t">Por Supervisor</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>"""
select_new = """            <PremiumMultiSelect label="Tipo de APR" options={allTipos} selected={selectedTipos} onChange={handleMultiSelect(setSelectedTipos)} icon={FileText} />"""
content = content.replace(select_old, select_new)

# 8. Clear Button
content = content.replace("selectedMonths.length > 0 || selectedDiretorias", "selectedMonths.length > 0 || selectedTipos.length > 0 || selectedDiretorias")

# 9. Main Agg UI
title_old = """            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {visao === 'c' && "Distribuição por Cidade"}
              {visao === 'd' && "Distribuição por Diretoria"}
              {visao === 't' && "Distribuição por Supervisor"}
            </h2>"""
title_new = """            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Distribuição por Tipo
            </h2>"""
content = content.replace(title_old, title_new)

onclick_old = """                    onClick={() => {
                      if (visao === 'c') handleMultiSelect(setSelectedCities)(name);
                      if (visao === 'd') handleMultiSelect(setSelectedDiretorias)(name);
                      if (visao === 't') handleMultiSelect(setSelectedSupervisors)(name);
                    }}"""
onclick_new = """                    onClick={() => handleMultiSelect(setSelectedTipos)(name)}"""
content = content.replace(onclick_old, onclick_new)

# 10. Modal Date Format
content = content.replace(">{apr['Data Início'] || '-'}</td>", ">{formatDate(apr['Data Início'])}</td>")
content = content.replace(">{apr['Questionário'] || '-'}</div>", ">{cleanTipo(apr['Questionário'])}</div>")


with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated page.tsx")
