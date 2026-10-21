import { CommonModule } from '@angular/common';
import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
@Component({
  selector: 'app-input',
  standalone: true,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiInputComponent), multi: true },
  ],
  templateUrl: './ui-input.component.html',
  styleUrl: './ui-input.component.css',
  imports: [CommonModule],
})
export class UiInputComponent implements ControlValueAccessor {
  private static nextId = 0;
  readonly inputId = `ui-input-${UiInputComponent.nextId++}`;
  label = input.required<string>();
  inputType = input('text');
  placeholder = input('');
  hint = input('');
  required = input(false);
  value = '';
  onChange = (v: string) => {};
  touched = () => {};
  writeValue(v: string | number | null) {
    this.value = v?.toString() ?? '';
  }
  registerOnChange(fn: (v: string) => void) {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void) {
    this.touched = fn;
  }
  setDisabledState() {}
  change(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
}
