/**
 * Ride handoff codes.
 *
 * Two 4-digit codes are minted per app/web booking:
 *
 *   otp     — START code. The rider reads it to the driver at pickup; the
 *             driver types it to begin the ride. The driver never sees it in
 *             their app, so it proves the right rider is in the car.
 *
 *   endOtp  — END code. A DIFFERENT code the rider gives at the drop. It is
 *             only demanded when a driver tries to end a ride before reaching
 *             the destination, so a trip cannot be closed and billed early
 *             without the rider present to authorise it.
 *
 * The two must differ — otherwise a driver who saw the start code at pickup
 * could reuse it to end early, defeating the point of a separate end code.
 */

export function makeOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function makeRideOtps(): { otp: string; endOtp: string } {
  const otp = makeOtp();
  let endOtp = makeOtp();
  while (endOtp === otp) endOtp = makeOtp();
  return { otp, endOtp };
}

/** Constant-ish comparison; trims and ignores non-digits the rider may add. */
export function otpMatches(entered: unknown, expected: unknown): boolean {
  if (typeof expected !== 'string' || !expected) return false;
  const a = String(entered ?? '').replace(/\D/g, '');
  return a.length > 0 && a === expected;
}
