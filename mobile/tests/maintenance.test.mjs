import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeMaintenance, parseCost, parseDate, validateInvoice, validateMaintenance } from '../src/components/manutencoes/maintenance.ts';

const today = new Date(2026, 9, 24);
const valid = { date: '24/10/2026', cost: '1.250,99', category: 'Preventiva', mileage: '108035', details: '' };

test('valida campos obrigatórios, zero e manutenção histórica', () => {
  assert.deepEqual(validateMaintenance(valid, today), {});
  assert.deepEqual(validateMaintenance({ ...valid, date: '01/01/2000', cost: '0,00', mileage: '0' }, today), {});
  assert.deepEqual(Object.keys(validateMaintenance({ date: '', cost: '', category: '', mileage: '', details: '' }, today)), ['date', 'cost', 'category', 'mileage']);
});

test('rejeita datas impossíveis e futuras sem conversão de fuso', () => {
  for (const date of ['31/02/2026', '29/02/2025', '00/10/2026', '25/10/2026', '24/13/2026']) {
    assert.ok(validateMaintenance({ ...valid, date }, today).date, date);
  }
  assert.equal(parseDate('29/02/2024'), '2024-02-29');
});

test('valor brasileiro conserva centavos e rejeita entrada ambígua ou fora do limite', () => {
  assert.equal(parseCost('1.250,99'), 1250.99);
  assert.equal(parseCost('1250,9'), 1250.9);
  assert.equal(parseCost('999.999.999,99'), 999999999.99);
  for (const value of ['-1', '1e3', '12.50', '1,234', '1.000.000.000,00', '', 'Infinity']) assert.equal(parseCost(value), null, value);
});

test('rejeita categoria desconhecida, quilometragem inválida e detalhes excessivos', () => {
  assert.ok(validateMaintenance({ ...valid, category: 'Inventada' }, today).category);
  for (const mileage of ['-1', '12.5', '1e3', '2147483648']) assert.ok(validateMaintenance({ ...valid, mileage }, today).mileage);
  assert.ok(validateMaintenance({ ...valid, details: 'a'.repeat(4001) }, today).details);
});

test('PDF aceita até 10 MB e rejeita vazio, extensão e MIME incorretos', () => {
  assert.equal(validateInvoice('NOTA.PDF', 10_000_000, 'application/pdf'), null);
  assert.ok(validateInvoice('nota.pdf', 10_000_001));
  assert.ok(validateInvoice('nota.pdf', 0));
  assert.ok(validateInvoice('nota.png', 100));
  assert.ok(validateInvoice('nota.pdf', 100, 'image/png'));
});

test('leitura não aceita registros corrompidos como histórico vazio', () => {
  const record = { id: '1', vehicleId: 'vectra-demo', date: '2026-10-24', cost: 1250.99, category: 'Preventiva', mileage: 108035, details: '', invoice: null, createdAt: '2026-10-24T12:00:00Z' };
  assert.deepEqual(decodeMaintenance(JSON.stringify(record)), record);
  for (const value of [{}, { ...record, cost: '10' }, { ...record, date: '2026-02-31' }, { ...record, invoice: {} }]) {
    assert.throws(() => decodeMaintenance(JSON.stringify(value)));
  }
  assert.throws(() => decodeMaintenance('{interrompido'));
});
