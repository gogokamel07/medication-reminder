"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";
import { DEFAULT_MESSAGES } from "@/lib/messages";

export default function Messages() {
  const [uid, setUid] = useState("");
  const [mine, setMine] = useState<{ id: string; text: string }[]>([]);
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("messages").select("id,text").order("created_at");
    setMine(data || []);
  }, []);
  useEffect(() => { if (uid) load(); }, [uid, load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await supabase.from("messages").insert({ text: text.trim() });
    setText(""); load();
  }

  return (
    <Shell onReady={setUid}>
      <form className="card" onSubmit={add}>
        <h3>Add your own encouraging message</h3>
        <input value={text} maxLength={200} placeholder="You are doing amazing, keep going!" onChange={e => setText(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      <h3>Your messages</h3>
      {mine.length === 0 && <p className="muted">None yet. The built-in ones are used.</p>}
      {mine.map(m => (
        <div className="card row" key={m.id}><span>{m.text}</span>
          <button className="danger" onClick={async () => { await supabase.from("messages").delete().eq("id", m.id); load(); }}>Delete</button></div>
      ))}
      <h3>Built-in messages</h3>
      {DEFAULT_MESSAGES.map(m => <div className="card muted" key={m}>{m}</div>)}
    </Shell>
  );
}
