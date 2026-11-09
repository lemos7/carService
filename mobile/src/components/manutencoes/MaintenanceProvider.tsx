import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import type { Maintenance } from './maintenance';
import type { FuelRecord } from '../consumo/fuel';
import type { Vehicle } from '../veiculos/vehicles';
import type { GarageSnapshot, ImportWarning, Summary } from '../../services/contracts';
import { useServices } from '../../services/context';
import { persistenceError } from '../../services/errors';
import { useSnackbar } from '../SnackbarProvider';

type MaintenanceContextValue = {
  records: Maintenance[]; vehicles: Vehicle[]; summary: Summary; warnings: ImportWarning[];
  fuelRecords: FuelRecord[]; addFuel: (record: FuelRecord) => Promise<void>;
  loading: boolean; error: string; reload: () => Promise<void>;
  retryImport: () => Promise<void>; add: (record: Maintenance) => Promise<void>;
};
const empty: GarageSnapshot = { records: [], fuelRecords: [], vehicles: [], summary: { vehicleCount: 0, totalMileage: 0 }, warnings: [] };
const MaintenanceContext = createContext<MaintenanceContextValue | null>(null);

export function MaintenanceProvider({ children }: { children: ReactNode }): ReactElement {
  const services = useServices();
  const [data, setData] = useState<GarageSnapshot>(empty);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const { showSnackbar } = useSnackbar();
  const saving = useRef<boolean>(false);
  const generation = useRef<number>(0);
  const reload = useCallback(async (): Promise<void> => {
    const current: number = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const snapshot: GarageSnapshot = await services.snapshot();
      if (current === generation.current) setData(snapshot);
    } catch (failure: unknown) {
      if (current === generation.current) setError(persistenceError(failure).message);
    } finally { if (current === generation.current) setLoading(false); }
  }, [services]);
  useEffect(() => {
    let active: boolean = true;
    const current: number = ++generation.current;
    void services.snapshot().then((snapshot: GarageSnapshot): void => {
      if (active && current === generation.current) setData(snapshot);
    }).catch((failure: unknown): void => {
      if (active && current === generation.current) setError(persistenceError(failure).message);
    }).finally((): void => { if (active && current === generation.current) setLoading(false); });
    return (): void => { active = false; };
  }, [services]);
  const retryImport = async (): Promise<void> => {
    if (saving.current) return;
    saving.current = true;
    setLoading(true);
    try { await services.retryImport(); await reload(); }
    catch (failure: unknown) { setError(persistenceError(failure).message); }
    finally { saving.current = false; setLoading(false); }
  };
  const add = async (record: Maintenance): Promise<void> => {
    if (saving.current || loading || error) throw new Error('Aguarde o carregamento da garagem antes de salvar.');
    saving.current = true;
    try {
      await services.createMaintenance(record);
      showSnackbar('sucesso', 'Manutenção registrada com sucesso.');
      // A failed refresh must never turn a committed write into a failed save.
      await reload();
    } finally { saving.current = false; }
  };
  const addFuel = async (record: FuelRecord): Promise<void> => {
    if (saving.current || loading || error) throw new Error('Aguarde o carregamento da garagem antes de salvar.');
    saving.current = true;
    try {
      await services.createFuel(record);
      showSnackbar('sucesso', 'Abastecimento salvo neste aparelho.');
      await reload();
    } finally { saving.current = false; }
  };
  return <MaintenanceContext.Provider value={{ ...data, loading, error, reload, retryImport, add, addFuel }}>{children}</MaintenanceContext.Provider>;
}

export function useMaintenance(): MaintenanceContextValue {
  const context: MaintenanceContextValue | null = useContext(MaintenanceContext);
  if (!context) throw new Error('MaintenanceProvider ausente.');
  return context;
}
