import { useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { useMaintenance } from '../manutencoes/MaintenanceProvider';
import { DataStatus } from '../manutencoes/DataStatus';
import { MaintenanceButton } from '../manutencoes/FormControls';
import { moneyFormatter } from '../manutencoes/maintenance';
import { styles } from '../manutencoes/maintenance.styles';
import { FuelForm } from './FuelForm';
import { VehicleChoice } from './VehicleChoice';
import { fuelMetrics, type FuelRecord } from './fuel';

const number: Intl.NumberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const volume: Intl.NumberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
export function FuelSection(): ReactElement {
  const { vehicles, fuelRecords, loading, error } = useMaintenance();
  const [vehicleId, setVehicleId] = useState<string>('');
  const [limit, setLimit] = useState<number>(20);
  const records: FuelRecord[] = fuelRecords.filter((record: FuelRecord): boolean => !vehicleId || record.vehicleId === vehicleId);
  const totals: ReturnType<typeof fuelMetrics> = fuelMetrics(records);
  return <View style={styles.actions}>
    <DataStatus />
    {vehicles.length ? <FuelForm /> : !loading && !error ? <Text style={styles.body}>Cadastre um veículo para registrar abastecimentos.</Text> : null}
    <View style={styles.record}>
      <Text accessibilityRole="header" style={styles.value}>Histórico de consumo</Text>
      {vehicles.length > 1 ? <>
        <VehicleChoice vehicles={vehicles} value={vehicleId} onChange={(id: string): void => { setVehicleId(id); setLimit(20); }} />
        <MaintenanceButton label="Todos os veículos" secondary onPress={(): void => { setVehicleId(''); setLimit(20); }} />
      </> : null}
      {records.length ? <>
        <Text style={styles.value}>{number.format(totals.kmPerLiter)} km/l · média do período registrado</Text>
        <Text style={styles.body}>{number.format(totals.distance)} km · {volume.format(totals.liters)} l · {moneyFormatter.format(totals.cost)}</Text>
      </> : !loading && !error ? <Text style={styles.body}>Nenhum abastecimento registrado.</Text> : null}
    </View>
    {records.slice(0, limit).map((record: FuelRecord): ReactElement => <View key={record.id} style={styles.record}>
      <View style={styles.recordHeading}>
        <Text style={styles.value}>{record.date.split('-').reverse().join('/')}</Text>
        <Text style={styles.value}>{number.format((record.endKm - record.startKm) / record.liters)} km/l</Text>
      </View>
      <Text style={styles.body}>{vehicles.find((vehicle): boolean => vehicle.id === record.vehicleId)?.model} · {vehicles.find((vehicle): boolean => vehicle.id === record.vehicleId)?.licensePlate}</Text>
      <Text style={styles.body}>{number.format(record.startKm)} → {number.format(record.endKm)} km ({number.format(record.endKm - record.startKm)} km)</Text>
      <Text style={styles.body}>{volume.format(record.liters)} l · {moneyFormatter.format(record.cost)}</Text>
    </View>)}
    {records.length > limit ? <MaintenanceButton label="Mostrar mais abastecimentos" secondary onPress={(): void => setLimit(limit + 20)} /> : null}
  </View>;
}
