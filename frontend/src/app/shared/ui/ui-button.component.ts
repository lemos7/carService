import { Component, input } from '@angular/core';
@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './ui-button.component.html',
  styleUrl: './ui-button.component.css',
})
export class UiButtonComponent {
  buttonType = input<'button' | 'submit'>('button');
  disabled = input(false);
}
