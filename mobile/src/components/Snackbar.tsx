import { useEffect, type ReactElement } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type SnackbarType = 'sucesso' | 'aviso' | 'erro';
export type SnackbarProps = { type: SnackbarType; message: string; onClose: () => void };

/** Mount a new instance for each message to restart its two-second lifetime. */
export function Snackbar({ type, message, onClose }: SnackbarProps): ReactElement {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
    const timer: ReturnType<typeof setTimeout> = setTimeout(onClose, 2000);
    return (): void => clearTimeout(timer);
  }, [message, type, onClose]);

  return <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.bar, styles[type]]}>
    <View style={styles.content}>
      <Text style={[styles.message, type === 'aviso' && styles.darkText]}>{message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar mensagem" onPress={onClose}
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
        <Text accessible={false} style={[styles.closeText, type === 'aviso' && styles.darkText]}>×</Text>
      </Pressable>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  bar: { width: '100%' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 20, paddingRight: 8, paddingVertical: 8, minHeight: 64 },
  sucesso: { backgroundColor: '#18703E' },
  aviso: { backgroundColor: '#F6C744' },
  erro: { backgroundColor: '#B42318' },
  message: { flex: 1, color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
  darkText: { color: '#322600' },
  close: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#FFFFFF', fontSize: 28, lineHeight: 32 },
  pressed: { opacity: 0.65 },
});
