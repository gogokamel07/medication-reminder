"use client";
import { useCallback, useEffect, useState } from "react";
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
        <h2 style={{ marginBottom: 0 }}>🔥 {s} day streak</h2>
      </div>
      <h3>Today: {taken}/{doses.length} doses taken</h3>
      {doses.length === 0 && <p className="muted">No doses today. Add a medicine in the Medicines tab.</p>}
      {doses.map(d => (
        <div className="card row" key={d.med.id + d.time}>
          <div><strong>{d.time}</strong> &nbsp; <span style={{ fontSize: 22 }}>{iconFor(d.med.type)}</span> {d.med.name}<br /><span className="muted">{d.med.dose}{d.med.units_left != null ? ` · ${d.med.units_left} left` : ""}</span></div>
          <div>
            <span className={`badge ${d.status}`}>{d.status}</span>{" "}
            {d.status === "taken"
              ? <button className="secondary" onClick={() => mark(d, false)}>Undo</button>
              : <button onClick={() => mark(d, true)}>Taken ✓</button>}
          </div>
        </div>
      ))}
    </Shell>
  );
}
