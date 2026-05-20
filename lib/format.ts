// Formatadores e utilitários de data compartilhados pelo app.

export const formatBRL = (val: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const capitalize = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// "2026-05" -> "Maio de 2026"
export const formatMonthLabel = (yyyyMm: string): string => {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm || '—';
  const [y, m] = yyyyMm.split('-').map(Number);
  return capitalize(
    new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  );
};

// "2026-05" -> "Mai 2026"
export const formatMonthShort = (yyyyMm: string): string => {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return '—';
  const [y, m] = yyyyMm.split('-').map(Number);
  return capitalize(
    new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', ''),
  );
};

// "2026-05" -> "2026-04"
export const previousMonthOf = (yyyyMm: string): string => {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!y || !m) return yyyyMm;
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ISO datetime -> "YYYY-MM"
export const monthFromIso = (iso?: string): string => (iso ? iso.slice(0, 7) : '');

// Mês alvo + dia de hoje (clamp pro último dia do mês quando preciso).
// Útil pro `defaultMonth` do TransactionModal — quando o usuário está
// olhando outubro e abre um lançamento, a data já vem em outubro.
export const defaultDateForMonth = (yyyyMm?: string): string => {
  const today = new Date();
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) {
    return today.toISOString().slice(0, 10);
  }
  const [y, m] = yyyyMm.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(today.getDate(), lastDay);
  return `${yyyyMm}-${String(day).padStart(2, '0')}`;
};
