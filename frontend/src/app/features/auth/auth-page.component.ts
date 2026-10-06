import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { UiAlertComponent } from '../../shared/ui/ui-alert.component';
import { UiButtonComponent } from '../../shared/ui/ui-button.component';
import { UiInputComponent } from '../../shared/ui/ui-input.component';
type Mode = 'login' | 'register' | 'forgot' | 'reset';
@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    UiInputComponent,
    UiButtonComponent,
    UiAlertComponent,
  ],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css',
})
export class AuthPageComponent implements OnInit {
  mode: Mode = 'login';
  title = 'Entrar';
  subtitle = 'Acesse seus veículos e alertas.';
  buttonLabel = 'Entrar';
  loading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  private resetToken = '';
  form = new FormGroup({
    name: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.minLength(8)]),
  });
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
  ) {}
  ngOnInit() {
    this.mode = this.route.snapshot.data['mode'] as Mode;
    this.form.controls.name.setValidators(this.mode === 'register' ? [Validators.required] : []);
    this.form.controls.email.setValidators(
      this.mode === 'reset' ? [] : [Validators.required, Validators.email],
    );
    this.form.controls.password.setValidators(
      this.mode === 'forgot' ? [] : [Validators.required, Validators.minLength(8)],
    );
    Object.values(this.form.controls).forEach((control) => control.updateValueAndValidity());
    if (this.mode === 'reset') {
      this.resetToken = this.route.snapshot.queryParamMap.get('token') ?? '';
      // Keep the token in memory rather than in browser history or subsequent referrers.
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
    const copy = {
      login: ['Entrar', 'Acesse seus veículos e alertas.', 'Entrar'],
      register: ['Criar conta', 'Comece a cuidar melhor do seu carro.', 'Cadastrar'],
      forgot: [
        'Recuperar senha',
        'Enviaremos as instruções para o seu e-mail.',
        'Enviar instruções',
      ],
      reset: ['Nova senha', 'Escolha uma nova senha segura.', 'Salvar nova senha'],
    }[this.mode];
    [this.title, this.subtitle, this.buttonLabel] = copy;
  }
  submit() {
    this.message = '';
    if (this.form.invalid) {
      this.message = 'Revise os campos informados.';
      this.messageType = 'error';
      return;
    }
    this.loading = true;
    const v = this.form.getRawValue();
    const request: Observable<unknown> =
      this.mode === 'login'
        ? this.auth.login(v.email!, v.password!)
        : this.mode === 'register'
          ? this.auth.register(v.name!, v.email!, v.password!)
          : this.mode === 'forgot'
            ? this.auth.forgot(v.email!)
            : this.auth.reset(this.resetToken, v.password!);
    request.subscribe({
      next: () => {
        this.loading = false;
        if (this.mode === 'login' || this.mode === 'register') this.router.navigate(['/']);
        else {
          this.message =
            this.mode === 'forgot'
              ? 'Confira seu e-mail para continuar.'
              : 'Senha alterada. Você já pode entrar.';
          this.messageType = 'success';
        }
      },
      error: (e: { error?: { detail?: string } }) => {
        this.loading = false;
        this.message = e.error?.detail ?? 'Ocorreu um erro. Tente novamente.';
        this.messageType = 'error';
      },
    });
  }
}
