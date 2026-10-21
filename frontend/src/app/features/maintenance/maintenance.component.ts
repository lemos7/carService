import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { MaintenanceItem, Vehicle } from '../../core/models';
import { UiAlertComponent } from '../../shared/ui/ui-alert/ui-alert.component';
@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, RouterLink, UiAlertComponent],
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.css',
})
export class MaintenanceComponent implements OnInit {
  vehicles: Vehicle[] = [];
  items: MaintenanceItem[] = [];
  message = '';
  error = false;
  completingIds = new Set<string>();
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.load();
  }
  load() {
    forkJoin({ vehicles: this.api.listVehicles(), items: this.api.listMaintenance() }).subscribe(
      (x) => {
        this.vehicles = x.vehicles;
        this.items = x.items;
      },
    );
  }
  vehicleName(id: string) {
    return this.vehicles.find((x) => x.id === id)?.model ?? 'Veículo';
  }
  complete(id: string) {
    if (this.completingIds.has(id)) return;

    this.completingIds.add(id);
    this.api.completeMaintenance(id).subscribe({
      next: () => {
        const item = this.items.find((maintenance) => maintenance.id === id);
        if (item) item.completedAtUtc = new Date().toISOString();
        this.completingIds.delete(id);
        this.error = false;
        this.message = 'Manutenção confirmada e alerta encerrado.';
      },
      error: (response) => {
        this.completingIds.delete(id);
        this.error = true;
        this.message =
          response.error?.detail ??
          response.error?.message ??
          'Não foi possível concluir a manutenção.';
      },
    });
  }
}
