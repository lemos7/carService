import { randomUUID } from 'node:crypto';
import { test as base, expect, type APIRequestContext } from '@playwright/test';

type Account = { name: string; email: string; password: string };
type Vehicle = { id: string; model: string; odometerKm: number };
export const vehicleData = { model: 'Vectra E2E', year: 2010, licensePlate: 'E2E1234', color: 'Prata', engine: '2.0 Flex', odometerKm: 10000 };
export const date = '2025-06-15';
export const month = '2025-06';
export function newAccount(): Account {
  return { name: 'Motorista E2E', email: `e2e-${randomUUID()}@example.test`, password: `E2e!${randomUUID()}` };
}
export function headers(baseURL: string) { return { 'X-CarCare-Request': '1', Origin: baseURL }; }
export async function register(request: APIRequestContext, baseURL: string, account: Account) {
  // Retry only throttled preparation; preserve real gateway protection.
  let status = 429;
  await expect.poll(async () => {
    const response = await request.post('/api/auth/register', { data: account, headers: headers(baseURL) });
    status = response.status();
    return status;
  }, { timeout: 75_000, intervals: [1000, 3000, 5000] }).not.toBe(429);
  expect(status).toBeGreaterThanOrEqual(200);
  expect(status).toBeLessThan(300);
}
export const test = base.extend<{ account: Account; vehicle: Vehicle }>({
  account: async ({ context, baseURL }, use) => {
    const account = newAccount();
    await register(context.request, baseURL!, account);
    await use(account);
  },
  vehicle: async ({ context, baseURL, account }, use) => {
    void account;
    const response = await context.request.post('/api/vehicles/', { data: vehicleData, headers: headers(baseURL!) });
    expect(response.ok(), `Vehicle creation returned ${response.status()}`).toBeTruthy();
    await use(await response.json());
  },
});
export { expect };
