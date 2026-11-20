"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";
import { Medicine, todayStr } from "@/lib/doses";

const empty = { name: "", dose: "1 pill", times: ["08:00"], start_date: todayStr(), end_date: "" };

export default function Medicines() {
  const [uid, setUid] = useState("");
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("medicines").select("*").order("created_at");
    setMeds((data as Medicine[]) || []);
  }, []);
  useEffect(() => { if (uid) load(); }, [uid, load]);

  function setCount(n: number) {
    const t = [...form.times];
    while (t.length < n) t.push("12:00");
    setForm({ ...form, times: t.slice(0, n) });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const row = {
      name: form.name.trim(), dose: form.dose.trim() || "1 pill",
      times: [...form.times].sort(), start_date: form.start_date, end_date: form.end_date || null,
    };
    const { error } = editing
      ? await supabase.from("medicines").update(row).eq("id", editing)
      : await supabase.from("medicines").insert(row);
    if (error) return setErr(error.message);
    setForm({ ...empty, start_date: todayStr() }); setEditing(null); load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this medicine and its history?")) return;
    await supabase.from("medicines").delete().eq("id", id); load();
  }

  return (
    <Shell onReady={setUid}>
      <form className="card" onSubmit={save}>
        <h3>{editing ? "Edit medicine" : "Add a medicine"}</h3>
        <label>Name</label>
        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <label>Dose (e.g. 1 pill, 5 ml)</label>
        <input required value={form.dose} onChange={e => setForm({ ...form, dose: e.target.value })} />
        <label>Times per day</label>
        <select value={form.times.length} onChange={e => setCount(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <label>At what times?</label>
        <div className="times">
          {form.times.map((t: string, i: number) => (
            <input key={i} type="time" required value={t}
              onChange={e => { const x = [...form.times]; x[i] = e.target.value; setForm({ ...form, times: x }); }} />
          ))}
        </div>
        <br />
        <label>Start date</label>
        <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
        <label>End date (leave empty if ongoing)</label>
        <input type="date" value={form.end_date || ""} min={form.start_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
        {err && <p className="err">{err}</p>}
        <button type="submit">{editing ? "Save changes" : "Add"}</button>{" "}
        {editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}
      </form>

      <h3>Your medicines</h3>
      {meds.length === 0 && <p className="muted">Nothing yet.</p>}
      {meds.map(m => (
        <div className="card row" key={m.id}>
          <div><strong>{m.name}</strong> <span className="muted">({m.dose})</span><br />
            <span className="muted">{m.times.join(", ")} · {m.start_date} → {m.end_date || "ongoing"}</span></div>
          <div>
            <button className="secondary" onClick={() => { setEditing(m.id); setForm({ ...m, end_date: m.end_date || "" }); window.scrollTo(0, 0); }}>Edit</button>{" "}
            <button className="danger" onClick={() => remove(m.id)}>Delete</button>
          </div>
        </div>
      ))}
    </Shell>
  );
        }
