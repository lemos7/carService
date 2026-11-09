import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { AccessibilityInfo, Keyboard, Text, View } from 'react-native';
import { AuthField } from '@/components/auth/AuthField';
import { AuthSwitch, PrimaryAction } from '@/components/auth/AuthActions';
import { useAuthForm } from '@/components/auth/useAuthForm';
import { requestPasswordRecovery } from './passwordRecovery';
import { useServices } from '../../services/context';
import { styles } from '@/components/auth/auth.styles';

export function RecoveryForm(): ReactElement {
  const services = useServices();
  const { values, errors, refs, change, validate } = useAuthForm('recovery');
  const [loading, setLoading] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const pending = useRef<boolean>(false);
  const successMessage: string = 'Simulação concluída. Nenhum e-mail foi enviado.';

  async function submit(): Promise<void> {
    if (pending.current || !validate()) return;
    pending.current = true;
    setLoading(true);
    setError('');
    Keyboard.dismiss();
    try {
      await requestPasswordRecovery(values.email, services);
      setSent(true);
      AccessibilityInfo.announceForAccessibility(successMessage);
    } catch (failure: unknown) {
      const message: string = failure instanceof Error ? failure.message : 'Não foi possível enviar. Tente novamente.';
      setError(message);
      AccessibilityInfo.announceForAccessibility(message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <View style={styles.form}>
      {sent ? <Text accessibilityLiveRegion="polite" style={styles.success}>{successMessage}</Text> : (
        <>
          <AuthField label="E-mail" inputRef={refs.email} autoCapitalize="none" autoComplete="email"
            keyboardType="email-address" returnKeyType="send" editable={!loading}
            onSubmitEditing={(): void => { void submit(); }} value={values.email} error={errors.email}
            placeholder="seu@email.com" onChangeText={(value: string): void => { change('email', value); setError(''); }} />
          {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <PrimaryAction label="Simular recuperação" loading={loading} onPress={(): void => { void submit(); }} />
        </>
      )}
      <AuthSwitch />
    </View>
  );
}
