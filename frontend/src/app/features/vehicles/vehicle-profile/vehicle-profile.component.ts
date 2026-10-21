import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { FuelResult, ServiceRecord, Vehicle } from '../../../core/models';
import { FuelCostChartComponent } from '../fuel-cost-chart/fuel-cost-chart.component';
import { MaintenanceCostChartComponent } from '../maintenance-cost-chart/maintenance-cost-chart.component';
import { downloadVehicleReport, ReportDownloadState } from '../report-download';

@Component({
  selector: 'app-vehicle-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FuelCostChartComponent, MaintenanceCostChartComponent],
  templateUrl: './vehicle-profile.component.html',
  styleUrl: './vehicle-profile.component.css',
})
export class VehicleProfileComponent implements OnInit {
  vehicle?: Vehicle;
  records: ServiceRecord[] = [];
  fuel: FuelResult[] = [];
  loading = true;
  error = '';
  reportState: ReportDownloadState = { downloading: false, error: '' };
  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
  ) {}
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading = true;
    this.error = '';
    const id = this.route.snapshot.paramMap.get('vehicleId')!;
    forkJoin({
      vehicles: this.api.listVehicles(),
      records: this.api.listServiceHistory(id),
      fuel: this.api.listFuel(id),
    }).subscribe({
      next: ({ vehicles, records, fuel }) => {
        this.vehicle = vehicles.find((v) => v.id === id);
        this.records = records;
        this.fuel = fuel;
        this.loading = false;
        if (!this.vehicle) this.error = 'Veículo não encontrado.';
      },
      error: () => {
        this.loading = false;
        this.error = 'Não foi possível carregar o perfil e os custos.';
      },
    });
  }

  async downloadReport() {
    if (!this.vehicle) return;
    await downloadVehicleReport(
      () => firstValueFrom(this.api.downloadVehicleReport(this.vehicle!.id)),
      this.reportState,
    );
  }
}
