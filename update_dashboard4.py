import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Icons import
content = content.replace("import { ChevronDown, Search, CheckSquare, Square, FileText, Building, MapPin, Users, HelpCircle, X, Download, UserCheck, Clock } from 'lucide-react';", "import { ChevronDown, Search, CheckSquare, Square, FileText, Building, MapPin, Users, HelpCircle, X, Download, UserCheck, Clock, Settings, UploadCloud, Lock } from 'lucide-react';")

# 2. State
state_old = """  const [selectedAuditores, setSelectedAuditores] = useState<string[]>([]);"""
state_new = """  const [selectedAuditores, setSelectedAuditores] = useState<string[]>([]);

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
  };"""
content = content.replace(state_old, state_new)

# 3. Header UI
header_old = """          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-[#660099] hover:text-[#660099] hover:shadow-md transition-all font-medium text-xs text-gray-700"
          >
            <Download size={14} /> Exportar XLSX
          </button>"""
header_new = """          <div className="flex items-center gap-3">
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
          </div>"""
content = content.replace(header_old, header_new)

# 4. Modal UI
modal_old = """      </AnimatePresence>

    </div>
  );
}"""
modal_new = """      </AnimatePresence>

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
}"""
content = content.replace(modal_old, modal_new)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated page.tsx with Admin UI")
