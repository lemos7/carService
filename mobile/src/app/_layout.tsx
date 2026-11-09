import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaintenanceProvider } from '@/components/manutencoes/MaintenanceProvider';
import { SnackbarProvider } from '@/components/SnackbarProvider';
import { DatabaseProvider } from '@/data/DatabaseProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SnackbarProvider>
        <DatabaseProvider>
          <MaintenanceProvider>
            <Stack screenOptions={{ headerShown: false }} />
                  </MaintenanceProvider>
        </DatabaseProvider>
      </SnackbarProvider>
    </SafeAreaProvider>
  );
}

