import { useId, useState, type ReactElement } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { styles } from './maintenance.styles';

type FieldProps = TextInputProps & { label: string; error?: string; hint?: string };
export function MaintenanceField({ label, error, hint, ...props }: FieldProps): ReactElement {
  const [focused, setFocused] = useState<boolean>(false);
  const descriptionId: string = useId();
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} accessibilityHint={error ?? hint}
      aria-invalid={Boolean(error)} aria-describedby={error || hint ? descriptionId : undefined}
      placeholderTextColor="#687382" onFocus={(): void => setFocused(true)} onBlur={(): void => setFocused(false)}
      style={[styles.input, props.multiline && styles.multiline, focused && styles.focused, Boolean(error) && styles.invalid]} />
    {error ? <Text nativeID={descriptionId} accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
      : hint ? <Text nativeID={descriptionId} style={styles.hint}>{hint}</Text> : null}
  </View>;
}

export function MaintenanceButton({ label, onPress, disabled = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}): ReactElement {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, disabled && styles.disabled, pressed && styles.pressed]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}
