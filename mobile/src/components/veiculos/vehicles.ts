export type Vehicle = {
  id: string;
  model: string;
  year: number;
  licensePlate: string;
  color: string;
  engine: string;
  odometerKm: number;
};

export const demoVehicles: readonly Vehicle[] = [
  { id: 'vectra-demo', model: 'Vectra', year: 2000, licensePlate: 'ABC1234', color: 'Prata', engine: '2.2 16v', odometerKm: 108035 },
];

export const mileageFormatter: Intl.NumberFormat = new Intl.NumberFormat('pt-BR');
