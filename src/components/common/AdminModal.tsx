"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, UploadCloud, Users, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessUpload?: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, onSuccessUpload }) => {
  const [adminAction, setAdminAction] = useState<'apr' | 'plano' | 'spi' | 'dss' | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminAuthStatus, setAdminAuthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [uploadStatus, setUploadStatus] = useState('');

  const handleClose = () => {
    setAdminAction(null);
    setAdminPassword('');
    setAdminAuthStatus('idle');
    setUploadStatus('');
    onClose();
  };

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
      if (adminAction === 'spi') endpoint = '/api/admin/upload-spi';
      if (adminAction === 'dss') endpoint = '/api/admin/upload-dss';
      
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      if (res.ok) {
        const dataRes = await res.json();
        setUploadStatus(dataRes.message || 'Upload e importação concluídos com sucesso!');
        if (onSuccessUpload) onSuccessUpload();
      } else {
        const dataRes = await res.json().catch(() => ({}));
        setUploadStatus(dataRes.message || 'Erro na importação.');
      }
    } catch {
      setUploadStatus('Erro na requisição.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#151d2f] rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors"
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="text-gray-600 dark:text-gray-400" size={20} />
              Administração de Dados
            </h3>
            <button 
              onClick={handleClose} 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6">
            {!adminAction ? (
              <div className="flex flex-col gap-3">
                <button onClick={() => setAdminAction('apr')} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#660099] dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all group">
                  <div className="p-2 bg-purple-100 dark:bg-purple-950/50 rounded-lg group-hover:bg-[#660099] text-[#660099] dark:text-purple-400 group-hover:text-white transition-colors"><UploadCloud size={20} /></div>
                  <div className="text-left"><p className="font-bold text-gray-900 dark:text-white">Importar APRs</p><p className="text-xs text-gray-500 dark:text-gray-400">Subir nova planilha XLSX ou CSV de APRs (SP)</p></div>
                </button>
                <button onClick={() => setAdminAction('plano')} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all group">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950/50 rounded-lg group-hover:bg-blue-600 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors"><Users size={20} /></div>
                  <div className="text-left"><p className="font-bold text-gray-900 dark:text-white">Importar Plano de Ocupações</p><p className="text-xs text-gray-500 dark:text-gray-400">Atualizar lista de colaboradores e diretorias (SP)</p></div>
                </button>
                <button onClick={() => setAdminAction('spi')} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-600 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-all group">
                  <div className="p-2 bg-teal-100 dark:bg-teal-950/50 rounded-lg group-hover:bg-teal-600 text-teal-600 dark:text-teal-400 group-hover:text-white transition-colors"><Settings size={20} /></div>
                  <div className="text-left"><p className="font-bold text-gray-900 dark:text-white">Ajuste SP Interior (PO SPI)</p><p className="text-xs text-gray-500 dark:text-gray-400">Planilha de correção de gestores do Interior</p></div>
                </button>
                <button onClick={() => setAdminAction('dss')} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all group">
                  <div className="p-2 bg-orange-100 dark:bg-orange-950/50 rounded-lg group-hover:bg-orange-500 text-orange-600 dark:text-orange-400 group-hover:text-white transition-colors"><ShieldAlert size={20} /></div>
                  <div className="text-left"><p className="font-bold text-gray-900 dark:text-white">Importar DSS</p><p className="text-xs text-gray-500 dark:text-gray-400">Subir arquivo de Diálogos Semanais de Segurança</p></div>
                </button>
              </div>
            ) : adminAuthStatus !== 'success' ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/50 text-orange-500 rounded-full flex items-center justify-center mb-2"><Lock size={24} /></div>
                <h4 className="font-bold text-gray-900 dark:text-white">Acesso Restrito</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">Digite a senha de administrador para prosseguir com a importação.</p>
                <div className="relative w-full">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={adminPassword} 
                    onChange={e => setAdminPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdminAuth()}
                    placeholder="Senha" 
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#660099] focus:outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {adminAuthStatus === 'error' && <p className="text-xs text-red-500 font-semibold">Senha incorreta.</p>}
                <div className="flex gap-3 w-full mt-2">
                  <button onClick={() => setAdminAction(null)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Voltar</button>
                  <button onClick={handleAdminAuth} className="flex-1 py-2 bg-[#660099] text-white font-semibold rounded-xl hover:bg-[#8000bf] transition-colors">
                    {adminAuthStatus === 'loading' ? 'Verificando...' : 'Autenticar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2"><UploadCloud size={24} /></div>
                <h4 className="font-bold text-gray-900 dark:text-white">
                  {adminAction === 'apr' ? 'Upload de APRs' : adminAction === 'plano' ? 'Upload do Plano' : adminAction === 'spi' ? 'Upload SP Interior' : 'Upload de DSS'}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  {adminAction === 'dss' || adminAction === 'apr' ? 'Selecione o arquivo XLSX ou CSV para importar.' : 'Selecione o arquivo XLSX para importar os dados para o banco.'}
                </p>
                
                <label className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#660099] hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all">
                  <UploadCloud className="text-gray-400 mb-2" size={32} />
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Clique para selecionar o arquivo</span>
                  <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
                </label>

                {uploadStatus && (
                  <p className={`text-xs font-semibold text-center ${uploadStatus.includes('sucesso') ? 'text-green-600 dark:text-green-400' : uploadStatus.includes('Erro') ? 'text-red-500' : 'text-blue-600 dark:text-blue-400 animate-pulse'}`}>
                    {uploadStatus}
                  </p>
                )}

                <div className="flex gap-3 w-full mt-4">
                  <button onClick={() => setAdminAction(null)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Voltar</button>
                  <button onClick={handleClose} className="flex-1 py-2 bg-gray-900 dark:bg-gray-700 text-white font-semibold rounded-xl hover:bg-black transition-colors">Concluir</button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
