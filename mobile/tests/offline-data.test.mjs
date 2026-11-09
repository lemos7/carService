import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';

const filesystem = `
export const entries = new Map();
export const failures = { copy: false, move: false, read: false };
export const Paths = { cache: 'cache', document: 'documents' };
export class Directory {
  constructor(...parts) { this.uri = parts.map(p => p.uri ?? p).join('/'); }
  get exists() { return [...entries.keys()].some(path => path.startsWith(this.uri + '/')); }
  create() {}
  list() { return [...entries.keys()].filter(path => path.startsWith(this.uri + '/')).map(path => new File(path)); }
}
export class File {
  constructor(...parts) { this.uri = parts.map(p => p.uri ?? p).join('/'); }
  get name() { return this.uri.split('/').at(-1); }
  get exists() { return entries.has(this.uri); }
  get size() { return entries.get(this.uri)?.length ?? 0; }
  async text() { if (failures.read) throw Error('read failed'); return entries.get(this.uri); }
  open() { const content = entries.get(this.uri); return { async readBytes(length) { return new TextEncoder().encode(content.slice(0, length)); }, close() {} }; }
  async copy(target) { await Promise.resolve(); if (failures.copy) throw Error('copy failed'); entries.set(target.uri, entries.get(this.uri)); }
  async move(target) { await Promise.resolve(); if (failures.move) throw Error('move failed'); entries.set(target.uri, entries.get(this.uri)); entries.delete(this.uri); }
  delete() { entries.delete(this.uri); }
}
`;
const mockUrl = 'data:text/javascript,' + encodeURIComponent(filesystem);
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'expo-file-system') return { url: mockUrl, shortCircuit: true };
  if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
    try { return next(specifier + '.ts', context); } catch { /* Normal resolution below. */ }
  }
  return next(specifier, context);
} });
const { entries, failures } = await import(mockUrl);
const { migrateDatabase } = await import('../src/data/schema.ts');
const { LocalRepository } = await import('../src/data/repository.ts');
const { DocumentAttachments } = await import('../src/data/attachments.ts');
const { importLegacy } = await import('../src/data/legacy.ts');
const { Simulation } = await import('../src/services/simulation.ts');
const { createLocalServices } = await import('../src/services/local.ts');
const { validateFuel, fuelMetrics } = await import('../src/components/consumo/fuel.ts');

test('consumo: validação brasileira e médias ponderadas sem arredondamento intermediário', () => {
  const values = { vehicleId: 'vectra-demo', date: '01/01/2026', cost: '250,50', startKm: '100', endKm: '500', liters: '40,125' };
  assert.deepEqual(validateFuel(values), {});
  for (const invalid of [{ date: '31/02/2026' }, { date: '01/01/2099' }, { cost: '0' }, { cost: '-1' },
    { liters: '0' }, { liters: 'NaN' }, { liters: '1,1234' }, { endKm: '100' }, { endKm: '99' }, { startKm: '1.5' }, { vehicleId: '' }]) {
    assert.ok(Object.keys(validateFuel({ ...values, ...invalid })).length);
  }
  const totals = fuelMetrics([{ startKm: 0, endKm: 400, liters: 40, cost: 200.01 }, { startKm: 400, endKm: 500, liters: 20, cost: 100.02 }]);
  assert.equal(totals.kmPerLiter, 500 / 60);
  assert.equal(totals.cost, 300.03);
});

test('abastecimentos locais: falha, retry, concorrência, histórico, centavos e rollback', async () => {
  const { native, database, repository, attachments } = await setup();
  const fuel = { id: 'fuel-first', vehicleId: 'vectra-demo', date: '2026-01-01', cost: 250.55,
    startKm: 119600, endKm: 120000, liters: 40.125, createdAt: '2026-01-01T12:00:00Z' };
  try {
    const simulation = new Simulation(true);
    simulation.configure({ delayMs: 0, failNext: 'createFuel' });
    const services = createLocalServices(repository, simulation, async () => {});
    await assert.rejects(services.createFuel(fuel), { code: 'simulated' });
    assert.equal((await services.snapshot()).fuelRecords.length, 0);
    await Promise.all([services.createFuel(fuel), services.createFuel(fuel)]);
    assert.equal((await services.snapshot()).fuelRecords.length, 1);
    assert.equal(native.prepare('SELECT costCents FROM fuel_records').get().costCents, 25055);
    assert.deepEqual({ ...(await new LocalRepository(database, attachments).snapshot()).fuelRecords[0] }, fuel);
    await assert.rejects(services.createFuel({ ...fuel, cost: 1 }), { code: 'conflict' });
    await assert.rejects(services.createFuel({ ...fuel, id: 'missing', vehicleId: 'missing' }), { code: 'not-found' });
    for (const invalid of [{ cost: 0 }, { cost: 1.234 }, { liters: 0 }, { liters: Infinity }, { endKm: 119600 }, { date: '2099-01-01' }]) {
      await assert.rejects(services.createFuel({ ...fuel, id: 'invalid', ...invalid }), { code: 'validation' });
    }
    await services.createFuel({ ...fuel, id: 'older', date: '2025-12-01', startKm: 100, endKm: 500 });
    assert.equal((await services.snapshot()).fuelRecords[0].id, fuel.id);
    assert.equal((await services.getVehicle(fuel.vehicleId)).odometerKm, 120000);
    native.exec("CREATE TRIGGER reject_fuel_update BEFORE UPDATE ON vehicles BEGIN SELECT RAISE(ABORT, 'failure'); END");
    await assert.rejects(services.createFuel({ ...fuel, id: 'rollback', endKm: 130000 }), { code: 'persistence' });
    assert.equal((await services.snapshot()).fuelRecords.length, 2);
    assert.equal((await services.getVehicle(fuel.vehicleId)).odometerKm, 120000);
  } finally { native.close(); }
});
const record = { id: 'first', vehicleId: 'vectra-demo', date: '2026-01-01', cost: 1250.99,
  category: 'Preventiva', mileage: 120000, details: "Óleo e filtro ' especiais", invoice: null, createdAt: '2026-01-01T12:00:00Z' };
