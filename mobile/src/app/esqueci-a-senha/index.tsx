import type { ReactElement } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { RecoveryForm } from '@/components/esqueci-a-senha/RecoveryForm';

export default function RecoveryScreen(): ReactElement {
  return (
    <AuthLayout title="Recuperar senha" subtitle="Simulação local: nenhum e-mail será enviado.">
      <RecoveryForm />
    </AuthLayout>
  );
}
