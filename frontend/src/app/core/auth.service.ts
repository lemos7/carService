import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { AuthResult } from './models';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'carcare.session';
  private readonly session = signal<AuthResult | null>(null);
  readonly user = computed(() => this.session());
  readonly isLoggedIn = computed(() => !!this.session());
  constructor(private http: HttpClient) {
    localStorage.removeItem(this.storageKey);
  }
  login(email: string, password: string) {
    return this.http
      .post<AuthResult>('/api/auth/login', { email, password })
      .pipe(tap((x) => this.store(x)));
  }
  register(name: string, email: string, password: string) {
    return this.http
      .post<AuthResult>('/api/auth/register', { name, email, password })
      .pipe(tap((x) => this.store(x)));
  }
  forgot(email: string) {
    return this.http.post<{ message: string }>('/api/auth/forgot-password', { email });
  }
  reset(token: string, newPassword: string) {
    return this.http.post<{ message: string }>('/api/auth/reset-password', { token, newPassword });
  }
  restore() {
    return this.http.get<AuthResult>('/api/auth/session').pipe(
      tap((session) => this.session.set(session)),
      catchError(() => {
        this.session.set(null);
        return of(null);
      }),
    );
  }
  logout() {
    return this.http.post('/api/auth/logout', {}).pipe(
      tap(() => {
        localStorage.removeItem(this.storageKey);
        this.session.set(null);
      }),
    );
  }
  private store(value: AuthResult) {
    this.session.set(value);
  }
}
