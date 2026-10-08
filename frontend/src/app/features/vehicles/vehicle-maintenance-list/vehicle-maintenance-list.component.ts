import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { ServiceRecord, Vehicle } from '../../../core/models';
import { UiAlertComponent } from '../../../shared/ui/ui-alert/ui-alert.component';

@Component({
  selector: 'app-vehicle-maintenance-list',
  standalone: true,
  imports: [CommonModule, RouterLink, UiAlertComponent],
  templateUrl: './vehicle-maintenance-list.component.html',
  styleUrl: './vehicle-maintenance-list.component.css',
})
export class VehicleMaintenanceListComponent implements OnInit {
  vehicle?: Vehicle;
  records: ServiceRecord[] = [];
  errorMessage = '';
  loading = true;
  readonly vehicleId: string;

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
    private readonly location: Location,
  ) {
    this.vehicleId = this.route.snapshot.paramMap.get('vehicleId') ?? '';
  }

  ngOnInit() {
    forkJoin({
      vehicles: this.api.listVehicles(),
      records: this.api.listServiceHistory(this.vehicleId),
    }).subscribe({
      next: ({ vehicles, records }) => {
        this.vehicle = vehicles.find((vehicle) => vehicle.id === this.vehicleId);
        this.records = records;
        this.loading = false;
        if (!this.vehicle) this.errorMessage = 'Veículo não encontrado.';
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Não foi possível carregar o histórico de manutenções.';
      },
    });
  }

  goBack() {
    this.location.back();
  }

  downloadDocument(record: ServiceRecord) {
    this.api.downloadServiceDocument(record.id).subscribe({
      next: (response) => {
        const url = URL.createObjectURL(response.body!);
        const link = document.createElement('a');
        link.href = url;
        link.download = record.documentName;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => (this.errorMessage = 'Não foi possível baixar a nota fiscal.'),
    });
  }
}
