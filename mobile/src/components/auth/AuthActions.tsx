import type { ReactElement } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { styles } from '@/components/auth/auth.styles';

type PrimaryActionProps = { label: string; onPress: () => void; loading?: boolean };

export function PrimaryAction({ label, onPress, loading = false }: PrimaryActionProps): ReactElement {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading} onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
      {loading ? <ActivityIndicator color="#272008" /> : null}
      <Text style={styles.primaryButtonText}>{loading ? 'Enviando…' : label}</Text>
    </Pressable>
  );
}

export function returnToLogin(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function AuthSwitch({ register = false }: { register?: boolean }): ReactElement {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.hint}>{register ? 'Ainda não tem conta?' : 'Já tem conta?'}</Text>
      <Pressable accessibilityRole="link" onPress={register ? (): void => router.push('/cadastro') : returnToLogin}
        style={({ pressed }) => [styles.textAction, pressed && styles.linkPressed]}>
        <Text style={styles.linkText}>{register ? 'Criar conta' : 'Entrar'}</Text>
      </Pressable>
    </View>
  );
}
