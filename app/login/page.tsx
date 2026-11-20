"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return setErr(error.message);
      if (data.session) router.replace("/dashboard");
      else setMsg("Account created. Check your email to confirm, then log in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setErr(error.message);
      router.replace("/dashboard");
    }
  }

  return (
    <main>
      <div className="card hero"><h2>💊 Dawaa Reminder</h2><p>Never miss a dose. Get a friendly push every time.</p></div>
      <form className="card" onSubmit={submit}>
        <h3>{mode === "in" ? "Log in" : "Create account"}</h3>
        <label>Email</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        <label>Password (min 6 characters)</label>
        <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
        {err && <p className="err">{err}</p>}{msg && <p className="ok">{msg}</p>}
        <button type="submit">{mode === "in" ? "Log in" : "Sign up"}</button>{" "}
        <button type="button" className="link" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "No account? Sign up" : "Have an account? Log in"}
        </button>
      </form>
    </main>
  );
}
