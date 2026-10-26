import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import { useMaintenance } from '../manutencoes/MaintenanceProvider';
import { DataStatus } from '../manutencoes/DataStatus';
import { mileageFormatter } from '../veiculos/vehicles';
import { styles } from './inicio.styles';

export function Notice(): ReactElement {
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>Aviso ilustrativo</Text>
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>Exemplo: troca de óleo</Text>
      <Text style={styles.noticeText}>Este exemplo não é calculado a partir das manutenções salvas.</Text>
    </View>
  </View>;
}
export function Overview(): ReactElement {
  const { summary, loading, error } = useMaintenance();
  if (loading || error) return <DataStatus />;
  return <>
    <View style={styles.metrics}>
      <View style={styles.card}>
        <Text style={styles.metricLabel}>Veículos</Text>
        <Text style={styles.metricValue}>{summary.vehicleCount}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.metricLabel}>Avisos ilustrativos</Text>
        <Text style={styles.metricValue}>1</Text>
      </View>
      <View style={[styles.card, styles.mileage]}>
        <Text style={styles.metricLabel}>Quilometragem total</Text>
        <Text style={styles.metricValue}>{mileageFormatter.format(summary.totalMileage)} <Text style={styles.metricUnit}>km</Text></Text>
      </View>
    </View>
    <Notice />
  </>;
}
