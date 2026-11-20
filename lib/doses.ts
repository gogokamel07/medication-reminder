export type Medicine = {
  id: string; name: string; dose: string; times: string[];
  start_date: string; end_date: string | null;
};
export type Log = { medicine_id: string; dose_date: string; dose_time: string };

export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => ymd(new Date());
export const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export function activeOn(m: Medicine, date: string) {
  return m.start_date <= date && (!m.end_date || m.end_date >= date);
}

export type Dose = { med: Medicine; time: string; date: string; status: "taken" | "missed" | "upcoming" };

export function dosesForDate(meds: Medicine[], logs: Log[], date: string): Dose[] {
  const today = todayStr(), now = nowHM();
  const out: Dose[] = [];
  for (const med of meds) {
    if (!activeOn(med, date)) continue;
    for (const time of med.times) {
      const taken = logs.some(l => l.medicine_id === med.id && l.dose_date === date && l.dose_time === time);
      let status: Dose["status"] = "upcoming";
      if (taken) status = "taken";
      else if (date < today || (date === today && time < now)) status = "missed";
      out.push({ med, time, date, status });
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export function daysBack(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) { const d = new Date(); d.setDate(d.getDate() - i); out.push(ymd(d)); }
  return out;
}

// Streak = consecutive days (ending today or yesterday) where every scheduled dose was taken.
export function streak(meds: Medicine[], logs: Log[]): number {
  let count = 0;
  const days = daysBack(60);
  for (let i = 0; i < days.length; i++) {
    const doses = dosesForDate(meds, logs, days[i]);
    if (doses.length === 0) { if (i === 0) continue; else break; }
    const allTaken = doses.every(d => d.status === "taken");
    const hasMissed = doses.some(d => d.status === "missed");
    if (allTaken) count++;
    else if (i === 0 && !hasMissed) continue; // today still has upcoming doses
    else break;
  }
  return count;
}
