export const categories: readonly string[] = ['Preventiva', 'Corretiva', 'Pneus', 'Óleo e filtros', 'Outros'];
export type MaintenanceFormValues = { date: string; cost: string; category: string; mileage: string; details: string };
export type FormErrors = Partial<Record<keyof MaintenanceFormValues, string>>;
export type Invoice = { uri: string; name: string; size: number; unavailable?: boolean };
export type Maintenance = {
  id: string; vehicleId: string; date: string; cost: number; category: string;
  mileage: number; details: string; invoice: Invoice | null; createdAt: string;
};
export const moneyFormatter: Intl.NumberFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function parseCost(value: string): number | null {
  const normalized: string = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized)) return null;
  const amount: number = Number(normalized.replaceAll('.', '').replace(',', '.'));
  return Number.isFinite(amount) && amount <= 999999999.99 ? amount : null;
}

export function parseDate(value: string): string | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;
  const [day, month, year]: number[] = value.split('/').map(Number);
  const date: Date = new Date(year, month - 1, day);
  if (year < 1000 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function validateMaintenance(values: MaintenanceFormValues, today: Date = new Date()): FormErrors {
  const errors: FormErrors = {};
  const date: string | null = parseDate(values.date);
  const todayKey: string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (!date || date > todayKey) errors.date = 'Informe uma data válida, até hoje, no formato dd/mm/aaaa.';
  if (parseCost(values.cost) === null) errors.cost = 'Informe um valor de 0 a 999.999.999,99, com até duas casas decimais.';
  if (!categories.includes(values.category)) errors.category = 'Selecione uma categoria.';
  if (!/^\d+$/.test(values.mileage) || !Number.isSafeInteger(Number(values.mileage)) || Number(values.mileage) > 2147483647) {
    errors.mileage = 'Informe uma quilometragem inteira entre 0 e 2.147.483.647.';
  }
  if (values.details.length > 4000) errors.details = 'Use até 4.000 caracteres nos detalhes.';
  return errors;
}

export function validateInvoice(name: string, size: number, mimeType?: string): string | null {
  if (!name.toLowerCase().endsWith('.pdf') || (mimeType && mimeType !== 'application/pdf')) return 'Selecione um arquivo PDF.';
  if (!Number.isFinite(size) || size <= 0 || size > 10_000_000) return 'Selecione um PDF de até 10 MB, que não esteja vazio.';
  return null;
}

export function decodeMaintenance(text: string): Maintenance {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object') throw new Error('Registro inválido.');
  const record: Partial<Maintenance> = value;
  if (typeof record.id !== 'string' || typeof record.vehicleId !== 'string' || typeof record.date !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) || parseDate(record.date.split('-').reverse().join('/')) !== record.date
    || typeof record.cost !== 'number' || !Number.isFinite(record.cost) || record.cost < 0 || record.cost > 999999999.99
    || typeof record.category !== 'string' || !categories.includes(record.category)
    || typeof record.mileage !== 'number' || !Number.isSafeInteger(record.mileage) || record.mileage < 0
    || typeof record.details !== 'string' || typeof record.createdAt !== 'string'
    || !Number.isFinite(Date.parse(record.createdAt))) throw new Error('Registro inválido.');
  if (record.invoice !== null && (!record.invoice || typeof record.invoice.uri !== 'string'
    || typeof record.invoice.name !== 'string' || typeof record.invoice.size !== 'number'
    || validateInvoice(record.invoice.name, record.invoice.size))) throw new Error('Nota fiscal inválida.');
  return record as Maintenance;
}
