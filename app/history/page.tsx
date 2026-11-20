"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";
import { Medicine, Log, dosesForDate, daysBack, streak } from "@/lib/doses";

export default function History() {
  const [uid, setUid] = useState("");
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const [m, l] = await Promise.all([
        supabase.from("medicines").select("*"),
        supabase.from("dose_logs").select("medicine_id,dose_date,dose_time").gte("dose_date", since.toISOString().slice(0, 10)),
      ]);
      setMeds((m.data as Medicine[]) || []); setLogs((l.data as Log[]) || []);
    })();
  }, [uid]);

  const days = daysBack(30).map(date => {
    const d = dosesForDate(meds, logs, date);
    return { date, total: d.length, taken: d.filter(x => x.status === "taken").length, missed: d.filter(x => x.status === "missed").length };
  }).filter(d => d.total > 0);
  const total = days.reduce((a, d) => a + d.total - (d.total - d.taken - d.missed), 0);
  const taken = days.reduce((a, d) => a + d.taken, 0);
  const pct = total ? Math.round((taken / total) * 100) : 0;

  return (
    <Shell onReady={setUid}>
      <div className="card hero">
        <h2 style={{ margin: 0 }}>🔥 Current streak: {streak(meds, logs)} days</h2>
        <p>Last 30 days: {taken} taken, {total - taken} missed ({pct}% on time)</p>
      </div>
      {days.length === 0 && <p className="muted">No history yet.</p>}
      {days.map(d => (
        <div className="card row" key={d.date}>
          <strong>{d.date}</strong>
          <span>
            <span className="badge taken">{d.taken} taken</span>{" "}
            {d.missed > 0 && <span className="badge missed">{d.missed} missed</span>}
          </span>
        </div>
      ))}
    </Shell>
  );
}
