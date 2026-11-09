import type { ReactElement } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { mileageFormatter, type Vehicle } from './vehicles';
import { styles } from './vehicles.styles';

export function PreviewAction({ label, primary = false }: { label: string; primary?: boolean }): ReactElement {
  return (
    <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }}
      accessibilityLabel={`${label}. Ainda não implementado.`}
      style={[styles.action, primary ? styles.primary : styles.secondary]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export function VehicleCard({ vehicle }: { vehicle: Vehicle }): ReactElement {
  const { width, fontScale } = useWindowDimensions();
  const wide: boolean = width >= 700 && fontScale <= 1.3;
  return (
    <View style={[styles.card, wide && styles.wideCard]}>
      <View style={[styles.photo, wide && styles.widePhoto]} accessibilityLabel="Veículo sem foto">
        <Text style={styles.photoLabel}>Sem foto</Text>
      </View>
      <View style={styles.details}>
        <View style={styles.heading}>
          <View style={styles.identity}>
            <Text accessibilityRole="header" style={styles.model}>{vehicle.model}</Text>
            <Text style={styles.metadata}>{vehicle.year} · {vehicle.licensePlate} · {vehicle.color}</Text>
          </View>
          <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }}
            accessibilityLabel={`Editar ${vehicle.model}. Ainda não implementado.`} style={styles.edit}>
            <Text style={styles.editText}>Editar</Text>
          </Pressable>
        </View>
        <View style={styles.specs}>
          <View style={styles.spec}>
            <Text style={styles.label}>Motor</Text>
            <Text style={styles.value}>{vehicle.engine}</Text>
          </View>
          <View style={styles.spec}>
            <Text style={styles.label}>Quilometragem</Text>
            <Text style={styles.value}>{mileageFormatter.format(vehicle.odometerKm)} km</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Registrar manutenção de ${vehicle.model}`}
            onPress={(): void => router.push({ pathname: '/registrar-manutencao', params: { id: vehicle.id } })}
            style={({ pressed }) => [styles.action, styles.primary, styles.enabledAction, pressed && styles.pressed]}>
            <Text style={styles.actionText}>Registrar manutenção</Text>
          </Pressable>
          <View style={styles.secondaryActions}>
            <PreviewAction label="Perfil e custos" />
            <Pressable accessibilityRole="button" accessibilityLabel={`Ver manutenções de ${vehicle.model}`}
              onPress={(): void => router.push({ pathname: '/veiculo', params: { id: vehicle.id } })}
              style={({ pressed }) => [styles.action, styles.secondary, styles.enabledAction, pressed && styles.pressed]}>
              <Text style={[styles.actionText, styles.enabledText]}>Ver manutenções</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
