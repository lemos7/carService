import { useRef, useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { useMaintenance } from '../manutencoes/MaintenanceProvider';
import { MaintenanceButton, MaintenanceField } from '../manutencoes/FormControls';
import { parseCost, parseDate } from '../manutencoes/maintenance';
import { styles } from '../manutencoes/maintenance.styles';
import { useSnackbar } from '../SnackbarProvider';
import { VehicleChoice } from './VehicleChoice';
import { parseLiters, validateFuel, type FuelValues, type FuelErrors, type FuelRecord } from './fuel';

const empty: FuelValues = { vehicleId: '', date: '', cost: '', startKm: '', endKm: '', liters: '' };
export function FuelForm(): ReactElement {
  const { vehicles, loading, error, addFuel } = useMaintenance();
  const { showSnackbar } = useSnackbar();
  const [values, setValues] = useState<FuelValues>(empty);
  const [errors, setErrors] = useState<FuelErrors>({});
  const [saving, setSaving] = useState<boolean>(false);
  const locked = useRef<boolean>(false);
  const attempt = useRef<{ key: string; record: FuelRecord } | null>(null);
  const disabled: boolean = saving || loading || Boolean(error);
  const change = (field: keyof FuelValues, value: string): void => {
    setValues((current: FuelValues): FuelValues => ({ ...current, [field]: value }));
    setErrors((current: FuelErrors): FuelErrors => ({ ...current, [field]: undefined }));
  };
  const save = async (): Promise<void> => {
    if (locked.current || disabled) return;
    const validation: FuelErrors = validateFuel(values);
    if (!vehicles.some((vehicle): boolean => vehicle.id === values.vehicleId)) validation.vehicleId = 'Selecione um veículo disponível.';
    setErrors(validation);
    if (Object.keys(validation).length) {
      showSnackbar('aviso', 'Revise os campos indicados antes de salvar.');
      return;
    }
    locked.current = true;
    setSaving(true);
    try {
      const key: string = JSON.stringify(values);
      const record: FuelRecord = attempt.current?.key === key ? attempt.current.record : {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, vehicleId: values.vehicleId,
        date: parseDate(values.date)!, cost: parseCost(values.cost)!, startKm: Number(values.startKm),
        endKm: Number(values.endKm), liters: parseLiters(values.liters)!, createdAt: new Date().toISOString(),
      };
      attempt.current = { key, record };
      await addFuel(record);
      setValues({ ...empty, vehicleId: record.vehicleId, startKm: String(record.endKm) });
      setErrors({});
      attempt.current = null;
    } catch (failure: unknown) {
      showSnackbar('erro', failure instanceof Error ? failure.message : 'Não foi possível salvar. Tente novamente.');
    } finally { locked.current = false; setSaving(false); }
  };
  return <View style={styles.form}>
    <Text style={styles.value}>Registrar abastecimento</Text>
    <Text style={styles.hint}>Informe o hodômetro inicial e final do percurso e os litros consumidos para calcular km/l. Os campos com * são obrigatórios.</Text>
    <MaintenanceField label="Data do abastecimento *" placeholder="dd/mm/aaaa" keyboardType="number-pad" maxLength={10}
      value={values.date} editable={!disabled} error={errors.date} onChangeText={(value: string): void => {
        const digits: string = value.replace(/\D/g, '').slice(0, 8);
        change('date', digits.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2'));
      }} />
    <MaintenanceField label="Valor abastecido (R$) *" placeholder="0,00" keyboardType="decimal-pad" maxLength={20}
      value={values.cost} editable={!disabled} error={errors.cost} onChangeText={(value: string): void => change('cost', value)} />
    <VehicleChoice vehicles={vehicles} value={values.vehicleId} disabled={disabled} error={errors.vehicleId}
      onChange={(id: string): void => change('vehicleId', id)} />
    <MaintenanceField label="Quilometragem inicial (km) *" keyboardType="number-pad" maxLength={10}
      value={values.startKm} editable={!disabled} error={errors.startKm} onChangeText={(value: string): void => change('startKm', value)} />
    <MaintenanceField label="Quilometragem final (km) *" keyboardType="number-pad" maxLength={10}
      value={values.endKm} editable={!disabled} error={errors.endKm} onChangeText={(value: string): void => change('endKm', value)} />
    <MaintenanceField label="Litros abastecidos *" placeholder="0,000" keyboardType="decimal-pad" maxLength={10}
      hint="Informe o total indicado na bomba. Para medir o consumo, use abastecimentos consecutivos com o tanque cheio."
      value={values.liters} editable={!disabled} error={errors.liters} onChangeText={(value: string): void => change('liters', value)} />
    <MaintenanceButton label={saving ? 'Salvando…' : 'Registrar abastecimento'} disabled={disabled}
      onPress={(): void => { void save(); }} />
    <Text style={styles.hint}>Salvo neste celular, disponível sem internet. Limpar os dados do aplicativo ou desinstalá-lo pode remover os registros.</Text>
  </View>;
}
