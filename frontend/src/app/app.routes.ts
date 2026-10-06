import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { AuthPageComponent } from './features/auth/auth-page.component';
import { ShellComponent } from './shared/shell.component';
export const routes: Routes = [
  { path: 'login', component: AuthPageComponent, data: { mode: 'login' } },
  { path: 'cadastro', component: AuthPageComponent, data: { mode: 'register' } },
  { path: 'recuperar-senha', component: AuthPageComponent, data: { mode: 'forgot' } },
  { path: 'redefinir-senha', component: AuthPageComponent, data: { mode: 'reset' } },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'veiculos',
        loadComponent: () =>
          import('./features/vehicles/vehicles.component').then((m) => m.VehiclesComponent),
      },
      {
        path: 'veiculos/:vehicleId/manutencoes/nova',
        loadComponent: () =>
          import('./features/vehicles/vehicle-maintenance-form/vehicle-maintenance-form.component').then(
            (m) => m.VehicleMaintenanceFormComponent,
          ),
      },
      {
        path: 'veiculos/:vehicleId/manutencoes',
        loadComponent: () =>
          import('./features/vehicles/vehicle-maintenance-list/vehicle-maintenance-list.component').then(
            (m) => m.VehicleMaintenanceListComponent,
          ),
      },
      {
        path: 'veiculos/:vehicleId',
        loadComponent: () =>
          import('./features/vehicles/vehicle-profile/vehicle-profile.component').then(
            (m) => m.VehicleProfileComponent,
          ),
      },
      {
        path: 'manutencoes/nova',
        loadComponent: () =>
          import('./features/maintenance/maintenance-alert-form/maintenance-alert-form.component').then(
            (m) => m.MaintenanceAlertFormComponent,
          ),
      },
      {
        path: 'manutencoes',
        loadComponent: () =>
          import('./features/maintenance/maintenance.component').then(
            (m) => m.MaintenanceComponent,
          ),
      },
      {
        path: 'consumo',
        loadComponent: () =>
          import('./features/maintenance/fuel/fuel.component').then((m) => m.FuelComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
