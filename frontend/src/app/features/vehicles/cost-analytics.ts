import { FuelResult, ServiceRecord } from '../../core/models';

export function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

export function validPeriod(start: string, end: string) {
  const valid = (value: string) => /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value);
  return valid(start) && valid(end) && start <= end;
}

function months(start: string, end: string) {
  if (!validPeriod(start, end)) return [];
  const result: string[] = [];
  let [year, month] = start.split('-').map(Number);
  while (`${year}-${String(month).padStart(2, '0')}` <= end) {
    result.push(`${year}-${String(month).padStart(2, '0')}`);
    if (++month === 13) {
      month = 1;
      year++;
    }
  }
  return result;
}

export function maintenanceCosts(records: ServiceRecord[], start: string, end: string) {
  const selected = records.filter(
    (r) => r.serviceDate && r.serviceDate.slice(0, 7) >= start && r.serviceDate.slice(0, 7) <= end,
  );
  const complete = selected.filter(
    (r) => r.totalCost !== null && Number.isFinite(r.totalCost) && r.totalCost >= 0,
  );
  const rows = months(start, end).map((month) => ({
    month,
    value: complete
      .filter((r) => r.serviceDate!.startsWith(month))
      .reduce((sum, r) => sum + r.totalCost!, 0),
  }));
  const categories = [...new Set(complete.map((r) => r.category || 'Sem categoria'))].map(
    (category) => ({
      category,
      value: complete
        .filter((r) => (r.category || 'Sem categoria') === category)
        .reduce((sum, r) => sum + r.totalCost!, 0),
    }),
  );
  return {
    rows,
    categories,
    total: complete.reduce((sum, r) => sum + r.totalCost!, 0),
    count: complete.length,
    omitted: records.filter((r) => !r.serviceDate).length + selected.length - complete.length,
  };
}

export function fuelCosts(entries: FuelResult[], start: string, end: string) {
  const selected = entries.filter(
    (r) => r.fueledOn && r.fueledOn.slice(0, 7) >= start && r.fueledOn.slice(0, 7) <= end,
  );
  const complete = selected.filter(
    (r) =>
      r.totalCost !== null &&
      Number.isFinite(r.totalCost) &&
      r.totalCost > 0 &&
      r.previousOdometerKm != null &&
      r.odometerKm > r.previousOdometerKm &&
      r.liters > 0,
  );
  const summarize = (items: FuelResult[]) => {
    const cost = items.reduce((sum, r) => sum + r.totalCost!, 0);
    const km = items.reduce((sum, r) => sum + r.odometerKm - r.previousOdometerKm, 0);
    const liters = items.reduce((sum, r) => sum + r.liters, 0);
    return {
      cost,
      km,
      average: liters ? km / liters : null,
      price: liters ? cost / liters : null,
      value: km ? cost / km : null,
    };
  };
  return {
    rows: months(start, end).map((month) => ({
      month,
      ...summarize(complete.filter((r) => r.fueledOn!.startsWith(month))),
    })),
    ...summarize(complete),
    count: complete.length,
    omitted: entries.filter((r) => !r.fueledOn).length + selected.length - complete.length,
  };
}
