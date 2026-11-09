/* global __r */
(async () => {
  const modules = Array.from(__r.getModules().values()).filter(item => item.isInitialized).map(item => item.publicModule.exports);
  const find = name => modules.find(item => item && typeof item[name] === 'function');
  const { openDatabaseAsync } = find('openDatabaseAsync');
  const { migrateDatabase } = find('migrateDatabase');
  const { LocalRepository } = find('LocalRepository');
  const { DocumentAttachments } = find('DocumentAttachments');
  const { fuelMetrics } = find('fuelMetrics');
  const name = 'fuel-validation-' + Date.now() + '.db';
  let database = await openDatabaseAsync(name);
  const report = [];
  const assert = (condition, message) => { if (!condition) throw Error(message); report.push(message); };
  try {
    await migrateDatabase(database);
    let repository = new LocalRepository(database, new DocumentAttachments());
    const record = { id: 'native-fuel', vehicleId: 'vectra-demo', date: '2026-01-01', cost: 250.55,
      startKm: 119600, endKm: 120000, liters: 40, createdAt: '2026-01-01T12:00:00Z' };
    await repository.createFuel(record);
    await repository.createFuel(record);
    assert((await repository.snapshot()).fuelRecords.length === 1, 'Retry não duplica abastecimento');
    await database.closeAsync();
    database = await openDatabaseAsync(name);
    await migrateDatabase(database);
    repository = new LocalRepository(database, new DocumentAttachments());
    const snapshot = await repository.snapshot();
    assert(snapshot.fuelRecords[0].cost === 250.55, 'Valor preservado após fechar e reabrir SQLite nativo');
    assert(fuelMetrics(snapshot.fuelRecords).kmPerLiter === 10, 'Consumo de 10 km/l após reabertura');
    assert(snapshot.vehicles[0].odometerKm === 120000, 'Hodômetro atualizado');
    await database.execAsync("CREATE TRIGGER fail_fuel BEFORE UPDATE ON vehicles BEGIN SELECT RAISE(ABORT, 'test'); END");
    let failed = false;
    try { await repository.createFuel({ ...record, id: 'rollback', endKm: 130000 }); } catch { failed = true; }
    assert(failed && (await repository.snapshot()).fuelRecords.length === 1, 'Rollback nativo preserva histórico');
    return report;
  } finally { await database.closeAsync(); }
})();
