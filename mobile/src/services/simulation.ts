import { LocalDataError } from './errors';
export type Operation = 'listVehicles' | 'getVehicle' | 'getSummary' | 'listMaintenance' | 'createMaintenance' | 'createFuel' | 'snapshot' | 'retryImport' | 'login' | 'register' | 'recover';
export type SimulationSettings = { delayMs?: number; failNext?: Operation };
export class Simulation {
  private delayMs: number = 250;
  private failures: Set<Operation> = new Set();
  private enabled: boolean;
  constructor(enabled: boolean) { this.enabled = enabled; }
  configure(settings: SimulationSettings): void {
    if (!this.enabled) throw new LocalDataError('validation', 'Configuração disponível somente em desenvolvimento/testes.');
    if (settings.delayMs !== undefined) {
      if (!Number.isFinite(settings.delayMs) || settings.delayMs < 0 || settings.delayMs > 60000) {
        throw new LocalDataError('validation', 'O atraso deve estar entre 0 e 60.000 ms.');
      }
      this.delayMs = settings.delayMs;
    }
    if (settings.failNext) this.failures.add(settings.failNext);
  }
  async run<T>(operation: Operation, action: () => Promise<T>): Promise<T> {
    const fail: boolean = this.failures.delete(operation);
    if (this.delayMs) await new Promise<void>((resolve: () => void): void => { setTimeout(resolve, this.delayMs); });
    if (fail) throw new LocalDataError('simulated', 'Falha simulada. Tente novamente.');
    return action();
  }
}
