import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import { PreviewAction, VehicleCard } from './VehicleCard';
import type { Vehicle } from './vehicles';
import { useMaintenance } from '../manutencoes/MaintenanceProvider';
import { DataStatus } from '../manutencoes/DataStatus';
import { styles } from './vehicles.styles';

export function VehicleList(): ReactElement {
  const { vehicles, loading, error } = useMaintenance();
  if (loading || error) return <DataStatus />;
  return <View style={styles.list}>
    <View style={styles.toolbar}>
      <Text style={styles.count}>{vehicles.length} {vehicles.length === 1 ? 'veículo cadastrado' : 'veículos cadastrados'}</Text>
      <PreviewAction label="Novo veículo" primary />
    </View>
    {vehicles.map((vehicle: Vehicle): ReactElement => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}
    {vehicles.length === 0 ? <View style={styles.empty}>
      <Text style={styles.model}>Garagem vazia</Text>
      <Text style={styles.metadata}>Nenhum veículo disponível nesta garagem.</Text>
    </View> : null}
    <Text style={styles.notice}>Manutenções disponíveis nos detalhes. Cadastro e edição de veículos ainda não implementados.</Text>
  </View>;
}
