"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";
import { Medicine, todayStr, TYPES, iconFor } from "@/lib/doses";

const empty = { name: "", dose: "1 pill", times: ["08:00"], start_date: todayStr(), end_date: "", type: "pill", units_left: "", units_per_dose: 1 };

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
    if (!form.name.trim()) { setErr("Please type the medicine name."); return; }
    const row = {
      name: form.name.trim(), dose: form.dose.trim() || "1 pill",
      times: [...form.times].sort(), start_date: form.start_date, end_date: form.end_date || null,
      type: form.type || "pill",
      units_left: form.units_left === "" || form.units_left == null ? null : Math.max(0, Number(form.units_left)),
      units_per_dose: Math.max(1, Number(form.units_per_dose) || 1),
      refill_alerted: false,
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
        <label>Type</label>
        <select value={form.type || "pill"} onChange={e => setForm({ ...form, type: e.target.value })}>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
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
        <label>How many do you have now? (optional, we warn you 1 day before it runs out)</label>
        <input type="number" min={0} value={form.units_left ?? ""} onChange={e => setForm({ ...form, units_left: e.target.value })} />
        <label>Units used per dose</label>
        <input type="number" min={1} value={form.units_per_dose ?? 1} onChange={e => setForm({ ...form, units_per_dose: e.target.value })} />
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
          <div><span style={{ fontSize: 22 }}>{iconFor(m.type)}</span> <strong>{m.name}</strong> <span className="muted">({m.dose})</span><br />
            <span className="muted">{m.times.join(", ")} · {m.start_date} → {m.end_date || "ongoing"}</span>
            {m.units_left != null && <><br /><span className="muted">{m.units_left} left</span></>}</div>
          <div>
            <button className="secondary" onClick={() => { setEditing(m.id); setForm({ ...m, end_date: m.end_date || "", type: m.type || "pill", units_left: m.units_left ?? "", units_per_dose: m.units_per_dose ?? 1 }); window.scrollTo(0, 0); }}>Edit</button>{" "}
            <button className="danger" onClick={() => remove(m.id)}>Delete</button>
          </div>
        </div>
      ))}
    </Shell>
  );
}
