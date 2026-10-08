import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { FuelResult, Vehicle } from '../../../core/models';
import { UiAlertComponent } from '../../../shared/ui/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button.component';
import { UiInputComponent } from '../../../shared/ui/ui-input/ui-input.component';

@Component({
  selector: 'app-fuel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiInputComponent,
    UiButtonComponent,
    UiAlertComponent,
  ],
  templateUrl: './fuel.component.html',
  styleUrl: './fuel.component.css',
})
export class FuelComponent implements OnInit {
  vehicles: Vehicle[] = [];
  result?: FuelResult;
  errorMessage = '';
  saving = false;
  private restoringDraft = false;

  form = new FormGroup(
    {
      vehicleId: new FormControl('', { nonNullable: true, validators: Validators.required }),
      previousOdometerKm: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(0),
      ]),
      odometerKm: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
      totalCost: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(0.01),
        Validators.max(999999999.99),
      ]),
      fueledOn: new FormControl('', { nonNullable: true, validators: Validators.required }),
      liters: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    },
    { validators: FuelComponent.odometerRangeValidator },
  );

  constructor(
    private api: ApiService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.api.listVehicles().subscribe((vehicles) => {
      this.vehicles = vehicles;
      this.restoreDraft();
    });
    this.form.controls.vehicleId.valueChanges.subscribe((id) => {
      const vehicle = this.vehicles.find((item) => item.id === id);
      if (vehicle && !this.restoringDraft) {
        this.form.patchValue({
          previousOdometerKm: vehicle.odometerKm,
          odometerKm: null,
          liters: null,
          totalCost: null,
          fueledOn: '',
        });
      }
    });
    this.form.valueChanges.subscribe(() => this.storeDraft());
  }

  get hasPendingCalculation() {
    const values = this.form.getRawValue() as {
      previousOdometerKm: number | string | null;
      odometerKm: number | string | null;
    };
    const hasBefore = values.previousOdometerKm !== null && values.previousOdometerKm !== '';
    const hasAfter = values.odometerKm !== null && values.odometerKm !== '';
    return hasBefore && !hasAfter;
  }

  save() {
    if (this.saving) return;
    if (this.form.invalid) {
      this.errorMessage = 'Preencha todos os campos obrigatórios com valores válidos.';
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.result = undefined;
    const value = this.form.getRawValue();
    this.api
      .addFuel(
        value.vehicleId,
        Number(value.previousOdometerKm),
        Number(value.odometerKm),
        Number(value.liters),
        Number(value.totalCost),
        value.fueledOn,
      )
      .subscribe({
        next: (result) => {
          this.saving = false;
          this.result = result;
          this.form.reset(
            {
              vehicleId: '',
              previousOdometerKm: null,
              odometerKm: null,
              liters: null,
              totalCost: null,
              fueledOn: '',
            },
            { emitEvent: false },
          );
          localStorage.removeItem(this.storageKey);
          this.api.listVehicles().subscribe((vehicles) => (this.vehicles = vehicles));
        },
        error: (response) => {
          this.saving = false;
          this.errorMessage =
            response.error?.detail ?? 'Não foi possível registrar o abastecimento.';
        },
      });
  }

  private get storageKey() {
    return `carcare.fuel-draft.${this.auth.user()?.userId ?? 'anonymous'}`;
  }

  private storeDraft() {
    const draft = this.form.getRawValue();
    if (!draft.vehicleId && draft.previousOdometerKm === null) {
      localStorage.removeItem(this.storageKey);
      return;
    }
    localStorage.setItem(this.storageKey, JSON.stringify(draft));
  }

  private restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(this.storageKey) ?? 'null');
      if (!draft || !this.vehicles.some((vehicle) => vehicle.id === draft.vehicleId)) return;
      this.restoringDraft = true;
      this.form.patchValue(draft);
      this.restoringDraft = false;
    } catch {
      localStorage.removeItem(this.storageKey);
      this.restoringDraft = false;
    }
  }

  private static odometerRangeValidator(control: AbstractControl): ValidationErrors | null {
    const before = control.get('previousOdometerKm')?.value;
    const after = control.get('odometerKm')?.value;
    if (before === null || after === null || before === '' || after === '') return null;
    return Number(after) > Number(before) ? null : { odometerRange: true };
  }
}
