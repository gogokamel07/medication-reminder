"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";
import { Medicine, Log, dosesForDate, todayStr, streak, iconFor } from "@/lib/doses";
import { DEFAULT_MESSAGES, pick } from "@/lib/messages";

export default function Dashboard() {
  const [uid, setUid] = useState("");
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [cheer, setCheer] = useState("");

  const load = useCallback(async (id: string) => {
    const since = new Date(); since.setDate(since.getDate() - 60);
    const [m, l, c] = await Promise.all([
      supabase.from("medicines").select("*"),
      supabase.from("dose_logs").select("medicine_id,dose_date,dose_time").gte("dose_date", since.toISOString().slice(0, 10)),
      supabase.from("messages").select("text"),
    ]);
    setMeds((m.data as Medicine[]) || []);
    setLogs((l.data as Log[]) || []);
    const mine = (c.data || []).map((x: any) => x.text);
    setCustom(mine);
    setCheer(pick([...DEFAULT_MESSAGES, ...mine]));
    // remember the browser's timezone so reminder emails arrive at the right local time
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await supabase.from("settings").upsert({ user_id: id, timezone: tz });
  }, []);

  useEffect(() => { if (uid) load(uid); }, [uid, load]);

  const date = todayStr();
  const doses = dosesForDate(meds, logs, date);
  const taken = doses.filter(d => d.status === "taken").length;
  const s = streak(meds, logs);

  async function mark(d: (typeof doses)[number], on: boolean) {
    if (on) await supabase.from("dose_logs").insert({ medicine_id: d.med.id, dose_date: date, dose_time: d.time });
    else await supabase.from("dose_logs").delete().match({ medicine_id: d.med.id, dose_date: date, dose_time: d.time });
    if (d.med.units_left != null) {
      const step = d.med.units_per_dose || 1;
      const next = on ? Math.max(0, d.med.units_left - step) : d.med.units_left + step;
      await supabase.from("medicines").update({ units_left: next, refill_alerted: false }).eq("id", d.med.id);
    }
    load(uid);
  }

  return (
    <Shell onReady={setUid}>
      <div className="card hero">
        <p style={{ margin: 0 }}>{cheer}</p>
        <h2><span className="ico ico-flame" aria-hidden="true" />{s} day streak</h2>
      </div>
      <h3>Today: {taken}/{doses.length} doses taken</h3>
      {doses.length === 0 && (
        <div className="card empty">
          <span className="ico ico-pill big" aria-hidden="true" />
          <strong>No doses today</strong>
          <p className="muted">Add your first medicine and we will remind you by email.</p>
          <Link href="/medicines" className="btn">Add a medicine</Link>
        </div>
      )}
      {doses.map(d => (
        <div className="card dose" key={d.med.id + d.time}>
          <div className="dose-time">{d.time}<span className={`badge ${d.status}`}>{d.status}</span></div>
          <div className="dose-main">
            <div className="dose-name">{iconFor(d.med.type)}{d.med.name}</div>
            <div className="muted small">{d.med.dose}{d.med.units_left != null ? ` · ${d.med.units_left} left` : ""}</div>
          </div>
          {d.status === "taken"
            ? <button className="secondary" aria-label={`Undo ${d.med.name} at ${d.time}`} onClick={() => mark(d, false)}>Undo</button>
            : <button aria-label={`Mark ${d.med.name} at ${d.time} as taken`} onClick={() => mark(d, true)}><span className="ico ico-check" aria-hidden="true" />Taken</button>}
        </div>
      ))}
    </Shell>
  );
}
