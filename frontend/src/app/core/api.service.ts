import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CarAlert, FuelResult, MaintenanceItem, ServiceRecord, Vehicle } from './models';
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}
  listVehicles() {
    return this.http.get<Vehicle[]>('/api/vehicles/');
  }
  createVehicle(data: Omit<Vehicle, 'id' | 'photoPath'>) {
    return this.http.post<Vehicle>('/api/vehicles/', data);
  }
  updateVehicle(id: string, data: Omit<Vehicle, 'id' | 'photoPath'>) {
    return this.http.put<Vehicle>(`/api/vehicles/${id}`, data);
  }
  uploadPhoto(id: string, file: File) {
    const body = new FormData();
    body.append('photo', file);
    return this.http.post<{ photoUrl: string }>(`/api/vehicles/${id}/photo`, body);
  }
  listMaintenance(vehicleId?: string) {
    return this.http.get<MaintenanceItem[]>('/api/maintenance/', {
      params: vehicleId ? { vehicleId } : {},
    });
  }
  createMaintenance(data: Omit<MaintenanceItem, 'id' | 'completedAtUtc'>) {
    return this.http.post<MaintenanceItem>('/api/maintenance/', data);
  }
  completeMaintenance(id: string) {
    return this.http.post(`/api/maintenance/${id}/complete`, {});
  }
  listServiceHistory(vehicleId: string) {
    return this.http.get<ServiceRecord[]>(`/api/maintenance/history/${vehicleId}`);
  }
  createServiceRecord(
    vehicleId: string,
    odometerKm: number,
    details: string,
    document: File | undefined,
    serviceDate: string,
    totalCost: number,
    category: string,
  ) {
    const body = new FormData();
    body.append('vehicleId', vehicleId);
    body.append('odometerKm', String(odometerKm));
    body.append('details', details);
    body.append('serviceDate', serviceDate);
    body.append('totalCost', String(totalCost));
    body.append('category', category);
    if (document) body.append('document', document);
    return this.http.post<ServiceRecord>('/api/maintenance/history', body);
  }
  downloadServiceDocument(id: string) {
    return this.http.get(`/api/maintenance/history/document/${id}`, {
      observe: 'response',
      responseType: 'blob',
    });
  }
  downloadVehicleReport(vehicleId: string, startDate?: string, endDate?: string) {
    const params: Record<string, string> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;
    return this.http.get(`/api/maintenance/reports/vehicles/${vehicleId}`, {
      params,
      observe: 'response',
      responseType: 'blob',
    });
  }
  alerts() {
    return this.http.get<CarAlert[]>('/api/maintenance/alerts');
  }
  listFuel(vehicleId: string) {
    return this.http.get<FuelResult[]>(`/api/maintenance/fuel/${vehicleId}`);
  }
  addFuel(
    vehicleId: string,
    previousOdometerKm: number,
    odometerKm: number,
    liters: number,
    totalCost: number,
    fueledOn: string,
  ) {
    return this.http.post<FuelResult>('/api/maintenance/fuel', {
      vehicleId,
      previousOdometerKm,
      odometerKm,
      liters,
      totalCost,
      fueledOn,
    });
  }
}
