import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import { AuthField } from '@/components/auth/AuthField';
import { AuthSwitch, PrimaryAction } from '@/components/auth/AuthActions';
import { useAuthForm } from '@/components/auth/useAuthForm';
import { useDemoAccess } from '@/components/auth/useDemoAccess';
import { styles } from '@/components/auth/auth.styles';

export function RegistrationForm(): ReactElement {
  const { values, errors, refs, change, validate } = useAuthForm('register');
  const { loading, error, submit } = useDemoAccess('register', values, validate, (): void => { change('password', ''); change('confirmation', ''); });
  function handleRegistration(): void { void submit(); }
  return (
    <View style={styles.form}>
      <Text style={styles.hint}>Cadastro simulado. Abre a mesma garagem local, sem criar uma conta ou guardar a senha.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <AuthField editable={!loading} label="Nome" inputRef={refs.name} autoCapitalize="words" autoComplete="name"
        returnKeyType="next" submitBehavior="submit" onSubmitEditing={(): void => refs.email.current?.focus()}
        onChangeText={(value: string): void => change('name', value)} placeholder="Seu nome"
        value={values.name} error={errors.name} />
      <AuthField editable={!loading} label="E-mail" inputRef={refs.email} autoCapitalize="none" autoComplete="email"
        keyboardType="email-address" returnKeyType="next" submitBehavior="submit"
        onSubmitEditing={(): void => refs.password.current?.focus()}
        onChangeText={(value: string): void => change('email', value)} placeholder="seu@email.com"
        value={values.email} error={errors.email} />
      <AuthField editable={!loading} label="Senha" inputRef={refs.password} autoCapitalize="none" autoComplete="new-password"
        secureTextEntry returnKeyType="next" submitBehavior="submit"
        onSubmitEditing={(): void => refs.confirmation.current?.focus()}
        onChangeText={(value: string): void => change('password', value)} placeholder="Crie sua senha"
        hint="Use pelo menos 8 caracteres." value={values.password} error={errors.password} />
      <AuthField editable={!loading} label="Confirmação de senha" inputRef={refs.confirmation} autoCapitalize="none"
        autoComplete="new-password" secureTextEntry returnKeyType="done" onSubmitEditing={handleRegistration}
        onChangeText={(value: string): void => change('confirmation', value)} placeholder="Repita sua senha"
        value={values.confirmation} error={errors.confirmation} />
      <PrimaryAction loading={loading} label="Simular cadastro" onPress={handleRegistration} />
      <AuthSwitch />
    </View>
  );
}
