"use client";
import React from 'react';
import { ArrowLeft, Download, Settings, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  title: string;
  onBack: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  onExportExcel: () => void;
  onOpenAdmin: () => void;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  isDark,
  toggleTheme,
  onExportExcel,
  onOpenAdmin,
  children
}) => {
  return (
    <header className="bg-white dark:bg-[#151d2f] border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-[#660099] dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-700 transition-all shadow-sm"
            title="Voltar aos Módulos"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <img src="/icone.png" alt="Vivo" className="h-7 object-contain" />
            <span className="h-5 w-px bg-gray-300 dark:bg-gray-700 ml-1"></span>
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 text-gray-600 dark:text-amber-400 transition-all shadow-sm"
            title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={onExportExcel}
            className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#660099] dark:hover:border-purple-400 hover:text-[#660099] dark:hover:text-purple-400 hover:shadow-md transition-all font-medium text-xs text-gray-700 dark:text-gray-200"
          >
            <Download size={14} /> Exportar XLSX
          </button>
          <button
            onClick={onOpenAdmin}
            className="flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white transition-all text-gray-500 dark:text-gray-400 shadow-sm"
            title="Administração"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {children && (
        <div className="bg-gray-50/50 dark:bg-[#0f172a]/70 backdrop-blur-md border-t border-gray-100 dark:border-gray-800/80">
          <div className="max-w-[1600px] mx-auto px-6 py-2 flex flex-wrap items-center gap-4">
            {children}
          </div>
        </div>
      )}
    </header>
  );
};

