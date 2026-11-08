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
}

interface KpiGridProps {
  items: KpiItem[];
}

export const KpiGrid: React.FC<KpiGridProps> = ({ items }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {items.map((kpi, i) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          key={kpi.l}
          className={`bg-white dark:bg-[#151d2f] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 border-l-4 ${kpi.c} shadow-sm hover:shadow-md transition-all group flex justify-between items-center`}
        >
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 group-hover:scale-105 transform origin-left transition-transform">
              {kpi.v}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {kpi.l}
            </div>
          </div>
          <div className={`opacity-20 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 ${kpi.t}`}>
            <kpi.icon size={36} strokeWidth={1.5} />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

