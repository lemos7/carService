import { useId, useState } from 'react';
import type { ComponentRef, ReactElement, RefObject } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { styles } from '@/components/auth/auth.styles';

type AuthFieldProps = Omit<TextInputProps, 'style' | 'onFocus' | 'onBlur'> & {
  label: string; error?: string; hint?: string; inputRef?: RefObject<ComponentRef<typeof TextInput> | null>;
};

export function AuthField({ label, error, hint, inputRef, secureTextEntry, ...props }: AuthFieldProps): ReactElement {
  const [focused, setFocused] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const descriptionId: string = useId();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputFrame, focused && styles.inputFocused, Boolean(error) && styles.inputInvalid]}>
        <TextInput {...props} ref={inputRef} accessibilityLabel={label}
          accessibilityHint={error ?? hint} aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? descriptionId : undefined}
          autoCorrect={false} secureTextEntry={Boolean(secureTextEntry) && !visible}
          placeholderTextColor="#77736B" selectionColor="#8A6500" underlineColorAndroid="transparent"
          onFocus={(): void => setFocused(true)} onBlur={(): void => setFocused(false)} style={styles.input} />
        {secureTextEntry ? (
          <Pressable accessibilityRole="button"
            accessibilityLabel={(visible ? 'Ocultar ' : 'Mostrar ') + label.toLowerCase()}
            onPress={(): void => setVisible((previous: boolean): boolean => !previous)}
            style={({ pressed }) => [styles.visibilityButton, pressed && styles.linkPressed]}>
            <Text style={styles.visibilityText}>{visible ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text nativeID={descriptionId} accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
        : hint ? <Text nativeID={descriptionId} style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}
