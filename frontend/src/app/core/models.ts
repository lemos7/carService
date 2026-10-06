export interface AuthResult {
  userId: string;
  name: string;
  email: string;
}
export interface Vehicle {
  id: string;
  year: number;
  model: string;
  licensePlate: string;
  color: string;
  engine: string;
  odometerKm: number;
  photoPath?: string;
}
export interface MaintenanceItem {
  id: string;
  vehicleId: string;
  title: string;
  notes?: string;
  dueKm: number;
  warningKm: number;
  repeatEveryKm?: number;
  completedAtUtc?: string;
}
export interface ServiceRecord {
  id: string;
  vehicleId: string;
  odometerKm: number;
  details: string;
  serviceDate: string | null;
  totalCost: number | null;
  category: string | null;
  documentName: string;
  createdAtUtc: string;
}
export interface CarAlert {
  maintenanceId: string;
  vehicleId: string;
  title: string;
  dueKm: number;
  currentKm: number;
  severity: 'warning' | 'error';
  message: string;
}
export interface FuelResult {
  vehicleId: string;
  totalCost: number | null;
  fueledOn: string | null;
  createdAtUtc: string;
  id: string;
  odometerKm: number;
  previousOdometerKm: number;
  liters: number;
  kmPerLiter?: number;
}
