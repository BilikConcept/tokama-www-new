export type PackageAvailability = {
  valid_from?: string | null;
  valid_to?: string | null;
  weekdays?: number[] | null;
};

export function isoWeekday(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCDay() || 7;
}

export function isPackageArrivalAvailable(value: string, availability: PackageAvailability) {
  if (!value) return false;
  if (availability.valid_from && value < availability.valid_from) return false;
  if (availability.valid_to && value > availability.valid_to) return false;
  const weekdays = availability.weekdays?.length ? availability.weekdays : [1, 2, 3, 4, 5, 6, 7];
  const weekday = isoWeekday(value);
  return weekday !== null && weekdays.includes(weekday);
}

export function validatePackageStay(checkin: string, checkout: string, availability: PackageAvailability) {
  if (!checkin || !checkout || checkout <= checkin) return false;
  const current = new Date(`${checkin}T12:00:00Z`);
  const end = new Date(`${checkout}T12:00:00Z`);
  while (current <= end) {
    const iso = current.toISOString().slice(0, 10);
    if (!isPackageArrivalAvailable(iso, availability)) return false;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return true;
}
