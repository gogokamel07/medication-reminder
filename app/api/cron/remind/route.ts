import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_MESSAGES, pick } from "@/lib/messages";

export const dynamic = "force-dynamic";

const WINDOW_MIN = 10; // send reminders for doses due in the last 10 minutes (cron runs every 5)

function localNow(tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t: string) => parts.find(p => p.type === t)!.value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, minutes: Number(g("hour")) * 60 + Number(g("minute")) };
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || (auth !== `Bearer ${secret}` && url.searchParams.get("secret") !== secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: meds, error } = await db.from("medicines").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: settings } = await db.from("settings").select("*");
  const byUser = new Map((settings || []).map((s: any) => [s.user_id, s]));
  let sent = 0;
  const dbg: any[] = [];
  try {
    const k = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const role = JSON.parse(Buffer.from(k.split(".")[1] || "", "base64").toString() || "{}");
    dbg.push({ meds: (meds || []).length, host: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").slice(8, 28), role: role.role, ref: role.ref, err: error ? error.message : null });
  } catch (e: any) { dbg.push({ dbgerr: String(e.message) }); }
  const errors: string[] = [];

  for (const med of meds || []) {
    const st: any = byUser.get(med.user_id) || { timezone: "Africa/Cairo", reminders_enabled: true };
    if (!st.reminders_enabled) continue;
    let now;
    try { now = localNow(st.timezone); } catch { now = localNow("Africa/Cairo"); }
    dbg.push({ n: med.name, tz: st.timezone, en: st.reminders_enabled, d: now.date, m: now.minutes, t: med.times, s: med.start_date });
    if (med.start_date > now.date || (med.end_date && med.end_date < now.date)) continue;

    // refill warning: one day (or less) of supply left
    const perDay = (med.units_per_dose || 1) * (med.times as string[]).length;
    if (med.units_left != null && !med.refill_alerted && med.units_left <= perDay) {
      const { error: cl } = await db.from("medicines").update({ refill_alerted: true }).eq("id", med.id).eq("refill_alerted", false);
      const { data: ru } = await db.auth.admin.getUserById(med.user_id);
      const to = ru?.user?.email;
      if (!cl && to) {
        const rr = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || "Dawaa Reminder <onboarding@resend.dev>",
            to: [to],
            subject: `🛒 ${med.name} runs out in about a day`,
            html: `<div style="font-family:sans-serif;max-width:480px"><h2>Time to refill ${esc(med.name)}</h2><p>About ${med.units_left} left, around one day of doses. Get more today.</p></div>`,
          }),
        });
        if (rr.ok) sent++;
        else await db.from("medicines").update({ refill_alerted: false }).eq("id", med.id);
      }
    }

    for (const time of med.times as string[]) {
      const [h, m] = time.split(":").map(Number);
      const diff = now.minutes - (h * 60 + m);
      if (diff < 0 || diff >= WINDOW_MIN) continue;

      const { data: taken } = await db.from("dose_logs").select("id")
        .eq("medicine_id", med.id).eq("dose_date", now.date).eq("dose_time", time).maybeSingle();
      if (taken) continue;

      // claim the slot first; if it already exists the insert fails and we skip (no double email)
      const { error: claim } = await db.from("reminders_sent").insert({ medicine_id: med.id, dose_date: now.date, dose_time: time });
      if (claim) { errors.push("claim: " + claim.message); continue; }

      const { data: u } = await db.auth.admin.getUserById(med.user_id);
      const email = u?.user?.email;
      if (!email) continue;

      const { data: custom } = await db.from("messages").select("text").eq("user_id", med.user_id);
      const cheer = pick([...DEFAULT_MESSAGES, ...((custom || []).map((c: any) => c.text))]);
      const site = process.env.NEXT_PUBLIC_SITE_URL || "";

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "Dawaa Reminder <onboarding@resend.dev>",
          to: [email],
          subject: `💊 Time for ${med.name} (${time})`,
          html: `<div style="font-family:sans-serif;max-width:480px">
            <h2>Time for ${esc(med.name)}</h2><p>${esc(med.dose)} at ${time}</p>
            <p style="font-size:18px">${esc(cheer)}</p>
            <p><a href="${site}/dashboard">Open the app and mark it as taken</a></p>
            <p style="color:#888;font-size:12px">A helper only. Follow your doctor's instructions.</p></div>`,
        }),
      });
      if (res.ok) sent++;
      else { errors.push(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`); await db.from("reminders_sent").delete().match({ medicine_id: med.id, dose_date: now.date, dose_time: time }); } // retry next run
    }
  }
  return NextResponse.json({ ok: true, sent, errors, dbg });
}

function esc(s: string) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
