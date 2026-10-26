import type { Maintenance } from '../components/manutencoes/maintenance';
import type { Vehicle } from '../components/veiculos/vehicles';
import type { FuelRecord } from '../components/consumo/fuel';

export type Summary = { vehicleCount: number; totalMileage: number };
export type ImportWarning = { source: string; message: string };
export type GarageSnapshot = { vehicles: Vehicle[]; records: Maintenance[]; fuelRecords: FuelRecord[]; summary: Summary; warnings: ImportWarning[] };
export type AccessRequest = { email: string; name?: string };
export interface GarageServices {
  listVehicles(): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | null>;
  getSummary(): Promise<Summary>;
  listMaintenance(): Promise<Maintenance[]>;
  createMaintenance(record: Maintenance): Promise<Maintenance>;
  createFuel(record: FuelRecord): Promise<FuelRecord>;
  snapshot(): Promise<GarageSnapshot>;
  retryImport(): Promise<void>;
  login(request: AccessRequest): Promise<void>;
  register(request: AccessRequest): Promise<void>;
  recover(email: string): Promise<string>;
}
