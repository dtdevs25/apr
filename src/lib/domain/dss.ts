/**
 * Regras de Negócio e Funções de Domínio do Módulo DSS (Diálogo Semanal de Segurança)
 */

export const DSS_MONTH_MAP: Record<string, string> = {
  '1': 'Jan', '2': 'Fev', '3': 'Mar', '4': 'Abr', '5': 'Mai', '6': 'Jun',
  '7': 'Jul', '8': 'Ago', '9': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set'
};

/**
 * Tabela corporativa de semanas por mês
 */
export const WORKING_WEEKS_BY_MONTH: Record<number, number> = {
  1: 4.4, 2: 4.0, 3: 4.4, 4: 4.2, 5: 4.2, 6: 4.4,
  7: 4.6, 8: 4.2, 9: 4.4, 10: 4.4, 11: 4.2, 12: 4.6
};

export function getWorkingWeeks(month: number): number {
  return Math.floor(WORKING_WEEKS_BY_MONTH[month] || 4);
}

/**
 * Meta individual esperada de DSS:
 * 1 DSS por semana por líder no período filtrado
 */
export function calculateDssTarget(selectedMonths: string[], allMonths: string[]): number {
  const monthsToConsider = selectedMonths.length > 0 ? selectedMonths : allMonths;
  let totalWeeks = 0;
  monthsToConsider.forEach(m => {
    totalWeeks += getWorkingWeeks(parseInt(m, 10));
  });
  return totalWeeks * 1;
}

/**
 * Classifica a situação da liderança ou técnico em relação à meta de DSS
 */
export function classifyDssSituation(count: number, expected: number): 'Meta Atingida' | 'Abaixo da Meta' {
  if (count >= expected) return 'Meta Atingida';
  return 'Abaixo da Meta';
}

/**
 * Formata número no padrão brasileiro
 */
export function formatNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

