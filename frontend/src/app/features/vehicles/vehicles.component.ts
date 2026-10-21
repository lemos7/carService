import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Vehicle } from '../../core/models';
import { UiAlertComponent } from '../../shared/ui/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../shared/ui/ui-button/ui-button.component';
import { UiInputComponent } from '../../shared/ui/ui-input/ui-input.component';
@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    UiInputComponent,
    UiButtonComponent,
    UiAlertComponent,
  ],
  templateUrl: './vehicles.component.html',
  styleUrl: './vehicles.component.css',
})
export class VehiclesComponent implements OnInit {
  vehicles: Vehicle[] = [];
  showForm = false;
  editing: Vehicle | null = null;
  photo?: File;
  message = '';
  error = false;
  form = new FormGroup({
    year: new FormControl(new Date().getFullYear(), Validators.required),
    model: new FormControl('', Validators.required),
    licensePlate: new FormControl('', Validators.required),
    color: new FormControl('', Validators.required),
    engine: new FormControl('', Validators.required),
    odometerKm: new FormControl(0, [Validators.required, Validators.min(0)]),
  });
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.load();
  }
  load() {
    this.api.listVehicles().subscribe((x) => (this.vehicles = x));
  }
  openForm() {
    this.editing = null;
    this.photo = undefined;
    this.form.reset({ year: new Date().getFullYear(), odometerKm: 0 });
    this.showForm = true;
  }
  edit(v: Vehicle) {
    this.editing = v;
    this.form.setValue({
      year: v.year,
      model: v.model,
      licensePlate: v.licensePlate,
      color: v.color,
      engine: v.engine,
      odometerKm: v.odometerKm,
    });
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  selectPhoto(e: Event) {
    this.photo = (e.target as HTMLInputElement).files?.[0];
  }
  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const data = {
      year: Number(v.year),
      model: v.model!,
      licensePlate: v.licensePlate!,
      color: v.color!,
      engine: v.engine!,
      odometerKm: Number(v.odometerKm),
    };
    const request = this.editing
      ? this.api.updateVehicle(this.editing.id, data)
      : this.api.createVehicle(data);
    request.subscribe({
      next: (vehicle) => {
        const finish = () => {
          this.message = 'Veículo salvo com sucesso.';
          this.error = false;
          this.showForm = false;
          this.load();
        };
        this.photo
          ? this.api.uploadPhoto(vehicle.id, this.photo).subscribe({ next: finish, error: finish })
          : finish();
      },
      error: (e) => {
        this.error = true;
        this.message = e.error?.detail ?? 'Não foi possível salvar.';
      },
    });
  }
}
