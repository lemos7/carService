import type { ReactElement } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useMaintenance } from './MaintenanceProvider';
import { MaintenanceButton } from './FormControls';
import { styles } from './maintenance.styles';

export function DataStatus(): ReactElement | null {
  const { loading, error, reload, retryImport } = useMaintenance();
  if (loading) return <ActivityIndicator accessibilityLabel="Carregando garagem" color="#966000" />;
  if (!error) return null;
  return <View style={styles.record}>
    <Text accessibilityRole="alert" style={styles.error}>Não foi possível atualizar a garagem. {error}</Text>
    <MaintenanceButton label="Tentar carregar novamente" onPress={(): void => { void reload(); }} secondary />
    <MaintenanceButton label="Tentar importação novamente" onPress={(): void => { void retryImport(); }} secondary />
  </View>;
}
export function ImportWarnings(): ReactElement | null {
  const { warnings, loading, retryImport } = useMaintenance();
  if (!warnings.length) return null;
  return <View style={styles.record}>
    <Text accessibilityRole="alert" style={styles.value}>Alguns dados antigos precisam de atenção</Text>
    {warnings.map((warning): ReactElement => <Text key={warning.source} style={styles.body}>{warning.source}: {warning.message}</Text>)}
    <MaintenanceButton label="Tentar importação novamente" disabled={loading} onPress={(): void => { void retryImport(); }} secondary />
  </View>;
}
