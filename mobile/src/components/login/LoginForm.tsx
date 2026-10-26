import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AuthField } from '@/components/auth/AuthField';
import { AuthSwitch, PrimaryAction } from '@/components/auth/AuthActions';
import { useAuthForm } from '@/components/auth/useAuthForm';
import { useDemoAccess } from '@/components/auth/useDemoAccess';
import { styles } from '@/components/auth/auth.styles';

export function LoginForm(): ReactElement {
  const { values, errors, refs, change, validate } = useAuthForm('login');
  const { loading, error, submit } = useDemoAccess('login', values, validate, (): void => change('password', ''));
  function handleLogin(): void { void submit(); }
  return (
    <View style={styles.form}>
      <Text style={styles.hint}>Simulação de acesso à mesma garagem local. Não é autenticação real.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <AuthField editable={!loading} label="E-mail" inputRef={refs.email} autoCapitalize="none" autoComplete="email"
        keyboardType="email-address" returnKeyType="next" submitBehavior="submit"
        onSubmitEditing={(): void => refs.password.current?.focus()}
        onChangeText={(value: string): void => change('email', value)} placeholder="seu@email.com"
        value={values.email} error={errors.email} />
      <View style={styles.field}>
        <AuthField editable={!loading} label="Senha" inputRef={refs.password} autoCapitalize="none" autoComplete="current-password"
          secureTextEntry returnKeyType="go" onSubmitEditing={handleLogin}
          onChangeText={(value: string): void => change('password', value)} placeholder="Digite sua senha"
          value={values.password} error={errors.password} />
        <Pressable accessibilityRole="link" onPress={(): void => router.push('/esqueci-a-senha')}
          style={({ pressed }) => [styles.recoveryAction, pressed && styles.linkPressed]}>
          <Text style={styles.linkText}>Esqueci minha senha</Text>
        </Pressable>
      </View>
      <PrimaryAction loading={loading} label="Acessar demonstração" onPress={handleLogin} />
      <AuthSwitch register />
    </View>
  );
}
