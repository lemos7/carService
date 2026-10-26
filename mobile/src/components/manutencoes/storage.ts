import { Directory, File, Paths } from 'expo-file-system';
import { decodeMaintenance, validateInvoice, type Maintenance } from './maintenance';

function directory(): Directory {
  const folder: Directory = new Directory(Paths.cache, 'maintenance-records');
  folder.create({ idempotent: true, intermediates: true });
  return folder;
}

export async function loadRecords(): Promise<Maintenance[]> {
  const files: (File | Directory)[] = directory().list();
  return Promise.all(files.filter((file: File | Directory): file is File => file instanceof File && file.name.endsWith('.json'))
    .map(async (file: File): Promise<Maintenance> => decodeMaintenance(await file.text())));
}

export async function saveRecord(record: Maintenance): Promise<Maintenance> {
  const folder: Directory = directory();
  const saved: Maintenance = { ...record };
  if (record.invoice) {
    const source: File = new File(record.invoice.uri);
    const error: string | null = validateInvoice(record.invoice.name, source.size);
    if (!source.exists || error) throw new Error(error ?? 'A nota fiscal não está mais disponível. Selecione o PDF novamente.');
    const invoice: File = new File(folder, `${record.id}.pdf`);
    await source.copy(invoice);
    saved.invoice = { ...record.invoice, uri: invoice.uri, size: invoice.size };
  }
  // Read only committed files so an interrupted write preserves earlier records.
  const pending: File = new File(folder, `${record.id}.pending`);
  await pending.write(JSON.stringify(saved));
  await pending.move(new File(folder, `${record.id}.json`));
  return saved;
}
