/* global __r */
(async () => {
  const modules = Array.from(__r.getModules().values()).filter(item => item.isInitialized).map(item => item.publicModule.exports);
  const { openDatabaseAsync } = modules.find(item => item?.openDatabaseAsync);
  const { File, Paths } = modules.find(item => item?.Paths?.document && item.File);
  const { migrateDatabase } = modules.find(item => item?.migrateDatabase);
  const database = await openDatabaseAsync('offline-validation-1793039741560.db');
  try {
    await migrateDatabase(database);
    const records = await database.getAllAsync('SELECT * FROM maintenance_records');
    if (records.length !== 3) throw Error('Histórico não preservado');
    const saved = records.find(item => item.id === 'native-first');
    const invoice = new File(Paths.document, 'offline-validation-invoices-1793039741560', saved.invoicePath);
    if (!invoice.exists || !(await invoice.text()).startsWith('%PDF-')) throw Error('PDF não preservado');
    const vehicle = await database.getFirstAsync('SELECT * FROM vehicles');
    if (vehicle.odometerKm !== 120000) throw Error('Hodômetro não preservado');
    globalThis.garageSimulation.configure({ delayMs: 1000 });
    globalThis.garageSimulation.configure({ failNext: 'createMaintenance' });
    const services = modules.find(item => item?.getLocalServices).getLocalServices();
    let failed = false;
    try { await services.createMaintenance({}); } catch (error) { failed = error.code === 'simulated'; }
    globalThis.garageSimulation.configure({ delayMs: 250 });
    if (!failed) throw Error('Exemplo documentado não disparou a falha');
    return ['Histórico persistido após reinício', 'PDF persistido após reinício e remoção do cache de teste', 'Hodômetro e seed preservados', 'Exemplo documentado de falha executado antes de gravar'];
  } finally { await database.closeAsync(); }
})()
