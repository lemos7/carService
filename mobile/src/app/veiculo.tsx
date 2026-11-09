import type { ReactElement } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VehicleDetails } from '@/components/veiculos/VehicleDetails';
import type { Vehicle } from '@/components/veiculos/vehicles';
import { useMaintenance } from '@/components/manutencoes/MaintenanceProvider';
import { DataStatus } from '@/components/manutencoes/DataStatus';
import { styles } from '@/components/veiculos/vehicle-details.styles';

function returnToVehicles(): void {
  if (router.canGoBack()) router.back();
  else router.replace({ pathname: '/inicio', params: { section: 'Veículos' } });
}

export default function VehicleScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { vehicles, loading, error } = useMaintenance();
  const vehicle: Vehicle | undefined = vehicles.find((item: Vehicle): boolean => item.id === id);
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para meus veículos"
          onPress={returnToVehicles} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹ Meus veículos</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading || error ? <DataStatus /> : vehicle ? <VehicleDetails vehicle={vehicle} /> : (
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>Veículo não encontrado</Text>
            <Text style={styles.subtitle}>Volte à lista e selecione um veículo para ver seus dados.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
