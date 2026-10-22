/** iCalendar (.ics) export for a single fixture, so players can add it to their phone calendar. */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');

export function fixtureIcs(opts: { id: string; title: string; start: Date; overs: number; venue: string; url: string; notes?: string }): string {
  // Rough duration: ~4 minutes per over per side plus the break, at least 3 hours
  const minutes = Math.max(180, opts.overs * 2 * 4 + 30);
  const end = new Date(opts.start.getTime() + minutes * 60000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CricketHub//Fixtures//EN',
    'BEGIN:VEVENT',
    `UID:${opts.id}@crickethub`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(opts.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(opts.title)}`,
    `LOCATION:${esc(opts.venue)}`,
    `DESCRIPTION:${esc([opts.notes, opts.url].filter(Boolean).join('\n\n'))}`,
    `URL:${opts.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
