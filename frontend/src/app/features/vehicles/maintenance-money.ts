/** Accept Brazilian currency and ungrouped decimal input without changing its magnitude. */
export function parseMaintenanceMoney(value: string): number | null {
  const text = value.trim().replace(/^R\$\s*/, '');
  let normalized: string;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) {
    normalized = text.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+([,.]\d{1,2})?$/.test(text)) {
    normalized = text.replace(',', '.');
  } else {
    return null;
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount <= 999999999.99 ? amount : null;
}

export function formatMaintenanceMoney(value: string): string {
  const amount = parseMaintenanceMoney(value);
  return amount === null
    ? value
    : amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
