import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State
content = content.replace("const [selectedCities, setSelectedCities] = useState<string[]>([]);", "const [selectedCities, setSelectedCities] = useState<string[]>([]);\n  const [selectedAuditores, setSelectedAuditores] = useState<string[]>([]);")

# 2. Cascading Filters
cascading_old = """  const allCities = useMemo(() => {
    const base = data.filter(i => 
      (selectedMonths.length === 0 || selectedMonths.includes(String(i['Mês']))) &&
      (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(i['Questionário']))) &&
      (selectedDiretorias.length === 0 || selectedDiretorias.includes(i['DIRETORIA 3'])) &&
      (selectedSupervisors.length === 0 || selectedSupervisors.includes(i['Supervisor'] || i['SUPERVISOR'] || i['GESTOR']))
    );
    return Array.from(new Set(base.map(i => i['CIDADE COMERCIAL']))).filter(Boolean).sort();
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors]);"""

cascading_new = """  const allCities = useMemo(() => {
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
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities]);"""

content = content.replace(cascading_old, cascading_new)

# 3. Clear Filters
content = content.replace("setSelectedCities([]);", "setSelectedCities([]);\n    setSelectedAuditores([]);")

# 4. Filtered Data
filtered_old = """  const filteredData = useMemo(() => {
    return data.filter(item => {
      return (selectedMonths.length === 0 || selectedMonths.includes(String(item['Mês']))) &&
             (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(item['Questionário']))) &&
             (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 3'])) &&
             (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'] || item['SUPERVISOR'] || item['GESTOR'])) &&
             (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL']));
    });
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities]);"""

filtered_new = """  const filteredData = useMemo(() => {
    return data.filter(item => {
      return (selectedMonths.length === 0 || selectedMonths.includes(String(item['Mês']))) &&
             (selectedTipos.length === 0 || selectedTipos.includes(cleanTipo(item['Questionário']))) &&
             (selectedDiretorias.length === 0 || selectedDiretorias.includes(item['DIRETORIA 3'])) &&
             (selectedSupervisors.length === 0 || selectedSupervisors.includes(item['Supervisor'] || item['SUPERVISOR'] || item['GESTOR'])) &&
             (selectedCities.length === 0 || selectedCities.includes(item['CIDADE COMERCIAL'])) &&
             (selectedAuditores.length === 0 || selectedAuditores.includes(item['Nome Auditor'] || item['Matrícula Auditor']));
    });
  }, [data, selectedMonths, selectedTipos, selectedDiretorias, selectedSupervisors, selectedCities, selectedAuditores]);"""

content = content.replace(filtered_old, filtered_new)

# 5. UI elements
select_old = """<PremiumMultiSelect label="Cidade" options={allCities} selected={selectedCities} onChange={handleMultiSelect(setSelectedCities)} icon={MapPin} />"""
select_new = """<PremiumMultiSelect label="Cidade" options={allCities} selected={selectedCities} onChange={handleMultiSelect(setSelectedCities)} icon={MapPin} />
            <PremiumMultiSelect label="Colaborador" options={allAuditores} selected={selectedAuditores} onChange={handleMultiSelect(setSelectedAuditores)} icon={UserCheck} />"""
content = content.replace(select_old, select_new)

clear_old = """selectedCities.length > 0) && ("""
clear_new = """selectedCities.length > 0 || selectedAuditores.length > 0) && ("""
content = content.replace(clear_old, clear_new)


with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated page.tsx with Auditor filter")
