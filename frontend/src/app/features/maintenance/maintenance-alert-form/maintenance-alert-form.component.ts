import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { Vehicle } from '../../../core/models';
import { UiAlertComponent } from '../../../shared/ui/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button.component';
import { UiInputComponent } from '../../../shared/ui/ui-input/ui-input.component';

@Component({
  selector: 'app-maintenance-alert-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    UiAlertComponent,
    UiButtonComponent,
    UiInputComponent,
  ],
  templateUrl: './maintenance-alert-form.component.html',
  styleUrl: './maintenance-alert-form.component.css',
})
export class MaintenanceAlertFormComponent implements OnInit {
  vehicles: Vehicle[] = [];
  message = '';
  error = false;
  saving = false;

  form = new FormGroup({
    vehicleId: new FormControl('', Validators.required),
    title: new FormControl('', Validators.required),
    notes: new FormControl(''),
    dueKm: new FormControl(0, [Validators.required, Validators.min(0)]),
    warningKm: new FormControl(500, [Validators.required, Validators.min(0)]),
    repeatEveryKm: new FormControl<number | null>(null, Validators.min(1)),
  });

  constructor(
    private readonly api: ApiService,
    private readonly location: Location,
  ) {}

  ngOnInit() {
    this.api.listVehicles().subscribe({
      next: (vehicles) => (this.vehicles = vehicles),
      error: () => {
        this.error = true;
        this.message = 'Não foi possível carregar os veículos.';
      },
    });
  }

  goBack() {
    this.location.back();
  }

  save() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    this.saving = true;
    this.api
      .createMaintenance({
        vehicleId: values.vehicleId!,
        title: values.title!,
        notes: values.notes || undefined,
        dueKm: Number(values.dueKm),
        warningKm: Number(values.warningKm),
        repeatEveryKm: values.repeatEveryKm ? Number(values.repeatEveryKm) : undefined,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.error = false;
          this.message = 'Alerta de manutenção criado com sucesso.';
          this.form.disable();
        },
        error: (response) => {
          this.saving = false;
          this.error = true;
          this.message =
            response.error?.detail ??
            response.error?.message ??
            'Não foi possível criar o alerta de manutenção.';
        },
      });
  }
}
