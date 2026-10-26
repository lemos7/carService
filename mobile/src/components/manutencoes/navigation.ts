import { router } from 'expo-router';

export function returnToVehicle(vehicleId: string): void {
  if (router.canGoBack()) router.back();
  else router.replace({ pathname: '/veiculo', params: { id: vehicleId } });
}
