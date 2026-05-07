/** Helpers using Europe/Berlin (covers CET/CEST). */

export function getBerlinHourMinute(d = new Date()): { hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return { hour, minute };
}

/** Typical evening cue (~18:00 Berlin). */
export function isBerlinEveningHour(d = new Date()): boolean {
  return getBerlinHourMinute(d).hour === 18;
}
