import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Vehicle } from '../veiculos/vehicles';
import { styles } from '../manutencoes/maintenance.styles';

export function VehicleChoice({ vehicles, value, onChange, disabled = false, error }: {
  vehicles: Vehicle[]; value: string; onChange: (id: string) => void; disabled?: boolean; error?: string;
}): ReactElement {
  return <View style={styles.field}>
    <Text style={styles.label}>Veículo *</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel="Veículo" style={styles.choices}>
      {vehicles.map((vehicle: Vehicle): ReactElement => <Pressable key={vehicle.id} accessibilityRole="radio"
        accessibilityState={{ checked: value === vehicle.id, disabled }} disabled={disabled}
        onPress={(): void => onChange(vehicle.id)}
        style={({ pressed }) => [styles.choice, value === vehicle.id && styles.selected, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>{vehicle.model} · {vehicle.licensePlate}</Text>
      </Pressable>)}
    </View>
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
  </View>;
}
