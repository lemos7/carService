import { useState, type ReactElement } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Vehicle } from '../veiculos/vehicles';
import { MaintenanceButton } from '../manutencoes/FormControls';
import { styles } from '../manutencoes/maintenance.styles';

type Props = { vehicles: Vehicle[]; value: string; onChange: (id: string) => void; disabled: boolean; error?: string };
export function VehicleSelect({ vehicles, value, onChange, disabled, error }: Props): ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const selected: Vehicle | undefined = vehicles.find((vehicle: Vehicle): boolean => vehicle.id === value);
  const close = (): void => setOpen(false);
  return <View style={styles.field}>
    <Text style={styles.label}>Veículo *</Text>
    <Pressable accessibilityRole="combobox" accessibilityLabel="Selecionar veículo"
      accessibilityValue={{ text: selected ? `${selected.model} · ${selected.licensePlate}` : 'Selecione um veículo' }}
      accessibilityState={{ disabled, expanded: open }} disabled={disabled} onPress={(): void => setOpen(true)}
      style={[styles.input, selectStyles.trigger, disabled && styles.disabled, Boolean(error) && styles.invalid]}>
      <Text style={[selectStyles.text, !selected && selectStyles.placeholder]}>{selected ? `${selected.model} · ${selected.licensePlate}` : 'Selecione um veículo'}</Text>
      <Text accessible={false} style={styles.body}>⌄</Text>
    </Pressable>
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    <Modal visible={open && !disabled} transparent onRequestClose={close}>
      <View style={selectStyles.overlay}>
        <View accessibilityViewIsModal style={selectStyles.dialog}>
          <Text accessibilityRole="header" style={styles.value}>Selecione um veículo</Text>
          <FlatList data={vehicles} keyExtractor={(vehicle: Vehicle): string => vehicle.id}
            renderItem={({ item }: { item: Vehicle }): ReactElement => <Pressable accessibilityRole="radio"
              accessibilityState={{ checked: item.id === value }} accessibilityLabel={`${item.model} · ${item.licensePlate}`}
              onPress={(): void => { onChange(item.id); close(); }}
              style={({ pressed }) => [styles.choice, item.id === value && styles.selected, pressed && styles.pressed]}>
              <Text style={styles.buttonText}>{item.model} · {item.licensePlate}</Text>
            </Pressable>} />
          <MaintenanceButton label="Cancelar" secondary onPress={close} />
        </View>
      </View>
    </Modal>
  </View>;
}

const selectStyles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  text: { flex: 1, color: '#101827', fontSize: 16 },
  placeholder: { color: '#687382' },
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, gap: 16, maxHeight: '80%', width: '100%', maxWidth: 560, alignSelf: 'center' },
});
