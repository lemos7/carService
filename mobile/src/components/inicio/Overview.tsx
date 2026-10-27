import { useState, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMaintenance } from '../manutencoes/MaintenanceProvider';
import { DataStatus } from '../manutencoes/DataStatus';
import { moneyFormatter } from '../manutencoes/maintenance';
import { VehicleChoice } from '../consumo/VehicleChoice';
import { dashboard, periods, type Expense, type Period } from './dashboard';
import { CostChart } from './CostChart';
import { dashboardStyles as styles } from './dashboard.styles';

export function Notice(): ReactElement {
  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.title}>Cuidados com o carro</Text>
    <Text style={styles.muted}>Os alertas automáticos de prazo e quilometragem ainda não estão disponíveis. Consulte o histórico de manutenções do veículo.</Text>
  </View>;
}

function Metric({ label, value }: { label: string; value: string }): ReactElement {
  return <View style={[styles.card, styles.metric]}>
    <Text style={styles.muted}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>;
}

const numberFormatter: Intl.NumberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function Overview({ onFuel }: { onFuel: () => void }): ReactElement {
  const { records, fuelRecords, vehicles, loading, error } = useMaintenance();
  const [selectedId, setSelectedId] = useState<string>('');
  const [period, setPeriod] = useState<Period>('six');
  const vehicle = vehicles.find((item): boolean => item.id === selectedId) ?? vehicles[0];
  if (loading || error) return <DataStatus />;
  if (!vehicle) return <View style={styles.card}>
    <Text style={styles.title}>Seu carro, seus custos</Text>
    <Text style={styles.muted}>Adicione um veículo para começar a acompanhar seus gastos.</Text>
  </View>;

  const data = dashboard(records, fuelRecords, vehicle.id, period);
  const hasData: boolean = data.recent.length > 0;
  const firstMonth: string = data.months[0].key.split('-').reverse().join('/');
  const lastMonth: string = data.months[data.months.length - 1].key.split('-').reverse().join('/');

  return <View style={styles.stack}>
    {vehicles.length > 1
      ? <VehicleChoice vehicles={vehicles} value={vehicle.id} onChange={setSelectedId} />
      : <Text style={styles.label}>{vehicle.model} · {vehicle.licensePlate}</Text>}
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Período dos gastos">
      {periods.map((item): ReactElement => <Pressable key={item.id} accessibilityRole="radio"
        accessibilityState={{ checked: period === item.id }} onPress={(): void => setPeriod(item.id)}
        style={({ pressed }) => [styles.chip, period === item.id && styles.active, pressed && styles.pressed]}>
        <Text style={styles.chipText}>{item.label}</Text>
      </Pressable>)}
    </View>
    <View style={styles.hero}>
      <Text style={styles.overline}>Gasto total no período</Text>
      <Text style={styles.total}>{hasData ? moneyFormatter.format(data.total) : 'Sem dados'}</Text>
      <Text style={styles.overline}>{firstMonth} a {lastMonth} · mês atual parcial</Text>
      <View style={styles.split}>
        <View style={styles.splitItem}>
          <Text style={styles.fuelLabel}>Combustível</Text>
          <Text style={styles.heroValue}>{hasData ? moneyFormatter.format(data.fuelCost) : '—'}</Text>
        </View>
        <View style={styles.splitItem}>
          <Text style={styles.maintenanceLabel}>Manutenção</Text>
          <Text style={styles.heroValue}>{hasData ? moneyFormatter.format(data.maintenanceCost) : '—'}</Text>
        </View>
      </View>
    </View>
    <CostChart months={data.months} average={data.average} />
    <View style={styles.row}>
      <Metric label="Média mensal" value={hasData ? moneyFormatter.format(data.average) : 'Sem dados'} />
      <Metric label="Consumo médio" value={data.kmPerLiter === null ? 'Sem dados' : `${numberFormatter.format(data.kmPerLiter)} km/l`} />
      <Metric label="Combustível por km" value={data.costPerKm === null ? 'Sem dados' : `${moneyFormatter.format(data.costPerKm)}/km`} />
      <Metric label="Acumulado · todo o histórico" value={data.hasHistory ? moneyFormatter.format(data.accumulated) : 'Sem dados'} />
    </View>
    <Text style={styles.muted}>Média dos {data.months.length} meses do período, incluindo meses sem registros. Valores baseados apenas nos gastos cadastrados.</Text>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={onFuel}
        style={({ pressed }) => [styles.action, styles.actionGrow, pressed && styles.pressed]}>
        <Text style={styles.actionText}>+ Abastecimento</Text>
      </Pressable>
      <Pressable accessibilityRole="button"
        onPress={(): void => router.push({ pathname: '/registrar-manutencao', params: { id: vehicle.id } })}
        style={({ pressed }) => [styles.action, styles.actionGrow, pressed && styles.pressed]}>
        <Text style={styles.actionText}>+ Manutenção</Text>
      </Pressable>
    </View>
    <CostChart months={data.months} average={0} consumption />
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>Últimos gastos</Text>
      {hasData ? data.recent.slice(0, 5).map((expense: Expense): ReactElement => <View key={expense.id} style={styles.expense}>
        <Text style={styles.label}>{expense.label} · {expense.date.split('-').reverse().join('/')}</Text>
        <Text style={styles.value}>{moneyFormatter.format(expense.cost)}</Text>
      </View>) : <Text style={styles.muted}>Registre uma manutenção ou um abastecimento para ver os gastos aqui.</Text>}
    </View>
  </View>;
}
