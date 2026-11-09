/* global __r */
(async () => {
  const modules = Array.from(__r.getModules().values()).filter(item => item.isInitialized).map(item => item.publicModule.exports);
  const find = name => modules.find(item => item && typeof item[name] === 'function');
  const { openDatabaseAsync } = find('openDatabaseAsync');
  const { migrateDatabase, migrations } = find('migrateDatabase');
  const { LocalRepository } = find('LocalRepository');
  const { DocumentAttachments } = find('DocumentAttachments');
  const { importLegacy } = find('importLegacy');
  const { Directory, File, Paths } = modules.find(item => item?.Paths?.document && item.File);
  const { Simulation } = find('Simulation');
  const { createLocalServices } = find('createLocalServices');
  const report = [];
  const assert = (condition, message) => { if (!condition) throw Error(message); report.push(message); };
  const suffix = String(Date.now());
  const dbName = 'offline-validation-' + suffix + '.db';
  const directoryName = 'offline-validation-invoices-' + suffix;
  const database = await openDatabaseAsync(dbName);
  try {
    await migrateDatabase(database);
    const attachments = new DocumentAttachments(directoryName);
    const repository = new LocalRepository(database, attachments);
    const source = new Directory(Paths.cache, 'offline-validation-source-' + suffix);
    source.create({ idempotent: true, intermediates: true });
    const pdf = new File(source, 'native.pdf');
    await pdf.write('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');
    const record = { id: 'native-first', vehicleId: 'vectra-demo', date: '2026-01-01', cost: 1250.99, category: 'Preventiva',
      mileage: 120000, details: 'Teste nativo isolado', createdAt: '2026-01-01T12:00:00Z',
      invoice: { uri: pdf.uri, name: 'native.pdf', size: pdf.size } };
    const simulation = new Simulation(true);
    simulation.configure({ delayMs: 0, failNext: 'createMaintenance' });
    const services = createLocalServices(repository, simulation, () => importLegacy(repository));
    let failed = false;
    try { await services.createMaintenance(record); } catch (error) { failed = error.code === 'simulated'; }
    assert(failed, 'Falha simulada antes da gravação');
    const saved = await services.createMaintenance(record);
    await services.createMaintenance(record);
    assert((await repository.records()).filter(item => item.id === record.id).length === 1, 'Retry idempotente');
    await repository.create({ ...record, id: 'native-historical', mileage: 50000, invoice: null });
    assert((await repository.vehicle('vectra-demo')).odometerKm === 120000, 'Hodômetro não recua');
    await database.execAsync("CREATE TRIGGER IF NOT EXISTS validation_fail BEFORE UPDATE ON vehicles BEGIN SELECT RAISE(ABORT, 'test'); END");
    failed = false;
    try { await repository.create({ ...record, id: 'native-rollback', mileage: 130000, invoice: null }); } catch { failed = true; }
    await database.execAsync('DROP TRIGGER validation_fail');
    assert(failed && !(await repository.records()).some(item => item.id === 'native-rollback'), 'Rollback nativo sem registro parcial');
    const legacy = new Directory(Paths.cache, 'offline-validation-legacy-' + suffix);
    legacy.create({ idempotent: true, intermediates: true });
    await new File(legacy, 'legacy.json').write(JSON.stringify({ ...record, id: 'native-legacy', invoice: null }));
    await database.execAsync("CREATE TRIGGER IF NOT EXISTS validation_interrupt BEFORE INSERT ON legacy_imports BEGIN SELECT RAISE(ABORT, 'interrupted'); END");
    failed = false;
    try { await importLegacy(repository, legacy); } catch { failed = true; }
    await database.execAsync('DROP TRIGGER validation_interrupt');
    assert(failed && !(await repository.records()).some(item => item.id === 'native-legacy'), 'Importação interrompida com rollback');
    await importLegacy(repository, legacy);
    await importLegacy(repository, legacy);
    assert((await repository.records()).filter(item => item.id === 'native-legacy').length === 1, 'Retomada da importação sem duplicação');
    assert(new File(legacy, 'legacy.json').exists, 'Fonte legada preservada');
    await repository.reconcile();
    source.delete();
    assert(new File(saved.invoice.uri).exists, 'PDF legível após remoção somente do cache de teste');
    assert((await new File(saved.invoice.uri).text()).startsWith('%PDF-'), 'Conteúdo persistente do PDF');
    assert((await services.recover('native@example.com')).includes('Nenhum e-mail'), 'Recuperação local');
    const before = await database.getFirstAsync('PRAGMA user_version');
    failed = false;
    try { await migrateDatabase(database, [...migrations, { version: 2, sql: 'UPDATE vehicles SET odometerKm=1; INVALID SQL;' }]); } catch { failed = true; }
    assert(failed && (await database.getFirstAsync('PRAGMA user_version')).user_version === before.user_version, 'Migração nativa revertida');
    await database.execAsync('PRAGMA user_version = 99');
    failed = false;
    try { await migrateDatabase(database); } catch { failed = true; }
    await database.execAsync('PRAGMA user_version = 1');
    assert(failed, 'Versão futura rejeitada');
    return { checks: report, dbName, directoryName };
  } finally { await database.closeAsync(); }
})()
