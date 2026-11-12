"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, ShieldAlert, Sun, Moon, Award, ExternalLink } from 'lucide-react';
import { AprDashboard } from '@/components/apr/AprDashboard';
import { DssDashboard } from '@/components/dss/DssDashboard';
import { RankingPresentationView, RankingViewKey } from '@/components/ranking/RankingPresentationView';

export default function Home() {
  const [selectedModule, setSelectedModule] = useState<'APR' | 'DSS' | null>(null);
  const [selectedRanking, setSelectedRanking] = useState<RankingViewKey | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('vivo_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeDark = saved ? saved === 'dark' : prefersDark;
    setIsDark(activeDark);
    if (activeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('vivo_theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  if (selectedRanking) {
    return (
      <RankingPresentationView 
        initialView={selectedRanking} 
        onBack={() => setSelectedRanking(null)} 
        isDark={isDark} 
        toggleTheme={toggleTheme} 
      />
    );
  }

  if (selectedModule === 'APR') {
    return <AprDashboard onBack={() => setSelectedModule(null)} isDark={isDark} toggleTheme={toggleTheme} />;
  }

  if (selectedModule === 'DSS') {
    return <DssDashboard onBack={() => setSelectedModule(null)} isDark={isDark} toggleTheme={toggleTheme} />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b0f19] flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-200">
      {/* Botão de Tema no Splash */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-amber-400 shadow-sm hover:shadow transition-all"
          title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {isDark ? <Sun size={18} className="text-amber-400 animate-spin-slow" /> : <Moon size={18} className="text-purple-700" />}
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            {isDark ? "Modo Claro" : "Modo Escuro"}
          </span>
        </button>
      </div>

      {/* Background Decorativo Premium com Púrpura Vivo */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#660099]/15 dark:bg-[#660099]/20 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#8000bf]/15 dark:bg-[#8000bf]/20 rounded-full blur-[130px] pointer-events-none"></div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12 z-10">
        <img src="/icone.png" alt="Vivo" className="h-14 object-contain mx-auto mb-6 drop-shadow-sm" />
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">Painel de Liderança</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Selecione o módulo que deseja visualizar e gerenciar</p>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl z-10 mb-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedModule('APR')}
          className="bg-white/80 dark:bg-[#151d2f]/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_40px_rgba(102,0,153,0.18)] dark:hover:shadow-[0_20px_40px_rgba(102,0,153,0.3)] border border-white/40 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-500 cursor-pointer transition-all flex flex-col items-center text-center group"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/60 dark:to-purple-900/40 text-[#660099] dark:text-purple-400 rounded-2xl flex items-center justify-center mb-5 group-hover:from-[#660099] group-hover:to-[#8000bf] group-hover:text-white transition-all duration-300 shadow-sm">
            <FileText size={40} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">APR</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Análise Preliminar de Riscos</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedModule('DSS')}
          className="bg-white/80 dark:bg-[#151d2f]/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_40px_rgba(102,0,153,0.18)] dark:hover:shadow-[0_20px_40px_rgba(102,0,153,0.3)] border border-white/40 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-500 cursor-pointer transition-all flex flex-col items-center text-center group"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/60 dark:to-purple-900/40 text-[#660099] dark:text-purple-400 rounded-2xl flex items-center justify-center mb-5 group-hover:from-[#660099] group-hover:to-[#8000bf] group-hover:text-white transition-all duration-300 shadow-sm">
            <ShieldAlert size={40} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">DSS</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Diálogo Semanal de Segurança</p>
        </motion.div>
      </div>

      {/* Links Individuais para Apresentações Executivas */}
      <motion.div
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="w-full max-w-2xl bg-white/80 dark:bg-[#151d2f]/80 backdrop-blur-xl p-5 rounded-3xl shadow-md border border-gray-200 dark:border-gray-800 z-10 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-[#660099] dark:text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Páginas de Apresentação Direta • Outubro/2026
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">1 página e link para cada</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setSelectedRanking('apr-interior')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200/60 dark:border-purple-800/40 text-[#660099] dark:text-purple-300 transition-all group"
          >
            <FileText size={18} className="mb-1 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black">APR Interior</span>
            <span className="text-[10px] text-gray-400 font-normal">Link exclusivo</span>
          </button>

          <button
            onClick={() => setSelectedRanking('dss-interior')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200/60 dark:border-purple-800/40 text-[#660099] dark:text-purple-300 transition-all group"
          >
            <ShieldAlert size={18} className="mb-1 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black">DSS Interior</span>
            <span className="text-[10px] text-gray-400 font-normal">Link exclusivo</span>
          </button>

          <button
            onClick={() => setSelectedRanking('apr-capital')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200/60 dark:border-purple-800/40 text-[#660099] dark:text-purple-300 transition-all group"
          >
            <FileText size={18} className="mb-1 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black">APR Capital</span>
            <span className="text-[10px] text-gray-400 font-normal">Link exclusivo</span>
          </button>

          <button
            onClick={() => setSelectedRanking('dss-capital')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200/60 dark:border-purple-800/40 text-[#660099] dark:text-purple-300 transition-all group"
          >
            <ShieldAlert size={18} className="mb-1 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black">DSS Capital</span>
            <span className="text-[10px] text-gray-400 font-normal">Link exclusivo</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
