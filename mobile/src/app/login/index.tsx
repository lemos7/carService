import type { ReactElement } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/login/LoginForm';

export default function LoginScreen(): ReactElement {
  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Entre para cuidar do seu carro.">
      <LoginForm />
    </AuthLayout>
  );
}

