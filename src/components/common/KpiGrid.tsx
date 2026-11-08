"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface KpiItem {
  v: string | number;
  l: string;
  icon: LucideIcon;
  c: string;
  t: string;
  sub?: string;
  onClick?: () => void;
}

interface KpiGridProps {
  items: KpiItem[];
}

export const KpiGrid: React.FC<KpiGridProps> = ({ items }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {items.map((kpi, i) => {
        const isClickable = !!kpi.onClick;
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={kpi.l}
            onClick={kpi.onClick}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kpi.onClick!(); } } : undefined}
            className={`bg-white dark:bg-[#151d2f] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 border-l-4 ${kpi.c} shadow-sm hover:shadow-md transition-all group flex justify-between items-center relative overflow-hidden ${
              isClickable ? 'cursor-pointer hover:border-purple-300 dark:hover:border-purple-600 hover:scale-[1.01]' : ''
            }`}
          >
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 group-hover:scale-105 transform origin-left transition-transform">
                {kpi.v}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                <span>{kpi.l}</span>
                {isClickable && (
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                    Ver equipe
                  </span>
                )}
              </div>
              {kpi.sub && (
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium truncate max-w-[140px]" title={kpi.sub}>
                  {kpi.sub}
                </div>
              )}
            </div>
            <div className={`opacity-20 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 ${kpi.t}`}>
              <kpi.icon size={36} strokeWidth={1.5} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

