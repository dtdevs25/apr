"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, CheckSquare, Square } from 'lucide-react';

interface PremiumMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string) => void;
  icon: any;
  widthClass?: string;
}

export const PremiumMultiSelect: React.FC<PremiumMultiSelectProps> = ({ 
  label, 
  options, 
  selected, 
  onChange,
  icon: Icon,
  widthClass = 'w-72'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const isActive = selected.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between px-3 py-1.5 ${widthClass} bg-white dark:bg-[#1e293b] border rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 ${isActive ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'}`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Icon size={14} className={isActive ? 'text-[#660099] dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'} />
            <span className={`text-xs truncate font-medium ${isActive ? 'text-purple-900 dark:text-purple-200' : 'text-gray-700 dark:text-gray-300'}`}>
              {selected.length === 0 ? 'Todas opções...' : selected.length === 1 ? selected[0] : `${selected.length} selecionadas`}
            </span>
          </div>
          <ChevronDown size={14} className={isActive ? 'text-[#660099] dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }}
            className={`absolute z-50 top-[105%] left-0 ${widthClass} bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-xl border border-white/40 dark:border-gray-700 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10`}
          >
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-[#1e293b]/50">
              <div className="flex items-center bg-gray-100/80 dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 focus-within:border-purple-300 dark:focus-within:border-purple-500 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
                <Search size={14} className="text-gray-400 dark:text-gray-500 mr-2" />
                <input 
                  type="text" placeholder="Buscar..." 
                  className="bg-transparent border-none outline-none text-sm w-full text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin bg-white dark:bg-[#1e293b]">
              <div 
                onClick={() => onChange('ALL')}
                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors mb-1"
              >
                {selected.length === 0 ? <CheckSquare size={16} className="text-[#660099] dark:text-purple-400" /> : <Square size={16} className="text-gray-300 dark:text-gray-600" />}
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Selecionar Todas</span>
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-800 mb-1 mx-2"></div>
              {filteredOptions.length === 0 && <div className="text-center py-4 text-xs text-gray-400 dark:text-gray-500">Nenhuma opção encontrada</div>}
              {filteredOptions.map(opt => {
                const isSel = selected.includes(opt);
                return (
                  <div 
                    key={opt} onClick={() => onChange(opt)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSel ? 'bg-purple-50 dark:bg-purple-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/80'}`}
                  >
                    {isSel ? <CheckSquare size={16} className="text-[#660099] dark:text-purple-400" /> : <Square size={16} className="text-gray-300 dark:text-gray-600" />}
                    <span className={`text-sm truncate ${isSel ? 'text-purple-900 dark:text-purple-300 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>{opt}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
