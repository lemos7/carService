import type { Maintenance } from '../components/manutencoes/maintenance';
import type { FuelRecord } from '../components/consumo/fuel';
import type { Vehicle } from '../components/veiculos/vehicles';
import type { LocalRepository } from '../data/repository';
import type { AccessRequest, GarageServices, GarageSnapshot, Summary } from './contracts';
import { LocalDataError, persistenceError } from './errors';
import { Simulation, type Operation } from './simulation';

export function createLocalServices(repository: LocalRepository, simulation: Simulation, retryImport: () => Promise<void>): GarageServices {
  let importHealthy: boolean = true;
  async function call<T>(operation: Operation, action: () => Promise<T>): Promise<T> {
    try { return await simulation.run(operation, action); }
    catch (error: unknown) { throw persistenceError(error); }
  }
  async function access(request: AccessRequest): Promise<void> {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email.trim())) {
      throw new LocalDataError('validation', 'Informe um e-mail válido.');
    }
  }
  return {
    listVehicles: (): Promise<Vehicle[]> => call('listVehicles', (): Promise<Vehicle[]> => repository.vehicles()),
    getVehicle: (id: string): Promise<Vehicle | null> => call('getVehicle', (): Promise<Vehicle | null> => repository.vehicle(id)),
    getSummary: (): Promise<Summary> => call('getSummary', (): Promise<Summary> => repository.summary()),
    listMaintenance: (): Promise<Maintenance[]> => call('listMaintenance', (): Promise<Maintenance[]> => repository.records()),
    snapshot: (): Promise<GarageSnapshot> => call('snapshot', (): Promise<GarageSnapshot> => repository.snapshot()),
    createFuel: (record: FuelRecord): Promise<FuelRecord> => call('createFuel', async (): Promise<FuelRecord> => {
      if (!importHealthy) throw new LocalDataError('persistence', 'Tente importar os dados novamente antes de salvar.');
      return repository.createFuel(record);
    }),
    createMaintenance: (record: Maintenance): Promise<Maintenance> => call('createMaintenance', async (): Promise<Maintenance> => {
      if (!importHealthy) throw new LocalDataError('persistence', 'Tente importar os dados novamente antes de salvar.');
      return repository.create(record);
    }),
    retryImport: (): Promise<void> => call('retryImport', async (): Promise<void> => {
      importHealthy = false;
      await retryImport();
      importHealthy = true;
    }),
    login: (request: AccessRequest): Promise<void> => call('login', (): Promise<void> => access(request)),
    register: (request: AccessRequest): Promise<void> => call('register', async (): Promise<void> => {
      if (!request.name?.trim()) throw new LocalDataError('validation', 'Informe seu nome.');
      await access(request);
    }),
    recover: (email: string): Promise<string> => call('recover', async (): Promise<string> => {
      await access({ email });
      return 'Simulação concluída. Nenhum e-mail foi enviado.';
    }),
  };
}
