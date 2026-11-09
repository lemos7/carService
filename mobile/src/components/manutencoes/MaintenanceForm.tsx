import { useRef, useState, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSnackbar } from '../SnackbarProvider';
import { returnToVehicle } from './navigation';
import type { Vehicle } from '../veiculos/vehicles';
import { categories, parseCost, parseDate, validateMaintenance, type FormErrors, type Invoice, type Maintenance, type MaintenanceFormValues } from './maintenance';
import { useMaintenance } from './MaintenanceProvider';
import { MaintenanceButton, MaintenanceField } from './FormControls';
import { InvoicePicker } from './InvoicePicker';
import { styles } from './maintenance.styles';

export function MaintenanceForm({ vehicle, onSavingChange }: { vehicle: Vehicle; onSavingChange: (saving: boolean) => void }): ReactElement {
  const { add, loading, error: loadError, reload } = useMaintenance();
  const { showSnackbar } = useSnackbar();
  const [values, setValues] = useState<MaintenanceFormValues>({ date: '', cost: '', category: '', mileage: String(vehicle.odometerKm), details: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const submitted = useRef<boolean>(false);
  const attempt = useRef<{ key: string; record: Maintenance } | null>(null);
  const locked = useRef<boolean>(false);
  const change = (field: keyof MaintenanceFormValues, value: string): void => {
    const next: MaintenanceFormValues = { ...values, [field]: value };
    setValues(next);
    if (submitted.current) setErrors(validateMaintenance(next));
  };
  const save = async (): Promise<void> => {
    if (locked.current) return;
    submitted.current = true;
    const validation: FormErrors = validateMaintenance(values);
    setErrors(validation);
    if (Object.keys(validation).length) {
      showSnackbar('aviso', 'Revise os campos indicados antes de salvar.');
      return;
    }
    locked.current = true;
    setSaving(true);
    onSavingChange(true);
    try {
      const key: string = JSON.stringify([values, invoice]);
      const record: Maintenance = attempt.current?.key === key ? attempt.current.record : {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, vehicleId: vehicle.id,
        date: parseDate(values.date)!, cost: parseCost(values.cost)!, category: values.category,
        mileage: Number(values.mileage), details: values.details.trim(), invoice, createdAt: new Date().toISOString(),
      };
      attempt.current = { key, record };
      await add(record);
    } catch (failure: unknown) {
      showSnackbar('erro', failure instanceof Error ? failure.message : 'Não foi possível salvar. Seus dados foram mantidos. Tente novamente.');
      return;
    } finally { locked.current = false; setSaving(false); onSavingChange(false); }
    returnToVehicle(vehicle.id);
  };
  return <View style={styles.form}>
    <Text style={styles.hint}>Os campos com * são obrigatórios.</Text>
    <MaintenanceField label="Data da manutenção *" placeholder="dd/mm/aaaa" keyboardType="number-pad" maxLength={10}
      value={values.date} editable={!saving} error={errors.date} onChangeText={(value: string): void => {
        const digits: string = value.replace(/\D/g, '').slice(0, 8);
        change('date', digits.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2'));
      }} />
    <MaintenanceField label="Valor total dos serviços (R$) *" placeholder="0,00" keyboardType="decimal-pad" maxLength={20}
      value={values.cost} editable={!saving} error={errors.cost} onChangeText={(value: string): void => change('cost', value)} />
    <View style={styles.field}>
      <Text style={styles.label}>Categoria *</Text>
      <View style={styles.choices} accessibilityRole="radiogroup">
        {categories.map((category: string): ReactElement => <Pressable key={category} accessibilityRole="radio"
          accessibilityState={{ checked: values.category === category, disabled: saving }} disabled={saving}
          onPress={(): void => change('category', category)}
          style={({ pressed }) => [styles.choice, values.category === category && styles.selected, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>{category}</Text>
        </Pressable>)}
      </View>
      {errors.category ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.category}</Text> : null}
    </View>
    <MaintenanceField label="Quilometragem atual *" keyboardType="number-pad" maxLength={10}
      value={values.mileage} editable={!saving} error={errors.mileage} onChangeText={(value: string): void => change('mileage', value)} />
    <InvoicePicker value={invoice} onChange={setInvoice} disabled={saving} />
    <MaintenanceField label="Detalhes do serviço · opcional" placeholder="Serviços realizados, peças substituídas e observações."
      multiline value={values.details} editable={!saving} error={errors.details} hint={`${values.details.length}/4.000 caracteres`}
      onChangeText={(value: string): void => change('details', value)} />
    {loadError ? <MaintenanceButton label="Tentar carregar novamente" onPress={(): void => { void reload(); }} secondary /> : null}
    <View style={styles.actions}>
      <MaintenanceButton label={saving ? 'Salvando…' : loading ? 'Carregando histórico…' : 'Salvar manutenção'} disabled={saving || loading || Boolean(loadError)} onPress={(): void => { void save(); }} />
      <MaintenanceButton label="Cancelar" disabled={saving} secondary onPress={(): void => returnToVehicle(vehicle.id)} />
    </View>
    <Text style={styles.hint}>Salvo neste aparelho. Limpar os dados do aplicativo ou desinstalá-lo pode remover a garagem e os anexos.</Text>
  </View>;
}
