import { CommonModule } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiceRecord } from '../../../core/models';
import { currentMonth, maintenanceCosts, validPeriod } from '../cost-analytics';

@Component({
  selector: 'app-maintenance-cost-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './maintenance-cost-chart.component.html',
  styleUrl: './maintenance-cost-chart.component.css',
})
export class MaintenanceCostChartComponent {
  readonly records = input.required<ServiceRecord[]>();
  readonly start = signal(currentMonth());
  readonly end = signal(currentMonth());
  readonly valid = computed(() => validPeriod(this.start(), this.end()));
  readonly summary = computed(() => maintenanceCosts(this.records(), this.start(), this.end()));
  readonly maximum = computed(() => Math.max(1, ...this.summary().rows.map((r) => r.value)));
}
