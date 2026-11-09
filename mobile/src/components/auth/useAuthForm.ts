import { useRef, useState } from 'react';
import type { ComponentRef, RefObject } from 'react';
import { AccessibilityInfo, TextInput } from 'react-native';
import { validateAuth } from './validation';
import type { AuthErrors, AuthMode, AuthValues } from './validation';

type FieldRefs = Record<keyof AuthValues, RefObject<ComponentRef<typeof TextInput> | null>>;
type AuthForm = {
  values: AuthValues; errors: AuthErrors; refs: FieldRefs;
  change: (field: keyof AuthValues, value: string) => void;
  validate: () => boolean;
};

export function useAuthForm(mode: AuthMode): AuthForm {
  const [values, setValues] = useState<AuthValues>({ name: '', email: '', password: '', confirmation: '' });
  const [submitted, setSubmitted] = useState<boolean>(false);
  const refs: FieldRefs = {
    name: useRef<ComponentRef<typeof TextInput>>(null), email: useRef<ComponentRef<typeof TextInput>>(null),
    password: useRef<ComponentRef<typeof TextInput>>(null), confirmation: useRef<ComponentRef<typeof TextInput>>(null),
  };
  const errors: AuthErrors = submitted ? validateAuth(values, mode) : {};
  function change(field: keyof AuthValues, value: string): void {
    setValues((previous: AuthValues): AuthValues => ({ ...previous, [field]: value }));
  }
  function validate(): boolean {
    setSubmitted(true);
    const currentErrors: AuthErrors = validateAuth(values, mode);
    const fields: (keyof AuthValues)[] = ['name', 'email', 'password', 'confirmation'];
    const firstInvalid: keyof AuthValues | undefined = fields.find((field: keyof AuthValues): boolean => Boolean(currentErrors[field]));
    if (!firstInvalid) return true;
    refs[firstInvalid].current?.focus();
    AccessibilityInfo.announceForAccessibility(currentErrors[firstInvalid]!);
    return false;
  }
  return { values, errors, refs, change, validate };
}
