import type { GarageServices } from '../../services/contracts';
export async function requestPasswordRecovery(email: string, services: Pick<GarageServices, 'recover'>): Promise<string> {
  return services.recover(email);
}
