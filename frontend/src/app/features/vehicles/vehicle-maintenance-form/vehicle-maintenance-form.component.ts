import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { formatMaintenanceMoney, parseMaintenanceMoney } from '../maintenance-money';
import { Vehicle } from '../../../core/models';
import { UiAlertComponent } from '../../../shared/ui/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button.component';
import { UiInputComponent } from '../../../shared/ui/ui-input/ui-input.component';

@Component({
  selector: 'app-vehicle-maintenance-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    UiAlertComponent,
    UiButtonComponent,
    UiInputComponent,
  ],
  templateUrl: './vehicle-maintenance-form.component.html',
  styleUrl: './vehicle-maintenance-form.component.css',
})
export class VehicleMaintenanceFormComponent implements OnInit {
  vehicle?: Vehicle;
  document?: File;
  message = '';
  error = false;
  saving = false;
  readonly vehicleId: string;

  form = new FormGroup({
    odometerKm: new FormControl(0, [Validators.required, Validators.min(0)]),
    serviceDate: new FormControl('', Validators.required),
    totalCost: new FormControl('', [
      Validators.required,
      (control) => (parseMaintenanceMoney(control.value ?? '') === null ? { money: true } : null),
    ]),
    category: new FormControl('', Validators.required),
    details: new FormControl('', [Validators.maxLength(4000)]),
  });

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
    private readonly location: Location,
  ) {
    this.vehicleId = this.route.snapshot.paramMap.get('vehicleId') ?? '';
  }

  ngOnInit() {
    this.api.listVehicles().subscribe({
      next: (vehicles) => {
        this.vehicle = vehicles.find((vehicle) => vehicle.id === this.vehicleId);
        if (this.vehicle) {
          this.form.patchValue({ odometerKm: this.vehicle.odometerKm });
        } else {
          this.error = true;
          this.message = 'Veículo não encontrado.';
        }
      },
      error: () => {
        this.error = true;
        this.message = 'Não foi possível carregar os dados do veículo.';
      },
    });
  }

  goBack() {
    this.location.back();
  }

  selectDocument(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.message = '';

    if (
      file &&
      (!file.name.toLowerCase().endsWith('.pdf') ||
        (file.type.length > 0 && file.type !== 'application/pdf'))
    ) {
      input.value = '';
      this.document = undefined;
      this.error = true;
      this.message = 'Selecione um arquivo PDF.';
      return;
    }

    if (file && file.size > 10_000_000) {
      input.value = '';
      this.document = undefined;
      this.error = true;
      this.message = 'O PDF deve ter no máximo 10 MB.';
      return;
    }

    this.document = file;
    this.error = false;
  }

  formatTotalCost() {
    const control = this.form.controls.totalCost;
    control.setValue(formatMaintenanceMoney(control.value ?? ''));
  }

  save() {
    if (this.form.invalid || !this.vehicle) {
      this.form.markAllAsTouched();
      this.error = true;
      this.message = 'Preencha os campos obrigatórios.';
      return;
    }

    const values = this.form.getRawValue();
    this.saving = true;
    this.api
      .createServiceRecord(
        this.vehicle.id,
        Number(values.odometerKm),
        values.details ?? '',
        this.document,
        values.serviceDate!,
        parseMaintenanceMoney(values.totalCost ?? '')!,
        values.category!,
      )
      .subscribe({
        next: () => {
          this.saving = false;
          this.error = false;
          this.message = 'Manutenção registrada e quilometragem atualizada.';
          this.form.disable();
        },
        error: (response) => {
          this.saving = false;
          this.error = true;
          this.message =
            response.error?.detail ??
            response.error?.message ??
            'Não foi possível salvar a manutenção.';
        },
      });
  }
}
