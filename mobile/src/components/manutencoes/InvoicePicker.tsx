import { useRef, useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { MaintenanceButton } from './FormControls';
import { validateInvoice, type Invoice } from './maintenance';
import { styles } from './maintenance.styles';
import { useSnackbar } from '../SnackbarProvider';

export function InvoicePicker({ value, onChange, disabled }: {
  value: Invoice | null; onChange: (invoice: Invoice | null) => void; disabled: boolean;
}): ReactElement {
  const { showSnackbar } = useSnackbar();
  const [picking, setPicking] = useState<boolean>(false);
  const locked = useRef<boolean>(false);
  const pick = async (): Promise<void> => {
    if (locked.current) return;
    locked.current = true;
    setPicking(true);
    try {
      const result: DocumentPicker.DocumentPickerResult = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset: DocumentPicker.DocumentPickerAsset = result.assets[0];
      const size: number = asset.size ?? new File(asset.uri).size;
      const validationError: string | null = validateInvoice(asset.name, size, asset.mimeType);
      if (validationError) { showSnackbar('aviso', validationError); return; }
      onChange({ uri: asset.uri, name: asset.name, size });
    } catch { showSnackbar('erro', 'Não foi possível abrir o PDF. Selecione o arquivo novamente.'); }
    finally { locked.current = false; setPicking(false); }
  };
  return <View style={styles.field}>
    <Text style={styles.label}>Nota fiscal (PDF) · opcional</Text>
    {value ? <Text style={styles.body}>{value.name}</Text> : null}
    <MaintenanceButton label={picking ? 'Selecionando…' : value ? 'Trocar PDF' : 'Selecionar PDF'} onPress={(): void => { void pick(); }} disabled={disabled || picking} secondary />
    {value ? <MaintenanceButton label="Remover PDF" onPress={(): void => onChange(null)} disabled={disabled || picking} secondary /> : null}
    <Text style={styles.hint}>Arquivo PDF de até 10 MB.</Text>
  </View>;
}
