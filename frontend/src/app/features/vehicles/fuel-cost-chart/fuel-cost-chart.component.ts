import { CommonModule } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FuelResult } from '../../../core/models';
import { currentMonth, fuelCosts, validPeriod } from '../cost-analytics';

@Component({
  selector: 'app-fuel-cost-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fuel-cost-chart.component.html',
  styleUrl: './fuel-cost-chart.component.css',
})
export class FuelCostChartComponent {
  readonly entries = input.required<FuelResult[]>();
  readonly start = signal(currentMonth());
  readonly end = signal(currentMonth());
  readonly valid = computed(() => validPeriod(this.start(), this.end()));
  readonly summary = computed(() => fuelCosts(this.entries(), this.start(), this.end()));
  readonly maximum = computed(() =>
    Math.max(0.01, ...this.summary().rows.map((r) => r.value ?? 0)),
  );
}
