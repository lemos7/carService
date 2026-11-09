import type { ReactElement } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { mileageFormatter } from '../veiculos/vehicles';
import { moneyFormatter, type Maintenance } from './maintenance';
import { useMaintenance } from './MaintenanceProvider';
import { MaintenanceButton } from './FormControls';
import { styles } from './maintenance.styles';
import { DataStatus } from './DataStatus';

export function MaintenanceHistory({ vehicleId }: { vehicleId: string }): ReactElement {
  const { records, loading, error } = useMaintenance();
  const items: Maintenance[] = records.filter((record: Maintenance): boolean => record.vehicleId === vehicleId)
    .sort((left: Maintenance, right: Maintenance): number => right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt));
  return <>
    <MaintenanceButton label="Registrar manutenção" disabled={loading || Boolean(error)} onPress={(): void => {
      router.push({ pathname: '/registrar-manutencao', params: { id: vehicleId } });
    }} />
    {loading ? <ActivityIndicator accessibilityLabel="Carregando manutenções" color="#966000" />
      : error ? <DataStatus />
      : items.length === 0 ? <View style={styles.record}><Text style={styles.value}>Nenhuma manutenção registrada</Text>
        <Text style={styles.body}>Os serviços realizados neste veículo aparecerão aqui.</Text></View>
      : items.map((record: Maintenance): ReactElement => <View key={record.id} style={styles.record}>
        <View style={styles.recordHeading}><Text style={styles.value}>{record.category}</Text><Text style={styles.value}>{moneyFormatter.format(record.cost)}</Text></View>
        <Text style={styles.body}>{record.date.split('-').reverse().join('/')} · {mileageFormatter.format(record.mileage)} km</Text>
        {record.details ? <Text selectable style={styles.body}>{record.details}</Text> : null}
        {record.invoice ? <Text style={styles.hint}>Nota fiscal: {record.invoice.name}{record.invoice.unavailable ? ' · indisponível' : ''}</Text> : null}
      </View>)}
  </>;
}
