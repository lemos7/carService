import { useState, type ReactElement } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaintenanceForm } from '@/components/manutencoes/MaintenanceForm';
import { returnToVehicle } from '@/components/manutencoes/navigation';
import type { Vehicle } from '@/components/veiculos/vehicles';
import { useMaintenance } from '@/components/manutencoes/MaintenanceProvider';
import { DataStatus } from '@/components/manutencoes/DataStatus';
import { styles } from '@/components/veiculos/vehicle-details.styles';
import { styles as formStyles } from '@/components/manutencoes/maintenance.styles';

export default function RegisterMaintenanceScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { vehicles, loading, error } = useMaintenance();
  const vehicle: Vehicle | undefined = vehicles.find((item: Vehicle): boolean => item.id === id);
  const [saving, setSaving] = useState<boolean>(false);
  return <SafeAreaView style={styles.screen}>
    <View style={styles.navigation}>
      <Pressable accessibilityRole="button" disabled={saving} accessibilityState={{ disabled: saving }}
        onPress={(): void => { if (vehicle) returnToVehicle(vehicle.id); else router.replace('/inicio'); }}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>‹ Voltar</Text></Pressable>
    </View>
    <KeyboardAvoidingView style={formStyles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>{loading ? 'Carregando veículo…' : error ? 'Erro ao carregar veículo' : vehicle ? 'Registrar manutenção' : 'Veículo não encontrado'}</Text>
          <Text style={styles.subtitle}>{!loading && !error && vehicle ? `${vehicle.model} · ${vehicle.licensePlate}` : 'Volte à lista e selecione um veículo.'}</Text>
        </View>
        {loading || error ? <DataStatus /> : vehicle ? <MaintenanceForm vehicle={vehicle} onSavingChange={setSaving} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
