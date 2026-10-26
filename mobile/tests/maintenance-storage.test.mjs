import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// Exercise the repository against a controllable native filesystem adapter.
const filesystem = `
export const entries = new Map();
export const failures = { write: false, move: false };
export const Paths = { cache: 'cache' };
export class Directory {
  constructor(...parts) { this.uri = parts.map(p => p.uri ?? p).join('/'); }
  create() {}
  list() { return [...entries.keys()].filter(path => path.startsWith(this.uri + '/')).map(path => new File(path)); }
}
export class File {
  constructor(...parts) { this.uri = parts.map(p => p.uri ?? p).join('/'); }
  get name() { return this.uri.split('/').at(-1); }
  get exists() { return entries.has(this.uri); }
  get size() { return entries.get(this.uri)?.length ?? 0; }
  async text() { return entries.get(this.uri); }
  async write(value) { if (failures.write) throw Error('disk full'); entries.set(this.uri, value); }
  async copy(target) { await Promise.resolve(); entries.set(target.uri, entries.get(this.uri)); }
  async move(target) { await Promise.resolve(); if (failures.move) throw Error('move failed'); entries.set(target.uri, entries.get(this.uri)); entries.delete(this.uri); }
}`;
const mockUrl = `data:text/javascript,${encodeURIComponent(filesystem)}`;
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'expo-file-system') return { url: mockUrl, shortCircuit: true };
  if (specifier === './maintenance' && context.parentURL?.endsWith('/storage.ts')) {
    return nextResolve('./maintenance.ts', context);
  }
  return nextResolve(specifier, context);
} });
const { entries, failures } = await import(mockUrl);
const { loadRecords, saveRecord } = await import('../src/components/manutencoes/storage.ts');
const record = { id: 'first', vehicleId: 'vectra-demo', date: '2026-10-24', cost: 1250.99, category: 'Preventiva', mileage: 108035, details: 'Troca de filtros', invoice: null, createdAt: '2026-10-24T12:00:00Z' };

test('grava e relê registros e anexos; falhas não apagam o histórico', async () => {
  assert.deepEqual(await loadRecords(), []);
  await saveRecord(record);
  assert.deepEqual(await loadRecords(), [record]);
  entries.set('picker/nota.pdf', '%PDF-example');
  const withInvoice = await saveRecord({ ...record, id: 'second', vehicleId: 'another', invoice: { uri: 'picker/nota.pdf', name: 'nota.pdf', size: 12 } });
  assert.equal(withInvoice.invoice.uri, 'cache/maintenance-records/second.pdf');
  entries.delete('picker/nota.pdf');
  assert.ok(entries.has(withInvoice.invoice.uri));
  assert.deepEqual(await loadRecords(), [record, withInvoice]);

  failures.write = true;
  await assert.rejects(saveRecord({ ...record, id: 'third' }));
  failures.write = false;
  failures.move = true;
  await assert.rejects(saveRecord({ ...record, id: 'fourth' }));
  failures.move = false;
  assert.deepEqual(await loadRecords(), [record, withInvoice]);
  await assert.rejects(saveRecord({ ...record, id: 'missing', invoice: { uri: 'missing.pdf', name: 'nota.pdf', size: 12 } }));
  entries.set('cache/maintenance-records/broken.json', '{');
  await assert.rejects(loadRecords());
});
