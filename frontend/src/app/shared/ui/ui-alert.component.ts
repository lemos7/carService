import { Component, input } from '@angular/core';
@Component({
  selector: 'app-alert',
  standalone: true,
  templateUrl: './ui-alert.component.html',
  styleUrl: './ui-alert.component.css',
})
export class UiAlertComponent {
  type = input<'warning' | 'error' | 'success'>('warning');
  title = input('Atenção');
  classes = () =>
    `rounded-lg border-l-4 p-4 ${this.type() === 'error' ? 'border-danger bg-red-50 text-red-900' : this.type() === 'success' ? 'border-success bg-green-50 text-green-900' : 'border-brand bg-gray-200 text-gray-900'}`;
}
