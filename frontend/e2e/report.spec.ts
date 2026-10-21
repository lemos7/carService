import { readFile } from 'node:fs/promises';
import { test, expect, headers, date } from './fixtures';
test('baixa relatório PDF pelo perfil com dados reais', async ({ page, context, baseURL, vehicle }, testInfo) => {
  const response = await context.request.post('/api/maintenance/fuel', {
    headers: headers(baseURL!),
    data: { vehicleId: vehicle.id, previousOdometerKm: 10000, odometerKm: 10500, liters: 50, totalCost: 300, fueledOn: date },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto(`/veiculos/${vehicle.id}`);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar relatório' }).click();
  const download = await pending;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  const output = testInfo.outputPath('vehicle-report.pdf');
  await download.saveAs(output);
  const bytes = await readFile(output);
  expect(bytes.length).toBeGreaterThan(100);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
});
