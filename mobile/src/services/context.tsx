import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import type { GarageServices } from './contracts';
const ServicesContext = createContext<GarageServices | null>(null);
export function ServicesProvider({ services, children }: { services: GarageServices; children: ReactNode }): ReactElement {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
export function useServices(): GarageServices {
  const services: GarageServices | null = useContext(ServicesContext);
  if (!services) throw new Error('ServicesProvider ausente.');
  return services;
}
