import { parseCost, parseDate } from '../manutencoes/maintenance';
import { LocalDataError } from '../../services/errors';

export type FuelRecord = {
  id: string; vehicleId: string; date: string; cost: number;
  startKm: number; endKm: number; liters: number; createdAt: string;
};
export type FuelValues = { vehicleId: string; date: string; cost: string; startKm: string; endKm: string; liters: string };
export type FuelErrors = Partial<Record<keyof FuelValues, string>>;
export function parseLiters(value: string): number | null {
  if (!/^\d+(?:[,.]\d{1,3})?$/.test(value.trim())) return null;
  const liters: number = Number(value.trim().replace(',', '.'));
  return liters > 0 && liters <= 99999 ? liters : null;
}
export function validateFuel(values: FuelValues, today: Date = new Date()): FuelErrors {
  const errors: FuelErrors = {};
  const date: string | null = parseDate(values.date);
  const todayKey: string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (!date || date > todayKey) errors.date = 'Informe uma data válida, até hoje, no formato dd/mm/aaaa.';
  if (!values.vehicleId) errors.vehicleId = 'Selecione um veículo.';
  const cost: number | null = parseCost(values.cost);
  if (cost === null || cost <= 0) errors.cost = 'Informe um valor maior que zero, com até duas casas decimais.';
  for (const field of ['startKm', 'endKm'] as const) {
    if (!/^\d+$/.test(values[field]) || Number(values[field]) > 2147483647) errors[field] = 'Informe uma quilometragem inteira entre 0 e 2.147.483.647.';
  }
  if (!errors.startKm && !errors.endKm && Number(values.endKm) <= Number(values.startKm)) errors.endKm = 'A quilometragem final deve ser maior que a inicial.';
  if (parseLiters(values.liters) === null) errors.liters = 'Informe de 0,001 a 99.999 litros, com até três casas decimais.';
  return errors;
}
export function validateFuelRecord(record: FuelRecord): FuelRecord {
  const values: FuelValues = { vehicleId: record.vehicleId, date: record.date.split('-').reverse().join('/'),
    cost: String(record.cost).replace('.', ','), startKm: String(record.startKm), endKm: String(record.endKm), liters: String(record.liters) };
  if (Object.keys(validateFuel(values)).length || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)
    || !/^[a-zA-Z0-9_-]{1,128}$/.test(record.id) || !Number.isFinite(Date.parse(record.createdAt))) {
    throw new LocalDataError('validation', 'Revise os dados do abastecimento.');
  }
  return record;
}
export function fuelMetrics(records: readonly FuelRecord[]): { distance: number; liters: number; cost: number; kmPerLiter: number } {
  const distance: number = records.reduce((sum: number, record: FuelRecord): number => sum + record.endKm - record.startKm, 0);
  const liters: number = records.reduce((sum: number, record: FuelRecord): number => sum + record.liters, 0);
  const cost: number = records.reduce((sum: number, record: FuelRecord): number => sum + Math.round(record.cost * 100), 0) / 100;
  return { distance, liters, cost, kmPerLiter: liters ? distance / liters : 0 };
}
