import { useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { router } from 'expo-router';
import { useServices } from '../../services/context';
import { persistenceError } from '../../services/errors';
import type { AuthValues } from './validation';

type DemoAccess = { loading: boolean; error: string; submit: () => Promise<void> };
export function useDemoAccess(mode: 'login' | 'register', values: AuthValues, validate: () => boolean,
  discardPassword: () => void): DemoAccess {
  const services = useServices();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const pending = useRef<boolean>(false);
  const submit = async (): Promise<void> => {
    if (pending.current || !validate()) return;
    pending.current = true;
    setLoading(true);
    setError('');
    Keyboard.dismiss();
    try {
      await services[mode]({ email: values.email, name: values.name });
      router.replace('/inicio');
    } catch (failure: unknown) { setError(persistenceError(failure).message); }
    finally { discardPassword(); pending.current = false; setLoading(false); }
  };
  return { loading, error, submit };
}
