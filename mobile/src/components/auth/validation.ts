export type AuthValues = { name: string; email: string; password: string; confirmation: string };
export type AuthErrors = Partial<Record<keyof AuthValues, string>>;
export type AuthMode = 'login' | 'register' | 'recovery';

export function validateAuth(values: AuthValues, mode: AuthMode): AuthErrors {
  const errors: AuthErrors = {};
  if (mode === 'register' && !values.name.trim()) errors.name = 'Informe seu nome.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Informe um e-mail válido.';
  if (mode !== 'recovery' && !values.password) errors.password = 'Informe sua senha.';
  if (mode === 'register') {
    if (values.password.length < 8) errors.password = 'Use pelo menos 8 caracteres.';
    if (!values.confirmation || values.confirmation !== values.password) errors.confirmation = 'A confirmação deve ser igual à senha.';
  }
  return errors;
}
