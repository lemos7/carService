import { test, expect, vehicleData } from './fixtures';
test('cadastra, edita e preserva hodômetro ao rejeitar regressão', async ({ page, account }) => {
  void account;
  await page.goto('/veiculos');
  await expect(page.getByText('Você ainda não cadastrou um veículo.')).toBeVisible();
  await page.getByRole('button', { name: 'Novo veículo' }).click();
  for (const [label, value] of Object.entries({ Modelo: vehicleData.model, Ano: '2010', Placa: vehicleData.licensePlate, Cor: 'Prata', Motorização: '2.0 Flex', Quilometragem: '10000' })) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole('button', { name: 'Salvar veículo' }).click();
  await expect(page.getByText('Veículo salvo com sucesso.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: vehicleData.model })).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Cor', { exact: true }).fill('Azul');
  await page.getByLabel('Quilometragem', { exact: true }).fill('10500');
  await page.getByRole('button', { name: 'Salvar veículo' }).click();
  await expect(page.getByText('Veículo salvo com sucesso.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('article')).toContainText('Azul');
  await expect(page.getByRole('article')).toContainText('10.500 km');
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Quilometragem', { exact: true }).fill('9999');
  const rejected = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes('/api/vehicles/'));
  await page.getByRole('button', { name: 'Salvar veículo' }).click();
  expect((await rejected).ok()).toBeFalsy();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Perfil e custos' }).click();
  await expect(page.getByRole('heading', { name: vehicleData.model })).toBeVisible();
  await expect(page.locator('.profile-header')).toContainText('10.500 km');
  await expect(page.locator('.profile-header')).toContainText('Azul');
});
