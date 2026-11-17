// Utilitários de mês/valor usados nas dívidas (visão geral e reajuste progressivo).

// "2026-11" -> índice absoluto de mês (ano*12 + mês-1), pra calcular distância entre meses.
export const monthIndex = (yyyyMm: string): number => {
  const [y, m] = yyyyMm.split('-').map(Number);
  return y * 12 + (m - 1);
};

export const monthsBetween = (fromYyyyMm: string, toYyyyMm: string): number =>
  monthIndex(toYyyyMm) - monthIndex(fromYyyyMm);

export const roundCents = (value: number): number => Math.round(value * 100) / 100;

// Valor progressivo: base no mês inicial, + incremento a cada mês seguinte.
export const progressiveValue = (base: number, increment: number, offsetMonths: number): number =>
  roundCents(base + increment * offsetMonths);
