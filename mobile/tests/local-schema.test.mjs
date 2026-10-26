import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
    try { return next(specifier + '.ts', context); } catch { /* Try normal resolution. */ }
  }
  return next(specifier, context);
} });
const { migrateDatabase, migrations } = await import('../src/data/schema.ts');
function database() {
  const native = new DatabaseSync(':memory:');
  const adapter = {
    async execAsync(sql) { native.exec(sql); },
    async getFirstAsync(sql, ...params) { return native.prepare(sql).get(...params) ?? null; },
    async withExclusiveTransactionAsync(callback) {
      native.exec('BEGIN IMMEDIATE');
      try { await callback(adapter); native.exec('COMMIT'); }
      catch (error) { native.exec('ROLLBACK'); throw error; }
    },
  };
  return { native, adapter };
}
test('schema vazio, seed único, reabertura e chaves estrangeiras', async () => {
  const { native, adapter } = database();
  try {
    await migrateDatabase(adapter);
    native.exec("UPDATE vehicles SET odometerKm = 120000");
    await migrateDatabase(adapter);
    assert.equal(native.prepare('SELECT COUNT(*) AS count FROM vehicles').get().count, 1);
    assert.equal(native.prepare('SELECT odometerKm FROM vehicles').get().odometerKm, 120000);
    assert.equal(native.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
    assert.equal(native.prepare('PRAGMA user_version').get().user_version, migrations.at(-1).version);
  } finally { native.close(); }
});
test('upgrade preserva dados, rollback preserva versão, versão futura é rejeitada', async () => {
  const { native, adapter } = database();
  try {
    await migrateDatabase(adapter, migrations.slice(0, 1));
    native.exec('UPDATE vehicles SET odometerKm = 108036');
    await migrateDatabase(adapter);
    const nextVersion = migrations.at(-1).version + 1;
    await assert.rejects(migrateDatabase(adapter, [...migrations, { version: nextVersion, sql: "UPDATE vehicles SET odometerKm = 1; INVALID SQL;" }]));
    assert.equal(native.prepare('SELECT odometerKm FROM vehicles').get().odometerKm, 108036);
    assert.equal(native.prepare('PRAGMA user_version').get().user_version, migrations.at(-1).version);
    await migrateDatabase(adapter, [...migrations, { version: nextVersion, sql: 'CREATE TABLE upgrade_check (id TEXT);' }]);
    assert.equal(native.prepare('SELECT COUNT(*) AS count FROM vehicles').get().count, 1);
    await assert.rejects(migrateDatabase(adapter), /versão mais recente/);
    assert.equal(native.prepare('PRAGMA user_version').get().user_version, nextVersion);
  } finally { native.close(); }
});
