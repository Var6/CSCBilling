import Vehicle from '@/models/Vehicle';

/**
 * Resolves the vehicle a driver is operating, in the shape Trip.vehicle wants.
 *
 * Trip's pre-save guard requires vehicleId, plate AND model once a trip is
 * ongoing. The driver row only carries `vehicle` as a plate string (plus
 * sometimes a vehicleId), so writing just the plate at accept time would let a
 * driver claim a ride and then hit a schema error when they tried to start it —
 * with a customer already in the car.
 *
 * So we resolve the full record up front and fail at accept instead, where the
 * ride can still go to someone else.
 */
export async function resolveDriverVehicle(driver: {
  vehicleId?: unknown;
  vehicle?: string | null;
}): Promise<{ vehicleId: unknown; plate: string; model: string } | null> {
  if (driver.vehicleId) {
    const byId = await Vehicle.findById(driver.vehicleId).lean();
    if (byId) {
      return {
        vehicleId: (byId as any)._id,
        plate: (byId as any).plate,
        model: (byId as any).model ?? (byId as any).name ?? 'Unknown',
      };
    }
  }

  // Driver rows created before vehicleId existed only carry the plate string.
  if (driver.vehicle) {
    const plate = String(driver.vehicle).trim();
    const byPlate = await Vehicle.findOne({ plate }).lean();
    if (byPlate) {
      return {
        vehicleId: (byPlate as any)._id,
        plate: (byPlate as any).plate,
        model: (byPlate as any).model ?? (byPlate as any).name ?? 'Unknown',
      };
    }
  }

  return null;
}

export const NO_VEHICLE_MESSAGE =
  'No vehicle is assigned to you, or the assigned plate is not in the fleet. Ask the office to fix this before taking rides.';
