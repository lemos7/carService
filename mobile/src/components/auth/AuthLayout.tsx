import type { ReactElement, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/components/auth/auth.styles';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  compact?: boolean;
};

export function AuthLayout({ title, subtitle, children, compact = false }: AuthLayoutProps): ReactElement {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardContainer}>
        <ScrollView contentContainerStyle={[styles.content, compact && styles.compactContent]}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={[styles.card, compact && styles.compactCard]}>
            <View style={[styles.heading, compact && styles.compactHeading]}>
              <View style={[styles.accent, compact && styles.compactAccent]} />
              <Text style={styles.brand}>Garagem em Dia</Text>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
