import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { moneyFormatter } from '../manutencoes/maintenance';
import type { Month } from './dashboard';
import { dashboardStyles as s } from './dashboard.styles';

const number: Intl.NumberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const compact: Intl.NumberFormat = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const monthNames: string[] = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function CostChart({ months, average, consumption = false }: { months: Month[]; average: number; consumption?: boolean }): ReactElement {
  const hasData: boolean = months.some((m: Month): boolean => consumption ? m.liters > 0 : m.count > 0);
  const maximum: number = Math.max(1, ...months.map((m: Month): number => consumption ? m.liters ? m.distance / m.liters : 0 : (m.fuel + m.maintenance) / 100));
  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.title}>{consumption ? 'Rendimento do carro' : 'Gastos por mês'}</Text>
    <Text style={s.muted}>{consumption ? 'Consumo médio mensal · km/l' : `Média mensal: ${moneyFormatter.format(average)}`}</Text>
    {hasData ? <>
      <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel="Gráfico mensal. Deslize para ver os meses.">
        <View style={s.chart}>{months.map((m: Month): ReactElement => {
          const value: number = consumption ? m.liters ? m.distance / m.liters : 0 : (m.fuel + m.maintenance) / 100;
          const label: string = `${monthNames[Number(m.key.slice(5)) - 1]}/${m.key.slice(2, 4)}`;
          const dynamic = StyleSheet.create({
            fuel: { height: 136 * (consumption ? value : m.fuel / 100) / maximum },
            maintenance: { height: 136 * m.maintenance / 100 / maximum },
            average: { bottom: 136 * average / maximum },
          });
          return <View key={m.key} style={s.column} accessible accessibilityLabel={consumption
            ? `${label}: ${m.liters ? `${number.format(value)} quilômetros por litro` : 'sem dados'}`
            : `${label}: combustível ${moneyFormatter.format(m.fuel / 100)}, manutenção ${moneyFormatter.format(m.maintenance / 100)}`}>
            <Text style={s.chartValue}>{consumption ? m.liters ? number.format(value) : '—' : compact.format(value)}</Text>
            <View style={s.plot}>
              {!consumption ? <View style={[s.averageLine, dynamic.average]} /> : null}
              {!consumption ? <View style={[s.bar, s.maintenanceBar, dynamic.maintenance]} /> : null}
              <View style={[s.bar, consumption && s.consumptionBar, dynamic.fuel]} />
            </View>
            <Text style={s.chartValue}>{label}</Text>
          </View>;
        })}</View>
      </ScrollView>
      <Text style={s.legend}>{consumption ? 'Calculado pela soma de km ÷ soma de litros registrados.' : '● Dourado: combustível   ● Azul: manutenção\nLinha tracejada: média · valores em R$'}</Text>
    </> : <Text style={s.muted}>{consumption ? 'Registre um abastecimento para acompanhar o consumo.' : 'Nenhum gasto registrado neste período.'}</Text>}
  </View>;
}
