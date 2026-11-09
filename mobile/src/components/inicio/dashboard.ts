import type { Maintenance } from '../manutencoes/maintenance';
import type { FuelRecord } from '../consumo/fuel';

export type Period = 'month' | 'six' | 'year' | 'all';
export const periods: { id: Period; label: string }[] = [
  { id: 'month', label: 'Este mês' }, { id: 'six', label: '6 meses' },
  { id: 'year', label: 'Este ano' }, { id: 'all', label: 'Histórico' },
];
export type Month = { key: string; maintenance: number; fuel: number; distance: number; liters: number; count: number };
export type Expense = { id: string; date: string; cost: number; label: string };
export type DashboardData = {
  months: Month[]; maintenanceCost: number; fuelCost: number; total: number; average: number;
  kmPerLiter: number | null; costPerKm: number | null; accumulated: number;
  hasHistory: boolean; recent: Expense[];
};
const monthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const cents = (value: number): number => Math.round(value * 100);

export function dashboard(records: readonly Maintenance[], fuels: readonly FuelRecord[], vehicleId: string, period: Period, now: Date = new Date()): DashboardData {
  const today: string = `${monthKey(now)}-${String(now.getDate()).padStart(2, '0')}`;
  const maintenance: Maintenance[] = records.filter((r: Maintenance): boolean => r.vehicleId === vehicleId && r.date <= today);
  const fuel: FuelRecord[] = fuels.filter((r: FuelRecord): boolean => r.vehicleId === vehicleId && r.date <= today);
  const dates: string[] = [...maintenance, ...fuel].map((r): string => r.date).sort();
  const first: string = dates[0]?.slice(0, 7) ?? monthKey(now);
  const start: Date = period === 'six' ? new Date(now.getFullYear(), now.getMonth() - 5, 1)
    : period === 'year' ? new Date(now.getFullYear(), 0, 1)
      : period === 'all' ? new Date(Number(first.slice(0, 4)), Number(first.slice(5, 7)) - 1, 1)
        : new Date(now.getFullYear(), now.getMonth(), 1);
  const months: Month[] = [];
  for (const cursor: Date = new Date(start); monthKey(cursor) <= monthKey(now); cursor.setMonth(cursor.getMonth() + 1)) {
    months.push({ key: monthKey(cursor), maintenance: 0, fuel: 0, distance: 0, liters: 0, count: 0 });
  }
  const buckets: Map<string, Month> = new Map(months.map((m: Month): [string, Month] => [m.key, m]));
  const recent: Expense[] = [];
  for (const r of maintenance) {
    const bucket: Month | undefined = buckets.get(r.date.slice(0, 7));
    if (!bucket) continue;
    bucket.maintenance += cents(r.cost); bucket.count++;
    recent.push({ id: `maintenance-${r.id}`, date: r.date, cost: r.cost, label: r.category });
  }
  for (const r of fuel) {
    const bucket: Month | undefined = buckets.get(r.date.slice(0, 7));
    if (!bucket) continue;
    bucket.fuel += cents(r.cost); bucket.count++; bucket.distance += r.endKm - r.startKm; bucket.liters += r.liters;
    recent.push({ id: `fuel-${r.id}`, date: r.date, cost: r.cost, label: 'Abastecimento' });
  }
  const maintenanceCost: number = months.reduce((sum: number, m: Month): number => sum + m.maintenance, 0) / 100;
  const fuelCost: number = months.reduce((sum: number, m: Month): number => sum + m.fuel, 0) / 100;
  const distance: number = months.reduce((sum: number, m: Month): number => sum + m.distance, 0);
  const liters: number = months.reduce((sum: number, m: Month): number => sum + m.liters, 0);
  return { months, maintenanceCost, fuelCost, total: maintenanceCost + fuelCost,
    average: (maintenanceCost + fuelCost) / months.length, kmPerLiter: liters ? distance / liters : null,
    costPerKm: distance ? fuelCost / distance : null,
    accumulated: [...maintenance, ...fuel].reduce((sum: number, r): number => sum + cents(r.cost), 0) / 100,
    hasHistory: dates.length > 0, recent: recent.sort((a: Expense, b: Expense): number => b.date.localeCompare(a.date)),
  };
}