async function setup() {
  entries.clear(); Object.assign(failures, { copy: false, move: false, read: false });
  const native = new DatabaseSync(':memory:');
  const database = {
    async execAsync(sql) { native.exec(sql); },
    async getFirstAsync(sql, ...params) { return native.prepare(sql).get(...params) ?? null; },
    async getAllAsync(sql, ...params) { return native.prepare(sql).all(...params); },
    async runAsync(sql, ...params) { return native.prepare(sql).run(...params); },
    async withExclusiveTransactionAsync(callback) {
      native.exec('BEGIN IMMEDIATE');
      try { await callback(database); native.exec('COMMIT'); }
      catch (error) { native.exec('ROLLBACK'); throw error; }
    },
  };
  await migrateDatabase(database);
  const attachments = new DocumentAttachments();
  return { native, database, attachments, repository: new LocalRepository(database, attachments) };
}
function invoice(id = 'invoice') {
  entries.set('picker/nota.pdf', '%PDF-example');
  return { ...record, id, invoice: { uri: 'picker/nota.pdf', name: 'nota.pdf', size: 12 } };
}
test('transação, centavos, histórico, validação, IDs repetidos e rollback', async () => {
  const { native, repository } = await setup();
  try {
    assert.equal((await repository.create(record)).cost, 1250.99);
    await repository.create(record);
    await assert.rejects(repository.create({ ...record, cost: 1 }), { code: 'conflict' });
    await repository.create({ ...record, id: 'historical', mileage: 50000 });
    assert.equal((await repository.vehicle('vectra-demo')).odometerKm, 120000);
    assert.equal((await repository.records()).length, 2);
    assert.equal(native.prepare("SELECT costCents FROM maintenance_records WHERE id='first'").get().costCents, 125099);
    await assert.rejects(repository.create({ ...record, id: 'unknown', vehicleId: 'missing' }), { code: 'not-found' });
    for (const invalid of [{ cost: 1.234 }, { cost: NaN }, { mileage: 2147483648 }, { details: 'a'.repeat(4001) }, { id: '../x' }, { date: '2099-01-01' }]) {
      await assert.rejects(repository.create({ ...record, id: 'invalid', ...invalid }), { code: 'validation' });
    }
    native.exec("CREATE TRIGGER reject_update BEFORE UPDATE ON vehicles BEGIN SELECT RAISE(ABORT, 'failure'); END");
    await assert.rejects(repository.create({ ...record, id: 'rollback', mileage: 130000 }), { code: 'persistence' });
    assert.equal((await repository.records()).length, 2);
    assert.equal((await repository.summary()).totalMileage, 120000);
  } finally { native.close(); }
});
test('PDF persistente; cópia, conteúdo e commit falhos não alteram dados confirmados', async () => {
  const { native, repository } = await setup();
  try {
    const saved = await repository.create(invoice());
    entries.delete('picker/nota.pdf');
    assert.ok(entries.has(saved.invoice.uri));
    await repository.reconcile();
    assert.ok(entries.has(saved.invoice.uri));
    await assert.rejects(repository.create(invoice('copy').invoice ? { ...invoice('copy'), invoice: { uri: 'missing', name: 'nota.pdf', size: 12 } } : record));
    failures.copy = true;
    await assert.rejects(repository.create(invoice('copy-failure')));
    failures.copy = false;
    entries.set('picker/not-pdf', 'not a pdf!!!');
    await assert.rejects(repository.create({ ...record, id: 'invalid-pdf', invoice: { uri: 'picker/not-pdf', name: 'nota.pdf', size: 12 } }));
    native.exec("CREATE TRIGGER reject_insert BEFORE INSERT ON maintenance_records BEGIN SELECT RAISE(ABORT, 'failure'); END");
    await assert.rejects(repository.create(invoice('commit-failure')));
    assert.equal((await repository.records()).length, 1);
    assert.equal([...entries.keys()].filter(key => key.startsWith('documents/')).length, 1);
    entries.set('documents/maintenance-invoices/invoice-orphan.pdf', '%PDF-orphan');
    entries.set('documents/maintenance-invoices/invoice-orphan.pdf.pending', '%PDF-pending');
    entries.set('documents/maintenance-invoices/user-owned.pdf', '%PDF-keep');
    await repository.reconcile();
    assert.ok(entries.has(saved.invoice.uri));
    assert.ok(entries.has('documents/maintenance-invoices/user-owned.pdf'));
    assert.ok(!entries.has('documents/maintenance-invoices/invoice-orphan.pdf'));
  } finally { native.close(); }
});
test('importação mista, retomada, PDF ausente recuperável e fontes preservadas', async () => {
  const { native, repository } = await setup();
  try {
    const base = 'cache/maintenance-records/';
    entries.set(base + 'good.json', JSON.stringify(record));
    const missing = { ...record, id: 'missing', invoice: { uri: base + 'missing.pdf', name: 'nota.pdf', size: 12 } };
    entries.set(base + 'missing.json', JSON.stringify(missing));
    entries.set(base + 'bad.json', '{broken');
    entries.set(base + 'unknown.json', JSON.stringify({ ...record, id: 'unknown', vehicleId: 'unknown' }));
    entries.set(base + 'external.json', JSON.stringify({ ...missing, id: 'external', invoice: { ...missing.invoice, uri: 'external/private.pdf' } }));
    entries.set(base + 'incomplete.pending', JSON.stringify({ ...record, id: 'pending' }));
    entries.set(base + 'conflict.json', JSON.stringify({ ...record, cost: 1 }));
    await importLegacy(repository);
    assert.equal((await repository.records()).length, 2);
    assert.equal((await repository.snapshot()).warnings.length, 5);
    assert.equal((await repository.records()).find(item => item.id === 'missing').invoice.unavailable, true);
    entries.set(base + 'missing.pdf', '%PDF-example');
    await importLegacy(repository);
    assert.equal((await repository.records()).length, 2);
    const restored = (await repository.records()).find(item => item.id === 'missing');
    assert.equal(restored.invoice.unavailable, false);
    assert.ok(entries.has(restored.invoice.uri));
    assert.ok(entries.has(base + 'missing.pdf'));
    assert.ok(entries.has(base + 'bad.json'));
    await importLegacy(repository);
    assert.equal((await repository.records()).length, 2);
    entries.set(base + 'later.json', JSON.stringify({ ...record, id: 'later' }));
    native.exec("CREATE TRIGGER reject_import BEFORE INSERT ON legacy_imports WHEN NEW.source = 'later.json' BEGIN SELECT RAISE(ABORT, 'interrupted'); END");
    await assert.rejects(importLegacy(repository), { code: 'persistence' });
    assert.equal((await repository.records()).length, 2);
    native.exec('DROP TRIGGER reject_import');
    await importLegacy(repository);
    assert.equal((await repository.records()).length, 3);
  } finally { native.close(); }
});
test('operações concorrentes são serializadas; falha única ocorre antes da gravação; acesso não usa HTTP', async () => {
  const { native, repository } = await setup();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw Error('HTTP forbidden'); };
  process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid';
  try {
    const simulation = new Simulation(true);
    simulation.configure({ delayMs: 0, failNext: 'createMaintenance' });
    const services = createLocalServices(repository, simulation, () => importLegacy(repository));
    await assert.rejects(services.createMaintenance(record), { code: 'simulated' });
    assert.equal((await repository.records()).length, 0);
    await Promise.all([services.createMaintenance(record), services.createMaintenance(record)]);
    assert.equal((await repository.records()).length, 1);
    await services.login({ email: 'demo@example.com' });
    await services.register({ email: 'other@example.com', name: 'Outra pessoa' });
    assert.match(await services.recover('demo@example.com'), /Nenhum e-mail/);
    await assert.rejects(services.recover('invalid'), { code: 'validation' });
    simulation.configure({ failNext: 'recover' });
    await assert.rejects(services.recover('demo@example.com'), { code: 'simulated' });
    await services.recover('demo@example.com');
    assert.throws(() => new Simulation(false).configure({ failNext: 'login' }));
    simulation.configure({ delayMs: 25 });
    let completed = false;
    const pending = services.getSummary().then(() => { completed = true; });
    assert.equal(completed, false);
    await pending;
    assert.equal(completed, true);
  } finally { globalThis.fetch = originalFetch; native.close(); }
});
