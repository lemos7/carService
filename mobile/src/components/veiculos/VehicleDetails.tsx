import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import { MaintenanceHistory } from '../manutencoes/MaintenanceHistory';
import { mileageFormatter, type Vehicle } from './vehicles';
import { styles } from './vehicle-details.styles';

function Detail({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <View style={styles.detail}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={styles.value}>{value}</Text>
    </View>
  );
}

export function VehicleDetails({ vehicle }: { vehicle: Vehicle }): ReactElement {
  return (
    <>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>MEU VEÍCULO</Text>
        <Text accessibilityRole="header" style={styles.title}>{vehicle.model}</Text>
        <Text style={styles.subtitle}>Informações e histórico de manutenções.</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.photo} accessibilityLabel="Veículo sem foto">
          <Text style={styles.photoLabel}>Sem foto</Text>
        </View>
        <View style={styles.cardContent}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Dados do veículo</Text>
          <View style={styles.grid}>
            <Detail label="Modelo" value={vehicle.model} />
            <Detail label="Ano" value={String(vehicle.year)} />
            <Detail label="Placa" value={vehicle.licensePlate} />
            <Detail label="Cor" value={vehicle.color} />
            <Detail label="Motor" value={vehicle.engine} />
            <Detail label="Quilometragem" value={`${mileageFormatter.format(vehicle.odometerKm)} km`} />
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Manutenções</Text>
        <MaintenanceHistory vehicleId={vehicle.id} />
      </View>
      <Text style={styles.note}>Prévia com dados demonstrativos.</Text>
    </>
  );
}
