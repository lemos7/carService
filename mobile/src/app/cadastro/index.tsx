import type { ReactElement } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { RegistrationForm } from '@/components/cadastro/RegistrationForm';

export default function RegistrationScreen(): ReactElement {
  return (
    <AuthLayout compact title="Cadastro demonstrativo" subtitle="Uma única garagem local, sem criar uma conta real.">
      <RegistrationForm />
    </AuthLayout>
  );
}
