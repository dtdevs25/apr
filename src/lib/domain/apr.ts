/**
 * Regras de Negócio e Funções de Domínio do Módulo APR (Análise Preliminar de Riscos)
 */

export const APR_MONTH_MAP: Record<string, string> = {
  '1': 'Jan', '2': 'Fev', '3': 'Mar', '4': 'Abr', '5': 'Mai', '6': 'Jun',
  '7': 'Jul', '8': 'Ago', '9': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set'
};

/**
 * Tabela corporativa de dias úteis por mês
 */
export const WORKING_DAYS_BY_MONTH: Record<number, number> = {
  1: 22, 2: 20, 3: 22, 4: 21, 5: 21, 6: 22,
  7: 23, 8: 21, 9: 22, 10: 22, 11: 21, 12: 23
};

export function getWorkingDays(month: number): number {
  return WORKING_DAYS_BY_MONTH[month] || 22;
}

/**
 * Meta individual esperada de APR:
 * 2 APRs por dia útil trabalhado no período filtrado
 */
export function calculateAprTarget(selectedMonths: string[], allMonths: string[]): number {
  const monthsToConsider = selectedMonths.length > 0 ? selectedMonths : allMonths;
  let totalWorkingDays = 0;
  monthsToConsider.forEach(m => {
    totalWorkingDays += getWorkingDays(parseInt(m, 10));
  });
  return totalWorkingDays * 2;
}

/**
 * Normaliza o nome do questionário/tipo de atividade de APR
 */
export function cleanTipo(str: string): string {
  if (!str) return 'Não Identificado';
  const parts = String(str).split('|');
  const last = parts[parts.length - 1] || parts[0];
  return last.trim();
}

/**
 * Converte duração string (HH:MM:SS) em segundos totais
 */
export function parseDurationToSeconds(durationStr: any): number {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':');
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
      return h * 3600 + m * 60 + s;
    }
  }
  return 0;
}

/**
 * Regra anti-outlier: Desconsidera durações maiores que 10 minutos (600s)
 * para não distorcer o cálculo do tempo médio.
 */
export function isDurationValid(secs: number): boolean {
  return secs > 0 && secs <= 600;
}

/**
 * Formata segundos no padrão textual amigável (ex: '3m 45s')
 */
export function formatAvgTimeStr(totalSecs: number, validCount: number): string {
  const avgSecs = validCount > 0 ? Math.round(totalSecs / validCount) : 0;
  if (avgSecs === 0) return '0s';
  if (avgSecs < 60) return `${avgSecs}s`;
  if (avgSecs < 3600) return `${Math.floor(avgSecs / 60)}m ${avgSecs % 60}s`;
  return `${Math.floor(avgSecs / 3600)}h ${Math.floor((avgSecs % 3600) / 60)}m`;
}

/**
 * Formata segundos no padrão estrito HH:MM:SS para relatórios e Excel
 */
export function formatSecondsToHMS(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formata data ISO ou BR para exibição
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const [datePart] = dateStr.split(' ');
    if (datePart.includes('/')) return dateStr;
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formata número no padrão brasileiro (ex: 1.234)
 */
export function formatNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

/**
 * Classifica a situação do técnico em relação à meta
 */
export function classifyAprSituation(count: number, expected: number): 'Sem APR' | 'Meta Atingida' | 'Abaixo da Meta' {
  if (count === 0) return 'Sem APR';
  if (count >= expected) return 'Meta Atingida';
  return 'Abaixo da Meta';
}

