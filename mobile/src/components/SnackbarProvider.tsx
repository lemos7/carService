import { createContext, useCallback, useContext, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Snackbar, type SnackbarType } from './Snackbar';

type Notification = { id: number; type: SnackbarType; message: string };
type SnackbarContextValue = { showSnackbar: (type: SnackbarType, message: string) => void };
const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function SnackbarProvider({ children }: { children: ReactNode }): ReactElement {
  const [notification, setNotification] = useState<Notification | null>(null);
  const sequence = useRef<number>(0);
  const showSnackbar = useCallback((type: SnackbarType, message: string): void => {
    sequence.current += 1;
    setNotification({ id: sequence.current, type, message });
  }, []);
  const close = useCallback((): void => setNotification(null), []);
  return <SnackbarContext.Provider value={{ showSnackbar }}>
    <View style={styles.root}>
      {children}
      <View pointerEvents="box-none" style={styles.overlay}>
        {notification ? <Snackbar key={notification.id} type={notification.type} message={notification.message} onClose={close} /> : null}
      </View>
    </View>
  </SnackbarContext.Provider>;
}

export function useSnackbar(): SnackbarContextValue {
  const context: SnackbarContextValue | null = useContext(SnackbarContext);
  if (!context) throw new Error('useSnackbar requer SnackbarProvider.');
  return context;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000 },
});
