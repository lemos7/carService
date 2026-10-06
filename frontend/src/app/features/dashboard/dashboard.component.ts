import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { CarAlert, Vehicle } from '../../core/models';
import { UiAlertComponent } from '../../shared/ui/ui-alert.component';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, UiAlertComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  vehicles: Vehicle[] = [];
  alerts: CarAlert[] = [];
  get totalKm() {
    return this.vehicles.reduce((t, v) => t + v.odometerKm, 0);
  }
  constructor(private api: ApiService) {}
  ngOnInit() {
    forkJoin({ vehicles: this.api.listVehicles(), alerts: this.api.alerts() }).subscribe((x) => {
      this.vehicles = x.vehicles;
      this.alerts = x.alerts;
    });
  }
}
